import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BranchManagementCoordinator } from "./branch-management.coordinator";
import type { BranchManagementResult, BranchManagementView, WorkspaceBranchPort } from "./branch-management.types";
import { branchManagementFixture as fixture } from "./mock/branch-management.fixture";
import { WorkspaceBranchApiClient } from "./workspace-branch-api.client";

const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
const ok = (value = fixture()): BranchManagementResult<BranchManagementView> => ({ ok: true, value });
const basePort = (): WorkspaceBranchPort => ({ list: async () => ({ ok: true, value: [fixture()] }), get: async () => ok(), create: async () => ok(), update: async () => ok() });
const setup = (port: WorkspaceBranchPort = basePort()) => {
  let expired = 0, changes = 0;
  const coordinator = new BranchManagementCoordinator(port, { onChange: () => { changes++; }, onAuthenticationRequired: () => { expired++; } });
  return { coordinator, expired: () => expired, changes: () => changes };
};
const edit = (coordinator: BranchManagementCoordinator) => {
  const editor = coordinator.snapshot.editor;
  assert.equal(editor.type, "Edit"); if (editor.type !== "Edit") throw new Error("ExpectedEdit"); return editor;
};

describe("General Branch management coordination", () => {
  it("gets authoritative detail before exposing edit draft or accepting a write", async () => {
    const detail = deferred<BranchManagementResult<BranchManagementView>>(); let updates = 0;
    const { coordinator } = setup({ ...basePort(), get: () => detail.promise, update: async () => { updates++; return ok(); } });
    await coordinator.loadList(); const loading = coordinator.select("branch-one");
    assert.equal(edit(coordinator).draft, null); assert.equal(edit(coordinator).detail.type, "Loading");
    await coordinator.submit(); assert.equal(updates, 0);
    detail.resolve(ok(fixture({ revision: 9, displayName: "Latest" }))); await loading;
    assert.equal(edit(coordinator).draft?.displayName, "Latest");
    const current = edit(coordinator).detail; assert.ok(current.type === "Ready" && current.value.revision === 9);
  });
  it("creates with exact input, clears the draft and refetches list without synthesizing a selection", async () => {
    const requests: { path: string; method?: string; body?: unknown }[] = [];
    const { coordinator } = setup(new WorkspaceBranchApiClient(async (path, init) => {
      requests.push({ path: String(path), method: init?.method, body: init?.body ? JSON.parse(init.body as string) : undefined });
      return Response.json({ type: "Success", value: init?.method === "POST" ? fixture({ revision: 4 }) : [fixture({ revision: 4 })] }, { status: init?.method === "POST" ? 201 : 200 });
    }));
    coordinator.createDraft(); coordinator.changeDraft({ code: "north", displayName: "North", sortOrder: "5" }); await coordinator.submit();
    assert.deepEqual(requests, [{ path: "/api/branches", method: "POST", body: { code: "north", displayName: "North", sortOrder: 5 } }, { path: "/api/branches", method: "GET", body: undefined }]);
    assert.equal(coordinator.snapshot.editor.type, "Closed"); assert.equal(coordinator.snapshot.saved, true);
    assert.equal(coordinator.snapshot.list.type, "Ready");
  });
  it("updates mutable fields/status using detail revision then refetches detail and list", async () => {
    const requests: { path: string; method?: string; body?: unknown }[] = []; let revision = 7;
    const { coordinator } = setup(new WorkspaceBranchApiClient(async (path, init) => {
      requests.push({ path: String(path), method: init?.method, body: init?.body ? JSON.parse(init.body as string) : undefined });
      if (init?.method === "PATCH") revision = 8;
      const branch = fixture({ revision, displayName: revision === 8 ? "Server normalized" : "Detail name" });
      return Response.json({ type: "Success", value: String(path) === "/api/branches" ? [branch] : branch });
    }));
    await coordinator.select("branch-one"); coordinator.changeDraft({ code: "cannot-change", displayName: "Draft", status: "Inactive", sortOrder: "6" });
    assert.equal(edit(coordinator).draft?.code, "main"); await coordinator.submit();
    assert.deepEqual(requests[1], { path: "/api/branches/branch-one", method: "PATCH", body: { expectedRevision: 7, displayName: "Draft", sortOrder: 6, status: "Inactive" } });
    assert.deepEqual(requests.slice(2).map(({ path }) => path), ["/api/branches", "/api/branches/branch-one"]);
    assert.equal(edit(coordinator).draft?.displayName, "Server normalized");
  });
  it("preserves conflict draft, drops stale authority, loads latest state and requires explicit review without replay", async () => {
    let gets = 0; const revisions: number[] = [];
    const latest = deferred<BranchManagementResult<BranchManagementView>>();
    const { coordinator } = setup({ ...basePort(), get: async () => ++gets === 1 ? ok(fixture({ revision: 3 })) : gets === 2 ? latest.promise : ok(fixture({ revision: 10 })),
      update: async (_id, input) => { revisions.push(input.expectedRevision); return revisions.length === 1 ? { ok: false, kind: "Conflict" } : ok(fixture({ revision: 10 })); } });
    await coordinator.select("branch-one"); coordinator.changeDraft({ displayName: "Keep my draft", status: "Inactive" });
    const submit = coordinator.submit(); await Promise.resolve(); await Promise.resolve();
    assert.equal(edit(coordinator).reviewRequired, true); assert.equal(edit(coordinator).detail.type, "Loading");
    coordinator.reviewLatest(); await coordinator.submit(); assert.deepEqual(revisions, [3]);
    latest.resolve(ok(fixture({ revision: 9, displayName: "Server edit" }))); await submit;
    assert.equal(edit(coordinator).draft?.displayName, "Keep my draft");
    const detail = edit(coordinator).detail; assert.ok(detail.type === "Ready" && detail.value.displayName === "Server edit");
    await coordinator.submit(); assert.deepEqual(revisions, [3]);
    coordinator.reviewLatest(); assert.equal(edit(coordinator).reviewRequired, false);
    await coordinator.submit(); assert.deepEqual(revisions, [3, 9]);
  });
  it("failed conflict refetch remains blocked until successful refetch and review", async () => {
    let gets = 0, writes = 0;
    const { coordinator } = setup({ ...basePort(), get: async () => ++gets === 2 ? { ok: false, kind: "BranchServiceUnavailable" } : ok(fixture({ revision: gets })),
      update: async () => { writes++; return { ok: false, kind: "Conflict" }; } });
    await coordinator.select("branch-one"); coordinator.changeDraft({ displayName: "Draft" }); await coordinator.submit();
    assert.equal(edit(coordinator).detail.type, "Failed"); coordinator.reviewLatest(); await coordinator.submit(); assert.equal(writes, 1);
    await coordinator.loadDetail(); assert.equal(edit(coordinator).reviewRequired, true);
    assert.equal(edit(coordinator).draft?.displayName, "Draft"); coordinator.reviewLatest(); assert.equal(edit(coordinator).reviewRequired, false);
  });
  it("preserves create draft for CodeConflict and other bounded failures", async () => {
    for (const kind of ["CodeConflict", "InvalidInput", "Forbidden", "ForbiddenForRestrictedSession", "OriginNotAllowed", "BranchServiceUnavailable", "NetworkFailure", "MalformedResponse", "UnexpectedResponse"] as const) {
      const { coordinator } = setup({ ...basePort(), create: async () => ({ ok: false, kind }) });
      coordinator.createDraft(); coordinator.changeDraft({ code: "north", displayName: "Keep", sortOrder: "3" });
      const draft = coordinator.snapshot.editor; await coordinator.submit();
      assert.deepEqual(coordinator.snapshot.editor, draft); assert.equal(coordinator.snapshot.failure, kind); assert.equal(coordinator.snapshot.pending, false);
    }
  });
  it("distinguishes authorized empty, forbidden, unavailable and network list states", async () => {
    for (const kind of ["Forbidden", "BranchServiceUnavailable", "NetworkFailure"] as const) {
      const { coordinator } = setup({ ...basePort(), list: async () => ({ ok: false, kind }) }); await coordinator.loadList();
      assert.deepEqual(coordinator.snapshot.list, { type: "Failed", kind });
    }
    const { coordinator } = setup({ ...basePort(), list: async () => ({ ok: true, value: [] }) }); await coordinator.loadList();
    assert.deepEqual(coordinator.snapshot.list, { type: "Ready", value: [] });
  });
  it("duplicate submits, selection, cancel and draft changes are blocked during a pending write", async () => {
    const write = deferred<BranchManagementResult<BranchManagementView>>(); let writes = 0;
    const { coordinator } = setup({ ...basePort(), create: () => { writes++; return write.promise; } });
    coordinator.createDraft(); coordinator.changeDraft({ code: "new", displayName: "Original" });
    const saving = coordinator.submit(); await coordinator.submit(); coordinator.cancel(); coordinator.createDraft();
    await coordinator.select("other"); coordinator.changeDraft({ displayName: "Lost" });
    assert.equal(writes, 1); const editor = coordinator.snapshot.editor; assert.ok(editor.type === "Create" && editor.draft.displayName === "Original");
    write.resolve({ ok: false, kind: "InvalidInput" }); await saving; assert.equal(coordinator.snapshot.pending, false);
  });
  it("validates required fields and integer input without a request or losing values", async () => {
    let writes = 0; const { coordinator } = setup({ ...basePort(), create: async () => { writes++; return ok(); } });
    coordinator.createDraft(); coordinator.changeDraft({ sortOrder: "1.5" }); await coordinator.submit();
    assert.deepEqual(coordinator.snapshot.fields, { code: "required", displayName: "required", sortOrder: "numberRequired" }); assert.equal(writes, 0);
  });
  it("ignores superseded detail responses including stale 401", async () => {
    const old = deferred<BranchManagementResult<BranchManagementView>>(); let firstSignal: AbortSignal | undefined;
    const run = setup({ ...basePort(), get: async (id, signal) => { if (id === "old") { firstSignal = signal; return old.promise; } return ok(fixture({ branchId: id })); } });
    const pending = run.coordinator.select("old"); await run.coordinator.select("new");
    assert.ok(firstSignal?.aborted); old.resolve({ ok: false, kind: "AuthenticationRequired" }); await pending;
    assert.equal(edit(run.coordinator).branchId, "new"); assert.equal(run.expired(), 0);
  });
  it("ignores superseded list responses and aborts them", async () => {
    const old = deferred<BranchManagementResult<readonly BranchManagementView[]>>(); let count = 0;
    const { coordinator } = setup({ ...basePort(), list: async () => ++count === 1 ? old.promise : { ok: true, value: [] } });
    const pending = coordinator.loadList(); await coordinator.loadList(); old.resolve({ ok: false, kind: "Forbidden" }); await pending;
    assert.deepEqual(coordinator.snapshot.list, { type: "Ready", value: [] });
  });
  it("disposal clears state and suppresses late mutation results and redirects", async () => {
    for (const response of [ok(), { ok: false, kind: "AuthenticationRequired" } as const]) {
      const write = deferred<BranchManagementResult<BranchManagementView>>();
      const run = setup({ ...basePort(), create: () => write.promise });
      run.coordinator.createDraft(); run.coordinator.changeDraft({ code: "new", displayName: "Draft" });
      const saving = run.coordinator.submit(); run.coordinator.dispose(); const count = run.changes(); write.resolve(response); await saving;
      assert.equal(run.changes(), count); assert.equal(run.expired(), 0); assert.equal(run.coordinator.snapshot.editor.type, "Closed");
    }
  });
  it("current 401 clears data and drafts, aborts requests, expires once and blocks later requests", async () => {
    let calls = 0;
    const run = setup({ ...basePort(), list: async () => { calls++; return { ok: false, kind: "AuthenticationRequired" }; } });
    run.coordinator.createDraft(); run.coordinator.changeDraft({ displayName: "Private" }); await run.coordinator.loadList();
    assert.equal(run.expired(), 1); assert.equal(run.coordinator.snapshot.editor.type, "Closed");
    await run.coordinator.loadList(); run.coordinator.createDraft(); await run.coordinator.submit(); assert.equal(calls, 1);
  });
  it("a successful write followed by failed detail refresh cannot reuse the old revision", async () => {
    let reads = 0, writes = 0;
    const { coordinator } = setup({ ...basePort(), get: async () => ++reads === 1 ? ok() : { ok: false, kind: "BranchServiceUnavailable" },
      update: async () => { writes++; return ok(); } });
    await coordinator.select("branch-one"); await coordinator.submit();
    assert.equal(edit(coordinator).draft, null); assert.equal(edit(coordinator).detail.type, "Failed"); assert.equal(coordinator.snapshot.saved, true);
    await coordinator.submit(); assert.equal(writes, 1);
  });
  it("not-found detail never becomes editable or an empty authorized branch", async () => {
    const { coordinator } = setup({ ...basePort(), get: async () => ({ ok: false, kind: "BranchNotFound" }) }); await coordinator.select("missing");
    assert.deepEqual(edit(coordinator).detail, { type: "Failed", kind: "BranchNotFound" }); assert.equal(edit(coordinator).draft, null);
  });
});
