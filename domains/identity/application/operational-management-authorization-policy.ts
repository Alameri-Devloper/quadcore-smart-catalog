import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import type { PermissionCode } from "../domain/permission";

const permission = Object.freeze({
  branchView: "workspace.branches.view",
  branchManage: "workspace.branches.manage",
  listingEditSingular: "catalog.product.edit",
  listingEditPlural: "catalog.products.edit",
  inventoryAvailabilityView: "inventory.availability.view",
  inventoryQuantityView: "inventory.quantity.view",
  inventoryReceive: "inventory.receive",
  inventoryIssue: "inventory.issue",
  inventoryReserve: "inventory.reserve",
  inventoryDamage: "inventory.damage",
  inventoryTransfer: "inventory.transfer",
  inventoryCorrection: "inventory.adjust",
  pricingView: "pricing.view",
  pricingWholesaleView: "pricing.wholesale.view",
  pricingManage: "pricing.manage",
  pricingBranchOverrideManage: "pricing.branchOverride.manage",
  referenceCostView: "referenceCost.view",
  referenceCostManage: "referenceCost.manage",
  referenceCostBranchOverrideManage: "referenceCost.branchOverride.manage",
} satisfies Readonly<Record<string, PermissionCode>>);

export const hasEffectivePermission = (
  context: TrustedActorContext,
  required: PermissionCode,
): boolean => context.permissions.includes(required);

const hasEveryEffectivePermission = (
  context: TrustedActorContext,
  required: readonly PermissionCode[],
): boolean => required.every((code) => hasEffectivePermission(context, code));

export const operationalManagementAuthorizationPolicy = Object.freeze({
  canViewBranches: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.branchView),
  canManageBranches: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.branchManage),
  canManageListing: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.listingEditSingular)
    || hasEffectivePermission(context, permission.listingEditPlural),
  canViewInventoryAvailability: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryAvailabilityView)
    || hasEffectivePermission(context, permission.inventoryQuantityView),
  canViewInventoryQuantities: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryQuantityView),
  canReceiveInventory: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryReceive),
  canIssueInventory: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryIssue),
  canReserveInventory: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryReserve),
  canManageInventoryDamage: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryDamage),
  canTransferInventory: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryTransfer),
  canCorrectInventory: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.inventoryCorrection),
  canViewPricing: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.pricingView),
  canViewWholesalePricing: (context: TrustedActorContext): boolean =>
    hasEveryEffectivePermission(context, [permission.pricingView, permission.pricingWholesaleView]),
  canManageWorkspacePricing: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.pricingManage),
  canManageBranchPricingOverrides: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.pricingBranchOverrideManage),
  canViewReferenceCost: (context: TrustedActorContext): boolean =>
    hasEveryEffectivePermission(context, [permission.pricingView, permission.referenceCostView]),
  canManageWorkspaceReferenceCost: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.referenceCostManage),
  canManageBranchReferenceCostOverrides: (context: TrustedActorContext): boolean =>
    hasEffectivePermission(context, permission.referenceCostBranchOverrideManage),
});
