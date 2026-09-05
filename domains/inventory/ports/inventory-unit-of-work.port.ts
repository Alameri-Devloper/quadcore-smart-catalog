import type { InventoryBalance, InventoryMovement, InventoryReservation, InventoryReservationStatus } from "../domain/inventory";
import type { ReservationCursorPosition } from "../domain/reservation-management-query";

export interface ReservationListQuery {
  readonly workspaceId: string;
  readonly branchId: string;
  readonly productId: string;
  readonly statuses: readonly InventoryReservationStatus[];
  readonly cursor: ReservationCursorPosition | null;
  readonly limit: number;
}

export interface InventoryScopeRepository { findBranch(workspaceId: string, branchId: string): Promise<{ readonly status: "Active" | "Inactive" } | null>; findProduct(workspaceId: string, productId: string): Promise<{ readonly lifecycleState: string } | null> }
export interface InventoryRepository {
  getBalance(workspaceId: string, branchId: string, productId: string): Promise<InventoryBalance | null>;
  lockBalance(workspaceId: string, branchId: string, productId: string, now: Date): Promise<InventoryBalance>;
  saveBalance(balance: InventoryBalance, expectedRevision: number): Promise<boolean>;
  appendMovement(movement: InventoryMovement): Promise<void>;
  listMovements(workspaceId: string, branchId: string, productId: string, limit: number): Promise<readonly InventoryMovement[]>;
  claimOperation(input: { readonly workspaceId: string; readonly operationId: string; readonly operationType: string; readonly fingerprint: string; readonly createdAt: Date }): Promise<{ readonly type: "Claimed" } | { readonly type: "Existing"; readonly fingerprint: string; readonly result: Readonly<Record<string, unknown>> | null }>;
  completeOperation(workspaceId: string, operationId: string, result: Readonly<Record<string, unknown>>): Promise<void>;
  createReservation(reservation: InventoryReservation): Promise<void>;
  listReservations(query: ReservationListQuery): Promise<readonly InventoryReservation[]>;
  findReservation(workspaceId: string, reservationId: string, forUpdate: boolean): Promise<InventoryReservation | null>;
  updateReservation(reservation: InventoryReservation): Promise<void>;
}
export interface InventoryAuditRepository { append(input: { readonly workspaceId: string; readonly actorId: string; readonly eventType: string; readonly metadata: Readonly<Record<string, string | number | boolean | null>>; readonly occurredAt: Date }): Promise<void> }
export interface InventoryTransactionContext { readonly scope: InventoryScopeRepository; readonly inventory: InventoryRepository; readonly audit: InventoryAuditRepository }
export interface InventoryUnitOfWork { execute<T>(work: (context: InventoryTransactionContext) => Promise<T>): Promise<T> }
export interface InventoryIdentifierGenerator { next(): string }
export interface InventoryClock { now(): Date }
export interface InventoryFingerprint { create(value: Readonly<Record<string, string>>): string }
