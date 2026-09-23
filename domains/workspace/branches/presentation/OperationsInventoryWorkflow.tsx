"use client";

import { useCallback, useMemo, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductSelector, OperationalProductWaiting } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { InventoryPanel } from "../../../inventory/presentation/InventoryPanel";
import { inventoryText } from "../../../inventory/presentation/inventory.i18n";
import type { InventoryCapabilityHints } from "../../../inventory/presentation/inventory.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import type { OperationsContext } from "./operations-query-state";
import { operationsProductDiscovery } from "./operations-product-context";
import { inventoryProductNavigation, inventorySelectionKey, operationsInventoryResource, type KnownInventorySelection } from "./operations-inventory-context";

export const OperationsInventoryWorkflow = ({ context, branchId, query, branches, hints, lifecycle, locale, onQueryChange, onAuthenticationRequired, refreshBranches }: {
  readonly context: OperationsContext; readonly branchId: string | null; readonly query: OperationalProductQuery; readonly branches: OperationalBranchState;
  readonly hints: InventoryCapabilityHints; readonly lifecycle: object; readonly locale: Locale;
  readonly onQueryChange: (query: OperationalProductQuery) => void; readonly onAuthenticationRequired: () => void; readonly refreshBranches: () => void;
}) => {
  const urlQuery = useMemo(() => ({ q: query.q, productCursor: query.productCursor, productId: null, issue: query.issue }),
    [query.q, query.productCursor, query.issue]);
  const key = inventorySelectionKey(context, branchId, urlQuery);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; productId: string | null; known: KnownInventorySelection | null }>(
    { lifecycle, key, productId: null, known: null });
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection({ lifecycle, key, productId: null, known: null });
  const local = current ? selection : { lifecycle, key, productId: null, known: null };
  const handleQueryChange = useCallback((next: OperationalProductQuery) => {
    const change = inventoryProductNavigation({ ...urlQuery, productId: local.productId }, next);
    if (change.navigation) {
      setSelection({ lifecycle, key, productId: null, known: null });
      onQueryChange(change.navigation);
    } else {
      setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
        ? { ...previous, productId: change.productId, known: change.productId === previous.known?.product.productId ? previous.known : null }
        : { lifecycle, key, productId: change.productId, known: null });
    }
  }, [key, lifecycle, local.productId, onQueryChange, urlQuery]);
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    if (!product) return;
    setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.productId === product.productId
      ? { ...previous, known: previous.known?.product === product ? previous.known : { lifecycle, key, product } } : previous);
  }, [key, lifecycle]);
  const discovery = operationsProductDiscovery(context, branchId, branches);
  const target = operationsInventoryResource(context, branchId, urlQuery, branches, lifecycle, local.known);
  const selectorQuery = { ...urlQuery, productId: local.productId };
  return <>
    {discovery.type === "Ready" ? <OperationalProductSelector request={{ ...discovery.scope, q: urlQuery.q, ...(urlQuery.productCursor ? { cursor: urlQuery.productCursor } : {}) }}
      query={selectorQuery} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired}
      onQueryChange={handleQueryChange} onSelectionChange={onSelectionChange} />
      : discovery.type === "Waiting" ? <OperationalProductWaiting locale={locale} reason={discovery.reason} /> : null}
    {target ? <InventoryPanel {...target} hints={hints} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired} onResourceStale={refreshBranches} />
      : <p role="status" aria-live="polite">{inventoryText(locale, "selectProduct")}</p>}
  </>;
};
