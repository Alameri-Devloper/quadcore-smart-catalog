import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { DirectProductShareResult } from "../../application/direct-product-share-results";
import type { DirectProductShareServerApplication } from "../direct-product-share-server-runtime";

type Open = () => DirectProductShareServerApplication;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
const statusOf = (error: string): number => error === "Forbidden" ? 403
  : error === "ProductNotFound" || error === "BranchNotFound" ? 404
    : error === "ProductIneligible" || error === "BranchProductIneligible" || error === "PriceUnavailable" || error === "UnsupportedCurrencyForDirectShare" || error === "PayloadTooLarge" || error === "MediaUnavailable" ? 422
      : 400;
const response = <T>(result: DirectProductShareResult<T>) => result.ok ? json({ type: "Success", value: result.value }) : json({ type: result.error }, statusOf(result.error));

const withApplication = async (
  open: Open,
  request: Request,
  work: (application: DirectProductShareServerApplication, context: TrustedActorContext) => Promise<Response>,
): Promise<Response> => {
  let application: DirectProductShareServerApplication | undefined;
  try {
    application = open();
    return await work(application, await application.context.resolve(request));
  } catch (error) {
    if (error instanceof AuthenticatedContextUnavailableError) return json({ type: "AuthenticationRequired" }, 401);
    if (error instanceof RestrictedSessionContextError) return json({ type: "ForbiddenForRestrictedSession" }, 403);
    return json({ type: "DirectProductShareServiceUnavailable" }, 503);
  } finally { try { await application?.close(); } catch {} }
};

const parseBody = async (request: Request): Promise<null | { readonly branchId?: string; readonly priceMode: string; readonly locale: string }> => {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  try {
    const value = await request.json() as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort().join(",");
    if (keys !== "locale,priceMode" && keys !== "branchId,locale,priceMode") return null;
    if (typeof record.priceMode !== "string" || typeof record.locale !== "string" || (record.branchId !== undefined && typeof record.branchId !== "string")) return null;
    return Object.freeze({ priceMode: record.priceMode, locale: record.locale, ...(typeof record.branchId === "string" ? { branchId: record.branchId } : {}) });
  } catch { return null; }
};

export const createDirectProductShareRouteHandlers = (open: Open) => Object.freeze({
  create: (request: Request, productId: string) => withApplication(open, request, async (application, context) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const input = await parseBody(request);
    return input ? response(await application.create.execute({ context, productId, input })) : json({ type: "InvalidInput" }, 400);
  }),
  media: (request: Request, productId: string) => withApplication(open, request, async (application, context) => {
    const result = await application.media.execute({ context, productId });
    if (!result.ok) return response(result);
    return new Response(Uint8Array.from(result.value.bytes).buffer, {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-type": result.value.contentType,
        "content-disposition": `attachment; filename="${result.value.fileName}"`,
        "content-length": String(result.value.bytes.byteLength),
        "x-content-type-options": "nosniff",
      },
    });
  }),
});
