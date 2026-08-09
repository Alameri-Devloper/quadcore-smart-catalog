import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { WorkspaceBootstrapUseCase } from "./workspace-bootstrap.use-case";
import { ChangePasswordAndRotateSessionUseCase } from "./change-password-and-rotate-session.use-case";
import { CleanupSessionsUseCase, LoginUseCase, LogoutUseCase, ResolveSessionUseCase } from "./session.use-cases";
import type {
  IdentityClock,
  IdentityIdentifierGenerator,
  PasswordHasher,
  SessionIdentifierGenerator,
  SessionTokenGenerator,
} from "./ports";
import { SESSION_IDLE_TIMEOUT_MS, SESSION_LAST_SEEN_THROTTLE_MS, SESSION_REVOKED_RETENTION_MS } from "../domain/session";
import { PasswordHash } from "../domain/password";
import { createMembership } from "../domain/member";
import { HmacSha256SessionTokenDigest } from "../infrastructure/crypto/session-token-crypto";
import { InMemoryIdentityUnitOfWork } from "../mock/in-memory-identity-unit-of-work";

class MutableSessionClock implements IdentityClock {
  constructor(private value = new Date("2026-08-01T00:00:00.000Z")) {}
  now(): Date { return new Date(this.value); }
  advance(milliseconds: number): void { this.value = new Date(this.value.getTime() + milliseconds); }
}

class SessionTestIdentifiers implements IdentityIdentifierGenerator, SessionIdentifierGenerator {
  private workspace = 0;
  private actor = 0;
  private session = 0;
  workspaceId(): string { this.workspace += 1; return `workspace-${this.workspace}`; }
  actorId(): string { this.actor += 1; return `actor-${this.actor}`; }
  challengeId(): string { return "unused-challenge"; }
  sessionId(): string { this.session += 1; return `session-${this.session}`; }
}

class SessionTestValues implements SessionTokenGenerator {
  private next = 64;
  generate(): string {
    this.next += 1;
    return String.fromCharCode(this.next).repeat(43);
  }
}

class SessionTestPasswordHasher implements PasswordHasher {
  async hash(value: string): Promise<PasswordHash> {
    return PasswordHash.rehydrate(`test$${createHash("sha256").update(value, "utf8").digest("hex")}`);
  }
  async verify(value: string, hash: PasswordHash): Promise<boolean> {
    return (await this.hash(value)).value === hash.value;
  }
  needsRehash(): boolean { return false; }
}

const bootstrapCommand = (workspaceCode = "session-01", password = "Temporary pass 123") => ({
  companyId: "company-a",
  workspaceCode,
  workspaceDisplayName: `Workspace ${workspaceCode}`,
  ownerUsername: "owner.main",
  ownerDisplayName: "Session Owner",
  ownerRecoveryPhone: "+967711234567",
  temporaryPassword: password,
});

const fixture = () => {
  const unitOfWork = new InMemoryIdentityUnitOfWork();
  const clock = new MutableSessionClock();
  const identifiers = new SessionTestIdentifiers();
  const hasher = new SessionTestPasswordHasher();
  const digest = new HmacSha256SessionTokenDigest([{ version: 1, keyBytes: Buffer.alloc(32, 17) }], 1);
  const issuance = { identifiers, values: new SessionTestValues(), digest } as const;
  return {
    unitOfWork,
    clock,
    hasher,
    bootstrap: new WorkspaceBootstrapUseCase(unitOfWork, hasher, clock, identifiers),
    login: new LoginUseCase(unitOfWork, hasher, clock, issuance),
    resolve: new ResolveSessionUseCase(unitOfWork, digest, clock),
    logout: new LogoutUseCase(unitOfWork, digest, clock),
    changePassword: new ChangePasswordAndRotateSessionUseCase(unitOfWork, hasher, digest, clock, issuance),
    cleanup: new CleanupSessionsUseCase(unitOfWork, clock),
  };
};

describe("Identity session application", () => {
  it("creates a restricted first-login session and rotates it to a new full session", async () => {
    const test = fixture();
    const created = await test.bootstrap.execute(bootstrapCommand());
    assert.ok(created.ok);
    const login = await test.login.execute({ workspaceCode: "SESSION-01", username: "OWNER.MAIN", password: "Temporary pass 123" });
    assert.ok(login.ok);
    if (!login.ok) return;
    assert.equal(login.value.sessionClass, "Restricted");
    assert.equal(login.value.passwordChangeRequired, true);
    assert.deepEqual(await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Full" }), {
      ok: false,
      error: "ForbiddenForRestrictedSession",
    });
    const minimal = await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Any" });
    assert.ok(minimal.ok);

    assert.deepEqual(await test.changePassword.execute({
      rawSessionValue: login.value.opaqueValue,
      currentPassword: "wrong current value",
      newPassword: "Permanent password 123",
    }), { ok: false, error: "InvalidCurrentPassword" });
    assert.deepEqual(await test.changePassword.execute({
      rawSessionValue: login.value.opaqueValue,
      currentPassword: "Temporary pass 123",
      newPassword: "too short",
    }), { ok: false, error: "PasswordInvalid" });

    const changed = await test.changePassword.execute({
      rawSessionValue: login.value.opaqueValue,
      currentPassword: "Temporary pass 123",
      newPassword: "Permanent password 123",
    });
    assert.ok(changed.ok);
    if (!changed.ok) return;
    assert.notEqual(changed.value.opaqueValue, login.value.opaqueValue);
    assert.equal(changed.value.sessionClass, "Full");
    assert.deepEqual(await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionRevoked",
    });
    const full = await test.resolve.execute({ rawSessionValue: changed.value.opaqueValue, requiredClass: "Full" });
    assert.ok(full.ok);
    const permanentLogin = await test.login.execute({
      workspaceCode: "session-01",
      username: "owner.main",
      password: "Permanent password 123",
    });
    assert.ok(permanentLogin.ok);
    if (permanentLogin.ok) assert.equal(permanentLogin.value.sessionClass, "Full");
    const account = [...test.unitOfWork.state.accounts.values()][0]!;
    const credential = [...test.unitOfWork.state.credentials.values()][0]!;
    assert.equal(account.status, "Active");
    assert.equal(credential.lifecycle, "Permanent");
    assert.equal(credential.passwordVersion, 2);
  });

  it("keeps public authentication failure generic and persists login protection safely", async () => {
    const test = fixture();
    await test.bootstrap.execute(bootstrapCommand());
    const generic = { ok: false, error: "InvalidCredentialsOrUnavailableAccount" } as const;
    assert.deepEqual(await test.login.execute({ workspaceCode: "missing-01", username: "owner.main", password: "guess value 123" }), generic);
    assert.deepEqual(await test.login.execute({ workspaceCode: "session-01", username: "missing.user", password: "guess value 123" }), generic);
    assert.deepEqual(await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "guess value 123" }), generic);
    assert.equal([...test.unitOfWork.state.protections.values()][0]!.failedAttemptCount, 1);
    const success = await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" });
    assert.ok(success.ok);
    assert.equal([...test.unitOfWork.state.protections.values()][0]!.failedAttemptCount, 0);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "guess value 123" });
    }
    assert.deepEqual(await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" }), {
      ok: false,
      error: "LoginTemporarilyUnavailable",
    });
  });

  it("rejects stale authorization, stale credential, and suspended-account state", async () => {
    const authorization = fixture();
    const owner = await authorization.bootstrap.execute(bootstrapCommand());
    assert.ok(owner.ok);
    const loggedIn = await authorization.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" });
    assert.ok(loggedIn.ok && owner.ok);
    if (!loggedIn.ok || !owner.ok) return;
    const membershipKey = [...authorization.unitOfWork.state.memberships.keys()][0]!;
    const membership = authorization.unitOfWork.state.memberships.get(membershipKey)!;
    authorization.unitOfWork.state.memberships.set(membershipKey, createMembership({
      ...membership,
      authorizationVersion: membership.authorizationVersion + 1,
      updatedAt: new Date(membership.updatedAt.getTime() + 1),
    }));
    assert.deepEqual(await authorization.resolve.execute({ rawSessionValue: loggedIn.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionStaleAuthorizationVersion",
    });

    const credentialState = fixture();
    await credentialState.bootstrap.execute(bootstrapCommand());
    const credentialLogin = await credentialState.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" });
    assert.ok(credentialLogin.ok);
    if (!credentialLogin.ok) return;
    const credential = [...credentialState.unitOfWork.state.credentials.values()][0]!;
    credential.replace(await credentialState.hasher.hash("Another temporary 123"), "Temporary", new Date(credential.updatedAt.getTime() + 1));
    assert.deepEqual(await credentialState.resolve.execute({ rawSessionValue: credentialLogin.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionStalePasswordVersion",
    });

    const suspension = fixture();
    await suspension.bootstrap.execute(bootstrapCommand());
    const suspensionLogin = await suspension.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" });
    assert.ok(suspensionLogin.ok);
    if (!suspensionLogin.ok) return;
    const account = [...suspension.unitOfWork.state.accounts.values()][0]!;
    account.suspend(suspension.clock.now());
    assert.deepEqual(await suspension.resolve.execute({ rawSessionValue: suspensionLogin.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "AccountSuspended",
    });
    assert.deepEqual(await suspension.login.execute({
      workspaceCode: "session-01",
      username: "owner.main",
      password: "Temporary pass 123",
    }), { ok: false, error: "InvalidCredentialsOrUnavailableAccount" });
  });

  it("isolates Workspace authority even when usernames overlap", async () => {
    const test = fixture();
    await test.bootstrap.execute(bootstrapCommand("session-01", "First temporary 123"));
    await test.bootstrap.execute(bootstrapCommand("session-02", "Second temporary 123"));
    const first = await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "First temporary 123" });
    assert.ok(first.ok);
    if (!first.ok) return;
    const resolved = await test.resolve.execute({ rawSessionValue: first.value.opaqueValue, requiredClass: "Any" });
    assert.ok(resolved.ok);
    if (resolved.ok) assert.equal(resolved.value.context.workspaceId, "workspace-1");
    assert.deepEqual(await test.login.execute({ workspaceCode: "session-02", username: "owner.main", password: "First temporary 123" }), {
      ok: false,
      error: "InvalidCredentialsOrUnavailableAccount",
    });
  });

  it("throttles last-seen writes, expires sessions, cleans eligible rows, and makes logout idempotent", async () => {
    const test = fixture();
    await test.bootstrap.execute(bootstrapCommand());
    const login = await test.login.execute({ workspaceCode: "session-01", username: "owner.main", password: "Temporary pass 123" });
    assert.ok(login.ok);
    if (!login.ok) return;
    const initialLastSeen = [...test.unitOfWork.state.sessions.values()][0]!.lastSeenAt;
    test.clock.advance(SESSION_LAST_SEEN_THROTTLE_MS - 1);
    assert.ok((await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Any" })).ok);
    assert.equal([...test.unitOfWork.state.sessions.values()][0]!.lastSeenAt.getTime(), initialLastSeen.getTime());
    test.clock.advance(1);
    assert.ok((await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Any" })).ok);
    assert.equal([...test.unitOfWork.state.sessions.values()][0]!.lastSeenAt.getTime(), test.clock.now().getTime());
    test.clock.advance(SESSION_IDLE_TIMEOUT_MS);
    assert.deepEqual(await test.resolve.execute({ rawSessionValue: login.value.opaqueValue, requiredClass: "Any" }), {
      ok: false,
      error: "SessionExpired",
    });
    assert.deepEqual(await test.cleanup.execute(), { ok: true, value: { deletedCount: 0 } });
    test.clock.advance(SESSION_REVOKED_RETENTION_MS);
    assert.deepEqual(await test.cleanup.execute(), { ok: true, value: { deletedCount: 1 } });
    assert.deepEqual(await test.logout.execute(login.value.opaqueValue), { ok: true, value: null });
    assert.deepEqual(await test.logout.execute(null), { ok: true, value: null });
  });
});
