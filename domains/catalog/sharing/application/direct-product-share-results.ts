export type DirectProductShareError =
  | "InvalidInput"
  | "Forbidden"
  | "ProductNotFound"
  | "BranchNotFound"
  | "ProductIneligible"
  | "BranchProductIneligible"
  | "PriceUnavailable"
  | "UnsupportedCurrencyForDirectShare"
  | "PayloadTooLarge"
  | "MediaUnavailable";

export type DirectProductShareResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DirectProductShareError }
>;

export const directShareSuccess = <T>(value: T): DirectProductShareResult<T> => Object.freeze({ ok: true, value });
export const directShareFailure = (error: DirectProductShareError): DirectProductShareResult<never> => Object.freeze({ ok: false, error });
