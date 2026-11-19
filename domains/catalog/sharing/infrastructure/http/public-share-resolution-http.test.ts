import { NextRequest } from "next/server";
import * as mediaRoute from "../../../../../app/share/[token]/media/route";
import { autoImplementMethods } from "next/dist/server/route-modules/app-route/helpers/auto-implement-methods";
import assert from "node:assert/strict";
import { it } from "node:test";
import { publicShareResolutionFixture } from "../../mock/public-share-resolution.fixture";
import { createPublicShareMediaGet, publicShareFailureResponse, publicShareLocale } from "./public-share-resolution-http";
const request = (lang = "") => new Request("http://localhost/share/synthetic/media" + lang, { headers: { "x-forwarded-for": "untrusted", cookie: "ignored-session" } });
it("anonymous GET returns only WebP bytes, exact length and security headers; no 304 or redirect", async () => {
  const f = await publicShareResolutionFixture(); f.withImage();
  const get = createPublicShareMediaGet(f.resolver, { resolve: async () => "trusted-server-source" });
  const response = await get(request(), f.token);
  assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(response.headers.get("content-length"), "12"); assert.equal((await response.arrayBuffer()).byteLength, 12);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow"); assert.equal(response.headers.get("location"), null);
  const again = await get(new Request(request(), { headers: { "if-none-match": "*", "if-modified-since": new Date().toUTCString() } }), f.token);
  assert.equal(again.status, 200); assert.equal(f.state.snapshots, 2);
});
it("never trusts forwarded headers/cookies without a trusted source adapter", async () => {
  const f = await publicShareResolutionFixture();
  const response = await createPublicShareMediaGet(f.resolver, { resolve: async () => null })(request(), f.token);
  assert.equal(response.status, 503); assert.equal(f.state.lookups, 0); assert.equal(await response.text(), "");
});
for (const error of ["NotFound", "ServiceUnavailable", "AdmissionDenied"] as const) for (const locale of ["ar", "en"] as const)
  it(error + " has opaque native HTML without JavaScript in " + locale, async () => {
    const response = publicShareFailureResponse({ ok: false, error, retryAfterSeconds: 9 }, "Page", locale);
    assert.equal(response.status, error === "NotFound" ? 404 : error === "AdmissionDenied" ? 429 : 503);
    const headings = {
      NotFound: { en: "Product unavailable", ar: "المنتج غير متاح" },
      AdmissionDenied: { en: "Temporarily unavailable", ar: "غير متاح مؤقتاً" },
      ServiceUnavailable: { en: "Service unavailable", ar: "الخدمة غير متاحة" },
    };
    const html = await response.text();
    assert.ok(html.includes("<h1>" + headings[error][locale] + "</h1>"));
    assert.ok(html.includes("<title>" + headings[error][locale] + "</title>")); assert.ok(html.includes('<html lang="' + locale + '"'));
    assert.ok(html.includes(locale === "ar" ? 'dir="rtl"' : 'dir="ltr"')); assert.ok(html.includes('<main lang="' + locale + '" dir="' + (locale === "ar" ? "rtl" : "ltr") + '"><h1>'));
    for (const forbidden of ["<script", "login", "workspaceId", "grantId", "ServiceUnavailable", "AdmissionDenied"]) assert.ok(!html.includes(forbidden));
    assert.equal(response.headers.get("content-security-policy"), "frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
  });
it("media errors have no WebP claim or body and unsafe retry values are omitted", async () => {
  for (const retryAfterSeconds of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    const response = publicShareFailureResponse({ ok: false, error: "AdmissionDenied", retryAfterSeconds }, "Media", "ar");
    assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), null);
    assert.ok(!response.headers.get("content-type")!.includes("image/")); assert.equal(await response.text(), "");
  }
});
it("locale is presentation-only and invalid/repeated inputs choose Arabic", () => {
  for (const query of ["", "?lang=xx", "?lang=en&lang=en", "?lang=ar"]) assert.equal(publicShareLocale("http://localhost/" + query), "ar");
  assert.equal(publicShareLocale("http://localhost/?lang=en"), "en");
});
const requiredHeaders = {
  "cache-control": "private, no-store", "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff",
};
for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const)
  it("route framework " + method + " retains security headers without CORS or method bypass", async () => {
    const handlers = autoImplementMethods(mediaRoute);
    const response = await handlers[method](new NextRequest("http://localhost/share/synthetic/media", {
      method, headers: { Origin: "https://untrusted.example", "Access-Control-Request-Method": "GET", "x-forwarded-for": "untrusted" },
    }), { params: Promise.resolve({ token: "synthetic" }) });
    assert.ok(response instanceof Response);
    assert.equal(response.status, method === "GET" || method === "HEAD" ? 503 : method === "OPTIONS" ? 204 : 405);
    for (const [name, value] of Object.entries(requiredHeaders)) assert.equal(response.headers.get(name), value);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("location"), null);
    assert.ok(![...response.headers.keys()].some(name => name.startsWith("access-control-")));
    if (method !== "GET" && method !== "HEAD") assert.equal(response.headers.get("allow"), "GET, HEAD, OPTIONS");
  });
for (const error of ["NotFound", "AdmissionDenied", "ServiceUnavailable"] as const)
  it("media " + error + " remains empty and carries the complete header set", async () => {
    const response = publicShareFailureResponse({ ok: false, error, retryAfterSeconds: 9 }, "Media", "en");
    assert.equal(response.status, error === "NotFound" ? 404 : error === "AdmissionDenied" ? 429 : 503);
    for (const [name, value] of Object.entries(requiredHeaders)) assert.equal(response.headers.get(name), value);
    assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
    assert.equal(response.headers.get("retry-after"), error === "AdmissionDenied" ? "9" : null);
    assert.equal(await response.text(), "");
  });
