import { randomBytes } from "node:crypto";
import type { PublicShareCryptoResult, PublicShareTokenGeneratorPort } from "../../ports/public-share-crypto.port";
import { canonicalPublicShareToken, encodePublicShareBase64Url } from "./public-share-encoding";

// The RNG seam is Infrastructure-local, never an environment flag or a port parameter.
export class CryptographicPublicShareTokenGenerator implements PublicShareTokenGeneratorPort {
  readonly #random: (size: number) => Uint8Array;
  constructor(random: (size: number) => Uint8Array = randomBytes) { this.#random = random; }
  generate(): PublicShareCryptoResult<string> {
    try {
      const bytes = this.#random(32);
      if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error();
      return { ok: true, value: canonicalPublicShareToken(encodePublicShareBase64Url(bytes)) };
    } catch { return { ok: false, error: "CryptoUnavailable" }; }
  }
}
