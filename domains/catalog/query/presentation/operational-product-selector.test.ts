import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OperationalProductSelectorContent, OperationalProductWaiting } from "./OperationalProductSelector";
import { operationalProductText as text } from "./operational-product-selector.i18n";
import { operationalProductPageFixture as page } from "./mock/operational-product.fixture";
import { emptyOperationalProductQuery } from "./operational-product-query-state";
import type { OperationalProductQuery, OperationalProductState } from "./operational-product-selector.types";

const ready: OperationalProductState = { type: "Ready", key: "current", value: page("a") };
const render = (state: OperationalProductState = ready, query: OperationalProductQuery = emptyOperationalProductQuery(), locale: "en" | "ar" = "en") =>
  renderToStaticMarkup(createElement(OperationalProductSelectorContent, { state, query, locale, requestKey: "current", onQueryChange() {}, onRetry() {} }));
describe("Accessible bilingual A2 Product selector", () => {
  it("renders full search labels, native selection and server order with no editor", () => {
    const html = render();
    assert.match(html, /<form[^>]*operational-product-search/); assert.match(html, /<label for="[^"]+-search">Search Products/);
    assert.match(html, /<input(?=[^>]*type="search")(?=[^>]*maxLength="200")[^>]*>/);
    assert.match(html, /<fieldset><legend>Product<\/legend>/);
    assert.ok(html.indexOf('value="product-z"') < html.indexOf('value="product-a"'));
    assert.match(html, /Draft/); assert.match(html, /Published/); assert.match(html, /Unlisted/); assert.match(html, /Listed/);
    assert.match(html, /<bdi dir="ltr">QSC-Z<\/bdi>/);
    for (const match of html.matchAll(/<input id="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`));
    assert.match(html, /type="radio"/); assert.doesNotMatch(html, /checked=""|price|quantity|allowedActions|href=|Save|Edit/);
    assert.match(html, /Next Products/); assert.match(html, /next page replaces this list/);
    assert.match(html, /<button[^>]*aria-describedby="[^"]+-pagination"/);
  });
  it("selected and stale Product IDs are announced and never synthesize details", () => {
    const selected = render(ready, { ...emptyOperationalProductQuery(), productId: "product-z" });
    assert.match(selected, /<input(?=[^>]*checked="")(?=[^>]*value="product-z")[^>]*>/);
    assert.match(selected, /role="status" aria-live="polite">Selected Product/); assert.match(selected, /Clear Product selection/);
    const stale = render(ready, { ...emptyOperationalProductQuery(), productId: "foreign" });
    assert.match(stale, /role="alert">The selected Product is not in the current results/); assert.doesNotMatch(stale, /checked=""|value="foreign"/);
  });
  it("loading and old identity mask all Product rows and disable request controls", () => {
    for (const state of [{ type: "Idle" }, { type: "Loading", key: "current" }, { ...ready, key: "old" }] as OperationalProductState[]) {
      const html = render(state, { ...emptyOperationalProductQuery(), productId: "product-z" });
      assert.match(html, /aria-busy="true"/); assert.match(html, /disabled=""/); assert.match(html, /role="status" aria-live="polite">Loading Products/);
      assert.doesNotMatch(html, /<fieldset|checked=""|Selected Product|Next Products/);
    }
  });
  for (const locale of ["en", "ar"] as const) it(`renders all success, waiting and failure states in ${locale}`, () => {
    const html = render(ready, emptyOperationalProductQuery(), locale);
    for (const key of ["select", "product", "search", "productCode", "productName", "Draft", "Published", "Listed", "Unlisted", "next", "pageGuidance"] as const) assert.ok(html.includes(text(locale, key)), key);
    const empty = render({ type: "Ready", key: "current", value: { items: [], nextCursor: null } }, emptyOperationalProductQuery(), locale);
    assert.ok(empty.includes(text(locale, "empty"))); assert.doesNotMatch(empty, /<fieldset|Next Products|المنتجات التالية/);
    for (const kind of ["AuthenticationRequired", "ForbiddenForRestrictedSession", "Forbidden", "BranchNotFound", "InvalidQuery", "InvalidCursor", "CatalogQueryServiceUnavailable", "NetworkFailure", "MalformedResponse", "UnexpectedResponse"] as const) {
      const failed = render({ type: "Failed", key: "current", kind }, emptyOperationalProductQuery(), locale);
      assert.ok(failed.includes(text(locale, kind))); assert.match(failed, /role="alert"/);
      assert.ok(!failed.includes(text(locale, "empty"))); assert.doesNotMatch(failed, /<fieldset/);
      if (kind === "InvalidCursor") assert.ok(failed.includes(text(locale, "first")));
      else if (kind !== "AuthenticationRequired" && kind !== "ForbiddenForRestrictedSession") assert.ok(failed.includes(text(locale, "retry")));
    }
    for (const reason of ["SelectBranch", "InactiveBranch", "StaleBranch"] as const) {
      const waiting = renderToStaticMarkup(createElement(OperationalProductWaiting, { locale, reason }));
      assert.ok(waiting.includes(text(locale, reason))); assert.match(waiting, /role="status" aria-live="polite"/); assert.doesNotMatch(waiting, /<input|<button/);
    }
    const notConfigured = render({ ...ready, value: { items: [{ ...page("a").items[0], listingStatus: "NotConfigured" }], nextCursor: null } }, emptyOperationalProductQuery(), locale);
    assert.ok(notConfigured.includes(text(locale, "NotConfigured")));
  });
  it("shows safe invalid URL cursor handling and first-page navigation", () => {
    const html = render(ready, { ...emptyOperationalProductQuery(), issue: "InvalidCursor" });
    assert.match(html, /page is invalid or expired/); assert.match(html, /Back to first page/); assert.doesNotMatch(html, /<fieldset|aria-busy="true"/);
    assert.match(render(ready, { ...emptyOperationalProductQuery(), productCursor: "opaque" }), /Back to first page/);
  });
  it("escapes workspace names without translating them and isolates technical codes", () => {
    const html = render({ ...ready, value: { items: [{ ...page().items[0], productName: "<script>اسم</script>" }], nextCursor: null } }, emptyOperationalProductQuery(), "ar");
    assert.match(html, /&lt;script&gt;اسم&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<bdi dir="ltr">QSC-Z/); assert.match(html, /اختر المنتج/);
  });
  it("preserves DDD Presentation ownership, session expiry, one direction tree and responsive interaction structure", () => {
    const productRoot = "domains/catalog/query/presentation/", branchRoot = "domains/workspace/branches/presentation/";
    for (const file of ["OperationalProductSelector.tsx", "operational-product-api.client.ts", "operational-product-selector.coordinator.ts", "operational-product-selector.types.ts", "operational-product-query-state.ts"]) {
      const source = readFileSync(productRoot + file, "utf8");
      assert.doesNotMatch(source, /from ["'][^"']*(?:repositories|infrastructure|\/domain\/|workspace\/)/);
      assert.doesNotMatch(source, /TrustedActorContext|allowedActions|permissions|localStorage|sessionStorage/);
      const endpoints = source.match(/\/api\/[A-Za-z/-]+/g) ?? [];
      assert.ok(endpoints.every((path) => path === "/api/catalog/operational-products"));
      assert.doesNotMatch(source, /method: "(?:POST|PUT|PATCH|DELETE)"/);
    }
    const composition = readFileSync(branchRoot + "OperationsPage.tsx", "utf8");
    assert.match(composition, /useSessionExpiryRedirect\(\)/); assert.match(composition, /onAuthenticationRequired=\{redirectExpired\}/);
    assert.match(composition, /: renderProducts\(context, branchId, products, branches\)/);
    assert.match(composition, /context\.section === "Branches" && context\.branchTool === "listing"/);
    assert.match(composition, /key=\{operationsContextHref\(context, branchId, \{ \.\.\.products, productId: null \}\)\}/);
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /:focus-visible\s*\{[^}]*outline:/);
    assert.match(css, /\.operational-product-option\s*\{[^}]*min-height: 44px/);
    assert.match(css, /\.operational-product-options\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(css, /min-width: 481px/); assert.match(css, /min-width: 1025px/);
    assert.match(css, /\.operational-product-option > span\s*\{[^}]*overflow-wrap: anywhere/);
    assert.match(readFileSync("domains/identity/presentation/components/presentation-shell.tsx", "utf8"), /dir=\{i18n.dir\}/);
  });
});
