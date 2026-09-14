/** A6 discovery only. General Branch management has a separate DTO and client. */
export const OPERATIONAL_BRANCH_PURPOSES = Object.freeze([
  "Listing", "Inventory", "Transfer", "BranchPricing", "BranchReferenceCost",
] as const);
export type OperationalBranchPurpose = (typeof OPERATIONAL_BRANCH_PURPOSES)[number];
export interface OperationalBranchView {
  readonly branchId: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: "Active" | "Inactive";
}
export type OperationalBranchFailure =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "InvalidInput"
  | "Forbidden" | "BranchServiceUnavailable"
  | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";
export type OperationalBranchResult =
  | { readonly ok: true; readonly value: readonly OperationalBranchView[] }
  | { readonly ok: false; readonly kind: OperationalBranchFailure };
export interface OperationalBranchPort {
  list(purpose: OperationalBranchPurpose, signal?: AbortSignal): Promise<OperationalBranchResult>;
}
export type OperationalBranchState =
  | { readonly type: "Idle" }
  | { readonly type: "Loading"; readonly purpose: OperationalBranchPurpose }
  | { readonly type: "Failed"; readonly purpose: OperationalBranchPurpose; readonly kind: OperationalBranchFailure }
  | { readonly type: "Ready"; readonly purpose: OperationalBranchPurpose; readonly options: readonly OperationalBranchView[];
      readonly availability: "Available" | "AuthorizedEmpty" | "AllInactive" };
export type OperationalBranchSelection =
  | { readonly type: "None" | "Pending" | "StaleSelectedBranch" }
  | { readonly type: "Inactive" | "Selected"; readonly branch: OperationalBranchView };
