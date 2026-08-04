import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../../media/ports/product-image-processor";

const MULTIPART_OVERHEAD_ALLOWANCE_BYTES = 1024 * 1024;
const MAXIMUM_MULTIPART_ENTRIES = 32;

export const PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS = Object.freeze({
  maximumEntries: MAXIMUM_MULTIPART_ENTRIES,
  maximumContentLengthBytes:
    (DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION.maximumSourceBytes * MAXIMUM_MULTIPART_ENTRIES)
    + MULTIPART_OVERHEAD_ALLOWANCE_BYTES,
});

export type ProductEntryMediaContentLengthResult =
  | { readonly type: "Accepted" }
  | { readonly type: "Malformed" }
  | { readonly type: "TooLarge" };

export const validateProductEntryMediaContentLength = (
  value: string | null,
): ProductEntryMediaContentLengthResult => {
  if (value === null) return { type: "Accepted" };
  if (!/^\d+$/.test(value)) return { type: "Malformed" };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return { type: "TooLarge" };
  return parsed > PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS.maximumContentLengthBytes
    ? { type: "TooLarge" }
    : { type: "Accepted" };
};
