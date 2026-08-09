import { sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "../../../../domains/workspace/infrastructure/persistence/schema";

export const securityAuditEvents = pgTable(
  "security_audit_events",
  {
    workspaceId: text("workspace_id").notNull(),
    auditId: text("audit_id").notNull(),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id"),
    subjectActorId: text("subject_actor_id"),
    resultCode: text("result_code").notNull(),
    metadata: jsonb("metadata").$type<Readonly<Record<string, string | number | boolean | null>>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "security_audit_events_pk", columns: [table.workspaceId, table.auditId] }),
    foreignKey({
      name: "security_audit_events_workspace_fk",
      columns: [table.workspaceId],
      foreignColumns: [workspaces.workspaceId],
    }).onDelete("restrict"),
    index("security_audit_events_actor_idx").on(table.workspaceId, table.actorId, table.occurredAt),
    index("security_audit_events_subject_idx").on(table.workspaceId, table.subjectActorId, table.occurredAt),
    check("security_audit_events_non_empty", sql`btrim(${table.auditId}) <> '' AND btrim(${table.eventType}) <> '' AND btrim(${table.resultCode}) <> ''`),
  ],
);
