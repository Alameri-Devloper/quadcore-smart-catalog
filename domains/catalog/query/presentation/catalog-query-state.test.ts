import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogDetailsHref, catalogQuerySearchParams, parseCatalogQueryState, safeCatalogReturnPath, updateCatalogQueryState, type CatalogQueryState } from "./catalog-query-state";

const state = (overrides: Partial<CatalogQueryState> = {}): CatalogQueryState => ({ q: "laptop", branchId: "branch-a", departmentId: "department-a", lifecycle: "Published", sort: "relevance", cursor: "opaque_SERVER-token_123", ...overrides });

describe("Catalog Presentation query state", () => {
  it("normalizes search and applies deterministic sort defaults", () => {
    const searched = parseCatalogQueryState(new URLSearchParams("q=%20ThinkPad%20%20X1%20"));
    assert.deepEqual(searched, { ok: true, value: { q: "ThinkPad X1", lifecycle: "Published", sort: "relevance" } });
    const browse = parseCatalogQueryState(new URLSearchParams());
    assert.deepEqual(browse, { ok: true, value: { q: "", lifecycle: "Published", sort: "newest" } });
  });

  it("round-trips supported filter, sort, Branch, and decimal-string price state", () => {
    const input = state({ categoryId: "category-a", productTypeId: "type-a", brandId: "brand-a", stock: "InStock", listing: "Listed", retailCurrency: "USD", minRetailPrice: "0", maxRetailPrice: "9007199254740991", sort: "retail-price-desc" });
    const parsed = parseCatalogQueryState(catalogQuerySearchParams(input));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.value, input);
  });

  it("rejects hidden authority, malformed money, invalid Branch-dependent filters, and duplicate state", () => {
    for (const query of ["workspaceId=w", "permissions=pricing.view", "minRetailPrice=1", "branchId=b&stock=InStock&stock=OutOfStock", "stock=InStock", "q=&sort=relevance", "minRetailPrice=2&maxRetailPrice=1&retailCurrency=USD"]) {
      assert.deepEqual(parseCatalogQueryState(new URLSearchParams(query)), { ok: false }, query);
    }
  });

  it("resets stale cursors on query, filter, sort, and Branch changes", () => {
    for (const patch of [{ q: "tablet" }, { brandId: "brand-b" }, { sort: "newest" as const }, { branchId: "branch-b" }]) {
      assert.equal(updateCatalogQueryState(state(), patch).cursor, undefined);
    }
    const withoutBranch = updateCatalogQueryState(state({ stock: "InStock", listing: "Listed" }), { branchId: undefined });
    assert.equal(withoutBranch.stock, undefined);
    assert.equal(withoutBranch.listing, undefined);
  });

  it("preserves the server cursor exactly when cursor navigation is the only change", () => {
    const opaque = "eyJub3QtZGVjb2RlZCI6dHJ1ZX0";
    assert.equal(updateCatalogQueryState(state(), { cursor: opaque }).cursor, opaque);
    assert.equal(catalogQuerySearchParams(updateCatalogQueryState(state(), { cursor: opaque })).get("cursor"), opaque);
  });

  it("preserves Catalog context through Details and canonical safe Back navigation", () => {
    const original = state({ stock: "InStock", retailCurrency: "USD", minRetailPrice: "0" });
    const href = catalogDetailsHref("product/unsafe", original);
    const details = new URL(href, "https://qsc.invalid");
    assert.equal(details.pathname, "/catalog/product%2Funsafe");
    assert.equal(details.searchParams.get("branchId"), "branch-a");
    assert.equal(safeCatalogReturnPath(details.searchParams.get("returnTo")), `/catalog?${catalogQuerySearchParams(original)}`);
    assert.equal(safeCatalogReturnPath("https://attacker.invalid/catalog?q=x"), "/catalog");
    assert.equal(safeCatalogReturnPath("/catalog?workspaceId=foreign"), "/catalog");
  });
});
