import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductPublicationReason } from "../../types/product-publication-reason.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import {
  ProductEntryAuthenticationRequiredError,
  ProductEntryRestrictedSessionError,
  ProductEntryTrustedContextUnavailableError,
} from "../ports/product-entry-trusted-context.port";
import {
  productEntryRuntimeErrorHttpResponse,
  serializeSubmitProductEntryResult,
  submitProductEntryHttpStatus,
} from "./product-entry-api-response";

describe("Product Entry Phase 1 HTTP mapping", () => {
  it("uses stable status codes and serializes typed Product values", () => {
    const accepted = {
      type: "Accepted" as const,
      idempotentReplay: false,
      submissionId: "submission-a",
      productId: "product-a",
      productRevision: 1,
      mediaUploadState: "PendingUpload" as const,
      productSaveResult: {
        outcome: "SavedAndPublished" as const,
        workspaceId: WorkspaceId.create("workspace-a"),
        productId: ProductId.create("product-a"),
        persistedRevision: ProductRevision.rehydrate(1),
        lifecycleState: "Published" as const,
        missingPublicationReasons: [ProductPublicationReason.missing("MissingBrand")],
      },
    };
    assert.equal(submitProductEntryHttpStatus(accepted), 201);
    const serialized = serializeSubmitProductEntryResult(accepted) as { productSaveResult: { workspaceId: string; persistedRevision: number } };
    assert.deepEqual(serialized.productSaveResult, {
      outcome: "SavedAndPublished",
      workspaceId: "workspace-a",
      productId: "product-a",
      persistedRevision: 1,
      lifecycleState: "Published",
      archiveReason: null,
      missingPublicationReasons: [{ code: "MissingBrand", specificationFieldId: null }],
    });
  });

  it("maps expected conflicts, authorization, validation, and not-found outcomes", () => {
    assert.equal(submitProductEntryHttpStatus({ type: "SubmissionFingerprintConflict", submissionId: "s" }), 409);
    assert.equal(submitProductEntryHttpStatus({ type: "ProductNotFound", productId: "p" }), 404);
    assert.equal(submitProductEntryHttpStatus({ type: "Forbidden", permission: "catalog.product.create" }), 403);
    assert.equal(submitProductEntryHttpStatus({ type: "InvalidRequest", reasons: [] }), 400);
  });

  it("maps authentication and unexpected runtime failures to distinct sanitized responses", () => {
    assert.deepEqual(productEntryRuntimeErrorHttpResponse(new ProductEntryAuthenticationRequiredError()), {
      status: 401,
      body: { type: "AuthenticationRequired" },
    });
    assert.deepEqual(productEntryRuntimeErrorHttpResponse(new ProductEntryRestrictedSessionError()), {
      status: 403,
      body: { type: "ForbiddenForRestrictedSession" },
    });
    assert.deepEqual(productEntryRuntimeErrorHttpResponse(new ProductEntryTrustedContextUnavailableError()), {
      status: 503,
      body: {
        type: "AuthenticationContextUnavailable",
        code: "AUTHENTICATION_CONTEXT_UNAVAILABLE",
      },
    });
    const internal = new Error("QSC_TRUSTED_ACTOR_ID and database details must stay private");
    const response = productEntryRuntimeErrorHttpResponse(internal);
    assert.deepEqual(response, {
      status: 503,
      body: {
        type: "ProductEntryServiceUnavailable",
        code: "PRODUCT_ENTRY_SERVICE_UNAVAILABLE",
      },
    });
    assert.equal(JSON.stringify(response).includes(internal.message), false);
  });
});
