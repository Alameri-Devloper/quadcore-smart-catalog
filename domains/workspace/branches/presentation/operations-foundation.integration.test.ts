import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalManagementCapabilitiesClient } from "../../../identity/presentation/operational-management-capabilities.client";
import { OperationalManagementCapabilitiesCoordinator } from "../../../identity/presentation/operational-management-capabilities.coordinator";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { OperationalProductApiClient, type FetchPort } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { BranchManagementCoordinator } from "./branch-management.coordinator";
import { WorkspaceBranchApiClient } from "./workspace-branch-api.client";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { branchManagementFixture } from "./mock/branch-management.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationalBranchPurpose, operationsContextHref, resolveOperationsQuery } from "./operations-query-state";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const transferCapabilities = () => {
  const value = operationalManagementCapabilitiesFixture();
  value.inventory.canTransfer = true;
  return value;
};
const success = (value: unknown) => Response.json({ type: "Success", value });

describe("P1 foundation client/coordinator integration", () => {
  it("composes a transfer-only A1 session through A6 Transfer and A2 Inventory, then stops at selection", async () => {
    const calls: string[] = [];
    const fetchPort: FetchPort = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method} ${url}`);
      assert.equal(init?.credentials, "same-origin");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.body, undefined);
      assert.ok(init?.signal instanceof AbortSignal);
      if (url === "/api/operations/capabilities") return Response.json(transferCapabilities());
      if (url === "/api/branches/operational?purpose=Transfer") return success([
        operationalBranchFixture({ branchId: "inactive", status: "Inactive" }), operationalBranchFixture(),
      ]);
      if (url === "/api/catalog/operational-products?purpose=Inventory&branchId=branch-main")
        return success(operationalProductPageFixture("branch-main"));
      assert.fail(`Unexpected request: ${url}`);
    };
    const a1 = new OperationalManagementCapabilitiesCoordinator(new OperationalManagementCapabilitiesClient(fetchPort), callbacks);
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks);
    const a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks);
    try {
      await Promise.all([a1.load(), a1.load()]); // Shell and page share one lifecycle load.
      const capabilities = a1.getState();
      assert.equal(capabilities.type, "Ready");
      if (capabilities.type !== "Ready") return;
      const query = resolveOperationsQuery(new URLSearchParams("section=inventory&inventoryTool=transfer&branchId=branch-main"), capabilities.value);
      assert.ok(query.context);
      const purpose = operationalBranchPurpose(query.context);
      assert.equal(purpose, "Transfer");
      assert.ok(purpose);
      assert.equal(operationsProductDiscovery(query.context, query.branchId, a6.snapshot).type, "Waiting");
      await a6.load(purpose);
      const discovery = operationsProductDiscovery(query.context, query.branchId, a6.snapshot);
      assert.equal(discovery.type, "Ready");
      if (discovery.type !== "Ready") return;
      const request = { ...discovery.scope, q: query.products.q };
      assert.equal(request.purpose, "Inventory");
      await a2.load(request);
      const key = operationalProductRequestKey(request);
      const expected = [
        "GET /api/operations/capabilities",
        "GET /api/branches/operational?purpose=Transfer",
        "GET /api/catalog/operational-products?purpose=Inventory&branchId=branch-main",
      ];
      assert.deepEqual(calls, expected);
      for (const productId of ["product-z", "missing", null]) {
        const selected = resolveOperationsQuery(new URLSearchParams(operationsContextHref(query.context, query.branchId,
          { ...query.products, productId }).split("?")[1]), capabilities.value);
        assert.equal(operationalProductSelection(a2.snapshot, key, selected.products.productId).type,
          productId === null ? "None" : productId === "missing" ? "Stale" : "Selected");
        assert.equal(operationalProductRequestKey({ ...discovery.scope, q: selected.products.q }), key);
        assert.deepEqual(calls, expected); // No discovery reload, resource GET, or mutation from URL selection.
      }
      assert.equal(a2.snapshot.type, "Ready");
      if (a2.snapshot.type === "Ready") assert.deepEqual(a2.snapshot.value.items.map(({ productId }) => productId), ["product-z", "product-a"]);
    } finally { a1.dispose(); a6.dispose(); a2.dispose(); }
  });

  for (const outcome of ["Forbidden", "BranchServiceUnavailable", "Empty", "Inactive", "Stale"] as const) {
    it(`keeps A6 ${outcome} distinct and prevents fresh A2 discovery`, async () => {
      const calls: string[] = [];
      const fetchPort: FetchPort = async (input) => {
        calls.push(String(input));
        if (outcome === "Forbidden") return Response.json({ type: outcome }, { status: 403 });
        if (outcome === "BranchServiceUnavailable") return Response.json({ type: outcome }, { status: 503 });
        return success(outcome === "Empty" ? [] : [operationalBranchFixture({
          branchId: outcome === "Stale" ? "another-branch" : "branch-main",
          status: outcome === "Inactive" ? "Inactive" : "Active",
        })]);
      };
      const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks);
      try {
        await a6.load("Transfer");
        const state = a6.snapshot;
        if (outcome === "Forbidden" || outcome === "BranchServiceUnavailable")
          assert.deepEqual(state, { type: "Failed", purpose: "Transfer", kind: outcome });
        else {
          assert.equal(state.type, "Ready");
          if (state.type === "Ready") assert.equal(state.availability,
            outcome === "Empty" ? "AuthorizedEmpty" : outcome === "Inactive" ? "AllInactive" : "Available");
        }
        const discovery = operationsProductDiscovery({ section: "Inventory", inventoryTool: "transfer" }, "branch-main", state);
        if (discovery.type === "Ready") await new OperationalProductApiClient(fetchPort).search({ ...discovery.scope, q: "" });
        assert.equal(discovery.type, "Waiting");
        assert.deepEqual(calls, ["/api/branches/operational?purpose=Transfer"]);
      } finally { a6.dispose(); }
    });
  }

  it("uses authoritative General Branch detail revisions across conflict and explicit retry", async () => {
    const calls: string[] = [], revisions: number[] = [];
    let detailReads = 0;
    const client = new WorkspaceBranchApiClient(async (input, init) => {
      const path = String(input);
      calls.push(`${init?.method} ${path}`);
      if (path === "/api/branches") return success([branchManagementFixture({ revision: 99 })]);
      assert.equal(path, "/api/branches/branch-one");
      if (init?.method === "GET") return success(branchManagementFixture({ revision: ++detailReads === 1 ? 2 : 3 }));
      assert.equal(init?.method, "PATCH");
      const body = JSON.parse(String(init.body));
      assert.deepEqual(Object.keys(body).sort(), ["displayName", "expectedRevision", "sortOrder", "status"]);
      assert.equal(body.displayName, "Reviewed draft");
      revisions.push(body.expectedRevision);
      return Response.json({ type: revisions.length === 1 ? "Conflict" : "Forbidden" }, { status: revisions.length === 1 ? 409 : 403 });
    });
    const coordinator = new BranchManagementCoordinator(client, callbacks);
    try {
      await coordinator.loadList();
      await coordinator.select("branch-one");
      coordinator.changeDraft({ displayName: "Reviewed draft" });
      await coordinator.submit();
      assert.deepEqual(revisions, [2]); // Never the list revision.
      const editor = coordinator.snapshot.editor;
      assert.equal(editor.type, "Edit");
      if (editor.type !== "Edit") return;
      assert.equal(editor.draft?.displayName, "Reviewed draft");
      assert.equal(editor.reviewRequired, true);
      await coordinator.submit();
      assert.deepEqual(revisions, [2]); // Refetch alone cannot replay the update.
      coordinator.reviewLatest();
      await coordinator.submit();
      assert.deepEqual(revisions, [2, 3]);
      assert.deepEqual(calls, ["GET /api/branches", "GET /api/branches/branch-one", "PATCH /api/branches/branch-one",
        "GET /api/branches/branch-one", "PATCH /api/branches/branch-one"]);
      assert.equal(coordinator.snapshot.failure, "Forbidden");
    } finally { coordinator.dispose(); }
  });
});
