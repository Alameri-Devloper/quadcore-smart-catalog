import { and, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../shared/infrastructure/persistence/database";
import { E164PhoneNumber } from "../../../../shared/domain/e164-phone-number";
import { ActorId, ChallengeId, SessionId, WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { Account, type AccountStatus } from "../../domain/account";
import { LoginProtection } from "../../domain/login-protection";
import { createMembership, type WorkspaceMemberProfile, type WorkspaceMembership, type WorkspaceRole } from "../../domain/member";
import { PasswordCredential } from "../../domain/password-credential";
import { PasswordHash } from "../../domain/password";
import { PasswordRecoveryChallenge } from "../../domain/password-recovery-challenge";
import { Username } from "../../domain/username";
import { ServerSession, type SessionClass, type SessionDigestValue, type SessionRevocationReason } from "../../domain/session";
import type {
  AccountCreateOutcome,
  AccountRepository,
  CredentialReplaceOutcome,
  LoginProtectionRepository,
  MemberProfileRepository,
  MembershipRepository,
  PasswordCredentialRepository,
  PasswordRecoveryChallengeRepository,
  SessionRepository,
} from "../../repositories/identity.repositories";
import {
  identityAccounts,
  identityLoginProtection,
  identityMemberProfiles,
  identityMemberships,
  identityPasswordCredentials,
  identityPasswordRecoveryChallenges,
  identitySessions,
} from "./schema";

const accountScope = (workspaceId: WorkspaceId, actorId: ActorId) => and(
  eq(identityAccounts.workspaceId, workspaceId.value),
  eq(identityAccounts.actorId, actorId.value),
);

const mapAccount = (row: typeof identityAccounts.$inferSelect): Account => Account.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  actorId: ActorId.create(row.actorId),
  username: Username.create(row.username),
  status: row.status as AccountStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PostgreSqlAccountRepository implements AccountRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(account: Account): Promise<AccountCreateOutcome> {
    const inserted = await this.database.insert(identityAccounts).values({
      workspaceId: account.workspaceId.value,
      actorId: account.actorId.value,
      username: account.username.value,
      normalizedUsername: account.username.normalizedValue,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }).onConflictDoNothing().returning({ actorId: identityAccounts.actorId });
    if (inserted.length === 1) return "Created";
    const usernameMatch = await this.database.select({ actorId: identityAccounts.actorId })
      .from(identityAccounts)
      .where(and(
        eq(identityAccounts.workspaceId, account.workspaceId.value),
        eq(identityAccounts.normalizedUsername, account.username.normalizedValue),
      )).limit(1);
    return usernameMatch.length > 0 ? "UsernameAlreadyExists" : "ActorIdAlreadyExists";
  }

  async findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<Account | null> {
    const base = this.database.select().from(identityAccounts).where(accountScope(workspaceId, actorId)).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapAccount(rows[0]) : null;
  }

  async findByUsername(workspaceId: WorkspaceId, username: Username, options?: { readonly forUpdate?: boolean }): Promise<Account | null> {
    const base = this.database.select().from(identityAccounts).where(and(
      eq(identityAccounts.workspaceId, workspaceId.value),
      eq(identityAccounts.normalizedUsername, username.normalizedValue),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapAccount(rows[0]) : null;
  }

  async updateStatus(account: Account, expectedStatus: AccountStatus): Promise<"Updated" | "AccountNotFound" | "AccountUpdateConflict"> {
    const updated = await this.database.update(identityAccounts).set({
      status: account.status,
      updatedAt: account.updatedAt,
    }).where(and(accountScope(account.workspaceId, account.actorId), eq(identityAccounts.status, expectedStatus)))
      .returning({ actorId: identityAccounts.actorId });
    if (updated.length === 1) return "Updated";
    const exists = await this.database.select({ actorId: identityAccounts.actorId })
      .from(identityAccounts).where(accountScope(account.workspaceId, account.actorId)).limit(1);
    return exists.length === 0 ? "AccountNotFound" : "AccountUpdateConflict";
  }
}

const mapCredential = (row: typeof identityPasswordCredentials.$inferSelect): PasswordCredential => PasswordCredential.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  actorId: ActorId.create(row.actorId),
  passwordHash: PasswordHash.rehydrate(row.passwordHash),
  lifecycle: row.passwordLifecycle as "Temporary" | "Permanent",
  passwordVersion: row.passwordVersion,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PostgreSqlPasswordCredentialRepository implements PasswordCredentialRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(credential: PasswordCredential): Promise<void> {
    await this.database.insert(identityPasswordCredentials).values({
      workspaceId: credential.workspaceId.value,
      actorId: credential.actorId.value,
      passwordHash: credential.passwordHash.value,
      passwordLifecycle: credential.lifecycle,
      passwordVersion: credential.passwordVersion,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    });
  }

  async findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<PasswordCredential | null> {
    const base = this.database.select().from(identityPasswordCredentials).where(and(
      eq(identityPasswordCredentials.workspaceId, workspaceId.value),
      eq(identityPasswordCredentials.actorId, actorId.value),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapCredential(rows[0]) : null;
  }

  async replace(credential: PasswordCredential, expectedVersion: number): Promise<CredentialReplaceOutcome> {
    const updated = await this.database.update(identityPasswordCredentials).set({
      passwordHash: credential.passwordHash.value,
      passwordLifecycle: credential.lifecycle,
      passwordVersion: credential.passwordVersion,
      updatedAt: credential.updatedAt,
    }).where(and(
      eq(identityPasswordCredentials.workspaceId, credential.workspaceId.value),
      eq(identityPasswordCredentials.actorId, credential.actorId.value),
      eq(identityPasswordCredentials.passwordVersion, expectedVersion),
    )).returning({ actorId: identityPasswordCredentials.actorId });
    if (updated.length === 1) return "Updated";
    const exists = await this.database.select({ actorId: identityPasswordCredentials.actorId })
      .from(identityPasswordCredentials).where(and(
        eq(identityPasswordCredentials.workspaceId, credential.workspaceId.value),
        eq(identityPasswordCredentials.actorId, credential.actorId.value),
      )).limit(1);
    return exists.length === 0 ? "AccountNotFound" : "CredentialUpdateConflict";
  }
}

const mapProtection = (row: typeof identityLoginProtection.$inferSelect): LoginProtection => LoginProtection.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  actorId: ActorId.create(row.actorId),
  failedAttemptCount: row.failedAttemptCount,
  failureWindowStartedAt: row.failureWindowStartedAt,
  lockedUntil: row.lockedUntil,
  lockLevel: row.lockLevel,
  lastFailedAt: row.lastFailedAt,
  updatedAt: row.updatedAt,
});

export class PostgreSqlLoginProtectionRepository implements LoginProtectionRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(protection: LoginProtection): Promise<void> {
    await this.database.insert(identityLoginProtection).values(this.values(protection));
  }

  async findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<LoginProtection | null> {
    const base = this.database.select().from(identityLoginProtection).where(and(
      eq(identityLoginProtection.workspaceId, workspaceId.value),
      eq(identityLoginProtection.actorId, actorId.value),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapProtection(rows[0]) : null;
  }

  async save(protection: LoginProtection): Promise<void> {
    await this.database.update(identityLoginProtection).set({
      failedAttemptCount: protection.failedAttemptCount,
      failureWindowStartedAt: protection.failureWindowStartedAt,
      lockedUntil: protection.lockedUntil,
      lockLevel: protection.lockLevel,
      lastFailedAt: protection.lastFailedAt,
      updatedAt: protection.updatedAt,
    }).where(and(
      eq(identityLoginProtection.workspaceId, protection.workspaceId.value),
      eq(identityLoginProtection.actorId, protection.actorId.value),
    ));
  }

  private values(protection: LoginProtection): typeof identityLoginProtection.$inferInsert {
    return {
      workspaceId: protection.workspaceId.value,
      actorId: protection.actorId.value,
      failedAttemptCount: protection.failedAttemptCount,
      failureWindowStartedAt: protection.failureWindowStartedAt,
      lockedUntil: protection.lockedUntil,
      lockLevel: protection.lockLevel,
      lastFailedAt: protection.lastFailedAt,
      updatedAt: protection.updatedAt,
    };
  }
}

const mapChallenge = (row: typeof identityPasswordRecoveryChallenges.$inferSelect): PasswordRecoveryChallenge => PasswordRecoveryChallenge.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  challengeId: ChallengeId.create(row.challengeId),
  actorId: ActorId.create(row.actorId),
  channel: row.channel as "PrimaryRecoveryContact",
  destinationVersion: row.destinationVersion,
  digest: { value: row.digest, keyVersion: row.digestKeyVersion },
  status: row.status as "Active" | "Verified" | "Consumed" | "Invalidated" | "Expired",
  attemptCount: row.attemptCount,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  verifiedAt: row.verifiedAt,
  consumedAt: row.consumedAt,
  invalidatedAt: row.invalidatedAt,
});

const challengeValues = (challenge: PasswordRecoveryChallenge): typeof identityPasswordRecoveryChallenges.$inferInsert => ({
  workspaceId: challenge.workspaceId.value,
  challengeId: challenge.challengeId.value,
  actorId: challenge.actorId.value,
  channel: challenge.channel,
  destinationVersion: challenge.destinationVersion,
  digest: challenge.digest.value,
  digestKeyVersion: challenge.digest.keyVersion,
  status: challenge.status,
  attemptCount: challenge.attemptCount,
  createdAt: challenge.createdAt,
  expiresAt: challenge.expiresAt,
  verifiedAt: challenge.verifiedAt,
  consumedAt: challenge.consumedAt,
  invalidatedAt: challenge.invalidatedAt,
});

export class PostgreSqlPasswordRecoveryChallengeRepository implements PasswordRecoveryChallengeRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(challenge: PasswordRecoveryChallenge): Promise<"Created" | "OpenChallengeConflict"> {
    const inserted = await this.database.insert(identityPasswordRecoveryChallenges)
      .values(challengeValues(challenge)).onConflictDoNothing()
      .returning({ challengeId: identityPasswordRecoveryChallenges.challengeId });
    return inserted.length === 1 ? "Created" : "OpenChallengeConflict";
  }

  async findById(workspaceId: WorkspaceId, challengeId: ChallengeId, options?: { readonly forUpdate?: boolean }): Promise<PasswordRecoveryChallenge | null> {
    const base = this.database.select().from(identityPasswordRecoveryChallenges).where(and(
      eq(identityPasswordRecoveryChallenges.workspaceId, workspaceId.value),
      eq(identityPasswordRecoveryChallenges.challengeId, challengeId.value),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapChallenge(rows[0]) : null;
  }

  async findOpenByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<PasswordRecoveryChallenge | null> {
    const base = this.database.select().from(identityPasswordRecoveryChallenges).where(and(
      eq(identityPasswordRecoveryChallenges.workspaceId, workspaceId.value),
      eq(identityPasswordRecoveryChallenges.actorId, actorId.value),
      inArray(identityPasswordRecoveryChallenges.status, ["Active", "Verified"]),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapChallenge(rows[0]) : null;
  }

  async countCreatedSince(workspaceId: WorkspaceId, actorId: ActorId, since: Date): Promise<number> {
    const rows = await this.database.$count(identityPasswordRecoveryChallenges, and(
      eq(identityPasswordRecoveryChallenges.workspaceId, workspaceId.value),
      eq(identityPasswordRecoveryChallenges.actorId, actorId.value),
      gte(identityPasswordRecoveryChallenges.createdAt, since),
    ));
    return rows;
  }

  async save(challenge: PasswordRecoveryChallenge): Promise<void> {
    const values = challengeValues(challenge);
    await this.database.update(identityPasswordRecoveryChallenges).set({
      status: values.status,
      attemptCount: values.attemptCount,
      verifiedAt: values.verifiedAt,
      consumedAt: values.consumedAt,
      invalidatedAt: values.invalidatedAt,
    }).where(and(
      eq(identityPasswordRecoveryChallenges.workspaceId, challenge.workspaceId.value),
      eq(identityPasswordRecoveryChallenges.challengeId, challenge.challengeId.value),
    ));
  }

  async invalidateOpenByActorId(workspaceId: WorkspaceId, actorId: ActorId, at: Date, exceptChallengeId?: ChallengeId): Promise<number> {
    const scope = [
      eq(identityPasswordRecoveryChallenges.workspaceId, workspaceId.value),
      eq(identityPasswordRecoveryChallenges.actorId, actorId.value),
      inArray(identityPasswordRecoveryChallenges.status, ["Active", "Verified"]),
    ];
    if (exceptChallengeId) scope.push(ne(identityPasswordRecoveryChallenges.challengeId, exceptChallengeId.value));
    const updated = await this.database.update(identityPasswordRecoveryChallenges).set({
      status: "Invalidated",
      invalidatedAt: at,
    }).where(and(...scope)).returning({ challengeId: identityPasswordRecoveryChallenges.challengeId });
    return updated.length;
  }
}

export class PostgreSqlMemberProfileRepository implements MemberProfileRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(profile: WorkspaceMemberProfile): Promise<void> {
    await this.database.insert(identityMemberProfiles).values({
      workspaceId: profile.workspaceId.value,
      actorId: profile.actorId.value,
      displayName: profile.displayName,
      recoveryPhone: profile.recoveryPhone.value,
      recoveryContactVersion: profile.recoveryContactVersion,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }

  async findByActorId(workspaceId: WorkspaceId, actorId: ActorId): Promise<WorkspaceMemberProfile | null> {
    const rows = await this.database.select().from(identityMemberProfiles).where(and(
      eq(identityMemberProfiles.workspaceId, workspaceId.value),
      eq(identityMemberProfiles.actorId, actorId.value),
    )).limit(1);
    const row = rows[0];
    if (!row) return null;
    return Object.freeze({
      workspaceId,
      actorId,
      displayName: row.displayName,
      recoveryPhone: E164PhoneNumber.create(row.recoveryPhone),
      recoveryContactVersion: row.recoveryContactVersion,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }
}

export class PostgreSqlMembershipRepository implements MembershipRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(membership: WorkspaceMembership): Promise<void> {
    await this.database.insert(identityMemberships).values({
      workspaceId: membership.workspaceId.value,
      actorId: membership.actorId.value,
      role: membership.role,
      branchScope: membership.branchScope,
      authorizationVersion: membership.authorizationVersion,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    });
  }

  async findByActorId(workspaceId: WorkspaceId, actorId: ActorId, options?: { readonly forUpdate?: boolean }): Promise<WorkspaceMembership | null> {
    const base = this.database.select().from(identityMemberships).where(and(
      eq(identityMemberships.workspaceId, workspaceId.value),
      eq(identityMemberships.actorId, actorId.value),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    const row = rows[0];
    return row ? createMembership({
      workspaceId,
      actorId,
      role: row.role as WorkspaceRole,
      branchScope: row.branchScope as WorkspaceMembership["branchScope"],
      authorizationVersion: row.authorizationVersion,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }) : null;
  }

  async findRole(workspaceId: WorkspaceId, actorId: ActorId): Promise<WorkspaceRole | null> {
    return (await this.findByActorId(workspaceId, actorId))?.role ?? null;
  }
}

const mapSession = (row: typeof identitySessions.$inferSelect): ServerSession => ServerSession.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  sessionId: SessionId.create(row.sessionId),
  digest: { value: row.digest, keyVersion: row.digestKeyVersion },
  actorId: ActorId.create(row.actorId),
  sessionClass: row.sessionClass as SessionClass,
  authorizationVersion: row.authorizationVersion,
  passwordVersion: row.passwordVersion,
  createdAt: row.createdAt,
  lastSeenAt: row.lastSeenAt,
  idleExpiresAt: row.idleExpiresAt,
  absoluteExpiresAt: row.absoluteExpiresAt,
  revokedAt: row.revokedAt,
  revocationReason: row.revocationReason as SessionRevocationReason | null,
});

const sessionValues = (session: ServerSession): typeof identitySessions.$inferInsert => ({
  workspaceId: session.workspaceId.value,
  sessionId: session.sessionId.value,
  digest: session.digest.value,
  digestKeyVersion: session.digest.keyVersion,
  actorId: session.actorId.value,
  sessionClass: session.sessionClass,
  authorizationVersion: session.authorizationVersion,
  passwordVersion: session.passwordVersion,
  createdAt: session.createdAt,
  lastSeenAt: session.lastSeenAt,
  idleExpiresAt: session.idleExpiresAt,
  absoluteExpiresAt: session.absoluteExpiresAt,
  revokedAt: session.revokedAt,
  revocationReason: session.revocationReason,
});

export class PostgreSqlSessionRepository implements SessionRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async create(session: ServerSession): Promise<"Created" | "SessionIdConflict" | "DigestConflict"> {
    const inserted = await this.database.insert(identitySessions).values(sessionValues(session))
      .onConflictDoNothing().returning({ sessionId: identitySessions.sessionId });
    if (inserted.length === 1) return "Created";
    const idMatch = await this.findById(session.workspaceId, session.sessionId);
    return idMatch ? "SessionIdConflict" : "DigestConflict";
  }

  async findByDigests(digests: readonly SessionDigestValue[], options?: { readonly forUpdate?: boolean }): Promise<ServerSession | null> {
    if (digests.length === 0) return null;
    const predicate = or(...digests.map((candidate) => and(
      eq(identitySessions.digestKeyVersion, candidate.keyVersion),
      eq(identitySessions.digest, candidate.value),
    )));
    const base = this.database.select().from(identitySessions).where(predicate).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async findById(workspaceId: WorkspaceId, sessionId: SessionId, options?: { readonly forUpdate?: boolean }): Promise<ServerSession | null> {
    const base = this.database.select().from(identitySessions).where(and(
      eq(identitySessions.workspaceId, workspaceId.value),
      eq(identitySessions.sessionId, sessionId.value),
    )).limit(1);
    const rows = options?.forUpdate ? await base.for("update") : await base;
    return rows[0] ? mapSession(rows[0]) : null;
  }

  async save(session: ServerSession): Promise<void> {
    await this.database.update(identitySessions).set({
      lastSeenAt: session.lastSeenAt,
      idleExpiresAt: session.idleExpiresAt,
      revokedAt: session.revokedAt,
      revocationReason: session.revocationReason,
    }).where(and(
      eq(identitySessions.workspaceId, session.workspaceId.value),
      eq(identitySessions.sessionId, session.sessionId.value),
    ));
  }

  async revokeAllForActor(workspaceId: WorkspaceId, actorId: ActorId, reason: SessionRevocationReason, at: Date): Promise<number> {
    const rows = await this.database.update(identitySessions).set({ revokedAt: at, revocationReason: reason }).where(and(
      eq(identitySessions.workspaceId, workspaceId.value),
      eq(identitySessions.actorId, actorId.value),
      isNull(identitySessions.revokedAt),
    )).returning({ sessionId: identitySessions.sessionId });
    return rows.length;
  }

  async revokeOtherSessions(
    workspaceId: WorkspaceId,
    actorId: ActorId,
    exceptSessionId: SessionId,
    reason: SessionRevocationReason,
    at: Date,
  ): Promise<number> {
    const rows = await this.database.update(identitySessions).set({ revokedAt: at, revocationReason: reason }).where(and(
      eq(identitySessions.workspaceId, workspaceId.value),
      eq(identitySessions.actorId, actorId.value),
      ne(identitySessions.sessionId, exceptSessionId.value),
      isNull(identitySessions.revokedAt),
    )).returning({ sessionId: identitySessions.sessionId });
    return rows.length;
  }

  async deleteCleanupEligible(at: Date, revokedBefore: Date, limit: number): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) throw new Error("SessionCleanupLimitInvalid");
    const result = await this.database.execute<{ session_id: string }>(sql`
      DELETE FROM identity_sessions
      WHERE (workspace_id, session_id) IN (
        SELECT workspace_id, session_id
        FROM identity_sessions
        WHERE (revoked_at IS NOT NULL AND revoked_at <= ${revokedBefore})
           OR (revoked_at IS NULL AND (idle_expires_at <= ${at} OR absolute_expires_at <= ${at}))
        ORDER BY COALESCE(revoked_at, idle_expires_at, absolute_expires_at)
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING session_id
    `);
    return result.rows.length;
  }
}
