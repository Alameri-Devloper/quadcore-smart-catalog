export type InventoryMovementType = "Receive" | "Issue" | "Reserve" | "ReleaseReservation" | "FulfillReservation" | "MarkDamaged" | "RestoreDamaged" | "TransferOut" | "TransferIn" | "CorrectionIncrease" | "CorrectionDecrease";
export type InventoryReservationStatus = "Active" | "PartiallyFulfilled" | "Fulfilled" | "Released";

export interface InventoryBalance { readonly workspaceId: string; readonly branchId: string; readonly productId: string; readonly onHand: bigint; readonly reserved: bigint; readonly damaged: bigint; readonly revision: number; readonly updatedAt: Date }
export interface InventoryMovement { readonly workspaceId: string; readonly branchId: string; readonly movementId: string; readonly productId: string; readonly movementType: InventoryMovementType; readonly quantity: bigint; readonly occurredAt: Date; readonly createdAt: Date; readonly createdByActorId: string; readonly operationId: string; readonly reservationId?: string; readonly correlationId?: string; readonly reasonCode?: string; readonly note?: string }
export interface InventoryReservation { readonly workspaceId: string; readonly reservationId: string; readonly branchId: string; readonly productId: string; readonly quantity: bigint; readonly remainingQuantity: bigint; readonly status: InventoryReservationStatus; readonly createdByActorId: string; readonly createdAt: Date; readonly updatedAt: Date }

const ZERO = BigInt(0);
export const MAX_INVENTORY_QUANTITY = BigInt(Number.MAX_SAFE_INTEGER);
export const availableQuantity = (balance: InventoryBalance): bigint => balance.onHand - balance.reserved - balance.damaged;
export const emptyInventoryBalance = (workspaceId: string, branchId: string, productId: string, now: Date): InventoryBalance => Object.freeze({ workspaceId, branchId, productId, onHand: ZERO, reserved: ZERO, damaged: ZERO, revision: 1, updatedAt: new Date(now) });

export const parsePositiveQuantity = (value: string): bigint => {
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error("InvalidQuantity");
  const quantity = BigInt(value); if (quantity > MAX_INVENTORY_QUANTITY) throw new Error("InvalidQuantity"); return quantity;
};
export const normalizeOperationId = (value: string): string => { const result = value.trim(); if (result.length < 8 || result.length > 128) throw new Error("InvalidOperationId"); return result; };
export const normalizeReasonCode = (value?: string): string | undefined => { if (value === undefined) return undefined; const result = value.trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(result)) throw new Error("InvalidReasonCode"); return result; };
export const normalizeSafeNote = (value?: string): string | undefined => { if (value === undefined) return undefined; const result = value.trim(); if (!result || result.length > 500) throw new Error("InvalidNote"); return result; };

export const changeBalance = (balance: InventoryBalance, delta: { readonly onHand?: bigint; readonly reserved?: bigint; readonly damaged?: bigint }, now: Date): InventoryBalance => {
  const next = Object.freeze({ ...balance, onHand: balance.onHand + (delta.onHand ?? ZERO), reserved: balance.reserved + (delta.reserved ?? ZERO), damaged: balance.damaged + (delta.damaged ?? ZERO), revision: balance.revision + 1, updatedAt: new Date(now) });
  if (next.onHand < ZERO || next.reserved < ZERO || next.damaged < ZERO || availableQuantity(next) < ZERO || next.onHand > MAX_INVENTORY_QUANTITY) throw new Error("InsufficientAvailableStock");
  return next;
};
