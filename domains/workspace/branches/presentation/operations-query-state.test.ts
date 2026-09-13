import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { operationalBranchId, operationalBranchPurpose, operationsContextHref, resolveOperationsQuery, type OperationsContext } from "./operations-query-state";

const capabilities = () => { const value = operationalManagementCapabilitiesFixture(); value.branches.canView = value.listing.canManage = value.inventory.canReceive = value.pricing.canView = true; return value; };
const resolve = (query: string) => resolveOperationsQuery(new URLSearchParams(query), capabilities());
describe("Bounded Operations context and purpose derivation", () => {
  for (const [query, purpose] of [
    ["section=branches&branchTool=listing", "Listing"], ["section=inventory&inventoryTool=stock", "Inventory"],
    ["section=inventory&inventoryTool=reservations", "Inventory"], ["section=inventory&inventoryTool=transfer", "Transfer"],
    ["section=pricing&pricingScope=branch&pricingField=prices", "BranchPricing"],
    ["section=pricing&pricingScope=branch&pricingField=reference-cost", "BranchReferenceCost"],
    ["section=pricing&pricingScope=workspace&pricingField=prices", null],
    ["section=pricing&pricingScope=workspace&pricingField=reference-cost", null],
    ["section=branches&branchTool=details", null],
  ] as const) it(`maps ${query} to ${purpose ?? "no A6"}`, () => {
    assert.equal(operationalBranchPurpose(resolve(query).context), purpose);
    assert.equal(operationalBranchPurpose(resolve(`${query}&purpose=Anything`).context), purpose);
  });
  it("reads only nine allow-listed query keys and never reads URL purpose or authority", () => {
    const read: string[] = [];
    resolveOperationsQuery({ getAll(key) { read.push(key); return []; } }, capabilities());
    assert.deepEqual(read, ["section", "branchTool", "inventoryTool", "pricingScope", "pricingField", "branchId", "q", "productCursor", "productId"]);
    const resolved = resolve("section=inventory&purpose=Transfer&branchId=branch-a&actor=foreign&productId=p&q=term");
    assert.equal(operationalBranchPurpose(resolved.context), "Inventory");
    assert.equal(operationsContextHref(resolved.context!, resolved.branchId), "/operations?section=inventory&inventoryTool=stock&branchId=branch-a");
  });
  it("normalizes missing/invalid values and clears incompatible dependent selection", () => {
    assert.deepEqual(resolve("").context, { section: "Branches", branchTool: "details" });
    assert.deepEqual(resolve("section=inventory&inventoryTool=WRONG&branchId=a").context, { section: "Inventory", inventoryTool: "stock" });
    assert.equal(resolve("section=inventory&inventoryTool=WRONG&branchId=a").branchId, null);
    assert.equal(resolve("section=branches&branchTool=listing&inventoryTool=stock&branchId=a").branchId, null);
    assert.equal(resolve("section=inventory&inventoryTool=transfer&pricingScope=branch&branchId=a").branchId, null);
    assert.equal(resolve("section=pricing&pricingScope=branch&branchTool=listing&branchId=a").branchId, null);
    assert.equal(resolve("section=pricing&pricingScope=unknown&branchId=a").branchId, null);
    assert.equal(resolve("section=pricing&pricingScope=branch&pricingField=unknown&branchId=a").branchId, null);
    for (const query of ["section=branches&branchTool=details", "section=pricing&pricingScope=workspace", "branchTool=listing", "section=invalid", "section=inventory&section=branches"]) assert.equal(resolve(`${query}&branchId=a`).branchId, null);
  });
  it("invalidates every duplicated supported key and never retains dependent branch selection", () => {
    for (const query of [
      "section=inventory&section=inventory&inventoryTool=transfer", "section=branches&branchTool=listing&branchTool=listing",
      "section=inventory&inventoryTool=transfer&inventoryTool=transfer", "section=pricing&pricingScope=branch&pricingScope=branch",
      "section=pricing&pricingScope=branch&pricingField=prices&pricingField=prices", "section=branches&branchTool=listing&branchId=b",
    ]) assert.equal(resolve(`${query}&branchId=a`).branchId, null);
    // Duplicated selection must not switch a valid Listing context to General management.
    assert.equal(operationalBranchPurpose(resolve("section=branches&branchTool=listing&branchId=a&branchId=b").context), "Listing");
  });
  it("falls back to an available section without adopting another section's tool or branch", () => {
    const value = operationalManagementCapabilitiesFixture(); value.inventory.canTransfer = true;
    const result = resolveOperationsQuery(new URLSearchParams("section=branches&branchTool=listing&inventoryTool=transfer&branchId=a"), value);
    assert.deepEqual(result, { sections: ["Inventory"], context: { section: "Inventory", inventoryTool: "stock" }, branchId: null, products: { q: "", productCursor: null, productId: null, issue: null } });
    assert.deepEqual(resolveOperationsQuery(new URLSearchParams("section=inventory"), operationalManagementCapabilitiesFixture()), { sections: [], context: null, branchId: null, products: { q: "", productCursor: null, productId: null, issue: null } });
    assert.equal(operationalBranchPurpose(null), null);
  });
  it("validates URL identifier syntax without treating valid IDs as membership", () => {
    for (const id of ["branch-a", "c9de791e-3390-4da3-84c7-7b2c887fc21a", "a_B-5"]) assert.equal(operationalBranchId(id), id);
    for (const id of [undefined, null, 4, "", " ", "a b", "..", "x/y", "a?b", "#x", "a\n", "a".repeat(129)]) assert.equal(operationalBranchId(id), null);
    assert.equal(resolve("section=inventory&branchId=not-returned").branchId, "not-returned");
    assert.equal(resolve("section=inventory&branchId=x%2Fy").branchId, null);
  });
  it("serializes only compatible context and clears branch selection on context navigation", () => {
    const contexts: OperationsContext[] = [
      { section: "Branches", branchTool: "listing" }, { section: "Branches", branchTool: "details" },
      { section: "Inventory", inventoryTool: "transfer" }, { section: "Inventory", inventoryTool: "reservations" },
      { section: "Pricing", pricingScope: "workspace", pricingField: "reference-cost" },
      { section: "Pricing", pricingScope: "branch", pricingField: "reference-cost" },
    ];
    for (const context of contexts) {
      assert.doesNotMatch(operationsContextHref(context), /branchId|purpose|product/);
      const url = operationsContextHref(context, "branch-a");
      assert.equal(new URL(url, "https://local.test").searchParams.has("branchId"), operationalBranchPurpose(context) !== null);
      assert.deepEqual(resolve(url.split("?")[1]).context, context);
    }
  });
});
