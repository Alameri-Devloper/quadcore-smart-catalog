import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { operationsContextHref, type OperationsContext } from "./operations-query-state";

export interface KnownWorkspacePricingSelection {
  readonly lifecycle: object;
  readonly key: string;
  readonly product: OperationalProductView;
}

export const workspacePricingSelectionKey = (context: OperationsContext, query: OperationalProductQuery) =>
  operationsContextHref(context, null, query);

/** A2 establishes only the Product reference. The management GET remains the field/action authority. */
export const operationsWorkspacePricingTarget = (context: OperationsContext, query: OperationalProductQuery, lifecycle: object,
  known: KnownWorkspacePricingSelection | null) => {
  if (context.section !== "Pricing" || context.pricingScope !== "workspace" || !query.productId || query.issue || !known
    || known.lifecycle !== lifecycle || known.key !== workspacePricingSelectionKey(context, query)
    || known.product.productId !== query.productId || known.product.branchId !== undefined) return null;
  return {
    productId: known.product.productId,
    productLabel: known.product.productName ?? known.product.productCode ?? known.product.productId,
    surface: context.pricingField,
  } as const;
};
