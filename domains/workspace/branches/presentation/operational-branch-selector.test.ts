import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { operationalBranchFixture as fixture } from "./mock/operational-branch.fixture";
import { OperationalBranchSelectorContent } from "./OperationalBranchSelector";
import { OperationsContent } from "./OperationsPage";
import { operationsText } from "./operations-presentation.i18n";
import type { OperationalBranchPurpose, OperationalBranchState } from "./operational-branch-selector.types";

const ready = (purpose: OperationalBranchPurpose = "Listing"): OperationalBranchState => ({ type: "Ready", purpose, availability: "Available", options: [fixture({ branchId: "z", status: "Inactive", displayName: "Inactive First" }), fixture({ branchId: "a", code: "active-code", displayName: "Active Second" })] });
const element = (state: OperationalBranchState, branchId: string | null = null, locale: "en" | "ar" = "en", purpose: OperationalBranchPurpose = "Listing") =>
  createElement(OperationalBranchSelectorContent, { state, purpose, branchId, locale, onSelectBranch() {}, onRetry() {} });
const render = (state: OperationalBranchState, branchId: string | null = null, locale: "en" | "ar" = "en", purpose: OperationalBranchPurpose = "Listing") => renderToStaticMarkup(element(state, branchId, locale, purpose));

describe("A6 selector Presentation and Operations composition", () => {
  it("renders labeled native radio group with ordered Active and disabled Inactive rows", () => {
    const html = render(ready());
    assert.match(html, /<fieldset aria-describedby="[^"]+-guidance">/); assert.match(html, /<legend>Select Branch<\/legend>/);
    assert.ok(html.indexOf("Inactive First") < html.indexOf("Active Second"));
    assert.match(html, /<input(?=[^>]*value="z")(?=[^>]*disabled="")(?=[^>]*aria-describedby="[^"]+-guidance")[^>]*>/);
    assert.match(html, /<input(?=[^>]*type="radio")(?=[^>]*value="a")[^>]*>/);
    assert.match(html, /Inactive branches remain visible but cannot be selected here/);
    for (const match of html.matchAll(/<input id="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`));
    assert.doesNotMatch(html, /checked=""/); assert.match(html, />Active<|>Inactive</);
  });
  it("renders loading, authorized empty, all-inactive, denial and unavailable as distinct states", () => {
    assert.match(render({ type: "Loading", purpose: "Listing" }), /role="status" aria-live="polite">Loading operational branches/);
    assert.match(render({ type: "Ready", purpose: "Listing", options: [], availability: "AuthorizedEmpty" }), /No operational branches available/);
    const inactive = render({ type: "Ready", purpose: "Listing", options: [fixture({ status: "Inactive" })], availability: "AllInactive" });
    assert.match(inactive, /All available branches are inactive/); assert.match(inactive, /Main Branch/); assert.doesNotMatch(inactive, /No operational branches available/);
    for (const [kind, message] of [
      ["Forbidden", "Operational branch selection is forbidden"], ["ForbiddenForRestrictedSession", "restricted session"],
      ["BranchServiceUnavailable", "Operational branches could not be loaded"], ["NetworkFailure", "could not be reached"],
      ["MalformedResponse", "could not be read"], ["UnexpectedResponse", "unexpected response"], ["InvalidInput", "request was not accepted"],
      ["AuthenticationRequired", "Your session has expired"],
    ] as const) {
      const html = render({ type: "Failed", purpose: "Listing", kind }); assert.ok(html.includes(message)); assert.match(html, /role="alert"/);
      assert.doesNotMatch(html, /No operational branches available|All available branches are inactive|<fieldset/);
      if (kind !== "AuthenticationRequired" && kind !== "ForbiddenForRestrictedSession") assert.match(html, />Retry<\/button>/);
    }
  });
  it("shows stale or inactive URL selection without marking a row selected", () => {
    const stale = render(ready(), "missing"); assert.match(stale, /no longer in the available list/); assert.doesNotMatch(stale, /checked=""/);
    const inactive = render(ready(), "z"); assert.match(inactive, /selected branch is inactive/); assert.doesNotMatch(inactive, /checked=""/);
    const selected = render(ready(), "a"); assert.match(selected, /<input(?=[^>]*checked="")(?=[^>]*value="a")[^>]*>/);
    assert.match(selected, /role="status" aria-live="polite">Selected branch/); assert.match(selected, /Clear branch selection/);
  });
  it("masks previous-purpose rows immediately and labels Transfer as source selection only", () => {
    const masked = render(ready("Inventory"), "a", "en", "Transfer"); assert.match(masked, /Loading operational branches/); assert.doesNotMatch(masked, /Active Second|<input|Selected branch/);
    const transfer = render(ready("Transfer"), null, "en", "Transfer"); assert.match(transfer, /Select source branch/);
    assert.doesNotMatch(transfer, /destination|quantity|type="submit"/);
  });
  it("preserves user-entered text safely, isolates codes LTR, and keeps bilingual states", () => {
    const state: OperationalBranchState = { type: "Ready", purpose: "Listing", availability: "Available", options: [fixture({ displayName: "<script>name</script>" })] };
    const html = render(state, null, "ar"); assert.match(html, /&lt;script&gt;name&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<bdi dir="ltr">main<\/bdi>/); assert.match(html, /الفرع التشغيلي|اختر الفرع/);
    for (const locale of ["en", "ar"] as const) {
      const mixed = render(ready(), "missing", locale);
      for (const key of ["operationalBranch", "selectOperationalBranch", "freshBranchGuidance", "Active", "Inactive", "staleSelectedBranch", "clearBranchSelection"] as const) assert.ok(mixed.includes(operationsText(locale, key)));
      assert.ok(render({ type: "Ready", purpose: "Listing", options: [], availability: "AuthorizedEmpty" }, null, locale).includes(operationsText(locale, "operationalEmpty")));
      assert.ok(render({ type: "Ready", purpose: "Listing", options: [fixture({ status: "Inactive" })], availability: "AllInactive" }, null, locale).includes(operationsText(locale, "allBranchesInactive")));
      assert.ok(render({ type: "Failed", purpose: "Listing", kind: "Forbidden" }, null, locale).includes(operationsText(locale, "selectorForbidden")));
      assert.ok(render({ type: "Failed", purpose: "Listing", kind: "BranchServiceUnavailable" }, null, locale).includes(operationsText(locale, "selectorUnavailable")));
    }
  });
  for (const [query, expectedPurpose] of [
    ["section=branches&branchTool=listing", "Listing"], ["section=inventory&inventoryTool=stock", "Inventory"],
    ["section=inventory&inventoryTool=reservations", "Inventory"], ["section=inventory&inventoryTool=transfer", "Transfer"],
    ["section=pricing&pricingScope=branch&pricingField=prices", "BranchPricing"],
    ["section=pricing&pricingScope=branch&pricingField=reference-cost", "BranchReferenceCost"],
  ] as const) it(`mounts only the operational selector for ${query}`, () => {
    const value = operationalManagementCapabilitiesFixture(); value.listing.canManage = value.inventory.canTransfer = value.pricing.canManageBranchOverrides = true;
    const calls: (OperationalBranchPurpose | null)[] = [];
    const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: [], query: new URLSearchParams(`${query}&branchId=a&purpose=Wrong`), locale: "en", onRetry() {},
      branchManagement: createElement("div", null, "GENERAL-MANAGEMENT"), operationalSelector: (purpose, branchId) => { calls.push(purpose); assert.equal(branchId, "a"); return element(ready(purpose), branchId, "en", purpose); },
    }));
    assert.deepEqual(calls, [expectedPurpose]); assert.match(html, /Operational Branch/); assert.doesNotMatch(html, /GENERAL-MANAGEMENT/);
    assert.ok(html.indexOf("operations-context-controls") < html.indexOf("operational-branch-selector"));
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  });
  it("keeps default/details General management and workspace Pricing free of A6", () => {
    for (const query of ["section=branches", "section=branches&branchTool=details", "section=pricing&pricingScope=workspace&pricingField=prices", "section=pricing&pricingScope=workspace&pricingField=reference-cost"]) {
      const value = operationalManagementCapabilitiesFixture(); value.branches.canView = value.pricing.canView = true;
      let calls = 0;
      const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: [], query: new URLSearchParams(`${query}&branchId=a`), locale: "en", onRetry() {},
        branchManagement: createElement("div", null, "GENERAL-MANAGEMENT"), operationalSelector: () => { calls++; return null; },
      }));
      assert.equal(calls, 0);
      if (query.includes("section=branches")) assert.match(html, /GENERAL-MANAGEMENT/); else { assert.match(html, /does not require a branch/); assert.doesNotMatch(html, /GENERAL-MANAGEMENT/); }
    }
  });
  it("retains Operations navigation and never mounts General management after A6 403", () => {
    const value = operationalManagementCapabilitiesFixture(); value.listing.canManage = true;
    const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: [], query: new URLSearchParams("section=branches&branchTool=listing"), locale: "en", onRetry() {},
      branchManagement: createElement("div", null, "GENERAL-MANAGEMENT"), operationalSelector: () => element({ type: "Failed", purpose: "Listing", kind: "Forbidden" }),
    }));
    assert.match(html, /section=branches/); assert.match(html, /Operational branch selection is forbidden/); assert.doesNotMatch(html, /GENERAL-MANAGEMENT|No operational branches available/);
  });
  it("uses canonical context links without carrying identifiers into another purpose", () => {
    const value = operationalManagementCapabilitiesFixture(); value.inventory.canTransfer = true;
    const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: [], query: new URLSearchParams("section=inventory&inventoryTool=transfer&branchId=old&purpose=Wrong"), locale: "ar", onRetry() {} }));
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(hrefs.some((href) => href.includes("inventoryTool=stock"))); assert.ok(hrefs.some((href) => href.includes("inventoryTool=reservations"))); assert.ok(hrefs.some((href) => href.includes("inventoryTool=transfer")));
    for (const href of hrefs) assert.doesNotMatch(href, /branchId|purpose/);
    for (const key of ["Stock", "Reservations", "Transfer"] as const) assert.ok(html.includes(operationsText("ar", key)));
  });
  it("preserves architecture, lifecycle masking, URL-only selection and exact A6 boundary", () => {
    for (const name of ["operational-branch-api.client.ts", "operational-branch-selector.types.ts", "operational-branch-selector.coordinator.ts", "OperationalBranchSelector.tsx", "operations-query-state.ts"]) {
      const source = readFileSync(`domains/workspace/branches/presentation/${name}`, "utf8");
      assert.doesNotMatch(source, /from ["'][^"']*(?:repositories|infrastructure|\/domain\/|trusted-actor-context|workspace-branch-api|branch-management|\/mock\/)/);
      assert.doesNotMatch(source, /\.role|\.permissions|\.branchScope|\.workspaceId|allowedActions|localStorage|sessionStorage|\/api\/catalog|\/api\/inventory|\/api\/products/);
      assert.doesNotMatch(source, /["']\/api\/branches["']|\.sort\(|localeCompare/);
    }
    const component = readFileSync("domains/workspace/branches/presentation/OperationalBranchSelector.tsx", "utf8");
    assert.match(component, /coordinator\.dispose\(\)/); assert.match(component, /snapshot\?\.lifecycle === lifecycle/);
    assert.match(component, /\[lifecycle, purpose, onAuthenticationRequired, refreshVersion\]/);
    const page = readFileSync("domains/workspace/branches/presentation/OperationsPage.tsx", "utf8");
    assert.match(page, /key=\{purpose\}/); assert.match(page, /router.replace\(operationsContextHref\(context, id\), \{ scroll: false \}\)/);
    assert.match(page, /lifecycle=\{actor\} onAuthenticationRequired=\{redirectExpired\}/);
  });
  it("uses one RTL/LTR tree, mobile full-width controls, 44px labels and visible focus", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /\.operations-context-controls nav \{ display: grid/);
    assert.match(css, /\.operations-context-controls a \{[^}]*min-height: 44px/);
    assert.match(css, /\.operational-branch-option \{[^}]*min-height: 44px/);
    assert.match(css, /\.operational-branch-selector \.button \{[^}]*width: 100%/);
    assert.match(css, /@media \(min-width: 481px\)/); assert.match(css, /@media \(min-width: 1025px\)/);
    assert.match(css, /:focus-visible \{[^}]*outline:/);
    const shell = readFileSync("domains/identity/presentation/components/presentation-shell.tsx", "utf8"); assert.match(shell, /dir=\{i18n.dir\}/);
  });
});
