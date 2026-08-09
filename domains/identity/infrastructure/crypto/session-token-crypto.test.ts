import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionTokenDigestFromEnvironment } from "./environment-session-token-digest";
import { CryptographicSessionTokenGenerator, HmacSha256SessionTokenDigest } from "./session-token-crypto";

describe("Session opaque-value cryptography", () => {
  it("generates high-entropy URL-safe values and stores only a purpose-separated digest", () => {
    const generator = new CryptographicSessionTokenGenerator();
    const first = generator.generate();
    const second = generator.generate();
    assert.match(first, /^[A-Za-z0-9_-]{43}$/);
    assert.match(second, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(first, second);
    const digest = new HmacSha256SessionTokenDigest([{ version: 3, keyBytes: Buffer.alloc(32, 31) }], 3);
    const persisted = digest.create(first);
    assert.equal(persisted.keyVersion, 3);
    assert.match(persisted.value, /^[a-f0-9]{64}$/);
    assert.equal(persisted.value.includes(first), false);
  });

  it("supports versioned verification candidates without reusing recovery configuration", () => {
    const value = new CryptographicSessionTokenGenerator().generate();
    const digest = sessionTokenDigestFromEnvironment({
      QSC_SESSION_HMAC_ACTIVE_VERSION: "2",
      QSC_SESSION_HMAC_KEYS_JSON: JSON.stringify({
        1: Buffer.alloc(32, 11).toString("base64"),
        2: Buffer.alloc(32, 12).toString("base64"),
      }),
    });
    assert.equal(digest.create(value).keyVersion, 2);
    assert.deepEqual(digest.candidates(value).map((candidate) => candidate.keyVersion), [1, 2]);
    assert.deepEqual(digest.candidates("malformed"), []);
    assert.throws(() => sessionTokenDigestFromEnvironment({}), /SessionDigestConfigurationInvalid/);
  });
});
