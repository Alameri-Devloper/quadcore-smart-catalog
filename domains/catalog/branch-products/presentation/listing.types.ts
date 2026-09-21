export type ListingAction = "SetListed" | "SetUnlisted";
export type ListingStatus = "Listed" | "Unlisted";
export interface ListingResource { readonly branchId: string; readonly productId: string }
export interface ListingWriteView extends ListingResource {
  readonly listingStatus: ListingStatus;
  readonly revision: number;
  readonly updatedAt: string;
}
export interface ListingView extends ListingResource {
  readonly listingStatus: ListingStatus | "NotConfigured";
  readonly revision: number;
  readonly updatedAt: string | null;
  readonly allowedActions: readonly ListingAction[];
}
export type ListingFailure = "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" | "Forbidden"
  | "BranchNotFound" | "ProductNotFound" | "BranchInactive" | "ProductArchived" | "InvalidInput" | "Conflict"
  | "BranchProductServiceUnavailable" | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";
export type ListingResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly kind: ListingFailure };
export interface ListingPort {
  get(resource: ListingResource, signal?: AbortSignal): Promise<ListingResult<ListingView>>;
  set(resource: ListingResource, command: { readonly listingStatus: ListingStatus; readonly expectedRevision: number }, signal?: AbortSignal): Promise<ListingResult<ListingWriteView>>;
}
export interface ListingState {
  readonly detail: { readonly type: "Idle" | "Loading" } | { readonly type: "Ready"; readonly value: ListingView }
    | { readonly type: "Failed"; readonly kind: ListingFailure };
  readonly intent: ListingAction | null;
  readonly pending: boolean;
  readonly reviewRequired: boolean;
  readonly failure: ListingFailure | null;
  readonly saved: boolean;
}
