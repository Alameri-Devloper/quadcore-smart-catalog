import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ListingCoordinator } from "./listing.coordinator";
import type { ListingPort, ListingResult, ListingView } from "./listing.types";
import { listingFixture, listingWriteFixture } from "./mock/listing.fixture";
const resource = { branchId: "branch-main", productId: "product-one" };
const callbacks = { onChange() {}, onAuthenticationRequired() { assert.fail("Unexpected expiry"); } };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
describe("Listing coordinator", () => {
  it("uses GET revision 0 for confirmed absence, gates duplicate writes and renders only refetched state", async () => {
    const pending = deferred<ListingResult<ReturnType<typeof listingWriteFixture>>>(); let reads = 0, writes = 0;
    const port: ListingPort = { async get() { return { ok: true, value: ++reads === 1 ? listingFixture({ listingStatus: "NotConfigured", revision: 0, updatedAt: null }) : listingFixture({ revision: 9, allowedActions: [] }) }; },
      async set(_, command) { writes++; assert.deepEqual(command, { listingStatus: "Listed", expectedRevision: 0 }); return pending.promise; } };
    const c = new ListingCoordinator(port, resource, callbacks); await c.load(); c.choose("SetListed");
    const submit = c.submit(); await c.submit(); await c.load(); assert.equal(writes, 1); assert.equal(reads, 1);
    pending.resolve({ ok: true, value: listingWriteFixture({ listingStatus: "Listed", revision: 8 }) }); await submit;
    assert.equal(reads, 2); assert.deepEqual(c.snapshot.detail, { type: "Ready", value: listingFixture({ revision: 9, allowedActions: [] }) });
    assert.equal(c.snapshot.saved, true); assert.equal(c.snapshot.intent, null);
  });
  it("retains conflict intent, invalidates stale revision and requires deliberate review and submit", async () => {
    let reads = 0; const revisions: number[] = [];
    const c = new ListingCoordinator({ async get() { return { ok: true, value: listingFixture({ revision: ++reads + 1 }) }; },
      async set(_, command) { revisions.push(command.expectedRevision); return revisions.length === 1 ? { ok: false, kind: "Conflict" } : { ok: true, value: listingWriteFixture() }; } }, resource, callbacks);
    await c.load(); c.choose("SetUnlisted"); await c.submit();
    assert.equal(c.snapshot.intent, "SetUnlisted"); assert.equal(c.snapshot.reviewRequired, true); assert.equal(c.snapshot.failure, "Conflict");
    c.choose("SetListed"); await c.submit(); assert.deepEqual(revisions, [2]); assert.equal(c.snapshot.intent, "SetUnlisted");
    c.reviewLatest(); await c.submit(); assert.deepEqual(revisions, [2, 3]);
  });
  it("cannot submit omitted actions or inspect-only actions and rechecks actions after conflict", async () => {
    let reads = 0, writes = 0;
    const port: ListingPort = { async get() { return { ok: true, value: listingFixture({ allowedActions: ++reads === 1 ? ["SetListed"] : [] }) }; },
      async set() { writes++; return { ok: false, kind: "Conflict" }; } };
    const c = new ListingCoordinator(port, resource, callbacks); await c.load(); c.choose("SetUnlisted"); await c.submit(); assert.equal(writes, 0);
    c.choose("SetListed"); await c.submit(); c.reviewLatest(); await c.submit(); assert.equal(writes, 1);
    const inspect = new ListingCoordinator(port, resource, callbacks, true); await inspect.load(); inspect.choose("SetListed"); await inspect.submit(); assert.equal(writes, 1);
  });
  it("ignores superseded and disposed responses including late 401", async () => {
    const first = deferred<ListingResult<ListingView>>(), second = deferred<ListingResult<ListingView>>(); let reads = 0, expired = 0;
    const c = new ListingCoordinator({ get: () => ++reads === 1 ? first.promise : second.promise, async set() { assert.fail(); } }, resource,
      { onChange() {}, onAuthenticationRequired() { expired++; } });
    const a = c.load(), b = c.load(); second.resolve({ ok: true, value: listingFixture() }); await b;
    first.resolve({ ok: false, kind: "AuthenticationRequired" }); await a; assert.equal(expired, 0); assert.equal(c.snapshot.detail.type, "Ready");
    c.dispose(); await c.load(); assert.equal(c.snapshot.detail.type, "Idle");
  });
  it("clears private state and ignores late write/refetch after lifecycle disposal", async () => {
    const pending = deferred<ListingResult<ReturnType<typeof listingWriteFixture>>>(); let reads = 0, expired = 0;
    const c = new ListingCoordinator({ async get() { reads++; return { ok: true, value: listingFixture() }; }, set: () => pending.promise }, resource,
      { onChange() {}, onAuthenticationRequired() { expired++; } });
    await c.load(); c.choose("SetListed"); const write = c.submit(); c.dispose(); pending.resolve({ ok: false, kind: "AuthenticationRequired" }); await write;
    assert.equal(reads, 1); assert.equal(expired, 0); assert.equal(c.snapshot.intent, null); assert.equal(c.snapshot.detail.type, "Idle");
  });
  it("expires once and discards data on a current 401", async () => {
    let expired = 0;
    const c = new ListingCoordinator({ async get() { return { ok: false, kind: "AuthenticationRequired" }; }, async set() { assert.fail(); } }, resource,
      { onChange() {}, onAuthenticationRequired() { expired++; } });
    await c.load(); await c.load(); assert.equal(expired, 1); assert.equal(c.snapshot.detail.type, "Failed"); assert.equal(c.snapshot.intent, null);
  });
  it("aborts a pending GET on resource disposal and never publishes its late private result", async () => {
    const read = deferred<ListingResult<ListingView>>(); let signal: AbortSignal | undefined, changes = 0;
    const c = new ListingCoordinator({ get: (_, incoming) => { signal = incoming; return read.promise; }, async set() { assert.fail(); } }, resource,
      { ...callbacks, onChange() { changes++; } });
    const loading = c.load(); assert.equal(changes, 1); c.dispose(); assert.equal(signal?.aborted, true);
    read.resolve({ ok: true, value: listingFixture() }); await loading; assert.equal(changes, 1); assert.equal(c.snapshot.detail.type, "Idle");
  });
  it("never replays a successful or uncertain write when refetch fails", async () => {
    for (const success of [true, false]) {
      let reads = 0, writes = 0;
      const c = new ListingCoordinator({ async get() { return ++reads === 1 ? { ok: true, value: listingFixture() } : { ok: false, kind: "NetworkFailure" }; },
        async set() { writes++; return success ? { ok: true, value: listingWriteFixture() } : { ok: false, kind: "NetworkFailure" }; } }, resource, callbacks);
      await c.load(); c.choose("SetUnlisted"); await c.submit(); await c.submit(); await c.load(); assert.equal(writes, 1); assert.equal(c.snapshot.detail.type, "Failed");
    }
  });
  it("refreshes lifecycle discovery after inactive rejection without granting further actions", async () => {
    let stale = 0, reads = 0;
    const c = new ListingCoordinator({ async get() { return { ok: true, value: listingFixture({ allowedActions: ++reads === 1 ? ["SetListed"] : [] }) }; },
      async set() { return { ok: false, kind: "BranchInactive" }; } }, resource, { ...callbacks, onResourceStale() { stale++; } });
    await c.load(); c.choose("SetListed"); await c.submit(); assert.equal(stale, 1); assert.equal(c.snapshot.reviewRequired, true);
    assert.deepEqual(c.snapshot.detail.type === "Ready" && c.snapshot.detail.value.allowedActions, []);
  });
});
