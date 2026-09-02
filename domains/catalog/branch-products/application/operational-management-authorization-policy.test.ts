import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import {
  permittedBranchPricingActions,
  permittedBranchReferenceCostActions,
  permittedListingManagementActions,
  permittedWorkspacePricingActions,
  permittedWorkspaceReferenceCostActions,
} from "./operational-management-authorization-policy";

const context = (permissions: readonly string[]): TrustedActorContext => ({
  workspaceId: "workspace-a",
  actorId: "actor-a",
  role: "Staff",
  permissions,
  branchScope: { type: "AllBranches" },
  authorizationVersion: 1,
});

describe("Catalog Branch Product operational authorization policy", () => {
  it("projects only permission-authorized potential actions", () => {
    const actor = context([
      "catalog.product.edit",
      "pricing.manage",
      "pricing.branchOverride.manage",
      "referenceCost.manage",
      "referenceCost.branchOverride.manage",
    ]);
    assert.deepEqual(permittedListingManagementActions(actor), ["SetListed", "SetUnlisted"]);
    assert.deepEqual(permittedWorkspacePricingActions(actor), ["Set", "Clear"]);
    assert.deepEqual(permittedWorkspaceReferenceCostActions(actor), ["Set", "Clear"]);
    assert.deepEqual(permittedBranchPricingActions(actor), ["SetOverride", "ClearOverride"]);
    assert.deepEqual(permittedBranchReferenceCostActions(actor), ["SetOverride", "ClearOverride"]);
  });

  it("keeps singular/plural Listing and every Pricing authority independent", () => {
    assert.deepEqual(permittedListingManagementActions(context(["catalog.products.edit"])), ["SetListed", "SetUnlisted"]);
    assert.deepEqual(permittedListingManagementActions(context([])), []);
    assert.deepEqual(permittedWorkspacePricingActions(context(["pricing.view"])), []);
    assert.deepEqual(permittedWorkspaceReferenceCostActions(context(["referenceCost.view"])), []);
    assert.deepEqual(permittedBranchPricingActions(context(["pricing.manage"])), []);
    assert.deepEqual(permittedBranchReferenceCostActions(context(["referenceCost.manage"])), []);
  });
});
