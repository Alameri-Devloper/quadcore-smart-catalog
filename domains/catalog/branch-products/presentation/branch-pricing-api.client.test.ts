import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BranchPricingApiClient, type BranchPricingFetchPort } from "./branch-pricing-api.client";
import { branchPricingFixture, branchPricingSlotFixture, branchPricingValueFixture } from "./mock/branch-pricing.fixture";

const success = (value: unknown) => Response.json({ type: "Success", value });
const acknowledgement = (field: "Retail" | "Wholesale" | "ReferenceCost", override: unknown) => ({
  branchId: "branch-main", productId: "product-one", priceType: field, override,
});

describe("Branch pricing Presentation client", () => {
  it("uses the exact management and override routes, bodies, unbound fetch, no-store, credentials, and signal", async () => {
    const calls: { path: string; init: RequestInit }[] = [], signal = new AbortController().signal;
    const fetchPort: BranchPricingFetchPort = async function (this: unknown, input, init) {
      assert.equal(this, undefined); calls.push({ path: String(input), init: init! });
      if (init?.method === "GET") return success(branchPricingFixture());
      const field = String(input).split("/").at(-1) as "Retail" | "Wholesale" | "ReferenceCost", body = JSON.parse(String(init?.body));
      return success(acknowledgement(field, init?.method === "DELETE" ? null
        : { amountMinor: body.amountMinor, currency: body.currency, revision: body.expectedRevision + 1 }));
    };
    const client = new BranchPricingApiClient(fetchPort);
    assert.equal((await client.get("branch-main", "product-one", signal)).ok, true);
    for (const field of ["Retail", "Wholesale", "ReferenceCost"] as const) {
      assert.equal((await client.set("branch-main", "product-one", field,
        { amountMinor: "0", currency: "USD", expectedRevision: 3 }, signal)).ok, true);
      assert.equal((await client.clear("branch-main", "product-one", field, { expectedRevision: 3 }, signal)).ok, true);
    }
    assert.deepEqual(calls.map(call => `${call.init.method} ${call.path}`), [
      "GET /api/branches/branch-main/products/product-one/pricing/management",
      "PUT /api/branches/branch-main/products/product-one/pricing/Retail", "DELETE /api/branches/branch-main/products/product-one/pricing/Retail",
      "PUT /api/branches/branch-main/products/product-one/pricing/Wholesale", "DELETE /api/branches/branch-main/products/product-one/pricing/Wholesale",
      "PUT /api/branches/branch-main/products/product-one/pricing/ReferenceCost", "DELETE /api/branches/branch-main/products/product-one/pricing/ReferenceCost",
    ]);
    for (const call of calls) {
      assert.equal(call.init.credentials, "same-origin"); assert.equal(call.init.cache, "no-store"); assert.equal(call.init.signal, signal);
    }
    assert.equal(calls[0]?.init.body, undefined);
    assert.deepEqual(JSON.parse(String(calls[1]?.init.body)), { amountMinor: "0", currency: "USD", expectedRevision: 3 });
    assert.deepEqual(JSON.parse(String(calls[2]?.init.body)), { expectedRevision: 3 });
  });

  it("preserves strict partial field omission while retaining configured zero, absence, sources, and independent revisions", async () => {
    const reference = branchPricingSlotFixture({
      base: branchPricingValueFixture({ state: "NotConfigured", value: null }),
      override: branchPricingValueFixture({ value: { amountMinor: "0", currency: "YER" } }),
      overrideRevision: 8, effective: { amountMinor: "0", currency: "YER" }, source: "BranchOverride",
    });
    const value = branchPricingFixture({ baseProductRevision: undefined, baseReferenceCostRevision: 0,
      prices: { ReferenceCost: reference } });
    const result = await new BranchPricingApiClient(async () => success({ ...value, permissions: ["discard"], workspaceId: "discard" }))
      .get("branch-main", "product-one");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal("baseProductRevision" in result.value, false); assert.equal(result.value.baseReferenceCostRevision, 0);
      assert.equal("Retail" in result.value.prices, false); assert.equal("Wholesale" in result.value.prices, false);
      assert.deepEqual(result.value.prices.ReferenceCost, reference);
      assert.equal(JSON.stringify(result.value).includes("permissions"), false);
    }
  });

  it("rejects malformed identities, money, action/source combinations, revision coupling, and acknowledgements", async () => {
    const malformed = [
      null, {}, branchPricingFixture({ branchId: "other" }), branchPricingFixture({ productId: "other" }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ overrideRevision: -1 }) } }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ overrideRevision: 0 }) } }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ effective: { amountMinor: "01", currency: "USD" } }) } }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ allowedActions: ["SetOverride", "SetOverride"] }) } }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ source: "WorkspaceBase" }) } }),
      branchPricingFixture({ prices: { Retail: branchPricingSlotFixture({ base: { state: "Configured", value: { amountMinor: "1", currency: "USD" }, allowedActions: ["Set"] } as never }) } }),
    ];
    for (const value of malformed) assert.deepEqual(await new BranchPricingApiClient(async () => success(value)).get("branch-main", "product-one"),
      { ok: false, kind: "MalformedResponse" });
    const client = new BranchPricingApiClient(async () => success(acknowledgement("Wholesale", { amountMinor: "1", currency: "USD", revision: 1 })));
    assert.deepEqual(await client.set("branch-main", "product-one", "Retail", { amountMinor: "1", currency: "USD", expectedRevision: 0 }),
      { ok: false, kind: "MalformedResponse" });
  });

  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, ForbiddenForRestrictedSession: 403, OriginNotAllowed: 403,
    Forbidden: 403, BranchNotFound: 404, ProductNotFound: 404, BranchInactive: 400, ProductArchived: 400,
    InvalidInput: 400, CurrencyNotAllowed: 400, Conflict: 409, BranchProductServiceUnavailable: 503 })) it(`normalizes ${kind}`, async () => {
    const client = new BranchPricingApiClient(async () => Response.json({ type: kind }, { status }));
    assert.deepEqual(await client.get("branch-main", "product-one"), { ok: false, kind });
    assert.deepEqual(await client.clear("branch-main", "product-one", "Retail", { expectedRevision: 1 }), { ok: false, kind });
  });

  it("normalizes network, malformed JSON, mismatched status, and invalid success envelopes", async () => {
    for (const [fetchPort, kind] of [
      [async () => { throw new Error("private"); }, "NetworkFailure"],
      [async () => new Response("not-json"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Success", value: branchPricingFixture() }, { status: 201 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Other", value: branchPricingFixture() }), "MalformedResponse"],
    ] as const) assert.deepEqual(await new BranchPricingApiClient(fetchPort).get("branch-main", "product-one"), { ok: false, kind });
  });
});
