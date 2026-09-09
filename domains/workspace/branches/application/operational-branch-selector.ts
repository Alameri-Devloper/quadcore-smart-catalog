import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { PermissionCode } from "../../../identity/domain/permission";

export const OPERATIONAL_BRANCH_SELECTOR_PURPOSES = Object.freeze([
  "Listing", "Inventory", "Transfer", "BranchPricing", "BranchReferenceCost",
] as const);

export type OperationalBranchSelectorPurpose = (typeof OPERATIONAL_BRANCH_SELECTOR_PURPOSES)[number];

export type OperationalBranchOption = Readonly<{
  branchId: string;
  code: string;
  displayName: string;
  status: "Active" | "Inactive";
}>;

const purposePermissions: Readonly<Record<OperationalBranchSelectorPurpose, readonly PermissionCode[]>> = Object.freeze({
  Listing: Object.freeze(["catalog.product.edit", "catalog.products.edit"] as const),
  Inventory: Object.freeze([
    "inventory.availability.view", "inventory.quantity.view", "inventory.receive",
    "inventory.issue", "inventory.reserve", "inventory.damage", "inventory.adjust",
  ] as const),
  Transfer: Object.freeze(["inventory.transfer"] as const),
  BranchPricing: Object.freeze(["pricing.branchOverride.manage"] as const),
  BranchReferenceCost: Object.freeze(["referenceCost.branchOverride.manage"] as const),
});

export const isOperationalBranchSelectorPurpose = (value: unknown): value is OperationalBranchSelectorPurpose =>
  typeof value === "string" && (OPERATIONAL_BRANCH_SELECTOR_PURPOSES as readonly string[]).includes(value);

export const canSelectOperationalBranches = (
  context: TrustedActorContext,
  purpose: OperationalBranchSelectorPurpose,
): boolean => purposePermissions[purpose].some((permission) => context.permissions.includes(permission));
