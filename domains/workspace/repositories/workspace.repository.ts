import type { WorkspaceCommunicationSettings, Workspace } from "../domain/workspace";
import type { WorkspaceCode } from "../domain/workspace";
import type { WorkspaceId } from "../../../shared/domain/scoped-identity";

export type WorkspaceCreateOutcome = "Created" | "WorkspaceCodeAlreadyExists" | "WorkspaceIdAlreadyExists";

export interface WorkspaceRepository {
  create(workspace: Workspace): Promise<WorkspaceCreateOutcome>;
  findById(workspaceId: WorkspaceId): Promise<Workspace | null>;
  findByCode(code: WorkspaceCode, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null>;
}

export interface WorkspaceCommunicationSettingsRepository {
  create(settings: WorkspaceCommunicationSettings): Promise<void>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceCommunicationSettings | null>;
}
