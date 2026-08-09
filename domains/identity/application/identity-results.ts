export type IdentityErrorCode =
  | "WorkspaceCodeAlreadyExists"
  | "WorkspaceNotFound"
  | "WorkspaceCodeInvalid"
  | "UsernameAlreadyExists"
  | "UsernameInvalid"
  | "PasswordInvalid"
  | "AccountNotFound"
  | "AccountSuspended"
  | "AccountTransitionInvalid"
  | "ActorIdAlreadyExists"
  | "OwnerRequired"
  | "RecoveryNotAllowed"
  | "RecoveryChallengeNotFound"
  | "RecoveryChallengeExpired"
  | "RecoveryChallengeInvalidated"
  | "RecoveryChallengeConsumed"
  | "RecoveryChallengeAttemptsExceeded"
  | "RecoveryChallengeNotVerified"
  | "RecoveryRateLimited"
  | "RecoveryCodeInvalid"
  | "CredentialUpdateConflict"
  | "InvalidCredentialsOrUnavailableAccount"
  | "LoginTemporarilyUnavailable"
  | "SessionNotFound"
  | "SessionExpired"
  | "SessionRevoked"
  | "SessionStalePasswordVersion"
  | "SessionStaleAuthorizationVersion"
  | "ForbiddenForRestrictedSession"
  | "InvalidCurrentPassword"
  | "SessionCreateConflict"
  | "InfrastructureUnavailable"
  | "BootstrapInputInvalid";

export type IdentityResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IdentityErrorCode };

export const identitySuccess = <T>(value: T): IdentityResult<T> => Object.freeze({ ok: true, value });
export const identityFailure = <T = never>(error: IdentityErrorCode): IdentityResult<T> => Object.freeze({ ok: false, error });
