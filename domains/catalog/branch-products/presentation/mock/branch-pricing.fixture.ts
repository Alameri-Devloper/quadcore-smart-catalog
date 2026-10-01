import type { BranchPricingManagementView, BranchPricingSlot, BranchPricingValueSlot } from "../branch-pricing.types";

export const branchPricingValueFixture = (patch: Partial<BranchPricingValueSlot> = {}): BranchPricingValueSlot => ({
  state: "Configured", value: { amountMinor: "1250", currency: "USD" }, allowedActions: [], ...patch,
});

export const branchPricingSlotFixture = (patch: Partial<BranchPricingSlot> = {}): BranchPricingSlot => ({
  base: branchPricingValueFixture(), override: branchPricingValueFixture({ value: { amountMinor: "1100", currency: "USD" } }),
  overrideRevision: 3, effective: { amountMinor: "1100", currency: "USD" }, source: "BranchOverride",
  allowedActions: ["SetOverride", "ClearOverride"], ...patch,
});

export const branchPricingFixture = (patch: Partial<BranchPricingManagementView> = {}): BranchPricingManagementView => ({
  branchId: "branch-main", productId: "product-one", baseProductRevision: 7,
  prices: {
    Retail: branchPricingSlotFixture(),
    Wholesale: branchPricingSlotFixture({
      override: branchPricingValueFixture({ state: "NotConfigured", value: null }), overrideRevision: 0,
      effective: { amountMinor: "900", currency: "USD" }, source: "WorkspaceBase", allowedActions: ["SetOverride"],
      base: branchPricingValueFixture({ value: { amountMinor: "900", currency: "USD" } }),
    }),
  }, ...patch,
});
