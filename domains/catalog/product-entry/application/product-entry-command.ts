import type { ProductClassification } from "../../types/product-classification.value-object";
import type { ProductCommercialDetailsInput } from "../../types/product-commercial-details.value-object";
import type { CatalogId, ProductId } from "../../types/product-identity.value-object";
import type { ProductSpecificationValueInput } from "../../types/product-specification-value.value-object";
import type { ProductEntryMediaOperationType } from "../domain/product-entry-media-plan";
import type { ProductEntrySubmissionId, ProductEntrySubmissionMode } from "../domain/product-entry-submission";

export interface ProductEntryMediaOperationCommand {
  readonly operationId: string;
  readonly operationType: ProductEntryMediaOperationType;
  readonly sequence: number;
  readonly mediaId?: string | null;
  readonly requestedDisplayOrder?: number | null;
  readonly selectedAsCover?: boolean;
  readonly expectedSourceSha256?: string | null;
  readonly expectedSourceByteLength?: number | null;
  readonly finalOrder?: number | null;
}

export interface ProductEntryDraftCommand {
  readonly catalogId?: string | null;
  readonly classification?: {
    readonly categoryId?: string | null;
    readonly productTypeId?: string | null;
    readonly deviceClassId?: string | null;
    readonly conditionId?: string | null;
    readonly availabilityStatusId?: string | null;
  } | null;
  readonly commercialDetails?: {
    readonly productName?: string | null;
    readonly productCode?: string | null;
    readonly productModelId?: string | null;
    readonly brandId?: string | null;
    readonly isHighlighted?: boolean;
    readonly pricing?: {
      readonly wholesalePrice?: { readonly amountMinor: number; readonly currency: string } | null;
      readonly retailPrice?: { readonly amountMinor: number; readonly currency: string } | null;
    } | null;
  };
  readonly specificationValues?: readonly {
    readonly specificationFieldId: string;
    readonly value: string | number | boolean;
  }[];
}

export interface SubmitProductEntryCommand {
  readonly submissionId: string;
  readonly mode: ProductEntrySubmissionMode;
  readonly productId?: string | null;
  readonly expectedProductRevision?: number | null;
  readonly draft: ProductEntryDraftCommand;
  readonly mediaOperations?: readonly ProductEntryMediaOperationCommand[];
}

export interface PreparedProductEntryMediaOperation {
  readonly operationId: string;
  readonly operationType: ProductEntryMediaOperationType;
  readonly sequence: number;
  readonly mediaId: string | null;
  readonly requestedDisplayOrder: number | null;
  readonly selectedAsCover: boolean;
  readonly expectedSourceSha256: string | null;
  readonly expectedSourceByteLength: number | null;
  readonly finalOrder: number | null;
}

export interface PreparedProductEntryCommand {
  readonly submissionId: ProductEntrySubmissionId;
  readonly mode: ProductEntrySubmissionMode;
  readonly productId: ProductId | null;
  readonly expectedProductRevision: number | null;
  readonly draft: {
    readonly catalogId: CatalogId | null;
    readonly classification: ProductClassification | undefined;
    readonly commercialDetails: ProductCommercialDetailsInput;
    readonly specificationValues: readonly ProductSpecificationValueInput[];
  };
  readonly mediaOperations: readonly PreparedProductEntryMediaOperation[];
  readonly canonicalPayload: Readonly<Record<string, unknown>>;
}

export const PRODUCT_ENTRY_VALIDATION_CODES = {
  invalidStructure: "InvalidStructure",
  unsupportedField: "UnsupportedField",
  invalidSubmissionId: "InvalidSubmissionId",
  invalidMode: "InvalidMode",
  invalidProductIdentity: "InvalidProductIdentity",
  invalidExpectedRevision: "InvalidExpectedRevision",
  invalidDraft: "InvalidDraft",
  invalidMediaPlan: "InvalidMediaPlan",
  submissionNotReady: "SubmissionNotReady",
} as const;

export interface ProductEntryValidationReason {
  readonly code: (typeof PRODUCT_ENTRY_VALIDATION_CODES)[keyof typeof PRODUCT_ENTRY_VALIDATION_CODES];
  readonly field?: string;
}

export type PrepareProductEntryCommandResult =
  | { readonly type: "Valid"; readonly command: PreparedProductEntryCommand }
  | { readonly type: "Invalid"; readonly reasons: readonly ProductEntryValidationReason[] };
