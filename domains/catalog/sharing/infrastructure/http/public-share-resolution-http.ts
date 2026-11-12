import type { ResolvePublicProductShare, PublicShareResolutionFailure } from "../../application/resolve-public-product-share";
import { publicShareView } from "../../presentation/public-share-view";
export const publicShareHeaders = () => new Headers({
  "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff",
});
export const publicShareFailureResponse = (failure: PublicShareResolutionFailure, route: "Page" | "Media", locale: "ar" | "en") => {
  const status = failure.error === "NotFound" ? 404 : failure.error === "AdmissionDenied" ? 429 : 503;
  const headers = publicShareHeaders();
  if (status === 429 && Number.isSafeInteger(failure.retryAfterSeconds) && failure.retryAfterSeconds! >= 0) headers.set("Retry-After", String(failure.retryAfterSeconds));
  if (route === "Media") { headers.set("Content-Type", "text/plain; charset=utf-8"); return new Response(null, { status, headers }); }
  headers.set("Content-Type", "text/html; charset=utf-8"); headers.set("X-Frame-Options", "DENY");
  headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
  const heading = status === 404 ? (locale === "ar" ? "المنتج غير متاح" : "Product unavailable")
    : status === 429 ? (locale === "ar" ? "غير متاح مؤقتاً" : "Temporarily unavailable")
    : locale === "ar" ? "الخدمة غير متاحة" : "Service unavailable";
  return new Response('<!doctype html><html lang="' + locale + '" dir="' + (locale === "ar" ? "rtl" : "ltr") + '"><head><title>' + heading
    + '</title></head><body><main lang="' + locale + '" dir="' + (locale === "ar" ? "rtl" : "ltr") + '"><h1>' + heading + '</h1></main></body></html>', { status, headers });
};
export interface PublicShareTrustedSourcePort { resolve(request: Request): Promise<string | null> }
export const publicShareLocale = (url: string): "ar" | "en" => {
  try { const values = new URL(url).searchParams.getAll("lang"); return values.length === 1 && values[0] === "en" ? "en" : "ar"; }
  catch { return "ar"; }
};
/** Native byte transport only. It never exports the internal projection as JSON. */
export const createPublicShareMediaGet = (resolver: ResolvePublicProductShare, source: PublicShareTrustedSourcePort) =>
  async (request: Request, token: unknown): Promise<Response> => {
    try {
      const identity = await source.resolve(request);
      const result = await resolver.resolveMedia(token, identity ?? "");
      const locale = publicShareLocale(request.url);
      if (!result.ok) return publicShareFailureResponse(result, "Media", locale);
      if (!publicShareView(result.value.projection, token as string, locale)) return publicShareFailureResponse({ ok: false, error: "NotFound" }, "Media", locale);
      const headers = publicShareHeaders(); headers.set("Content-Type", "image/webp");
      headers.set("Content-Length", String(result.value.bytes.byteLength));
      return new Response(new Uint8Array(result.value.bytes).buffer, { status: 200, headers });
    } catch { return publicShareFailureResponse({ ok: false, error: "ServiceUnavailable" }, "Media", "ar"); }
  };