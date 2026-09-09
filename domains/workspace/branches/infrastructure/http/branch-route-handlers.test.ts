import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import { Branch } from "../../domain/branch";
import type { BranchUnitOfWork } from "../../ports/branch-unit-of-work.port";
import { GetBranchUseCase, ListBranchesUseCase } from "../../application/branch.use-cases";
import { ListOperationalBranchesUseCase } from "../../application/list-operational-branches.use-case";
import { createBranchRouteHandlers } from "./branch-route-handlers";
import type { BranchServerApplication } from "../branch-server-runtime";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "owner", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const request = (body: unknown) => new Request("https://catalog.test/api/branches", { method: "POST", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: JSON.stringify(body) });
const open = (result: Readonly<Record<string, unknown>> = { ok: true, value: { branchId: "branch-a" } }, resolve = async () => actor) => () => ({ context: { resolve }, origin: { allows: () => true }, list: { execute: async () => result }, get: { execute: async () => result }, create: { execute: async () => result }, update: { execute: async () => result }, close: async () => undefined }) as unknown as BranchServerApplication;

describe("Branch HTTP boundary", () => {
  it("requires authenticated context and typed create input", async () => { const unauthenticated = await createBranchRouteHandlers(open({}, async () => { throw new AuthenticatedContextUnavailableError(); })).create(request({ code: "main", displayName: "Main", sortOrder: 0 })); assert.equal(unauthenticated.status, 401); assert.equal((await createBranchRouteHandlers(open()).create(request({ code: "main", displayName: "Main", sortOrder: "0" }))).status, 400); });
  it("maps duplicate code, stale revision, scoped not-found, and success", async () => { assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "CodeConflict" })).create(request({ code: "main", displayName: "Main", sortOrder: 0 }))).status, 409); assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "Conflict" })).update(request({ expectedRevision: 1 }), "branch-a")).status, 409); assert.equal((await createBranchRouteHandlers(open({ ok: false, error: "NotFound" })).get(new Request("https://catalog.test/api/branches/foreign"), "foreign")).status, 404); assert.equal((await createBranchRouteHandlers(open()).create(request({ code: "main", displayName: "Main", sortOrder: 0 }))).status, 201); });
});

const operationalActor: TrustedActorContext = {
  workspaceId: "workspace-a", actorId: "staff-a", role: "Staff", permissions: ["inventory.receive"],
  branchScope: { type: "AllBranches" }, authorizationVersion: 1,
};
const operationalRows = ["z", "a"].map((branchId) => Branch.rehydrate({
  workspaceId: "workspace-a", branchId, code: branchId, displayName: branchId,
  status: branchId === "a" ? "Inactive" : "Active", revision: 3, sortOrder: 7,
  createdAt: new Date("2026-09-01T00:00:00Z"), updatedAt: new Date("2026-09-02T00:00:00Z"),
}));
const operationalFixture = (options: {
  context?: TrustedActorContext;
  rows?: readonly Branch[];
  failure?: "open" | "resolve" | "execute" | "uow";
  sessionError?: Error;
  closeFails?: boolean;
} = {}) => {
  const events: string[] = [];
  const unitOfWork: BranchUnitOfWork = {
    execute: async (work) => {
      events.push("uow");
      if (options.failure === "uow") throw new Error("Private UoW diagnostic");
      const unexpected = async (): Promise<never> => { throw new Error("Unexpected repository access"); };
      return work({
        branches: {
          list: async (workspaceId) => { events.push(`list:${workspaceId}`); return options.rows ?? operationalRows; },
          find: unexpected, create: unexpected, update: unexpected,
        },
        audit: { append: unexpected },
      });
    },
  };
  const useCase = new ListOperationalBranchesUseCase(unitOfWork);
  const openOperational = () => {
    events.push("open");
    if (options.failure === "open") throw new Error("Private open diagnostic");
    return {
      context: { resolve: async () => {
        events.push("resolve");
        if (options.sessionError) throw options.sessionError;
        if (options.failure === "resolve") throw new Error("Private resolver diagnostic");
        return options.context ?? operationalActor;
      } },
      operationalList: { execute: async (command: Parameters<ListOperationalBranchesUseCase["execute"]>[0]) => {
        events.push(`execute:${command.purpose}`);
        if (options.failure === "execute") throw new Error("Private use-case diagnostic");
        return useCase.execute(command);
      } },
      list: new ListBranchesUseCase(unitOfWork), get: new GetBranchUseCase(unitOfWork),
      close: async () => { events.push("close"); if (options.closeFails) throw new Error("Private close diagnostic"); },
    } as unknown as BranchServerApplication;
  };
  return { handlers: createBranchRouteHandlers(openOperational), events };
};
const operationalRequest = (query = "purpose=Inventory") => new Request(`https://catalog.test/api/branches/operational?${query}`);
const assertPrivateResponse = async (response: Response, status: number, body: unknown) => {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), body);
};

describe("Operational Branch selector HTTP boundary", () => {
  for (const [purpose, permission] of [
    ["Listing", "catalog.product.edit"], ["Inventory", "inventory.receive"], ["Transfer", "inventory.transfer"],
    ["BranchPricing", "pricing.branchOverride.manage"], ["BranchReferenceCost", "referenceCost.branchOverride.manage"],
  ]) {
    it(`returns the exact private projection for ${purpose}, preserving Application order`, async () => {
      const app = operationalFixture({ context: { ...operationalActor, permissions: [permission!] } });
      await assertPrivateResponse(await app.handlers.operationalList(operationalRequest(`purpose=${purpose}`)), 200, {
        type: "Success", value: [
          { branchId: "z", code: "z", displayName: "z", status: "Active" },
          { branchId: "a", code: "a", displayName: "a", status: "Inactive" },
        ],
      });
      assert.deepEqual(app.events, ["open", "resolve", `execute:${purpose}`, "uow", "list:workspace-a", "close"]);
    });
  }

  it("returns private authorized empty success and filters trusted selected scope", async () => {
    for (const rows of [[], operationalRows]) {
      const app = operationalFixture({ rows, context: { ...operationalActor, branchScope: { type: "SelectedBranches", branchIds: [] } } });
      await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 200, { type: "Success", value: [] });
      assert.equal(app.events.at(-1), "close");
    }
    const app = operationalFixture({ context: { ...operationalActor, branchScope: { type: "SelectedBranches", branchIds: ["a"] } } });
    await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 200, {
      type: "Success", value: [{ branchId: "a", code: "a", displayName: "a", status: "Inactive" }],
    });
  });

  it("rejects malformed purposes and every extra input category before reading Branches", async () => {
    const queries = ["", "purpose=", "purpose=%20", "purpose=Unknown", "purpose=inventory", "purpose=Inventory%20", "purpose=Inventory&purpose=Inventory", "purpose=WorkspacePricing", "purpose=Reservation"];
    for (const key of ["workspaceId", "actorId", "branchScope", "permissions", "permission", "role", "authorizationVersion", "canRead", "branchId", "status", "q", "cursor", "limit"]) queries.push(`purpose=Inventory&${key}=value`);
    for (const query of queries) {
      const app = operationalFixture();
      await assertPrivateResponse(await app.handlers.operationalList(operationalRequest(query)), 400, { type: "InvalidInput" });
      assert.ok(!app.events.includes("uow"), query);
      assert.equal(app.events.at(-1), "close");
    }
  });

  it("gives authentication and restricted-session failures precedence over malformed input", async () => {
    for (const [sessionError, status, type] of [
      [new AuthenticatedContextUnavailableError(), 401, "AuthenticationRequired"],
      [new RestrictedSessionContextError(), 403, "ForbiddenForRestrictedSession"],
    ] as const) {
      for (const query of ["purpose=Inventory", "", "purpose=Unknown&workspaceId=foreign"]) {
        const app = operationalFixture({ sessionError });
        await assertPrivateResponse(await app.handlers.operationalList(operationalRequest(query)), status, { type });
        assert.deepEqual(app.events, ["open", "resolve", "close"]);
      }
    }
  });

  it("keeps forbidden distinct from an empty collection and does not query persistence", async () => {
    const app = operationalFixture({ context: { ...operationalActor, permissions: ["workspace.branches.view"] } });
    await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 403, { type: "Forbidden" });
    assert.deepEqual(app.events, ["open", "resolve", "execute:Inventory", "close"]);
  });

  it("sanitizes open, context, use-case and UoW failures with private caching and cleanup", async () => {
    for (const failure of ["open", "resolve", "execute", "uow"] as const) {
      const app = operationalFixture({ failure });
      await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 503, { type: "BranchServiceUnavailable" });
      assert.equal(app.events.filter((event) => event === "close").length, failure === "open" ? 0 : 1);
    }
  });

  it("sanitizes foreign-Workspace repository rows without disclosing a partial collection", async () => {
    const foreign = Branch.rehydrate({ ...operationalRows[0]!.value, workspaceId: "workspace-b", branchId: "foreign" });
    const app = operationalFixture({ rows: [...operationalRows, foreign] });
    await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 503, { type: "BranchServiceUnavailable" });
    assert.equal(app.events.at(-1), "close");
  });

  it("contains close failures without replacing success or safe failure responses", async () => {
    const app = operationalFixture({ rows: [], closeFails: true });
    await assertPrivateResponse(await app.handlers.operationalList(operationalRequest()), 200, { type: "Success", value: [] });
    const denied = operationalFixture({ closeFails: true, sessionError: new AuthenticatedContextUnavailableError() });
    await assertPrivateResponse(await denied.handlers.operationalList(operationalRequest()), 401, { type: "AuthenticationRequired" });
  });

  it("preserves general List/Get authorization, full management projection and cache behavior", async () => {
    for (const permissions of [["inventory.receive"], ["catalog.product.edit"]]) {
      const app = operationalFixture({ context: { ...operationalActor, permissions } });
      const list = await app.handlers.list(new Request("https://catalog.test/api/branches"));
      assert.equal(list.status, 403);
      assert.deepEqual(await list.json(), { type: "Forbidden" });
      assert.equal(list.headers.get("cache-control"), null);
      const get = await app.handlers.get(new Request("https://catalog.test/api/branches/z"), "z");
      assert.equal(get.status, 404);
      assert.deepEqual(await get.json(), { type: "NotFound" });
      assert.equal(get.headers.get("cache-control"), null);
      assert.ok(!app.events.includes("uow"));
    }
    const app = operationalFixture({ context: { ...operationalActor, permissions: ["workspace.branches.view"] } });
    const list = await app.handlers.list(new Request("https://catalog.test/api/branches"));
    assert.equal(list.status, 200);
    assert.equal(list.headers.get("cache-control"), null);
    assert.deepEqual(await list.json(), { type: "Success", value: operationalRows.map((row) => ({
      ...row.value, createdAt: row.value.createdAt.toISOString(), updatedAt: row.value.updatedAt.toISOString(),
    })) });
  });
});
