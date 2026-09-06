import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import { createBranchProductRouteHandlers } from "./branch-product-route-handlers";
import type { BranchProductServerApplication } from "../branch-product-server-runtime";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "actor-a", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const request = (body: unknown) => new Request("https://catalog.test/api", { method: "PUT", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: JSON.stringify(body) });
const open = (
  result: Readonly<Record<string, unknown>> = { ok: true, value: { priceType: "Retail" } },
  resolve = async () => actor,
  serviceFailure = false,
) => () => {
  const execute = async () => {
    if (serviceFailure) throw new Error("sensitive infrastructure detail");
    return result;
  };
  return {
    context: { resolve },
    origin: { allows: () => true },
    getOperational: { execute },
    getListing: { execute },
    setListing: { execute },
    getPricing: { execute },
    getWorkspacePricingManagement: { execute },
    getBranchPricingManagement: { execute },
    setBasePrice: { execute },
    clearBasePrice: { execute },
    setOverride: { execute },
    clearOverride: { execute },
    close: async () => undefined,
  } as unknown as BranchProductServerApplication;
};

describe("Branch Product HTTP boundary", () => {
  it("requires server authentication and decimal-string Money", async () => { const unauthenticated = await createBranchProductRouteHandlers(open({}, async () => { throw new AuthenticatedContextUnavailableError(); })).setBasePrice(request({ amountMinor: "1", currency: "USD", expectedRevision: 0 }), "product-a", "Retail"); assert.equal(unauthenticated.status, 401); const malformed = await createBranchProductRouteHandlers(open()).setBasePrice(request({ amountMinor: 1, currency: "USD", expectedRevision: 0 }), "product-a", "Retail"); assert.equal(malformed.status, 400); });
  it("maps permission, tenant-safe not-found, optimistic conflict, and success", async () => { assert.equal((await createBranchProductRouteHandlers(open({ ok: false, error: "Forbidden" })).setOverride(request({ amountMinor: "1", currency: "USD", expectedRevision: 0 }), "branch-a", "product-a", "Retail")).status, 403); assert.equal((await createBranchProductRouteHandlers(open({ ok: false, error: "BranchNotFound" })).setOverride(request({ amountMinor: "1", currency: "USD", expectedRevision: 0 }), "branch-a", "product-a", "Retail")).status, 404); assert.equal((await createBranchProductRouteHandlers(open({ ok: false, error: "Conflict" })).setOverride(request({ amountMinor: "1", currency: "USD", expectedRevision: 0 }), "branch-a", "product-a", "Retail")).status, 409); assert.equal((await createBranchProductRouteHandlers(open()).setOverride(request({ amountMinor: "1", currency: "USD", expectedRevision: 0 }), "branch-a", "product-a", "Retail")).status, 200); });
  it("serves the Listing management-state read privately and rejects query input",async()=>{const handlers=createBranchProductRouteHandlers(open({ok:true,value:{branchId:"branch-a",productId:"product-a",listingStatus:"NotConfigured",revision:0,updatedAt:null,allowedActions:["SetListed","SetUnlisted"]}}));const response=await handlers.getListing(new Request("https://catalog.test/api/branches/branch-a/products/product-a/listing"),"branch-a","product-a");assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal((await handlers.getListing(new Request("https://catalog.test/api/branches/branch-a/products/product-a/listing?workspaceId=x"),"branch-a","product-a")).status,400);});
  it("maps Listing authentication, explicit permission failure, and scoped non-disclosure",async()=>{const read=new Request("https://catalog.test/api/branches/branch-a/products/product-a/listing");assert.equal((await createBranchProductRouteHandlers(open({},async()=>{throw new AuthenticatedContextUnavailableError()})).getListing(read,"branch-a","product-a")).status,401);assert.equal((await createBranchProductRouteHandlers(open({ok:false,error:"Forbidden"})).getListing(read,"branch-a","product-a")).status,403);assert.equal((await createBranchProductRouteHandlers(open({ok:false,error:"ProductNotFound"})).getListing(read,"branch-a","product-a")).status,404);});

  it("serves the Workspace pricing management read privately and rejects all query input", async () => {
    const handlers = createBranchProductRouteHandlers(open({
      ok: true,
      value: {
        productId: "product-a",
        productRevision: 4,
        retail: {
          state: "Configured",
          value: { amountMinor: "100", currency: "USD" },
          allowedActions: ["Set", "Clear"],
        },
      },
    }));
    const response = await handlers.getWorkspacePricingManagement(
      new Request("https://catalog.test/api/products/product-a/pricing"),
      "product-a",
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await handlers.getWorkspacePricingManagement(
      new Request("https://catalog.test/api/products/product-a/pricing?workspaceId=x"),
      "product-a",
    )).status, 400);
  });

  it("maps Workspace management authentication, authorization, not-found, and sanitized failure", async () => {
    const read = new Request("https://catalog.test/api/products/product-a/pricing");
    assert.equal((await createBranchProductRouteHandlers(open(
      {}, async () => { throw new AuthenticatedContextUnavailableError(); },
    )).getWorkspacePricingManagement(read, "product-a")).status, 401);
    assert.equal((await createBranchProductRouteHandlers(open(
      {}, async () => { throw new RestrictedSessionContextError(); },
    )).getWorkspacePricingManagement(read, "product-a")).status, 403);
    assert.equal((await createBranchProductRouteHandlers(open({
      ok: false, error: "Forbidden",
    })).getWorkspacePricingManagement(read, "product-a")).status, 403);
    assert.equal((await createBranchProductRouteHandlers(open({
      ok: false, error: "ProductNotFound",
    })).getWorkspacePricingManagement(read, "product-a")).status, 404);
    const unavailable = await createBranchProductRouteHandlers(open({}, async () => actor, true))
      .getWorkspacePricingManagement(read, "product-a");
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await unavailable.json(), { type: "BranchProductServiceUnavailable" });
  });

  it("serves the Branch pricing management read privately and rejects all query input", async () => {
    const handlers = createBranchProductRouteHandlers(open({
      ok: true,
      value: {
        branchId: "branch-a",
        productId: "product-a",
        baseProductRevision: 4,
        prices: {
          Retail: {
            base: { state: "NotConfigured", value: null, allowedActions: [] },
            override: { state: "NotConfigured", value: null, allowedActions: [] },
            overrideRevision: 0,
            effective: null,
            source: "NotConfigured",
            allowedActions: ["SetOverride"],
          },
        },
      },
    }));
    const response = await handlers.getBranchPricingManagement(
      new Request("https://catalog.test/api/branches/branch-a/products/product-a/pricing/management"),
      "branch-a",
      "product-a",
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await handlers.getBranchPricingManagement(
      new Request("https://catalog.test/api/branches/branch-a/products/product-a/pricing/management?role=Owner"),
      "branch-a",
      "product-a",
    )).status, 400);
  });

  it("maps Branch management auth, permission, safe not-found, and sanitized failure", async () => {
    const read = new Request(
      "https://catalog.test/api/branches/branch-a/products/product-a/pricing/management",
    );
    assert.equal((await createBranchProductRouteHandlers(open(
      {}, async () => { throw new AuthenticatedContextUnavailableError(); },
    )).getBranchPricingManagement(read, "branch-a", "product-a")).status, 401);
    assert.equal((await createBranchProductRouteHandlers(open(
      {}, async () => { throw new RestrictedSessionContextError(); },
    )).getBranchPricingManagement(read, "branch-a", "product-a")).status, 403);
    assert.equal((await createBranchProductRouteHandlers(open({
      ok: false, error: "Forbidden",
    })).getBranchPricingManagement(read, "branch-a", "product-a")).status, 403);
    assert.equal((await createBranchProductRouteHandlers(open({
      ok: false, error: "BranchNotFound",
    })).getBranchPricingManagement(read, "branch-a", "product-a")).status, 404);
    assert.equal((await createBranchProductRouteHandlers(open({
      ok: false, error: "ProductNotFound",
    })).getBranchPricingManagement(read, "branch-a", "product-a")).status, 404);
    const unavailable = await createBranchProductRouteHandlers(open({}, async () => actor, true))
      .getBranchPricingManagement(read, "branch-a", "product-a");
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { type: "BranchProductServiceUnavailable" });
  });
});
