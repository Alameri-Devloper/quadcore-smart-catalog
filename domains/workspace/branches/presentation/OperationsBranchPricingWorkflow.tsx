"use client";

import { useCallback, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { BranchPricingPanel } from "../../../catalog/branch-products/presentation/BranchPricingPanel";
import { branchPricingText } from "../../../catalog/branch-products/presentation/branch-pricing.i18n";
import { OperationalProductSelector, OperationalProductWaiting } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { branchPricingSelectionKey, operationsBranchPricingTarget, type KnownBranchPricingSelection } from "./operations-branch-pricing-context";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import { operationsProductDiscovery } from "./operations-product-context";
import type { OperationsContext } from "./operations-query-state";

export const OperationsBranchPricingWorkflow = ({ context, branchId, query, branches, lifecycle, locale, onQueryChangeAction,
  onAuthenticationRequiredAction, refreshBranchesAction }: {
  readonly context: OperationsContext; readonly branchId: string | null; readonly query: OperationalProductQuery;
  readonly branches: OperationalBranchState; readonly lifecycle: object; readonly locale: Locale;
  readonly onQueryChangeAction: (query: OperationalProductQuery) => void; readonly onAuthenticationRequiredAction: () => void;
  readonly refreshBranchesAction: () => void;
}) => {
  const key = branchPricingSelectionKey(context, branchId, query);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; known: KnownBranchPricingSelection | null; version: number }>(
    { lifecycle, key, known: null, version: 0 });
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection(previous => ({ lifecycle, key, known: null, version: previous.version + 1 }));
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    if (product) setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.known?.product === product
      ? previous : { ...previous, lifecycle, key, known: { lifecycle, key, product } });
  }, [key, lifecycle]);
  const clearStaleProduct = useCallback(() => {
    setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
      ? { ...previous, known: null, version: previous.version + 1 } : previous);
    onQueryChangeAction({ ...query, productId: null });
  }, [key, lifecycle, onQueryChangeAction, query]);
  const discovery = operationsProductDiscovery(context, branchId, branches);
  const target = operationsBranchPricingTarget(context, branchId, query, branches, lifecycle, current ? selection.known : null);
  return <>
    {discovery.type === "Ready" ? <OperationalProductSelector key={`${key}:${selection.version}`}
      request={{ ...discovery.scope, q: query.q, ...(query.productCursor ? { cursor: query.productCursor } : {}) }}
      query={query} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequiredAction}
      onQueryChange={onQueryChangeAction} onSelectionChange={onSelectionChange} />
      : discovery.type === "Waiting" && !target ? <OperationalProductWaiting locale={locale} reason={discovery.reason} /> : null}
    {target ? <BranchPricingPanel {...target} locale={locale} lifecycle={lifecycle}
      onAuthenticationRequiredAction={onAuthenticationRequiredAction} onBranchStaleAction={refreshBranchesAction}
      onProductStaleAction={clearStaleProduct} />
      : discovery.type === "Ready" ? <p role="status" aria-live="polite">{branchPricingText(locale, "selectProduct")}</p> : null}
  </>;
};
