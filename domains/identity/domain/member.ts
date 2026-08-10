import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";

export type WorkspaceRole = "Owner" | "Staff";
export const BRANCH_SCOPES = ["AllBranches", "SelectedBranches"] as const;
export type BranchScope = (typeof BRANCH_SCOPES)[number];
export type MemberLocale = "ar" | "en";

export interface WorkspaceMemberProfile {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly recoveryPhone: E164PhoneNumber;
  readonly recoveryContactVersion: number;
  readonly locale: MemberLocale;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WorkspaceMembership {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly role: WorkspaceRole;
  readonly branchScope: BranchScope;
  readonly branchIds: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly authorizationVersion: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

type MemberProfileCreation = Omit<WorkspaceMemberProfile, "locale"> & { readonly locale?: MemberLocale };

const validateDisplayName = (displayName: string): void => {
  if (!displayName || displayName.trim() !== displayName || displayName.length > 100) {
    throw new Error("MemberDisplayNameInvalid");
  }
};

const freezeProfile = (input: WorkspaceMemberProfile): WorkspaceMemberProfile => Object.freeze({
  ...input,
  createdAt: new Date(input.createdAt),
  updatedAt: new Date(input.updatedAt),
});

export const createMemberProfile = (
  input: MemberProfileCreation,
): WorkspaceMemberProfile => {
  validateDisplayName(input.displayName);
  if (input.recoveryContactVersion !== 1 || input.createdAt.getTime() !== input.updatedAt.getTime()) {
    throw new Error("MemberProfileStateInvalid");
  }
  return freezeProfile({ ...input, locale: input.locale ?? "ar" });
};

export const rehydrateMemberProfile = (input: WorkspaceMemberProfile): WorkspaceMemberProfile => {
  validateDisplayName(input.displayName);
  if (
    !["ar", "en"].includes(input.locale)
    || !Number.isSafeInteger(input.recoveryContactVersion)
    || input.recoveryContactVersion < 1
    || input.createdAt > input.updatedAt
  ) throw new Error("MemberProfileStateInvalid");
  return freezeProfile(input);
};

export const updateMemberProfileDetails = (
  profile: WorkspaceMemberProfile,
  displayName: string,
  locale: MemberLocale,
  at: Date,
): WorkspaceMemberProfile => {
  validateDisplayName(displayName);
  if (!["ar", "en"].includes(locale) || at < profile.updatedAt) throw new Error("MemberProfileStateInvalid");
  return freezeProfile({ ...profile, displayName, locale, updatedAt: at });
};

export const updateMemberRecoveryPhone = (
  profile: WorkspaceMemberProfile,
  recoveryPhone: E164PhoneNumber,
  at: Date,
): WorkspaceMemberProfile => {
  if (at < profile.updatedAt || profile.recoveryContactVersion >= Number.MAX_SAFE_INTEGER) {
    throw new Error("MemberProfileStateInvalid");
  }
  return freezeProfile({
    ...profile,
    recoveryPhone,
    recoveryContactVersion: profile.recoveryContactVersion + 1,
    updatedAt: at,
  });
};

type MembershipInput = Omit<WorkspaceMembership, "branchIds" | "permissionCodes"> & {
  readonly branchIds?: readonly string[];
  readonly permissionCodes?: readonly string[];
};

const validateMembershipAuthority = (
  role: WorkspaceRole,
  branchScope: BranchScope,
  branchIds: readonly string[],
  permissionCodes: readonly string[],
): void => {
  if (new Set(branchIds).size !== branchIds.length || branchIds.some((branchId) => !branchId || branchId.trim() !== branchId)) {
    throw new Error("BranchScopeInvalid");
  }
  if (new Set(permissionCodes).size !== permissionCodes.length) throw new Error("DuplicatePermissionCode");
  if (branchScope === "AllBranches" && branchIds.length > 0) throw new Error("BranchScopeInvalid");
  if (branchScope === "SelectedBranches" && branchIds.length === 0) throw new Error("BranchScopeInvalid");
  if (role === "Owner" && (branchScope !== "AllBranches" || branchIds.length > 0 || permissionCodes.length > 0)) {
    throw new Error("OwnerAuthorizationInvalid");
  }
};

export const createMembership = (
  input: MembershipInput,
): WorkspaceMembership => {
  if (!BRANCH_SCOPES.includes(input.branchScope)) {
    throw new Error("BranchScopeInvalid");
  }
  const branchIds = Object.freeze([...(input.branchIds ?? [])].sort());
  const permissionCodes = Object.freeze([...(input.permissionCodes ?? [])].sort());
  validateMembershipAuthority(input.role, input.branchScope, branchIds, permissionCodes);
  if (!Number.isSafeInteger(input.authorizationVersion) || input.authorizationVersion < 1) {
    throw new Error("AuthorizationVersionInvalid");
  }
  return Object.freeze({ ...input, branchIds, permissionCodes, createdAt: new Date(input.createdAt), updatedAt: new Date(input.updatedAt) });
};

export const changeMembershipAuthorization = (
  membership: WorkspaceMembership,
  authority: Pick<WorkspaceMembership, "role" | "branchScope" | "branchIds" | "permissionCodes">,
  at: Date,
): WorkspaceMembership => {
  if (at < membership.updatedAt || membership.authorizationVersion >= Number.MAX_SAFE_INTEGER) {
    throw new Error("AuthorizationVersionInvalid");
  }
  validateMembershipAuthority(authority.role, authority.branchScope, authority.branchIds, authority.permissionCodes);
  return createMembership({
    ...membership,
    ...authority,
    authorizationVersion: membership.authorizationVersion + 1,
    updatedAt: at,
  });
};
