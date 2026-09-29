import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsWorkspacePricingTarget, workspacePricingSelectionKey } from "./operations-pricing-context";
import type { OperationalProductQuery } from "../../../catalog/query/presentation/operational-product-selector.types";

const query: OperationalProductQuery = { q: "", productCursor: null, productId: "product-z", issue: null };
describe("Workspace pricing Operations context", () => {
  it("uses A2 workspace purposes directly with no A6 or Branch", () => {
    assert.deepEqual(operationsProductDiscovery({ section: "Pricing", pricingScope: "workspace", pricingField: "prices" }, null),
      { type: "Ready", scope: { purpose: "WorkspacePricing" } });
    assert.deepEqual(operationsProductDiscovery({ section: "Pricing", pricingScope: "workspace", pricingField: "reference-cost" }, null),
      { type: "Ready", scope: { purpose: "WorkspaceReferenceCost" } });
  });
  it("retains a target only for the exact actor/context/Product/search/page key", () => {
    const context = { section: "Pricing", pricingScope: "workspace", pricingField: "prices" } as const, lifecycle = {};
    const product = { ...operationalProductPageFixture().items[0]!, branchId: undefined };
    const selected = { ...query, productId: product.productId };
    const known = { lifecycle, key: workspacePricingSelectionKey(context, selected), product };
    assert.deepEqual(operationsWorkspacePricingTarget(context, selected, lifecycle, known), {
      productId: product.productId, productLabel: product.productName, surface: "prices",
    });
    assert.equal(operationsWorkspacePricingTarget(context, { ...selected, q: "changed" }, lifecycle, known), null);
    assert.equal(operationsWorkspacePricingTarget(context, { ...selected, productCursor: "next" }, lifecycle, known), null);
    assert.equal(operationsWorkspacePricingTarget({ ...context, pricingField: "reference-cost" }, selected, lifecycle, known), null);
    assert.equal(operationsWorkspacePricingTarget(context, selected, {}, known), null);
    assert.equal(operationsWorkspacePricingTarget(context, { ...selected, productId: null }, lifecycle, known), null);
  });
});
