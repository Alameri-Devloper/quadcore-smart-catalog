import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationalBranchPurpose, operationsContextHref, type OperationsContext } from "./operations-query-state";

export interface KnownBranchPricingSelection {
  readonly lifecycle: object;
  readonly key: string;
  readonly product: OperationalProductView;
}

export const branchPricingSelectionKey = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery) =>
  operationsContextHref(context, branchId, query);

/** A6 and A2 establish only known references. The management GET owns disclosure and mutation actions. */
export const operationsBranchPricingTarget = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery,
  branches: OperationalBranchState, lifecycle: object, known: KnownBranchPricingSelection | null) => {
  const purpose = operationalBranchPurpose(context);
  if (context.section !== "Pricing" || context.pricingScope !== "branch" || !purpose || !branchId || !query.productId || query.issue
    || !known || known.lifecycle !== lifecycle || known.key !== branchPricingSelectionKey(context, branchId, query)
    || known.product.productId !== query.productId || known.product.branchId !== branchId
    || branches.type !== "Ready" || branches.purpose !== purpose) return null;
  const branch = branches.options.find(option => option.branchId === branchId);
  if (!branch) return null;
  return {
    branchId, branchLabel: branch.displayName, productId: known.product.productId,
    productLabel: known.product.productName ?? known.product.productCode ?? known.product.productId,
    surface: context.pricingField, inspectionOnly: branch.status === "Inactive",
  } as const;
};
