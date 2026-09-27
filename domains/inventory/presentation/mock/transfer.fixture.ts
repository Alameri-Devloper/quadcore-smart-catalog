import { quantityFixture } from "./inventory.fixture";
import type { TransferCommand, TransferMutationView } from "../transfer.types";

export const transferCommandFixture = (patch: Partial<TransferCommand> = {}): TransferCommand => ({
  operationId: "operation-transfer-0001", sourceBranchId: "branch-source", destinationBranchId: "branch-destination",
  productId: "product-one", quantity: "2", ...patch,
});
export const transferMutationFixture = (patch: Partial<TransferMutationView> = {}): TransferMutationView => ({
  operationId: "operation-transfer-0001", status: "Succeeded", transferId: "transfer-one", ...patch,
});
export const detailedTransferFixture = (patch: Partial<TransferMutationView> = {}): TransferMutationView => ({
  operationId: "operation-transfer-0001", status: "Succeeded", transferId: "transfer-one",
  sourceBalance: quantityFixture({ branchId: "branch-source" }), destinationBalance: quantityFixture({ branchId: "branch-destination" }), ...patch,
});
