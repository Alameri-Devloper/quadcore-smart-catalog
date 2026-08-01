import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { ProductMediaItem, ProductMediaState } from "../../media/domain/product-media-state";
import { ProductMediaOperationId } from "../../media/domain/product-media-operation-id";
import type { ProductMediaOperationState, ProductMediaOperationStatus, ProductMediaOperationType, ProductMediaWorkflowState, ProductMediaWorkflowStatus } from "../../media/domain/product-media-workflow";
import type { ClaimProductMediaOperationResult, CreateProductMediaWorkflowResult, ProductMediaOperationTransition, ProductMediaWorkflowRepository, SaveProductMediaWorkflowResult, StageProductMediaOperationTransition, TransitionProductMediaOperationResult } from "../../media/repositories/product-media-workflow.repository";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { CatalogDatabase } from "./database";
import { catalogProductImages, catalogProductMediaOperations, catalogProductMediaStates, catalogProductMediaWorkflows } from "./schema";

class PersistenceConflict extends Error { constructor(readonly kind: "Workflow" | "Media") { super(kind); } }
const UNIQUE_VIOLATION = "23505";
const errorConstraint = (error: unknown): string | undefined => {
  let value = error;
  while (typeof value === "object" && value !== null) {
    const candidate = value as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (candidate.code === UNIQUE_VIOLATION && typeof candidate.constraint === "string") return candidate.constraint;
    value = candidate.cause;
  }
  return undefined;
};

const operationRow = (operation: ProductMediaOperationState) => ({
  workspaceId: operation.workspaceId.value, operationId: operation.operationId, workflowId: operation.workflowId,
  type: operation.type, status: operation.status, targetMediaId: operation.targetMediaId,
  requestedDisplayOrder: operation.requestedDisplayOrder, selectAsCover: operation.selectAsCover,
  orderedMediaIds: operation.orderedMediaIds ? [...operation.orderedMediaIds] : null,
  stagedArtifactKey: operation.stagedArtifactKey, finalArtifactKey: operation.finalArtifactKey,
  stagedSha256: operation.stagedSha256, stagedByteLength: operation.stagedByteLength,
  stagedWidth: operation.stagedWidth, stagedHeight: operation.stagedHeight, expiresAt: operation.expiresAt,
  attemptCount: operation.attemptCount, lastAttemptAt: operation.lastAttemptAt, retryAllowed: operation.retryAllowed,
  requiresNewSource: operation.requiresNewSource, errorCode: operation.errorCode, createdAt: operation.createdAt,
  completedAt: operation.completedAt,
});

const workflowRow = (workflow: ProductMediaWorkflowState) => ({
  workspaceId: workflow.workspaceId.value, workflowId: workflow.workflowId, productId: workflow.productId.value,
  status: workflow.status, expectedMediaRevision: workflow.expectedMediaRevision, idempotencyKey: workflow.idempotencyKey,
  requestFingerprint: workflow.requestFingerprint,
  createdBy: workflow.createdBy, startedAt: workflow.startedAt, completedAt: workflow.completedAt, version: workflow.version,
});

const mediaItemRow = (item: ProductMediaItem, coverMediaId?: string) => ({
  workspaceId: item.workspaceId.value, productId: item.productId.value, productImageId: item.mediaId,
  storageKey: item.storageArtifactKey, checksumSha256: item.checksumSha256, mimeType: item.mimeType,
  position: item.displayOrder, isMain: item.mediaId === coverMediaId, altText: null,
  mediaCreatedAt: item.createdAt, mediaCreatedBy: item.createdBy,
});

const toOperation = (row: typeof catalogProductMediaOperations.$inferSelect): ProductMediaOperationState => ({
  operationId: ProductMediaOperationId.rehydrate(row.operationId).value, workflowId: row.workflowId, workspaceId: WorkspaceId.create(row.workspaceId),
  type: row.type as ProductMediaOperationType, status: row.status as ProductMediaOperationStatus,
  targetMediaId: row.targetMediaId ?? undefined, requestedDisplayOrder: row.requestedDisplayOrder ?? undefined,
  selectAsCover: row.selectAsCover, orderedMediaIds: row.orderedMediaIds ? [...row.orderedMediaIds] : undefined,
  stagedArtifactKey: row.stagedArtifactKey ?? undefined, finalArtifactKey: row.finalArtifactKey ?? undefined,
  stagedSha256: row.stagedSha256 ?? undefined, stagedByteLength: row.stagedByteLength ?? undefined,
  stagedWidth: row.stagedWidth ?? undefined, stagedHeight: row.stagedHeight ?? undefined,
  expiresAt: row.expiresAt ?? undefined, attemptCount: row.attemptCount, lastAttemptAt: row.lastAttemptAt ?? undefined,
  retryAllowed: row.retryAllowed, requiresNewSource: row.requiresNewSource, errorCode: row.errorCode ?? undefined,
  createdAt: row.createdAt, completedAt: row.completedAt ?? undefined,
});

const toWorkflow = (row: typeof catalogProductMediaWorkflows.$inferSelect, operations: readonly (typeof catalogProductMediaOperations.$inferSelect)[]): ProductMediaWorkflowState => ({
  workflowId: row.workflowId, workspaceId: WorkspaceId.create(row.workspaceId), productId: ProductId.create(row.productId),
  status: row.status as ProductMediaWorkflowStatus, expectedMediaRevision: row.expectedMediaRevision,
  idempotencyKey: row.idempotencyKey, requestFingerprint: row.requestFingerprint, createdBy: row.createdBy, startedAt: row.startedAt,
  completedAt: row.completedAt ?? undefined, version: row.version, operations: operations.map(toOperation),
});

export class PostgreSqlProductMediaWorkflowRepository implements ProductMediaWorkflowRepository {
  constructor(private readonly database: CatalogDatabase) {}

  private async hydrate(row: typeof catalogProductMediaWorkflows.$inferSelect): Promise<ProductMediaWorkflowState> {
    const operations = await this.database.select().from(catalogProductMediaOperations).where(and(
      eq(catalogProductMediaOperations.workspaceId, row.workspaceId), eq(catalogProductMediaOperations.workflowId, row.workflowId),
    )).orderBy(asc(catalogProductMediaOperations.createdAt), asc(catalogProductMediaOperations.operationId));
    return toWorkflow(row, operations);
  }

  async findById(workspaceId: WorkspaceId, workflowId: string): Promise<ProductMediaWorkflowState | null> {
    const [row] = await this.database.select().from(catalogProductMediaWorkflows).where(and(eq(catalogProductMediaWorkflows.workspaceId, workspaceId.value), eq(catalogProductMediaWorkflows.workflowId, workflowId))).limit(1);
    return row ? this.hydrate(row) : null;
  }

  async findByIdempotencyKey(workspaceId: WorkspaceId, idempotencyKey: string): Promise<ProductMediaWorkflowState | null> {
    const [row] = await this.database.select().from(catalogProductMediaWorkflows).where(and(eq(catalogProductMediaWorkflows.workspaceId, workspaceId.value), eq(catalogProductMediaWorkflows.idempotencyKey, idempotencyKey))).limit(1);
    return row ? this.hydrate(row) : null;
  }

  async create(workflow: ProductMediaWorkflowState): Promise<CreateProductMediaWorkflowResult> {
    try {
      await this.database.transaction(async (transaction) => {
        await transaction.insert(catalogProductMediaWorkflows).values(workflowRow(workflow));
        if (workflow.operations.length) await transaction.insert(catalogProductMediaOperations).values(workflow.operations.map(operationRow));
      });
      return { type: "Created" };
    } catch (error) {
      const constraint = errorConstraint(error);
      if (constraint === "catalog_product_media_workflows_idempotency_uq") {
        const existing = await this.findByIdempotencyKey(workflow.workspaceId, workflow.idempotencyKey);
        return existing && existing.requestFingerprint === workflow.requestFingerprint
          ? { type: "Existing", workflow: existing } : { type: "IdempotencyConflict" };
      }
      if (constraint === "catalog_product_media_workflows_pk" || constraint === "catalog_product_media_operations_pk") return { type: "IdempotencyConflict" };
      throw error;
    }
  }

  async claimOperation(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, attemptedAt: Date): Promise<ClaimProductMediaOperationResult> {
    return this.database.transaction(async (transaction) => {
      const [operation] = await transaction.select({ status: catalogProductMediaOperations.status, retryAllowed: catalogProductMediaOperations.retryAllowed }).from(catalogProductMediaOperations).where(and(
        eq(catalogProductMediaOperations.workspaceId, workspaceId.value), eq(catalogProductMediaOperations.workflowId, workflowId), eq(catalogProductMediaOperations.operationId, operationId),
      )).limit(1);
      if (!operation) return { type: "NotFound" } as const;
      if (operation.status === "Completed") return { type: "Completed" } as const;
      if (operation.status === "InProgress") return { type: "AlreadyInProgress" } as const;
      if (!operation.retryAllowed || !["Failed", "Staged"].includes(operation.status)) return { type: "Conflict" } as const;
      const workflowUpdated = await transaction.update(catalogProductMediaWorkflows).set({ version: expectedVersion + 1, status: "InProgress" }).where(and(
        eq(catalogProductMediaWorkflows.workspaceId, workspaceId.value), eq(catalogProductMediaWorkflows.workflowId, workflowId), eq(catalogProductMediaWorkflows.version, expectedVersion),
      )).returning({ id: catalogProductMediaWorkflows.workflowId });
      if (!workflowUpdated.length) return { type: "Conflict" } as const;
      const operationUpdated = await transaction.update(catalogProductMediaOperations).set({ status: "InProgress", lastAttemptAt: attemptedAt, attemptCount: sql`${catalogProductMediaOperations.attemptCount} + 1` }).where(and(
        eq(catalogProductMediaOperations.workspaceId, workspaceId.value), eq(catalogProductMediaOperations.workflowId, workflowId), eq(catalogProductMediaOperations.operationId, operationId), eq(catalogProductMediaOperations.retryAllowed, true), inArray(catalogProductMediaOperations.status, ["Failed", "Staged"]),
      )).returning({ id: catalogProductMediaOperations.operationId });
      if (!operationUpdated.length) throw new PersistenceConflict("Workflow");
      return { type: "Claimed", claimedVersion: expectedVersion + 1 } as const;
    }).catch((error: unknown) => error instanceof PersistenceConflict ? { type: "Conflict" as const } : Promise.reject(error));
  }

  async transitionOperation(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, transition: ProductMediaOperationTransition): Promise<TransitionProductMediaOperationResult> {
    try {
      return await this.database.transaction(async (transaction) => {
        const [operation] = await transaction.select({ status: catalogProductMediaOperations.status }).from(catalogProductMediaOperations).where(and(
          eq(catalogProductMediaOperations.workspaceId, workspaceId.value), eq(catalogProductMediaOperations.workflowId, workflowId), eq(catalogProductMediaOperations.operationId, operationId),
        )).limit(1);
        if (!operation) return { type: "NotFound" } as const;
        if (!transition.allowedPreviousStatuses.includes(operation.status as ProductMediaOperationStatus)) return { type: "Conflict" } as const;
        const workflowUpdated = await transaction.update(catalogProductMediaWorkflows).set({ version: expectedVersion + 1, status: transition.workflowStatus }).where(and(
          eq(catalogProductMediaWorkflows.workspaceId, workspaceId.value), eq(catalogProductMediaWorkflows.workflowId, workflowId), eq(catalogProductMediaWorkflows.version, expectedVersion),
        )).returning({ id: catalogProductMediaWorkflows.workflowId });
        if (!workflowUpdated.length) return { type: "Conflict" } as const;
        const operationUpdated = await transaction.update(catalogProductMediaOperations).set({
          status: transition.status, retryAllowed: transition.retryAllowed, requiresNewSource: transition.requiresNewSource,
          errorCode: transition.errorCode ?? null, completedAt: transition.completedAt ?? null,
        }).where(and(
          eq(catalogProductMediaOperations.workspaceId, workspaceId.value), eq(catalogProductMediaOperations.workflowId, workflowId), eq(catalogProductMediaOperations.operationId, operationId),
          inArray(catalogProductMediaOperations.status, [...transition.allowedPreviousStatuses]),
        )).returning({ id: catalogProductMediaOperations.operationId });
        if (!operationUpdated.length) throw new PersistenceConflict("Workflow");
        return { type: "Transitioned", version: expectedVersion + 1 } as const;
      });
    } catch (error) {
      if (error instanceof PersistenceConflict) return { type: "Conflict" };
      throw new Error("Product media workflow persistence failed.");
    }
  }

  async transitionOperationToStaged(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, transition: StageProductMediaOperationTransition): Promise<TransitionProductMediaOperationResult> {
    try {
      return await this.database.transaction(async (transaction) => {
        const [operation] = await transaction.select({ status: catalogProductMediaOperations.status }).from(catalogProductMediaOperations).where(and(
          eq(catalogProductMediaOperations.workspaceId, workspaceId.value),
          eq(catalogProductMediaOperations.workflowId, workflowId),
          eq(catalogProductMediaOperations.operationId, operationId),
        )).limit(1);
        if (!operation) return { type: "NotFound" } as const;
        if (operation.status !== "Pending") return { type: "Conflict" } as const;
        const workflowUpdated = await transaction.update(catalogProductMediaWorkflows).set({
          version: expectedVersion + 1,
          status: transition.workflowStatus,
        }).where(and(
          eq(catalogProductMediaWorkflows.workspaceId, workspaceId.value),
          eq(catalogProductMediaWorkflows.workflowId, workflowId),
          eq(catalogProductMediaWorkflows.version, expectedVersion),
        )).returning({ id: catalogProductMediaWorkflows.workflowId });
        if (!workflowUpdated.length) return { type: "Conflict" } as const;
        const operationUpdated = await transaction.update(catalogProductMediaOperations).set({
          status: "Staged",
          stagedArtifactKey: transition.stagingArtifactKey,
          stagedSha256: transition.stagedSha256,
          stagedByteLength: transition.stagedByteLength,
          stagedWidth: transition.stagedWidth,
          stagedHeight: transition.stagedHeight,
          expiresAt: transition.expiresAt,
          retryAllowed: true,
          requiresNewSource: false,
          errorCode: null,
          completedAt: null,
        }).where(and(
          eq(catalogProductMediaOperations.workspaceId, workspaceId.value),
          eq(catalogProductMediaOperations.workflowId, workflowId),
          eq(catalogProductMediaOperations.operationId, operationId),
          eq(catalogProductMediaOperations.status, "Pending"),
        )).returning({ id: catalogProductMediaOperations.operationId });
        if (!operationUpdated.length) throw new PersistenceConflict("Workflow");
        return { type: "Transitioned", version: expectedVersion + 1 } as const;
      });
    } catch (error) {
      if (error instanceof PersistenceConflict) return { type: "Conflict" };
      throw new Error("Product media workflow persistence failed.");
    }
  }

  async loadMediaState(workspaceId: WorkspaceId, productId: ProductId): Promise<ProductMediaState | null> {
    const [row] = await this.database.select().from(catalogProductMediaStates).where(and(eq(catalogProductMediaStates.workspaceId, workspaceId.value), eq(catalogProductMediaStates.productId, productId.value))).limit(1);
    const items = await this.database.select().from(catalogProductImages).where(and(eq(catalogProductImages.workspaceId, workspaceId.value), eq(catalogProductImages.productId, productId.value))).orderBy(asc(catalogProductImages.position), asc(catalogProductImages.productImageId));
    if (!row && !items.length) return null;
    const updatedAt = row?.updatedAt ?? new Date(0); const updatedBy = row?.updatedBy ?? "legacy-product-image";
    return { workspaceId, productId, revision: row?.revision ?? 0, coverMediaId: items.find((item) => item.isMain)?.productImageId, updatedAt, updatedBy, items: items.map((item) => ({ mediaId: item.productImageId, workspaceId, productId, storageArtifactKey: item.storageKey, checksumSha256: item.checksumSha256 ?? undefined, mimeType: item.mimeType === "image/webp" ? "image/webp" : undefined, displayOrder: item.position, createdAt: item.mediaCreatedAt ?? updatedAt, createdBy: item.mediaCreatedBy ?? updatedBy })) };
  }

  async save(workflow: ProductMediaWorkflowState, mediaState: ProductMediaState, expectedWorkflowVersion: number, expectedMediaRevision: number): Promise<SaveProductMediaWorkflowResult> {
    if ((mediaState.items.length > 0 && !mediaState.coverMediaId) || (mediaState.coverMediaId && !mediaState.items.some((item) => item.mediaId === mediaState.coverMediaId))) throw new Error("Product Media canonical cover is invalid.");
    try {
      await this.database.transaction(async (transaction) => {
        const updatedWorkflow = await transaction.update(catalogProductMediaWorkflows).set(workflowRow(workflow)).where(and(
          eq(catalogProductMediaWorkflows.workspaceId, workflow.workspaceId.value), eq(catalogProductMediaWorkflows.workflowId, workflow.workflowId), eq(catalogProductMediaWorkflows.version, expectedWorkflowVersion),
        )).returning({ id: catalogProductMediaWorkflows.workflowId });
        if (!updatedWorkflow.length) throw new PersistenceConflict("Workflow");
        await transaction.delete(catalogProductMediaOperations).where(and(eq(catalogProductMediaOperations.workspaceId, workflow.workspaceId.value), eq(catalogProductMediaOperations.workflowId, workflow.workflowId)));
        if (workflow.operations.length) await transaction.insert(catalogProductMediaOperations).values(workflow.operations.map(operationRow));
        const [existingState] = await transaction.select({ revision: catalogProductMediaStates.revision }).from(catalogProductMediaStates).where(and(eq(catalogProductMediaStates.workspaceId, mediaState.workspaceId.value), eq(catalogProductMediaStates.productId, mediaState.productId.value))).limit(1);
        if (!existingState) {
          if (expectedMediaRevision !== 0) throw new PersistenceConflict("Media");
          await transaction.delete(catalogProductImages).where(and(eq(catalogProductImages.workspaceId, mediaState.workspaceId.value), eq(catalogProductImages.productId, mediaState.productId.value)));
          if (mediaState.items.length) await transaction.insert(catalogProductImages).values(mediaState.items.map((item) => mediaItemRow(item, mediaState.coverMediaId)));
          await transaction.insert(catalogProductMediaStates).values({ workspaceId: mediaState.workspaceId.value, productId: mediaState.productId.value, revision: mediaState.revision, updatedAt: mediaState.updatedAt, updatedBy: mediaState.updatedBy });
        } else {
          const updatedState = await transaction.update(catalogProductMediaStates).set({ revision: mediaState.revision, updatedAt: mediaState.updatedAt, updatedBy: mediaState.updatedBy }).where(and(eq(catalogProductMediaStates.workspaceId, mediaState.workspaceId.value), eq(catalogProductMediaStates.productId, mediaState.productId.value), eq(catalogProductMediaStates.revision, expectedMediaRevision))).returning({ id: catalogProductMediaStates.productId });
          if (!updatedState.length) throw new PersistenceConflict("Media");
          await transaction.delete(catalogProductImages).where(and(eq(catalogProductImages.workspaceId, mediaState.workspaceId.value), eq(catalogProductImages.productId, mediaState.productId.value)));
          if (mediaState.items.length) await transaction.insert(catalogProductImages).values(mediaState.items.map((item) => mediaItemRow(item, mediaState.coverMediaId)));
        }
      });
      return { type: "Saved" };
    } catch (error) {
      if (error instanceof PersistenceConflict) return { type: error.kind === "Media" ? "MediaRevisionConflict" : "WorkflowVersionConflict" };
      throw error;
    }
  }

  async listExpired(workspaceId: WorkspaceId, now: Date): Promise<readonly ProductMediaWorkflowState[]> {
    const rows = await this.database.select({ workflowId: catalogProductMediaOperations.workflowId }).from(catalogProductMediaOperations).where(and(
      eq(catalogProductMediaOperations.workspaceId, workspaceId.value), lte(catalogProductMediaOperations.expiresAt, now), inArray(catalogProductMediaOperations.status, ["Staged", "Failed"]),
    ));
    const ids = [...new Set(rows.map((row) => row.workflowId))];
    const workflows: ProductMediaWorkflowState[] = [];
    for (const id of ids) { const workflow = await this.findById(workspaceId, id); if (workflow) workflows.push(workflow); }
    return workflows;
  }
}
