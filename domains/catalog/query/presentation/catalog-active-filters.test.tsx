import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogActiveFilterItems, catalogBranchContextDisplayName, resetCatalogFilters } from "./catalog-active-filters";
import { CatalogActiveState } from "./catalog-components";
import type { CatalogQueryState } from "./catalog-query-state";
import { catalogText } from "./catalog-presentation.i18n";
import type { CatalogFilterOptionsView } from "./catalog-presentation.types";

const options: CatalogFilterOptionsView = {
  departments: [{ id: "department-internal-id", displayName: "أجهزة الحاسوب" }],
  categories: [{ id: "category-internal-id", displayName: "Laptops", parentId: "department-internal-id" }],
  productTypes: [{ id: "type-internal-id", displayName: "Business Laptop", parentId: "category-internal-id" }],
  brands: [{ id: "brand-internal-id", displayName: "علامة العمل" }],
  supplyStatuses: [{ id: "supply-internal-id", displayName: "متاح للطلب" }],
  branches: [{ id: "branch-internal-id", displayName: "Main Branch" }],
  enabledConditions: ["used"], enabledCurrencies: ["USD"],
  capabilities: { lifecycles: ["Published", "Draft"], listingFilters: ["Listed", "Unlisted"], stockFilters: ["InStock", "OutOfStock"], retailPrice: true },
};
const state: CatalogQueryState = { q: "ThinkPad", branchId: "branch-internal-id", departmentId: "department-internal-id", categoryId: "category-internal-id", productTypeId: "type-internal-id", brandId: "brand-internal-id", deviceClass: "business", condition: "used", supplyStatusId: "supply-internal-id", lifecycle: "Draft", listing: "Unlisted", stock: "InStock", minRetailPrice: "750", maxRetailPrice: "1500", retailCurrency: "USD", sort: "name-asc", cursor: "opaque-cursor" };

describe("Catalog semantic active filters", () => {
  it("uses trusted dynamic display names and never normal filter IDs", () => {
    const items = catalogActiveFilterItems(state, options, "en"), values = items.map((value) => value.value);
    assert.deepEqual(values.slice(0, 4), ["أجهزة الحاسوب", "Laptops", "Business Laptop", "علامة العمل"]);
    assert.ok(values.includes("متاح للطلب"));
    for (const id of ["department-internal-id", "category-internal-id", "type-internal-id", "brand-internal-id", "supply-internal-id", "branch-internal-id"]) assert.equal(JSON.stringify(items).includes(id), false);
    assert.equal(items.some((value) => value.value === state.q), false);
    assert.equal(items.some((value) => value.key === "branch"), false);
  });

  it("shows Branch as preserved context by displayName and localizes fixed values", () => {
    const branch = catalogBranchContextDisplayName(state, options); assert.equal(branch, "Main Branch");
    const arabic = catalogActiveFilterItems(state, options, "ar");
    assert.equal(arabic.find((value) => value.key === "deviceClass")?.value, catalogText("ar", "business"));
    assert.equal(arabic.find((value) => value.key === "condition")?.value, catalogText("ar", "used"));
    assert.equal(arabic.find((value) => value.key === "lifecycle")?.value, catalogText("ar", "draft"));
    assert.equal(arabic.find((value) => value.key === "listing")?.value, catalogText("ar", "unlisted"));
    assert.equal(arabic.find((value) => value.key === "stock")?.value, catalogText("ar", "inStock"));
    const html = renderToStaticMarkup(<CatalogActiveState items={catalogActiveFilterItems(state, options, "en")} branchDisplayName={branch} locale="en" onReset={() => undefined} />);
    assert.match(html, /Branch context/u); assert.match(html, /Main Branch/u); assert.match(html, /Department: أجهزة الحاسوب/u); assert.match(html, /Minimum retail \(minor units\): 750 USD/u);
    assert.doesNotMatch(html, /department-internal-id|branch-internal-id/u);
  });

  it("resets only filters, preserves Search and Branch context, and clears the cursor", () => {
    assert.deepEqual(resetCatalogFilters(state), { q: "ThinkPad", branchId: "branch-internal-id", lifecycle: "Published", sort: "name-asc" });
    assert.deepEqual(resetCatalogFilters({ ...state, sort: "retail-price-desc" }), { q: "ThinkPad", branchId: "branch-internal-id", lifecycle: "Published", sort: "relevance" });
  });
});
