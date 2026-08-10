import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import type { IdentityTransactionalContext } from "../repositories/identity.repositories";
import type { Account } from "../domain/account";
import type { WorkspaceMemberProfile, WorkspaceMembership } from "../domain/member";
import type { PasswordCredential } from "../domain/password-credential";
import type { ServerSession } from "../domain/session";
import type { Workspace } from "../../workspace/domain/workspace";
import { ownerEffectivePermissionCodes, staffEffectivePermissionCodes } from "../domain/permission";
import { identityFailure, type IdentityResult } from "./identity-results";

export interface ValidatedSessionState {
  readonly session: ServerSession;
  readonly account: Account;
  readonly credential: PasswordCredential;
  readonly membership: WorkspaceMembership;
  readonly profile: WorkspaceMemberProfile;
  readonly workspace: Workspace;
  readonly context: TrustedActorContext;
}

const trustedContext = (membership: WorkspaceMembership): TrustedActorContext => Object.freeze({
  workspaceId: membership.workspaceId.value,
  actorId: membership.actorId.value,
  role: membership.role,
  permissions: membership.role === "Owner"
    ? ownerEffectivePermissionCodes()
    : staffEffectivePermissionCodes(membership.permissionCodes),
  branchScope: membership.branchScope === "AllBranches"
    ? Object.freeze({ type: "AllBranches" as const })
    : Object.freeze({ type: "SelectedBranches" as const, branchIds: Object.freeze([...membership.branchIds]) }),
  authorizationVersion: membership.authorizationVersion,
});

const revokeRejectedSession = async (
  context: IdentityTransactionalContext,
  session: ServerSession,
  reason: Parameters<ServerSession["revoke"]>[0],
  at: Date,
  eventType: typeof SECURITY_AUDIT_EVENT_TYPES.sessionRejectedCredentialVersion
    | typeof SECURITY_AUDIT_EVENT_TYPES.sessionRejectedAuthorizationVersion
    | typeof SECURITY_AUDIT_EVENT_TYPES.sessionRevoked,
  resultCode: string,
): Promise<void> => {
  if (session.revoke(reason, at)) await context.sessionRepository.save(session);
  await context.audit.append([{
    workspaceId: session.workspaceId,
    eventType,
    actorId: session.actorId,
    subjectActorId: session.actorId,
    resultCode,
    occurredAt: at,
  }]);
};

export const validateSessionState = async (
  context: IdentityTransactionalContext,
  session: ServerSession,
  at: Date,
  requiredClass: "Any" | "Full",
): Promise<IdentityResult<ValidatedSessionState>> => {
  const availability = session.availabilityAt(at);
  if (availability === "Revoked") return identityFailure("SessionRevoked");
  if (availability !== "Active") {
    await revokeRejectedSession(context, session, "Expired", at, SECURITY_AUDIT_EVENT_TYPES.sessionRevoked, availability);
    return identityFailure("SessionExpired");
  }

  const account = await context.accountRepository.findByActorId(session.workspaceId, session.actorId, { forUpdate: true });
  const credential = await context.passwordCredentialRepository.findByActorId(session.workspaceId, session.actorId, { forUpdate: true });
  const membership = await context.membershipRepository.findByActorId(session.workspaceId, session.actorId, { forUpdate: true });
  const profile = await context.memberProfileRepository.findByActorId(session.workspaceId, session.actorId);
  const workspace = await context.workspaceRepository.findById(session.workspaceId);
  if (!account || !credential || !membership || !profile || !workspace) {
    await revokeRejectedSession(context, session, "AdministrativeRevocation", at, SECURITY_AUDIT_EVENT_TYPES.sessionRevoked, "IdentityStateUnavailable");
    return identityFailure("SessionNotFound");
  }
  if (account.status === "Suspended") {
    await revokeRejectedSession(context, session, "AccountSuspended", at, SECURITY_AUDIT_EVENT_TYPES.sessionRevoked, "AccountSuspended");
    return identityFailure("AccountSuspended");
  }
  if (session.passwordVersion !== credential.passwordVersion) {
    await revokeRejectedSession(
      context,
      session,
      "PasswordChanged",
      at,
      SECURITY_AUDIT_EVENT_TYPES.sessionRejectedCredentialVersion,
      "StalePasswordVersion",
    );
    return identityFailure("SessionStalePasswordVersion");
  }
  if (session.authorizationVersion !== membership.authorizationVersion) {
    await revokeRejectedSession(
      context,
      session,
      "AuthorizationChanged",
      at,
      SECURITY_AUDIT_EVENT_TYPES.sessionRejectedAuthorizationVersion,
      "StaleAuthorizationVersion",
    );
    return identityFailure("SessionStaleAuthorizationVersion");
  }

  const classMatchesState = session.sessionClass === "Restricted"
    ? credential.lifecycle === "Temporary" && (account.status === "PendingActivation" || account.status === "Active")
    : credential.lifecycle === "Permanent" && account.status === "Active";
  if (!classMatchesState) {
    await revokeRejectedSession(context, session, "AdministrativeRevocation", at, SECURITY_AUDIT_EVENT_TYPES.sessionRevoked, "SessionClassMismatch");
    return identityFailure("SessionRevoked");
  }
  if (requiredClass === "Full" && session.sessionClass === "Restricted") {
    return identityFailure("ForbiddenForRestrictedSession");
  }

  if (session.refreshActivity(at)) await context.sessionRepository.save(session);
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      session,
      account,
      credential,
      membership,
      profile,
      workspace,
      context: trustedContext(membership),
    }),
  });
};
