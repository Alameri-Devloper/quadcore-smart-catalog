import type { PublicShareManagementClientPort, PublicShareManagementFailure, PublicShareManagementOperation, PublicShareManagementResult } from "./public-product-share-management.types";
type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const errors: Readonly<Record<string, number>> = { AuthenticationRequired: 401, ForbiddenForRestrictedSession: 403, PermissionDenied: 403, BranchScopeDenied: 403, OriginNotAllowed: 403, NotFound: 404, NoActiveGrant: 404, IssueIneligible: 409, ReplacementIneligible: 409, ExpectedCurrentGrantConflict: 409, InvalidInput: 400, BodyTooLarge: 413, KeyUnavailable: 503, IntegrityFailure: 503, ServiceUnavailable: 503, AdmissionDenied: 429 };
const unavailable = (): PublicShareManagementResult => ({ ok: false, error: "ServiceUnavailable" });
const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.trim() === value;
const validUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash && /^\/share\/[A-Za-z0-9_-]{43}$/.test(url.pathname) && url.href === value; } catch { return false; }
};
export class PublicProductShareManagementApiClient implements PublicShareManagementClientPort {
  constructor(private readonly fetchPort: Fetch = fetch) {}
  async execute(operation: PublicShareManagementOperation, input: { readonly productId: string; readonly branchId?: string; readonly grantId?: string }, signal: AbortSignal): Promise<PublicShareManagementResult> {
    if ((operation !== "revoke" && (!id(input.productId) || !id(input.branchId))) || (["revoke", "replace"].includes(operation) && !id(input.grantId))) return { ok: false, error: "InvalidInput" };
    const tuple = "/api/catalog/products/" + encodeURIComponent(input.productId) + "/branches/" + encodeURIComponent(input.branchId ?? "") + "/public-share";
    const path = operation === "revoke" ? "/api/catalog/public-share-grants/" + encodeURIComponent(input.grantId!) + "/revoke" : operation === "replace" ? tuple + "/replace" : tuple;
    try {
      const fetchPort = this.fetchPort;
      const response = await fetchPort(path, { method: operation === "copy" ? "GET" : "POST", credentials: "same-origin", cache: "no-store", signal,
        headers: { accept: "application/json", ...(operation === "copy" ? {} : { "content-type": "application/json" }) },
        ...(operation === "copy" ? {} : { body: JSON.stringify(operation === "replace" ? { expectedCurrentGrantId: input.grantId } : {}) }) });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return unavailable();
      const value = payload as Record<string, unknown>;
      if (response.status !== 200) {
        if (typeof value.type === "string" && errors[value.type] === response.status && Object.keys(value).length === 1) return { ok: false, error: value.type as PublicShareManagementFailure };
        return unavailable();
      }
      const permitted = operation === "issue" ? ["Created", "Reused"] : operation === "copy" ? ["Found"] : operation === "replace" ? ["Replaced"] : ["Revoked", "AlreadyRevoked"];
      if (typeof value.type !== "string" || !permitted.includes(value.type) || !id(value.grantId)) return unavailable();
      if (operation === "revoke") return Object.keys(value).sort().join(",") === "grantId,type" ? { ok: true, type: value.type as "Revoked" | "AlreadyRevoked", grantId: value.grantId } : unavailable();
      return Object.keys(value).sort().join(",") === "grantId,type,url" && validUrl(value.url)
        ? { ok: true, type: value.type as "Created" | "Reused" | "Found" | "Replaced", grantId: value.grantId, url: value.url } : unavailable();
    } catch { return unavailable(); }
  }
}
