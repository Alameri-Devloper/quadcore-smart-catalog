import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogMedia, CatalogProductCard, CatalogProductDetailsContent, formatCatalogMoney } from "./catalog-components";
import type { CatalogQueryState } from "./catalog-query-state";
import type { CatalogProductCardView, CatalogProductDetailsView } from "./catalog-presentation.types";

const query: CatalogQueryState = { q: "", branchId: "branch-a", lifecycle: "Published", sort: "newest" };
const card = (overrides: Partial<CatalogProductCardView> = {}): CatalogProductCardView => ({
  productId: "product-a", productCode: "QSC-A", productName: "حاسوب محمول", lifecycle: "Published", branchId: "branch-a",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  classification: { department: { id: "d", displayName: "أجهزة الحاسوب" }, category: { id: "c", displayName: "Laptops" }, productType: null, brand: { id: "b", displayName: "علامة العمل" }, deviceClass: "business", condition: "new", supplyStatus: { id: "s", displayName: "متاح خصيصاً" } },
  mainMedia: { mediaId: "m", altText: "واجهة المنتج", position: 0, isMain: true, downloadUrl: "/api/catalog/products/product-a/media/m" }, listingStatus: "Listed", retail: { amountMinor: "0", currency: "USD", source: "WorkspaceBase" }, availability: "OutOfStock", ...overrides,
});
const details = (overrides: Partial<CatalogProductDetailsView> = {}): CatalogProductDetailsView => ({ ...card(), media: [{ mediaId: "second", altText: "Second", position: 1, isMain: false, downloadUrl: "/api/catalog/products/product-a/media/second" }, { mediaId: "first", altText: "First", position: 0, isMain: true, downloadUrl: "/api/catalog/products/product-a/media/first" }], specifications: [{ specificationDefinitionId: "old", displayName: "Legacy RAM", valueType: "Number", unit: "GB", value: "16", sortOrder: 9 }, { specificationDefinitionId: "current", displayName: "Storage", valueType: "Number", unit: "GB", value: "512", sortOrder: 0 }], capabilities: { directSharePriceModes: ["Retail"] }, ...overrides });

describe("Catalog Presentation components", () => {
  it("renders only server-returned Card disclosure and preserves dynamic Workspace labels", () => {
    const html = renderToStaticMarkup(<CatalogProductCard product={card()} queryState={query} locale="ar" />);
    assert.match(html, /حاسوب محمول/u); assert.match(html, /أجهزة الحاسوب/u); assert.match(html, /علامة العمل/u);
    assert.match(html, /0\.00 USD/u); assert.match(html, /OutOfStock|غير متوفر|غير متاح/u);
    assert.doesNotMatch(html, /Wholesale|الجملة/u); assert.doesNotMatch(html, /Reference Cost|التكلفة المرجعية/u); assert.doesNotMatch(html, /On hand|المخزون الفعلي/u);
    assert.match(html, /returnTo=%2Fcatalog/u); assert.match(html, /branchId=branch-a/u);
  });

  it("renders exact quantities only when returned and keeps Wholesale independent", () => {
    const absent = renderToStaticMarkup(<CatalogProductCard product={card({ retail: undefined, wholesale: { amountMinor: "100000", currency: "USD", source: "BranchOverride" } })} queryState={query} locale="en" />);
    assert.match(absent, /Wholesale/u); assert.doesNotMatch(absent, />Retail</u); assert.doesNotMatch(absent, /On hand/u);
    const exact = renderToStaticMarkup(<CatalogProductCard product={card({ inventory: { available: "7", onHand: "10", reserved: "2", damaged: "1" } })} queryState={query} locale="en" />);
    assert.match(exact, /On hand/u); assert.match(exact, />10</u);
  });

  it("uses approved minor-unit formatting without floating point and preserves zero", () => {
    for (const [currency, expected] of [["USD", "7.50 USD"], ["JPY", "750 JPY"], ["KWD", "0.750 KWD"], ["CLF", "0.0750 CLF"]] as const) assert.deepEqual(formatCatalogMoney({ amountMinor: "750", currency, source: "WorkspaceBase" }), { type: "Formatted", text: expected });
    assert.deepEqual(formatCatalogMoney({ amountMinor: "0", currency: "USD", source: "WorkspaceBase" }), { type: "Formatted", text: "0.00 USD" });
    assert.deepEqual(formatCatalogMoney({ amountMinor: "9007199254740991", currency: "USD", source: "WorkspaceBase" }), { type: "Formatted", text: "90071992547409.91 USD" });
  });

  it("never guesses a numeric amount for N.A. or unknown currencies on any Catalog Money surface", () => {
    for (const currency of ["XAU", "XAG", "ZZZ"] as const) assert.deepEqual(formatCatalogMoney({ amountMinor: "750", currency, source: "WorkspaceBase" }), { type: "UnsupportedCurrency", currency });
    const cardHtml = renderToStaticMarkup(<CatalogProductCard product={card({ retail: { amountMinor: "750", currency: "XAU", source: "WorkspaceBase" }, wholesale: { amountMinor: "750", currency: "XAG", source: "BranchOverride" } })} queryState={query} locale="en" />);
    assert.match(cardHtml, /XAU/u); assert.match(cardHtml, /XAG/u); assert.match(cardHtml, /Amount cannot be displayed safely for this currency/u);
    assert.doesNotMatch(cardHtml, /750 XAU/u); assert.doesNotMatch(cardHtml, /750 XAG/u);
    const detailsHtml = renderToStaticMarkup(<CatalogProductDetailsContent product={details({ referenceCost: { amountMinor: "750", currency: "ZZZ", source: "WorkspaceBase" } })} locale="en" returnTo="/catalog" />);
    assert.match(detailsHtml, /Internal reference cost/u); assert.match(detailsHtml, /ZZZ/u); assert.match(detailsHtml, /Amount cannot be displayed safely for this currency/u); assert.doesNotMatch(detailsHtml, /750 ZZZ/u);
  });

  it("renders accessible no-media fallback without an arbitrary URL", () => {
    const html = renderToStaticMarkup(<CatalogMedia media={null} productTitle="Product" locale="en" />);
    assert.match(html, /role="img"/u); assert.match(html, /No approved media/u); assert.doesNotMatch(html, /<img/u);
  });

  it("renders historical media and specifications in server order and reaches Direct Share", () => {
    const html = renderToStaticMarkup(<CatalogProductDetailsContent product={details()} locale="en" returnTo="/catalog?q=x" />);
    assert.ok(html.indexOf("Second") < html.indexOf("First")); assert.ok(html.indexOf("Legacy RAM") < html.indexOf("Storage"));
    assert.match(html, />Share</u); assert.match(html, /Prepare share/u); assert.match(html, /Retail/u); assert.doesNotMatch(html, /Wholesale/u);
    assert.doesNotMatch(html, /Reference Cost/u); assert.doesNotMatch(html, /Exact inventory/u);
  });

  it("shows internal Reference Cost only when present and never uses it as a share mode", () => {
    const html = renderToStaticMarkup(<CatalogProductDetailsContent product={details({ referenceCost: { amountMinor: "90000", currency: "USD", source: "WorkspaceBase" }, capabilities: { directSharePriceModes: ["Wholesale"] } })} locale="en" returnTo="/catalog" />);
    assert.match(html, /Internal reference cost/u); assert.match(html, /Internal only/u); assert.match(html, /Wholesale/u); assert.doesNotMatch(html, /value="Retail"/u);
    assert.doesNotMatch(html, /value="Reference/u);
  });
});
