import type { ProductPublicationRequirementsResolver } from "../../services/product-publication-requirements-resolver.port";
import {
  SMART_SAVE_PRODUCT_OUTCOMES,
  SmartSaveProduct,
  type SmartSaveProductResult,
  type SmartSaveProductSuccess,
} from "../../services/smart-save-product";
import { ProductRevision } from "../../types/product-revision.value-object";
import {
  PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS,
  type ProductPublicationRequirements,
} from "../../types/product-publication-requirements.value-object";
import { ProductPublicationReason } from "../../types/product-publication-reason.value-object";
import { createProductEntryMediaPlan } from "../domain/product-entry-media-plan";
import { PRODUCT_ENTRY_SUBMISSION_MODES } from "../domain/product-entry-submission";
import type { ProductEntryAuditRecord } from "../repositories/product-entry-audit.repository";
import { PRODUCT_ENTRY_AUDIT_EVENT_TYPES } from "../repositories/product-entry-audit.repository";
import type { ProductEntrySaveReceipt } from "../repositories/product-entry-submission.repository";
import type { ProductEntryClock } from "../ports/product-entry-clock.port";
import {
  commitProductEntryTransaction,
  rollbackProductEntryTransaction,
  type ProductEntryUnitOfWork,
} from "../ports/product-entry-unit-of-work.port";
import type { ProductEntryValidationReason, SubmitProductEntryCommand } from "./product-entry-command";
import { PRODUCT_ENTRY_VALIDATION_CODES } from "./product-entry-command";
import { ProductEntryCommandValidator } from "./product-entry-command-validator";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";
import { ProductEntryRequestFingerprintService } from "./product-entry-request-fingerprint";

export type SubmitProductEntryResult =
  | {
      readonly type: "Accepted";
      readonly idempotentReplay: boolean;
      readonly submissionId: string;
      readonly productId: string;
      readonly productRevision: number;
      readonly productSaveResult: SmartSaveProductSuccess;
      readonly mediaUploadState: "PendingUpload";
    }
  | { readonly type: "SubmissionFingerprintConflict"; readonly submissionId: string }
  | { readonly type: "ProductNotFound"; readonly productId: string }
  | { readonly type: "ProductRevisionConflict"; readonly productId: string; readonly expectedRevision: number; readonly actualRevision: number }
  | { readonly type: "ProductIdConflict"; readonly productId: string }
  | { readonly type: "ProductCodeConflict"; readonly productCode: string }
  | { readonly type: "Forbidden"; readonly permission: string }
  | { readonly type: "InvalidRequest"; readonly reasons: readonly ProductEntryValidationReason[] };

export interface SubmitProductEntryDependencies {
  readonly unitOfWork: ProductEntryUnitOfWork;
  readonly requirementsResolver: ProductPublicationRequirementsResolver;
  readonly clock: ProductEntryClock;
  readonly validator?: ProductEntryCommandValidator;
  readonly fingerprintService?: ProductEntryRequestFingerprintService;
}

const successOutcomes = new Set<string>([
  SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft,
  SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished,
  SMART_SAVE_PRODUCT_OUTCOMES.savedPublishedUpdate,
  SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoArchived,
  SMART_SAVE_PRODUCT_OUTCOMES.savedArchivedUpdate,
  SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoRestored,
]);

const isSuccess = (result: SmartSaveProductResult): result is SmartSaveProductSuccess =>
  successOutcomes.has(result.outcome);

const receiptFromResult = (result: SmartSaveProductSuccess): ProductEntrySaveReceipt => Object.freeze({
  outcome: result.outcome,
  lifecycleState: result.lifecycleState,
  archiveReason: result.archiveReason ?? null,
  missingPublicationReasons: Object.freeze(result.missingPublicationReasons.map((reason) => Object.freeze({
    code: reason.code,
    specificationFieldId: reason.specificationFieldId ?? null,
  }))),
});

const resultFromReceipt = (
  receipt: ProductEntrySaveReceipt,
  workspaceId: SmartSaveProductSuccess["workspaceId"],
  productId: SmartSaveProductSuccess["productId"],
  productRevision: number,
): SmartSaveProductSuccess => Object.freeze({
  outcome: receipt.outcome,
  workspaceId,
  productId,
  persistedRevision: ProductRevision.rehydrate(productRevision),
  lifecycleState: receipt.lifecycleState,
  archiveReason: receipt.archiveReason ?? undefined,
  missingPublicationReasons: Object.freeze(receipt.missingPublicationReasons.map((reason) =>
    reason.code === "MissingRequiredSpecification"
      ? ProductPublicationReason.missingRequiredSpecification(reason.specificationFieldId!)
      : ProductPublicationReason.missing(reason.code),
  )),
});

const fixedRequirementsResolver = (requirements: ProductPublicationRequirements): ProductPublicationRequirementsResolver => ({
  resolve: async () => requirements,
});

const mediaPlansEqual = (
  left: readonly ReturnType<typeof createProductEntryMediaPlan>[number][],
  right: readonly ReturnType<typeof createProductEntryMediaPlan>[number][],
): boolean => left.length === right.length && left.every((operation, index) => {
  const candidate = right[index];
  return candidate !== undefined &&
    operation.operationId === candidate.operationId &&
    operation.operationType === candidate.operationType &&
    operation.sequence === candidate.sequence &&
    operation.mediaId === candidate.mediaId &&
    operation.requestedDisplayOrder === candidate.requestedDisplayOrder &&
    operation.selectedAsCover === candidate.selectedAsCover &&
    operation.expectedSourceSha256 === candidate.expectedSourceSha256 &&
    operation.expectedSourceByteLength === candidate.expectedSourceByteLength &&
    operation.finalOrder === candidate.finalOrder;
});

const mapFailure = (result: Exclude<SmartSaveProductResult, SmartSaveProductSuccess>): SubmitProductEntryResult => {
  switch (result.outcome) {
    case SMART_SAVE_PRODUCT_OUTCOMES.productNotFound:
      return { type: "ProductNotFound", productId: result.productId.value };
    case SMART_SAVE_PRODUCT_OUTCOMES.revisionConflict:
      return {
        type: "ProductRevisionConflict",
        productId: result.productId.value,
        expectedRevision: result.expectedRevision.value,
        actualRevision: result.actualPersistedRevision.value,
      };
    case SMART_SAVE_PRODUCT_OUTCOMES.productIdConflict:
      return { type: "ProductIdConflict", productId: result.productId.value };
    case SMART_SAVE_PRODUCT_OUTCOMES.productCodeConflict:
      return { type: "ProductCodeConflict", productCode: result.productCode };
  }
};

export class SubmitProductEntryUseCase {
  private readonly validator: ProductEntryCommandValidator;
  private readonly fingerprintService: ProductEntryRequestFingerprintService;

  constructor(private readonly dependencies: SubmitProductEntryDependencies) {
    this.validator = dependencies.validator ?? new ProductEntryCommandValidator();
    this.fingerprintService = dependencies.fingerprintService ?? new ProductEntryRequestFingerprintService();
  }

  async execute(context: ProductEntryExecutionContext, input: SubmitProductEntryCommand | unknown): Promise<SubmitProductEntryResult> {
    const prepared = this.validator.prepare(input);
    if (prepared.type === "Invalid") return { type: "InvalidRequest", reasons: prepared.reasons };
    const command = prepared.command;
    const permission = command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create
      ? PRODUCT_ENTRY_PERMISSIONS.create
      : PRODUCT_ENTRY_PERMISSIONS.edit;
    if (!context.permissions.has(permission)) return { type: "Forbidden", permission };

    const fingerprint = this.fingerprintService.calculate(command.canonicalPayload);
    const effectiveTime = this.dependencies.clock.now();
    if (!(effectiveTime instanceof Date) || Number.isNaN(effectiveTime.getTime())) {
      throw new Error("Product Entry Clock returned an invalid timestamp.");
    }

    let mediaPlan;
    try {
      mediaPlan = createProductEntryMediaPlan(command.mediaOperations.map((operation) => ({
        ...operation,
        workspaceId: context.workspaceId,
        submissionId: command.submissionId,
        createdAt: effectiveTime,
      })));
    } catch {
      return {
        type: "InvalidRequest",
        reasons: Object.freeze([{ code: PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan }]),
      };
    }

    return this.dependencies.unitOfWork.execute(async (transaction) => {
      const editProduct = command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.edit
        ? await transaction.productRepository.findById(context.workspaceId, command.productId!)
        : null;
      if (command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.edit && !editProduct) {
        return rollbackProductEntryTransaction<SubmitProductEntryResult>({
          type: "ProductNotFound",
          productId: command.productId!.value,
        });
      }
      const claimed = await transaction.submissionRepository.claim({
        workspaceId: context.workspaceId,
        submissionId: command.submissionId,
        requestFingerprint: fingerprint,
        mode: command.mode,
        productId: command.productId,
        claimedAt: effectiveTime,
      });
      if (claimed.type === "FingerprintConflict") {
        return commitProductEntryTransaction<SubmitProductEntryResult>({
          type: "SubmissionFingerprintConflict",
          submissionId: command.submissionId.value,
        });
      }
      if (claimed.type === "Existing") {
        const submission = claimed.submission;
        if (submission.productId === null || submission.productRevision === null) {
          return commitProductEntryTransaction<SubmitProductEntryResult>({
            type: "InvalidRequest",
            reasons: Object.freeze([{ code: PRODUCT_ENTRY_VALIDATION_CODES.submissionNotReady }]),
          });
        }
        const [product, persistedPlan, receipt] = await Promise.all([
          transaction.productRepository.findById(context.workspaceId, submission.productId),
          transaction.mediaPlanRepository.findBySubmission(context.workspaceId, command.submissionId),
          transaction.submissionRepository.findSaveReceipt(context.workspaceId, command.submissionId),
        ]);
        if (!product) {
          return commitProductEntryTransaction<SubmitProductEntryResult>({
            type: "ProductNotFound",
            productId: submission.productId.value,
          });
        }
        if (!receipt || !mediaPlansEqual(persistedPlan, mediaPlan)) {
          return commitProductEntryTransaction<SubmitProductEntryResult>({
            type: "InvalidRequest",
            reasons: Object.freeze([{ code: PRODUCT_ENTRY_VALIDATION_CODES.submissionNotReady }]),
          });
        }
        return commitProductEntryTransaction<SubmitProductEntryResult>({
          type: "Accepted",
          idempotentReplay: true,
          submissionId: command.submissionId.value,
          productId: product.identity.productId.value,
          productRevision: submission.productRevision,
          productSaveResult: resultFromReceipt(receipt, context.workspaceId, product.identity.productId, submission.productRevision),
          mediaUploadState: "PendingUpload",
        });
      }

      await transaction.mediaPlanRepository.save(mediaPlan);
      const productId = command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create
        ? await transaction.productIdAllocator.allocate(context.workspaceId)
        : command.productId!;
      const existing = editProduct;
      const catalogId = command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create
        ? command.draft.catalogId!
        : existing!.identity.catalogId;
      const requirements = await this.dependencies.requirementsResolver.resolve({
        workspaceId: context.workspaceId,
        catalogId,
        classification: command.draft.classification,
      });
      let commercialDetails = command.draft.commercialDetails;
      const requestedPricing = commercialDetails.pricing;
      const existingPricing = existing?.commercialDetails?.pricing;
      const retailPrice = context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.pricingView)
        ? requestedPricing?.retailPrice
        : existingPricing?.retailPrice;
      const wholesalePrice = context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.wholesaleView)
        ? requestedPricing?.wholesalePrice
        : existingPricing?.wholesalePrice;
      commercialDetails = {
        ...commercialDetails,
        pricing: retailPrice || wholesalePrice
          ? {
              ...(retailPrice ? { retailPrice: { amountMinor: retailPrice.amountMinor, currency: retailPrice.currency } } : {}),
              ...(wholesalePrice ? { wholesalePrice: { amountMinor: wholesalePrice.amountMinor, currency: wholesalePrice.currency } } : {}),
            }
          : undefined,
      };
      if (
        command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create &&
        commercialDetails.productCode === undefined &&
        requirements.commercial.includes(PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.productCode)
      ) {
        commercialDetails = {
          ...commercialDetails,
          productCode: await transaction.productCodeAllocator.allocate(context.workspaceId),
        };
      }
      const smartSave = new SmartSaveProduct(
        transaction.productRepository,
        { getCurrentWorkspaceId: () => context.workspaceId },
        fixedRequirementsResolver(requirements),
      );
      const execution = await smartSave.execute(command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create
        ? {
            operation: "Create",
            productId,
            catalogId,
            classification: command.draft.classification,
            commercialDetails,
            specificationValues: command.draft.specificationValues,
            images: [],
            effectiveTime,
          }
        : {
            operation: "Update",
            productId,
            expectedPersistedRevision: ProductRevision.rehydrate(command.expectedProductRevision!),
            classification: command.draft.classification,
            commercialDetails,
            specificationValues: command.draft.specificationValues,
            images: existing!.images.map((image) => ({
              productImageId: image.productImageId,
              storageReference: image.storageReference,
              order: image.order,
              isMain: image.isMain,
              altText: image.altText,
            })),
            effectiveTime,
          });
      if (!isSuccess(execution.result)) {
        return rollbackProductEntryTransaction(mapFailure(execution.result));
      }

      const auditRecords: readonly ProductEntryAuditRecord[] = Object.freeze([
        {
          eventType: PRODUCT_ENTRY_AUDIT_EVENT_TYPES.submissionClaimed,
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          submissionId: command.submissionId,
          productId,
          resultCode: "Claimed",
          occurredAt: effectiveTime,
        },
        {
          eventType: command.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create
            ? PRODUCT_ENTRY_AUDIT_EVENT_TYPES.productCreateRequested
            : PRODUCT_ENTRY_AUDIT_EVENT_TYPES.productEditRequested,
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          submissionId: command.submissionId,
          productId,
          resultCode: command.mode,
          occurredAt: effectiveTime,
        },
        {
          eventType: PRODUCT_ENTRY_AUDIT_EVENT_TYPES.productSaved,
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          submissionId: command.submissionId,
          productId,
          resultCode: execution.result.outcome,
          occurredAt: effectiveTime,
        },
        {
          eventType: PRODUCT_ENTRY_AUDIT_EVENT_TYPES.lifecycleOutcome,
          workspaceId: context.workspaceId,
          actorId: context.actorId,
          submissionId: command.submissionId,
          productId,
          resultCode: execution.result.lifecycleState,
          occurredAt: effectiveTime,
        },
      ]);
      await transaction.auditRepository.append(auditRecords);
      await transaction.submissionRepository.markProductSaved({
        workspaceId: context.workspaceId,
        submissionId: command.submissionId,
        productId,
        productRevision: execution.result.persistedRevision.value,
        receipt: receiptFromResult(execution.result),
        savedAt: effectiveTime,
      });
      return commitProductEntryTransaction<SubmitProductEntryResult>({
        type: "Accepted",
        idempotentReplay: false,
        submissionId: command.submissionId.value,
        productId: productId.value,
        productRevision: execution.result.persistedRevision.value,
        productSaveResult: execution.result,
        mediaUploadState: "PendingUpload",
      });
    });
  }
}
