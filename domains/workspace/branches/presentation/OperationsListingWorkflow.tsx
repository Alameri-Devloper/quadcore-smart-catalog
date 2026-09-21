"use client";

import { useCallback, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductSelector, OperationalProductWaiting } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { ListingPanel } from "../../../catalog/branch-products/presentation/ListingPanel";
import { listingText } from "../../../catalog/branch-products/presentation/listing.i18n";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import type { OperationsContext } from "./operations-query-state";
import { operationsProductDiscovery } from "./operations-product-context";
import { listingSelectionKey, operationsListingResource, type KnownListingSelection } from "./operations-listing-context";

export const OperationsListingWorkflow = ({ context, branchId, query, branches, lifecycle, locale, onQueryChange, onAuthenticationRequired, refreshBranches }: {
  readonly context: OperationsContext; readonly branchId: string | null; readonly query: OperationalProductQuery; readonly branches: OperationalBranchState;
  readonly lifecycle: object; readonly locale: Locale; readonly onQueryChange: (query: OperationalProductQuery) => void;
  readonly onAuthenticationRequired: () => void; readonly refreshBranches: () => void;
}) => {
  const key = listingSelectionKey(context, branchId, query);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; known: KnownListingSelection | null }>({ lifecycle, key, known: null });
  // Reset before rendering another context; back navigation must not revive a previous private resource.
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection({ lifecycle, key, known: null });
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    // Only the existing selector's current-page selection establishes a new resource reference.
    if (product) setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.known?.product === product
      ? previous : { lifecycle, key, known: { lifecycle, key, product } });
  }, [lifecycle, key]);
  const discovery = operationsProductDiscovery(context, branchId, branches);
  const target = operationsListingResource(context, branchId, query, branches, lifecycle, current ? selection.known : null);
  return <>
    {discovery.type === "Ready" ? <OperationalProductSelector request={{ ...discovery.scope, q: query.q, ...(query.productCursor ? { cursor: query.productCursor } : {}) }}
      query={query} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired}
      onQueryChange={onQueryChange} onSelectionChange={onSelectionChange} />
      : discovery.type === "Waiting" ? <OperationalProductWaiting locale={locale} reason={discovery.reason} /> : null}
    {target ? <ListingPanel {...target} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired} onResourceStale={refreshBranches} />
      : <p role="status" aria-live="polite">{listingText(locale, "selectProduct")}</p>}
  </>;
};
