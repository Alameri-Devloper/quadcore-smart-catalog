import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { availableQuantity, changeBalance, normalizeOperationId, normalizeReasonCode, normalizeSafeNote, parsePositiveQuantity, type InventoryBalance, type InventoryMovement, type InventoryMovementType, type InventoryReservation } from "../domain/inventory";
import type { InventoryClock, InventoryFingerprint, InventoryIdentifierGenerator, InventoryTransactionContext, InventoryUnitOfWork } from "../ports/inventory-unit-of-work.port";
import { inventoryFailure, inventorySuccess, type InventoryError, type InventoryResult } from "./inventory-results";

export interface InventoryBalanceView { readonly branchId: string; readonly productId: string; readonly unit: "Piece"; readonly onHand: string; readonly reserved: string; readonly damaged: string; readonly available: string; readonly revision: number; readonly updatedAt: string }
export interface InventoryMutationView { readonly operationId: string; readonly balance?: InventoryBalanceView; readonly sourceBalance?: InventoryBalanceView; readonly destinationBalance?: InventoryBalanceView; readonly reservationId?: string; readonly reservationStatus?: string; readonly remainingQuantity?: string; readonly transferId?: string }
export interface InventoryMovementView { readonly movementId: string; readonly movementType: InventoryMovementType; readonly quantity: string; readonly occurredAt: string; readonly createdByActorId: string; readonly operationId: string; readonly reservationId?: string; readonly correlationId?: string; readonly reasonCode?: string; readonly note?: string }

const can = (context: TrustedActorContext, permission: string) => context.role === "Owner" || context.permissions.includes(permission);
const inScope = (context: TrustedActorContext, branchId: string) => context.branchScope.type === "AllBranches" || context.branchScope.branchIds.includes(branchId);
const balanceView = (balance: InventoryBalance): InventoryBalanceView => Object.freeze({ branchId: balance.branchId, productId: balance.productId, unit: "Piece", onHand: balance.onHand.toString(), reserved: balance.reserved.toString(), damaged: balance.damaged.toString(), available: availableQuantity(balance).toString(), revision: balance.revision, updatedAt: balance.updatedAt.toISOString() });
const encodeResult = (result: InventoryResult<InventoryMutationView>): Readonly<Record<string, unknown>> => result.ok ? { type: "Success", value: result.value } : { type: "Failure", error: result.error };
const decodeResult = (value: Readonly<Record<string, unknown>> | null): InventoryResult<InventoryMutationView> | null => {
  if (!value) return null; if (value.type === "Success" && value.value && typeof value.value === "object") return inventorySuccess(value.value as InventoryMutationView);
  if (value.type === "Failure" && typeof value.error === "string") return inventoryFailure(value.error as InventoryError); return null;
};

interface Dependencies { readonly unitOfWork: InventoryUnitOfWork; readonly clock: InventoryClock; readonly identifiers: InventoryIdentifierGenerator; readonly fingerprint: InventoryFingerprint }
interface MutationCommand { readonly context: TrustedActorContext; readonly operationId: string }

class InventoryTransactionAbort extends Error {
  constructor(readonly inventoryError: InventoryError) { super("Inventory transaction aborted"); this.name = "InventoryTransactionAbort"; }
}

const validateActiveScope = async (transaction: InventoryTransactionContext, context: TrustedActorContext, branchId: string, productId: string): Promise<InventoryError | null> => {
  const branch = await transaction.scope.findBranch(context.workspaceId, branchId); if (!branch) return "BranchNotFound"; if (branch.status !== "Active") return "BranchInactive";
  const product = await transaction.scope.findProduct(context.workspaceId, productId); if (!product) return "ProductNotFound"; if (product.lifecycleState === "Archived") return "ProductArchived"; return null;
};

const movement = (dependencies: Dependencies, command: MutationCommand & { readonly branchId: string; readonly productId: string }, type: InventoryMovementType, quantity: bigint, now: Date, extra: Partial<Pick<InventoryMovement, "reservationId" | "correlationId" | "reasonCode" | "note">> = {}): InventoryMovement => Object.freeze({ workspaceId: command.context.workspaceId, branchId: command.branchId, movementId: dependencies.identifiers.next(), productId: command.productId, movementType: type, quantity, occurredAt: now, createdAt: now, createdByActorId: command.context.actorId, operationId: command.operationId, ...extra });

const run = async (dependencies: Dependencies, command: MutationCommand, operationType: string, fingerprintValues: Readonly<Record<string, string>>, work: (transaction: InventoryTransactionContext, now: Date) => Promise<InventoryResult<InventoryMutationView>>): Promise<InventoryResult<InventoryMutationView>> => {
  let operationId: string; try { operationId = normalizeOperationId(command.operationId); } catch { return inventoryFailure("InvalidInput"); }
  const now = dependencies.clock.now(); const fingerprint = dependencies.fingerprint.create({ operationType, operationId, ...fingerprintValues });
  try {
    return await dependencies.unitOfWork.execute(async (transaction) => {
      const claimed = await transaction.inventory.claimOperation({ workspaceId: command.context.workspaceId, operationId, operationType, fingerprint, createdAt: now });
      if (claimed.type === "Existing") { if (claimed.fingerprint !== fingerprint) return inventoryFailure("IdempotencyConflict"); return decodeResult(claimed.result) ?? inventoryFailure("InventoryConflict"); }
      const result = await work(transaction, now); await transaction.inventory.completeOperation(command.context.workspaceId, operationId, encodeResult(result)); return result;
    });
  } catch (error) { if (error instanceof InventoryTransactionAbort) return inventoryFailure(error.inventoryError); if (error instanceof Error && error.message === "InsufficientAvailableStock") return inventoryFailure("InsufficientAvailableStock"); return inventoryFailure("InventoryConflict"); }
};

abstract class SingleBalanceMutation {
  constructor(protected readonly dependencies: Dependencies, private readonly permission: string, private readonly operationType: string, private readonly movementType: InventoryMovementType, private readonly delta: (quantity: bigint) => { onHand?: bigint; reserved?: bigint; damaged?: bigint }, private readonly auditEvent: string) {}
  execute(command: MutationCommand & { readonly branchId: string; readonly productId: string; readonly quantity: string; readonly reasonCode?: string; readonly note?: string }): Promise<InventoryResult<InventoryMutationView>> {
    if (!can(command.context, this.permission)) return Promise.resolve(inventoryFailure("Forbidden")); if (!inScope(command.context, command.branchId)) return Promise.resolve(inventoryFailure("BranchNotFound"));
    let quantity: bigint; let reasonCode: string | undefined; let note: string | undefined; try { quantity = parsePositiveQuantity(command.quantity); reasonCode = normalizeReasonCode(command.reasonCode); note = normalizeSafeNote(command.note); } catch { return Promise.resolve(inventoryFailure("InvalidQuantity")); }
    return run(this.dependencies, command, this.operationType, { branchId: command.branchId, productId: command.productId, quantity: quantity.toString(), reasonCode: reasonCode ?? "", note: note ?? "" }, async (transaction, now) => {
      const invalid = await validateActiveScope(transaction, command.context, command.branchId, command.productId); if (invalid) return inventoryFailure(invalid);
      const current = await transaction.inventory.lockBalance(command.context.workspaceId, command.branchId, command.productId, now); const next = changeBalance(current, this.delta(quantity), now);
      if (!await transaction.inventory.saveBalance(next, current.revision)) throw new InventoryTransactionAbort("InventoryConflict");
      await transaction.inventory.appendMovement(movement(this.dependencies, command, this.movementType, quantity, now, { ...(reasonCode ? { reasonCode } : {}), ...(note ? { note } : {}) }));
      await transaction.audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: this.auditEvent, metadata: { branchId: command.branchId, productId: command.productId, quantity: quantity.toString(), operationId: command.operationId }, occurredAt: now });
      return inventorySuccess({ operationId: command.operationId, balance: balanceView(next) });
    });
  }
}

export class ReceiveInventoryUseCase extends SingleBalanceMutation { constructor(dependencies: Dependencies) { super(dependencies, "inventory.receive", "Receive", "Receive", (quantity) => ({ onHand: quantity }), "InventoryReceived"); } }
export class IssueInventoryUseCase extends SingleBalanceMutation { constructor(dependencies: Dependencies) { super(dependencies, "inventory.issue", "Issue", "Issue", (quantity) => ({ onHand: -quantity }), "InventoryIssued"); } }
export class MarkInventoryDamagedUseCase extends SingleBalanceMutation { constructor(dependencies: Dependencies) { super(dependencies, "inventory.damage", "MarkDamaged", "MarkDamaged", (quantity) => ({ damaged: quantity }), "InventoryMarkedDamaged"); } }
export class RestoreDamagedInventoryUseCase extends SingleBalanceMutation { constructor(dependencies: Dependencies) { super(dependencies, "inventory.damage", "RestoreDamaged", "RestoreDamaged", (quantity) => ({ damaged: -quantity }), "InventoryDamageRestored"); } }

export class CorrectInventoryUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  execute(command: MutationCommand & { readonly branchId: string; readonly productId: string; readonly quantity: string; readonly direction: "Increase" | "Decrease"; readonly reasonCode: string; readonly note?: string }) {
    const target = new class extends SingleBalanceMutation { constructor(dependencies: Dependencies) { super(dependencies, "inventory.adjust", `Correction${command.direction}`, command.direction === "Increase" ? "CorrectionIncrease" : "CorrectionDecrease", (quantity) => ({ onHand: command.direction === "Increase" ? quantity : -quantity }), "InventoryCorrected"); } }(this.dependencies);
    return target.execute(command);
  }
}

export class ReserveInventoryUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  execute(command: MutationCommand & { readonly branchId: string; readonly productId: string; readonly quantity: string; readonly reasonCode?: string }): Promise<InventoryResult<InventoryMutationView>> {
    if (!can(command.context, "inventory.reserve")) return Promise.resolve(inventoryFailure("Forbidden")); if (!inScope(command.context, command.branchId)) return Promise.resolve(inventoryFailure("BranchNotFound"));
    let quantity: bigint; try { quantity = parsePositiveQuantity(command.quantity); } catch { return Promise.resolve(inventoryFailure("InvalidQuantity")); }
    return run(this.dependencies, command, "Reserve", { branchId: command.branchId, productId: command.productId, quantity: quantity.toString() }, async (transaction, now) => {
      const invalid = await validateActiveScope(transaction, command.context, command.branchId, command.productId); if (invalid) return inventoryFailure(invalid);
      const current = await transaction.inventory.lockBalance(command.context.workspaceId, command.branchId, command.productId, now); const next = changeBalance(current, { reserved: quantity }, now); const reservationId = this.dependencies.identifiers.next();
      if (!await transaction.inventory.saveBalance(next, current.revision)) throw new InventoryTransactionAbort("InventoryConflict");
      const reservation: InventoryReservation = Object.freeze({ workspaceId: command.context.workspaceId, reservationId, branchId: command.branchId, productId: command.productId, quantity, remainingQuantity: quantity, status: "Active", createdByActorId: command.context.actorId, createdAt: now, updatedAt: now });
      await transaction.inventory.createReservation(reservation); await transaction.inventory.appendMovement(movement(this.dependencies, command, "Reserve", quantity, now, { reservationId }));
      await transaction.audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "InventoryReserved", metadata: { branchId: command.branchId, productId: command.productId, quantity: quantity.toString(), reservationId, operationId: command.operationId }, occurredAt: now });
      return inventorySuccess({ operationId: command.operationId, balance: balanceView(next), reservationId, reservationStatus: "Active", remainingQuantity: quantity.toString() });
    });
  }
}

abstract class ReservationMutation {
  constructor(protected readonly dependencies: Dependencies, private readonly kind: "Release" | "Fulfill") {}
  execute(command: MutationCommand & { readonly branchId: string; readonly reservationId: string; readonly quantity: string }): Promise<InventoryResult<InventoryMutationView>> {
    if (!can(command.context, "inventory.reserve")) return Promise.resolve(inventoryFailure("Forbidden")); if (!inScope(command.context, command.branchId)) return Promise.resolve(inventoryFailure("BranchNotFound"));
    let quantity: bigint; try { quantity = parsePositiveQuantity(command.quantity); } catch { return Promise.resolve(inventoryFailure("InvalidQuantity")); }
    return run(this.dependencies, command, this.kind, { branchId: command.branchId, reservationId: command.reservationId, quantity: quantity.toString() }, async (transaction, now) => {
      const reservation = await transaction.inventory.findReservation(command.context.workspaceId, command.reservationId, true); if (!reservation || reservation.branchId !== command.branchId) return inventoryFailure("ReservationNotFound");
      const invalid = await validateActiveScope(transaction, command.context, command.branchId, reservation.productId); if (invalid) return inventoryFailure(invalid);
      if ((reservation.status !== "Active" && reservation.status !== "PartiallyFulfilled") || quantity > reservation.remainingQuantity) return inventoryFailure("ReservationNotActive");
      const current = await transaction.inventory.lockBalance(command.context.workspaceId, command.branchId, reservation.productId, now); const next = changeBalance(current, this.kind === "Release" ? { reserved: -quantity } : { reserved: -quantity, onHand: -quantity }, now); const remaining = reservation.remainingQuantity - quantity;
      const status = this.kind === "Release" ? (remaining === BigInt(0) ? "Released" as const : "Active" as const) : (remaining === BigInt(0) ? "Fulfilled" as const : "PartiallyFulfilled" as const);
      const updated: InventoryReservation = Object.freeze({ ...reservation, remainingQuantity: remaining, status, updatedAt: now });
      if (!await transaction.inventory.saveBalance(next, current.revision)) throw new InventoryTransactionAbort("InventoryConflict"); await transaction.inventory.updateReservation(updated);
      await transaction.inventory.appendMovement(movement(this.dependencies, { ...command, productId: reservation.productId }, this.kind === "Release" ? "ReleaseReservation" : "FulfillReservation", quantity, now, { reservationId: reservation.reservationId }));
      await transaction.audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: this.kind === "Release" ? "InventoryReservationReleased" : "InventoryReservationFulfilled", metadata: { branchId: command.branchId, productId: reservation.productId, quantity: quantity.toString(), reservationId: reservation.reservationId, operationId: command.operationId }, occurredAt: now });
      return inventorySuccess({ operationId: command.operationId, balance: balanceView(next), reservationId: reservation.reservationId, reservationStatus: status, remainingQuantity: remaining.toString() });
    });
  }
}
export class ReleaseInventoryReservationUseCase extends ReservationMutation { constructor(dependencies: Dependencies) { super(dependencies, "Release"); } }
export class FulfillInventoryReservationUseCase extends ReservationMutation { constructor(dependencies: Dependencies) { super(dependencies, "Fulfill"); } }

export class TransferInventoryUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  execute(command: MutationCommand & { readonly sourceBranchId: string; readonly destinationBranchId: string; readonly productId: string; readonly quantity: string; readonly reasonCode?: string }): Promise<InventoryResult<InventoryMutationView>> {
    if (!can(command.context, "inventory.transfer")) return Promise.resolve(inventoryFailure("Forbidden")); if (!inScope(command.context, command.sourceBranchId) || !inScope(command.context, command.destinationBranchId)) return Promise.resolve(inventoryFailure("BranchNotFound")); if (command.sourceBranchId === command.destinationBranchId) return Promise.resolve(inventoryFailure("InvalidInput"));
    let quantity: bigint; try { quantity = parsePositiveQuantity(command.quantity); } catch { return Promise.resolve(inventoryFailure("InvalidQuantity")); }
    return run(this.dependencies, command, "Transfer", { sourceBranchId: command.sourceBranchId, destinationBranchId: command.destinationBranchId, productId: command.productId, quantity: quantity.toString() }, async (transaction, now) => {
      const sourceInvalid = await validateActiveScope(transaction, command.context, command.sourceBranchId, command.productId); if (sourceInvalid) return inventoryFailure(sourceInvalid); const destinationInvalid = await validateActiveScope(transaction, command.context, command.destinationBranchId, command.productId); if (destinationInvalid) return inventoryFailure(destinationInvalid);
      const ordered = [command.sourceBranchId, command.destinationBranchId].sort(); const locked = new Map<string, InventoryBalance>(); for (const branchId of ordered) locked.set(branchId, await transaction.inventory.lockBalance(command.context.workspaceId, branchId, command.productId, now));
      const source = locked.get(command.sourceBranchId)!; const destination = locked.get(command.destinationBranchId)!; const nextSource = changeBalance(source, { onHand: -quantity }, now); const nextDestination = changeBalance(destination, { onHand: quantity }, now); const transferId = this.dependencies.identifiers.next();
      if (!await transaction.inventory.saveBalance(nextSource, source.revision)) throw new InventoryTransactionAbort("InventoryConflict");
      if (!await transaction.inventory.saveBalance(nextDestination, destination.revision)) throw new InventoryTransactionAbort("InventoryConflict");
      await transaction.inventory.appendMovement(movement(this.dependencies, { ...command, branchId: command.sourceBranchId }, "TransferOut", quantity, now, { correlationId: transferId })); await transaction.inventory.appendMovement(movement(this.dependencies, { ...command, branchId: command.destinationBranchId }, "TransferIn", quantity, now, { correlationId: transferId }));
      await transaction.audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "InventoryTransferred", metadata: { sourceBranchId: command.sourceBranchId, destinationBranchId: command.destinationBranchId, productId: command.productId, quantity: quantity.toString(), transferId, operationId: command.operationId }, occurredAt: now });
      return inventorySuccess({ operationId: command.operationId, transferId, sourceBalance: balanceView(nextSource), destinationBalance: balanceView(nextDestination) });
    });
  }
}

export class GetBranchProductInventoryUseCase {
  constructor(private readonly unitOfWork: InventoryUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string }): Promise<InventoryResult<InventoryBalanceView>> {
    const detailed = can(command.context, "inventory.quantity.view"); const availability = can(command.context, "inventory.availability.view"); if (!detailed && !availability) return inventoryFailure("Forbidden"); if (!inScope(command.context, command.branchId)) return inventoryFailure("BranchNotFound");
    return this.unitOfWork.execute(async (transaction) => { const branch = await transaction.scope.findBranch(command.context.workspaceId, command.branchId); if (!branch) return inventoryFailure("BranchNotFound"); if (!await transaction.scope.findProduct(command.context.workspaceId, command.productId)) return inventoryFailure("ProductNotFound"); const balance = await transaction.inventory.getBalance(command.context.workspaceId, command.branchId, command.productId); const value = balance ?? { workspaceId: command.context.workspaceId, branchId: command.branchId, productId: command.productId, onHand: BigInt(0), reserved: BigInt(0), damaged: BigInt(0), revision: 0, updatedAt: new Date(0) }; const full = balanceView(value); return inventorySuccess(detailed ? full : { ...full, onHand: "Hidden", reserved: "Hidden", damaged: "Hidden" }); });
  }
}

export class ListInventoryMovementsUseCase {
  constructor(private readonly unitOfWork: InventoryUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string; readonly limit?: number }): Promise<InventoryResult<readonly InventoryMovementView[]>> {
    if (!can(command.context, "inventory.quantity.view")) return inventoryFailure("Forbidden"); if (!inScope(command.context, command.branchId)) return inventoryFailure("BranchNotFound"); const limit = command.limit ?? 100; if (!Number.isInteger(limit) || limit < 1 || limit > 200) return inventoryFailure("InvalidInput");
    return this.unitOfWork.execute(async (transaction) => { if (!await transaction.scope.findBranch(command.context.workspaceId, command.branchId)) return inventoryFailure("BranchNotFound"); if (!await transaction.scope.findProduct(command.context.workspaceId, command.productId)) return inventoryFailure("ProductNotFound"); const values = await transaction.inventory.listMovements(command.context.workspaceId, command.branchId, command.productId, limit); return inventorySuccess(Object.freeze(values.map((item) => Object.freeze({ movementId: item.movementId, movementType: item.movementType, quantity: item.quantity.toString(), occurredAt: item.occurredAt.toISOString(), createdByActorId: item.createdByActorId, operationId: item.operationId, ...(item.reservationId ? { reservationId: item.reservationId } : {}), ...(item.correlationId ? { correlationId: item.correlationId } : {}), ...(item.reasonCode ? { reasonCode: item.reasonCode } : {}), ...(item.note ? { note: item.note } : {}) })))); });
  }
}
