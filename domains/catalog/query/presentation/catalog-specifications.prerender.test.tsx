import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogProductCard, CatalogProductDetailsContent } from "./catalog-components";
import type { CatalogProductCardView, CatalogProductDetailsView } from "./catalog-presentation.types";
const specs = [
  { specificationDefinitionId: "resolution", displayName: "Resolution / الدقة", valueType: "Number" as const, unit: "MP", value: "0", sortOrder: 0 },
  { specificationDefinitionId: "outdoor", displayName: "Outdoor / خارجي", valueType: "Boolean" as const, unit: null, value: false, sortOrder: 1 },
  { specificationDefinitionId: "technology", displayName: "Technology / التقنية", valueType: "Text" as const, unit: null, value: "IP", sortOrder: 2 },
];
const card: CatalogProductCardView = { productId: "camera", productName: "Camera", productCode: "QA", lifecycle: "Published", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", classification: { department: null, category: null, productType: null, brand: null, deviceClass: null, condition: null, supplyStatus: null }, mainMedia: null, listingStatus: "Listed", cardSpecifications: specs };
describe("Phase 1 specification rendering", () => {
  it("renders three actual values, localized labels, zero and false without indoor inference", () => {
    for (const locale of ["en", "ar"] as const) {
      const html = renderToStaticMarkup(<CatalogProductCard product={card} queryState={{ q: "", lifecycle: "Published", sort: "newest" }} locale={locale} />);
      assert.equal((html.match(/<dt>/g) ?? []).length, 3);
      assert.match(html, /0 MP/);
      assert.match(html, locale === "ar" ? /خارجي/u : /Outdoor/);
      assert.match(html, locale === "ar" ? /لا/u : />No</);
      assert.doesNotMatch(html, /Indoor|داخلي|Not specified|غير محدد/u);
      assert.match(html, /returnTo=%2Fcatalog/);
    }
  });
  it("renders grouped historical Details and only declared missing rows in both languages", () => {
    const product: CatalogProductDetailsView = { ...card, media: [], specifications: [...specs, { ...specs[2]!, specificationDefinitionId: "old", displayName: "Historical / تاريخي", value: "preserved" }], capabilities: { directSharePriceModes: [] }, specificationGroups: [
      { id: "camera", label: { en: "Camera specifications", ar: "مواصفات الكاميرا" }, specificationDefinitionIds: specs.map((s) => s.specificationDefinitionId), missingSpecifications: [{ specificationDefinitionId: "lens", displayName: "Lens / العدسة", valueType: "Number", unit: "mm", sortOrder: 3 }] },
      { id: "additional-stored", label: { en: "Additional stored specifications", ar: "مواصفات محفوظة إضافية" }, specificationDefinitionIds: ["old"], missingSpecifications: [] },
    ] };
    for (const locale of ["en", "ar"] as const) {
      const html = renderToStaticMarkup(<CatalogProductDetailsContent product={product} locale={locale} returnTo="/catalog?branchId=main" />);
      assert.match(html, locale === "ar" ? /مواصفات الكاميرا/u : /Camera specifications/);
      assert.match(html, locale === "ar" ? /غير محدد/u : /Not specified/);
      assert.match(html, /preserved/);
      const specificationLists = [...html.matchAll(/<dl class="catalog-specifications">([\s\S]*?)<\/dl>/g)].map((match) => match[1]).join("");
      assert.equal((specificationLists.match(/<dt>/g) ?? []).length, 5);
      assert.doesNotMatch(html, /Wholesale|الجملة|Reference Cost|المخزون الفعلي/u);
    }
  });
});
