"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ProtectedPage, useSessionExpiryRedirect } from "../../../identity/presentation/components/auth-guard";
import { PageHeading, PresentationShell, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { catalogActiveFilterItems, catalogBranchContextDisplayName, catalogHasActiveFilters, resetCatalogFilters } from "./catalog-active-filters";
import { CatalogActiveState, CatalogFilterPanel, CatalogProductCard } from "./catalog-components";
import { catalogQueryApiClient } from "./catalog-query-api.client";
import { catalogQuerySearchParams, parseCatalogQueryState, updateCatalogQueryState, type CatalogQueryState } from "./catalog-query-state";
import { catalogText } from "./catalog-presentation.i18n";
import type { CatalogApiResult, CatalogFilterOptionsView, CatalogSearchView } from "./catalog-presentation.types";

type SearchState = { readonly requestKey: string; readonly type: "Loading" } | { readonly requestKey: string; readonly type: "Ready"; readonly value: CatalogSearchView } | { readonly requestKey: string; readonly type: "Failed"; readonly result: Extract<CatalogApiResult<never>, { ok: false }> };
type FilterState = { readonly requestKey: string; readonly type: "Loading" } | { readonly requestKey: string; readonly type: "Ready"; readonly value: CatalogFilterOptionsView } | { readonly requestKey: string; readonly type: "Failed" };

const hasCatalogConstraints = (state: CatalogQueryState) => Boolean(state.q || state.branchId || catalogHasActiveFilters(state));

export function CatalogPage() {
  const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams(), i18n = usePageI18n(), sessionExpired = useSessionExpiryRedirect();
  const parsed = useMemo(() => parseCatalogQueryState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [searchDraftState, setSearchDraftState] = useState(() => ({ urlQ: parsed.ok ? parsed.value.q : "", value: parsed.ok ? parsed.value.q : "" }));
  const [searchRevision, setSearchRevision] = useState(0), [filterRevision, setFilterRevision] = useState(0);
  const searchRequestKey = `${searchParams.toString()}\u0000${searchRevision}`, filterRequestKey = String(filterRevision);
  const [loadedSearchState, setSearchState] = useState<SearchState>({ requestKey: searchRequestKey, type: "Loading" });
  const [loadedFilterState, setFilterState] = useState<FilterState>({ requestKey: filterRequestKey, type: "Loading" });
  const searchState: SearchState = loadedSearchState.requestKey === searchRequestKey ? loadedSearchState : { requestKey: searchRequestKey, type: "Loading" };
  const filterState: FilterState = loadedFilterState.requestKey === filterRequestKey ? loadedFilterState : { requestKey: filterRequestKey, type: "Loading" };
  const searchDraft = parsed.ok && searchDraftState.urlQ !== parsed.value.q ? parsed.value.q : searchDraftState.value;

  useEffect(() => {
    let active = true;
    void catalogQueryApiClient.filterOptions().then((result) => { if (!active) return; if (!result.ok && result.kind === "Unauthorized") { sessionExpired(); return; } setFilterState(result.ok ? { requestKey: filterRequestKey, type: "Ready", value: result.value } : { requestKey: filterRequestKey, type: "Failed" }); });
    return () => { active = false; };
  }, [filterRequestKey, sessionExpired]);
  useEffect(() => {
    if (!parsed.ok) return;
    let active = true;
    void catalogQueryApiClient.search(parsed.value).then((result) => { if (!active) return; if (!result.ok && result.kind === "Unauthorized") { sessionExpired(); return; } setSearchState(result.ok ? { requestKey: searchRequestKey, type: "Ready", value: result.value } : { requestKey: searchRequestKey, type: "Failed", result }); });
    return () => { active = false; };
  }, [parsed, searchRequestKey, sessionExpired]);

  const navigate = (state: CatalogQueryState) => { const query = catalogQuerySearchParams(state).toString(); router.push(`${pathname}${query ? `?${query}` : ""}`); };
  const patch = (value: Partial<CatalogQueryState>) => { if (parsed.ok) navigate(updateCatalogQueryState(parsed.value, value)); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (!parsed.ok) return; const q = searchDraft.trim().replace(/\s+/gu, " "); patch({ q, sort: q ? "relevance" : "newest" }); };

  if (!parsed.ok) return <ProtectedPage>{(actor) => <PresentationShell actor={actor} i18n={i18n}><PageHeading eyebrow={catalogText(i18n.locale, "eyebrow")} title={catalogText(i18n.locale, "catalogTitle")} /><StatusMessage kind="warning">{catalogText(i18n.locale, "malformed")} <Link className="text-button" href="/catalog">{catalogText(i18n.locale, "clearQuery")}</Link></StatusMessage></PresentationShell>}</ProtectedPage>;
  const state = parsed.value;
  const active = filterState.type === "Ready" ? catalogActiveFilterItems(state, filterState.value, i18n.locale) : [];
  const branchDisplayName = filterState.type === "Ready" ? catalogBranchContextDisplayName(state, filterState.value) : undefined;

  return <ProtectedPage>{(actor) => <PresentationShell actor={actor} i18n={i18n}>
    <PageHeading eyebrow={catalogText(i18n.locale, "eyebrow")} title={catalogText(i18n.locale, "catalogTitle")} description={catalogText(i18n.locale, "catalogDescription")} />
    <section className="surface-card catalog-controls" aria-label={catalogText(i18n.locale, "search")}>
      <form className="catalog-search" role="search" onSubmit={submitSearch}><div className="form-field"><label htmlFor="catalog-search">{catalogText(i18n.locale, "search")}</label><input id="catalog-search" type="search" maxLength={200} value={searchDraft} placeholder={catalogText(i18n.locale, "searchHint")} onChange={(event) => setSearchDraftState({ urlQ: state.q, value: event.target.value })} /></div><button className="button button--primary" type="submit">{catalogText(i18n.locale, "searchAction")}</button></form>
      <div className="catalog-toolbar"><div className="form-field"><label htmlFor="catalog-sort">{catalogText(i18n.locale, "sort")}</label><select id="catalog-sort" value={state.sort} onChange={(event) => patch({ sort: event.target.value as CatalogQueryState["sort"] })}><option value="relevance" disabled={!state.q}>{catalogText(i18n.locale, "relevance")}</option><option value="newest">{catalogText(i18n.locale, "newest")}</option><option value="name-asc">{catalogText(i18n.locale, "nameAsc")}</option><option value="name-desc">{catalogText(i18n.locale, "nameDesc")}</option><option value="retail-price-asc" disabled={!state.retailCurrency || filterState.type !== "Ready" || !filterState.value.capabilities.retailPrice}>{catalogText(i18n.locale, "priceAsc")}</option><option value="retail-price-desc" disabled={!state.retailCurrency || filterState.type !== "Ready" || !filterState.value.capabilities.retailPrice}>{catalogText(i18n.locale, "priceDesc")}</option></select></div></div>
      {filterState.type === "Loading" ? <p className="catalog-muted" role="status">{catalogText(i18n.locale, "loadingFilters")}</p> : filterState.type === "Failed" ? <StatusMessage kind="warning">{catalogText(i18n.locale, "unavailable")} <button className="text-button" type="button" onClick={() => setFilterRevision((value) => value + 1)}>{catalogText(i18n.locale, "retry")}</button></StatusMessage> : <CatalogFilterPanel state={state} filterOptions={filterState.value} locale={i18n.locale} onChange={patch} />}
      <CatalogActiveState items={active} branchDisplayName={branchDisplayName} locale={i18n.locale} onReset={() => navigate(resetCatalogFilters(state))} />
    </section>
    <section aria-labelledby="catalog-results-heading"><h2 id="catalog-results-heading" className="catalog-section-title">{catalogText(i18n.locale, "results")}</h2>
      {searchState.type === "Loading" ? <div className="catalog-skeleton" role="status" aria-live="polite"><span className="sr-only">{catalogText(i18n.locale, "loadingCatalog")}</span>{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div> : null}
      {searchState.type === "Failed" ? <StatusMessage kind={searchState.result.kind === "Forbidden" || searchState.result.kind === "NotFound" ? "warning" : "error"}>{searchState.result.kind === "Forbidden" ? catalogText(i18n.locale, "forbidden") : searchState.result.kind === "NotFound" ? catalogText(i18n.locale, "notFound") : searchState.result.kind === "InvalidQuery" ? catalogText(i18n.locale, "malformed") : catalogText(i18n.locale, "unavailable")} <button className="text-button" type="button" onClick={() => setSearchRevision((value) => value + 1)}>{catalogText(i18n.locale, "retry")}</button></StatusMessage> : null}
      {searchState.type === "Ready" && searchState.value.items.length === 0 ? <div className="surface-card empty-state" role="status">{hasCatalogConstraints(state) ? catalogText(i18n.locale, "noResults") : catalogText(i18n.locale, "emptyCatalog")}</div> : null}
      {searchState.type === "Ready" && searchState.value.items.length ? <div className="catalog-grid">{searchState.value.items.map((product) => <CatalogProductCard key={product.productId} product={product} queryState={state} locale={i18n.locale} />)}</div> : null}
      {searchState.type === "Ready" && searchState.value.nextCursor ? <div className="catalog-pagination"><button className="button button--secondary" type="button" onClick={() => patch({ cursor: searchState.value.nextCursor ?? undefined })}>{catalogText(i18n.locale, "nextPage")}</button></div> : null}
    </section>
  </PresentationShell>}</ProtectedPage>;
}
