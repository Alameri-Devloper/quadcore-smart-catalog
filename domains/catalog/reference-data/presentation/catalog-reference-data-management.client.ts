import type {
  CatalogReferenceApiFailure,
  CatalogReferenceApiResult,
  CatalogReferenceManagementSnapshot,
  CreateDynamicReferenceInput,
  DynamicReferenceKind,
  DynamicReferenceView,
  RegistryAvailabilityView,
  SpecificationDefinitionView,
  SpecificationTemplateView,
  TemplateMutationInput,
  UpdateDynamicReferenceInput,
} from "./catalog-reference-data-management.types";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;

const failures = new Set<CatalogReferenceApiFailure>([
  "InvalidInput", "AuthenticationRequired", "Forbidden", "ForbiddenForRestrictedSession",
  "OriginNotAllowed", "NotFound", "Conflict", "CatalogReferenceDataServiceUnavailable",
]);
const object = (value: unknown): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const string = (record: JsonObject, key: string): string | null => typeof record[key] === "string" ? record[key] : null;
const number = (record: JsonObject, key: string): number | null => typeof record[key] === "number" && Number.isSafeInteger(record[key]) ? record[key] : null;
const array = (record: JsonObject, key: string): readonly unknown[] | null => Array.isArray(record[key]) ? record[key] : null;

const dynamic = (value: unknown): DynamicReferenceView | null => {
  if (!object(value)) return null;
  const id = string(value, "id"); const code = string(value, "code"); const displayName = string(value, "displayName");
  const status = string(value, "status"); const sortOrder = number(value, "sortOrder"); const version = number(value, "version");
  return id && code && displayName && (status === "Active" || status === "Inactive") && sortOrder !== null && version !== null
    ? { id, code, displayName, status, sortOrder, version }
    : null;
};
const list = <T>(value: readonly unknown[] | null, read: (item: unknown) => T | null): readonly T[] | null => {
  if (!value) return null;
  const reconstructed = value.map(read);
  return reconstructed.every((item): item is T => item !== null) ? reconstructed : null;
};
const category = (value: unknown) => {
  const base = dynamic(value); const departmentId = object(value) ? string(value, "departmentId") : null;
  return base && departmentId ? { ...base, departmentId } : null;
};
const productType = (value: unknown) => {
  const base = dynamic(value); const categoryId = object(value) ? string(value, "categoryId") : null;
  return base && categoryId ? { ...base, categoryId } : null;
};
const definition = (value: unknown): SpecificationDefinitionView | null => {
  const base = dynamic(value);
  if (!base || !object(value)) return null;
  const valueType = string(value, "valueType"); const unit = value.unit === null ? null : string(value, "unit");
  return (valueType === "Text" || valueType === "Number" || valueType === "Boolean") && (unit !== null || value.unit === null)
    ? { ...base, valueType, unit }
    : null;
};
const availability = (value: unknown): RegistryAvailabilityView | null => {
  if (!object(value)) return null;
  const code = string(value, "code"); const sortOrder = number(value, "sortOrder");
  return code && typeof value.enabled === "boolean" && sortOrder !== null ? { code, enabled: value.enabled, sortOrder } : null;
};
const labels = (value: unknown) => object(value) && typeof value.en === "string" && typeof value.ar === "string"
  ? { en: value.en, ar: value.ar }
  : null;
const localizedRegistry = (value: unknown) => {
  if (!object(value)) return null;
  const code = string(value, "code"); const translated = labels(value.labels);
  return code && translated ? { code, labels: translated } : null;
};
const currencyRegistry = (value: unknown): { readonly code: string; readonly minorUnitDigits: 0 | 2 | 3 | 4 | null } | null => {
  if (!object(value)) return null;
  const code = string(value, "code"); const digits = value.minorUnitDigits;
  return code && (digits === null || digits === 0 || digits === 2 || digits === 3 || digits === 4)
    ? { code, minorUnitDigits: digits as 0 | 2 | 3 | 4 | null }
    : null;
};
const template = (value: unknown): SpecificationTemplateView | null => {
  if (!object(value)) return null;
  const id = string(value, "id"); const productTypeId = string(value, "productTypeId"); const version = number(value, "version");
  const entries = list(array(value, "entries"), (entry) => {
    if (!object(entry)) return null;
    const specificationDefinitionId = string(entry, "specificationDefinitionId"); const sortOrder = number(entry, "sortOrder");
    return specificationDefinitionId && sortOrder !== null && typeof entry.required === "boolean"
      ? { specificationDefinitionId, sortOrder, required: entry.required }
      : null;
  });
  return id && productTypeId && version !== null && entries ? { id, productTypeId, version, entries } : null;
};

export const reconstructCatalogReferenceSnapshot = (value: unknown): CatalogReferenceManagementSnapshot | null => {
  if (!object(value)) return null;
  const departments = list(array(value, "departments"), dynamic);
  const categories = list(array(value, "categories"), category);
  const productTypes = list(array(value, "productTypes"), productType);
  const brands = list(array(value, "brands"), dynamic);
  const supplyStatuses = list(array(value, "supplyStatuses"), dynamic);
  const deviceClasses = list(array(value, "deviceClasses"), localizedRegistry);
  const conditions = list(array(value, "conditions"), availability);
  const conditionRegistry = list(array(value, "conditionRegistry"), localizedRegistry);
  const currencies = list(array(value, "currencies"), availability);
  const currenciesRegistry = list(array(value, "currencyRegistry"), currencyRegistry);
  const specificationDefinitions = list(array(value, "specificationDefinitions"), definition);
  const specificationTemplates = list(array(value, "specificationTemplates"), template);
  return departments && categories && productTypes && brands && supplyStatuses && deviceClasses && conditions
    && conditionRegistry && currencies && currenciesRegistry && specificationDefinitions && specificationTemplates
    ? { departments, categories, productTypes, brands, supplyStatuses, deviceClasses, conditions, conditionRegistry, currencies, currencyRegistry: currenciesRegistry, specificationDefinitions, specificationTemplates }
    : null;
};

const failure = (body: unknown): CatalogReferenceApiFailure => object(body) && typeof body.type === "string" && failures.has(body.type as CatalogReferenceApiFailure)
  ? body.type as CatalogReferenceApiFailure
  : "Unavailable";

export class CatalogReferenceDataManagementClient {
  constructor(private readonly fetcher: FetchPort = fetch) {}

  private async request<T>(path: string, init: RequestInit, read: (value: unknown) => T | null): Promise<CatalogReferenceApiResult<T>> {
    try {
      const response = await this.fetcher(path, {
        ...init,
        credentials: "same-origin",
        headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}) },
      });
      const body = await response.json() as unknown;
      if (!response.ok) return { ok: false, kind: failure(body) };
      if (!object(body) || body.type !== "Success") return { ok: false, kind: "Unavailable" };
      const value = read(body.value);
      return value === null ? { ok: false, kind: "Unavailable" } : { ok: true, value };
    } catch { return { ok: false, kind: "Unavailable" }; }
  }

  load(includeInactive: boolean, signal?: AbortSignal) {
    return this.request(includeInactive ? "/api/catalog/reference-data?includeInactive=true" : "/api/catalog/reference-data", { method: "GET", signal }, reconstructCatalogReferenceSnapshot);
  }

  create(kind: DynamicReferenceKind, input: CreateDynamicReferenceInput) {
    const read = kind === "categories" ? category : kind === "product-types" ? productType : kind === "specification-definitions" ? definition : dynamic;
    return this.request(`/api/catalog/reference-data/${kind}`, { method: "POST", body: JSON.stringify(input) }, read);
  }

  update(kind: DynamicReferenceKind, id: string, input: UpdateDynamicReferenceInput) {
    const read = kind === "categories" ? category : kind === "product-types" ? productType : kind === "specification-definitions" ? definition : dynamic;
    return this.request(`/api/catalog/reference-data/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }, read);
  }

  configureConditions(values: readonly RegistryAvailabilityView[]) {
    return this.request("/api/catalog/reference-data/conditions", { method: "PUT", body: JSON.stringify({ values }) }, (value) => list(Array.isArray(value) ? value : null, availability));
  }

  configureCurrencies(values: readonly RegistryAvailabilityView[]) {
    return this.request("/api/catalog/reference-data/currencies", { method: "PUT", body: JSON.stringify({ values }) }, (value) => list(Array.isArray(value) ? value : null, availability));
  }

  configureTemplate(productTypeId: string, input: TemplateMutationInput) {
    return this.request(`/api/catalog/reference-data/product-types/${encodeURIComponent(productTypeId)}/specification-template`, { method: "PUT", body: JSON.stringify(input) }, template);
  }
}

export const catalogReferenceDataManagementClient = new CatalogReferenceDataManagementClient();
