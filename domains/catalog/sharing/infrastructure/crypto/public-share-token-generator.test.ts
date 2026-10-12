import assert from "node:assert/strict";
import { it } from "node:test";
import { CryptographicPublicShareTokenGenerator } from "./public-share-token-generator";
import { TOKEN, success } from "./public-share-crypto.test-fixtures";

it("requests exactly 32 RNG bytes and produces the expected canonical bearer", () => {
  const requested: number[] = [];
  const generator = new CryptographicPublicShareTokenGenerator((size) => {
    requested.push(size); return Uint8Array.from({ length: size }, (_, index) => index);
  });
  assert.equal(success(generator.generate()), TOKEN);
  assert.deepEqual(requested, [32]);
  assert.match(TOKEN, /^[A-Za-z0-9_-]{43}$/);
});
it("uses the cryptographic default; differing samples are a smoke check, not entropy proof", () => {
  const generator = new CryptographicPublicShareTokenGenerator();
  const samples = Array.from({ length: 16 }, () => success(generator.generate()));
  for (const token of samples) assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.equal(new Set(samples).size, samples.length);
});
it("sanitizes random-source exceptions and invalid random output", () => {
  assert.deepEqual(new CryptographicPublicShareTokenGenerator(() => { throw new Error("SYNTHETIC_PRIVATE_RNG"); }).generate(),
    { ok: false, error: "CryptoUnavailable" });
  for (const length of [0,31,33]) assert.deepEqual(new CryptographicPublicShareTokenGenerator(() => Buffer.alloc(length)).generate(),
    { ok: false, error: "CryptoUnavailable" });
});
