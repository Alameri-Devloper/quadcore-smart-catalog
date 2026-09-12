import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalBranchFixture as fixture } from "./mock/operational-branch.fixture";
import { OperationalBranchApiClient, reconstructOperationalBranches } from "./operational-branch-api.client";
import { OPERATIONAL_BRANCH_PURPOSES, type OperationalBranchPurpose } from "./operational-branch-selector.types";

const success = (value: unknown = [fixture()], status = 200) => Response.json({ type: "Success", value }, { status });
describe("Strict A6 operational Branch client", () => {
  for (const purpose of OPERATIONAL_BRANCH_PURPOSES) it(`serializes only exact ${purpose} with same-origin/no-store and signal`, async () => {
    const signal = new AbortController().signal; let calls = 0;
    const client = new OperationalBranchApiClient(async (path, init) => {
      calls++; assert.equal(path, `/api/branches/operational?purpose=${purpose}`);
      assert.deepEqual(init, { method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "application/json" } });
      assert.deepEqual([...new URL(String(path), "https://local.test").searchParams.entries()], [["purpose", purpose]]);
      return success();
    });
    assert.deepEqual(await client.list(purpose, signal), { ok: true, value: [fixture()] }); assert.equal(calls, 1);
  });
  it("rejects aliases and free-form purpose values without issuing any request", async () => {
    const client = new OperationalBranchApiClient(async () => { throw new Error("ShouldNotFetch"); });
    for (const purpose of ["listing", " Inventory ", "", "WorkspacePricing", "Inventory&branchId=foreign", "General", undefined]) {
      assert.deepEqual(await client.list(purpose as OperationalBranchPurpose), { ok: false, kind: "InvalidInput" });
    }
  });
  it("reconstructs only four own fields and discards all unknown fields", async () => {
    const raw = { ...fixture(), workspaceId: "discard", revision: 4, sortOrder: 200, createdAt: "discard", updatedAt: "discard", permissions: ["discard"], scope: { any: true } };
    const result = await new OperationalBranchApiClient(async () => success([raw])).list("Listing");
    assert.deepEqual(result, { ok: true, value: [fixture()] }); assert.ok(result.ok);
    assert.deepEqual(Object.keys(result.value[0]), ["branchId", "code", "displayName", "status"]);
    assert.notEqual(result.value[0], raw); assert.ok(Object.isFrozen(result.value)); assert.ok(Object.isFrozen(result.value[0]));
  });
  it("preserves exact order and both Active and Inactive without sorting", async () => {
    const options = [fixture({ branchId: "z", status: "Inactive", displayName: "Z" }), fixture({ branchId: "b", displayName: "B" }), fixture({ branchId: "a", status: "Inactive", displayName: "A" })];
    assert.deepEqual(await new OperationalBranchApiClient(async () => success(options)).list("Transfer"), { ok: true, value: options });
  });
  it("accepts authorized empty separately from every expected failure", async () => {
    assert.deepEqual(await new OperationalBranchApiClient(async () => success([])).list("Inventory"), { ok: true, value: [] });
  });
  for (const [status, kind] of [[401, "AuthenticationRequired"], [403, "ForbiddenForRestrictedSession"], [400, "InvalidInput"], [403, "Forbidden"], [503, "BranchServiceUnavailable"]] as const) {
    it(`normalizes exact ${status} ${kind} without fallback requests`, async () => {
      const paths: string[] = [];
      const result = await new OperationalBranchApiClient(async (path) => { paths.push(String(path)); return Response.json({ type: kind, extra: true }, { status }); }).list("Listing");
      assert.deepEqual(result, { ok: false, kind }); assert.deepEqual(paths, ["/api/branches/operational?purpose=Listing"]);
    });
  }
  it("distinguishes network, malformed and unexpected responses", async () => {
    assert.deepEqual(await new OperationalBranchApiClient(async () => { throw new Error("Offline"); }).list("Listing"), { ok: false, kind: "NetworkFailure" });
    for (const response of [new Response("invalid"), Response.json([]), Response.json({ value: [] }), Response.json({ type: "Success" }), Response.json({ type: 123 }), success({ items: [] }), Response.json({ type: "Other", value: [] })]) {
      assert.deepEqual(await new OperationalBranchApiClient(async () => response).list("Listing"), { ok: false, kind: "MalformedResponse" });
    }
    for (const response of [success([], 201), Response.json({ type: "Forbidden" }, { status: 503 }), Response.json({ type: "NotFound" }, { status: 404 }), Response.json({ type: "OriginNotAllowed" }, { status: 403 }), Response.json({ type: "Unknown" }, { status: 500 })]) {
      assert.deepEqual(await new OperationalBranchApiClient(async () => response).list("Listing"), { ok: false, kind: "UnexpectedResponse" });
    }
  });
  it("rejects inherited or missing required fields, malformed items and duplicate identifiers", () => {
    for (const value of [null, {}, "bad", [null], [3], [[]], [Object.create(fixture())], [fixture(), fixture()]]) assert.throws(() => reconstructOperationalBranches(value));
    for (const key of Object.keys(fixture())) {
      const raw = { ...fixture() } as Record<string, unknown>; delete raw[key]; assert.throws(() => reconstructOperationalBranches([raw]));
      for (const invalid of [null, 5, true, [], {}, ""]) assert.throws(() => reconstructOperationalBranches([{ ...fixture(), [key]: invalid }]));
    }
    assert.throws(() => reconstructOperationalBranches([fixture({ status: "active" as "Active" })]));
  });
});
