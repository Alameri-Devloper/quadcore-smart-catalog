export interface PublicShareLookupDigestValue {
  readonly keyVersion: number;
  readonly value: string;
}

export interface PublicShareBearerEnvelope {
  readonly formatVersion: 1;
  readonly keyVersion: number;
  readonly iv: string;
  readonly ciphertext: string;
  readonly authTag: string;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Fixed decoded length + zero unused bits uniquely specifies canonical base64url.
const canonicalBinary = (value: unknown, bytes: number): value is string => {
  if (typeof value !== "string" || value.length !== Math.ceil(bytes * 8 / 6)
    || !/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const unusedBits = (6 - (bytes * 8) % 6) % 6;
  return (ALPHABET.indexOf(value[value.length - 1]) & ((1 << unusedBits) - 1)) === 0;
};

export const validatePublicShareToken = (value: unknown): string => {
  if (!canonicalBinary(value, 32)) throw new Error("InvalidPublicShareToken");
  return value;
};

export const validatePublicSharePositiveVersion = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("InvalidPublicShareVersion");
  return value;
};

export const validatePublicShareLookupDigest = (value: PublicShareLookupDigestValue): PublicShareLookupDigestValue => {
  if (!value || typeof value.value !== "string" || !/^[a-f0-9]{64}$/.test(value.value)) {
    throw new Error("InvalidPublicShareDigest");
  }
  return Object.freeze({ keyVersion: validatePublicSharePositiveVersion(value.keyVersion), value: value.value });
};

export const validatePublicShareBearerEnvelope = (value: PublicShareBearerEnvelope): PublicShareBearerEnvelope => {
  if (!value || value.formatVersion !== 1 || !canonicalBinary(value.iv, 12)
    || !canonicalBinary(value.ciphertext, 43) || !canonicalBinary(value.authTag, 16)) {
    throw new Error("InvalidPublicShareEnvelope");
  }
  return Object.freeze({ formatVersion: 1, keyVersion: validatePublicSharePositiveVersion(value.keyVersion),
    iv: value.iv, ciphertext: value.ciphertext, authTag: value.authTag });
};
