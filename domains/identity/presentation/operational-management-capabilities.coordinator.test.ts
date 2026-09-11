import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasOperationalManagementCapability,
  operationalManagementNavigationStatus,
  operationalManagementSections,
  OperationalManagementCapabilitiesCoordinator,
  mountOperationalManagementCapabilities,
} from "./operational-management-capabilities.coordinator";
import type { OperationalManagementCapabilityResult, OperationalManagementCapabilityState } from "./operational-management-capabilities.types";
import { operationalManagementCapabilitiesFixture as fixture } from "./mock/operational-management-capabilities.fixture";

const deferred = () => {
  let resolve!: (result: OperationalManagementCapabilityResult) => void;
  const promise = new Promise<OperationalManagementCapabilityResult>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("A1 semantic navigation composition", () => {
  it("keeps all-false capabilities unavailable even with an extra Owner role", () => {
    const value = { ...fixture(), role: "Owner" };
    assert.deepEqual(operationalManagementSections(value), []);
    assert.equal(hasOperationalManagementCapability(value), false);
    assert.equal(operationalManagementNavigationStatus({ type: "Ready", value }), "Hidden");
  });

  for (const [group, section] of [
    ["branches", "Branches"], ["listing", "Branches"], ["inventory", "Inventory"],
    ["pricing", "Pricing"], ["referenceCost", "Pricing"],
  ] as const) {
    for (const key of Object.keys(fixture()[group])) {
      it(`uses ${group}.${key} alone for ${section} and the Operations link`, () => {
        const value = fixture();
        Object.assign(value[group], { [key]: true });
        assert.deepEqual(operationalManagementSections(value), [section]);
        assert.equal(hasOperationalManagementCapability(value), true);
        assert.equal(operationalManagementNavigationStatus({ type: "Ready", value }), "Available");
      });
    }
  }

  it("returns each relevant section once in stable primary navigation order", () => {
    const value = fixture();
    value.branches.canView = value.listing.canManage = true;
    value.inventory.canTransfer = true;
    value.pricing.canView = value.referenceCost.canView = true;
    assert.deepEqual(operationalManagementSections(value), ["Branches", "Inventory", "Pricing"]);
  });

  it("does not advertise Operations while idle, loading or failed", () => {
    const states: OperationalManagementCapabilityState[] = [
      { type: "Idle" }, { type: "Loading" },
      { type: "Failed", kind: "ForbiddenForRestrictedSession" },
      { type: "Failed", kind: "OperationalManagementCapabilityServiceUnavailable" },
    ];
    for (const state of states) assert.equal(operationalManagementNavigationStatus(state), "Hidden");
  });
});

describe("A1 provider effect lifecycle", () => {
  it("loads once through setup/cleanup/setup, shares state and refreshes deliberately", async () => {
    let calls = 0;
    const states: OperationalManagementCapabilityState[] = [];
    const port = { load: async (): Promise<OperationalManagementCapabilityResult> => {
      calls++;
      return { ok: true, value: fixture() };
    } };
    const events = { onChange: (state: OperationalManagementCapabilityState) => states.push(state), onAuthenticationRequired: () => assert.fail() };
    const probe = mountOperationalManagementCapabilities(port, events);
    probe.dispose();
    const mounted = mountOperationalManagementCapabilities(port, events);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.deepEqual(states.map(({ type }) => type), ["Loading", "Ready"]);
    assert.equal(mounted.getState(), states.at(-1));
    await mounted.refresh();
    assert.equal(calls, 2);
    mounted.dispose();
  });

  it("replaces an authenticated lifecycle without accepting an old success or expired response", async () => {
    for (const stale of [{ ok: true, value: fixture() }, { ok: false, kind: "AuthenticationRequired" }] as const) {
      const oldRequest = deferred();
      let oldUpdates = 0, currentRedirects = 0;
      const old = mountOperationalManagementCapabilities({ load: () => oldRequest.promise }, {
        onChange: () => { oldUpdates++; }, onAuthenticationRequired: () => assert.fail("old session redirected"),
      });
      await Promise.resolve();
      old.dispose();
      const current = mountOperationalManagementCapabilities({ load: async () => ({ ok: false, kind: "AuthenticationRequired" }) }, {
        onChange: () => undefined, onAuthenticationRequired: () => { currentRedirects++; },
      });
      oldRequest.resolve(stale);
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(oldUpdates, 1);
      assert.equal(currentRedirects, 1);
      assert.deepEqual(current.getState(), { type: "Failed", kind: "AuthenticationRequired" });
      current.dispose();
    }
  });
});

describe("A1 authenticated lifecycle coordinator", () => {
  it("loads once for concurrent consumers and distinguishes loading from empty success", async () => {
    const request = deferred();
    let calls = 0;
    const states: OperationalManagementCapabilityState[] = [];
    const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: () => { calls++; return request.promise; } }, {
      onChange: (state) => states.push(state), onAuthenticationRequired: () => assert.fail("unexpected redirect"),
    });
    assert.deepEqual(coordinator.getState(), { type: "Idle" });
    const first = coordinator.load();
    assert.equal(coordinator.load(), first);
    assert.deepEqual(states, [{ type: "Loading" }]);
    request.resolve({ ok: true, value: fixture() });
    await first;
    assert.equal(calls, 1);
    assert.deepEqual(coordinator.getState(), { type: "Ready", value: fixture() });
  });

  it("delegates current 401 once to the caller's existing expiry behavior", async () => {
    let redirects = 0;
    const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: async () => ({ ok: false, kind: "AuthenticationRequired" }) }, {
      onChange: () => undefined, onAuthenticationRequired: () => { redirects++; },
    });
    await Promise.all([coordinator.load(), coordinator.load()]);
    assert.equal(redirects, 1);
    assert.deepEqual(coordinator.getState(), { type: "Failed", kind: "AuthenticationRequired" });
  });

  it("keeps restricted, forbidden, invalid and unavailable failures distinct without redirect or empty fallback", async () => {
    for (const kind of ["ForbiddenForRestrictedSession", "Forbidden", "InvalidQuery", "OperationalManagementCapabilityServiceUnavailable", "Unavailable"] as const) {
      const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: async () => ({ ok: false, kind }) }, {
        onChange: () => undefined, onAuthenticationRequired: () => assert.fail("unexpected redirect"),
      });
      await coordinator.load();
      assert.deepEqual(coordinator.getState(), { type: "Failed", kind });
    }
  });

  it("contains a throwing port and permits an explicit retry", async () => {
    let calls = 0;
    const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: async () => {
      if (++calls === 1) throw new Error("private");
      return { ok: true, value: fixture() };
    } }, { onChange: () => undefined, onAuthenticationRequired: () => assert.fail() });
    await coordinator.load();
    assert.deepEqual(coordinator.getState(), { type: "Failed", kind: "Unavailable" });
    await coordinator.load();
    assert.equal(coordinator.getState().type, "Ready");
  });

  for (const late of [{ ok: true, value: fixture() }, { ok: false, kind: "AuthenticationRequired" }] as const) {
    it(`ignores disposed ${late.ok ? "success" : "401"}, aborts and releases state`, async () => {
      const request = deferred();
      let signal: AbortSignal | undefined;
      let changes = 0;
      const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: (input) => { signal = input; return request.promise; } }, {
        onChange: () => { changes++; }, onAuthenticationRequired: () => assert.fail("stale redirect"),
      });
      const pending = coordinator.load();
      coordinator.dispose();
      assert.equal(signal?.aborted, true);
      request.resolve(late);
      await pending;
      await coordinator.load();
      assert.equal(changes, 1);
      assert.deepEqual(coordinator.getState(), { type: "Idle" });
    });
  }

  it("ignores superseded success and 401 even when the transport ignores abort", async () => {
    for (const late of [{ ok: true, value: fixture() }, { ok: false, kind: "AuthenticationRequired" }] as const) {
      const old = deferred(), current = deferred();
      let calls = 0;
      const coordinator = new OperationalManagementCapabilitiesCoordinator({ load: () => ++calls === 1 ? old.promise : current.promise }, {
        onChange: () => undefined, onAuthenticationRequired: () => assert.fail("stale redirect"),
      });
      const first = coordinator.load(), second = coordinator.refresh();
      const value = fixture(); value.inventory.canReceive = true;
      current.resolve({ ok: true, value });
      await second;
      old.resolve(late);
      await first;
      assert.deepEqual(coordinator.getState(), { type: "Ready", value });
    }
  });

  it("does not share successful state or in-flight requests across authenticated lifecycles", async () => {
    let calls = 0;
    const port = { load: async (): Promise<OperationalManagementCapabilityResult> => { calls++; return { ok: true, value: fixture() }; } };
    const events = { onChange: () => undefined, onAuthenticationRequired: () => undefined };
    const first = new OperationalManagementCapabilitiesCoordinator(port, events);
    await first.load(); first.dispose();
    const second = new OperationalManagementCapabilitiesCoordinator(port, events);
    assert.deepEqual(second.getState(), { type: "Idle" });
    await second.load();
    assert.equal(calls, 2);
  });
});
