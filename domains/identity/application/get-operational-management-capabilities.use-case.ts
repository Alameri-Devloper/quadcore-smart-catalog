import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { operationalManagementAuthorizationPolicy as policy } from "./operational-management-authorization-policy";

export interface OperationalManagementCapabilitiesView {
  readonly branches: {
    readonly canView: boolean;
    readonly canManage: boolean;
  };
  readonly listing: {
    readonly canManage: boolean;
  };
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

export class GetOperationalManagementCapabilitiesUseCase {
  execute(context: TrustedActorContext): OperationalManagementCapabilitiesView {
    return Object.freeze({
      branches: Object.freeze({
        canView: policy.canViewBranches(context),
        canManage: policy.canManageBranches(context),
      }),
      listing: Object.freeze({
        canManage: policy.canManageListing(context),
      }),
      inventory: Object.freeze({
        canViewAvailability: policy.canViewInventoryAvailability(context),
        canViewQuantities: policy.canViewInventoryQuantities(context),
        canReceive: policy.canReceiveInventory(context),
        canIssue: policy.canIssueInventory(context),
        canReserve: policy.canReserveInventory(context),
        canTransfer: policy.canTransferInventory(context),
        canManageDamage: policy.canManageInventoryDamage(context),
        canAdjust: policy.canCorrectInventory(context),
      }),
      pricing: Object.freeze({
        canView: policy.canViewPricing(context),
        canViewWholesale: policy.canViewWholesalePricing(context),
        canManageWorkspace: policy.canManageWorkspacePricing(context),
        canManageBranchOverrides: policy.canManageBranchPricingOverrides(context),
      }),
      referenceCost: Object.freeze({
        canView: policy.canViewReferenceCost(context),
        canManageWorkspace: policy.canManageWorkspaceReferenceCost(context),
        canManageBranchOverrides: policy.canManageBranchReferenceCostOverrides(context),
      }),
    });
  }
}
