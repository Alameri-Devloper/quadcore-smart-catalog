import { and, eq, inArray } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../shared/infrastructure/persistence/database";
import { E164PhoneNumber } from "../../../../shared/domain/e164-phone-number";
import { WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { Workspace, WorkspaceCode, type WorkspaceBranchReferenceStatus, type WorkspaceCommunicationSettings } from "../../domain/workspace";
import type { WorkspaceBranchReferenceRepository, WorkspaceCommunicationSettingsRepository, WorkspaceCreateOutcome, WorkspaceRepository } from "../../repositories/workspace.repository";
import { workspaceBranchReferences, workspaceCommunicationSettings, workspaces } from "./schema";

const mapWorkspace = (row: typeof workspaces.$inferSelect): Workspace => Workspace.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  companyId: row.companyId,
  code: WorkspaceCode.create(row.workspaceCode),
  displayName: row.displayName,
  passwordRecoveryPolicy: row.passwordRecoveryPolicy as "OwnerManagedOnly" | "WhatsAppOtpWithOwnerFallback",
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PostgreSqlWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(workspace: Workspace): Promise<WorkspaceCreateOutcome> {
    const inserted = await this.database.insert(workspaces).values({
      workspaceId: workspace.workspaceId.value,
      companyId: workspace.companyId,
      workspaceCode: workspace.code.value,
      displayName: workspace.displayName,
      passwordRecoveryPolicy: workspace.passwordRecoveryPolicy,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }).onConflictDoNothing().returning({ workspaceId: workspaces.workspaceId });
    if (inserted.length === 1) return "Created";
    const codeMatch = await this.database.select({ workspaceId: workspaces.workspaceId })
      .from(workspaces).where(eq(workspaces.workspaceCode, workspace.code.value)).limit(1);
    return codeMatch.length > 0 ? "WorkspaceCodeAlreadyExists" : "WorkspaceIdAlreadyExists";
  }

  async findById(workspaceId: WorkspaceId, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null> {
    const base = this.database.select().from(workspaces)
      .where(eq(workspaces.workspaceId, workspaceId.value)).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async findByCode(code: WorkspaceCode, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null> {
    const base = this.database.select().from(workspaces).where(eq(workspaces.workspaceCode, code.value)).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async update(workspace: Workspace, expectedUpdatedAt: Date): Promise<"Updated" | "WorkspaceNotFound" | "WorkspaceUpdateConflict"> {
    const updated = await this.database.update(workspaces).set({
      passwordRecoveryPolicy: workspace.passwordRecoveryPolicy,
      updatedAt: workspace.updatedAt,
    }).where(and(
      eq(workspaces.workspaceId, workspace.workspaceId.value),
      eq(workspaces.updatedAt, expectedUpdatedAt),
    )).returning({ workspaceId: workspaces.workspaceId });
    if (updated.length === 1) return "Updated";
    const exists = await this.database.select({ workspaceId: workspaces.workspaceId }).from(workspaces)
      .where(eq(workspaces.workspaceId, workspace.workspaceId.value)).limit(1);
    return exists.length === 0 ? "WorkspaceNotFound" : "WorkspaceUpdateConflict";
  }
}

export class PostgreSqlWorkspaceCommunicationSettingsRepository implements WorkspaceCommunicationSettingsRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(settings: WorkspaceCommunicationSettings): Promise<void> {
    await this.database.insert(workspaceCommunicationSettings).values({
      workspaceId: settings.workspaceId.value,
      defaultWhatsAppPhone: settings.defaultWhatsAppPhone.value,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceCommunicationSettings | null> {
    const rows = await this.database.select().from(workspaceCommunicationSettings)
      .where(eq(workspaceCommunicationSettings.workspaceId, workspaceId.value)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return Object.freeze({
      workspaceId,
      defaultWhatsAppPhone: E164PhoneNumber.create(row.defaultWhatsAppPhone),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  async update(settings: WorkspaceCommunicationSettings, expectedUpdatedAt: Date): Promise<"Updated" | "SettingsNotFound" | "SettingsUpdateConflict"> {
    const updated = await this.database.update(workspaceCommunicationSettings).set({
      defaultWhatsAppPhone: settings.defaultWhatsAppPhone.value,
      updatedAt: settings.updatedAt,
    }).where(and(
      eq(workspaceCommunicationSettings.workspaceId, settings.workspaceId.value),
      eq(workspaceCommunicationSettings.updatedAt, expectedUpdatedAt),
    )).returning({ workspaceId: workspaceCommunicationSettings.workspaceId });
    if (updated.length === 1) return "Updated";
    const exists = await this.database.select({ workspaceId: workspaceCommunicationSettings.workspaceId })
      .from(workspaceCommunicationSettings)
      .where(eq(workspaceCommunicationSettings.workspaceId, settings.workspaceId.value)).limit(1);
    return exists.length === 0 ? "SettingsNotFound" : "SettingsUpdateConflict";
  }
}

export class PostgreSqlWorkspaceBranchReferenceRepository implements WorkspaceBranchReferenceRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async findByIds(workspaceId: WorkspaceId, branchIds: readonly string[]) {
    if (branchIds.length === 0) return Object.freeze([]);
    const rows = await this.database.select({
      workspaceId: workspaceBranchReferences.workspaceId,
      branchId: workspaceBranchReferences.branchId,
      status: workspaceBranchReferences.status,
    }).from(workspaceBranchReferences).where(and(
      eq(workspaceBranchReferences.workspaceId, workspaceId.value),
      inArray(workspaceBranchReferences.branchId, [...branchIds]),
    ));
    return Object.freeze(rows.map((row) => Object.freeze({
      workspaceId: WorkspaceId.create(row.workspaceId),
      branchId: row.branchId,
      status: row.status as WorkspaceBranchReferenceStatus,
    })));
  }
}
