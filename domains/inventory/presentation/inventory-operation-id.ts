export interface BrowserCryptoPort { randomUUID(): string }

export const createInventoryOperationId = (source: BrowserCryptoPort = globalThis.crypto): string => {
  const value = source.randomUUID();
  if (value.length < 8 || value.length > 128) throw new Error("InvalidOperationId");
  return value;
};
