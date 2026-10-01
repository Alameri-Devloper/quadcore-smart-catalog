export type WorkspacePricingField = "Retail" | "Wholesale" | "ReferenceCost";
export type WorkspacePricingAction = "Set" | "Clear";

export interface WorkspaceMoneyView {
  readonly amountMinor: string;
  readonly currency: string;
}

export interface WorkspacePricingSlot {
  readonly state: "Configured" | "NotConfigured";
  readonly value: WorkspaceMoneyView | null;
  readonly allowedActions: readonly WorkspacePricingAction[];
}

export interface WorkspaceReferenceCostSlot extends WorkspacePricingSlot {
  readonly referenceCostRevision: number;
}

export interface WorkspacePricingManagementView {
  readonly productId: string;
  readonly productRevision: number;
  readonly retail?: WorkspacePricingSlot;
  readonly wholesale?: WorkspacePricingSlot;
  readonly referenceCost?: WorkspaceReferenceCostSlot;
}

export type WorkspacePricingFailure =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" | "Forbidden"
  | "ProductNotFound" | "ProductArchived" | "InvalidInput" | "CurrencyNotAllowed" | "Conflict"
  | "BranchProductServiceUnavailable" | "NetworkFailure" | "MalformedResponse" | "UnexpectedResponse";

export type WorkspacePricingResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: WorkspacePricingFailure };

export interface WorkspacePricingMutationAcknowledgement {
  readonly productId: string;
  readonly field: WorkspacePricingField;
}

export interface WorkspacePricingPort {
  get(productId: string, signal?: AbortSignal): Promise<WorkspacePricingResult<WorkspacePricingManagementView>>;
  set(productId: string, field: WorkspacePricingField, command: WorkspaceMoneyView & { readonly expectedRevision: number },
    signal?: AbortSignal): Promise<WorkspacePricingResult<WorkspacePricingMutationAcknowledgement>>;
  clear(productId: string, field: WorkspacePricingField, command: { readonly expectedRevision: number },
    signal?: AbortSignal): Promise<WorkspacePricingResult<WorkspacePricingMutationAcknowledgement>>;
}

export type WorkspacePricingIntent =
  | { readonly field: WorkspacePricingField; readonly action: "Set"; readonly amountMinor: string; readonly currency: string }
  | { readonly field: WorkspacePricingField; readonly action: "Clear" };

export interface WorkspacePricingState {
  readonly detail: { readonly type: "Idle" | "Loading" }
    | { readonly type: "Ready"; readonly value: WorkspacePricingManagementView }
    | { readonly type: "Failed"; readonly kind: WorkspacePricingFailure };
  readonly intent: WorkspacePricingIntent | null;
  readonly pendingField: WorkspacePricingField | null;
  readonly reviewRequired: boolean;
  readonly failure: WorkspacePricingFailure | null;
  readonly validation: "Amount" | "Currency" | null;
  readonly savedField: WorkspacePricingField | null;
}
