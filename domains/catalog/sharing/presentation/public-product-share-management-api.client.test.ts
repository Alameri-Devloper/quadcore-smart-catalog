import assert from "node:assert/strict";
import { it } from "node:test";
import { managementLink } from "../mock/public-share-management.fixture";
import { PublicProductShareManagementApiClient } from "./public-product-share-management-api.client";
const context = { productId: "product/a", branchId: "branch/b", grantId: "grant/c" };
for (const operation of ["issue", "copy", "replace", "revoke"] as const) it("explicit client request preserves " + operation + " contract", async () => {
  let calls = 0;
  const fetchPort = async function(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    assert.equal(this, undefined); calls++;
    const tuple = "/api/catalog/products/product%2Fa/branches/branch%2Fb/public-share";
    assert.equal(input, operation === "revoke" ? "/api/catalog/public-share-grants/grant%2Fc/revoke" : operation === "replace" ? tuple + "/replace" : tuple);
    assert.equal(init?.credentials, "same-origin"); assert.equal(init?.cache, "no-store"); assert.ok(init?.signal);
    assert.equal(init?.method, operation === "copy" ? "GET" : "POST");
    assert.equal(init?.body, operation === "copy" ? undefined : operation === "replace" ? '{"expectedCurrentGrantId":"grant/c"}' : "{}");
    const result = managementLink(operation === "issue" ? "Created" : operation === "replace" ? "Replaced" : "Found"); assert.ok(result.ok && "url" in result);
    return Response.json(operation === "revoke" ? { type: "Revoked", grantId: "synthetic-grant" } : { type: result.type, grantId: result.grantId, url: result.url });
  };
  const client = new PublicProductShareManagementApiClient(fetchPort); assert.equal(calls, 0);
  assert.equal((await client.execute(operation, context, new AbortController().signal)).ok, true); assert.equal(calls, 1);
});
it("Copy failure never issues and accepts only fixed status/code errors", async () => {
  let calls = 0; const client = new PublicProductShareManagementApiClient(async () => { calls++; return Response.json({ type: "NoActiveGrant" }, { status: 404 }); });
  assert.deepEqual(await client.execute("copy", context, new AbortController().signal), { ok: false, error: "NoActiveGrant" }); assert.equal(calls, 1);
  for (const [status, type] of [[429, "AdmissionDenied"], [401, "AuthenticationRequired"], [403, "PermissionDenied"]] as const) {
    assert.deepEqual(await new PublicProductShareManagementApiClient(async () => Response.json({ type }, { status })).execute("copy", context, new AbortController().signal), { ok: false, error: type });
  }
});
it("rejects malformed, overbroad and mismatched response payloads without echoing raw values", async () => {
  const link = managementLink(); assert.ok(link.ok && "url" in link);
  for (const payload of [{ type: "PRIVATE_DETAIL" }, { ...link, type: "Found" }, { type: "Found", grantId: "g", url: "javascript:private" },
    { type: "Replaced", grantId: "g", url: link.url }, { type: "Found", grantId: "g", url: link.url + "?tracking=1" },
    { type: "Found", grantId: "g", url: link.url, envelope: "private" }, null, []]) {
    const client = new PublicProductShareManagementApiClient(async () => Response.json(payload));
    assert.deepEqual(await client.execute("copy", context, new AbortController().signal), { ok: false, error: "ServiceUnavailable" });
  }
});
it("requires branch for retrieval but known-grant revoke needs no product/branch context", async () => {
  let calls = 0; const client = new PublicProductShareManagementApiClient(async () => { calls++; return Response.json({ type: "AlreadyRevoked", grantId: "known" }); });
  assert.deepEqual(await client.execute("copy", { productId: "p" }, new AbortController().signal), { ok: false, error: "InvalidInput" });
  assert.equal(calls, 0); assert.equal((await client.execute("revoke", { productId: "", grantId: "known" }, new AbortController().signal)).ok, true);
});
