import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InventoryPanelContent } from "./InventoryPanel";
import { initialInventoryState } from "./inventory.coordinator";
import { inventoryFailureText, inventoryText } from "./inventory.i18n";
import type { InventoryState } from "./inventory.types";
import { availabilityFixture, mutationFixture, quantityFixture } from "./mock/inventory.fixture";

const actions = { choose() {}, update() {}, review() {}, cancel() {}, acknowledgeRetry() {}, submit() {}, reload() {} };
const hints = { canViewAvailability: true, canViewQuantities: true, canReceive: true, canIssue: true, canManageDamage: true, canAdjust: true };
const render = (patch: Partial<InventoryState> = {}, locale: "en" | "ar" = "en", inspectionOnly = false) => renderToStaticMarkup(createElement(InventoryPanelContent, {
  state: { ...initialInventoryState(), ...patch }, hints, locale, resourceLabel: "<Product> — Main", actions, inspectionOnly,
}));
describe("Inventory panel", () => {
  for (const locale of ["en", "ar"] as const) it(`renders bilingual detailed, semantic, forbidden-read and failure states (${locale})`, () => {
    const detailed = render({ detail: { type: "Ready", value: quantityFixture() } }, locale);
    for (const value of ["7", "10", "2", "1"]) assert.ok(detailed.includes(`>${value}<`));
    assert.ok(detailed.includes(inventoryText(locale, "updated"))); assert.match(detailed, /<time dateTime=/u);
    const semantic = render({ detail: { type: "Ready", value: availabilityFixture({ availability: "OutOfStock" }) } }, locale);
    assert.ok(semantic.includes(inventoryText(locale, "OutOfStock"))); assert.doesNotMatch(semantic, />7<|Revision|المراجعة|<time/u);
    const forbidden = render({ detail: { type: "ForbiddenRead" } }, locale);
    assert.ok(forbidden.includes(inventoryText(locale, "forbiddenRead"))); assert.ok(forbidden.includes(inventoryText(locale, "Receive")));
    const failed = render({ detail: { type: "Failed", kind: "InventoryServiceUnavailable" } }, locale);
    assert.ok(failed.includes(inventoryFailureText(locale, "InventoryServiceUnavailable"))); assert.match(failed, /role="alert"/u);
  });
  it("renders exact mutation disclosure without fabricating hidden values", () => {
    const minimum = render({ detail: { type: "ForbiddenRead" }, outcome: mutationFixture() });
    assert.match(minimum, /No Inventory balance was disclosed/u); assert.doesNotMatch(minimum, />0<|Revision|Last updated/u);
    const semantic = render({ detail: { type: "ForbiddenRead" }, outcome: mutationFixture({ availability: "InStock" }) });
    assert.match(semantic, /In stock/u); assert.doesNotMatch(semantic, />7<|Revision/u);
    const detailed = render({ detail: { type: "Ready", value: quantityFixture() }, outcome: mutationFixture({ balance: quantityFixture() }) });
    assert.match(detailed, />7</u);
  });
  it("provides explicit accessible review, focus target, pending guard and touch-friendly controls", () => {
    const state: Partial<InventoryState> = { detail: { type: "Ready", value: quantityFixture() }, operation: "CorrectIncrease", draft: { quantity: "2", reasonCode: "COUNT", note: "Checked" },
      operationId: "operation-0001", review: { operation: "CorrectIncrease", operationId: "operation-0001", quantity: "2", reasonCode: "COUNT", note: "Checked" },
      reviewRequired: true, failure: "InventoryConflict" };
    const html = render(state);
    assert.match(html, /<dialog[^>]*aria-labelledby="[^"]+-confirm"/u); assert.match(html, /tabindex="-1"/u);
    assert.match(html, /Review the retained command/u); assert.match(html, /I reviewed this retry/u); assert.match(html, /disabled="">Confirm operation/u);
    assert.match(html, /min-height:44px/u); assert.match(html, /flex-wrap:wrap/u); assert.match(html, /max-height:calc\(100dvh - 2rem\)/u);
    assert.doesNotMatch(html, /workspaceId|permissions|expectedRevision|name="operationId"/u);
  });
  it("keeps known inactive inspection read-only even when hints advertise mutations", () => {
    const html = render({ detail: { type: "Ready", value: quantityFixture() } }, "en", true);
    assert.match(html, /Branch is inactive/u); assert.match(html, /No basic Inventory operations/u);
    assert.doesNotMatch(html, />Receive<|>Issue<|>Correct increase<|>Mark damaged</u);
  });
});
