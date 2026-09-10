/** Navigation hints only. Resource endpoints retain all authorization decisions. */
export interface OperationalManagementCapabilitiesView {
  readonly branches: { readonly canView: boolean; readonly canManage: boolean };
  readonly listing: { readonly canManage: boolean };
  readonly inventory: {
    readonly canViewAvailability: boolean;
    readonly canViewQuantities: boolean;
    readonly canReceive: boolean;
    readonly canIssue: boolean;
    readonly canReserve: boolean;
    readonly canTransfer: boolean;
    readonly canManageDamage: boolean;
    readonly canAdjust: boolean;
  };
  readonly pricing: {
    readonly canView: boolean;
    readonly canViewWholesale: boolean;
    readonly canManageWorkspace: boolean;
    readonly canManageBranchOverrides: boolean;
  };
  readonly referenceCost: {
    readonly canView: boolean;
    readonly canManageWorkspace: boolean;
    readonly canManageBranchOverrides: boolean;
  };
}

export type OperationalManagementCapabilityFailure =
  | "AuthenticationRequired"
  | "ForbiddenForRestrictedSession"
  | "Forbidden"
  | "InvalidQuery"
  | "OperationalManagementCapabilityServiceUnavailable"
  | "Unavailable";

export type OperationalManagementCapabilityResult =
  | { readonly ok: true; readonly value: OperationalManagementCapabilitiesView }
  | { readonly ok: false; readonly kind: OperationalManagementCapabilityFailure };

export type OperationalManagementCapabilityState =
  | { readonly type: "Idle" }
  | { readonly type: "Loading" }
  | { readonly type: "Ready"; readonly value: OperationalManagementCapabilitiesView }
  | { readonly type: "Failed"; readonly kind: OperationalManagementCapabilityFailure };

export type OperationalManagementSection = "Branches" | "Inventory" | "Pricing";
