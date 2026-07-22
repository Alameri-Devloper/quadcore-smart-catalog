import type { ProductRepository } from "../repositories/product.repository.interface";
import {
  PRODUCT_CREATE_OUTCOMES,
  PRODUCT_UPDATE_OUTCOMES,
} from "../repositories/product-repository-results";
import type { DomainEvent } from "../types/domain-event";
import {
  PRODUCT_ARCHIVE_REASONS,
  ProductArchiveReason,
  type ProductArchiveReasonValue,
} from "../types/product-archive-reason.value-object";
import type { ProductClassificationInput } from "../types/product-classification.value-object";
import type { ProductCommercialDetailsInput } from "../types/product-commercial-details.value-object";
import type { ProductImageInput } from "../types/product-image.value-object";
import type {
  CatalogId,
  ProductId,
  WorkspaceId,
} from "../types/product-identity.value-object";
import { PRODUCT_LIFECYCLE_STATES, type ProductLifecycleStateValue } from "../types/product-lifecycle-state.value-object";
import { ProductPublicationPolicy } from "../types/product-publication-policy";
import type { ProductPublicationReason } from "../types/product-publication-reason.value-object";
import { ProductRevision } from "../types/product-revision.value-object";
import type { ProductSpecificationValueInput } from "../types/product-specification-value.value-object";
import { Product } from "../types/product.aggregate";
import type { ProductPublicationRequirementsResolver } from "./product-publication-requirements-resolver.port";
import type { WorkspaceContext } from "./workspace-context.port";

interface EditableProductCommand {
  readonly productId: ProductId;
  readonly classification?: ProductClassificationInput;
  readonly commercialDetails: ProductCommercialDetailsInput;
  readonly specificationValues: readonly ProductSpecificationValueInput[];
  readonly images: readonly ProductImageInput[];
  readonly effectiveTime: Date;
}

export interface CreateSmartSaveProductCommand extends EditableProductCommand {
  readonly operation: "Create";
  readonly catalogId: CatalogId;
}

export interface UpdateSmartSaveProductCommand extends EditableProductCommand {
  readonly operation: "Update";
  readonly expectedPersistedRevision: ProductRevision;
}

export type SmartSaveProductCommand =
  | CreateSmartSaveProductCommand
  | UpdateSmartSaveProductCommand;

export const SMART_SAVE_PRODUCT_OUTCOMES = {
  savedAsDraft: "SavedAsDraft",
  savedAndPublished: "SavedAndPublished",
  savedPublishedUpdate: "SavedPublishedUpdate",
  savedAndAutoArchived: "SavedAndAutoArchived",
  savedArchivedUpdate: "SavedArchivedUpdate",
  savedAndAutoRestored: "SavedAndAutoRestored",
  productNotFound: "ProductNotFound",
  revisionConflict: "RevisionConflict",
  productIdConflict: "ProductIdConflict",
  productCodeConflict: "ProductCodeConflict",
} as const;

type SuccessfulOutcome =
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedPublishedUpdate
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoArchived
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedArchivedUpdate
  | typeof SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoRestored;

export interface SmartSaveProductSuccess {
  readonly outcome: SuccessfulOutcome;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly persistedRevision: ProductRevision;
  readonly lifecycleState: ProductLifecycleStateValue;
  readonly archiveReason?: ProductArchiveReasonValue;
  readonly missingPublicationReasons: readonly ProductPublicationReason[];
}

export type SmartSaveProductResult =
  | SmartSaveProductSuccess
  | { readonly outcome: "ProductNotFound"; readonly workspaceId: WorkspaceId; readonly productId: ProductId }
  | { readonly outcome: "RevisionConflict"; readonly workspaceId: WorkspaceId; readonly productId: ProductId; readonly expectedRevision: ProductRevision; readonly actualPersistedRevision: ProductRevision }
  | { readonly outcome: "ProductIdConflict"; readonly workspaceId: WorkspaceId; readonly productId: ProductId }
  | { readonly outcome: "ProductCodeConflict"; readonly workspaceId: WorkspaceId; readonly productId: ProductId; readonly productCode: string };

export interface SmartSaveProductExecution {
  readonly result: SmartSaveProductResult;
  readonly committedEvents: readonly DomainEvent[];
}

export class SmartSaveProduct {
  constructor(
    private readonly repository: ProductRepository,
    private readonly workspaceContext: WorkspaceContext,
    private readonly requirementsResolver: ProductPublicationRequirementsResolver,
  ) {}

  async execute(command: SmartSaveProductCommand): Promise<SmartSaveProductExecution> {
    const workspaceId = this.workspaceContext.getCurrentWorkspaceId();
    return command.operation === "Create"
      ? this.create(workspaceId, command)
      : this.update(workspaceId, command);
  }

  private async create(workspaceId: WorkspaceId, command: CreateSmartSaveProductCommand): Promise<SmartSaveProductExecution> {
    const product = Product.create({
      workspaceId,
      productId: command.productId,
      catalogId: command.catalogId,
      createdAt: command.effectiveTime,
      classification: command.classification,
      commercialDetails: command.commercialDetails,
      specificationValues: command.specificationValues,
      images: command.images,
    });
    const decision = await this.evaluate(product, workspaceId, command.catalogId);
    let outcome: SuccessfulOutcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft;
    if (decision.allowed) {
      product.publish(decision, command.effectiveTime);
      outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished;
    }
    const persisted = await this.repository.create(product);
    if (persisted.outcome === PRODUCT_CREATE_OUTCOMES.productIdConflict) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.productIdConflict, workspaceId, productId: command.productId });
    }
    if (persisted.outcome === PRODUCT_CREATE_OUTCOMES.productCodeConflict) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.productCodeConflict, workspaceId, productId: command.productId, productCode: persisted.productCode.value });
    }
    return successfulExecution(product, outcome, decision.reasons);
  }

  private async update(workspaceId: WorkspaceId, command: UpdateSmartSaveProductCommand): Promise<SmartSaveProductExecution> {
    const product = await this.repository.findById(workspaceId, command.productId);
    if (!product) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.productNotFound, workspaceId, productId: command.productId });
    }
    const loadedRevision = product.revision;
    if (!command.expectedPersistedRevision.equals(loadedRevision)) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.revisionConflict, workspaceId, productId: command.productId, expectedRevision: command.expectedPersistedRevision, actualPersistedRevision: loadedRevision });
    }
    product.updateClassification(command.classification, command.effectiveTime);
    product.updateCommercialDetails(command.commercialDetails, command.effectiveTime);
    product.replaceSpecificationValues(command.specificationValues, command.effectiveTime);
    product.replaceImages(command.images, command.effectiveTime);

    const previousState = product.lifecycleState.value;
    const decision = await this.evaluate(product, workspaceId, product.identity.catalogId);
    let outcome: SuccessfulOutcome;
    if (previousState === PRODUCT_LIFECYCLE_STATES.draft) {
      if (decision.allowed) {
        product.publish(decision, command.effectiveTime);
        outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished;
      } else outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft;
    } else if (previousState === PRODUCT_LIFECYCLE_STATES.published) {
      if (decision.allowed) outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedPublishedUpdate;
      else {
        product.archive(ProductArchiveReason.publicationRequirementsNotMet(), command.effectiveTime);
        outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoArchived;
      }
    } else if (
      decision.allowed &&
      product.archiveReason?.value === PRODUCT_ARCHIVE_REASONS.publicationRequirementsNotMet
    ) {
      product.restore(decision, command.effectiveTime);
      outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoRestored;
    } else outcome = SMART_SAVE_PRODUCT_OUTCOMES.savedArchivedUpdate;

    const persisted = await this.repository.update(product, loadedRevision);
    if (persisted.outcome === PRODUCT_UPDATE_OUTCOMES.productNotFound) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.productNotFound, workspaceId, productId: command.productId });
    }
    if (persisted.outcome === PRODUCT_UPDATE_OUTCOMES.revisionConflict) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.revisionConflict, workspaceId, productId: command.productId, expectedRevision: persisted.expectedRevision, actualPersistedRevision: persisted.actualPersistedRevision });
    }
    if (persisted.outcome === PRODUCT_UPDATE_OUTCOMES.productCodeConflict) {
      return execution({ outcome: SMART_SAVE_PRODUCT_OUTCOMES.productCodeConflict, workspaceId, productId: command.productId, productCode: persisted.productCode.value });
    }
    return successfulExecution(product, outcome, decision.reasons);
  }

  private async evaluate(product: Product, workspaceId: WorkspaceId, catalogId: CatalogId) {
    const requirements = await this.requirementsResolver.resolve({ workspaceId, catalogId, classification: product.classification });
    return ProductPublicationPolicy.evaluate(product, requirements);
  }
}

const execution = (result: SmartSaveProductResult): SmartSaveProductExecution =>
  Object.freeze({ result: Object.freeze(result), committedEvents: Object.freeze([]) });

const successfulExecution = (product: Product, outcome: SuccessfulOutcome, reasons: readonly ProductPublicationReason[]): SmartSaveProductExecution =>
  Object.freeze({
    result: Object.freeze({
      outcome,
      workspaceId: product.identity.workspaceId,
      productId: product.identity.productId,
      persistedRevision: product.revision,
      lifecycleState: product.lifecycleState.value,
      archiveReason: product.archiveReason?.value,
      missingPublicationReasons: Object.freeze([...reasons]),
    }),
    committedEvents: Object.freeze([...product.pullDomainEvents()]),
  });
