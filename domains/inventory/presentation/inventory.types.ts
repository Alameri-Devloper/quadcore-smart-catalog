export type InventoryAvailability = "InStock" | "OutOfStock";
export type InventoryOperation = "Receive" | "Issue" | "CorrectIncrease" | "CorrectDecrease" | "MarkDamaged" | "RestoreDamaged";

export interface InventoryResource { readonly branchId: string; readonly productId: string }
export interface InventoryAvailabilityView extends InventoryResource {
  readonly unit: "Piece";
  readonly availability: InventoryAvailability;
}
export interface InventoryQuantityView extends InventoryAvailabilityView {
  readonly quantities: {
    readonly available: string;
    readonly onHand: string;
    readonly reserved: string;
    readonly damaged: string;
  };
  readonly revision: number;
  readonly updatedAt: string;
}
export type InventoryReadView = InventoryAvailabilityView | InventoryQuantityView;

export interface InventoryMutationView {
  readonly operationId: string;
  readonly status: "Succeeded";
  readonly balance?: InventoryQuantityView;
  readonly availability?: InventoryAvailability;
}
export interface InventoryDraft { readonly quantity: string; readonly reasonCode: string; readonly note: string }
export interface InventoryConfirmedCommand extends InventoryDraft {
  readonly operation: InventoryOperation;
  readonly operationId: string;
}

export type InventoryFailure = "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" | "Forbidden"
  | "BranchNotFound" | "ProductNotFound" | "BranchInactive" | "ProductArchived" | "InvalidQuantity" | "InvalidInput"
  | "InsufficientAvailableStock" | "InventoryConflict" | "IdempotencyConflict" | "InventoryServiceUnavailable"
  | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";
export type InventoryResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly kind: InventoryFailure };

export interface InventoryMutationRequest {
  readonly operationId: string;
  readonly productId: string;
  readonly quantity: string;
  readonly reasonCode?: string;
  readonly note?: string;
}
export interface InventoryPort {
  get(resource: InventoryResource, signal?: AbortSignal): Promise<InventoryResult<InventoryReadView>>;
  receive(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
  issue(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
  correctIncrease(resource: InventoryResource, command: InventoryMutationRequest & { readonly reasonCode: string }, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
  correctDecrease(resource: InventoryResource, command: InventoryMutationRequest & { readonly reasonCode: string }, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
  markDamaged(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
  restoreDamaged(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal): Promise<InventoryResult<InventoryMutationView>>;
}

export interface InventoryCapabilityHints {
  readonly canViewAvailability: boolean;
  readonly canViewQuantities: boolean;
  readonly canReceive: boolean;
  readonly canIssue: boolean;
  readonly canManageDamage: boolean;
  readonly canAdjust: boolean;
}
export interface InventoryState {
  readonly detail: { readonly type: "Idle" | "Loading" } | { readonly type: "Ready"; readonly value: InventoryReadView }
    | { readonly type: "ForbiddenRead" } | { readonly type: "Failed"; readonly kind: InventoryFailure };
  readonly operation: InventoryOperation | null;
  readonly draft: InventoryDraft;
  readonly operationId: string | null;
  readonly review: InventoryConfirmedCommand | null;
  readonly pending: boolean;
  readonly reviewRequired: boolean;
  readonly failure: InventoryFailure | null;
  readonly outcome: InventoryMutationView | null;
}
