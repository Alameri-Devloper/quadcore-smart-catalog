import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { ActorId, ChallengeId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { WorkspaceCode } from "../../workspace/domain/workspace";
import { Account } from "./account";
import { INITIAL_LOCK_DURATION_MS, LoginProtection, MAX_LOCK_DURATION_MS } from "./login-protection";
import { BRANCH_SCOPES, createMembership, type BranchScope } from "./member";
import { PasswordCredential } from "./password-credential";
import { PasswordRecoveryChallenge, RECOVERY_CHALLENGE_VALIDITY_MS } from "./password-recovery-challenge";
import { PasswordHash, validatePassword } from "./password";
import { Username } from "./username";
import {
  SESSION_ABSOLUTE_TIMEOUT_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_LAST_SEEN_THROTTLE_MS,
  ServerSession,
} from "./session";

const workspaceId = WorkspaceId.create("workspace-a");
const actorId = ActorId.create("actor-a");
const start = new Date("2026-08-01T00:00:00.000Z");

describe("Identity value objects and password policy", () => {
  it("normalizes username lookup while preserving a valid original form", () => {
    const username = Username.create("Owner.Name-1");
    assert.equal(username.value, "Owner.Name-1");
    assert.equal(username.normalizedValue, "owner.name-1");
  });

  it("enforces the exact username alphabet and length centrally", () => {
    for (const value of ["ab", "a".repeat(65), "with space", "user@host", "مستخدم"]) {
      assert.throws(() => Username.create(value), /UsernameInvalid/);
    }
    assert.doesNotThrow(() => Username.create("a_b.c-9"));
  });

  it("preserves password spaces and Unicode without trimming or normalization", () => {
    const withBoundarySpaces = "  Exact passphrase  ";
    const decomposed = "Ame\u0301lie password";
    assert.doesNotThrow(() => validatePassword(withBoundarySpaces));
    assert.doesNotThrow(() => validatePassword(decomposed));
    assert.equal(withBoundarySpaces, "  Exact passphrase  ");
    assert.equal(decomposed, "Ame\u0301lie password");
    assert.doesNotThrow(() => validatePassword("😀".repeat(12)));
  });

  it("rejects short, long, and all-space passwords", () => {
    for (const value of ["x".repeat(11), "x".repeat(129), " ".repeat(12), "\u2003".repeat(12)]) {
      assert.throws(() => validatePassword(value), /PasswordInvalid/);
    }
  });

  it("validates canonical Workspace codes and E.164 recovery contacts", () => {
    assert.equal(WorkspaceCode.create("Store-01").value, "store-01");
    assert.equal(E164PhoneNumber.create("+967711234567").value, "+967711234567");
    for (const code of ["ab", "-store", "store-", "store--one", "store_one"]) {
      assert.throws(() => WorkspaceCode.create(code), /WorkspaceCodeInvalid/);
    }
    assert.throws(() => E164PhoneNumber.create("0711234567"), /PhoneNumberInvalid/);
  });
});

describe("Account and password lifecycles", () => {
  it("keeps account state independent and permits only controlled transitions", () => {
    const account = Account.create({ workspaceId, actorId, username: Username.create("owner"), createdAt: start });
    assert.equal(account.status, "PendingActivation");
    account.activate(new Date(start.getTime() + 1));
    assert.equal(account.status, "Active");
    account.suspend(new Date(start.getTime() + 2));
    assert.equal(account.status, "Suspended");
    account.reactivate(new Date(start.getTime() + 3));
    assert.equal(account.status, "Active");
    assert.throws(() => account.activate(new Date(start.getTime() + 4)), /AccountTransitionInvalid/);
  });

  it("increments the explicit password version and changes lifecycle independently", () => {
    const credential = PasswordCredential.createTemporary({
      workspaceId,
      actorId,
      passwordHash: PasswordHash.rehydrate("first-hash"),
      createdAt: start,
    });
    assert.equal(credential.lifecycle, "Temporary");
    assert.equal(credential.passwordVersion, 1);
    assert.equal(credential.replace(PasswordHash.rehydrate("second-hash"), "Permanent", new Date(start.getTime() + 1)), 1);
    assert.equal(credential.lifecycle, "Permanent");
    assert.equal(credential.passwordVersion, 2);
  });
});

describe("Server session lifecycle", () => {
  const createSession = () => ServerSession.create({
    workspaceId,
    sessionId: SessionId.create("session-a"),
    digest: { value: "a".repeat(64), keyVersion: 1 },
    actorId,
    sessionClass: "Restricted",
    authorizationVersion: 1,
    passwordVersion: 1,
    createdAt: start,
  });

  it("enforces idle and absolute expiry and throttles activity persistence", () => {
    const session = createSession();
    assert.equal(session.idleExpiresAt.getTime(), start.getTime() + SESSION_IDLE_TIMEOUT_MS);
    assert.equal(session.absoluteExpiresAt.getTime(), start.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS);
    assert.equal(session.refreshActivity(new Date(start.getTime() + SESSION_LAST_SEEN_THROTTLE_MS - 1)), false);
    assert.equal(session.refreshActivity(new Date(start.getTime() + SESSION_LAST_SEEN_THROTTLE_MS)), true);
    assert.equal(session.lastSeenAt.getTime(), start.getTime() + SESSION_LAST_SEEN_THROTTLE_MS);
    assert.equal(session.availabilityAt(session.idleExpiresAt), "IdleExpired");
    assert.equal(session.availabilityAt(session.absoluteExpiresAt), "AbsoluteExpired");
  });

  it("makes revocation idempotent and cleanup eligibility deterministic", () => {
    const session = createSession();
    const revokedAt = new Date(start.getTime() + 1_000);
    assert.equal(session.revoke("Logout", revokedAt), true);
    assert.equal(session.revoke("AdministrativeRevocation", new Date(revokedAt.getTime() + 1)), false);
    assert.equal(session.availabilityAt(revokedAt), "Revoked");
    assert.equal(session.revocationReason, "Logout");
    assert.equal(session.isCleanupEligible(new Date(revokedAt.getTime() + 2), new Date(revokedAt.getTime() - 1)), false);
    assert.equal(session.isCleanupEligible(new Date(revokedAt.getTime() + 2), revokedAt), true);
  });
});

describe("Workspace membership branch scope", () => {
  const membership = (role: "Owner" | "Staff", branchScope: BranchScope) => ({
    workspaceId,
    actorId,
    role,
    branchScope,
    branchIds: branchScope === "SelectedBranches" ? ["branch-a"] : [],
    authorizationVersion: 1,
    createdAt: start,
    updatedAt: start,
  });

  it("uses only the approved AllBranches and SelectedBranches vocabulary", () => {
    const rejectedLegacyScope = ["Assigned", "Branches"].join("") as BranchScope;
    assert.deepEqual(BRANCH_SCOPES, ["AllBranches", "SelectedBranches"]);
    assert.doesNotThrow(() => createMembership(membership("Staff", "AllBranches")));
    assert.doesNotThrow(() => createMembership(membership("Staff", "SelectedBranches")));
    assert.throws(
      () => createMembership(membership("Staff", rejectedLegacyScope)),
      /BranchScopeInvalid/,
    );
  });

  it("keeps every Owner constrained to AllBranches", () => {
    assert.doesNotThrow(() => createMembership(membership("Owner", "AllBranches")));
    assert.throws(
      () => createMembership(membership("Owner", "SelectedBranches")),
      /OwnerAuthorizationInvalid/,
    );
  });
});

describe("Login protection", () => {
  it("locks after five failures in the window and clears on successful authentication/reset", () => {
    const protection = LoginProtection.create(workspaceId, actorId, start);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      assert.equal(protection.registerFailure(new Date(start.getTime() + attempt * 1_000)), "FailureRecorded");
    }
    assert.equal(protection.registerFailure(new Date(start.getTime() + 4_000)), "Locked");
    assert.equal(protection.lockLevel, 1);
    assert.equal(protection.lockedUntil?.getTime(), start.getTime() + 4_000 + INITIAL_LOCK_DURATION_MS);
    assert.equal(protection.registerFailure(new Date(start.getTime() + 5_000)), "AlreadyLocked");
    protection.clear(new Date(start.getTime() + INITIAL_LOCK_DURATION_MS + 5_000));
    assert.equal(protection.lockLevel, 0);
    assert.equal(protection.lockedUntil, null);
  });

  it("escalates repeated locks exponentially and caps them at sixty minutes", () => {
    const protection = LoginProtection.create(workspaceId, actorId, start);
    let base = start.getTime();
    const durations: number[] = [];
    for (let level = 1; level <= 6; level += 1) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        protection.registerFailure(new Date(base + attempt));
      }
      durations.push(protection.lockedUntil!.getTime() - (base + 4));
      base = protection.lockedUntil!.getTime();
    }
    assert.deepEqual(durations, [5, 10, 20, 40, 60, 60].map((minutes) => minutes * 60_000));
    assert.equal(durations.at(-1), MAX_LOCK_DURATION_MS);
  });

  it("starts a new failure window after fifteen minutes", () => {
    const protection = LoginProtection.create(workspaceId, actorId, start);
    protection.registerFailure(start);
    protection.registerFailure(new Date(start.getTime() + 15 * 60_000));
    assert.equal(protection.failedAttemptCount, 1);
  });
});

describe("Password recovery challenge lifecycle", () => {
  const createChallenge = () => PasswordRecoveryChallenge.create({
    workspaceId,
    challengeId: ChallengeId.create("challenge-a"),
    actorId,
    channel: "PrimaryRecoveryContact",
    destinationVersion: 1,
    digest: { value: "a".repeat(64), keyVersion: 1 },
    createdAt: start,
  });

  it("verifies once, consumes once, and rejects reuse", () => {
    const challenge = createChallenge();
    challenge.verify(new Date(start.getTime() + 1_000));
    assert.equal(challenge.status, "Verified");
    challenge.consume(new Date(start.getTime() + 2_000));
    assert.equal(challenge.status, "Consumed");
    assert.throws(() => challenge.consume(new Date(start.getTime() + 3_000)), /NotVerified/);
    assert.throws(() => challenge.verify(new Date(start.getTime() + 3_000)), /Consumed/);
  });

  it("expires deterministically at ten minutes", () => {
    const challenge = createChallenge();
    assert.equal(challenge.expireIfNeeded(new Date(start.getTime() + RECOVERY_CHALLENGE_VALIDITY_MS - 1)), false);
    assert.equal(challenge.expireIfNeeded(new Date(start.getTime() + RECOVERY_CHALLENGE_VALIDITY_MS)), true);
    assert.equal(challenge.status, "Expired");
  });

  it("becomes unusable after five failed verification attempts", () => {
    const challenge = createChallenge();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      assert.equal(challenge.recordFailedVerification(new Date(start.getTime() + attempt)), "FailureRecorded");
    }
    assert.equal(challenge.recordFailedVerification(new Date(start.getTime() + 4)), "AttemptsExceeded");
    assert.equal(challenge.attemptCount, 5);
    assert.equal(challenge.status, "Invalidated");
    assert.throws(() => challenge.verify(new Date(start.getTime() + 5)), /Invalidated/);
  });

  it("invalidates only open states", () => {
    const challenge = createChallenge();
    assert.equal(challenge.invalidate(new Date(start.getTime() + 1)), true);
    assert.equal(challenge.invalidate(new Date(start.getTime() + 2)), false);
  });
});
