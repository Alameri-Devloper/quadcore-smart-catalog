"use client";

import { useCallback, useMemo, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductSelector, OperationalProductWaiting } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { ReservationPanel } from "../../../inventory/presentation/ReservationPanel";
import { reservationText } from "../../../inventory/presentation/reservation.i18n";
import type { ReservationNavigation } from "../../../inventory/presentation/reservation.types";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import type { OperationsContext, OperationsReservationQuery } from "./operations-query-state";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsReservationResource, reservationProductNavigation, reservationSelectionKey,
  type KnownReservationProductSelection } from "./operations-reservation-context";

const emptyReservationNavigation = (): ReservationNavigation => ({ reservationCursor: null, reservationId: null });

export const OperationsReservationWorkflow = ({ context, branchId, query, reservations, branches, canReserveHint, lifecycle, locale,
  onQueryChange, onReservationChange, onAuthenticationRequired, refreshBranches }: {
  readonly context: OperationsContext; readonly branchId: string | null; readonly query: OperationalProductQuery; readonly reservations: OperationsReservationQuery;
  readonly branches: OperationalBranchState; readonly canReserveHint: boolean; readonly lifecycle: object; readonly locale: Locale;
  readonly onQueryChange: (query: OperationalProductQuery, reservations: ReservationNavigation) => void;
  readonly onReservationChange: (value: ReservationNavigation) => void; readonly onAuthenticationRequired: () => void; readonly refreshBranches: () => void;
}) => {
  const urlQuery = useMemo(() => ({ q: query.q, productCursor: query.productCursor, productId: null, issue: query.issue }),
    [query.q, query.productCursor, query.issue]);
  const key = reservationSelectionKey(context, branchId, urlQuery);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; productId: string | null; known: KnownReservationProductSelection | null }>(
    { lifecycle, key, productId: null, known: null });
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection({ lifecycle, key, productId: null, known: null });
  const local = current ? selection : { lifecycle, key, productId: null, known: null };
  const handleQueryChange = useCallback((next: OperationalProductQuery) => {
    const change = reservationProductNavigation({ ...urlQuery, productId: local.productId }, next);
    if (change.searchNavigation) {
      setSelection({ lifecycle, key, productId: null, known: null }); onQueryChange(change.searchNavigation, emptyReservationNavigation());
    } else {
      setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
        ? { ...previous, productId: change.productId, known: change.productId === previous.known?.product.productId ? previous.known : null }
        : { lifecycle, key, productId: change.productId, known: null });
      if (change.productChanged) onReservationChange(emptyReservationNavigation());
    }
  }, [key, lifecycle, local.productId, onQueryChange, onReservationChange, urlQuery]);
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    if (!product) return;
    setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.productId === product.productId
      ? { ...previous, known: previous.known?.product === product ? previous.known : { lifecycle, key, product } } : previous);
  }, [key, lifecycle]);
  const discovery = operationsProductDiscovery(context, branchId, branches);
  const target = operationsReservationResource(context, branchId, urlQuery, reservations, branches, lifecycle, local.known);
  const selectorQuery = { ...urlQuery, productId: local.productId };
  const navigation = { reservationCursor: reservations.reservationCursor, reservationId: reservations.reservationId };
  return <>
    {discovery.type === "Ready" ? <OperationalProductSelector request={{ ...discovery.scope, q: urlQuery.q, ...(urlQuery.productCursor ? { cursor: urlQuery.productCursor } : {}) }}
      query={selectorQuery} locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired}
      onQueryChange={handleQueryChange} onSelectionChange={onSelectionChange} />
      : discovery.type === "Waiting" ? <OperationalProductWaiting locale={locale} reason={discovery.reason} /> : null}
    {target ? <ReservationPanel {...target} navigation={navigation} invalidCursor={reservations.issue === "InvalidCursor"} canReserveHint={canReserveHint}
      locale={locale} lifecycle={lifecycle} onNavigationChange={onReservationChange} onAuthenticationRequired={onAuthenticationRequired} onResourceStale={refreshBranches} />
      : <p role="status" aria-live="polite">{reservationText(locale, "selectProduct")}</p>}
  </>;
};
