import assert from "node:assert/strict";
import { it } from "node:test";
import { TOKEN } from "../infrastructure/crypto/public-share-crypto.test-fixtures";
import { publicShareViewFixture } from "../mock/public-share-view.fixture";
import { publicShareView } from "./public-share-view";
it("server handoff is the exact anonymous allow-list and never includes semantic/internal fields", () => {
  const view = publicShareView(publicShareViewFixture(), TOKEN, "ar")!;
  assert.deepEqual(Object.keys(view).sort(), ["mainImage", "productName", "retail", "specifications"]);
  assert.deepEqual(Object.keys(view.specifications[0]).sort(), ["label", "value"]);
  assert.deepEqual(Object.keys(view.mainImage!).sort(), ["alt", "src"]); assert.ok(view.mainImage!.src.startsWith("/share/"));
  assert.ok(view.mainImage!.src.endsWith("/media")); assert.ok(!JSON.stringify(view).includes("valueType"));
});
it("rejects noncanonical token rather than constructing an alternate media capability", () => {
  for (const token of ["", "../outside", TOKEN + "=", "A".repeat(42) + "B"]) assert.equal(publicShareView(publicShareViewFixture(), token, "en"), null);
});
it("preserves all 64 qualifying items and refuses 65 without first-N truncation", () => {
  assert.equal(publicShareView(publicShareViewFixture(64), TOKEN, "en")!.specifications.length, 64);
  assert.equal(publicShareView(publicShareViewFixture(65), TOKEN, "en"), null);
});
it("enforces code-point and UTF-8 rendered value limits", () => {
  assert.ok(publicShareView(publicShareViewFixture(1, "😀".repeat(2048)), TOKEN, "en"));
  assert.equal(publicShareView(publicShareViewFixture(1, "😀".repeat(2049)), TOKEN, "en"), null);
});
it("enforces the escaped JSON aggregate rather than just raw string lengths", () => {
  assert.equal(publicShareView(publicShareViewFixture(64, "\\".repeat(2048)), TOKEN, "en"), null);
});
it("localizes Boolean values at Presentation while preserving zero and original text", () => {
  const p = publicShareViewFixture();
  const boolean = { ...p, specifications: [{ label: "Flag", valueType: "Boolean" as const, value: true }] };
  assert.equal(publicShareView(boolean, TOKEN, "ar")!.specifications[0].value, "نعم");
  assert.equal(publicShareView(boolean, TOKEN, "en")!.specifications[0].value, "Yes");
  assert.equal(publicShareView({ ...p, specifications: [{ label: "Number", valueType: "Number", value: 0 }] }, TOKEN, "en")!.specifications[0].value, "0");
  assert.equal(publicShareView(publicShareViewFixture(1, "  Original  "), TOKEN, "ar")!.specifications[0].value, "  Original  ");
});