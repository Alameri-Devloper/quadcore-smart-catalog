import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { LoginProtection } from "../domain/login-protection";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock } from "./ports";

export class RecordLoginFailureUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: { readonly workspaceId: string; readonly actorId: string }): Promise<IdentityResult<{ readonly outcome: "FailureRecorded" | "Locked" | "AlreadyLocked"; readonly lockedUntil: Date | null }>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const actorId = ActorId.create(command.actorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const account = await context.accountRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly outcome: "FailureRecorded" | "Locked" | "AlreadyLocked"; readonly lockedUntil: Date | null }>("AccountNotFound"));
        if (account.status === "Suspended") return rollbackIdentityTransaction(identityFailure<{ readonly outcome: "FailureRecorded" | "Locked" | "AlreadyLocked"; readonly lockedUntil: Date | null }>("AccountSuspended"));
        let protection = await context.loginProtectionRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!protection) {
          protection = LoginProtection.create(workspaceId, actorId, now);
          await context.loginProtectionRepository.create(protection);
        }
        const outcome = protection.registerFailure(now);
        if (outcome !== "AlreadyLocked") await context.loginProtectionRepository.save(protection);
        if (outcome === "Locked") {
          await context.audit.append([{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionLocked,
            actorId,
            subjectActorId: actorId,
            resultCode: "Locked",
            occurredAt: now,
            metadata: { lockLevel: protection.lockLevel, lockedUntil: protection.lockedUntil?.toISOString() ?? null },
          }]);
        }
        return commitIdentityTransaction(identitySuccess({ outcome, lockedUntil: protection.lockedUntil }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export class ClearLoginProtectionUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: { readonly workspaceId: string; readonly actorId: string }): Promise<IdentityResult<null>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const actorId = ActorId.create(command.actorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const protection = await context.loginProtectionRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!protection) return rollbackIdentityTransaction(identityFailure<null>("AccountNotFound"));
        protection.clear(now);
        await context.loginProtectionRepository.save(protection);
        await context.audit.append([{
          workspaceId,
          eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionCleared,
          actorId,
          subjectActorId: actorId,
          resultCode: "Cleared",
          occurredAt: now,
        }]);
        return commitIdentityTransaction(identitySuccess(null));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
