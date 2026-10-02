import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BranchPricingCoordinator, initialBranchPricingState, validBranchAmountMinor, validBranchCurrencyDraft } from "./branch-pricing.coordinator";
import { branchPricingFixture, branchPricingSlotFixture, branchPricingValueFixture } from "./mock/branch-pricing.fixture";
import type { BranchPricingManagementView, BranchPricingMutationAcknowledgement, BranchPricingPort, BranchPricingResult } from "./branch-pricing.types";

const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const acknowledgement = (field: "Retail" | "Wholesale" | "ReferenceCost", revision = 1): BranchPricingMutationAcknowledgement => ({
  branchId: "branch-main", productId: "product-one", field,
  override: { amountMinor: "1", currency: "USD", revision },
});
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };

describe("Branch pricing coordinator", () => {
  it("accepts only canonical safe minor units and uppercase currencies", () => {
    for (const value of ["0", "1", "1500", String(Number.MAX_SAFE_INTEGER)]) assert.equal(validBranchAmountMinor(value), true);
    for (const value of ["01", "-1", "+1", "1.5", "1e3", " 1", String(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1))]) assert.equal(validBranchAmountMinor(value), false);
    assert.equal(validBranchCurrencyDraft("USD"), true); for (const value of ["usd", "US", "USDX", " U"]) assert.equal(validBranchCurrencyDraft(value), false);
  });

  it("uses each field overrideRevision independently and leaves a sibling available while one write is pending", async () => {
    const retailPending = deferred<BranchPricingResult<BranchPricingMutationAcknowledgement>>(), writes: object[] = [];
    const port: BranchPricingPort = {
      async get() { return { ok: true, value: branchPricingFixture() }; },
      set(_, __, field, command) { writes.push({ field, ...command }); return field === "Retail" ? retailPending.promise
        : Promise.resolve({ ok: true, value: acknowledgement(field, command.expectedRevision + 1) }); },
      async clear() { assert.fail(); },
    };
    const c = new BranchPricingCoordinator(port, "branch-main", "product-one", "prices", callbacks); await c.load();
    c.choose("Retail", "SetOverride", { amountMinor: "10", currency: "USD" }); const retailWrite = c.submit();
    assert.equal(c.snapshot.fields.Retail?.pending, true); assert.equal(c.snapshot.activeField, null); assert.equal(c.snapshot.detail.type, "Ready");
    c.choose("Wholesale", "SetOverride", { amountMinor: "20", currency: "USD" });
    assert.equal(c.snapshot.activeField, "Wholesale"); c.cancel();
    retailPending.resolve({ ok: true, value: acknowledgement("Retail", 4) }); await retailWrite;
    assert.deepEqual(writes, [{ field: "Retail", amountMinor: "10", currency: "USD", expectedRevision: 3 }]);
    c.choose("Wholesale", "SetOverride", { amountMinor: "20", currency: "USD" }); await c.submit();
    assert.deepEqual(writes[1], { field: "Wholesale", amountMinor: "20", currency: "USD", expectedRevision: 0 });
  });

  it("does not invalidate a reviewed sibling intent when another field revision changes", async () => {
    let reads = 0; const writes: object[] = [];
    const c = new BranchPricingCoordinator({
      async get() { reads++; return { ok: true, value: branchPricingFixture({ prices: {
        Retail: branchPricingSlotFixture({ overrideRevision: 3 }),
        Wholesale: branchPricingSlotFixture({ overrideRevision: reads === 1 ? 4 : 9 }),
      } }) }; },
      async set(_, __, field, command) { writes.push({ field, ...command }); return { ok: true, value: acknowledgement(field, command.expectedRevision + 1) }; },
      async clear() { assert.fail(); },
    }, "branch-main", "product-one", "prices", callbacks);
    await c.load(); c.choose("Retail", "SetOverride", { amountMinor: "0", currency: "USD" }); await c.load();
    assert.equal(c.snapshot.fields.Retail?.reviewRequired, false); await c.submit();
    assert.deepEqual(writes, [{ field: "Retail", amountMinor: "0", currency: "USD", expectedRevision: 3 }]);
  });

  it("preserves the same-field draft across conflict, refetches, and requires explicit re-review without replay", async () => {
    let reads = 0; const revisions: number[] = [];
    const c = new BranchPricingCoordinator({
      async get() { reads++; return { ok: true, value: branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ overrideRevision: reads + 2 }) } }) }; },
      async set(_, __, field, command) { revisions.push(command.expectedRevision); return revisions.length === 1
        ? { ok: false, kind: "Conflict" } : { ok: true, value: acknowledgement(field, command.expectedRevision + 1) }; },
      async clear() { assert.fail(); },
    }, "branch-main", "product-one", "prices", callbacks);
    await c.load(); c.choose("Retail", "SetOverride", { amountMinor: "123", currency: "USD" }); await c.submit();
    assert.deepEqual(revisions, [3]); assert.deepEqual(c.snapshot.fields.Retail?.intent,
      { field: "Retail", action: "SetOverride", amountMinor: "123", currency: "USD" });
    assert.equal(c.snapshot.fields.Retail?.reviewRequired, true); await c.submit(); assert.deepEqual(revisions, [3]);
    c.reviewLatest(); await c.submit(); assert.deepEqual(revisions, [3, 4]); assert.equal(reads, 3);
  });

  it("uses authoritative absence revision zero for Reference Cost Set and Clear never fabricates success", async () => {
    const writes: object[] = []; let reads = 0;
    const absent = branchPricingSlotFixture({ base: branchPricingValueFixture({ state: "NotConfigured", value: null }),
      override: branchPricingValueFixture({ state: "NotConfigured", value: null }), overrideRevision: 0, effective: null,
      source: "NotConfigured", allowedActions: ["SetOverride"] });
    const configured = branchPricingSlotFixture({ base: branchPricingValueFixture({ state: "NotConfigured", value: null }),
      override: branchPricingValueFixture({ value: { amountMinor: "0", currency: "USD" } }), overrideRevision: 1,
      effective: { amountMinor: "0", currency: "USD" }, source: "BranchOverride", allowedActions: ["SetOverride", "ClearOverride"] });
    const c = new BranchPricingCoordinator({
      async get() { reads++; return { ok: true, value: branchPricingFixture({ baseProductRevision: undefined, baseReferenceCostRevision: 0,
        prices: { ReferenceCost: reads === 2 ? configured : absent } }) }; },
      async set(_, __, field, command) { writes.push({ field, ...command }); return { ok: true, value: acknowledgement(field) }; },
      async clear(_, __, field, command) { writes.push({ field, ...command }); return { ok: false, kind: "Conflict" }; },
    }, "branch-main", "product-one", "reference-cost", callbacks);
    await c.load(); c.choose("ReferenceCost", "SetOverride", { amountMinor: "0", currency: "USD" }); await c.submit();
    c.choose("ReferenceCost", "ClearOverride"); await c.submit();
    assert.deepEqual(writes, [
      { field: "ReferenceCost", amountMinor: "0", currency: "USD", expectedRevision: 0 },
      { field: "ReferenceCost", expectedRevision: 1 },
    ]);
    assert.equal(c.snapshot.fields.ReferenceCost?.failure, "Conflict"); assert.equal(c.snapshot.fields.ReferenceCost?.reviewRequired, true);
    assert.equal(c.snapshot.detail.type === "Ready" && c.snapshot.detail.value.prices.ReferenceCost?.overrideRevision, 0);
    assert.equal(reads, 3);
  });

  it("releases the field after an accepted write whose authoritative refetch fails", async () => {
    let reads = 0;
    const c = new BranchPricingCoordinator({
      async get() { reads++; return reads === 2 ? { ok: false, kind: "NetworkFailure" }
        : { ok: true, value: branchPricingFixture() }; },
      async set(_, __, field) { return { ok: true, value: acknowledgement(field, 4) }; }, async clear() { assert.fail(); },
    }, "branch-main", "product-one", "prices", callbacks);
    await c.load(); c.choose("Retail", "SetOverride", { amountMinor: "1", currency: "USD" }); await c.submit();
    assert.equal(c.snapshot.detail.type, "Failed"); assert.equal(c.snapshot.fields.Retail?.pending, false); assert.equal(c.snapshot.fields.Retail?.saved, true);
    await c.load(); assert.equal(c.snapshot.detail.type, "Ready"); assert.equal(reads, 3);
  });

  it("clears private state on current 401 and disposal while suppressing stale responses", async () => {
    const first = deferred<BranchPricingResult<BranchPricingManagementView>>(), second = deferred<BranchPricingResult<BranchPricingManagementView>>();
    let calls = 0, expired = 0;
    const c = new BranchPricingCoordinator({ get() { return ++calls === 1 ? first.promise : second.promise; }, async set() { assert.fail(); }, async clear() { assert.fail(); } },
      "branch-main", "product-one", "prices", { onChange() {}, onAuthenticationRequired() { expired++; } });
    const a = c.load(), b = c.load(); second.resolve({ ok: true, value: branchPricingFixture() }); await b;
    first.resolve({ ok: false, kind: "AuthenticationRequired" }); await a; assert.equal(expired, 0); assert.equal(c.snapshot.detail.type, "Ready");
    c.dispose(); assert.deepEqual(c.snapshot, initialBranchPricingState());
  });
});
