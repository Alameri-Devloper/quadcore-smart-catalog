import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReservationPanelContent } from "./ReservationPanel";
import { initialReservationState } from "./reservation.coordinator";
import { reservationFixture, reservationMutationFixture, reservationPageFixture } from "./mock/reservation.fixture";
import type { ReservationState } from "./reservation.types";

const actions = { select() {}, next() {}, firstPage() {}, choose() {}, update() {}, review() {}, cancel() {}, acknowledgeRetry() {}, submit() {}, reload() {} };
const render = (patch: Partial<ReservationState> = {}, inactiveBranch = false, canReserveHint = true) => renderToStaticMarkup(createElement(ReservationPanelContent, {
  state: { ...initialReservationState({ reservationCursor: null, reservationId: "reservation-one" }), ...patch }, resource: { branchId: "branch-main", productId: "product-one" },
  resourceLabel: "Product One — Main Branch", canReserveHint, inactiveBranch, locale: "en", actions,
}));

describe("Reservation panel", () => {
  it("renders actionable collection cards, selected detail, bidi-safe fields and touch-friendly controls", () => {
    const html = render({ collection: { type: "Ready", value: reservationPageFixture() }, detail: { type: "Ready", value: reservationFixture() } });
    assert.match(html, /Actionable Reservations/u); assert.match(html, /Open Reservation: reservation-one/u); assert.match(html, /Current Reservation/u);
    assert.match(html, /dir="ltr"/u); assert.match(html, /dateTime="2026-09-26T10:00:00.000Z"/u); assert.match(html, /min-height:44px/u);
    assert.match(html, />Release</u); assert.match(html, />Fulfill</u); assert.match(html, />Reserve</u); assert.match(html, /flex-wrap:wrap/u);
  });
  it("renders Release/Fulfill only from current detail allowedActions and never from A1 alone", () => {
    const none = render({ collection: { type: "Ready", value: reservationPageFixture() }, detail: { type: "Ready", value: reservationFixture({ allowedActions: [] }) } }, false, true);
    assert.doesNotMatch(none, />Release<|>Fulfill</u); assert.match(none, />Reserve</u);
    const actionsOnly = render({ detail: { type: "Ready", value: reservationFixture({ allowedActions: ["Release"] }) } }, false, false);
    assert.match(actionsOnly, />Release</u); assert.doesNotMatch(actionsOnly, />Fulfill|>Reserve</u);
  });
  it("keeps Reservation-specific mutation state while rendering only authorized balance projection", () => {
    const minimum = render({ outcome: reservationMutationFixture() });
    assert.match(minimum, /reservation-one/u); assert.match(minimum, /Remaining quantity/u); assert.match(minimum, /No Inventory balance or availability/u);
    assert.doesNotMatch(minimum, /On hand|Revision|Workspace|permissions/u);
    const semantic = render({ outcome: reservationMutationFixture({ availability: "InStock" }) }); assert.match(semantic, /Current availability: In stock/u);
  });
  it("provides accessible confirmation, validation, busy/retry guard, live regions and responsive dialog bounds", () => {
    const html = render({ operation: "Reserve", draft: { quantity: "2", reasonCode: "ORDER" }, operationId: "operation-0001",
      review: { operation: "Reserve", operationId: "operation-0001", productId: "product-one", reservationId: null, quantity: "2", reasonCode: "ORDER" },
      reviewRequired: true, failure: "InventoryConflict", pending: false });
    assert.match(html, /<dialog[^>]*tabindex="-1"[^>]*aria-labelledby=/u); assert.match(html, /Review the retained command/u); assert.match(html, /I reviewed this retry/u);
    assert.match(html, /disabled="">Confirm operation/u); assert.match(html, /role="alert"/u); assert.match(html, /max-height:calc\(100dvh - 2rem\)/u);
    assert.doesNotMatch(html, /name="operationId"|expectedRevision|expectedStatus|note/u);
  });
  it("preserves known inactive inspection, blocks fresh Reserve, and retains server-returned current actions", () => {
    const html = render({ collection: { type: "Ready", value: reservationPageFixture() }, detail: { type: "Ready", value: reservationFixture() } }, true, true);
    assert.match(html, /Branch is inactive/u); assert.doesNotMatch(html, />Reserve</u); assert.match(html, />Release</u); assert.match(html, />Fulfill</u);
  });
  it("renders empty, InvalidCursor reset, loading and safe failure states distinctly in English and Arabic", () => {
    assert.match(render({ collection: { type: "Ready", value: { items: [], nextCursor: null } } }), /No actionable Reservations/u);
    assert.match(render({ cursorReset: true }), /page position was no longer valid/u); assert.match(render({ collection: { type: "Loading" } }), /Loading actionable Reservations/u);
    assert.match(render({ detail: { type: "Failed", kind: "ReservationNotFound" } }), /Branch, Product, or Reservation is unavailable/u);
    const arabic = renderToStaticMarkup(createElement(ReservationPanelContent, { state: initialReservationState(), resource: { branchId: "branch-main", productId: "product-one" },
      resourceLabel: "منتج — فرع", canReserveHint: true, inactiveBranch: false, locale: "ar", actions }));
    assert.match(arabic, /الحجوزات/u); assert.match(arabic, /اختر حجزاً/u);
  });
});
