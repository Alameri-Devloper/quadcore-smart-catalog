import { randomUUID } from "node:crypto";
import { PostgreSqlProductMediaRootRepository } from "../../infrastructure/persistence/postgresql-product-media-root.repository";
import { PostgreSqlMediaSourceAttemptRepository } from "../../infrastructure/persistence/postgresql-media-source-attempt.repository";
import { PostgreSqlProductMediaWorkflowRepository } from "../../infrastructure/persistence/postgresql-product-media-workflow.repository";
import { PostgreSqlProductRepository } from "../../infrastructure/persistence/postgresql-product.repository";
import type { CatalogDatabase } from "../../infrastructure/persistence/database";
import { ProductMediaWorkflowError, type ProductMediaWorkflowState } from "../../media/domain/product-media-workflow";
import type { ProductEditAuthorizationPort, TrustedActorContext } from "../../media/ports/product-media-authorization.port";
import type { ProductImageProcessingConfiguration, ProductImageProcessor } from "../../media/ports/product-image-processor";
import type { ProductMediaStoragePort } from "../../media/ports/product-media-storage.port";
import {
  ExecuteProductMediaWorkflowUseCase,
  GetProductMediaStateQuery,
  GetProductMediaWorkflowByIdempotencyKeyQuery,
  GetProductMediaWorkflowQuery,
  RetryProductMediaOperationUseCase,
  type ProductMediaCommandOperation,
} from "../../media/services/product-media-workflow";
import { ReplaceProductMediaSourceUseCase } from "../../media/services/replace-product-media-source";
import type { ProductId } from "../../types/product-identity.value-object";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "../application/product-entry-execution-context";
import {
  resolveProductEntryFinalMediaOrder,
  type ProductEntryFinalMediaOrderInvalidCode,
} from "../application/resolve-product-entry-final-media-order";
import {
  ProductEntryMediaWorkflowCoordinationError,
  type CoordinateProductEntryMediaWorkflowCommand,
  type CoordinateProductEntryMediaWorkflowResult,
  type ProductEntryMediaWorkflowCoordinator,
  type ProductEntryMediaWorkflowView,
  type ProductEntryCoordinatedMediaOperation,
} from "../ports/product-entry-media-workflow-coordinator.port";

type WorkflowIdAllocator = () => string;

const actorFrom = (context: ProductEntryExecutionContext): TrustedActorContext => ({
  workspaceId: context.workspaceId,
  actorId: context.actorId.value,
});

const projectWorkflow = (workflow: ProductMediaWorkflowState): ProductEntryMediaWorkflowView => ({
  workflowId: workflow.workflowId,
  productId: workflow.productId.value,
  status: workflow.status,
  operations: workflow.operations.map((operation) => {
    return {
      operationId: operation.operationId,
      type: operation.type,
      status: operation.status,
      attemptCount: operation.attemptCount,
      retryAllowed: operation.retryAllowed,
      requiresNewSource: operation.requiresNewSource,
      errorCode: operation.errorCode ?? null,
    };
  }),
  startedAt: new Date(workflow.startedAt),
  completedAt: workflow.completedAt ? new Date(workflow.completedAt) : null,
});

export type MapProductEntryMediaOperationsResult =
  | { readonly type: "Resolved"; readonly operations: readonly ProductMediaCommandOperation[] }
  | { readonly type: "Invalid"; readonly code: ProductEntryFinalMediaOrderInvalidCode };

export const mapProductEntryMediaOperationsToCanonicalWorkflow = (
  operations: readonly ProductEntryCoordinatedMediaOperation[],
  currentMediaIds: readonly string[],
  persistedReorders: ReadonlyMap<string, readonly string[]> = new Map(),
): MapProductEntryMediaOperationsResult => {
  const removed = new Set(operations.flatMap((operation) => operation.type === "Remove" ? [operation.targetMediaId] : []));
  const finalMediaIds = currentMediaIds.filter((mediaId) => !removed.has(mediaId));
  const finalMediaSet = new Set(finalMediaIds);
  const newMediaIdsInPlanOrder: string[] = [];
  for (const operation of operations) {
    if (operation.type === "Add") {
      newMediaIdsInPlanOrder.push(operation.operationId);
      if (!finalMediaSet.has(operation.operationId)) {
        finalMediaSet.add(operation.operationId);
        finalMediaIds.push(operation.operationId);
      }
    }
  }
  const requestedPositions = new Map<string, number>();
  for (const operation of operations) {
    let mediaId: string | undefined;
    let position: number | undefined;
    if (operation.type === "Add" && operation.requestedDisplayOrder !== undefined) {
      mediaId = operation.operationId;
      position = operation.requestedDisplayOrder;
    } else if (operation.type === "Replace" && operation.requestedDisplayOrder !== undefined) {
      mediaId = operation.targetMediaId;
      position = operation.requestedDisplayOrder;
    } else if (operation.type === "Reorder") {
      mediaId = operation.targetMediaId;
      position = operation.requestedDisplayOrder;
    }
    if (mediaId !== undefined && position !== undefined) {
      if (requestedPositions.has(mediaId)) return { type: "Invalid", code: "DuplicateMediaId" };
      requestedPositions.set(mediaId, position);
    }
  }
  const resolvedOrder = resolveProductEntryFinalMediaOrder({
    currentOrderedMediaIds: currentMediaIds,
    finalMediaIds,
    newMediaIdsInPlanOrder,
    requestedPositions,
  });
  if (resolvedOrder.type === "Invalid") return resolvedOrder;

  const mapped: ProductMediaCommandOperation[] = [];
  for (const operation of operations) {
    if (operation.type !== "Reorder") {
      mapped.push(operation);
      continue;
    }
    const persisted = persistedReorders.get(operation.operationId);
    if (persisted) {
      if (new Set(persisted).size !== persisted.length) return { type: "Invalid", code: "DuplicateMediaId" };
      if (
        persisted.length !== finalMediaSet.size
        || persisted.some((mediaId) => !finalMediaSet.has(mediaId))
      ) return { type: "Invalid", code: "FinalMediaSetMismatch" };
    }
    mapped.push({
      operationId: operation.operationId,
      type: "Reorder",
      orderedMediaIds: persisted ? Object.freeze([...persisted]) : resolvedOrder.orderedMediaIds,
    });
  }
  return { type: "Resolved", operations: Object.freeze(mapped) };
};

const mapWorkflowError = (error: ProductMediaWorkflowError): ProductEntryMediaWorkflowCoordinationError => {
  switch (error.code) {
    case "ProductMediaAuthorizationDenied": return new ProductEntryMediaWorkflowCoordinationError("AuthorizationDenied");
    case "ProductNotFound": return new ProductEntryMediaWorkflowCoordinationError("ProductNotFound");
    case "ProductMediaIdempotencyConflict": return new ProductEntryMediaWorkflowCoordinationError("IdempotencyConflict");
    case "MediaRevisionConflict": return new ProductEntryMediaWorkflowCoordinationError("MediaRevisionConflict");
    case "ProductMediaValidationFailed": return new ProductEntryMediaWorkflowCoordinationError("ValidationFailed");
    default: return new ProductEntryMediaWorkflowCoordinationError("WorkflowConflict");
  }
};

export class ProductEntryMediaWorkflowCoordinatorAdapter implements ProductEntryMediaWorkflowCoordinator {
  private readonly workflows: PostgreSqlProductMediaWorkflowRepository;
  private readonly products: PostgreSqlProductRepository;
  private readonly roots: PostgreSqlProductMediaRootRepository;

  constructor(
    private readonly database: CatalogDatabase,
    private readonly processor: ProductImageProcessor,
    private readonly processingConfiguration: ProductImageProcessingConfiguration,
    private readonly storage: ProductMediaStoragePort | undefined,
    private readonly allocateWorkflowId: WorkflowIdAllocator = randomUUID,
  ) {
    this.workflows = new PostgreSqlProductMediaWorkflowRepository(this.database);
    this.products = PostgreSqlProductRepository.transactional(this.database);
    this.roots = new PostgreSqlProductMediaRootRepository(this.database);
  }

  async coordinate(
    command: CoordinateProductEntryMediaWorkflowCommand,
  ): Promise<CoordinateProductEntryMediaWorkflowResult> {
    if (!this.storage) throw new Error("Product Media storage is unavailable for upload coordination.");
    const authorization = this.authorization(command.context, PRODUCT_ENTRY_PERMISSIONS.mediaUpload);
    const dependencies = {
      workflows: this.workflows,
      products: this.products,
      roots: this.roots,
      authorization,
      processor: this.processor,
      processingConfiguration: this.processingConfiguration,
      storage: this.storage,
    };
    const actor = actorFrom(command.context);
    let existing: ProductMediaWorkflowState | null;
    try {
      existing = await this.resolveExistingState(
        command.context,
        command.linkedWorkflowId,
        command.idempotencyKey,
        PRODUCT_ENTRY_PERMISSIONS.mediaUpload,
      );
    }
    catch (error) {
      if (error instanceof ProductMediaWorkflowError) throw mapWorkflowError(error);
      throw error;
    }
    const byIdempotency = new GetProductMediaWorkflowByIdempotencyKeyQuery({ workflows: this.workflows, authorization });
    const allocatedWorkflowId = this.allocateWorkflowId();
    const workflowId = existing?.workflowId ?? allocatedWorkflowId;
    const currentMediaState = await new GetProductMediaStateQuery({ workflows: this.workflows, authorization })
      .execute(actor, command.productId);
    const expectedMediaRevision = existing?.expectedMediaRevision ?? currentMediaState.revision;
    const persistedReorders = new Map((existing?.operations ?? []).flatMap((operation) =>
      operation.type === "Reorder" && operation.orderedMediaIds
        ? [[operation.operationId, operation.orderedMediaIds] as const]
        : []));
    const mapping = mapProductEntryMediaOperationsToCanonicalWorkflow(
      command.operations,
      [...currentMediaState.items]
        .sort((left, right) => left.displayOrder - right.displayOrder || left.mediaId.localeCompare(right.mediaId))
        .map((item) => item.mediaId),
      persistedReorders,
    );
    if (mapping.type === "Invalid") {
      throw new ProductEntryMediaWorkflowCoordinationError("ValidationFailed");
    }
    const operations = mapping.operations;
    let workflow: ProductMediaWorkflowState;
    try {
      workflow = await new ExecuteProductMediaWorkflowUseCase(dependencies).execute({
        actorContext: actor,
        workflowId,
        productId: command.productId,
        expectedMediaRevision,
        idempotencyKey: command.idempotencyKey,
        operations,
        effectiveTime: command.effectiveTime,
      });
      for (const operation of existing ? [...workflow.operations] : []) {
        if (!operation.retryAllowed) continue;
        workflow = await new RetryProductMediaOperationUseCase(dependencies).execute({
          actorContext: actor,
          workflowId: workflow.workflowId,
          operationId: operation.operationId,
          effectiveTime: command.effectiveTime,
        });
      }
    } catch (error) {
      if (!(error instanceof ProductMediaWorkflowError)) throw error;
      if ([
        "ProductMediaOperationAlreadyInProgress",
        "ProductMediaStorageFailed",
        "ProductMediaSourceUnavailable",
        "ProductMediaRetryNotAllowed",
        "ProductMediaReconciliationRequired",
      ].includes(error.code)) {
        const durable = await byIdempotency.execute(actor, command.idempotencyKey);
        if (durable) {
          return {
            workflow: projectWorkflow(durable),
            idempotentReplay: existing !== null || durable.workflowId !== allocatedWorkflowId,
            resumed: existing !== null,
          };
        }
      }
      throw mapWorkflowError(error);
    }
    return {
      workflow: projectWorkflow(workflow),
      idempotentReplay: existing !== null || workflow.workflowId !== allocatedWorkflowId,
      resumed: existing !== null && existing.status !== "Completed",
    };
  }

  async resolveExisting(
    context: ProductEntryExecutionContext,
    linkedWorkflowId: string | undefined,
    idempotencyKey: string,
  ): Promise<ProductEntryMediaWorkflowView | null> {
    const permission = context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.mediaUpload)
      ? PRODUCT_ENTRY_PERMISSIONS.mediaUpload
      : PRODUCT_ENTRY_PERMISSIONS.read;
    try {
      const workflow = await this.resolveExistingState(context, linkedWorkflowId, idempotencyKey, permission);
      return workflow ? projectWorkflow(workflow) : null;
    } catch (error) {
      if (error instanceof ProductEntryMediaWorkflowCoordinationError) throw error;
      if (error instanceof ProductMediaWorkflowError) throw mapWorkflowError(error);
      throw error;
    }
  }

  async findByWorkflowId(
    context: ProductEntryExecutionContext,
    workflowId: string,
  ): Promise<ProductEntryMediaWorkflowView | null> {
    const authorization = this.authorization(context, PRODUCT_ENTRY_PERMISSIONS.read);
    try {
      return projectWorkflow(await new GetProductMediaWorkflowQuery({ workflows: this.workflows, authorization })
        .execute(actorFrom(context), workflowId));
    } catch (error) {
      if (error instanceof ProductMediaWorkflowError && error.code === "ProductMediaWorkflowNotFound") return null;
      if (error instanceof ProductMediaWorkflowError) throw mapWorkflowError(error);
      throw error;
    }
  }

  async findByIdempotencyKey(
    context: ProductEntryExecutionContext,
    idempotencyKey: string,
  ): Promise<ProductEntryMediaWorkflowView | null> {
    const authorization = this.authorization(context, PRODUCT_ENTRY_PERMISSIONS.read);
    try {
      const workflow = await new GetProductMediaWorkflowByIdempotencyKeyQuery({ workflows: this.workflows, authorization })
        .execute(actorFrom(context), idempotencyKey);
      return workflow ? projectWorkflow(workflow) : null;
    } catch (error) {
      if (error instanceof ProductMediaWorkflowError) throw mapWorkflowError(error);
      throw error;
    }
  }

  async replaceUnavailableSources(
    command: Parameters<ProductEntryMediaWorkflowCoordinator["replaceUnavailableSources"]>[0],
  ): ReturnType<ProductEntryMediaWorkflowCoordinator["replaceUnavailableSources"]> {
    if (!this.storage) throw new Error("Product Media storage is unavailable for source replacement.");
    const authorization = this.authorization(command.context, PRODUCT_ENTRY_PERMISSIONS.mediaSourceReplace);
    const useCase = new ReplaceProductMediaSourceUseCase({
      attempts: new PostgreSqlMediaSourceAttemptRepository(this.database),
      workflows: this.workflows,
      products: this.products,
      roots: this.roots,
      authorization,
      processor: this.processor,
      processingConfiguration: this.processingConfiguration,
      storage: this.storage,
    });
    const sourceAttempts: { operationId: string; sourceAttemptId: string }[] = [];
    const resumeUnavailableOperationIds: string[] = [];
    for (const source of command.sources) {
      const result = await useCase.execute({
        actorContext: actorFrom(command.context),
        operationId: source.operationId,
        bytes: source.bytes,
        clientMediaType: source.clientMediaType,
        effectiveTime: command.effectiveTime,
      });
      if (result.type === "MediaWorkflowResumed" || result.type === "MediaWorkflowResumeUnavailable") {
        sourceAttempts.push({ operationId: source.operationId, sourceAttemptId: result.sourceAttemptId });
        if (result.type === "MediaWorkflowResumeUnavailable") resumeUnavailableOperationIds.push(source.operationId);
        continue;
      }
      return { type: "Rejected", code: result.type === "SourceValidationFailed" ? result.code : result.type, operationId: source.operationId };
    }
    const workflow = await this.workflows.findById(command.context.workspaceId, command.workflowId);
    if (!workflow) return { type: "Rejected", code: "MediaOperationNotFound", operationId: command.sources[0]?.operationId ?? "unknown" };
    return {
      type: "Replaced",
      workflow: projectWorkflow(workflow),
      sourceAttempts: Object.freeze(sourceAttempts),
      resumeUnavailableOperationIds: Object.freeze(resumeUnavailableOperationIds),
    };
  }

  private authorization(
    expected: ProductEntryExecutionContext,
    permission: typeof PRODUCT_ENTRY_PERMISSIONS.mediaUpload | typeof PRODUCT_ENTRY_PERMISSIONS.mediaSourceReplace | typeof PRODUCT_ENTRY_PERMISSIONS.read,
  ): ProductEditAuthorizationPort {
    return {
      canEditProduct: async (actor: TrustedActorContext, productId: ProductId): Promise<boolean> =>
        actor.workspaceId.value === expected.workspaceId.value
        && actor.actorId === expected.actorId.value
        && expected.permissions.has(permission)
        && (await this.products.findById(expected.workspaceId, productId)) !== null,
    };
  }

  private async resolveExistingState(
    context: ProductEntryExecutionContext,
    linkedWorkflowId: string | undefined,
    idempotencyKey: string,
    permission: typeof PRODUCT_ENTRY_PERMISSIONS.mediaUpload | typeof PRODUCT_ENTRY_PERMISSIONS.mediaSourceReplace | typeof PRODUCT_ENTRY_PERMISSIONS.read,
  ): Promise<ProductMediaWorkflowState | null> {
    const authorization = this.authorization(context, permission);
    const actor = actorFrom(context);
    const byIdempotency = await new GetProductMediaWorkflowByIdempotencyKeyQuery({
      workflows: this.workflows,
      authorization,
    }).execute(actor, idempotencyKey);
    if (!linkedWorkflowId) return byIdempotency;

    let linked: ProductMediaWorkflowState;
    try {
      linked = await new GetProductMediaWorkflowQuery({ workflows: this.workflows, authorization })
        .execute(actor, linkedWorkflowId);
    } catch (error) {
      if (error instanceof ProductMediaWorkflowError && error.code === "ProductMediaWorkflowNotFound") {
        throw new ProductEntryMediaWorkflowCoordinationError("WorkflowConflict");
      }
      throw error;
    }
    if (
      linked.idempotencyKey !== idempotencyKey
      || !byIdempotency
      || byIdempotency.workflowId !== linked.workflowId
    ) throw new ProductEntryMediaWorkflowCoordinationError("WorkflowConflict");
    return linked;
  }
}
