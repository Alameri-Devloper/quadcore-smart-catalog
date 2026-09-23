import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryCoordinator } from "./inventory.coordinator";
import type { InventoryMutationRequest, InventoryMutationView, InventoryOperation, InventoryPort, InventoryResult } from "./inventory.types";
import { availabilityFixture, mutationFixture, quantityFixture } from "./mock/inventory.fixture";

const resource = { branchId: "branch-main", productId: "product-one" };
const hints = { canViewAvailability: true, canViewQuantities: true, canReceive: true, canIssue: true, canManageDamage: true, canAdjust: true };
const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const ids = () => { let value = 0; return { randomUUID: () => `operation-${String(++value).padStart(4, "0")}` }; };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const port = (overrides: Partial<InventoryPort> = {}): InventoryPort => ({
  async get() { return { ok: true, value: quantityFixture() }; }, async receive() { return { ok: true, value: mutationFixture() }; },
  async issue() { return { ok: true, value: mutationFixture() }; }, async correctIncrease() { return { ok: true, value: mutationFixture() }; },
  async correctDecrease() { return { ok: true, value: mutationFixture() }; }, async markDamaged() { return { ok: true, value: mutationFixture() }; },
  async restoreDamaged() { return { ok: true, value: mutationFixture() }; }, ...overrides,
});
describe("Inventory coordinator", () => {
  it("keeps detailed, availability-only, and forbidden reads distinct without suppressing mutation hints", async () => {
    for (const [result, expected] of [[{ ok: true, value: quantityFixture() }, "Ready"], [{ ok: true, value: availabilityFixture() }, "Ready"],
      [{ ok: false, kind: "Forbidden" }, "ForbiddenRead"]] as const) {
      const c = new InventoryCoordinator(port({ get: async () => result }), resource, hints, callbacks, false, ids()); await c.load();
      assert.equal(c.snapshot.detail.type, expected); c.choose("Receive"); assert.equal(c.snapshot.operation, "Receive");
      if (c.snapshot.detail.type === "Ready") assert.deepEqual(c.snapshot.detail.value, result.ok ? result.value : undefined);
    }
  });
  it("routes all six explicit operations, requires correction reason, and refetches authoritative readable state", async () => {
    const cases: readonly [InventoryOperation, keyof InventoryPort][] = [["Receive", "receive"], ["Issue", "issue"], ["CorrectIncrease", "correctIncrease"],
      ["CorrectDecrease", "correctDecrease"], ["MarkDamaged", "markDamaged"], ["RestoreDamaged", "restoreDamaged"]];
    for (const [operation, method] of cases) {
      let writes = 0, reads = 0, observed: InventoryMutationRequest | undefined;
      const mutation = async (_: typeof resource, command: InventoryMutationRequest) => { writes++; observed = command; return { ok: true as const, value: mutationFixture({ operationId: command.operationId }) }; };
      const c = new InventoryCoordinator(port({ get: async () => ({ ok: true, value: quantityFixture({ revision: ++reads }) }), [method]: mutation }), resource, hints, callbacks, false, ids());
      await c.load(); c.choose(operation); c.updateDraft({ quantity: "2", reasonCode: operation.startsWith("Correct") ? "COUNT" : "" }); c.review(); await c.submit();
      assert.equal(writes, 1, operation); assert.equal(reads, 2, operation); assert.equal(observed?.productId, "product-one"); assert.equal(observed?.quantity, "2");
      assert.equal(c.snapshot.detail.type, "Ready"); assert.equal(c.snapshot.outcome?.status, "Succeeded");
    }
    const correction = new InventoryCoordinator(port(), resource, hints, callbacks, false, ids()); await correction.load(); correction.choose("CorrectIncrease");
    correction.updateDraft({ quantity: "2" }); correction.review(); assert.equal(correction.snapshot.review, null); assert.equal(correction.snapshot.failure, "InvalidInput");
  });
  it("gates duplicate submits and never automatically replays a pending mutation", async () => {
    const pending = deferred<InventoryResult<InventoryMutationView>>(); let writes = 0;
    const c = new InventoryCoordinator(port({ receive: async () => { writes++; return pending.promise; } }), resource, hints, callbacks, false, ids());
    await c.load(); c.choose("Receive"); c.updateDraft({ quantity: "1" }); c.review();
    const first = c.submit(); await c.submit(); await c.load(); assert.equal(writes, 1); pending.resolve({ ok: true, value: mutationFixture({ operationId: c.snapshot.review!.operationId }) }); await first;
    assert.equal(writes, 1); assert.equal(c.snapshot.review, null);
  });
  it("does not force a read after mutation-only success and renders only the returned minimum", async () => {
    let reads = 0;
    const c = new InventoryCoordinator(port({ get: async () => { reads++; return { ok: false, kind: "Forbidden" }; },
      receive: async (_, command) => ({ ok: true, value: mutationFixture({ operationId: command.operationId }) }) }), resource,
      { ...hints, canViewAvailability: false, canViewQuantities: false }, callbacks, false, ids());
    await c.load(); c.choose("Receive"); c.updateDraft({ quantity: "3" }); c.review(); await c.submit();
    assert.equal(reads, 1); assert.equal(c.snapshot.detail.type, "ForbiddenRead"); assert.deepEqual(c.snapshot.outcome && Object.keys(c.snapshot.outcome).sort(), ["operationId", "status"]);
  });
  it("reuses an ID only for deliberate uncertain retry and changes it for a changed or decisively rejected command", async () => {
    const seen: string[] = []; let attempt = 0;
    const c = new InventoryCoordinator(port({ receive: async (_, command) => { seen.push(command.operationId); return ++attempt === 1
      ? { ok: false, kind: "NetworkFailure" } : { ok: true, value: mutationFixture({ operationId: command.operationId }) }; } }), resource, hints, callbacks, false, ids());
    await c.load(); c.choose("Receive"); c.updateDraft({ quantity: "1" }); c.review(); await c.submit(); const uncertainId = c.snapshot.review!.operationId;
    c.acknowledgeRetry(); await c.submit(); assert.deepEqual(seen, [uncertainId, uncertainId]);

    let rejectedId = "";
    const rejected = new InventoryCoordinator(port({ issue: async (_, command) => { rejectedId = command.operationId; return { ok: false, kind: "InsufficientAvailableStock" }; } }), resource, hints, callbacks, false, ids());
    await rejected.load(); rejected.choose("Issue"); rejected.updateDraft({ quantity: "2" }); rejected.review(); await rejected.submit();
    assert.notEqual(rejected.snapshot.review?.operationId, rejectedId); const afterReject = rejected.snapshot.review!.operationId;
    rejected.updateDraft({ quantity: "3" }); rejected.review(); assert.notEqual(rejected.snapshot.review?.operationId, afterReject);
  });
  it("aborts private reads and writes and ignores late responses after disposal or current-session expiry", async () => {
    const read = deferred<InventoryResult<ReturnType<typeof quantityFixture>>>(); let signal: AbortSignal | undefined, changes = 0;
    const c = new InventoryCoordinator(port({ get: (_, incoming) => { signal = incoming; return read.promise; } }), resource, hints,
      { ...callbacks, onChange() { changes++; } }, false, ids());
    const loading = c.load(); c.dispose(); assert.equal(signal?.aborted, true); read.resolve({ ok: true, value: quantityFixture() }); await loading;
    assert.equal(changes, 1); assert.equal(c.snapshot.detail.type, "Idle");
    let expired = 0;
    const expiry = new InventoryCoordinator(port({ get: async () => ({ ok: false, kind: "AuthenticationRequired" }) }), resource, hints,
      { onChange() {}, onAuthenticationRequired() { expired++; } }, false, ids());
    await expiry.load(); await expiry.load(); assert.equal(expired, 1); assert.equal(expiry.snapshot.detail.type, "Failed");
  });
});
