export type InventoryError = "Forbidden" | "BranchNotFound" | "BranchInactive" | "ProductNotFound" | "ProductArchived" | "InvalidQuantity" | "InvalidInput" | "InsufficientAvailableStock" | "ReservationNotFound" | "ReservationNotActive" | "InventoryConflict" | "IdempotencyConflict";
export type InventoryResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: InventoryError };
export const inventorySuccess = <T>(value: T): InventoryResult<T> => Object.freeze({ ok: true, value });
export const inventoryFailure = <T = never>(error: InventoryError): InventoryResult<T> => Object.freeze({ ok: false, error });
