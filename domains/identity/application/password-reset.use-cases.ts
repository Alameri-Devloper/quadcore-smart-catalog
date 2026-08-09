import { SECURITY_AUDIT_EVENT_TYPES, type SecurityAuditEventType } from "../../../shared/audit/audit.port";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { WorkspaceCode } from "../../workspace/domain/workspace";
import { validatePassword } from "../domain/password";
import { Username } from "../domain/username";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityTransactionalContext, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, PasswordHasher } from "./ports";

interface PasswordResetTarget {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly auditActorId: ActorId | null;
  readonly eventType: SecurityAuditEventType;
}

const replaceWithTemporaryPassword = async (
  context: IdentityTransactionalContext,
  target: PasswordResetTarget,
  hash: Awaited<ReturnType<PasswordHasher["hash"]>>,
  now: Date,
): Promise<IdentityResult<{ readonly passwordVersion: number }>> => {
  const credential = await context.passwordCredentialRepository.findByActorId(
    target.workspaceId,
    target.actorId,
    { forUpdate: true },
  );
  if (!credential) return identityFailure("AccountNotFound");
  const expectedVersion = credential.replace(hash, "Temporary", now);
  const outcome = await context.passwordCredentialRepository.replace(credential, expectedVersion);
  if (outcome !== "Updated") {
    return identityFailure(outcome === "CredentialUpdateConflict" ? "CredentialUpdateConflict" : "AccountNotFound");
  }

  const protection = await context.loginProtectionRepository.findByActorId(
    target.workspaceId,
    target.actorId,
    { forUpdate: true },
  );
  if (protection) {
    protection.clear(now);
    await context.loginProtectionRepository.save(protection);
  }
  const invalidatedCount = await context.passwordRecoveryChallengeRepository.invalidateOpenByActorId(target.workspaceId, target.actorId, now);
  const revokedCount = await context.sessionRepository.revokeAllForActor(
    target.workspaceId,
    target.actorId,
    "OwnerPasswordReset",
    now,
  );
  await context.audit.append([
    {
      workspaceId: target.workspaceId,
      eventType: target.eventType,
      actorId: target.auditActorId,
      subjectActorId: target.actorId,
      resultCode: "Temporary",
      occurredAt: now,
      metadata: { passwordVersion: credential.passwordVersion },
    },
    {
      workspaceId: target.workspaceId,
      eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionCleared,
      actorId: target.auditActorId,
      subjectActorId: target.actorId,
      resultCode: "Cleared",
      occurredAt: now,
    },
    ...(invalidatedCount > 0 ? [{
      workspaceId: target.workspaceId,
      eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeInvalidated,
      actorId: target.auditActorId,
      subjectActorId: target.actorId,
      resultCode: "PasswordReset",
      occurredAt: now,
      metadata: { invalidatedCount },
    } as const] : []),
    ...(revokedCount > 0 ? [{
      workspaceId: target.workspaceId,
      eventType: SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
      actorId: target.auditActorId,
      subjectActorId: target.actorId,
      resultCode: "OwnerPasswordReset",
      occurredAt: now,
      metadata: { revokedCount },
    } as const] : []),
  ]);
  return identitySuccess({ passwordVersion: credential.passwordVersion });
};

export interface OwnerResetPasswordCommand {
  readonly workspaceId: string;
  readonly requestedByActorId: string;
  readonly targetActorId: string;
  readonly newTemporaryPassword: string;
}

export class OwnerResetPasswordUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: OwnerResetPasswordCommand): Promise<IdentityResult<{ readonly passwordVersion: number }>> {
    try { validatePassword(command.newTemporaryPassword); }
    catch { return identityFailure("PasswordInvalid"); }
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const requestedBy = ActorId.create(command.requestedByActorId);
    const targetActorId = ActorId.create(command.targetActorId);
    if (requestedBy.equals(targetActorId)) return identityFailure("OwnerRequired");
    let hash;
    try { hash = await this.passwordHasher.hash(command.newTemporaryPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }
    const now = this.clock.now();

    try {
      return await this.unitOfWork.execute(async (context) => {
        if (await context.membershipRepository.findRole(workspaceId, requestedBy) !== "Owner") {
          return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("OwnerRequired"));
        }
        const account = await context.accountRepository.findByActorId(workspaceId, targetActorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountNotFound"));
        const result = await replaceWithTemporaryPassword(context, {
          workspaceId,
          actorId: targetActorId,
          auditActorId: requestedBy,
          eventType: SECURITY_AUDIT_EVENT_TYPES.ownerCredentialReset,
        }, hash, now);
        return result.ok ? commitIdentityTransaction(result) : rollbackIdentityTransaction(result);
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export interface EmergencyOwnerPasswordResetCommand {
  readonly workspaceCode: string;
  readonly ownerUsername: string;
  readonly newTemporaryPassword: string;
}

export class EmergencyOwnerPasswordResetUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: EmergencyOwnerPasswordResetCommand): Promise<IdentityResult<{ readonly workspaceId: string; readonly actorId: string; readonly passwordVersion: number }>> {
    let workspaceCode: WorkspaceCode;
    let username: Username;
    try {
      workspaceCode = WorkspaceCode.create(command.workspaceCode);
      username = Username.create(command.ownerUsername);
      validatePassword(command.newTemporaryPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "WorkspaceCodeInvalid") return identityFailure("WorkspaceCodeInvalid");
      if (message === "UsernameInvalid") return identityFailure("UsernameInvalid");
      return identityFailure("PasswordInvalid");
    }
    let hash;
    try { hash = await this.passwordHasher.hash(command.newTemporaryPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }
    const now = this.clock.now();

    try {
      return await this.unitOfWork.execute(async (context) => {
        const workspace = await context.workspaceRepository.findByCode(workspaceCode, { forUpdate: true });
        if (!workspace) return rollbackIdentityTransaction(identityFailure<{ readonly workspaceId: string; readonly actorId: string; readonly passwordVersion: number }>("WorkspaceNotFound"));
        const account = await context.accountRepository.findByUsername(workspace.workspaceId, username, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly workspaceId: string; readonly actorId: string; readonly passwordVersion: number }>("AccountNotFound"));
        if (await context.membershipRepository.findRole(workspace.workspaceId, account.actorId) !== "Owner") {
          return rollbackIdentityTransaction(identityFailure<{ readonly workspaceId: string; readonly actorId: string; readonly passwordVersion: number }>("OwnerRequired"));
        }
        const result = await replaceWithTemporaryPassword(context, {
          workspaceId: workspace.workspaceId,
          actorId: account.actorId,
          auditActorId: null,
          eventType: SECURITY_AUDIT_EVENT_TYPES.emergencyOwnerCredentialReset,
        }, hash, now);
        if (!result.ok) return rollbackIdentityTransaction(result);
        return commitIdentityTransaction(identitySuccess({
          workspaceId: workspace.workspaceId.value,
          actorId: account.actorId.value,
          passwordVersion: result.value.passwordVersion,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
