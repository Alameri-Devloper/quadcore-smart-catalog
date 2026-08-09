import { eq } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../shared/infrastructure/persistence/database";
import { E164PhoneNumber } from "../../../../shared/domain/e164-phone-number";
import { WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { Workspace, WorkspaceCode, type WorkspaceCommunicationSettings } from "../../domain/workspace";
import type { WorkspaceCommunicationSettingsRepository, WorkspaceCreateOutcome, WorkspaceRepository } from "../../repositories/workspace.repository";
import { workspaceCommunicationSettings, workspaces } from "./schema";

const mapWorkspace = (row: typeof workspaces.$inferSelect): Workspace => Workspace.create({
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

  async findById(workspaceId: WorkspaceId): Promise<Workspace | null> {
    const rows = await this.database.select().from(workspaces)
      .where(eq(workspaces.workspaceId, workspaceId.value)).limit(1);
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async findByCode(code: WorkspaceCode, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null> {
    const base = this.database.select().from(workspaces).where(eq(workspaces.workspaceCode, code.value)).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapWorkspace(rows[0]) : null;
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
}
