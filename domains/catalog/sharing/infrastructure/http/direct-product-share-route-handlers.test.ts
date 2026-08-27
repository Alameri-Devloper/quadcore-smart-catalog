import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticatedContextUnavailableError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { DirectProductSharePayload } from "../../domain/direct-product-share";
import type { DirectProductShareServerApplication } from "../direct-product-share-server-runtime";
import { createDirectProductShareRouteHandlers } from "./direct-product-share-route-handlers";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "actor-a", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const payload: DirectProductSharePayload = {
  productId: "product-a", productCode: "P-1", productName: "Product", price: { mode: "Retail", amountMinor: "0", currency: "USD" }, specifications: [], title: "Product", text: "Product\n\nPrice (Retail): 0.00 USD",
};

const request = (body: unknown = { priceMode: "Retail", locale: "en" }, origin = "https://catalog.test") => new Request("https://catalog.test/api/catalog/products/product-a/direct-share", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
});

const application = (options: {
  readonly originAllowed?: boolean;
  readonly resolve?: () => Promise<TrustedActorContext>;
  readonly result?: Readonly<Record<string, unknown>>;
} = {}) => ({
  context: { resolve: options.resolve ?? (async () => actor) },
  origin: { allows: () => options.originAllowed ?? true },
  create: { execute: async () => options.result ?? { ok: true, value: payload } },
  media: { execute: async () => ({ ok: true, value: { bytes: new Uint8Array([1, 2]), contentType: "image/webp", fileName: "p-1.webp" } }) },
  close: async () => undefined,
}) as unknown as DirectProductShareServerApplication;

describe("direct Product share HTTP boundary", () => {
  it("maps missing authentication to 401", async () => {
    const response = await createDirectProductShareRouteHandlers(() => application({ resolve: async () => { throw new AuthenticatedContextUnavailableError(); } })).create(request(), "product-a");
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { type: "AuthenticationRequired" });
  });

  it("enforces same-origin before preparing the payload", async () => {
    let called = false;
    const app = application({ originAllowed: false });
    (app.create.execute as unknown as () => Promise<never>) = async () => { called = true; throw new Error(); };
    const response = await createDirectProductShareRouteHandlers(() => app).create(request(undefined, "https://attacker.test"), "product-a");
    assert.equal(response.status, 403); assert.equal(called, false);
  });

  it("rejects malformed mode, locale, extra price, arbitrary media URL, and malformed JSON", async () => {
    const invalidBodies = [
      { priceMode: "ReferenceCost", locale: "en", retailPrice: "120000" },
      { priceMode: "Retail", locale: "fr" },
      { priceMode: "Retail", locale: "en", url: "https://attacker.test/file" },
      { priceMode: "Retail" },
    ];
    for (const body of invalidBodies) {
      const response = await createDirectProductShareRouteHandlers(() => application()).create(request(body), "product-a");
      if (Object.keys(body).some((key) => !["priceMode", "locale"].includes(key)) || !("locale" in body)) assert.equal(response.status, 400);
    }
    const malformed = new Request("https://catalog.test/api/catalog/products/product-a/direct-share", { method: "POST", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: "{" });
    assert.equal((await createDirectProductShareRouteHandlers(() => application()).create(malformed, "product-a")).status, 400);
  });

  it("accepts only the focused transport contract and returns private no-store", async () => {
    const response = await createDirectProductShareRouteHandlers(() => application()).create(request(), "product-a");
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json() as { value: unknown };
    assert.equal((body.value as DirectProductSharePayload).price.amountMinor, "0");
    assert.match((body.value as DirectProductSharePayload).text, /0\.00 USD/);
    const serialized = JSON.stringify(body.value);
    for (const forbidden of ["referenceCost", "cost", "onHand", "reserved", "damaged", "available", "workspaceId", "storageKey"]) assert.equal(serialized.includes(forbidden), false, forbidden);
  });

  it("maps authorization, safe not-found, and typed business outcomes", async () => {
    const cases = [
      ["Forbidden", 403], ["ProductNotFound", 404], ["BranchNotFound", 404], ["ProductIneligible", 422],
      ["BranchProductIneligible", 422], ["PriceUnavailable", 422], ["UnsupportedCurrencyForDirectShare", 422], ["InvalidInput", 400],
    ] as const;
    for (const [error, status] of cases) {
      const response = await createDirectProductShareRouteHandlers(() => application({ result: { ok: false, error } })).create(request(), "product-a");
      assert.equal(response.status, status, error);
    }
  });

  it("returns media with safe download headers and no internal path", async () => {
    const response = await createDirectProductShareRouteHandlers(() => application()).media(new Request("https://catalog.test/api/catalog/products/product-a/direct-share/media"), "product-a");
    assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(response.headers.get("content-disposition"), "attachment; filename=\"p-1.webp\"");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(JSON.stringify([...response.headers]).includes("storage"), false);
  });
});
