import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { operationalManagementCapabilitiesFixture as fixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import type { OperationalManagementCapabilityState } from "../../../identity/presentation/operational-management-capabilities.types";
import { OperationsContent } from "./OperationsPage";
import { operationsText } from "./operations-presentation.i18n";

const render = (state: OperationalManagementCapabilityState, sectionValues: readonly string[] = [], locale: "en" | "ar" = "en") =>
  renderToStaticMarkup(createElement(OperationsContent, { state, sectionValues, locale, onRetry: () => undefined }));

describe("Operations landing Presentation", () => {
  it("renders available sections in order, real links, current page and one H1", () => {
    const value = fixture(); value.listing.canManage = true; value.inventory.canReceive = true; value.pricing.canView = true;
    const html = render({ type: "Ready", value }, ["inventory"]);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.ok(html.indexOf("section=branches") < html.indexOf("section=inventory"));
    assert.ok(html.indexOf("section=inventory") < html.indexOf("section=pricing"));
    assert.match(html, /<nav[^>]*aria-label="Operational areas"/);
    assert.match(html, /<a[^>]*aria-current="page"[^>]*href="\/operations\?section=inventory"/);
    assert.match(html, /<h2[^>]*>Inventory<\/h2>/);
    assert.match(html, /Branch selection is available/);
    assert.doesNotMatch(html, /<button|<form|<input/);
  });
  it("omits unavailable areas and safely renders the fallback area", () => {
    const value = fixture(); value.referenceCost.canView = true;
    for (const values of [["branches"], ["pricing", "pricing"], ["unknown"]]) {
      const html = render({ type: "Ready", value }, values);
      assert.match(html, /section=pricing/);
      assert.doesNotMatch(html, /section=branches|section=inventory/);
      assert.match(html, /<h2[^>]*>Pricing<\/h2>/);
    }
  });
  it("renders loading and no-capability live states without section navigation", () => {
    for (const state of [{ type: "Idle" }, { type: "Loading" }, { type: "Ready", value: fixture() }] as const) {
      const html = render(state);
      assert.match(html, /role="status" aria-live="polite"/);
      assert.doesNotMatch(html, /<nav|<button/);
      assert.match(html, state.type === "Ready" ? /No operational capabilities/ : /Loading operational areas/);
    }
  });
  it("exposes deliberate retry only for unavailable responses, with distinct denial and expiry states", () => {
    for (const kind of ["Unavailable", "OperationalManagementCapabilityServiceUnavailable", "InvalidQuery"] as const) {
      const html = render({ type: "Failed", kind });
      assert.match(html, /role="alert"/);
      assert.match(html, /<button[^>]*type="button"[^>]*>Retry<\/button>/);
      assert.doesNotMatch(html, /<nav|No operational capabilities/);
    }
    for (const [kind, message] of [["AuthenticationRequired", "Your session has expired"], ["Forbidden", "Access to Operations was denied"], ["ForbiddenForRestrictedSession", "restricted session"]] as const) {
      const html = render({ type: "Failed", kind });
      assert.ok(html.includes(message));
      assert.doesNotMatch(html, /<button|<nav|No operational capabilities/);
    }
  });
  it("uses bilingual labels and foundation messages in the same component tree", () => {
    const value = fixture(); value.branches.canView = value.inventory.canReceive = value.pricing.canView = true;
    const arabic = render({ type: "Ready", value }, ["pricing"], "ar");
    for (const label of ["العمليات", "الفروع", "المخزون", "التسعير"]) assert.ok(arabic.includes(label));
    assert.ok(arabic.includes(operationsText("ar", "workspacePricingFoundation")));
    assert.match(render({ type: "Failed", kind: "Unavailable" }, [], "ar"), /إعادة المحاولة/);
    assert.ok(render({ type: "Ready", value: fixture() }, [], "ar").includes(operationsText("ar", "empty")));
    assert.ok(render({ type: "Loading" }, [], "ar").includes(operationsText("ar", "loading")));
  });
  it("keeps the route thin and uses only the mounted Identity state in Operations", () => {
    const route = readFileSync("app/operations/page.tsx", "utf8");
    assert.match(route, /@\/domains\/workspace\/branches\/presentation\/OperationsPage/);
    assert.match(route, /<Suspense fallback=\{null\}><OperationsPage \/><\/Suspense>/);
    assert.doesNotMatch(route, /fetch|useEffect|searchParams|api\//);
    for (const file of ["OperationsPage.tsx", "OperationsNavigation.tsx", "operations-section-state.ts", "operations-presentation.i18n.ts"]) {
      const source = readFileSync(`domains/workspace/branches/presentation/${file}`, "utf8");
      assert.doesNotMatch(source, /fetch\(|\/api\/|\.client|repositories|infrastructure|TrustedActorContext|\.role|permissions|branchScope|workspaceId|allowedActions/);
    }
    const page = readFileSync("domains/workspace/branches/presentation/OperationsPage.tsx", "utf8");
    assert.match(page, /useOperationalManagementCapabilities\(\)/);
    assert.match(page, /onRetry=\{refresh\}/);
    assert.match(page, /<ProtectedPage>/);
    assert.match(page, /search.getAll\("section"\)/);
    assert.doesNotMatch(page, /search\.get\(/);
  });
  it("preserves direction and skip target, visible focus and 44px wrapping navigation controls", () => {
    const shell = readFileSync("domains/identity/presentation/components/presentation-shell.tsx", "utf8");
    assert.match(shell, /dir=\{i18n.dir\}/);
    assert.match(shell, /href="#main-content"/);
    assert.match(shell, /id="main-content"/);
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /:focus-visible\s*\{[^}]*outline:/);
    assert.match(css, /\.operations-section-nav ul\s*\{[^}]*flex-wrap: wrap/);
    assert.match(css, /\.operations-section-nav a\s*\{[^}]*min-height: 44px/);
    assert.match(css, /\.header-link--operations\s*\{[^}]*display: inline-flex;[^}]*min-height: 44px/);
  });
});
