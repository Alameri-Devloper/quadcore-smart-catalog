import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { ActorId, ChallengeId, WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../catalog/infrastructure/persistence/integration-test-database-safety";
import { CreateAccountUseCase } from "../../application/create-account.use-case";
import { CompletePasswordRecoveryUseCase, CreatePasswordRecoveryChallengeUseCase, VerifyPasswordRecoveryChallengeUseCase } from "../../application/password-recovery.use-cases";
import { OwnerResetPasswordUseCase } from "../../application/password-reset.use-cases";
import { WorkspaceBootstrapUseCase } from "../../application/workspace-bootstrap.use-case";
import { Username } from "../../domain/username";
import { Argon2idPasswordHasher } from "../crypto/argon2-password-hasher";
import { CryptographicRecoveryCodeGenerator, HmacSha256RecoveryCodeDigest } from "../crypto/hmac-recovery-code-digest";
import { RandomIdentityIdentifierGenerator } from "../system-identity-adapters";
import { PostgreSqlIdentityUnitOfWork } from "./postgresql-identity-unit-of-work";
import { PostgreSqlAccountRepository, PostgreSqlPasswordCredentialRepository, PostgreSqlPasswordRecoveryChallengeRepository } from "./postgresql-identity.repositories";
import { identityPasswordCredentials, identityPasswordRecoveryChallenges } from "./schema";

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

  it("applies the 0007 migration with all scoped Identity tables", async () => {
    const result = await connection.database.execute<{
      workspace: string | null;
      account: string | null;
      credential: string | null;
      protection: string | null;
      challenge: string | null;
      audit: string | null;
      migration: string | null;
    }>(sql`
      SELECT
        to_regclass('workspaces')::text AS workspace,
        to_regclass('identity_accounts')::text AS account,
        to_regclass('identity_password_credentials')::text AS credential,
        to_regclass('identity_login_protection')::text AS protection,
        to_regclass('identity_password_recovery_challenges')::text AS challenge,
        to_regclass('security_audit_events')::text AS audit,
        (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1) AS migration
    `);
    assert.deepEqual({ ...result.rows[0], migration: typeof result.rows[0]?.migration }, {
      workspace: "workspaces",
      account: "identity_accounts",
      credential: "identity_password_credentials",
      protection: "identity_login_protection",
      challenge: "identity_password_recovery_challenges",
      audit: "security_audit_events",
      migration: "string",
    });
  });
});
