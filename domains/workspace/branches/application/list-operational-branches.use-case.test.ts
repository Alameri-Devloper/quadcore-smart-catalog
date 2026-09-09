import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { GetOperationalManagementCapabilitiesUseCase } from "../../../identity/application/get-operational-management-capabilities.use-case";
import { ownerEffectivePermissionCodes } from "../../../identity/domain/permission";
import { Branch, type BranchStatus } from "../domain/branch";
import type { BranchRepository, BranchUnitOfWork } from "../ports/branch-unit-of-work.port";
import { GetBranchUseCase, ListBranchesUseCase } from "./branch.use-cases";
import { ListOperationalBranchesUseCase } from "./list-operational-branches.use-case";

const purposes = ["Listing", "Inventory", "Transfer", "BranchPricing", "BranchReferenceCost"] as const;
const qualifying = [
  ["Listing", "catalog.product.edit"], ["Listing", "catalog.products.edit"],
  ["Inventory", "inventory.availability.view"], ["Inventory", "inventory.quantity.view"],
  ["Inventory", "inventory.receive"], ["Inventory", "inventory.issue"],
  ["Inventory", "inventory.reserve"], ["Inventory", "inventory.damage"],
  ["Inventory", "inventory.adjust"], ["Transfer", "inventory.transfer"],
  ["BranchPricing", "pricing.branchOverride.manage"],
  ["BranchReferenceCost", "referenceCost.branchOverride.manage"],
] as const;

const actor = (permissions: readonly string[], branchScope: TrustedActorContext["branchScope"] = { type: "AllBranches" }): TrustedActorContext => ({
  workspaceId: "workspace-a", actorId: "staff-a", role: "Staff", permissions, branchScope, authorizationVersion: 3,
});
const branch = (branchId: string, status: BranchStatus = "Active", workspaceId = "workspace-a") => Branch.rehydrate({
  workspaceId, branchId, code: branchId, displayName: branchId, status,
  sortOrder: 9, revision: 4, createdAt: new Date("2026-09-01T00:00:00Z"), updatedAt: new Date("2026-09-02T00:00:00Z"),
});
const forbiddenAccess = async (): Promise<never> => { throw new Error("Unexpected repository write, lock, find or audit"); };
const fixture = (rows: readonly Branch[] = [branch("branch-a")], faultyTenant = false) => {
  let executions = 0;
  const workspaces: string[] = [];
  const branches: BranchRepository = {
    list: async (workspaceId) => {
      workspaces.push(workspaceId);
      return faultyTenant ? rows : rows.filter((value) => value.value.workspaceId === workspaceId);
    },
    find: forbiddenAccess, create: forbiddenAccess, update: forbiddenAccess,
  };
  const unitOfWork: BranchUnitOfWork = {
    execute: (work) => { executions++; return work({ branches, audit: { append: forbiddenAccess } }); },
  };
  return { useCase: new ListOperationalBranchesUseCase(unitOfWork), unitOfWork, workspaces, get executions() { return executions; } };
};

describe("ListOperationalBranchesUseCase", () => {
  for (const [purpose, permission] of qualifying) {
    it(`allows ${permission} alone for ${purpose} with only the four selector fields`, async () => {
      const app = fixture();
      const result = await app.useCase.execute({ context: actor([permission]), purpose });
      assert.deepEqual(result, { ok: true, value: [{ branchId: "branch-a", code: "branch-a", displayName: "branch-a", status: "Active" }] });
      assert.deepEqual(app.workspaces, ["workspace-a"]);
      assert.equal(app.executions, 1);
      if (result.ok) {
        assert.deepEqual(Object.keys(result.value[0]!).sort(), ["branchId", "code", "displayName", "status"]);
        assert.ok(Object.isFrozen(result.value));
        assert.ok(Object.isFrozen(result.value[0]));
      }
    });
  }

  it("rejects absent, unrelated, general Branch and view-only authority before UoW access", async () => {
    for (const purpose of purposes) {
      for (const permissions of [[], ["workspace.audit.view"], ["workspace.branches.view"], ["workspace.branches.manage"], ["catalog.products.view"], ["pricing.view"], ["referenceCost.view"], ["pricing.manage"], ["referenceCost.manage"]]) {
        const app = fixture();
        assert.deepEqual(await app.useCase.execute({ context: actor(permissions), purpose }), { ok: false, error: "Forbidden" });
        assert.equal(app.executions, 0);
        assert.deepEqual(app.workspaces, []);
      }
    }
  });

  it("keeps Transfer, Inventory, Listing, Pricing and Reference Cost purposes independent", async () => {
    for (const [authorizedPurpose, permission] of qualifying) {
      for (const purpose of purposes.filter((value) => value !== authorizedPurpose)) {
        const app = fixture();
        assert.deepEqual(await app.useCase.execute({ context: actor([permission]), purpose }), { ok: false, error: "Forbidden" }, `${permission}:${purpose}`);
        assert.equal(app.executions, 0);
      }
    }
  });

  it("validates untrusted purpose before accessing persistence", async () => {
    for (const purpose of ["", " ", "Listing ", "listing", "Unknown", "WorkspacePricing", "WorkspaceReferenceCost", "Reservation", "SourceTransfer", "DestinationTransfer", "toString", "__proto__"]) {
      const app = fixture();
      assert.deepEqual(await app.useCase.execute({ context: actor(ownerEffectivePermissionCodes()), purpose }), { ok: false, error: "InvalidInput" });
      assert.equal(app.executions, 0);
    }
  });

  it("uses real Owner effective permissions without a role-only bypass", async () => {
    for (const purpose of purposes) {
      const app = fixture();
      const owner = { ...actor(ownerEffectivePermissionCodes()), role: "Owner" as const };
      assert.ok((await app.useCase.execute({ context: owner, purpose })).ok);
      assert.deepEqual(await app.useCase.execute({ context: { ...owner, permissions: [] }, purpose }), { ok: false, error: "Forbidden" });
      assert.equal(app.executions, 1);
    }
  });

  it("preserves repository relative order after selected-scope filtering without a comparator", async () => {
    const app = fixture([branch("z"), branch("excluded"), branch("a", "Inactive"), branch("m"), branch("foreign", "Active", "workspace-b")]);
    const result = await app.useCase.execute({
      context: actor(["inventory.receive"], { type: "SelectedBranches", branchIds: ["m", "a", "z", "missing", "foreign"] }), purpose: "Inventory",
    });
    assert.ok(result.ok);
    if (result.ok) assert.deepEqual(result.value.map((value) => [value.branchId, value.status]), [["z", "Active"], ["a", "Inactive"], ["m", "Active"]]);
    assert.deepEqual(app.workspaces, ["workspace-a"]);
  });

  it("keeps AllBranches within the current Workspace and re-evaluates a changed context", async () => {
    const app = fixture([branch("z"), branch("a"), branch("foreign", "Inactive", "workspace-b")]);
    const context = actor(["inventory.receive"]);
    const first = await app.useCase.execute({ context, purpose: "Inventory" });
    const second = await app.useCase.execute({ context: { ...context, workspaceId: "workspace-b" }, purpose: "Inventory" });
    assert.ok(first.ok && second.ok);
    if (first.ok && second.ok) {
      assert.deepEqual(first.value.map((value) => value.branchId), ["z", "a"]);
      assert.deepEqual(second.value.map((value) => value.branchId), ["foreign"]);
    }
    assert.deepEqual(app.workspaces, ["workspace-a", "workspace-b"]);
    assert.deepEqual(await app.useCase.execute({ context: actor([]), purpose: "Inventory" }), { ok: false, error: "Forbidden" });
    assert.equal(app.executions, 2);
  });

  it("returns authorized empty collections for empty, nonexistent or foreign-only selected scope", async () => {
    for (const branchIds of [[], ["missing"], ["foreign"]]) {
      const app = fixture([branch("branch-a"), branch("foreign", "Active", "workspace-b")]);
      assert.deepEqual(await app.useCase.execute({ context: actor(["inventory.reserve"], { type: "SelectedBranches", branchIds }), purpose: "Inventory" }), { ok: true, value: [] });
    }
    assert.deepEqual(await fixture([]).useCase.execute({ context: actor(["inventory.receive"]), purpose: "Inventory" }), { ok: true, value: [] });
  });

  it("retains Active, Inactive and mixed collections for every purpose and observes lifecycle changes", async () => {
    for (const purpose of purposes) {
      for (const statuses of [["Active"], ["Inactive"], ["Inactive", "Active"]] as const) {
        const rows = statuses.map((status, index) => branch(`branch-${index}`, status));
        const result = await fixture(rows).useCase.execute({ context: actor(ownerEffectivePermissionCodes()), purpose });
        assert.ok(result.ok);
        if (result.ok) assert.deepEqual(result.value.map((value) => value.status), statuses);
      }
    }
    const value = branch("branch-a");
    const app = fixture([value]);
    const command = { context: actor(["inventory.transfer"]), purpose: "Transfer" };
    assert.ok((await app.useCase.execute(command)).ok);
    value.update({ status: "Inactive" }, new Date("2026-09-03T00:00:00Z"));
    const result = await app.useCase.execute(command);
    assert.ok(result.ok);
    if (result.ok) assert.equal(result.value[0]?.status, "Inactive");
  });

  it("fails closed on a foreign row even when selected scope would exclude it", async () => {
    for (const scope of [{ type: "AllBranches" }, { type: "SelectedBranches", branchIds: ["branch-a"] }, { type: "SelectedBranches", branchIds: [] }] as const) {
      const app = fixture([branch("branch-a"), branch("foreign", "Active", "workspace-b")], true);
      await assert.rejects(app.useCase.execute({ context: actor(["inventory.receive"], scope), purpose: "Inventory" }), { message: "InvalidOperationalBranchWorkspace" });
    }
  });

  it("closes the A1 discovery gap while general Branch List/Get remain forbidden or non-disclosing", async () => {
    for (const permissions of [["inventory.receive"], ["catalog.product.edit"]]) {
      const context = actor(permissions);
      const capabilities = new GetOperationalManagementCapabilitiesUseCase().execute(context);
      assert.deepEqual(capabilities.branches, { canView: false, canManage: false });
      assert.ok(capabilities.inventory.canReceive || capabilities.listing.canManage);
      const app = fixture();
      assert.deepEqual(await new ListBranchesUseCase(app.unitOfWork).execute({ context }), { ok: false, error: "Forbidden" });
      assert.deepEqual(await new GetBranchUseCase(app.unitOfWork).execute({ context, branchId: "branch-a" }), { ok: false, error: "NotFound" });
      assert.equal(app.executions, 0);
      assert.ok((await app.useCase.execute({ context, purpose: permissions[0] === "inventory.receive" ? "Inventory" : "Listing" })).ok);
    }
  });
});
