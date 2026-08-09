import assert from "node:assert/strict";
import test from "node:test";
import { mapProductEntryMediaOperationsToCanonicalWorkflow } from "./product-entry-media-workflow-coordinator.adapter";

test("Product Entry adapter maps metadata changes to canonical Product Media operations without source upload", () => {
  const mapped = mapProductEntryMediaOperationsToCanonicalWorkflow([
    { operationId: "reorder-c", type: "Reorder", targetMediaId: "c", requestedDisplayOrder: 0 },
    { operationId: "reorder-a", type: "Reorder", targetMediaId: "a", requestedDisplayOrder: 1 },
    { operationId: "cover-c", type: "SetCover", targetMediaId: "c" },
  ], ["a", "b", "c"]);
  assert.deepEqual(mapped, { type: "Resolved", operations: [
    { operationId: "reorder-c", type: "Reorder", orderedMediaIds: ["c", "a", "b"] },
    { operationId: "reorder-a", type: "Reorder", orderedMediaIds: ["c", "a", "b"] },
    { operationId: "cover-c", type: "SetCover", targetMediaId: "c" },
  ] });
  assert.equal(mapped.type === "Resolved" && mapped.operations.some((operation) => "source" in operation), false);
});

test("Product Entry adapter preserves the original canonical Reorder payload during resume", () => {
  const mapped = mapProductEntryMediaOperationsToCanonicalWorkflow([
    { operationId: "reorder-a", type: "Reorder", targetMediaId: "a", requestedDisplayOrder: 1 },
  ], ["a", "b"], new Map([["reorder-a", ["b", "a"]]]));
  assert.deepEqual(mapped, { type: "Resolved", operations: [{ operationId: "reorder-a", type: "Reorder", orderedMediaIds: ["b", "a"] }] });
});

test("Product Entry adapter resolves complete order across add, remove, and unchanged Media", () => {
  assert.deepEqual(mapProductEntryMediaOperationsToCanonicalWorkflow([
    { operationId: "remove-b", type: "Remove", targetMediaId: "b" },
    { operationId: "add-x", type: "Add", sourceSha256: "a".repeat(64), requestedDisplayOrder: 1 },
    { operationId: "reorder-c", type: "Reorder", targetMediaId: "c", requestedDisplayOrder: 0 },
  ], ["a", "b", "c"]), {
    type: "Resolved",
    operations: [
      { operationId: "remove-b", type: "Remove", targetMediaId: "b" },
      { operationId: "add-x", type: "Add", sourceSha256: "a".repeat(64), requestedDisplayOrder: 1 },
      { operationId: "reorder-c", type: "Reorder", orderedMediaIds: ["c", "add-x", "a"] },
    ],
  });
});

test("Product Entry adapter rejects invalid positions and persisted final-set mismatch", () => {
  assert.deepEqual(mapProductEntryMediaOperationsToCanonicalWorkflow([
    { operationId: "reorder-a", type: "Reorder", targetMediaId: "a", requestedDisplayOrder: 0 },
    { operationId: "reorder-b", type: "Reorder", targetMediaId: "b", requestedDisplayOrder: 0 },
  ], ["a", "b"]), { type: "Invalid", code: "DuplicateRequestedPosition" });
  assert.deepEqual(mapProductEntryMediaOperationsToCanonicalWorkflow([
    { operationId: "reorder-a", type: "Reorder", targetMediaId: "a", requestedDisplayOrder: 1 },
  ], ["a", "b"], new Map([["reorder-a", ["a"]]])), { type: "Invalid", code: "FinalMediaSetMismatch" });
});
