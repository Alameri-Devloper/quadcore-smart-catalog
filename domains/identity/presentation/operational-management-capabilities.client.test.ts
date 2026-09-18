import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalManagementCapabilitiesClient, parseOperationalManagementCapabilities } from "./operational-management-capabilities.client";
import { operationalManagementCapabilitiesFixture as fixture } from "./mock/operational-management-capabilities.fixture";

describe("A1 Presentation client", () => {
  it("invokes a receiver-sensitive FetchPort unbound and preserves the A1 request contract", async () => {
    const signal = new AbortController().signal;
    let calledWithoutReceiver = false;
    const fetchPort = async function (this: unknown, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      calledWithoutReceiver = this === undefined;
      if (this !== undefined) throw new TypeError("Illegal invocation");
      assert.equal(input, "/api/operations/capabilities");
      assert.deepEqual(init, { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" }, signal });
      return Response.json(fixture());
    };

    const result = await new OperationalManagementCapabilitiesClient(fetchPort).load(signal);

    assert.equal(calledWithoutReceiver, true);
    assert.deepEqual(result, { ok: true, value: fixture() });
  });

  it("reconstructs the direct boolean DTO without keeping transport references", () => {
    const payload = fixture();
    payload.inventory.canReceive = true;
    const parsed = parseOperationalManagementCapabilities(payload);
    assert.deepEqual(parsed, payload);
    assert.notEqual(parsed, payload);
    assert.notEqual(parsed?.inventory, payload.inventory);
    assert.ok(Object.isFrozen(parsed));
    assert.ok(Object.isFrozen(parsed?.inventory));
    payload.inventory.canReceive = false;
    assert.equal(parsed?.inventory.canReceive, true);
  });

  it("rejects missing groups, missing booleans, wrong field types and Success envelopes", () => {
    const valid = fixture();
    for (const invalid of [null, [], true, "capabilities", {}, { type: "Success", value: valid }]) {
      assert.equal(parseOperationalManagementCapabilities(invalid), null);
    }
    for (const [group, fields] of Object.entries(valid)) {
      const missingGroup = { ...valid } as Record<string, unknown>;
      delete missingGroup[group];
      assert.equal(parseOperationalManagementCapabilities(missingGroup), null);
      for (const invalidGroup of [null, [], false, "false"]) {
        assert.equal(parseOperationalManagementCapabilities({ ...valid, [group]: invalidGroup }), null);
      }
      for (const key of Object.keys(fields)) {
        const missingField = { ...fields } as Record<string, unknown>;
        delete missingField[key];
        assert.equal(parseOperationalManagementCapabilities({ ...valid, [group]: missingField }), null);
        for (const invalid of [undefined, null, "true", 1, {}, []]) {
          assert.equal(parseOperationalManagementCapabilities({ ...valid, [group]: { ...fields, [key]: invalid } }), null);
        }
      }
    }
  });

  it("drops unknown fields including extra authority at every level", () => {
    const valid = fixture();
    const extra = {
      permissions: ["untrusted"], branchScope: { branchIds: ["untrusted"] },
      workspaceId: "untrusted", role: "Owner", allowedActions: ["untrusted"],
    };
    const payload = { ...valid, ...extra, ...Object.fromEntries(Object.entries(valid).map(([key, fields]) => [key, { ...fields, ...extra }])) };
    assert.deepEqual(parseOperationalManagementCapabilities(payload), valid);
    assert.equal(parseOperationalManagementCapabilities(extra), null);
  });

  it("rejects inherited required groups or fields", () => {
    const valid = fixture();
    assert.equal(parseOperationalManagementCapabilities(Object.create(valid)), null);
    assert.equal(parseOperationalManagementCapabilities({ ...valid, branches: Object.create(valid.branches) }), null);
  });

  it("sends one bare GET with same-origin credentials, no-store, no authority and an abort signal", async () => {
    const controller = new AbortController();
    const client = new OperationalManagementCapabilitiesClient(async (input, init) => {
      assert.equal(input, "/api/operations/capabilities");
      assert.equal(init?.method, "GET");
      assert.equal(init?.credentials, "same-origin");
      assert.equal(init?.cache, "no-store");
      assert.deepEqual(init?.headers, { accept: "application/json" });
      assert.equal(init?.body, undefined);
      assert.equal(init?.signal, controller.signal);
      return Response.json(fixture());
    });
    assert.deepEqual(await client.load(controller.signal), { ok: true, value: fixture() });
  });

  for (const [status, code, expected] of [
    [401, "AuthenticationRequired", "AuthenticationRequired"],
    [403, "ForbiddenForRestrictedSession", "ForbiddenForRestrictedSession"],
    [403, "Forbidden", "Forbidden"],
    [400, "InvalidQuery", "InvalidQuery"],
    [503, "OperationalManagementCapabilityServiceUnavailable", "OperationalManagementCapabilityServiceUnavailable"],
    [400, "unknown", "Unavailable"],
    [500, "private server error", "Unavailable"],
    [200, "Success", "Unavailable"],
  ] as const) {
    it(`normalizes ${status}/${code} to ${expected} without retaining server details`, async () => {
      const client = new OperationalManagementCapabilitiesClient(async () => Response.json({ type: code, value: fixture(), detail: "private" }, { status }));
      assert.deepEqual(await client.load(), { ok: false, kind: expected });
    });
  }

  it("uses HTTP 401 even when its error body is malformed", async () => {
    const client = new OperationalManagementCapabilitiesClient(async () => new Response("invalid JSON", { status: 401 }));
    assert.deepEqual(await client.load(), { ok: false, kind: "AuthenticationRequired" });
  });

  it("normalizes network, malformed JSON, partial success and unexpected success status", async () => {
    for (const fetcher of [
      async () => { throw new Error("private network error"); },
      async () => new Response("invalid JSON"),
      async () => Response.json({ branches: {} }),
      async () => Response.json(fixture(), { status: 201 }),
    ]) {
      assert.deepEqual(await new OperationalManagementCapabilitiesClient(fetcher).load(), { ok: false, kind: "Unavailable" });
    }
  });
});
