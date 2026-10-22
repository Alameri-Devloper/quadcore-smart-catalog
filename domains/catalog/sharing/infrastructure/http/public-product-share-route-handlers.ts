import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { PublicProductShareServerApplication } from "../public-product-share-server-runtime";
import type { PublicShareManagementResult } from "../../application/public-product-share.types";
import type { PublicShareLinkResult, PublicShareRevokeResult } from "../../application/public-product-share.use-cases";
type Application = Omit<PublicProductShareServerApplication, "context"> & { readonly context: { resolve(request: Request): Promise<TrustedActorContext> } };
type Open = () => Application;
const json = (value: unknown, status: number, extraHeaders: Record<string, string> = {}) => Response.json(value, { status, headers: {
  ...extraHeaders, "cache-control": "private, no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff",
} });
const statusOf = (error: string) => error === "AuthenticationRequired" ? 401
  : ["ForbiddenForRestrictedSession", "PermissionDenied", "BranchScopeDenied", "OriginNotAllowed"].includes(error) ? 403
  : ["NotFound", "NoActiveGrant"].includes(error) ? 404
  : ["IssueIneligible", "ReplacementIneligible", "ExpectedCurrentGrantConflict"].includes(error) ? 409
  : error === "BodyTooLarge" ? 413 : error === "InvalidInput" ? 400 : 503;
const response = (result: PublicShareManagementResult<PublicShareLinkResult | PublicShareRevokeResult>) => {
  if (!result.ok) {
    if (result.error === "AdmissionDenied") {
      if (!Number.isFinite(result.retryAfterSeconds)) return json({ type: "ServiceUnavailable" }, 503);
      return json({ type: "AdmissionDenied" }, 429, { "retry-after": String(Math.max(1, Math.min(60, Math.ceil(result.retryAfterSeconds)))) });
    }
    return json({ type: result.error }, statusOf(result.error));
  }
  const value = result.value;
  return json({ type: value.outcome === "Copied" ? "Found" : value.outcome, grantId: value.grantId,
    ...("url" in value ? { url: value.url } : {}) }, 200);
};
const body = async (request: Request, replace: boolean): Promise<{ readonly expectedCurrentGrantId?: string } | "InvalidInput" | "BodyTooLarge"> => {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || !request.body) return "InvalidInput";
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > 4096) { await reader.cancel().catch(() => undefined); return "BodyTooLarge"; }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) return "InvalidInput";
    const record = value as Record<string, unknown>, keys = Object.keys(record);
    if (!replace) return keys.length === 0 ? {} : "InvalidInput";
    return keys.length === 1 && keys[0] === "expectedCurrentGrantId" && typeof record.expectedCurrentGrantId === "string"
      && record.expectedCurrentGrantId.length > 0 && record.expectedCurrentGrantId.trim() === record.expectedCurrentGrantId
      ? { expectedCurrentGrantId: record.expectedCurrentGrantId } : "InvalidInput";
  } catch { return "InvalidInput"; } finally { reader.releaseLock(); }
};
const withApplication = async (open: Open, request: Request, work: (application: Application, context: TrustedActorContext) => Promise<Response>) => {
  let application: Application | undefined;
  try {
    application = open();
    const context = await application.context.resolve(request);
    if (new URL(request.url).search) return json({ type: "InvalidInput" }, 400);
    return await work(application, context);
  } catch (error) {
    if (error instanceof AuthenticatedContextUnavailableError) return json({ type: "AuthenticationRequired" }, 401);
    if (error instanceof RestrictedSessionContextError) return json({ type: "ForbiddenForRestrictedSession" }, 403);
    return json({ type: "ServiceUnavailable" }, 503);
  } finally { try { await application?.close(); } catch {} }
};
export const createPublicProductShareRouteHandlers = (open: Open) => ({
  copy: (request: Request, productId: string, branchId: string) => withApplication(open, request, async (application, context) =>
    response(await application.management.copy({ context, productId, branchId }))),
  issue: (request: Request, productId: string, branchId: string) => withApplication(open, request, async (application, context) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const input = await body(request, false);
    return typeof input === "string" ? json({ type: input }, statusOf(input)) : response(await application.management.issue({ context, productId, branchId }));
  }),
  revoke: (request: Request, grantId: string) => withApplication(open, request, async (application, context) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const input = await body(request, false);
    return typeof input === "string" ? json({ type: input }, statusOf(input)) : response(await application.management.revoke({ context, grantId }));
  }),
  replace: (request: Request, productId: string, branchId: string) => withApplication(open, request, async (application, context) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const input = await body(request, true);
    return typeof input === "string" || !input.expectedCurrentGrantId ? json({ type: typeof input === "string" ? input : "InvalidInput" }, typeof input === "string" ? statusOf(input) : 400)
      : response(await application.management.replace({ context, productId, branchId, expectedCurrentGrantId: input.expectedCurrentGrantId }));
  }),
});
