import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceId } from "../../types/product-identity.value-object";
import { ProductEntrySubmissionId } from "./product-entry-submission";
import { createProductEntryMediaPlan, type ProductEntryMediaOperationInput } from "./product-entry-media-plan";

const workspaceId = WorkspaceId.create("workspace-a");
const submissionId = ProductEntrySubmissionId.create("submission-a");
const createdAt = new Date("2026-08-05T00:00:00.000Z");
const metadata = (
  operationType: "Reorder" | "SetCover",
  sequence: number,
  mediaId: string,
): ProductEntryMediaOperationInput => ({
  workspaceId, submissionId, operationId: `${operationType}-${mediaId}`, operationType, sequence, mediaId,
  requestedDisplayOrder: operationType === "Reorder" ? sequence : null,
  selectedAsCover: operationType === "SetCover",
  expectedSourceSha256: null, expectedSourceByteLength: null,
  finalOrder: operationType === "Reorder" ? sequence : null,
  createdAt,
});

test("Product Entry Media Plan accepts first-class zero-file metadata operations", () => {
  const plan = createProductEntryMediaPlan([metadata("Reorder", 0, "media-a"), metadata("SetCover", 1, "media-b")]);
  assert.deepEqual(plan.map((operation) => operation.operationType), ["Reorder", "SetCover"]);
  assert.equal(plan.every((operation) => operation.expectedSourceSha256 === null), true);
});

test("Product Entry Media Plan rejects duplicate cover targets and Remove/metadata conflicts", () => {
  assert.throws(() => createProductEntryMediaPlan([
    metadata("SetCover", 0, "media-a"), metadata("SetCover", 1, "media-b"),
  ]), /at most one cover/i);
  assert.throws(() => createProductEntryMediaPlan([
    {
      workspaceId, submissionId, operationId: "remove-a", operationType: "Remove", sequence: 0,
      mediaId: "media-a", requestedDisplayOrder: null, selectedAsCover: false,
      expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: null, createdAt,
    },
    metadata("Reorder", 1, "media-a"),
  ]), /cannot also receive metadata/i);
});
