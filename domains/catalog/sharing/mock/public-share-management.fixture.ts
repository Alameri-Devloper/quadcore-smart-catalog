import type { PublicShareManagementResult } from "../presentation/public-product-share-management.types";
export const managementLink = (type: "Created" | "Reused" | "Found" | "Replaced" = "Found"): PublicShareManagementResult => ({
  ok: true, type, grantId: "synthetic-grant", url: "https://example.test/share/" + "A".repeat(43),
});
export const deferredManagementResult = () => {
  let resolve!: (value: PublicShareManagementResult) => void;
  const promise = new Promise<PublicShareManagementResult>((done) => { resolve = done; });
  return { promise, resolve };
};
