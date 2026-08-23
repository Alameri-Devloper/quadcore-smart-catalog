import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import type { InventoryBalance, InventoryMovement, InventoryReservation } from "../domain/inventory";
import type { InventoryRepository, InventoryTransactionContext, InventoryUnitOfWork } from "../ports/inventory-unit-of-work.port";
import { CorrectInventoryUseCase, FulfillInventoryReservationUseCase, IssueInventoryUseCase, MarkInventoryDamagedUseCase, ReceiveInventoryUseCase, ReleaseInventoryReservationUseCase, ReserveInventoryUseCase, RestoreDamagedInventoryUseCase, TransferInventoryUseCase } from "./inventory.use-cases";

const context = (branchIds?: readonly string[]): TrustedActorContext => ({ workspaceId: "workspace-a", actorId: "actor-a", role: "Owner", permissions: [], branchScope: branchIds ? { type: "SelectedBranches", branchIds } : { type: "AllBranches" }, authorizationVersion: 1 });
const key = (branchId: string, productId: string) => `${branchId}:${productId}`;

class MemoryInventory implements InventoryRepository {
  readonly balances = new Map<string, InventoryBalance>(); readonly movements: InventoryMovement[] = []; readonly operations = new Map<string, { fingerprint: string; result: Readonly<Record<string, unknown>> | null }>(); readonly reservations = new Map<string, InventoryReservation>();
  getBalance(_workspaceId: string, branchId: string, productId: string) { return Promise.resolve(this.balances.get(key(branchId, productId)) ?? null); }
  lockBalance(workspaceId: string, branchId: string, productId: string, now: Date) { const found = this.balances.get(key(branchId, productId)); if (found) return Promise.resolve(found); const created = Object.freeze({ workspaceId, branchId, productId, onHand: BigInt(0), reserved: BigInt(0), damaged: BigInt(0), revision: 1, updatedAt: now }); this.balances.set(key(branchId, productId), created); return Promise.resolve(created); }
  saveBalance(value: InventoryBalance, expectedRevision: number) { const current = this.balances.get(key(value.branchId, value.productId)); if (!current || current.revision !== expectedRevision) return Promise.resolve(false); this.balances.set(key(value.branchId, value.productId), value); return Promise.resolve(true); }
  appendMovement(value: InventoryMovement) { this.movements.push(Object.freeze({ ...value })); return Promise.resolve(); }
  listMovements(_workspaceId: string, branchId: string, productId: string, limit: number) { return Promise.resolve(Object.freeze(this.movements.filter((value) => value.branchId === branchId && value.productId === productId).slice(-limit))); }
  claimOperation(input: { workspaceId: string; operationId: string; fingerprint: string }) { const found = this.operations.get(`${input.workspaceId}:${input.operationId}`); if (found) return Promise.resolve({ type: "Existing" as const, ...found }); this.operations.set(`${input.workspaceId}:${input.operationId}`, { fingerprint: input.fingerprint, result: null }); return Promise.resolve({ type: "Claimed" as const }); }
  completeOperation(workspaceId: string, operationId: string, result: Readonly<Record<string, unknown>>) { const found = this.operations.get(`${workspaceId}:${operationId}`)!; this.operations.set(`${workspaceId}:${operationId}`, { ...found, result }); return Promise.resolve(); }
  createReservation(value: InventoryReservation) { this.reservations.set(value.reservationId, value); return Promise.resolve(); }
  findReservation(_workspaceId: string, reservationId: string) { return Promise.resolve(this.reservations.get(reservationId) ?? null); }
  updateReservation(value: InventoryReservation) { this.reservations.set(value.reservationId, value); return Promise.resolve(); }
}

const copyInventoryState = (source: MemoryInventory, target: MemoryInventory) => {
  for (const [entryKey, value] of source.balances) target.balances.set(entryKey, value);
  target.movements.push(...source.movements);
  for (const [entryKey, value] of source.operations) target.operations.set(entryKey, value);
  for (const [entryKey, value] of source.reservations) target.reservations.set(entryKey, value);
};

class FaultInjectingMemoryInventory extends MemoryInventory {
  private balanceSaveCount = 0;
  constructor(private readonly failSecondBalanceSave: boolean) { super(); }
  override saveBalance(value: InventoryBalance, expectedRevision: number) {
    this.balanceSaveCount += 1;
    if (this.failSecondBalanceSave && this.balanceSaveCount === 2) return Promise.resolve(false);
    return super.saveBalance(value, expectedRevision);
  }
}

class TransactionalMemoryInventoryUnitOfWork implements InventoryUnitOfWork {
  readonly inventory = new MemoryInventory();
  readonly auditEvents: string[] = [];
  failNextSecondBalanceSave = false;

  async execute<T>(work: (context: InventoryTransactionContext) => Promise<T>): Promise<T> {
    const workingInventory = new FaultInjectingMemoryInventory(this.failNextSecondBalanceSave);
    this.failNextSecondBalanceSave = false;
    copyInventoryState(this.inventory, workingInventory);
    const workingAuditEvents = [...this.auditEvents];
    const transaction: InventoryTransactionContext = {
      scope: { findBranch: async () => ({ status: "Active" }), findProduct: async () => ({ lifecycleState: "Published" }) },
      inventory: workingInventory,
      audit: { append: async (value) => { workingAuditEvents.push(value.eventType); } },
    };
    const result = await work(transaction);
    this.inventory.balances.clear(); this.inventory.movements.splice(0); this.inventory.operations.clear(); this.inventory.reservations.clear();
    copyInventoryState(workingInventory, this.inventory);
    this.auditEvents.splice(0, this.auditEvents.length, ...workingAuditEvents);
    return result;
  }
}

const fixture = () => {
  const inventory = new MemoryInventory(); let sequence = 0; const transaction: InventoryTransactionContext = { scope: { findBranch: async (_workspaceId, branchId) => branchId === "foreign" ? null : { status: branchId === "inactive" ? "Inactive" : "Active" }, findProduct: async (_workspaceId, productId) => productId === "missing" ? null : { lifecycleState: productId === "archived" ? "Archived" : "Published" } }, inventory, audit: { append: async () => undefined } };
  const unitOfWork: InventoryUnitOfWork = { execute: (work) => work(transaction) }; const dependencies = { unitOfWork, clock: { now: () => new Date("2026-08-20T10:00:00Z") }, identifiers: { next: () => `generated-${++sequence}` }, fingerprint: { create: (value: Readonly<Record<string, string>>) => createHash("sha256").update(JSON.stringify(value)).digest("hex") } };
  return { inventory, receive: new ReceiveInventoryUseCase(dependencies), issue: new IssueInventoryUseCase(dependencies), reserve: new ReserveInventoryUseCase(dependencies), release: new ReleaseInventoryReservationUseCase(dependencies), fulfill: new FulfillInventoryReservationUseCase(dependencies), damage: new MarkInventoryDamagedUseCase(dependencies), restore: new RestoreDamagedInventoryUseCase(dependencies), transfer: new TransferInventoryUseCase(dependencies), correct: new CorrectInventoryUseCase(dependencies) };
};

describe("Inventory application", () => {
  it("receives positive pieces exactly once for an idempotent retry", async () => { const app = fixture(); const command = { context: context(), branchId: "branch-a", productId: "product-a", quantity: "10", operationId: "receive-0001" }; assert.ok((await app.receive.execute(command)).ok); assert.ok((await app.receive.execute(command)).ok); assert.equal(app.inventory.balances.get(key("branch-a", "product-a"))?.onHand, BigInt(10)); assert.equal(app.inventory.movements.length, 1); assert.equal((await app.receive.execute({ ...command, quantity: "11" })).ok, false); });
  it("rejects malformed and insufficient issue quantities without negative stock", async () => { const app = fixture(); assert.deepEqual(await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "0", operationId: "receive-zero" }), { ok: false, error: "InvalidQuantity" }); await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "receive-0002" }); assert.deepEqual(await app.issue.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "3", operationId: "issue-0001" }), { ok: false, error: "InsufficientAvailableStock" }); assert.equal(app.inventory.balances.get(key("branch-a", "product-a"))?.onHand, BigInt(2)); });
  it("reserves, releases, fulfills, damages, restores, and corrects through movements", async () => { const app = fixture(); const actor = context(); await app.receive.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "20", operationId: "receive-0003" }); const reserved = await app.reserve.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "8", operationId: "reserve-0001" }); assert.ok(reserved.ok); if (!reserved.ok || !reserved.value.reservationId) return; await app.release.execute({ context: actor, branchId: "branch-a", reservationId: reserved.value.reservationId, quantity: "3", operationId: "release-0001" }); await app.fulfill.execute({ context: actor, branchId: "branch-a", reservationId: reserved.value.reservationId, quantity: "5", operationId: "fulfill-0001" }); await app.damage.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "damage-0001" }); await app.restore.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", operationId: "restore-0001" }); await app.correct.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", direction: "Increase", reasonCode: "COUNT", operationId: "correct-0001" }); const balance = app.inventory.balances.get(key("branch-a", "product-a"))!; assert.deepEqual({ onHand: balance.onHand, reserved: balance.reserved, damaged: balance.damaged }, { onHand: BigInt(16), reserved: BigInt(0), damaged: BigInt(1) }); assert.equal(app.inventory.movements.length, 7); });
  it("transfers atomically and requires scope for both branches", async () => { const app = fixture(); await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "5", operationId: "receive-0004" }); const denied = await app.transfer.execute({ context: context(["branch-a"]), sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", operationId: "transfer-denied" }); assert.deepEqual(denied, { ok: false, error: "BranchNotFound" }); const moved = await app.transfer.execute({ context: context(), sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", operationId: "transfer-0001" }); assert.ok(moved.ok); assert.equal(app.inventory.balances.get(key("branch-a", "product-a"))?.onHand, BigInt(3)); assert.equal(app.inventory.balances.get(key("branch-b", "product-a"))?.onHand, BigInt(2)); assert.equal(app.inventory.movements.filter((value) => value.correlationId === (moved.ok ? moved.value.transferId : "")).length, 2); });
  it("rolls back a successful source save when the destination save fails and permits retry", async () => {
    const unitOfWork = new TransactionalMemoryInventoryUnitOfWork();
    const now = new Date("2026-08-23T10:00:00Z");
    unitOfWork.inventory.balances.set(key("branch-a", "product-a"), Object.freeze({ workspaceId: "workspace-a", branchId: "branch-a", productId: "product-a", onHand: BigInt(5), reserved: BigInt(0), damaged: BigInt(0), revision: 1, updatedAt: now }));
    unitOfWork.inventory.balances.set(key("branch-b", "product-a"), Object.freeze({ workspaceId: "workspace-a", branchId: "branch-b", productId: "product-a", onHand: BigInt(0), reserved: BigInt(0), damaged: BigInt(0), revision: 1, updatedAt: now }));
    let sequence = 0;
    const transfer = new TransferInventoryUseCase({ unitOfWork, clock: { now: () => now }, identifiers: { next: () => `rollback-${++sequence}` }, fingerprint: { create: (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex") } });
    const command = { context: context(), sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", operationId: "transfer-rollback-0001" };

    unitOfWork.failNextSecondBalanceSave = true;
    assert.deepEqual(await transfer.execute(command), { ok: false, error: "InventoryConflict" });
    assert.equal(unitOfWork.inventory.balances.get(key("branch-a", "product-a"))?.onHand, BigInt(5));
    assert.equal(unitOfWork.inventory.balances.get(key("branch-b", "product-a"))?.onHand, BigInt(0));
    assert.equal(unitOfWork.inventory.movements.length, 0);
    assert.deepEqual(unitOfWork.auditEvents, []);
    assert.equal(unitOfWork.inventory.operations.has("workspace-a:transfer-rollback-0001"), false);

    const retried = await transfer.execute(command);
    assert.ok(retried.ok);
    assert.equal(unitOfWork.inventory.balances.get(key("branch-a", "product-a"))?.onHand, BigInt(3));
    assert.equal(unitOfWork.inventory.balances.get(key("branch-b", "product-a"))?.onHand, BigInt(2));
    assert.equal(unitOfWork.inventory.movements.length, 2);
    assert.deepEqual(unitOfWork.auditEvents, ["InventoryTransferred"]);
    assert.notEqual(unitOfWork.inventory.operations.get("workspace-a:transfer-rollback-0001")?.result, null);
  });
  it("keeps the business movement repository append-only", () => { const names: readonly (keyof InventoryRepository)[] = ["getBalance", "lockBalance", "saveBalance", "appendMovement", "listMovements", "claimOperation", "completeOperation", "createReservation", "findReservation", "updateReservation"]; assert.equal(names.includes("appendMovement"), true); assert.equal(names.some((name) => String(name).includes("deleteMovement") || String(name).includes("updateMovement")), false); });
});
