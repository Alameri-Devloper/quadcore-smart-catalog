import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WorkspacePricingCoordinator, validAmountMinor, validCurrencyDraft } from "./workspace-pricing.coordinator";
import { workspacePricingFixture, workspacePricingSlotFixture } from "./mock/workspace-pricing.fixture";
import type { WorkspacePricingPort, WorkspacePricingResult, WorkspacePricingManagementView, WorkspacePricingMutationAcknowledgement } from "./workspace-pricing.types";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const acknowledgement = (field: "Retail" | "Wholesale" | "ReferenceCost"): WorkspacePricingMutationAcknowledgement => ({ productId: "product-one", field });
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

describe("Workspace pricing coordinator", () => {
  it("accepts only canonical safe integer minor units and uppercase currency drafts", () => {
    for (const value of ["0", "1", "1500", String(Number.MAX_SAFE_INTEGER)]) assert.equal(validAmountMinor(value), true);
    for (const value of ["01", "-1", "+1", "1.5", "1e3", " 1", "1 ", String(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1))]) assert.equal(validAmountMinor(value), false);
    assert.equal(validCurrencyDraft("USD"), true); for (const value of ["usd", "US", "USDX", " U"]) assert.equal(validCurrencyDraft(value), false);
  });

  it("uses the shared productRevision, disables both price editors, and refetches authoritatively after Set/Clear", async () => {
    const pending = deferred<WorkspacePricingResult<WorkspacePricingMutationAcknowledgement>>();
    const writes: object[] = []; let reads = 0;
    const port: WorkspacePricingPort = {
      async get() { reads++; return { ok: true, value: workspacePricingFixture({ productRevision: reads === 1 ? 7 : 8 }) }; },
      set(_, field, command) { writes.push({ field, ...command }); return pending.promise; },
      async clear(_, field, command) { writes.push({ field, ...command }); return { ok: true, value: acknowledgement(field) }; },
    };
    const c = new WorkspacePricingCoordinator(port, "product-one", "prices", callbacks); await c.load();
    c.choose("Retail", "Set", { amountMinor: "0", currency: "USD" }); const writing = c.submit();
    assert.equal(c.snapshot.pendingField, "Retail"); assert.equal(c.snapshot.detail.type, "Loading");
    c.choose("Wholesale", "Clear"); await c.submit(); assert.equal(writes.length, 1);
    pending.resolve({ ok: true, value: acknowledgement("Retail") }); await writing;
    assert.deepEqual(writes[0], { field: "Retail", amountMinor: "0", currency: "USD", expectedRevision: 7 }); assert.equal(reads, 2);
    c.choose("Wholesale", "Clear"); await c.submit(); assert.deepEqual(writes[1], { field: "Wholesale", expectedRevision: 8 }); assert.equal(reads, 3);
    assert.equal(c.snapshot.savedField, "Wholesale"); assert.equal(c.snapshot.intent, null);
  });

  it("keeps Reference Cost revision independent, including authoritative absence revision zero", async () => {
    const writes: object[] = []; let reads = 0;
    const absent = { state: "NotConfigured" as const, value: null, allowedActions: ["Set", "Clear"] as const, referenceCostRevision: 0 };
    const port: WorkspacePricingPort = {
      async get() { reads++; return { ok: true, value: workspacePricingFixture({ productRevision: 99, retail: undefined, wholesale: undefined, referenceCost: absent }) }; },
      async set(_, field, command) { writes.push({ field, ...command }); return { ok: true, value: acknowledgement(field) }; },
      async clear() { assert.fail(); },
    };
    const c = new WorkspacePricingCoordinator(port, "product-one", "reference-cost", callbacks); await c.load();
    c.choose("ReferenceCost", "Set", { amountMinor: "0", currency: "USD" }); await c.submit();
    assert.deepEqual(writes, [{ field: "ReferenceCost", amountMinor: "0", currency: "USD", expectedRevision: 0 }]); assert.equal(reads, 2);
    assert.equal(c.snapshot.detail.type === "Ready" && "retail" in c.snapshot.detail.value, false);
  });

  it("preserves a safe draft across 409, discards the stale token, refetches, and requires explicit review without replay", async () => {
    let reads = 0; const revisions: number[] = [];
    const c = new WorkspacePricingCoordinator({
      async get() { return { ok: true, value: workspacePricingFixture({ productRevision: ++reads + 6 }) }; },
      async set(_, field, command) { revisions.push(command.expectedRevision); return revisions.length === 1
        ? { ok: false, kind: "Conflict" } : { ok: true, value: acknowledgement(field) }; }, async clear() { assert.fail(); },
    }, "product-one", "prices", callbacks);
    await c.load(); c.choose("Retail", "Set", { amountMinor: "123", currency: "USD" }); await c.submit();
    assert.deepEqual(revisions, [7]); assert.deepEqual(c.snapshot.intent, { field: "Retail", action: "Set", amountMinor: "123", currency: "USD" });
    assert.equal(c.snapshot.reviewRequired, true); await c.submit(); assert.deepEqual(revisions, [7]);
    c.reviewLatest(); await c.submit(); assert.deepEqual(revisions, [7, 8]); assert.equal(reads, 3);
  });

  it("preserves omission, refuses synthetic slots/actions, and isolates prices from Reference Cost", async () => {
    let writes = 0;
    const retailOnly = workspacePricingFixture({ wholesale: undefined, referenceCost: { ...workspacePricingSlotFixture(), referenceCostRevision: 3 } });
    const port: WorkspacePricingPort = { async get() { return { ok: true, value: retailOnly }; }, async set() { writes++; return { ok: true, value: acknowledgement("Retail") }; }, async clear() { writes++; return { ok: true, value: acknowledgement("Retail") }; } };
    const prices = new WorkspacePricingCoordinator(port, "product-one", "prices", callbacks); await prices.load();
    assert.equal(prices.snapshot.detail.type === "Ready" && "wholesale" in prices.snapshot.detail.value, false);
    assert.equal(prices.snapshot.detail.type === "Ready" && "referenceCost" in prices.snapshot.detail.value, false);
    prices.choose("Wholesale", "Set", { amountMinor: "1", currency: "USD" }); prices.choose("ReferenceCost", "Clear"); await prices.submit(); assert.equal(writes, 0);
  });

  it("clears private state on current 401/disposal and suppresses stale and late responses", async () => {
    const first = deferred<WorkspacePricingResult<WorkspacePricingManagementView>>(), second = deferred<WorkspacePricingResult<WorkspacePricingManagementView>>();
    let calls = 0, expired = 0, signal: AbortSignal | undefined;
    const port: WorkspacePricingPort = { get(_, incoming) { signal = incoming; return ++calls === 1 ? first.promise : second.promise; }, async set() { assert.fail(); }, async clear() { assert.fail(); } };
    const c = new WorkspacePricingCoordinator(port, "product-one", "prices", { onChange() {}, onAuthenticationRequired() { expired++; } });
    const a = c.load(), b = c.load(); second.resolve({ ok: true, value: workspacePricingFixture() }); await b;
    first.resolve({ ok: false, kind: "AuthenticationRequired" }); await a; assert.equal(expired, 0); assert.equal(c.snapshot.detail.type, "Ready");
    c.dispose(); assert.equal(signal?.aborted, true); assert.deepEqual(c.snapshot, { detail: { type: "Idle" }, intent: null, pendingField: null,
      reviewRequired: false, failure: null, validation: null, savedField: null });
  });

  it("refetches and removes mutation authority after ProductArchived without automatic retry", async () => {
    let writes = 0, stale = 0, reads = 0;
    const c = new WorkspacePricingCoordinator({ async get() { reads++; return { ok: true, value: workspacePricingFixture({
      retail: workspacePricingSlotFixture({ allowedActions: reads === 1 ? ["Set", "Clear"] : [] }) }) }; },
      async set() { writes++; return { ok: false, kind: "ProductArchived" }; }, async clear() { assert.fail(); } }, "product-one", "prices",
    { ...callbacks, onProductStale() { stale++; } });
    await c.load(); c.choose("Retail", "Set", { amountMinor: "10", currency: "USD" }); await c.submit(); await c.submit();
    assert.equal(writes, 1); assert.equal(stale, 1); assert.equal(c.snapshot.reviewRequired, true); assert.equal(c.snapshot.detail.type, "Ready");
  });
});
