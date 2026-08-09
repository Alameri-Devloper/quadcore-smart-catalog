import { HmacSha256SessionTokenDigest, type SessionDigestKey } from "./session-token-crypto";

export type SessionDigestEnvironment = Readonly<{
  QSC_SESSION_HMAC_ACTIVE_VERSION?: string;
  QSC_SESSION_HMAC_KEYS_JSON?: string;
}>;

const canonicalBase64 = /^[A-Za-z0-9+/]+={0,2}$/;

export const sessionTokenDigestFromEnvironment = (
  environment: SessionDigestEnvironment = process.env as SessionDigestEnvironment,
): HmacSha256SessionTokenDigest => {
  const activeVersion = Number(environment.QSC_SESSION_HMAC_ACTIVE_VERSION);
  let parsed: unknown;
  try { parsed = JSON.parse(environment.QSC_SESSION_HMAC_KEYS_JSON ?? ""); }
  catch { throw new Error("SessionDigestConfigurationInvalid"); }
  if (!Number.isSafeInteger(activeVersion) || activeVersion < 1 || typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("SessionDigestConfigurationInvalid");
  }
  const keys: SessionDigestKey[] = [];
  for (const [versionText, encodedValue] of Object.entries(parsed)) {
    const version = Number(versionText);
    if (!Number.isSafeInteger(version) || version < 1 || typeof encodedValue !== "string" || !canonicalBase64.test(encodedValue)) {
      throw new Error("SessionDigestConfigurationInvalid");
    }
    const keyBytes = Buffer.from(encodedValue, "base64");
    if (keyBytes.toString("base64") !== encodedValue) throw new Error("SessionDigestConfigurationInvalid");
    keys.push({ version, keyBytes });
  }
  return new HmacSha256SessionTokenDigest(keys, activeVersion);
};
