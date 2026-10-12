import { createHmac, timingSafeEqual } from "node:crypto";
import { validatePublicShareLookupDigest } from "../../domain/public-share-values";
import type {
  PublicShareCryptoResult, PublicShareLookupDigestPort, PublicShareLookupDigestValue,
} from "../../ports/public-share-crypto.port";
import { canonicalPublicShareToken } from "./public-share-encoding";
import { PublicShareKeyRing } from "./public-share-key-ring";

const LOOKUP_PREFIX = Buffer.from("qsc:catalog:public-sharing:lookup:v1\0", "utf8");

export class HmacPublicShareLookupDigest implements PublicShareLookupDigestPort {
  readonly #ring: PublicShareKeyRing;
  readonly #compare: typeof timingSafeEqual;
  constructor(ring: PublicShareKeyRing, compare: typeof timingSafeEqual = timingSafeEqual) {
    if (ring.purpose !== "lookup") throw new Error("PublicShareLookupConfigurationInvalid");
    this.#ring = ring;
    this.#compare = compare;
  }
  #create(token: string, version: number): PublicShareLookupDigestValue {
    return Object.freeze({ keyVersion: version,
      value: createHmac("sha256", this.#ring.key(version)!).update(LOOKUP_PREFIX)
        .update(token, "ascii").digest("hex") });
  }
  create(token: string): PublicShareCryptoResult<PublicShareLookupDigestValue> {
    try { token = canonicalPublicShareToken(token); }
    catch { return { ok: false, error: "IntegrityFailure" }; }
    try { return { ok: true, value: this.#create(token, this.#ring.activeVersion) }; }
    catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
  candidates(token: string): PublicShareCryptoResult<readonly PublicShareLookupDigestValue[]> {
    try { token = canonicalPublicShareToken(token); }
    catch { return { ok: false, error: "IntegrityFailure" }; }
    try { return { ok: true, value: Object.freeze(this.#ring.versions().map((version) => this.#create(token, version))) }; }
    catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
  verify(token: string, digest: PublicShareLookupDigestValue): PublicShareCryptoResult<boolean> {
    try { token = canonicalPublicShareToken(token); digest = validatePublicShareLookupDigest(digest); }
    catch { return { ok: false, error: "IntegrityFailure" }; }
    try {
      if (!this.#ring.key(digest.keyVersion)) return { ok: false, error: "KeyUnavailable" };
      const actual = Buffer.from(this.#create(token, digest.keyVersion).value, "hex");
      const expected = Buffer.from(digest.value, "hex");
      return { ok: true, value: this.#compare(actual, expected) };
    } catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
}
