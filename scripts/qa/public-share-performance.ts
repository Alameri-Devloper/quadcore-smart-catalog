import {QaPerformanceDiagnostics,diagnosticContext} from './public-share-performance-diagnostics';
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import {once} from "node:events";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {performance,monitorEventLoopDelay} from "node:perf_hooks";
import assert from "node:assert/strict";
import {Pool} from "pg";
import {drizzle} from "drizzle-orm/node-postgres";
import sharp from "sharp";
import * as schema from "../../shared/infrastructure/persistence/schema";
import {publicSharePostgresFixture} from "../../domains/catalog/sharing/mock/public-share-postgres.fixture";
import {publicShareActor} from "../../domains/catalog/sharing/mock/public-share-lifecycle.fixture";
import {publicShareMediaFixture} from "../../domains/catalog/sharing/mock/public-share-media.fixture";
import {ResolvePublicProductShare} from "../../domains/catalog/sharing/application/resolve-public-product-share";
import {PostgreSqlPublicShareReadSnapshot} from "../../domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-read-snapshot";
import {PostgreSqlPublicShareAdmission} from "../../domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission";
import {migrateNewQaAdmissionDatabase} from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-migration";
import {assertQaAdmissionEndpoint} from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-endpoint";
import {QaTrustedPublicShareSource,canonicalSource,admissionDiagnostic} from "../../domains/catalog/sharing/infrastructure/admission/qa-public-share-source";
import {cleanupQaAdmission,inspectAdmissionHealth} from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-operations";
import {LocalPublicShareMediaReader} from "../../domains/catalog/sharing/infrastructure/media/local-public-share-media-reader";
import {createPublicShareMediaGet,publicShareHeaders,publicShareFailureResponse} from "../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http";
import {measurementContext,instrumentPool,PerformanceMeasurements,distribution,qualifyLocalPerformance,profilingCoverage} from "./public-share-performance-measurements";
import type {PublicShareAdmissionPort} from "../../domains/catalog/sharing/ports/public-share-admission.port";
export type Profile="pilot"|"text"|"images"|"nat";
export async function runPublicSharePerformance(input:{url:string;directory:string;profile:Profile;durationSeconds:number;diagnostics?:boolean;profileFunctions?:boolean}) {
 const target=assertQaAdmissionEndpoint(input.url);if(input.durationSeconds<1||input.durationSeconds>900)throw Error("QaDurationOutOfBounds");
 const trace=new QaPerformanceDiagnostics();const startedAt=new Date().toISOString(),metrics=new PerformanceMeasurements(),logs:unknown[]=[];
 const admin=new Pool({connectionString:input.url,max:1,statement_timeout:10000});admin.on("error",()=>{});
 assert.equal(Number((await admin.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n),0);
 const sourceKey=randomBytes(32),fingerprint=createHash("sha256").update(sourceKey).digest("hex");await migrateNewQaAdmissionDatabase(admin,target.pathname.slice(1),fingerprint);
 process.env.TEST_DATABASE_URL=input.url;process.env.DATABASE_SSL="false";
 const f=publicSharePostgresFixture("qsc-p6-performance-seed");await f.migrate();await f.seed();
 // Clone the exact existing synthetic fixture in FK order; only this fresh owned database.
 const tables=["workspaces","workspace_branch_references","catalog_departments","catalog_categories","catalog_product_types","catalog_products","catalog_branch_product_listings","catalog_specification_definitions","catalog_specification_templates","catalog_specification_template_entries","catalog_product_specification_values"];
 for(let i=1;i<5;i++)for(const table of tables){const patch=table==="workspaces"?{workspace_id:"qa-workspace-"+i,workspace_code:"qa-workspace-"+i}:{workspace_id:"qa-workspace-"+i};await admin.query('INSERT INTO "'+table+'" SELECT (jsonb_populate_record(NULL::"'+table+'",to_jsonb(t)||$1::jsonb)).* FROM "'+table+'" t WHERE workspace_id=$2',[JSON.stringify(patch),"p4-workspace"]);}
 const workspaces=["p4-workspace",...Array.from({length:4},(_,i)=>"qa-workspace-"+(i+1))],tokens:string[]=[];
 for(const workspaceId of workspaces)for(const branchId of["p4-branch","p4-branch-2"]){const result=await f.lifecycle.issue({context:publicShareActor({workspaceId}),productId:"p4-product",branchId});assert.ok(result.ok);tokens.push(result.value.url.split("/").at(-1)!);}
 const media=await publicShareMediaFixture("p4-workspace","p4-product");let imageBytes=0;
 if(input.profile==="images"||input.profile==="nat"){
  const bytes=await sharp(randomBytes(512*512*3),{raw:{width:512,height:512,channels:3}}).webp({quality:75}).toBuffer();assert.ok(bytes.length<=256*1024&&bytes.length>=64*1024);imageBytes=bytes.length;
  for(const workspaceId of workspaces){const owned=await publicShareMediaFixture(workspaceId,"p4-product");const targetFile=path.join(media.root,...owned.input.storageKey.split("/"));await mkdir(path.dirname(targetFile),{recursive:true});await writeFile(targetFile,bytes);
   await admin.query("INSERT INTO catalog_product_media_roots(workspace_id,product_id,storage_root_key,created_at)VALUES($1,'p4-product',$2,clock_timestamp())",[workspaceId,owned.input.storageRootKey]);
   await admin.query("INSERT INTO catalog_product_images(workspace_id,product_id,product_image_id,storage_key,position,is_main,checksum_sha256,mime_type,media_created_at,media_created_by) VALUES($1,'p4-product','qa-image',$2,0,true,$3,'image/webp',clock_timestamp(),'synthetic-operator')",[workspaceId,owned.input.storageKey,createHash("sha256").update(bytes).digest("hex")]);
  }
 }
 const crypto=f.runtime;await f.connection.close();
 const main=instrumentPool(new Pool({connectionString:input.url,max:8,connectionTimeoutMillis:75,statement_timeout:750,query_timeout:750,application_name:"qsc-p6-performance-main"}),"Main",metrics,{profileFunctions:input.profileFunctions,observe:input.diagnostics?trace.observe:undefined});
 const admissionPool=instrumentPool(new Pool({connectionString:input.url,max:2,connectionTimeoutMillis:75,statement_timeout:100,query_timeout:100,application_name:"qsc-p6-performance-admission"}),"Admission",metrics,{profileFunctions:input.profileFunctions,observe:input.diagnostics?trace.observe:undefined});
 main.on("error",()=>{metrics.count("IdlePoolFailures.Main");});admissionPool.on("error",()=>{metrics.count("IdlePoolFailures.Admission");});
 // Every acquired measured backend is initialized by instrumentPool; failures stay visible.
 const diagnostics:unknown[]=[];const actual=new PostgreSqlPublicShareAdmission(admissionPool,randomUUID(),fingerprint,e=>{trace.admission(e);diagnostics.push(e);metrics.count("AdmissionFailure."+e.stage+"."+e.failure);});
 const admission:PublicShareAdmissionPort={admit:async value=>measurementContext.run({route:value.routeClass,phase:value.phase},async()=>{
  const start=performance.now();const result=await actual.admit(value);metrics.add("Admission."+value.routeClass+"."+value.phase,performance.now()-start);metrics.count("Outcome."+result.type);
  if(result.type==="Allowed"&&result.release){const release=result.release;return {type:"Allowed",release:async()=>{const t=performance.now();try{await release();}finally{metrics.add("Lease.Release",performance.now()-t);}}};}return result;
 })};
 let poolsClosed=false;
 const trusted=new WeakSet<Request>(),source=new QaTrustedPublicShareSource(sourceKey,r=>trusted.has(r));
 const resolver=new ResolvePublicProductShare(new PostgreSqlPublicShareReadSnapshot(drizzle(main,{schema})),crypto.lookupDigest,admission,new LocalPublicShareMediaReader(media.root));
 const mediaGet=createPublicShareMediaGet(resolver,source);let port=0,requestOrdinal=0;
 const server=http.createServer((req,res)=>diagnosticContext.run({ordinal:++requestOrdinal,events:[]},async()=>{
  const t=performance.now();let route:"Page"|"Media"="Page";
  try{
   const peer=req.socket.remoteAddress??"",canonical=canonicalSource(peer);if(!canonical||!canonical.startsWith("127.")){res.writeHead(503,Object.fromEntries(publicShareHeaders()));res.end();return;}
   const url=new URL(req.url??"/","http://127.0.0.1:"+port);route=url.pathname.endsWith("/media")?"Media":"Page";
   const request=new Request(url,{method:req.method,headers:{"x-qsc-qa-source":canonical}});trusted.add(request);
   const token=url.pathname.split("/")[2];let response:Response;
   if(route==="Media")response=await mediaGet(request,token);
   else{const value=await resolver.resolvePage(token,(await source.resolve(request))??"");response=value.ok?new Response("Synthetic QA projection accepted",{status:200,headers:publicShareHeaders()}):publicShareFailureResponse(value,"Page","en");if(value.ok){assert.ok(!JSON.stringify(value.value).match(/wholesale|referenceCost|actorId|workspaceId|grantId/));if((input.profile==="images"||input.profile==="nat")&&!value.value.hasMainImage)metrics.count("UnexpectedImageFallback");}}
   if(input.diagnostics)trace.http(route,response.status,performance.now()-t);logs.push(admissionDiagnostic(route,req.method??"OTHER",response.status,performance.now()-t));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(input.diagnostics)trace.http(route,503,performance.now()-t);metrics.count("FixtureExceptions");res.writeHead(503,Object.fromEntries(publicShareHeaders()));res.end();}
 }));
 const agents=Array.from({length:5},(_,i)=>new http.Agent({keepAlive:true,maxSockets:4,localAddress:"127.0.0."+(i+1)}));
 const request=(token:string,route:"Page"|"Media",which:number,record=true)=>new Promise<number>(resolve=>{
  const start=performance.now();let settled=false;let response:http.IncomingMessage|undefined;
  const finish=(status:number,failed=false)=>{if(settled)return;settled=true;clearTimeout(deadline);if(record){metrics.add("HttpTotal."+route,performance.now()-start);metrics.count("HTTP."+route+"."+status);if(failed)metrics.count("HttpTransportFailures");}resolve(status);};
  const r=http.request({host:"127.0.0.1",port,path:"/share/"+token+(route==="Media"?"/media":""),method:"GET",agent:agents[which],headers:{referer:"https://example.invalid/SYNTHETIC_REDACTION_PROBE","x-forwarded-for":"spoof","x-qsc-qa-source":"spoof"}},incoming=>{
   response=incoming;if(record)metrics.add("HttpTTFB."+route,performance.now()-start);incoming.resume();
   incoming.on("end",()=>finish(incoming.statusCode??0));incoming.on("error",()=>finish(0,true));incoming.on("aborted",()=>finish(0,true));incoming.on("close",()=>{if(!incoming.complete)finish(0,true);});
  });
  const deadline=setTimeout(()=>{finish(0,true);response?.destroy();r.destroy();},5000);deadline.unref();r.on("error",()=>finish(0,true));r.end();
 });
 let cleanupInFlight=false;const cleanup=setInterval(()=>{if(cleanupInFlight)return;cleanupInFlight=true;void cleanupQaAdmission(admissionPool,fingerprint).catch(()=>{metrics.count("CleanupFailures");}).finally(()=>{cleanupInFlight=false;});},60000);cleanup.unref();
 const resources:unknown[]=[],health:unknown[]=[];let resourceTimer:NodeJS.Timeout|undefined;
 const eventLoop=monitorEventLoopDelay({resolution:10});eventLoop.enable();const cpuStart=process.cpuUsage();let oldCpu=os.cpus();const processCpuStart=performance.now();
 try{
  await admin.query("UPDATE qsc_public_admission.policy SET ready=true WHERE singleton");server.listen(0,"127.0.0.1");await once(server,"listening");const address=server.address();assert.ok(address&&typeof address!=="string");port=address.port;
  const cold:unknown[]=[];for(let i=0;i<5;i++){metrics.clear();const status=await request(tokens[i*2],"Page",i);cold.push({status,measurements:metrics.snapshot()});}
  const ping:number[]=[];for(let i=0;i<100;i++){const t=performance.now();await admin.query("SELECT 1");ping.push(performance.now()-t);}
  const coldDiagnosticTrace=trace.snapshot();metrics.clear();logs.length=0;diagnostics.length=0;trace.reset();requestOrdinal=0;
  resourceTimer=setInterval(()=>{const cpus=os.cpus();let busy=0,total=0;for(let i=0;i<cpus.length;i++){const a=cpus[i].times,b=oldCpu[i]?.times??a;for(const k of["user","nice","sys","idle","irq"]as const){const d=a[k]-b[k];total+=d;if(k!=="idle")busy+=d;}}oldCpu=cpus;resources.push({elapsedSeconds:(performance.now()-processCpuStart)/1000,mainPool:{total:main.totalCount,idle:main.idleCount,waiting:main.waitingCount},admissionPool:{total:admissionPool.totalCount,idle:admissionPool.idleCount,waiting:admissionPool.waitingCount},rssBytes:process.memoryUsage().rss,heapUsedBytes:process.memoryUsage().heapUsed,freeRamBytes:os.freemem(),hostCpuPercent:total?100*busy/total:0});void inspectAdmissionHealth(admin).then(async h=>{const extra=input.diagnostics?(await admin.query("SELECT ready,pending_operation IS NOT NULL AS unresolved,(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock') AS lock_waiters FROM qsc_public_admission.policy WHERE singleton")).rows[0]:{};health.push({elapsedSeconds:(performance.now()-processCpuStart)/1000,...h,...extra});}).catch(()=>metrics.count("ObserverFailures"));},input.diagnostics?1000:5000);resourceTimer.unref();
  const exercised=new Set<string>();const inFlight=new Set<Promise<void>>(),planned=input.profile==="text"||input.profile==="pilot"?10:input.profile==="nat"?1:2;
  const start=performance.now();let emitted=0,nextProgress=60;
  while(performance.now()-start<input.durationSeconds*1000){const due=start+emitted*1000/planned,remaining=due-performance.now();if(remaining>0){await new Promise(r=>setTimeout(r,Math.min(remaining,100)));continue;}
   const index=emitted++,which=input.profile==="nat"?0:index%5;
   metrics.add("ScheduleLag",Math.max(0,performance.now()-due));if(inFlight.size>=64){metrics.count("SchedulerShed");continue;}
   const task=(async()=>{if(input.profile==="text"||input.profile==="pilot"){const unknown=index%5===4,grantIndex=(Math.floor(index/5)*4+index%4)%10;if(!unknown)exercised.add(tokens[grantIndex]);const status=await request(unknown?"A".repeat(43):tokens[grantIndex],"Page",which);if(status!==(unknown?404:200))metrics.count("UnexpectedStatus");}
    else{const token=tokens[index%10];exercised.add(token);const page=await request(token,"Page",which);const mediaStatus=await request(token,"Media",which);if(page!==200||mediaStatus!==200)metrics.count("UnexpectedStatus");}})();inFlight.add(task);void task.finally(()=>inFlight.delete(task));
   const elapsed=(performance.now()-start)/1000;if(elapsed>=nextProgress){console.log(JSON.stringify({progress:input.profile,elapsedSeconds:Math.round(elapsed),offered:emitted,inFlight:inFlight.size,counts:metrics.snapshot().counts}));nextProgress+=60;}
  }
  await Promise.all(inFlight);const duration=(performance.now()-start)/1000;
  const steadySnapshot=metrics.snapshot();let natBurst:unknown=null;let requiredBurstFailed=false;
  if(input.profile==="nat"){
   await new Promise(r=>setTimeout(r,5100));const burstStart=performance.now(),pairs:Promise<{page:number;media:number;elapsedMs:number}>[]=[];
   for(let i=0;i<5;i++){const due=burstStart+i*200;const delay=due-performance.now();if(delay>0)await new Promise(r=>setTimeout(r,delay));pairs.push((async()=>{const t=performance.now(),page=await request(tokens[i],"Page",0),media=await request(tokens[i],"Media",0);return {page,media,elapsedMs:performance.now()-t};})());}
   const results=await Promise.all(pairs);requiredBurstFailed=!results.every(r=>r.page===200&&r.media===200);natBurst={status:results.every(r=>r.page===200&&r.media===200)?"LOCAL_QA_PASS":"LOCAL_QA_FAIL",opens:5,scheduledSpanMs:800,idleBeforeMs:5100,completionDurationMs:performance.now()-burstStart,results};
  }
  clearInterval(cleanup);while(cleanupInFlight)await new Promise(r=>setTimeout(r,5));
  await Promise.all([main.end(),admissionPool.end()]);poolsClosed=true;
  await admin.query("SELECT pg_stat_clear_snapshot()");
  const pgFunctions=(await admin.query("SELECT funcname,calls,total_time,self_time FROM pg_stat_user_functions WHERE schemaname='qsc_public_admission' ORDER BY funcname")).rows;
  const databaseStats=(await admin.query("SELECT xact_commit,xact_rollback,blks_read,blks_hit,temp_files,deadlocks FROM pg_stat_database WHERE datname=current_database()")).rows[0];
  const finalHealth=await inspectAdmissionHealth(admin),snapshot=steadySnapshot;const cpu=process.cpuUsage(cpuStart);
  const redacted=JSON.stringify({logs,diagnostics});for(const marker of[...tokens,"SYNTHETIC_REDACTION_PROBE","/share/","spoof"])assert.ok(!redacted.includes(marker));
  const bad=(snapshot.counts.UnexpectedStatus??0)+(snapshot.counts.FixtureExceptions??0)+(snapshot.counts.UnexpectedImageFallback??0)+(snapshot.counts.HttpTransportFailures??0)+(snapshot.counts.SchedulerShed??0);
  const qualification=qualifyLocalPerformance({profile:input.profile,durationSeconds:duration,metrics:snapshot,finalOccupancy:finalHealth.occupancy,requiredBurstFailed:input.profile==='nat'?requiredBurstFailed:undefined,hostCpu:(resources as {hostCpuPercent:number}[]).map(r=>r.hostCpuPercent)});
  const result={coldDiagnosticTrace:input.diagnostics?coldDiagnosticTrace:undefined,diagnosticTrace:input.diagnostics?trace.snapshot():undefined,profileFunctionsEnabled:input.profileFunctions!==false,status:qualification.localProfileStatus,qualification,natBurst,workloadErrors:bad,profile:input.profile,startedAt,durationSeconds:duration,offered:emitted,offeredPerSecond:emitted/duration,workspaces:5,issuedGrants:10,exercisedGrants:exercised.size,sources:input.profile==="nat"?1:5,imageBytes,metrics:snapshot,coldApplicationFirstAccess:cold,databasePingMs:distribution(ping),functionProfiling:{coverage:{main:profilingCoverage(main),admission:profilingCoverage(admissionPool)},scope:"cumulative since fresh database including cold probes; not a warm-only server cost",visibility:"INCONCLUSIVE until backend call-count/flush verification"},pgFunctions,databaseStats,finalHealth,health,resources,eventLoop:{p95Ms:eventLoop.percentile(95)/1e6,p99Ms:eventLoop.percentile(99)/1e6,maxMs:eventLoop.max/1e6},processCpuMilliseconds:(cpu.user+cpu.system)/1000,totalRamBytes:os.totalmem(),cpuCount:os.cpus().length,secretMarkerScan:"LOCAL_QA_PASS",physicalColdStorage:"INCONCLUSIVE: OS page cache not purged",productionAndNginx:"DEPLOYMENT_PENDING",pageTransport:"isolated QA status fixture; no P7 success SSR",diagnostics};
  fs.mkdirSync(input.directory,{recursive:true});fs.writeFileSync(path.join(input.directory,input.profile+"-"+Date.now()+".json"),JSON.stringify(result,null,2));return result;
 }finally{clearInterval(cleanup);if(resourceTimer)clearInterval(resourceTimer);eventLoop.disable();server.close();server.closeAllConnections();for(const agent of agents)agent.destroy();if(!poolsClosed)await Promise.all([main.end(),admissionPool.end()]);await admin.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton");await admin.end();}
}
