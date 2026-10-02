import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BranchPricingApiClient, type BranchPricingFetchPort } from "../../../catalog/branch-products/presentation/branch-pricing-api.client";
import { BranchPricingCoordinator } from "../../../catalog/branch-products/presentation/branch-pricing.coordinator";
import { branchPricingFixture, branchPricingSlotFixture } from "../../../catalog/branch-products/presentation/mock/branch-pricing.fixture";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { OperationalBranchSelectorCoordinator, operationalBranchSelection } from "./operational-branch-selector.coordinator";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { branchPricingSelectionKey, operationsBranchPricingTarget } from "./operations-branch-pricing-context";
import { resolveOperationsQuery } from "./operations-query-state";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const success = (value: unknown) => Response.json({ type: "Success", value });

describe("P7 Branch pricing Operations integration", () => {
  for (const [pricingField, branchPurpose, productPurpose] of [
    ["prices", "BranchPricing", "BranchPricing"], ["reference-cost", "BranchReferenceCost", "BranchReferenceCost"],
  ] as const) it(`composes A1 → A6 ${branchPurpose} → A2 ${productPurpose} → authoritative management GET`, async () => {
    const calls: string[] = [], branch = operationalBranchFixture(), page = operationalProductPageFixture(branch.branchId), product = page.items[0]!;
    const fetchPort: BranchPricingFetchPort = async (input, init) => {
      const url = String(input); calls.push(`${init?.method} ${url}`);
      if (url === `/api/branches/operational?purpose=${branchPurpose}`) return success([branch]);
      if (url === `/api/catalog/operational-products?purpose=${productPurpose}&branchId=${branch.branchId}`) return success(page);
      if (url === `/api/branches/${branch.branchId}/products/${product.productId}/pricing/management`)
        return success(pricingField === "prices"
          ? branchPricingFixture({ branchId: branch.branchId, productId: product.productId })
          : branchPricingFixture({ branchId: branch.branchId, productId: product.productId, baseProductRevision: undefined,
            baseReferenceCostRevision: 2, prices: { ReferenceCost: branchPricingSlotFixture() } }));
      assert.fail(`Unexpected request: ${url}`);
    };
    const capabilities = operationalManagementCapabilitiesFixture();
    if (pricingField === "prices") capabilities.pricing.canManageBranchOverrides = true;
    else capabilities.referenceCost.canManageBranchOverrides = true;
    const resolved = resolveOperationsQuery(new URLSearchParams(
      `section=pricing&pricingScope=branch&pricingField=${pricingField}&branchId=${branch.branchId}&productId=${product.productId}`), capabilities);
    assert.ok(resolved.context); const purpose = pricingField === "prices" ? "BranchPricing" : "BranchReferenceCost";
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks); await a6.load(purpose);
    assert.equal(operationalBranchSelection(a6.snapshot, purpose, branch.branchId).type, "Selected");
    const discovery = operationsProductDiscovery(resolved.context, branch.branchId, a6.snapshot);
    assert.equal(discovery.type, "Ready"); if (discovery.type !== "Ready") return;
    const request = { ...discovery.scope, q: "" };
    const a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks); await a2.load(request);
    const selected = operationalProductSelection(a2.snapshot, operationalProductRequestKey(request), product.productId);
    assert.equal(selected.type, "Selected"); if (selected.type !== "Selected") return;
    const lifecycle = {}, known = { lifecycle, key: branchPricingSelectionKey(resolved.context, branch.branchId, resolved.products), product: selected.product };
    const target = operationsBranchPricingTarget(resolved.context, branch.branchId, resolved.products, a6.snapshot, lifecycle, known);
    assert.ok(target);
    const pricing = new BranchPricingCoordinator(new BranchPricingApiClient(fetchPort), target.branchId, target.productId, target.surface, callbacks);
    await pricing.load();
    assert.deepEqual(calls, [
      `GET /api/branches/operational?purpose=${branchPurpose}`,
      `GET /api/catalog/operational-products?purpose=${productPurpose}&branchId=${branch.branchId}`,
      `GET /api/branches/${branch.branchId}/products/${product.productId}/pricing/management`,
    ]);
    if (pricingField === "reference-cost" && pricing.snapshot.detail.type === "Ready") {
      assert.equal("Retail" in pricing.snapshot.detail.value.prices, false); assert.equal("Wholesale" in pricing.snapshot.detail.value.prices, false);
    }
    a6.dispose(); a2.dispose(); pricing.dispose();
  });

  it("treats A1 as navigation hints and stops after denied A6 discovery without fallback or disclosure", async () => {
    const calls: string[] = [];
    const fetchPort: BranchPricingFetchPort = async (input) => {
      calls.push(String(input)); return Response.json({ type: "Forbidden" }, { status: 403 });
    };
    const capabilities = operationalManagementCapabilitiesFixture(); capabilities.pricing.canManageWorkspace = true;
    const resolved = resolveOperationsQuery(new URLSearchParams(
      "section=pricing&pricingScope=branch&pricingField=prices&branchId=branch-main&productId=product-z"), capabilities);
    assert.ok(resolved.context);
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks); await a6.load("BranchPricing");
    assert.equal(a6.snapshot.type, "Failed");
    assert.notEqual(operationsProductDiscovery(resolved.context, resolved.branchId, a6.snapshot).type, "Ready");
    assert.deepEqual(calls, ["/api/branches/operational?purpose=BranchPricing"]); a6.dispose();
  });
});
