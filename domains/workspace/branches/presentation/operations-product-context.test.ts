import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { changeOperationalProductSearch, emptyOperationalProductQuery, parseOperationalProductQuery } from "../../../catalog/query/presentation/operational-product-query-state";
import { OperationalProductApiClient } from "../../../catalog/query/presentation/operational-product-api.client";
import { operationalProductPageFixture } from "../../../catalog/query/presentation/mock/operational-product.fixture";
import { operationalBranchFixture } from "./mock/operational-branch.fixture";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationalBranchPurpose, operationalProductPurpose, operationsContextHref, resolveOperationsQuery } from "./operations-query-state";
import { OperationsContent } from "./OperationsPage";
import type { OperationalBranchPurpose, OperationalBranchState } from "./operational-branch-selector.types";

const capabilities = () => { const value = operationalManagementCapabilitiesFixture(); value.branches.canView = value.listing.canManage = value.inventory.canReceive = value.pricing.canView = true; return value; };
const resolve = (q: string) => resolveOperationsQuery(new URLSearchParams(q), capabilities());
const ready = (purpose: OperationalBranchPurpose): OperationalBranchState => ({ type: "Ready", purpose, availability: "Available", options: [operationalBranchFixture({ branchId: "a" }), operationalBranchFixture({ branchId: "inactive", status: "Inactive" })] });
const mappings = [
  ["section=branches&branchTool=listing", "Listing", "Listing"],
  ["section=inventory&inventoryTool=stock", "Inventory", "Inventory"],
  ["section=inventory&inventoryTool=reservations", "Inventory", "Inventory"],
  ["section=inventory&inventoryTool=transfer", "Transfer", "Inventory"],
  ["section=pricing&pricingScope=branch&pricingField=prices", "BranchPricing", "BranchPricing"],
  ["section=pricing&pricingScope=branch&pricingField=reference-cost", "BranchReferenceCost", "BranchReferenceCost"],
  ["section=pricing&pricingScope=workspace&pricingField=prices", null, "WorkspacePricing"],
  ["section=pricing&pricingScope=workspace&pricingField=reference-cost", null, "WorkspaceReferenceCost"],
  ["section=branches&branchTool=details", null, null],
] as const;
describe("Operations A6 to A2 bounded composition", () => {
  for (const [q, a6, a2] of mappings) it(`${q}: A6 ${a6} to A2 ${a2}`, async () => {
    const query = resolve(`${q}&branchId=a&purpose=WRONG&workspaceId=foreign`), context = query.context!;
    assert.equal(operationalBranchPurpose(context), a6); assert.equal(operationalProductPurpose(context), a2);
    const discovery = operationsProductDiscovery(context, query.branchId, a6 ? ready(a6) : undefined);
    const calls: string[] = [];
    if (discovery.type === "Ready") {
      assert.equal(discovery.scope.purpose, a2); assert.equal(discovery.scope.branchId, a6 ? "a" : undefined);
      await new OperationalProductApiClient(async (url) => { calls.push(String(url)); return Response.json({ type: "Success", value: operationalProductPageFixture(discovery.scope.branchId) }); }).search({ ...discovery.scope, q: "" });
    }
    assert.deepEqual(calls, a2 ? [`/api/catalog/operational-products?purpose=${a2}${a6 ? "&branchId=a" : ""}`] : []);
    const slots: string[] = [];
    const html = renderToStaticMarkup(createElement(OperationsContent, {
      state: { type: "Ready", value: capabilities() }, sectionValues: [], query: new URLSearchParams(q), locale: "en", onRetry() {},
      branchManagement: createElement("p", null, "GENERAL"),
      operationalSelector: (purpose, _branch, received) => { slots.push(`A6:${purpose}`); assert.equal(operationalProductPurpose(received), a2); return createElement("p", null, "BRANCH THEN PRODUCT"); },
      workspaceProductSelector: (received) => { slots.push(`A2:${operationalProductPurpose(received)}`); return createElement("p", null, "WORKSPACE PRODUCTS"); },
    }));
    assert.deepEqual(slots, a6 ? [`A6:${a6}`] : a2 ? [`A2:${a2}`] : []);
    assert.equal(html.includes("GENERAL"), a2 === null);
  });
  it("waits for a current eligible A6 branch; URL, stale, inactive, failure and wrong purpose never initiate A2", () => {
    const context = resolve("section=inventory&inventoryTool=transfer").context!;
    for (const [branch, state, reason] of [
      [null, ready("Transfer"), "SelectBranch"], ["a", { type: "Idle" }, "SelectBranch"],
      ["a", { type: "Loading", purpose: "Transfer" }, "SelectBranch"],
      ["a", { type: "Failed", purpose: "Transfer", kind: "Forbidden" }, "SelectBranch"],
      ["a", ready("Inventory"), "SelectBranch"], ["missing", ready("Transfer"), "StaleBranch"],
      ["inactive", ready("Transfer"), "InactiveBranch"],
    ] as const) assert.deepEqual(operationsProductDiscovery(context, branch, state), { type: "Waiting", reason });
  });
  it("normalizes q and cursor syntax, rejects duplicates and bounds input without decoding cursors", () => {
    const parse = (q: string) => parseOperationalProductQuery(new URLSearchParams(q));
    assert.equal(parse("q=%20%20A%20%20B%09%20").q, "A B"); assert.equal(parse("q=%20%20").q, "");
    assert.equal(parse(`q=${"x".repeat(201)}`).issue, "InvalidQuery");
    assert.equal(parse("productCursor=opaque_Next-123").productCursor, "opaque_Next-123");
    for (const value of ["", "x/y", "x y", "x".repeat(2049)]) {
      const result = parse(`productCursor=${encodeURIComponent(value)}&productId=p`);
      assert.equal(result.issue, "InvalidCursor"); assert.equal(result.productId, null); assert.equal(result.productCursor, null);
    }
    for (const key of ["q", "productCursor", "productId"]) assert.deepEqual(parse(`${key}=a&${key}=b`), { ...emptyOperationalProductQuery(), issue: "InvalidQuery" });
    assert.equal(parse("productId=%20").productId, null);
  });
  it("search, branch and every context navigation clear incompatible selection/cursor; selection-only preserves opaque cursor", () => {
    const products = { q: "term", productCursor: "opaque_Next-123", productId: "product-z", issue: null } as const;
    const context = resolve("section=inventory&inventoryTool=stock").context!;
    const selected = operationsContextHref(context, "a", products);
    assert.deepEqual(resolve(selected.split("?")[1]).products, products);
    assert.deepEqual(changeOperationalProductSearch(" new   term "), { q: "new term", productCursor: null, productId: null, issue: null });
    for (const href of [operationsContextHref(context, "b"), ...mappings.map(([q]) => operationsContextHref(resolve(q).context!))])
      assert.doesNotMatch(href, /productId|productCursor|q=/);
    const searched = operationsContextHref(context, "a", changeOperationalProductSearch(" next "));
    assert.deepEqual(resolve(searched.split("?")[1]).products, { q: "next", productCursor: null, productId: null, issue: null });
    assert.equal(operationalBranchPurpose(context), "Inventory");
  });
  it("clears Product state on invalid/duplicate context, missing branch, details and incompatible combinations", () => {
    for (const q of ["section=invalid", "section=inventory&section=inventory", "section=inventory", "section=inventory&branchId=a&branchId=b", "section=branches&branchTool=details", "section=inventory&branchId=a&pricingScope=branch", "section=inventory&branchId=a&inventoryTool=bad"])
      assert.deepEqual(resolve(`${q}&q=term&productId=p&productCursor=opaque`).products, emptyOperationalProductQuery());
    const workspace = resolve("section=pricing&pricingScope=workspace&branchId=ignored&q=term&productId=p");
    assert.equal(workspace.branchId, null); assert.equal(workspace.products.productId, "p");
    assert.doesNotMatch(operationsContextHref(workspace.context!, "ignored", workspace.products), /branchId|purpose|workspaceId/);
  });
});
