export type BranchPricingField = "Retail" | "Wholesale" | "ReferenceCost";
export type BranchPricingAction = "SetOverride" | "ClearOverride";

export interface BranchMoneyView {
  readonly amountMinor: string;
  readonly currency: string;
}

export interface BranchPricingValueSlot {
  readonly state: "Configured" | "NotConfigured";
  readonly value: BranchMoneyView | null;
  readonly allowedActions: readonly [];
}

export interface BranchPricingSlot {
  readonly base: BranchPricingValueSlot;
  readonly override: BranchPricingValueSlot;
  readonly overrideRevision: number;
  readonly effective: BranchMoneyView | null;
  readonly source: "WorkspaceBase" | "BranchOverride" | "NotConfigured";
  readonly allowedActions: readonly BranchPricingAction[];
}

export interface BranchPricingManagementView {
  readonly branchId: string;
  readonly productId: string;
  readonly baseProductRevision?: number;
  readonly baseReferenceCostRevision?: number;
  readonly prices: Readonly<Partial<Record<BranchPricingField, BranchPricingSlot>>>;
}

export type BranchPricingFailure =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" | "Forbidden"
  | "BranchNotFound" | "ProductNotFound" | "BranchInactive" | "ProductArchived"
  | "InvalidInput" | "CurrencyNotAllowed" | "Conflict" | "BranchProductServiceUnavailable"
  | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";

export type BranchPricingResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: BranchPricingFailure };

export interface BranchPricingMutationAcknowledgement {
  readonly branchId: string;
  readonly productId: string;
  readonly field: BranchPricingField;
  readonly override: (BranchMoneyView & { readonly revision: number }) | null;
}

export interface BranchPricingPort {
  get(branchId: string, productId: string, signal?: AbortSignal): Promise<BranchPricingResult<BranchPricingManagementView>>;
  set(branchId: string, productId: string, field: BranchPricingField,
    command: BranchMoneyView & { readonly expectedRevision: number }, signal?: AbortSignal): Promise<BranchPricingResult<BranchPricingMutationAcknowledgement>>;
  clear(branchId: string, productId: string, field: BranchPricingField,
    command: { readonly expectedRevision: number }, signal?: AbortSignal): Promise<BranchPricingResult<BranchPricingMutationAcknowledgement>>;
}

export type BranchPricingIntent =
  | { readonly field: BranchPricingField; readonly action: "SetOverride"; readonly amountMinor: string; readonly currency: string }
  | { readonly field: BranchPricingField; readonly action: "ClearOverride" };

export interface BranchPricingFieldState {
  readonly intent: BranchPricingIntent | null;
  readonly pending: boolean;
  readonly reviewRequired: boolean;
  readonly failure: BranchPricingFailure | null;
  readonly validation: "Amount" | "Currency" | null;
  readonly saved: boolean;
}

export interface BranchPricingState {
  readonly detail: { readonly type: "Idle" | "Loading" }
    | { readonly type: "Ready"; readonly value: BranchPricingManagementView }
    | { readonly type: "Failed"; readonly kind: BranchPricingFailure };
  readonly refreshing: boolean;
  readonly activeField: BranchPricingField | null;
  readonly fields: Readonly<Partial<Record<BranchPricingField, BranchPricingFieldState>>>;
}
