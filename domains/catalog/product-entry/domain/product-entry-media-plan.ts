import type { WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductEntrySubmissionId } from "./product-entry-submission";

const SHA_256_LOWERCASE_HEX = /^[a-f0-9]{64}$/;

export const PRODUCT_ENTRY_MEDIA_OPERATION_TYPES = {
  add: "Add",
  replace: "Replace",
  remove: "Remove",
  reorder: "Reorder",
  setCover: "SetCover",
} as const;

export type ProductEntryMediaOperationType =
  (typeof PRODUCT_ENTRY_MEDIA_OPERATION_TYPES)[keyof typeof PRODUCT_ENTRY_MEDIA_OPERATION_TYPES];

export interface ProductEntryMediaOperationInput {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly operationId: string;
  readonly operationType: ProductEntryMediaOperationType;
  readonly sequence: number;
  readonly mediaId: string | null;
  readonly requestedDisplayOrder: number | null;
  readonly selectedAsCover: boolean;
  readonly expectedSourceSha256: string | null;
  readonly expectedSourceByteLength: number | null;
  readonly finalOrder: number | null;
  readonly createdAt: Date;
}

const nullableNonNegativeInteger = (name: string, value: number | null): void => {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`${name} must be null or a non-negative safe integer.`);
  }
};

export class ProductEntryMediaOperation {
  private readonly createdAtEpoch: number;
  private readonly input: Omit<ProductEntryMediaOperationInput, "createdAt">;

  constructor(input: ProductEntryMediaOperationInput) {
    if (typeof input.operationId !== "string" || input.operationId.trim().length === 0) {
      throw new Error("Product Entry media OperationId cannot be empty.");
    }
    if (!Object.values(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES).includes(input.operationType)) {
      throw new Error("Unsupported Product Entry media operation type.");
    }
    nullableNonNegativeInteger("RequestedDisplayOrder", input.requestedDisplayOrder);
    nullableNonNegativeInteger("FinalOrder", input.finalOrder);
    if (!Number.isSafeInteger(input.sequence) || input.sequence < 0) {
      throw new Error("Media operation Sequence must be a non-negative safe integer.");
    }
    if (typeof input.selectedAsCover !== "boolean") {
      throw new Error("SelectedAsCover must be boolean.");
    }
    const sourceOperation = input.operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.add
      || input.operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.replace;
    if (sourceOperation) {
      if (!SHA_256_LOWERCASE_HEX.test(input.expectedSourceSha256 ?? "")) {
        throw new Error("Add and Replace operations require a lowercase SHA-256 source fingerprint.");
      }
      if (!Number.isSafeInteger(input.expectedSourceByteLength) || input.expectedSourceByteLength! <= 0) {
        throw new Error("Add and Replace operations require a positive safe source byte length.");
      }
    } else if (input.expectedSourceSha256 !== null || input.expectedSourceByteLength !== null) {
      throw new Error("Remove and metadata operations cannot contain source fingerprint metadata.");
    }
    const targetOperation = input.operationType !== PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.add;
    if (targetOperation !== (typeof input.mediaId === "string" && input.mediaId.trim().length > 0)) {
      throw new Error(targetOperation
        ? "Replace, Remove, Reorder, and SetCover operations require MediaId."
        : "Add operations cannot target an existing MediaId.");
    }
    if (
      input.operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.remove
      && (input.requestedDisplayOrder !== null || input.finalOrder !== null || input.selectedAsCover)
    ) throw new Error("Remove operations cannot contain order or cover metadata.");
    if (
      input.operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.reorder
      && (
        input.finalOrder === null
        || input.requestedDisplayOrder === null
        || input.finalOrder !== input.requestedDisplayOrder
        || input.selectedAsCover
      )
    ) throw new Error("Reorder operations require one matching final order and cannot select the cover.");
    if (
      input.operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.setCover
      && (input.requestedDisplayOrder !== null || input.finalOrder !== null || !input.selectedAsCover)
    ) throw new Error("SetCover operations require the cover flag and cannot contain order metadata.");
    if (!(input.createdAt instanceof Date) || Number.isNaN(input.createdAt.getTime())) {
      throw new Error("Media operation CreatedAt must be a valid Date.");
    }
    this.createdAtEpoch = input.createdAt.getTime();
    this.input = Object.freeze({
      workspaceId: input.workspaceId,
      submissionId: input.submissionId,
      operationId: input.operationId,
      operationType: input.operationType,
      sequence: input.sequence,
      mediaId: input.mediaId,
      requestedDisplayOrder: input.requestedDisplayOrder,
      selectedAsCover: input.selectedAsCover,
      expectedSourceSha256: input.expectedSourceSha256,
      expectedSourceByteLength: input.expectedSourceByteLength,
      finalOrder: input.finalOrder,
    });
  }

  get workspaceId(): WorkspaceId { return this.input.workspaceId; }
  get submissionId(): ProductEntrySubmissionId { return this.input.submissionId; }
  get operationId(): string { return this.input.operationId; }
  get operationType(): ProductEntryMediaOperationType { return this.input.operationType; }
  get sequence(): number { return this.input.sequence; }
  get mediaId(): string | null { return this.input.mediaId; }
  get requestedDisplayOrder(): number | null { return this.input.requestedDisplayOrder; }
  get selectedAsCover(): boolean { return this.input.selectedAsCover; }
  get expectedSourceSha256(): string | null { return this.input.expectedSourceSha256; }
  get expectedSourceByteLength(): number | null { return this.input.expectedSourceByteLength; }
  get finalOrder(): number | null { return this.input.finalOrder; }
  get createdAt(): Date { return new Date(this.createdAtEpoch); }
}

export const createProductEntryMediaPlan = (
  inputs: readonly ProductEntryMediaOperationInput[],
): readonly ProductEntryMediaOperation[] => {
  const operations = inputs.map((input) => new ProductEntryMediaOperation(input));
  const ids = new Set<string>();
  for (const [index, operation] of operations.entries()) {
    if (operation.sequence !== index) {
      throw new Error("Media operation Sequence must be contiguous, zero-based, and match request order.");
    }
    if (ids.has(operation.operationId)) {
      throw new Error("Duplicate Product Entry media OperationId.");
    }
    ids.add(operation.operationId);
  }
  if (operations.filter((operation) => operation.selectedAsCover).length > 1) {
    throw new Error("A Product Entry media plan can select at most one cover target.");
  }
  const mutationsByMedia = new Map<string, Set<ProductEntryMediaOperationType>>();
  for (const operation of operations) {
    if (!operation.mediaId) continue;
    const types = mutationsByMedia.get(operation.mediaId) ?? new Set<ProductEntryMediaOperationType>();
    types.add(operation.operationType);
    mutationsByMedia.set(operation.mediaId, types);
  }
  for (const types of mutationsByMedia.values()) {
    if (
      types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.remove)
      && (types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.reorder) || types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.setCover))
    ) throw new Error("Removed media cannot also receive metadata operations.");
    if (
      types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.replace)
      && (types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.reorder) || types.has(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.setCover))
    ) throw new Error("Replace operations carry final metadata and cannot be duplicated by metadata operations.");
  }
  return Object.freeze(operations);
};
