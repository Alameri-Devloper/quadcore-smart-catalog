import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsReservationResource, reservationProductNavigation, reservationSelectionKey } from "./operations-reservation-context";

const context = { section: "Inventory", inventoryTool: "reservations" } as const;
const query = { q: "", productCursor: null, productId: null, issue: null } as const;
const reservations = { reservationCursor: null, reservationId: "reservation-one", issue: null } as const;
const branches = { type: "Ready", purpose: "Inventory", options: [operationalBranchFixture()], availability: "Available" } as const;

describe("Operations Reservation context", () => {
  it("keeps Product selection local and clears it only for Product-search navigation", () => {
    assert.deepEqual(reservationProductNavigation({ ...query, productId: null }, { ...query, productId: "product-one" }),
      { productId: "product-one", searchNavigation: null, productChanged: true });
    assert.deepEqual(reservationProductNavigation({ ...query, productId: "product-one" }, { ...query, q: "changed", productId: null }),
      { productId: null, searchNavigation: { ...query, q: "changed", productId: null }, productChanged: false });
  });
  it("builds an Active or inactive known Product resource without treating selection as authority", () => {
    const lifecycle = {}, product = operationalProductPageFixture("branch-main").items[0];
    const known = { lifecycle, key: reservationSelectionKey(context, "branch-main", query), product };
    assert.deepEqual(operationsReservationResource(context, "branch-main", query, { ...reservations, reservationId: null }, branches, lifecycle, known), {
      resource: { branchId: "branch-main", productId: product.productId }, inactiveBranch: false, resourceLabel: `${product.productName} — Main Branch`,
    });
    const inactive = { ...branches, options: [{ ...branches.options[0], status: "Inactive" as const }], availability: "AllInactive" as const };
    assert.equal(operationsReservationResource(context, "branch-main", query, reservations, inactive, lifecycle, known)?.inactiveBranch, true);
  });
  it("retains a known Reservation detail reference without fresh Product discovery", () => {
    const result = operationsReservationResource(context, "branch-main", query, reservations, branches, {}, null);
    assert.deepEqual(result, { resource: { branchId: "branch-main", productId: null }, inactiveBranch: false, resourceLabel: "reservation-one — Main Branch" });
  });
  it("rejects stale lifecycle/Product/Branch/context combinations and requires Product or Reservation", () => {
    const lifecycle = {}, product = operationalProductPageFixture("branch-main").items[0], known = { lifecycle: {}, key: reservationSelectionKey(context, "branch-main", query), product };
    assert.equal(operationsReservationResource(context, "branch-main", query, { ...reservations, reservationId: null }, branches, lifecycle, known), null);
    assert.equal(operationsReservationResource({ section: "Inventory", inventoryTool: "stock" }, "branch-main", query, reservations, branches, lifecycle, null), null);
    assert.equal(operationsReservationResource(context, null, query, reservations, branches, lifecycle, null), null);
    assert.equal(operationsReservationResource(context, "branch-main", query, { ...reservations, reservationId: null }, branches, lifecycle, null), null);
  });
});
