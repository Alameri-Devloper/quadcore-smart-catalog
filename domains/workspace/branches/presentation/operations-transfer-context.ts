import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import type { OperationalBranchState, OperationalBranchView } from "./operational-branch-selector.types";
import { operationsContextHref, type OperationsContext } from "./operations-query-state";

export interface KnownTransferProductSelection { readonly lifecycle: object; readonly key: string; readonly product: OperationalProductView }
const withoutSelection = (query: OperationalProductQuery): OperationalProductQuery => ({ ...query, productId: null });
export const transferSelectionKey = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery) =>
  operationsContextHref(context, branchId, withoutSelection(query));
export const transferProductNavigation = (current: OperationalProductQuery, next: OperationalProductQuery) => {
  const changed = current.q !== next.q || current.productCursor !== next.productCursor || current.issue !== next.issue;
  return { productId: next.productId, navigation: changed ? withoutSelection(next) : null };
};
export const operationsTransferSelection = (context: OperationsContext, sourceBranchId: string | null, query: OperationalProductQuery,
  branches: OperationalBranchState, lifecycle: object, known: KnownTransferProductSelection | null): {
    readonly source: OperationalBranchView; readonly product: OperationalProductView | null;
  } | null => {
  if (context.section !== "Inventory" || context.inventoryTool !== "transfer" || !sourceBranchId || query.issue
    || branches.type !== "Ready" || branches.purpose !== "Transfer") return null;
  const source = branches.options.find(branch => branch.branchId === sourceBranchId);
  if (!source || source.status !== "Active") return null;
  const product = known && known.lifecycle === lifecycle && known.key === transferSelectionKey(context, sourceBranchId, query)
    && known.product.branchId === sourceBranchId ? known.product : null;
  return { source, product };
};
