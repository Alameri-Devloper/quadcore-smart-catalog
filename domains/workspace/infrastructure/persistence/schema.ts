import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspaces = pgTable(
  "workspaces",
  {
    workspaceId: text("workspace_id").notNull(),
    companyId: text("company_id").notNull(),
    workspaceCode: text("workspace_code").notNull(),
    displayName: text("display_name").notNull(),
    passwordRecoveryPolicy: text("password_recovery_policy").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "workspaces_pk", columns: [table.workspaceId] }),
    uniqueIndex("workspaces_code_uq").on(table.workspaceCode),
    index("workspaces_company_idx").on(table.companyId),
    check("workspaces_code_canonical", sql`${table.workspaceCode} ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' AND ${table.workspaceCode} NOT LIKE '%--%'`),
    check("workspaces_non_empty", sql`btrim(${table.companyId}) <> '' AND btrim(${table.displayName}) <> ''`),
    check("workspaces_recovery_policy", sql`${table.passwordRecoveryPolicy} IN ('OwnerManagedOnly','WhatsAppOtpWithOwnerFallback')`),
    check("workspaces_timestamps_ordered", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const workspaceCommunicationSettings = pgTable(
  "workspace_communication_settings",
  {
    workspaceId: text("workspace_id").notNull().references(() => workspaces.workspaceId, { onDelete: "cascade" }),
    defaultWhatsAppPhone: text("default_whatsapp_phone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "workspace_communication_settings_pk", columns: [table.workspaceId] }),
    check("workspace_communication_settings_phone", sql`${table.defaultWhatsAppPhone} ~ '^\\+[1-9][0-9]{7,14}$'`),
    check("workspace_communication_settings_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);

export const workspaceBranchReferences = pgTable(
  "workspace_branch_references",
  {
    workspaceId: text("workspace_id").notNull(),
    branchId: text("branch_id").notNull(),
    code: text("code").notNull().default(sql`'branch-' || substr(md5(random()::text), 1, 12)`),
    displayName: text("display_name").notNull().default("Branch"),
    status: text("status").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    revision: bigint("revision", { mode: "number" }).notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "workspace_branch_references_pk", columns: [table.workspaceId, table.branchId] }),
    foreignKey({
      name: "workspace_branch_references_workspace_fk",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.workspaceId],
    }).onDelete("restrict"),
    uniqueIndex("workspace_branch_references_workspace_code_uq").on(table.workspaceId, table.code),
    index("workspace_branch_references_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
    index("workspace_branch_references_lookup_idx").on(table.branchId, table.workspaceId, table.status),
    check("workspace_branch_references_branch_id", sql`btrim(${table.branchId}) <> ''`),
    check("workspace_branch_references_code", sql`${table.code} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${table.code}) <= 64`),
    check("workspace_branch_references_display_name", sql`btrim(${table.displayName}) <> '' AND length(${table.displayName}) <= 160`),
    check("workspace_branch_references_status", sql`${table.status} IN ('Active','Inactive')`),
    check("workspace_branch_references_sort_order", sql`${table.sortOrder} BETWEEN 0 AND 1000000`),
    check("workspace_branch_references_revision", sql`${table.revision} BETWEEN 1 AND 9007199254740991`),
    check("workspace_branch_references_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
  ],
);
