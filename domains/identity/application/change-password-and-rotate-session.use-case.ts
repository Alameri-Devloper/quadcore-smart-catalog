import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { validatePassword } from "../domain/password";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, PasswordHasher, SessionTokenDigest } from "./ports";
import { issueSession, type SessionIssuanceDependencies } from "./session-issuance";
import { validateSessionState } from "./session-validation";

export interface ChangePasswordCommand {
  readonly rawSessionValue: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface RotatedSessionResult {
  readonly opaqueValue: string;
  readonly sessionClass: "Full";
  readonly passwordChangeRequired: false;
  readonly absoluteExpiresAt: Date;
}

export class ChangePasswordAndRotateSessionUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly digest: SessionTokenDigest,
    private readonly clock: IdentityClock,
    private readonly issuance: SessionIssuanceDependencies,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<IdentityResult<RotatedSessionResult>> {
    if (typeof command.currentPassword !== "string") return identityFailure("InvalidCurrentPassword");
    try { validatePassword(command.newPassword); }
    catch { return identityFailure("PasswordInvalid"); }
    const digests = this.digest.candidates(command.rawSessionValue);
    if (digests.length === 0) return identityFailure("SessionNotFound");
    let replacementHash;
    try { replacementHash = await this.hasher.hash(command.newPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }
    const now = this.clock.now();

    try {
      return await this.unitOfWork.execute(async (context) => {
        const session = await context.sessionRepository.findByDigests(digests, { forUpdate: true });
        if (!session) return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>("SessionNotFound"));
        const validated = await validateSessionState(context, session, now, "Any");
        if (!validated.ok) return commitIdentityTransaction(identityFailure<RotatedSessionResult>(validated.error));

        let currentVerified: boolean;
        try { currentVerified = await this.hasher.verify(command.currentPassword, validated.value.credential.passwordHash); }
        catch { return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>("InfrastructureUnavailable")); }
        if (!currentVerified) return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>("InvalidCurrentPassword"));

        const expectedVersion = validated.value.credential.replace(replacementHash, "Permanent", now);
        const replaced = await context.passwordCredentialRepository.replace(validated.value.credential, expectedVersion);
        if (replaced !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>(
            replaced === "CredentialUpdateConflict" ? "CredentialUpdateConflict" : "AccountNotFound",
          ));
        }
        if (validated.value.account.status === "PendingActivation") {
          validated.value.account.activate(now);
          if (await context.accountRepository.updateStatus(validated.value.account, "PendingActivation") !== "Updated") {
            return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>("AccountTransitionInvalid"));
          }
        }
        const protection = await context.loginProtectionRepository.findByActorId(
          session.workspaceId,
          session.actorId,
          { forUpdate: true },
        );
        if (protection) {
          protection.clear(now);
          await context.loginProtectionRepository.save(protection);
        }

        const revokedCount = await context.sessionRepository.revokeAllForActor(
          session.workspaceId,
          session.actorId,
          "PasswordChanged",
          now,
        );
        const issued = await issueSession(context, this.issuance, {
          workspaceId: session.workspaceId,
          actorId: session.actorId,
          sessionClass: "Full",
          authorizationVersion: validated.value.membership.authorizationVersion,
          passwordVersion: validated.value.credential.passwordVersion,
          at: now,
        });
        if (!issued.ok) return rollbackIdentityTransaction(identityFailure<RotatedSessionResult>(issued.error));

        await context.audit.append([
          {
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.credentialChanged,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "Permanent",
            occurredAt: now,
            metadata: { passwordVersion: validated.value.credential.passwordVersion },
          },
          {
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "PasswordChanged",
            occurredAt: now,
            metadata: { revokedCount },
          },
          ...(session.sessionClass === "Restricted" ? [{
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.restrictedSessionUpgraded,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "Full",
            occurredAt: now,
          } as const] : []),
          {
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.sessionCreated,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "Full",
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess({
          opaqueValue: issued.value.opaqueValue,
          sessionClass: "Full",
          passwordChangeRequired: false,
          absoluteExpiresAt: issued.value.session.absoluteExpiresAt,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
