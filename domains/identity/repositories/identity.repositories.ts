import type { WorkspaceBranchReferenceRepository, WorkspaceCommunicationSettingsRepository, WorkspaceRepository } from "../../workspace/repositories/workspace.repository";
import type { SecurityAuditPort } from "../../../shared/audit/audit.port";
import type { ActorId, ChallengeId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import type { Account, AccountStatus } from "../domain/account";
import type { LoginProtection } from "../domain/login-protection";
import type { WorkspaceMemberProfile, WorkspaceMembership, WorkspaceRole } from "../domain/member";
import type { PasswordCredential } from "../domain/password-credential";
import type { PasswordRecoveryChallenge } from "../domain/password-recovery-challenge";
import type { ServerSession, SessionDigestValue, SessionRevocationReason } from "../domain/session";
import type { Username } from "../domain/username";

export type AccountCreateOutcome = "Created" | "ActorIdAlreadyExists" | "UsernameAlreadyExists";
export type CredentialReplaceOutcome = "Updated" | "AccountNotFound" | "CredentialUpdateConflict";

export interface AccountRepository {
  create(account: Account): Promise<AccountCreateOutcome>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<Account | null>;
  findByUsername(workspaceId: WorkspaceId, username: Username, options?: { readonly forUpdate?: boolean }): Promise<Account | null>;
  updateStatus(account: Account, expectedStatus: AccountStatus): Promise<"Updated" | "AccountNotFound" | "AccountUpdateConflict">;
}

export interface PasswordCredentialRepository {
  create(credential: PasswordCredential): Promise<void>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<PasswordCredential | null>;
  replace(credential: PasswordCredential, expectedVersion: number): Promise<CredentialReplaceOutcome>;
}

export interface LoginProtectionRepository {
  create(protection: LoginProtection): Promise<void>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<LoginProtection | null>;
  save(protection: LoginProtection): Promise<void>;
}

export interface PasswordRecoveryChallengeRepository {
  create(challenge: PasswordRecoveryChallenge): Promise<"Created" | "OpenChallengeConflict">;
  findById(workspaceId: WorkspaceId, challengeId: ChallengeId, options?: { readonly forUpdate?: boolean }): Promise<PasswordRecoveryChallenge | null>;
  findOpenByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<PasswordRecoveryChallenge | null>;
  countCreatedSince(workspaceId: WorkspaceId, actorId: ActorId, since: Date): Promise<number>;
  save(challenge: PasswordRecoveryChallenge): Promise<void>;
  invalidateOpenByActorId(workspaceId: WorkspaceId, actorId: ActorId, at: Date, exceptChallengeId?: ChallengeId): Promise<number>;
}

export interface MemberProfileRepository {
  create(profile: WorkspaceMemberProfile): Promise<"Created" | "WhatsAppAlreadyInUse">;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<WorkspaceMemberProfile | null>;
  findByRecoveryPhone(workspaceId: WorkspaceId, recoveryPhone: string): Promise<WorkspaceMemberProfile | null>;
  update(profile: WorkspaceMemberProfile, expectedRecoveryContactVersion: number, expectedUpdatedAt: Date): Promise<"Updated" | "MemberNotFound" | "ProfileUpdateConflict">;
}

export interface MembershipRepository {
  create(membership: WorkspaceMembership): Promise<void>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<WorkspaceMembership | null>;
  findRole(workspaceId: WorkspaceId, actorId: ActorId): Promise<WorkspaceRole | null>;
  updateAuthorization(membership: WorkspaceMembership, expectedAuthorizationVersion: number): Promise<"Updated" | "MemberNotFound" | "AuthorizationConflict">;
  countActiveOwners(workspaceId: WorkspaceId): Promise<number>;
}

export interface MemberAdministrationReadModel {
  readonly actorId: string;
  readonly displayName: string;
  readonly username: string;
  readonly role: WorkspaceRole;
  readonly accountStatus: AccountStatus;
  readonly passwordChangeRequired: boolean;
  readonly whatsappPhoneE164: string;
  readonly locale: "ar" | "en";
  readonly branchScope: WorkspaceMembership["branchScope"];
  readonly branchIds: readonly string[];
  readonly permissionCodes: readonly string[];
  readonly authorizationVersion: number;
  readonly recoveryContactVersion: number;
  readonly profileUpdatedAt: Date;
  readonly createdAt: Date;
  readonly lastSessionIssuedAt: Date | null;
}

export interface MemberAdministrationReadRepository {
  list(workspaceId: WorkspaceId): Promise<readonly MemberAdministrationReadModel[]>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId): Promise<MemberAdministrationReadModel | null>;
}

export interface SessionRepository {
  create(session: ServerSession): Promise<"Created" | "SessionIdConflict" | "DigestConflict">;
  findByDigests(digests: readonly SessionDigestValue[], options?: { readonly forUpdate?: boolean }): Promise<ServerSession | null>;
  findById(workspaceId: WorkspaceId, sessionId: SessionId, options?: { readonly forUpdate?: boolean }): Promise<ServerSession | null>;
  save(session: ServerSession): Promise<void>;
  revokeAllForActor(
    workspaceId: WorkspaceId,
    actorId: ActorId,
    reason: SessionRevocationReason,
    at: Date,
  ): Promise<number>;
  revokeOtherSessions(
    workspaceId: WorkspaceId,
    actorId: ActorId,
    exceptSessionId: SessionId,
    reason: SessionRevocationReason,
    at: Date,
  ): Promise<number>;
  deleteCleanupEligible(at: Date, revokedBefore: Date, limit: number): Promise<number>;
}

export interface IdentityTransactionalContext {
  readonly workspaceRepository: WorkspaceRepository;
  readonly workspaceCommunicationSettingsRepository: WorkspaceCommunicationSettingsRepository;
  readonly workspaceBranchReferenceRepository: WorkspaceBranchReferenceRepository;
  readonly accountRepository: AccountRepository;
  readonly passwordCredentialRepository: PasswordCredentialRepository;
  readonly loginProtectionRepository: LoginProtectionRepository;
  readonly passwordRecoveryChallengeRepository: PasswordRecoveryChallengeRepository;
  readonly memberProfileRepository: MemberProfileRepository;
  readonly membershipRepository: MembershipRepository;
  readonly memberAdministrationReadRepository: MemberAdministrationReadRepository;
  readonly sessionRepository: SessionRepository;
  readonly audit: SecurityAuditPort;
}

export type IdentityTransactionDecision<T> =
  | { readonly type: "Commit"; readonly result: T }
  | { readonly type: "Rollback"; readonly result: T };

export const commitIdentityTransaction = <T>(result: T): IdentityTransactionDecision<T> =>
  Object.freeze({ type: "Commit", result });

export const rollbackIdentityTransaction = <T>(result: T): IdentityTransactionDecision<T> =>
  Object.freeze({ type: "Rollback", result });

export interface IdentityUnitOfWork {
  execute<T>(work: (context: IdentityTransactionalContext) => Promise<IdentityTransactionDecision<T>>): Promise<T>;
}
