import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { once } from "node:events";
import { randomBytes,createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { performance } from "node:perf_hooks";
import { recoveryFaultProxy,type FaultMode } from "./public-share-recovery-fault-proxy";
import { migrateNewQaAdmissionDatabase } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-migration";
import { publicShareFailureResponse } from "../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http";
import { verifyQaServingComposition } from "../../domains/catalog/sharing/infrastructure/admission/qa-serving-checks";
type Owned={url:string;name:string;verifyPreservation:()=>Promise<unknown>};
type WorkerReply={id:number;failed?:boolean;pid:number;owner:string;type:string;reads:number;results:string[];diagnostics:{stage:string;failure:string}[];nativeHandleHeld?:boolean};
export type QualificationResult={case:string;status:"PASS"|"FAIL"|"INCONCLUSIVE";evidence:unknown};
const source="c".repeat(64), otherSource="d".repeat(64);
const media={phase:"MediaRead",routeClass:"Media",sourceIdentity:source,workspaceId:"synthetic-workspace",grantId:"synthetic-grant",maximumBytes:8388608};
const page={phase:"Source",routeClass:"Page",sourceIdentity:otherSource};
async function worker(url:string,fingerprint:string,proxyPort?:number){
  const child=fork("scripts/qa/public-share-recovery-worker.ts",[],{execArgv:["--import","tsx"],stdio:["ignore","ignore","ignore","ipc"],...{windowsHide:true}});
  let sequence=0;const pending=new Map<number,{resolve:(r:WorkerReply)=>void;reject:()=>void;timer:NodeJS.Timeout}>();
  child.on("message",(reply:WorkerReply)=>{const p=pending.get(reply.id);if(!p)return;clearTimeout(p.timer);pending.delete(reply.id);if(reply.failed)p.reject();else p.resolve(reply);});
  const request=(action:string,input:object={})=>new Promise<WorkerReply>((resolve,reject)=>{
    const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error("QaWorkerDeadline"));},10000);
    pending.set(id,{resolve,reject:()=>reject(Error("QaWorkerUnavailable")),timer});child.send({id,action,...input});
  });
  const stop=async()=>{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}for(const p of pending.values()){clearTimeout(p.timer);p.reject();}pending.clear();};
  try{const identity=await request("init",{url,fingerprint,proxyPort});return {child,request,identity,stop};}catch{await stop();throw Error("QaWorkerSetupUnavailable");}
}
type Worker=Awaited<ReturnType<typeof worker>>;
async function state(admin:Pool){const p=(await admin.query("SELECT pending_operation IS NOT NULL AS pending,ready,(SELECT count(*)::int FROM qsc_public_admission.leases) AS leases,(SELECT count(*)::int FROM qsc_public_admission.buckets) AS buckets FROM qsc_public_admission.policy")).rows[0];return p;}
export async function qualifyRecovery(fresh:()=>Promise<Owned>,directory:string,selection?:readonly string[]){
 const results:QualificationResult[]=[];
 const run=async(name:string,body:(owned:Owned,admin:Pool,fingerprint:string)=>Promise<unknown>)=>{
  if(selection&&!selection.includes(name))return;
  let owned:Owned|undefined,admin:Pool|undefined;
  try{
    owned=await fresh();admin=new Pool({connectionString:owned.url,max:2,connectionTimeoutMillis:5000,statement_timeout:5000});admin.on("error",()=>{});
    const fingerprint=createHash("sha256").update(randomBytes(32)).digest("hex");
    await migrateNewQaAdmissionDatabase(admin,owned.name,fingerprint);
    await admin.query("UPDATE qsc_public_admission.policy SET ready=true WHERE singleton");
    const evidence=await body(owned,admin,fingerprint);
    await admin.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");
    results.push({case:name,status:"PASS",evidence:{checks:evidence,preservation:await owned.verifyPreservation()}});
  }catch(error){
    const status=error instanceof assert.AssertionError?"FAIL":"INCONCLUSIVE";
    results.push({case:name,status,evidence:{classification:status==="FAIL"?"AssertionMismatch":"QaSetupOrExecutionUnavailable",assertion:status==="FAIL"?{operator:(error as assert.AssertionError).operator,expected:(error as assert.AssertionError).expected,actual:(error as assert.AssertionError).actual}:undefined}});
  }finally{if(admin){try{await admin.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");}catch{}await admin.end();}fs.writeFileSync(path.join(directory,"qualification-results.json"),JSON.stringify({results,acceptance:"HOLD",longLoadRerun:false},null,2));}
  console.log(JSON.stringify(results.at(-1)));
 };
 for(const stage of [1,2,3])for(const mode of ["BeforeExecution","AfterCommitMissing"] as FaultMode[]){
  await run(["Prepare","Debit","Finalize"][stage-1]+"-"+mode,async(owned,admin,fingerprint)=>{
    const proxy=await recoveryFaultProxy();let original:Worker|undefined,peer:Worker|undefined;
    try{
      original=await worker(owned.url,fingerprint,proxy.port);peer=await worker(owned.url,fingerprint);
      assert.notEqual(original.identity.pid,peer.identity.pid);assert.notEqual(original.identity.pid,process.pid);
      proxy.arm(stage,mode);const first=await original.request("admit",{input:media});
      assert.equal(first.type,"Unavailable");assert.equal(first.reads,0);
      if(!proxy.evidence.injected)throw Error("QaFaultBoundaryNotReached");
      assert.equal(proxy.evidence.serverError,false);
      const snapshot=await state(admin),before=mode==="BeforeExecution";
      assert.equal(snapshot.pending,!(stage===1&&before)&&!(stage===3&&!before));
      assert.equal(snapshot.leases,stage===3||stage===2&&!before?1:0);
      assert.equal(snapshot.buckets,snapshot.leases?3:0);
      const byteBalances=async()=>(await admin.query("SELECT tokens::text FROM qsc_public_admission.buckets WHERE key LIKE 'bytes:%' ORDER BY tokens::numeric")).rows.map(r=>Number(r.tokens));
      const committedBalances=snapshot.leases?[72,72,152].map(n=>n*1048576*1000):[];
      assert.deepEqual(await byteBalances(),committedBalances);
      const expected=snapshot.pending?"Unavailable":"Allowed";
      const next=await peer.request("admit",{input:page});assert.equal(next.type,expected);
      assert.equal((await state(admin)).leases,snapshot.leases);
      proxy.disarm();if(stage===1)await original.request("warm");
      const after=await original.request("admit",{input:page});
      assert.equal(after.type,stage===1?expected:"Unavailable");assert.equal(after.reads,0);assert.deepEqual(await byteBalances(),committedBalances);
      if(stage>1)assert.equal(after.diagnostics.at(-1)?.failure,"RECOVERY_STATE");
      assert.equal(first.type,"Unavailable"); // Later state never upgrades this result.
      return {boundary:mode==="BeforeExecution"?"target Parse suppressed before execution/commit; NOT in-flight abort":"actual autocommit ReadyForQuery withheld",
        fault:proxy.evidence,state:snapshot,original:first.type,originalSubsequent:after.type,peer:next.type,twoIndependentOsProcesses:true,directAdmissionUnavailableWithoutReadAuthority:first.type==="Unavailable",leaseCountPreserved:true,
        exactAtomicByteDebitsAndNoRefund:true,scope:"direct Admission fault; not injected Application/HTTP native-I/O coverage",originalDiagnostics:first.diagnostics};
    }finally{await original?.stop();await peer?.stop();await proxy.close();}
  });
 }
 await run("Finalize-delayed-ACK",async(owned,admin,fingerprint)=>{
  const proxy=await recoveryFaultProxy();let original:Worker|undefined,peer:Worker|undefined;
  try{
   original=await worker(owned.url,fingerprint,proxy.port);peer=await worker(owned.url,fingerprint);proxy.arm(3,"AfterCommitDelayed");
   const first=await original.request("admit",{input:media});assert.equal(first.type,"Unavailable");if(!proxy.evidence.injected)throw Error("QaFaultBoundaryNotReached");
   await new Promise(resolve=>setTimeout(resolve,350));assert.equal(proxy.evidence.lateDeliveryAttempted,true);assert.equal(proxy.evidence.lateSocketClosed,true);
   assert.equal((await original.request("admit",{input:page})).type,"Unavailable");assert.equal(first.type,"Unavailable");
   assert.equal((await peer.request("admit",{input:page})).type,"Allowed");assert.equal((await state(admin)).leases,1);
   return {fault:proxy.evidence,original:first.type,directAdmissionUnavailableWithoutReadAuthority:first.type==="Unavailable",peer:"Allowed",lateAckCouldNotReachDestroyedConnection:true,leaseRetained:true,scope:"direct Admission fault, not injected Application/HTTP native-I/O coverage"};
  }finally{await original?.stop();await peer?.stop();await proxy.close();}
 });
 await run("Native-reservation-real-process-termination-restart-and-release",async(owned,admin,fingerprint)=>{
  const workers:Worker[]=[];
  try{
   const a=await worker(owned.url,fingerprint);workers.push(a);const b=await worker(owned.url,fingerprint);workers.push(b);
   const held=await a.request("admit",{input:media});assert.equal(held.type,"Allowed");
   const file=path.join(directory,"native-synthetic.bin");fs.writeFileSync(file,Buffer.alloc(32,7));
   assert.equal((await a.request("readHold",{count:held.id,file})).nativeHandleHeld,true);
   const lease=(await admin.query("SELECT lease_id FROM qsc_public_admission.leases")).rows[0].lease_id;
   await b.request("wrongOwnerRelease",{leaseId:lease});assert.equal((await state(admin)).leases,1);
   await a.stop();assert.ok(a.child.exitCode!==null||a.child.signalCode!==null);
   assert.equal((await state(admin)).leases,1);
   const restart=await worker(owned.url,fingerprint);workers.push(restart);assert.notEqual(restart.identity.owner,a.identity.owner);assert.notEqual(restart.identity.pid,a.identity.pid);
   assert.equal((await restart.request("admit",{input:page})).type,"Allowed");assert.equal((await state(admin)).leases,1);
   const next=await restart.request("admit",{input:{...media,sourceIdentity:otherSource}});assert.equal(next.type,"Allowed");
   const beforeRelease=(await admin.query("SELECT key,tokens::text FROM qsc_public_admission.buckets WHERE key LIKE 'bytes:%' ORDER BY key")).rows;
   await restart.request("release",{count:next.id});await restart.request("release",{count:next.id});assert.equal((await state(admin)).leases,1);
   assert.deepEqual((await admin.query("SELECT key,tokens::text FROM qsc_public_admission.buckets WHERE key LIKE 'bytes:%' ORDER BY key")).rows,beforeRelease);
   return {twoIndependentOsProcesses:true,actualReadAndOpenHandleHeld:true,wrongOwnerDidNotRelease:true,realChildTerminationVerified:true,newOsProcessAndOwner:true,oldLeaseStillReserved:true,duplicateOwnReleaseIdempotent:true,noByteRefund:true,unknownLeaseNotRecovered:true,scope:"held actual read/handle lifecycle; not a slow-disk or remote filesystem cancellation test"};
  }finally{for(const w of workers)await w.stop();}
 });
 await run("Release-COMMIT-ACKloss-after-actual-native-completion",async(owned,admin,fingerprint)=>{
  const proxy=await recoveryFaultProxy();let a:Worker|undefined;
  try{
   a=await worker(owned.url,fingerprint,proxy.port);const held=await a.request("admit",{input:media});assert.equal(held.type,"Allowed");
   const file=path.join(directory,"completed-native-synthetic.bin");fs.writeFileSync(file,Buffer.alloc(32,8));await a.request("readHold",{count:held.id,file});
   const before=(await admin.query("SELECT tokens::text FROM qsc_public_admission.buckets WHERE key='bytes:global'")).rows[0].tokens;
   proxy.arm(5,"AfterCommitMissing");await assert.rejects(a.request("finishRead",{count:held.id}));
   if(!proxy.evidence.injected)throw Error("QaFaultBoundaryNotReached");assert.equal((await state(admin)).leases,0);
   assert.equal((await admin.query("SELECT tokens::text FROM qsc_public_admission.buckets WHERE key='bytes:global'")).rows[0].tokens,before);
   return {actualNativeHandleClosedBeforeRelease:true,realCommitAckWithheld:true,leaseDeletedOnce:true,noResurrectionOrByteRefund:true,scope:"normal completed-read exact release; not unknown-live-read recovery"};
  }finally{await a?.stop();await proxy.close();}
 });
 await run("Two-process-budget-coordination",async(owned,_admin,fingerprint)=>{
  let a:Worker|undefined,b:Worker|undefined;
  try{
   a=await worker(owned.url,fingerprint);b=await worker(owned.url,fingerprint);
   const start=performance.now(),combined=(await Promise.all([a.request("batch",{input:page,count:8}),b.request("batch",{input:page,count:8})])).flatMap(r=>r.results);
   const seconds=(performance.now()-start)/1000,allowed=combined.filter(x=>x==="Allowed").length;
   assert.ok(allowed>0);assert.ok(allowed<=10+2*seconds);
   return {requests:16,allowed,denied:combined.filter(x=>x==="Denied").length,unavailable:combined.filter(x=>x==="Unavailable").length,durationMs:seconds*1000,sourcePageBurst:10,sourcePageRate:2,noEnvelopeOversubscription:true,scope:"bounded correctness contention; not normal-load or capacity qualification"};
  }finally{await a?.stop();await b?.stop();}
 });
 await run("Local-pool-unavailable-healthy-peer-and-closed-untrusted-state",async(owned,admin,fingerprint)=>{
  // Local unreachable transport: loopback owned proxy is first closed; no unrelated endpoint.
  const proxy=await recoveryFaultProxy();const port=proxy.port;await proxy.close();
  const {PostgreSqlPublicShareAdmission}=await import("../../domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission");
  const {randomUUID}=await import("node:crypto");const target=new URL(owned.url);target.port=String(port);
  const unavailable=new Pool({connectionString:target.href,max:1,connectionTimeoutMillis:75,query_timeout:100});unavailable.on("error",()=>{});
  const peer=await worker(owned.url,fingerprint);
  try{
   assert.equal((await new PostgreSqlPublicShareAdmission(unavailable,randomUUID(),fingerprint).admit(page as never)).type,"Unavailable");
   assert.equal((await peer.request("admit",{input:page})).type,"Allowed");
   await admin.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");assert.equal((await peer.request("admit",{input:page})).type,"Unavailable");
   const response=publicShareFailureResponse({ok:false,error:"ServiceUnavailable"},"Media","en");assert.equal(response.status,503);assert.equal(await response.text(),"");
   return {localTransportUnavailable:true,healthyPeerOwnAdmission:true,explicitClosedReadinessRejected:true,http503:true,restoreHistoryVerification:"INCONCLUSIVE; no restore or failover performed; closed-policy guard only"};
  }finally{await unavailable.end();await peer.stop();}
 });

 await run("Held-policy-lock-timeout-and-same-adapter-continuation",async(owned,admin,fingerprint)=>{
  const peer=await worker(owned.url,fingerprint);let lock:PoolClient|undefined;
  try{
   lock=await admin.connect();
   await lock.query("BEGIN");await lock.query("SELECT singleton FROM qsc_public_admission.policy FOR UPDATE");
   const failed=await peer.request("admit",{input:page});assert.equal(failed.type,"Unavailable");
   await lock.query("ROLLBACK");assert.equal((await state(admin)).pending,false);
   assert.equal((await peer.request("admit",{input:page})).type,"Allowed");
   return {actualPolicyRowLockHeld:true,failedClosed:true,sameNonQuarantinedAdapterOwnNewAdmission:true,diagnostics:failed.diagnostics};
  }finally{try{await lock?.query("ROLLBACK");}catch{}lock?.release();await peer.stop();}
 });
 await run("Interrupted-owned-PostgreSQL-connection",async(owned,admin,fingerprint)=>{
  const peer=await worker(owned.url,fingerprint);
  try{
   const terminated=(await admin.query("SELECT pg_terminate_backend(pid) AS stopped FROM pg_stat_activity WHERE datname=$1 AND application_name='qsc-p6-recovery-worker'",[owned.name])).rows;
   assert.equal(terminated.length,1);assert.equal(terminated[0].stopped,true);
   await peer.request("warm");assert.equal((await peer.request("admit",{input:page})).type,"Allowed");
   return {ownedFreshDatabaseOnly:true,actualIdleConnectionTerminated:true,sameAdapterNewDefinitiveAdmission:true,scope:"idle connection interruption, no ambiguous active-transaction rollback claim"};
  }finally{await peer.stop();}
 });
 await run("Pending-blocks-distinct-source-workspace-grant-phases",async(owned,admin,fingerprint)=>{
  const proxy=await recoveryFaultProxy();let original:Worker|undefined,peer:Worker|undefined;
  try{
   original=await worker(owned.url,fingerprint,proxy.port);peer=await worker(owned.url,fingerprint);proxy.arm(2,"AfterCommitMissing");
   assert.equal((await original.request("admit",{input:media})).type,"Unavailable");if(!proxy.evidence.injected)throw Error("QaFaultBoundaryNotReached");
   const before=await state(admin),types=[];
   const tokens=(await admin.query("SELECT tokens::text FROM qsc_public_admission.buckets ORDER BY tokens::numeric")).rows.map(r=>Number(r.tokens));
   assert.deepEqual(tokens,[72,72,152].map(n=>n*1048576*1000));
   for(const routeClass of ["Page","Media"])for(const phase of ["Source","Resolved","MediaRead"]){
    const response:WorkerReply=await peer.request("admit",{input:{...media,phase,routeClass,sourceIdentity:otherSource,workspaceId:"another-workspace",grantId:"another-grant"}});
    assert.equal(response.type,"Unavailable");types.push(response.type);
   }
   assert.deepEqual(await state(admin),before);assert.deepEqual((await admin.query("SELECT tokens::text FROM qsc_public_admission.buckets ORDER BY tokens::numeric")).rows.map(r=>Number(r.tokens)),tokens);
   return {phases:types,differentSourceWorkspaceGrant:true,wholeNamespaceClosed:true,committedBytesAndLeaseRetained:true};
  }finally{await original?.stop();await peer?.stop();await proxy.close();}
 });


 await run("Application-HTTP-no-native-read-after-real-Finalize-ACKloss",async(owned,admin,fingerprint)=>{
  const proxy=await recoveryFaultProxy();let w:Worker|undefined;
  try{
   w=await worker(owned.url,fingerprint,proxy.port);
   const {publicShareResolutionFixture}=await import("../../domains/catalog/sharing/mock/public-share-resolution.fixture");
   const {ResolvePublicProductShare}=await import("../../domains/catalog/sharing/application/resolve-public-product-share");
   const {createPublicShareMediaGet}=await import("../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http");
   const f=await publicShareResolutionFixture();f.withImage();const decisions:string[]=[];
   const admission={admit:async(input:Parameters<typeof f.admission.admit>[0])=>{
    const reply=await w!.request("admit",{input});decisions.push(reply.type);
    if(reply.type==="Allowed")return {type:"Allowed" as const};
    if(reply.type==="Denied")return {type:"Denied" as const,retryAfterSeconds:1};
    return {type:"Unavailable" as const};
   }};
   const resolver=new ResolvePublicProductShare(f.snapshots,f.memory.runtime.lookupDigest,admission,f.reader);
   proxy.arm(9,"AfterCommitDelayed"); // Source3 + Resolved3 + MediaRead3 real autocommit responses.
   const response=await createPublicShareMediaGet(resolver,{resolve:async()=>source})(new Request("http://127.0.0.1/share/synthetic/media"),f.token);
   if(!proxy.evidence.injected)throw Error("QaFaultBoundaryNotReached");
   assert.equal(response.status,503);assert.deepEqual(decisions,["Allowed","Allowed","Unavailable"]);assert.equal(f.state.reads,0);
   assert.equal(proxy.evidence.committedReadyObserved,true);assert.equal(proxy.evidence.serverError,false);
   const committedState=await state(admin);assert.equal(committedState.pending,false);assert.equal(committedState.leases,1);
   await new Promise(resolve=>setTimeout(resolve,350));assert.equal(f.state.reads,0);assert.equal(response.status,503);
   const afterLateAck=await state(admin);assert.equal(afterLateAck.pending,false);assert.equal(afterLateAck.leases,1);
   assert.equal(proxy.evidence.serverError,false);assert.equal(proxy.evidence.lateDeliveryAttempted,true);
   assert.equal(await response.text(),"");
   return {realPostgreSqlAdmission:true,realCommittedMediaReadFinalizeAckLoss:true,actualApplicationAndHttpBoundary:true,
    syntheticMemoryGrantSnapshot:true,readerInvocationCount:0,originalHttpStatus:503,leaseRetained:true,lateResponseDidNotAuthorize:true,
    fault:{...proxy.evidence},committedState,afterLateAck,
    scope:"real admission fault through actual Application/HTTP with existing memory grant/resource fixture; native reader was correctly never invoked; separate serving test uses actual PostgreSQL grant/visibility/native file"};
  }finally{await w?.stop();await proxy.close();}
 });

 await run("Real-PostgreSQL-HTTP-tenant-visibility-current-main-redaction",async(owned,admin)=>{
  const key=randomBytes(32),fingerprint=createHash("sha256").update(key).digest("hex");
  await admin.query("UPDATE qsc_public_admission.policy SET source_key_fingerprint=$1 WHERE singleton",[fingerprint]);
  return await verifyQaServingComposition(owned.url,key);
 });
 if(!selection)results.push({case:"Actual-restore-failover-operator-restart-authority",status:"INCONCLUSIVE",evidence:"No restore/failover or new operator capability was authorized/performed; closed policy is not history validation. No instantaneous shared-distrust detector claimed."});
 fs.writeFileSync(path.join(directory,"qualification-results.json"),JSON.stringify({results,acceptance:"HOLD",longLoadRerun:false},null,2));
 return results;
}
