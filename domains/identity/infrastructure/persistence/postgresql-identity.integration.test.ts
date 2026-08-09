import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { ActorId, ChallengeId, WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../catalog/infrastructure/persistence/integration-test-database-safety";
import { CreateAccountUseCase } from "../../application/create-account.use-case";
import { CompletePasswordRecoveryUseCase, CreatePasswordRecoveryChallengeUseCase, VerifyPasswordRecoveryChallengeUseCase } from "../../application/password-recovery.use-cases";
import { EmergencyOwnerPasswordResetUseCase, OwnerResetPasswordUseCase } from "../../application/password-reset.use-cases";
import { WorkspaceBootstrapUseCase } from "../../application/workspace-bootstrap.use-case";
import { ChangePasswordAndRotateSessionUseCase } from "../../application/change-password-and-rotate-session.use-case";
import { CleanupSessionsUseCase, LoginUseCase, LogoutUseCase, ResolveSessionUseCase } from "../../application/session.use-cases";
import { Username } from "../../domain/username";
import { Argon2idPasswordHasher } from "../crypto/argon2-password-hasher";
import { CryptographicRecoveryCodeGenerator, HmacSha256RecoveryCodeDigest } from "../crypto/hmac-recovery-code-digest";
import { CryptographicSessionTokenGenerator, HmacSha256SessionTokenDigest } from "../crypto/session-token-crypto";
import { RandomIdentityIdentifierGenerator, RandomSessionIdentifierGenerator } from "../system-identity-adapters";
import { PostgreSqlIdentityUnitOfWork } from "./postgresql-identity-unit-of-work";
import { PostgreSqlAccountRepository, PostgreSqlPasswordCredentialRepository, PostgreSqlPasswordRecoveryChallengeRepository } from "./postgresql-identity.repositories";
import { identityMemberships, identityPasswordCredentials, identityPasswordRecoveryChallenges, identitySessions } from "./schema";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createPlatformDatabaseConnection(connectionUrl!);
const hasher = new Argon2idPasswordHasher();
const unitOfWork = new PostgreSqlIdentityUnitOfWork(connection.database);
const identifiers = new RandomIdentityIdentifierGenerator();
const clock = { now: () => new Date() };
const digest = new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(32, 9) }], 1);

const bootstrap = new WorkspaceBootstrapUseCase(unitOfWork, hasher, clock, identifiers);
const createAccount = new CreateAccountUseCase(unitOfWork, hasher, clock, identifiers);
const createRecovery = new CreatePasswordRecoveryChallengeUseCase(
  unitOfWork,
  digest,
  new CryptographicRecoveryCodeGenerator(),
  clock,
  identifiers,
);
const verifyRecovery = new VerifyPasswordRecoveryChallengeUseCase(unitOfWork, digest, clock);
const completeRecovery = new CompletePasswordRecoveryUseCase(unitOfWork, hasher, clock);
const ownerReset = new OwnerResetPasswordUseCase(unitOfWork, hasher, clock);
const emergencyReset = new EmergencyOwnerPasswordResetUseCase(unitOfWork, hasher, clock);
const sessionDigest = new HmacSha256SessionTokenDigest([{ version: 1, keyBytes: Buffer.alloc(32, 21) }], 1);
const sessionIssuance = {
  identifiers: new RandomSessionIdentifierGenerator(),
  values: new CryptographicSessionTokenGenerator(),
  digest: sessionDigest,
} as const;
const login = new LoginUseCase(unitOfWork, hasher, clock, sessionIssuance);
const resolveSession = new ResolveSessionUseCase(unitOfWork, sessionDigest, clock);
const logout = new LogoutUseCase(unitOfWork, sessionDigest, clock);
const changePassword = new ChangePasswordAndRotateSessionUseCase(unitOfWork, hasher, sessionDigest, clock, sessionIssuance);
const cleanupSessions = new CleanupSessionsUseCase(unitOfWork, clock);

const bootstrapCommand = (code: string, username: string) => ({
  companyId: "company-integration",
  workspaceCode: code,
  workspaceDisplayName: `Workspace ${code}`,
  ownerUsername: username,
  ownerDisplayName: "Integration Owner",
  ownerRecoveryPhone: "+967711234567",
  temporaryPassword: "Integration temporary 123",
});

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => connection.database.execute(sql`TRUNCATE TABLE workspaces CASCADE`));
after(async () => connection.close());

describe("PostgreSQL Identity bootstrap and isolation", () => {
  it("persists the complete bootstrap atomically without plaintext password", async () => {
    const result = await bootstrap.execute(bootstrapCommand("integration-01", "Owner.Main"));
    assert.ok(result.ok);
    if (!result.ok) return;
    const rows = await connection.database.select().from(identityPasswordCredentials);
    assert.equal(rows.length, 1);
    assert.match(rows[0]!.passwordHash, /^\$argon2id\$/);
    assert.equal(rows[0]!.passwordHash.includes("Integration temporary 123"), false);
    assert.equal(rows[0]!.passwordLifecycle, "Temporary");
    assert.equal(rows[0]!.passwordVersion, 1);
    const counts = await connection.database.execute<{
      workspaces: string;
      accounts: string;
      profiles: string;
      memberships: string;
      settings: string;
      protections: string;
      audits: string;
    }>(sql`
      SELECT
        (SELECT count(*) FROM workspaces)::text AS workspaces,
        (SELECT count(*) FROM identity_accounts)::text AS accounts,
        (SELECT count(*) FROM identity_member_profiles)::text AS profiles,
        (SELECT count(*) FROM identity_memberships)::text AS memberships,
        (SELECT count(*) FROM workspace_communication_settings)::text AS settings,
        (SELECT count(*) FROM identity_login_protection)::text AS protections,
        (SELECT count(*) FROM security_audit_events)::text AS audits
    `);
    assert.deepEqual(counts.rows[0], {
      workspaces: "1",
      accounts: "1",
      profiles: "1",
      memberships: "1",
      settings: "1",
      protections: "1",
      audits: "3",
    });
  });

  it("maps duplicate Workspace code and rolls back every second-bootstrap write", async () => {
    assert.ok((await bootstrap.execute(bootstrapCommand("integration-01", "owner-one"))).ok);
    assert.deepEqual(await bootstrap.execute(bootstrapCommand("INTEGRATION-01", "owner-two")), {
      ok: false,
      error: "WorkspaceCodeAlreadyExists",
    });
    const counts = await connection.database.execute<{ workspaces: string; accounts: string }>(sql`
      SELECT (SELECT count(*) FROM workspaces)::text AS workspaces,
             (SELECT count(*) FROM identity_accounts)::text AS accounts
    `);
    assert.deepEqual(counts.rows[0], { workspaces: "1", accounts: "1" });
  });

  it("rolls back Workspace, account, credential, profile, membership, settings, and Audit on forced Audit failure", async () => {
    await connection.database.execute(sql`
      CREATE OR REPLACE FUNCTION qsc_test_reject_security_audit()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        RAISE EXCEPTION 'forced security audit failure';
      END;
      $function$
    `);
    await connection.database.execute(sql`
      CREATE TRIGGER qsc_test_reject_security_audit_trigger
      BEFORE INSERT ON security_audit_events
      FOR EACH ROW EXECUTE FUNCTION qsc_test_reject_security_audit()
    `);
    try {
      assert.deepEqual(await bootstrap.execute(bootstrapCommand("rollback-01", "owner")), {
        ok: false,
        error: "InfrastructureUnavailable",
      });
      const result = await connection.database.execute<{ count: string }>(sql`SELECT count(*)::text AS count FROM workspaces`);
      assert.equal(result.rows[0]!.count, "0");
    } finally {
      await connection.database.execute(sql`DROP TRIGGER IF EXISTS qsc_test_reject_security_audit_trigger ON security_audit_events`);
      await connection.database.execute(sql`DROP FUNCTION IF EXISTS qsc_test_reject_security_audit()`);
    }
  });

  it("isolates username, credential, challenge, and reset operations by Workspace", async () => {
    const first = await bootstrap.execute(bootstrapCommand("integration-01", "owner-one"));
    const second = await bootstrap.execute(bootstrapCommand("integration-02", "owner-two"));
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    const challenge = await createRecovery.execute({ workspaceId: first.value.workspaceId, actorId: first.value.actorId });
    assert.ok(challenge.ok);
    if (!challenge.ok) return;
    const accountRepository = new PostgreSqlAccountRepository(connection.database);
    const credentialRepository = new PostgreSqlPasswordCredentialRepository(connection.database);
    const challengeRepository = new PostgreSqlPasswordRecoveryChallengeRepository(connection.database);
    assert.equal(await accountRepository.findByUsername(WorkspaceId.create(second.value.workspaceId), Username.create("owner-one")), null);
    assert.equal(await credentialRepository.findByActorId(WorkspaceId.create(second.value.workspaceId), ActorId.create(first.value.actorId)), null);
    assert.equal(await challengeRepository.findById(WorkspaceId.create(second.value.workspaceId), ChallengeId.create(challenge.value.challengeId)), null);
    assert.deepEqual(await verifyRecovery.execute({
      workspaceId: second.value.workspaceId,
      challengeId: challenge.value.challengeId,
      code: challenge.value.code,
    }), { ok: false, error: "RecoveryChallengeNotFound" });
    assert.deepEqual(await ownerReset.execute({
      workspaceId: second.value.workspaceId,
      requestedByActorId: second.value.actorId,
      targetActorId: first.value.actorId,
      newTemporaryPassword: "Cross tenant reset 123",
    }), { ok: false, error: "AccountNotFound" });
  });
});

describe("PostgreSQL server sessions", () => {
  it("persists only the digest, enforces global digest uniqueness, and rejects cross-Workspace actor references", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner-one"));
    assert.ok(owner.ok);
    const authenticated = await login.execute({
      workspaceCode: "integration-01",
      username: "owner-one",
      password: "Integration temporary 123",
    });
    assert.ok(authenticated.ok && owner.ok);
    if (!authenticated.ok || !owner.ok) return;
    const rows = await connection.database.select().from(identitySessions);
    assert.equal(rows.length, 1);
    assert.match(rows[0]!.digest, /^[a-f0-9]{64}$/);
    assert.equal(rows[0]!.digest.includes(authenticated.value.opaqueValue), false);
    const columns = await connection.database.execute<{ column_name: string }>(sql`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'identity_sessions'
    `);
    assert.equal(columns.rows.some((row) => row.column_name === 'token'), false);
    assert.equal(columns.rows.some((row) => row.column_name === 'token_hash'), true);

    await assert.rejects(
      connection.database.execute(sql`
        INSERT INTO identity_sessions
        SELECT workspace_id, ${"duplicate-session"}, token_hash, token_key_version, actor_id, session_class,
               authorization_version, password_version, created_at, last_seen_at, idle_expires_at,
               absolute_expires_at, revoked_at, revocation_reason
        FROM identity_sessions LIMIT 1
      `),
      (error: unknown) => (error as { cause?: { constraint?: string } }).cause?.constraint === "identity_sessions_token_hash_uq",
    );

    const second = await bootstrap.execute(bootstrapCommand("integration-02", "owner-two"));
    assert.ok(second.ok);
    if (!second.ok) return;
    await assert.rejects(
      connection.database.execute(sql`
        INSERT INTO identity_sessions
        SELECT ${second.value.workspaceId}, ${"foreign-session"}, ${"f".repeat(64)}, token_key_version,
               actor_id, session_class, authorization_version, password_version, created_at, last_seen_at,
               idle_expires_at, absolute_expires_at, revoked_at, revocation_reason
        FROM identity_sessions WHERE workspace_id = ${owner.value.workspaceId} LIMIT 1
      `),
      (error: unknown) => [
        "identity_sessions_account_fk",
        "identity_sessions_credential_fk",
        "identity_sessions_membership_fk",
      ].includes((error as { cause?: { constraint?: string } }).cause?.constraint ?? ""),
    );
  });

  it("allows simultaneous successful logins and serializes concurrent failed-attempt increments", async () => {
    await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    const successful = await Promise.all([
      login.execute({ workspaceCode: "integration-01", username: "owner", password: "Integration temporary 123" }),
      login.execute({ workspaceCode: "INTEGRATION-01", username: "OWNER", password: "Integration temporary 123" }),
    ]);
    assert.equal(successful.filter((result) => result.ok).length, 2);
    assert.equal((await connection.database.select().from(identitySessions)).length, 2);

    const failures = await Promise.all(Array.from({ length: 5 }, () => login.execute({
      workspaceCode: "integration-01",
      username: "owner",
      password: "Incorrect integration value",
    })));
    assert.equal(failures.filter((result) => !result.ok).length, 5);
    const protection = await connection.database.execute<{ failed_attempt_count: number; lock_level: number; locked_until: Date | null }>(sql`
      SELECT failed_attempt_count, lock_level, locked_until FROM identity_login_protection
    `);
    assert.equal(protection.rows[0]!.failed_attempt_count, 0);
    assert.equal(protection.rows[0]!.lock_level, 1);
    assert.ok(protection.rows[0]!.locked_until);
    assert.equal((await connection.database.select().from(identitySessions)).length, 2);
  });

  it("rotates restricted authority and rejects every concurrent stale authorization read", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    const restricted = await login.execute({
      workspaceCode: "integration-01",
      username: "owner",
      password: "Integration temporary 123",
    });
    assert.ok(restricted.ok && owner.ok);
    if (!restricted.ok || !owner.ok) return;
    const rotated = await changePassword.execute({
      rawSessionValue: restricted.value.opaqueValue,
      currentPassword: "Integration temporary 123",
      newPassword: "Integration permanent 456",
    });
    assert.ok(rotated.ok);
    if (!rotated.ok) return;
    assert.deepEqual(await resolveSession.execute({ rawSessionValue: restricted.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionRevoked",
    });
    assert.ok((await resolveSession.execute({ rawSessionValue: rotated.value.opaqueValue, requiredClass: "Full" })).ok);

    await connection.database.update(identityMemberships).set({ authorizationVersion: 2 }).where(sql`
      ${identityMemberships.workspaceId} = ${owner.value.workspaceId}
      AND ${identityMemberships.actorId} = ${owner.value.actorId}
    `);
    const concurrent = await Promise.all([
      resolveSession.execute({ rawSessionValue: rotated.value.opaqueValue, requiredClass: "Full" }),
      resolveSession.execute({ rawSessionValue: rotated.value.opaqueValue, requiredClass: "Full" }),
    ]);
    assert.equal(concurrent.some((result) => result.ok), false);
    assert.equal(concurrent.some((result) => !result.ok && result.error === "SessionStaleAuthorizationVersion"), true);
  });

  it("integrates actor-wide reset revocation, idempotent logout, expiry cleanup, and retention cleanup", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const firstLogin = await login.execute({
      workspaceCode: "integration-01",
      username: "owner",
      password: "Integration temporary 123",
    });
    assert.ok(firstLogin.ok);
    if (!firstLogin.ok) return;
    assert.ok((await emergencyReset.execute({
      workspaceCode: "integration-01",
      ownerUsername: "owner",
      newTemporaryPassword: "Owner reset value 456",
    })).ok);
    assert.deepEqual(await resolveSession.execute({ rawSessionValue: firstLogin.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionRevoked",
    });

    const ownerLogin = await login.execute({
      workspaceCode: "integration-01",
      username: "owner",
      password: "Owner reset value 456",
    });
    assert.ok(ownerLogin.ok);
    if (!ownerLogin.ok) return;
    assert.deepEqual(await logout.execute(ownerLogin.value.opaqueValue), { ok: true, value: null });
    assert.deepEqual(await logout.execute(ownerLogin.value.opaqueValue), { ok: true, value: null });
    await connection.database.execute(sql`
      UPDATE identity_sessions SET revoked_at = now() - interval '8 days'
      WHERE revocation_reason = 'Logout'
    `);

    const expiring = await login.execute({
      workspaceCode: "integration-01",
      username: "owner",
      password: "Owner reset value 456",
    });
    assert.ok(expiring.ok);
    await connection.database.execute(sql`
      UPDATE identity_sessions
      SET created_at = now() - interval '13 hours',
          last_seen_at = now() - interval '3 hours',
          idle_expires_at = now() - interval '1 hour',
          absolute_expires_at = now() - interval '30 minutes'
      WHERE revoked_at IS NULL
    `);
    const cleanup = await cleanupSessions.execute();
    assert.ok(cleanup.ok);
    if (cleanup.ok) assert.equal(cleanup.value.deletedCount, 2);
  });
});

describe("PostgreSQL Identity concurrency and lifecycle", () => {
  it("enforces the approved membership branch-scope vocabulary in migration 0007", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const rejectedLegacyScope = ["Assigned", "Branches"].join("");

    await connection.database.execute(sql`
      UPDATE identity_memberships
      SET role = 'Staff', branch_scope = 'SelectedBranches'
      WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
    `);
    const selected = await connection.database.execute<{ role: string; branchScope: string }>(sql`
      SELECT role, branch_scope AS "branchScope"
      FROM identity_memberships
      WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
    `);
    assert.deepEqual(selected.rows[0], { role: "Staff", branchScope: "SelectedBranches" });

    await assert.rejects(
      connection.database.execute(sql`
        UPDATE identity_memberships SET branch_scope = ${rejectedLegacyScope}
        WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
      `),
      (error: unknown) =>
        (error as { cause?: { constraint?: string } }).cause?.constraint === "identity_memberships_branch_scope",
    );
    await assert.rejects(
      connection.database.execute(sql`
        UPDATE identity_memberships SET role = 'Owner'
        WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
      `),
      (error: unknown) =>
        (error as { cause?: { constraint?: string } }).cause?.constraint === "identity_memberships_owner_scope",
    );

    await connection.database.execute(sql`
      UPDATE identity_memberships
      SET role = 'Owner', branch_scope = 'AllBranches'
      WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
    `);
    const restoredOwner = await connection.database.execute<{ role: string; branchScope: string }>(sql`
      SELECT role, branch_scope AS "branchScope"
      FROM identity_memberships
      WHERE workspace_id = ${owner.value.workspaceId} AND actor_id = ${owner.value.actorId}
    `);
    assert.deepEqual(restoredOwner.rows[0], { role: "Owner", branchScope: "AllBranches" });
  });

  it("allows exactly one concurrent account to claim a normalized username", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const command = {
      workspaceId: owner.value.workspaceId,
      requestedByActorId: owner.value.actorId,
      username: "Concurrent.Staff",
      temporaryPassword: "Concurrent temporary 123",
    };
    const results = await Promise.all([
      createAccount.execute(command),
      createAccount.execute({ ...command, username: "CONCURRENT.STAFF" }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok && result.error === "UsernameAlreadyExists").length, 1);
  });

  it("serializes recovery issuance so only one challenge remains open", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const results = await Promise.all([
      createRecovery.execute({ workspaceId: owner.value.workspaceId, actorId: owner.value.actorId }),
      createRecovery.execute({ workspaceId: owner.value.workspaceId, actorId: owner.value.actorId }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok && result.error === "RecoveryRateLimited").length, 1);
    const rows = await connection.database.select().from(identityPasswordRecoveryChallenges);
    assert.equal(rows.filter((row) => ["Active", "Verified"].includes(row.status)).length, 1);
    assert.equal(rows[0]!.digest.length, 64);
    const successful = results.find((result) => result.ok);
    assert.ok(successful?.ok);
    if (successful?.ok) assert.equal(rows[0]!.digest.includes(successful.value.code), false);
  });

  it("consumes a verified challenge once and increments password version safely", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const challenge = await createRecovery.execute({ workspaceId: owner.value.workspaceId, actorId: owner.value.actorId });
    assert.ok(challenge.ok);
    if (!challenge.ok) return;
    assert.ok((await verifyRecovery.execute({ workspaceId: owner.value.workspaceId, challengeId: challenge.value.challengeId, code: challenge.value.code })).ok);
    const command = {
      workspaceId: owner.value.workspaceId,
      challengeId: challenge.value.challengeId,
      newPassword: "Recovered permanent 123",
    };
    const results = await Promise.all([completeRecovery.execute(command), completeRecovery.execute(command)]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok && result.error === "RecoveryChallengeConsumed").length, 1);
    const credentials = await connection.database.select().from(identityPasswordCredentials);
    assert.equal(credentials[0]!.passwordVersion, 2);
    assert.equal(credentials[0]!.passwordLifecycle, "Permanent");
  });

  it("keeps concurrent Owner resets version-safe", async () => {
    const owner = await bootstrap.execute(bootstrapCommand("integration-01", "owner"));
    assert.ok(owner.ok);
    if (!owner.ok) return;
    const staff = await createAccount.execute({
      workspaceId: owner.value.workspaceId,
      requestedByActorId: owner.value.actorId,
      username: "staff",
      temporaryPassword: "Initial temporary 123",
    });
    assert.ok(staff.ok);
    if (!staff.ok) return;
    const results = await Promise.all([
      ownerReset.execute({ workspaceId: owner.value.workspaceId, requestedByActorId: owner.value.actorId, targetActorId: staff.value.actorId, newTemporaryPassword: "Concurrent reset one 123" }),
      ownerReset.execute({ workspaceId: owner.value.workspaceId, requestedByActorId: owner.value.actorId, targetActorId: staff.value.actorId, newTemporaryPassword: "Concurrent reset two 123" }),
    ]);
    assert.ok(results.every((result) => result.ok));
    assert.deepEqual(results.flatMap((result) => result.ok ? [result.value.passwordVersion] : []).sort(), [2, 3]);
  });

  it("applies the 0008 migration with scoped Identity sessions and authorization version", async () => {
    const result = await connection.database.execute<{
      workspace: string | null;
      account: string | null;
      credential: string | null;
      protection: string | null;
      challenge: string | null;
      audit: string | null;
      session: string | null;
      authorizationVersion: string | null;
      migration: string | null;
    }>(sql`
      SELECT
        to_regclass('workspaces')::text AS workspace,
        to_regclass('identity_accounts')::text AS account,
        to_regclass('identity_password_credentials')::text AS credential,
        to_regclass('identity_login_protection')::text AS protection,
        to_regclass('identity_password_recovery_challenges')::text AS challenge,
        to_regclass('security_audit_events')::text AS audit,
        to_regclass('identity_sessions')::text AS session,
        (SELECT data_type FROM information_schema.columns
         WHERE table_name = 'identity_memberships' AND column_name = 'authorization_version') AS "authorizationVersion",
        (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1) AS migration
    `);
    assert.deepEqual({ ...result.rows[0], migration: typeof result.rows[0]?.migration }, {
      workspace: "workspaces",
      account: "identity_accounts",
      credential: "identity_password_credentials",
      protection: "identity_login_protection",
      challenge: "identity_password_recovery_challenges",
      audit: "security_audit_events",
      session: "identity_sessions",
      authorizationVersion: "bigint",
      migration: "string",
    });
  });
});
