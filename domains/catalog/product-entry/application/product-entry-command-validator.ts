import { ProductTypeId, ProductClassification } from "../../types/product-classification.value-object";
import { ProductCommercialDetails } from "../../types/product-commercial-details.value-object";
import { CatalogId, ProductId } from "../../types/product-identity.value-object";
import { createProductSpecificationValues } from "../../types/product-specification-value.value-object";
import { PRODUCT_ENTRY_MEDIA_OPERATION_TYPES } from "../domain/product-entry-media-plan";
import {
  PRODUCT_ENTRY_SUBMISSION_MODES,
  ProductEntrySubmissionId,
} from "../domain/product-entry-submission";
import {
  PRODUCT_ENTRY_VALIDATION_CODES,
  type PrepareProductEntryCommandResult,
  type PreparedProductEntryMediaOperation,
} from "./product-entry-command";

const COMMAND_KEYS = new Set(["submissionId", "mode", "productId", "expectedProductRevision", "draft", "mediaOperations"]);
const DRAFT_KEYS = new Set(["catalogId", "classification", "commercialDetails", "specificationValues"]);
const CLASSIFICATION_KEYS = new Set(["categoryId", "productTypeId", "deviceClassId", "conditionId", "availabilityStatusId"]);
const COMMERCIAL_KEYS = new Set(["productName", "productCode", "productModelId", "brandId", "isHighlighted", "pricing"]);
const PRICING_KEYS = new Set(["wholesalePrice", "retailPrice"]);
const MONEY_KEYS = new Set(["amountMinor", "currency"]);
const SPECIFICATION_KEYS = new Set(["specificationFieldId", "value"]);
const MEDIA_KEYS = new Set(["operationId", "operationType", "sequence", "mediaId", "requestedDisplayOrder", "selectedAsCover", "expectedSourceSha256", "expectedSourceByteLength", "finalOrder"]);
const SHA_256_LOWERCASE_HEX = /^[a-f0-9]{64}$/;

const record = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidStructure, field);
  }
  return value as Record<string, unknown>;
};

const exactKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>, field: string): void => {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.unsupportedField, field);
  }
};

const optionalString = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, field);
  }
  return value;
};

const nullableOrder = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, field);
  }
  return value as number;
};

class ValidationFailure extends Error {
  constructor(readonly code: (typeof PRODUCT_ENTRY_VALIDATION_CODES)[keyof typeof PRODUCT_ENTRY_VALIDATION_CODES], readonly field?: string) {
    super(code);
  }
}

const normalizeMoney = (value: unknown, field: string) => {
  if (value === undefined || value === null) return null;
  const input = record(value, field);
  exactKeys(input, MONEY_KEYS, field);
  if (!Number.isSafeInteger(input.amountMinor) || (input.amountMinor as number) < 0 || typeof input.currency !== "string") {
    throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, field);
  }
  return { amountMinor: input.amountMinor as number, currency: input.currency };
};

const normalizeMediaOperations = (value: unknown): readonly PreparedProductEntryMediaOperation[] => {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, "mediaOperations");
  const ids = new Set<string>();
  const operations = value.map((item, index) => {
    const input = record(item, `mediaOperations[${index}]`);
    exactKeys(input, MEDIA_KEYS, `mediaOperations[${index}]`);
    if (typeof input.operationId !== "string" || input.operationId.trim().length === 0 || ids.has(input.operationId)) {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].operationId`);
    }
    ids.add(input.operationId);
    if (!Object.values(PRODUCT_ENTRY_MEDIA_OPERATION_TYPES).includes(input.operationType as never)) {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].operationType`);
    }
    if (input.sequence !== index) {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].sequence`);
    }
    const operationType = input.operationType as PreparedProductEntryMediaOperation["operationType"];
    const mediaId = optionalString(input.mediaId, `mediaOperations[${index}].mediaId`);
    const sourceSha256 = optionalString(input.expectedSourceSha256, `mediaOperations[${index}].expectedSourceSha256`);
    const sourceByteLength = input.expectedSourceByteLength === undefined || input.expectedSourceByteLength === null
      ? null
      : input.expectedSourceByteLength;
    const sourceOperation = operationType !== PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.remove;
    if (sourceOperation) {
      if (sourceSha256 === null || !SHA_256_LOWERCASE_HEX.test(sourceSha256) || !Number.isSafeInteger(sourceByteLength) || (sourceByteLength as number) <= 0) {
        throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].source`);
      }
    } else if (sourceSha256 !== null || sourceByteLength !== null) {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].source`);
    }
    if ((operationType === PRODUCT_ENTRY_MEDIA_OPERATION_TYPES.add) !== (mediaId === null)) {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].mediaId`);
    }
    if (input.selectedAsCover !== undefined && typeof input.selectedAsCover !== "boolean") {
      throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMediaPlan, `mediaOperations[${index}].selectedAsCover`);
    }
    return Object.freeze({
      operationId: input.operationId,
      operationType,
      sequence: index,
      mediaId,
      requestedDisplayOrder: nullableOrder(input.requestedDisplayOrder, `mediaOperations[${index}].requestedDisplayOrder`),
      selectedAsCover: (input.selectedAsCover as boolean | undefined) ?? false,
      expectedSourceSha256: sourceSha256,
      expectedSourceByteLength: sourceByteLength as number | null,
      finalOrder: nullableOrder(input.finalOrder, `mediaOperations[${index}].finalOrder`),
    });
  });
  return Object.freeze(operations);
};

export class ProductEntryCommandValidator {
  prepare(value: unknown): PrepareProductEntryCommandResult {
    try {
      const input = record(value, "command");
      exactKeys(input, COMMAND_KEYS, "command");
      const submissionId = ProductEntrySubmissionId.create(input.submissionId as string);
      if (!Object.values(PRODUCT_ENTRY_SUBMISSION_MODES).includes(input.mode as never)) {
        throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidMode, "mode");
      }
      const mode = input.mode as "Create" | "Edit";
      const productIdValue = optionalString(input.productId, "productId");
      const expectedRevision = input.expectedProductRevision === undefined || input.expectedProductRevision === null
        ? null
        : input.expectedProductRevision;
      if (mode === PRODUCT_ENTRY_SUBMISSION_MODES.create) {
        if (productIdValue !== null) throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidProductIdentity, "productId");
        if (expectedRevision !== null) throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidExpectedRevision, "expectedProductRevision");
      } else {
        if (productIdValue === null) throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidProductIdentity, "productId");
        if (!Number.isSafeInteger(expectedRevision) || (expectedRevision as number) < 0) {
          throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidExpectedRevision, "expectedProductRevision");
        }
      }

      const draftInput = record(input.draft, "draft");
      exactKeys(draftInput, DRAFT_KEYS, "draft");
      const catalogIdValue = optionalString(draftInput.catalogId, "draft.catalogId");
      if ((mode === PRODUCT_ENTRY_SUBMISSION_MODES.create) !== (catalogIdValue !== null)) {
        throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, "draft.catalogId");
      }

      let classificationCanonical: Record<string, string | null> | null = null;
      let classification: ReturnType<typeof ProductClassification.create> | undefined;
      if (draftInput.classification !== undefined && draftInput.classification !== null) {
        const classificationInput = record(draftInput.classification, "draft.classification");
        exactKeys(classificationInput, CLASSIFICATION_KEYS, "draft.classification");
        classificationCanonical = {
          categoryId: optionalString(classificationInput.categoryId, "draft.classification.categoryId"),
          productTypeId: optionalString(classificationInput.productTypeId, "draft.classification.productTypeId"),
          deviceClassId: optionalString(classificationInput.deviceClassId, "draft.classification.deviceClassId"),
          conditionId: optionalString(classificationInput.conditionId, "draft.classification.conditionId"),
          availabilityStatusId: optionalString(classificationInput.availabilityStatusId, "draft.classification.availabilityStatusId"),
        };
        classification = ProductClassification.create({
          categoryId: classificationCanonical.categoryId ?? undefined,
          productTypeId: classificationCanonical.productTypeId ? ProductTypeId.create(classificationCanonical.productTypeId) : undefined,
          deviceClassId: classificationCanonical.deviceClassId ?? undefined,
          conditionId: classificationCanonical.conditionId ?? undefined,
          availabilityStatusId: classificationCanonical.availabilityStatusId ?? undefined,
        });
      }

      const commercialInput = draftInput.commercialDetails === undefined
        ? {}
        : record(draftInput.commercialDetails, "draft.commercialDetails");
      exactKeys(commercialInput, COMMERCIAL_KEYS, "draft.commercialDetails");
      if (commercialInput.isHighlighted !== undefined && typeof commercialInput.isHighlighted !== "boolean") {
        throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, "draft.commercialDetails.isHighlighted");
      }
      const pricingInput = commercialInput.pricing === undefined || commercialInput.pricing === null
        ? {}
        : record(commercialInput.pricing, "draft.commercialDetails.pricing");
      exactKeys(pricingInput, PRICING_KEYS, "draft.commercialDetails.pricing");
      const wholesalePrice = normalizeMoney(pricingInput.wholesalePrice, "draft.commercialDetails.pricing.wholesalePrice");
      const retailPrice = normalizeMoney(pricingInput.retailPrice, "draft.commercialDetails.pricing.retailPrice");
      const commercialCanonical = {
        productName: optionalString(commercialInput.productName, "draft.commercialDetails.productName"),
        productCode: optionalString(commercialInput.productCode, "draft.commercialDetails.productCode"),
        productModelId: optionalString(commercialInput.productModelId, "draft.commercialDetails.productModelId"),
        brandId: optionalString(commercialInput.brandId, "draft.commercialDetails.brandId"),
        isHighlighted: (commercialInput.isHighlighted as boolean | undefined) ?? false,
        pricing: { wholesalePrice, retailPrice },
      };
      const commercialDetails = {
        productName: commercialCanonical.productName ?? undefined,
        productCode: commercialCanonical.productCode ?? undefined,
        productModelId: commercialCanonical.productModelId ?? undefined,
        brandId: commercialCanonical.brandId ?? undefined,
        isHighlighted: commercialCanonical.isHighlighted,
        pricing: wholesalePrice || retailPrice
          ? { wholesalePrice: wholesalePrice ?? undefined, retailPrice: retailPrice ?? undefined }
          : undefined,
      };
      ProductCommercialDetails.create(commercialDetails);

      const specificationInput = draftInput.specificationValues ?? [];
      if (!Array.isArray(specificationInput)) throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, "draft.specificationValues");
      const specificationValues = specificationInput.map((item, index) => {
        const itemInput = record(item, `draft.specificationValues[${index}]`);
        exactKeys(itemInput, SPECIFICATION_KEYS, `draft.specificationValues[${index}]`);
        if (typeof itemInput.specificationFieldId !== "string" || itemInput.specificationFieldId.trim().length === 0) {
          throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, `draft.specificationValues[${index}].specificationFieldId`);
        }
        if (!["string", "number", "boolean"].includes(typeof itemInput.value) ||
          (typeof itemInput.value === "number" && (!Number.isFinite(itemInput.value) || Object.is(itemInput.value, -0)))) {
          throw new ValidationFailure(PRODUCT_ENTRY_VALIDATION_CODES.invalidDraft, `draft.specificationValues[${index}].value`);
        }
        return Object.freeze({ specificationFieldId: itemInput.specificationFieldId, value: itemInput.value as string | number | boolean });
      });
      createProductSpecificationValues(specificationValues);

      const mediaOperations = normalizeMediaOperations(input.mediaOperations);
      const canonicalPayload = Object.freeze({
        mode,
        productId: productIdValue,
        expectedProductRevision: expectedRevision,
        draft: {
          catalogId: catalogIdValue,
          classification: classificationCanonical,
          commercialDetails: commercialCanonical,
          specificationValues: specificationValues.map((item) => ({ specificationFieldId: item.specificationFieldId, value: item.value })),
        },
        mediaOperations: mediaOperations.map((operation) => ({ ...operation })),
      });
      return {
        type: "Valid",
        command: Object.freeze({
          submissionId,
          mode,
          productId: productIdValue === null ? null : ProductId.create(productIdValue),
          expectedProductRevision: expectedRevision as number | null,
          draft: Object.freeze({
            catalogId: catalogIdValue === null ? null : CatalogId.create(catalogIdValue),
            classification,
            commercialDetails,
            specificationValues: Object.freeze(specificationValues),
          }),
          mediaOperations,
          canonicalPayload,
        }),
      };
    } catch (error) {
      const reason = error instanceof ValidationFailure
        ? { code: error.code, field: error.field }
        : { code: PRODUCT_ENTRY_VALIDATION_CODES.invalidStructure };
      return { type: "Invalid", reasons: Object.freeze([Object.freeze(reason)]) };
    }
  }
}
