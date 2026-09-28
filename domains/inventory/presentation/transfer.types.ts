import type { InventoryAvailability, InventoryFailure, InventoryQuantityView, InventoryReadView, InventoryResource, InventoryResult } from "./inventory.types";

export interface TransferBranchOption {
  readonly branchId: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: "Active" | "Inactive";
}

export interface TransferDraft { readonly quantity: string; readonly reasonCode: string }
export interface TransferCommand {
  readonly operationId: string;
  readonly sourceBranchId: string;
  readonly destinationBranchId: string;
  readonly productId: string;
  readonly quantity: string;
  readonly reasonCode?: string;
}

interface TransferMutationMinimum {
  readonly operationId: string;
  readonly status: "Succeeded";
  readonly transferId: string;
}
export type TransferMutationView =
  | (TransferMutationMinimum & { readonly sourceBalance: InventoryQuantityView; readonly destinationBalance: InventoryQuantityView })
  | (TransferMutationMinimum & { readonly sourceAvailability: InventoryAvailability; readonly destinationAvailability: InventoryAvailability })
  | TransferMutationMinimum;

export type TransferFailure = InventoryFailure;
export type TransferResult<T> = InventoryResult<T>;
export interface TransferPort {
  transfer(command: TransferCommand, signal?: AbortSignal): Promise<TransferResult<TransferMutationView>>;
}
export interface TransferInventoryReadPort {
  get(resource: InventoryResource, signal?: AbortSignal): Promise<TransferResult<InventoryReadView>>;
}
export interface TransferReadHints { readonly canViewAvailability: boolean; readonly canViewQuantities: boolean }
export type TransferSideState =
  | { readonly type: "Idle" }
  | { readonly type: "Loading" }
  | { readonly type: "Ready"; readonly value: InventoryReadView }
  | { readonly type: "ForbiddenRead" }
  | { readonly type: "Failed"; readonly kind: TransferFailure };

export interface TransferState {
  readonly sourceBranchId: string | null;
  readonly destinationBranchId: string | null;
  readonly productId: string | null;
  readonly branches: readonly TransferBranchOption[];
  readonly sourceDetail: TransferSideState;
  readonly destinationDetail: TransferSideState;
  readonly draft: TransferDraft;
  readonly operationId: string | null;
  readonly review: TransferCommand | null;
  readonly pending: boolean;
  readonly reviewRequired: boolean;
  readonly failure: TransferFailure | null;
  readonly outcome: TransferMutationView | null;
}
