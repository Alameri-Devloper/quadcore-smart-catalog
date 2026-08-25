export type CatalogQueryError = "Forbidden" | "BranchNotFound" | "ProductNotFound" | "InvalidQuery" | "InvalidCursor";
export type CatalogQueryResult<T> = Readonly<{ readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: CatalogQueryError }>;
export const catalogQuerySuccess = <T>(value: T): CatalogQueryResult<T> => Object.freeze({ ok: true, value });
export const catalogQueryFailure = (error: CatalogQueryError): CatalogQueryResult<never> => Object.freeze({ ok: false, error });
