import type {
  BranchMoneyView, BranchPricingAction, BranchPricingFailure, BranchPricingField, BranchPricingManagementView,
  BranchPricingMutationAcknowledgement, BranchPricingPort, BranchPricingResult, BranchPricingSlot, BranchPricingValueSlot,
} from "./branch-pricing.types";

export type BranchPricingFetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const has = (value: JsonObject, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const identity = (value: unknown, expected: string): string => value === expected ? expected : invalid();
const revision = (value: unknown): number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : invalid();
const amount = (value: unknown): string => typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)
  && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER) ? value : invalid();
const currency = (value: unknown): string => typeof value === "string" && /^[A-Z]{3}$/u.test(value) ? value : invalid();
const money = (value: unknown): BranchMoneyView => {
  const row = object(value);
  return Object.freeze({ amountMinor: amount(own(row, "amountMinor")), currency: currency(own(row, "currency")) });
};
const sameMoney = (left: BranchMoneyView | null, right: BranchMoneyView | null) => left === null || right === null
  ? left === right : left.amountMinor === right.amountMinor && left.currency === right.currency;
const valueSlot = (value: unknown): BranchPricingValueSlot => {
  const row = object(value), state = own(row, "state"), rawValue = own(row, "value"), allowedActions = own(row, "allowedActions");
  if (!Array.isArray(allowedActions) || allowedActions.length !== 0) return invalid();
  if (state === "Configured") return Object.freeze({ state, value: money(rawValue), allowedActions: Object.freeze([] as const) });
  if (state === "NotConfigured" && rawValue === null) return Object.freeze({ state, value: null, allowedActions: Object.freeze([] as const) });
  return invalid();
};
const actions = (value: unknown): readonly BranchPricingAction[] => {
  if (!Array.isArray(value) || value.some(action => action !== "SetOverride" && action !== "ClearOverride") || new Set(value).size !== value.length) return invalid();
  return Object.freeze([...value] as BranchPricingAction[]);
};
const slot = (value: unknown): BranchPricingSlot => {
  const row = object(value), base = valueSlot(own(row, "base")), override = valueSlot(own(row, "override"));
  const overrideRevision = revision(own(row, "overrideRevision")), effective = own(row, "effective") === null ? null : money(own(row, "effective"));
  const source = own(row, "source"), allowedActions = actions(own(row, "allowedActions"));
  if ((override.state === "Configured") !== (overrideRevision > 0)) return invalid();
  if (source === "BranchOverride" && override.value && sameMoney(effective, override.value))
    return Object.freeze({ base, override, overrideRevision, effective, source, allowedActions });
  if (source === "WorkspaceBase" && override.value === null && base.value && sameMoney(effective, base.value))
    return Object.freeze({ base, override, overrideRevision, effective, source, allowedActions });
  if (source === "NotConfigured" && override.value === null && base.value === null && effective === null)
    return Object.freeze({ base, override, overrideRevision, effective, source, allowedActions });
  return invalid();
};

const fields = Object.freeze(["Retail", "Wholesale", "ReferenceCost"] as const);
export const reconstructBranchPricing = (value: unknown, branchId: string, productId: string): BranchPricingManagementView => {
  const row = object(value), rawPrices = object(own(row, "prices"));
  const prices: Partial<Record<BranchPricingField, BranchPricingSlot>> = {};
  for (const field of fields) if (has(rawPrices, field)) prices[field] = slot(own(rawPrices, field));
  const view: { branchId: string; productId: string; baseProductRevision?: number; baseReferenceCostRevision?: number;
    prices: Readonly<Partial<Record<BranchPricingField, BranchPricingSlot>>> } = {
      branchId: identity(own(row, "branchId"), branchId), productId: identity(own(row, "productId"), productId), prices: Object.freeze(prices),
    };
  if (has(row, "baseProductRevision")) view.baseProductRevision = revision(own(row, "baseProductRevision"));
  if (has(row, "baseReferenceCostRevision")) view.baseReferenceCostRevision = revision(own(row, "baseReferenceCostRevision"));
  return Object.freeze(view);
};

const reconstructAcknowledgement = (value: unknown, branchId: string, productId: string, field: BranchPricingField,
  expected: BranchMoneyView | null): BranchPricingMutationAcknowledgement => {
  const row = object(value);
  identity(own(row, "branchId"), branchId); identity(own(row, "productId"), productId);
  if (own(row, "priceType") !== field) invalid();
  const rawOverride = own(row, "override");
  if (expected === null) {
    if (rawOverride !== null) invalid();
    return Object.freeze({ branchId, productId, field, override: null });
  }
  const overrideRow = object(rawOverride), parsed = money(overrideRow), parsedRevision = revision(own(overrideRow, "revision"));
  if (parsedRevision === 0 || !sameMoney(parsed, expected)) invalid();
  return Object.freeze({ branchId, productId, field, override: Object.freeze({ ...parsed, revision: parsedRevision }) });
};

const errors: Readonly<Record<string, readonly [number, BranchPricingFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  OriginNotAllowed: [403, "OriginNotAllowed"], Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"],
  ProductNotFound: [404, "ProductNotFound"], BranchInactive: [400, "BranchInactive"], ProductArchived: [400, "ProductArchived"],
  InvalidInput: [400, "InvalidInput"], CurrencyNotAllowed: [400, "CurrencyNotAllowed"], Conflict: [409, "Conflict"],
  BranchProductServiceUnavailable: [503, "BranchProductServiceUnavailable"],
};

export class BranchPricingApiClient implements BranchPricingPort {
  constructor(private readonly fetchPort: BranchPricingFetchPort = fetch) {}
  get(branchId: string, productId: string, signal?: AbortSignal) {
    return this.request(branchId, productId, null, "GET", undefined, value => reconstructBranchPricing(value, branchId, productId), signal);
  }
  set(branchId: string, productId: string, field: BranchPricingField,
    command: BranchMoneyView & { readonly expectedRevision: number }, signal?: AbortSignal) {
    return this.request(branchId, productId, field, "PUT", command,
      value => reconstructAcknowledgement(value, branchId, productId, field, command), signal);
  }
  clear(branchId: string, productId: string, field: BranchPricingField,
    command: { readonly expectedRevision: number }, signal?: AbortSignal) {
    return this.request(branchId, productId, field, "DELETE", command,
      value => reconstructAcknowledgement(value, branchId, productId, field, null), signal);
  }
  private async request<T>(branchId: string, productId: string, field: BranchPricingField | null, method: "GET" | "PUT" | "DELETE",
    body: object | undefined, parse: (value: unknown) => T, signal?: AbortSignal): Promise<BranchPricingResult<T>> {
    if (field !== null && !fields.includes(field)) return { ok: false, kind: "InvalidInput" };
    const fetchPort = this.fetchPort;
    const root = `/api/branches/${encodeURIComponent(branchId)}/products/${encodeURIComponent(productId)}/pricing`;
    const path = field ? `${root}/${field}` : `${root}/management`;
    let response: Response;
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
