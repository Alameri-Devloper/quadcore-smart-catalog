import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TransferCoordinator } from "./transfer.coordinator";
import type { InventoryReadView, InventoryResult } from "./inventory.types";
import { quantityFixture } from "./mock/inventory.fixture";
import { detailedTransferFixture, transferMutationFixture } from "./mock/transfer.fixture";
import type { TransferCommand, TransferInventoryReadPort, TransferMutationView, TransferPort, TransferResult } from "./transfer.types";

const branches = [
  { branchId: "branch-source", code: "SRC", displayName: "Source", status: "Active" as const },
  { branchId: "branch-destination", code: "DST", displayName: "Destination", status: "Active" as const },
  { branchId: "branch-inactive", code: "OFF", displayName: "Inactive", status: "Inactive" as const },
];
const hints = { canViewAvailability: true, canViewQuantities: true }, noRead = { canViewAvailability: false, canViewQuantities: false };
const ids = () => { let value = 0; return { randomUUID: () => `operation-transfer-${String(++value).padStart(4, "0")}` }; };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const transferPort = (execute: (command: TransferCommand, signal?: AbortSignal) => Promise<TransferResult<TransferMutationView>> = async command =>
  ({ ok: true, value: transferMutationFixture({ operationId: command.operationId }) })): TransferPort => ({ transfer: execute });
const readPort = (execute: (branchId: string, signal?: AbortSignal) => Promise<InventoryResult<InventoryReadView>> = async branchId =>
  ({ ok: true, value: quantityFixture({ branchId }) })): TransferInventoryReadPort => ({ get: (resource, signal) => execute(resource.branchId, signal) });
const callbacks = () => ({ branchRefreshes: 0, productRefreshes: [] as string[], expiries: 0,
  value: { onChange() {}, onAuthenticationRequired() { thisOwner.expiries++; }, onBranchesStale() { thisOwner.branchRefreshes++; },
    onProductStale(kind: "ProductArchived" | "ProductNotFound") { thisOwner.productRefreshes.push(kind); } } });
let thisOwner: ReturnType<typeof callbacks>;
const coordinator = (port = transferPort(), inventory = readPort(), readHints = noRead) => {
  thisOwner = callbacks();
  return new TransferCoordinator(port, inventory, "branch-source", branches, "branch-destination", "product-one", readHints, thisOwner.value, ids());
};
const prepare = (value: TransferCoordinator, reasonCode = "") => { value.updateDraft({ quantity: "2", reasonCode }); value.review(); };

describe("Transfer coordinator", () => {
  it("owns source/destination/Product lifecycle and blocks equal or inactive selections", async () => {
    const value = coordinator(); prepare(value, "REBALANCE_01"); assert.ok(value.snapshot.review);
    await value.sync(branches, "branch-source", "product-one"); assert.equal(value.snapshot.review, null); value.review(); assert.equal(value.snapshot.failure, "InvalidInput");
    await value.sync(branches, "branch-destination", "product-one"); value.updateDraft({ quantity: "3" }); value.review(); const productReview = value.snapshot.review;
    await value.sync(branches, "branch-destination", "product-two"); assert.equal(value.snapshot.destinationBranchId, "branch-destination"); assert.equal(value.snapshot.draft.quantity, ""); assert.equal(value.snapshot.review, null);
    value.updateDraft({ quantity: "1" }); await value.sync(branches, "branch-inactive", "product-two"); value.review(); assert.equal(value.snapshot.failure, "InvalidInput");
    value.changeSource("branch-new", [...branches, { branchId: "branch-new", code: "NEW", displayName: "New", status: "Active" }]);
    assert.equal(value.snapshot.destinationBranchId, null); assert.equal(value.snapshot.productId, null); assert.equal(value.snapshot.outcome, null);
    assert.ok(productReview);
  });
  it("preserves Product and editable draft on destination change but invalidates review and operation ID", async () => {
    const value = coordinator(); prepare(value); const first = value.snapshot.operationId;
    await value.sync([...branches, { branchId: "branch-third", code: "THD", displayName: "Third", status: "Active" }], "branch-third", "product-one");
    assert.equal(value.snapshot.productId, "product-one"); assert.equal(value.snapshot.draft.quantity, "2"); assert.equal(value.snapshot.review, null); assert.equal(value.snapshot.operationId, null);
    value.review(); assert.notEqual(value.snapshot.operationId, first);
  });
  it("submits one exact command, preserves selections/result, clears draft/review, and refetches both readable sides", async () => {
    const commands: TransferCommand[] = [], reads: string[] = [];
    const value = coordinator(transferPort(async command => { commands.push(command); return { ok: true, value: detailedTransferFixture({ operationId: command.operationId }) }; }),
      readPort(async branchId => { reads.push(branchId); return { ok: true, value: quantityFixture({ branchId }) }; }), hints);
    await value.load(); prepare(value, " REBALANCE_01 "); await value.submit();
    assert.deepEqual(commands[0], { operationId: commands[0].operationId, sourceBranchId: "branch-source", destinationBranchId: "branch-destination",
      productId: "product-one", quantity: "2", reasonCode: " REBALANCE_01 " });
    assert.deepEqual(reads, ["branch-source", "branch-destination", "branch-source", "branch-destination"]);
    assert.equal(value.snapshot.sourceBranchId, "branch-source"); assert.equal(value.snapshot.destinationBranchId, "branch-destination");
    assert.equal(value.snapshot.productId, "product-one"); assert.equal(value.snapshot.draft.quantity, ""); assert.equal(value.snapshot.review, null);
    assert.equal(value.snapshot.outcome?.transferId, "transfer-one");
  });
  it("never performs Inventory GETs for a Transfer-only actor", async () => {
    let reads = 0; const value = coordinator(transferPort(), readPort(async () => { reads++; return { ok: false, kind: "Forbidden" }; }), noRead);
    await value.load(); prepare(value); await value.submit(); assert.equal(reads, 0); assert.equal(value.snapshot.outcome?.transferId, "transfer-one");
  });
  it("gates duplicate submits and never automatically replays", async () => {
    const pending = deferred<TransferResult<TransferMutationView>>(); let writes = 0;
    const value = coordinator(transferPort(async () => { writes++; return pending.promise; })); prepare(value);
    const first = value.submit(); await value.submit(); await value.load(); assert.equal(writes, 1);
    pending.resolve({ ok: true, value: transferMutationFixture({ operationId: value.snapshot.review!.operationId }) }); await first; assert.equal(writes, 1);
  });
  it("reuses an ID only for explicit identical uncertain retry and changes it after intent changes or deterministic rejection", async () => {
    const seen: TransferCommand[] = []; let attempt = 0;
    const value = coordinator(transferPort(async command => { seen.push(command); return ++attempt === 1 ? { ok: false, kind: "NetworkFailure" }
      : { ok: true, value: transferMutationFixture({ operationId: command.operationId }) }; }));
    prepare(value); await value.submit(); const uncertainId = value.snapshot.review!.operationId; assert.equal(value.snapshot.reviewRequired, true);
    value.acknowledgeRetry(); await value.submit(); assert.deepEqual(seen.map(command => command.operationId), [uncertainId, uncertainId]);
    prepare(value, "FIRST"); const reasonId = value.snapshot.operationId; value.updateDraft({ reasonCode: "SECOND" }); value.review(); assert.notEqual(value.snapshot.operationId, reasonId);
    value.updateDraft({ reasonCode: "" }); value.review(); const omittedId = value.snapshot.operationId; value.updateDraft({ reasonCode: "SUPPLIED" }); value.review(); assert.notEqual(value.snapshot.operationId, omittedId);
    const rejected = coordinator(transferPort(async () => ({ ok: false, kind: "InventoryConflict" }))); prepare(rejected); const rejectedId = rejected.snapshot.operationId;
    await rejected.submit(); assert.equal(rejected.snapshot.operationId, null); assert.equal(rejected.snapshot.review, null); rejected.review(); assert.notEqual(rejected.snapshot.operationId, rejectedId);
  });
  it("leaves optional reason normalization and validation authoritative to the server", () => {
    const value = coordinator(); prepare(value, "INVALID REASON");
    assert.equal(value.snapshot.review?.reasonCode, "INVALID REASON");
  });
  it("recovers authoritative deterministic failures, refreshes lifecycle discovery, and preserves safe intent", async () => {
    for (const kind of ["InsufficientAvailableStock", "InventoryConflict", "IdempotencyConflict", "BranchInactive", "BranchNotFound", "ProductArchived", "ProductNotFound"] as const) {
      let reads = 0; const value = coordinator(transferPort(async () => ({ ok: false, kind })), readPort(async branchId => { reads++; return { ok: true, value: quantityFixture({ branchId }) }; }), hints);
      prepare(value); await value.submit(); assert.equal(value.snapshot.review, null); assert.equal(value.snapshot.operationId, null); assert.equal(value.snapshot.draft.quantity, "2");
      assert.equal(reads, staleProductKind(kind) ? 0 : 2);
      assert.equal(thisOwner.branchRefreshes, kind === "BranchInactive" || kind === "BranchNotFound" ? 1 : 0);
      assert.deepEqual(thisOwner.productRefreshes, kind === "ProductArchived" || kind === "ProductNotFound" ? [kind] : []);
    }
  });
  it("clears on 401, aborts reads/writes on disposal, and ignores stale responses", async () => {
    let expired = 0; const authCallbacks = { onChange() {}, onAuthenticationRequired() { expired++; }, onBranchesStale() {}, onProductStale() {} };
    const auth = new TransferCoordinator(transferPort(), readPort(async () => ({ ok: false, kind: "AuthenticationRequired" })), "branch-source", branches,
      "branch-destination", "product-one", hints, authCallbacks, ids()); await auth.load(); assert.equal(expired, 1); assert.equal(auth.snapshot.sourceBranchId, null);
    const pending = deferred<InventoryResult<InventoryReadView>>(); let signal: AbortSignal | undefined;
    const stale = coordinator(transferPort(), readPort((_branch, incoming) => { signal = incoming; return pending.promise; }), hints);
    const loading = stale.load(); stale.dispose(); assert.equal(signal?.aborted, true); pending.resolve({ ok: true, value: quantityFixture({ branchId: "branch-source" }) }); await loading;
    assert.equal(stale.snapshot.sourceBranchId, null);
  });
});

const staleProductKind = (kind: string) => kind === "ProductArchived" || kind === "ProductNotFound";
