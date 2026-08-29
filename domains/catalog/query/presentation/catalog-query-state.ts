import {
  CATALOG_PRESENTATION_CONDITIONS,
  CATALOG_PRESENTATION_DEVICE_CLASSES,
  CATALOG_PRESENTATION_LIFECYCLES,
  CATALOG_PRESENTATION_LISTING_FILTERS,
  CATALOG_PRESENTATION_SORTS,
  CATALOG_PRESENTATION_STOCK_FILTERS,
  type CatalogPresentationCondition,
  type CatalogPresentationDeviceClass,
  type CatalogPresentationLifecycle,
  type CatalogPresentationListingFilter,
  type CatalogPresentationSort,
  type CatalogPresentationStockFilter,
} from "./catalog-presentation.types";

export interface CatalogQueryState {
  readonly q: string;
  readonly branchId?: string;
  readonly departmentId?: string;
  readonly categoryId?: string;
  readonly productTypeId?: string;
  readonly brandId?: string;
  readonly deviceClass?: CatalogPresentationDeviceClass;
  readonly condition?: CatalogPresentationCondition;
  readonly supplyStatusId?: string;
  readonly lifecycle: CatalogPresentationLifecycle;
  readonly listing?: CatalogPresentationListingFilter;
  readonly stock?: CatalogPresentationStockFilter;
  readonly minRetailPrice?: string;
  readonly maxRetailPrice?: string;
  readonly retailCurrency?: string;
  readonly sort: CatalogPresentationSort;
  readonly cursor?: string;
}

export type CatalogQueryStateResult = { readonly ok: true; readonly value: CatalogQueryState } | { readonly ok: false };
const keys = new Set(["q", "branchId", "departmentId", "categoryId", "productTypeId", "brandId", "deviceClass", "condition", "supplyStatusId", "lifecycle", "listing", "stock", "minRetailPrice", "maxRetailPrice", "retailCurrency", "sort", "cursor"]);
const has = <T extends readonly string[]>(values: T, value: string | undefined): value is T[number] => value !== undefined && values.includes(value as T[number]);
const identifier = (value: string | undefined): string | undefined => value === undefined || value === "" ? undefined : value === value.trim() && value.length <= 160 && !/[\u0000-\u001f\u007f]/u.test(value) ? value : (() => { throw new Error("InvalidIdentifier"); })();
const money = (value: string | undefined): string | undefined => value === undefined || value === "" ? undefined : /^(0|[1-9][0-9]{0,15})$/u.test(value) && BigInt(value) <= BigInt("9007199254740991") ? value : (() => { throw new Error("InvalidMoney"); })();

export const parseCatalogQueryState = (input: URLSearchParams): CatalogQueryStateResult => {
  try {
    for (const key of input.keys()) if (!keys.has(key) || input.getAll(key).length !== 1) return { ok: false };
    const raw = (key: string) => input.get(key) ?? undefined;
    const q = (raw("q") ?? "").trim().replace(/\s+/gu, " ");
    if (q.length > 200) return { ok: false };
    const branchId = identifier(raw("branchId"));
    const lifecycleRaw = raw("lifecycle") ?? "Published";
    const sortRaw = raw("sort") ?? (q ? "relevance" : "newest");
    if (!has(CATALOG_PRESENTATION_LIFECYCLES, lifecycleRaw) || !has(CATALOG_PRESENTATION_SORTS, sortRaw) || (!q && sortRaw === "relevance")) return { ok: false };
    const deviceClassRaw = raw("deviceClass"), conditionRaw = raw("condition"), listingRaw = raw("listing"), stockRaw = raw("stock");
    if ((deviceClassRaw && !has(CATALOG_PRESENTATION_DEVICE_CLASSES, deviceClassRaw)) || (conditionRaw && !has(CATALOG_PRESENTATION_CONDITIONS, conditionRaw)) || (listingRaw && !has(CATALOG_PRESENTATION_LISTING_FILTERS, listingRaw)) || (stockRaw && !has(CATALOG_PRESENTATION_STOCK_FILTERS, stockRaw))) return { ok: false };
    if (!branchId && (listingRaw || stockRaw)) return { ok: false };
    const minRetailPrice = money(raw("minRetailPrice")), maxRetailPrice = money(raw("maxRetailPrice"));
    if (minRetailPrice !== undefined && maxRetailPrice !== undefined && BigInt(minRetailPrice) > BigInt(maxRetailPrice)) return { ok: false };
    const retailCurrency = raw("retailCurrency")?.toUpperCase();
    if (retailCurrency !== undefined && !/^[A-Z]{3}$/u.test(retailCurrency)) return { ok: false };
    if ((minRetailPrice !== undefined || maxRetailPrice !== undefined || sortRaw.startsWith("retail-price")) && !retailCurrency) return { ok: false };
    const cursor = raw("cursor");
    if (cursor !== undefined && !/^[A-Za-z0-9_-]{1,2048}$/u.test(cursor)) return { ok: false };
    return { ok: true, value: Object.freeze({
      q,
      ...(branchId ? { branchId } : {}),
      ...(identifier(raw("departmentId")) ? { departmentId: identifier(raw("departmentId")) } : {}),
      ...(identifier(raw("categoryId")) ? { categoryId: identifier(raw("categoryId")) } : {}),
      ...(identifier(raw("productTypeId")) ? { productTypeId: identifier(raw("productTypeId")) } : {}),
      ...(identifier(raw("brandId")) ? { brandId: identifier(raw("brandId")) } : {}),
      ...(deviceClassRaw ? { deviceClass: deviceClassRaw as CatalogPresentationDeviceClass } : {}),
      ...(conditionRaw ? { condition: conditionRaw as CatalogPresentationCondition } : {}),
      ...(identifier(raw("supplyStatusId")) ? { supplyStatusId: identifier(raw("supplyStatusId")) } : {}),
      lifecycle: lifecycleRaw,
      ...(listingRaw ? { listing: listingRaw as CatalogPresentationListingFilter } : {}),
      ...(stockRaw ? { stock: stockRaw as CatalogPresentationStockFilter } : {}),
      ...(minRetailPrice !== undefined ? { minRetailPrice } : {}),
      ...(maxRetailPrice !== undefined ? { maxRetailPrice } : {}),
      ...(retailCurrency ? { retailCurrency } : {}),
      sort: sortRaw,
      ...(cursor ? { cursor } : {}),
    }) };
  } catch { return { ok: false }; }
};

export const catalogQuerySearchParams = (state: CatalogQueryState): URLSearchParams => {
  const output = new URLSearchParams();
  const add = (key: string, value: string | undefined) => { if (value !== undefined && value !== "") output.set(key, value); };
  add("q", state.q); add("branchId", state.branchId); add("departmentId", state.departmentId); add("categoryId", state.categoryId); add("productTypeId", state.productTypeId); add("brandId", state.brandId); add("deviceClass", state.deviceClass); add("condition", state.condition); add("supplyStatusId", state.supplyStatusId);
  if (state.lifecycle !== "Published") add("lifecycle", state.lifecycle);
  add("listing", state.listing); add("stock", state.stock); add("minRetailPrice", state.minRetailPrice); add("maxRetailPrice", state.maxRetailPrice); add("retailCurrency", state.retailCurrency);
  if (state.sort !== (state.q ? "relevance" : "newest")) add("sort", state.sort);
  add("cursor", state.cursor);
  return output;
};

export const updateCatalogQueryState = (state: CatalogQueryState, patch: Partial<CatalogQueryState>): CatalogQueryState => {
  const cursorOnly = Object.keys(patch).every((key) => key === "cursor");
  const next = { ...state, ...patch };
  if (!next.branchId) { delete next.listing; delete next.stock; }
  if (!cursorOnly) delete next.cursor;
  return Object.freeze(next);
};

export const catalogDetailsHref = (productId: string, state: CatalogQueryState): string => {
  const browse = catalogQuerySearchParams(state).toString();
  const returnTo = `/catalog${browse ? `?${browse}` : ""}`;
  const details = new URLSearchParams();
  if (state.branchId) details.set("branchId", state.branchId);
  details.set("returnTo", returnTo);
  return `/catalog/${encodeURIComponent(productId)}?${details.toString()}`;
};

export const safeCatalogReturnPath = (value: string | null | undefined): string => {
  if (!value || value.length > 4_000) return "/catalog";
  try {
    const url = new URL(value, "https://qsc.invalid");
    if (url.origin !== "https://qsc.invalid" || url.pathname !== "/catalog") return "/catalog";
    const state = parseCatalogQueryState(url.searchParams);
    if (!state.ok) return "/catalog";
    const query = catalogQuerySearchParams(state.value).toString();
    return `/catalog${query ? `?${query}` : ""}`;
  } catch { return "/catalog"; }
};
