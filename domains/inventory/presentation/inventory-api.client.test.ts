import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InventoryApiClient, type FetchPort } from "./inventory-api.client";
import { availabilityFixture, mutationFixture, quantityFixture } from "./mock/inventory.fixture";

const resource = { branchId: "branch-main", productId: "product-one" };
const command = { operationId: "operation-0001", productId: "product-one", quantity: "2", reasonCode: "COUNT", note: "reviewed" };
const success = (value: unknown) => Response.json({ type: "Success", value });
describe("Inventory Presentation client", () => {
  it("calls GET and all six POST contracts with an unbound receiver, exact bodies, no-store, credentials and AbortSignal", async () => {
    const calls: { path: string; init: RequestInit }[] = [], signal = new AbortController().signal;
    const fetchPort: FetchPort = async function (this: unknown, path, init) {
      assert.equal(this, undefined); assert.equal(init?.cache, "no-store"); assert.equal(init?.credentials, "same-origin"); assert.equal(init?.signal, signal);
      calls.push({ path: String(path), init: init! }); return success(init?.method === "GET" ? quantityFixture() : mutationFixture());
    };
    const client = new InventoryApiClient(fetchPort);
    assert.equal((await client.get(resource, signal)).ok, true);
    assert.equal((await client.receive(resource, command, signal)).ok, true);
    assert.equal((await client.issue(resource, command, signal)).ok, true);
    assert.equal((await client.correctIncrease(resource, command, signal)).ok, true);
    assert.equal((await client.correctDecrease(resource, command, signal)).ok, true);
    assert.equal((await client.markDamaged(resource, command, signal)).ok, true);
    assert.equal((await client.restoreDamaged(resource, command, signal)).ok, true);
    assert.deepEqual(calls.map(call => call.path), [
      "/api/branches/branch-main/inventory/product-one", "/api/branches/branch-main/inventory/receive", "/api/branches/branch-main/inventory/issue",
      "/api/branches/branch-main/inventory/corrections", "/api/branches/branch-main/inventory/corrections",
      "/api/branches/branch-main/inventory/damage", "/api/branches/branch-main/inventory/damage/restore",
    ]);
    assert.equal(calls[0].init.method, "GET"); assert.equal(calls[0].init.body, undefined);
    assert.deepEqual(calls.slice(1).map(call => JSON.parse(String(call.init.body))), [command, command,
      { ...command, direction: "Increase" }, { ...command, direction: "Decrease" }, command, command]);
  });
  it("reconstructs exact detailed and availability-only reads without retaining unauthorized extras", async () => {
    const detailed = quantityFixture();
    assert.deepEqual(await new InventoryApiClient(async () => success({ ...detailed, workspaceId: "hidden", permissions: ["hidden"] })).get(resource),
      { ok: true, value: detailed });
    const semantic = availabilityFixture();
    const result = await new InventoryApiClient(async () => success({ ...semantic, onHand: "99", reserved: "9", workspaceId: "hidden" })).get(resource);
    assert.deepEqual(result, { ok: true, value: semantic }); assert.equal(JSON.stringify(result).includes("99"), false);
  });
  it("supports quantity, availability and mutation-only success without cross-variant leakage", async () => {
    for (const value of [mutationFixture({ balance: quantityFixture() }), mutationFixture({ availability: "OutOfStock" }), mutationFixture()]) {
      const result = await new InventoryApiClient(async () => success({ ...value, workspaceId: "hidden", revision: 99 })).receive(resource, command);
      assert.deepEqual(result, { ok: true, value }); assert.equal(JSON.stringify(result).includes("workspaceId"), false);
    }
    assert.deepEqual(await new InventoryApiClient(async () => success(mutationFixture({ balance: quantityFixture(), availability: "InStock" }))).receive(resource, command),
      { ok: false, kind: "MalformedResponse" });
  });
  it("rejects malformed identity, partial detailed shapes, mismatched operation IDs and malformed envelopes", async () => {
    for (const value of [null, {}, availabilityFixture({ branchId: "other" }), { ...availabilityFixture(), revision: 2 },
      { ...quantityFixture(), quantities: { available: "-1", onHand: "1", reserved: "0", damaged: "0" } }])
      assert.deepEqual(await new InventoryApiClient(async () => success(value)).get(resource), { ok: false, kind: "MalformedResponse" });
    assert.deepEqual(await new InventoryApiClient(async () => success(mutationFixture({ operationId: "operation-other" }))).receive(resource, command),
      { ok: false, kind: "MalformedResponse" });
  });
  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, Forbidden: 403, ForbiddenForRestrictedSession: 403,
    OriginNotAllowed: 403, BranchNotFound: 404, ProductNotFound: 404, BranchInactive: 400, ProductArchived: 400, InvalidQuantity: 400,
    InvalidInput: 400, InsufficientAvailableStock: 400, InventoryConflict: 409, IdempotencyConflict: 409, InventoryServiceUnavailable: 503 }))
    it(`maps ${kind} accurately`, async () => {
      const client = new InventoryApiClient(async () => Response.json({ type: kind }, { status }));
      assert.deepEqual(await client.get(resource), { ok: false, kind }); assert.deepEqual(await client.receive(resource, command), { ok: false, kind });
    });
  it("handles network, malformed JSON, wrong status and unexpected envelopes safely", async () => {
    for (const [port, kind] of [[async () => { throw new Error("private"); }, "NetworkFailure"], [async () => new Response("bad"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"],
      [async () => Response.json({ type: "Success", value: availabilityFixture() }, { status: 201 }), "UnexpectedResponse"]] as const)
      assert.deepEqual(await new InventoryApiClient(port).get(resource), { ok: false, kind });
  });
});
