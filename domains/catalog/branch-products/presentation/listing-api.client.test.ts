import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ListingApiClient, type FetchPort } from "./listing-api.client";
import { listingFixture, listingWriteFixture } from "./mock/listing.fixture";
const resource = { branchId: "branch-main", productId: "product-one" };
const success = (value: unknown) => Response.json({ type: "Success", value });
describe("Listing Presentation client", () => {
  it("calls GET and PUT with an unbound receiver, exact path/body, no-store, credentials and AbortSignal", async () => {
    const calls: RequestInit[] = [], signal = new AbortController().signal;
    const fetchPort: FetchPort = async function (this: unknown, path, init) {
      assert.equal(this, undefined); assert.equal(path, "/api/branches/branch-main/products/product-one/listing");
      assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "same-origin"); assert.equal(init?.signal, signal);
      calls.push(init!); return success(init?.method === "PUT" ? listingWriteFixture() : listingFixture());
    };
    const client = new ListingApiClient(fetchPort);
    assert.equal((await client.get(resource, signal)).ok, true);
    assert.equal((await client.set(resource, { listingStatus: "Unlisted", expectedRevision: 3 }, signal)).ok, true);
    assert.deepEqual(calls.map(call => call.method), ["GET", "PUT"]); assert.equal(calls[0].body, undefined);
    assert.deepEqual(JSON.parse(String(calls[1].body)), { listingStatus: "Unlisted", expectedRevision: 3 });
  });
  for (const listingStatus of ["NotConfigured", "Listed", "Unlisted"] as const) it(`reads ${listingStatus} with only approved fields and exact action order`, async () => {
    const expected = listingFixture({ listingStatus, ...(listingStatus === "NotConfigured" ? { revision: 0, updatedAt: null } : {}), allowedActions: ["SetUnlisted", "SetListed"] });
    const client = new ListingApiClient(async () => success({ ...expected, permissions: ["hidden"], workspaceId: "hidden" }));
    assert.deepEqual(await client.get(resource), { ok: true, value: expected });
  });
  it("preserves an empty action collection", async () => {
    const value = listingFixture({ allowedActions: [] });
    assert.deepEqual(await new ListingApiClient(async () => success(value)).get(resource), { ok: true, value });
  });
  it("rejects malformed, mismatched and fabricated resource authority", async () => {
    for (const value of [null, {}, listingFixture({ branchId: "other" }), listingFixture({ revision: -1 }),
      listingFixture({ listingStatus: "NotConfigured" }), listingFixture({ updatedAt: "invalid" }),
      { ...listingFixture(), allowedActions: ["Delete"] }, { ...listingFixture(), revision: "3" }]) {
      assert.deepEqual(await new ListingApiClient(async () => success(value)).get(resource), { ok: false, kind: "MalformedResponse" });
    }
    assert.deepEqual(await new ListingApiClient(async () => success(listingWriteFixture({ listingStatus: "Listed" })))
      .set(resource, { listingStatus: "Unlisted", expectedRevision: 3 }), { ok: false, kind: "MalformedResponse" });
  });
  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, Forbidden: 403, ForbiddenForRestrictedSession: 403,
    OriginNotAllowed: 403, BranchNotFound: 404, ProductNotFound: 404, Conflict: 409, BranchInactive: 400, ProductArchived: 400,
    InvalidInput: 400, BranchProductServiceUnavailable: 503 })) it(`maps ${kind} accurately for both methods`, async () => {
    const client = new ListingApiClient(async () => Response.json({ type: kind }, { status }));
    assert.deepEqual(await client.get(resource), { ok: false, kind });
    assert.deepEqual(await client.set(resource, { listingStatus: "Unlisted", expectedRevision: 3 }), { ok: false, kind });
  });
  it("safely handles network, malformed JSON, wrong status and unexpected envelopes", async () => {
    for (const [port, kind] of [
      [async () => { throw new Error("private"); }, "NetworkFailure"],
      [async () => new Response("not-json"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Success", value: listingFixture() }, { status: 201 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Other", value: listingFixture() }), "MalformedResponse"],
    ] as const) assert.deepEqual(await new ListingApiClient(port).get(resource), { ok: false, kind });
  });
});
