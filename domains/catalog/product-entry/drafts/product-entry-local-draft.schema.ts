import {
  PRODUCT_ENTRY_LOCAL_DRAFT_CODES,
  PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION,
  PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY,
  type ProductEntryLocalDraft,
  type ProductEntryLocalDraftCode,
  type ProductEntryLocalDraftFormState,
  type ProductEntryLocalDraftMediaDescriptor,
  type ProductEntryLocalDraftStoredLookup,
} from "./product-entry-local-draft.types";

const SHA_256 = /^[a-f0-9]{64}$/;
const FORBIDDEN_KEYS = new Set([
  "authorization",
  "authtoken",
  "credential",
  "credentials",
  "employeewhatsapp",
  "filepath",
  "finalkey",
  "password",
  "purchasecost",
  "referencecost",
  "referencepurchasecost",
  "refreshtoken",
  "servercontext",
  "sessiontoken",
  "stack",
  "stagingkey",
  "storagekey",
  "storagereference",
  "trustedcontexttoken",
  "trashkey",
]);

export class ProductEntryLocalDraftInputFailure extends Error {
  constructor(readonly code: ProductEntryLocalDraftCode) {
    super(code);
    this.name = "ProductEntryLocalDraftInputFailure";
  }
}

const record = (value: unknown): Readonly<Record<string, unknown>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid record.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Invalid record prototype.");
  }
  return value as Readonly<Record<string, unknown>>;
};

const requiredString = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0 || value !== value.trim()) {
    throw new Error("Invalid string.");
  }
  return value;
};

const nullableString = (value: unknown): string | null =>
  value === null ? null : requiredString(value);

const nullableText = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid text.");
  return value;
};

const nonNegativeInteger = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("Invalid non-negative integer.");
  }
  return value as number;
};

const nullableNonNegativeInteger = (value: unknown): number | null =>
  value === null ? null : nonNegativeInteger(value);

const positiveIntegerOrNull = (value: unknown): number | null => {
  if (value === null) return null;
  const parsed = nonNegativeInteger(value);
  if (parsed === 0) throw new Error("Expected a positive integer.");
  return parsed;
};

const finiteTimestamp = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("Invalid timestamp.");
  }
  return value as number;
};

const inspectNotStorable = (value: unknown, seen = new WeakSet<object>()): void => {
  const objectTag = typeof value === "object" && value !== null
    ? Object.prototype.toString.call(value)
    : "";
  if (
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof File !== "undefined" && value instanceof File) ||
    /^\[object (?:Blob|File|ArrayBuffer|SharedArrayBuffer|DataView|Uint(?:8|16|32)Array|Int(?:8|16|32)Array|Uint8ClampedArray|Float(?:32|64)Array|BigUint64Array|BigInt64Array)\]$/.test(objectTag)
  ) {
    throw new ProductEntryLocalDraftInputFailure(
      PRODUCT_ENTRY_LOCAL_DRAFT_CODES.mediaSourceNotStorable,
    );
  }
  if (typeof value === "string" && /^(blob|data|filesystem):/i.test(value)) {
    throw new ProductEntryLocalDraftInputFailure(
      PRODUCT_ENTRY_LOCAL_DRAFT_CODES.mediaSourceNotStorable,
    );
  }
  if (typeof value !== "object" || value === null) return;
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ProductEntryLocalDraftInputFailure(
        PRODUCT_ENTRY_LOCAL_DRAFT_CODES.forbiddenField,
      );
    }
  }
  if (seen.has(value)) {
    throw new ProductEntryLocalDraftInputFailure(
      PRODUCT_ENTRY_LOCAL_DRAFT_CODES.forbiddenField,
    );
  }
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z]/gi, "").toLowerCase();
    if (FORBIDDEN_KEYS.has(normalized) || /(?:access|auth|refresh|session)token/.test(normalized)) {
      throw new ProductEntryLocalDraftInputFailure(
        PRODUCT_ENTRY_LOCAL_DRAFT_CODES.forbiddenField,
      );
    }
    inspectNotStorable(nested, seen);
  }
  seen.delete(value);
};

const normalizeMoney = (value: unknown) => {
  if (value === null) return null;
  const input = record(value);
  return Object.freeze({
    amountMinor: nonNegativeInteger(input.amountMinor),
    currency: requiredString(input.currency),
  });
};

export const sanitizeProductEntryLocalDraftFormState = (
  value: unknown,
): ProductEntryLocalDraftFormState => {
  inspectNotStorable(value);
  const input = record(value);
  if (typeof input.isHighlighted !== "boolean") throw new Error("Invalid highlight flag.");
  if (input.publicationIntent !== "SaveAsDraft" && input.publicationIntent !== "PublishWhenReady") {
    throw new Error("Invalid publication intent.");
  }
  if (!Array.isArray(input.specificationValues)) throw new Error("Invalid specification values.");
  const fieldIds = new Set<string>();
  const specificationValues = input.specificationValues.map((valueItem) => {
    const item = record(valueItem);
    const specificationFieldId = requiredString(item.specificationFieldId);
    if (fieldIds.has(specificationFieldId)) throw new Error("Duplicate specification field.");
    fieldIds.add(specificationFieldId);
    if (!["string", "number", "boolean"].includes(typeof item.value)) {
      throw new Error("Invalid specification value.");
    }
    if (typeof item.value === "number" && !Number.isFinite(item.value)) {
      throw new Error("Invalid specification number.");
    }
    return Object.freeze({
      specificationFieldId,
      value: item.value as string | number | boolean,
    });
  });
  return Object.freeze({
    catalogId: nullableString(input.catalogId),
    departmentId: nullableString(input.departmentId),
    categoryId: nullableString(input.categoryId),
    productTypeId: nullableString(input.productTypeId),
    deviceClassId: nullableString(input.deviceClassId),
    brandId: nullableString(input.brandId),
    productModelId: nullableString(input.productModelId),
    conditionId: nullableString(input.conditionId),
    availabilityStatusId: nullableString(input.availabilityStatusId),
    productName: nullableText(input.productName),
    productCode: nullableText(input.productCode),
    wholesalePrice: normalizeMoney(input.wholesalePrice),
    retailPrice: normalizeMoney(input.retailPrice),
    isHighlighted: input.isHighlighted,
    publicationIntent: input.publicationIntent,
    specificationValues: Object.freeze(specificationValues),
  });
};

export const sanitizeProductEntryLocalDraftMediaDescriptors = (
  value: unknown,
): readonly ProductEntryLocalDraftMediaDescriptor[] => {
  inspectNotStorable(value);
  if (!Array.isArray(value)) throw new Error("Invalid media descriptors.");
  const operationIds = new Set<string>();
  const descriptors = value.map((descriptorValue, index) => {
    const input = record(descriptorValue);
    const operationId = requiredString(input.operationId);
    if (operationIds.has(operationId)) throw new Error("Duplicate media operation.");
    operationIds.add(operationId);
    if (!(["Add", "Replace", "Remove", "Reorder", "SetCover"] as const).includes(input.operationType as never)) {
      throw new Error("Invalid media operation type.");
    }
    const operationType = input.operationType as ProductEntryLocalDraftMediaDescriptor["operationType"];
    const sequence = nonNegativeInteger(input.sequence);
    if (sequence !== index) throw new Error("Media sequence must be contiguous.");
    if (typeof input.selectedAsCover !== "boolean") throw new Error("Invalid cover flag.");
    const mediaId = nullableString(input.mediaId);
    const sourceOperation = operationType === "Add" || operationType === "Replace";
    if ((operationType === "Add" && mediaId !== null) || (operationType !== "Add" && mediaId === null)) {
      throw new Error("Invalid media target.");
    }
    const expectedSourceSha256 = nullableString(input.expectedSourceSha256);
    const expectedSourceByteLength = positiveIntegerOrNull(input.expectedSourceByteLength);
    if (
      sourceOperation &&
      ((expectedSourceSha256 !== null && !SHA_256.test(expectedSourceSha256)) ||
        (expectedSourceSha256 === null) !== (expectedSourceByteLength === null))
    ) {
      throw new Error("Invalid source integrity metadata.");
    }
    if (!sourceOperation && (expectedSourceSha256 !== null || expectedSourceByteLength !== null)) {
      throw new Error("Remove and metadata operations cannot have source metadata.");
    }
    const sourceAvailability = input.sourceAvailability;
    if (!Object.values(PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY).includes(sourceAvailability as never)) {
      throw new Error("Invalid source availability.");
    }
    if (
      (sourceOperation && sourceAvailability === PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired) ||
      (!sourceOperation && sourceAvailability !== PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired)
    ) {
      throw new Error("Invalid source availability for operation.");
    }
    const requestedDisplayOrder = nullableNonNegativeInteger(input.requestedDisplayOrder);
    const finalOrder = nullableNonNegativeInteger(input.finalOrder);
    if (operationType === "Remove" && (requestedDisplayOrder !== null || finalOrder !== null || input.selectedAsCover)) {
      throw new Error("Remove cannot have order or cover metadata.");
    }
    if (operationType === "Reorder"
      && (requestedDisplayOrder === null || finalOrder !== requestedDisplayOrder || input.selectedAsCover)) {
      throw new Error("Invalid Reorder metadata.");
    }
    if (operationType === "SetCover"
      && (requestedDisplayOrder !== null || finalOrder !== null || !input.selectedAsCover)) {
      throw new Error("Invalid SetCover metadata.");
    }
    return Object.freeze({
      operationId,
      operationType,
      sequence,
      mediaId,
      requestedDisplayOrder,
      selectedAsCover: input.selectedAsCover,
      expectedSourceSha256,
      expectedSourceByteLength,
      finalOrder,
      fileName: sourceOperation ? nullableString(input.fileName) : null,
      mimeType: sourceOperation ? nullableString(input.mimeType) : null,
      sourceAvailability: sourceAvailability as ProductEntryLocalDraftMediaDescriptor["sourceAvailability"],
    });
  });
  if (descriptors.filter((descriptor) => descriptor.selectedAsCover).length > 1) {
    throw new Error("Only one media operation may select the cover.");
  }
  return Object.freeze(descriptors);
};

const normalizePersistedDraft = (value: unknown): ProductEntryLocalDraft => {
  const input = record(value);
  if (input.mode !== "Create" && input.mode !== "Edit") throw new Error("Invalid mode.");
  const mode = input.mode;
  const productId = nullableString(input.productId);
  const baseProductRevision = input.baseProductRevision === null
    ? null
    : nonNegativeInteger(input.baseProductRevision);
  if ((mode === "Create" && (productId !== null || baseProductRevision !== null)) ||
      (mode === "Edit" && (productId === null || baseProductRevision === null))) {
    throw new Error("Invalid mode identity.");
  }
  const createdAt = finiteTimestamp(input.createdAt);
  const updatedAt = finiteTimestamp(input.updatedAt);
  const expiresAt = finiteTimestamp(input.expiresAt);
  if (createdAt > updatedAt || updatedAt > expiresAt) throw new Error("Invalid draft timestamps.");
  return Object.freeze({
    schemaVersion: PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION,
    mode,
    workspaceId: requiredString(input.workspaceId),
    actorId: requiredString(input.actorId),
    submissionId: requiredString(input.submissionId),
    productId,
    baseProductRevision,
    createdAt,
    updatedAt,
    expiresAt,
    formState: sanitizeProductEntryLocalDraftFormState(input.formState),
    mediaDescriptors: sanitizeProductEntryLocalDraftMediaDescriptors(input.mediaDescriptors),
  });
};

const migrateVersionZero = (value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => ({
  ...value,
  schemaVersion: PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION,
  mediaDescriptors: Array.isArray(value.mediaDescriptors)
    ? value.mediaDescriptors.map((descriptor) => {
        const item = record(descriptor);
        return {
          ...item,
          sourceAvailability: item.operationType === "Add" || item.operationType === "Replace"
            ? PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.requiresReselection
            : PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired,
        };
      })
    : value.mediaDescriptors,
});

export const decodeProductEntryLocalDraft = (
  value: unknown,
): ProductEntryLocalDraftStoredLookup => {
  try {
    const input = record(value);
    if (!Number.isSafeInteger(input.schemaVersion) || (input.schemaVersion as number) < 0) {
      return { type: "Corrupt" };
    }
    if ((input.schemaVersion as number) > PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION) {
      return { type: "Incompatible" };
    }
    const migrated = input.schemaVersion === 0 ? migrateVersionZero(input) : input;
    return { type: "Found", draft: normalizePersistedDraft(migrated) };
  } catch {
    return { type: "Corrupt" };
  }
};

export const prepareRestoredProductEntryLocalDraft = (
  draft: ProductEntryLocalDraft,
): ProductEntryLocalDraft => Object.freeze({
  ...draft,
  mediaDescriptors: Object.freeze(draft.mediaDescriptors.map((descriptor) => Object.freeze({
    ...descriptor,
    sourceAvailability: descriptor.operationType === "Add" || descriptor.operationType === "Replace"
      ? PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.requiresReselection
      : PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired,
  }))),
});
