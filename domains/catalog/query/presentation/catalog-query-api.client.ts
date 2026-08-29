import { catalogQuerySearchParams, type CatalogQueryState } from "./catalog-query-state";
import {
  CATALOG_PRESENTATION_CONDITIONS,
  CATALOG_PRESENTATION_LIFECYCLES,
  CATALOG_PRESENTATION_LISTING_FILTERS,
  CATALOG_PRESENTATION_STOCK_FILTERS,
  type CatalogApiFailureKind,
  type CatalogApiResult,
  type CatalogClassificationView,
  type CatalogFilterOptionsView,
  type CatalogFilterReferenceView,
  type CatalogInventoryView,
  type CatalogMediaView,
  type CatalogMoneyView,
  type CatalogProductCardView,
  type CatalogProductDetailsView,
  type CatalogReferenceView,
  type CatalogSearchView,
  type CatalogSpecificationView,
} from "./catalog-presentation.types";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("InvalidResponse"); return value as RecordValue; };
const string = (value: unknown, allowEmpty = false): string => { if (typeof value !== "string" || (!allowEmpty && !value)) throw new Error("InvalidResponse"); return value; };
const nullableString = (value: unknown): string | null => value === null ? null : string(value, true);
const integer = (value: unknown): number => { if (!Number.isSafeInteger(value)) throw new Error("InvalidResponse"); return value as number; };
const own = (value: RecordValue, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const member = <T extends readonly string[]>(values: T, value: unknown): T[number] => { const text = string(value); if (!values.includes(text as T[number])) throw new Error("InvalidResponse"); return text as T[number]; };
const decimal = (value: unknown): string => { const text = string(value); if (!/^(0|[1-9][0-9]*)$/u.test(text)) throw new Error("InvalidResponse"); return text; };
const iso = (value: unknown): string => { const text = string(value); const date = new Date(text); if (!Number.isFinite(date.getTime()) || date.toISOString() !== text) throw new Error("InvalidResponse"); return text; };

const reference = (value: unknown): CatalogReferenceView | null => {
  if (value === null) return null;
  const item = record(value);
  return Object.freeze({ id: string(item.id), displayName: string(item.displayName, true) });
};
const filterReference = (value: unknown): CatalogFilterReferenceView => {
  const item = record(value);
  return Object.freeze({ id: string(item.id), displayName: string(item.displayName, true), ...(own(item, "parentId") ? { parentId: string(item.parentId) } : {}) });
};
const money = (value: unknown): CatalogMoneyView | null => {
  if (value === null) return null;
  const item = record(value);
  const source = string(item.source);
  if (source !== "WorkspaceBase" && source !== "BranchOverride") throw new Error("InvalidResponse");
  const currency = string(item.currency);
  if (!/^[A-Z]{3}$/u.test(currency)) throw new Error("InvalidResponse");
  return Object.freeze({ amountMinor: decimal(item.amountMinor), currency, source });
};
const inventory = (value: unknown): CatalogInventoryView => {
  const item = record(value);
  return Object.freeze({ available: decimal(item.available), onHand: decimal(item.onHand), reserved: decimal(item.reserved), damaged: decimal(item.damaged) });
};
const media = (value: unknown, productId: string): CatalogMediaView | null => {
  if (value === null) return null;
  const item = record(value), mediaId = string(item.mediaId), downloadUrl = string(item.downloadUrl);
  const expected = `/api/catalog/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(mediaId)}`;
  if (downloadUrl !== expected) throw new Error("InvalidResponse");
  if (typeof item.isMain !== "boolean") throw new Error("InvalidResponse");
  return Object.freeze({ mediaId, altText: nullableString(item.altText), position: integer(item.position), isMain: item.isMain, downloadUrl });
};
const classification = (value: unknown): CatalogClassificationView => {
  const item = record(value);
  return Object.freeze({ department: reference(item.department), category: reference(item.category), productType: reference(item.productType), brand: reference(item.brand), deviceClass: nullableString(item.deviceClass), condition: nullableString(item.condition), supplyStatus: reference(item.supplyStatus) });
};

const product = (value: unknown): CatalogProductCardView => {
  const item = record(value), productId = string(item.productId), listingStatus = string(item.listingStatus);
  if (!["Listed", "Unlisted", "NotConfigured"].includes(listingStatus)) throw new Error("InvalidResponse");
  const output: CatalogProductCardView = {
    productId,
    productCode: nullableString(item.productCode),
    productName: nullableString(item.productName),
    lifecycle: member(CATALOG_PRESENTATION_LIFECYCLES, item.lifecycle),
    ...(own(item, "branchId") ? { branchId: string(item.branchId) } : {}),
    createdAt: iso(item.createdAt),
    updatedAt: iso(item.updatedAt),
    classification: classification(item.classification),
    mainMedia: media(item.mainMedia, productId),
    listingStatus: listingStatus as CatalogProductCardView["listingStatus"],
    ...(own(item, "availability") ? { availability: member(["InStock", "OutOfStock"] as const, item.availability) } : {}),
    ...(own(item, "inventory") ? { inventory: inventory(item.inventory) } : {}),
    ...(own(item, "retail") ? { retail: money(item.retail) } : {}),
    ...(own(item, "wholesale") ? { wholesale: money(item.wholesale) } : {}),
  };
  return Object.freeze(output);
};

const specification = (value: unknown): CatalogSpecificationView => {
  const item = record(value), valueType = member(["Text", "Number", "Boolean"] as const, item.valueType);
  if ((valueType === "Boolean" && typeof item.value !== "boolean") || (valueType !== "Boolean" && typeof item.value !== "string")) throw new Error("InvalidResponse");
  return Object.freeze({ specificationDefinitionId: string(item.specificationDefinitionId), displayName: string(item.displayName, true), valueType, unit: nullableString(item.unit), value: item.value as string | boolean, sortOrder: integer(item.sortOrder) });
};

const details = (value: unknown): CatalogProductDetailsView => {
  const item = record(value), base = product(item), capabilities = record(item.capabilities);
  const modes = (Array.isArray(capabilities.directSharePriceModes) ? capabilities.directSharePriceModes : []).map((mode) => member(["Retail", "Wholesale"] as const, mode));
  return Object.freeze({
    ...base,
    media: Object.freeze((Array.isArray(item.media) ? item.media : (() => { throw new Error("InvalidResponse"); })()).map((entry) => media(entry, base.productId)!)),
    specifications: Object.freeze((Array.isArray(item.specifications) ? item.specifications : (() => { throw new Error("InvalidResponse"); })()).map(specification)),
    ...(own(item, "referenceCost") ? { referenceCost: money(item.referenceCost) } : {}),
    capabilities: Object.freeze({ directSharePriceModes: Object.freeze([...new Set(modes)]) }),
  });
};

const filters = (value: unknown): CatalogFilterOptionsView => {
  const item = record(value), capabilities = record(item.capabilities);
  const references = (key: string) => { if (!Array.isArray(item[key])) throw new Error("InvalidResponse"); return Object.freeze(item[key].map(filterReference)); };
  const conditions = (Array.isArray(item.enabledConditions) ? item.enabledConditions : []).map((condition) => member(CATALOG_PRESENTATION_CONDITIONS, condition));
  const currencies = (Array.isArray(item.enabledCurrencies) ? item.enabledCurrencies : []).map((currency) => { const code = string(currency); if (!/^[A-Z]{3}$/u.test(code)) throw new Error("InvalidResponse"); return code; });
  if (typeof capabilities.retailPrice !== "boolean") throw new Error("InvalidResponse");
  return Object.freeze({
    departments: references("departments"), categories: references("categories"), productTypes: references("productTypes"), brands: references("brands"), supplyStatuses: references("supplyStatuses"), branches: references("branches"),
    enabledConditions: Object.freeze(conditions), enabledCurrencies: Object.freeze(currencies),
    capabilities: Object.freeze({
      lifecycles: Object.freeze((Array.isArray(capabilities.lifecycles) ? capabilities.lifecycles : []).map((entry) => member(CATALOG_PRESENTATION_LIFECYCLES, entry))),
      listingFilters: Object.freeze((Array.isArray(capabilities.listingFilters) ? capabilities.listingFilters : []).map((entry) => member(CATALOG_PRESENTATION_LISTING_FILTERS, entry))),
      stockFilters: Object.freeze((Array.isArray(capabilities.stockFilters) ? capabilities.stockFilters : []).map((entry) => member(CATALOG_PRESENTATION_STOCK_FILTERS, entry))),
      retailPrice: capabilities.retailPrice,
    }),
  });
};

const failureKind = (status: number): CatalogApiFailureKind => status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "NotFound" : status === 400 ? "InvalidQuery" : status >= 500 || status === 0 ? "Unavailable" : "UnexpectedError";
const codeOf = (value: unknown): string => { try { return string(record(value).type); } catch { return "UnexpectedError"; } };

export class CatalogQueryApiClient {
  constructor(private readonly fetchPort: FetchPort = fetch) {}

  private async get<T>(path: string, parse: (value: unknown) => T): Promise<CatalogApiResult<T>> {
    try {
      const response = await this.fetchPort(path, { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) return { ok: false, kind: failureKind(response.status), code: codeOf(body), status: response.status };
      const envelope = record(body);
      if (envelope.type !== "Success") throw new Error("InvalidResponse");
      return { ok: true, value: parse(envelope.value) };
    } catch { return { ok: false, kind: "Unavailable", code: "CatalogQueryServiceUnavailable", status: 0 }; }
  }

  search(state: CatalogQueryState): Promise<CatalogApiResult<CatalogSearchView>> {
    const params = catalogQuerySearchParams(state);
    return this.get(`/api/catalog/products${params.size ? `?${params}` : ""}`, (value) => {
      const item = record(value);
      if (!Array.isArray(item.items) || (item.nextCursor !== null && typeof item.nextCursor !== "string")) throw new Error("InvalidResponse");
      return Object.freeze({ items: Object.freeze(item.items.map(product)), nextCursor: item.nextCursor as string | null });
    });
  }

  productDetails(productId: string, branchId?: string): Promise<CatalogApiResult<CatalogProductDetailsView>> {
    const params = new URLSearchParams(); if (branchId) params.set("branchId", branchId);
    return this.get(`/api/catalog/products/${encodeURIComponent(productId)}${params.size ? `?${params}` : ""}`, details);
  }

  filterOptions(): Promise<CatalogApiResult<CatalogFilterOptionsView>> { return this.get("/api/catalog/filters", filters); }
}

export const catalogQueryApiClient = new CatalogQueryApiClient();
