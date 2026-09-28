import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OperationsTransferWorkflow } from "./OperationsTransferWorkflow";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { transferText } from "../../../inventory/presentation/transfer.i18n";

const branches: OperationalBranchState = { type: "Ready", purpose: "Transfer", availability: "Available", options: [
  { branchId: "branch-source", code: "SRC-01", displayName: "Source Branch", status: "Active" },
  { branchId: "branch-destination", code: "DST-02", displayName: "Destination Branch", status: "Active" },
  { branchId: "branch-inactive", code: "OFF-03", displayName: "Inactive Branch", status: "Inactive" },
] };
const render = (locale: "en" | "ar") => renderToStaticMarkup(createElement(OperationsTransferWorkflow, {
  context: { section: "Inventory", inventoryTool: "transfer" }, branchId: "branch-source", query: { q: "", productCursor: null, productId: null, issue: null },
  branches, hints: { canViewAvailability: false, canViewQuantities: false }, canTransferHint: true, lifecycle: {}, locale,
  onQueryChange() {}, onAuthenticationRequired() {}, refreshBranches() {},
}));
describe("Operations Transfer workflow Presentation", () => {
  for (const locale of ["en", "ar"] as const) it(`uses the same A6 Transfer rows for a bilingual accessible destination selector (${locale})`, () => {
    const html = render(locale); assert.ok(html.includes(transferText(locale, "destinationBranch"))); assert.ok(html.includes(transferText(locale, "sameBranch")));
    for (const value of ["Source Branch", "Destination Branch", "Inactive Branch", "SRC-01", "DST-02", "OFF-03"]) assert.ok(html.includes(value));
    assert.match(html, /<fieldset[^>]*aria-describedby=/u); assert.match(html, /class="operational-branch-options"/u); assert.match(html, /<bdi dir="ltr">SRC-01<\/bdi>/u);
    assert.equal((html.match(/disabled=""/gu) ?? []).length, 2); assert.doesNotMatch(html, /destinationBranchId=|productId=|transferId=/u);
  });
  it("does not mount source-scoped Product discovery until a valid local destination is selected", () => {
    const html = render("en"); assert.doesNotMatch(html, /Search Products|Select a Product from the source Branch/u);
  });
});
