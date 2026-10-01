import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspacePricingPanelContent } from "./WorkspacePricingPanel";
import { initialWorkspacePricingState } from "./workspace-pricing.coordinator";
import { workspacePricingText } from "./workspace-pricing.i18n";
import { workspacePricingFixture, workspacePricingSlotFixture } from "./mock/workspace-pricing.fixture";
import type { WorkspacePricingState } from "./workspace-pricing.types";

const actions = { chooseSet() {}, chooseClear() {}, cancel() {}, review() {}, submit() {}, reload() {} };
const render = (patch: Partial<WorkspacePricingState>, surface: "prices" | "reference-cost" = "prices", locale: "en" | "ar" = "en") =>
  renderToStaticMarkup(createElement(WorkspacePricingPanelContent, {
    state: { ...initialWorkspacePricingState(), ...patch }, surface, locale, productLabel: "<Product>", actions,
  }));

describe("Workspace pricing panel", () => {
  it("renders only present Retail/Wholesale slots and never reconstructs omitted Reference Cost", () => {
    const value = workspacePricingFixture({ wholesale: undefined, referenceCost: undefined });
    const html = render({ detail: { type: "Ready", value } });
    assert.match(html, /Workspace prices/); assert.match(html, /Retail/); assert.doesNotMatch(html, /Wholesale|Reference Cost/);
    assert.doesNotMatch(html, /Hidden|referenceCostRevision|workspaceId|permissions/);
    assert.match(html, /<bdi dir="ltr">1500/); assert.match(html, /<bdi dir="ltr">USD/);
  });

  it("renders Reference Cost alone without price leakage and preserves absence revision zero", () => {
    const value = workspacePricingFixture({ retail: undefined, wholesale: undefined,
      referenceCost: { state: "NotConfigured", value: null, allowedActions: ["Set", "Clear"], referenceCostRevision: 0 } });
    const html = render({ detail: { type: "Ready", value } }, "reference-cost");
    assert.match(html, /Workspace reference cost/); assert.match(html, /Not configured/); assert.match(html, /<bdi dir="ltr">0/);
    assert.doesNotMatch(html, /Retail|Wholesale|productRevision/);
  });

  it("keeps configured zero distinct and renders only server-returned actions", () => {
    const value = workspacePricingFixture({ retail: workspacePricingSlotFixture({ value: { amountMinor: "0", currency: "YER" }, allowedActions: [] }),
      wholesale: workspacePricingSlotFixture({ state: "NotConfigured", value: null, allowedActions: ["Set"] }), referenceCost: undefined });
    const html = render({ detail: { type: "Ready", value } });
    assert.match(html, /Configured/); assert.match(html, /<bdi dir="ltr">0/); assert.match(html, /Not configured/);
    assert.match(html, /No pricing changes/); assert.match(html, /Review Set: Wholesale/); assert.doesNotMatch(html, /Review Clear: Wholesale/);
  });

  for (const locale of ["en", "ar"] as const) it(`renders bilingual accessible Review → Confirm and conflict acknowledgement (${locale})`, () => {
    const value = workspacePricingFixture({ referenceCost: undefined });
    const html = render({ detail: { type: "Ready", value }, intent: { field: "Retail", action: "Set", amountMinor: "0", currency: "USD" },
      reviewRequired: true, failure: "Conflict" }, "prices", locale);
    assert.match(html, /<dialog[^>]*aria-labelledby=/); assert.match(html, /tabindex="-1"/); assert.match(html, /role="alert"/);
    assert.ok(html.includes(workspacePricingText(locale, "reviewRequired"))); assert.ok(html.includes(workspacePricingText(locale, "reviewed")));
    assert.match(html, /<bdi dir="ltr">0/); assert.match(html, /<bdi dir="ltr">USD/); assert.doesNotMatch(html, /Reference Cost/);
  });

  it("disables the shared editors and dialog controls while a mutation is pending", () => {
    const html = render({ detail: { type: "Loading" }, intent: { field: "Wholesale", action: "Clear" }, pendingField: "Wholesale" });
    assert.match(html, /aria-busy="true"/); assert.match(html, /role="status" aria-live="polite"/);
    assert.doesNotMatch(html, />Confirm change</); assert.match(html, /disabled="">Cancel/);
  });

  it("uses responsive wrapping, touch-sized controls, bounded dialog and escaped Product labels", () => {
    const html = render({ detail: { type: "Ready", value: workspacePricingFixture({ referenceCost: undefined }) }, intent: { field: "Retail", action: "Clear" } }, "prices", "ar");
    assert.match(html, /min-height:44px/); assert.match(html, /flex-wrap:wrap/); assert.match(html, /repeat\(auto-fit/);
    assert.match(html, /max-height:calc\(100dvh - 2rem\)/); assert.match(html, /&lt;Product&gt;/); assert.doesNotMatch(html, /<Product>/);
  });
});
