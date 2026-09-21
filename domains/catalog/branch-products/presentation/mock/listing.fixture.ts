import type { ListingView, ListingWriteView } from "../listing.types";
export const listingFixture = (patch: Partial<ListingView> = {}): ListingView => ({ branchId: "branch-main", productId: "product-one",
  listingStatus: "Listed", revision: 3, updatedAt: "2026-09-21T12:00:00.000Z", allowedActions: ["SetListed", "SetUnlisted"], ...patch });
export const listingWriteFixture = (patch: Partial<ListingWriteView> = {}): ListingWriteView => ({ branchId: "branch-main", productId: "product-one",
  listingStatus: "Unlisted", revision: 4, updatedAt: "2026-09-21T12:01:00.000Z", ...patch });
