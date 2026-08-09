import type { WorkspaceCommunicationSettingsRepository, WorkspaceRepository } from "../../workspace/repositories/workspace.repository";
import type { SecurityAuditPort } from "../../../shared/audit/audit.port";
import type { ActorId, ChallengeId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import type { Account, AccountStatus } from "../domain/account";
import type { LoginProtection } from "../domain/login-protection";
import type { WorkspaceMemberProfile, WorkspaceMembership, WorkspaceRole } from "../domain/member";
import type { PasswordCredential } from "../domain/password-credential";
import type { PasswordRecoveryChallenge } from "../domain/password-recovery-challenge";
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
  create(profile: WorkspaceMemberProfile): Promise<void>;
  findByActorId(workspaceId: WorkspaceId, actorId: ActorId): Promise<WorkspaceMemberProfile | null>;
}

export interface MembershipRepository {
  create(membership: WorkspaceMembership): Promise<void>;
  findRole(workspaceId: WorkspaceId, actorId: ActorId): Promise<WorkspaceRole | null>;
}

export interface IdentityTransactionalContext {
  readonly workspaceRepository: WorkspaceRepository;
  readonly workspaceCommunicationSettingsRepository: WorkspaceCommunicationSettingsRepository;
  readonly accountRepository: AccountRepository;
  readonly passwordCredentialRepository: PasswordCredentialRepository;
  readonly loginProtectionRepository: LoginProtectionRepository;
  readonly passwordRecoveryChallengeRepository: PasswordRecoveryChallengeRepository;
  readonly memberProfileRepository: MemberProfileRepository;
  readonly membershipRepository: MembershipRepository;
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
