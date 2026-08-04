import { randomUUID } from "node:crypto";
import { PostgreSqlProductMediaRootRepository } from "../../infrastructure/persistence/postgresql-product-media-root.repository";
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
} from "../../media/services/product-media-workflow";
import type { ProductId } from "../../types/product-identity.value-object";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "../application/product-entry-execution-context";
import {
  ProductEntryMediaWorkflowCoordinationError,
  type CoordinateProductEntryMediaWorkflowCommand,
  type CoordinateProductEntryMediaWorkflowResult,
  type ProductEntryMediaWorkflowCoordinator,
  type ProductEntryMediaWorkflowView,
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
    if (operation.type === "SetCover" || operation.type === "Reorder") {
      throw new ProductEntryMediaWorkflowCoordinationError("ValidationFailed");
    }
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
    database: CatalogDatabase,
    private readonly processor: ProductImageProcessor,
    private readonly processingConfiguration: ProductImageProcessingConfiguration,
    private readonly storage: ProductMediaStoragePort | undefined,
    private readonly allocateWorkflowId: WorkflowIdAllocator = randomUUID,
  ) {
    this.workflows = new PostgreSqlProductMediaWorkflowRepository(database);
    this.products = PostgreSqlProductRepository.transactional(database);
    this.roots = new PostgreSqlProductMediaRootRepository(database);
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
    const expectedMediaRevision = existing?.expectedMediaRevision
      ?? (await new GetProductMediaStateQuery({ workflows: this.workflows, authorization }).execute(actor, command.productId)).revision;
    let workflow: ProductMediaWorkflowState;
    try {
      workflow = await new ExecuteProductMediaWorkflowUseCase(dependencies).execute({
        actorContext: actor,
        workflowId,
        productId: command.productId,
        expectedMediaRevision,
        idempotencyKey: command.idempotencyKey,
        operations: command.operations,
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

  private authorization(
    expected: ProductEntryExecutionContext,
    permission: typeof PRODUCT_ENTRY_PERMISSIONS.mediaUpload | typeof PRODUCT_ENTRY_PERMISSIONS.read,
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
    permission: typeof PRODUCT_ENTRY_PERMISSIONS.mediaUpload | typeof PRODUCT_ENTRY_PERMISSIONS.read,
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
