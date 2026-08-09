import type { ActorId, WorkspaceId } from "../domain/scoped-identity";

export const SECURITY_AUDIT_EVENT_TYPES = {
  workspaceBootstrapped: "WorkspaceBootstrapped",
  identityAccountCreated: "IdentityAccountCreated",
  identityAccountActivated: "IdentityAccountActivated",
  identityAccountSuspended: "IdentityAccountSuspended",
  identityAccountReactivated: "IdentityAccountReactivated",
  permanentCredentialEstablished: "PermanentPasswordEstablished",
  temporaryCredentialIssued: "TemporaryPasswordIssued",
  ownerCredentialReset: "OwnerPasswordReset",
  emergencyOwnerCredentialReset: "EmergencyOwnerPasswordReset",
  recoveryChallengeCreated: "PasswordRecoveryChallengeCreated",
  recoveryChallengeVerified: "PasswordRecoveryChallengeVerified",
  recoveryChallengeFailed: "PasswordRecoveryChallengeFailed",
  recoveryChallengeInvalidated: "PasswordRecoveryChallengeInvalidated",
  recoveryChallengeConsumed: "PasswordRecoveryChallengeConsumed",
  loginProtectionLocked: "LoginProtectionLocked",
  loginProtectionCleared: "LoginProtectionCleared",
  loginSucceeded: "LoginSucceeded",
  loginFailed: "LoginFailed",
  sessionCreated: "SessionCreated",
  sessionRevoked: "SessionRevoked",
  logoutCompleted: "LogoutCompleted",
  credentialChanged: "PasswordChanged",
  restrictedSessionUpgraded: "RestrictedSessionUpgraded",
  sessionRejectedCredentialVersion: "SessionRejectedPasswordVersion",
  sessionRejectedAuthorizationVersion: "SessionRejectedAuthorizationVersion",
} as const;

export type SecurityAuditEventType =
  (typeof SECURITY_AUDIT_EVENT_TYPES)[keyof typeof SECURITY_AUDIT_EVENT_TYPES];

export interface SecurityAuditRecord {
  readonly workspaceId: WorkspaceId;
  readonly eventType: SecurityAuditEventType;
  readonly actorId: ActorId | null;
  readonly subjectActorId: ActorId | null;
  readonly resultCode: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface SecurityAuditPort {
  append(records: readonly SecurityAuditRecord[]): Promise<void>;
}
