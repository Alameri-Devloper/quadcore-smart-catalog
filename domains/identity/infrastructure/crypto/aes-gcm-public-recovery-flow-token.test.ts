import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityClock } from "../../application/ports";
import { AesGcmPublicRecoveryFlowToken } from "./aes-gcm-public-recovery-flow-token";

class MutableClock implements IdentityClock {
  constructor(private value = new Date("2026-08-17T00:00:00.000Z")) {}
  now(): Date { return new Date(this.value); }
  advance(milliseconds: number): void { this.value = new Date(this.value.getTime() + milliseconds); }
}

describe("protected public recovery flow tokens", () => {
  it("encrypts real and decoy authority into equal-shape opaque references and rejects tampering", () => {
    const clock = new MutableClock();
    const tokens = new AesGcmPublicRecoveryFlowToken([{ version: 1, secret: Buffer.alloc(32, 7) }], 1, clock);
    const challengeId = "00000000-0000-4000-8000-000000000001";
    const real = tokens.issue({ kind: "Real", challengeId, issuedAt: clock.now() });
    const decoy = tokens.issue({ kind: "Decoy", challengeId, issuedAt: clock.now() });

    assert.equal(real.length, decoy.length);
    assert.equal(real.includes(challengeId), false);
    assert.equal(decoy.includes(challengeId), false);
    assert.deepEqual(tokens.read(real), { kind: "Real", challengeId, issuedAt: clock.now() });
    assert.deepEqual(tokens.read(decoy), { kind: "Decoy", challengeId, issuedAt: clock.now() });
    const last = real.at(-1)!;
    assert.equal(tokens.read(`${real.slice(0, -1)}${last === "A" ? "B" : "A"}`), null);
  });

  it("expires bounded public authority without exposing token contents", () => {
    const clock = new MutableClock();
    const tokens = new AesGcmPublicRecoveryFlowToken([{ version: 1, secret: Buffer.alloc(32, 7) }], 1, clock, 60_000);
    const reference = tokens.issue({
      kind: "Decoy",
      challengeId: "00000000-0000-4000-8000-000000000001",
      issuedAt: clock.now(),
    });
    clock.advance(60_001);
    assert.equal(tokens.read(reference), null);
  });
});
