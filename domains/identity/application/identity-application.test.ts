import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { CreateAccountUseCase } from "./create-account.use-case";
import { ActivateAccountUseCase, ReactivateAccountUseCase, SuspendAccountUseCase } from "./account-lifecycle.use-cases";
import { RecordLoginFailureUseCase } from "./login-protection.use-cases";
import { CompletePasswordRecoveryUseCase, CreatePasswordRecoveryChallengeUseCase, VerifyPasswordRecoveryChallengeUseCase } from "./password-recovery.use-cases";
import { EmergencyOwnerPasswordResetUseCase, OwnerResetPasswordUseCase } from "./password-reset.use-cases";
import { WorkspaceBootstrapUseCase } from "./workspace-bootstrap.use-case";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher, RecoveryCodeGenerator } from "./ports";
import { PasswordHash } from "../domain/password";
import { HmacSha256RecoveryCodeDigest } from "../infrastructure/crypto/hmac-recovery-code-digest";
import { InMemoryIdentityUnitOfWork } from "../mock/in-memory-identity-unit-of-work";

class MutableClock implements IdentityClock {
  constructor(private value = new Date("2026-08-01T00:00:00.000Z")) {}
  now(): Date { return new Date(this.value); }
  advance(milliseconds: number): void { this.value = new Date(this.value.getTime() + milliseconds); }
}

class SequentialIdentifiers implements IdentityIdentifierGenerator {
  private workspace = 0;
  private actor = 0;
  private challenge = 0;
  workspaceId(): string { this.workspace += 1; return `workspace-${this.workspace}`; }
  actorId(): string { this.actor += 1; return `actor-${this.actor}`; }
  challengeId(): string { this.challenge += 1; return `challenge-${this.challenge}`; }
}

class TestPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<PasswordHash> {
    return PasswordHash.rehydrate(`test$${createHash("sha256").update(password, "utf8").digest("hex")}`);
  }
  async verify(password: string, hash: PasswordHash): Promise<boolean> {
    return (await this.hash(password)).value === hash.value;
  }
  needsRehash(): boolean { return false; }
}

class QueuedRecoveryCodeGenerator implements RecoveryCodeGenerator {
  private next = 0;
  generate(): string {
    this.next += 1;
    return this.next.toString().padStart(8, "0");
  }
}

const bootstrapCommand = (workspaceCode: string, ownerUsername: string, password = "Temporary pass 123") => ({
  companyId: "company-a",
  workspaceCode,
  workspaceDisplayName: `Workspace ${workspaceCode}`,
  ownerUsername,
  ownerDisplayName: "Initial Owner",
  ownerRecoveryPhone: "+967711234567",
  temporaryPassword: password,
});

const createFixture = () => {
  const unitOfWork = new InMemoryIdentityUnitOfWork();
  const clock = new MutableClock();
  const identifiers = new SequentialIdentifiers();
  const passwordHasher = new TestPasswordHasher();
  const digest = new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(32, 7) }], 1);
  const codes = new QueuedRecoveryCodeGenerator();
  return {
    unitOfWork,
    clock,
    identifiers,
    passwordHasher,
    bootstrap: new WorkspaceBootstrapUseCase(unitOfWork, passwordHasher, clock, identifiers),
    createAccount: new CreateAccountUseCase(unitOfWork, passwordHasher, clock, identifiers),
    activateAccount: new ActivateAccountUseCase(unitOfWork, passwordHasher, clock),
    suspendAccount: new SuspendAccountUseCase(unitOfWork, clock),
    reactivateAccount: new ReactivateAccountUseCase(unitOfWork, passwordHasher, clock),
    ownerReset: new OwnerResetPasswordUseCase(unitOfWork, passwordHasher, clock),
    emergencyReset: new EmergencyOwnerPasswordResetUseCase(unitOfWork, passwordHasher, clock),
    createRecovery: new CreatePasswordRecoveryChallengeUseCase(unitOfWork, digest, codes, clock, identifiers),
    verifyRecovery: new VerifyPasswordRecoveryChallengeUseCase(unitOfWork, digest, clock),
    completeRecovery: new CompletePasswordRecoveryUseCase(unitOfWork, passwordHasher, clock),
    loginFailure: new RecordLoginFailureUseCase(unitOfWork, clock),
  };
};

describe("Workspace bootstrap application", () => {
  it("atomically creates the Workspace and initial Owner foundation", async () => {
    const fixture = createFixture();
    const result = await fixture.bootstrap.execute(bootstrapCommand("store-01", "Owner.Main"));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual({
      accountStatus: result.value.accountStatus,
      passwordLifecycle: result.value.passwordLifecycle,
      role: result.value.role,
      branchScope: result.value.branchScope,
    }, {
      accountStatus: "PendingActivation",
      passwordLifecycle: "Temporary",
      role: "Owner",
      branchScope: "AllBranches",
    });
    assert.equal(fixture.unitOfWork.state.workspaces.size, 1);
    assert.equal(fixture.unitOfWork.state.accounts.size, 1);
    assert.equal(fixture.unitOfWork.state.credentials.size, 1);
    assert.equal(fixture.unitOfWork.state.profiles.size, 1);
    assert.equal(fixture.unitOfWork.state.memberships.size, 1);
    assert.equal(fixture.unitOfWork.state.communicationSettings.size, 1);
    assert.equal(fixture.unitOfWork.state.audits.length, 3);
    assert.equal(JSON.stringify(fixture.unitOfWork.state).includes("Temporary pass 123"), false);
  });

  it("returns stable validation errors without opening a transaction", async () => {
    const fixture = createFixture();
    assert.deepEqual(await fixture.bootstrap.execute(bootstrapCommand("bad_code", "owner")), { ok: false, error: "WorkspaceCodeInvalid" });
    assert.deepEqual(await fixture.bootstrap.execute(bootstrapCommand("store-01", "x")), { ok: false, error: "UsernameInvalid" });
    assert.deepEqual(await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner", "too short")), { ok: false, error: "PasswordInvalid" });
    assert.equal(fixture.unitOfWork.transactionCount, 0);
  });

  it("rolls back every record for duplicate code and Audit failure", async () => {
    const fixture = createFixture();
    assert.equal((await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner-a"))).ok, true);
    assert.deepEqual(await fixture.bootstrap.execute(bootstrapCommand("STORE-01", "owner-b")), { ok: false, error: "WorkspaceCodeAlreadyExists" });
    assert.equal(fixture.unitOfWork.state.workspaces.size, 1);
    assert.equal(fixture.unitOfWork.state.accounts.size, 1);

    const failed = createFixture();
    failed.unitOfWork.failAudit = true;
    assert.deepEqual(await failed.bootstrap.execute(bootstrapCommand("store-02", "owner")), { ok: false, error: "InfrastructureUnavailable" });
    assert.equal(failed.unitOfWork.state.workspaces.size, 0);
    assert.equal(failed.unitOfWork.state.accounts.size, 0);
    assert.equal(failed.unitOfWork.state.credentials.size, 0);
  });
});

describe("Account creation and reset application", () => {
  it("activates with a Permanent password and protects the last Active Owner", async () => {
    const fixture = createFixture();
    const bootstrap = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner"));
    assert.ok(bootstrap.ok);
    if (!bootstrap.ok) return;
    assert.deepEqual(await fixture.activateAccount.execute({
      workspaceId: bootstrap.value.workspaceId,
      actorId: bootstrap.value.actorId,
      newPermanentPassword: "First permanent 123",
    }), { ok: true, value: { passwordVersion: 2 } });
    const recovery = await fixture.createRecovery.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId });
    assert.ok(recovery.ok);
    assert.deepEqual(await fixture.suspendAccount.execute({
      workspaceId: bootstrap.value.workspaceId,
      requestedByActorId: bootstrap.value.actorId,
      targetActorId: bootstrap.value.actorId,
    }), { ok: false, error: "LastActiveOwnerProtected" });
    const account = [...fixture.unitOfWork.state.accounts.values()][0]!;
    const challenge = [...fixture.unitOfWork.state.challenges.values()][0]!;
    assert.equal(account.status, "Active");
    assert.equal(challenge.status, "Active");
    assert.equal([...fixture.unitOfWork.state.credentials.values()][0]!.lifecycle, "Permanent");
  });

  it("enforces Workspace-scoped usernames and Owner authority", async () => {
    const fixture = createFixture();
    const first = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner-one"));
    const second = await fixture.bootstrap.execute(bootstrapCommand("store-02", "owner-two"));
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    const firstStaff = await fixture.createAccount.execute({
      workspaceId: first.value.workspaceId,
      requestedByActorId: first.value.actorId,
      username: "staff.common",
      temporaryPassword: "Staff temporary 123",
    });
    const secondStaff = await fixture.createAccount.execute({
      workspaceId: second.value.workspaceId,
      requestedByActorId: second.value.actorId,
      username: "STAFF.COMMON",
      temporaryPassword: "Staff temporary 123",
    });
    assert.ok(firstStaff.ok && secondStaff.ok);
    assert.deepEqual(await fixture.createAccount.execute({
      workspaceId: first.value.workspaceId,
      requestedByActorId: first.value.actorId,
      username: "STAFF.COMMON",
      temporaryPassword: "Another temporary 123",
    }), { ok: false, error: "UsernameAlreadyExists" });
    assert.deepEqual(await fixture.createAccount.execute({
      workspaceId: first.value.workspaceId,
      requestedByActorId: firstStaff.ok ? firstStaff.value.actorId : "missing",
      username: "unauthorized",
      temporaryPassword: "Another temporary 123",
    }), { ok: false, error: "OwnerRequired" });
  });

  it("replaces credentials with Temporary, increments version, clears lock, and supports emergency Owner reset", async () => {
    const fixture = createFixture();
    const bootstrap = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner"));
    assert.ok(bootstrap.ok);
    if (!bootstrap.ok) return;
    const staff = await fixture.createAccount.execute({
      workspaceId: bootstrap.value.workspaceId,
      requestedByActorId: bootstrap.value.actorId,
      username: "staff-one",
      temporaryPassword: "Staff temporary 123",
    });
    assert.ok(staff.ok);
    if (!staff.ok) return;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await fixture.loginFailure.execute({ workspaceId: bootstrap.value.workspaceId, actorId: staff.value.actorId });
      fixture.clock.advance(1_000);
    }
    const reset = await fixture.ownerReset.execute({
      workspaceId: bootstrap.value.workspaceId,
      requestedByActorId: bootstrap.value.actorId,
      targetActorId: staff.value.actorId,
      newTemporaryPassword: "Reset temporary 456",
    });
    assert.deepEqual(reset, { ok: true, value: { passwordVersion: 2 } });
    const staffCredential = [...fixture.unitOfWork.state.credentials.values()].find((value) => value.actorId.value === staff.value.actorId)!;
    const protection = [...fixture.unitOfWork.state.protections.values()].find((value) => value.actorId.value === staff.value.actorId)!;
    assert.equal(staffCredential.lifecycle, "Temporary");
    assert.equal(staffCredential.passwordVersion, 2);
    assert.equal(protection.lockedUntil, null);
    assert.equal(protection.lockLevel, 0);

    const emergency = await fixture.emergencyReset.execute({
      workspaceCode: "STORE-01",
      ownerUsername: "OWNER",
      newTemporaryPassword: "Emergency temporary 789",
    });
    assert.ok(emergency.ok);
    if (emergency.ok) assert.equal(emergency.value.passwordVersion, 2);
  });
});

describe("Password recovery application", () => {
  it("replaces the active challenge, verifies, completes once, and clears protection", async () => {
    const fixture = createFixture();
    const bootstrap = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner"));
    assert.ok(bootstrap.ok);
    if (!bootstrap.ok) return;
    const first = await fixture.createRecovery.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId });
    assert.ok(first.ok);
    if (!first.ok) return;
    assert.deepEqual(await fixture.createRecovery.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId }), { ok: false, error: "RecoveryRateLimited" });
    fixture.clock.advance(60_000);
    const second = await fixture.createRecovery.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId });
    assert.ok(second.ok);
    if (!second.ok) return;
    const firstPersisted = [...fixture.unitOfWork.state.challenges.values()].find((value) => value.challengeId.value === first.value.challengeId)!;
    assert.equal(firstPersisted.status, "Invalidated");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await fixture.loginFailure.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId });
      fixture.clock.advance(1_000);
    }
    assert.deepEqual(await fixture.verifyRecovery.execute({
      workspaceId: bootstrap.value.workspaceId,
      challengeId: second.value.challengeId,
      code: second.value.code,
    }), { ok: true, value: { actorId: bootstrap.value.actorId } });
    const completed = await fixture.completeRecovery.execute({
      workspaceId: bootstrap.value.workspaceId,
      challengeId: second.value.challengeId,
      newPassword: "Permanent recovered 123",
    });
    assert.deepEqual(completed, { ok: true, value: { actorId: bootstrap.value.actorId, passwordVersion: 2 } });
    assert.deepEqual(await fixture.completeRecovery.execute({
      workspaceId: bootstrap.value.workspaceId,
      challengeId: second.value.challengeId,
      newPassword: "Another permanent 123",
    }), { ok: false, error: "RecoveryChallengeConsumed" });
    const credential = [...fixture.unitOfWork.state.credentials.values()][0]!;
    const protection = [...fixture.unitOfWork.state.protections.values()][0]!;
    assert.equal(credential.lifecycle, "Permanent");
    assert.equal(protection.failedAttemptCount, 0);
    assert.equal(JSON.stringify(fixture.unitOfWork.state.audits).includes(second.value.code), false);
  });

  it("makes a challenge unusable after five failures and expires at ten minutes", async () => {
    const fixture = createFixture();
    const bootstrap = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner"));
    assert.ok(bootstrap.ok);
    if (!bootstrap.ok) return;
    const challenge = await fixture.createRecovery.execute({ workspaceId: bootstrap.value.workspaceId, actorId: bootstrap.value.actorId });
    assert.ok(challenge.ok);
    if (!challenge.ok) return;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = await fixture.verifyRecovery.execute({
        workspaceId: bootstrap.value.workspaceId,
        challengeId: challenge.value.challengeId,
        code: "99999999",
      });
      assert.deepEqual(result, { ok: false, error: attempt === 5 ? "RecoveryChallengeAttemptsExceeded" : "RecoveryCodeInvalid" });
    }
    assert.deepEqual(await fixture.verifyRecovery.execute({
      workspaceId: bootstrap.value.workspaceId,
      challengeId: challenge.value.challengeId,
      code: challenge.value.code,
    }), { ok: false, error: "RecoveryChallengeInvalidated" });

    const expiryFixture = createFixture();
    const expiryBootstrap = await expiryFixture.bootstrap.execute(bootstrapCommand("store-02", "owner"));
    assert.ok(expiryBootstrap.ok);
    if (!expiryBootstrap.ok) return;
    const expiring = await expiryFixture.createRecovery.execute({ workspaceId: expiryBootstrap.value.workspaceId, actorId: expiryBootstrap.value.actorId });
    assert.ok(expiring.ok);
    if (!expiring.ok) return;
    expiryFixture.clock.advance(10 * 60_000);
    assert.deepEqual(await expiryFixture.verifyRecovery.execute({
      workspaceId: expiryBootstrap.value.workspaceId,
      challengeId: expiring.value.challengeId,
      code: expiring.value.code,
    }), { ok: false, error: "RecoveryChallengeExpired" });
  });

  it("enforces three sends per hour and Workspace-scoped challenge lookup", async () => {
    const fixture = createFixture();
    const firstWorkspace = await fixture.bootstrap.execute(bootstrapCommand("store-01", "owner-one"));
    const secondWorkspace = await fixture.bootstrap.execute(bootstrapCommand("store-02", "owner-two"));
    assert.ok(firstWorkspace.ok && secondWorkspace.ok);
    if (!firstWorkspace.ok || !secondWorkspace.ok) return;
    let latest: Awaited<ReturnType<typeof fixture.createRecovery.execute>> | null = null;
    for (let send = 0; send < 3; send += 1) {
      latest = await fixture.createRecovery.execute({ workspaceId: firstWorkspace.value.workspaceId, actorId: firstWorkspace.value.actorId });
      assert.ok(latest.ok);
      fixture.clock.advance(60_000);
    }
    assert.deepEqual(await fixture.createRecovery.execute({ workspaceId: firstWorkspace.value.workspaceId, actorId: firstWorkspace.value.actorId }), { ok: false, error: "RecoveryRateLimited" });
    assert.ok(latest?.ok);
    if (!latest?.ok) return;
    assert.deepEqual(await fixture.verifyRecovery.execute({
      workspaceId: secondWorkspace.value.workspaceId,
      challengeId: latest.value.challengeId,
      code: latest.value.code,
    }), { ok: false, error: "RecoveryChallengeNotFound" });
  });
});
