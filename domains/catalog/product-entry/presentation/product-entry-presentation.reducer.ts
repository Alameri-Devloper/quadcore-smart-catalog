import type {
  ProductEntryMediaStatusView,
  ProductEntryProductSaveReceipt,
} from "./product-entry-presentation.types";

export type ProductEntryPresentationState =
  | { readonly type: "Initializing" }
  | { readonly type: "CheckingDraft" }
  | { readonly type: "RestoreDecisionRequired"; readonly draftUpdatedAt: number }
  | {
      readonly type: "RevisionConflict";
      readonly productId: string;
      readonly baseRevision: number;
      readonly currentRevision: number;
      readonly source: "LocalDraft" | "PhaseOne";
    }
  | { readonly type: "Editing"; readonly revalidationRequired: boolean }
  | { readonly type: "Validating" }
  | { readonly type: "HashingMedia"; readonly operationId: string }
  | { readonly type: "SavingProduct" }
  | { readonly type: "ProductSaved"; readonly receipt: ProductEntryProductSaveReceipt }
  | { readonly type: "UploadingMedia"; readonly receipt: ProductEntryProductSaveReceipt }
  | {
      readonly type: "MediaPartiallyCompleted";
      readonly receipt: ProductEntryProductSaveReceipt;
      readonly status: ProductEntryMediaStatusView | null;
      readonly code: string;
    }
  | {
      readonly type: "Completed";
      readonly receipt: ProductEntryProductSaveReceipt;
      readonly mediaStatus: ProductEntryMediaStatusView | null;
    }
  | {
      readonly type: "RetryableFailure";
      readonly stage: "Context" | "ProductRead" | "LocalDraft" | "Product" | "Media";
      readonly code: string;
      readonly receipt: ProductEntryProductSaveReceipt | null;
    }
  | { readonly type: "FatalFailure"; readonly code: string }
  | { readonly type: "StorageUnavailable"; readonly code: string };

export type ProductEntryPresentationEvent =
  | { readonly type: "CheckDraft" }
  | { readonly type: "RequireRestore"; readonly draftUpdatedAt: number }
  | {
      readonly type: "ShowRevisionConflict";
      readonly productId: string;
      readonly baseRevision: number;
      readonly currentRevision: number;
      readonly source: "LocalDraft" | "PhaseOne";
    }
  | { readonly type: "Edit"; readonly revalidationRequired?: boolean }
  | { readonly type: "Validate" }
  | { readonly type: "Hash"; readonly operationId: string }
  | { readonly type: "SaveProduct" }
  | { readonly type: "ProductSaved"; readonly receipt: ProductEntryProductSaveReceipt }
  | { readonly type: "UploadMedia"; readonly receipt: ProductEntryProductSaveReceipt }
  | {
      readonly type: "MediaPartial";
      readonly receipt: ProductEntryProductSaveReceipt;
      readonly status: ProductEntryMediaStatusView | null;
      readonly code: string;
    }
  | {
      readonly type: "Complete";
      readonly receipt: ProductEntryProductSaveReceipt;
      readonly mediaStatus: ProductEntryMediaStatusView | null;
    }
  | {
      readonly type: "Retryable";
      readonly stage: "Context" | "ProductRead" | "LocalDraft" | "Product" | "Media";
      readonly code: string;
      readonly receipt?: ProductEntryProductSaveReceipt | null;
    }
  | { readonly type: "Fatal"; readonly code: string }
  | { readonly type: "StorageUnavailable"; readonly code: string }
  | { readonly type: "Reset" };

export const INITIAL_PRODUCT_ENTRY_PRESENTATION_STATE: ProductEntryPresentationState = {
  type: "Initializing",
};

export const productEntryPresentationReducer = (
  _state: ProductEntryPresentationState,
  event: ProductEntryPresentationEvent,
): ProductEntryPresentationState => {
  switch (event.type) {
    case "CheckDraft": return { type: "CheckingDraft" };
    case "RequireRestore": return {
      type: "RestoreDecisionRequired",
      draftUpdatedAt: event.draftUpdatedAt,
    };
    case "ShowRevisionConflict": return {
      type: "RevisionConflict",
      productId: event.productId,
      baseRevision: event.baseRevision,
      currentRevision: event.currentRevision,
      source: event.source,
    };
    case "Edit": return {
      type: "Editing",
      revalidationRequired: event.revalidationRequired ?? false,
    };
    case "Validate": return { type: "Validating" };
    case "Hash": return { type: "HashingMedia", operationId: event.operationId };
    case "SaveProduct": return { type: "SavingProduct" };
    case "ProductSaved": return { type: "ProductSaved", receipt: event.receipt };
    case "UploadMedia": return { type: "UploadingMedia", receipt: event.receipt };
    case "MediaPartial": return {
      type: "MediaPartiallyCompleted",
      receipt: event.receipt,
      status: event.status,
      code: event.code,
    };
    case "Complete": return {
      type: "Completed",
      receipt: event.receipt,
      mediaStatus: event.mediaStatus,
    };
    case "Retryable": return {
      type: "RetryableFailure",
      stage: event.stage,
      code: event.code,
      receipt: event.receipt ?? null,
    };
    case "Fatal": return { type: "FatalFailure", code: event.code };
    case "StorageUnavailable": return { type: "StorageUnavailable", code: event.code };
    case "Reset": return INITIAL_PRODUCT_ENTRY_PRESENTATION_STATE;
  }
};

export const productEntryPresentationIsBusy = (
  state: ProductEntryPresentationState,
): boolean => [
  "Initializing",
  "CheckingDraft",
  "Validating",
  "HashingMedia",
  "SavingProduct",
  "UploadingMedia",
].includes(state.type);
