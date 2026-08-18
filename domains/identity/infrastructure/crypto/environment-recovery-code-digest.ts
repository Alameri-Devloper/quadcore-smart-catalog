import { HmacSha256RecoveryCodeDigest, type RecoveryDigestSecret } from "./hmac-recovery-code-digest";

export interface EnvironmentRecoveryDigestConfiguration {
  readonly activeVersion: number;
  readonly secrets: readonly RecoveryDigestSecret[];
}

export const readEnvironmentRecoveryDigestConfiguration = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): EnvironmentRecoveryDigestConfiguration => {
  const activeVersion = Number(environment.QSC_RECOVERY_HMAC_ACTIVE_VERSION);
  if (!Number.isSafeInteger(activeVersion) || activeVersion < 1) {
    throw new Error("RecoveryDigestEnvironmentInvalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(environment.QSC_RECOVERY_HMAC_KEYS_JSON ?? "");
  } catch {
    throw new Error("RecoveryDigestEnvironmentInvalid");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("RecoveryDigestEnvironmentInvalid");
  }
  const secrets: RecoveryDigestSecret[] = [];
  for (const [versionText, encodedSecret] of Object.entries(parsed)) {
    const version = Number(versionText);
    if (!Number.isSafeInteger(version) || version < 1 || typeof encodedSecret !== "string") {
      throw new Error("RecoveryDigestEnvironmentInvalid");
    }
    const secret = Buffer.from(encodedSecret, "base64");
    if (secret.toString("base64") !== encodedSecret || secret.byteLength < 32) {
      throw new Error("RecoveryDigestEnvironmentInvalid");
    }
    secrets.push({ version, secret });
  }
  return Object.freeze({ activeVersion, secrets });
};

export const createEnvironmentRecoveryCodeDigest = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): HmacSha256RecoveryCodeDigest => {
  const configuration = readEnvironmentRecoveryDigestConfiguration(environment);
  return new HmacSha256RecoveryCodeDigest(configuration.secrets, configuration.activeVersion);
};
