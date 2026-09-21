import type { ListingAction, ListingFailure, ListingPort, ListingResource, ListingResult, ListingStatus, ListingView, ListingWriteView } from "./listing.types";

export type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const timestamp = (value: unknown): string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(Date.parse(value)) ? value : invalid();
const configured = (value: unknown): ListingStatus => value === "Listed" || value === "Unlisted" ? value : invalid();
const identity = (row: JsonObject, resource: ListingResource) => {
  if (own(row, "branchId") !== resource.branchId || own(row, "productId") !== resource.productId) invalid();
  const revision = own(row, "revision");
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) return invalid();
  return { branchId: resource.branchId, productId: resource.productId, revision };
};
export const reconstructListing = (value: unknown, resource: ListingResource): ListingView => {
  const row = object(value), base = identity(row, resource), status = own(row, "listingStatus"), actions = own(row, "allowedActions");
  const listingStatus = status === "NotConfigured" ? status : configured(status);
  const updatedAt = own(row, "updatedAt");
  if (listingStatus === "NotConfigured" ? base.revision !== 0 || updatedAt !== null : base.revision === 0) return invalid();
  if (!Array.isArray(actions) || actions.some(action => action !== "SetListed" && action !== "SetUnlisted")) return invalid();
  return Object.freeze({ ...base, listingStatus, updatedAt: listingStatus === "NotConfigured" ? null : timestamp(updatedAt),
    allowedActions: Object.freeze([...actions] as ListingAction[]) });
};
const reconstructWrite = (value: unknown, resource: ListingResource, requested: ListingStatus): ListingWriteView => {
  const row = object(value), base = identity(row, resource), listingStatus = configured(own(row, "listingStatus"));
  if (!base.revision || listingStatus !== requested) return invalid();
  return Object.freeze({ ...base, listingStatus, updatedAt: timestamp(own(row, "updatedAt")) });
};
const errors: Readonly<Record<string, readonly [number, ListingFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  OriginNotAllowed: [403, "OriginNotAllowed"], Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"],
  ProductNotFound: [404, "ProductNotFound"], BranchInactive: [400, "BranchInactive"], ProductArchived: [400, "ProductArchived"],
  InvalidInput: [400, "InvalidInput"], Conflict: [409, "Conflict"], BranchProductServiceUnavailable: [503, "BranchProductServiceUnavailable"],
};
export class ListingApiClient implements ListingPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  get(resource: ListingResource, signal?: AbortSignal) {
    return this.request(resource, "GET", value => reconstructListing(value, resource), undefined, signal);
  }
  set(resource: ListingResource, command: { readonly listingStatus: ListingStatus; readonly expectedRevision: number }, signal?: AbortSignal) {
    return this.request(resource, "PUT", value => reconstructWrite(value, resource, command.listingStatus),
      { listingStatus: command.listingStatus, expectedRevision: command.expectedRevision }, signal);
  }
  private async request<T>(resource: ListingResource, method: "GET" | "PUT", parse: (value: unknown) => T,
    body?: { readonly listingStatus: ListingStatus; readonly expectedRevision: number }, signal?: AbortSignal): Promise<ListingResult<T>> {
    const fetchPort = this.fetchPort; // Native/injected fetch must never receive the client as its receiver.
    let response: Response;
    try { response = await fetchPort(`/api/branches/${encodeURIComponent(resource.branchId)}/products/${encodeURIComponent(resource.productId)}/listing`, {
      method, credentials: "same-origin", cache: "no-store", signal,
      headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }); } catch { return { ok: false, kind: "NetworkFailure" }; }
    let envelope: JsonObject, type: unknown;
    try { envelope = object(await response.json()); type = own(envelope, "type"); if (typeof type !== "string") invalid(); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const mapped = typeof type === "string" && Object.prototype.hasOwnProperty.call(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: mapped?.[0] === response.status ? mapped[1] : "UnexpectedResponse" };
    }
    if (response.status !== 200) return { ok: false, kind: "UnexpectedResponse" };
    try { if (type !== "Success") invalid(); return { ok: true, value: parse(own(envelope, "value")) }; }
    catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
