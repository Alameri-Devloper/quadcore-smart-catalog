import { publicShareManagementAdmissionPolicyFixture } from "../../mock/public-share-management-admission.fixture";
import assert from "node:assert/strict";
import { before, beforeEach, after, it } from "node:test";
import { sql } from "drizzle-orm";
import { publicShareManagementPostgresFixture } from "../../mock/public-share-management-postgres.fixture";
import { ChangeWorkspaceMemberPermissionsUseCase, ChangeWorkspaceMemberBranchScopeUseCase } from "../../../../identity/application/member-administration.use-cases";
const f = publicShareManagementPostgresFixture();
before(f.migrate); beforeEach(f.seed); after(() => f.connection.close());
const issue = async (cookie: string) => {
  const response = await f.handlers().issue(f.request(cookie, {}), "p4-product", "p4-branch"); assert.equal(response.status, 200);
  return await response.json() as { type: string; grantId: string; url: string };
};
it("real Owner permission and explicit Staff persistence enable all four exact operations", async () => {
  const owner = await f.session("p5_owner"), staff = await f.session("p5_staff");
  const first = await issue(owner); assert.equal(first.type, "Created");
  const reused = await issue(staff); assert.equal(reused.url === first.url, true); assert.equal(reused.type, "Reused");
  const copy = await f.handlers().copy(f.request(staff), "p4-product", "p4-branch"); assert.deepEqual(await copy.json(), { ...first, type: "Found" });
  const replaced = await f.handlers().replace(f.request(staff, { expectedCurrentGrantId: first.grantId }), "p4-product", "p4-branch"); assert.equal(replaced.status, 200);
  const value = await replaced.json() as { grantId: string; url: string }; assert.equal(value.url === first.url, false);
  assert.equal((await f.handlers().replace(f.request(staff, { expectedCurrentGrantId: first.grantId }), "p4-product", "p4-branch")).status, 409);
  assert.equal((await f.handlers().revoke(f.request(staff, {}), value.grantId)).status, 200);
  assert.equal((await f.handlers().copy(f.request(staff), "p4-product", "p4-branch")).status, 404); assert.deepEqual(await f.counts(), { total: 2, active: 0 });
});
it("real missing, restricted, expired and permissionless sessions cannot access management", async () => {
  const none = await f.session("p5_none"), restricted = await f.session("p5_restricted", { restricted: true }), expired = await f.session("p5_staff", { expired: true });
  for (const [cookie, status] of [[undefined, 401], [none, 403], [restricted, 403], [expired, 401]] as const) {
    const result = await f.handlers().copy(f.request(cookie), "p4-product", "p4-branch"); assert.equal(result.status, status); assert.equal(result.headers.get("cache-control"), "private, no-store");
  }
});
it("Owner assignment revokes stale sessions; fresh manage-only Staff revoke without retrieval readiness", async () => {
  const owner = await f.session("p5_owner"), staff = await f.session("p5_staff"), created = await issue(owner);
  const authority = await f.resolver.resolve(f.request(owner));
  const updated = await new ChangeWorkspaceMemberPermissionsUseCase(f.identity, f.clock).execute({ context: authority, targetActorId: "p5_staff", permissionCodes: ["catalog.sharing.publicLink.manage"], expectedAuthorizationRevision: 1 });
  assert.ok(updated.ok); assert.equal(updated.value.revokedSessionCount, 1);
  assert.equal((await f.handlers().copy(f.request(staff), "p4-product", "p4-branch")).status, 401);
  const fresh = await f.session("p5_staff", { version: updated.value.authorizationVersion }); assert.equal((await f.handlers().copy(f.request(fresh), "p4-product", "p4-branch")).status, 403);
  await f.execute(sql.raw("UPDATE catalog_products SET lifecycle_state='Draft' WHERE workspace_id='p4-workspace'; UPDATE workspace_branch_references SET status='Inactive' WHERE workspace_id='p4-workspace'"));
  const broken = f.handlers({ QSC_PUBLIC_SHARE_HMAC_KEYS_JSON: "", QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON: "", QSC_PUBLIC_SHARE_PUBLIC_ORIGIN: "" });
  assert.deepEqual(await (await broken.revoke(f.request(fresh, {}), created.grantId)).json(), { type: "Revoked", grantId: created.grantId });
  assert.deepEqual(await (await broken.revoke(f.request(fresh, {}), created.grantId)).json(), { type: "AlreadyRevoked", grantId: created.grantId });
  const row = (await f.execute(sql.raw("SELECT bearer_iv,bearer_ciphertext,bearer_auth_tag,envelope_format_version,encryption_key_version FROM catalog_public_product_share_grants"))).rows[0];
  assert.ok(Object.values(row).every((value) => value === null));
});
it("real Branch Scope change invalidates sessions and targeted revoke does not expose inaccessible grants", async () => {
  const owner = await f.session("p5_owner"), staff = await f.session("p5_staff"), created = await issue(owner), authority = await f.resolver.resolve(f.request(owner));
  const change = await new ChangeWorkspaceMemberBranchScopeUseCase(f.identity, f.clock).execute({ context: authority, targetActorId: "p5_staff", branchScope: { type: "SelectedBranches", branchIds: ["p4-branch-2"] }, expectedAuthorizationRevision: 1 });
  assert.ok(change.ok); assert.equal((await f.handlers().copy(f.request(staff), "p4-product", "p4-branch")).status, 401);
  const fresh = await f.session("p5_staff", { version: change.value.authorizationVersion });
  const known = await f.handlers().revoke(f.request(fresh, {}), created.grantId), unknown = await f.handlers().revoke(f.request(fresh, {}), "unknown");
  assert.equal(known.status, 404); assert.equal(unknown.status, 404); assert.deepEqual(await known.json(), await unknown.json());
  assert.equal((await f.handlers().copy(f.request(fresh), "p4-product", "p4-branch")).status, 403);
});
it("foreign Workspace cannot discover grant/product and issuer suspension alone never revokes its grant", async () => {
  const owner = await f.session("p5_owner"), foreign = await f.session("p5_foreign", { workspaceId: "p4-foreign" }), created = await issue(owner);
  assert.equal((await f.handlers().revoke(f.request(foreign, {}), created.grantId)).status, 404);
  assert.equal((await f.handlers().copy(f.request(foreign), "p4-product", "p4-branch")).status, 404);
  await f.execute(sql.raw("UPDATE identity_accounts SET status='Suspended' WHERE actor_id='p5_owner'"));
  assert.equal((await f.handlers().copy(f.request(owner), "p4-product", "p4-branch")).status, 401);
  const staff = await f.session("p5_staff"); assert.equal((await f.handlers().copy(f.request(staff), "p4-product", "p4-branch")).status, 200);
});
it("stored key coverage failure blocks retrieval without preventing targeted Revoke", async () => {
  const owner = await f.session("p5_owner"), created = await issue(owner);
  await f.execute(sql.raw("UPDATE catalog_public_product_share_grants SET encryption_key_version=9"));
  const failed = await f.handlers().copy(f.request(owner), "p4-product", "p4-branch"); assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), { type: "KeyUnavailable" });
  assert.equal((await f.handlers().revoke(f.request(owner, {}), created.grantId)).status, 200);
});


it("mounted approved runtime composes real Identity sessions, database admission, lifecycle and readiness", async () => {
  const owner = await f.session("p5_owner", { at: new Date() });
  await issue(await f.session("p5_owner"));
  const { environment } = await import("../crypto/public-share-crypto.test-fixtures");
  const { openPublicProductShareServerApplication } = await import("../../../../../app/api/catalog/public-product-share-server-runtime");
  const { createPublicProductShareRouteHandlers } = await import("../http/public-product-share-route-handlers");
  const target = process.env.TEST_DATABASE_URL;
  assert.ok(target);
  const values = { ...environment(), DATABASE_URL: target,
    QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: JSON.stringify(publicShareManagementAdmissionPolicyFixture()),
    QSC_PUBLIC_ORIGIN: "https://catalog.test", QSC_SESSION_COOKIE_NAME: "qsc_p5_session",
    QSC_SESSION_HMAC_ACTIVE_VERSION: "1", QSC_SESSION_HMAC_KEYS_JSON: JSON.stringify({ 1: Buffer.alloc(32, 41).toString("base64") }) };
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, values);
    const result = await createPublicProductShareRouteHandlers(openPublicProductShareServerApplication).copy(f.request(owner), "p4-product", "p4-branch");
    assert.equal(result.status, 200); assert.equal((await result.json() as { type: string }).type, "Found");
  } finally {
    for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

it("two real sessions and changed products share the actor Copy budget with exact safe429",async()=>{
  const first=await f.session("p5_staff"),second=await f.session("p5_staff");await issue(first);
  await f.handlers().copy(f.request(first),"p4-product","p4-branch");
  await f.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=59 WHERE operation='Copy' AND scope_kind='User'`);
  assert.equal((await f.handlers().copy(f.request(second),"p4-product","p4-branch")).status,200);
  const response=await f.handlers().copy(f.request(first),"different-product","p4-branch");
  assert.equal(response.status,429);assert.deepEqual(await response.json(),{type:"AdmissionDenied"});
  assert.ok(Number(response.headers.get("retry-after"))>=1&&Number(response.headers.get("retry-after"))<=60);
  for(const [key,value] of [["cache-control","private, no-store"],["referrer-policy","no-referrer"],["x-content-type-options","nosniff"]]) assert.equal(response.headers.get(key),value);
  const owner=await f.session("p5_owner");assert.equal((await f.handlers().copy(f.request(owner),"p4-product","p4-branch")).status,200);
});
it("real admitted404/409 and keyreadiness failures retain independent charges",async()=>{
  const cookie=await f.session("p5_owner");
  assert.equal((await f.handlers().copy(f.request(cookie),"p4-product","p4-branch")).status,404);
  const created=await issue(cookie);
  assert.equal((await f.handlers().issue(f.request(cookie,{}),"p4-product","p4-branch")).status,200);
  assert.equal((await f.handlers().replace(f.request(cookie,{expectedCurrentGrantId:"stale"}),"p4-product","p4-branch")).status,409);
  assert.equal((await f.handlers({QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:""}).copy(f.request(cookie),"p4-product","p4-branch")).status,503);
  const rows=(await f.execute(sql`SELECT operation,used_count FROM catalog_public_share_management_admission WHERE scope_kind='User' ORDER BY operation`)).rows;
  assert.deepEqual(rows.map(x=>[x.operation,Number(x.used_count)]),[["Copy",2],["Issue",2],["Replace",1]]);
  assert.equal((await f.handlers().revoke(f.request(cookie,{}),created.grantId)).status,200);
});
it("real authentication/transport/permission failures never create counters",async()=>{
  const staff=await f.session("p5_none"),owner=await f.session("p5_owner");
  assert.equal((await f.handlers().copy(f.request(),"p4-product","p4-branch")).status,401);
  assert.equal((await f.handlers().copy(f.request(staff),"p4-product","p4-branch")).status,403);
  assert.equal((await f.handlers().issue(f.request(owner,{workspaceId:"spoofed"}),"p4-product","p4-branch")).status,400);
  assert.equal(Number((await f.execute(sql`SELECT count(*) AS n FROM catalog_public_share_management_admission`)).rows[0].n),0);
});
it("exhausted retrieval budgets leave manage-only key-independent Revoke usable",async()=>{
  const owner=await f.session("p5_owner"),created=await issue(owner);
  for(const operation of ["Copy","Replace"] as const){
    if(operation==="Copy") await f.handlers().copy(f.request(owner),"p4-product","p4-branch");
    else await f.handlers().replace(f.request(owner,{expectedCurrentGrantId:"stale"}),"p4-product","p4-branch");
  }
  await f.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=600 WHERE scope_kind='Workspace'`);
  const authority=await f.resolver.resolve(f.request(owner));
  const updated=await new ChangeWorkspaceMemberPermissionsUseCase(f.identity,f.clock).execute({context:authority,targetActorId:"p5_staff",permissionCodes:["catalog.sharing.publicLink.manage"],expectedAuthorizationRevision:1});assert.ok(updated.ok);
  const staff=await f.session("p5_staff",{version:updated.value.authorizationVersion});
  const result=await f.handlers({QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:"",QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:"",QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:""}).revoke(f.request(staff,{}),created.grantId);
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{type:"Revoked",grantId:created.grantId});
});
