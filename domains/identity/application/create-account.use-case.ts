import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { Account } from "../domain/account";
import { LoginProtection } from "../domain/login-protection";
import { PasswordCredential } from "../domain/password-credential";
import { validatePassword } from "../domain/password";
import { Username } from "../domain/username";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher } from "./ports";

export interface CreateAccountCommand {
  readonly workspaceId: string;
  readonly requestedByActorId: string;
  readonly username: string;
  readonly temporaryPassword: string;
}

export class CreateAccountUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
    private readonly identifiers: IdentityIdentifierGenerator,
  ) {}

  async execute(command: CreateAccountCommand): Promise<IdentityResult<{ readonly actorId: string }>> {
    let username: Username;
    try {
      username = Username.create(command.username);
      validatePassword(command.temporaryPassword);
    } catch (error) {
      return identityFailure(error instanceof Error && error.message === "UsernameInvalid" ? "UsernameInvalid" : "PasswordInvalid");
    }
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const requestedBy = ActorId.create(command.requestedByActorId);
    const actorId = ActorId.create(this.identifiers.actorId());
    const now = this.clock.now();
    let hash;
    try { hash = await this.passwordHasher.hash(command.temporaryPassword); }
    catch { return identityFailure("InfrastructureUnavailable"); }

    try {
      return await this.unitOfWork.execute(async (context) => {
        if (await context.membershipRepository.findRole(workspaceId, requestedBy) !== "Owner") {
          return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("OwnerRequired"));
        }
        const account = Account.create({ workspaceId, actorId, username, createdAt: now });
        const outcome = await context.accountRepository.create(account);
        if (outcome === "UsernameAlreadyExists") {
          return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("UsernameAlreadyExists"));
        }
        if (outcome !== "Created") {
          return rollbackIdentityTransaction(identityFailure<{ readonly actorId: string }>("ActorIdAlreadyExists"));
        }
        await context.passwordCredentialRepository.create(PasswordCredential.createTemporary({
          workspaceId,
          actorId,
          passwordHash: hash,
          createdAt: now,
        }));
        await context.loginProtectionRepository.create(LoginProtection.create(workspaceId, actorId, now));
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.identityAccountCreated,
            actorId: requestedBy,
            subjectActorId: actorId,
            resultCode: "PendingActivation",
            occurredAt: now,
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.temporaryCredentialIssued,
            actorId: requestedBy,
            subjectActorId: actorId,
            resultCode: "Temporary",
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess({ actorId: actorId.value }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
