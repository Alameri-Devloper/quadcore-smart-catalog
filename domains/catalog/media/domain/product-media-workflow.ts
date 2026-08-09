import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";

export const PRODUCT_MEDIA_RETENTION_MILLISECONDS = 14 * 24 * 60 * 60 * 1000;

export type ProductMediaWorkflowStatus = "Pending" | "InProgress" | "Completed" | "PartiallyCompleted" | "Failed" | "ReconciliationRequired" | "Cancelled";
export type ProductMediaOperationStatus = "Pending" | "Staged" | "InProgress" | "Completed" | "Failed" | "SourceUnavailable" | "ReconciliationRequired" | "Cancelled";
export type ProductMediaOperationType = "Add" | "Replace" | "Remove" | "SetCover" | "Reorder";

export interface ProductMediaOperationState {
  readonly operationId: string;
  readonly workflowId: string;
  readonly workspaceId: WorkspaceId;
  readonly type: ProductMediaOperationType;
  status: ProductMediaOperationStatus;
  readonly targetMediaId?: string;
  readonly requestedDisplayOrder?: number;
  readonly selectAsCover: boolean;
  readonly orderedMediaIds?: readonly string[];
  stagedArtifactKey?: string;
  finalArtifactKey?: string;
  stagedSha256?: string;
  stagedByteLength?: number;
  stagedWidth?: number;
  stagedHeight?: number;
  expiresAt?: Date;
  attemptCount: number;
  lastAttemptAt?: Date;
  retryAllowed: boolean;
  requiresNewSource: boolean;
  errorCode?: string;
  readonly createdAt: Date;
  completedAt?: Date;
}

export interface ProductMediaWorkflowState {
  readonly workflowId: string;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  status: ProductMediaWorkflowStatus;
  readonly expectedMediaRevision: number;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly createdBy: string;
  readonly startedAt: Date;
  completedAt?: Date;
  version: number;
  readonly operations: ProductMediaOperationState[];
}

const terminal = new Set<ProductMediaOperationStatus>(["Completed", "Failed", "SourceUnavailable", "ReconciliationRequired", "Cancelled"]);

export const deriveProductMediaWorkflowStatus = (operations: readonly ProductMediaOperationState[]): ProductMediaWorkflowStatus => {
  if (operations.some((operation) => operation.status === "ReconciliationRequired")) return "ReconciliationRequired";
  if (operations.length > 0 && operations.every((operation) => operation.status === "Completed")) return "Completed";
  const metadataWaiting = operations.some((operation) =>
    (operation.type === "Reorder" || operation.type === "SetCover") && operation.status === "Pending");
  const incompleteTerminalDependency = operations.some((operation) =>
    (operation.type === "Add" || operation.type === "Replace" || operation.type === "Remove")
    && (operation.status === "Failed" || operation.status === "SourceUnavailable" || operation.status === "Cancelled"));
  if (metadataWaiting && incompleteTerminalDependency) return "PartiallyCompleted";
  const completed = operations.some((operation) => operation.status === "Completed");
  const unsuccessful = operations.some((operation) => operation.status === "Failed" || operation.status === "SourceUnavailable" || operation.status === "Cancelled");
  if (completed && unsuccessful) return "PartiallyCompleted";
  if (!completed && operations.some((operation) => operation.status === "Failed" || operation.status === "SourceUnavailable")) return "Failed";
  if (operations.length > 0 && operations.every((operation) => operation.status === "Cancelled")) return "Cancelled";
  if (operations.some((operation) => !terminal.has(operation.status))) return "InProgress";
  return "Pending";
};

export const stageOperation = (operation: ProductMediaOperationState, staged: {
  key: string; sha256: string; byteLength: number; width: number; height: number;
}, stagedAt: Date): void => {
  if (operation.expiresAt === undefined) operation.expiresAt = new Date(stagedAt.getTime() + PRODUCT_MEDIA_RETENTION_MILLISECONDS);
  operation.stagedArtifactKey = staged.key;
  operation.stagedSha256 = staged.sha256;
  operation.stagedByteLength = staged.byteLength;
  operation.stagedWidth = staged.width;
  operation.stagedHeight = staged.height;
  operation.status = "Staged";
  operation.retryAllowed = true;
  operation.requiresNewSource = false;
};

export const claimOperationAttempt = (operation: ProductMediaOperationState, now: Date): "Claimed" | "Completed" => {
  if (operation.status === "Completed") return "Completed";
  if (operation.status === "InProgress") throw new ProductMediaWorkflowError("ProductMediaOperationAlreadyInProgress");
  if (operation.status === "ReconciliationRequired" || !operation.retryAllowed) throw new ProductMediaWorkflowError("ProductMediaRetryNotAllowed");
  const sourceRequired = operation.type === "Add" || operation.type === "Replace";
  if (sourceRequired && (!operation.expiresAt || operation.expiresAt.getTime() <= now.getTime() || !operation.stagedArtifactKey)) {
    markSourceUnavailable(operation);
    throw new ProductMediaWorkflowError("ProductMediaSourceUnavailable");
  }
  operation.attemptCount += 1;
  operation.lastAttemptAt = new Date(now);
  operation.status = "InProgress";
  return "Claimed";
};

export const markSourceUnavailable = (operation: ProductMediaOperationState): void => {
  operation.status = "SourceUnavailable";
  operation.retryAllowed = false;
  operation.requiresNewSource = true;
  operation.errorCode = "ProductMediaSourceUnavailable";
};

export type ProductMediaWorkflowErrorCode =
  | "ProductMediaWorkflowNotFound" | "ProductMediaOperationNotFound" | "ProductMediaAuthorizationDenied"
  | "MediaRevisionConflict" | "ProductMediaIdempotencyConflict" | "ProductMediaOperationAlreadyInProgress"
  | "ProductMediaSourceUnavailable" | "ProductMediaRetryNotAllowed" | "ProductMediaValidationFailed"
  | "ProductMediaStorageFailed" | "ProductMediaReconciliationRequired" | "ProductNotFound";

export class ProductMediaWorkflowError extends Error {
  constructor(readonly code: ProductMediaWorkflowErrorCode) {
    super(`Product media workflow failed with ${code}.`);
    this.name = "ProductMediaWorkflowError";
  }
}
