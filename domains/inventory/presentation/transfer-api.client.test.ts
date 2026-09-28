import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TransferApiClient } from "./transfer-api.client";
import type { FetchPort } from "./inventory-api.client";
import { detailedTransferFixture, transferCommandFixture, transferMutationFixture } from "./mock/transfer.fixture";

const success = (value: unknown) => Response.json({ type: "Success", value });
describe("Transfer Presentation client", () => {
  it("calls the exact POST contract with optional reason, unbound FetchPort, same-origin, no-store and AbortSignal", async () => {
    const calls: { path: string; init: RequestInit }[] = [], signal = new AbortController().signal;
    const fetchPort: FetchPort = async function (this: unknown, path, init) {
      assert.equal(this, undefined); calls.push({ path: String(path), init: init! });
      return success(transferMutationFixture({ operationId: JSON.parse(String(init?.body)).operationId }));
    };
    const command = { ...transferCommandFixture({ reasonCode: "REBALANCE_01" }), note: "must-not-be-sent" } as ReturnType<typeof transferCommandFixture>;
    const client = new TransferApiClient(fetchPort);
    assert.equal((await client.transfer(command, signal)).ok, true);
    assert.deepEqual(calls.map(call => call.path), ["/api/inventory/transfers"]); assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.credentials, "same-origin"); assert.equal(calls[0].init.cache, "no-store"); assert.equal(calls[0].init.signal, signal);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), transferCommandFixture({ reasonCode: "REBALANCE_01" }));
    const omitted = transferCommandFixture(); delete (omitted as { reasonCode?: string }).reasonCode;
    await client.transfer(omitted); assert.deepEqual(Object.keys(JSON.parse(String(calls[1].init.body))).sort(),
      ["destinationBranchId", "operationId", "productId", "quantity", "sourceBranchId"]);
  });
  it("reconstructs detailed, availability-only and minimum success without retaining unauthorized extras", async () => {
    const command = transferCommandFixture();
    const detailed = await new TransferApiClient(async () => success({ ...detailedTransferFixture(), workspaceId: "hidden", permissions: ["hidden"] })).transfer(command);
    assert.ok(detailed.ok); if (detailed.ok) { assert.equal("sourceBalance" in detailed.value, true); assert.equal(JSON.stringify(detailed).includes("hidden"), false); }
    const semantic = await new TransferApiClient(async () => success({ ...transferMutationFixture(), sourceAvailability: "OutOfStock", destinationAvailability: "InStock", sourceQuantity: "99" })).transfer(command);
    assert.deepEqual(semantic, { ok: true, value: { ...transferMutationFixture(), sourceAvailability: "OutOfStock", destinationAvailability: "InStock" } });
    assert.deepEqual(await new TransferApiClient(async () => success({ ...transferMutationFixture(), revision: 9 })).transfer(command),
      { ok: true, value: transferMutationFixture() });
  });
  it("rejects missing transferId, mismatched operation/status, partial/mixed tiers and malformed numeric disclosures", async () => {
    const command = transferCommandFixture(), minimum = transferMutationFixture();
    for (const value of [
      { operationId: minimum.operationId, status: "Succeeded" }, { ...minimum, operationId: "other-operation" }, { ...minimum, status: "Pending" },
      { ...minimum, sourceAvailability: "InStock" }, { ...minimum, sourceBalance: (detailedTransferFixture() as Extract<ReturnType<typeof detailedTransferFixture>, { sourceBalance: object }>).sourceBalance },
      { ...detailedTransferFixture(), sourceAvailability: "InStock", destinationAvailability: "InStock" },
      { ...detailedTransferFixture(), sourceBalance: { ...(detailedTransferFixture() as Extract<ReturnType<typeof detailedTransferFixture>, { sourceBalance: object }>).sourceBalance,
        quantities: { available: "-1", onHand: "7", reserved: "0", damaged: "0" } } },
    ]) assert.deepEqual(await new TransferApiClient(async () => success(value)).transfer(command), { ok: false, kind: "MalformedResponse" });
  });
  for (const [kind, status] of Object.entries({ AuthenticationRequired: 401, Forbidden: 403, ForbiddenForRestrictedSession: 403, OriginNotAllowed: 403,
    BranchNotFound: 404, ProductNotFound: 404, BranchInactive: 400, ProductArchived: 400, InvalidQuantity: 400, InvalidInput: 400,
    InsufficientAvailableStock: 400, InventoryConflict: 409, IdempotencyConflict: 409, InventoryServiceUnavailable: 503 }))
    it(`maps ${kind} accurately`, async () => assert.deepEqual(await new TransferApiClient(async () => Response.json({ type: kind }, { status })).transfer(transferCommandFixture()), { ok: false, kind }));
  it("normalizes network, malformed JSON, mismatched status and unexpected envelopes", async () => {
    const cases: readonly [FetchPort, string][] = [[async () => { throw new Error("private"); }, "NetworkFailure"], [async () => new Response("bad"), "MalformedResponse"],
      [async () => Response.json({ type: "Forbidden" }, { status: 503 }), "UnexpectedResponse"], [async () => success(transferMutationFixture()), "none"]];
    for (const [port, kind] of cases.slice(0, 3)) assert.deepEqual(await new TransferApiClient(port).transfer(transferCommandFixture()), { ok: false, kind });
    assert.equal((await new TransferApiClient(cases[3][0]).transfer(transferCommandFixture())).ok, true);
  });
});
