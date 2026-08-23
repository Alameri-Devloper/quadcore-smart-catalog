export type BranchError = "Forbidden" | "NotFound" | "InvalidInput" | "CodeConflict" | "Conflict";
export type BranchResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: BranchError };
export const branchSuccess = <T>(value: T): BranchResult<T> => Object.freeze({ ok: true, value });
export const branchFailure = <T = never>(error: BranchError): BranchResult<T> => Object.freeze({ ok: false, error });
