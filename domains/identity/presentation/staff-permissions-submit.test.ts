import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ts from "typescript";
import { IdentityApiClient } from "./identity-api.client";
import { failureMessageKey } from "./components/presentation-shell";
import { isBranchScopeDraftValid } from "./identity-presentation.utils";
import { PERMISSION_REGISTRY, validateStaffPermissionCodes } from "../domain/permission";
import { PostgreSqlMemberAdministrationReadRepository } from "../infrastructure/persistence/postgresql-identity.repositories";
import { createIdentityMemberRouteHandlers } from "../infrastructure/http/identity-member-route-handlers";
import type { IdentityMemberServerApplication } from "../infrastructure/identity-member-server-runtime";
import type { PlatformDatabase } from "../../../shared/infrastructure/persistence/database";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";

// Execute current page callbacks, with React state and transport boundaries controlled.
// This is a handler test, not a DOM/browser interaction test.
const source = readFileSync("domains/identity/presentation/pages/member-details-page.tsx", "utf8");
const tree = ts.createSourceFile("member-details-page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name: string, sourceTree = tree): ts.Expression {
  let found: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceTree) === name) found = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(sourceTree); assert.ok(found); return found;
}
const load = initializer("load");
assert.ok(ts.isCallExpression(load));
let submit: string | undefined;
function findSubmit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === "formSubmit"
    && node.arguments[0]?.getText(tree).startsWith("() => reviewPermissions ?")) submit = node.arguments[0].getText(tree);
  ts.forEachChild(node, findSubmit);
}
findSubmit(tree); assert.ok(submit);
const selectorSource = readFileSync("domains/identity/presentation/components/member-components.tsx", "utf8");
const selectorTree = ts.createSourceFile("member-components.tsx", selectorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const toggleCode = ts.transpileModule(`return ${initializer("toggle", selectorTree).getText(selectorTree)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const handlerCode = ts.transpileModule(`const load = ${load.arguments[0].getText(tree)};
const mutate = ${initializer("mutate").getText(tree)};
return { load, submit: ${submit} };`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

async function fixture(role: "Staff" | "Owner" = "Staff") {
  let committed = ["catalog.products.view"];
  let version = 1;
  let applicationWrites = 0;
  const requests: { body: Record<string, unknown>; status: number; response: { type: string } }[] = [];
  // node-postgres returns raw bigint columns as strings; raw execute bypasses Drizzle column decoding.
  const database = {
    execute: async () => ({ rows: [{ actorId: "staff", displayName: "Staff", username: "staff.test", role,
      accountStatus: "Active", passwordLifecycle: "Permanent", whatsappPhoneE164: "+967711111111", locale: "en",
      branchScope: "AllBranches", authorizationVersion: String(version), recoveryContactVersion: "1",
      profileUpdatedAt: new Date("2026-10-02T00:00:00Z"), createdAt: new Date("2026-10-02T00:00:00Z"), lastSessionIssuedAt: null }] }),
    select: () => ({ from: (table: { permissionCode?: unknown }) => ({ where: async () =>
      "permissionCode" in table ? committed.map(permissionCode => ({ actorId: "staff", permissionCode })) : [] }) }),
  } as unknown as PlatformDatabase;
  const repository = new PostgreSqlMemberAdministrationReadRepository(database);
  const context = { workspaceId: "workspace", actorId: "owner", role: "Owner" };
  const application = {
    cookie: { read: () => "test-session" }, origin: { allows: () => true }, close: async () => {},
    resolve: { execute: async () => ({ ok: true, value: { context } }) },
    getMember: { execute: async () => ({ ok: true, value: await repository.findByActorId(WorkspaceId.create("workspace"), ActorId.create("staff")) }) },
    updatePermissions: { execute: async (command: { permissionCodes: string[]; expectedAuthorizationRevision: number }) => {
      applicationWrites++;
      try { committed = [...validateStaffPermissionCodes(command.permissionCodes)]; }
      catch { return { ok: false, error: "InvalidPermissionCode" }; }
      assert.equal(command.expectedAuthorizationRevision, version);
      version++;
      return { ok: true, value: { authorizationVersion: version, revokedSessionCount: 0 } };
    } },
  } as unknown as IdentityMemberServerApplication;
  const routes = createIdentityMemberRouteHandlers(() => application);
  const client = new IdentityApiClient(async (input, init) => {
    const path = String(input);
    if (path === "/api/workspace/permissions") return Response.json({ type: "Success", value: PERMISSION_REGISTRY });
    if (path === "/api/workspace/branch-references") return Response.json({ type: "Success", value: [] });
    const request = new Request(`https://example.test${path}`, init);
    if (init?.method === "PATCH") {
      const response = await routes.permissions(request, "staff");
      requests.push({ body: JSON.parse(String(init.body)), status: response.status, response: await response.clone().json() });
      return response;
    }
    return routes.details(request, "staff");
  });
  const state: Record<string, unknown> = {};
  const bindings: Record<string, unknown> = { identityApiClient: client, actorId: "staff", actor: { actorId: "owner" },
    router: { replace: () => {} }, redirectExpired: () => {}, i18n: { t: (key: string) => key }, failureMessageKey, temporaryPassword: "" };
  for (const name of ["Submitting", "Message", "ShownTemporaryPassword", "TemporaryPassword", "ReviewPermissions", "ReviewBranches", "Loading", "LoadError", "Member", "Permissions", "Branches", "DisplayName", "MemberLocale", "Phone", "PermissionDraft", "BranchDraft"]) {
    const key = name[0].toLowerCase() + name.slice(1);
    bindings[`set${name}`] = (value: unknown) => { state[key] = value; };
  }
  const page = () => {
    const current = { ...bindings, member: state.member, permissionDraft: state.permissionDraft, reviewPermissions: state.reviewPermissions };
    return new Function(...Object.keys(current), handlerCode)(...Object.values(current)) as { load: () => Promise<void>; submit: () => Promise<void> | void };
  };
  await page().load();
  const save = async (codes: string[]) => {
    state.permissionDraft = codes; state.reviewPermissions = false;
    const beforeReview = requests.length;
    await page().submit(); // Review changes; no mutation.
    assert.equal(requests.length, beforeReview);
    await page().submit(); // Permissions-specific save.
  };
  const toggle = (code: string) => {
    const change = (codes: string[]) => { state.permissionDraft = codes; state.reviewPermissions = false; };
    const callback = new Function("selected", "onChange", toggleCode)(state.permissionDraft, change) as (code: string) => void;
    callback(code);
  };
  return { state, requests, save, toggle, writes: () => applicationWrites, committed: () => committed };
}

describe("Staff Permissions submit with PostgreSQL bigint read values", () => {
  it("adds and removes View branches, sends a numeric token, and adopts the committed set", async () => {
    const test = await fixture();
    assert.deepEqual(test.state.permissionDraft, ["catalog.products.view"]);
    test.toggle("workspace.branches.view");
    await test.save(test.state.permissionDraft as string[]);
    assert.equal(test.requests[0].status, 200);
    assert.equal(typeof test.requests[0].body.expectedAuthorizationRevision, "number");
    assert.deepEqual(test.state.permissionDraft, test.committed());
    test.toggle("workspace.branches.view");
    await test.save(test.state.permissionDraft as string[]);
    assert.equal(test.requests[1].status, 200);
    assert.equal(test.writes(), 2);
    assert.deepEqual(test.state.permissionDraft, ["catalog.products.view"]);
  });
  it("retains genuine server validation for duplicate, unknown, and Owner-only permissions", async () => {
    for (const codes of [["workspace.branches.view", "workspace.branches.view"], ["unknown.permission"], ["workspace.branches.manage"]]) {
      const test = await fixture(); await test.save(codes);
      assert.equal(test.requests[0].status, 400);
      assert.equal(test.requests[0].response.type, "InvalidPermissionCode");
      assert.equal(test.writes(), 1);
      assert.deepEqual(test.state.message, { kind: "error", text: "validationError" });
      assert.deepEqual(test.committed(), ["catalog.products.view"]);
      assert.deepEqual(test.state.permissionDraft, codes);
    }
  });
  it("does not couple an invalid Branch Scope draft to valid Permissions", async () => {
    const test = await fixture();
    test.state.branchDraft = { type: "SelectedBranches", branchIds: [] };
    assert.equal(isBranchScopeDraftValid(test.state.branchDraft as Parameters<typeof isBranchScopeDraftValid>[0]), false);
    await test.save(["workspace.branches.view"]);
    assert.equal(test.requests[0].status, 200);
  });
  it("preserves the Owner presentation guard and Staff assignability without dependencies", async () => {
    const test = await fixture("Owner");
    assert.deepEqual(test.state.permissionDraft, []);
    assert.equal(test.requests.length, 0);
    assert.ok(source.includes('member.role === "Owner" ? <StatusMessage'));
    assert.deepEqual(validateStaffPermissionCodes(["workspace.branches.view"]), ["workspace.branches.view"]);
    assert.equal(PERMISSION_REGISTRY.find(item => item.code === "workspace.branches.view")?.assignableToStaff, true);
  });
});
