import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import {
  PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES,
  type ProductEntryMediaSourceErrorCode,
} from "../ports/product-entry-media-source-verifier.port";

export interface ProductEntryMediaUploadPart {
  readonly fieldName: string;
  readonly bytes: Uint8Array;
  readonly clientMediaType: string | null;
}

export interface MappedProductEntryMediaSource {
  readonly operation: ProductEntryMediaOperation;
  readonly bytes: Uint8Array;
  readonly clientMediaType: string | null;
}

export type MapProductEntryMediaSourcesResult =
  | { readonly type: "Mapped"; readonly sources: readonly MappedProductEntryMediaSource[] }
  | { readonly type: "Rejected"; readonly code: ProductEntryMediaSourceErrorCode; readonly operationId: string | null };

const SOURCE_PREFIX = "source:";

export const mapProductEntryMediaSources = (
  plan: readonly ProductEntryMediaOperation[],
  parts: readonly ProductEntryMediaUploadPart[],
  requiredSourceOperationIds: readonly string[] = plan
    .filter((operation) => operation.operationType === "Add" || operation.operationType === "Replace")
    .map((operation) => operation.operationId),
): MapProductEntryMediaSourcesResult => {
  const operations = new Map(plan.map((operation) => [operation.operationId, operation]));
  const required = new Set(requiredSourceOperationIds);
  if ([...required].some((operationId) => {
    const operation = operations.get(operationId);
    return !operation || (operation.operationType !== "Add" && operation.operationType !== "Replace");
  })) {
    return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.unexpected, operationId: null };
  }
  const supplied = new Map<string, ProductEntryMediaUploadPart>();
  for (const part of parts) {
    if (!part.fieldName.startsWith(SOURCE_PREFIX) || part.fieldName.length === SOURCE_PREFIX.length) {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.unexpected, operationId: null };
    }
    const operationId = part.fieldName.slice(SOURCE_PREFIX.length);
    const operation = operations.get(operationId);
    if (!operation) {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.operationUnknown, operationId };
    }
    if (operation.operationType !== "Add" && operation.operationType !== "Replace") {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.unexpected, operationId };
    }
    if (!required.has(operationId)) {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.unexpected, operationId };
    }
    if (supplied.has(operationId)) {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.duplicated, operationId };
    }
    if (part.bytes.byteLength === 0) {
      return { type: "Rejected", code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.required, operationId };
    }
    supplied.set(operationId, part);
  }
  const mapped: MappedProductEntryMediaSource[] = [];
  for (const operation of [...plan].sort((left, right) => left.sequence - right.sequence)) {
    if (!required.has(operation.operationId)) continue;
    const part = supplied.get(operation.operationId);
    if (!part) {
      return {
        type: "Rejected",
        code: PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.required,
        operationId: operation.operationId,
      };
    }
    mapped.push({ operation, bytes: part.bytes, clientMediaType: part.clientMediaType });
  }
  return { type: "Mapped", sources: Object.freeze(mapped) };
};
