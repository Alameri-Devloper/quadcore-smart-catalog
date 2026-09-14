/** A2 discovery DTOs only; membership never grants resource or mutation authority. */
export const OPERATIONAL_PRODUCT_PURPOSES = Object.freeze([
  "Listing", "Inventory", "WorkspacePricing", "BranchPricing", "WorkspaceReferenceCost", "BranchReferenceCost",
] as const);
export type OperationalProductPurpose = (typeof OPERATIONAL_PRODUCT_PURPOSES)[number];
export type OperationalProductScope =
  | { readonly purpose: "Listing" | "Inventory" | "BranchPricing" | "BranchReferenceCost"; readonly branchId: string }
  | { readonly purpose: "WorkspacePricing" | "WorkspaceReferenceCost"; readonly branchId?: never };
export type OperationalProductRequest = OperationalProductScope & { readonly q: string; readonly cursor?: string; readonly limit?: number };
export interface OperationalProductView {
  readonly productId: string;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly lifecycle: "Draft" | "Published";
  readonly branchId?: string;
  readonly listingStatus?: "Listed" | "Unlisted" | "NotConfigured";
}
export interface OperationalProductPage { readonly items: readonly OperationalProductView[]; readonly nextCursor: string | null }
export type OperationalProductFailure =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "Forbidden" | "BranchNotFound"
  | "InvalidQuery" | "InvalidCursor" | "CatalogQueryServiceUnavailable"
  | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";
export type OperationalProductResult =
  | { readonly ok: true; readonly value: OperationalProductPage }
  | { readonly ok: false; readonly kind: OperationalProductFailure };
export interface OperationalProductPort { search(request: OperationalProductRequest, signal?: AbortSignal): Promise<OperationalProductResult> }
export type OperationalProductState =
  | { readonly type: "Idle" }
  | { readonly type: "Loading"; readonly key: string }
  | { readonly type: "Failed"; readonly key: string; readonly kind: OperationalProductFailure }
  | { readonly type: "Ready"; readonly key: string; readonly value: OperationalProductPage };
export interface OperationalProductQuery {
  readonly q: string;
  readonly productCursor: string | null;
  readonly productId: string | null;
  readonly issue: "InvalidQuery" | "InvalidCursor" | null;
}
