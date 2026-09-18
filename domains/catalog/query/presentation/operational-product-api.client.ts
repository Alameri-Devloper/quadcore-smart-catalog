import { normalizeCatalogPresentationSearch } from "./catalog-query-state";
import { operationalProductCursor, operationalProductId } from "./operational-product-query-state";
import { OPERATIONAL_PRODUCT_PURPOSES, type OperationalProductFailure, type OperationalProductPage, type OperationalProductPort, type OperationalProductRequest, type OperationalProductResult, type OperationalProductView } from "./operational-product-selector.types";

export type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const nullableText = (value: unknown): string | null => value === null || typeof value === "string" ? value : invalid();

export const reconstructOperationalProducts = (value: unknown, request: OperationalProductRequest): OperationalProductPage => {
  const page = object(value), items = own(page, "items"), nextCursor = own(page, "nextCursor");
  if (!Array.isArray(items) || (nextCursor !== null && !operationalProductCursor(nextCursor))) return invalid();
  const ids = new Set<string>();
  return Object.freeze({ items: Object.freeze(items.map((entry): OperationalProductView => {
    const item = object(entry), productId = operationalProductId(own(item, "productId")), lifecycle = own(item, "lifecycle");
    if (!productId || ids.has(productId) || (lifecycle !== "Draft" && lifecycle !== "Published")) return invalid();
    ids.add(productId);
    const base: OperationalProductView = { productId, productCode: nullableText(own(item, "productCode")), productName: nullableText(own(item, "productName")), lifecycle };
    if (!request.branchId) return Object.freeze(base);
    const branchId = own(item, "branchId"), listingStatus = own(item, "listingStatus");
    if (branchId !== request.branchId || (listingStatus !== "Listed" && listingStatus !== "Unlisted" && listingStatus !== "NotConfigured")) return invalid();
    return Object.freeze({ ...base, branchId, listingStatus });
  })), nextCursor: nextCursor as string | null });
};
const errors: Readonly<Record<string, readonly [number, OperationalProductFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"], InvalidQuery: [400, "InvalidQuery"],
  InvalidCursor: [400, "InvalidCursor"], CatalogQueryServiceUnavailable: [503, "CatalogQueryServiceUnavailable"],
};

export class OperationalProductApiClient implements OperationalProductPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  async search(request: OperationalProductRequest, signal?: AbortSignal): Promise<OperationalProductResult> {
    const workspace = request.purpose === "WorkspacePricing" || request.purpose === "WorkspaceReferenceCost";
    const q = typeof request.q === "string" ? normalizeCatalogPresentationSearch(request.q) : null;
    if (!OPERATIONAL_PRODUCT_PURPOSES.includes(request.purpose) || q === null ||
      (workspace ? request.branchId !== undefined : !operationalProductId(request.branchId)) ||
      (request.limit !== undefined && (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 60))) return { ok: false, kind: "InvalidQuery" };
    if (request.cursor !== undefined && !operationalProductCursor(request.cursor)) return { ok: false, kind: "InvalidCursor" };
    const query = new URLSearchParams({ purpose: request.purpose });
    if (q) query.set("q", q);
    if (request.branchId) query.set("branchId", request.branchId);
    if (request.cursor) query.set("cursor", request.cursor);
    if (request.limit !== undefined) query.set("limit", String(request.limit));
    const fetchPort = this.fetchPort;
    let response: Response;
    try { response = await fetchPort(`/api/catalog/operational-products?${query}`, {
      method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "application/json" },
    }); } catch { return { ok: false, kind: "NetworkFailure" }; }
    let body: JsonObject, type: unknown;
    try { body = object(await response.json()); type = own(body, "type"); if (typeof type !== "string") return invalid(); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const error = Object.prototype.hasOwnProperty.call(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: error?.[0] === response.status ? error[1] : "UnexpectedResponse" };
    }
    if (response.status !== 200) return { ok: false, kind: "UnexpectedResponse" };
    try {
      if (type !== "Success") return invalid();
      return { ok: true, value: reconstructOperationalProducts(own(body, "value"), request) };
    } catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
