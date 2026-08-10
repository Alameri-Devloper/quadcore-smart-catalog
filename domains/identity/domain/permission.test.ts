import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PERMISSION_REGISTRY,
  PERMISSION_TEMPLATES,
  ownerEffectivePermissionCodes,
  resolvePermissionTemplate,
  staffEffectivePermissionCodes,
  validateStaffPermissionCodes,
} from "./permission";

describe("Identity permission registry and templates", () => {
  it("keeps code-owned definitions unique and preserves existing Product Entry contracts", () => {
    const codes = PERMISSION_REGISTRY.map(({ code }) => code);
    assert.equal(new Set(codes).size, codes.length);
    for (const existing of [
      "catalog.product.create",
      "catalog.product.edit",
      "catalog.product-entry-submission.read",
      "catalog.product-entry-media.upload",
      "catalog.product.reference-cost.read",
    ]) assert.ok(codes.includes(existing as never));
  });

  it("derives complete Owner authority without editable rows", () => {
    assert.deepEqual(ownerEffectivePermissionCodes(), PERMISSION_REGISTRY.map(({ code }) => code).sort());
    assert.ok(ownerEffectivePermissionCodes().includes("workspace.members.manage"));
  });

  it("validates deterministic explicit Staff permissions", () => {
    assert.deepEqual(
      staffEffectivePermissionCodes(["pricing.view", "catalog.product.create"]),
      ["catalog.product.create", "pricing.view"],
    );
    assert.throws(() => validateStaffPermissionCodes(["unknown.permission"]), /InvalidPermissionCode/);
    assert.throws(() => validateStaffPermissionCodes(["pricing.view", "pricing.view"]), /DuplicatePermissionCode/);
    assert.throws(() => validateStaffPermissionCodes(["workspace.members.manage"]), /InvalidPermissionCode/);
  });

  it("copies the fixed Standard Catalog Staff defaults without sensitive/admin defaults", () => {
    const template = PERMISSION_TEMPLATES[0];
    assert.equal(template.id, "standard-catalog-staff");
    assert.deepEqual(resolvePermissionTemplate(template.id), template.permissionCodes);
    for (const excluded of [
      "workspace.audit.view",
      "workspace.settings.manage",
      "catalog.productMedia.reconciliation.manage",
      "referenceCost.manage",
      "inventory.adjust",
    ]) assert.equal(template.permissionCodes.includes(excluded as never), false);
    assert.throws(() => resolvePermissionTemplate("unknown-template"), /InvalidPermissionTemplate/);
  });
});
