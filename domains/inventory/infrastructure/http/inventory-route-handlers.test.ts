import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { createInventoryRouteHandlers } from "./inventory-route-handlers";
import type { InventoryServerApplication } from "../inventory-server-runtime";

const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "actor-a", role: "Owner", permissions: [], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const request = (body: unknown = { operationId: "operation-0001", productId: "product-a", quantity: "1" }) => new Request("https://catalog.test/api/branches/branch-a/inventory/receive", { method: "POST", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: JSON.stringify(body) });
const transferRequest = (body: unknown) => new Request("https://catalog.test/api/inventory/transfers", { method: "POST", headers: { "content-type": "application/json", origin: "https://catalog.test" }, body: JSON.stringify(body) });
const reservationView = { reservationId: "reservation-a", branchId: "branch-a", productId: "product-a", status: "Active", quantity: "8", remainingQuantity: "5", createdAt: "2026-08-19T10:00:00.000Z", updatedAt: "2026-08-20T10:00:00.000Z", allowedActions: ["Release", "Fulfill"] } as const;
const getRequest = (query = "?productId=product-a") => new Request(`https://catalog.test/api/branches/branch-a/inventory/reservations${query}`);
const detailRequest = (query = "") => new Request(`https://catalog.test/api/branches/branch-a/inventory/reservations/reservation-a${query}`);
const open = (options: { readonly resolve?: () => Promise<TrustedActorContext>; readonly allows?: boolean; readonly result?: Readonly<Record<string, unknown>>; readonly transferResult?: Readonly<Record<string, unknown>>; readonly reservationsResult?: Readonly<Record<string, unknown>>; readonly reservationResult?: Readonly<Record<string, unknown>>; readonly throwReservation?: boolean; readonly observeTransfer?: (value: unknown) => void; readonly observeReservations?: (value: unknown) => void } = {}) => () => ({
  context: { resolve: options.resolve ?? (async () => actor) }, origin: { allows: () => options.allows ?? true },
  receive: { execute: async () => options.result ?? { ok: true, value: { operationId: "operation-0001" } } }, issue: { execute: async () => ({ ok: false, error: "Forbidden" }) }, reserve: { execute: async () => ({ ok: false, error: "Forbidden" }) }, release: { execute: async () => ({ ok: false, error: "Forbidden" }) }, fulfill: { execute: async () => ({ ok: false, error: "Forbidden" }) }, damage: { execute: async () => ({ ok: false, error: "Forbidden" }) }, restore: { execute: async () => ({ ok: false, error: "Forbidden" }) }, correct: { execute: async () => ({ ok: false, error: "Forbidden" }) }, transfer: { execute: async (value: unknown) => { options.observeTransfer?.(value); return options.transferResult ?? { ok: false, error: "Forbidden" }; } }, get: { execute: async () => ({ ok: false, error: "Forbidden" }) }, movements: { execute: async () => ({ ok: false, error: "Forbidden" }) }, reservations: { execute: async (value: unknown) => { options.observeReservations?.(value); if (options.throwReservation) throw new Error("secret database failure"); return options.reservationsResult ?? { ok: true, value: { items: [reservationView], nextCursor: null } }; } }, reservation: { execute: async () => { if (options.throwReservation) throw new Error("secret database failure"); return options.reservationResult ?? { ok: true, value: reservationView }; } }, close: async () => undefined,
}) as unknown as InventoryServerApplication;

describe("Inventory HTTP boundary", () => {
  it("maps unauthenticated and restricted sessions safely", async () => { const unauthenticated = await createInventoryRouteHandlers(open({ resolve: async () => { throw new AuthenticatedContextUnavailableError(); } })).receive(request(), "branch-a"); assert.equal(unauthenticated.status, 401); const restricted = await createInventoryRouteHandlers(open({ resolve: async () => { throw new RestrictedSessionContextError(); } })).receive(request(), "branch-a"); assert.equal(restricted.status, 403); });
  it("rejects cross-origin and malformed mutations before the use case", async () => { assert.equal((await createInventoryRouteHandlers(open({ allows: false })).receive(request(), "branch-a")).status, 403); assert.equal((await createInventoryRouteHandlers(open()).receive(request({ quantity: 1 }), "branch-a")).status, 400); });
  it("maps scoped not-found, stock failure, conflict, and success", async () => { assert.equal((await createInventoryRouteHandlers(open({ result: { ok: false, error: "BranchNotFound" } })).receive(request(), "branch-a")).status, 404); assert.equal((await createInventoryRouteHandlers(open({ result: { ok: false, error: "InsufficientAvailableStock" } })).receive(request(), "branch-a")).status, 400); assert.equal((await createInventoryRouteHandlers(open({ result: { ok: false, error: "InventoryConflict" } })).receive(request(), "branch-a")).status, 409); const success = await createInventoryRouteHandlers(open()).receive(request(), "branch-a"); assert.equal(success.status, 200); assert.deepEqual(await success.json(), { type: "Success", value: { operationId: "operation-0001" } }); });

  it("accepts the exact Transfer reason contract without changing the success DTO", async () => {
    let observed: unknown;
    const body = { operationId: "transfer-http-0001", sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2", reasonCode: "  REBALANCE_01  " };
    const result = { ok: true, value: { operationId: body.operationId, status: "Succeeded", transferId: "transfer-a" } };
    const response = await createInventoryRouteHandlers(open({ transferResult: result, observeTransfer: (value) => { observed = value; } })).transfer(transferRequest(body));
    assert.equal(response.status, 200);
    assert.deepEqual(observed, { context: actor, ...body });
    assert.deepEqual(await response.json(), { type: "Success", value: result.value });
    assert.equal(JSON.stringify(result.value).includes("reasonCode"), false);
  });

  it("rejects unsupported Transfer fields and maps invalid reason failures", async () => {
    const base = { operationId: "transfer-http-0002", sourceBranchId: "branch-a", destinationBranchId: "branch-b", productId: "product-a", quantity: "2" };
    for (const extra of [{ note: "private" }, { revision: 1 }, { workspaceId: "workspace-a" }, { actorId: "actor-a" }, { permissions: ["inventory.transfer"] }, { reasonCode: 42 }]) {
      let called = false;
      const response = await createInventoryRouteHandlers(open({ observeTransfer: () => { called = true; } })).transfer(transferRequest({ ...base, ...extra }));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { type: "InvalidInput" });
      assert.equal(called, false);
    }
    let observed: unknown;
    const invalid = await createInventoryRouteHandlers(open({ transferResult: { ok: false, error: "InvalidInput" }, observeTransfer: (value) => { observed = value; } })).transfer(transferRequest({ ...base, reasonCode: " " }));
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { type: "InvalidInput" });
    assert.deepEqual(observed, { context: actor, ...base, reasonCode: " " });
  });

  it("serializes semantic-only mutation disclosure without introducing numeric fields", async () => { const result = { ok: true, value: { operationId: "operation-0001", status: "Succeeded", availability: "InStock" } }; const disclosed = await createInventoryRouteHandlers(open({ result })).receive(request(), "branch-a"); assert.equal(disclosed.status, 200); const value = await disclosed.json(); assert.deepEqual(value, { type: "Success", value: result.value }); for (const forbidden of ["onHand", "reserved", "damaged", "quantities", "balance", "revision", "updatedAt"]) assert.equal(JSON.stringify(value).includes(`\"${forbidden}\"`), false, forbidden); });

  it("authenticates Reservation reads and rejects restricted sessions", async () => { const unauthenticated = await createInventoryRouteHandlers(open({ resolve: async () => { throw new AuthenticatedContextUnavailableError(); } })).reservations(getRequest(), "branch-a"); assert.equal(unauthenticated.status, 401); assert.deepEqual(await unauthenticated.json(), { type: "AuthenticationRequired" }); const restricted = await createInventoryRouteHandlers(open({ resolve: async () => { throw new RestrictedSessionContextError(); } })).reservation(detailRequest(), "branch-a", "reservation-a"); assert.equal(restricted.status, 403); assert.deepEqual(await restricted.json(), { type: "ForbiddenForRestrictedSession" }); });

  it("accepts only productId, cursor, and canonical limit once on the collection", async () => { for (const query of ["", "?workspaceId=workspace-a&productId=product-a", "?productId=product-a&productId=product-b", "?productId=product-a&limit=1.5", "?productId=product-a&limit=0", "?productId=product-a&status=Active"]) { const response = await createInventoryRouteHandlers(open()).reservations(getRequest(query), "branch-a"); assert.equal(response.status, 400, query); assert.deepEqual(await response.json(), { type: "InvalidInput" }); } let observed: unknown; const success = await createInventoryRouteHandlers(open({ observeReservations: (value) => { observed = value; } })).reservations(getRequest("?productId=product-a&cursor=opaque&limit=60"), "branch-a"); assert.equal(success.status, 200); assert.deepEqual(observed, { context: actor, branchId: "branch-a", productId: "product-a", cursor: "opaque", limit: 60 }); });

  it("maps malformed cursors distinctly and permission/resource failures safely", async () => { const invalidCursor = await createInventoryRouteHandlers(open({ reservationsResult: { ok: false, error: "InvalidCursor" } })).reservations(getRequest("?productId=product-a&cursor=malformed"), "branch-a"); assert.equal(invalidCursor.status, 400); assert.deepEqual(await invalidCursor.json(), { type: "InvalidCursor" }); assert.equal((await createInventoryRouteHandlers(open({ reservationsResult: { ok: false, error: "Forbidden" } })).reservations(getRequest(), "branch-a")).status, 403); assert.equal((await createInventoryRouteHandlers(open({ reservationResult: { ok: false, error: "ReservationNotFound" } })).reservation(detailRequest(), "branch-a", "foreign" )).status, 404); });

  it("returns private no-store collection and detail success and rejects detail query input", async () => { const collection = await createInventoryRouteHandlers(open()).reservations(getRequest(), "branch-a"); assert.equal(collection.status, 200); assert.equal(collection.headers.get("cache-control"), "private, no-store"); assert.deepEqual(await collection.json(), { type: "Success", value: { items: [reservationView], nextCursor: null } }); const detail = await createInventoryRouteHandlers(open()).reservation(detailRequest(), "branch-a", "reservation-a"); assert.equal(detail.status, 200); assert.equal(detail.headers.get("cache-control"), "private, no-store"); assert.deepEqual(await detail.json(), { type: "Success", value: reservationView }); const rejected = await createInventoryRouteHandlers(open()).reservation(detailRequest("?productId=product-a"), "branch-a", "reservation-a"); assert.equal(rejected.status, 400); assert.deepEqual(await rejected.json(), { type: "InvalidInput" }); });

  it("sanitizes Reservation infrastructure failures as private 503 responses", async () => { const response = await createInventoryRouteHandlers(open({ throwReservation: true })).reservations(getRequest(), "branch-a"); assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "private, no-store"); const body = await response.text(); assert.deepEqual(JSON.parse(body), { type: "InventoryServiceUnavailable" }); assert.equal(body.includes("secret"), false); });
});
