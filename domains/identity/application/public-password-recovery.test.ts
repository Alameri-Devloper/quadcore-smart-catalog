import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { ActorId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { Workspace } from "../../workspace/domain/workspace";
import { PasswordHash } from "../domain/password";
import { updateMemberRecoveryPhone } from "../domain/member";
import { ServerSession } from "../domain/session";
import { HmacSha256RecoveryCodeDigest } from "../infrastructure/crypto/hmac-recovery-code-digest";
import { AesGcmPublicRecoveryFlowToken } from "../infrastructure/crypto/aes-gcm-public-recovery-flow-token";
import { DevelopmentRecoveryDeliveryAdapter } from "../infrastructure/recovery-delivery/development-recovery-delivery.adapter";
import { InMemoryIdentityUnitOfWork } from "../mock/in-memory-identity-unit-of-work";
import type { IdentityUnitOfWork } from "../repositories/identity.repositories";
import { CompletePasswordRecoveryUseCase, CreatePasswordRecoveryChallengeUseCase, FinalizeRecoveryDeliveryUseCase, ResendPasswordRecoveryChallengeUseCase, VerifyPasswordRecoveryChallengeUseCase } from "./password-recovery.use-cases";
import { PublicPasswordRecoveryService } from "./public-password-recovery.service";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher, PublicRecoveryOperation, PublicRecoveryTimingPort, RecoveryCodeGenerator } from "./ports";
import { WorkspaceBootstrapUseCase } from "./workspace-bootstrap.use-case";

class MutableClock implements IdentityClock {
  constructor(private value = new Date("2026-08-17T00:00:00.000Z")) {}
  now(): Date { return new Date(this.value); }
  advance(milliseconds: number): void { this.value = new Date(this.value.getTime() + milliseconds); }
}

class RecoveryIdentifiers implements IdentityIdentifierGenerator {
  private workspace = 0;
  private actor = 0;
  private challenge = 0;
  workspaceId(): string { this.workspace += 1; return `workspace-${this.workspace}`; }
  actorId(): string { this.actor += 1; return `actor-${this.actor}`; }
  challengeId(): string {
    this.challenge += 1;
    return `00000000-0000-4000-8000-${this.challenge.toString().padStart(12, "0")}`;
  }
}

class TestPasswordHasher implements PasswordHasher {
  hashCalls = 0;
  onHash: (() => void) | null = null;
  async hash(password: string): Promise<PasswordHash> {
    this.hashCalls += 1;
    this.onHash?.();
    return PasswordHash.rehydrate(`test$${createHash("sha256").update(password, "utf8").digest("hex")}`);
  }
  async verify(password: string, hash: PasswordHash): Promise<boolean> { return (await this.hash(password)).value === hash.value; }
  needsRehash(): boolean { return false; }
}

class RecordingTiming implements PublicRecoveryTimingPort {
  readonly observations: Array<{ readonly operation: PublicRecoveryOperation; readonly elapsedMs: number }> = [];
  constructor(private readonly clock: IdentityClock) {}
  async waitForMinimum(operation: PublicRecoveryOperation, startedAt: Date): Promise<void> {
    this.observations.push({ operation, elapsedMs: this.clock.now().getTime() - startedAt.getTime() });
  }
}

class QueuedCodes implements RecoveryCodeGenerator {
  private next = 0;
  generate(): string { this.next += 1; return this.next.toString().padStart(8, "0"); }
}

const createFixture = async (trackTransactions = false, deliveryDelayMs = 0) => {
  const unitOfWork = new InMemoryIdentityUnitOfWork();
  let transactionActive = false;
  const executionUnitOfWork: IdentityUnitOfWork = trackTransactions ? {
    execute: (work) => unitOfWork.execute(async (context) => {
      transactionActive = true;
      try { return await work(context); }
      finally { transactionActive = false; }
    }),
  } : unitOfWork;
  const clock = new MutableClock();
  const identifiers = new RecoveryIdentifiers();
  const hasher = new TestPasswordHasher();
  const digest = new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(32, 9) }], 1);
  const flowTokens = new AesGcmPublicRecoveryFlowToken([{ version: 1, secret: Buffer.alloc(32, 9) }], 1, clock);
  const timing = new RecordingTiming(clock);
  const codes = new QueuedCodes();
  const deliveryObservations: boolean[] = [];
  const delivery = new class extends DevelopmentRecoveryDeliveryAdapter {
    override async deliverCode(input: Parameters<DevelopmentRecoveryDeliveryAdapter["deliverCode"]>[0]) {
      deliveryObservations.push(transactionActive);
      clock.advance(deliveryDelayMs);
      return super.deliverCode(input);
    }
  }("test");
  const create = new CreatePasswordRecoveryChallengeUseCase(executionUnitOfWork, digest, codes, clock, identifiers);
  const resend = new ResendPasswordRecoveryChallengeUseCase(executionUnitOfWork, digest, codes, clock, identifiers);
  const verify = new VerifyPasswordRecoveryChallengeUseCase(executionUnitOfWork, digest, clock);
  const complete = new CompletePasswordRecoveryUseCase(executionUnitOfWork, hasher, clock);
  const finalize = new FinalizeRecoveryDeliveryUseCase(executionUnitOfWork, clock);
  const recovery = new PublicPasswordRecoveryService(
    executionUnitOfWork, create, resend, verify, complete, finalize, delivery,
    { perform: async () => { await digest.create(codes.generate()); } }, flowTokens, timing, identifiers, clock,
  );
  const bootstrapUseCase = new WorkspaceBootstrapUseCase(executionUnitOfWork, hasher, clock, identifiers);
  const bootstrap = await bootstrapUseCase.execute({
    companyId: "company-a",
    workspaceCode: "store-01",
    workspaceDisplayName: "Store One",
    ownerUsername: "owner",
    ownerDisplayName: "Owner",
    ownerRecoveryPhone: "+967711234567",
    temporaryPassword: "Temporary pass 123",
  });
  assert.ok(bootstrap.ok);
  if (!bootstrap.ok) throw new Error("FixtureBootstrapFailed");
  hasher.hashCalls = 0;
  const takeLatestCode = (): string | null => {
    const latest = [...unitOfWork.state.challenges.values()]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    return latest ? delivery.takeCodeForTest(latest.challengeId.value) : null;
  };
  return { unitOfWork, clock, delivery, deliveryObservations, recovery, bootstrap, bootstrapUseCase, finalize, hasher, timing, takeLatestCode };
};

describe("public password recovery orchestration", () => {
  it("returns indistinguishable accepted requests while delivering only for an eligible scoped account", async () => {
    const fixture = await createFixture();
    const eligible = await fixture.recovery.request({ workspaceCode: "STORE-01", username: "OWNER" });
    const unknownWorkspace = await fixture.recovery.request({ workspaceCode: "other-01", username: "owner" });
    const unknownUsername = await fixture.recovery.request({ workspaceCode: "store-01", username: "missing" });

    assert.equal(eligible.type, "RecoveryRequestAccepted");
    assert.equal(unknownWorkspace.type, "RecoveryRequestAccepted");
    assert.equal(unknownUsername.type, "RecoveryRequestAccepted");
    assert.deepEqual(Object.keys(eligible).sort(), Object.keys(unknownWorkspace).sort());
    assert.deepEqual(Object.keys(eligible).sort(), Object.keys(unknownUsername).sort());
    assert.equal(fixture.delivery.listMetadataForTest().length, 1);
    const persisted = [...fixture.unitOfWork.state.challenges.values()][0]!;
    assert.notEqual(persisted.digest.value, "00000002");
    assert.equal(Object.prototype.hasOwnProperty.call(persisted, "code"), false);

    assert.deepEqual(
      await fixture.recovery.resend({ recoveryReference: eligible.type === "RecoveryRequestAccepted" ? eligible.recoveryReference : "" }),
      await fixture.recovery.resend({ recoveryReference: unknownWorkspace.type === "RecoveryRequestAccepted" ? unknownWorkspace.recoveryReference : "" }),
    );
    fixture.clock.advance(60_000);
    const eligibleResend = await fixture.recovery.resend({ recoveryReference: eligible.type === "RecoveryRequestAccepted" ? eligible.recoveryReference : "" });
    const decoyResend = await fixture.recovery.resend({ recoveryReference: unknownWorkspace.type === "RecoveryRequestAccepted" ? unknownWorkspace.recoveryReference : "" });
    assert.equal(eligibleResend.type, "RecoveryResendAccepted");
    assert.equal(decoyResend.type, "RecoveryResendAccepted");
    assert.deepEqual(Object.keys(eligibleResend).sort(), Object.keys(decoyResend).sort());
    if (eligibleResend.type !== "RecoveryResendAccepted" || decoyResend.type !== "RecoveryResendAccepted") return;
    assert.equal(eligibleResend.recoveryReference.length, decoyResend.recoveryReference.length);
    assert.deepEqual(
      await fixture.recovery.verify({ recoveryReference: eligibleResend.recoveryReference, otp: "99999999" }),
      await fixture.recovery.verify({ recoveryReference: decoyResend.recoveryReference, otp: "99999999" }),
    );
    assert.deepEqual(
      await fixture.recovery.reset({ recoveryReference: eligibleResend.recoveryReference, newPassword: "Permanent recovered 123" }),
      await fixture.recovery.reset({ recoveryReference: decoyResend.recoveryReference, newPassword: "Permanent recovered 123" }),
    );
  });

  it("applies the injected response timing policy to slow eligible and decoy requests without decoy delivery", async () => {
    const fixture = await createFixture(false, 700);
    await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    await fixture.recovery.request({ workspaceCode: "missing-01", username: "owner" });
    assert.deepEqual(fixture.timing.observations, [
      { operation: "Request", elapsedMs: 700 },
      { operation: "Request", elapsedMs: 0 },
    ]);
    assert.equal(fixture.delivery.listMetadataForTest().length, 1);
  });

  it("keeps Suspended, OwnerManagedOnly, and missing-contact requests externally equivalent", async () => {
    const suspended = await createFixture();
    [...suspended.unitOfWork.state.accounts.values()][0]!.suspend(suspended.clock.now());
    const suspendedResult = await suspended.recovery.request({ workspaceCode: "store-01", username: "owner" });

    const ownerManaged = await createFixture();
    const ownerWorkspace = [...ownerManaged.unitOfWork.state.workspaces.values()][0]!;
    ownerManaged.unitOfWork.state.workspaces.set(ownerWorkspace.workspaceId.value, Workspace.rehydrate({
      workspaceId: ownerWorkspace.workspaceId,
      companyId: ownerWorkspace.companyId,
      code: ownerWorkspace.code,
      displayName: ownerWorkspace.displayName,
      passwordRecoveryPolicy: "OwnerManagedOnly",
      createdAt: ownerWorkspace.createdAt,
      updatedAt: ownerManaged.clock.now(),
    }));
    const ownerManagedResult = await ownerManaged.recovery.request({ workspaceCode: "store-01", username: "owner" });

    const missingProfile = await createFixture();
    missingProfile.unitOfWork.state.profiles.clear();
    const missingProfileResult = await missingProfile.recovery.request({ workspaceCode: "store-01", username: "owner" });

    for (const result of [suspendedResult, ownerManagedResult, missingProfileResult]) {
      assert.equal(result.type, "RecoveryRequestAccepted");
      assert.deepEqual(Object.keys(result).sort(), ["recoveryReference", "retryAfterSeconds", "type"]);
    }
    assert.equal(suspended.delivery.listMetadataForTest().length, 0);
    assert.equal(ownerManaged.delivery.listMetadataForTest().length, 0);
    assert.equal(missingProfile.delivery.listMetadataForTest().length, 0);
    const cases = [
      { fixture: suspended, result: suspendedResult },
      { fixture: ownerManaged, result: ownerManagedResult },
      { fixture: missingProfile, result: missingProfileResult },
    ];
    for (const entry of cases) {
      if (entry.result.type !== "RecoveryRequestAccepted") continue;
      assert.deepEqual(
        await entry.fixture.recovery.resend({ recoveryReference: entry.result.recoveryReference }),
        { type: "RecoveryResendThrottled", retryAfterSeconds: 60 },
      );
      entry.fixture.clock.advance(60_000);
      const resent = await entry.fixture.recovery.resend({ recoveryReference: entry.result.recoveryReference });
      assert.equal(resent.type, "RecoveryResendAccepted");
      assert.equal(entry.fixture.delivery.listMetadataForTest().length, 0);
    }
  });

  it("never invokes the delivery provider inside an Identity transaction", async () => {
    const fixture = await createFixture(true);
    assert.equal((await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" })).type, "RecoveryRequestAccepted");
    assert.deepEqual(fixture.deliveryObservations, [false]);
  });

  it("enforces cooldown, replaces the code, verifies, resets once, and revokes sessions", async () => {
    const fixture = await createFixture();
    const requested = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(requested.type, "RecoveryRequestAccepted");
    if (requested.type !== "RecoveryRequestAccepted") return;
    const firstCode = fixture.takeLatestCode();
    assert.equal(firstCode, "00000002");

    assert.equal((await fixture.recovery.resend({ recoveryReference: requested.recoveryReference })).type, "RecoveryResendThrottled");
    fixture.clock.advance(60_000);
    const resent = await fixture.recovery.resend({ recoveryReference: requested.recoveryReference });
    assert.equal(resent.type, "RecoveryResendAccepted");
    if (resent.type !== "RecoveryResendAccepted") return;
    const secondCode = fixture.takeLatestCode();
    assert.equal(secondCode, "00000003");
    assert.equal((await fixture.recovery.verify({ recoveryReference: requested.recoveryReference, otp: firstCode! })).type, "RecoveryCodeInvalidOrExpired");
    assert.equal((await fixture.recovery.verify({ recoveryReference: resent.recoveryReference, otp: secondCode! })).type, "RecoveryCodeVerified");

    fixture.unitOfWork.state.sessions.set("session", ServerSession.create({
      workspaceId: WorkspaceId.create(fixture.bootstrap.value.workspaceId),
      sessionId: SessionId.create("session-1"),
      digest: { value: "a".repeat(64), keyVersion: 1 },
      actorId: ActorId.create(fixture.bootstrap.value.actorId),
      sessionClass: "Restricted",
      authorizationVersion: 1,
      passwordVersion: 1,
      createdAt: fixture.clock.now(),
    }));
    assert.equal((await fixture.recovery.reset({
      recoveryReference: resent.recoveryReference,
      newPassword: "Permanent recovered 123",
    })).type, "RecoveryResetCompleted");
    assert.equal((await fixture.recovery.reset({
      recoveryReference: resent.recoveryReference,
      newPassword: "Another permanent 123",
    })).type, "RecoveryResetInvalid");
    const credential = [...fixture.unitOfWork.state.credentials.values()][0]!;
    const challenge = [...fixture.unitOfWork.state.challenges.values()].find((value) => value.status === "Consumed")!;
    const session = [...fixture.unitOfWork.state.sessions.values()][0]!;
    assert.equal(credential.lifecycle, "Permanent");
    assert.equal(credential.passwordVersion, 2);
    assert.equal(challenge.status, "Consumed");
    assert.equal(session.revocationReason, "RecoveryCompleted");
  });

  it("fails closed when policy changes after delivery", async () => {
    const fixture = await createFixture();
    const requested = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(requested.type, "RecoveryRequestAccepted");
    if (requested.type !== "RecoveryRequestAccepted") return;
    const code = fixture.takeLatestCode()!;
    const workspace = fixture.unitOfWork.state.workspaces.get(fixture.bootstrap.value.workspaceId)!;
    fixture.unitOfWork.state.workspaces.set(workspace.workspaceId.value, Workspace.rehydrate({
      workspaceId: workspace.workspaceId,
      companyId: workspace.companyId,
      code: workspace.code,
      displayName: workspace.displayName,
      passwordRecoveryPolicy: "OwnerManagedOnly",
      createdAt: workspace.createdAt,
      updatedAt: new Date(workspace.updatedAt.getTime() + 1),
    }));
    assert.equal((await fixture.recovery.verify({ recoveryReference: requested.recoveryReference, otp: code })).type, "RecoveryCodeInvalidOrExpired");
  });

  it("invalidates delivered flows after contact changes, suspension, or a definitive provider failure", async () => {
    const contactFixture = await createFixture();
    const contactRequest = await contactFixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(contactRequest.type, "RecoveryRequestAccepted");
    if (contactRequest.type !== "RecoveryRequestAccepted") return;
    const contactCode = contactFixture.takeLatestCode()!;
    const profileKey = [...contactFixture.unitOfWork.state.profiles.keys()][0]!;
    const profile = contactFixture.unitOfWork.state.profiles.get(profileKey)!;
    contactFixture.unitOfWork.state.profiles.set(profileKey, updateMemberRecoveryPhone(
      profile,
      E164PhoneNumber.create("+967711234568"),
      new Date(profile.updatedAt.getTime() + 1),
    ));
    assert.equal((await contactFixture.recovery.verify({ recoveryReference: contactRequest.recoveryReference, otp: contactCode })).type, "RecoveryCodeInvalidOrExpired");

    const suspensionFixture = await createFixture();
    const suspensionRequest = await suspensionFixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(suspensionRequest.type, "RecoveryRequestAccepted");
    if (suspensionRequest.type !== "RecoveryRequestAccepted") return;
    const suspensionCode = suspensionFixture.takeLatestCode()!;
    const account = [...suspensionFixture.unitOfWork.state.accounts.values()][0]!;
    account.suspend(new Date(account.updatedAt.getTime() + 1));
    assert.equal((await suspensionFixture.recovery.verify({ recoveryReference: suspensionRequest.recoveryReference, otp: suspensionCode })).type, "RecoveryCodeInvalidOrExpired");

    const providerFixture = await createFixture();
    const providerRequest = await providerFixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(providerRequest.type, "RecoveryRequestAccepted");
    if (providerRequest.type !== "RecoveryRequestAccepted") return;
    const challenge = [...providerFixture.unitOfWork.state.challenges.values()][0]!;
    assert.ok((await providerFixture.finalize.execute({
      workspaceId: challenge.workspaceId.value,
      challengeId: challenge.challengeId.value,
      adapterName: "ProviderContractTest",
      latencyMs: 100,
      result: { ok: false, error: "ProviderRejected" },
    })).ok);
    assert.equal([...providerFixture.unitOfWork.state.challenges.values()][0]!.status, "Invalidated");
    assert.equal(JSON.stringify(providerFixture.unitOfWork.state.audits).includes("00148293"), false);
  });

  it("isolates the same username and recovery contact across Workspaces", async () => {
    const fixture = await createFixture();
    const second = await fixture.bootstrapUseCase.execute({
      companyId: "company-b",
      workspaceCode: "store-02",
      workspaceDisplayName: "Store Two",
      ownerUsername: "owner",
      ownerDisplayName: "Second Owner",
      ownerRecoveryPhone: "+967711234567",
      temporaryPassword: "Temporary pass 456",
    });
    assert.ok(second.ok);
    const firstRequest = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    const secondRequest = await fixture.recovery.request({ workspaceCode: "store-02", username: "owner" });
    assert.equal(firstRequest.type, "RecoveryRequestAccepted");
    assert.equal(secondRequest.type, "RecoveryRequestAccepted");
    if (firstRequest.type !== "RecoveryRequestAccepted" || secondRequest.type !== "RecoveryRequestAccepted") return;
    assert.notEqual(firstRequest.recoveryReference, secondRequest.recoveryReference);
    const challenges = [...fixture.unitOfWork.state.challenges.values()];
    const firstCode = fixture.delivery.takeCodeForTest(challenges.find((value) => value.workspaceId.value === fixture.bootstrap.value.workspaceId)!.challengeId.value)!;
    const secondCode = fixture.delivery.takeCodeForTest(challenges.find((value) => value.workspaceId.value === second.value.workspaceId)!.challengeId.value)!;
    assert.equal((await fixture.recovery.verify({ recoveryReference: firstRequest.recoveryReference, otp: secondCode })).type, "RecoveryCodeInvalidOrExpired");
    assert.equal((await fixture.recovery.verify({ recoveryReference: secondRequest.recoveryReference, otp: secondCode })).type, "RecoveryCodeVerified");
    assert.equal((await fixture.recovery.verify({ recoveryReference: firstRequest.recoveryReference, otp: firstCode })).type, "RecoveryCodeVerified");
  });

  it("performs no password hash before verified reset eligibility and exactly one after verification", async () => {
    const fixture = await createFixture();
    const requested = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(requested.type, "RecoveryRequestAccepted");
    if (requested.type !== "RecoveryRequestAccepted") return;
    const code = fixture.takeLatestCode()!;

    assert.equal((await fixture.recovery.reset({
      recoveryReference: requested.recoveryReference,
      newPassword: "Permanent recovered 123",
    })).type, "RecoveryResetInvalid");
    assert.equal((await fixture.recovery.reset({
      recoveryReference: "not-a-protected-flow-reference",
      newPassword: "Permanent recovered 123",
    })).type, "RecoveryResetInvalid");
    assert.equal(fixture.hasher.hashCalls, 0);

    assert.equal((await fixture.recovery.verify({ recoveryReference: requested.recoveryReference, otp: code })).type, "RecoveryCodeVerified");
    assert.equal((await fixture.recovery.reset({
      recoveryReference: requested.recoveryReference,
      newPassword: "Permanent recovered 123",
    })).type, "RecoveryResetCompleted");
    assert.equal(fixture.hasher.hashCalls, 1);
  });

  it("revalidates under lock and fails closed when challenge authority changes after reset preflight", async () => {
    const fixture = await createFixture();
    const requested = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
    assert.equal(requested.type, "RecoveryRequestAccepted");
    if (requested.type !== "RecoveryRequestAccepted") return;
    const code = fixture.takeLatestCode()!;
    assert.equal((await fixture.recovery.verify({ recoveryReference: requested.recoveryReference, otp: code })).type, "RecoveryCodeVerified");
    fixture.hasher.onHash = () => {
      const challenge = [...fixture.unitOfWork.state.challenges.values()][0]!;
      challenge.invalidate(fixture.clock.now());
    };

    assert.equal((await fixture.recovery.reset({
      recoveryReference: requested.recoveryReference,
      newPassword: "Permanent recovered 123",
    })).type, "RecoveryResetInvalid");
    assert.equal(fixture.hasher.hashCalls, 1);
    assert.equal([...fixture.unitOfWork.state.credentials.values()][0]!.passwordVersion, 1);
  });

  it("preserves send spacing after uncertain and definitive delivery outcomes", async () => {
    for (const error of ["Timeout", "TemporaryFailure", "ProviderRejected"] as const) {
      const fixture = await createFixture();
      const requested = await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
      assert.equal(requested.type, "RecoveryRequestAccepted");
      const challenge = [...fixture.unitOfWork.state.challenges.values()][0]!;
      assert.ok((await fixture.finalize.execute({
        workspaceId: challenge.workspaceId.value,
        challengeId: challenge.challengeId.value,
        adapterName: "ProviderContractTest",
        latencyMs: 100,
        result: { ok: false, error },
      })).ok);
      assert.equal(challenge.status === "Invalidated", false);
      const stored = [...fixture.unitOfWork.state.challenges.values()][0]!;
      assert.equal(stored.status, error === "ProviderRejected" ? "Invalidated" : "Active");

      await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
      assert.equal(fixture.delivery.listMetadataForTest().length, 1);
      fixture.clock.advance(60_000);
      await fixture.recovery.request({ workspaceCode: "store-01", username: "owner" });
      assert.equal(fixture.delivery.listMetadataForTest().length, 2);
    }
  });
});
