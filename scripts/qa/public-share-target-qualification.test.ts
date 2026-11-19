import test from "node:test";
import { fork } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, chmod, lstat, readFile } from "node:fs/promises";
import path from "node:path";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { assertTargetQaMode, composeTargetRuntime, measuredTargetAdmission, startTargetSocket, targetRequestHandler, type TargetRuntime, type TargetWorkerConfiguration } from "./public-share-target-worker";
import { targetGateMapping, targetProfile, renderTargetIngress } from "./public-share-target-qualification";
import { PerformanceMeasurements } from "./public-share-performance-measurements";
import { publicShareFailureResponse, publicShareHeaders } from "../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http";
import { publicShareResolutionFixture } from "../../domains/catalog/sharing/mock/public-share-resolution.fixture";

const testEnvironment=process.env as Record<string,string|undefined>;
const evidenceRoot=path.resolve("artifacts/task-reviews/p6-private-target-transport-20261027");
testEnvironment.NODE_ENV="test";
function exchange(runtime:TargetRuntime,options:{authorized?:boolean;url?:string;method?:string;headers?:string[]}={}) {
  let status=0,body:unknown,headers:unknown;
  const req={url:options.url??"/share/"+"B".repeat(43),method:options.method??"GET",rawHeaders:options.headers??["X-QSC-QA-Source","192.0.2.1"]} as IncomingMessage;
  const res={headersSent:false,writeHead(s:number,h:unknown){status=s;headers=h;},end(v:unknown){body=v;}} as unknown as ServerResponse;
  return targetRequestHandler(runtime,()=>options.authorized!==false)(req,res).then(()=>({status,body,headers}));
}
function stubRuntime(){const calls:{source:string;token:string;route:string;method:string}[]=[];const metrics=new PerformanceMeasurements();return{calls,metrics,execute:async(r:Request,source:string,token:string,route:"Page"|"Media")=>{calls.push({source,token,route,method:r.method});return new Response("ok",{status:200,headers:publicShareHeaders()});}};}

test("Production/default modes refuse before pool or socket construction",async()=>{
  const prior=testEnvironment.NODE_ENV;try{for(const mode of ["production","development",undefined]){if(mode)testEnvironment.NODE_ENV=mode;else delete testEnvironment.NODE_ENV;assert.throws(assertTargetQaMode,/TargetQaModeRequired/);assert.throws(()=>composeTargetRuntime({} as TargetWorkerConfiguration),/TargetQaModeRequired/);await assert.rejects(startTargetSocket(stubRuntime(),{socketDirectory:evidenceRoot,socketName:"worker-1.sock"}),/TargetQaModeRequired/);}}finally{testEnvironment.NODE_ENV=prior;}
});
test("Admission wrapper preserves exact result and release identity, charges once",async()=>{
  const metrics=new PerformanceMeasurements();let debits=0,released=0;const release=async()=>{released++;};const result={type:"Allowed" as const,release};const port=measuredTargetAdmission({admit:async()=>{debits++;return result;}},metrics);
  const actual=await port.admit({phase:"MediaRead",routeClass:"Media",sourceIdentity:"synthetic",workspaceId:"w",grantId:"g",maximumBytes:8388608});assert.equal(actual,result);assert.equal(actual.type==="Allowed"&&actual.release,release);assert.equal(debits,1);assert.equal(released,0);await release();assert.equal(released,1);assert.equal(metrics.snapshot().durationsMs["Admission.Media.MediaRead"].count,1);
});
test("Denied, Unavailable and thrown admission are not retried or upgraded",async()=>{
  for(const result of [{type:"Denied" as const,retryAfterSeconds:3},{type:"Unavailable" as const}]){let n=0;const port=measuredTargetAdmission({admit:async()=>{n++;return result;}},new PerformanceMeasurements());assert.equal(await port.admit({phase:"Source",routeClass:"Page",sourceIdentity:"x"}),result);assert.equal(n,1);}
  const metrics=new PerformanceMeasurements();await assert.rejects(measuredTargetAdmission({admit:async()=>{throw Error("SYNTHETIC_SECRET");}},metrics).admit({phase:"Source",routeClass:"Page",sourceIdentity:"x"}));assert.equal(metrics.snapshot().durationsMs["Admission.Page.Source"].count,1);assert.ok(!JSON.stringify(metrics.snapshot()).includes("SYNTHETIC_SECRET"));
});
test("Unregistered transport returns503 without resolving or charging",async()=>{const r=stubRuntime();assert.equal((await exchange(r,{authorized:false})).status,503);assert.equal(r.calls.length,0);});
test("Missing, duplicate, malformed or client-forwarded source cannot reach resolver",async()=>{
  for(const headers of [[],["x-qsc-qa-source","192.0.2.1","X-QSC-QA-Source","192.0.2.2"],["x-qsc-qa-source","192.0.2.1,192.0.2.2"],["x-qsc-qa-source"," 192.0.2.1"],["x-qsc-qa-source","192.0.2.1","Forwarded","for=spoof"],["x-qsc-qa-source","192.0.2.1","X-Forwarded-For","spoof"],["x-qsc-qa-source","192.0.2.1","X-Real-IP","spoof"]]){const r=stubRuntime();assert.equal((await exchange(r,{headers})).status,503);assert.equal(r.calls.length,0);}
});
test("Page, Media and HEAD delegate once; OPTIONS/control routes never execute P6",async()=>{
 const r=stubRuntime(),token="B".repeat(43);assert.equal((await exchange(r)).status,200);assert.equal((await exchange(r,{url:"/share/"+token+"/media"})).status,200);assert.equal((await exchange(r,{method:"HEAD"})).body,undefined);assert.deepEqual(r.calls.map(x=>[x.route,x.method]),[["Page","GET"],["Media","GET"],["Page","HEAD"]]);
 for(const method of ["POST","PUT","PATCH","DELETE","OPTIONS"])assert.equal((await exchange(r,{method})).status,method==="OPTIONS"?204:405);
 assert.equal((await exchange(r,{url:"/control/reset"})).status,404);assert.equal(r.calls.length,3);
});
test("Existing error factories preserve429/503, Retry-After and safe headers",async()=>{
 for(const error of ["AdmissionDenied","ServiceUnavailable"] as const){const r={metrics:new PerformanceMeasurements(),execute:async()=>publicShareFailureResponse({ok:false,error,retryAfterSeconds:2},"Page","en")};const response=await exchange(r);assert.equal(response.status,error==="AdmissionDenied"?429:503);const headers=response.headers as Record<string,string>;assert.equal(headers["cache-control"],"private, no-store");if(error==="AdmissionDenied")assert.equal(headers["retry-after"],"2");assert.ok(!String(response.body).includes("SYNTHETIC_SECRET"));}
});
test("Real resolver preserves lease until read actually settles; each phase once",async()=>{
 const f=await publicShareResolutionFixture();f.withImage();let finish!:()=>void;const held=new Promise<void>(r=>{finish=r;});const {ResolvePublicProductShare}=await import("../../domains/catalog/sharing/application/resolve-public-product-share");
 const resolver=new ResolvePublicProductShare(f.snapshots,f.memory.runtime.lookupDigest,measuredTargetAdmission(f.admission,new PerformanceMeasurements()),{read:async()=>{f.state.reads++;await held;return f.state.readResult;}});
 const response=resolver.resolveMedia(f.token,"synthetic");while(!f.state.reads)await new Promise(r=>setTimeout(r,1));assert.equal(f.state.releases,0);finish();assert.equal((await response).ok,true);assert.equal(f.state.releases,1);assert.deepEqual(f.state.admissions.map(x=>x.phase),["Source","Resolved","MediaRead"]);
});
test("Approved workloads and P7 gates retained; no performance qualification implied",()=>{
 assert.deepEqual([targetProfile("text").opensPerSecond,targetProfile("images").opensPerSecond,targetProfile("nat").opensPerSecond],[10,2,1]);assert.equal(targetProfile("images").maximumImageBytes,262144);assert.equal(targetProfile("text").durationSeconds,900);assert.deepEqual(targetProfile("nat").natBurst,{opens:5,spacingMs:200,idleMs:5100});assert.equal(targetGateMapping.acceptance,"HOLD");assert.match(targetGateMapping.p7,/Next SSR/);
});
test("Real Linux Unix socket enforces permissions, collisions, methods and source checks",{skip:process.platform!=="linux"},async()=>{
 await mkdir(evidenceRoot,{recursive:true});const directory=await mkdtemp(path.join(evidenceRoot,"socket-"));await chmod(directory,0o750);const runtime=stubRuntime();const config={socketDirectory:directory,socketName:"worker-1.sock" as const};const server=await startTargetSocket(runtime,config);
 try{assert.equal((await lstat(server.socket)).mode&0o777,0o660);await assert.rejects(startTargetSocket(runtime,config),/Collision/);
 const request=(headers:Record<string,string>)=>new Promise<number>((resolve,reject)=>{const r=http.request({socketPath:server.socket,path:"/share/"+"B".repeat(43),headers},res=>{res.resume();res.on("end",()=>resolve(res.statusCode!));});r.on("error",reject);r.end();});
 assert.equal(await request({"x-qsc-qa-source":"192.0.2.1"}),200);assert.equal(await request({"x-qsc-qa-source":"192.0.2.1","x-forwarded-for":"spoof"}),503);assert.equal(runtime.calls.length,1);
 }finally{await server.close();}
 await chmod(directory,0o777);await assert.rejects(startTargetSocket(runtime,config),/DirectoryUnsafe/);
});
test("Target template retains limits, strips sources, forbids upstream replay and control URLs",async()=>{
 const text=await readFile("scripts/qa/public-share-ingress.target.conf","utf8");for(const literal of ["listen 127.0.0.1:9443 ssl","proxy_next_upstream off","limit_rate 1m","limit_conn global_media 8","limit_conn source_media 2","rate=40r/s","rate=8r/s","burst=80","burst=40","proxy_set_header X-QSC-QA-Source $remote_addr","proxy_set_header Forwarded \"\"","location / { return 503; }"])assert.ok(text.includes(literal),literal);
 if(process.platform==="linux"){await mkdir(evidenceRoot,{recursive:true});const directory=await mkdtemp(path.join(evidenceRoot,"ingress-"));await chmod(directory,0o750);const file=await renderTargetIngress({directory,instances:2});assert.ok(!(await readFile(file,"utf8")).includes("__QA_"));await assert.rejects(renderTargetIngress({directory,instances:2}),/EEXIST/);}
});
// Optional owned, freshly prepared PostgreSQL fixture supplied only by private stdin.
// No database reset/migration/creation is performed by this test or transport.
test("Real PostgreSQL snapshot/admission/native media integration via private transport",{skip:process.env.QSC_TARGET_INTEGRATION!=="stdin"},async()=>{
 let text="";for await(const chunk of process.stdin)text+=chunk;if(text.length>100000)throw Error("PrivateInputTooLarge");const fixture=JSON.parse(text) as {configuration:TargetWorkerConfiguration;token:string;expectedHex:string};fixture.configuration.sourceKey=Buffer.from(fixture.configuration.sourceKey);const runtime=composeTargetRuntime(fixture.configuration);
 try{let request: (route:"Page"|"Media")=>Promise<{status:number;body:Buffer}>;let socket:Awaited<ReturnType<typeof startTargetSocket>>|undefined;
 if(process.platform==="linux"){await mkdir(fixture.configuration.socketDirectory,{recursive:true});await chmod(fixture.configuration.socketDirectory,0o750);socket=await startTargetSocket(runtime,fixture.configuration);request=route=>new Promise((resolve,reject)=>{const req=http.request({socketPath:socket!.socket,path:"/share/"+fixture.token+(route==="Media"?"/media":""),headers:{"x-qsc-qa-source":"192.0.2.41"}},res=>{const chunks:Buffer[]=[];res.on("data",x=>chunks.push(x));res.on("end",()=>resolve({status:res.statusCode!,body:Buffer.concat(chunks)}));});req.on("error",reject);req.end();});}
 else request=async route=>{const r=await exchange(runtime,{url:"/share/"+fixture.token+(route==="Media"?"/media":""),headers:["x-qsc-qa-source","192.0.2.41"]});return{status:r.status,body:Buffer.from(r.body as Uint8Array)};};
 try{const page=await request("Page"),media=await request("Media");assert.equal(page.status,200);assert.equal(media.status,200);assert.equal(media.body.toString("hex"),fixture.expectedHex);const metrics=runtime.metrics.snapshot();for(const route of ["Page","Media"])for(const phase of ["Source","Resolved","MediaRead"])assert.equal(metrics.durationsMs["Admission."+route+"."+phase].count,1);assert.ok(!JSON.stringify(metrics).includes(fixture.token));}finally{await socket?.close();}
 }finally{await runtime.close();}
 if(process.platform==="linux"&&process.env.QSC_TARGET_WORKER_BUNDLE){
 const child=fork(process.env.QSC_TARGET_WORKER_BUNDLE,[],{execArgv:[],env:{...process.env,NODE_ENV:"test"},serialization:"advanced",stdio:["ignore","ignore","ignore","ipc"]});let id=0;
 const control=async(action:string,configuration?:TargetWorkerConfiguration)=>{const reply=once(child,"message",{signal:AbortSignal.timeout(10000)});child.send({id:++id,action,configuration});const value=(await reply)[0] as Record<string,unknown>;assert.ok(!value.failed);return value;};
 try{await control("init",{...fixture.configuration,socketName:"worker-2.sock"});await control("beginMeasurements");
 const status=await new Promise<number>((resolve,reject)=>{const r=http.request({socketPath:path.join(fixture.configuration.socketDirectory,"worker-2.sock"),path:"/share/"+fixture.token+"/media",headers:{"x-qsc-qa-source":"192.0.2.42"}},response=>{response.resume();response.on("end",()=>resolve(response.statusCode!));});r.on("error",reject);r.end();});assert.equal(status,200);
 const snap=await control("snapshot");assert.ok(!JSON.stringify(snap).includes(fixture.token));assert.ok(snap.metrics);const exited=once(child,"exit");await control("stop");assert.equal((await exited)[0],0);
 }finally{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");if(child.connected)child.disconnect();await exited;}}
 }
});
