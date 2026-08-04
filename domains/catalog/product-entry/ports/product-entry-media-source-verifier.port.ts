export const PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES = {
  sha256Mismatch: "SOURCE_SHA256_MISMATCH",
  byteLengthMismatch: "SOURCE_BYTE_LENGTH_MISMATCH",
  mimeUnsupported: "SOURCE_MIME_UNSUPPORTED",
  imageInvalid: "SOURCE_IMAGE_INVALID",
  dimensionsUnsupported: "SOURCE_DIMENSIONS_UNSUPPORTED",
  tooLarge: "SOURCE_TOO_LARGE",
  required: "SOURCE_REQUIRED",
  unexpected: "SOURCE_UNEXPECTED",
  duplicated: "SOURCE_DUPLICATED",
  operationUnknown: "SOURCE_OPERATION_UNKNOWN",
} as const;

export type ProductEntryMediaSourceErrorCode =
  (typeof PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES)[keyof typeof PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES];

export interface ProductEntryMediaSourceVerificationCommand {
  readonly operationId: string;
  readonly bytes: Uint8Array;
  readonly clientMediaType: string | null;
  readonly expectedSha256: string;
  readonly expectedByteLength: number;
}

export interface VerifiedProductEntryMediaSource {
  readonly operationId: string;
  readonly bytes: Uint8Array;
  readonly rawSha256: string;
  readonly rawByteLength: number;
  readonly detectedMediaType: "image/jpeg" | "image/png" | "image/webp";
  readonly width: number;
  readonly height: number;
}

export type ProductEntryMediaSourceVerificationResult =
  | { readonly type: "Verified"; readonly source: VerifiedProductEntryMediaSource }
  | { readonly type: "Rejected"; readonly code: ProductEntryMediaSourceErrorCode; readonly operationId: string };

export interface ProductEntryMediaSourceVerifier {
  verify(command: ProductEntryMediaSourceVerificationCommand): Promise<ProductEntryMediaSourceVerificationResult>;
}
