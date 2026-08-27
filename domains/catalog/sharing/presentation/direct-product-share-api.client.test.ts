import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DirectProductSharePayload } from "../domain/direct-product-share";
import { DirectProductShareApiClient } from "./direct-product-share-api.client";

const payload: DirectProductSharePayload = { productId: "product-a", productCode: "P-1", productName: "Product", price: { mode: "Retail", amountMinor: "5", currency: "USD" }, specifications: [], title: "Product", text: "Product" };

describe("DirectProductShareApiClient", () => {
  it("sends only requested resource context, price mode, and fixed locale", async () => {
    let body = ""; let credentials: RequestCredentials | undefined;
    const client = new DirectProductShareApiClient(async (_input, init) => { body = String(init?.body); credentials = init?.credentials; return Response.json({ type: "Success", value: payload }); });
    const result = await client.prepare({ productId: "product-a", branchId: "branch-a", priceMode: "Retail", locale: "en" });
    assert.equal(result.ok, true); assert.equal(credentials, "same-origin");
    assert.deepEqual(JSON.parse(body), { branchId: "branch-a", priceMode: "Retail", locale: "en" });
    for (const forbidden of ["workspaceId", "actorId", "permissions", "amountMinor", "url", "storageKey"]) assert.equal(body.includes(forbidden), false);
  });

  it("degrades to text-only when optional media download fails", async () => {
    const withMedia = { ...payload, mainMedia: { downloadUrl: "/safe-media", contentType: "image/webp" as const, fileName: "p.webp" } };
    let calls = 0;
    const client = new DirectProductShareApiClient(async () => ++calls === 1 ? Response.json({ type: "Success", value: withMedia }) : new Response(null, { status: 404 }));
    const result = await client.prepare({ productId: "product-a", priceMode: "Retail", locale: "en" });
    assert.equal(result.ok, true); assert.equal(result.ok && result.file, undefined);
  });
});
