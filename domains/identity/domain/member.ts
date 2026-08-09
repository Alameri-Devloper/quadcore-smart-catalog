import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";

export type WorkspaceRole = "Owner" | "Staff";
export const BRANCH_SCOPES = ["AllBranches", "SelectedBranches"] as const;
export type BranchScope = (typeof BRANCH_SCOPES)[number];

export interface WorkspaceMemberProfile {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly recoveryPhone: E164PhoneNumber;
  readonly recoveryContactVersion: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WorkspaceMembership {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly role: WorkspaceRole;
  readonly branchScope: BranchScope;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const createMemberProfile = (
  input: WorkspaceMemberProfile,
): WorkspaceMemberProfile => {
  if (!input.displayName || input.displayName.trim() !== input.displayName) {
    throw new Error("MemberDisplayNameInvalid");
  }
  if (input.recoveryContactVersion !== 1 || input.createdAt.getTime() !== input.updatedAt.getTime()) {
    throw new Error("MemberProfileStateInvalid");
  }
  return Object.freeze({ ...input, createdAt: new Date(input.createdAt), updatedAt: new Date(input.updatedAt) });
};

export const createMembership = (
  input: WorkspaceMembership,
): WorkspaceMembership => {
  if (!BRANCH_SCOPES.includes(input.branchScope)) {
    throw new Error("BranchScopeInvalid");
  }
  if (input.role === "Owner" && input.branchScope !== "AllBranches") {
    throw new Error("OwnerBranchScopeInvalid");
  }
  return Object.freeze({ ...input, createdAt: new Date(input.createdAt), updatedAt: new Date(input.updatedAt) });
};
