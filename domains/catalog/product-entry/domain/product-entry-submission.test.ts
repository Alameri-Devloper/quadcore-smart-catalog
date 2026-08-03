import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import {
  ProductEntrySubmission,
  ProductEntrySubmissionId,
  RequestFingerprint,
} from "./product-entry-submission";

const workspaceId = WorkspaceId.create("workspace-a");
const submissionId = ProductEntrySubmissionId.create("submission-a");
const fingerprint = RequestFingerprint.create("a".repeat(64));
const now = new Date("2026-08-03T00:00:00.000Z");

describe("Product Entry Submission domain", () => {
  it("creates a valid Workspace-scoped claim", () => {
    const submission = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
    assert.equal(submission.workspaceId.value, "workspace-a");
    assert.equal(submission.status, "Claimed");
  });

  it("rejects empty identities and invalid request fingerprints", () => {
    assert.throws(() => ProductEntrySubmissionId.create(" "), /cannot be empty/);
    for (const invalid of ["A".repeat(64), "a".repeat(63), "not-a-hash"]) {
      assert.throws(() => RequestFingerprint.create(invalid), /SHA-256/);
    }
  });

  it("protects timestamps from external mutation", () => {
    const supplied = new Date(now);
    const submission = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: supplied });
    supplied.setUTCFullYear(2030);
    const exposed = submission.createdAt;
    exposed.setUTCFullYear(2031);
    assert.equal(submission.createdAt.toISOString(), now.toISOString());
  });

  it("requires Product identity and Revision at ProductSaved", () => {
    assert.throws(() => ProductEntrySubmission.rehydrate({
      workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null,
      productRevision: null, mediaWorkflowId: null, status: "ProductSaved", createdAt: now, updatedAt: now,
    }), /requires ProductId/);
    const submission = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
    submission.markProductSaved(ProductId.create("product-a"), 0, now);
    assert.equal(submission.status, "ProductSaved");
    assert.equal(submission.productRevision, 0);
  });

  it("enforces mode identity rules", () => {
    assert.throws(() => ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Edit", productId: null, claimedAt: now }), /requires ProductId/);
    assert.throws(() => ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: ProductId.create("premature"), claimedAt: now }), /cannot link ProductId/);
  });

  it("allows only legal status transitions", () => {
    const submission = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
    assert.throws(() => submission.markMediaOutcome("Completed", "workflow-a", now), /Illegal/);
    submission.markProductSaved(ProductId.create("product-a"), 0, now);
    submission.markMediaOutcome("PartiallyCompleted", "workflow-a", now);
    submission.markMediaOutcome("Completed", "workflow-a", now);
    assert.throws(() => submission.markMediaOutcome("Completed", "workflow-a", now), /Illegal/);
  });

  it("keeps identical Submission IDs isolated by Workspace", () => {
    const first = ProductEntrySubmission.claim({ workspaceId, submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
    const second = ProductEntrySubmission.claim({ workspaceId: WorkspaceId.create("workspace-b"), submissionId, requestFingerprint: fingerprint, mode: "Create", productId: null, claimedAt: now });
    assert.notEqual(first.workspaceId.value, second.workspaceId.value);
    assert.equal(first.submissionId.value, second.submissionId.value);
  });
});
