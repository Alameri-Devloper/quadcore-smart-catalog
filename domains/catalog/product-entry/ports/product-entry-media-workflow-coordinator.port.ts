import type { ProductEntryExecutionContext } from "../application/product-entry-execution-context";

export type ProductEntryMediaWorkflowStatus =
  | "Pending" | "InProgress" | "Completed" | "PartiallyCompleted" | "Failed"
  | "ReconciliationRequired" | "Cancelled";

export type ProductEntryMediaWorkflowOperationStatus =
  | "Pending" | "Staged" | "InProgress" | "Completed" | "Failed"
  | "SourceUnavailable" | "ReconciliationRequired" | "Cancelled";

export interface ProductEntryMediaWorkflowView {
  readonly workflowId: string;
  readonly productId: string;
  readonly status: ProductEntryMediaWorkflowStatus;
  readonly operations: readonly {
    readonly operationId: string;
    readonly type: "Add" | "Replace" | "Remove";
    readonly status: ProductEntryMediaWorkflowOperationStatus;
    readonly attemptCount: number;
    readonly retryAllowed: boolean;
    readonly requiresNewSource: boolean;
    readonly errorCode: string | null;
  }[];
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export type ProductEntryCoordinatedMediaOperation =
  | {
      readonly operationId: string;
      readonly type: "Add";
      readonly source?: { readonly bytes: Uint8Array };
      readonly sourceSha256: string;
      readonly requestedDisplayOrder?: number;
      readonly selectAsCover?: boolean;
    }
  | {
      readonly operationId: string;
      readonly type: "Replace";
      readonly targetMediaId: string;
      readonly source?: { readonly bytes: Uint8Array };
      readonly sourceSha256: string;
      readonly requestedDisplayOrder?: number;
      readonly selectAsCover?: boolean;
    }
  | { readonly operationId: string; readonly type: "Remove"; readonly targetMediaId: string };

export interface CoordinateProductEntryMediaWorkflowCommand {
  readonly context: ProductEntryExecutionContext;
  readonly productId: string;
  readonly idempotencyKey: string;
  readonly linkedWorkflowId?: string;
  readonly operations: readonly ProductEntryCoordinatedMediaOperation[];
  readonly effectiveTime: Date;
}

export interface CoordinateProductEntryMediaWorkflowResult {
  readonly workflow: ProductEntryMediaWorkflowView;
  readonly idempotentReplay: boolean;
  readonly resumed: boolean;
}

export type ProductEntryMediaWorkflowCoordinationErrorCode =
  | "AuthorizationDenied" | "ProductNotFound" | "IdempotencyConflict"
  | "MediaRevisionConflict" | "WorkflowConflict" | "ValidationFailed";

export class ProductEntryMediaWorkflowCoordinationError extends Error {
  constructor(readonly code: ProductEntryMediaWorkflowCoordinationErrorCode) {
    super(`Product Entry Media coordination failed with ${code}.`);
    this.name = "ProductEntryMediaWorkflowCoordinationError";
  }
}

export interface ProductEntryMediaWorkflowCoordinator {
  resolveExisting(
    context: ProductEntryExecutionContext,
    linkedWorkflowId: string | undefined,
    idempotencyKey: string,
  ): Promise<ProductEntryMediaWorkflowView | null>;
  coordinate(command: CoordinateProductEntryMediaWorkflowCommand): Promise<CoordinateProductEntryMediaWorkflowResult>;
  findByWorkflowId(
    context: ProductEntryExecutionContext,
    workflowId: string,
  ): Promise<ProductEntryMediaWorkflowView | null>;
  findByIdempotencyKey(
    context: ProductEntryExecutionContext,
    idempotencyKey: string,
  ): Promise<ProductEntryMediaWorkflowView | null>;
}
