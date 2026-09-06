import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import type { InventoryBalance, InventoryMovement, InventoryReservation } from "../domain/inventory";
import type { InventoryRepository, InventoryTransactionContext, InventoryUnitOfWork, ReservationListQuery } from "../ports/inventory-unit-of-work.port";
import { CorrectInventoryUseCase, FulfillInventoryReservationUseCase, GetBranchProductInventoryUseCase, GetInventoryReservationUseCase, IssueInventoryUseCase, ListInventoryReservationsUseCase, MarkInventoryDamagedUseCase, ReceiveInventoryUseCase, ReleaseInventoryReservationUseCase, ReserveInventoryUseCase, RestoreDamagedInventoryUseCase, TransferInventoryUseCase } from "./inventory.use-cases";

const context = (branchIds?: readonly string[]): TrustedActorContext => ({ workspaceId: "workspace-a", actorId: "actor-a", role: "Owner", permissions: [], branchScope: branchIds ? { type: "SelectedBranches", branchIds } : { type: "AllBranches" }, authorizationVersion: 1 });
const staff = (permissions: readonly string[] = [], branchIds: readonly string[] | null = ["branch-a"], workspaceId = "workspace-a"): TrustedActorContext => ({ workspaceId, actorId: "staff-a", role: "Staff", permissions, branchScope: branchIds ? { type: "SelectedBranches", branchIds } : { type: "AllBranches" }, authorizationVersion: 1 });
const key = (branchId: string, productId: string) => `${branchId}:${productId}`;
const reservation = (reservationId: string, status: InventoryReservation["status"] = "Active", updatedAt = "2026-08-20T10:00:00.000Z", overrides: Partial<InventoryReservation> = {}): InventoryReservation => Object.freeze({ workspaceId: "workspace-a", reservationId, branchId: "branch-a", productId: "product-a", quantity: BigInt(8), remainingQuantity: status === "Fulfilled" || status === "Released" ? BigInt(0) : BigInt(5), status, createdByActorId: "private-actor", createdAt: new Date("2026-08-19T10:00:00.000Z"), updatedAt: new Date(updatedAt), ...overrides });
const tamperCursor = (cursor: string, changes: Readonly<Record<string, unknown>>) => Buffer.from(JSON.stringify({ ...(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<string, unknown>), ...changes }), "utf8").toString("base64url");

class MemoryInventory implements InventoryRepository {
  readonly balances = new Map<string, InventoryBalance>(); readonly movements: InventoryMovement[] = []; readonly operations = new Map<string, { fingerprint: string; result: Readonly<Record<string, unknown>> | null }>(); readonly reservations = new Map<string, InventoryReservation>(); lastReservationQuery?: ReservationListQuery; lastFindForUpdate?: boolean; lastBalanceWorkspaceId?: string;
  getBalance(workspaceId: string, branchId: string, productId: string) { this.lastBalanceWorkspaceId = workspaceId; const found = this.balances.get(key(branchId, productId)); return Promise.resolve(found?.workspaceId === workspaceId ? found : null); }
  lockBalance(workspaceId: string, branchId: string, productId: string, now: Date) { const found = this.balances.get(key(branchId, productId)); if (found) return Promise.resolve(found); const created = Object.freeze({ workspaceId, branchId, productId, onHand: BigInt(0), reserved: BigInt(0), damaged: BigInt(0), revision: 1, updatedAt: now }); this.balances.set(key(branchId, productId), created); return Promise.resolve(created); }
  saveBalance(value: InventoryBalance, expectedRevision: number) { const current = this.balances.get(key(value.branchId, value.productId)); if (!current || current.revision !== expectedRevision) return Promise.resolve(false); this.balances.set(key(value.branchId, value.productId), value); return Promise.resolve(true); }
  appendMovement(value: InventoryMovement) { this.movements.push(Object.freeze({ ...value })); return Promise.resolve(); }
  listMovements(_workspaceId: string, branchId: string, productId: string, limit: number) { return Promise.resolve(Object.freeze(this.movements.filter((value) => value.branchId === branchId && value.productId === productId).slice(-limit))); }
  claimOperation(input: { workspaceId: string; operationId: string; fingerprint: string }) { const found = this.operations.get(`${input.workspaceId}:${input.operationId}`); if (found) return Promise.resolve({ type: "Existing" as const, ...found }); this.operations.set(`${input.workspaceId}:${input.operationId}`, { fingerprint: input.fingerprint, result: null }); return Promise.resolve({ type: "Claimed" as const }); }
  completeOperation(workspaceId: string, operationId: string, result: Readonly<Record<string, unknown>>) { const found = this.operations.get(`${workspaceId}:${operationId}`)!; this.operations.set(`${workspaceId}:${operationId}`, { ...found, result }); return Promise.resolve(); }
  createReservation(value: InventoryReservation) { this.reservations.set(value.reservationId, value); return Promise.resolve(); }
  listReservations(query: ReservationListQuery) { this.lastReservationQuery = query; return Promise.resolve(Object.freeze([...this.reservations.values()].filter((value) => value.workspaceId === query.workspaceId && value.branchId === query.branchId && value.productId === query.productId && query.statuses.includes(value.status) && (!query.cursor || value.updatedAt < query.cursor.updatedAt || (value.updatedAt.getTime() === query.cursor.updatedAt.getTime() && value.reservationId < query.cursor.reservationId))).sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime() || right.reservationId.localeCompare(left.reservationId)).slice(0, query.limit))); }
  findReservation(workspaceId: string, reservationId: string, forUpdate: boolean) { this.lastFindForUpdate = forUpdate; const found = this.reservations.get(reservationId); return Promise.resolve(found?.workspaceId === workspaceId ? found : null); }
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
  const inventory = new MemoryInventory(); const auditEvents: string[] = []; let sequence = 0; const transaction: InventoryTransactionContext = { scope: { findBranch: async (workspaceId, branchId) => workspaceId === "workspace-b" || branchId === "foreign" ? null : { status: branchId === "inactive" ? "Inactive" : "Active" }, findProduct: async (workspaceId, productId) => workspaceId === "workspace-b" || productId === "missing" ? null : { lifecycleState: productId === "archived" ? "Archived" : "Published" } }, inventory, audit: { append: async (value) => { auditEvents.push(value.eventType); } } };
  const unitOfWork: InventoryUnitOfWork = { execute: (work) => work(transaction) }; const dependencies = { unitOfWork, clock: { now: () => new Date("2026-08-20T10:00:00Z") }, identifiers: { next: () => `generated-${++sequence}` }, fingerprint: { create: (value: Readonly<Record<string, string>>) => createHash("sha256").update(JSON.stringify(value)).digest("hex") } };
  return { inventory, auditEvents, receive: new ReceiveInventoryUseCase(dependencies), issue: new IssueInventoryUseCase(dependencies), reserve: new ReserveInventoryUseCase(dependencies), release: new ReleaseInventoryReservationUseCase(dependencies), fulfill: new FulfillInventoryReservationUseCase(dependencies), damage: new MarkInventoryDamagedUseCase(dependencies), restore: new RestoreDamagedInventoryUseCase(dependencies), transfer: new TransferInventoryUseCase(dependencies), correct: new CorrectInventoryUseCase(dependencies), get: new GetBranchProductInventoryUseCase(unitOfWork), reservations: new ListInventoryReservationsUseCase(unitOfWork), reservation: new GetInventoryReservationUseCase(unitOfWork) };
};

const assertNoGenericQuantityDisclosure = (value: unknown) => {
  const serialized = JSON.stringify(value);
  for (const forbidden of ["onHand", "reserved", "damaged", "available", "revision", "updatedAt", "balance"]) assert.equal(serialized.includes(`\"${forbidden}\"`), false, forbidden);
};

describe("Inventory disclosure", () => {
  it("projects ordinary reads through the exact Owner, quantity, availability, and forbidden matrix", async () => {
    const app = fixture();
    app.inventory.balances.set(key("branch-a", "product-a"), Object.freeze({ workspaceId: "workspace-a", branchId: "branch-a", productId: "product-a", onHand: BigInt(9), reserved: BigInt(2), damaged: BigInt(1), revision: 4, updatedAt: new Date("2026-08-20T10:00:00.000Z") }));
    const expectedDetailed = { branchId: "branch-a", productId: "product-a", unit: "Piece", availability: "InStock", quantities: { available: "6", onHand: "9", reserved: "2", damaged: "1" }, revision: 4, updatedAt: "2026-08-20T10:00:00.000Z" };
    assert.deepEqual(await app.get.execute({ context: context(), branchId: "branch-a", productId: "product-a" }), { ok: true, value: expectedDetailed });
    assert.deepEqual(await app.get.execute({ context: staff(["inventory.quantity.view"]), branchId: "branch-a", productId: "product-a" }), { ok: true, value: expectedDetailed });
    const availability = await app.get.execute({ context: staff(["inventory.availability.view"]), branchId: "branch-a", productId: "product-a" });
    assert.deepEqual(availability, { ok: true, value: { branchId: "branch-a", productId: "product-a", unit: "Piece", availability: "InStock" } });
    assertNoGenericQuantityDisclosure(availability);
    assert.deepEqual(await app.get.execute({ context: staff([]), branchId: "branch-a", productId: "product-a" }), { ok: false, error: "Forbidden" });
  });

  it("returns OutOfStock for absent, zero, reserved-out, and damaged-out balances", async () => {
    for (const quantities of [null, { onHand: 0, reserved: 0, damaged: 0 }, { onHand: 5, reserved: 5, damaged: 0 }, { onHand: 5, reserved: 0, damaged: 5 }]) {
      const app = fixture();
      if (quantities) app.inventory.balances.set(key("branch-a", "product-a"), Object.freeze({ workspaceId: "workspace-a", branchId: "branch-a", productId: "product-a", onHand: BigInt(quantities.onHand), reserved: BigInt(quantities.reserved), damaged: BigInt(quantities.damaged), revision: 2, updatedAt: new Date() }));
      assert.deepEqual(await app.get.execute({ context: staff(["inventory.availability.view"]), branchId: "branch-a", productId: "product-a" }), { ok: true, value: { branchId: "branch-a", productId: "product-a", unit: "Piece", availability: "OutOfStock" } });
    }
  });

  it("preserves tenant, Branch-scope, Branch, and Product safe-not-found behavior", async () => {
    const app = fixture();
    assert.deepEqual(await app.get.execute({ context: staff(["inventory.quantity.view"], ["branch-a"]), branchId: "branch-b", productId: "product-a" }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await app.get.execute({ context: staff(["inventory.quantity.view"], null), branchId: "foreign", productId: "product-a" }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await app.get.execute({ context: staff(["inventory.quantity.view"], null), branchId: "branch-a", productId: "missing" }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(await app.get.execute({ context: staff(["inventory.quantity.view"], null, "workspace-b"), branchId: "branch-a", productId: "product-a" }), { ok: false, error: "BranchNotFound" });
    assert.equal(app.inventory.lastBalanceWorkspaceId, undefined);
  });

  it("projects every single-balance mutation family from current read visibility", async () => {
    const cases = [
      { permission: "inventory.receive", execute: (app: ReturnType<typeof fixture>, operationId: string, actor: TrustedActorContext) => app.receive.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", operationId }) },
      { permission: "inventory.damage", execute: async (app: ReturnType<typeof fixture>, operationId: string, actor: TrustedActorContext) => { await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: `${operationId}-stock` }); return app.damage.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", operationId }); } },
      { permission: "inventory.damage", execute: async (app: ReturnType<typeof fixture>, operationId: string, actor: TrustedActorContext) => { await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: `${operationId}-stock` }); await app.damage.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: `${operationId}-setup` }); return app.restore.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", operationId }); } },
      { permission: "inventory.adjust", execute: (app: ReturnType<typeof fixture>, operationId: string, actor: TrustedActorContext) => app.correct.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", direction: "Increase", reasonCode: "COUNT", operationId }) },
      { permission: "inventory.issue", execute: async (app: ReturnType<typeof fixture>, operationId: string, actor: TrustedActorContext) => { await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "1", operationId: `${operationId}-setup` }); return app.issue.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "1", operationId }); } },
    ];
    for (const [index, item] of cases.entries()) {
      const expectedAvailability = index === 0 || index === 2 || index === 3 ? "InStock" : "OutOfStock";
      const quantityApp = fixture(); const quantity = await item.execute(quantityApp, `single-quantity-${index}`, staff([item.permission, "inventory.quantity.view"])); assert.ok(quantity.ok); if (quantity.ok) { assert.equal(quantity.value.status, "Succeeded"); assert.equal(quantity.value.balance?.availability, expectedAvailability); assert.ok(quantity.value.balance?.quantities); }
      const availabilityApp = fixture(); const availability = await item.execute(availabilityApp, `single-available-${index}`, staff([item.permission, "inventory.availability.view"])); assert.ok(availability.ok); if (availability.ok) assert.deepEqual(availability.value, { operationId: `single-available-${index}`, status: "Succeeded", availability: expectedAvailability }); assertNoGenericQuantityDisclosure(availability);
      const minimumApp = fixture(); const minimum = await item.execute(minimumApp, `single-minimum-${index}`, staff([item.permission])); assert.deepEqual(minimum, { ok: true, value: { operationId: `single-minimum-${index}`, status: "Succeeded" } });
    }
  });

  it("preserves Reservation operation state while projecting reserve, release, and fulfill balances", async () => {
    for (const visibility of [["inventory.quantity.view"], ["inventory.availability.view"], []] as const) {
      const app = fixture();
      await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "8", operationId: `reservation-stock-${visibility.length}` });
      const actor = staff(["inventory.reserve", ...visibility]);
      const reserved = await app.reserve.execute({ context: actor, branchId: "branch-a", productId: "product-a", quantity: "8", operationId: `reservation-create-${visibility.length}` });
      assert.ok(reserved.ok); if (!reserved.ok || !reserved.value.reservationId) continue;
      assert.equal(reserved.value.reservationStatus, "Active"); assert.equal(reserved.value.remainingQuantity, "8");
      const released = await app.release.execute({ context: actor, branchId: "branch-a", reservationId: reserved.value.reservationId, quantity: "3", operationId: `reservation-release-${visibility.length}` });
      assert.ok(released.ok); if (released.ok) { assert.equal(released.value.reservationStatus, "Active"); assert.equal(released.value.remainingQuantity, "5"); }
      const fulfilled = await app.fulfill.execute({ context: actor, branchId: "branch-a", reservationId: reserved.value.reservationId, quantity: "5", operationId: `reservation-fulfill-${visibility.length}` });
      assert.ok(fulfilled.ok); if (fulfilled.ok) { assert.equal(fulfilled.value.reservationStatus, "Fulfilled"); assert.equal(fulfilled.value.remainingQuantity, "0"); }
      if (visibility[0] === "inventory.quantity.view") assert.ok(reserved.value.balance?.quantities);
      else if (visibility[0] === "inventory.availability.view") { assert.equal(reserved.value.availability, "OutOfStock"); assertNoGenericQuantityDisclosure(reserved); }
      else assertNoGenericQuantityDisclosure(reserved);
    }
  });

  it("preserves transfer ID and atomic effects while projecting both balances", async () => {
    for (const visibility of [["inventory.quantity.view"], ["inventory.availability.view"], []] as const) {
      const app = fixture(); await app.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: `transfer-stock-${visibility.length}` });
      const result = await app.transfer.execute({ context: staff(["inventory.transfer", ...visibility], null), sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", operationId: `transfer-view-${visibility.length}` });
      assert.ok(result.ok); if (!result.ok) continue; assert.ok(result.value.transferId); assert.equal(app.inventory.movements.filter((movement) => movement.correlationId === result.value.transferId).length, 2);
      if (visibility[0] === "inventory.quantity.view") { assert.ok(result.value.sourceBalance?.quantities); assert.ok(result.value.destinationBalance?.quantities); }
      else if (visibility[0] === "inventory.availability.view") { assert.equal(result.value.sourceAvailability, "OutOfStock"); assert.equal(result.value.destinationAvailability, "InStock"); assertNoGenericQuantityDisclosure(result); }
      else { assert.deepEqual(Object.keys(result.value).sort(), ["operationId", "status", "transferId"]); assertNoGenericQuantityDisclosure(result); }
    }
  });

  it("re-projects persisted success with current quantity, availability-only, and no-read visibility without duplicate effects", async () => {
    const app = fixture(); const base = { branchId: "branch-a", productId: "product-a", quantity: "4", operationId: "receive-reproject-0001" };
    const first = await app.receive.execute({ ...base, context: context() }); assert.ok(first.ok); if (first.ok) assert.ok(first.value.balance?.quantities);
    const stored = app.inventory.operations.get("workspace-a:receive-reproject-0001")?.result; assert.equal(JSON.stringify(stored).includes("onHand"), true);
    const availability = await app.receive.execute({ ...base, context: staff(["inventory.receive", "inventory.availability.view"]) }); assert.deepEqual(availability, { ok: true, value: { operationId: base.operationId, status: "Succeeded", availability: "InStock" } });
    const minimum = await app.receive.execute({ ...base, context: staff(["inventory.receive"]) }); assert.deepEqual(minimum, { ok: true, value: { operationId: base.operationId, status: "Succeeded" } });
    const restored = await app.receive.execute({ ...base, context: staff(["inventory.receive", "inventory.quantity.view"]) }); assert.ok(restored.ok); if (restored.ok) assert.equal(restored.value.balance?.quantities.onHand, "4");
    assert.equal(app.inventory.movements.length, 1); assert.equal(app.auditEvents.length, 1); assert.equal(app.inventory.operations.size, 1);
    assert.deepEqual(await app.receive.execute({ ...base, quantity: "5", context: staff(["inventory.receive"]) }), { ok: false, error: "IdempotencyConflict" });
  });

  it("replays persisted Reservation and transfer results without duplicates or disclosure bypass", async () => {
    const reservationApp = fixture(); await reservationApp.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "replay-reservation-stock" });
    const reserveCommand = { branchId: "branch-a", productId: "product-a", quantity: "1", operationId: "replay-reservation-create" };
    const created = await reservationApp.reserve.execute({ ...reserveCommand, context: context() }); assert.ok(created.ok); const replay = await reservationApp.reserve.execute({ ...reserveCommand, context: staff(["inventory.reserve"]) });
    assert.ok(replay.ok); if (created.ok && replay.ok) { assert.equal(replay.value.reservationId, created.value.reservationId); assert.equal(replay.value.reservationStatus, "Active"); assert.equal(replay.value.remainingQuantity, "1"); assertNoGenericQuantityDisclosure(replay); }
    assert.equal(reservationApp.inventory.reservations.size, 1); assert.equal(reservationApp.inventory.movements.filter((movement) => movement.movementType === "Reserve").length, 1);

    const transferApp = fixture(); await transferApp.receive.execute({ context: context(), branchId: "branch-a", productId: "product-a", quantity: "2", operationId: "replay-transfer-stock" });
    const transferCommand = { sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "1", operationId: "replay-transfer-create" };
    const transferred = await transferApp.transfer.execute({ ...transferCommand, context: context() }); assert.ok(transferred.ok); const transferReplay = await transferApp.transfer.execute({ ...transferCommand, context: staff(["inventory.transfer", "inventory.availability.view"], null) });
    assert.ok(transferReplay.ok); if (transferred.ok && transferReplay.ok) { assert.equal(transferReplay.value.transferId, transferred.value.transferId); assert.equal(transferReplay.value.sourceAvailability, "InStock"); assert.equal(transferReplay.value.destinationAvailability, "InStock"); assertNoGenericQuantityDisclosure(transferReplay); }
    assert.equal(transferApp.inventory.movements.filter((movement) => movement.correlationId === (transferred.ok ? transferred.value.transferId : "")).length, 2);
  });

  it("keeps failure replay unchanged and side-effect free", async () => {
    const app = fixture(); const command = { context: staff(["inventory.receive"]), branchId: "branch-a", productId: "archived", quantity: "1", operationId: "failure-replay-0001" };
    assert.deepEqual(await app.receive.execute(command), { ok: false, error: "ProductArchived" }); assert.deepEqual(await app.receive.execute(command), { ok: false, error: "ProductArchived" });
    assert.equal(app.inventory.movements.length, 0); assert.equal(app.auditEvents.length, 0); assert.equal(app.inventory.operations.size, 1);
  });
});

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
  it("keeps the business movement repository append-only", () => { const names: readonly (keyof InventoryRepository)[] = ["getBalance", "lockBalance", "saveBalance", "appendMovement", "listMovements", "claimOperation", "completeOperation", "createReservation", "listReservations", "findReservation", "updateReservation"]; assert.equal(names.includes("appendMovement"), true); assert.equal(names.some((name) => String(name).includes("deleteMovement") || String(name).includes("updateMovement")), false); });
});

describe("Reservation management reads", () => {
  it("requires reserve authority only and enforces trusted Branch scope", async () => { const app = fixture(); assert.ok((await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a" })).ok); for (const permissions of [[], ["catalog.products.view"], ["inventory.quantity.view"], ["inventory.availability.view"], ["inventory.receive"], ["inventory.issue"], ["inventory.adjust"]]) assert.deepEqual(await app.reservations.execute({ context: staff(permissions), branchId: "branch-a", productId: "product-a" }), { ok: false, error: "Forbidden" }); assert.deepEqual(await app.reservations.execute({ context: staff(["inventory.reserve"], ["branch-a"]), branchId: "branch-b", productId: "product-a" }), { ok: false, error: "BranchNotFound" }); assert.deepEqual(await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "" }), { ok: false, error: "InvalidInput" }); assert.deepEqual(await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "missing" }), { ok: false, error: "ProductNotFound" }); });

  it("enforces default, minimum, and maximum bounded fetch limits", async () => { const app = fixture(); const command = { context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a" }; await app.reservations.execute(command); assert.equal(app.inventory.lastReservationQuery?.limit, 25); await app.reservations.execute({ ...command, limit: 1 }); assert.equal(app.inventory.lastReservationQuery?.limit, 2); await app.reservations.execute({ ...command, limit: 60 }); assert.equal(app.inventory.lastReservationQuery?.limit, 61); for (const limit of [0, 61]) assert.deepEqual(await app.reservations.execute({ ...command, limit }), { ok: false, error: "InvalidInput" }); });

  it("maps actionable Reservations to the exact non-disclosing decimal-string DTO", async () => { const app = fixture(); for (const item of [reservation("active", "Active", "2026-08-20T10:00:03.000Z"), reservation("partial", "PartiallyFulfilled", "2026-08-20T10:00:02.000Z"), reservation("fulfilled", "Fulfilled"), reservation("released", "Released")]) app.inventory.reservations.set(item.reservationId, item); const result = await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a" }); assert.ok(result.ok); if (!result.ok) return; assert.deepEqual(result.value.items.map((item) => item.status), ["Active", "PartiallyFulfilled"]); assert.deepEqual(result.value.items[0]?.allowedActions, ["Release", "Fulfill"]); assert.equal(result.value.items[0]?.quantity, "8"); assert.equal(result.value.items[0]?.remainingQuantity, "5"); assert.deepEqual(Object.keys(result.value.items[0]!).sort(), ["allowedActions", "branchId", "createdAt", "productId", "quantity", "remainingQuantity", "reservationId", "status", "updatedAt"]); const serialized = JSON.stringify(result.value); for (const forbidden of ["createdByActorId", "workspaceId", "actorId", "permissions", "role", "productCode", "productName", "balance", "operationId"]) assert.equal(serialized.includes(forbidden), false, forbidden); });

  it("emits a cursor only when limit plus one proves another row and returns empty pages exactly", async () => { const app = fixture(); for (const item of [reservation("r-3", "Active", "2026-08-20T10:00:03.000Z"), reservation("r-2", "Active", "2026-08-20T10:00:02.000Z"), reservation("r-1", "Active", "2026-08-20T10:00:01.000Z")]) app.inventory.reservations.set(item.reservationId, item); const first = await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a", limit: 2 }); assert.ok(first.ok); if (!first.ok) return; assert.deepEqual(first.value.items.map((item) => item.reservationId), ["r-3", "r-2"]); assert.ok(first.value.nextCursor); const second = await app.reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a", limit: 2, cursor: first.value.nextCursor! }); assert.ok(second.ok); if (second.ok) { assert.deepEqual(second.value.items.map((item) => item.reservationId), ["r-1"]); assert.equal(second.value.nextCursor, null); } const empty = await fixture().reservations.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a" }); assert.deepEqual(empty, { ok: true, value: { items: [], nextCursor: null } }); });

  it("rejects malformed, non-canonical, unsupported, altered, cross-scope, and invalid-position cursors", async () => { const app = fixture(); app.inventory.reservations.set("r-2", reservation("r-2", "Active", "2026-08-20T10:00:02.000Z")); app.inventory.reservations.set("r-1", reservation("r-1", "Active", "2026-08-20T10:00:01.000Z")); const command = { context: staff(["inventory.reserve"], null), branchId: "branch-a", productId: "product-a", limit: 1 }; const first = await app.reservations.execute(command); assert.ok(first.ok); if (!first.ok || !first.value.nextCursor) return; const cursor = first.value.nextCursor; const cases = ["!", `${cursor}=`, tamperCursor(cursor, { version: 2 }), tamperCursor(cursor, { fingerprint: "0".repeat(64) }), tamperCursor(cursor, { updatedAt: "2026-08-20T10:00:02Z" }), tamperCursor(cursor, { reservationId: " invalid" }), tamperCursor(cursor, { extra: true })]; for (const candidate of cases) assert.deepEqual(await app.reservations.execute({ ...command, cursor: candidate }), { ok: false, error: "InvalidCursor" }); assert.deepEqual(await app.reservations.execute({ ...command, branchId: "branch-b", cursor }), { ok: false, error: "InvalidCursor" }); assert.deepEqual(await app.reservations.execute({ ...command, productId: "product-b", cursor }), { ok: false, error: "InvalidCursor" }); });

  it("keeps a structurally valid cursor live after its source Reservation is deleted", async () => { const app = fixture(); for (const item of [reservation("r-3", "Active", "2026-08-20T10:00:03.000Z"), reservation("r-2", "Active", "2026-08-20T10:00:02.000Z"), reservation("r-1", "Active", "2026-08-20T10:00:01.000Z")]) app.inventory.reservations.set(item.reservationId, item); const command = { context: staff(["inventory.reserve"]), branchId: "branch-a", productId: "product-a", limit: 1 }; const first = await app.reservations.execute(command); assert.ok(first.ok); if (!first.ok || !first.value.nextCursor) return; app.inventory.reservations.delete("r-3"); const next = await app.reservations.execute({ ...command, cursor: first.value.nextCursor }); assert.ok(next.ok); if (next.ok) assert.equal(next.value.items[0]?.reservationId, "r-2"); });

  it("returns every persisted status in detail with state-intersected actions and no row lock", async () => { for (const status of ["Active", "PartiallyFulfilled", "Fulfilled", "Released"] as const) { const app = fixture(); const item = reservation(`reservation-${status}`, status); app.inventory.reservations.set(item.reservationId, item); const result = await app.reservation.execute({ context: staff(["inventory.reserve"]), branchId: "branch-a", reservationId: item.reservationId }); assert.ok(result.ok); if (result.ok) assert.deepEqual(result.value.allowedActions, status === "Active" || status === "PartiallyFulfilled" ? ["Release", "Fulfill"] : []); assert.equal(app.inventory.lastFindForUpdate, false); } });

  it("non-discloses missing, cross-Branch, out-of-scope, and foreign-Workspace detail", async () => { const app = fixture(); app.inventory.reservations.set("branch-other", reservation("branch-other", "Active", undefined, { branchId: "branch-b" })); app.inventory.reservations.set("foreign", reservation("foreign", "Active", undefined, { workspaceId: "workspace-b" })); const authorized = staff(["inventory.reserve"], null); for (const command of [{ context: authorized, branchId: "branch-a", reservationId: "missing" }, { context: authorized, branchId: "branch-a", reservationId: "branch-other" }, { context: authorized, branchId: "branch-a", reservationId: "foreign" }, { context: staff(["inventory.reserve"], ["branch-a"]), branchId: "branch-b", reservationId: "branch-other" }]) assert.deepEqual(await app.reservation.execute(command), { ok: false, error: "ReservationNotFound" }); assert.deepEqual(await app.reservation.execute({ context: staff([]), branchId: "branch-a", reservationId: "missing" }), { ok: false, error: "Forbidden" }); });
});
