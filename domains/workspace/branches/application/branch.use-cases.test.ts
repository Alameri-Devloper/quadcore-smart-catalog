import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { CreateBranchUseCase, GetBranchUseCase, ListBranchesUseCase, UpdateBranchUseCase } from "./branch.use-cases";
import type { Branch } from "../domain/branch";
import type { BranchRepository, BranchUnitOfWork } from "../ports/branch-unit-of-work.port";

const owner = (workspaceId = "workspace-a"): TrustedActorContext => ({ workspaceId, actorId: "owner", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 });
const staff = (branchIds: readonly string[]): TrustedActorContext => ({ workspaceId: "workspace-a", actorId: "staff", role: "Staff", permissions: ["workspace.branches.view"], branchScope: { type: "SelectedBranches", branchIds }, authorizationVersion: 1 });

class MemoryBranches implements BranchRepository {
  readonly values = new Map<string, Branch>();
  find(workspaceId: string, branchId: string) { const value = this.values.get(`${workspaceId}:${branchId}`); return Promise.resolve(value ?? null); }
  list(workspaceId: string) { return Promise.resolve(Object.freeze([...this.values.values()].filter((value) => value.value.workspaceId === workspaceId))); }
  create(branch: Branch) { if ([...this.values.values()].some((value) => value.value.workspaceId === branch.value.workspaceId && value.value.code === branch.value.code)) return Promise.resolve("CodeConflict" as const); const key = `${branch.value.workspaceId}:${branch.value.branchId}`; if (this.values.has(key)) return Promise.resolve("IdConflict" as const); this.values.set(key, branch); return Promise.resolve("Created" as const); }
  update(branch: Branch, expectedRevision: number) { const key = `${branch.value.workspaceId}:${branch.value.branchId}`; const current = this.values.get(key); if (!current) return Promise.resolve("NotFound" as const); if (current.value.revision !== expectedRevision + 1) return Promise.resolve("Conflict" as const); this.values.set(key, branch); return Promise.resolve("Updated" as const); }
}

const fixture = () => { const branches = new MemoryBranches(); const unitOfWork: BranchUnitOfWork = { execute: (work) => work({ branches, audit: { append: async () => undefined } }) }; const dependencies = { unitOfWork, clock: { now: () => new Date("2026-08-20T10:00:00Z") }, identifiers: { next: () => "branch-a" } }; return { branches, create: new CreateBranchUseCase(dependencies), update: new UpdateBranchUseCase(dependencies), list: new ListBranchesUseCase(unitOfWork), get: new GetBranchUseCase(unitOfWork) }; };

describe("Branch lifecycle", () => {
  it("creates a normalized stable code and rejects a duplicate within the Workspace", async () => { const app = fixture(); const created = await app.create.execute({ context: owner(), code: " Main Store ", displayName: "المتجر الرئيسي", sortOrder: 1 }); assert.ok(created.ok); if (!created.ok) return; assert.equal(created.value.code, "main-store"); const duplicate = await app.create.execute({ context: owner(), code: "MAIN STORE", displayName: "Other", sortOrder: 2 }); assert.deepEqual(duplicate, { ok: false, error: "CodeConflict" }); const other = await app.create.execute({ context: owner("workspace-b"), code: "MAIN STORE", displayName: "Other", sortOrder: 2 }); assert.ok(other.ok); });
  it("renames and deactivates without changing Branch ID or code", async () => { const app = fixture(); const created = await app.create.execute({ context: owner(), code: "main", displayName: "Main", sortOrder: 0 }); assert.ok(created.ok); if (!created.ok) return; const changed = await app.update.execute({ context: owner(), branchId: created.value.branchId, expectedRevision: created.value.revision, displayName: "Main Renamed", status: "Inactive" }); assert.ok(changed.ok); if (!changed.ok) return; assert.equal(changed.value.branchId, created.value.branchId); assert.equal(changed.value.code, created.value.code); assert.equal(changed.value.status, "Inactive"); assert.ok((await app.get.execute({ context: owner(), branchId: created.value.branchId })).ok); });
  it("filters reads through trusted selected-Branch scope", async () => { const app = fixture(); await app.create.execute({ context: owner(), code: "main", displayName: "Main", sortOrder: 0 }); assert.equal((await app.list.execute({ context: staff(["branch-a"]) })).ok, true); assert.deepEqual(await app.get.execute({ context: staff(["branch-b"]), branchId: "branch-a" }), { ok: false, error: "NotFound" }); });
});
