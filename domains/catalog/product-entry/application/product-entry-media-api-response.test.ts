import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProductEntryMediaStatusHttpStatus,
  productEntryMediaRuntimeErrorHttpResponse,
  uploadProductEntryMediaHttpStatus,
} from "./product-entry-media-api-response";
import { ProductEntryAuthenticationRequiredError, ProductEntryRestrictedSessionError } from "../ports/product-entry-trusted-context.port";

describe("Product Entry Media HTTP response policy", () => {
  it("maps stable source validation statuses", () => {
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_REQUIRED", operationId: "add-a" }), 400);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_TOO_LARGE", operationId: "add-a" }), 413);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_MIME_UNSUPPORTED", operationId: "add-a" }), 415);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_MIME_MISMATCH", operationId: "add-a" }), 415);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_IMAGE_INVALID", operationId: "add-a" }), 415);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InvalidRequest", code: "SOURCE_SHA256_MISMATCH", operationId: "add-a" }), 422);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "PlanMismatch", code: "MEDIA_PLAN_INVALID" }), 422);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "Conflict", code: "WorkflowConflict" }), 409);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "NotFound", submissionId: "missing" }), 404);
    assert.equal(uploadProductEntryMediaHttpStatus({ type: "InfrastructureUnavailable" }), 503);
  });

  it("sanitizes unexpected verifier and Infrastructure failures", () => {
    assert.deepEqual(productEntryMediaRuntimeErrorHttpResponse(new ProductEntryAuthenticationRequiredError()), {
      status: 401,
      body: { type: "AuthenticationRequired" },
    });
    assert.deepEqual(productEntryMediaRuntimeErrorHttpResponse(new ProductEntryRestrictedSessionError()), {
      status: 403,
      body: { type: "ForbiddenForRestrictedSession" },
    });
    assert.deepEqual(productEntryMediaRuntimeErrorHttpResponse(new Error("secret verifier detail")), {
      status: 503,
      body: {
        type: "ProductEntryMediaServiceUnavailable",
        code: "PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE",
      },
    });
  });

  it("keeps status GET mappings read-only and stable", () => {
    assert.equal(getProductEntryMediaStatusHttpStatus({ type: "NotFound", submissionId: "missing" }), 404);
    assert.equal(getProductEntryMediaStatusHttpStatus({ type: "Forbidden", permission: "read" }), 403);
    assert.equal(getProductEntryMediaStatusHttpStatus({ type: "Conflict", code: "WorkflowConflict" }), 409);
    assert.equal(getProductEntryMediaStatusHttpStatus({ type: "InvalidRequest" }), 400);
  });
});
