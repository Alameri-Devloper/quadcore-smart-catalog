import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogChoiceMenu, CatalogLanguageIcon } from "./catalog-choice-menu";
import { CatalogProductCard, CatalogProductDetailsContent } from "./catalog-components";
import type { CatalogProductCardView } from "./catalog-presentation.types";

const state = { q: "", lifecycle: "Published" as const, sort: "newest" as const };
const product: CatalogProductCardView = {
  productId: "qa-product", productCode: null, productName: "QA Laptop", lifecycle: "Published",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  classification: { department: { id: "d", displayName: "Computers / حواسيب" }, category: { id: "c", displayName: "Laptops / محمول" }, productType: { id: "t", displayName: "Business laptop / حاسوب أعمال" }, brand: { id: "b", displayName: "Quadcore QA" }, deviceClass: "business", condition: "new", supplyStatus: null },
  mainMedia: null, listingStatus: "Listed", cardSpecifications: [],
  retail: { amountMinor: "115000", currency: "USD", source: "BranchOverride" },
};

describe("Owner feedback: focused Catalog cards", () => {
  for (const locale of ["ar", "en"] as const) {
    it("keeps product identity, lifecycle, price and Details action without category tags or a missing-code dash: " + locale, () => {
      const html = renderToStaticMarkup(<CatalogProductCard product={product} queryState={state} locale={locale} />);
      assert.match(html, /QA Laptop/);
      assert.match(html, /1150\.00 USD/);
      assert.match(html, locale === "ar" ? /منشور/u : /Published/);
      assert.match(html, /href="\/catalog\/qa-product/);
      assert.doesNotMatch(html, /catalog-chip-row|Computers|Laptops|Business laptop|catalog-card__code|—/);
    });
    it("retains classification metadata in Details: " + locale, () => {
      const html = renderToStaticMarkup(<CatalogProductDetailsContent product={{ ...product, media: [], specifications: [], capabilities: { directSharePriceModes: [] } }} locale={locale} returnTo="/catalog" />);
      for (const name of ["Computers", "Laptops", "Business laptop"]) assert.ok(html.includes(name));
      assert.match(html, /1150\.00 USD/);
    });
  }
  it("retains a real zero-like product code without inventing a missing one", () => {
    assert.match(renderToStaticMarkup(<CatalogProductCard product={{ ...product, productCode: "0" }} queryState={state} locale="en" />), /catalog-card__code[^>]*>0</);
    assert.doesNotMatch(renderToStaticMarkup(<CatalogProductCard product={{ ...product, productCode: "  " }} queryState={state} locale="en" />), /catalog-card__code/);
  });
  it("does not invent prices when the authorized projection omits them", () => {
    const html = renderToStaticMarkup(<CatalogProductCard product={{ ...product, retail: undefined }} queryState={state} locale="en" />);
    assert.doesNotMatch(html, /1150|Wholesale|Reference Cost|catalog-money/);
  });
});

describe("Owner feedback: compact menu trigger contracts", () => {
  for (const value of ["SYSTEM", "LIGHT", "DARK"]) {
    it("shows only Appearance on the closed trigger for " + value, () => {
      const html = renderToStaticMarkup(<CatalogChoiceMenu id="appearance" label="Appearance" trigger="Appearance" value={value} options={[{ value: "SYSTEM", label: "System" }, { value: "LIGHT", label: "Light" }, { value: "DARK", label: "Dark" }]} onChange={() => {}} />);
      assert.match(html, /aria-haspopup="menu"/);
      assert.match(html, /aria-expanded="false"/);
      assert.match(html, />Appearance</);
      assert.doesNotMatch(html, />System<|>Light<|>Dark<|role="menuitemradio"/);
    });
  }
  it("gives the icon-only language control an accessible name without a visible language label", () => {
    const html = renderToStaticMarkup(<CatalogChoiceMenu id="language" label="اللغة" value="ar" options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} onChange={() => {}} iconOnly trigger={<CatalogLanguageIcon />} />);
    assert.match(html, /aria-label="اللغة"/u);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.doesNotMatch(html, />العربية<|>English</u);
  });
});
