import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
