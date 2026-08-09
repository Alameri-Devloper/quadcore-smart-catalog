import { SessionId } from "../../../shared/domain/scoped-identity";
import { ServerSession, type SessionClass } from "../domain/session";
import type { IdentityTransactionalContext } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { SessionIdentifierGenerator, SessionTokenDigest, SessionTokenGenerator } from "./ports";

export interface SessionIssuanceDependencies {
  readonly identifiers: SessionIdentifierGenerator;
  readonly values: SessionTokenGenerator;
  readonly digest: SessionTokenDigest;
}

export interface IssuedSession {
  readonly session: ServerSession;
  readonly opaqueValue: string;
}

export const issueSession = async (
  context: IdentityTransactionalContext,
  dependencies: SessionIssuanceDependencies,
  input: {
    readonly workspaceId: ServerSession["workspaceId"];
    readonly actorId: ServerSession["actorId"];
    readonly sessionClass: SessionClass;
    readonly authorizationVersion: number;
    readonly passwordVersion: number;
    readonly at: Date;
  },
): Promise<IdentityResult<IssuedSession>> => {
  try {
    const opaqueValue = dependencies.values.generate();
    const session = ServerSession.create({
      workspaceId: input.workspaceId,
      sessionId: SessionId.create(dependencies.identifiers.sessionId()),
      digest: dependencies.digest.create(opaqueValue),
      actorId: input.actorId,
      sessionClass: input.sessionClass,
      authorizationVersion: input.authorizationVersion,
      passwordVersion: input.passwordVersion,
      createdAt: input.at,
    });
    const created = await context.sessionRepository.create(session);
    return created === "Created"
      ? identitySuccess(Object.freeze({ session, opaqueValue }))
      : identityFailure("SessionCreateConflict");
  } catch {
    return identityFailure("InfrastructureUnavailable");
  }
};
