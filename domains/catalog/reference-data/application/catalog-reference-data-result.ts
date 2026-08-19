export type CatalogReferenceDataError =
  | "Forbidden"
  | "InvalidInput"
  | "NotFound"
  | "Conflict";

export type CatalogReferenceDataResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CatalogReferenceDataError };

export const referenceSuccess = <T>(value: T): CatalogReferenceDataResult<T> => Object.freeze({ ok: true, value });
export const referenceFailure = <T = never>(error: CatalogReferenceDataError): CatalogReferenceDataResult<T> => Object.freeze({ ok: false, error });
