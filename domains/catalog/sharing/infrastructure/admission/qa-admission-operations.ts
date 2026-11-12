import { observeQaDatabaseClient } from "./qa-database-client-errors";
import type { Pool,PoolClient,QueryConfig } from "pg";
const boundedQuery=(client:PoolClient)=>{
 observeQaDatabaseClient(client);
 const start=performance.now();
 return async(text:string,values?:unknown[])=>{
  const remaining=200-(performance.now()-start);if(remaining<=0)throw Error("QaOperationDeadline");
  const config:QueryConfig & {query_timeout:number}={text,values,query_timeout:Math.max(1,Math.min(100,Math.floor(remaining)))};
  const result=await client.query(config);if(performance.now()-start>=200)throw Error("QaOperationDeadline");return result;
 };
};
import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
const ownedWorkers=new WeakMap<object,{ownerId:string;child:ChildProcess}>();
export async function startRecoverableQaAdmissionWorker(input:{url:string;fingerprint:string;source:string}) {
 const url=new URL(input.url);
 if((url.search!=="" || url.hash!=="" || url.port!=="5432" || !["postgres:","postgresql:"].includes(url.protocol) || !["127.0.0.1","localhost","[::1]"].includes(url.hostname)) || !/^\/qsc_p6_admission_test_[0-9_]+$/.test(url.pathname)) throw Error("UnsafeQaWorker");
 const ownerId=randomUUID();
 const child=fork("domains/catalog/sharing/infrastructure/admission/qa-admission-worker.ts",[],{execArgv:["--import","tsx"],stdio:["ignore","ignore","ignore","ipc"]});
 const handle=Object.freeze({ownerId,child});ownedWorkers.set(handle,{ownerId,child});
 const message=once(child,"message",{signal:AbortSignal.timeout(5000)});child.send({...input,owner:ownerId,count:0,hold:true});
 try {const result=(await message)[0];if(result.held!=="Allowed") {console.log(JSON.stringify({qaWorkerSetupFailure:{held:result.held,events:result.events,error:result.error}}));throw Error();}}catch{child.kill();throw Error("QaWorkerLeaseUnavailable");}
 return handle;
}
/** QA operator capability: this module is not imported by a route. Each worker is an
 * owned child object bound to a random incarnation UUID, not a reusable OS PID. */
export async function recoverTerminatedQaWorkers(pool: Pool, workers: readonly {ownerId:string;child:ChildProcess}[], leaseIds:readonly string[]) {
  if (!workers.length || workers.length>2 || leaseIds.length>100 || workers.some(w=>ownedWorkers.get(w)?.ownerId!==w.ownerId || ownedWorkers.get(w)?.child!==w.child || (w.child.exitCode===null && w.child.signalCode===null))) throw Error("WorkerTerminationUnverified");
  const client=await pool.connect();const query=boundedQuery(client);let failed=false;
  try {
    await query("BEGIN");
    await query("SET LOCAL lock_timeout='50ms'; SET LOCAL statement_timeout='100ms'");
    const policy=(await query("SELECT ready FROM qsc_public_admission.policy WHERE singleton FOR UPDATE")).rows[0];
    if (!policy || policy.ready) throw Error("RecoveryRequiresClosedPolicy");
    const owners=workers.map(w=>w.ownerId);
    const foreign=(await query("SELECT count(*) AS n FROM qsc_public_admission.leases WHERE NOT(owner_id=ANY($1::uuid[]))",[owners])).rows[0];
    if (Number(foreign.n)) throw Error("OtherWorkerStateUnknown");
    const result=await query("DELETE FROM qsc_public_admission.leases WHERE owner_id=ANY($1::uuid[]) AND lease_id=ANY($2::uuid[])",[owners,leaseIds]);
    await query("COMMIT");
    return {released:result.rowCount}; // Does not reset counters or reopen policy.
  } catch { failed=true;throw Error("QaRecoveryUnavailable"); }
  finally {client.release(failed);}
}
export async function inspectAdmissionHealth(pool: Pool) {
  // No identifiers or source material leave this operator aggregate.
  const row=(await pool.query(`SELECT
    (SELECT count(*) FROM qsc_public_admission.leases) AS occupancy,
    (SELECT coalesce(max(extract(epoch FROM clock_timestamp())*1000-created_ms),0) FROM qsc_public_admission.leases) AS oldest_age_ms,
    (SELECT count(*) FROM qsc_public_admission.buckets WHERE touched_ms < extract(epoch FROM clock_timestamp())*1000-300000) AS cleanup_backlog`)).rows[0];
  return {occupancy:Number(row.occupancy),oldestLeaseAgeMs:Math.max(0,Number(row.oldest_age_ms)),cleanupBacklog:Number(row.cleanup_backlog)};
}

/** Bounded scheduler step; no timer ever deletes a read lease. Target <=360s is
 * conditional on measured capacity: at most 500 stale counters per interval. */
export async function cleanupQaAdmission(pool: Pool, fingerprint: string) {
 const c=await pool.connect();const query=boundedQuery(c);let failed=false;
 try {
  await query("BEGIN");await query("SET LOCAL lock_timeout='50ms'; SET LOCAL statement_timeout='100ms'");
  const p=(await query("SELECT version,source_key_fingerprint FROM qsc_public_admission.policy WHERE singleton FOR UPDATE")).rows[0];
  if(p?.version!=="p6-local-qa-a-o-v1" || p.source_key_fingerprint!==fingerprint) throw Error();
  const now=(await query("SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms")).rows[0].ms;
  // Equal-expiry rows need no key tie order; use the expiry index before LIMIT.
  const removed=await query(`DELETE FROM qsc_public_admission.buckets WHERE key IN (
   SELECT b.key FROM qsc_public_admission.buckets b WHERE b.touched_ms < $1::bigint-300000
   AND NOT EXISTS (SELECT 1 FROM qsc_public_admission.leases l WHERE
    b.key IN ('bytes:global','bytes:workspace:'||l.workspace_id::text,'bytes:source:'||l.source_id))
   ORDER BY b.touched_ms LIMIT 500)`,[now]);
  await query("UPDATE qsc_public_admission.policy SET last_cleanup_ms=$1 WHERE singleton",[now]);
  await query("COMMIT");return {removed:removed.rowCount};
 }catch{failed=true;throw Error("AdmissionCleanupUnavailable");}finally{c.release(failed);}
}
