import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { reorderProductMedia, resolveProductMediaCover, type ProductMediaItem } from "./product-media-state";
import { claimOperationAttempt, deriveProductMediaWorkflowStatus, markSourceUnavailable, PRODUCT_MEDIA_RETENTION_MILLISECONDS, stageOperation, type ProductMediaOperationState } from "./product-media-workflow";

const workspaceId = WorkspaceId.create("workspace-a");
const operation = (status: ProductMediaOperationState["status"] = "Pending", type: ProductMediaOperationState["type"] = "Add"): ProductMediaOperationState => ({ operationId: "operation-a", workflowId: "workflow-a", workspaceId, type, status, selectAsCover: false, attemptCount: 0, retryAllowed: type === "Remove", requiresNewSource: false, createdAt: new Date("2026-01-01T00:00:00Z") });
const item = (mediaId: string, displayOrder: number, createdAt: string, key = `workspaces/workspace-a/dept/product--1234567890abcdef/gallery-0${displayOrder + 1}.webp`): ProductMediaItem => ({ mediaId, workspaceId, productId: ProductId.create("product-a"), storageArtifactKey: key, checksumSha256: "a".repeat(64), mimeType: "image/webp", displayOrder, createdAt: new Date(createdAt), createdBy: "actor-a" });

describe("Product Media workflow domain", () => {
  it("derives deterministic terminal and active statuses", () => {
    assert.equal(deriveProductMediaWorkflowStatus([operation("Completed")]), "Completed");
    assert.equal(deriveProductMediaWorkflowStatus([operation("Completed"), operation("Failed")]), "PartiallyCompleted");
    assert.equal(deriveProductMediaWorkflowStatus([operation("Failed")]), "Failed");
    assert.equal(deriveProductMediaWorkflowStatus([operation("Cancelled")]), "Cancelled");
    assert.equal(deriveProductMediaWorkflowStatus([operation("InProgress")]), "InProgress");
    assert.equal(deriveProductMediaWorkflowStatus([operation("Completed"), operation("ReconciliationRequired")]), "ReconciliationRequired");
  });

  it("sets one immutable 14-day retention deadline and never extends it", () => {
    const value = operation(); const now = new Date("2026-01-01T00:00:00Z");
    stageOperation(value, { key: "relative", sha256: "a".repeat(64), byteLength: 1, width: 1, height: 1 }, now);
    const expiry = value.expiresAt?.getTime();
    assert.equal(expiry, now.getTime() + PRODUCT_MEDIA_RETENTION_MILLISECONDS);
    stageOperation(value, { key: "relative", sha256: "a".repeat(64), byteLength: 1, width: 1, height: 1 }, new Date("2026-01-02T00:00:00Z"));
    assert.equal(value.expiresAt?.getTime(), expiry);
  });

  it("permits numerically unlimited sequential attempts but only one active attempt", () => {
    const value = operation("Failed"); value.retryAllowed = true; value.stagedArtifactKey = "relative"; value.expiresAt = new Date("2027-01-01T00:00:00Z");
    value.attemptCount = Number.MAX_SAFE_INTEGER - 2;
    assert.equal(claimOperationAttempt(value, new Date("2026-01-01T00:00:00Z")), "Claimed");
    assert.equal(value.attemptCount, Number.MAX_SAFE_INTEGER - 1);
    assert.throws(() => claimOperationAttempt(value, new Date("2026-01-01T00:00:01Z")), /AlreadyInProgress/);
  });

  it("returns completed operations idempotently and makes unavailable sources non-retryable", () => {
    assert.equal(claimOperationAttempt(operation("Completed"), new Date()), "Completed");
    const value = operation("Failed"); value.retryAllowed = true; markSourceUnavailable(value);
    assert.deepEqual({ status: value.status, retryAllowed: value.retryAllowed, requiresNewSource: value.requiresNewSource }, { status: "SourceUnavailable", retryAllowed: false, requiresNewSource: true });
  });
});

describe("Product Media metadata", () => {
  const items = [item("later", 1, "2026-01-01T00:00:00Z"), item("z", 0, "2026-01-02T00:00:00Z"), item("a", 0, "2026-01-02T00:00:00Z")];
  it("uses selected, previous, display order, createdAt, and mediaId cover priority", () => {
    assert.equal(resolveProductMediaCover(items, "later", "z"), "later");
    assert.equal(resolveProductMediaCover(items, "missing", "z"), "z");
    assert.equal(resolveProductMediaCover(items, "missing", "missing"), "a");
    assert.equal(resolveProductMediaCover([], "missing", "missing"), undefined);
  });
  it("reorders metadata without changing physical storage keys", () => {
    const before = new Map(items.map((value) => [value.mediaId, value.storageArtifactKey]));
    const reordered = reorderProductMedia(items, ["later", "a", "z"]);
    assert.deepEqual(reordered.map((value) => value.mediaId).sort(), ["a", "later", "z"]);
    assert.ok(reordered.every((value) => value.storageArtifactKey === before.get(value.mediaId)));
  });
  it("selects the first free sparse display position deterministically", () => {
    const sparse = [item("one", 1, "2026-01-01T00:00:00Z"), item("four", 4, "2026-01-02T00:00:00Z"), item("nine", 9, "2026-01-03T00:00:00Z")];
    assert.equal(resolveProductMediaCover(sparse), "one");
    assert.deepEqual(reorderProductMedia(sparse, ["nine", "one", "four"]).map((value) => value.storageArtifactKey), sparse.map((value) => value.storageArtifactKey));
  });
});
