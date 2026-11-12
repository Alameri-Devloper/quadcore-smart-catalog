import type { PublicShareProjection } from "../application/public-share-projection";
/** Synthetic handoff only; no bearer, tenant or actor authority. */
export const publicShareViewFixture = (count = 1, value = "Public text"): PublicShareProjection => ({
  productName: "منتج Product", retail: { amount: "0.00", currency: "USD" }, hasMainImage: true,
  specifications: Array.from({ length: count }, (_, i) => ({ label: "Public label " + i, valueType: "Text" as const, value })),
});