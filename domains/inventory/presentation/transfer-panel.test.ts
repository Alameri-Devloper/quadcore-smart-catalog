import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TransferPanelContent } from "./TransferPanel";
import { initialTransferState } from "./transfer.coordinator";
import { transferText } from "./transfer.i18n";
import { detailedTransferFixture, transferMutationFixture } from "./mock/transfer.fixture";
import type { TransferState } from "./transfer.types";

const branches = [
  { branchId: "branch-source", code: "SRC", displayName: "Source Branch", status: "Active" as const },
  { branchId: "branch-destination", code: "DST", displayName: "Destination Branch", status: "Active" as const },
];
const actions = { update() {}, review() {}, cancel() {}, acknowledgeRetry() {}, submit() {}, reload() {} };
const render = (patch: Partial<TransferState> = {}, locale: "en" | "ar" = "en") => renderToStaticMarkup(createElement(TransferPanelContent, {
  state: { ...initialTransferState("branch-source", branches, "branch-destination", "product-one"), ...patch },
  locale, canTransferHint: true, productLabel: "Product One", actions,
}));
describe("Transfer panel", () => {
  it("renders all three disclosure tiers without inventing hidden values", () => {
    const detailed = render({ outcome: detailedTransferFixture() }); assert.match(detailed, /Source Inventory/u); assert.match(detailed, />7</u); assert.match(detailed, /transfer-one/u);
    const semantic = render({ outcome: transferMutationFixture({ sourceAvailability: "OutOfStock", destinationAvailability: "InStock" }) });
    assert.match(semantic, /Out of Stock/u); assert.match(semantic, /In Stock/u); assert.doesNotMatch(semantic, /On hand|Revision|Last updated|>7</u);
    const minimum = render({ outcome: transferMutationFixture() }); assert.match(minimum, /No Inventory balance or availability/u); assert.match(minimum, /transfer-one/u);
    assert.doesNotMatch(minimum, /On hand|Revision|permissions|workspaceId/u);
  });
  for (const locale of ["en", "ar"] as const) it(`renders bilingual source/destination/Product/draft terminology (${locale})`, () => {
    const html = render({}, locale); for (const key of ["title", "sourceBranch", "destinationBranch", "product", "quantity", "reasonCode"] as const)
      assert.ok(html.includes(transferText(locale, key))); assert.match(html, /<bdi/u); assert.equal((html.match(/<input[^>]*dir="ltr"/gu) ?? []).length, 2);
  });
  it("renders accessible review, exact reason, focus target, busy/retry guard and responsive touch controls", () => {
    const review = { operationId: "operation-transfer-0001", sourceBranchId: "branch-source", destinationBranchId: "branch-destination",
      productId: "product-one", quantity: "2", reasonCode: "REBALANCE_01" };
    const html = render({ draft: { quantity: "2", reasonCode: "REBALANCE_01" }, operationId: review.operationId, review,
      reviewRequired: true, failure: "NetworkFailure" });
    assert.match(html, /<dialog[^>]*tabindex="-1"[^>]*aria-labelledby=/u); assert.match(html, /REBALANCE_01/u); assert.match(html, /I reviewed this retry/u);
    assert.match(html, /disabled="">Confirm Transfer/u); assert.match(html, /role="alert"/u); assert.match(html, /role="status"/u);
    assert.match(html, /min-height:44px/u); assert.match(html, /flex-wrap:wrap/u); assert.match(html, /max-height:calc\(100dvh - 2rem\)/u);
    assert.doesNotMatch(html, /name="operationId"|expectedRevision|note/u);
  });
  it("blocks inactive and same-Branch confirmation guidance", () => {
    const same = render({ destinationBranchId: "branch-source" }); assert.match(same, /must be different/u); assert.match(same, /disabled=""/u);
    const inactiveBranches = [branches[0], { ...branches[1], status: "Inactive" as const }];
    const inactive = render({ branches: inactiveBranches }); assert.match(inactive, /Both Branches must be active/u); assert.match(inactive, /disabled=""/u);
  });
});
