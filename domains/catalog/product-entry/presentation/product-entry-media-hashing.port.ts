export const PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES = {
  unavailable: "MEDIA_HASH_UNAVAILABLE",
  cancelled: "MEDIA_HASH_CANCELLED",
  failed: "MEDIA_HASH_FAILED",
} as const;

export type ProductEntryMediaHashFailureCode =
  (typeof PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES)[keyof typeof PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES];

export type ProductEntryMediaHashResult =
  | {
      readonly type: "Hashed";
      readonly operationId: string;
      readonly sha256: string;
      readonly byteLength: number;
    }
  | {
      readonly type: "Rejected";
      readonly operationId: string;
      readonly code: ProductEntryMediaHashFailureCode;
    };

export interface ProductEntryMediaHashingPort {
  hash(operationId: string, file: File): Promise<ProductEntryMediaHashResult>;
  cancel(operationId: string): void;
  dispose(): void;
}

