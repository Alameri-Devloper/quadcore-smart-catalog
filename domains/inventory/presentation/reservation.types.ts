import type { InventoryAvailability, InventoryQuantityView } from "./inventory.types";

export type ReservationStatus = "Active" | "PartiallyFulfilled" | "Fulfilled" | "Released";
export type ReservationAction = "Release" | "Fulfill";
export type ReservationOperation = "Reserve" | ReservationAction;

export interface ReservationResource {
  readonly branchId: string;
  readonly productId: string | null;
}
export interface ReservationNavigation {
  readonly reservationCursor: string | null;
  readonly reservationId: string | null;
}
export interface ReservationManagementView {
  readonly reservationId: string;
  readonly branchId: string;
  readonly productId: string;
  readonly status: ReservationStatus;
  readonly quantity: string;
  readonly remainingQuantity: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly allowedActions: readonly ReservationAction[];
}
export interface ReservationPageView {
  readonly items: readonly ReservationManagementView[];
  readonly nextCursor: string | null;
}
export interface ReservationMutationView {
  readonly operationId: string;
  readonly status: "Succeeded";
  readonly reservationId: string;
  readonly reservationStatus: ReservationStatus;
  readonly remainingQuantity: string;
  readonly balance?: InventoryQuantityView;
  readonly availability?: InventoryAvailability;
}

export type ReservationFailure = "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" | "Forbidden"
  | "BranchNotFound" | "ProductNotFound" | "ReservationNotFound" | "BranchInactive" | "ProductArchived"
  | "InvalidQuantity" | "InvalidInput" | "InvalidCursor" | "InsufficientAvailableStock" | "ReservationNotActive"
  | "InventoryConflict" | "IdempotencyConflict" | "InventoryServiceUnavailable"
  | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";
export type ReservationResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly kind: ReservationFailure };

export interface ReserveRequest {
  readonly operationId: string;
  readonly productId: string;
  readonly quantity: string;
  readonly reasonCode?: string;
}
export interface ReservationQuantityRequest { readonly operationId: string; readonly quantity: string }
export interface ReservationCollectionRequest { readonly branchId: string; readonly productId: string; readonly cursor?: string; readonly limit?: number }
export interface ReservationDetailRequest { readonly branchId: string; readonly reservationId: string }
export interface ReservationMutationTarget extends ReservationDetailRequest { readonly productId: string }

export interface ReservationPort {
  list(request: ReservationCollectionRequest, signal?: AbortSignal): Promise<ReservationResult<ReservationPageView>>;
  detail(request: ReservationDetailRequest, signal?: AbortSignal): Promise<ReservationResult<ReservationManagementView>>;
  reserve(resource: { readonly branchId: string; readonly productId: string }, command: ReserveRequest, signal?: AbortSignal): Promise<ReservationResult<ReservationMutationView>>;
  release(target: ReservationMutationTarget, command: ReservationQuantityRequest, signal?: AbortSignal): Promise<ReservationResult<ReservationMutationView>>;
  fulfill(target: ReservationMutationTarget, command: ReservationQuantityRequest, signal?: AbortSignal): Promise<ReservationResult<ReservationMutationView>>;
}

export interface ReservationDraft { readonly quantity: string; readonly reasonCode: string }
export interface ReservationConfirmedCommand extends ReservationDraft {
  readonly operation: ReservationOperation;
  readonly operationId: string;
  readonly productId: string;
  readonly reservationId: string | null;
}
export type ReservationCollectionState = { readonly type: "Idle" | "Loading" }
  | { readonly type: "Ready"; readonly value: ReservationPageView }
  | { readonly type: "Failed"; readonly kind: ReservationFailure };
export type ReservationDetailState = { readonly type: "Idle" | "Loading" }
  | { readonly type: "Ready"; readonly value: ReservationManagementView }
  | { readonly type: "Failed"; readonly kind: ReservationFailure };
export interface ReservationState {
  readonly collection: ReservationCollectionState;
  readonly detail: ReservationDetailState;
  readonly navigation: ReservationNavigation;
  readonly cursorReset: boolean;
  readonly operation: ReservationOperation | null;
  readonly draft: ReservationDraft;
  readonly operationId: string | null;
  readonly review: ReservationConfirmedCommand | null;
  readonly pending: boolean;
  readonly reviewRequired: boolean;
  readonly failure: ReservationFailure | null;
  readonly outcome: ReservationMutationView | null;
}
