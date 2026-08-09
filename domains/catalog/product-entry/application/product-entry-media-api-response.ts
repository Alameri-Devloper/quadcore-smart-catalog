import {
  PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE,
  ProductEntryAuthenticationRequiredError,
  ProductEntryRestrictedSessionError,
  ProductEntryTrustedContextUnavailableError,
} from "../ports/product-entry-trusted-context.port";
import type { GetProductEntrySubmissionMediaStatusResult } from "./get-product-entry-submission-media-status.use-case";
import type { UploadProductEntrySubmissionMediaResult } from "./upload-product-entry-submission-media.use-case";

export const PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE_CODE = "PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE" as const;

export const productEntryMediaRuntimeErrorHttpResponse = (error: unknown) => {
  if (error instanceof ProductEntryAuthenticationRequiredError) return {
    status: 401 as const,
    body: { type: "AuthenticationRequired" as const },
  };
  if (error instanceof ProductEntryRestrictedSessionError) return {
    status: 403 as const,
    body: { type: "ForbiddenForRestrictedSession" as const },
  };
  return error instanceof ProductEntryTrustedContextUnavailableError
    ? {
        status: 503 as const,
        body: {
          type: "AuthenticationContextUnavailable" as const,
          code: PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE,
        },
      }
    : {
        status: 503 as const,
        body: {
          type: "ProductEntryMediaServiceUnavailable" as const,
          code: PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE_CODE,
        },
      };
};

export const uploadProductEntryMediaHttpStatus = (result: UploadProductEntrySubmissionMediaResult): number => {
  switch (result.type) {
    case "Completed": return 200;
    case "Accepted": return 202;
    case "NotFound": return 404;
    case "Forbidden": return 403;
    case "NewSourceFlowNotImplemented": return 409;
    case "Conflict": return 409;
    case "PlanMismatch": return 422;
    case "InvalidRequest":
      if (result.code === "SOURCE_TOO_LARGE") return 413;
      if (result.code === "SOURCE_MIME_UNSUPPORTED" || result.code === "SOURCE_IMAGE_INVALID") return 415;
      if (["SOURCE_SHA256_MISMATCH", "SOURCE_BYTE_LENGTH_MISMATCH", "SOURCE_DIMENSIONS_UNSUPPORTED"].includes(result.code)) return 422;
      return 400;
  }
};

export const getProductEntryMediaStatusHttpStatus = (
  result: GetProductEntrySubmissionMediaStatusResult,
): number => {
  switch (result.type) {
    case "Found": return 200;
    case "NotFound": return 404;
    case "Forbidden": return 403;
    case "Conflict": return 409;
    case "InvalidRequest": return 400;
  }
};
