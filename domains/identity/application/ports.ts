import type { PasswordHash } from "../domain/password";
import type { RecoveryCodeDigestValue } from "../domain/password-recovery-challenge";

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

export interface SessionRevocationPort {
  revokeForActor(workspaceId: string, actorId: string): Promise<void>;
}
