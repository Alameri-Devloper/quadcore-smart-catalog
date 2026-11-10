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
    ...(own(item, "modelName") ? {modelName:string(item.modelName)} : {}),
    ...(own(item, "cardSpecifications") ? { cardSpecifications: cardSpecifications(item.cardSpecifications) } : {}),
    ...(own(item, "availability") ? { availability: member(["InStock", "OutOfStock"] as const, item.availability) } : {}),
    ...(own(item, "inventory") ? { inventory: inventory(item.inventory) } : {}),
    ...(own(item, "retail") ? { retail: money(item.retail) } : {}),
    ...(own(item, "wholesale") ? { wholesale: money(item.wholesale) } : {}),
  };
  return Object.freeze(output);
};

const specification = (value: unknown, nested = false): CatalogSpecificationView => {
  const item = record(value), valueType = member(["Text", "Number", "Boolean"] as const, item.valueType);
  if ((valueType === "Boolean" && typeof item.value !== "boolean") || (valueType !== "Boolean" && typeof item.value !== "string")) throw new Error("InvalidResponse");
  const presentation = own(item,"presentation") ? record(item.presentation) : undefined;
  if(nested && presentation) throw new Error("InvalidResponse");
  const component = presentation && own(presentation,"component") ? specification(presentation.component,true) : undefined;
  if(component && component.specificationDefinitionId===item.specificationDefinitionId) throw new Error("InvalidResponse");
  if(presentation?.format !== undefined && (presentation.format!=="generation" || valueType!=="Number" || item.unit!==null)) throw new Error("InvalidResponse");
  if(component && presentation?.separator!==" " && presentation?.separator!==" — ") throw new Error("InvalidResponse");
  return Object.freeze({ ...(presentation ? {presentation:Object.freeze({...(component?{component,separator:presentation.separator as " " | " — "}:{}),...(presentation.format?{format:"generation" as const}:{})})}:{}), specificationDefinitionId: string(item.specificationDefinitionId), displayName: string(item.displayName, true), valueType, unit: nullableString(item.unit), value: item.value as string | boolean, sortOrder: integer(item.sortOrder) });
};


const cardSpecifications = (value: unknown): readonly CatalogSpecificationView[] => {
  if (!Array.isArray(value) || value.length > 3) throw new Error("InvalidResponse");
  const result = value.map((item) => specification(item));
  if (new Set(result.map((item) => item.specificationDefinitionId)).size !== result.length || result.some((item) => typeof item.value === "string" && item.value.trim() === "")) throw new Error("InvalidResponse");
  return Object.freeze(result);
};

const specificationGroups = (value: unknown, stored: readonly CatalogSpecificationView[]) => {
  if (!Array.isArray(value)) throw new Error("InvalidResponse");
  const storedIds = new Set(stored.map((item) => item.specificationDefinitionId));
  const seen = new Set<string>(), groupIds = new Set<string>(), missingIds = new Set<string>();
  let missingCount = 0;
  const result = value.map((value) => {
    const group = record(value), id = string(group.id), label = record(group.label);
    if (groupIds.has(id) || !Array.isArray(group.specificationDefinitionIds) || !Array.isArray(group.missingSpecifications)) throw new Error("InvalidResponse");
    groupIds.add(id);
    const ids = group.specificationDefinitionIds.map((value) => {
      const id = string(value);
      if (!storedIds.has(id) || seen.has(id)) throw new Error("InvalidResponse");
      seen.add(id); return id;
    });
    const missing = group.missingSpecifications.map((value) => {
      const definition = record(value), id = string(definition.specificationDefinitionId);
      if (storedIds.has(id) || missingIds.has(id) || ++missingCount > 4) throw new Error("InvalidResponse");
      missingIds.add(id);
      return Object.freeze({ specificationDefinitionId: id, displayName: string(definition.displayName, true), valueType: member(["Text", "Number", "Boolean"] as const, definition.valueType), unit: nullableString(definition.unit), sortOrder: integer(definition.sortOrder) });
    });
    return Object.freeze({ id, label: Object.freeze({ en: string(label.en), ar: string(label.ar) }), specificationDefinitionIds: Object.freeze(ids), missingSpecifications: Object.freeze(missing) });
  });
  if (storedIds.size !== stored.length || seen.size !== storedIds.size) throw new Error("InvalidResponse");
  return Object.freeze(result);
};

const details = (value: unknown): CatalogProductDetailsView => {
  const item = record(value), base = product(item), capabilities = record(item.capabilities);
  const stored = Object.freeze((Array.isArray(item.specifications) ? item.specifications : (() => { throw new Error("InvalidResponse"); })()).map((item) => specification(item)));
  const byId = new Map(stored.map(s=>[s.specificationDefinitionId,s]));
  const consumed = new Set<string>();
  for(const s of stored)if(s.presentation?.component){
    const c=s.presentation.component, actual=byId.get(c.specificationDefinitionId);
    if(!actual || actual.presentation?.component || consumed.has(c.specificationDefinitionId) || actual.value!==c.value || actual.unit!==c.unit || actual.valueType!==c.valueType)throw new Error("InvalidResponse");
    consumed.add(c.specificationDefinitionId);
  }
  const modes = (Array.isArray(capabilities.directSharePriceModes) ? capabilities.directSharePriceModes : []).map((mode) => member(["Retail", "Wholesale"] as const, mode));
  return Object.freeze({
    ...base,
    media: Object.freeze((Array.isArray(item.media) ? item.media : (() => { throw new Error("InvalidResponse"); })()).map((entry) => media(entry, base.productId)!)),
    specifications: stored,
    ...(own(item, "specificationGroups") ? { specificationGroups: specificationGroups(item.specificationGroups, stored) } : {}),
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
    ...(item.specificationFilters === undefined ? {} : {specificationFilters:Object.freeze((Array.isArray(item.specificationFilters) ? item.specificationFilters : (()=>{throw new Error("InvalidResponse");})()).map((v:unknown)=>{const d=record(v),valueType=member(["Text","Number","Boolean"] as const,d.valueType);if(!Array.isArray(d.values)||d.values.length>100||typeof d.truncated!=="boolean"||d.values.some(v=>valueType==="Boolean"?typeof v!=="boolean":typeof v!=="string"))throw new Error("InvalidResponse");return Object.freeze({specificationDefinitionId:string(d.specificationDefinitionId),displayName:string(d.displayName),valueType,unit:nullableString(d.unit),sortOrder:integer(d.sortOrder),values:Object.freeze(d.values as (string|boolean)[]),truncated:d.truncated});}))}),
    capabilities: Object.freeze({
      lifecycles: Object.freeze((Array.isArray(capabilities.lifecycles) ? capabilities.lifecycles : []).map((entry) => member(CATALOG_PRESENTATION_LIFECYCLES, entry))),
      listingFilters: Object.freeze((Array.isArray(capabilities.listingFilters) ? capabilities.listingFilters : []).map((entry) => member(CATALOG_PRESENTATION_LISTING_FILTERS, entry))),
      stockFilters: Object.freeze((Array.isArray(capabilities.stockFilters) ? capabilities.stockFilters : []).map((entry) => member(CATALOG_PRESENTATION_STOCK_FILTERS, entry))),
      retailPrice: capabilities.retailPrice,
    }),
  });
};

const structuredInterpretation=(value:unknown):import("../domain/catalog-structured-search").StructuredInterpretation=>{
  const input=record(value);
  if(!Array.isArray(input.rows)||input.rows.length>11)throw new Error("InvalidResponse");
  const rows=input.rows.map((value:unknown)=>{
    const row=record(value),kind=member(["ProductType","Brand","DeviceClass","Specification"] as const,row.kind);
    if(!Array.isArray(row.values)||row.values.length<1||row.values.length>10||row.values.some(v=>typeof v!=="string"&&typeof v!=="boolean"))throw new Error("InvalidResponse");
    return Object.freeze({kind,...(kind==="Specification"?{displayName:string(row.displayName)}:{}),values:Object.freeze(row.values as (string|boolean)[]),unit:nullableString(row.unit)});
  });
  return Object.freeze({...(input.productTypeId===undefined?{}:{productTypeId:string(input.productTypeId)}),rows:Object.freeze(rows)});
};

const failureKind = (status: number): CatalogApiFailureKind => status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 404 ? "NotFound" : status === 400 ? "InvalidQuery" : status >= 500 || status === 0 ? "Unavailable" : "UnexpectedError";
const codeOf = (value: unknown): string => { try { return string(record(value).type); } catch { return "UnexpectedError"; } };

export class CatalogQueryApiClient {
  constructor(private readonly fetchPort: FetchPort = fetch) {}

  private async get<T>(path: string, parse: (value: unknown) => T): Promise<CatalogApiResult<T>> {
    try {
      const fetchPort = this.fetchPort;
      const response = await fetchPort(path, { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
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
      return Object.freeze({ ...(item.structuredInterpretation===undefined?{}:{structuredInterpretation:structuredInterpretation(item.structuredInterpretation)}), items: Object.freeze(item.items.map(product)), nextCursor: item.nextCursor as string | null });
    });
  }

  productDetails(productId: string, branchId?: string): Promise<CatalogApiResult<CatalogProductDetailsView>> {
    const params = new URLSearchParams(); if (branchId) params.set("branchId", branchId);
    return this.get(`/api/catalog/products/${encodeURIComponent(productId)}${params.size ? `?${params}` : ""}`, details);
  }

  filterOptions(state?:CatalogQueryState): Promise<CatalogApiResult<CatalogFilterOptionsView>> { const params=state ? catalogQuerySearchParams({...state,cursor:undefined}) : new URLSearchParams(); return this.get("/api/catalog/filters"+(params.size?"?"+params:""), filters); }
}

export const catalogQueryApiClient = new CatalogQueryApiClient();
