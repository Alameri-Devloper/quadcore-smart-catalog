import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalManagementCapabilitiesClient } from "../../../identity/presentation/operational-management-capabilities.client";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { InventoryApiClient, type FetchPort } from "../../../inventory/presentation/inventory-api.client";
import { TransferApiClient } from "../../../inventory/presentation/transfer-api.client";
import { TransferCoordinator } from "../../../inventory/presentation/transfer.coordinator";
import { quantityFixture } from "../../../inventory/presentation/mock/inventory.fixture";
import { detailedTransferFixture } from "../../../inventory/presentation/mock/transfer.fixture";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsContextHref, resolveOperationsQuery } from "./operations-query-state";
import { operationsTransferSelection, transferSelectionKey } from "./operations-transfer-context";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const success = (value: unknown) => Response.json({ type: "Success", value });
const capabilities = () => { const result = operationalManagementCapabilitiesFixture(); result.inventory.canTransfer = true; result.inventory.canViewQuantities = true; return result; };
describe("P5 Operations Transfer integration", () => {
  it("composes A1 hint → one A6 Transfer set → source-scoped A2 Inventory → exact Transfer → two authoritative GETs", async () => {
    const calls: string[] = [], products = operationalProductPageFixture("branch-source"), product = products.items[0]; let reads = 0;
    const source = operationalBranchFixture({ branchId: "branch-source", code: "SRC", displayName: "Source" });
    const destination = operationalBranchFixture({ branchId: "branch-destination", code: "DST", displayName: "Destination" });
    const fetchPort: FetchPort = async (input, init) => {
      const url = String(input); calls.push(`${init?.method} ${url}`);
      if (url === "/api/operations/capabilities") return Response.json(capabilities());
      if (url === "/api/branches/operational?purpose=Transfer") return success([source, destination]);
      if (url === "/api/catalog/operational-products?purpose=Inventory&branchId=branch-source") return success(products);
      if (url === `/api/branches/branch-source/inventory/${product.productId}`) { reads++; return success(quantityFixture({ branchId: "branch-source", productId: product.productId })); }
      if (url === `/api/branches/branch-destination/inventory/${product.productId}`) { reads++; return success(quantityFixture({ branchId: "branch-destination", productId: product.productId })); }
      assert.equal(url, "/api/inventory/transfers"); assert.equal(init?.method, "POST"); const body = JSON.parse(String(init?.body));
      assert.deepEqual(Object.keys(body).sort(), ["destinationBranchId", "operationId", "productId", "quantity", "reasonCode", "sourceBranchId"]);
      assert.equal(body.sourceBranchId, "branch-source"); assert.equal(body.destinationBranchId, "branch-destination"); assert.equal(body.reasonCode, "REBALANCE_01");
      return success(detailedTransferFixture({ operationId: body.operationId, sourceBalance: quantityFixture({ branchId: "branch-source", productId: product.productId }),
        destinationBalance: quantityFixture({ branchId: "branch-destination", productId: product.productId }) }));
    };
    assert.equal((await new OperationalManagementCapabilitiesClient(fetchPort).load()).ok, true);
    const resolved = resolveOperationsQuery(new URLSearchParams("section=inventory&inventoryTool=transfer&branchId=branch-source&productId=must-not-survive"), capabilities());
    assert.ok(resolved.context); assert.equal(resolved.products.productId, null);
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks); await a6.load("Transfer");
    assert.equal(a6.snapshot.type, "Ready"); if (a6.snapshot.type !== "Ready") return; assert.equal(a6.snapshot.options.length, 2);
    const discovery = operationsProductDiscovery(resolved.context!, resolved.branchId, a6.snapshot); assert.equal(discovery.type, "Ready"); if (discovery.type !== "Ready") return;
    assert.deepEqual(discovery.scope, { purpose: "Inventory", branchId: "branch-source" });
    const request = { ...discovery.scope, q: "" }, a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks); await a2.load(request);
    const selected = operationalProductSelection(a2.snapshot, operationalProductRequestKey(request), product.productId); assert.equal(selected.type, "Selected"); if (selected.type !== "Selected") return;
    const lifecycle = {}, known = { lifecycle, key: transferSelectionKey(resolved.context!, resolved.branchId, resolved.products), product: selected.product };
    const target = operationsTransferSelection(resolved.context!, resolved.branchId, resolved.products, a6.snapshot, lifecycle, known); assert.ok(target?.product);
    const coordinator = new TransferCoordinator(new TransferApiClient(fetchPort), new InventoryApiClient(fetchPort), "branch-source", a6.snapshot.options,
      "branch-destination", product.productId, capabilities().inventory, { onChange() {}, onAuthenticationRequired() {}, onBranchesStale() {}, onProductStale() {} },
      { randomUUID: () => "operation-integration-0001" });
    coordinator.updateDraft({ quantity: "2", reasonCode: "REBALANCE_01" }); coordinator.review(); await coordinator.submit();
    assert.equal(reads, 2); assert.equal(coordinator.snapshot.outcome?.transferId, "transfer-one");
    assert.equal(calls.filter(call => call.includes("purpose=Transfer")).length, 1); assert.equal(calls.some(call => call.includes("purpose=Inventory&branchId=branch-destination")), false);
    assert.equal(calls.some(call => call === "GET /api/branches"), false); assert.equal(operationsContextHref(resolved.context!, "branch-source", { ...resolved.products, productId: product.productId }).includes("productId"), false);
    coordinator.dispose(); a2.dispose(); a6.dispose();
  });
  it("keeps A1 as a hint while Transfer/A6/A2/Inventory endpoints remain authoritative", async () => {
    const noHint = capabilities(); noHint.inventory.canTransfer = false;
    const resolved = resolveOperationsQuery(new URLSearchParams("section=inventory&inventoryTool=transfer&branchId=branch-source"), noHint);
    assert.equal(resolved.context?.section, "Inventory"); assert.equal(resolved.context && "inventoryTool" in resolved.context ? resolved.context.inventoryTool : null, "transfer");
    assert.equal(noHint.inventory.canTransfer, false);
  });
});
