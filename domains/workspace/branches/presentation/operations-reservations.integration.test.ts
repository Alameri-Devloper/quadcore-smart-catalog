import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalManagementCapabilitiesClient } from "../../../identity/presentation/operational-management-capabilities.client";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { OperationalProductSelectorCoordinator, operationalProductSelection } from "../../../catalog/query/presentation/operational-product-selector.coordinator";
import { operationalProductRequestKey } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import type { FetchPort } from "../../../inventory/presentation/inventory-api.client";
import { reservationFixture, reservationMutationFixture, reservationPageFixture } from "../../../inventory/presentation/mock/reservation.fixture";
import { ReservationApiClient } from "../../../inventory/presentation/reservation-api.client";
import { ReservationCoordinator } from "../../../inventory/presentation/reservation.coordinator";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { resolveOperationsQuery } from "./operations-query-state";
import { operationsReservationResource, reservationSelectionKey } from "./operations-reservation-context";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const success = (value: unknown, status = 200) => Response.json({ type: "Success", value }, { status });
const capabilities = () => { const result = operationalManagementCapabilitiesFixture(); result.inventory.canReserve = true; return result; };

describe("P4 Operations Reservations integration", () => {
  it("composes A1 → A6 Inventory → local A2 Product → collection/detail → explicit Reserve → authoritative refetch", async () => {
    const calls: string[] = [], products = operationalProductPageFixture("branch-main"), product = products.items[0]; let lists = 0, details = 0;
    const fetchPort: FetchPort = async (input, init) => {
      const url = String(input); calls.push(`${init?.method} ${url}`);
      if (url === "/api/operations/capabilities") return Response.json(capabilities());
      if (url === "/api/branches/operational?purpose=Inventory") return success([operationalBranchFixture()]);
      if (url === "/api/catalog/operational-products?purpose=Inventory&branchId=branch-main") return success(products);
      if (url === `/api/branches/branch-main/inventory/reservations?productId=${product.productId}`) { lists++; return success(reservationPageFixture({
        items: [reservationFixture({ productId: product.productId })], nextCursor: null })); }
      if (url === "/api/branches/branch-main/inventory/reservations/reservation-one") { details++; return success(reservationFixture({ productId: product.productId })); }
      assert.equal(url, "/api/branches/branch-main/inventory/reservations"); assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)); assert.deepEqual(Object.keys(body).sort(), ["operationId", "productId", "quantity", "reasonCode"]);
      assert.equal(Object.prototype.hasOwnProperty.call(body, "note"), false);
      return success(reservationMutationFixture({ operationId: body.operationId, reservationId: "reservation-one" }), 201);
    };
    const a1 = await new OperationalManagementCapabilitiesClient(fetchPort).load(); assert.equal(a1.ok, true);
    const resolved = resolveOperationsQuery(new URLSearchParams("section=inventory&inventoryTool=reservations&branchId=branch-main&productId=must-not-survive"), capabilities());
    assert.ok(resolved.context); assert.equal(resolved.products.productId, null);
    const a6 = new OperationalBranchSelectorCoordinator(new OperationalBranchApiClient(fetchPort), callbacks); await a6.load("Inventory");
    const discovery = operationsProductDiscovery(resolved.context!, resolved.branchId, a6.snapshot); assert.equal(discovery.type, "Ready"); if (discovery.type !== "Ready") return;
    const request = { ...discovery.scope, q: "" }, a2 = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(fetchPort), callbacks); await a2.load(request);
    const selected = operationalProductSelection(a2.snapshot, operationalProductRequestKey(request), product.productId); assert.equal(selected.type, "Selected"); if (selected.type !== "Selected") return;
    const lifecycle = {}, known = { lifecycle, key: reservationSelectionKey(resolved.context!, resolved.branchId, resolved.products), product: selected.product };
    const target = operationsReservationResource(resolved.context!, resolved.branchId, resolved.products, resolved.reservations, a6.snapshot, lifecycle, known); assert.ok(target);
    const navigations: unknown[] = [], coordinator = new ReservationCoordinator(new ReservationApiClient(fetchPort), target!.resource, resolved.reservations, true,
      { onChange() {}, onAuthenticationRequired() {}, onNavigationChange(value) { navigations.push(value); } }, false, { randomUUID: () => "operation-integration-0001" });
    await coordinator.load(); await coordinator.select("reservation-one"); coordinator.choose("Reserve"); coordinator.updateDraft({ quantity: "2", reasonCode: "ORDER" }); coordinator.review(); await coordinator.submit();
    assert.equal(lists, 2); assert.equal(details, 2); assert.equal(coordinator.snapshot.outcome?.reservationId, "reservation-one");
    assert.equal(calls.some(call => call.includes("/transfers")), false); assert.equal(calls.some(call => call === "GET /api/branches"), false);
    assert.equal(new URLSearchParams("section=inventory&inventoryTool=reservations&branchId=branch-main").has("productId"), false);
    assert.deepEqual(navigations.at(-1), { reservationCursor: null, reservationId: "reservation-one" });
    coordinator.dispose(); a2.dispose(); a6.dispose();
  });
  it("never derives Release/Fulfill from A1 and keeps inactive known detail inspection", async () => {
    const inactive = { type: "Ready", purpose: "Inventory", options: [operationalBranchFixture({ status: "Inactive" })], availability: "AllInactive" } as const;
    const context = { section: "Inventory", inventoryTool: "reservations" } as const, query = { q: "", productCursor: null, productId: null, issue: null } as const;
    const reservations = { reservationCursor: null, reservationId: "reservation-one", issue: null } as const, lifecycle = {};
    const target = operationsReservationResource(context, "branch-main", query, reservations, inactive, lifecycle, null); assert.equal(target?.inactiveBranch, true);
    const coordinator = new ReservationCoordinator({
      async list() { return { ok: true, value: { items: [], nextCursor: null } }; }, async detail() { return { ok: true, value: reservationFixture({ allowedActions: [] }) }; },
      async reserve() { assert.fail("Reserve must remain blocked"); }, async release() { assert.fail("Release must not derive from A1"); }, async fulfill() { assert.fail("Fulfill must not derive from A1"); },
    }, target!.resource, reservations, true, { onChange() {}, onAuthenticationRequired() {}, onNavigationChange() {} }, true, { randomUUID: () => "operation-integration-0002" });
    await coordinator.load(); assert.equal(coordinator.snapshot.detail.type, "Ready"); coordinator.choose("Reserve"); coordinator.choose("Release"); coordinator.choose("Fulfill");
    assert.equal(coordinator.snapshot.operation, null);
  });
});
