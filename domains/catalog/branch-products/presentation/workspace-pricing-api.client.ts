import type {
  WorkspaceMoneyView, WorkspacePricingAction, WorkspacePricingFailure, WorkspacePricingField,
  WorkspacePricingManagementView, WorkspacePricingMutationAcknowledgement, WorkspacePricingPort,
  WorkspacePricingResult, WorkspacePricingSlot, WorkspaceReferenceCostSlot,
} from "./workspace-pricing.types";

export type WorkspacePricingFetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const has = (value: JsonObject, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const identity = (value: unknown, productId: string): string => value === productId ? productId : invalid();
const revision = (value: unknown): number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalid();
const amount = (value: unknown): string => typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)
  && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER) ? value : invalid();
const currency = (value: unknown): string => typeof value === "string" && /^[A-Z]{3}$/u.test(value) ? value : invalid();
const money = (value: unknown): WorkspaceMoneyView => {
  const row = object(value);
  return Object.freeze({ amountMinor: amount(own(row, "amountMinor")), currency: currency(own(row, "currency")) });
};
const actions = (value: unknown): readonly WorkspacePricingAction[] => {
  if (!Array.isArray(value) || value.some(action => action !== "Set" && action !== "Clear")) return invalid();
  return Object.freeze([...value] as WorkspacePricingAction[]);
};
const slot = (value: unknown): WorkspacePricingSlot => {
  const row = object(value), state = own(row, "state"), rawValue = own(row, "value"), allowedActions = actions(own(row, "allowedActions"));
  if (state === "Configured") return Object.freeze({ state, value: money(rawValue), allowedActions });
  if (state === "NotConfigured" && rawValue === null) return Object.freeze({ state, value: null, allowedActions });
  return invalid();
};
const referenceCostSlot = (value: unknown): WorkspaceReferenceCostSlot => {
  const row = object(value), base = slot(row), referenceCostRevision = revision(own(row, "referenceCostRevision"));
  if ((base.state === "NotConfigured" && referenceCostRevision !== 0) || (base.state === "Configured" && referenceCostRevision === 0)) invalid();
  return Object.freeze({ ...base, referenceCostRevision });
};

export const reconstructWorkspacePricing = (value: unknown, productId: string): WorkspacePricingManagementView => {
  const row = object(value), view: {
    productId: string; productRevision: number; retail?: WorkspacePricingSlot; wholesale?: WorkspacePricingSlot; referenceCost?: WorkspaceReferenceCostSlot;
  } = { productId: identity(own(row, "productId"), productId), productRevision: revision(own(row, "productRevision")) };
  if (has(row, "retail")) view.retail = slot(own(row, "retail"));
  if (has(row, "wholesale")) view.wholesale = slot(own(row, "wholesale"));
  if (has(row, "referenceCost")) view.referenceCost = referenceCostSlot(own(row, "referenceCost"));
  return Object.freeze(view);
};

const fields = new Set<WorkspacePricingField>(["Retail", "Wholesale", "ReferenceCost"]);
const reconstructAcknowledgement = (value: unknown, productId: string, field: WorkspacePricingField,
  expected: WorkspaceMoneyView | null): WorkspacePricingMutationAcknowledgement => {
  const row = object(value);
  identity(own(row, "productId"), productId);
  if (own(row, "priceType") !== field) invalid();
  const rawValue = own(row, "value");
  if (expected === null ? rawValue !== null : (() => { const parsed = money(rawValue); return parsed.amountMinor !== expected.amountMinor || parsed.currency !== expected.currency; })()) invalid();
  return Object.freeze({ productId, field });
};
const errors: Readonly<Record<string, readonly [number, WorkspacePricingFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  OriginNotAllowed: [403, "OriginNotAllowed"], Forbidden: [403, "Forbidden"], ProductNotFound: [404, "ProductNotFound"],
  ProductArchived: [400, "ProductArchived"], InvalidInput: [400, "InvalidInput"], CurrencyNotAllowed: [400, "CurrencyNotAllowed"],
  Conflict: [409, "Conflict"], BranchProductServiceUnavailable: [503, "BranchProductServiceUnavailable"],
};

export class WorkspacePricingApiClient implements WorkspacePricingPort {
  constructor(private readonly fetchPort: WorkspacePricingFetchPort = fetch) {}
  get(productId: string, signal?: AbortSignal) {
    return this.request(productId, null, "GET", undefined, value => reconstructWorkspacePricing(value, productId), signal);
  }
  set(productId: string, field: WorkspacePricingField, command: WorkspaceMoneyView & { readonly expectedRevision: number }, signal?: AbortSignal) {
    return this.request(productId, field, "PUT", command, value => reconstructAcknowledgement(value, productId, field, command), signal);
  }
  clear(productId: string, field: WorkspacePricingField, command: { readonly expectedRevision: number }, signal?: AbortSignal) {
    return this.request(productId, field, "DELETE", command, value => reconstructAcknowledgement(value, productId, field, null), signal);
  }
  private async request<T>(productId: string, field: WorkspacePricingField | null, method: "GET" | "PUT" | "DELETE",
    body: object | undefined, parse: (value: unknown) => T, signal?: AbortSignal): Promise<WorkspacePricingResult<T>> {
    if (field !== null && !fields.has(field)) return { ok: false, kind: "InvalidInput" };
    const fetchPort = this.fetchPort;
    let response: Response;
    const path = `/api/products/${encodeURIComponent(productId)}/pricing${field ? `/${field}` : ""}`;
    try { response = await fetchPort(path, { method, credentials: "same-origin", cache: "no-store", signal,
      headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }); } catch { return { ok: false, kind: "NetworkFailure" }; }
    let envelope: JsonObject, type: unknown;
    try { envelope = object(await response.json()); type = own(envelope, "type"); if (typeof type !== "string") invalid(); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const mapped = typeof type === "string" && has(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: mapped?.[0] === response.status ? mapped[1] : "UnexpectedResponse" };
    }
    if (response.status !== 200) return { ok: false, kind: "UnexpectedResponse" };
    try { if (type !== "Success") invalid(); return { ok: true, value: parse(own(envelope, "value")) }; }
    catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
