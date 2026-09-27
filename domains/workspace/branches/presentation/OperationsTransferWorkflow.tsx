"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductSelector, OperationalProductWaiting } from "../../../catalog/query/presentation/OperationalProductSelector";
import type { OperationalProductQuery, OperationalProductView } from "../../../catalog/query/presentation/operational-product-selector.types";
import { TransferPanel } from "../../../inventory/presentation/TransferPanel";
import { transferFailureText, transferText } from "../../../inventory/presentation/transfer.i18n";
import type { TransferReadHints } from "../../../inventory/presentation/transfer.types";
import { operationsText } from "./operations-presentation.i18n";
import type { OperationalBranchState } from "./operational-branch-selector.types";
import type { OperationsContext } from "./operations-query-state";
import { operationsProductDiscovery } from "./operations-product-context";
import { operationsTransferSelection, transferProductNavigation, transferSelectionKey, type KnownTransferProductSelection } from "./operations-transfer-context";

export const OperationsTransferWorkflow = ({ context, branchId, query, branches, hints, canTransferHint, lifecycle, locale, onQueryChange,
  onAuthenticationRequired, refreshBranches }: { readonly context: OperationsContext; readonly branchId: string | null; readonly query: OperationalProductQuery;
  readonly branches: OperationalBranchState; readonly hints: TransferReadHints; readonly canTransferHint: boolean; readonly lifecycle: object; readonly locale: Locale;
  readonly onQueryChange: (query: OperationalProductQuery) => void; readonly onAuthenticationRequired: () => void; readonly refreshBranches: () => void;
}) => {
  const id = useId();
  const urlQuery = useMemo(() => ({ q: query.q, productCursor: query.productCursor, productId: null, issue: query.issue }),
    [query.q, query.productCursor, query.issue]);
  const key = transferSelectionKey(context, branchId, urlQuery);
  const [selection, setSelection] = useState<{ lifecycle: object; key: string; destinationBranchId: string | null; productId: string | null;
    known: KnownTransferProductSelection | null; productVersion: number; productFailure: "ProductArchived" | "ProductNotFound" | null }>(
      { lifecycle, key, destinationBranchId: null, productId: null, known: null, productVersion: 0, productFailure: null });
  const current = selection.lifecycle === lifecycle && selection.key === key;
  if (!current) setSelection({ lifecycle, key, destinationBranchId: null, productId: null, known: null, productVersion: 0, productFailure: null });
  const local = current ? selection : { lifecycle, key, destinationBranchId: null, productId: null, known: null, productVersion: 0, productFailure: null };
  const handleQueryChange = useCallback((next: OperationalProductQuery) => {
    const change = transferProductNavigation({ ...urlQuery, productId: local.productId }, next);
    if (change.navigation) {
      setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
        ? { ...previous, productId: null, known: null, productFailure: null } : previous); onQueryChange(change.navigation);
    } else setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
      ? { ...previous, productId: change.productId, known: change.productId === previous.known?.product.productId ? previous.known : null,
        productFailure: null } : previous);
  }, [key, lifecycle, local.productId, onQueryChange, urlQuery]);
  const onSelectionChange = useCallback((product: OperationalProductView | null) => {
    if (!product) return;
    setSelection(previous => previous.lifecycle === lifecycle && previous.key === key && previous.productId === product.productId
      ? { ...previous, known: previous.known?.product === product ? previous.known : { lifecycle, key, product }, productFailure: null } : previous);
  }, [key, lifecycle]);
  const clearStaleProduct = useCallback((kind: "ProductArchived" | "ProductNotFound") => setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
    ? { ...previous, productId: null, known: null, productVersion: previous.productVersion + 1, productFailure: kind } : previous), [key, lifecycle]);
  const discovery = operationsProductDiscovery(context, branchId, branches);
  const transfer = operationsTransferSelection(context, branchId, urlQuery, branches, lifecycle, local.known);
  const destination = branches.type === "Ready" && branches.purpose === "Transfer"
    ? branches.options.find(option => option.branchId === local.destinationBranchId) ?? null : null;
  const destinationReady = Boolean(destination && destination.status === "Active" && destination.branchId !== branchId);
  const selectorQuery = { ...urlQuery, productId: local.productId };
  return <section aria-labelledby={`${id}-heading`} style={{ minWidth: 0, display: "grid", gap: "1rem" }}>
    <h3 id={`${id}-heading`}>{transferText(locale, "title")}</h3>
    {transfer && branches.type === "Ready" ? <div style={{ display: "grid", gap: ".5rem", minWidth: 0 }}>
      <p id={`${id}-destination-guidance`}>{transferText(locale, "selectDestination")} {transferText(locale, "sameBranch")}</p>
      <fieldset aria-describedby={`${id}-destination-guidance`} disabled={!canTransferHint}><legend>{transferText(locale, "destinationBranch")}</legend>
        <div className="operational-branch-options">{branches.options.map((option, index) => <label key={option.branchId}
          htmlFor={`${id}-destination-${index}`} className="operational-branch-option">
          <input id={`${id}-destination-${index}`} name={`${id}-destination`} type="radio" value={option.branchId}
            checked={local.destinationBranchId === option.branchId} disabled={option.status !== "Active" || option.branchId === branchId}
            onChange={() => setSelection(previous => previous.lifecycle === lifecycle && previous.key === key
              ? { ...previous, destinationBranchId: option.branchId } : previous)} />
          <span><strong><bdi>{option.displayName}</bdi></strong><bdi dir="ltr">{option.code}</bdi><span>{operationsText(locale, option.status)}</span></span>
        </label>)}</div>
      </fieldset>
      {local.destinationBranchId === branchId ? <p role="alert">{transferText(locale, "sameBranch")}</p> : null}
      {destination && destination.status === "Inactive" ? <p role="alert">{transferText(locale, "inactive")}</p> : null}
    </div> : null}
    {destinationReady && discovery.type === "Ready" ? <OperationalProductSelector key={`${key}:${local.productVersion}`}
      request={{ ...discovery.scope, q: urlQuery.q, ...(urlQuery.productCursor ? { cursor: urlQuery.productCursor } : {}) }} query={selectorQuery}
      locale={locale} lifecycle={lifecycle} onAuthenticationRequired={onAuthenticationRequired} onQueryChange={handleQueryChange} onSelectionChange={onSelectionChange} />
      : destinationReady && discovery.type === "Waiting" ? <OperationalProductWaiting locale={locale} reason={discovery.reason} /> : null}
    {local.productFailure ? <p role="alert">{transferFailureText(locale, local.productFailure)}</p> : null}
    {transfer && destinationReady && transfer.product && destination ? <TransferPanel sourceBranchId={transfer.source.branchId}
      destinationBranchId={destination.branchId} productId={transfer.product.productId}
      productLabel={transfer.product.productName ?? transfer.product.productCode ?? transfer.product.productId}
      branches={branches.type === "Ready" ? branches.options : []} hints={hints} canTransferHint={canTransferHint} locale={locale} lifecycle={lifecycle}
      onAuthenticationRequired={onAuthenticationRequired} onBranchesStale={refreshBranches} onProductStale={clearStaleProduct} />
      : destinationReady ? <p role="status" aria-live="polite">{transferText(locale, "selectProduct")}</p> : null}
  </section>;
};
