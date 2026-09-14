import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalManagementCapabilitiesFixture as fixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { operationsSectionHref, parseOperationsSection, resolveOperationsSection } from "./operations-section-state";

describe("Operations top-level section state", () => {
  it("accepts only one exact section value, with no normalization of invalid input", () => {
    for (const [value, expected] of [["branches", "Branches"], ["inventory", "Inventory"], ["pricing", "Pricing"]] as const) {
      assert.equal(parseOperationsSection([value]), expected);
    }
    for (const values of [[], [""], ["Inventory"], [" inventory "], ["listing"], ["branches", "branches"], ["inventory", "pricing"]]) {
      assert.equal(parseOperationsSection(values), null);
    }
  });
  it("falls back to the first currently available section for absent, invalid, duplicate or unavailable requests", () => {
    const value = fixture(); value.inventory.canReceive = true; value.referenceCost.canView = true;
    for (const values of [[], ["unknown"], ["branches"], ["pricing", "pricing"], ["inventory", "pricing"]]) {
      assert.deepEqual(resolveOperationsSection(values, value), { sections: ["Inventory", "Pricing"], selected: "Inventory" });
    }
    assert.equal(resolveOperationsSection(["pricing"], value).selected, "Pricing");
    value.branches.canView = true;
    assert.deepEqual(resolveOperationsSection([], value), { sections: ["Branches", "Inventory", "Pricing"], selected: "Branches" });
  });
  it("selects nothing for all-false capabilities regardless of URL or extra role", () => {
    assert.deepEqual(resolveOperationsSection(["pricing"], { ...fixture(), ...{ role: "Owner" } }), { sections: [], selected: null });
  });
  it("creates only section links and never propagates other query input", () => {
    const input = new URLSearchParams("section=inventory&purpose=Transfer&branchId=foreign&productId=foreign&workspaceId=foreign&role=Owner&canManage=true");
    assert.equal(operationsSectionHref(parseOperationsSection(input.getAll("section"))!), "/operations?section=inventory");
    assert.equal(operationsSectionHref("Branches"), "/operations?section=branches");
    assert.equal(operationsSectionHref("Pricing"), "/operations?section=pricing");
    assert.equal(parseOperationsSection(new URLSearchParams("purpose=Inventory").getAll("section")), null);
  });
});
