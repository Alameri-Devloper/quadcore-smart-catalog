import type { ProductEntrySubmissionMode } from "../domain/product-entry-submission";

export const PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION = 1 as const;
export const PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
export const PRODUCT_ENTRY_EDIT_DRAFT_RETENTION_MS = 24 * 60 * 60 * 1_000;

export const PRODUCT_ENTRY_LOCAL_DRAFT_CODES = {
  notFound: "LOCAL_DRAFT_NOT_FOUND",
  expired: "LOCAL_DRAFT_EXPIRED",
  revisionConflict: "LOCAL_DRAFT_REVISION_CONFLICT",
  corrupt: "LOCAL_DRAFT_CORRUPT",
  incompatible: "LOCAL_DRAFT_INCOMPATIBLE",
  storageUnavailable: "LOCAL_DRAFT_STORAGE_UNAVAILABLE",
  identityInvalid: "LOCAL_DRAFT_IDENTITY_INVALID",
  forbiddenField: "LOCAL_DRAFT_FORBIDDEN_FIELD",
  mediaSourceNotStorable: "LOCAL_DRAFT_MEDIA_SOURCE_NOT_STORABLE",
} as const;

export type ProductEntryLocalDraftCode =
  (typeof PRODUCT_ENTRY_LOCAL_DRAFT_CODES)[keyof typeof PRODUCT_ENTRY_LOCAL_DRAFT_CODES];

export interface ProductEntryLocalDraftContext {
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateProductEntryLocalDraftIdentity
  extends ProductEntryLocalDraftContext {
  readonly mode: "Create";
  readonly submissionId: string;
}

export interface EditProductEntryLocalDraftIdentity
  extends ProductEntryLocalDraftContext {
  readonly mode: "Edit";
  readonly submissionId: string;
  readonly productId: string;
  readonly baseProductRevision: number;
}

export type ProductEntryLocalDraftIdentity =
  | CreateProductEntryLocalDraftIdentity
  | EditProductEntryLocalDraftIdentity;

export interface ProductEntryLocalDraftMoney {
  readonly amountMinor: number;
  readonly currency: string;
}

export interface ProductEntryLocalDraftFormState {
  readonly catalogId: string | null;
  readonly departmentId: string | null;
  readonly categoryId: string | null;
  readonly productTypeId: string | null;
  readonly deviceClassId: string | null;
  readonly brandId: string | null;
  readonly productModelId: string | null;
  readonly conditionId: string | null;
  readonly availabilityStatusId: string | null;
  readonly productName: string | null;
  readonly productCode: string | null;
  readonly wholesalePrice: ProductEntryLocalDraftMoney | null;
  readonly retailPrice: ProductEntryLocalDraftMoney | null;
  readonly isHighlighted: boolean;
  readonly publicationIntent: "SaveAsDraft" | "PublishWhenReady";
  readonly specificationValues: readonly {
    readonly specificationFieldId: string;
    readonly value: string | number | boolean;
  }[];
}

export const PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY = {
  availableInCurrentSession: "AvailableInCurrentSession",
  requiresReselection: "RequiresReselection",
  notRequired: "NotRequired",
} as const;

export type ProductEntryLocalMediaSourceAvailability =
  (typeof PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY)[keyof typeof PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY];

export interface ProductEntryLocalDraftMediaDescriptor {
  readonly operationId: string;
  readonly operationType: "Add" | "Replace" | "Remove";
  readonly sequence: number;
  readonly mediaId: string | null;
  readonly requestedDisplayOrder: number | null;
  readonly selectedAsCover: boolean;
  readonly expectedSourceSha256: string | null;
  readonly expectedSourceByteLength: number | null;
  readonly finalOrder: number | null;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sourceAvailability: ProductEntryLocalMediaSourceAvailability;
}

export interface ProductEntryLocalDraft {
  readonly schemaVersion: typeof PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION;
  readonly mode: ProductEntrySubmissionMode;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly submissionId: string;
  readonly productId: string | null;
  readonly baseProductRevision: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number;
  readonly formState: ProductEntryLocalDraftFormState;
  readonly mediaDescriptors: readonly ProductEntryLocalDraftMediaDescriptor[];
}

export type ProductEntryLocalDraftStoredLookup =
  | { readonly type: "Found"; readonly draft: ProductEntryLocalDraft }
  | { readonly type: "NotFound" }
  | { readonly type: "Incompatible" }
  | { readonly type: "Corrupt" };

export type SaveProductEntryLocalDraftResult =
  | { readonly type: "Saved"; readonly draft: ProductEntryLocalDraft }
  | { readonly type: "Rejected"; readonly code: ProductEntryLocalDraftCode };

export type ProductEntryLocalDraftRestoreDecision =
  | { readonly type: "NoDraft"; readonly code: "LOCAL_DRAFT_NOT_FOUND" }
  | { readonly type: "IdentityInvalid"; readonly code: "LOCAL_DRAFT_IDENTITY_INVALID" }
  | { readonly type: "ExpiredDraft"; readonly code: "LOCAL_DRAFT_EXPIRED"; readonly expiredAt: number }
  | { readonly type: "IncompatibleDraft"; readonly code: "LOCAL_DRAFT_INCOMPATIBLE" }
  | { readonly type: "CorruptDraft"; readonly code: "LOCAL_DRAFT_CORRUPT" }
  | { readonly type: "StorageUnavailable"; readonly code: "LOCAL_DRAFT_STORAGE_UNAVAILABLE" }
  | {
      readonly type: "RecoverableCreateDraft" | "RecoverableEditDraft";
      readonly draft: ProductEntryLocalDraft;
      readonly requiresExplicitAcceptance: true;
      readonly revalidationRequired: true;
    }
  | {
      readonly type: "RevisionConflict";
      readonly code: "LOCAL_DRAFT_REVISION_CONFLICT";
      readonly productId: string;
      readonly baseProductRevision: number;
      readonly currentProductRevision: number;
      readonly localUpdatedAt: number;
    };

export type AcceptProductEntryLocalDraftResult =
  | {
      readonly type: "Accepted";
      readonly draft: ProductEntryLocalDraft;
      readonly revalidationRequired: true;
    }
  | { readonly type: "NotAccepted" };

export const PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS = {
  userDiscarded: "UserDiscarded",
  editSessionCompleted: "EditSessionCompleted",
} as const;

export type ProductEntryLocalDraftDeleteReason =
  (typeof PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS)[keyof typeof PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS];

export type ProductEntryLocalDraftMutationResult =
  | { readonly type: "Completed" }
  | { readonly type: "Rejected"; readonly code: ProductEntryLocalDraftCode };

export type ProductEntryLocalDraftCleanupResult =
  | { readonly type: "Completed"; readonly deletedCount: number }
  | { readonly type: "Rejected"; readonly code: ProductEntryLocalDraftCode };

export interface ProductEntryLocalDraftSaveInput {
  readonly identity: ProductEntryLocalDraftIdentity;
  readonly formState: ProductEntryLocalDraftFormState;
  readonly mediaDescriptors: readonly ProductEntryLocalDraftMediaDescriptor[];
}

export interface ProductEntryLocalDraftHeadlessContract {
  readonly draftState: "Idle" | "Saving" | "Saved" | "Unavailable";
  readonly restoreDecision: ProductEntryLocalDraftRestoreDecision | null;
  saveDraft(input: ProductEntryLocalDraftSaveInput): void;
  flushDraft(identity: ProductEntryLocalDraftIdentity): Promise<void>;
  discardDraft(identity: ProductEntryLocalDraftIdentity): Promise<ProductEntryLocalDraftMutationResult>;
  startNewProduct(identity: CreateProductEntryLocalDraftIdentity): Promise<CreateProductEntryLocalDraftIdentity | null>;
  resolveRestoreDecision(accept: boolean): AcceptProductEntryLocalDraftResult;
}
