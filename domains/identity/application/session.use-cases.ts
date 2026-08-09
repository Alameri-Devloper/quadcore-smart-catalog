import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { WorkspaceCode } from "../../workspace/domain/workspace";
import { SESSION_REVOKED_RETENTION_MS, type SessionClass } from "../domain/session";
import { Username } from "../domain/username";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, PasswordHasher, SessionTokenDigest } from "./ports";
import { issueSession, type SessionIssuanceDependencies } from "./session-issuance";
import { validateSessionState } from "./session-validation";

export interface LoginCommand {
  readonly workspaceCode: string;
  readonly username: string;
  readonly password: string;
}

export interface LoginSessionResult {
  readonly opaqueValue: string;
  readonly sessionClass: SessionClass;
  readonly passwordChangeRequired: boolean;
  readonly absoluteExpiresAt: Date;
}

const consumeVerificationCost = async (hasher: PasswordHasher, password: string): Promise<boolean> => {
  try {
    await hasher.hash(password);
    return true;
  } catch {
    return false;
  }
};

export class LoginUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly hasher: PasswordHasher,
    private readonly clock: IdentityClock,
    private readonly issuance: SessionIssuanceDependencies,
  ) {}

  async execute(command: LoginCommand): Promise<IdentityResult<LoginSessionResult>> {
    let workspaceCode: WorkspaceCode;
    let username: Username;
    if (typeof command.password !== "string") return identityFailure("InvalidCredentialsOrUnavailableAccount");
    try {
      workspaceCode = WorkspaceCode.create(command.workspaceCode);
      username = Username.create(command.username);
    } catch {
      return await consumeVerificationCost(this.hasher, command.password)
        ? identityFailure("InvalidCredentialsOrUnavailableAccount")
        : identityFailure("InfrastructureUnavailable");
    }
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const workspace = await context.workspaceRepository.findByCode(workspaceCode);
        if (!workspace) {
          return await consumeVerificationCost(this.hasher, command.password)
            ? rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InvalidCredentialsOrUnavailableAccount"))
            : rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InfrastructureUnavailable"));
        }
        const account = await context.accountRepository.findByUsername(workspace.workspaceId, username, { forUpdate: true });
        if (!account || account.status === "Suspended") {
          return await consumeVerificationCost(this.hasher, command.password)
            ? rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InvalidCredentialsOrUnavailableAccount"))
            : rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InfrastructureUnavailable"));
        }
        const protection = await context.loginProtectionRepository.findByActorId(workspace.workspaceId, account.actorId, { forUpdate: true });
        if (!protection || protection.isLocked(now)) {
          return rollbackIdentityTransaction(identityFailure<LoginSessionResult>("LoginTemporarilyUnavailable"));
        }
        const credential = await context.passwordCredentialRepository.findByActorId(workspace.workspaceId, account.actorId, { forUpdate: true });
        const membership = await context.membershipRepository.findByActorId(workspace.workspaceId, account.actorId, { forUpdate: true });
        if (!credential || !membership) {
          return await consumeVerificationCost(this.hasher, command.password)
            ? rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InvalidCredentialsOrUnavailableAccount"))
            : rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InfrastructureUnavailable"));
        }

        let verified: boolean;
        try { verified = await this.hasher.verify(command.password, credential.passwordHash); }
        catch { return rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InfrastructureUnavailable")); }
        if (!verified) {
          const outcome = protection.registerFailure(now);
          await context.loginProtectionRepository.save(protection);
          await context.audit.append([
            {
              workspaceId: workspace.workspaceId,
              eventType: SECURITY_AUDIT_EVENT_TYPES.loginFailed,
              actorId: account.actorId,
              subjectActorId: account.actorId,
              resultCode: outcome,
              occurredAt: now,
            },
            ...(outcome === "Locked" ? [{
              workspaceId: workspace.workspaceId,
              eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionLocked,
              actorId: account.actorId,
              subjectActorId: account.actorId,
              resultCode: "Locked",
              occurredAt: now,
              metadata: { lockLevel: protection.lockLevel },
            } as const] : []),
          ]);
          return commitIdentityTransaction(identityFailure<LoginSessionResult>(
            outcome === "Locked" ? "LoginTemporarilyUnavailable" : "InvalidCredentialsOrUnavailableAccount",
          ));
        }

        const sessionClass: SessionClass | null = credential.lifecycle === "Temporary"
          ? "Restricted"
          : account.status === "Active" ? "Full" : null;
        if (!sessionClass) {
          return rollbackIdentityTransaction(identityFailure<LoginSessionResult>("InvalidCredentialsOrUnavailableAccount"));
        }
        const hadProtectionState = protection.failedAttemptCount > 0
          || protection.lockLevel > 0
          || protection.lockedUntil !== null;
        protection.clear(now);
        await context.loginProtectionRepository.save(protection);
        const issued = await issueSession(context, this.issuance, {
          workspaceId: workspace.workspaceId,
          actorId: account.actorId,
          sessionClass,
          authorizationVersion: membership.authorizationVersion,
          passwordVersion: credential.passwordVersion,
          at: now,
        });
        if (!issued.ok) return rollbackIdentityTransaction(identityFailure<LoginSessionResult>(issued.error));
        await context.audit.append([
          ...(hadProtectionState ? [{
            workspaceId: workspace.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.loginProtectionCleared,
            actorId: account.actorId,
            subjectActorId: account.actorId,
            resultCode: "AuthenticationSucceeded",
            occurredAt: now,
          } as const] : []),
          {
            workspaceId: workspace.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.loginSucceeded,
            actorId: account.actorId,
            subjectActorId: account.actorId,
            resultCode: sessionClass,
            occurredAt: now,
          },
          {
            workspaceId: workspace.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.sessionCreated,
            actorId: account.actorId,
            subjectActorId: account.actorId,
            resultCode: sessionClass,
            occurredAt: now,
          },
        ]);
        return commitIdentityTransaction(identitySuccess({
          opaqueValue: issued.value.opaqueValue,
          sessionClass,
          passwordChangeRequired: sessionClass === "Restricted",
          absoluteExpiresAt: issued.value.session.absoluteExpiresAt,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export interface AuthenticatedSessionView {
  readonly sessionId: string;
  readonly sessionClass: SessionClass;
  readonly passwordChangeRequired: boolean;
  readonly context: TrustedActorContext;
  readonly workspaceDisplayName: string;
  readonly username: string;
  readonly displayName: string;
}

export class ResolveSessionUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly digest: SessionTokenDigest,
    private readonly clock: IdentityClock,
  ) {}

  async execute(command: { readonly rawSessionValue: string; readonly requiredClass: "Any" | "Full" }): Promise<IdentityResult<AuthenticatedSessionView>> {
    if (typeof command.rawSessionValue !== "string" || command.rawSessionValue.length > 512) return identityFailure("SessionNotFound");
    const digests = this.digest.candidates(command.rawSessionValue);
    if (digests.length === 0) return identityFailure("SessionNotFound");
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const session = await context.sessionRepository.findByDigests(digests, { forUpdate: true });
        if (!session) return rollbackIdentityTransaction(identityFailure<AuthenticatedSessionView>("SessionNotFound"));
        const validated = await validateSessionState(context, session, now, command.requiredClass);
        if (!validated.ok) return commitIdentityTransaction(identityFailure<AuthenticatedSessionView>(validated.error));
        return commitIdentityTransaction(identitySuccess({
          sessionId: session.sessionId.value,
          sessionClass: session.sessionClass,
          passwordChangeRequired: session.sessionClass === "Restricted",
          context: validated.value.context,
          workspaceDisplayName: validated.value.workspace.displayName,
          username: validated.value.account.username.value,
          displayName: validated.value.profile.displayName,
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}

export class LogoutUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly digest: SessionTokenDigest,
    private readonly clock: IdentityClock,
  ) {}

  async execute(rawSessionValue: string | null): Promise<IdentityResult<null>> {
    const digests = rawSessionValue ? this.digest.candidates(rawSessionValue) : [];
    if (digests.length === 0) return identitySuccess(null);
    const now = this.clock.now();
    try {
      return await this.unitOfWork.execute(async (context) => {
        const session = await context.sessionRepository.findByDigests(digests, { forUpdate: true });
        if (!session || !session.revoke("Logout", now)) return commitIdentityTransaction(identitySuccess(null));
        await context.sessionRepository.save(session);
        await context.audit.append([
          {
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "Logout",
            occurredAt: now,
          },
          {
            workspaceId: session.workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.logoutCompleted,
            actorId: session.actorId,
            subjectActorId: session.actorId,
            resultCode: "Completed",
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

export class CleanupSessionsUseCase {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async execute(limit = 500): Promise<IdentityResult<{ readonly deletedCount: number }>> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) return identityFailure("InfrastructureUnavailable");
    const now = this.clock.now();
    const revokedBefore = new Date(now.getTime() - SESSION_REVOKED_RETENTION_MS);
    try {
      return await this.unitOfWork.execute(async (context) => commitIdentityTransaction(identitySuccess({
        deletedCount: await context.sessionRepository.deleteCleanupEligible(now, revokedBefore, limit),
      })));
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
