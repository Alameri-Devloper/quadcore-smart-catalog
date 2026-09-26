import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationsContextHref, type OperationsContext, type OperationsReservationQuery } from "./operations-query-state";

export interface KnownReservationProductSelection {
  readonly lifecycle: object;
  readonly key: string;
  readonly product: OperationalProductView;
}
const withoutProductSelection = (query: OperationalProductQuery): OperationalProductQuery => ({ ...query, productId: null });
export const reservationSelectionKey = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery) =>
  operationsContextHref(context, branchId, withoutProductSelection(query));
export const reservationProductNavigation = (current: OperationalProductQuery, next: OperationalProductQuery) => {
  const searchChanged = current.q !== next.q || current.productCursor !== next.productCursor || current.issue !== next.issue;
  return { productId: next.productId, searchNavigation: searchChanged ? withoutProductSelection(next) : null,
    productChanged: !searchChanged && current.productId !== next.productId };
};

/** Local Product and URL Reservation identifiers are references only; every Inventory request remains authoritative. */
export const operationsReservationResource = (context: OperationsContext, branchId: string | null, query: OperationalProductQuery,
  reservations: OperationsReservationQuery, branches: OperationalBranchState, lifecycle: object, known: KnownReservationProductSelection | null) => {
  if (context.section !== "Inventory" || context.inventoryTool !== "reservations" || !branchId || query.issue
    || branches.type !== "Ready" || branches.purpose !== "Inventory") return null;
  const branch = branches.options.find(option => option.branchId === branchId); if (!branch) return null;
  const validKnown = known && known.lifecycle === lifecycle && known.key === reservationSelectionKey(context, branchId, query)
    && known.product.branchId === branchId ? known : null;
  if (!validKnown && !reservations.reservationId) return null;
  return {
    resource: { branchId, productId: validKnown?.product.productId ?? null },
    inactiveBranch: branch.status === "Inactive",
    resourceLabel: validKnown ? `${validKnown.product.productName ?? validKnown.product.productCode ?? validKnown.product.productId} — ${branch.displayName}`
      : `${reservations.reservationId} — ${branch.displayName}`,
  };
};
