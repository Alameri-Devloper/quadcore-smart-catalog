import type { PasswordHash } from "../domain/password";
import type { RecoveryCodeDigestValue } from "../domain/password-recovery-challenge";
import type { SessionDigestValue, SessionRevocationReason } from "../domain/session";

export interface PasswordHasher {
  hash(password: string): Promise<PasswordHash>;
  verify(password: string, hash: PasswordHash): Promise<boolean>;
  needsRehash(hash: PasswordHash): boolean;
}

export interface RecoveryCodeDigest {
  create(code: string): Promise<RecoveryCodeDigestValue>;
  verify(code: string, digest: RecoveryCodeDigestValue): Promise<boolean>;
}

export interface RecoveryCodeGenerator {
  generate(): string;
}

export interface RecoveryRequestCostPort {
  perform(): Promise<void>;
}

export type PublicRecoveryOperation = "Request" | "Resend" | "Verify" | "Reset";

export interface PublicRecoveryTimingPort {
  waitForMinimum(operation: PublicRecoveryOperation, startedAt: Date): Promise<void>;
}

export interface PublicRecoveryFlowToken {
  readonly kind: "Real" | "Decoy";
  readonly challengeId: string;
  readonly issuedAt: Date;
}

export interface PublicRecoveryFlowTokenPort {
  issue(flow: PublicRecoveryFlowToken): string;
  read(reference: string): PublicRecoveryFlowToken | null;
}

export type RecoveryDeliveryFailureCode =
  | "ConfigurationMissing"
  | "ProviderUnavailable"
  | "ProviderRejected"
  | "TemporaryFailure"
  | "Timeout"
  | "PermanentFailure";

export type RecoveryDeliveryResult =
  | { readonly ok: true; readonly providerReference?: string }
  | { readonly ok: false; readonly error: RecoveryDeliveryFailureCode };

export interface RecoveryDeliveryPort {
  readonly adapterName: string;
  readonly available: boolean;
  deliverCode(input: {
    readonly workspaceId: string;
    readonly workspaceDisplayName: string;
    readonly recoveryReference: string;
    readonly idempotencyKey: string;
    readonly channel: "PrimaryRecoveryContact";
    readonly destination: string;
    readonly locale: "ar" | "en";
    readonly code: string;
    readonly expiresAt: Date;
  }): Promise<RecoveryDeliveryResult>;
}

export interface IdentityClock {
  now(): Date;
}

export interface IdentityIdentifierGenerator {
  workspaceId(): string;
  actorId(): string;
  challengeId(): string;
}

export interface SessionIdentifierGenerator {
  sessionId(): string;
}

export interface SessionTokenGenerator {
  generate(): string;
}

export interface SessionTokenDigest {
  create(value: string): SessionDigestValue;
  candidates(value: string): readonly SessionDigestValue[];
}

export interface SessionRevocationPort {
  revokeForActor(workspaceId: string, actorId: string, reason: SessionRevocationReason): Promise<number>;
  revokeSession(workspaceId: string, sessionId: string, reason: SessionRevocationReason): Promise<boolean>;
  revokeOtherSessions(
    workspaceId: string,
    actorId: string,
    currentSessionId: string,
    reason: SessionRevocationReason,
  ): Promise<number>;
}
