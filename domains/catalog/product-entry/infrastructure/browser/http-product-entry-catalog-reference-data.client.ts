import type { ProductEntryCatalogReferenceData, ProductEntryCatalogReferenceDataPort } from "../../ports/product-entry-catalog-reference-data.port";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const isReferenceData = (value: unknown): value is ProductEntryCatalogReferenceData => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return ["departments", "categories", "productTypes", "brands", "deviceClasses", "conditions", "supplyStatuses", "currencies", "specificationDefinitions", "specificationTemplates"].every((key) => Array.isArray(record[key]));
};

export class HttpProductEntryCatalogReferenceDataClient implements ProductEntryCatalogReferenceDataPort {
  constructor(private readonly fetcher: FetchPort = fetch) {}
  async load(signal?: AbortSignal) {
    try {
      const response = await this.fetcher("/api/catalog/reference-data", { method: "GET", signal, headers: { accept: "application/json" } });
      if (!response.ok) return { type: "Unavailable" as const };
      const body = await response.json() as unknown;
      if (!body || typeof body !== "object" || Array.isArray(body)) return { type: "Unavailable" as const };
      const value = (body as Record<string, unknown>).value;
      return isReferenceData(value) ? { type: "Available" as const, value } : { type: "Unavailable" as const };
    } catch { return { type: "Unavailable" as const }; }
  }
}
