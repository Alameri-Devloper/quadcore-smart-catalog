import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isNativeError } from "node:util/types";
import { validatePublicShareBearerEnvelope, validatePublicShareLookupDigest } from "../../domain/public-share-values";
import type {
  PublicShareBearerContext, PublicShareBearerEnvelope, PublicShareBearerProtectionPort,
  PublicShareCryptoResult, PublicShareLookupDigestPort, PublicShareLookupDigestValue,
} from "../../ports/public-share-crypto.port";
import { canonicalPublicShareToken, decodePublicShareBase64Url, encodePublicShareBase64Url,
  publicShareRetrievalAad } from "./public-share-encoding";
import { PublicShareKeyRing } from "./public-share-key-ring";

const ENVELOPE_KEYS = ["formatVersion", "keyVersion", "iv", "ciphertext", "authTag"];
const strictEnvelope = (value: PublicShareBearerEnvelope): PublicShareBearerEnvelope => {
  if (!value || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    || Reflect.ownKeys(value).length !== ENVELOPE_KEYS.length
    || !ENVELOPE_KEYS.every((key) => Object.hasOwn(value, key))) throw new Error("PublicShareEnvelopeInvalid");
  const envelope = validatePublicShareBearerEnvelope(value);
  decodePublicShareBase64Url(envelope.iv, 12);
  decodePublicShareBase64Url(envelope.ciphertext, 43);
  decodePublicShareBase64Url(envelope.authTag, 16);
  return envelope;
};

export class AesGcmPublicShareBearerProtection implements PublicShareBearerProtectionPort {
  readonly #ring: PublicShareKeyRing;
  readonly #digest: PublicShareLookupDigestPort;
  readonly #random: (size: number) => Uint8Array;
  constructor(ring: PublicShareKeyRing, digest: PublicShareLookupDigestPort,
    random: (size: number) => Uint8Array = randomBytes) {
    if (ring.purpose !== "encryption") throw new Error("PublicShareEncryptionConfigurationInvalid");
    this.#ring = ring; this.#digest = digest; this.#random = random;
  }
  encrypt(token: string, context: PublicShareBearerContext): PublicShareCryptoResult<PublicShareBearerEnvelope> {
    let aad: Buffer;
    try { token = canonicalPublicShareToken(token); aad = publicShareRetrievalAad(this.#ring.activeVersion, context); }
    catch { return { ok: false, error: "IntegrityFailure" }; }
    try {
      const random = this.#random(12);
      if (!(random instanceof Uint8Array) || random.length !== 12) throw new Error();
      const iv = Buffer.from(random);
      const cipher = createCipheriv("aes-256-gcm", this.#ring.key(this.#ring.activeVersion)!, iv, { authTagLength: 16 });
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([cipher.update(token, "ascii"), cipher.final()]);
      return { ok: true, value: Object.freeze({ formatVersion: 1, keyVersion: this.#ring.activeVersion,
        iv: encodePublicShareBase64Url(iv), ciphertext: encodePublicShareBase64Url(ciphertext),
        authTag: encodePublicShareBase64Url(cipher.getAuthTag()) }) };
    } catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
  decrypt(envelope: PublicShareBearerEnvelope, context: PublicShareBearerContext,
    digest: PublicShareLookupDigestValue): PublicShareCryptoResult<string> {
    let aad: Buffer;
    try { envelope = strictEnvelope(envelope); digest = validatePublicShareLookupDigest(digest);
      aad = publicShareRetrievalAad(envelope.keyVersion, context); }
    catch { return { ok: false, error: "IntegrityFailure" }; }
    try {
      const key = this.#ring.key(envelope.keyVersion);
      if (!key) return { ok: false, error: "KeyUnavailable" };
      const decipher = createDecipheriv("aes-256-gcm", key, decodePublicShareBase64Url(envelope.iv, 12), { authTagLength: 16 });
      decipher.setAAD(aad);
      decipher.setAuthTag(decodePublicShareBase64Url(envelope.authTag, 16));
      const pending = decipher.update(decodePublicShareBase64Url(envelope.ciphertext, 43));
      let authenticated: Buffer;
      try { authenticated = decipher.final(); }
      catch (error) {
        // Node 24 has no stable auth-specific code. Only this validated final()
        // boundary treats an uncoded Error as integrity failure; never inspect text.
        return { ok: false, error: isNativeError(error) && !("code" in error)
          ? "IntegrityFailure" : "CryptoUnavailable" };
      }
      // Allocation/concatenation faults belong to the outer operational boundary.
      const plaintext = Buffer.concat([pending, authenticated]);
      let token: string;
      try { token = canonicalPublicShareToken(plaintext.toString("utf8"));
        if (!Buffer.from(token, "ascii").equals(plaintext)) throw new Error(); }
      catch { return { ok: false, error: "IntegrityFailure" }; }
      const verified = this.#digest.verify(token, digest);
      if (!verified.ok) return verified;
      return verified.value ? { ok: true, value: token } : { ok: false, error: "IntegrityFailure" };
    } catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
}
