import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductMediaState } from "../domain/product-media-state";
import type { ProductMediaWorkflowState } from "../domain/product-media-workflow";
import type { ProductMediaOperationStatus, ProductMediaWorkflowStatus } from "../domain/product-media-workflow";

export type CreateProductMediaWorkflowResult =
  | { readonly type: "Created" }
  | { readonly type: "Existing"; readonly workflow: ProductMediaWorkflowState }
  | { readonly type: "IdempotencyConflict" };

export type SaveProductMediaWorkflowResult =
  | { readonly type: "Saved" }
  | { readonly type: "WorkflowVersionConflict" }
  | { readonly type: "MediaRevisionConflict" };

export type ClaimProductMediaOperationResult =
  | { readonly type: "Claimed"; readonly claimedVersion: number }
  | { readonly type: "AlreadyInProgress" }
  | { readonly type: "Completed" }
  | { readonly type: "Conflict" }
  | { readonly type: "NotFound" };

export type TransitionProductMediaOperationResult =
  | { readonly type: "Transitioned"; readonly version: number }
  | { readonly type: "Conflict" }
  | { readonly type: "NotFound" };

export interface StageProductMediaOperationTransition {
  readonly stagingArtifactKey: string;
  readonly stagedSha256: string;
  readonly stagedByteLength: number;
  readonly stagedWidth: number;
  readonly stagedHeight: number;
  readonly expiresAt: Date;
  readonly workflowStatus: ProductMediaWorkflowStatus;
}

export interface ProductMediaOperationTransition {
  readonly status: Extract<ProductMediaOperationStatus, "SourceUnavailable" | "Cancelled" | "Failed" | "ReconciliationRequired">;
  readonly allowedPreviousStatuses: readonly ProductMediaOperationStatus[];
  readonly workflowStatus: ProductMediaWorkflowStatus;
  readonly retryAllowed: boolean;
  readonly requiresNewSource: boolean;
  readonly errorCode?: string;
  readonly completedAt?: Date;
}

export interface ProductMediaWorkflowRepository {
  findById(workspaceId: WorkspaceId, workflowId: string): Promise<ProductMediaWorkflowState | null>;
  findByIdempotencyKey(workspaceId: WorkspaceId, idempotencyKey: string): Promise<ProductMediaWorkflowState | null>;
  create(workflow: ProductMediaWorkflowState): Promise<CreateProductMediaWorkflowResult>;
  claimOperation(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, attemptedAt: Date): Promise<ClaimProductMediaOperationResult>;
  transitionOperationToStaged(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, transition: StageProductMediaOperationTransition): Promise<TransitionProductMediaOperationResult>;
  transitionOperation(workspaceId: WorkspaceId, workflowId: string, operationId: string, expectedVersion: number, transition: ProductMediaOperationTransition): Promise<TransitionProductMediaOperationResult>;
  loadMediaState(workspaceId: WorkspaceId, productId: ProductId): Promise<ProductMediaState | null>;
  save(
    workflow: ProductMediaWorkflowState,
    mediaState: ProductMediaState,
    expectedWorkflowVersion: number,
    expectedMediaRevision: number,
  ): Promise<SaveProductMediaWorkflowResult>;
  listExpired(workspaceId: WorkspaceId, now: Date): Promise<readonly ProductMediaWorkflowState[]>;
}
