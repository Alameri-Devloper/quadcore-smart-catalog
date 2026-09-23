import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalManagementCapabilitiesClient } from "../../../identity/presentation/operational-management-capabilities.client";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { InventoryApiClient, type FetchPort } from "../../../inventory/presentation/inventory-api.client";
import { InventoryCoordinator } from "../../../inventory/presentation/inventory.coordinator";
import { mutationFixture, quantityFixture } from "../../../inventory/presentation/mock/inventory.fixture";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { resolveOperationsQuery } from "./operations-query-state";
import { inventorySelectionKey, operationsInventoryResource } from "./operations-inventory-context";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const success = (value: unknown) => Response.json({ type: "Success", value });
const capabilities = () => { const result = operationalManagementCapabilitiesFixture(); result.inventory.canReceive = true; result.inventory.canViewQuantities = true; return result; };
describe("P3 Operations Inventory integration", () => {
  it("composes A1 → A6 Inventory → A2 Inventory → GET → explicit Receive → authoritative GET without Product URL state", async () => {
    const calls: string[] = [], products = operationalProductPageFixture("branch-main"), product = products.items[0]; let reads = 0;
    const fetchPort: FetchPort = async (input, init) => {
      const url = String(input); calls.push(`${init?.method} ${url}`);
      if (url === "/api/operations/capabilities") return Response.json(capabilities());
      if (url === "/api/branches/operational?purpose=Inventory") return success([operationalBranchFixture()]);
      if (url === "/api/catalog/operational-products?purpose=Inventory&branchId=branch-main") return success(products);
      if (url === `/api/branches/branch-main/inventory/${product.productId}`) return success(quantityFixture({ productId: product.productId, revision: ++reads }));
      assert.equal(url, "/api/branches/branch-main/inventory/receive"); const body = JSON.parse(String(init?.body));
      assert.deepEqual(Object.keys(body).sort(), ["operationId", "productId", "quantity"]); return success(mutationFixture({ operationId: body.operationId }));
    };
    const a1 = await new OperationalManagementCapabilitiesClient(fetchPort).load(); assert.equal(a1.ok, true);
    const query = resolveOperationsQuery(new URLSearchParams("section=inventory&inventoryTool=stock&branchId=branch-main"), capabilities());
    assert.ok(query.context); assert.equal(query.products.productId, null);
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks); await a6.load("Inventory");
    const discovery = operationsProductDiscovery(query.context, query.branchId, a6.snapshot); assert.equal(discovery.type, "Ready"); if (discovery.type !== "Ready") return;
    const request = { ...discovery.scope, q: "" }; const a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks); await a2.load(request);
    const selection = operationalProductSelection(a2.snapshot, operationalProductRequestKey(request), product.productId); assert.equal(selection.type, "Selected"); if (selection.type !== "Selected") return;
    const lifecycle = {}, known = { lifecycle, key: inventorySelectionKey(query.context, query.branchId, query.products), product: selection.product };
    const target = operationsInventoryResource(query.context, query.branchId, query.products, a6.snapshot, lifecycle, known); assert.ok(target);
    const inventory = new InventoryCoordinator(new InventoryApiClient(fetchPort), target.resource, capabilities().inventory, callbacks, false,
      { randomUUID: () => "operation-integration-0001" });
    await inventory.load(); inventory.choose("Receive"); inventory.updateDraft({ quantity: "2" }); inventory.review(); await inventory.submit();
    assert.equal(reads, 2); assert.equal(inventory.snapshot.detail.type, "Ready"); assert.equal(inventory.snapshot.outcome?.status, "Succeeded");
    assert.equal(calls.some(call => call.includes("productId=")), false); assert.equal(calls.some(call => call === "GET /api/branches"), false);
    inventory.dispose(); a2.dispose(); a6.dispose();
  });
  it("keeps a mutation-only workflow after authoritative GET Forbidden and exposes only minimum success", async () => {
    let reads = 0, writes = 0;
    const client = new InventoryApiClient(async (url, init) => {
      if (init?.method === "GET") { reads++; return Response.json({ type: "Forbidden" }, { status: 403 }); }
      writes++; const body = JSON.parse(String(init?.body)); return success(mutationFixture({ operationId: body.operationId }));
    });
    const mutationOnly = { ...capabilities().inventory, canViewAvailability: false, canViewQuantities: false };
    const inventory = new InventoryCoordinator(client, { branchId: "branch-main", productId: "product-one" }, mutationOnly, callbacks, false,
      { randomUUID: () => "operation-mutation-only" });
    await inventory.load(); assert.equal(inventory.snapshot.detail.type, "ForbiddenRead"); inventory.choose("Receive");
    inventory.updateDraft({ quantity: "1" }); inventory.review(); await inventory.submit();
    assert.equal(reads, 1); assert.equal(writes, 1); assert.deepEqual(inventory.snapshot.outcome && Object.keys(inventory.snapshot.outcome).sort(), ["operationId", "status"]);
  });
});
