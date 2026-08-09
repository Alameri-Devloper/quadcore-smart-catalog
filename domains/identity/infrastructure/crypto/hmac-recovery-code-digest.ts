import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { RecoveryCodeDigest, RecoveryCodeGenerator } from "../../application/ports";
import { RECOVERY_CODE_DIGITS, type RecoveryCodeDigestValue } from "../../domain/password-recovery-challenge";

export interface RecoveryDigestSecret {
  readonly version: number;
  readonly secret: Buffer;
}

const assertCode = (code: string): void => {
  if (!new RegExp(`^[0-9]{${RECOVERY_CODE_DIGITS}}$`).test(code)) {
    throw new Error("RecoveryCodeInvalid");
  }
};

export class HmacSha256RecoveryCodeDigest implements RecoveryCodeDigest {
  private readonly secrets: ReadonlyMap<number, Buffer>;

  constructor(secrets: readonly RecoveryDigestSecret[], private readonly activeVersion: number) {
    if (
      secrets.length === 0
      || new Set(secrets.map((entry) => entry.version)).size !== secrets.length
      || secrets.some((entry) => !Number.isSafeInteger(entry.version) || entry.version < 1 || entry.secret.byteLength < 32)
    ) {
      throw new Error("RecoveryDigestConfigurationInvalid");
    }
    this.secrets = new Map(secrets.map((entry) => [entry.version, Buffer.from(entry.secret)]));
    if (!this.secrets.has(activeVersion)) throw new Error("RecoveryDigestActiveKeyMissing");
  }

  async create(code: string): Promise<RecoveryCodeDigestValue> {
    assertCode(code);
    const secret = this.secrets.get(this.activeVersion)!;
    return Object.freeze({
      value: createHmac("sha256", secret).update(code, "utf8").digest("hex"),
      keyVersion: this.activeVersion,
    });
  }

  async verify(code: string, digest: RecoveryCodeDigestValue): Promise<boolean> {
    if (!new RegExp(`^[0-9]{${RECOVERY_CODE_DIGITS}}$`).test(code)) return false;
    const secret = this.secrets.get(digest.keyVersion);
    if (!secret || !/^[a-f0-9]{64}$/.test(digest.value)) return false;
    const expected = createHmac("sha256", secret).update(code, "utf8").digest();
    const actual = Buffer.from(digest.value, "hex");
    return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
  }
}

export class CryptographicRecoveryCodeGenerator implements RecoveryCodeGenerator {
  generate(): string {
    return randomInt(0, 10 ** RECOVERY_CODE_DIGITS).toString().padStart(RECOVERY_CODE_DIGITS, "0");
  }
}
