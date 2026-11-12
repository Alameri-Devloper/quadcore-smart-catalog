import { publicShareFailureResponse, publicShareHeaders } from "../../../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
/** Public serving stays inactive until deployment admission/source adapters are separately configured.
 * Never assume Allow or trust raw forwarded headers. P7 owns the SSR page and release activation. */
export async function GET() {
  return publicShareFailureResponse({ ok: false, error: "ServiceUnavailable" }, "Media", "ar");
}
// Preserve the existing GET/implicit HEAD/OPTIONS method set, without enabling CORS.
const methodResponse = (status: 204 | 405) => {
  const headers = publicShareHeaders();
  headers.set("Allow", "GET, HEAD, OPTIONS");
  return new Response(null, { status, headers });
};
export const OPTIONS = () => methodResponse(204);
const methodNotAllowed = () => methodResponse(405);
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
