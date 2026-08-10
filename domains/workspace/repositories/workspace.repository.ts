import type { WorkspaceBranchReference, WorkspaceCommunicationSettings, Workspace } from "../domain/workspace";
import type { WorkspaceCode } from "../domain/workspace";
import type { WorkspaceId } from "../../../shared/domain/scoped-identity";

export type WorkspaceCreateOutcome = "Created" | "WorkspaceCodeAlreadyExists" | "WorkspaceIdAlreadyExists";

export interface WorkspaceRepository {
  create(workspace: Workspace): Promise<WorkspaceCreateOutcome>;
  findById(workspaceId: WorkspaceId, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null>;
  findByCode(code: WorkspaceCode, options?: { readonly forUpdate?: boolean }): Promise<Workspace | null>;
  update(workspace: Workspace, expectedUpdatedAt: Date): Promise<"Updated" | "WorkspaceNotFound" | "WorkspaceUpdateConflict">;
}

export interface WorkspaceCommunicationSettingsRepository {
  create(settings: WorkspaceCommunicationSettings): Promise<void>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceCommunicationSettings | null>;
  update(settings: WorkspaceCommunicationSettings, expectedUpdatedAt: Date): Promise<"Updated" | "SettingsNotFound" | "SettingsUpdateConflict">;
}

export interface WorkspaceBranchReferenceRepository {
  findByIds(workspaceId: WorkspaceId, branchIds: readonly string[]): Promise<readonly WorkspaceBranchReference[]>;
}
