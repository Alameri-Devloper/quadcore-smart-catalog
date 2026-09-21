import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationsContextHref, type OperationsContext } from "./operations-query-state";

export interface KnownListingSelection {
  readonly lifecycle: object;
  readonly key: string;
  readonly product: OperationalProductView;
}
export const listingSelectionKey = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery) => operationsContextHref(context, branchId, query);
/** A known selection is a resource reference only. Listing GET remains the resource authority. */
export const operationsListingResource = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery,
  branches: OperationalBranchState, lifecycle: object, known: KnownListingSelection | null) => {
  if (context.section !== "Branches" || context.branchTool !== "listing" || !branchId || !query.productId || query.issue
    || !known || known.lifecycle !== lifecycle || known.key !== listingSelectionKey(context, branchId, query)
    || known.product.productId !== query.productId || known.product.branchId !== branchId
    || branches.type !== "Ready" || branches.purpose !== "Listing") return null;
  const branch = branches.options.find(option => option.branchId === branchId);
  if (!branch) return null;
  return { resource: { branchId, productId: query.productId }, inspectionOnly: branch.status === "Inactive",
    resourceLabel: `${known.product.productName ?? known.product.productCode ?? known.product.productId} — ${branch.displayName}` };
};
