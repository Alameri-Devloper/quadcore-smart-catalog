import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalBranchFixture as fixture } from "./mock/operational-branch.fixture";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { freshOperationalBranchEligible, mountOperationalBranchSelector, operationalBranchSelection, OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import type { OperationalBranchPort, OperationalBranchResult, OperationalBranchState } from "./operational-branch-selector.types";

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
const setup = (port: OperationalBranchPort) => {
  let expired = 0; const states: OperationalBranchState[] = [];
  const callbacks = { onChange: (state: OperationalBranchState) => states.push(state), onAuthenticationRequired: () => { expired++; } };
  const coordinator = new OperationalBranchSelectorCoordinator(port, callbacks);
  return { coordinator, states, callbacks, expired: () => expired };
};

describe("A6 purpose-bound coordinator and fresh-work selection", () => {
  it("distinguishes authorized empty, all-inactive and mixed options while retaining exact rows", async () => {
    for (const [options, availability] of [
      [[], "AuthorizedEmpty"], [[fixture({ status: "Inactive" })], "AllInactive"],
      [[fixture({ status: "Inactive", branchId: "z" }), fixture({ branchId: "a" })], "Available"],
    ] as const) {
      const run = setup({ list: async () => ({ ok: true, value: options }) }); await run.coordinator.load("Inventory");
      assert.deepEqual(run.states[0], { type: "Loading", purpose: "Inventory" });
      assert.deepEqual(run.coordinator.snapshot, { type: "Ready", purpose: "Inventory", options, availability });
    }
  });
  for (const kind of ["Forbidden", "ForbiddenForRestrictedSession", "InvalidInput", "BranchServiceUnavailable", "NetworkFailure", "MalformedResponse", "UnexpectedResponse"] as const) {
    it(`retains ${kind} as a failure without empty options or fallback`, async () => {
      let requests = 0;
      const run = setup({ list: async () => { requests++; return { ok: false, kind }; } }); await run.coordinator.load("Listing");
      assert.deepEqual(run.coordinator.snapshot, { type: "Failed", purpose: "Listing", kind }); assert.equal(requests, 1);
    });
  }
  it("aborts old purpose, clears its options immediately and ignores late success", async () => {
    const old = deferred<OperationalBranchResult>(); let oldSignal: AbortSignal | undefined;
    const run = setup({ list: async (purpose, signal) => {
      if (purpose === "Listing") { oldSignal = signal; return old.promise; }
      return { ok: true, value: [fixture({ branchId: "transfer-only" })] };
    } });
    const first = run.coordinator.load("Listing"), second = run.coordinator.load("Transfer");
    assert.ok(oldSignal?.aborted); assert.deepEqual(run.coordinator.snapshot, { type: "Loading", purpose: "Transfer" });
    assert.deepEqual(operationalBranchSelection(run.coordinator.snapshot, "Transfer", "branch-main"), { type: "Pending" });
    await second; old.resolve({ ok: true, value: [fixture()] }); await first;
    assert.deepEqual(run.coordinator.snapshot, { type: "Ready", purpose: "Transfer", options: [fixture({ branchId: "transfer-only" })], availability: "Available" });
    assert.equal(operationalBranchSelection(run.coordinator.snapshot, "Transfer", "branch-main").type, "StaleSelectedBranch");
  });
  it("late old-purpose failures and 401 cannot replace options or redirect", async () => {
    for (const kind of ["Forbidden", "BranchServiceUnavailable", "AuthenticationRequired"] as const) {
      const old = deferred<OperationalBranchResult>();
      const run = setup({ list: async (purpose) => purpose === "Inventory" ? old.promise : { ok: true, value: [] } });
      const first = run.coordinator.load("Inventory"); await run.coordinator.load("BranchPricing");
      old.resolve({ ok: false, kind }); await first;
      assert.equal(run.coordinator.snapshot.type, "Ready"); assert.equal(run.expired(), 0);
    }
  });
  it("supersedes same-purpose retries even when transport ignores AbortSignal", async () => {
    const old = deferred<OperationalBranchResult>(); let count = 0;
    const run = setup({ list: async () => ++count === 1 ? old.promise : { ok: true, value: [] } });
    const first = run.coordinator.load("Listing"); await run.coordinator.load("Listing");
    old.resolve({ ok: false, kind: "AuthenticationRequired" }); await first;
    assert.deepEqual(run.coordinator.snapshot, { type: "Ready", purpose: "Listing", options: [], availability: "AuthorizedEmpty" }); assert.equal(run.expired(), 0);
  });
  it("clears prior ready options while a different purpose loads", async () => {
    const pending = deferred<OperationalBranchResult>();
    const run = setup({ list: async (purpose) => purpose === "Listing" ? { ok: true, value: [fixture()] } : pending.promise });
    await run.coordinator.load("Listing"); const loading = run.coordinator.load("BranchReferenceCost");
    assert.equal(operationalBranchSelection(run.coordinator.snapshot, "BranchReferenceCost", "branch-main").type, "Pending");
    assert.equal("options" in run.coordinator.snapshot, false); pending.resolve({ ok: true, value: [] }); await loading;
  });
  it("disposal aborts and suppresses late success/failure/401 and any subsequent load", async () => {
    for (const result of [{ ok: true, value: [fixture()] }, { ok: false, kind: "Forbidden" }, { ok: false, kind: "AuthenticationRequired" }] as const) {
      const pending = deferred<OperationalBranchResult>(); let signal: AbortSignal | undefined, requests = 0;
      const run = setup({ list: async (_purpose, input) => { signal = input; requests++; return pending.promise; } });
      const loading = run.coordinator.load("Inventory"); run.coordinator.dispose(); const count = run.states.length;
      pending.resolve(result); await loading; await run.coordinator.load("Listing");
      assert.ok(signal?.aborted); assert.equal(run.states.length, count); assert.equal(run.expired(), 0); assert.equal(requests, 1); assert.deepEqual(run.coordinator.snapshot, { type: "Idle" });
    }
  });
  it("current 401 clears options, invokes existing expiry once, and prevents further requests", async () => {
    let calls = 0;
    const run = setup({ list: async () => ++calls === 1 ? { ok: true, value: [fixture()] } : { ok: false, kind: "AuthenticationRequired" } });
    await run.coordinator.load("Listing"); await run.coordinator.load("Inventory"); await run.coordinator.load("Transfer");
    assert.deepEqual(run.coordinator.snapshot, { type: "Failed", purpose: "Inventory", kind: "AuthenticationRequired" }); assert.equal(run.expired(), 1); assert.equal(calls, 2);
  });
  it("only a returned Active branch is selected; stale, inactive, missing and pending remain distinct", () => {
    const inactive = Object.freeze(fixture({ branchId: "inactive", status: "Inactive" }));
    const options = Object.freeze([fixture(), inactive]);
    const state: OperationalBranchState = { type: "Ready", purpose: "Listing", options, availability: "Available" };
    assert.deepEqual(operationalBranchSelection(state, "Listing", null), { type: "None" });
    assert.equal(operationalBranchSelection(state, "Listing", "branch-main").type, "Selected");
    assert.equal(operationalBranchSelection(state, "Listing", "other").type, "StaleSelectedBranch");
    assert.equal(operationalBranchSelection(state, "Listing", "inactive").type, "Inactive");
    assert.equal(operationalBranchSelection(state, "Transfer", "branch-main").type, "Pending");
    assert.equal(operationalBranchSelection({ type: "Loading", purpose: "Listing" }, "Listing", "branch-main").type, "Pending");
    assert.equal(freshOperationalBranchEligible(inactive), false); assert.deepEqual(state.options, options); assert.equal(inactive.status, "Inactive");
    assert.equal(state.options.length, 2);
  });
  it("refresh revalidates a previously selected branch after removal or deactivation", async () => {
    let count = 0;
    const run = setup({ list: async () => ({ ok: true, value: ++count === 1 ? [fixture()] : count === 2 ? [fixture({ status: "Inactive" })] : [] }) });
    await run.coordinator.load("Inventory"); assert.equal(operationalBranchSelection(run.coordinator.snapshot, "Inventory", "branch-main").type, "Selected");
    await run.coordinator.load("Inventory"); assert.equal(operationalBranchSelection(run.coordinator.snapshot, "Inventory", "branch-main").type, "Inactive");
    await run.coordinator.load("Inventory"); assert.equal(operationalBranchSelection(run.coordinator.snapshot, "Inventory", "branch-main").type, "StaleSelectedBranch");
  });
  it("deferred mount starts only the surviving lifecycle", async () => {
    const purposes: string[] = [];
    const port: OperationalBranchPort = { list: async (purpose) => { purposes.push(purpose); return { ok: true, value: [] }; } };
    const run = setup(port);
    const probe = mountOperationalBranchSelector(port, "Listing", run.callbacks); probe.dispose();
    const live = mountOperationalBranchSelector(port, "Transfer", run.callbacks);
    await Promise.resolve(); await Promise.resolve();
    assert.deepEqual(purposes, ["Transfer"]); assert.equal(live.snapshot.type, "Ready"); live.dispose();
  });
  it("uses only A6 when running the real strict client, including denied General-management-independent Listing", async () => {
    const urls: string[] = [];
    const run = setup(new OperationalBranchApiClient(async (path) => { urls.push(String(path)); return Response.json({ type: "Success", value: [fixture()] }); }));
    await run.coordinator.load("Listing"); await run.coordinator.load("Transfer");
    assert.deepEqual(urls, ["/api/branches/operational?purpose=Listing", "/api/branches/operational?purpose=Transfer"]);
  });
});
