import type { ProductEntryExecutionContext } from "../application/product-entry-execution-context";

export const PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE = "AUTHENTICATION_CONTEXT_UNAVAILABLE" as const;

export class ProductEntryTrustedContextUnavailableError extends Error {
  readonly code = PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE;

  constructor() {
    super("Product Entry authentication context is unavailable.");
    this.name = "ProductEntryTrustedContextUnavailableError";
  }
}

export interface ProductEntryTrustedContextResolver {
  resolve(): Promise<ProductEntryExecutionContext>;
}
