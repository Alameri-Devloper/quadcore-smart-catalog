import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beginTemplateConflictReview, completeTemplateConflictReview, resolveTemplateVisibilityConflict, templateMutationInput } from "./catalog-reference-data-management.coordinator";
import type { SpecificationTemplateEntryView } from "./catalog-reference-data-management.types";

const entry = (id: string, publicVisibility: "internal" | "public", sortOrder = 0): SpecificationTemplateEntryView => ({ specificationDefinitionId: id, publicVisibility, sortOrder, required: false });
const latest = (entries: readonly SpecificationTemplateEntryView[], version = 2) => ({ id: "template-a", productTypeId: "type-a", version, entries });

describe("P2 visibility-aware editor conflict coordinator", () => {
  for (const [draftValue, latestValue] of [["public", "internal"], ["internal", "public"]] as const) {
    it(`surfaces draft ${draftValue} versus latest ${latestValue} without changing draft`, () => {
      const draft = [entry("a", draftValue)];
      const review = beginTemplateConflictReview(draft, latest([entry("a", latestValue)]));
      assert.equal(review.conflicts.length, 1);
      assert.deepEqual(review.conflicts[0], { specificationDefinitionId: "a", draftVisibility: draftValue, latestVisibility: latestValue, decision: null });
      assert.equal(draft[0].publicVisibility, draftValue);
      assert.equal(completeTemplateConflictReview(review), null);
    });
  }
  it("cannot unlock a generic review while visibility conflicts are unresolved", () => {
    const review = beginTemplateConflictReview([entry("a", "public")], latest([entry("a", "internal")]));
    assert.equal(completeTemplateConflictReview(review), null);
  });
  it("Use Latest explicitly adopts canonical visibility", () => {
    const draft = [entry("a", "public")];
    const review = beginTemplateConflictReview(draft, latest([entry("a", "internal")]));
    const resolved = resolveTemplateVisibilityConflict(draft, review, "a", "latest");
    assert.equal(resolved.entries[0].publicVisibility, "internal");
    assert.equal(resolved.review.conflicts[0].decision, "latest");
    assert.deepEqual(completeTemplateConflictReview(resolved.review), { expectedVersion: 2 });
  });
  it("Keep Draft records a fresh explicit decision against the reviewed version", () => {
    const draft = [entry("a", "public")];
    const review = beginTemplateConflictReview(draft, latest([entry("a", "internal")], 4));
    const resolved = resolveTemplateVisibilityConflict(draft, review, "a", "draft");
    assert.equal(resolved.entries[0].publicVisibility, "public");
    assert.equal(resolved.review.conflicts[0].decision, "draft");
    assert.deepEqual(templateMutationInput(resolved.entries, completeTemplateConflictReview(resolved.review)!.expectedVersion), { entries: resolved.entries, expectedVersion: 4 });
  });
  it("keeps partial resolution blocked and saves only against the latest reviewed version", () => {
    const draft = [entry("a", "public"), entry("b", "internal", 1)];
    let resolved = { entries: draft as readonly SpecificationTemplateEntryView[], review: beginTemplateConflictReview(draft, latest([entry("a", "internal"), entry("b", "public", 1)], 7)) };
    resolved = resolveTemplateVisibilityConflict(resolved.entries, resolved.review, "a", "latest");
    assert.equal(completeTemplateConflictReview(resolved.review), null);
    resolved = resolveTemplateVisibilityConflict(resolved.entries, resolved.review, "b", "draft");
    const completed = completeTemplateConflictReview(resolved.review);
    assert.deepEqual(completed, { expectedVersion: 7 });
    assert.equal(templateMutationInput(resolved.entries, completed!.expectedVersion).expectedVersion, 7);
  });
  it("a later 409 resets decisions and repeats the same process", () => {
    const draft = [entry("a", "public")];
    const resolved = resolveTemplateVisibilityConflict(draft, beginTemplateConflictReview(draft, latest([entry("a", "internal")])), "a", "draft");
    const retry = beginTemplateConflictReview(resolved.entries, latest([entry("a", "internal")], 3));
    assert.equal(retry.conflicts[0].decision, null);
    assert.equal(completeTemplateConflictReview(retry), null);
  });
  it("compares retained IDs independent of order and preserves existing non-visibility review", () => {
    const draft = [entry("new", "internal"), entry("a", "public", 1)];
    const review = beginTemplateConflictReview(draft, latest([entry("a", "public", 0), entry("removed", "public", 1)]));
    assert.equal(review.conflicts.length, 0);
    assert.deepEqual(completeTemplateConflictReview(review), { expectedVersion: 2 });
  });
});
