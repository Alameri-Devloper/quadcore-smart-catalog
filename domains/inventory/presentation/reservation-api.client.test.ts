import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FetchPort } from "./inventory-api.client";
import { quantityFixture } from "./mock/inventory.fixture";
import { reservationFixture, reservationMutationFixture, reservationPageFixture, reservationStatusFixture } from "./mock/reservation.fixture";
import { ReservationApiClient } from "./reservation-api.client";

const success = (value: unknown, status = 200) => Response.json({ type: "Success", value }, { status });
const collection = { branchId: "branch-main", productId: "product-one", cursor: "opaque_cursor", limit: 24 };
const detail = { branchId: "branch-main", reservationId: "reservation-one" };
const target = { ...detail, productId: "product-one" };

describe("Reservation Presentation client", () => {
  it("calls every exact contract with an unbound FetchPort receiver, credentials, no-store and AbortSignal", async () => {
    const calls: { path: string; init: RequestInit }[] = [], signal = new AbortController().signal;
    const fetchPort: FetchPort = async function (this: unknown, path, init) {
      assert.equal(this, undefined); assert.equal(init?.credentials, "same-origin"); assert.equal(init?.cache, "no-store"); assert.equal(init?.signal, signal);
      calls.push({ path: String(path), init: init! });
      if (String(path).includes("/release")) return success(reservationMutationFixture({ reservationStatus: "Released", remainingQuantity: "0" }));
      if (String(path).includes("/fulfill")) return success(reservationMutationFixture({ reservationStatus: "Fulfilled", remainingQuantity: "0" }));
      if (init?.method === "POST") return success(reservationMutationFixture(), 201);
      return success(String(path).includes("reservation-one") ? reservationFixture() : reservationPageFixture());
    };
    const client = new ReservationApiClient(fetchPort);
    assert.equal((await client.list(collection, signal)).ok, true); assert.equal((await client.detail(detail, signal)).ok, true);
    assert.equal((await client.reserve(target, { operationId: "operation-0001", productId: "product-one", quantity: "5", reasonCode: "ORDER" }, signal)).ok, true);
    assert.equal((await client.release(target, { operationId: "operation-0001", quantity: "5" }, signal)).ok, true);
    assert.equal((await client.fulfill(target, { operationId: "operation-0001", quantity: "5" }, signal)).ok, true);
    assert.deepEqual(calls.map(call => call.path), [
      "/api/branches/branch-main/inventory/reservations?productId=product-one&cursor=opaque_cursor&limit=24",
      "/api/branches/branch-main/inventory/reservations/reservation-one", "/api/branches/branch-main/inventory/reservations",
      "/api/branches/branch-main/inventory/reservations/reservation-one/release", "/api/branches/branch-main/inventory/reservations/reservation-one/fulfill",
    ]);
    assert.equal(calls[0].init.method, "GET"); assert.equal(calls[0].init.body, undefined);
    assert.deepEqual(JSON.parse(String(calls[2].init.body)), { operationId: "operation-0001", productId: "product-one", quantity: "5", reasonCode: "ORDER" });
    assert.deepEqual(JSON.parse(String(calls[3].init.body)), { operationId: "operation-0001", quantity: "5" });
    assert.equal(String(calls[2].init.body).includes("note"), false);
  });
  it("passes cursors opaquely, validates limit locally, and accepts empty or terminal pages", async () => {
    let path = ""; const client = new ReservationApiClient(async input => { path = String(input); return success({ items: [], nextCursor: null }); });
    assert.deepEqual(await client.list({ branchId: "branch-main", productId: "product-one", cursor: "AbC_-09", limit: 60 }),
      { ok: true, value: { items: [], nextCursor: null } });
    assert.match(path, /cursor=AbC_-09/u); assert.deepEqual(await client.list({ branchId: "branch-main", productId: "product-one", limit: 61 }), { ok: false, kind: "InvalidInput" });
  });
  it("reconstructs all detail statuses and exact allowedActions while dropping unexpected authority fields", async () => {
    for (const status of ["Active", "PartiallyFulfilled", "Fulfilled", "Released"] as const) {
      const expected = reservationStatusFixture(status), result = await new ReservationApiClient(async () => success({ ...expected, workspaceId: "hidden", permissions: ["hidden"], createdByActorId: "hidden" })).detail(detail);
      assert.deepEqual(result, { ok: true, value: expected }); assert.doesNotMatch(JSON.stringify(result), /workspaceId|permissions|createdByActorId/u);
    }
  });
  it("keeps Reservation-specific state while enforcing independent balance disclosure variants", async () => {
    for (const value of [reservationMutationFixture({ balance: quantityFixture() }), reservationMutationFixture({ availability: "InStock" }), reservationMutationFixture()]) {
      const result = await new ReservationApiClient(async () => success({ ...value, workspaceId: "hidden" }, 201)).reserve(target,
        { operationId: "operation-0001", productId: "product-one", quantity: "5" });
      assert.deepEqual(result, { ok: true, value }); assert.equal(JSON.stringify(result).includes("workspaceId"), false);
    }
    const leaking = reservationMutationFixture({ balance: quantityFixture(), availability: "InStock" });
    assert.deepEqual(await new ReservationApiClient(async () => success(leaking, 201)).reserve(target, { operationId: "operation-0001", productId: "product-one", quantity: "5" }),
      { ok: false, kind: "MalformedResponse" });
  });
  it("rejects malformed collection/detail/mutation success and mismatched identities", async () => {
    for (const value of [null, {}, { items: [reservationFixture({ status: "Fulfilled" })], nextCursor: null },
      { items: [reservationFixture({ allowedActions: ["Release", "Release"] })], nextCursor: null }, { items: [reservationFixture({ productId: "other" })], nextCursor: null }])
      assert.deepEqual(await new ReservationApiClient(async () => success(value)).list(collection), { ok: false, kind: "MalformedResponse" });
    assert.deepEqual(await new ReservationApiClient(async () => success(reservationFixture({ reservationId: "other" }))).detail(detail), { ok: false, kind: "MalformedResponse" });
    assert.deepEqual(await new ReservationApiClient(async () => success(reservationMutationFixture({ operationId: "other" }), 201)).reserve(target,
      { operationId: "operation-0001", productId: "product-one", quantity: "5" }), { ok: false, kind: "MalformedResponse" });
  });
  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, Forbidden: 403, ForbiddenForRestrictedSession: 403, OriginNotAllowed: 403,
    BranchNotFound: 404, ProductNotFound: 404, ReservationNotFound: 404, BranchInactive: 400, ProductArchived: 400, InvalidQuantity: 400,
    InvalidInput: 400, InvalidCursor: 400, InsufficientAvailableStock: 400, ReservationNotActive: 400, InventoryConflict: 409,
    IdempotencyConflict: 409, InventoryServiceUnavailable: 503 })) it(`maps ${kind} accurately`, async () => {
      const client = new ReservationApiClient(async () => Response.json({ type: kind }, { status }));
      assert.deepEqual(await client.list(collection), { ok: false, kind }); assert.deepEqual(await client.detail(detail), { ok: false, kind });
    });
  it("handles network, malformed JSON, wrong status and unexpected envelopes safely", async () => {
    for (const [port, kind] of [[async () => { throw new Error("private"); }, "NetworkFailure"], [async () => new Response("bad"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"],
      [async () => success(reservationPageFixture(), 201), "UnexpectedResponse"]] as const)
      assert.deepEqual(await new ReservationApiClient(port).list(collection), { ok: false, kind });
  });
});
