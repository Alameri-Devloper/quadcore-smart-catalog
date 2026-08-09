import { argon2id, hash, needsRehash, verify, type HashOptions } from "argon2";
import type { PasswordHasher } from "../../application/ports";
import { PasswordHash } from "../../domain/password";

export const ARGON2ID_PARAMETERS = Object.freeze({
  type: argon2id,
  version: 0x13,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
} satisfies HashOptions);

export class Argon2idPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<PasswordHash> {
    return PasswordHash.rehydrate(await hash(password, ARGON2ID_PARAMETERS));
  }

  verify(password: string, storedHash: PasswordHash): Promise<boolean> {
    return verify(storedHash.value, password);
  }

  needsRehash(storedHash: PasswordHash): boolean {
    return needsRehash(storedHash.value, ARGON2ID_PARAMETERS);
  }
}
