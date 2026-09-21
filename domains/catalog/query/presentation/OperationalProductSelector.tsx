"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalProductApiClient } from "./operational-product-api.client";
import { changeOperationalProductSearch, operationalProductRequestKey } from "./operational-product-query-state";
import { mountOperationalProductSelector, operationalProductSelection, type OperationalProductSelectorCoordinator } from "./operational-product-selector.coordinator";
import { operationalProductText } from "./operational-product-selector.i18n";
import type { OperationalProductQuery, OperationalProductRequest, OperationalProductState, OperationalProductView } from "./operational-product-selector.types";

export const OperationalProductWaiting = ({ locale, reason }: { readonly locale: Locale; readonly reason: "SelectBranch" | "InactiveBranch" | "StaleBranch" }) =>
  <section className="operational-product-selector" aria-label={operationalProductText(locale, "product")}>
    <h3>{operationalProductText(locale, "select")}</h3><p role="status" aria-live="polite">{operationalProductText(locale, reason)}</p>
  </section>;

export const OperationalProductSelectorContent = ({ state, requestKey, query, locale, onQueryChange, onRetry }: {
  readonly state: OperationalProductState; readonly requestKey: string; readonly query: OperationalProductQuery; readonly locale: Locale;
  readonly onQueryChange: (query: OperationalProductQuery) => void; readonly onRetry: () => void;
}) => {
  const id = useId(), t = (key: Parameters<typeof operationalProductText>[1]) => operationalProductText(locale, key);
  const [draft, setDraft] = useState(query.q);
  const [searchInvalid, setSearchInvalid] = useState(false);
  const current = state.type !== "Idle" && state.key === requestKey;
  const busy = !query.issue && (!current || state.type === "Loading");
  const selection = operationalProductSelection(state, requestKey, query.productId);
  const failure = query.issue ?? (current && state.type === "Failed" ? state.kind : null);
  const ready = !query.issue && current && state.type === "Ready" ? state.value : null;
  const first = () => onQueryChange({ ...query, productCursor: null, productId: null, issue: null });
  return <section className="operational-product-selector" aria-labelledby={`${id}-heading`} aria-busy={busy}>
    <h3 id={`${id}-heading`}>{t("select")}</h3>
    <form className="operational-product-search" onSubmit={(event) => {
      event.preventDefault();
      const next = changeOperationalProductSearch(draft);
      setSearchInvalid(next.issue !== null);
      if (!next.issue) onQueryChange(next);
    }}>
      <label htmlFor={`${id}-search`}>{t("search")}</label>
      <input id={`${id}-search`} type="search" value={draft} maxLength={200} disabled={busy}
        aria-invalid={searchInvalid} aria-describedby={searchInvalid ? `${id}-search-error` : undefined}
        onChange={(event) => { setDraft(event.target.value); setSearchInvalid(false); }} />
      <button className="button button--primary" type="submit" disabled={busy}>{t("submit")}</button>
      {searchInvalid ? <p id={`${id}-search-error`} role="alert">{t("InvalidQuery")}</p> : null}
    </form>
    {busy ? <p role="status" aria-live="polite">{t("loading")}</p> : null}
    {failure ? <>
      <p role="alert">{t(failure)}</p>
      {failure === "InvalidCursor" || query.issue ? <button type="button" className="button button--quiet" onClick={first}>{t("first")}</button>
        : failure !== "AuthenticationRequired" && failure !== "ForbiddenForRestrictedSession" ?
          <button type="button" className="button button--quiet" onClick={onRetry}>{t("retry")}</button> : null}
    </> : null}
    {ready ? <>
      {!ready.items.length ? <p role="status" aria-live="polite">{t("empty")}</p> : null}
      {selection.type === "Stale" ? <p role="alert">{t("stale")}</p> : null}
      {ready.items.length ? <fieldset><legend>{t("product")}</legend>
        <div className="operational-product-options">{ready.items.map((product, index) => <label className="operational-product-option" key={product.productId} htmlFor={`${id}-product-${index}`}>
          <input id={`${id}-product-${index}`} name={`${id}-product`} type="radio" value={product.productId}
            checked={selection.type === "Selected" && selection.product.productId === product.productId}
            onChange={() => { if (operationalProductSelection(state, requestKey, product.productId).type === "Selected") onQueryChange({ ...query, productId: product.productId }); }} />
          <span>
            <strong>{t("productName")}: <bdi>{product.productName ?? product.productId}</bdi></strong>
            {product.productCode !== null ? <span>{t("productCode")}: <bdi dir="ltr">{product.productCode}</bdi></span> : null}
            <span>{t(product.lifecycle)}</span>{product.listingStatus ? <span>{t(product.listingStatus)}</span> : null}
          </span>
        </label>)}</div>
      </fieldset> : null}
      {selection.type === "Selected" ? <p role="status" aria-live="polite">{t("selected")}: <bdi>{selection.product.productName ?? selection.product.productId}</bdi></p> : null}
      {query.productId ? <button type="button" className="button button--quiet" onClick={() => onQueryChange({ ...query, productId: null })}>{t("clear")}</button> : null}
      {ready.nextCursor ? <>
        <p id={`${id}-pagination`}>{t("pageGuidance")}</p>
        <button type="button" className="button button--primary" aria-describedby={`${id}-pagination`}
          onClick={() => onQueryChange({ ...query, productCursor: ready.nextCursor, productId: null, issue: null })}>{t("next")}</button>
      </> : null}
      {query.productCursor ? <button type="button" className="button button--quiet" onClick={first}>{t("first")}</button> : null}
    </> : null}
  </section>;
};

export const OperationalProductSelector = ({ request, query, locale, lifecycle, onAuthenticationRequired, onQueryChange, onSelectionChange }: {
  readonly request: OperationalProductRequest; readonly query: OperationalProductQuery; readonly locale: Locale; readonly lifecycle: object;
  readonly onAuthenticationRequired: () => void; readonly onQueryChange: (query: OperationalProductQuery) => void;
  readonly onSelectionChange?: (product: OperationalProductView | null) => void;
}) => {
  const { purpose, branchId, q, cursor, limit } = request;
  const stableRequest = useMemo(() => ({ purpose, ...(branchId ? { branchId } : {}), q, cursor, limit }) as OperationalProductRequest, [purpose, branchId, q, cursor, limit]);
  const key = operationalProductRequestKey(stableRequest);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; state: OperationalProductState } | null>(null);
  const mounted = useRef<OperationalProductSelectorCoordinator | null>(null);
  useEffect(() => {
    if (query.issue) return;
    const coordinator = mountOperationalProductSelector(new OperationalProductApiClient(), stableRequest, {
      onChange: (state) => setSnapshot({ lifecycle, state }), onAuthenticationRequired,
    });
    mounted.current = coordinator;
    return () => { coordinator.dispose(); if (mounted.current === coordinator) mounted.current = null; };
  }, [lifecycle, stableRequest, onAuthenticationRequired, query.issue]);
  const state = snapshot?.lifecycle === lifecycle ? snapshot.state : { type: "Idle" as const };
  const selection = operationalProductSelection(state, key, query.productId);
  const selectedProduct = !query.issue && selection.type === "Selected" ? selection.product : null;
  useEffect(() => { onSelectionChange?.(selectedProduct); }, [onSelectionChange, selectedProduct]);
  return <OperationalProductSelectorContent key={`${key}:${query.issue}`} state={state} requestKey={key} query={query} locale={locale}
    onQueryChange={onQueryChange} onRetry={() => { onQueryChange({ ...query, productId: null }); void mounted.current?.load(stableRequest); }} />;
};
