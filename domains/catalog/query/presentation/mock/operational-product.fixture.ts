import type { OperationalProductPage, OperationalProductView } from "../operational-product-selector.types";

export const operationalProductFixture = (patch: Partial<OperationalProductView> = {}): OperationalProductView => ({
  productId: "product-z", productCode: "QSC-Z", productName: "Workspace Product", lifecycle: "Draft", ...patch,
});
export const operationalProductPageFixture = (branchId?: string): OperationalProductPage => ({
  items: [
    operationalProductFixture({ ...(branchId ? { branchId, listingStatus: "Unlisted" as const } : {}) }),
    operationalProductFixture({ productId: "product-a", productCode: null, productName: null, lifecycle: "Published", ...(branchId ? { branchId, listingStatus: "Listed" as const } : {}) }),
  ], nextCursor: "opaque_Next-123",
});
