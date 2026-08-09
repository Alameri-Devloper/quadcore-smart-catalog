import type { SecurityAuditRecord } from "../../../shared/audit/audit.port";
import type { WorkspaceCommunicationSettings, Workspace } from "../../workspace/domain/workspace";
import type { IdentityTransactionalContext, IdentityTransactionDecision, IdentityUnitOfWork } from "../repositories/identity.repositories";
import { Account } from "../domain/account";
import { LoginProtection } from "../domain/login-protection";
import type { WorkspaceMemberProfile, WorkspaceMembership } from "../domain/member";
import { PasswordCredential } from "../domain/password-credential";
import { PasswordRecoveryChallenge } from "../domain/password-recovery-challenge";

const scoped = (workspaceId: string, id: string) => `${workspaceId}\u0000${id}`;

export interface MemoryIdentityState {
  readonly workspaces: Map<string, Workspace>;
  readonly workspaceCodes: Map<string, string>;
  readonly communicationSettings: Map<string, WorkspaceCommunicationSettings>;
  readonly accounts: Map<string, Account>;
  readonly credentials: Map<string, PasswordCredential>;
  readonly protections: Map<string, LoginProtection>;
  readonly challenges: Map<string, PasswordRecoveryChallenge>;
  readonly profiles: Map<string, WorkspaceMemberProfile>;
  readonly memberships: Map<string, WorkspaceMembership>;
  readonly audits: SecurityAuditRecord[];
}

const cloneAccount = (account: Account): Account => Account.rehydrate({
  workspaceId: account.workspaceId,
  actorId: account.actorId,
  username: account.username,
  status: account.status,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

const cloneCredential = (credential: PasswordCredential): PasswordCredential => PasswordCredential.rehydrate({
  workspaceId: credential.workspaceId,
  actorId: credential.actorId,
  passwordHash: credential.passwordHash,
  lifecycle: credential.lifecycle,
  passwordVersion: credential.passwordVersion,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt,
});

const cloneProtection = (protection: LoginProtection): LoginProtection => LoginProtection.rehydrate({
  workspaceId: protection.workspaceId,
  actorId: protection.actorId,
  failedAttemptCount: protection.failedAttemptCount,
  failureWindowStartedAt: protection.failureWindowStartedAt,
  lockedUntil: protection.lockedUntil,
  lockLevel: protection.lockLevel,
  lastFailedAt: protection.lastFailedAt,
  updatedAt: protection.updatedAt,
});

const cloneChallenge = (challenge: PasswordRecoveryChallenge): PasswordRecoveryChallenge => PasswordRecoveryChallenge.rehydrate({
  workspaceId: challenge.workspaceId,
  challengeId: challenge.challengeId,
  actorId: challenge.actorId,
  channel: challenge.channel,
  destinationVersion: challenge.destinationVersion,
  digest: challenge.digest,
  status: challenge.status,
  attemptCount: challenge.attemptCount,
  createdAt: challenge.createdAt,
  expiresAt: challenge.expiresAt,
  verifiedAt: challenge.verifiedAt,
  consumedAt: challenge.consumedAt,
  invalidatedAt: challenge.invalidatedAt,
});

const cloneMap = <T>(source: Map<string, T>, clone: (value: T) => T): Map<string, T> =>
  new Map([...source].map(([key, value]) => [key, clone(value)]));

const cloneState = (state: MemoryIdentityState): MemoryIdentityState => ({
  workspaces: new Map(state.workspaces),
  workspaceCodes: new Map(state.workspaceCodes),
  communicationSettings: new Map(state.communicationSettings),
  accounts: cloneMap(state.accounts, cloneAccount),
  credentials: cloneMap(state.credentials, cloneCredential),
  protections: cloneMap(state.protections, cloneProtection),
  challenges: cloneMap(state.challenges, cloneChallenge),
  profiles: new Map(state.profiles),
  memberships: new Map(state.memberships),
  audits: [...state.audits],
});

const emptyState = (): MemoryIdentityState => ({
  workspaces: new Map(),
  workspaceCodes: new Map(),
  communicationSettings: new Map(),
  accounts: new Map(),
  credentials: new Map(),
  protections: new Map(),
  challenges: new Map(),
  profiles: new Map(),
  memberships: new Map(),
  audits: [],
});

export class InMemoryIdentityUnitOfWork implements IdentityUnitOfWork {
  state: MemoryIdentityState = emptyState();
  failAudit = false;
  transactionCount = 0;

  async execute<T>(work: (context: IdentityTransactionalContext) => Promise<IdentityTransactionDecision<T>>): Promise<T> {
    this.transactionCount += 1;
    const transactional = cloneState(this.state);
    const context = this.createContext(transactional);
    const decision = await work(context);
    if (decision.type === "Commit") this.state = transactional;
    return decision.result;
  }

  private createContext(state: MemoryIdentityState): IdentityTransactionalContext {
    return {
      workspaceRepository: {
        create: async (workspace) => {
          if (state.workspaceCodes.has(workspace.code.value)) return "WorkspaceCodeAlreadyExists";
          if (state.workspaces.has(workspace.workspaceId.value)) return "WorkspaceIdAlreadyExists";
          state.workspaces.set(workspace.workspaceId.value, workspace);
          state.workspaceCodes.set(workspace.code.value, workspace.workspaceId.value);
          return "Created";
        },
        findById: async (workspaceId) => state.workspaces.get(workspaceId.value) ?? null,
        findByCode: async (code) => {
          const id = state.workspaceCodes.get(code.value);
          return id ? state.workspaces.get(id) ?? null : null;
        },
      },
      workspaceCommunicationSettingsRepository: {
        create: async (settings) => { state.communicationSettings.set(settings.workspaceId.value, settings); },
        findByWorkspaceId: async (workspaceId) => state.communicationSettings.get(workspaceId.value) ?? null,
      },
      accountRepository: {
        create: async (account) => {
          const key = scoped(account.workspaceId.value, account.actorId.value);
          if (state.accounts.has(key)) return "ActorIdAlreadyExists";
          const duplicate = [...state.accounts.values()].some((candidate) =>
            candidate.workspaceId.equals(account.workspaceId)
            && candidate.username.normalizedValue === account.username.normalizedValue);
          if (duplicate) return "UsernameAlreadyExists";
          state.accounts.set(key, cloneAccount(account));
          return "Created";
        },
        findByActorId: async (workspaceId, actorId) => {
          const account = state.accounts.get(scoped(workspaceId.value, actorId.value));
          return account ? cloneAccount(account) : null;
        },
        findByUsername: async (workspaceId, username) => {
          const account = [...state.accounts.values()].find((candidate) =>
            candidate.workspaceId.equals(workspaceId)
            && candidate.username.normalizedValue === username.normalizedValue);
          return account ? cloneAccount(account) : null;
        },
        updateStatus: async (account, expectedStatus) => {
          const key = scoped(account.workspaceId.value, account.actorId.value);
          const persisted = state.accounts.get(key);
          if (!persisted) return "AccountNotFound";
          if (persisted.status !== expectedStatus) return "AccountUpdateConflict";
          state.accounts.set(key, cloneAccount(account));
          return "Updated";
        },
      },
      passwordCredentialRepository: {
        create: async (credential) => { state.credentials.set(scoped(credential.workspaceId.value, credential.actorId.value), cloneCredential(credential)); },
        findByActorId: async (workspaceId, actorId) => {
          const credential = state.credentials.get(scoped(workspaceId.value, actorId.value));
          return credential ? cloneCredential(credential) : null;
        },
        replace: async (credential, expectedVersion) => {
          const key = scoped(credential.workspaceId.value, credential.actorId.value);
          const persisted = state.credentials.get(key);
          if (!persisted) return "AccountNotFound";
          if (persisted.passwordVersion !== expectedVersion) return "CredentialUpdateConflict";
          state.credentials.set(key, cloneCredential(credential));
          return "Updated";
        },
      },
      loginProtectionRepository: {
        create: async (protection) => { state.protections.set(scoped(protection.workspaceId.value, protection.actorId.value), cloneProtection(protection)); },
        findByActorId: async (workspaceId, actorId) => {
          const protection = state.protections.get(scoped(workspaceId.value, actorId.value));
          return protection ? cloneProtection(protection) : null;
        },
        save: async (protection) => { state.protections.set(scoped(protection.workspaceId.value, protection.actorId.value), cloneProtection(protection)); },
      },
      passwordRecoveryChallengeRepository: {
        create: async (challenge) => {
          const conflict = [...state.challenges.values()].some((candidate) =>
            candidate.workspaceId.equals(challenge.workspaceId)
            && candidate.actorId.equals(challenge.actorId)
            && ["Active", "Verified"].includes(candidate.status));
          if (conflict) return "OpenChallengeConflict";
          state.challenges.set(scoped(challenge.workspaceId.value, challenge.challengeId.value), cloneChallenge(challenge));
          return "Created";
        },
        findById: async (workspaceId, challengeId) => {
          const challenge = state.challenges.get(scoped(workspaceId.value, challengeId.value));
          return challenge ? cloneChallenge(challenge) : null;
        },
        findOpenByActorId: async (workspaceId, actorId) => {
          const challenge = [...state.challenges.values()].find((candidate) =>
            candidate.workspaceId.equals(workspaceId)
            && candidate.actorId.equals(actorId)
            && ["Active", "Verified"].includes(candidate.status));
          return challenge ? cloneChallenge(challenge) : null;
        },
        countCreatedSince: async (workspaceId, actorId, since) => [...state.challenges.values()].filter((candidate) =>
          candidate.workspaceId.equals(workspaceId)
          && candidate.actorId.equals(actorId)
          && candidate.createdAt >= since).length,
        save: async (challenge) => { state.challenges.set(scoped(challenge.workspaceId.value, challenge.challengeId.value), cloneChallenge(challenge)); },
        invalidateOpenByActorId: async (workspaceId, actorId, at, exceptChallengeId) => {
          let count = 0;
          for (const [key, challenge] of state.challenges) {
            if (
              challenge.workspaceId.equals(workspaceId)
              && challenge.actorId.equals(actorId)
              && (!exceptChallengeId || !challenge.challengeId.equals(exceptChallengeId))
              && challenge.invalidate(at)
            ) {
              state.challenges.set(key, cloneChallenge(challenge));
              count += 1;
            }
          }
          return count;
        },
      },
      memberProfileRepository: {
        create: async (profile) => { state.profiles.set(scoped(profile.workspaceId.value, profile.actorId.value), profile); },
        findByActorId: async (workspaceId, actorId) => state.profiles.get(scoped(workspaceId.value, actorId.value)) ?? null,
      },
      membershipRepository: {
        create: async (membership) => { state.memberships.set(scoped(membership.workspaceId.value, membership.actorId.value), membership); },
        findRole: async (workspaceId, actorId) => state.memberships.get(scoped(workspaceId.value, actorId.value))?.role ?? null,
      },
      audit: {
        append: async (records) => {
          if (this.failAudit) throw new Error("ForcedAuditFailure");
          state.audits.push(...records);
        },
      },
    };
  }
}
