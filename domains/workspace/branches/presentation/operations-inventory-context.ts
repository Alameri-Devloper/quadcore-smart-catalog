import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationsContextHref, type OperationsContext } from "./operations-query-state";

export interface KnownInventorySelection {
  readonly lifecycle: object;
  readonly key: string;
  readonly product: OperationalProductView;
}
const withoutSelection = (query: OperationalProductQuery): OperationalProductQuery => ({ ...query, productId: null });
export const inventorySelectionKey = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery) =>
  operationsContextHref(context, branchId, withoutSelection(query));
export const inventoryProductNavigation = (current: OperationalProductQuery, next: OperationalProductQuery) => {
  const changed = current.q !== next.q || current.productCursor !== next.productCursor || current.issue !== next.issue;
  return { productId: next.productId, navigation: changed ? withoutSelection(next) : null };
};
/** A locally selected Product is a resource reference only; Inventory GET and POST remain authoritative. */
export const operationsInventoryResource = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery,
  branches: OperationalBranchState, lifecycle: object, known: KnownInventorySelection | null) => {
  if (context.section !== "Inventory" || context.inventoryTool !== "stock" || !branchId || query.issue || !known
    || known.lifecycle !== lifecycle || known.key !== inventorySelectionKey(context, branchId, query)
    || known.product.branchId !== branchId || branches.type !== "Ready" || branches.purpose !== "Inventory") return null;
  const branch = branches.options.find(option => option.branchId === branchId);
  if (!branch) return null;
  return { resource: { branchId, productId: known.product.productId }, inspectionOnly: branch.status === "Inactive",
    resourceLabel: `${known.product.productName ?? known.product.productCode ?? known.product.productId} — ${branch.displayName}` };
};
