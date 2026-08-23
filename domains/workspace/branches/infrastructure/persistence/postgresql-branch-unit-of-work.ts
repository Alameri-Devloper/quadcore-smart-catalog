import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import { securityAuditEvents } from "../../../../../shared/audit/infrastructure/persistence/schema";
import { workspaceBranchReferences } from "../../../infrastructure/persistence/schema";
import { Branch } from "../../domain/branch";
import type { BranchAuditRepository, BranchRepository, BranchTransactionContext, BranchUnitOfWork } from "../../ports/branch-unit-of-work.port";

const map = (row: typeof workspaceBranchReferences.$inferSelect) => Branch.rehydrate({ workspaceId: row.workspaceId, branchId: row.branchId, code: row.code, displayName: row.displayName, status: row.status as "Active" | "Inactive", sortOrder: row.sortOrder, revision: row.revision, createdAt: row.createdAt, updatedAt: row.updatedAt });

class PostgreSqlBranchRepository implements BranchRepository {
  constructor(private readonly database: PlatformDatabase) {}
  async find(workspaceId: string, branchId: string, forUpdate = false) {
    const query = this.database.select().from(workspaceBranchReferences).where(and(eq(workspaceBranchReferences.workspaceId, workspaceId), eq(workspaceBranchReferences.branchId, branchId))).limit(1);
    const rows = forUpdate ? await query.for("update") : await query;
    return rows[0] ? map(rows[0]) : null;
  }
  async list(workspaceId: string) { const rows = await this.database.select().from(workspaceBranchReferences).where(eq(workspaceBranchReferences.workspaceId, workspaceId)).orderBy(asc(workspaceBranchReferences.sortOrder), asc(workspaceBranchReferences.displayName), asc(workspaceBranchReferences.branchId)); return Object.freeze(rows.map(map)); }
  async create(branch: Branch) {
    const value = branch.value;
    try {
      const rows = await this.database.insert(workspaceBranchReferences).values(value).onConflictDoNothing().returning({ branchId: workspaceBranchReferences.branchId });
      if (rows.length === 1) return "Created" as const;
      const code = await this.database.select({ branchId: workspaceBranchReferences.branchId }).from(workspaceBranchReferences).where(and(eq(workspaceBranchReferences.workspaceId, value.workspaceId), eq(workspaceBranchReferences.code, value.code))).limit(1);
      return code.length ? "CodeConflict" as const : "IdConflict" as const;
    } catch (error) { if (typeof error === "object" && error && "code" in error && error.code === "23505") return "CodeConflict" as const; throw error; }
  }
  async update(branch: Branch, expectedRevision: number) {
    const value = branch.value;
    const rows = await this.database.update(workspaceBranchReferences).set({ displayName: value.displayName, status: value.status, sortOrder: value.sortOrder, revision: value.revision, updatedAt: value.updatedAt }).where(and(eq(workspaceBranchReferences.workspaceId, value.workspaceId), eq(workspaceBranchReferences.branchId, value.branchId), eq(workspaceBranchReferences.revision, expectedRevision))).returning({ branchId: workspaceBranchReferences.branchId });
    if (rows.length) return "Updated" as const;
    const exists = await this.database.select({ branchId: workspaceBranchReferences.branchId }).from(workspaceBranchReferences).where(and(eq(workspaceBranchReferences.workspaceId, value.workspaceId), eq(workspaceBranchReferences.branchId, value.branchId))).limit(1);
    return exists.length ? "Conflict" as const : "NotFound" as const;
  }
}

class PostgreSqlBranchAuditRepository implements BranchAuditRepository {
  constructor(private readonly database: PlatformDatabase) {}
  async append(input: Parameters<BranchAuditRepository["append"]>[0]) { await this.database.insert(securityAuditEvents).values({ workspaceId: input.workspaceId, auditId: randomUUID(), eventType: input.eventType, actorId: input.actorId, subjectActorId: null, resultCode: "Succeeded", metadata: { branchId: input.branchId, ...input.metadata }, occurredAt: input.occurredAt }); }
}

export class PostgreSqlBranchUnitOfWork implements BranchUnitOfWork {
  constructor(private readonly database: PlatformDatabase) {}
  execute<T>(work: (context: BranchTransactionContext) => Promise<T>): Promise<T> { return this.database.transaction(async (transaction) => { const database = transaction as unknown as PlatformDatabase; return work(Object.freeze({ branches: new PostgreSqlBranchRepository(database), audit: new PostgreSqlBranchAuditRepository(database) })); }); }
}
