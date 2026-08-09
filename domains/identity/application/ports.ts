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
