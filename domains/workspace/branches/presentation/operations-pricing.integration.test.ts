import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { WorkspacePricingApiClient, type WorkspacePricingFetchPort } from "../../../catalog/branch-products/presentation/workspace-pricing-api.client";
import { WorkspacePricingCoordinator } from "../../../catalog/branch-products/presentation/workspace-pricing.coordinator";
import { workspacePricingFixture, workspacePricingSlotFixture } from "../../../catalog/branch-products/presentation/mock/workspace-pricing.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsWorkspacePricingTarget, workspacePricingSelectionKey } from "./operations-pricing-context";
import { resolveOperationsQuery } from "./operations-query-state";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const success = (value: unknown) => Response.json({ type: "Success", value });
const capabilities = () => { const value = operationalManagementCapabilitiesFixture(); value.pricing.canView = true; value.referenceCost.canManageWorkspace = true; return value; };

describe("P6 Workspace pricing Operations integration", () => {
  for (const [pricingField, purpose] of [["prices", "WorkspacePricing"], ["reference-cost", "WorkspaceReferenceCost"]] as const)
    it(`composes A2 ${purpose} → authoritative GET without A6 or branchId`, async () => {
      const calls: string[] = [], products = operationalProductPageFixture(), product = { ...products.items[0]!, branchId: undefined };
      const fetchPort: WorkspacePricingFetchPort = async (input, init) => {
        const url = String(input); calls.push(`${init?.method} ${url}`);
        if (url === `/api/catalog/operational-products?purpose=${purpose}`) return success({ ...products, items: [product] });
        if (url === `/api/products/${product.productId}/pricing`) return success(pricingField === "prices"
          ? workspacePricingFixture({ productId: product.productId, referenceCost: undefined })
          : workspacePricingFixture({ productId: product.productId, retail: undefined, wholesale: undefined }));
        assert.fail(`Unexpected request: ${url}`);
      };
      const query = resolveOperationsQuery(new URLSearchParams(`section=pricing&pricingScope=workspace&pricingField=${pricingField}&productId=${product.productId}`), capabilities());
      assert.ok(query.context); const discovery = operationsProductDiscovery(query.context, null); assert.equal(discovery.type, "Ready"); if (discovery.type !== "Ready") return;
      const request = { ...discovery.scope, q: "" }; assert.equal(request.purpose, purpose); assert.equal("branchId" in request, false);
      const a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks); await a2.load(request);
      const selection = operationalProductSelection(a2.snapshot, operationalProductRequestKey(request), product.productId); assert.equal(selection.type, "Selected"); if (selection.type !== "Selected") return;
      const lifecycle = {}, known = { lifecycle, key: workspacePricingSelectionKey(query.context, query.products), product: selection.product };
      const target = operationsWorkspacePricingTarget(query.context, query.products, lifecycle, known); assert.ok(target);
      const pricing = new WorkspacePricingCoordinator(new WorkspacePricingApiClient(fetchPort), target.productId, target.surface, callbacks); await pricing.load();
      assert.deepEqual(calls, [`GET /api/catalog/operational-products?purpose=${purpose}`, `GET /api/products/${product.productId}/pricing`]);
      assert.equal(calls.some(call => call.includes("/api/branches")), false); a2.dispose(); pricing.dispose();
    });

  it("keeps A1 as a hint while resource omission/actions and revisions control Retail, Wholesale and Reference Cost", async () => {
    let reads = 0; const writes: object[] = [];
    const fetchPort: WorkspacePricingFetchPort = async (input, init) => {
      const field = String(input).split("/").at(-1);
      if (init?.method === "GET") { reads++; return success(workspacePricingFixture({ wholesale: undefined, referenceCost: undefined,
        retail: workspacePricingSlotFixture({ allowedActions: ["Set", "Clear"] }) })); }
      const body = JSON.parse(String(init?.body)); writes.push({ field, ...body });
      return success({ productId: "product-one", priceType: field, value: init?.method === "DELETE" ? null
        : { amountMinor: body.amountMinor, currency: body.currency, revision: 8 } });
    };
    const c = new WorkspacePricingCoordinator(new WorkspacePricingApiClient(fetchPort), "product-one", "prices", callbacks); await c.load();
    assert.equal(c.snapshot.detail.type === "Ready" && "wholesale" in c.snapshot.detail.value, false);
    c.choose("Wholesale", "Set", { amountMinor: "1", currency: "USD" }); await c.submit(); assert.equal(writes.length, 0);
    c.choose("Retail", "Set", { amountMinor: "0", currency: "USD" }); await c.submit();
    c.choose("Retail", "Clear"); await c.submit();
    assert.deepEqual(writes, [{ field: "Retail", amountMinor: "0", currency: "USD", expectedRevision: 7 }, { field: "Retail", expectedRevision: 7 }]);
    assert.equal(reads, 3); c.dispose();
  });
});
