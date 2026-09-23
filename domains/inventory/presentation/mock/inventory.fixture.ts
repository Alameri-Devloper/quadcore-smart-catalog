import type { InventoryAvailabilityView, InventoryMutationView, InventoryQuantityView } from "../inventory.types";

export const availabilityFixture = (patch: Partial<InventoryAvailabilityView> = {}): InventoryAvailabilityView => Object.freeze({
  branchId: "branch-main", productId: "product-one", unit: "Piece", availability: "InStock", ...patch,
});
export const quantityFixture = (patch: Partial<InventoryQuantityView> = {}): InventoryQuantityView => Object.freeze({
  ...availabilityFixture(), quantities: Object.freeze({ available: "7", onHand: "10", reserved: "2", damaged: "1" }),
  revision: 4, updatedAt: "2026-09-22T10:00:00.000Z", ...patch,
});
export const mutationFixture = (patch: Partial<InventoryMutationView> = {}): InventoryMutationView => Object.freeze({
  operationId: "operation-0001", status: "Succeeded", ...patch,
});
