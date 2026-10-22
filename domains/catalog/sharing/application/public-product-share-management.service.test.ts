import { publicShareManagementAdmissionFixture } from "../mock/public-share-management-admission.fixture";
import assert from "node:assert/strict";
import { it } from "node:test";
import { publicShareActor, publicShareMemoryFixture } from "../mock/public-share-lifecycle.fixture";
import { PublicProductShareManagementService } from "./public-product-share-management.service";
import type { PublicShareManagementReadiness } from "../ports/public-share-management-readiness.port";
const fixture = (readiness: PublicShareManagementReadiness = "Ready") => {
  const f = publicShareMemoryFixture(); let inspections = 0;
  return { ...f, inspections: () => inspections, management: new PublicProductShareManagementService(f.lifecycle, { check: async () => { inspections++; return readiness; } }, publicShareManagementAdmissionFixture()) };
};
it("management composes stable issue/reuse/explicit copy and one atomic replacement", async () => {
  const f = fixture(), first = await f.management.issue(f.command); assert.ok(first.ok);
  for (const result of [await f.management.issue(f.command), await f.management.copy(f.command)]) { assert.ok(result.ok); assert.equal(result.value.url, first.value.url); }
  const replaced = await f.management.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }); assert.ok(replaced.ok);
  assert.notEqual(replaced.value.url, first.value.url); assert.equal(f.state.audits().length, 2);
  assert.deepEqual(await f.management.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }), { ok: false, error: "ExpectedCurrentGrantConflict" });
});
for (const error of ["KeyUnavailable", "IntegrityFailure", "ServiceUnavailable"] as const) it("retrieval fails closed for " + error, async () => {
  const f = fixture(error);
  for (const result of [await f.management.issue(f.command), await f.management.copy(f.command), await f.management.replace({ ...f.command, expectedCurrentGrantId: "old" })]) assert.deepEqual(result, { ok: false, error });
  assert.equal(f.state.transactions, 0); assert.equal(f.state.generations, 0);
});
for (const permissions of [[], ["catalog.sharing.create"], ["catalog.sharing.publicLink.manage"], ["catalog.sharing.publicLink.manage", "catalog.products.view"]]) it("denies incomplete URL authority before inspection: " + permissions.join(","), async () => {
  const f = fixture(); const result = await f.management.copy({ ...f.command, context: publicShareActor({ permissions }) });
  assert.deepEqual(result, { ok: false, error: "PermissionDenied" }); assert.equal(f.inspections(), 0);
});
it("checks Branch Scope before key inspection", async () => {
  const f = fixture(); assert.deepEqual(await f.management.issue({ ...f.command, context: publicShareActor({ branchScope: { type: "SelectedBranches", branchIds: ["other"] } }) }), { ok: false, error: "BranchScopeDenied" }); assert.equal(f.inspections(), 0);
});
it("revoke ignores retrieval failure, missing view/pricing, ineligibility and issuer identity", async () => {
  const f = fixture("ServiceUnavailable"), issued = await f.lifecycle.issue(f.command); assert.ok(issued.ok);
  f.state.resource = { ...f.state.resource, productLifecycle: "Draft", branchStatus: "Inactive" };
  const context = publicShareActor({ actorId: "colleague", permissions: ["catalog.sharing.publicLink.manage"] });
  assert.deepEqual(await f.management.revoke({ context, grantId: issued.value.grantId }), { ok: true, value: { outcome: "Revoked", grantId: issued.value.grantId } });
  assert.deepEqual(await f.management.revoke({ context, grantId: issued.value.grantId }), { ok: true, value: { outcome: "AlreadyRevoked", grantId: issued.value.grantId } });
  assert.equal(f.inspections(), 0); assert.equal(f.state.grants()[0].bearerEnvelope, null); assert.equal(f.state.audits().length, 2);
});
it("unknown, foreign and out-of-scope targeted revoke are indistinguishable", async () => {
  const f = fixture(), issued = await f.management.issue(f.command); assert.ok(issued.ok);
  const contexts = [publicShareActor({ workspaceId: "foreign" }), publicShareActor({ branchScope: { type: "SelectedBranches", branchIds: ["other"] } })];
  for (const context of contexts) assert.deepEqual(await f.management.revoke({ context, grantId: issued.value.grantId }), { ok: false, error: "NotFound" });
  assert.deepEqual(await f.management.revoke({ context: f.command.context, grantId: "unknown" }), { ok: false, error: "NotFound" });
});
it("Copy failure never creates a grant and inspection exceptions are sanitized", async () => {
  const f = fixture(); assert.deepEqual(await f.management.copy(f.command), { ok: false, error: "NoActiveGrant" }); assert.equal(f.state.generations, 0);
  const service = new PublicProductShareManagementService(f.lifecycle, { check: async () => { throw new Error("SYNTHETIC_PRIVATE_DETAILS"); } }, publicShareManagementAdmissionFixture());
  assert.deepEqual(await service.copy(f.command), { ok: false, error: "ServiceUnavailable" });
});

for (const result of [{ type: "Denied", retryAfterSeconds: 7 }, { type: "Unavailable" }] as const) it("all operations stop before readiness and lifecycle on " + result.type, async () => {
  const f=publicShareMemoryFixture(), admission=publicShareManagementAdmissionFixture(result); let inspections=0;
  const service=new PublicProductShareManagementService(f.lifecycle, {check:async()=>{inspections++;return "Ready";}},admission);
  for (const response of [await service.issue(f.command),await service.copy(f.command),await service.replace({...f.command,expectedCurrentGrantId:"old"}),await service.revoke({context:f.command.context,grantId:"old"})]) {
    assert.deepEqual(response,result.type === "Denied" ? {ok:false,error:"AdmissionDenied",retryAfterSeconds:7} : {ok:false,error:"ServiceUnavailable"});
  }
  assert.equal(inspections,0);assert.equal(f.state.transactions,0);assert.deepEqual(admission.calls.map(x=>x.operation),["Issue","Copy","Replace","Revoke"]);
});
it("authorization and invalid transport identities do not enter admission",async()=>{
  const f=publicShareMemoryFixture(),admission=publicShareManagementAdmissionFixture();
  const service=new PublicProductShareManagementService(f.lifecycle,{check:async()=>"Ready"},admission);
  await service.issue({...f.command,context:publicShareActor({permissions:[]})});
  await service.revoke({context:publicShareActor({permissions:[]}),grantId:"x"});
  await service.copy({...f.command,branchId:" "});
  await service.issue({...f.command,context:publicShareActor({branchScope:{type:"SelectedBranches",branchIds:[]}})});
  assert.equal(admission.calls.length,0);
});
it("admission survives downstream 404/409/readiness/rollback and internal Issue retries charge once",async()=>{
  const f=publicShareMemoryFixture(),admission=publicShareManagementAdmissionFixture();
  let readiness: "Ready"|"KeyUnavailable"="Ready";
  const service=new PublicProductShareManagementService(f.lifecycle,{check:async()=>readiness},admission);
  assert.deepEqual(await service.copy(f.command),{ok:false,error:"NoActiveGrant"});
  assert.deepEqual(await service.issue({...f.command,productId:"missing"}),{ok:false,error:"NotFound"});
  f.state.nextInsert.push("ActiveTupleConflict");
  const issued=await service.issue(f.command);assert.ok(issued.ok);assert.equal(f.state.transactions,4);
  assert.equal(admission.calls.length,3);
  assert.deepEqual(await service.replace({...f.command,expectedCurrentGrantId:"stale"}),{ok:false,error:"ExpectedCurrentGrantConflict"});
  readiness="KeyUnavailable";await service.copy(f.command);assert.equal(admission.calls.length,5);
  readiness="Ready";f.state.auditFailure=true;
  const failed=await service.revoke({context:f.command.context,grantId:issued.value.grantId});assert.deepEqual(failed,{ok:false,error:"ServiceUnavailable"});
  assert.equal(admission.calls.length,6);assert.equal(f.state.grants()[0].revokedAt,null);
});
it("only actor/workspace/operation reach admission across products and authorization versions",async()=>{
  const f=publicShareMemoryFixture(),admission=publicShareManagementAdmissionFixture();
  const service=new PublicProductShareManagementService(f.lifecycle,{check:async()=>"KeyUnavailable"},admission);
  await service.issue(f.command);await service.issue({...f.command,productId:"different",context:{...f.command.context,authorizationVersion:9}});
  assert.deepEqual(admission.calls,[{workspaceId:"p4-workspace",actorId:"p4-actor",operation:"Issue"},{workspaceId:"p4-workspace",actorId:"p4-actor",operation:"Issue"}]);
});
it("unavailable or uncertain admission never executes even Revoke and never retries",async()=>{
  const f=publicShareMemoryFixture();let calls=0;
  const service=new PublicProductShareManagementService(f.lifecycle,{check:async()=>"Ready"},{admit:async()=>{calls++;throw new Error("SYNTHETIC_COMMIT_UNKNOWN");}});
  assert.deepEqual(await service.revoke({context:f.command.context,grantId:"known"}),{ok:false,error:"ServiceUnavailable"});
  assert.equal(calls,1);assert.equal(f.state.transactions,0);
});
