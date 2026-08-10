import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { WorkspaceId } from "../../../shared/domain/scoped-identity";

const WORKSPACE_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export type PasswordRecoveryPolicy =
  | "OwnerManagedOnly"
  | "WhatsAppOtpWithOwnerFallback";

export class WorkspaceCode {
  private constructor(readonly value: string) {}

  static create(value: string): WorkspaceCode {
    if (typeof value !== "string") throw new Error("WorkspaceCodeInvalid");
    const normalized = value.toLowerCase();
    if (!WORKSPACE_CODE_PATTERN.test(normalized) || normalized.includes("--")) {
      throw new Error("WorkspaceCodeInvalid");
    }
    return Object.freeze(new WorkspaceCode(normalized));
  }
}

export interface WorkspaceState {
  readonly workspaceId: WorkspaceId;
  readonly companyId: string;
  readonly code: WorkspaceCode;
  readonly displayName: string;
  readonly passwordRecoveryPolicy: PasswordRecoveryPolicy;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Workspace {
  private constructor(private readonly state: WorkspaceState) {}

  static create(input: WorkspaceState): Workspace {
    if (!input.companyId || input.companyId.trim() !== input.companyId) {
      throw new Error("CompanyIdInvalid");
    }
    if (!input.displayName || input.displayName.trim() !== input.displayName) {
      throw new Error("WorkspaceDisplayNameInvalid");
    }
    if (input.createdAt.getTime() !== input.updatedAt.getTime()) {
      throw new Error("WorkspaceTimestampsInvalid");
    }
    return Workspace.rehydrate(input);
  }

  static rehydrate(input: WorkspaceState): Workspace {
    if (
      !input.companyId
      || input.companyId.trim() !== input.companyId
      || !input.displayName
      || input.displayName.trim() !== input.displayName
      || !["OwnerManagedOnly", "WhatsAppOtpWithOwnerFallback"].includes(input.passwordRecoveryPolicy)
      || input.createdAt > input.updatedAt
    ) throw new Error("WorkspaceStateInvalid");
    return new Workspace({ ...input, createdAt: new Date(input.createdAt), updatedAt: new Date(input.updatedAt) });
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get companyId(): string { return this.state.companyId; }
  get code(): WorkspaceCode { return this.state.code; }
  get displayName(): string { return this.state.displayName; }
  get passwordRecoveryPolicy(): PasswordRecoveryPolicy { return this.state.passwordRecoveryPolicy; }
  get createdAt(): Date { return new Date(this.state.createdAt); }
  get updatedAt(): Date { return new Date(this.state.updatedAt); }
}

export interface WorkspaceCommunicationSettings {
  readonly workspaceId: WorkspaceId;
  readonly defaultWhatsAppPhone: E164PhoneNumber;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type WorkspaceBranchReferenceStatus = "Active" | "Inactive";

export interface WorkspaceBranchReference {
  readonly workspaceId: WorkspaceId;
  readonly branchId: string;
  readonly status: WorkspaceBranchReferenceStatus;
}

export const updateWorkspaceRecoveryPolicy = (
  workspace: Workspace,
  passwordRecoveryPolicy: PasswordRecoveryPolicy,
  at: Date,
): Workspace => {
  if (at < workspace.updatedAt) throw new Error("WorkspaceTimestampInvalid");
  return Workspace.rehydrate({
    workspaceId: workspace.workspaceId,
    companyId: workspace.companyId,
    code: workspace.code,
    displayName: workspace.displayName,
    passwordRecoveryPolicy,
    createdAt: workspace.createdAt,
    updatedAt: at,
  });
};

export const updateWorkspaceCommunicationSettings = (
  settings: WorkspaceCommunicationSettings,
  defaultWhatsAppPhone: E164PhoneNumber,
  at: Date,
): WorkspaceCommunicationSettings => {
  if (at < settings.updatedAt) throw new Error("WorkspaceCommunicationSettingsInvalid");
  return Object.freeze({ ...settings, defaultWhatsAppPhone, updatedAt: new Date(at) });
};
