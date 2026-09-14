import type { OperationalProductScope } from "../../../catalog/query/presentation/operational-product-selector.types";
import { operationalBranchSelection } from "./operational-branch-selector.coordinator";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationalBranchPurpose, operationalProductPurpose, type OperationsContext } from "./operations-query-state";

export type OperationsProductDiscovery =
  | { readonly type: "None" }
  | { readonly type: "Waiting"; readonly reason: "SelectBranch" | "InactiveBranch" | "StaleBranch" }
  | { readonly type: "Ready"; readonly scope: OperationalProductScope };

/** Compose current A6 discovery with A2. No General Branch fallback or permission inference. */
export const operationsProductDiscovery = (context: OperationsContext, branchId: string | null,
  branches: OperationalBranchState = { type: "Idle" }): OperationsProductDiscovery => {
  const purpose = operationalProductPurpose(context);
  if (!purpose) return { type: "None" };
  if (purpose === "WorkspacePricing" || purpose === "WorkspaceReferenceCost") return { type: "Ready", scope: { purpose } };
  const branchPurpose = operationalBranchPurpose(context);
  if (!branchPurpose) return { type: "Waiting", reason: "SelectBranch" };
  const selection = operationalBranchSelection(branches, branchPurpose, branchId);
  if (selection.type !== "Selected") return { type: "Waiting", reason: selection.type === "Inactive" ? "InactiveBranch"
    : selection.type === "StaleSelectedBranch" ? "StaleBranch" : "SelectBranch" };
  return { type: "Ready", scope: { purpose, branchId: selection.branch.branchId } };
};
