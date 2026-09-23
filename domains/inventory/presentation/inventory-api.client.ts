import type { InventoryAvailability, InventoryFailure, InventoryMutationRequest, InventoryMutationView, InventoryPort,
  InventoryQuantityView, InventoryReadView, InventoryResource, InventoryResult } from "./inventory.types";

export type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const has = (value: JsonObject, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const text = (value: unknown): string => typeof value === "string" ? value : invalid();
const quantity = (value: unknown): string => typeof value === "string" && /^(0|[1-9][0-9]*)$/u.test(value) ? value : invalid();
const availability = (value: unknown): InventoryAvailability => value === "InStock" || value === "OutOfStock" ? value : invalid();
const timestamp = (value: unknown): string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(value)
  && Number.isFinite(Date.parse(value)) ? value : invalid();
const identity = (row: JsonObject, resource: InventoryResource) => {
  if (own(row, "branchId") !== resource.branchId || own(row, "productId") !== resource.productId || own(row, "unit") !== "Piece") invalid();
  return { branchId: resource.branchId, productId: resource.productId, unit: "Piece" as const, availability: availability(own(row, "availability")) };
};
export const reconstructInventoryRead = (value: unknown, resource: InventoryResource): InventoryReadView => {
  const row = object(value), base = identity(row, resource);
  const detailed = has(row, "quantities") || has(row, "revision") || has(row, "updatedAt");
  if (!detailed) return Object.freeze(base);
  const values = object(own(row, "quantities")), revision = own(row, "revision");
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) return invalid();
  return Object.freeze({ ...base, quantities: Object.freeze({ available: quantity(own(values, "available")), onHand: quantity(own(values, "onHand")),
    reserved: quantity(own(values, "reserved")), damaged: quantity(own(values, "damaged")) }), revision, updatedAt: timestamp(own(row, "updatedAt")) });
};
export const reconstructInventoryMutation = (value: unknown, resource: InventoryResource, requestedOperationId: string): InventoryMutationView => {
  const row = object(value), operationId = text(own(row, "operationId"));
  if (operationId !== requestedOperationId || own(row, "status") !== "Succeeded") invalid();
  const hasBalance = has(row, "balance"), hasAvailability = has(row, "availability");
  if (hasBalance && hasAvailability) invalid();
  if (hasBalance) {
    const balance = reconstructInventoryRead(own(row, "balance"), resource);
    if (!("quantities" in balance)) invalid();
    return Object.freeze({ operationId, status: "Succeeded", balance: balance as InventoryQuantityView });
  }
  if (hasAvailability) return Object.freeze({ operationId, status: "Succeeded", availability: availability(own(row, "availability")) });
  return Object.freeze({ operationId, status: "Succeeded" });
};
const errors: Readonly<Record<string, readonly [number, InventoryFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  OriginNotAllowed: [403, "OriginNotAllowed"], Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"],
  ProductNotFound: [404, "ProductNotFound"], BranchInactive: [400, "BranchInactive"], ProductArchived: [400, "ProductArchived"],
  InvalidQuantity: [400, "InvalidQuantity"], InvalidInput: [400, "InvalidInput"], InsufficientAvailableStock: [400, "InsufficientAvailableStock"],
  InventoryConflict: [409, "InventoryConflict"], IdempotencyConflict: [409, "IdempotencyConflict"],
  InventoryServiceUnavailable: [503, "InventoryServiceUnavailable"],
};
type MutationPath = "receive" | "issue" | "corrections" | "damage" | "damage/restore";
export class InventoryApiClient implements InventoryPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  get(resource: InventoryResource, signal?: AbortSignal) {
    return this.request(resource, "GET", undefined, value => reconstructInventoryRead(value, resource), undefined, signal);
  }
  receive(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal) {
    return this.request(resource, "POST", "receive", value => reconstructInventoryMutation(value, resource, command.operationId), command, signal);
  }
  issue(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal) {
    return this.request(resource, "POST", "issue", value => reconstructInventoryMutation(value, resource, command.operationId), command, signal);
  }
  correctIncrease(resource: InventoryResource, command: InventoryMutationRequest & { readonly reasonCode: string }, signal?: AbortSignal) {
    const body = { ...command, direction: "Increase" as const };
    return this.request(resource, "POST", "corrections", value => reconstructInventoryMutation(value, resource, command.operationId), body, signal);
  }
  correctDecrease(resource: InventoryResource, command: InventoryMutationRequest & { readonly reasonCode: string }, signal?: AbortSignal) {
    const body = { ...command, direction: "Decrease" as const };
    return this.request(resource, "POST", "corrections", value => reconstructInventoryMutation(value, resource, command.operationId), body, signal);
  }
  markDamaged(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal) {
    return this.request(resource, "POST", "damage", value => reconstructInventoryMutation(value, resource, command.operationId), command, signal);
  }
  restoreDamaged(resource: InventoryResource, command: InventoryMutationRequest, signal?: AbortSignal) {
    return this.request(resource, "POST", "damage/restore", value => reconstructInventoryMutation(value, resource, command.operationId), command, signal);
  }
  private async request<T>(resource: InventoryResource, method: "GET" | "POST", path: MutationPath | undefined, parse: (value: unknown) => T,
    body?: InventoryMutationRequest | (InventoryMutationRequest & { readonly direction: "Increase" | "Decrease" }), signal?: AbortSignal): Promise<InventoryResult<T>> {
    const fetchPort = this.fetchPort;
    const base = `/api/branches/${encodeURIComponent(resource.branchId)}/inventory`;
    let response: Response;
    try { response = await fetchPort(method === "GET" ? `${base}/${encodeURIComponent(resource.productId)}` : `${base}/${path}`, {
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
    try {
      if (type !== "Success") invalid();
      return { ok: true, value: parse(own(envelope, "value")) };
    } catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
