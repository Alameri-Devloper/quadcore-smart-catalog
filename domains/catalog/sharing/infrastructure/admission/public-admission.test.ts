import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { bucket, refill, retryAfter } from "./public-admission-policy";
import { canonicalSource, QaTrustedPublicShareSource, admissionDiagnostic } from "./qa-public-share-source";
test("scaled continuous refill, burst clamp and backward clock",()=>{
 const b=bucket("test",4,20); assert.equal(refill(BigInt(1000),BigInt(100),BigInt(350),b),BigInt(2000));
 assert.equal(refill(BigInt(19999),BigInt(0),BigInt(999999),b),BigInt(20000)); assert.equal(refill(BigInt(1000),BigInt(200),BigInt(100),b),BigInt(1000));
 assert.equal(retryAfter(BigInt(1),BigInt(4)),1); assert.equal(retryAfter(BigInt(999999999),BigInt(1)),60);
});
test("canonical full IPv6 and mapped IPv4 normalization",()=>{
 assert.equal(canonicalSource("2001:0db8:0:0:0:0:0:1"),"2001:db8::1");
 assert.equal(canonicalSource("::ffff:192.0.2.1"),"192.0.2.1");
 for(const x of [" 192.0.2.1","192.0.2.1, 198.51.100.1","unknown","192.0.2.01","fe80::1%eth0"]) assert.equal(canonicalSource(x),null);
});
test("header alone never supplies trusted source, duplicate/missing rejected",async()=>{
 const trusted=new WeakSet<Request>(), source=new QaTrustedPublicShareSource(randomBytes(32),r=>trusted.has(r));
 const request=new Request("http://localhost/share/synthetic",{headers:{"x-qsc-qa-source":"192.0.2.1"}});
 assert.equal(await source.resolve(request),null); trusted.add(request);
 const digest=await source.resolve(request); assert.match(digest!,/^[a-f0-9]{64}$/); assert.equal(await source.resolve(request),digest);
 for(const v of ["192.0.2.1, 192.0.2.1","::ffff:192.0.2.1",""]) {
 const r=new Request(request.url,{headers:{"x-qsc-qa-source":v}}); trusted.add(r); assert.equal(await source.resolve(r),null); }
});
test("aggregate diagnostics cannot carry synthetic sensitive markers",()=>{
 const marker="SYNTHETIC_BEARER_REFERER_IP_SOURCE";
 const out=JSON.stringify(admissionDiagnostic("Media",marker,777,100));
 assert.ok(!out.includes(marker)); assert.deepEqual(JSON.parse(out),{route:"Media",method:"OTHER",status:503,duration:"lt200"});
});

import { createIsolatedPublicShareQaRuntime } from "../isolated-public-share-qa-runtime";
import { migrateNewQaAdmissionDatabase } from "./qa-admission-migration";
import { startRecoverableQaAdmissionWorker, recoverTerminatedQaWorkers } from "./qa-admission-operations";
import { environment } from "../crypto/public-share-crypto.test-fixtures";
import type { Pool } from "pg";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
test("pg query host overrides are rejected before database connection or worker start",async()=>{
 const url="postgresql://synthetic@127.0.0.1:5432/qsc_p6_admission_test_20261022?host=198.51.100.25";
 assert.throws(()=>createIsolatedPublicShareQaRuntime({mode:"ISOLATED_LOCAL_QA",databaseUrl:url,mediaRoot:resolve("artifacts"),sourceKey:randomBytes(32),crypto:environment(),verifiedIngressRequest:()=>false}));
 let touched=false;
 const pool={options:{connectionString:url},connect:async()=>{touched=true;throw Error();}} as unknown as Pool;
 await assert.rejects(migrateNewQaAdmissionDatabase(pool,"qsc_p6_admission_test_20261022","a".repeat(64)));
 await assert.rejects(startRecoverableQaAdmissionWorker({url,fingerprint:"a".repeat(64),source:"b".repeat(64)}));
 assert.equal(touched,false);
});
test("unregistered terminated child cannot prove lease ownership",async()=>{
 const child=spawn(process.execPath,["-e","process.exit(0)"],{stdio:"ignore",windowsHide:true});await once(child,"exit");
 let touched=false;const pool={connect:async()=>{touched=true;throw Error();}} as unknown as Pool;
 await assert.rejects(recoverTerminatedQaWorkers(pool,[{ownerId:"00000000-0000-4000-8000-000000000001",child}],[]));assert.equal(touched,false);
});

test("diagnostics distinguish native deadlines and fast recovery closure without changing authorization",async()=>{
 const {PostgreSqlPublicShareAdmission}=await import('./postgresql-public-share-admission');const events:{failure:string;stage:string}[]=[];let connections=0;
 const client={query:async({text}:{text:string})=>{if(text.includes('prepare_operation'))return {rows:[{prepared:true}]};if(text.includes('decide_operation'))return {rows:[{result:{type:'Allowed'}}]};throw Error('Query read timeout');},on:()=>{},release:()=>{}};
 const pool={connect:async()=>{connections++;return client;}}as unknown as Pool;const adapter=new PostgreSqlPublicShareAdmission(pool,'11111111-1111-4111-8111-111111111111','a'.repeat(64),e=>events.push(e));const input={phase:'Source' as const,routeClass:'Page' as const,sourceIdentity:'b'.repeat(64)};
 assert.deepEqual(await adapter.admit(input),{type:'Unavailable'});assert.deepEqual(events.at(-1),{outcome:'Unavailable',stage:'Finalize',failure:'QUERY_READ_TIMEOUT'});assert.deepEqual(await adapter.admit(input),{type:'Unavailable'});assert.equal(events.at(-1)?.failure,'RECOVERY_STATE');assert.equal(connections,1);
});

test("diagnostics only expose fixed classifications and observer failure never authorizes",async()=>{
 const {PostgreSqlPublicShareAdmission}=await import('./postgresql-public-share-admission');for(const [message,expected]of [['Connection terminated due to connection timeout','POOL_CONNECT_TIMEOUT'],['timeout exceeded when trying to connect','POOL_WAIT_TIMEOUT'],['AdmissionDeadline','ADMISSION_DEADLINE'],['SYNTHETIC_PRIVATE','UNCLASSIFIED']]as const){const events:unknown[]=[];const pool={connect:async()=>{throw Error(message);}}as unknown as Pool;const a=new PostgreSqlPublicShareAdmission(pool,'11111111-1111-4111-8111-111111111111','a'.repeat(64),e=>events.push(e));assert.deepEqual(await a.admit({phase:'Source',routeClass:'Page',sourceIdentity:'b'.repeat(64)}),{type:'Unavailable'});assert.ok(JSON.stringify(events).includes(expected));assert.ok(!JSON.stringify(events).includes('SYNTHETIC_PRIVATE'));}
 let touched=false;const a=new PostgreSqlPublicShareAdmission({connect:async()=>{touched=true;throw Error();}}as unknown as Pool,'11111111-1111-4111-8111-111111111111','a'.repeat(64),()=>{throw Error('SYNTHETIC_PRIVATE');});assert.deepEqual(await a.admit({phase:'Source',routeClass:'Page',sourceIdentity:'invalid'}),{type:'Unavailable'});assert.equal(touched,false);
});
test("definitive Finalize lock rejection preserves MediaRead quarantine and redacts driver details",async()=>{
 const {PostgreSqlPublicShareAdmission}=await import('./postgresql-public-share-admission');
 const diagnostics:unknown[]=[],destroyed:boolean[]=[],calls:string[]=[];let connections=0,operation='';
 const client={query:async({text,values}:{text:string;values:unknown[]})=>{
  if(text.includes('prepare_operation')){calls.push('Prepare');operation=String(values[0]);return{rows:[{prepared:true}]};}
  if(text.includes('decide_operation')){calls.push('Decide');return{rows:[{result:{type:'Allowed',leaseId:operation}}]};}
  calls.push('Finalize');throw Object.assign(Error('SYNTHETIC_PRIVATE_DRIVER_CONTEXT'),{code:'55P03'});
 },on:()=>{},release:(destroy:boolean)=>destroyed.push(destroy)};
 const pool={connect:async()=>{connections++;return client;}}as unknown as Pool;
 const adapter=new PostgreSqlPublicShareAdmission(pool,'11111111-1111-4111-8111-111111111111','a'.repeat(64),e=>diagnostics.push(e));
 const input={phase:'MediaRead' as const,routeClass:'Media' as const,sourceIdentity:'b'.repeat(64),workspaceId:'qa-workspace',grantId:'qa-grant',maximumBytes:8*1024*1024};
 assert.deepEqual(await adapter.admit(input),{type:'Unavailable'});
 assert.deepEqual(calls,['Prepare','Decide','Finalize']);assert.deepEqual(destroyed,[true]);
 assert.deepEqual(diagnostics.at(-1),{outcome:'Unavailable',stage:'Finalize',failure:'55P03'});
 assert.deepEqual(await adapter.admit(input),{type:'Unavailable'});assert.equal(connections,1);
 assert.deepEqual(calls,['Prepare','Decide','Finalize']);assert.deepEqual(diagnostics.at(-1),{outcome:'Unavailable',stage:'Acquire',failure:'RECOVERY_STATE'});
 assert.ok(!JSON.stringify(diagnostics).includes('SYNTHETIC_PRIVATE_DRIVER_CONTEXT'));
});
