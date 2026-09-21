import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListingPanelContent } from "./ListingPanel";
import { initialListingState } from "./listing.coordinator";
import { listingText, listingFailureText } from "./listing.i18n";
import type { ListingState } from "./listing.types";
import { listingFixture } from "./mock/listing.fixture";
const actions = { choose() {}, cancel() {}, review() {}, submit() {}, reload() {} };
const render = (patch: Partial<ListingState> = {}, locale: "en" | "ar" = "en", inspectionOnly = false) => renderToStaticMarkup(createElement(ListingPanelContent, {
  state: { ...initialListingState(), ...patch }, locale, resourceLabel: "<Product> — Main", actions, inspectionOnly,
}));
const ready = { type: "Ready" as const, value: listingFixture() };
describe("Listing panel", () => {
  for (const locale of ["en", "ar"] as const) {
    it(`renders distinct bilingual loading, statuses, errors and successful refetch (${locale})`, () => {
      assert.ok(render({}, locale).includes(listingText(locale, "loading")));
      for (const listingStatus of ["NotConfigured", "Listed", "Unlisted"] as const) {
        const html = render({ detail: { type: "Ready", value: listingFixture({ listingStatus, ...(listingStatus === "NotConfigured" ? { revision: 0, updatedAt: null } : {}) }) } }, locale);
        assert.ok(html.includes(listingText(locale, listingStatus))); assert.match(html, /&lt;Product&gt;/); assert.doesNotMatch(html, /<Product>/);
      }
      for (const kind of ["Forbidden", "BranchNotFound", "ProductNotFound", "NetworkFailure", "MalformedResponse", "BranchProductServiceUnavailable"] as const) {
        const html = render({ detail: { type: "Failed", kind } }, locale);
        assert.ok(html.includes(listingFailureText(locale, kind))); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /Set Listed|Set Unlisted|تعيين كمدرج|تعيين كغير مدرج/);
      }
      assert.ok(render({ detail: ready, saved: true }, locale).includes(listingText(locale, "saved")));
      assert.ok(render({ detail: { type: "Failed", kind: "NetworkFailure" }, saved: true }, locale).includes(listingText(locale, "savedRefreshFailed")));
    });
    it(`renders accessible explicit review with conflict acknowledgement before retry (${locale})`, () => {
      const html = render({ detail: ready, intent: "SetUnlisted", reviewRequired: true, failure: "Conflict" }, locale);
      assert.match(html, /<dialog[^>]*aria-labelledby="[^"]+-confirm"/); assert.match(html, /tabindex="-1"/);
      assert.ok(html.includes(listingText(locale, "reviewRequired"))); assert.ok(html.includes(listingText(locale, "reviewed")));
      assert.match(html, /<button[^>]*disabled=""[^>]*>[^<]+<\/button>/); assert.ok(html.includes(listingText(locale, "cancel")));
      assert.ok(html.includes(listingText(locale, "Conflict"))); assert.doesNotMatch(html, /name="expectedRevision"|workspaceId|permissions/);
    });
  }
  it("renders only returned actions and never enables changes during inactive inspection", () => {
    const one = render({ detail: { type: "Ready", value: listingFixture({ allowedActions: ["SetUnlisted"] }) } });
    assert.match(one, /aria-label="Set Unlisted: &lt;Product&gt;/); assert.doesNotMatch(one, /Set Listed/);
    const none = render({ detail: { type: "Ready", value: listingFixture({ allowedActions: [] }) } });
    assert.match(none, /No listing changes/); assert.doesNotMatch(none, /<button/);
    const inactive = render({ detail: ready }, "en", true); assert.match(inactive, /Branch is inactive/); assert.doesNotMatch(inactive, /<button/);
  });
  it("keeps confirmation unavailable when the action was removed during conflict refresh", () => {
    const html = render({ detail: { type: "Ready", value: listingFixture({ allowedActions: [] }) }, intent: "SetListed", reviewRequired: true });
    assert.match(html, /Requested action/); assert.match(html, /Cancel/); assert.doesNotMatch(html, />Confirm change<|>I reviewed/);
  });
  it("disables confirmation and cancellation while pending and exposes live status", () => {
    const html = render({ detail: ready, intent: "SetUnlisted", pending: true });
    assert.match(html, /aria-busy="true"/); assert.match(html, /role="status" aria-live="polite"/);
    assert.match(html, /disabled="">Confirm change/); assert.match(html, /disabled="">Cancel/);
  });
  it("uses wrapping touch controls, bounded dialog, technical bidi isolation and semantic time", () => {
    const html = render({ detail: ready, intent: "SetListed" }, "ar");
    assert.match(html, /min-height:44px/); assert.match(html, /flex-wrap:wrap/); assert.match(html, /overflow-wrap:anywhere/);
    assert.match(html, /<time dateTime="2026-09-21T12:00:00.000Z"/); assert.match(html, /<bdi dir="ltr">UTC/);
    assert.doesNotMatch(html, /<h1/); assert.match(html, /max-height:calc\(100dvh - 2rem\)/);
  });
});
