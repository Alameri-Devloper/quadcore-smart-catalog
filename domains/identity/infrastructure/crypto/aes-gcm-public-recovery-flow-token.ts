import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import type { IdentityClock, PublicRecoveryFlowToken, PublicRecoveryFlowTokenPort } from "../../application/ports";
import type { RecoveryDigestSecret } from "./hmac-recovery-code-digest";
import { readEnvironmentRecoveryDigestConfiguration } from "./environment-recovery-code-digest";

const FORMAT = "pr1";
const PURPOSE = "qsc:identity:public-recovery-flow:v1";
const MAX_REFERENCE_LENGTH = 512;
const DEFAULT_MAX_AGE_MS = 20 * 60 * 1_000;

const encode = (value: Buffer): string => value.toString("base64url");
const decode = (value: string): Buffer | null => {
  try {
    const decoded = Buffer.from(value, "base64url");
    return encode(decoded) === value ? decoded : null;
  } catch {
    return null;
  }
};

export class AesGcmPublicRecoveryFlowToken implements PublicRecoveryFlowTokenPort {
  private readonly keys: ReadonlyMap<number, Buffer>;

  constructor(
    secrets: readonly RecoveryDigestSecret[],
    private readonly activeVersion: number,
    private readonly clock: IdentityClock,
    private readonly maxAgeMs = DEFAULT_MAX_AGE_MS,
  ) {
    if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 60_000 || maxAgeMs > 24 * 60 * 60 * 1_000) {
      throw new Error("PublicRecoveryFlowTokenConfigurationInvalid");
    }
    this.keys = new Map(secrets.map(({ version, secret }) => [
      version,
      createHmac("sha256", secret).update(PURPOSE, "utf8").digest(),
    ]));
    if (!this.keys.has(activeVersion)) throw new Error("PublicRecoveryFlowTokenActiveKeyMissing");
  }

  issue(flow: PublicRecoveryFlowToken): string {
    if (!/^[A-Za-z0-9-]{20,200}$/.test(flow.challengeId) || !Number.isFinite(flow.issuedAt.getTime())) {
      throw new Error("PublicRecoveryFlowTokenInvalid");
    }
    const iv = randomBytes(12);
    const aad = Buffer.from(`${FORMAT}.${this.activeVersion}`, "utf8");
    const cipher = createCipheriv("aes-256-gcm", this.keys.get(this.activeVersion)!, iv);
    cipher.setAAD(aad);
    const plaintext = Buffer.from(JSON.stringify({
      k: flow.kind === "Real" ? "r" : "d",
      c: flow.challengeId,
      i: flow.issuedAt.getTime(),
    }), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return [FORMAT, this.activeVersion, encode(iv), encode(ciphertext), encode(cipher.getAuthTag())].join(".");
  }

  read(reference: string): PublicRecoveryFlowToken | null {
    if (reference.length > MAX_REFERENCE_LENGTH) return null;
    const [format, versionText, ivText, ciphertextText, tagText, extra] = reference.split(".");
    const version = Number(versionText);
    const key = this.keys.get(version);
    const iv = ivText ? decode(ivText) : null;
    const ciphertext = ciphertextText ? decode(ciphertextText) : null;
    const tag = tagText ? decode(tagText) : null;
    if (extra !== undefined || format !== FORMAT || !key || iv?.byteLength !== 12 || !ciphertext || tag?.byteLength !== 16) return null;
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(Buffer.from(`${FORMAT}.${version}`, "utf8"));
      decipher.setAuthTag(tag);
      const parsed = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
      const value = parsed as Readonly<Record<string, unknown>>;
      if (
        Object.keys(value).sort().join(",") !== "c,i,k"
        || (value.k !== "r" && value.k !== "d")
        || typeof value.c !== "string"
        || !/^[A-Za-z0-9-]{20,200}$/.test(value.c)
        || typeof value.i !== "number"
        || !Number.isSafeInteger(value.i)
      ) return null;
      const ageMs = this.clock.now().getTime() - value.i;
      if (ageMs < -60_000 || ageMs > this.maxAgeMs) return null;
      return Object.freeze({
        kind: value.k === "r" ? "Real" : "Decoy",
        challengeId: value.c,
        issuedAt: new Date(value.i),
      });
    } catch {
      return null;
    }
  }
}

export const createEnvironmentPublicRecoveryFlowToken = (
  clock: IdentityClock,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AesGcmPublicRecoveryFlowToken => {
  const configuration = readEnvironmentRecoveryDigestConfiguration(environment);
  return new AesGcmPublicRecoveryFlowToken(configuration.secrets, configuration.activeVersion, clock);
};
