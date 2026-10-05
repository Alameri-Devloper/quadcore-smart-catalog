import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validatePublicShareToken, validatePublicShareLookupDigest, validatePublicShareBearerEnvelope,
  validatePublicSharePositiveVersion,
} from "./public-share-values";

describe("Public Share canonical values", () => {
  it("accepts all canonical token trailing sextets and rejects every noncanonical one", () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    for (let index = 0; index < alphabet.length; index++) {
      const token = "A".repeat(42) + alphabet[index];
      if (index % 4 === 0) {
        assert.equal(validatePublicShareToken(token), token);
        const bytes = Buffer.from(token, "base64url");
        assert.equal(bytes.length, 32);
        assert.equal(bytes.toString("base64url"), token);
      } else assert.throws(() => validatePublicShareToken(token), { message: "InvalidPublicShareToken" });
    }
  });
  it("rejects transport aliases and invalid token shapes without reflecting input", () => {
    for (const invalid of [null, undefined, 42, {}, "A".repeat(42), "A".repeat(44),
      "A".repeat(43) + "=", " " + "A".repeat(43), "A".repeat(43) + "\n", "+".repeat(43),
      "/".repeat(43), "A".repeat(42) + "é", "A".repeat(43) + "/media"]) {
      assert.throws(() => validatePublicShareToken(invalid), { message: "InvalidPublicShareToken" });
    }
  });
  it("accepts only positive safe versions", () => {
    for (const value of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => validatePublicSharePositiveVersion(value), { message: "InvalidPublicShareVersion" });
    }
    assert.equal(validatePublicSharePositiveVersion(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  });
  it("validates lowercase digests and returns immutable copies", () => {
    const input = { keyVersion: 1, value: "a".repeat(64) };
    const output = validatePublicShareLookupDigest(input);
    input.value = "b".repeat(64);
    assert.equal(output.value, "a".repeat(64));
    assert.equal(Object.isFrozen(output), true);
    for (const value of ["A".repeat(64), "g".repeat(64), "a".repeat(63), "a".repeat(65), "a".repeat(64) + "\n"]) {
      assert.throws(() => validatePublicShareLookupDigest({ keyVersion: 1, value }), /InvalidPublicShareDigest/);
    }
  });
  it("validates full envelope lengths, format and canonical unused bits", () => {
    const envelope = { formatVersion: 1 as const, keyVersion: 1,
      iv: "A".repeat(16), ciphertext: "A".repeat(58), authTag: "A".repeat(22) };
    assert.deepEqual(validatePublicShareBearerEnvelope(envelope), envelope);
    for (const field of ["iv", "ciphertext", "authTag"] as const) {
      for (const value of ["", envelope[field] + "=", envelope[field] + "\n", envelope[field].slice(1)]) {
        assert.throws(() => validatePublicShareBearerEnvelope({ ...envelope, [field]: value }), /InvalidPublicShareEnvelope/);
      }
    }
    for (const field of ["ciphertext", "authTag"] as const) {
      assert.throws(() => validatePublicShareBearerEnvelope({ ...envelope,
        [field]: envelope[field].slice(0, -1) + "B" }), /InvalidPublicShareEnvelope/);
    }
    assert.throws(() => validatePublicShareBearerEnvelope({ ...envelope, formatVersion: 2 } as never), /InvalidPublicShareEnvelope/);
    assert.throws(() => validatePublicShareBearerEnvelope({ ...envelope, keyVersion: 0 }), /InvalidPublicShareVersion/);
    const copy = validatePublicShareBearerEnvelope(envelope);
    envelope.iv = "B".repeat(16);
    assert.equal(copy.iv, "A".repeat(16));
    assert.equal(Object.isFrozen(copy), true);
  });
});
