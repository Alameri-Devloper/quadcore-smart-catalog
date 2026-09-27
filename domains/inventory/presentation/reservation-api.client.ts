import { reconstructInventoryRead, type FetchPort } from "./inventory-api.client";
import type { InventoryAvailability, InventoryQuantityView } from "./inventory.types";
import type { ReservationAction, ReservationCollectionRequest, ReservationDetailRequest, ReservationFailure,
  ReservationManagementView, ReservationMutationTarget, ReservationMutationView, ReservationPageView, ReservationPort,
  ReservationQuantityRequest, ReservationResult, ReservationStatus, ReserveRequest } from "./reservation.types";

type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const has = (value: JsonObject, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const text = (value: unknown): string => typeof value === "string" ? value : invalid();
const identity = (value: unknown): string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(value) ? value : invalid();
const quantity = (value: unknown): string => typeof value === "string" && /^(0|[1-9][0-9]*)$/u.test(value) ? value : invalid();
const timestamp = (value: unknown): string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(value)
  && Number.isFinite(Date.parse(value)) ? value : invalid();
const status = (value: unknown): ReservationStatus => value === "Active" || value === "PartiallyFulfilled" || value === "Fulfilled" || value === "Released" ? value : invalid();
const action = (value: unknown): ReservationAction => value === "Release" || value === "Fulfill" ? value : invalid();
const availability = (value: unknown): InventoryAvailability => value === "InStock" || value === "OutOfStock" ? value : invalid();

export const reconstructReservation = (value: unknown, expected: { readonly branchId: string; readonly productId?: string; readonly reservationId?: string }): ReservationManagementView => {
  const row = object(value), reservationId = identity(own(row, "reservationId")), branchId = identity(own(row, "branchId")), productId = identity(own(row, "productId"));
  if (branchId !== expected.branchId || expected.productId && productId !== expected.productId || expected.reservationId && reservationId !== expected.reservationId) invalid();
  const rawActions = own(row, "allowedActions"); if (!Array.isArray(rawActions)) invalid();
  const allowedActions = (rawActions as unknown[]).map(action); if (new Set(allowedActions).size !== allowedActions.length) invalid();
  return Object.freeze({ reservationId, branchId, productId, status: status(own(row, "status")), quantity: quantity(own(row, "quantity")),
    remainingQuantity: quantity(own(row, "remainingQuantity")), createdAt: timestamp(own(row, "createdAt")), updatedAt: timestamp(own(row, "updatedAt")),
    allowedActions: Object.freeze(allowedActions) });
};

export const reconstructReservationPage = (value: unknown, request: ReservationCollectionRequest): ReservationPageView => {
  const row = object(value), items = own(row, "items"), nextCursor = own(row, "nextCursor"); if (!Array.isArray(items)) invalid();
  const parsed = (items as unknown[]).map(item => reconstructReservation(item, request));
  if (parsed.some(item => item.status !== "Active" && item.status !== "PartiallyFulfilled")) invalid();
  return Object.freeze({ items: Object.freeze(parsed), nextCursor: nextCursor === null ? null : text(nextCursor) });
};

const reconstructReservationMutation = (value: unknown, target: { readonly branchId: string; readonly productId: string }, requestedOperationId: string,
  acceptedStatuses: readonly ReservationStatus[]): ReservationMutationView => {
  const row = object(value), operationId = text(own(row, "operationId")), reservationId = identity(own(row, "reservationId")), reservationStatus = status(own(row, "reservationStatus"));
  if (operationId !== requestedOperationId || own(row, "status") !== "Succeeded" || !acceptedStatuses.includes(reservationStatus)) invalid();
  const base = { operationId, status: "Succeeded" as const, reservationId, reservationStatus, remainingQuantity: quantity(own(row, "remainingQuantity")) };
  const hasBalance = has(row, "balance"), hasAvailability = has(row, "availability"); if (hasBalance && hasAvailability) invalid();
  if (hasBalance) {
    const balance = reconstructInventoryRead(own(row, "balance"), target); if (!("quantities" in balance)) invalid();
    return Object.freeze({ ...base, balance: balance as InventoryQuantityView });
  }
  if (hasAvailability) return Object.freeze({ ...base, availability: availability(own(row, "availability")) });
  return Object.freeze(base);
};

const errors: Readonly<Record<string, readonly [number, ReservationFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"], OriginNotAllowed: [403, "OriginNotAllowed"],
  Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"], ProductNotFound: [404, "ProductNotFound"], ReservationNotFound: [404, "ReservationNotFound"],
  BranchInactive: [400, "BranchInactive"], ProductArchived: [400, "ProductArchived"], InvalidQuantity: [400, "InvalidQuantity"], InvalidInput: [400, "InvalidInput"],
  InvalidCursor: [400, "InvalidCursor"], InsufficientAvailableStock: [400, "InsufficientAvailableStock"], ReservationNotActive: [400, "ReservationNotActive"],
  InventoryConflict: [409, "InventoryConflict"], IdempotencyConflict: [409, "IdempotencyConflict"], InventoryServiceUnavailable: [503, "InventoryServiceUnavailable"],
};

export class ReservationApiClient implements ReservationPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  list(request: ReservationCollectionRequest, signal?: AbortSignal) {
    const query = new URLSearchParams({ productId: request.productId });
    if (request.cursor !== undefined) query.set("cursor", request.cursor);
    if (request.limit !== undefined) {
      if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 60) return Promise.resolve({ ok: false as const, kind: "InvalidInput" as const });
      query.set("limit", String(request.limit));
    }
    return this.request(`/api/branches/${encodeURIComponent(request.branchId)}/inventory/reservations?${query}`, "GET", 200,
      value => reconstructReservationPage(value, request), undefined, signal);
  }
  detail(request: ReservationDetailRequest, signal?: AbortSignal) {
    return this.request(`/api/branches/${encodeURIComponent(request.branchId)}/inventory/reservations/${encodeURIComponent(request.reservationId)}`, "GET", 200,
      value => reconstructReservation(value, request), undefined, signal);
  }
  reserve(resource: { readonly branchId: string; readonly productId: string }, command: ReserveRequest, signal?: AbortSignal) {
    return this.request(`/api/branches/${encodeURIComponent(resource.branchId)}/inventory/reservations`, "POST", 201,
      value => reconstructReservationMutation(value, resource, command.operationId, ["Active"]), command, signal);
  }
  release(target: ReservationMutationTarget, command: ReservationQuantityRequest, signal?: AbortSignal) {
    return this.mutate(target, "release", command, ["Active", "Released"], signal);
  }
  fulfill(target: ReservationMutationTarget, command: ReservationQuantityRequest, signal?: AbortSignal) {
    return this.mutate(target, "fulfill", command, ["PartiallyFulfilled", "Fulfilled"], signal);
  }
  private mutate(target: ReservationMutationTarget, actionName: "release" | "fulfill", command: ReservationQuantityRequest,
    acceptedStatuses: readonly ReservationStatus[], signal?: AbortSignal) {
    return this.request(`/api/branches/${encodeURIComponent(target.branchId)}/inventory/reservations/${encodeURIComponent(target.reservationId)}/${actionName}`, "POST", 200,
      value => reconstructReservationMutation(value, target, command.operationId, acceptedStatuses), command, signal);
  }
  private async request<T>(path: string, method: "GET" | "POST", successStatus: number, parse: (value: unknown) => T,
    body?: ReserveRequest | ReservationQuantityRequest, signal?: AbortSignal): Promise<ReservationResult<T>> {
    const fetchPort = this.fetchPort; let response: Response;
    try { response = await fetchPort(path, { method, credentials: "same-origin", cache: "no-store", signal,
      headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { return { ok: false, kind: "NetworkFailure" }; }
    let envelope: JsonObject, type: unknown;
    try { envelope = object(await response.json()); type = own(envelope, "type"); if (typeof type !== "string") invalid(); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const mapped = typeof type === "string" && Object.prototype.hasOwnProperty.call(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: mapped?.[0] === response.status ? mapped[1] : "UnexpectedResponse" };
    }
    if (response.status !== successStatus) return { ok: false, kind: "UnexpectedResponse" };
    try { if (type !== "Success") invalid(); return { ok: true, value: parse(own(envelope, "value")) }; }
    catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
