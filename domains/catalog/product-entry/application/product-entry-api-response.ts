import type { GetProductEntrySubmissionResult } from "./get-product-entry-submission.use-case";
import {
  PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE,
  ProductEntryTrustedContextUnavailableError,
} from "../ports/product-entry-trusted-context.port";
import type { SubmitProductEntryResult } from "./submit-product-entry.use-case";

export const PRODUCT_ENTRY_SERVICE_UNAVAILABLE_CODE = "PRODUCT_ENTRY_SERVICE_UNAVAILABLE" as const;

export const productEntryRuntimeErrorHttpResponse = (error: unknown) => error instanceof ProductEntryTrustedContextUnavailableError
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
        type: "ProductEntryServiceUnavailable" as const,
        code: PRODUCT_ENTRY_SERVICE_UNAVAILABLE_CODE,
      },
    };

export const submitProductEntryHttpStatus = (result: SubmitProductEntryResult): number => {
  switch (result.type) {
    case "Accepted": return result.idempotentReplay ? 200 : 201;
    case "SubmissionFingerprintConflict":
    case "ProductRevisionConflict":
    case "ProductIdConflict":
    case "ProductCodeConflict": return 409;
    case "ProductNotFound": return 404;
    case "Forbidden": return 403;
    case "InvalidRequest": return 400;
  }
};

export const serializeSubmitProductEntryResult = (result: SubmitProductEntryResult): unknown => {
  if (result.type !== "Accepted") return result;
  return {
    ...result,
    productSaveResult: {
      outcome: result.productSaveResult.outcome,
      workspaceId: result.productSaveResult.workspaceId.value,
      productId: result.productSaveResult.productId.value,
      persistedRevision: result.productSaveResult.persistedRevision.value,
      lifecycleState: result.productSaveResult.lifecycleState,
      archiveReason: result.productSaveResult.archiveReason ?? null,
      missingPublicationReasons: result.productSaveResult.missingPublicationReasons.map((reason) => ({
        code: reason.code,
        specificationFieldId: reason.specificationFieldId ?? null,
      })),
    },
  };
};

export const getProductEntryHttpStatus = (result: GetProductEntrySubmissionResult): number => {
  switch (result.type) {
    case "Found": return 200;
    case "NotFound": return 404;
    case "Forbidden": return 403;
    case "InvalidRequest": return 400;
  }
};
