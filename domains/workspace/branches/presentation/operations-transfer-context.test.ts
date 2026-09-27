import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalProductFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationsTransferSelection, transferProductNavigation, transferSelectionKey } from "./operations-transfer-context";

const context = { section: "Inventory" as const, inventoryTool: "transfer" as const };
const query = { q: "", productCursor: null, productId: null, issue: null };
const branches: OperationalBranchState = { type: "Ready", purpose: "Transfer", availability: "Available", options: [operationalBranchFixture()] };
describe("P5 Operations Transfer context", () => {
  it("keeps Product local and adds no Product, destination, or transfer result URL state", () => {
    assert.deepEqual(transferProductNavigation(query, { ...query, productId: "product-one" }), { productId: "product-one", navigation: null });
    const key = transferSelectionKey(context, "branch-main", { ...query, productId: "product-one" });
    assert.equal(key.includes("productId"), false); assert.equal(key.includes("destination"), false); assert.equal(key.includes("transferId"), false);
  });
  it("accepts only an active source from the A6 Transfer collection and a source-scoped known Product", () => {
    const lifecycle = {}, product = operationalProductFixture({ branchId: "branch-main" });
    const known = { lifecycle, key: transferSelectionKey(context, "branch-main", query), product };
    assert.deepEqual(operationsTransferSelection(context, "branch-main", query, branches, lifecycle, known), { source: branches.options[0], product });
    assert.equal(operationsTransferSelection(context, "branch-main", query, { ...branches, purpose: "Inventory" }, lifecycle, known), null);
    assert.equal(operationsTransferSelection(context, "branch-main", query, { ...branches, options: [{ ...branches.options[0], status: "Inactive" }] }, lifecycle, known), null);
    assert.equal(operationsTransferSelection(context, "branch-main", query, branches, {}, known)?.product, null);
    assert.equal(operationsTransferSelection(context, "branch-main", query, branches, lifecycle,
      { ...known, product: operationalProductFixture({ branchId: "branch-other" }) })?.product, null);
  });
  it("source/search/tool changes invalidate the known Product key", () => {
    const lifecycle = {}, product = operationalProductFixture({ branchId: "branch-main" });
    const known = { lifecycle, key: transferSelectionKey(context, "branch-main", query), product };
    assert.equal(operationsTransferSelection(context, "branch-other", query, branches, lifecycle, known), null);
    assert.equal(operationsTransferSelection(context, "branch-main", { ...query, q: "changed" }, branches, lifecycle, known)?.product, null);
    assert.equal(operationsTransferSelection({ section: "Inventory", inventoryTool: "stock" }, "branch-main", query, branches, lifecycle, known), null);
  });
});
