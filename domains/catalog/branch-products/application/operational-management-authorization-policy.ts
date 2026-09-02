import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { PermissionCode } from "../../../identity/domain/permission";

export type ListingManagementAction = "SetListed" | "SetUnlisted";
export type WorkspacePriceManagementAction = "Set" | "Clear";
export type BranchPriceManagementAction = "SetOverride" | "ClearOverride";

const permission = Object.freeze({
  listingEditSingular: "catalog.product.edit",
  listingEditPlural: "catalog.products.edit",
  pricingManage: "pricing.manage",
  pricingBranchOverrideManage: "pricing.branchOverride.manage",
  referenceCostManage: "referenceCost.manage",
  referenceCostBranchOverrideManage: "referenceCost.branchOverride.manage",
} satisfies Readonly<Record<string, PermissionCode>>);

const has = (context: TrustedActorContext, required: PermissionCode): boolean =>
  context.permissions.includes(required);

const noActions = Object.freeze([]) as readonly never[];
const listingActions = Object.freeze(["SetListed", "SetUnlisted"] as const);
const workspacePriceActions = Object.freeze(["Set", "Clear"] as const);
const branchPriceActions = Object.freeze(["SetOverride", "ClearOverride"] as const);

export const permittedListingManagementActions = (
  context: TrustedActorContext,
): readonly ListingManagementAction[] => has(context, permission.listingEditSingular)
  || has(context, permission.listingEditPlural)
  ? listingActions
  : noActions;

export const permittedWorkspacePricingActions = (
  context: TrustedActorContext,
): readonly WorkspacePriceManagementAction[] => has(context, permission.pricingManage)
  ? workspacePriceActions
  : noActions;

export const permittedWorkspaceReferenceCostActions = (
  context: TrustedActorContext,
): readonly WorkspacePriceManagementAction[] => has(context, permission.referenceCostManage)
  ? workspacePriceActions
  : noActions;

export const permittedBranchPricingActions = (
  context: TrustedActorContext,
): readonly BranchPriceManagementAction[] => has(context, permission.pricingBranchOverrideManage)
  ? branchPriceActions
  : noActions;

export const permittedBranchReferenceCostActions = (
  context: TrustedActorContext,
): readonly BranchPriceManagementAction[] => has(context, permission.referenceCostBranchOverrideManage)
  ? branchPriceActions
  : noActions;
