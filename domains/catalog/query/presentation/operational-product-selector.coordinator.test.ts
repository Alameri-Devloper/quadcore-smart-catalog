import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalProductApiClient } from "./operational-product-api.client";
import { mountOperationalProductSelector, OperationalProductSelectorCoordinator, operationalProductSelection } from "./operational-product-selector.coordinator";
import { operationalProductRequestKey } from "./operational-product-query-state";
import { operationalProductPageFixture as page } from "./mock/operational-product.fixture";
import type { OperationalProductRequest, OperationalProductResult, OperationalProductState } from "./operational-product-selector.types";

const request: OperationalProductRequest = { purpose: "Inventory", branchId: "a", q: "" };
const pending = () => {
  const calls: { request: OperationalProductRequest; signal?: AbortSignal; resolve: (value: OperationalProductResult) => void }[] = [];
  let expired = 0; const states: OperationalProductState[] = [];
  const coordinator = new OperationalProductSelectorCoordinator({ search: (request, signal) => new Promise((resolve) => calls.push({ request, signal, resolve })) }, {
    onChange: (state) => states.push(state), onAuthenticationRequired: () => { expired++; },
  });
  return { coordinator, calls, states, get expired() { return expired; } };
};
describe("A2 page replacement coordination and request lifecycle", () => {
  for (const next of [
    { ...request, purpose: "Listing" as const }, { ...request, branchId: "b" }, { ...request, q: "changed" },
    { ...request, cursor: "opaque_Next-123" }, { purpose: "WorkspacePricing" as const, q: "" },
  ]) for (const old of [{ ok: true, value: page("a") }, { ok: false, kind: "Forbidden" }, { ok: false, kind: "AuthenticationRequired" }] as const)
    it(`ignores old ${old.ok ? "Success" : old.kind} after ${JSON.stringify(next)}`, async () => {
      const h = pending(), first = h.coordinator.load(request), second = h.coordinator.load(next);
      assert.equal(h.calls[0].signal?.aborted, true); assert.equal(h.coordinator.snapshot.type, "Loading");
      h.calls[1].resolve({ ok: true, value: page("branchId" in next ? next.branchId : undefined) }); await second;
      const current = h.coordinator.snapshot, count = h.states.length;
      h.calls[0].resolve(old); await first;
      assert.equal(h.coordinator.snapshot, current); assert.equal(h.states.length, count); assert.equal(h.expired, 0);
    });
  it("supersedes same-query retry and current 401 expires once with options removed", async () => {
    const h = pending(), first = h.coordinator.load(request), second = h.coordinator.load(request);
    h.calls[1].resolve({ ok: false, kind: "AuthenticationRequired" }); await second;
    h.calls[0].resolve({ ok: true, value: page("a") }); await first;
    assert.deepEqual(h.coordinator.snapshot, { type: "Failed", key: operationalProductRequestKey(request), kind: "AuthenticationRequired" });
    assert.equal(h.expired, 1); await h.coordinator.load(request); assert.equal(h.calls.length, 2);
  });
  it("disposal aborts, clears and ignores late success/failure/401", async () => {
    for (const result of [{ ok: true, value: page("a") }, { ok: false, kind: "Forbidden" }, { ok: false, kind: "AuthenticationRequired" }] as const) {
      const h = pending(), loading = h.coordinator.load(request); h.coordinator.dispose();
      assert.equal(h.calls[0].signal?.aborted, true); h.calls[0].resolve(result); await loading;
      assert.deepEqual(h.coordinator.snapshot, { type: "Idle" }); assert.equal(h.states.length, 1); assert.equal(h.expired, 0);
    }
  });
  it("defers mount so disposed setup probes never call A2", async () => {
    let calls = 0;
    const coordinator = mountOperationalProductSelector({ search: async () => { calls++; return { ok: true, value: page() }; } }, request, { onChange() {}, onAuthenticationRequired() {} });
    coordinator.dispose(); await Promise.resolve(); assert.equal(calls, 0);
  });
  it("replaces pages in returned order and validates selection only against the current page/key", async () => {
    const h = pending(), first = h.coordinator.load(request);
    h.calls[0].resolve({ ok: true, value: page("a") }); await first;
    const key = operationalProductRequestKey(request);
    assert.equal(operationalProductSelection(h.coordinator.snapshot, key, null).type, "None");
    assert.equal(operationalProductSelection(h.coordinator.snapshot, key, "product-z").type, "Selected");
    assert.equal(operationalProductSelection(h.coordinator.snapshot, key, "missing").type, "Stale");
    assert.equal(operationalProductSelection(h.coordinator.snapshot, "other-context", "product-z").type, "Pending");
    const nextRequest = { ...request, cursor: "opaque_Next-123" }, next = h.coordinator.load(nextRequest);
    assert.equal(operationalProductSelection(h.coordinator.snapshot, key, "product-z").type, "Pending");
    const secondPage = { items: [...page("a").items].reverse().map((item) => ({ ...item, productId: `${item.productId}-next` })), nextCursor: null };
    h.calls[1].resolve({ ok: true, value: secondPage }); await next;
    assert.deepEqual(h.coordinator.snapshot, { type: "Ready", key: operationalProductRequestKey(nextRequest), value: secondPage });
    assert.equal(operationalProductSelection(h.coordinator.snapshot, operationalProductRequestKey(nextRequest), "product-z").type, "Stale");
  });
  it("selection is pure discovery state and performs no resource GET or mutation", async () => {
    const calls: string[] = [];
    const coordinator = new OperationalProductSelectorCoordinator(new OperationalProductApiClient(async (url, init) => {
      calls.push(`${init?.method} ${url}`); return Response.json({ type: "Success", value: page("a") });
    }), { onChange() {}, onAuthenticationRequired() {} });
    await coordinator.load(request);
    for (const id of ["product-z", "product-a", "foreign", null]) operationalProductSelection(coordinator.snapshot, operationalProductRequestKey(request), id);
    assert.deepEqual(calls, ["GET /api/catalog/operational-products?purpose=Inventory&branchId=a"]);
  });
});
