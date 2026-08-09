export interface ProductEntryComputedMediaHash {
  readonly sha256: string;
  readonly byteLength: number;
}

export const bytesToLowercaseHex = (bytes: Uint8Array): string => [...bytes]
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

export const computeProductEntryMediaHash = async (
  file: File,
  cryptoPort: Pick<Crypto, "subtle"> = globalThis.crypto,
): Promise<ProductEntryComputedMediaHash> => {
  if (!cryptoPort?.subtle || !(file instanceof File) || file.size <= 0) {
    throw new Error("Product Entry Media hashing is unavailable.");
  }
  const bytes = await file.arrayBuffer();
  const digest = await cryptoPort.subtle.digest("SHA-256", bytes);
  return { sha256: bytesToLowercaseHex(new Uint8Array(digest)), byteLength: file.size };
};
