import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { validatePassword } from "../domain/password";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, PasswordHasher } from "./ports";

export class ActivateAccountUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: { readonly workspaceId: string; readonly actorId: string; readonly newPermanentPassword: string }): Promise<IdentityResult<{ readonly passwordVersion: number }>> {
    try { validatePassword(command.newPermanentPassword); }
    catch { return identityFailure("PasswordInvalid"); }
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const actorId = ActorId.create(command.actorId);
    let hash;
    try { hash = await this.passwordHasher.hash(command.newPermanentPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const account = await context.accountRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountNotFound"));
        if (account.status !== "PendingActivation") {
          return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountTransitionInvalid"));
        }
        const credential = await context.passwordCredentialRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (!credential) return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountNotFound"));
        if (credential.lifecycle !== "Temporary") {
          return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountTransitionInvalid"));
        }
        const expectedVersion = credential.replace(hash, "Permanent", now);
        if (await context.passwordCredentialRepository.replace(credential, expectedVersion) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("CredentialUpdateConflict"));
        }
        account.activate(now);
        if (await context.accountRepository.updateStatus(account, "PendingActivation") !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<{ readonly passwordVersion: number }>("AccountTransitionInvalid"));
        }
        const protection = await context.loginProtectionRepository.findByActorId(workspaceId, actorId, { forUpdate: true });
        if (protection) {
          protection.clear(now);
          await context.loginProtectionRepository.save(protection);
        }
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.identityAccountActivated,
            actorId,
            subjectActorId: actorId,
            resultCode: "Active",
            occurredAt: now,
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.permanentCredentialEstablished,
            actorId,
            subjectActorId: actorId,
            resultCode: "Permanent",
            occurredAt: now,
            metadata: { passwordVersion: credential.passwordVersion },
          },
        ]);
        return commitIdentityTransaction(identitySuccess({ passwordVersion: credential.passwordVersion }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export class SuspendAccountUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: { readonly workspaceId: string; readonly requestedByActorId: string; readonly targetActorId: string }): Promise<IdentityResult<null>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const requestedBy = ActorId.create(command.requestedByActorId);
    const targetActorId = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        if (await context.membershipRepository.findRole(workspaceId, requestedBy) !== "Owner") {
          return rollbackIdentityTransaction(identityFailure<null>("OwnerRequired"));
        }
        const account = await context.accountRepository.findByActorId(workspaceId, targetActorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<null>("AccountNotFound"));
        const expectedStatus = account.status;
        try { account.suspend(now); }
        catch { return rollbackIdentityTransaction(identityFailure<null>("AccountTransitionInvalid")); }
        if (await context.accountRepository.updateStatus(account, expectedStatus) !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<null>("AccountTransitionInvalid"));
        }
        const invalidatedCount = await context.passwordRecoveryChallengeRepository.invalidateOpenByActorId(workspaceId, targetActorId, now);
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.identityAccountSuspended,
            actorId: requestedBy,
            subjectActorId: targetActorId,
            resultCode: "Suspended",
            occurredAt: now,
          },
          ...(invalidatedCount > 0 ? [{
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.recoveryChallengeInvalidated,
            actorId: requestedBy,
            subjectActorId: targetActorId,
            resultCode: "AccountSuspended",
            occurredAt: now,
            metadata: { invalidatedCount },
          } as const] : []),
        ]);
        return commitIdentityTransaction(identitySuccess(null));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export class ReactivateAccountUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(command: { readonly workspaceId: string; readonly requestedByActorId: string; readonly targetActorId: string }): Promise<IdentityResult<null>> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const requestedBy = ActorId.create(command.requestedByActorId);
    const targetActorId = ActorId.create(command.targetActorId);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        if (await context.membershipRepository.findRole(workspaceId, requestedBy) !== "Owner") {
          return rollbackIdentityTransaction(identityFailure<null>("OwnerRequired"));
        }
        const account = await context.accountRepository.findByActorId(workspaceId, targetActorId, { forUpdate: true });
        if (!account) return rollbackIdentityTransaction(identityFailure<null>("AccountNotFound"));
        try { account.reactivate(now); }
        catch { return rollbackIdentityTransaction(identityFailure<null>("AccountTransitionInvalid")); }
        if (await context.accountRepository.updateStatus(account, "Suspended") !== "Updated") {
          return rollbackIdentityTransaction(identityFailure<null>("AccountTransitionInvalid"));
        }
        const protection = await context.loginProtectionRepository.findByActorId(workspaceId, targetActorId, { forUpdate: true });
        if (protection) {
          protection.clear(now);
          await context.loginProtectionRepository.save(protection);
        }
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.identityAccountReactivated,
            actorId: requestedBy,
            subjectActorId: targetActorId,
            resultCode: "Active",
            occurredAt: now,
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionCleared,
            actorId: requestedBy,
            subjectActorId: targetActorId,
            resultCode: "Cleared",
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess(null));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
