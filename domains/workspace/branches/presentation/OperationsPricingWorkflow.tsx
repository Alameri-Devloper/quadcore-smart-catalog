"use client";

import { useCallback, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductSelector } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { WorkspacePricingPanel } from "../../../catalog/branch-products/presentation/WorkspacePricingPanel";
import { workspacePricingText } from "../../../catalog/branch-products/presentation/workspace-pricing.i18n";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsWorkspacePricingTarget, workspacePricingSelectionKey, type KnownWorkspacePricingSelection } from "./operations-pricing-context";
import type { OperationsContext } from "./operations-query-state";

export const OperationsPricingWorkflow = ({ context, query, lifecycle, locale, onQueryChange, onAuthenticationRequired }: {
  readonly context: OperationsContext; readonly query: OperationalProductQuery; readonly lifecycle: object; readonly locale: Locale;
  readonly onQueryChange: (query: OperationalProductQuery) => void; readonly onAuthenticationRequired: () => void;
}) => {
  const key = workspacePricingSelectionKey(context, query);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; known: KnownWorkspacePricingSelection | null; version: number }>(
    { lifecycle, key, known: null, version: 0 });
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection(previous => ({ lifecycle, key, known: null, version: previous.version + 1 }));
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    if (product) setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.known?.product === product
      ? previous : { ...previous, lifecycle, key, known: { lifecycle, key, product } });
  }, [lifecycle, key]);
  const clearStaleProduct = useCallback(() => {
    setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
      ? { ...previous, known: null, version: previous.version + 1 } : previous);
    onQueryChange({ ...query, productId: null });
  }, [key, lifecycle, onQueryChange, query]);
  const discovery = operationsProductDiscovery(context, null);
  const target = operationsWorkspacePricingTarget(context, query, lifecycle, current ? selection.known : null);
  if (discovery.type !== "Ready") return null;
  return <>
    <OperationalProductSelector key={`${key}:${selection.version}`}
      request={{ ...discovery.scope, q: query.q, ...(query.productCursor ? { cursor: query.productCursor } : {}) }}
      query={query} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired}
      onQueryChange={onQueryChange} onSelectionChange={onSelectionChange} />
    {target ? <WorkspacePricingPanel {...target} locale={locale} lifecycle={lifecycle}
      onAuthenticationRequired={onAuthenticationRequired} onProductStale={clearStaleProduct} />
      : <p role="status" aria-live="polite">{workspacePricingText(locale, "selectProduct")}</p>}
  </>;
};
