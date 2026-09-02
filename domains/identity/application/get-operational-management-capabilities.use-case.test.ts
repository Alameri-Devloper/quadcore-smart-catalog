import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { ownerEffectivePermissionCodes } from "../domain/permission";
import { GetOperationalManagementCapabilitiesUseCase } from "./get-operational-management-capabilities.use-case";

const context = (
  permissions: readonly string[],
  role: TrustedActorContext["role"] = "Staff",
): TrustedActorContext => Object.freeze({
  workspaceId: "workspace-secret",
  actorId: "actor-secret",
  role,
  permissions: Object.freeze([...permissions]),
  branchScope: Object.freeze({ type: "SelectedBranches", branchIds: Object.freeze(["branch-secret"]) }),
  authorizationVersion: 7,
});

const execute = (permissions: readonly string[]) =>
  new GetOperationalManagementCapabilitiesUseCase().execute(context(permissions));

describe("GetOperationalManagementCapabilitiesUseCase", () => {
  it("accepts either singular or plural Listing edit without aliasing the codes", () => {
    assert.equal(execute(["catalog.product.edit"]).listing.canManage, true);
    assert.equal(execute(["catalog.products.edit"]).listing.canManage, true);
    assert.equal(execute([]).listing.canManage, false);
  });

  it("keeps Pricing view and management independent", () => {
    const viewer = execute(["pricing.view"]);
    assert.deepEqual(viewer.pricing, {
      canView: true,
      canViewWholesale: false,
      canManageWorkspace: false,
      canManageBranchOverrides: false,
    });

    const manager = execute(["pricing.manage"]);
    assert.equal(manager.pricing.canView, false);
    assert.equal(manager.pricing.canManageWorkspace, true);
  });

  it("requires both Pricing view and Wholesale view for the composed ordinary read", () => {
    assert.equal(execute(["pricing.view", "pricing.wholesale.view"]).pricing.canViewWholesale, true);
    assert.equal(execute(["pricing.view"]).pricing.canViewWholesale, false);
    assert.equal(execute(["pricing.wholesale.view"]).pricing.canViewWholesale, false);
  });

  it("requires both Pricing view and Reference Cost view for ordinary Reference Cost", () => {
    assert.equal(execute(["pricing.view", "referenceCost.view"]).referenceCost.canView, true);
    assert.equal(execute(["referenceCost.view"]).referenceCost.canView, false);
    const manager = execute(["referenceCost.manage"]);
    assert.equal(manager.referenceCost.canView, false);
    assert.equal(manager.referenceCost.canManageWorkspace, true);
  });

  it("keeps Pricing and Reference Cost Branch override management independent", () => {
    const pricing = execute(["pricing.branchOverride.manage"]);
    assert.equal(pricing.pricing.canManageBranchOverrides, true);
    assert.equal(pricing.pricing.canView, false);
    assert.equal(pricing.referenceCost.canManageBranchOverrides, false);

    const referenceCost = execute(["referenceCost.branchOverride.manage"]);
    assert.equal(referenceCost.referenceCost.canManageBranchOverrides, true);
    assert.equal(referenceCost.referenceCost.canView, false);
    assert.equal(referenceCost.pricing.canManageBranchOverrides, false);
  });

  it("treats quantity view as semantic availability while preserving quantity disclosure", () => {
    const availability = execute(["inventory.availability.view"]);
    assert.equal(availability.inventory.canViewAvailability, true);
    assert.equal(availability.inventory.canViewQuantities, false);

    const quantity = execute(["inventory.quantity.view"]);
    assert.equal(quantity.inventory.canViewAvailability, true);
    assert.equal(quantity.inventory.canViewQuantities, true);
  });

  it("does not infer Inventory disclosure from mutation authority", () => {
    const capabilities = execute([
      "inventory.receive",
      "inventory.issue",
      "inventory.reserve",
      "inventory.damage",
      "inventory.transfer",
      "inventory.adjust",
    ]);
    assert.equal(capabilities.inventory.canViewAvailability, false);
    assert.equal(capabilities.inventory.canViewQuantities, false);
    assert.deepEqual(capabilities.inventory, {
      canViewAvailability: false,
      canViewQuantities: false,
      canReceive: true,
      canIssue: true,
      canReserve: true,
      canTransfer: true,
      canManageDamage: true,
      canAdjust: true,
    });
  });

  it("preserves Owner behavior through the existing effective permission authority", () => {
    const capabilities = new GetOperationalManagementCapabilitiesUseCase().execute(
      context(ownerEffectivePermissionCodes(), "Owner"),
    );
    const values = JSON.stringify(capabilities).match(/true|false/g) ?? [];
    assert.ok(values.length > 0);
    assert.ok(values.every((value) => value === "true"));
  });

  it("keeps Branch view and manage independent", () => {
    assert.deepEqual(execute(["workspace.branches.view"]).branches, { canView: true, canManage: false });
    assert.deepEqual(execute(["workspace.branches.manage"]).branches, { canView: false, canManage: true });
  });

});
