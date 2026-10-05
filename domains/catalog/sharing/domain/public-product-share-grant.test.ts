import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PublicProductShareGrant, type PublicProductShareGrantState } from "./public-product-share-grant";

const state = (): PublicProductShareGrantState => ({
  workspaceId: "workspace-a", grantId: "12345678-1234-4234-8234-123456789abc",
  productId: "product-a", branchId: "branch-a", issuedByActorId: "issuer-a",
  lookupDigest: { keyVersion: 1, value: "a".repeat(64) },
  bearerEnvelope: { formatVersion: 1, keyVersion: 1, iv: "A".repeat(16),
    ciphertext: "A".repeat(58), authTag: "A".repeat(22) },
  issuedAt: new Date("2026-10-05T00:00:00Z"), revokedAt: null, revokedByActorId: null, revision: 1,
});

describe("Workspace-owned Public Share Grant", () => {
  it("creates only unrevoked revision-one state and does not serialize protected state", () => {
    const input = state();
    const grant = PublicProductShareGrant.create({ ...input, bearerEnvelope: input.bearerEnvelope! });
    assert.deepEqual(grant.snapshot(), input);
    assert.equal(grant.isRevoked, false);
    assert.equal(JSON.stringify(grant), "{}");
    assert.equal("token" in grant.snapshot(), false);
    assert.equal("expiresAt" in grant.snapshot(), false);
  });
  it("requires the complete envelope exactly while unrevoked", () => {
    for (const revoked of [false, true]) for (const actor of [false, true]) for (const envelope of [false, true]) {
      const input = { ...state(), revokedAt: revoked ? new Date("2026-10-06") : null,
        revokedByActorId: actor ? "revoker" : null, bearerEnvelope: envelope ? state().bearerEnvelope : null };
      if ((!revoked && !actor && envelope) || (revoked && actor && !envelope)) {
        assert.deepEqual(PublicProductShareGrant.rehydrate(input).snapshot(), input);
      } else assert.throws(() => PublicProductShareGrant.rehydrate(input), /InvalidPublicShareGrantState/);
    }
    assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), bearerEnvelope: {} as never }), /InvalidPublicShareEnvelope/);
  });
  it("permanently clears retrieval material on first revoke and preserves historical state on repeats", () => {
    const grant = PublicProductShareGrant.rehydrate(state());
    const at = new Date("2026-10-06");
    assert.equal(grant.revoke("revoker-a", at), "Revoked");
    const first = grant.snapshot();
    assert.equal(first.bearerEnvelope, null);
    assert.equal(first.revision, 2);
    assert.deepEqual(first.lookupDigest, state().lookupDigest);
    assert.equal(first.issuedByActorId, "issuer-a");
    at.setTime(0);
    assert.equal(grant.revoke("revoker-b", new Date("2026-10-07")), "AlreadyRevoked");
    assert.deepEqual(grant.snapshot(), first);
    assert.equal(grant.updateProtectedValues({ expectedRevision: 2,
      lookupDigest: state().lookupDigest, bearerEnvelope: state().bearerEnvelope! }), "Revoked");
    assert.deepEqual(grant.snapshot(), first);
  });
  it("rejects invalid identities, grant UUIDs, Dates and revisions", () => {
    for (const key of ["workspaceId", "productId", "branchId", "issuedByActorId"] as const) {
      for (const value of ["", " padded "]) assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), [key]: value }), /InvalidPublicShareIdentity/);
    }
    assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), grantId: "sequential-1" }), /InvalidPublicShareGrantId/);
    assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), issuedAt: new Date(NaN) }), /InvalidPublicShareDate/);
    assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), revision: 0 }), /InvalidPublicShareVersion/);
    assert.throws(() => PublicProductShareGrant.rehydrate({ ...state(), bearerEnvelope: null,
      revokedAt: new Date("2026-10-04"), revokedByActorId: "revoker" }), /InvalidPublicShareGrantState/);
  });
  it("does not mutate on invalid revoke or revision exhaustion", () => {
    const grant = PublicProductShareGrant.rehydrate(state());
    for (const at of [new Date(NaN), new Date("2026-10-04")]) {
      assert.throws(() => grant.revoke("revoker", at), /InvalidPublicShareDate/);
      assert.deepEqual(grant.snapshot(), state());
    }
    const exhausted = PublicProductShareGrant.rehydrate({ ...state(), revision: Number.MAX_SAFE_INTEGER });
    assert.throws(() => exhausted.revoke("revoker", new Date("2026-10-06")), /InvalidPublicShareVersion/);
    assert.equal(exhausted.isRevoked, false);
  });
  it("isolates incoming and outgoing mutable values and scope", () => {
    const input = state();
    const grant = PublicProductShareGrant.rehydrate(input);
    input.issuedAt.setTime(0);
    const snapshot = grant.snapshot();
    snapshot.issuedAt.setTime(0);
    assert.deepEqual(grant.snapshot(), state());
    assert.equal(Object.isFrozen(snapshot), true);
    assert.equal(Object.isFrozen(snapshot.lookupDigest), true);
    assert.equal(Object.isFrozen(snapshot.bearerEnvelope), true);
  });
  it("guards protected-value maintenance by revision and keeps immutable scope", () => {
    const grant = PublicProductShareGrant.rehydrate(state());
    const input = { expectedRevision: 2, lookupDigest: { keyVersion: 2, value: "b".repeat(64) },
      bearerEnvelope: { ...state().bearerEnvelope!, keyVersion: 2 } };
    assert.equal(grant.updateProtectedValues(input), "Conflict");
    assert.deepEqual(grant.snapshot(), state());
    assert.throws(() => grant.updateProtectedValues({ ...input, expectedRevision: 1,
      bearerEnvelope: { ...input.bearerEnvelope, authTag: "bad" } }), /InvalidPublicShareEnvelope/);
    assert.deepEqual(grant.snapshot(), state());
    assert.equal(grant.updateProtectedValues({ ...input, expectedRevision: 1 }), "Updated");
    assert.equal(grant.revision, 2);
    assert.equal(grant.workspaceId, state().workspaceId);
    assert.equal(grant.productId, state().productId);
    assert.equal(grant.branchId, state().branchId);
    assert.equal(grant.grantId, state().grantId);
    assert.equal(grant.snapshot().issuedByActorId, "issuer-a");
  });
});
