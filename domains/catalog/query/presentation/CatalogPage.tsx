"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ProtectedPage, useSessionExpiryRedirect } from "../../../identity/presentation/components/auth-guard";
import { PageHeading, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { catalogActiveFilterItems, catalogFixedValueText, catalogBranchContextDisplayName, catalogHasActiveFilters, resetCatalogFilters } from "./catalog-active-filters";
import { CatalogFilters } from "./catalog-typed-filters";
import { CatalogActiveState, CatalogProductCard } from "./catalog-components";
import { catalogQueryApiClient } from "./catalog-query-api.client";
import { catalogQuerySearchParams, parseCatalogQueryState, updateCatalogQueryState, type CatalogQueryState } from "./catalog-query-state";
import { CatalogShell } from "./CatalogShell";
import { CatalogChoiceMenu } from "./catalog-choice-menu";
import { catalogText } from "./catalog-presentation.i18n";
import type { CatalogApiResult, CatalogFilterOptionsView, CatalogSearchView } from "./catalog-presentation.types";

type SearchState = { readonly requestKey: string; readonly type: "Loading" } | { readonly requestKey: string; readonly type: "Ready"; readonly value: CatalogSearchView } | { readonly requestKey: string; readonly type: "Failed"; readonly result: Extract<CatalogApiResult<never>, { ok: false }> };
type FilterState = { readonly requestKey: string; readonly type: "Loading" } | { readonly requestKey: string; readonly type: "Ready"; readonly value: CatalogFilterOptionsView } | { readonly requestKey: string; readonly type: "Failed" };

const hasCatalogConstraints = (state: CatalogQueryState) => Boolean(state.q || state.branchId || catalogHasActiveFilters(state));

export function CatalogPage() {
  const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams(), i18n = usePageI18n(), sessionExpired = useSessionExpiryRedirect();
  const parsed = useMemo(() => parseCatalogQueryState(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [searchDraftState, setSearchDraftState] = useState(() => ({ urlQ: parsed.ok ? parsed.value.q : "", value: parsed.ok ? parsed.value.q : "" }));
  const searchInput=useRef<HTMLInputElement>(null);
  const resultsFrame = useRef<HTMLDivElement>(null);
  const [resultsHeight, setResultsHeight] = useState(0);
  const [searchRevision, setSearchRevision] = useState(0), [filterRevision, setFilterRevision] = useState(0);
  const searchRequestKey = `${searchParams.toString()}\u0000${searchRevision}`;
  const filterQuery=parsed.ok ? catalogQuerySearchParams({q:"",branchId:parsed.value.branchId,departmentId:parsed.value.departmentId,categoryId:parsed.value.categoryId,productTypeId:parsed.value.productTypeId,lifecycle:parsed.value.lifecycle,listing:parsed.value.listing,sort:"newest"}).toString() : "";
  const filterRequestKey=filterQuery+"\\u0000"+filterRevision;
  const [loadedSearchState, setSearchState] = useState<SearchState>({ requestKey: searchRequestKey, type: "Loading" });
  const [loadedFilterState, setFilterState] = useState<FilterState>({ requestKey: filterRequestKey, type: "Loading" });
  const searchState: SearchState = loadedSearchState.requestKey === searchRequestKey ? loadedSearchState : { requestKey: searchRequestKey, type: "Loading" };
  const filterState: FilterState = loadedFilterState.requestKey === filterRequestKey ? loadedFilterState : { requestKey: filterRequestKey, type: "Loading" };
  const searchDraft = parsed.ok && searchDraftState.urlQ !== parsed.value.q ? parsed.value.q : searchDraftState.value;

  useEffect(() => {
    let active = true;
    void catalogQueryApiClient.filterOptions((()=>{const input=parseCatalogQueryState(new URLSearchParams(filterQuery));return input.ok ? input.value : undefined;})()).then((result) => { if (!active) return; if (!result.ok && result.kind === "Unauthorized") { sessionExpired(); return; } setFilterState(result.ok ? { requestKey: filterRequestKey, type: "Ready", value: result.value } : { requestKey: filterRequestKey, type: "Failed" }); });
    return () => { active = false; };
  }, [filterRequestKey, filterQuery, sessionExpired]);
  useEffect(() => {
    if (!parsed.ok) return;
    let active = true;
    void catalogQueryApiClient.search(parsed.value).then((result) => { if (!active) return; if (!result.ok && result.kind === "Unauthorized") { sessionExpired(); return; } setSearchState(result.ok ? { requestKey: searchRequestKey, type: "Ready", value: result.value } : { requestKey: searchRequestKey, type: "Failed", result }); });
    return () => { active = false; };
  }, [parsed, searchRequestKey, sessionExpired]);

  useEffect(() => {
    if (searchState.type !== "Ready" || !resultsFrame.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const height = Math.ceil(entries[0]?.contentRect.height ?? 0);
      setResultsHeight(previous => Math.abs(previous - height) > 1 ? height : previous);
    });
    observer.observe(resultsFrame.current);
    return () => observer.disconnect();
  }, [searchState.type, searchRequestKey]);

  const navigate = (state: CatalogQueryState) => { const query = catalogQuerySearchParams(state).toString(); router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }); };
  const patch = (value: Partial<CatalogQueryState>) => { if (parsed.ok) navigate(updateCatalogQueryState(parsed.value, value)); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (!parsed.ok) return; const q = searchDraft.trim().replace(/\s+/gu, " "); patch({ q, sort: q && !parsed.value.searchMode ? "relevance" : "newest" }); };

  if (!parsed.ok) return <ProtectedPage>{(actor) => <CatalogShell actor={actor} i18n={i18n}><PageHeading title={catalogText(i18n.locale, "catalogTitle")} /><StatusMessage kind="warning">{catalogText(i18n.locale, "malformed")} <Link className="text-button" href="/catalog">{catalogText(i18n.locale, "clearQuery")}</Link></StatusMessage></CatalogShell>}</ProtectedPage>;
  const state = parsed.value;
  const manualActive = filterState.type === "Ready" ? catalogActiveFilterItems(state, filterState.value, i18n.locale) : [];
  const interpretation=searchState.type==="Ready"?searchState.value.structuredInterpretation:undefined;
  const interpretedActive=(interpretation?.rows??[]).map((row,index)=>({
    key:"phrase-"+index,
    label:(i18n.locale==="ar"?"منظم: ":"Structured: ")+(row.kind==="Specification"?(row.displayName?.split(" / ")[i18n.locale==="ar"?1:0]??row.displayName??""):catalogText(i18n.locale,row.kind==="ProductType"?"productType":row.kind==="Brand"?"brand":"deviceClass")),
    value:row.values.map(v=>row.kind==="DeviceClass"?catalogFixedValueText(i18n.locale,String(v)):typeof v==="boolean"?catalogText(i18n.locale,v?"yes":"no"):v).join(" / ")+(row.unit?" "+row.unit:"")
  }));
  // Only the identical ProductType label is coalesced; query constraints are unchanged.
  const active=[...manualActive.filter(item=>item.key!=="productType"||!interpretation?.rows.some(row=>row.kind==="ProductType"&&row.values.includes(item.value))),...interpretedActive];
  const branchDisplayName = filterState.type === "Ready" ? catalogBranchContextDisplayName(state, filterState.value) : undefined;

  return <ProtectedPage>{(actor) => <CatalogShell actor={actor} i18n={i18n}>
    <PageHeading title={catalogText(i18n.locale, "catalogTitle")} description={catalogText(i18n.locale, "catalogDescription")} />
    <div className="catalog-browse-layout"><section className="surface-card catalog-controls" aria-label={catalogText(i18n.locale, "search")}>
      <form className="catalog-search" role="search" onSubmit={submitSearch}><div className="form-field"><label htmlFor="catalog-search">{catalogText(i18n.locale, "search")}</label><input id="catalog-search" ref={searchInput} type="search" maxLength={200} value={searchDraft} placeholder={state.searchMode?(i18n.locale==="ar"?"شروط النوع والعلامة والمواصفات المهيأة":"Configured type, brand and specification clauses"):catalogText(i18n.locale, "searchHint")} onChange={(event) => setSearchDraftState({ urlQ: state.q, value: event.target.value })} /></div><button className="button button--primary" type="submit">{catalogText(i18n.locale, "searchAction")}</button>{state.q?<button className="text-button catalog-clear-search" type="button" onClick={()=>{setSearchDraftState({urlQ:state.q,value:""});patch({q:"",sort:"newest"});searchInput.current?.focus();}}>{i18n.locale==="ar"?"مسح البحث":"Clear search"}</button>:null}</form>
      <div className="catalog-search-settings">
        <div className="form-field"><label htmlFor="catalog-search-mode">{i18n.locale === "ar" ? "طريقة البحث" : "Search mode"}</label>
          <CatalogChoiceMenu id="catalog-search-mode" className="catalog-menu--field" label={i18n.locale === "ar" ? "طريقة البحث" : "Search mode"} value={state.searchMode ?? "ordinary"}
            options={[{ value: "ordinary", label: i18n.locale === "ar" ? "بحث نصي عادي" : "Ordinary text" }, { value: "structured", label: i18n.locale === "ar" ? "بحث منظّم" : "Structured search" }]}
            onChange={value => patch({ searchMode: value === "structured" ? "structured" : undefined, sort: value === "structured" && state.sort === "relevance" ? "newest" : state.sort })} />
        </div>
        <div className="form-field"><label htmlFor="catalog-sort">{catalogText(i18n.locale, "sort")}</label>
          <CatalogChoiceMenu id="catalog-sort" className="catalog-menu--field" label={catalogText(i18n.locale, "sort")} value={state.sort}
            options={[
              { value: "relevance", label: catalogText(i18n.locale, "relevance"), disabled: !state.q || !!state.searchMode },
              { value: "newest", label: catalogText(i18n.locale, "newest") },
              { value: "name-asc", label: catalogText(i18n.locale, "nameAsc") },
              { value: "name-desc", label: catalogText(i18n.locale, "nameDesc") },
              { value: "retail-price-asc", label: catalogText(i18n.locale, "priceAsc"), disabled: !state.retailCurrency || filterState.type !== "Ready" || !filterState.value.capabilities.retailPrice },
              { value: "retail-price-desc", label: catalogText(i18n.locale, "priceDesc"), disabled: !state.retailCurrency || filterState.type !== "Ready" || !filterState.value.capabilities.retailPrice },
            ]}
            onChange={value => patch({ sort: value as CatalogQueryState["sort"] })} />
        </div>
      </div>
      {state.searchMode?<details className="catalog-search-help"><summary>{i18n.locale==="ar"?"كيفية البحث المنظم":"Structured search help"}</summary><p>{i18n.locale==="ar"?"استخدم الأسماء والقيم المهيأة فقط؛ تُطبق الشروط معاً. اختر نوعاً واحداً عند الغموض. عدّل العبارة لتغيير شروطها؛ المسح يزيل الفلاتر اليدوية فقط.":"Use configured names and exact values; all clauses apply together. Select one type when ambiguous. Edit the phrase to change its clauses; reset clears manual filters only."}</p></details>:null}
      <CatalogActiveState items={active} branchDisplayName={branchDisplayName} locale={i18n.locale} onReset={() => navigate(resetCatalogFilters(state))} />
    </section>
      <CatalogFilters state={state} filterOptions={filterState.type==="Ready"?filterState.value:null} loading={filterState.type==="Loading"} failed={filterState.type==="Failed"} onRetry={()=>setFilterRevision(value=>value+1)} locale={i18n.locale} onChange={patch} onReset={()=>navigate(resetCatalogFilters(state))} />
    <section className="catalog-results" aria-labelledby="catalog-results-heading" aria-busy={searchState.type === "Loading"}><h2 id="catalog-results-heading" className="catalog-section-title">{catalogText(i18n.locale, "results")}</h2>{searchState.type==="Ready"?<p className="catalog-result-count" role="status">{searchState.value.items.length} {i18n.locale==="ar"?"منتج في هذه الصفحة":"products on this page"}{searchState.value.nextCursor?(i18n.locale==="ar"?" · تتوفر صفحة تالية":" · More results available"):""}</p>:null}
      <div className="catalog-results-frame" ref={resultsFrame} style={searchState.type === "Loading" ? { minHeight: Math.max(resultsHeight, 240) } : undefined}>
      {searchState.type === "Loading" ? <div className="catalog-refresh-status" role="status" aria-live="polite"><span className="catalog-refresh-dot" aria-hidden="true" /><span>{resultsHeight ? (i18n.locale === "ar" ? "جارٍ تحديث النتائج…" : "Updating results…") : catalogText(i18n.locale, "loadingCatalog")}</span></div> : null}
      {searchState.type === "Failed" ? <StatusMessage kind={searchState.result.kind === "Forbidden" || searchState.result.kind === "NotFound" ? "warning" : "error"}>{searchState.result.kind === "Forbidden" ? catalogText(i18n.locale, "forbidden") : searchState.result.kind === "NotFound" ? catalogText(i18n.locale, "notFound") : searchState.result.kind === "InvalidQuery" ? (state.searchMode ? (i18n.locale==="ar"?"تعذر تفسير العبارة بثقة. اختر نوع منتج واحداً واستخدم شروطاً مدعومة؛ لم يُتجاهل أي شرط.":"The phrase cannot be interpreted safely. Select one Product Type and use supported clauses; no clause was ignored.") : catalogText(i18n.locale, "malformed")) : catalogText(i18n.locale, "unavailable")} {searchState.result.kind==="InvalidQuery"?<button className="text-button" type="button" onClick={()=>searchInput.current?.focus()}>{i18n.locale==="ar"?"تعديل البحث":"Edit search"}</button>:<button className="text-button" type="button" onClick={() => setSearchRevision((value) => value + 1)}>{catalogText(i18n.locale, "retry")}</button>}</StatusMessage> : null}
      {searchState.type === "Ready" && searchState.value.items.length === 0 ? <div className="surface-card empty-state" role="status">{hasCatalogConstraints(state) ? catalogText(i18n.locale, "noResults") : catalogText(i18n.locale, "emptyCatalog")}</div> : null}
      {searchState.type === "Ready" && searchState.value.items.length ? <div className="catalog-grid">{searchState.value.items.map((product) => <CatalogProductCard key={product.productId} product={product} queryState={state} locale={i18n.locale} />)}</div> : null}
      {searchState.type === "Ready" && searchState.value.nextCursor ? <div className="catalog-pagination"><button className="button button--secondary" type="button" onClick={() => patch({ cursor: searchState.value.nextCursor ?? undefined })}>{catalogText(i18n.locale, "nextPage")}</button></div> : null}
      </div>
    </section>
  </div></CatalogShell>}</ProtectedPage>;
}
