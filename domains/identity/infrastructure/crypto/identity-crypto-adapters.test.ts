import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PasswordHash } from "../../domain/password";
import { Argon2idPasswordHasher } from "./argon2-password-hasher";
import { createEnvironmentRecoveryCodeDigest } from "./environment-recovery-code-digest";
import { CryptographicRecoveryCodeGenerator, HmacSha256RecoveryCodeDigest } from "./hmac-recovery-code-digest";

describe("Argon2id password adapter", () => {
  it("creates self-describing Argon2id hashes and verifies exact passwords", async () => {
    const adapter = new Argon2idPasswordHasher();
    const password = "  Exact Unicode 🔐 password  ";
    const digest = await adapter.hash(password);
    assert.match(digest.value, /^\$argon2id\$v=19\$m=65536,p=1,t=3\$/);
    assert.equal(digest.value.includes(password), false);
    assert.equal(await adapter.verify(password, digest), true);
    assert.equal(await adapter.verify(password.trim(), digest), false);
    assert.equal(adapter.needsRehash(digest), false);
    assert.equal(adapter.needsRehash(PasswordHash.rehydrate(digest.value.replace("m=65536", "m=32768"))), true);
  });
});

describe("HMAC-SHA-256 recovery digest adapter", () => {
  it("uses versioned secrets, verifies old keys, and rejects wrong codes", async () => {
    const adapter = new HmacSha256RecoveryCodeDigest([
      { version: 1, secret: Buffer.alloc(32, 1) },
      { version: 2, secret: Buffer.alloc(32, 2) },
    ], 2);
    const digest = await adapter.create("01234567");
    assert.equal(digest.keyVersion, 2);
    assert.match(digest.value, /^[a-f0-9]{64}$/);
    assert.equal(digest.value.includes("01234567"), false);
    assert.equal(await adapter.verify("01234567", digest), true);
    assert.equal(await adapter.verify("01234568", digest), false);

    const oldAdapter = new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(32, 1) }], 1);
    const oldDigest = await oldAdapter.create("87654321");
    assert.equal(await adapter.verify("87654321", oldDigest), true);
  });

  it("rejects weak configuration and malformed codes", async () => {
    assert.throws(() => new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(16) }], 1));
    const adapter = new HmacSha256RecoveryCodeDigest([{ version: 1, secret: Buffer.alloc(32) }], 1);
    await assert.rejects(adapter.create("1234"), /RecoveryCodeInvalid/);
  });

  it("generates exactly eight numeric digits", () => {
    const generator = new CryptographicRecoveryCodeGenerator();
    for (let index = 0; index < 50; index += 1) assert.match(generator.generate(), /^[0-9]{8}$/);
  });

  it("loads versioned HMAC secrets from sanitized server configuration", async () => {
    const secret = Buffer.alloc(32, 4).toString("base64");
    const adapter = createEnvironmentRecoveryCodeDigest({
      QSC_RECOVERY_HMAC_ACTIVE_VERSION: "7",
      QSC_RECOVERY_HMAC_KEYS_JSON: JSON.stringify({ 7: secret }),
    });
    const digest = await adapter.create("12345678");
    assert.equal(digest.keyVersion, 7);
    assert.equal(await adapter.verify("12345678", digest), true);
    assert.throws(() => createEnvironmentRecoveryCodeDigest({
      QSC_RECOVERY_HMAC_ACTIVE_VERSION: "7",
      QSC_RECOVERY_HMAC_KEYS_JSON: JSON.stringify({ 7: "weak" }),
    }), /RecoveryDigestEnvironmentInvalid/);
  });
});
