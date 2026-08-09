import type { ProductEntryExecutionContext } from "../application/product-entry-execution-context";

export const PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE = "AUTHENTICATION_CONTEXT_UNAVAILABLE" as const;

export class ProductEntryTrustedContextUnavailableError extends Error {
  readonly code = PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE;

  constructor() {
    super("Product Entry authentication context is unavailable.");
    this.name = "ProductEntryTrustedContextUnavailableError";
  }
}

export class ProductEntryAuthenticationRequiredError extends Error {
  constructor() {
    super("A valid authenticated session is required for Product Entry.");
    this.name = "ProductEntryAuthenticationRequiredError";
  }
}

export class ProductEntryRestrictedSessionError extends Error {
  constructor() {
    super("A restricted session cannot access Product Entry.");
    this.name = "ProductEntryRestrictedSessionError";
  }
}

export interface ProductEntryTrustedContextResolver {
  resolve(request: Request): Promise<ProductEntryExecutionContext>;
}
