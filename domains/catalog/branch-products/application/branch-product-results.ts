export type BranchProductError = "Forbidden" | "BranchNotFound" | "BranchInactive" | "ProductNotFound" | "ProductArchived" | "CurrencyNotAllowed" | "InvalidInput" | "Conflict";
export type BranchProductResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: BranchProductError };
export const branchProductSuccess = <T>(value: T): BranchProductResult<T> => Object.freeze({ ok: true, value });
export const branchProductFailure = <T = never>(error: BranchProductError): BranchProductResult<T> => Object.freeze({ ok: false, error });
