import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticatedContextUnavailableError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import { createBranchRouteHandlers } from "./branch-route-handlers";
import type { BranchServerApplication } from "../branch-server-runtime";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "owner", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const request = (body: unknown) => new Request("https://catalog.test/api/branches", { method: "POST", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: JSON.stringify(body) });
const open = (result: Readonly<Record<string, unknown>> = { ok: true, value: { branchId: "branch-a" } }, resolve = async () => actor) => () => ({ context: { resolve }, origin: { allows: () => true }, list: { execute: async () => result }, get: { execute: async () => result }, create: { execute: async () => result }, update: { execute: async () => result }, close: async () => undefined }) as unknown as BranchServerApplication;

describe("Branch HTTP boundary", () => {
  it("requires authenticated context and typed create input", async () => { const unauthenticated = await createBranchRouteHandlers(open({}, async () => { throw new AuthenticatedContextUnavailableError(); })).create(request({ code: "main", displayName: "Main", sortOrder: 0 })); assert.equal(unauthenticated.status, 401); assert.equal((await createBranchRouteHandlers(open()).create(request({ code: "main", displayName: "Main", sortOrder: "0" }))).status, 400); });
  it("maps duplicate code, stale revision, scoped not-found, and success", async () => { assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "CodeConflict" })).create(request({ code: "main", displayName: "Main", sortOrder: 0 }))).status, 409); assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "Conflict" })).update(request({ expectedRevision: 1 }), "branch-a")).status, 409); assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "NotFound" })).get(new Request("https://catalog.test/api/branches/foreign"), "foreign")).status, 404); assert.equal((await createBranchRouteHandlers(open()).create(request({ code: "main", displayName: "Main", sortOrder: 0 }))).status, 201); });
});
