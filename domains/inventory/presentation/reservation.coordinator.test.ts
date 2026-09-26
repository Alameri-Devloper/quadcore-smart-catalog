import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quantityFixture } from "./mock/inventory.fixture";
import { reservationFixture, reservationMutationFixture, reservationPageFixture } from "./mock/reservation.fixture";
import { ReservationCoordinator } from "./reservation.coordinator";
import type { ReservationMutationView, ReservationNavigation, ReservationPort, ReservationQuantityRequest, ReservationResult, ReserveRequest } from "./reservation.types";

const resource = { branchId: "branch-main", productId: "product-one" };
const initial = { reservationCursor: null, reservationId: "reservation-one" };
const ids = () => { let value = 0; return { randomUUID: () => `operation-${String(++value).padStart(4, "0")}` }; };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const port = (overrides: Partial<ReservationPort> = {}): ReservationPort => ({
  async list() { return { ok: true, value: reservationPageFixture() }; }, async detail() { return { ok: true, value: reservationFixture() }; },
  async reserve(_, command) { return { ok: true, value: reservationMutationFixture({ operationId: command.operationId }) }; },
  async release(_, command) { return { ok: true, value: reservationMutationFixture({ operationId: command.operationId, reservationStatus: "Released", remainingQuantity: "0" }) }; },
  async fulfill(_, command) { return { ok: true, value: reservationMutationFixture({ operationId: command.operationId, reservationStatus: "Fulfilled", remainingQuantity: "0" }) }; },
  ...overrides,
});
const setup = (overrides: Partial<ReservationPort> = {}, navigation: ReservationNavigation = initial, inactive = false) => {
  const navigations: ReservationNavigation[] = [], callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); },
    onNavigationChange(value: ReservationNavigation) { navigations.push(value); }, onResourceStale() {} };
  return { coordinator: new ReservationCoordinator(port(overrides), resource, navigation, true, callbacks, inactive, ids()), navigations };
};

describe("Reservation coordinator", () => {
  it("loads collection/detail, pages with the opaque cursor, and preserves selected detail", async () => {
    const cursors: (string | undefined)[] = [];
    const { coordinator, navigations } = setup({ list: async request => { cursors.push(request.cursor); return { ok: true, value: reservationPageFixture({ nextCursor: cursors.length === 1 ? "cursor-two" : null }) }; } });
    await coordinator.load(); assert.equal(coordinator.snapshot.collection.type, "Ready"); assert.equal(coordinator.snapshot.detail.type, "Ready");
    await coordinator.nextPage(); assert.deepEqual(cursors, [undefined, "cursor-two"]); assert.equal(coordinator.snapshot.navigation.reservationId, "reservation-one");
    assert.equal(coordinator.snapshot.detail.type, "Ready"); assert.deepEqual(navigations.at(-1), { reservationCursor: "cursor-two", reservationId: "reservation-one" });
    await coordinator.nextPage(); assert.equal(cursors.length, 2); coordinator.dispose();
  });
  it("recovers InvalidCursor by clearing only the cursor and reloading page one", async () => {
    const seen: (string | undefined)[] = []; let attempt = 0;
    const { coordinator, navigations } = setup({ list: async request => { seen.push(request.cursor); return ++attempt === 1
      ? { ok: false, kind: "InvalidCursor" } : { ok: true, value: reservationPageFixture({ nextCursor: null }) }; } },
    { reservationCursor: "stale_cursor", reservationId: "reservation-one" });
    await coordinator.load(); assert.deepEqual(seen, ["stale_cursor", undefined]); assert.equal(coordinator.snapshot.cursorReset, true);
    assert.equal(coordinator.snapshot.navigation.reservationId, "reservation-one"); assert.deepEqual(navigations.at(-1), { reservationCursor: null, reservationId: "reservation-one" });
  });
  it("accepts empty pages and clears a safe missing selection without tenant diagnostics", async () => {
    let lists = 0; const { coordinator, navigations } = setup({ list: async () => { lists++; return { ok: true, value: { items: [], nextCursor: null } }; },
      detail: async () => ({ ok: false, kind: "ReservationNotFound" }) });
    await coordinator.load(); assert.equal(coordinator.snapshot.detail.type, "Idle"); assert.equal(coordinator.snapshot.failure, "ReservationNotFound");
    assert.equal(lists, 2); assert.deepEqual(navigations.at(-1), { reservationCursor: null, reservationId: null });
  });
  it("routes Reserve, partial/final Release and Fulfill and refetches authoritative list/detail", async () => {
    for (const operation of ["Reserve", "Release", "Fulfill"] as const) {
      let writes = 0, lists = 0, details = 0, observed: Record<string, unknown> | undefined;
      const mutation = async (_: unknown, command: ReserveRequest | ReservationQuantityRequest) => { writes++; observed = { ...command }; return { ok: true as const,
        value: reservationMutationFixture({ operationId: command.operationId, reservationStatus: operation === "Fulfill" ? "PartiallyFulfilled" : operation === "Release" ? "Active" : "Active", remainingQuantity: "2" }) }; };
      const { coordinator } = setup({ list: async () => ({ ok: true, value: reservationPageFixture({ nextCursor: null, items: lists++ ? [] : [reservationFixture()] }) }),
        detail: async () => ({ ok: true, value: reservationFixture({ remainingQuantity: String(5 - details++) }) }),
        reserve: mutation, release: mutation, fulfill: mutation });
      await coordinator.load(); coordinator.choose(operation); coordinator.updateDraft({ quantity: "2", ...(operation === "Reserve" ? { reasonCode: "ORDER" } : {}) }); coordinator.review(); await coordinator.submit();
      assert.equal(writes, 1); assert.equal(lists, 2); assert.equal(details, 2); assert.equal(observed?.quantity, "2");
      assert.equal(coordinator.snapshot.navigation.reservationCursor, null); assert.equal(coordinator.snapshot.navigation.reservationId, "reservation-one");
      assert.equal(coordinator.snapshot.outcome?.remainingQuantity, "2");
    }
  });
  it("uses A1 only for Reserve and current detail allowedActions exclusively for Release/Fulfill", async () => {
    const noHint = new ReservationCoordinator(port(), resource, initial, false, { onChange() {}, onAuthenticationRequired() {}, onNavigationChange() {} }, false, ids());
    await noHint.load(); noHint.choose("Reserve"); assert.equal(noHint.snapshot.operation, null);
    noHint.choose("Release"); assert.equal(noHint.snapshot.operation, "Release"); noHint.cancel();
    const noActions = new ReservationCoordinator(port({ detail: async () => ({ ok: true, value: reservationFixture({ allowedActions: [] }) }) }), resource, initial, true,
      { onChange() {}, onAuthenticationRequired() {}, onNavigationChange() {} }, false, ids());
    await noActions.load(); noActions.choose("Release"); noActions.choose("Fulfill"); assert.equal(noActions.snapshot.operation, null);
  });
  it("protects duplicate submit and reuses an ID only for explicit identical uncertain retry", async () => {
    const pending = deferred<ReservationResult<ReservationMutationView>>(); let writes = 0;
    const { coordinator } = setup({ reserve: async () => { writes++; return pending.promise; } }, { reservationCursor: null, reservationId: null });
    await coordinator.load(); coordinator.choose("Reserve"); coordinator.updateDraft({ quantity: "1" }); coordinator.review(); const operationId = coordinator.snapshot.review!.operationId;
    const first = coordinator.submit(); await coordinator.submit(); assert.equal(writes, 1); pending.resolve({ ok: false, kind: "NetworkFailure" }); await first;
    assert.equal(coordinator.snapshot.review?.operationId, operationId); assert.equal(coordinator.snapshot.reviewRequired, true); assert.equal(writes, 1);
    coordinator.acknowledgeRetry(); assert.equal(coordinator.snapshot.reviewRequired, false);
  });
  it("generates new IDs for changed quantity, action, reason, Reservation, and decisive failure", async () => {
    const { coordinator } = setup({ reserve: async () => ({ ok: false, kind: "InventoryConflict" }) }, { reservationCursor: null, reservationId: null });
    await coordinator.load(); coordinator.choose("Reserve"); const chosen = coordinator.snapshot.operationId; coordinator.updateDraft({ quantity: "1" }); const quantity = coordinator.snapshot.operationId;
    coordinator.updateDraft({ reasonCode: "FIRST" }); const firstReason = coordinator.snapshot.operationId; coordinator.updateDraft({ reasonCode: "SECOND" }); const secondReason = coordinator.snapshot.operationId;
    assert.notEqual(chosen, quantity); assert.notEqual(quantity, firstReason); assert.notEqual(firstReason, secondReason);
    coordinator.review(); const submitted = coordinator.snapshot.review!.operationId; await coordinator.submit(); assert.notEqual(coordinator.snapshot.review?.operationId, submitted);
    const actions = setup({ detail: async request => ({ ok: true, value: reservationFixture({ reservationId: request.reservationId }) }) }).coordinator;
    await actions.load(); actions.choose("Release"); const releaseId = actions.snapshot.operationId; actions.choose("Fulfill"); const fulfillId = actions.snapshot.operationId;
    assert.notEqual(releaseId, fulfillId); await actions.select("reservation-two"); actions.choose("Release"); assert.notEqual(actions.snapshot.operationId, fulfillId);
  });
  it("retains the minimum Reservation result without generic balance and accepts current-context projections", async () => {
    for (const value of [reservationMutationFixture(), reservationMutationFixture({ availability: "InStock" }), reservationMutationFixture({ balance: quantityFixture() })]) {
      const { coordinator } = setup({ reserve: async (_, command) => ({ ok: true, value: { ...value, operationId: command.operationId } }) }, { reservationCursor: null, reservationId: null });
      await coordinator.load(); coordinator.choose("Reserve"); coordinator.updateDraft({ quantity: "1" }); coordinator.review(); await coordinator.submit();
      assert.equal(coordinator.snapshot.outcome?.reservationId, "reservation-one");
      if (!("balance" in value) && !("availability" in value)) assert.deepEqual(Object.keys(coordinator.snapshot.outcome!).sort(), ["operationId", "remainingQuantity", "reservationId", "reservationStatus", "status"]);
    }
  });
  it("retains and refetches finalized detail while the Reservation leaves the actionable collection", async () => {
    let finalized = false;
    const { coordinator } = setup({
      list: async () => ({ ok: true, value: reservationPageFixture({ items: finalized ? [] : [reservationFixture()], nextCursor: null }) }),
      detail: async () => ({ ok: true, value: finalized ? reservationFixture({ status: "Released", remainingQuantity: "0", allowedActions: [] }) : reservationFixture() }),
      release: async (_, command) => { finalized = true; return { ok: true, value: reservationMutationFixture({ operationId: command.operationId, reservationStatus: "Released", remainingQuantity: "0" }) }; },
    });
    await coordinator.load(); coordinator.choose("Release"); coordinator.updateDraft({ quantity: "5" }); coordinator.review(); await coordinator.submit();
    assert.equal(coordinator.snapshot.collection.type, "Ready"); if (coordinator.snapshot.collection.type === "Ready") assert.deepEqual(coordinator.snapshot.collection.value.items, []);
    assert.equal(coordinator.snapshot.detail.type, "Ready"); if (coordinator.snapshot.detail.type === "Ready") {
      assert.equal(coordinator.snapshot.detail.value.status, "Released"); assert.deepEqual(coordinator.snapshot.detail.value.allowedActions, []);
    }
    assert.equal(coordinator.snapshot.navigation.reservationId, "reservation-one");
  });
  it("preserves review, restarts page one, refetches current state, and never auto-replays stale/conflict failures", async () => {
    for (const kind of ["ReservationNotActive", "BranchInactive", "InventoryConflict", "IdempotencyConflict"] as const) {
      let writes = 0, lists = 0, details = 0, stale = 0;
      const callbacks = { onChange() {}, onAuthenticationRequired() {}, onNavigationChange() {}, onResourceStale() { stale++; } };
      const c = new ReservationCoordinator(port({ list: async () => { lists++; return { ok: true, value: reservationPageFixture() }; },
        detail: async () => { details++; return { ok: true, value: reservationFixture() }; }, release: async () => { writes++; return { ok: false, kind }; } }),
      resource, { reservationCursor: "page-two", reservationId: "reservation-one" }, true, callbacks, false, ids());
      await c.load(); c.choose("Release"); c.updateDraft({ quantity: "1" }); c.review(); await c.submit();
      assert.equal(writes, 1); assert.equal(lists, 2); assert.equal(details, 2); assert.equal(c.snapshot.reviewRequired, true); assert.equal(c.snapshot.navigation.reservationCursor, null);
      assert.equal(stale, kind === "BranchInactive" ? 1 : 0);
    }
  });
  it("blocks fresh Reserve on inactive Branch but retains authoritative detail actions", async () => {
    const { coordinator } = setup({}, initial, true); await coordinator.load(); coordinator.choose("Reserve"); assert.equal(coordinator.snapshot.operation, null);
    coordinator.choose("Fulfill"); assert.equal(coordinator.snapshot.operation, "Fulfill");
  });
  it("aborts collection/detail/write and suppresses late responses on disposal or session expiry", async () => {
    const list = deferred<ReservationResult<ReturnType<typeof reservationPageFixture>>>(), detailResult = deferred<ReservationResult<ReturnType<typeof reservationFixture>>>();
    let listSignal: AbortSignal | undefined, detailSignal: AbortSignal | undefined, changes = 0;
    const c = new ReservationCoordinator(port({ list: (_, signal) => { listSignal = signal; return list.promise; }, detail: (_, signal) => { detailSignal = signal; return detailResult.promise; } }),
      resource, initial, true, { onChange() { changes++; }, onAuthenticationRequired() {}, onNavigationChange() {} }, false, ids());
    const loading = c.load(); c.dispose(); assert.equal(listSignal?.aborted, true); assert.equal(detailSignal?.aborted, true);
    list.resolve({ ok: true, value: reservationPageFixture() }); detailResult.resolve({ ok: true, value: reservationFixture() }); await loading;
    assert.equal(c.snapshot.collection.type, "Idle"); assert.ok(changes >= 1);
    let expired = 0; const expiry = new ReservationCoordinator(port({ list: async () => ({ ok: false, kind: "AuthenticationRequired" }) }), resource,
      { reservationCursor: null, reservationId: null }, true, { onChange() {}, onAuthenticationRequired() { expired++; }, onNavigationChange() {} }, false, ids());
    await expiry.load(); await expiry.load(); assert.equal(expired, 1); assert.equal(expiry.snapshot.collection.type, "Failed");
  });
});
