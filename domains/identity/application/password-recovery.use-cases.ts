import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { ActorId, ChallengeId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { PasswordRecoveryChallenge, RECOVERY_MAX_SENDS_PER_WINDOW, RECOVERY_RESEND_INTERVAL_MS, RECOVERY_SEND_WINDOW_MS } from "../domain/password-recovery-challenge";
import { validatePassword } from "../domain/password";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher, RecoveryCodeDigest, RecoveryCodeGenerator } from "./ports";

const challengeStatusFailure = <T>(status: PasswordRecoveryChallenge["status"]): IdentityResult<T> => {
  switch (status) {
    case "Expired": return identityFailure("RecoveryChallengeExpired");
    case "Invalidated": return identityFailure("RecoveryChallengeInvalidated");
    case "Consumed": return identityFailure("RecoveryChallengeConsumed");
    case "Verified": return identityFailure("RecoveryChallengeNotVerified");
    case "Active": return identityFailure("RecoveryCodeInvalid");
  }
};

export interface CreatePasswordRecoveryChallengeCommand {
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface TrustedRecoveryDelivery {
  readonly challengeId: string;
  readonly channel: "PrimaryRecoveryContact";
  readonly destination: string;
  readonly code: string;
  readonly expiresAt: Date;
}

export class CreatePasswordRecoveryChallengeUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly digest: RecoveryCodeDigest,
    private readonly codeGenerator: RecoveryCodeGenerator,
    private readonly clock: IdentityClock,
    private readonly identifiers: IdentityIdentifierGenerator,
  ) {}

  async execute(command: CreatePasswordRecoveryChallengeCommand): Promise<IdentityResult<TrustedRecoveryDelivery>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const actorId = ActorId.create(command.actorId);
    const challengeId = ChallengeId.create(this.identifiers.challengeId());
    const now = this.clock.now();
    const code = this.codeGenerator.generate();
    let digestValue;
    try { digestValue = await this.digest.create(code); }
    catch { return identityFailure("InfrastructureUnavailable"); }

    try {
      return await this.unitOfWork.execute(async (context) => {
        const workspace = await context.workspaceRepository.findById(workspaceId);
        if (!workspace) return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("WorkspaceNotFound"));
        if (workspace.passwordRecoveryPolicy !== "WhatsAppOtpWithOwnerFallback") {
          return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("RecoveryNotAllowed"));
        }
        const account = await context.accountRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("AccountNotFound"));
        if (account.status === "Suspended") return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("AccountSuspended"));
        const profile = await context.memberProfileRepository.findByActorId(workspaceId, actorId);
        if (!profile) return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("RecoveryNotAllowed"));

        const open = await context.passwordRecoveryChallengeRepository.findOpenByActorId(workspaceId, actorId, { forUpdate: true });
        if (open && now.getTime() - open.createdAt.getTime() < RECOVERY_RESEND_INTERVAL_MS) {
          return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("RecoveryRateLimited"));
        }
        const sends = await context.passwordRecoveryChallengeRepository.countCreatedSince(
          workspaceId,
          actorId,
          new Date(now.getTime() - RECOVERY_SEND_WINDOW_MS),
        );
        if (sends >= RECOVERY_MAX_SENDS_PER_WINDOW) {
          return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("RecoveryRateLimited"));
        }

        const invalidatedCount = await context.passwordRecoveryChallengeRepository.invalidateOpenByActorId(workspaceId, actorId, now);
        const challenge = PasswordRecoveryChallenge.create({
          workspaceId,
          challengeId,
          actorId,
          channel: "PrimaryRecoveryContact",
          destinationVersion: profile.recoveryContactVersion,
          digest: digestValue,
          createdAt: now,
        });
        if (await context.passwordRecoveryChallengeRepository.create(challenge) !== "Created") {
          return rollbackIdentityTransaction(identityFailure<TrustedRecoveryDelivery>("RecoveryRateLimited"));
        }
        await context.audit.append([
          ...(invalidatedCount > 0 ? [{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeInvalidated,
            actorId,
            subjectActorId: actorId,
            resultCode: "Replaced",
            occurredAt: now,
            metadata: { invalidatedCount },
          } as const] : []),
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeCreated,
            actorId,
            subjectActorId: actorId,
            resultCode: "Active",
            occurredAt: now,
            metadata: { channel: challenge.channel, destinationVersion: challenge.destinationVersion },
          },
        ]);
        return commitIdentityTransaction(identitySuccess({
          challengeId: challengeId.value,
          channel: "PrimaryRecoveryContact",
          destination: profile.recoveryPhone.value,
          code,
          expiresAt: challenge.expiresAt,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export interface VerifyPasswordRecoveryChallengeCommand {
  readonly workspaceId: string;
  readonly challengeId: string;
  readonly code: string;
}

export class VerifyPasswordRecoveryChallengeUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly digest: RecoveryCodeDigest,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: VerifyPasswordRecoveryChallengeCommand): Promise<IdentityResult<{ readonly actorId: string }>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const challengeId = ChallengeId.create(command.challengeId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const challenge = await context.passwordRecoveryChallengeRepository.findById(workspaceId, challengeId, { forUpdate: true });
        if (!challenge) return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("RecoveryChallengeNotFound"));
        const account = await context.accountRepository.findByActorId(workspaceId, challenge.actorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("AccountNotFound"));
        if (account.status === "Suspended") return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("AccountSuspended"));
        if (challenge.expireIfNeeded(now)) {
          await context.passwordRecoveryChallengeRepository.save(challenge);
          return commitIdentityTransaction(identityFailure<{ readonly actorId: string }>("RecoveryChallengeExpired"));
        }
        if (challenge.status !== "Active") {
          return rollbackIdentityTransaction(challengeStatusFailure<{ readonly actorId: string }>(challenge.status));
        }

        const validShape = /^[0-9]{8}$/.test(command.code);
        const verified = validShape && await this.digest.verify(command.code, challenge.digest);
        if (!verified) {
          const outcome = challenge.recordFailedVerification(now);
          await context.passwordRecoveryChallengeRepository.save(challenge);
          await context.audit.append([{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeFailed,
            actorId: challenge.actorId,
            subjectActorId: challenge.actorId,
            resultCode: outcome,
            occurredAt: now,
            metadata: { attemptCount: challenge.attemptCount },
          }]);
          return commitIdentityTransaction(identityFailure<{ readonly actorId: string }>(
            outcome === "AttemptsExceeded" ? "RecoveryChallengeAttemptsExceeded" : "RecoveryCodeInvalid",
          ));
        }

        challenge.verify(now);
        await context.passwordRecoveryChallengeRepository.save(challenge);
        await context.audit.append([{
          workspaceId,
          eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeVerified,
          actorId: challenge.actorId,
          subjectActorId: challenge.actorId,
          resultCode: "Verified",
          occurredAt: now,
        }]);
        return commitIdentityTransaction(identitySuccess({ actorId: challenge.actorId.value }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export interface CompletePasswordRecoveryCommand {
  readonly workspaceId: string;
  readonly challengeId: string;
  readonly newPassword: string;
}

export class CompletePasswordRecoveryUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: CompletePasswordRecoveryCommand): Promise<IdentityResult<{ readonly actorId: string; readonly passwordVersion: number }>> {
    try { validatePassword(command.newPassword); }
    catch { return identityFailure("PasswordInvalid"); }
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const challengeId = ChallengeId.create(command.challengeId);
    const now = this.clock.now();
    let hash;
    try { hash = await this.passwordHasher.hash(command.newPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }

    try {
      return await this.unitOfWork.execute(async (context) => {
        const challenge = await context.passwordRecoveryChallengeRepository.findById(workspaceId, challengeId, { forUpdate: true });
        if (!challenge) return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>("RecoveryChallengeNotFound"));
        if (challenge.expireIfNeeded(now)) {
          await context.passwordRecoveryChallengeRepository.save(challenge);
          return commitIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>("RecoveryChallengeExpired"));
        }
        if (challenge.status !== "Verified") {
          return rollbackIdentityTransaction(challengeStatusFailure<{ readonly actorId: string; readonly passwordVersion: number }>(challenge.status));
        }
        const account = await context.accountRepository.findByActorId(workspaceId, challenge.actorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>("AccountNotFound"));
        if (account.status === "Suspended") return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>("AccountSuspended"));
        const credential = await context.passwordCredentialRepository.findByActorId(workspaceId, challenge.actorId, { forUpdate: true });
        if (!credential) return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>("AccountNotFound"));
        const expectedVersion = credential.replace(hash, "Permanent", now);
        const replacement = await context.passwordCredentialRepository.replace(credential, expectedVersion);
        if (replacement !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string; readonly passwordVersion: number }>(
            replacement === "CredentialUpdateConflict" ? "CredentialUpdateConflict" : "AccountNotFound",
          ));
        }
        const protection = await context.loginProtectionRepository.findByActorId(workspaceId, challenge.actorId, { forUpdate: true });
        if (protection) {
          protection.clear(now);
          await context.loginProtectionRepository.save(protection);
        }
        challenge.consume(now);
        await context.passwordRecoveryChallengeRepository.save(challenge);
        const invalidatedCount = await context.passwordRecoveryChallengeRepository.invalidateOpenByActorId(workspaceId, challenge.actorId, now, challenge.challengeId);
        const revokedCount = await context.sessionRepository.revokeAllForActor(
          workspaceId,
          challenge.actorId,
          "RecoveryCompleted",
          now,
        );
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeConsumed,
            actorId: challenge.actorId,
            subjectActorId: challenge.actorId,
            resultCode: "Consumed",
            occurredAt: now,
            metadata: { passwordVersion: credential.passwordVersion },
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionCleared,
            actorId: challenge.actorId,
            subjectActorId: challenge.actorId,
            resultCode: "Cleared",
            occurredAt: now,
          },
          ...(invalidatedCount > 0 ? [{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeInvalidated,
            actorId: challenge.actorId,
            subjectActorId: challenge.actorId,
            resultCode: "RecoveryCompleted",
            occurredAt: now,
            metadata: { invalidatedCount },
          } as const] : []),
          ...(revokedCount > 0 ? [{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
            actorId: challenge.actorId,
            subjectActorId: challenge.actorId,
            resultCode: "RecoveryCompleted",
            occurredAt: now,
            metadata: { revokedCount },
          } as const] : []),
        ]);
        return commitIdentityTransaction(identitySuccess({
          actorId: challenge.actorId.value,
          passwordVersion: credential.passwordVersion,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export interface InvalidatePasswordRecoveryChallengesCommand {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly requestedByActorId: string | null;
}

export class InvalidatePasswordRecoveryChallengesUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: InvalidatePasswordRecoveryChallengesCommand): Promise<IdentityResult<{ readonly invalidatedCount: number }>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const actorId = ActorId.create(command.actorId);
    const requestedBy = command.requestedByActorId ? ActorId.create(command.requestedByActorId) : null;
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const count = await context.passwordRecoveryChallengeRepository.invalidateOpenByActorId(workspaceId, actorId, now);
        if (count > 0) {
          await context.audit.append([{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeInvalidated,
            actorId: requestedBy,
            subjectActorId: actorId,
            resultCode: "Invalidated",
            occurredAt: now,
            metadata: { invalidatedCount: count },
          }]);
        }
        return commitIdentityTransaction(identitySuccess({ invalidatedCount: count }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
