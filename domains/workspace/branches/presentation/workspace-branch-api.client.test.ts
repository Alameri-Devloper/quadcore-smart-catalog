import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { branchManagementFixture as fixture } from "./mock/branch-management.fixture";
import { reconstructBranchManagementView, WorkspaceBranchApiClient } from "./workspace-branch-api.client";

const success = (value: unknown, status = 200) => Response.json({ type: "Success", value, extra: true }, { status });
describe("Strict General Branch client", () => {
  it("invokes a receiver-sensitive FetchPort unbound and preserves the General Branch request contract", async () => {
    const signal = new AbortController().signal;
    let calledWithoutReceiver = false;
    const fetchPort = async function (this: unknown, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      calledWithoutReceiver = this === undefined;
      if (this !== undefined) throw new TypeError("Illegal invocation");
      assert.equal(input, "/api/branches");
      assert.deepEqual(init, { method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "application/json" } });
      return success([]);
    };

    const result = await new WorkspaceBranchApiClient(fetchPort).list(signal);

    assert.equal(calledWithoutReceiver, true);
    assert.deepEqual(result, { ok: true, value: [] });
  });

  it("uses exact General endpoints, same-origin/no-store, signals and allow-listed payloads", async () => {
    const calls: { path: string; init?: RequestInit }[] = [];
    const client = new WorkspaceBranchApiClient(async (path, init) => {
      calls.push({ path: String(path), init });
      return success(init?.method === "GET" && String(path) === "/api/branches" ? [] : fixture(), init?.method === "POST" ? 201 : 200);
    });
    const signal = new AbortController().signal;
    await client.list(signal); await client.get("branch-one", signal);
    await client.create({ code: "main", displayName: "Main", sortOrder: 2, ...{ workspaceId: "ignored", status: "Inactive", revision: 44 } }, signal);
    await client.update("branch-one", { displayName: "Changed", sortOrder: 3, status: "Inactive", expectedRevision: 7, ...{ workspaceId: "ignored", code: "immutable" } }, signal);
    assert.deepEqual(calls.map(({ path }) => path), ["/api/branches", "/api/branches/branch-one", "/api/branches", "/api/branches/branch-one"]);
    assert.deepEqual(calls.map(({ init }) => init?.method), ["GET", "GET", "POST", "PATCH"]);
    for (const { init } of calls) { assert.equal(init?.credentials, "same-origin"); assert.equal(init?.cache, "no-store"); assert.equal(init?.signal, signal); }
    assert.equal(calls[0].init?.body, undefined);
    assert.deepEqual(JSON.parse(calls[2].init!.body as string), { code: "main", displayName: "Main", sortOrder: 2 });
    assert.deepEqual(JSON.parse(calls[3].init!.body as string), { displayName: "Changed", sortOrder: 3, status: "Inactive", expectedRevision: 7 });
  });
  it("reconstructs only approved own fields, freezes DTOs, drops tenant and unknown authority", async () => {
    const raw = { ...fixture(), workspaceId: "not-presentation-authority", allowedActions: ["anything"], extra: { secret: "discard" } };
    const parsed = reconstructBranchManagementView(raw);
    assert.deepEqual(parsed, fixture()); assert.notEqual(parsed, raw); assert.ok(Object.isFrozen(parsed));
    const result = await new WorkspaceBranchApiClient(async () => success([raw])).list();
    assert.ok(result.ok); assert.ok(Object.isFrozen(result.value)); assert.deepEqual(result.value, [fixture()]);
    assert.throws(() => reconstructBranchManagementView(Object.create(fixture())));
    for (const key of Object.keys(fixture())) { const missing = { ...raw } as Record<string, unknown>; delete missing[key]; assert.throws(() => reconstructBranchManagementView(missing)); }
  });
  it("preserves exact server order and authorized empty list", async () => {
    const rows = [fixture({ branchId: "z", sortOrder: 900 }), fixture({ branchId: "a", sortOrder: 0, status: "Inactive" })];
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => success(rows)).list(), { ok: true, value: rows });
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => success([])).list(), { ok: true, value: [] });
  });
  for (const [code, status, kind] of [
    ["AuthenticationRequired", 401, "AuthenticationRequired"], ["ForbiddenForRestrictedSession", 403, "ForbiddenForRestrictedSession"],
    ["Forbidden", 403, "Forbidden"], ["OriginNotAllowed", 403, "OriginNotAllowed"], ["InvalidInput", 400, "InvalidInput"],
    ["NotFound", 404, "BranchNotFound"], ["Conflict", 409, "Conflict"], ["CodeConflict", 409, "CodeConflict"],
    ["BranchServiceUnavailable", 503, "BranchServiceUnavailable"],
  ] as const) it(`normalizes ${status} ${code} without empty/fallback data`, async () => {
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => Response.json({ type: code, extra: true }, { status })).list(), { ok: false, kind });
  });
  it("distinguishes network, malformed and unexpected responses", async () => {
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => { throw new Error("offline"); }).list(), { ok: false, kind: "NetworkFailure" });
    for (const response of [new Response("bad json"), success({ items: [] }), Response.json([]), success([fixture({ revision: 0 })]), success([fixture(), fixture()])]) {
      assert.deepEqual(await new WorkspaceBranchApiClient(async () => response).list(), { ok: false, kind: "MalformedResponse" });
    }
    for (const response of [Response.json({ type: "Forbidden" }, { status: 503 }), Response.json({ type: "BranchNotFound" }, { status: 404 }), success([], 201), Response.json({ type: "Unknown" }, { status: 418 })]) {
      assert.deepEqual(await new WorkspaceBranchApiClient(async () => response).list(), { ok: false, kind: "UnexpectedResponse" });
    }
  });
  it("rejects invalid statuses, types, numbers, timestamps, identifiers and incomplete envelopes", async () => {
    for (const override of [{ code: "BAD" }, { displayName: "" }, { status: "Archived" }, { sortOrder: -1 }, { sortOrder: 1.5 }, { sortOrder: 1_000_001 }, { revision: Number.MAX_SAFE_INTEGER + 1 }, { createdAt: "2026-09-01" }, { updatedAt: "2020-01-01T00:00:00.000Z" }, { branchId: " " }]) {
      assert.throws(() => reconstructBranchManagementView({ ...fixture(), ...override }));
    }
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => success(fixture())).get("other"), { ok: false, kind: "MalformedResponse" });
    assert.deepEqual(await new WorkspaceBranchApiClient(async () => Response.json({ value: [] })).list(), { ok: false, kind: "MalformedResponse" });
  });
  it("encodes identifiers and blocks static operational route and dot-segment aliases", async () => {
    const paths: string[] = [];
    const client = new WorkspaceBranchApiClient(async (path) => { paths.push(String(path)); return success(fixture({ branchId: "x/y?z" })); });
    await client.get("x/y?z");
    for (const id of ["operational", ".", "..", ""]) assert.deepEqual(await client.get(id), { ok: false, kind: "InvalidInput" });
    assert.deepEqual(paths, ["/api/branches/x%2Fy%3Fz"]);
  });
});
