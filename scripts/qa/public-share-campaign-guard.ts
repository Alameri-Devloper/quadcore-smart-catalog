import fs from "node:fs";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import path from "node:path";
import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { Pool } from "pg";
import { assertQaAdmissionEndpoint } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-endpoint";
import { assertTargetQaMode } from "./public-share-target-worker";

export type CampaignGate="PASS"|"FAIL"|"INCONCLUSIVE"|"NOT RUN";
export interface GuardConfiguration {
  databaseUrl:string;primaryId:string;fingerprint:string;guardFile:string;ownershipFile:string;
  purpose:"CAMPAIGN"|"CONTROL_ONLY_TEST";
  gates:{fixtures:CampaignGate;resources:CampaignGate;cold:CampaignGate;restoration:CampaignGate};
  timeoutMs:number;
}
export function campaignPreflightPass(gates:GuardConfiguration["gates"]){return [gates.fixtures,gates.resources,gates.cold,gates.restoration].every(v=>v==="PASS");}
function scope(config:GuardConfiguration){
  assertTargetQaMode();assertQaAdmissionEndpoint(config.databaseUrl);
  const root=path.resolve("artifacts/task-reviews")+path.sep;
  for(const file of [config.guardFile,config.ownershipFile])if(!path.isAbsolute(file)||!file.startsWith(root)||fs.realpathSync(file)!==file||!fs.lstatSync(file).isFile())throw Error("CampaignGuardScopeInvalid");
  if(!/^public-share-campaign-guard\.(ts|cjs)$/.test(path.basename(config.guardFile))||!Number.isInteger(config.timeoutMs)||config.timeoutMs<50||config.timeoutMs>1000000)throw Error("CampaignGuardConfigurationInvalid");
  const marker=JSON.parse(fs.readFileSync(config.ownershipFile,"utf8"));
  if(marker.database!==new URL(config.databaseUrl).pathname.slice(1)||marker.primaryId!==config.primaryId||marker.purpose!==config.purpose)throw Error("CampaignGuardOwnershipMismatch");
  if(config.purpose==="CAMPAIGN"){if(!campaignPreflightPass(config.gates))throw Error("CampaignPreflightNotPassed");}
  else if(config.purpose!=="CONTROL_ONLY_TEST"||config.gates.resources!=="PASS")throw Error("CampaignGuardTestPreflightInvalid");
}
const notify=(value:Record<string,unknown>)=>{if(process.connected)process.send?.(value,()=>{});};
const poolFor=(config:GuardConfiguration)=>{const p=new Pool({connectionString:config.databaseUrl,max:1,connectionTimeoutMillis:75,statement_timeout:100,query_timeout:100,idleTimeoutMillis:0});p.on("error",()=>{});return p;};
let cryptoPrepared:Promise<void>|undefined;
/** Public dummy inputs initialize the driver's WebCrypto primitives before control acquisition.
 * No real authentication, timeout extension or admission decision occurs here. */
async function prepareControlCrypto(){return cryptoPrepared??=(async()=>{
  const key=await webcrypto.subtle.importKey("raw",new TextEncoder().encode("Public QA control startup"),"PBKDF2",false,["deriveBits"]);
  await webcrypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new Uint8Array(16),iterations:4096},key,256);
  await webcrypto.subtle.digest("SHA-256",new Uint8Array(32));
  const hmac=await webcrypto.subtle.importKey("raw",new Uint8Array(32),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  await webcrypto.subtle.sign("HMAC",hmac,new Uint8Array(32));
})();}
export async function prepareCampaignControl(pool:Pool,config:GuardConfiguration){
  const start=performance.now();await prepareControlCrypto();const cryptoMs=performance.now()-start,connecting=performance.now();
  const c=await pool.connect();const acquireMs=performance.now()-connecting;let failed=true;
  try{if(acquireMs>75)throw Error("CampaignControlAcquisitionDeadlineExceeded");const row=(await c.query("SELECT (SELECT system_identifier::text FROM pg_control_system()) AS primary_id,ready,pending_operation IS NOT NULL AS pending,(SELECT count(*)::int FROM qsc_public_admission.leases) AS leases,version,source_key_fingerprint FROM qsc_public_admission.policy WHERE singleton")).rows[0];
    if(!row||row.primary_id!==config.primaryId||row.version!=="p6-local-qa-a-o-v1"||row.source_key_fingerprint!==config.fingerprint||row.ready||row.pending||row.leases!==0)throw Error("CampaignControlNotPreparedClosed");
    failed=false;return{cryptoMs,acquireMs,policyReadMs:performance.now()-connecting-acquireMs};
  }finally{c.release(failed);}
}
export async function guardState(pool:Pool){const p=(await pool.query("SELECT ready,pending_operation IS NOT NULL AS pending,(SELECT count(*)::int FROM qsc_public_admission.leases) AS leases,(SELECT count(*)::int FROM qsc_public_admission.buckets) AS buckets,(SELECT md5(coalesce(string_agg(key||':'||tokens::text,',' ORDER BY key),'')) FROM qsc_public_admission.buckets) AS accounting_hash FROM qsc_public_admission.policy WHERE singleton")).rows[0];if(!p)throw Error("CampaignPolicyMissing");return p as {ready:boolean;pending:boolean;leases:number;buckets:number;accounting_hash:string};}
async function setReady(pool:Pool,config:GuardConfiguration,ready:boolean){const c=await pool.connect();let stage="Begin";try{
  await c.query("BEGIN");await c.query("SET LOCAL lock_timeout='50ms'; SET LOCAL statement_timeout='100ms'");
  stage="Identity";const identity=(await c.query("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0];if(identity.id!==config.primaryId)throw Error("CampaignGuardPrimaryMismatch");
  stage="Policy";const row=(await c.query("SELECT version,source_key_fingerprint,ready,pending_operation IS NOT NULL AS pending,(SELECT count(*)::int FROM qsc_public_admission.leases) AS leases FROM qsc_public_admission.policy WHERE singleton FOR UPDATE")).rows[0];
  if(!row||row.version!=="p6-local-qa-a-o-v1"||row.source_key_fingerprint!==config.fingerprint)throw Error("CampaignGuardPolicyMismatch");
  if(ready&&(row.ready||row.pending||row.leases!==0))throw Error("CampaignGuardUncertainState");
  if(ready&&config.purpose==="CAMPAIGN"){const data=(await c.query("SELECT count(*)::int AS grants,count(DISTINCT workspace_id)::int AS workspaces FROM catalog_public_product_share_grants WHERE revoked_at IS NULL")).rows[0];if(data.grants<10||data.workspaces<5)throw Error("CampaignFixturesIncomplete");}
  stage="ControlNamespace";if(ready&&config.purpose==="CONTROL_ONLY_TEST"){const n=(await c.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n;if(n!==0)throw Error("CampaignControlNamespaceHasCatalog");}
  stage="WriteReadiness";await c.query("UPDATE qsc_public_admission.policy SET ready=$1 WHERE singleton",[ready]);await c.query("COMMIT");
}catch(e){await c.query("ROLLBACK").catch(()=>{});const code=(e as {code?:string}).code;throw Error("CampaignGuardPolicyWriteUnavailable:"+stage+":"+(code&&/^[A-Z0-9]{5}$/.test(code)?code:"ClientOrState"));}finally{c.release();}}
/** Close only readiness. NEVER clears pending, debits, refunds, leases or quarantine. */
export async function closeCampaignPolicy(pool:Pool,config:GuardConfiguration){
  let last:unknown;for(let n=0;n<3;n++){try{await setReady(pool,config,false);const state=await guardState(pool);if(state.ready)throw Error();return{closed:true as const,state};}catch(e){last=e;await new Promise(r=>setTimeout(r,50));}}
  void last;throw Error("CampaignClosureUnverified_BLOCKED");
}
const child=(file:string,mode:string)=>fork(file,[mode],{execArgv:file.endsWith(".ts")?["--import","tsx"]:[],env:{...process.env,NODE_ENV:"test"},serialization:"advanced",stdio:["ignore","ignore","ignore","ipc"]});
function message(process:ChildProcess,timeout=10000){return once(process,"message",{signal:AbortSignal.timeout(timeout)}).then(x=>x[0] as Record<string,unknown>);}
export type RunnerFailure="normal"|"assertion"|"timeout"|"runner-kill"|"guard-kill"|"worker-failure";
/** Supervisor survives runner/guardian failure; guardian survives supervisor disconnect.
 * Correlated loss of all control processes or unverified DB closure remains BLOCKED.
 */
export async function executeGuarded(config:GuardConfiguration,mode:RunnerFailure,options?:{launch?:()=>ChildProcess;applicationWorkers?:readonly ChildProcess[];afterOpened?:()=>Promise<void>}){
  scope(config);if(config.purpose==="CAMPAIGN"&&(!options?.launch||![1,2].includes(options.applicationWorkers?.length??0)))throw Error("CampaignWorkersNotPrepared");if(options?.applicationWorkers?.some(w=>w.exitCode!==null||w.signalCode!==null))throw Error("CampaignWorkerAlreadyFailed");
  const pool=poolFor(config);let supervisorStartup:Awaited<ReturnType<typeof prepareCampaignControl>>;
  try{supervisorStartup=await prepareCampaignControl(pool,config);}catch{await pool.end();throw Error("CampaignSupervisorPreparationUnavailable_BLOCKED");}
  const guard=child(config.guardFile,"guardian");let runner:ChildProcess|undefined,heartbeat:NodeJS.Timeout|undefined;let result:Record<string,unknown>|undefined;
  let workerFailed=false,guardFailed=false;
  const stopRunner=()=>{runner?.kill("SIGTERM");};
  const guardMessage=(m:Record<string,unknown>)=>{if(m.closed||m.blocked){guardFailed=true;stopRunner();}};
  const guardExit=()=>{guardFailed=true;stopRunner();};
  guard.on("message",guardMessage);guard.on("exit",guardExit);
  const workerExit=()=>{workerFailed=true;stopRunner();void closeCampaignPolicy(pool,config).catch(()=>{guardFailed=true;});};
  for(const w of options?.applicationWorkers??[])w.once("exit",workerExit);
  const deadline=performance.now()+config.timeoutMs;
  try{
    const ready=message(guard);guard.send({config},()=>{});const opened=await ready;if(opened.opened!==true)throw Error("CampaignGuardDidNotOpen:"+String(opened.classification??"ClosedBeforeOpen"));
    heartbeat=setInterval(()=>{if(guard.connected)guard.send({heartbeat:true},()=>{});},100);heartbeat.unref();
    if(options?.applicationWorkers?.some(w=>w.exitCode!==null||w.signalCode!==null))throw Error("CampaignWorkerFailedDuringOpening");
    await options?.afterOpened?.();
    if(workerFailed||guardFailed)throw Error("CampaignControlFailedBeforeRunner");
    runner=options?.launch?.()??child(config.guardFile,"runner");const exit=once(runner,"exit");if(!options?.launch)runner.send({mode},()=>{});

    if(mode==="runner-kill"){await message(runner);runner.kill("SIGKILL");}
    if(mode==="guard-kill"){await message(runner);const gone=once(guard,"exit");guard.kill("SIGKILL");await gone;await closeCampaignPolicy(pool,config);runner.kill("SIGTERM");}
    if(mode==="timeout"){const closed=await message(guard,config.timeoutMs+10000);if(closed.closed!==true)throw Error("CampaignDeadlineClosureUnavailable");runner.kill("SIGTERM");}
    await exit;
    const closed=await closeCampaignPolicy(pool,config);
    result={mode,closed:true,supervisorStartup,guardianStartup:opened.startup,runnerExit:runner.exitCode,runnerSignal:runner.signalCode,state:closed.state,elapsedMs:performance.now()-(deadline-config.timeoutMs)};
    return result;
  }finally{
    if(heartbeat)clearInterval(heartbeat);
    for(const w of options?.applicationWorkers??[])w.removeListener("exit",workerExit);
    guard.removeListener("message",guardMessage);guard.removeListener("exit",guardExit);
    if(runner&&runner.exitCode===null&&runner.signalCode===null)runner.kill("SIGTERM");
    // Independent parent restoration, even if guardian was SIGKILLed.
    let closed=false;try{await closeCampaignPolicy(pool,config);closed=true;}finally{
      if(guard.connected){guard.send({stop:true},()=>{});guard.disconnect();}
      if(runner?.connected)runner.disconnect();
      await pool.end();if(!closed)throw Error("CampaignClosureUnverified_BLOCKED");
    }
  }
}
async function guardianEntry(){
  assertTargetQaMode();if(!process.send)throw Error("CampaignPrivateIpcRequired");
  const first=await once(process,"message"),config=(first[0] as {config:GuardConfiguration}).config;scope(config);const pool=poolFor(config);
  let closing:Promise<void>|undefined,heartbeat=performance.now();
  const close=()=>closing??=(async()=>{if(timer)clearInterval(timer);try{const r=await closeCampaignPolicy(pool,config);notify({closed:true,state:r.state});}catch{notify({blocked:true,classification:"CampaignClosureUnverified_BLOCKED"});process.exitCode=1;}finally{await pool.end();if(process.connected)process.disconnect();}})();
  process.on("disconnect",()=>{void close();});process.on("SIGTERM",()=>{void close();});process.on("SIGINT",()=>{void close();});
  process.on("message",(m:unknown)=>{if((m as {heartbeat?:boolean}).heartbeat)heartbeat=performance.now();if((m as {stop?:boolean}).stop)void close();});
  let armed=false,deadline=Infinity;
  const timer=setInterval(()=>{if(armed&&(performance.now()>=deadline||performance.now()-heartbeat>1000))void close();},25);
  try{const startup=await prepareCampaignControl(pool,config);if(closing){await closing;return;}await setReady(pool,config,true);if(closing){await closing;return;}heartbeat=performance.now();deadline=heartbeat+config.timeoutMs;armed=true;notify({opened:true,startup});}catch(e){notify({openingFailed:true,classification:(e as Error).message});await close();throw Error("CampaignGuardOpeningUnavailable");}
}
async function runnerEntry(){assertTargetQaMode();if(!process.send)throw Error("CampaignPrivateIpcRequired");const m=(await once(process,"message"))[0] as {mode:RunnerFailure};
  process.on("disconnect",()=>process.exit());
  if(m.mode==="normal"){process.exitCode=0;process.disconnect();return;}
  if(m.mode==="assertion")assert.fail("Controlled campaign assertion failure");
  notify({running:true});setInterval(()=>{},1000);
}
if(/\/public-share-campaign-guard\.(ts|cjs)$/.test(process.argv[1]?.replaceAll("\\","/")??"")&&process.argv[2]){
  const role=process.argv[2];void (role==="guardian"?guardianEntry():role==="runner"?runnerEntry():Promise.reject(Error("CampaignRoleInvalid"))).catch(()=>{process.stderr.write("CampaignControlUnavailable\n");process.exitCode=1;if(process.connected)process.disconnect();});
}
