import type { CatalogReferenceApiFailure } from "./catalog-reference-data-management.types";

export type DynamicMutationOperation = "create" | "edit" | "status";
export type DynamicConflictRecovery = "none" | "review-edit" | "retry-status";

export interface DynamicMutationFailurePolicy {
  readonly refreshAuthoritativeState: boolean;
  readonly conflictRecovery: DynamicConflictRecovery;
}

export interface DeactivationFocusTarget {
  readonly isConnected: boolean;
  focus(): void;
}

export const resolveDynamicMutationFailure = (
  failure: CatalogReferenceApiFailure,
  operation: DynamicMutationOperation,
): DynamicMutationFailurePolicy => ({
  refreshAuthoritativeState: failure === "Conflict" || failure === "NotFound",
  conflictRecovery: failure !== "Conflict"
    ? "none"
    : operation === "edit"
      ? "review-edit"
      : operation === "status"
        ? "retry-status"
        : "none",
});

export const chooseDeactivationFocusTarget = (
  capturedOpener: DeactivationFocusTarget | null,
  replacementStatusAction: DeactivationFocusTarget | null,
  stableRecordControl: DeactivationFocusTarget | null,
  managerHeading: DeactivationFocusTarget | null,
): DeactivationFocusTarget | null => [
  capturedOpener,
  replacementStatusAction,
  stableRecordControl,
  managerHeading,
].find((target) => target?.isConnected) ?? null;
