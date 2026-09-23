import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalProductFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { inventoryProductNavigation, inventorySelectionKey, operationsInventoryResource } from "./operations-inventory-context";
import type { OperationalBranchState } from "./operational-branch-selector.types";

const context = { section: "Inventory" as const, inventoryTool: "stock" as const };
const query = { q: "", productCursor: null, productId: null, issue: null };
describe("P3 Operations Inventory context", () => {
  it("keeps Product selection local and never requests productId URL navigation", () => {
    const selected = inventoryProductNavigation(query, { ...query, productId: "product-one" });
    assert.deepEqual(selected, { productId: "product-one", navigation: null });
    const searched = inventoryProductNavigation({ ...query, productId: "product-one" }, { ...query, q: "soap", productId: "product-one" });
    assert.deepEqual(searched, { productId: "product-one", navigation: { ...query, q: "soap", productId: null } });
    assert.equal(inventorySelectionKey(context, "branch-main", { ...query, productId: "product-one" }).includes("productId"), false);
  });
  it("preserves a known inactive resource for inspection without creating fresh discovery", () => {
    const lifecycle = {}, product = operationalProductFixture({ branchId: "branch-main" });
    const branches: OperationalBranchState = { type: "Ready", purpose: "Inventory", availability: "AllInactive", options: [operationalBranchFixture({ status: "Inactive" })] };
    const known = { lifecycle, key: inventorySelectionKey(context, "branch-main", query), product };
    assert.equal(operationsInventoryResource(context, "branch-main", query, branches, lifecycle, null), null);
    const target = operationsInventoryResource(context, "branch-main", query, branches, lifecycle, known);
    assert.ok(target); assert.equal(target.inspectionOnly, true); assert.equal(target.resource.productId, product.productId);
  });
  it("clears resource composition across actor, Branch, search/page, purpose and A6 state changes", () => {
    const lifecycle = {}, product = operationalProductFixture({ branchId: "branch-main" });
    const branches: OperationalBranchState = { type: "Ready", purpose: "Inventory", availability: "Available", options: [operationalBranchFixture()] };
    const known = { lifecycle, key: inventorySelectionKey(context, "branch-main", query), product };
    assert.ok(operationsInventoryResource(context, "branch-main", query, branches, lifecycle, known));
    assert.equal(operationsInventoryResource(context, "branch-main", query, branches, {}, known), null);
    assert.equal(operationsInventoryResource(context, "other", query, branches, lifecycle, known), null);
    assert.equal(operationsInventoryResource(context, "branch-main", { ...query, q: "changed" }, branches, lifecycle, known), null);
    assert.equal(operationsInventoryResource({ section: "Inventory", inventoryTool: "reservations" }, "branch-main", query, branches, lifecycle, known), null);
    for (const state of [{ type: "Loading", purpose: "Inventory" }, { type: "Failed", purpose: "Inventory", kind: "Forbidden" }, { ...branches, purpose: "Listing" }, { ...branches, options: [] }] as OperationalBranchState[])
      assert.equal(operationsInventoryResource(context, "branch-main", query, state, lifecycle, known), null);
  });
});
