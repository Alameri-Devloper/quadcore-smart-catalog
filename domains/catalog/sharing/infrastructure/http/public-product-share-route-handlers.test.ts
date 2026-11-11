import { publicShareManagementAdmissionFixture } from "../../mock/public-share-management-admission.fixture";
import assert from "node:assert/strict";
import { it } from "node:test";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError } from "../../../../../shared/auth/trusted-actor-context";
import { SameOriginRequestPolicy } from "../../../../identity/infrastructure/http/same-origin-request-policy";
import { PublicProductShareManagementService } from "../../application/public-product-share-management.service";
import { publicShareMemoryFixture } from "../../mock/public-share-lifecycle.fixture";
import { createPublicProductShareRouteHandlers } from "./public-product-share-route-handlers";
import { openPublicProductShareServerApplication } from "../../../../../app/api/catalog/public-product-share-server-runtime";
import type { PublicProductShareError } from "../../application/public-product-share.types";
const request = (body = "{}", origin = "https://catalog.test") => new Request("https://catalog.test/api/test", { method: "POST", headers: { origin, "content-type": "application/json" }, body });
const fixture = () => {
  const f = publicShareMemoryFixture(); let closed = 0;
  const app = { context: { resolve: async () => f.command.context }, origin: new SameOriginRequestPolicy(), management: new PublicProductShareManagementService(f.lifecycle, { check: async () => "Ready" as const }, publicShareManagementAdmissionFixture()), close: async () => { closed++; } };
  return { ...f, app, closed: () => closed, handlers: createPublicProductShareRouteHandlers(() => app) };
};
const headers = (response: Response) => {
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("referrer-policy"), "no-referrer"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
};
it("exact success DTOs and private headers preserve the four contracts", async () => {
  const f = fixture(), first = await f.handlers.issue(request(), "p4-product", "p4-branch"); headers(first); assert.equal(first.status, 200);
  const issued = await first.json() as { type: string; grantId: string; url: string }; assert.equal(issued.type, "Created");
  const copy = await f.handlers.copy(new Request("https://catalog.test/api/test"), "p4-product", "p4-branch"); assert.deepEqual(await copy.json(), { ...issued, type: "Found" }); headers(copy);
  const reused = await f.handlers.issue(request(), "p4-product", "p4-branch"); assert.deepEqual(await reused.json(), { ...issued, type: "Reused" });
  const replacement = await f.handlers.replace(request(JSON.stringify({ expectedCurrentGrantId: issued.grantId })), "p4-product", "p4-branch"); assert.equal((await replacement.json() as { type: string }).type, "Replaced");
  const revoke = await f.handlers.revoke(request(), issued.grantId); assert.deepEqual(await revoke.json(), { type: "AlreadyRevoked", grantId: issued.grantId }); headers(revoke); assert.equal(f.closed(), 5);
});
for (const input of ["", "[]", "null", "true", "{", '{"workspaceId":"foreign"}', '{"expectedCurrentGrantId":"old"}']) it("rejects non-exact issue body: " + JSON.stringify(input), async () => {
  const f = fixture(), result = await f.handlers.issue(request(input), "p4-product", "p4-branch"); assert.equal(result.status, 400); headers(result); assert.equal(f.state.transactions, 0);
});
for (const input of ['{}', '{"expectedCurrentGrantId":null}', '{"expectedCurrentGrantId":" "}', '{"expectedCurrentGrantId":"old","extra":true}']) it("rejects invalid replace body: " + input, async () => {
  const f = fixture(); assert.equal((await f.handlers.replace(request(input), "p4-product", "p4-branch")).status, 400);
});
it("bounds actual UTF-8 bytes at 4096 including streaming and false Content-Length", async () => {
  const f = fixture(); assert.equal((await f.handlers.issue(request(" ".repeat(4094) + "{}"), "p4-product", "p4-branch")).status, 200);
  const oversized = request(" ".repeat(4095) + "{}"); oversized.headers.set("content-length", "2");
  assert.equal((await f.handlers.issue(oversized, "p4-product", "p4-branch")).status, 413);
  assert.equal((await f.handlers.issue(request('{"extra":"' + "\u0639".repeat(2048) + '"}'), "p4-product", "p4-branch")).status, 413);
});
it("rejects cross-origin, missing JSON content-type, and query authority before mutation", async () => {
  const f = fixture(); assert.equal((await f.handlers.issue(request("{}", "https://foreign.test"), "p4-product", "p4-branch")).status, 403);
  const missing = request(); missing.headers.delete("content-type"); assert.equal((await f.handlers.issue(missing, "p4-product", "p4-branch")).status, 400);
  assert.equal((await f.handlers.copy(new Request("https://catalog.test/api/test?workspaceId=foreign"), "p4-product", "p4-branch")).status, 400); assert.equal(f.state.transactions, 0);
});
for (const [error, status] of [["AuthenticationRequired", 401], ["PermissionDenied", 403], ["BranchScopeDenied", 403], ["NotFound", 404], ["NoActiveGrant", 404], ["IssueIneligible", 409], ["ReplacementIneligible", 409], ["ExpectedCurrentGrantConflict", 409], ["KeyUnavailable", 503], ["IntegrityFailure", 503], ["ServiceUnavailable", 503]] as const) it("maps safe typed error " + error, async () => {
  const f = fixture();
  f.app.management.copy = async () => ({ ok: false as const, error: error as PublicProductShareError });
  const response = await f.handlers.copy(new Request("https://catalog.test/api/test"), "p", "b"); assert.equal(response.status, status); assert.deepEqual(await response.json(), { type: error }); headers(response);
});
for (const [error, status] of [[new AuthenticatedContextUnavailableError(), 401], [new RestrictedSessionContextError(), 403], [new Error("SYNTHETIC_PRIVATE_DETAILS"), 503]] as const) it("sanitizes resolver failure " + status, async () => {
  const f = fixture(); f.app.context.resolve = async () => { throw error; };
  const response = await f.handlers.copy(new Request("https://catalog.test/api/test"), "p", "b"); assert.equal(response.status, status); headers(response); assert.doesNotMatch(await response.text(), /SYNTHETIC_PRIVATE/); assert.equal(f.closed(), 1);
});
it("mounted HTTP runtime fails closed without explicit admission policy", async () => {
  const previous = process.env.QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON;
  delete process.env.QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON;
  try {
    const handlers = createPublicProductShareRouteHandlers(openPublicProductShareServerApplication);
    const response = await handlers.copy(new Request("https://catalog.test/api/test"), "p", "b");
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { type: "ServiceUnavailable" }); headers(response);
  } finally {
    if (previous === undefined) delete process.env.QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON;
    else process.env.QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON = previous;
  }
});

for (const [seconds,expected] of [[0,1],[0.1,1],[1.1,2],[60,60],[999,60]] as const) it("429 maps bounded retry header without exposing quota " + seconds,async()=>{
  const f=fixture();f.app.management.copy=async()=>({ok:false,error:"AdmissionDenied",retryAfterSeconds:seconds});
  const result=await f.handlers.copy(new Request("https://catalog.test/api/test"),"p","b");
  assert.equal(result.status,429);assert.deepEqual(await result.json(),{type:"AdmissionDenied"});assert.equal(result.headers.get("retry-after"),String(expected));headers(result);
});
it("invalid retry metadata fails closed with sanitized 503",async()=>{
  const f=fixture();f.app.management.copy=async()=>({ok:false,error:"AdmissionDenied",retryAfterSeconds:NaN});
  const result=await f.handlers.copy(new Request("https://catalog.test/api/test"),"p","b");
  assert.equal(result.status,503);assert.deepEqual(await result.json(),{type:"ServiceUnavailable"});headers(result);
});
it("transport-invalid requests never enter admission",async()=>{
  const f=fixture();let called=0;f.app.management.issue=async()=>{called++;return {ok:false,error:"ServiceUnavailable"};};
  assert.equal((await f.handlers.issue(request('{"actorId":"spoofed"}'),"p","b")).status,400);
  assert.equal((await f.handlers.issue(request("{}","https://foreign.test"),"p","b")).status,403);assert.equal(called,0);
});
