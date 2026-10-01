import type { WorkspacePricingManagementView, WorkspacePricingSlot } from "../workspace-pricing.types";

export const workspacePricingSlotFixture = (patch: Partial<WorkspacePricingSlot> = {}): WorkspacePricingSlot => ({
  state: "Configured",
  value: { amountMinor: "1500", currency: "USD" },
  allowedActions: ["Set", "Clear"],
  ...patch,
});

export const workspacePricingFixture = (patch: Partial<WorkspacePricingManagementView> = {}): WorkspacePricingManagementView => ({
  productId: "product-one",
  productRevision: 7,
  retail: workspacePricingSlotFixture(),
  wholesale: workspacePricingSlotFixture({ value: { amountMinor: "1200", currency: "USD" } }),
  referenceCost: { ...workspacePricingSlotFixture({ value: { amountMinor: "800", currency: "USD" } }), referenceCostRevision: 4 },
  ...patch,
});
