import { createHmac, randomBytes } from "node:crypto";
import type { SessionTokenDigest, SessionTokenGenerator } from "../../application/ports";
import type { SessionDigestValue } from "../../domain/session";

export interface SessionDigestKey {
  readonly version: number;
  readonly keyBytes: Buffer;
}

const SESSION_VALUE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export class CryptographicSessionTokenGenerator implements SessionTokenGenerator {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }
}

export class HmacSha256SessionTokenDigest implements SessionTokenDigest {
  private readonly keys: ReadonlyMap<number, Buffer>;

  constructor(keys: readonly SessionDigestKey[], private readonly activeVersion: number) {
    if (
      keys.length === 0
      || new Set(keys.map((entry) => entry.version)).size !== keys.length
      || keys.some((entry) => !Number.isSafeInteger(entry.version) || entry.version < 1 || entry.keyBytes.byteLength < 32)
    ) {
      throw new Error("SessionDigestConfigurationInvalid");
    }
    this.keys = new Map(keys.map((entry) => [entry.version, Buffer.from(entry.keyBytes)]));
    if (!this.keys.has(activeVersion)) throw new Error("SessionDigestActiveKeyMissing");
  }

  create(value: string): SessionDigestValue {
    if (!SESSION_VALUE_PATTERN.test(value)) throw new Error("SessionValueInvalid");
    return this.createWithVersion(value, this.activeVersion);
  }

  candidates(value: string): readonly SessionDigestValue[] {
    if (!SESSION_VALUE_PATTERN.test(value)) return Object.freeze([]);
    return Object.freeze([...this.keys.keys()].map((version) => this.createWithVersion(value, version)));
  }

  private createWithVersion(value: string, version: number): SessionDigestValue {
    return Object.freeze({
      value: createHmac("sha256", this.keys.get(version)!).update(value, "utf8").digest("hex"),
      keyVersion: version,
    });
  }
}
