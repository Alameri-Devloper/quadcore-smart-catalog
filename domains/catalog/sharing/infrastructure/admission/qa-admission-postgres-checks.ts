import { assertQaMigrationLineage, readQaMigrationLineage } from "./qa-migration-lineage";
import { assertQaAdmissionEndpoint } from "./qa-admission-endpoint";
import { verifyAmbiguousAdmissionCommit } from "./qa-ambiguous-commit-check";
import { verifyQaServingComposition } from "./qa-serving-checks";
import { Pool } from "pg";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { PostgreSqlPublicShareAdmission } from "./postgresql-public-share-admission";
import { migrateNewQaAdmissionDatabase } from "./qa-admission-migration";
import { recoverTerminatedQaWorkers,inspectAdmissionHealth,cleanupQaAdmission,startRecoverableQaAdmissionWorker } from "./qa-admission-operations";
import { MIB } from "./public-admission-policy";
export async function verifyAdmissionPostgres(url:string) {
 const expected=assertQaAdmissionEndpoint(url);assert.match(expected.pathname,/^\/qsc_p6_admission_test_[0-9_]+$/);
 const lineage=readQaMigrationLineage();
 const pool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:75,statement_timeout:100});pool.on("error",()=>{});
 const setupPool=new Pool({connectionString:url,max:1,statement_timeout:10000});
 const second=new Pool({connectionString:url,max:2,connectionTimeoutMillis:75,statement_timeout:100});second.on("error",()=>{});
 const sourceKey=randomBytes(32), fingerprint=createHash("sha256").update(sourceKey).digest("hex"),source="a".repeat(64);
 const diagnostics:unknown[]=[];const owner=randomUUID(), adapter=new PostgreSqlPublicShareAdmission(pool,owner,fingerprint,e=>diagnostics.push(e)), other=new PostgreSqlPublicShareAdmission(second,randomUUID(),fingerprint,e=>diagnostics.push(e));
 const checks:string[]=[], durations:number[]=[],ownedChildren:ChildProcess[]=[];
 const check=(s:string)=>checks.push(s);
 const input={phase:"Source" as const,routeClass:"Page" as const,sourceIdentity:source};
 const reset=async()=>{await pool.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");await pool.query("TRUNCATE qsc_public_admission.buckets,qsc_public_admission.leases");await pool.query("UPDATE qsc_public_admission.policy SET ready=true,pending_operation=NULL WHERE singleton");}; // only owned fresh synthetic DB, between stopped test workloads
 try {
 assert.equal(Number((await setupPool.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n),0,"RequiresNewEmptyQaDatabase");
 const migration=await migrateNewQaAdmissionDatabase(pool,expected.pathname.slice(1),fingerprint);
 assert.deepEqual(await adapter.admit(input),{type:"Unavailable"});check("fresh schema closed until explicit QA bootstrap");
 await pool.query("UPDATE qsc_public_admission.policy SET ready=true,pending_operation=NULL WHERE singleton");
 const start=performance.now();const results=[];
 for(let i=0;i<16;i++){const t=performance.now();results.push(await (i%2?adapter:other).admit(input));durations.push(performance.now()-t);}
 const elapsed=(performance.now()-start)/1000, allowed=results.filter(r=>r.type==="Allowed").length;
 assert.ok(allowed<=10+2*elapsed);assert.ok(allowed>0,JSON.stringify({diagnostics,results}));check("two independent pools enforce source Page B+rT");
 await pool.query("UPDATE qsc_public_admission.buckets SET tokens=0,sampled_ms=floor(extract(epoch FROM clock_timestamp())*1000)+60000 WHERE key=$1",["request:source:"+source+":Page"]);
 const before=(await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows;
 const deny=await adapter.admit(input);assert.equal(deny.type,"Denied");
 assert.deepEqual((await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows,before);check("denied phase does not debit");
 await reset();assert.equal((await adapter.admit(input)).type,"Allowed");
 const resolved={...input,phase:"Resolved" as const,workspaceId:"qa-workspace",grantId:"qa-grant"};
 assert.equal((await adapter.admit(resolved)).type,"Allowed");
 assert.equal(Number((await pool.query("SELECT tokens FROM qsc_public_admission.buckets WHERE key='request:global'")).rows[0].tokens),39000);check("Source and Resolved charge disjoint request budgets");
 const media={...resolved,phase:"MediaRead" as const,maximumBytes:8*MIB};
 const a=await adapter.admit(media),b=await other.admit(media);assert.equal(a.type,"Allowed");assert.equal(b.type,"Allowed");
 const tokens=(await pool.query("SELECT tokens FROM qsc_public_admission.buckets WHERE key='request:global'")).rows[0].tokens;
 assert.equal((await adapter.admit(media)).type,"Denied");assert.equal((await inspectAdmissionHealth(pool)).occupancy,2);
 assert.equal((await pool.query("SELECT tokens FROM qsc_public_admission.buckets WHERE key='request:global'")).rows[0].tokens,tokens);
 if(a.type!=="Allowed"||!a.release||b.type!=="Allowed"||!b.release)throw Error();
 await a.release();await a.release();assert.equal((await inspectAdmissionHealth(pool)).occupancy,1);await b.release();
 assert.equal((await inspectAdmissionHealth(pool)).occupancy,0);check("full-cap bytes, scoped concurrency, exact idempotent release, no request triple charge");
 await reset();
 const workers:ChildProcess[]=[];let firstGo=Infinity;
 const work=()=>new Promise<string[]>((resolve,reject)=>{
  const child=fork("domains/catalog/sharing/infrastructure/admission/qa-admission-worker.ts",[],{execArgv:["--import","tsx"],stdio:["ignore","ignore","ignore","ipc"]});workers.push(child);ownedChildren.push(child);
  child.once("error",()=>reject(Error("WorkerFailure")));child.on("message",(m:{results?:string[];error?:string;ready?:boolean})=>{if(m.ready){firstGo=Math.min(firstGo,performance.now());child.send({go:true});}else if(m.error)reject(Error(m.error));else if(m.results)resolve(m.results);});
  child.send({url,owner:randomUUID(),fingerprint,source,count:12});
 });
 const combined=(await Promise.all([work(),work()])).flat();
 await Promise.all(workers.map(c=>c.exitCode===null?once(c,"exit"):Promise.resolve()));
 assert.ok(combined.filter(r=>r==="Allowed").length<=10+2*(performance.now()-firstGo)/1000);
 assert.ok(combined.includes("Allowed"));assert.ok(combined.includes("Denied"));check("two actual independent processes, no oversubscription; overload503="+combined.filter(r=>r==="Unavailable").length);
 await reset();
 // Exercise every configured budget against its real stored row, without changing policy rates.
 let exhaustedBuckets=0;
 for(const routeClass of ["Page","Media"] as const)for(const phase of ["Source","Resolved","MediaRead"] as const){
  await reset();const candidate={...media,routeClass,phase,workspaceId:"qa:مساحة",grantId:"qa:grant"};
  const first=await adapter.admit(candidate);assert.equal(first.type,"Allowed");if(first.type==="Allowed")await first.release?.();
  const keys=(await pool.query("SELECT key FROM qsc_public_admission.buckets ORDER BY key")).rows.map(r=>r.key as string);
  for(const key of keys){
   const old=(await pool.query("SELECT tokens,sampled_ms FROM qsc_public_admission.buckets WHERE key=$1",[key])).rows[0];
   await pool.query("UPDATE qsc_public_admission.buckets SET tokens=0,sampled_ms=floor(extract(epoch FROM clock_timestamp())*1000)+60000 WHERE key=$1",[key]);
   const state=(await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows;
   const denied=await other.admit(candidate);assert.equal(denied.type,"Denied");if(denied.type==="Denied")assert.ok(denied.retryAfterSeconds!>=1&&denied.retryAfterSeconds!<=60);
   assert.deepEqual((await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows,state);
   await pool.query("UPDATE qsc_public_admission.buckets SET tokens=$2,sampled_ms=$3 WHERE key=$1",[key,old.tokens,old.sampled_ms]);exhaustedBuckets++;
  }
 }
 check("all budget rows deny atomically with bounded retry on both routes; canonical Unicode/colon workspace accepted; checks="+exhaustedBuckets);
 await reset(); const lock=await pool.connect(); await lock.query("BEGIN");await lock.query("SELECT * FROM qsc_public_admission.policy FOR UPDATE");
 const t=performance.now();assert.equal((await other.admit(input)).type,"Unavailable");assert.ok(performance.now()-t<250);await lock.query("ROLLBACK");lock.release();check("held policy lock fails closed within bounded timeout");
 const c1=await second.connect(),c2=await second.connect();const t2=performance.now();assert.equal((await other.admit(input)).type,"Unavailable");assert.ok(performance.now()-t2<250);c1.release();c2.release();check("saturated pool fails closed");
 await pool.query("UPDATE qsc_public_admission.policy SET version='wrong' WHERE singleton");assert.equal((await adapter.admit(input)).type,"Unavailable");await pool.query("UPDATE qsc_public_admission.policy SET version='p6-local-qa-a-o-v1' WHERE singleton");check("policy mismatch closed");
 await reset();
 const leases=[];
 for(let i=0;i<4;i++) {const r=await adapter.admit({...media,sourceIdentity:String(i+1).repeat(64),workspaceId:"qa-workspace-"+i,grantId:"qa-grant-"+i});assert.equal(r.type,"Allowed");leases.push(r);}
 assert.equal((await other.admit({...media,sourceIdentity:"9".repeat(64),workspaceId:"qa-other",grantId:"qa-other"})).type,"Denied");
 assert.equal((await inspectAdmissionHealth(pool)).occupancy,4);
 await pool.query("UPDATE qsc_public_admission.leases SET created_ms=0");
 await setupPool.query("UPDATE qsc_public_admission.buckets SET touched_ms=0");
 await cleanupQaAdmission(pool,fingerprint);
 assert.equal((await inspectAdmissionHealth(pool)).occupancy,4);
 assert.ok(Number((await pool.query("SELECT count(*) AS n FROM qsc_public_admission.buckets WHERE key='bytes:global'")).rows[0].n)===1);
 for(const r of leases)if(r.type==="Allowed")await r.release?.();check("global occupancy4 across scopes; aged leases and backing protection never auto-expire");
 await reset();
 await setupPool.query("INSERT INTO qsc_public_admission.buckets SELECT 'capacity:'||n,0,0,extract(epoch FROM clock_timestamp())*1000 FROM generate_series(1,50000) n");
 assert.equal((await adapter.admit(input)).type,"Unavailable");
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM qsc_public_admission.buckets")).rows[0].n),50000);check("50000 row cap atomic failclosed without active eviction");
 await setupPool.query("UPDATE qsc_public_admission.buckets SET touched_ms=0");
 // All rows are stale, but only the oldest 500 belong in this bounded step.
 await setupPool.query("UPDATE qsc_public_admission.buckets SET touched_ms=1000 WHERE substring(key from 10)::integer>500");
 assert.equal((await cleanupQaAdmission(pool,fingerprint)).removed,500);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM qsc_public_admission.buckets")).rows[0].n),49500);
 assert.equal(Number((await pool.query("SELECT count(*) AS n FROM qsc_public_admission.buckets WHERE touched_ms=0")).rows[0].n),0);
 check("cleanup oldest eligible500; no equal-expiry key order required;360s capacity target not inferred");
 await reset();
 assert.equal((await adapter.admit(media)).type,"Allowed");
 await pool.query("UPDATE qsc_public_admission.buckets SET tokens=0,sampled_ms=extract(epoch FROM clock_timestamp())*1000+60000 WHERE key='bytes:global'");
 const byteBefore=(await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows;
 assert.equal((await other.admit({...media,workspaceId:"qa-other",grantId:"qa-other",sourceIdentity:"b".repeat(64)})).type,"Denied");
 assert.deepEqual((await pool.query("SELECT key,tokens FROM qsc_public_admission.buckets ORDER BY key")).rows,byteBefore);check("byte exhaustion and backward DB sample deny atomically without debit");
 await reset();
 // Demonstrate real owned child termination proof before exact bounded recovery.
 const worker=await startRecoverableQaAdmissionWorker({url,fingerprint,source});
 const crashOwner=worker.ownerId,child=worker.child;ownedChildren.push(child);
 const ids=(await pool.query("SELECT lease_id FROM qsc_public_admission.leases WHERE owner_id=$1",[crashOwner])).rows.map(r=>r.lease_id);
 await pool.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");
 await assert.rejects(recoverTerminatedQaWorkers(pool,[worker],ids));
 await assert.rejects(recoverTerminatedQaWorkers(pool,[{ownerId:crashOwner,child}],ids));
 child.kill();await once(child,"exit");await assert.rejects(recoverTerminatedQaWorkers(pool,[{ownerId:crashOwner,child}],ids));assert.equal((await recoverTerminatedQaWorkers(pool,[worker],ids)).released,1);
 assert.equal((await recoverTerminatedQaWorkers(pool,[worker],ids)).released,0);
 assert.equal((await adapter.admit(input)).type,"Unavailable");check("live worker recovery refused; terminated incarnation exact recovery idempotent; remains closed");
 await reset();
 const ambiguousCommit=await verifyAmbiguousAdmissionCommit(url,fingerprint,pool);
 await reset();
 const serving=await verifyQaServingComposition(url,sourceKey);
 assert.equal((await pool.query("SELECT ready FROM qsc_public_admission.policy WHERE singleton")).rows[0].ready,false);
 const operationalLedger=(await pool.query("SELECT version,sha256 FROM qsc_public_admission.migrations")).rows;assert.equal(operationalLedger.length,1);assert.equal(operationalLedger[0].sha256,migration.sha256);
 const applied=(await pool.query("SELECT id,hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id")).rows;
 assertQaMigrationLineage(lineage,applied);check("Complete Drizzle journal SQL hashes, insertion order and independent operational ledger match");
 durations.sort((a,b)=>a-b);
 return {checks,migration,serving,ambiguousCommit,diagnostics,postgresVersion:(await pool.query("SHOW server_version")).rows[0].server_version,
 maxConnections:Number((await pool.query("SHOW max_connections")).rows[0].max_connections),
 connectionCount:Number((await pool.query("SELECT count(*) FROM pg_stat_activity")).rows[0].count),
 sampleLatencyMs:{count:durations.length,p95:durations[Math.floor(durations.length*.95)],max:durations.at(-1)},
 loadQualification:"PENDING: bounded correctness only; not 15 minute profiles or VPS qualification",databaseRetained:true};
 } finally {for(const child of ownedChildren)if(child.exitCode===null&&child.signalCode===null){child.kill();try{await once(child,"exit",{signal:AbortSignal.timeout(3000)});}catch{}}await Promise.all([pool.end(),second.end(),setupPool.end()]);}
}
