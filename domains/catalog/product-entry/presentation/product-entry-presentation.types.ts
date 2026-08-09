import type { SubmitProductEntryCommand } from "../application/product-entry-command";

export type ProductEntryPresentationLocale = "en" | "ar";

export type ProductEntryReferenceDataLoadErrorCode =
  | "DeviceTypesLoadFailed"
  | "ProductModelsLoadFailed"
  | "SpecificationFieldsLoadFailed"
  | "ProductClassificationsLoadFailed";

export interface ProductEntryTrustedClientContext {
  readonly companyId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly catalogId: string;
  readonly locale: ProductEntryPresentationLocale;
}

export interface ProductEntryProductView {
  readonly productId: string;
  readonly catalogId: string;
  readonly lifecycleState: string;
  readonly archiveReason: string | null;
  readonly revision: number;
  readonly classification: {
    readonly categoryId: string | null;
    readonly productTypeId: string | null;
    readonly deviceClassId: string | null;
    readonly conditionId: string | null;
    readonly availabilityStatusId: string | null;
  } | null;
  readonly commercialDetails: {
    readonly productName: string | null;
    readonly productCode: string | null;
    readonly productModelId: string | null;
    readonly brandId: string | null;
    readonly isHighlighted: boolean;
    readonly wholesalePrice: { readonly amountMinor: number; readonly currency: string } | null;
    readonly retailPrice: { readonly amountMinor: number; readonly currency: string } | null;
  } | null;
  readonly specificationValues: readonly {
    readonly specificationFieldId: string;
    readonly value: string | number | boolean;
  }[];
  readonly images: readonly {
    readonly mediaId: string;
    readonly displayOrder: number;
    readonly isMain: boolean;
    readonly altText: string | null;
  }[];
}

export interface ProductEntryProductSaveReceipt {
  readonly submissionId: string;
  readonly productId: string;
  readonly productRevision: number;
  readonly idempotentReplay: boolean;
  readonly outcome: string;
  readonly lifecycleState: string;
}

export type ProductEntrySubmissionClientResult =
  | { readonly type: "Accepted"; readonly receipt: ProductEntryProductSaveReceipt }
  | {
      readonly type: "ProductRevisionConflict";
      readonly productId: string;
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | { readonly type: "Rejected"; readonly code: string; readonly field: string | null }
  | { readonly type: "RetryableFailure"; readonly code: string }
  | { readonly type: "FatalFailure"; readonly code: string };

export interface ProductEntryMediaWorkflowOperationView {
  readonly operationId: string;
  readonly status: string;
  readonly retryAllowed: boolean;
  readonly requiresNewSource: boolean;
  readonly errorCode: string | null;
}

export interface ProductEntryMediaStatusView {
  readonly submissionId: string;
  readonly submissionStatus: string;
  readonly productId: string | null;
  readonly workflowStatus: string | null;
  readonly plannedOperationIds: readonly string[];
  readonly requiredSourceOperationIds: readonly string[];
  readonly retryableOperationIds: readonly string[];
  readonly requiresNewSourceOperationIds: readonly string[];
  readonly operations: readonly ProductEntryMediaWorkflowOperationView[];
}

export type ProductEntryMediaClientResult =
  | {
      readonly type: "Completed" | "PartiallyCompleted";
      readonly status: ProductEntryMediaStatusView;
      readonly idempotentReplay: boolean;
      readonly resumed: boolean;
    }
  | {
      readonly type: "NewSourceFlowNotImplemented";
      readonly code: "MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED";
      readonly operationIds: readonly string[];
    }
  | { readonly type: "Rejected"; readonly code: string; readonly operationId: string | null }
  | { readonly type: "RetryableFailure"; readonly code: string }
  | { readonly type: "FatalFailure"; readonly code: string };

export interface ProductEntrySelectedMediaSource {
  readonly operationId: string;
  readonly file: File;
  readonly sha256: string;
  readonly byteLength: number;
}

export interface ProductEntrySubmissionClient {
  submit(
    command: SubmitProductEntryCommand,
    signal?: AbortSignal,
  ): Promise<ProductEntrySubmissionClientResult>;
}

export interface ProductEntryMediaClient {
  getStatus(submissionId: string, signal?: AbortSignal): Promise<
    | { readonly type: "Found"; readonly status: ProductEntryMediaStatusView }
    | { readonly type: "RetryableFailure"; readonly code: string }
    | { readonly type: "FatalFailure"; readonly code: string }
  >;
  upload(
    submissionId: string,
    sources: readonly ProductEntrySelectedMediaSource[],
    signal?: AbortSignal,
  ): Promise<ProductEntryMediaClientResult>;
}

export interface ProductEntryProductReadClient {
  get(
    productId: string,
    signal?: AbortSignal,
  ): Promise<
    | { readonly type: "Found"; readonly product: ProductEntryProductView }
    | { readonly type: "NotFound" }
    | { readonly type: "RetryableFailure"; readonly code: string }
    | { readonly type: "FatalFailure"; readonly code: string }
  >;
}

export interface ProductEntryTrustedClientContextPort {
  resolve(signal?: AbortSignal): Promise<
    | { readonly type: "Available"; readonly context: ProductEntryTrustedClientContext }
    | { readonly type: "Unavailable"; readonly code: string }
  >;
}
