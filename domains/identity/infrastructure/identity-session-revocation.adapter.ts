import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { ActorId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { commitIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import type { IdentityClock, SessionRevocationPort } from "../application/ports";
import type { SessionRevocationReason } from "../domain/session";

export class IdentitySessionRevocationAdapter implements SessionRevocationPort {
  constructor(private readonly unitOfWork: IdentityUnitOfWork, private readonly clock: IdentityClock) {}

  async revokeForActor(workspaceValue: string, actorValue: string, reason: SessionRevocationReason): Promise<number> {
    const workspaceId = WorkspaceId.create(workspaceValue);
    const actorId = ActorId.create(actorValue);
    const at = this.clock.now();
    return this.unitOfWork.execute(async (context) => {
      const count = await context.sessionRepository.revokeAllForActor(workspaceId, actorId, reason, at);
      if (count > 0) await context.audit.append([this.auditRecord(workspaceId, actorId, reason, at, count)]);
      return commitIdentityTransaction(count);
    });
  }

  async revokeSession(workspaceValue: string, sessionValue: string, reason: SessionRevocationReason): Promise<boolean> {
    const workspaceId = WorkspaceId.create(workspaceValue);
    const sessionId = SessionId.create(sessionValue);
    const at = this.clock.now();
    return this.unitOfWork.execute(async (context) => {
      const session = await context.sessionRepository.findById(workspaceId, sessionId, { forUpdate: true });
      if (!session || !session.revoke(reason, at)) return commitIdentityTransaction(false);
      await context.sessionRepository.save(session);
      await context.audit.append([this.auditRecord(workspaceId, session.actorId, reason, at, 1)]);
      return commitIdentityTransaction(true);
    });
  }

  async revokeOtherSessions(
    workspaceValue: string,
    actorValue: string,
    currentSessionValue: string,
    reason: SessionRevocationReason,
  ): Promise<number> {
    const workspaceId = WorkspaceId.create(workspaceValue);
    const actorId = ActorId.create(actorValue);
    const currentSessionId = SessionId.create(currentSessionValue);
    const at = this.clock.now();
    return this.unitOfWork.execute(async (context) => {
      const count = await context.sessionRepository.revokeOtherSessions(
        workspaceId,
        actorId,
        currentSessionId,
        reason,
        at,
      );
      if (count > 0) await context.audit.append([this.auditRecord(workspaceId, actorId, reason, at, count)]);
      return commitIdentityTransaction(count);
    });
  }

  private auditRecord(
    workspaceId: WorkspaceId,
    actorId: ActorId,
    reason: SessionRevocationReason,
    occurredAt: Date,
    revokedCount: number,
  ) {
    return {
      workspaceId,
      eventType: SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
      actorId,
      subjectActorId: actorId,
      resultCode: reason,
      occurredAt,
      metadata: { revokedCount },
    } as const;
  }
}
