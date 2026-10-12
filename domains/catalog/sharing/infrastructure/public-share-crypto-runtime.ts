import { validatePublicSharePositiveVersion } from "../domain/public-share-values";
import type { PublicShareBearerProtectionPort, PublicShareLookupDigestPort, PublicShareTokenGeneratorPort } from "../ports/public-share-crypto.port";
import { AesGcmPublicShareBearerProtection } from "./crypto/aes-gcm-public-share-bearer-protection";
import { readPublicShareCryptoConfiguration, type PublicShareConfigurationReadiness,
  type PublicShareCryptoEnvironment } from "./crypto/environment-public-share-crypto";
import { HmacPublicShareLookupDigest } from "./crypto/hmac-public-share-lookup-digest";
import { CryptographicPublicShareTokenGenerator } from "./crypto/public-share-token-generator";

export interface PublicShareVersionSets {
  readonly lookupVersions?: readonly number[];
  readonly encryptionVersions?: readonly number[];
}
export interface PublicShareCoverageEvaluation {
  readonly lookup: { readonly state: "UNCHECKED" | "COVERED" | "MISSING"; readonly missingVersions: readonly number[] };
  readonly encryption: { readonly state: "UNCHECKED" | "COVERED" | "MISSING"; readonly missingVersions: readonly number[] };
  readonly durableCoverage: "UNCHECKED";
}

const versionSet = (values: readonly number[]): readonly number[] => {
  try {
    if (!Array.isArray(values)) throw new Error();
    // Reject sparse arrays as well as malformed numbers, without leaking input.
    const validated: number[] = [];
    for (const version of values) validated.push(validatePublicSharePositiveVersion(version));
    return Object.freeze([...new Set(validated)].sort((a, b) => a - b));
  } catch { throw new Error("PublicShareCoverageInputInvalid"); }
};

export const evaluatePublicShareKeyCoverage = (
  configured: Required<PublicShareVersionSets>, referenced: PublicShareVersionSets = {},
): PublicShareCoverageEvaluation => {
  if (!configured || typeof configured !== "object" || !referenced || typeof referenced !== "object"
    || Array.isArray(configured) || Array.isArray(referenced)) throw new Error("PublicShareCoverageInputInvalid");
  const evaluate = (available: readonly number[], required?: readonly number[]) => {
    const versions = versionSet(available);
    if (versions.length > 8) throw new Error("PublicShareCoverageInputInvalid");
    if (required === undefined) return Object.freeze({ state: "UNCHECKED" as const, missingVersions: Object.freeze([] as number[]) });
    const missingVersions = Object.freeze(versionSet(required).filter((version) => !versions.includes(version)));
    return Object.freeze({ state: missingVersions.length ? "MISSING" as const : "COVERED" as const, missingVersions });
  };
  return Object.freeze({ lookup: evaluate(configured.lookupVersions, referenced.lookupVersions),
    encryption: evaluate(configured.encryptionVersions, referenced.encryptionVersions), durableCoverage: "UNCHECKED" });
};

export interface PublicShareCryptoRuntime {
  readonly tokenGenerator: PublicShareTokenGeneratorPort;
  readonly lookupDigest: PublicShareLookupDigestPort;
  readonly bearerProtection: PublicShareBearerProtectionPort;
  readonly publicOrigin: string | null;
  readonly readiness: PublicShareConfigurationReadiness;
  evaluateCoverage(referenced?: PublicShareVersionSets): PublicShareCoverageEvaluation;
}

export const createPublicShareCryptoRuntime = (
  environment: PublicShareCryptoEnvironment = process.env,
): PublicShareCryptoRuntime => {
  const configuration = readPublicShareCryptoConfiguration(environment);
  const unavailable = () => ({ ok: false as const, error: "CryptoUnavailable" as const });
  const lookupDigest: PublicShareLookupDigestPort = configuration.lookup
    ? new HmacPublicShareLookupDigest(configuration.lookup)
    : Object.freeze({ create: unavailable, candidates: unavailable, verify: unavailable });
  const bearerProtection: PublicShareBearerProtectionPort = configuration.encryption
    ? new AesGcmPublicShareBearerProtection(configuration.encryption, lookupDigest)
    : Object.freeze({ encrypt: unavailable, decrypt: unavailable });
  const versions = { lookupVersions: configuration.lookup?.versions() ?? [],
    encryptionVersions: configuration.encryption?.versions() ?? [] };
  return Object.freeze({ tokenGenerator: new CryptographicPublicShareTokenGenerator(), lookupDigest, bearerProtection,
    publicOrigin: configuration.publicOrigin, readiness: configuration.readiness,
    evaluateCoverage: (referenced?: PublicShareVersionSets) => evaluatePublicShareKeyCoverage(versions, referenced) });
};
