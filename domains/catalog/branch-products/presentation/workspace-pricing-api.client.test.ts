import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WorkspacePricingApiClient, type WorkspacePricingFetchPort } from "./workspace-pricing-api.client";
import { workspacePricingFixture, workspacePricingSlotFixture } from "./mock/workspace-pricing.fixture";

const success = (value: unknown) => Response.json({ type: "Success", value });
const acknowledgement = (field: "Retail" | "Wholesale" | "ReferenceCost", value: unknown) => ({
  productId: "product-one", priceType: field, value,
});

describe("Workspace pricing Presentation client", () => {
  it("uses exact GET/PUT/DELETE routes, bodies, unbound fetch, same-origin, no-store and AbortSignal", async () => {
    const calls: { path: string; init: RequestInit }[] = [], signal = new AbortController().signal;
    const fetchPort: WorkspacePricingFetchPort = async function (this: unknown, input, init) {
      assert.equal(this, undefined); calls.push({ path: String(input), init: init! });
      if (init?.method === "GET") return success(workspacePricingFixture());
      const field = String(input).split("/").at(-1) as "Retail" | "Wholesale" | "ReferenceCost";
      const body = JSON.parse(String(init?.body));
      return success(acknowledgement(field, init?.method === "DELETE" ? null : { amountMinor: body.amountMinor, currency: body.currency, revision: 9 }));
    };
    const client = new WorkspacePricingApiClient(fetchPort);
    assert.equal((await client.get("product-one", signal)).ok, true);
    for (const field of ["Retail", "Wholesale", "ReferenceCost"] as const) {
      assert.equal((await client.set("product-one", field, { amountMinor: "0", currency: "USD", expectedRevision: 7 }, signal)).ok, true);
      assert.equal((await client.clear("product-one", field, { expectedRevision: 7 }, signal)).ok, true);
    }
    assert.deepEqual(calls.map(call => `${call.init.method} ${call.path}`), [
      "GET /api/products/product-one/pricing",
      "PUT /api/products/product-one/pricing/Retail", "DELETE /api/products/product-one/pricing/Retail",
      "PUT /api/products/product-one/pricing/Wholesale", "DELETE /api/products/product-one/pricing/Wholesale",
      "PUT /api/products/product-one/pricing/ReferenceCost", "DELETE /api/products/product-one/pricing/ReferenceCost",
    ]);
    for (const call of calls) {
      assert.equal(call.init.credentials, "same-origin"); assert.equal(call.init.cache, "no-store"); assert.equal(call.init.signal, signal);
    }
    assert.equal(calls[0]?.init.body, undefined);
    assert.deepEqual(JSON.parse(String(calls[1]?.init.body)), { amountMinor: "0", currency: "USD", expectedRevision: 7 });
    assert.deepEqual(JSON.parse(String(calls[2]?.init.body)), { expectedRevision: 7 });
  });

  it("preserves exact optional-slot omission, configured zero, NotConfigured and independent revisions", async () => {
    const retailOnly = workspacePricingFixture({
      retail: workspacePricingSlotFixture({ value: { amountMinor: "0", currency: "YER" } }),
      wholesale: undefined, referenceCost: undefined,
    });
    const first = await new WorkspacePricingApiClient(async () => success({ ...retailOnly, workspaceId: "discard", permissions: ["discard"] })).get("product-one");
    assert.equal(first.ok, true);
    if (first.ok) {
      assert.equal(first.value.productId, retailOnly.productId); assert.equal(first.value.productRevision, retailOnly.productRevision);
      assert.deepEqual(first.value.retail, retailOnly.retail);
      assert.equal("wholesale" in first.value, false); assert.equal("referenceCost" in first.value, false);
      assert.equal(JSON.stringify(first.value).includes("workspaceId"), false);
    }
    const referenceOnly = workspacePricingFixture({ retail: undefined, wholesale: undefined,
      referenceCost: { state: "NotConfigured", value: null, allowedActions: ["Set", "Clear"], referenceCostRevision: 0 } });
    const referenceResult = await new WorkspacePricingApiClient(async () => success(referenceOnly)).get("product-one");
    assert.equal(referenceResult.ok, true);
    if (referenceResult.ok) {
      assert.equal("retail" in referenceResult.value, false); assert.equal("wholesale" in referenceResult.value, false);
      assert.deepEqual(referenceResult.value.referenceCost, referenceOnly.referenceCost);
    }
  });

  it("rejects malformed slots, money, revisions, identities and mutation acknowledgements", async () => {
    const malformed = [
      null, {}, workspacePricingFixture({ productId: "other" }), workspacePricingFixture({ productRevision: -1 }),
      workspacePricingFixture({ retail: workspacePricingSlotFixture({ value: { amountMinor: "01", currency: "USD" } }) }),
      workspacePricingFixture({ retail: workspacePricingSlotFixture({ value: { amountMinor: "1", currency: "usd" } }) }),
      workspacePricingFixture({ retail: workspacePricingSlotFixture({ allowedActions: ["Set", "Delete" as "Set"] }) }),
      workspacePricingFixture({ referenceCost: { state: "NotConfigured", value: null, allowedActions: [], referenceCostRevision: 2 } }),
      workspacePricingFixture({ referenceCost: { state: "Configured", value: { amountMinor: "1", currency: "USD" }, allowedActions: [], referenceCostRevision: 0 } }),
    ];
    for (const value of malformed) assert.deepEqual(await new WorkspacePricingApiClient(async () => success(value)).get("product-one"),
      { ok: false, kind: "MalformedResponse" });
    const client = new WorkspacePricingApiClient(async () => success(acknowledgement("Wholesale", { amountMinor: "1", currency: "USD" })));
    assert.deepEqual(await client.set("product-one", "Retail", { amountMinor: "1", currency: "USD", expectedRevision: 1 }),
      { ok: false, kind: "MalformedResponse" });
  });

  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, ForbiddenForRestrictedSession: 403, OriginNotAllowed: 403,
    Forbidden: 403, ProductNotFound: 404, ProductArchived: 400, InvalidInput: 400, CurrencyNotAllowed: 400, Conflict: 409,
    BranchProductServiceUnavailable: 503 })) it(`normalizes ${kind}`, async () => {
    const client = new WorkspacePricingApiClient(async () => Response.json({ type: kind }, { status }));
    assert.deepEqual(await client.get("product-one"), { ok: false, kind });
    assert.deepEqual(await client.clear("product-one", "Retail", { expectedRevision: 1 }), { ok: false, kind });
  });

  it("normalizes network, malformed JSON, mismatched status and success envelopes", async () => {
    for (const [fetchPort, kind] of [
      [async () => { throw new Error("private"); }, "NetworkFailure"],
      [async () => new Response("not-json"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Success", value: workspacePricingFixture() }, { status: 201 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Other", value: workspacePricingFixture() }), "MalformedResponse"],
    ] as const) assert.deepEqual(await new WorkspacePricingApiClient(fetchPort).get("product-one"), { ok: false, kind });
  });
});
