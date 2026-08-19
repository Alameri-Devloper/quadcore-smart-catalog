import { SECURITY_AUDIT_EVENT_TYPES, type SecurityAuditEventType } from "../../../shared/audit/audit.port";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import {
  updateWorkspaceCommunicationSettings,
  updateWorkspaceRecoveryPolicy,
  type PasswordRecoveryPolicy,
} from "../../workspace/domain/workspace";
import { Account } from "../domain/account";
import { LoginProtection } from "../domain/login-protection";
import {
  changeMembershipAuthorization,
  createMemberProfile,
  createMembership,
  updateMemberProfileDetails,
  updateMemberRecoveryPhone,
  type BranchScope,
  type MemberLocale,
  type WorkspaceMembership,
  type WorkspaceRole,
} from "../domain/member";
import { PasswordCredential } from "../domain/password-credential";
import { validatePassword } from "../domain/password";
import {
  PERMISSION_REGISTRY,
  PERMISSION_TEMPLATES,
  ownerEffectivePermissionCodes,
  resolvePermissionTemplate,
  validateStaffPermissionCodes,
} from "../domain/permission";
import { Username } from "../domain/username";
import {
  commitIdentityTransaction,
  rollbackIdentityTransaction,
  type IdentityTransactionalContext,
  type IdentityUnitOfWork,
  type MemberAdministrationReadModel,
} from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityErrorCode, type IdentityResult } from "./identity-results";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher } from "./ports";

export interface MemberAdministrationContextCommand {
  readonly context: TrustedActorContext;
}

export interface BranchScopeCommand {
  readonly type: BranchScope;
  readonly branchIds?: readonly string[];
}

interface AdminScope {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
}

interface AuthorizationMutationReceipt {
  readonly authorizationVersion: number;
  readonly revokedSessionCount: number;
}

const adminScope = (context: TrustedActorContext): AdminScope => Object.freeze({
  workspaceId: WorkspaceId.create(context.workspaceId),
  actorId: ActorId.create(context.actorId),
});

const requireOwner = async (
  transaction: IdentityTransactionalContext,
  scope: AdminScope,
  trusted: TrustedActorContext,
): Promise<boolean> => trusted.role === "Owner"
  && await transaction.membershipRepository.findRole(scope.workspaceId, scope.actorId) === "Owner";

const normalizeBranchScope = (input: BranchScopeCommand): { readonly type: BranchScope; readonly branchIds: readonly string[] } => {
  if (!input || !["AllBranches", "SelectedBranches"].includes(input.type)) throw new Error("InvalidBranchScope");
  const branchIds = [...(input.branchIds ?? [])];
  if (
    new Set(branchIds).size !== branchIds.length
    || branchIds.some((branchId) => typeof branchId !== "string" || branchId.length === 0 || branchId.trim() !== branchId)
    || (input.type === "AllBranches" && branchIds.length > 0)
    || (input.type === "SelectedBranches" && branchIds.length === 0)
  ) throw new Error("InvalidBranchScope");
  return Object.freeze({ type: input.type, branchIds: Object.freeze(branchIds.sort()) });
};

const validateBranchReferences = async (
  transaction: IdentityTransactionalContext,
  workspaceId: WorkspaceId,
  branchScope: ReturnType<typeof normalizeBranchScope>,
): Promise<IdentityErrorCode | null> => {
  if (branchScope.type === "AllBranches") return null;
  const references = await transaction.workspaceBranchReferenceRepository.findByIds(workspaceId, branchScope.branchIds);
  for (const branchId of branchScope.branchIds) {
    const matchingReference = references.find((reference) => reference.branchId === branchId);
    if (!matchingReference) return "BranchNotFound";
    if (matchingReference.status !== "Active") return "BranchInactive";
  }
  return null;
};

const sameValues = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const observedRevisionMatches = (observed: string, persisted: Date): boolean =>
  observed === persisted.toISOString();

const effectiveReadModel = (member: MemberAdministrationReadModel): MemberAdministrationReadModel => member.role === "Owner"
  ? Object.freeze({ ...member, permissionCodes: ownerEffectivePermissionCodes(), branchScope: "AllBranches", branchIds: Object.freeze([]) })
  : member;

const auditAuthorizationChange = async (
  transaction: IdentityTransactionalContext,
  scope: AdminScope,
  targetActorId: ActorId,
  eventType: SecurityAuditEventType,
  resultCode: string,
  at: Date,
  metadata?: Readonly<Record<string, string | number | boolean | null>>,
): Promise<void> => transaction.audit.append([{
  workspaceId: scope.workspaceId,
  eventType,
  actorId: scope.actorId,
  subjectActorId: targetActorId,
  resultCode,
  occurredAt: at,
  ...(metadata ? { metadata } : {}),
}]);

const persistAuthorizationChange = async (
  transaction: IdentityTransactionalContext,
  scope: AdminScope,
  current: WorkspaceMembership,
  changed: WorkspaceMembership,
  eventType: SecurityAuditEventType,
  resultCode: string,
  at: Date,
  metadata?: Readonly<Record<string, string | number | boolean | null>>,
): Promise<IdentityResult<{ readonly authorizationVersion: number; readonly revokedSessionCount: number }>> => {
  const outcome = await transaction.membershipRepository.updateAuthorization(changed, current.authorizationVersion);
  if (outcome !== "Updated") {
    return identityFailure(outcome === "AuthorizationConflict" ? "AuthorizationConflict" : "MemberNotFound");
  }
  const revokedSessionCount = await transaction.sessionRepository.revokeAllForActor(
    scope.workspaceId,
    changed.actorId,
    "AuthorizationChanged",
    at,
  );
  await auditAuthorizationChange(transaction, scope, changed.actorId, eventType, resultCode, at, {
    authorizationVersion: changed.authorizationVersion,
    revokedSessionCount,
    ...metadata,
  });
  return identitySuccess({ authorizationVersion: changed.authorizationVersion, revokedSessionCount });
};

export interface CreateWorkspaceMemberCommand extends MemberAdministrationContextCommand {
  readonly username: string;
  readonly displayName: string;
  readonly whatsappPhoneE164: string;
  readonly locale: MemberLocale;
  readonly role: WorkspaceRole;
  readonly permissionCodes?: readonly string[];
  readonly permissionTemplateId?: string;
  readonly branchScope: BranchScopeCommand;
  readonly temporaryPassword: string;
}

export class CreateWorkspaceMemberUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
    private readonly identifiers: IdentityIdentifierGenerator,
  ) {}

  async execute(command: CreateWorkspaceMemberCommand): Promise<IdentityResult<{
    readonly actorId: string;
    readonly accountStatus: "PendingActivation";
    readonly passwordLifecycle: "Temporary";
    readonly authorizationVersion: 1;
  }>> {
    let username: Username;
    let phone: E164PhoneNumber;
    let branchScope: ReturnType<typeof normalizeBranchScope>;
    let permissionCodes: readonly string[];
    try {
      username = Username.create(command.username);
      phone = E164PhoneNumber.create(command.whatsappPhoneE164);
      validatePassword(command.temporaryPassword);
      branchScope = normalizeBranchScope(command.branchScope);
      if (!["Owner", "Staff"].includes(command.role)) return identityFailure("InvalidRole");
      if (command.role === "Owner") {
        if (branchScope.type !== "AllBranches") return identityFailure("OwnerMustUseAllBranches");
        if ((command.permissionCodes?.length ?? 0) > 0 || command.permissionTemplateId) return identityFailure("InvalidPermissionCode");
        permissionCodes = Object.freeze([]);
      } else {
        if (command.permissionTemplateId && command.permissionCodes) return identityFailure("InvalidPermissionTemplate");
        permissionCodes = command.permissionTemplateId
          ? resolvePermissionTemplate(command.permissionTemplateId)
          : validateStaffPermissionCodes(command.permissionCodes ?? []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "UsernameInvalid") return identityFailure("UsernameInvalid");
      if (message === "PasswordInvalid") return identityFailure("TemporaryPasswordInvalid");
      if (message === "PhoneNumberInvalid") return identityFailure("WhatsAppInvalid");
      if (message === "InvalidPermissionTemplate") return identityFailure("InvalidPermissionTemplate");
      if (message.includes("Permission")) return identityFailure("InvalidPermissionCode");
      return identityFailure("InvalidBranchScope");
    }
    let passwordHash;
    try { passwordHash = await this.passwordHasher.hash(command.temporaryPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }

    const scope = adminScope(command.context);
    const actorId = ActorId.create(this.identifiers.actorId());
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await transaction.workspaceRepository.findById(scope.workspaceId, { forUpdate: true })) {
          return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        }
        if (!await requireOwner(transaction, scope, command.context)) {
          return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        }
        if (await transaction.memberProfileRepository.findByRecoveryPhone(scope.workspaceId, phone.value)) {
          return rollbackIdentityTransaction(identityFailure("WhatsAppAlreadyInUse"));
        }
        const branchError = await validateBranchReferences(transaction, scope.workspaceId, branchScope);
        if (branchError) return rollbackIdentityTransaction(identityFailure(branchError));

        let profile;
        try {
          profile = createMemberProfile({
            workspaceId: scope.workspaceId,
            actorId,
            displayName: command.displayName,
            recoveryPhone: phone,
            recoveryContactVersion: 1,
            locale: command.locale,
            createdAt: now,
            updatedAt: now,
          });
        } catch { return rollbackIdentityTransaction(identityFailure("MemberProfileInvalid")); }
        const accountOutcome = await transaction.accountRepository.create(Account.create({
          workspaceId: scope.workspaceId,
          actorId,
          username,
          createdAt: now,
        }));
        if (accountOutcome !== "Created") {
          return rollbackIdentityTransaction(identityFailure(accountOutcome === "UsernameAlreadyExists" ? "UsernameAlreadyExists" : "ActorIdAlreadyExists"));
        }
        await transaction.passwordCredentialRepository.create(PasswordCredential.createTemporary({
          workspaceId: scope.workspaceId,
          actorId,
          passwordHash,
          createdAt: now,
        }));
        await transaction.loginProtectionRepository.create(LoginProtection.create(scope.workspaceId, actorId, now));
        if (await transaction.memberProfileRepository.create(profile) !== "Created") {
          return rollbackIdentityTransaction(identityFailure("WhatsAppAlreadyInUse"));
        }
        await transaction.membershipRepository.create(createMembership({
          workspaceId: scope.workspaceId,
          actorId,
          role: command.role,
          branchScope: branchScope.type,
          branchIds: branchScope.branchIds,
          permissionCodes,
          authorizationVersion: 1,
          createdAt: now,
          updatedAt: now,
        }));
        await transaction.audit.append([
          {
            workspaceId: scope.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.workspaceMemberCreated,
            actorId: scope.actorId,
            subjectActorId: actorId,
            resultCode: command.role,
            occurredAt: now,
            metadata: { branchScope: branchScope.type, permissionCount: permissionCodes.length },
          },
          {
            workspaceId: scope.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.temporaryCredentialIssued,
            actorId: scope.actorId,
            subjectActorId: actorId,
            resultCode: "Temporary",
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess({
          actorId: actorId.value,
          accountStatus: "PendingActivation" as const,
          passwordLifecycle: "Temporary" as const,
          authorizationVersion: 1 as const,
        }));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class UpdateWorkspaceMemberProfileUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly displayName: string;
    readonly locale: MemberLocale;
    readonly expectedProfileRevision: string;
  }): Promise<IdentityResult<null>> {
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const profile = await transaction.memberProfileRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!profile) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (!observedRevisionMatches(command.expectedProfileRevision, profile.updatedAt)) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const expectedUpdatedAt = profile.updatedAt;
        let changed;
        try { changed = updateMemberProfileDetails(profile, command.displayName, command.locale, now); }
        catch { return rollbackIdentityTransaction(identityFailure("MemberProfileInvalid")); }
        if (await transaction.memberProfileRepository.update(changed, profile.recoveryContactVersion, expectedUpdatedAt) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        await auditAuthorizationChange(transaction, scope, target, SECURITY_AUDIT_EVENT_TYPES.workspaceMemberProfileUpdated, "Updated", now);
        return commitIdentityTransaction(identitySuccess(null));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class UpdateWorkspaceMemberWhatsAppUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly whatsappPhoneE164: string;
    readonly expectedRecoveryContactRevision: number;
  }): Promise<IdentityResult<{ readonly recoveryContactVersion: number }>> {
    let phone: E164PhoneNumber;
    try { phone = E164PhoneNumber.create(command.whatsappPhoneE164); }
    catch { return identityFailure("WhatsAppInvalid"); }
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await transaction.workspaceRepository.findById(scope.workspaceId, { forUpdate: true })) {
          return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        }
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const profile = await transaction.memberProfileRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!profile) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (profile.recoveryContactVersion !== command.expectedRecoveryContactRevision) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (profile.recoveryPhone.value === phone.value) {
          return commitIdentityTransaction(identitySuccess({ recoveryContactVersion: profile.recoveryContactVersion }));
        }
        const duplicate = await transaction.memberProfileRepository.findByRecoveryPhone(scope.workspaceId, phone.value);
        if (duplicate && !duplicate.actorId.equals(target)) return rollbackIdentityTransaction(identityFailure("WhatsAppAlreadyInUse"));
        const expectedUpdatedAt = profile.updatedAt;
        const changed = updateMemberRecoveryPhone(profile, phone, now);
        if (await transaction.memberProfileRepository.update(changed, profile.recoveryContactVersion, expectedUpdatedAt) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const invalidatedCount = await transaction.passwordRecoveryChallengeRepository.invalidateOpenByActorId(scope.workspaceId, target, now);
        await auditAuthorizationChange(transaction, scope, target, SECURITY_AUDIT_EVENT_TYPES.workspaceMemberWhatsAppChanged, "Updated", now, {
          recoveryContactVersion: changed.recoveryContactVersion,
          invalidatedChallengeCount: invalidatedCount,
        });
        return commitIdentityTransaction(identitySuccess({ recoveryContactVersion: changed.recoveryContactVersion }));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class ChangeWorkspaceMemberPermissionsUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly permissionCodes?: readonly string[];
    readonly permissionTemplateId?: string;
    readonly expectedAuthorizationRevision: number;
  }): Promise<IdentityResult<{ readonly authorizationVersion: number; readonly revokedSessionCount: number }>> {
    let permissionCodes: readonly string[];
    try {
      if (command.permissionTemplateId && command.permissionCodes) return identityFailure("InvalidPermissionTemplate");
      permissionCodes = command.permissionTemplateId
        ? resolvePermissionTemplate(command.permissionTemplateId)
        : validateStaffPermissionCodes(command.permissionCodes ?? []);
    } catch (error) {
      return identityFailure(error instanceof Error && error.message === "InvalidPermissionTemplate" ? "InvalidPermissionTemplate" : "InvalidPermissionCode");
    }
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const membership = await transaction.membershipRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!membership) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (membership.authorizationVersion !== command.expectedAuthorizationRevision) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (membership.role !== "Staff") return rollbackIdentityTransaction(identityFailure("InvalidRole"));
        if (sameValues(membership.permissionCodes, permissionCodes)) {
          return commitIdentityTransaction(identitySuccess({ authorizationVersion: membership.authorizationVersion, revokedSessionCount: 0 }));
        }
        const changed = changeMembershipAuthorization(membership, { ...membership, permissionCodes }, now);
        const result = await persistAuthorizationChange(
          transaction, scope, membership, changed,
          SECURITY_AUDIT_EVENT_TYPES.workspaceMemberPermissionsChanged,
          "Updated", now, { permissionCodes: permissionCodes.join(",") },
        );
        return result.ok ? commitIdentityTransaction(result) : rollbackIdentityTransaction(result);
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class ChangeWorkspaceMemberBranchScopeUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly branchScope: BranchScopeCommand;
    readonly expectedAuthorizationRevision: number;
  }): Promise<IdentityResult<{ readonly authorizationVersion: number; readonly revokedSessionCount: number }>> {
    let branchScope: ReturnType<typeof normalizeBranchScope>;
    try { branchScope = normalizeBranchScope(command.branchScope); }
    catch { return identityFailure("InvalidBranchScope"); }
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const membership = await transaction.membershipRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!membership) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (membership.authorizationVersion !== command.expectedAuthorizationRevision) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (membership.role === "Owner" && branchScope.type !== "AllBranches") {
          return rollbackIdentityTransaction(identityFailure("OwnerMustUseAllBranches"));
        }
        const branchError = await validateBranchReferences(transaction, scope.workspaceId, branchScope);
        if (branchError) return rollbackIdentityTransaction(identityFailure(branchError));
        if (membership.branchScope === branchScope.type && sameValues(membership.branchIds, branchScope.branchIds)) {
          return commitIdentityTransaction(identitySuccess({ authorizationVersion: membership.authorizationVersion, revokedSessionCount: 0 }));
        }
        const changed = changeMembershipAuthorization(membership, {
          ...membership,
          branchScope: branchScope.type,
          branchIds: branchScope.branchIds,
        }, now);
        const result = await persistAuthorizationChange(
          transaction, scope, membership, changed,
          SECURITY_AUDIT_EVENT_TYPES.workspaceMemberBranchScopeChanged,
          branchScope.type, now, { branchIds: branchScope.branchIds.join(",") },
        );
        return result.ok ? commitIdentityTransaction(result) : rollbackIdentityTransaction(result);
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class PromoteWorkspaceMemberToOwnerUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly expectedAuthorizationRevision: number;
  }): Promise<IdentityResult<AuthorizationMutationReceipt>> {
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const membership = await transaction.membershipRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!membership) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (membership.authorizationVersion !== command.expectedAuthorizationRevision) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (membership.role !== "Staff") return rollbackIdentityTransaction(identityFailure("InvalidRole"));
        const changed = changeMembershipAuthorization(membership, {
          role: "Owner", branchScope: "AllBranches", branchIds: Object.freeze([]), permissionCodes: Object.freeze([]),
        }, now);
        const result = await persistAuthorizationChange(
          transaction, scope, membership, changed,
          SECURITY_AUDIT_EVENT_TYPES.workspaceMemberPromotedToOwner,
          "Owner", now,
        );
        return result.ok ? commitIdentityTransaction(result) : rollbackIdentityTransaction(result);
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class DemoteWorkspaceOwnerToStaffUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & {
    readonly targetActorId: string;
    readonly permissionCodes: readonly string[];
    readonly branchScope: BranchScopeCommand;
    readonly expectedAuthorizationRevision: number;
  }): Promise<IdentityResult<AuthorizationMutationReceipt>> {
    let permissions: readonly string[];
    let branchScope: ReturnType<typeof normalizeBranchScope>;
    try {
      permissions = validateStaffPermissionCodes(command.permissionCodes);
      branchScope = normalizeBranchScope(command.branchScope);
    } catch (error) {
      return identityFailure(error instanceof Error && error.message.includes("Permission") ? "InvalidPermissionCode" : "InvalidBranchScope");
    }
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await transaction.workspaceRepository.findById(scope.workspaceId, { forUpdate: true })) {
          return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        }
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const membership = await transaction.membershipRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        const account = await transaction.accountRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!membership || !account) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (membership.authorizationVersion !== command.expectedAuthorizationRevision) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (membership.role !== "Owner") return rollbackIdentityTransaction(identityFailure("InvalidRole"));
        if (account.status === "Active" && await transaction.membershipRepository.countActiveOwners(scope.workspaceId) <= 1) {
          await auditAuthorizationChange(transaction, scope, target, SECURITY_AUDIT_EVENT_TYPES.lastActiveOwnerOperationRejected, "Demote", now);
          return commitIdentityTransaction(identityFailure("LastActiveOwnerProtected"));
        }
        const branchError = await validateBranchReferences(transaction, scope.workspaceId, branchScope);
        if (branchError) return rollbackIdentityTransaction(identityFailure(branchError));
        const changed = changeMembershipAuthorization(membership, {
          role: "Staff", branchScope: branchScope.type, branchIds: branchScope.branchIds, permissionCodes: permissions,
        }, now);
        const result = await persistAuthorizationChange(
          transaction, scope, membership, changed,
          SECURITY_AUDIT_EVENT_TYPES.workspaceOwnerDemotedToStaff,
          "Staff", now, { permissionCodes: permissions.join(","), branchIds: branchScope.branchIds.join(",") },
        );
        return result.ok ? commitIdentityTransaction(result) : rollbackIdentityTransaction(result);
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class SuspendWorkspaceMemberUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: MemberAdministrationContextCommand & { readonly targetActorId: string }): Promise<IdentityResult<null>> {
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await transaction.workspaceRepository.findById(scope.workspaceId, { forUpdate: true })) {
          return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        }
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const account = await transaction.accountRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        const membership = await transaction.membershipRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!account || !membership) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (account.status === "Suspended") return rollbackIdentityTransaction(identityFailure("TargetAlreadySuspended"));
        if (membership.role === "Owner" && account.status === "Active" && await transaction.membershipRepository.countActiveOwners(scope.workspaceId) <= 1) {
          await auditAuthorizationChange(transaction, scope, target, SECURITY_AUDIT_EVENT_TYPES.lastActiveOwnerOperationRejected, "Suspend", now);
          return commitIdentityTransaction(identityFailure("LastActiveOwnerProtected"));
        }
        const expectedStatus = account.status;
        account.suspend(now);
        if (await transaction.accountRepository.updateStatus(account, expectedStatus) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const invalidatedChallengeCount = await transaction.passwordRecoveryChallengeRepository.invalidateOpenByActorId(scope.workspaceId, target, now);
        const revokedSessionCount = await transaction.sessionRepository.revokeAllForActor(scope.workspaceId, target, "AccountSuspended", now);
        await auditAuthorizationChange(transaction, scope, target, SECURITY_AUDIT_EVENT_TYPES.workspaceMemberSuspended, "Suspended", now, {
          invalidatedChallengeCount, revokedSessionCount,
        });
        return commitIdentityTransaction(identitySuccess(null));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class ReactivateWorkspaceMemberUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: MemberAdministrationContextCommand & { readonly targetActorId: string; readonly newTemporaryPassword: string }): Promise<IdentityResult<{ readonly passwordVersion: number }>> {
    try { validatePassword(command.newTemporaryPassword); }
    catch { return identityFailure("TemporaryPasswordInvalid"); }
    let hash;
    try { hash = await this.passwordHasher.hash(command.newTemporaryPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const account = await transaction.accountRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        const profile = await transaction.memberProfileRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        const credential = await transaction.passwordCredentialRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (!account || !profile || !credential) return rollbackIdentityTransaction(identityFailure("MemberNotFound"));
        if (account.status !== "Suspended") return rollbackIdentityTransaction(identityFailure("TargetNotSuspended"));
        if (!profile.recoveryPhone.value) return rollbackIdentityTransaction(identityFailure("MemberProfileInvalid"));
        const expectedCredentialVersion = credential.replace(hash, "Temporary", now);
        if (await transaction.passwordCredentialRepository.replace(credential, expectedCredentialVersion) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("CredentialUpdateConflict"));
        }
        account.reactivate(now);
        if (await transaction.accountRepository.updateStatus(account, "Suspended") !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const protection = await transaction.loginProtectionRepository.findByActorId(scope.workspaceId, target, { forUpdate: true });
        if (protection) { protection.clear(now); await transaction.loginProtectionRepository.save(protection); }
        const invalidatedChallengeCount = await transaction.passwordRecoveryChallengeRepository.invalidateOpenByActorId(scope.workspaceId, target, now);
        const revokedSessionCount = await transaction.sessionRepository.revokeAllForActor(scope.workspaceId, target, "AdministrativeRevocation", now);
        await transaction.audit.append([
          {
            workspaceId: scope.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.workspaceMemberReactivated,
            actorId: scope.actorId,
            subjectActorId: target,
            resultCode: "ActiveTemporary",
            occurredAt: now,
            metadata: { passwordVersion: credential.passwordVersion, invalidatedChallengeCount, revokedSessionCount },
          },
          {
            workspaceId: scope.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.temporaryCredentialIssued,
            actorId: scope.actorId,
            subjectActorId: target,
            resultCode: "Reactivation",
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess({ passwordVersion: credential.passwordVersion }));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class ListWorkspaceMembersUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand): Promise<IdentityResult<readonly MemberAdministrationReadModel[]>> {
    const scope = adminScope(command.context);
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        return commitIdentityTransaction(identitySuccess(Object.freeze(
          (await transaction.memberAdministrationReadRepository.list(scope.workspaceId)).map(effectiveReadModel),
        )));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class GetWorkspaceMemberDetailsUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand & { readonly targetActorId: string }): Promise<IdentityResult<MemberAdministrationReadModel>> {
    const scope = adminScope(command.context);
    const target = ActorId.create(command.targetActorId);
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const member = await transaction.memberAdministrationReadRepository.findByActorId(scope.workspaceId, target);
        return member
          ? commitIdentityTransaction(identitySuccess(effectiveReadModel(member)))
          : rollbackIdentityTransaction(identityFailure("MemberNotFound"));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class GetPermissionRegistryUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand) {
    const scope = adminScope(command.context);
    try {
      return await this.unitOfWork.execute(async (transaction) => await requireOwner(transaction, scope, command.context)
        ? commitIdentityTransaction(identitySuccess(PERMISSION_REGISTRY))
        : rollbackIdentityTransaction(identityFailure("OwnerRequired")));
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class GetPermissionTemplatesUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand) {
    const scope = adminScope(command.context);
    try {
      return await this.unitOfWork.execute(async (transaction) => await requireOwner(transaction, scope, command.context)
        ? commitIdentityTransaction(identitySuccess(PERMISSION_TEMPLATES))
        : rollbackIdentityTransaction(identityFailure("OwnerRequired")));
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class ListActiveWorkspaceBranchReferencesUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand) {
    const scope = adminScope(command.context);
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const references = await transaction.workspaceBranchReferenceRepository.findActiveByWorkspace(scope.workspaceId);
        return commitIdentityTransaction(identitySuccess(Object.freeze(references.map((reference) => Object.freeze({
          branchId: reference.branchId,
          status: "Active" as const,
        })))));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class GetWorkspaceCommunicationSettingsUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork) {}
  async execute(command: MemberAdministrationContextCommand) {
    const scope = adminScope(command.context);
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const workspace = await transaction.workspaceRepository.findById(scope.workspaceId);
        const settings = await transaction.workspaceCommunicationSettingsRepository.findByWorkspaceId(scope.workspaceId);
        if (!workspace || !settings) return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        return commitIdentityTransaction(identitySuccess(Object.freeze({
          defaultWhatsAppPhoneE164: settings.defaultWhatsAppPhone.value,
          passwordRecoveryPolicy: workspace.passwordRecoveryPolicy,
          settingsRevision: settings.updatedAt.toISOString(),
        })));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}

export class UpdateWorkspaceCommunicationSettingsUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}
  async execute(command: MemberAdministrationContextCommand & {
    readonly defaultWhatsAppPhoneE164: string;
    readonly passwordRecoveryPolicy: PasswordRecoveryPolicy;
    readonly expectedSettingsRevision: string;
  }): Promise<IdentityResult<{
    readonly defaultWhatsAppPhoneE164: string;
    readonly passwordRecoveryPolicy: PasswordRecoveryPolicy;
    readonly settingsRevision: string;
  }>> {
    let phone: E164PhoneNumber;
    try {
      phone = E164PhoneNumber.create(command.defaultWhatsAppPhoneE164);
      if (!["OwnerManagedOnly", "WhatsAppOtpWithOwnerFallback"].includes(command.passwordRecoveryPolicy)) throw new Error();
    } catch { return identityFailure("WorkspaceCommunicationSettingsInvalid"); }
    const scope = adminScope(command.context);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (transaction) => {
        const workspace = await transaction.workspaceRepository.findById(scope.workspaceId, { forUpdate: true });
        if (!workspace) return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        if (!await requireOwner(transaction, scope, command.context)) return rollbackIdentityTransaction(identityFailure("OwnerRequired"));
        const settings = await transaction.workspaceCommunicationSettingsRepository.findByWorkspaceId(scope.workspaceId, { forUpdate: true });
        if (!settings) return rollbackIdentityTransaction(identityFailure("WorkspaceNotFound"));
        if (!observedRevisionMatches(command.expectedSettingsRevision, settings.updatedAt)) {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const changedWorkspace = updateWorkspaceRecoveryPolicy(workspace, command.passwordRecoveryPolicy, now);
        const changedSettings = updateWorkspaceCommunicationSettings(settings, phone, now);
        if (await transaction.workspaceRepository.update(changedWorkspace, workspace.updatedAt) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        if (await transaction.workspaceCommunicationSettingsRepository.update(changedSettings, settings.updatedAt) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure("AuthorizationConflict"));
        }
        const invalidatedChallengeCount = workspace.passwordRecoveryPolicy !== "OwnerManagedOnly"
          && changedWorkspace.passwordRecoveryPolicy === "OwnerManagedOnly"
          ? await transaction.passwordRecoveryChallengeRepository.invalidateOpenByWorkspaceId(scope.workspaceId, now)
          : 0;
        await auditAuthorizationChange(
          transaction, scope, scope.actorId,
          SECURITY_AUDIT_EVENT_TYPES.workspaceCommunicationSettingsChanged,
          command.passwordRecoveryPolicy, now, { invalidatedChallengeCount },
        );
        return commitIdentityTransaction(identitySuccess(Object.freeze({
          defaultWhatsAppPhoneE164: changedSettings.defaultWhatsAppPhone.value,
          passwordRecoveryPolicy: changedWorkspace.passwordRecoveryPolicy,
          settingsRevision: changedSettings.updatedAt.toISOString(),
        })));
      });
    } catch { return identityFailure("InfrastructureUnavailable"); }
  }
}
