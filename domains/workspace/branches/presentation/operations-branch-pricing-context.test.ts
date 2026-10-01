import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalProductFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { branchPricingSelectionKey, operationsBranchPricingTarget } from "./operations-branch-pricing-context";
import type { OperationalProductQuery } from "../../../catalog/query/presentation/operational-product-selector.types";

const query: OperationalProductQuery = { q: "", productCursor: null, productId: "product-z", issue: null };
const context = { section: "Pricing", pricingScope: "branch", pricingField: "prices" } as const;
const lifecycle = {};
const branches = (status: "Active" | "Inactive" = "Active") => ({ type: "Ready" as const, purpose: "BranchPricing" as const,
  options: [operationalBranchFixture({ status })], availability: status === "Active" ? "Available" as const : "AllInactive" as const });

describe("Branch pricing Operations context", () => {
  it("retains a target only for the exact actor/context/Branch/Product/search/page key", () => {
    const product = operationalProductFixture({ branchId: "branch-main", listingStatus: "Unlisted" });
    const known = { lifecycle, key: branchPricingSelectionKey(context, "branch-main", query), product };
    assert.deepEqual(operationsBranchPricingTarget(context, "branch-main", query, branches(), lifecycle, known), {
      branchId: "branch-main", branchLabel: "Main Branch", productId: "product-z", productLabel: "Workspace Product",
      surface: "prices", inspectionOnly: false,
    });
    assert.equal(operationsBranchPricingTarget(context, "branch-main", { ...query, q: "changed" }, branches(), lifecycle, known), null);
    assert.equal(operationsBranchPricingTarget(context, "branch-main", { ...query, productCursor: "next" }, branches(), lifecycle, known), null);
    assert.equal(operationsBranchPricingTarget({ ...context, pricingField: "reference-cost" }, "branch-main", query, branches(), lifecycle, known), null);
    assert.equal(operationsBranchPricingTarget(context, "branch-main", query, branches(), {}, known), null);
    assert.equal(operationsBranchPricingTarget(context, null, query, branches(), lifecycle, known), null);
  });

  it("preserves a known inactive branch only for existing-resource inspection", () => {
    const product = operationalProductFixture({ branchId: "branch-main", listingStatus: "Unlisted" });
    const known = { lifecycle, key: branchPricingSelectionKey(context, "branch-main", query), product };
    assert.equal(operationsBranchPricingTarget(context, "branch-main", query, branches("Inactive"), lifecycle, known)?.inspectionOnly, true);
    assert.equal(operationsBranchPricingTarget(context, "branch-main", query, branches("Inactive"), lifecycle, null), null);
  });

  it("requires the A6 purpose that exactly matches the selected surface", () => {
    const reference = { ...context, pricingField: "reference-cost" } as const;
    const product = operationalProductFixture({ branchId: "branch-main", listingStatus: "Unlisted" });
    const known = { lifecycle, key: branchPricingSelectionKey(reference, "branch-main", query), product };
    assert.equal(operationsBranchPricingTarget(reference, "branch-main", query, branches(), lifecycle, known), null);
  });
});
