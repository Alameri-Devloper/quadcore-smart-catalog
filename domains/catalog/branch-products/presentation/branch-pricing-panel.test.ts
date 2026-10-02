import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BranchPricingPanelContent } from "./BranchPricingPanel";
import { initialBranchPricingFieldState, initialBranchPricingState } from "./branch-pricing.coordinator";
import { branchPricingText } from "./branch-pricing.i18n";
import { branchPricingFixture, branchPricingSlotFixture, branchPricingValueFixture } from "./mock/branch-pricing.fixture";
import type { BranchPricingState } from "./branch-pricing.types";

const actions = { chooseSet() {}, chooseClear() {}, activate() {}, cancel() {}, review() {}, submit() {}, reload() {} };
const render = (patch: Partial<BranchPricingState>, surface: "prices" | "reference-cost" = "prices", locale: "en" | "ar" = "en",
  inspectionOnly = false) => renderToStaticMarkup(createElement(BranchPricingPanelContent, {
    state: { ...initialBranchPricingState(), ...patch }, surface, locale, inspectionOnly,
    branchLabel: "<Branch>", productLabel: "<Product>", actions,
  }));

describe("Branch pricing panel", () => {
  it("renders only server-returned fields and never reconstructs unauthorized placeholders", () => {
    const html = render({ detail: { type: "Ready", value: branchPricingFixture({ prices: { Retail: branchPricingSlotFixture() } }) } });
    assert.match(html, /Branch price overrides/); assert.match(html, /Retail/); assert.doesNotMatch(html, /Wholesale|Reference Cost/);
    assert.doesNotMatch(html, /permissions|workspaceId|Hidden/); assert.match(html, /Workspace base/); assert.match(html, /Branch override/);
    assert.match(html, /Effective value/); assert.match(html, /Effective source/); assert.match(html, /Override revision/);
  });

  it("keeps configured zero distinct from NotConfigured and renders only authoritative actions", () => {
    const html = render({ detail: { type: "Ready", value: branchPricingFixture({ prices: {
      Retail: branchPricingSlotFixture({ override: branchPricingValueFixture({ value: { amountMinor: "0", currency: "USD" } }),
        effective: { amountMinor: "0", currency: "USD" }, allowedActions: [] }),
      Wholesale: branchPricingSlotFixture({ base: branchPricingValueFixture({ state: "NotConfigured", value: null }),
        override: branchPricingValueFixture({ state: "NotConfigured", value: null }), overrideRevision: 0, effective: null,
        source: "NotConfigured", allowedActions: ["SetOverride"] }),
    } }) } });
    assert.match(html, /Configured/); assert.match(html, /<bdi dir="ltr">0/); assert.match(html, /Not configured/);
    assert.match(html, /No override changes/); assert.match(html, /Review Set override: Wholesale/);
    assert.doesNotMatch(html, /Review Clear override: Wholesale/);
  });

  it("renders Reference Cost alone, independent revisions, inactive inspection, and no ordinary-price leakage", () => {
    const value = branchPricingFixture({ baseProductRevision: undefined, baseReferenceCostRevision: 0, prices: {
      ReferenceCost: branchPricingSlotFixture({ override: branchPricingValueFixture({ state: "NotConfigured", value: null }),
        overrideRevision: 0, effective: { amountMinor: "500", currency: "USD" }, source: "WorkspaceBase",
        base: branchPricingValueFixture({ value: { amountMinor: "500", currency: "USD" } }), allowedActions: [] }),
    } });
    const html = render({ detail: { type: "Ready", value } }, "reference-cost", "en", true);
    assert.match(html, /Branch Reference Cost override/); assert.match(html, /Workspace base revision[^0]*0/);
    assert.match(html, /inspection only/); assert.doesNotMatch(html, /Retail|Wholesale|Review Set override|Review Clear override/);
  });

  for (const locale of ["en", "ar"] as const) it(`renders bilingual accessible Review → Confirm and conflict recovery (${locale})`, () => {
    const field = { ...initialBranchPricingFieldState(), intent: { field: "Retail", action: "SetOverride", amountMinor: "0", currency: "USD" } as const,
      reviewRequired: true, failure: "Conflict" as const };
    const html = render({ detail: { type: "Ready", value: branchPricingFixture() }, activeField: "Retail", fields: { Retail: field } }, "prices", locale);
    assert.match(html, /<dialog[^>]*aria-labelledby=/); assert.match(html, /tabindex="-1"/); assert.match(html, /role="alert"/);
    assert.ok(html.includes(branchPricingText(locale, "reviewRequired"))); assert.ok(html.includes(branchPricingText(locale, "reviewed")));
    assert.match(html, /<bdi dir="ltr">0/); assert.match(html, /<bdi dir="ltr">USD/);
  });

  it("disables only the pending field editor and keeps sibling controls enabled", () => {
    const html = render({ detail: { type: "Ready", value: branchPricingFixture() }, fields: {
      Retail: { ...initialBranchPricingFieldState(), pending: true }, Wholesale: initialBranchPricingFieldState(),
    } });
    assert.equal((html.match(/disabled=""/g) ?? []).length, 4);
    assert.match(html, /aria-busy="true"/); assert.match(html, /Review Set override: Wholesale/);
  });

  it("reports an accepted mutation whose authoritative refresh failed", () => {
    const html = render({ detail: { type: "Failed", kind: "NetworkFailure" }, fields: {
      Retail: { ...initialBranchPricingFieldState(), saved: true },
    } });
    assert.match(html, /accepted, but authoritative state could not be refreshed/); assert.match(html, /role="alert"/);
  });
});
