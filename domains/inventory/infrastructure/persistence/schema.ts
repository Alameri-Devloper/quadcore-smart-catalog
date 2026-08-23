import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { catalogProducts } from "../../../catalog/infrastructure/persistence/schema";
import { workspaceBranchReferences, workspaces } from "../../../workspace/infrastructure/persistence/schema";

export const inventoryBalances = pgTable("inventory_balances", {
  workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(), productId: text("product_id").notNull(),
  onHandQuantity: bigint("on_hand_quantity", { mode: "bigint" }).notNull().default(sql`0`), reservedQuantity: bigint("reserved_quantity", { mode: "bigint" }).notNull().default(sql`0`), damagedQuantity: bigint("damaged_quantity", { mode: "bigint" }).notNull().default(sql`0`),
  revision: bigint("revision", { mode: "number" }).notNull().default(1), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ name: "inventory_balances_pk", columns: [table.workspaceId, table.branchId, table.productId] }),
  foreignKey({ name: "inventory_balances_branch_fk", columns: [table.workspaceId, table.branchId], foreignColumns: [workspaceBranchReferences.workspaceId, workspaceBranchReferences.branchId] }).onDelete("restrict"),
  foreignKey({ name: "inventory_balances_product_fk", columns: [table.workspaceId, table.productId], foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId] }).onDelete("restrict"),
  index("inventory_balances_product_idx").on(table.workspaceId, table.productId, table.branchId),
  check("inventory_balances_non_negative", sql`${table.onHandQuantity} >= 0 AND ${table.reservedQuantity} >= 0 AND ${table.damagedQuantity} >= 0 AND ${table.onHandQuantity} - ${table.reservedQuantity} - ${table.damagedQuantity} >= 0`),
  check("inventory_balances_revision", sql`${table.revision} BETWEEN 1 AND 9007199254740991`),
]);

export const inventoryOperations = pgTable("inventory_operations", {
  workspaceId: text("workspace_id").notNull(), operationId: text("operation_id").notNull(), operationType: text("operation_type").notNull(), requestFingerprint: text("request_fingerprint").notNull(), result: jsonb("result").$type<Readonly<Record<string, unknown>> | null>(), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ name: "inventory_operations_pk", columns: [table.workspaceId, table.operationId] }),
  foreignKey({ name: "inventory_operations_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  check("inventory_operations_non_empty", sql`btrim(${table.operationId}) <> '' AND btrim(${table.operationType}) <> ''`),
  check("inventory_operations_fingerprint", sql`${table.requestFingerprint} ~ '^[a-f0-9]{64}$'`),
]);

export const inventoryReservations = pgTable("inventory_reservations", {
  workspaceId: text("workspace_id").notNull(), reservationId: text("reservation_id").notNull(), branchId: text("branch_id").notNull(), productId: text("product_id").notNull(),
  quantity: bigint("quantity", { mode: "bigint" }).notNull(), remainingQuantity: bigint("remaining_quantity", { mode: "bigint" }).notNull(), status: text("status").notNull(), createdByActorId: text("created_by_actor_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ name: "inventory_reservations_pk", columns: [table.workspaceId, table.reservationId] }),
  foreignKey({ name: "inventory_reservations_branch_fk", columns: [table.workspaceId, table.branchId], foreignColumns: [workspaceBranchReferences.workspaceId, workspaceBranchReferences.branchId] }).onDelete("restrict"),
  foreignKey({ name: "inventory_reservations_product_fk", columns: [table.workspaceId, table.productId], foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId] }).onDelete("restrict"),
  index("inventory_reservations_product_idx").on(table.workspaceId, table.branchId, table.productId, table.status),
  check("inventory_reservations_quantity", sql`${table.quantity} > 0 AND ${table.remainingQuantity} >= 0 AND ${table.remainingQuantity} <= ${table.quantity}`),
  check("inventory_reservations_status", sql`${table.status} IN ('Active','PartiallyFulfilled','Fulfilled','Released')`),
  check("inventory_reservations_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
]);

export const inventoryMovements = pgTable("inventory_movements", {
  workspaceId: text("workspace_id").notNull(), branchId: text("branch_id").notNull(), movementId: text("movement_id").notNull(), productId: text("product_id").notNull(), movementType: text("movement_type").notNull(), quantity: bigint("quantity", { mode: "bigint" }).notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(), createdByActorId: text("created_by_actor_id").notNull(), operationId: text("operation_id").notNull(), reservationId: text("reservation_id"), correlationId: text("correlation_id"), reasonCode: text("reason_code"), note: text("note"),
}, (table) => [
  primaryKey({ name: "inventory_movements_pk", columns: [table.workspaceId, table.movementId] }),
  foreignKey({ name: "inventory_movements_branch_fk", columns: [table.workspaceId, table.branchId], foreignColumns: [workspaceBranchReferences.workspaceId, workspaceBranchReferences.branchId] }).onDelete("restrict"),
  foreignKey({ name: "inventory_movements_product_fk", columns: [table.workspaceId, table.productId], foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId] }).onDelete("restrict"),
  foreignKey({ name: "inventory_movements_operation_fk", columns: [table.workspaceId, table.operationId], foreignColumns: [inventoryOperations.workspaceId, inventoryOperations.operationId] }).onDelete("restrict"),
  index("inventory_movements_history_idx").on(table.workspaceId, table.branchId, table.productId, table.occurredAt),
  index("inventory_movements_correlation_idx").on(table.workspaceId, table.correlationId),
  uniqueIndex("inventory_movements_operation_branch_type_uq").on(table.workspaceId, table.operationId, table.branchId, table.movementType),
  check("inventory_movements_type", sql`${table.movementType} IN ('Receive','Issue','Reserve','ReleaseReservation','FulfillReservation','MarkDamaged','RestoreDamaged','TransferOut','TransferIn','CorrectionIncrease','CorrectionDecrease')`),
  check("inventory_movements_quantity", sql`${table.quantity} > 0`),
  check("inventory_movements_reason", sql`${table.reasonCode} IS NULL OR (btrim(${table.reasonCode}) <> '' AND length(${table.reasonCode}) <= 64)`),
  check("inventory_movements_note", sql`${table.note} IS NULL OR length(${table.note}) <= 500`),
]);
