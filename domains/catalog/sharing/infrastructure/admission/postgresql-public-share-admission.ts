import { observeQaDatabaseClient } from "./qa-database-client-errors";
import { randomUUID,createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Pool, PoolClient, QueryConfig } from "pg";
import type { PublicShareAdmissionPort, PublicShareAdmissionResult } from "../../ports/public-share-admission.port";
import { bucket, MIB, type Bucket } from "./public-admission-policy";
const scopeKey=(value:string)=>createHash("sha256").update(value).digest("hex");
const canonicalId=(value:unknown):value is string=>typeof value==="string" && value.length>0 && value.trim()===value;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type AdmissionStage="Acquire"|"Intent"|"Debit"|"Finalize";
type Input = Parameters<PublicShareAdmissionPort["admit"]>[0];
/** PostgreSQL functions own atomic accounting. A durable intent spans independent
 * transactions under one session coordination lock; no process-local security state. */
export class PostgreSqlPublicShareAdmission implements PublicShareAdmissionPort {
  private uncertain = false;
  constructor(private readonly pool: Pool, private readonly ownerId: string, private readonly sourceKeyFingerprint: string,
    private readonly diagnostic?:(event:{outcome:"Unavailable";stage:AdmissionStage;failure:string})=>void) {
    if (!uuid.test(ownerId) || !/^[a-f0-9]{64}$/.test(sourceKeyFingerprint)) throw Error("AdmissionConfigurationInvalid");
  }
  private specs(input: Input): Bucket[] | null {
    const s = input.sourceIdentity, w = canonicalId(input.workspaceId)?scopeKey(JSON.stringify([input.workspaceId])):null,
      g = canonicalId(input.grantId)?scopeKey(JSON.stringify([input.workspaceId,input.grantId])):null;
    if (!/^[a-f0-9]{64}$/.test(s) || !["Page", "Media"].includes(input.routeClass)) return null;
    if (input.phase === "Source") return [bucket("request:global",20,40),bucket("request:global:"+input.routeClass,10,20),
      bucket("request:source:"+s,4,20),bucket("request:source:"+s+":"+input.routeClass,2,10)];
    if (!w || !g) return null;
    if (input.phase === "Resolved") return [bucket("request:workspace:"+w,10,20),bucket("request:grant:"+w+":"+g,4,10)];
    if (input.phase !== "MediaRead" || input.maximumBytes !== 8*MIB) return null;
    return [bucket("bytes:global",32*MIB,160*MIB,8*MIB),bucket("bytes:workspace:"+w,16*MIB,80*MIB,8*MIB),bucket("bytes:source:"+s,16*MIB,80*MIB,8*MIB)];
  }
  async admit(input: Input): Promise<PublicShareAdmissionResult> {
    const specs=this.specs(input);
    if (!specs) {this.report("Acquire","INVALID_CONTEXT");return {type:"Unavailable"};}
    if (this.uncertain) {this.report("Acquire","RECOVERY_STATE");return {type:"Unavailable"};}
    const workspaceKey=input.workspaceId?scopeKey(JSON.stringify([input.workspaceId])):null,
      grantKey=input.grantId?scopeKey(JSON.stringify([input.workspaceId,input.grantId])):null;
    const started=performance.now();let client:PoolClient|undefined,destroy=false,stage:AdmissionStage="Acquire";
    try {
      client=await this.pool.connect();observeQaDatabaseClient(client);
      const query=async(text:string,values:unknown[])=>{
        const remaining=200-(performance.now()-started);if(remaining<=0)throw Error("AdmissionDeadline");
        const config:QueryConfig & {query_timeout:number}={text,values,query_timeout:Math.max(1,Math.min(100,Math.floor(remaining)))};
        const result=await client!.query(config);if(performance.now()-started>=200)throw Error("AdmissionDeadline");return result;
      };
      const operation=randomUUID();stage="Intent";
      const prepared=(await query("SELECT qsc_public_admission.prepare_operation($1,$2) AS prepared",[operation,this.sourceKeyFingerprint])).rows[0];
      if(prepared?.prepared!==true)throw Error("AdmissionStateUnreconciled");
      stage="Debit";
      const serialized=JSON.stringify(specs.map(s=>({key:s.key,rate:s.rate.toString(),capacity:s.capacity.toString(),cost:s.cost.toString()})));
      const result=(await query("SELECT qsc_public_admission.decide_operation($1,$2,$3,$4,$5,$6,$7,$8) AS result",
        [operation,this.sourceKeyFingerprint,serialized,input.phase,this.ownerId,input.sourceIdentity,workspaceKey,grantKey])).rows[0]?.result;
      if(!result || !["Allowed","Denied","Unavailable"].includes(result.type))throw Error("AdmissionResultInvalid");
      if(result.type==="Denied" && (!Number.isInteger(result.retryAfterSeconds)||result.retryAfterSeconds<1||result.retryAfterSeconds>60))throw Error("AdmissionResultInvalid");
      if(result.type==="Allowed" && input.phase==="MediaRead" && result.leaseId!==operation)throw Error("AdmissionLeaseInvalid");
      stage="Finalize";
      // The materialized input sets the per-lock bound before Finalize in the same transaction.
      if((await query(`WITH admission_limits AS MATERIALIZED (
        SELECT set_config('lock_timeout','50ms',true) AS value
      )
      SELECT qsc_public_admission.finalize_operation($1,$2) AS finalized
      FROM admission_limits`,[operation,this.sourceKeyFingerprint])).rows[0]?.finalized!==true)throw Error("AdmissionStateUnreconciled");
      if(result.type==="Denied")return {type:"Denied",retryAfterSeconds:result.retryAfterSeconds};
      if(result.type==="Unavailable")return {type:"Unavailable"};
      return input.phase==="MediaRead"?{type:"Allowed",release:()=>this.release(operation)}:{type:"Allowed"};
    }catch(error){
      // A committed unresolved intent survives driver/process restart. No I/O was authorized.
      if(stage==="Debit" || stage==="Finalize")this.uncertain=true;
      this.report(stage,this.failureCode(error));
      destroy=true;return {type:"Unavailable"};
    }finally{client?.release(destroy);}
  }
  private report(stage:AdmissionStage,failure:string):void {
    try{this.diagnostic?.({outcome:"Unavailable",stage,failure});}catch{}
  }
  private failureCode(error:unknown):string {
    try {
      const e=error as {code?:unknown;message?:unknown};
      if(typeof e?.code==="string" && ["57014","55P03","40001","40P01","42702","42703","42601","42883","P0001","22003","23505","23514"].includes(e.code))return e.code;
      if(["ECONNREFUSED","ECONNRESET","EPIPE","57P01","57P02","57P03"].includes(String(e?.code)))return "DATABASE_UNAVAILABLE";
      const messages=new Map<string,string>([["timeout exceeded when trying to connect","POOL_WAIT_TIMEOUT"],["Connection terminated due to connection timeout","POOL_CONNECT_TIMEOUT"],["timeout expired","POOL_CONNECT_TIMEOUT"],["Query read timeout","QUERY_READ_TIMEOUT"],["AdmissionDeadline","ADMISSION_DEADLINE"],["AdmissionStateUnreconciled","STATE_UNRECONCILED"],["Connection terminated","DATABASE_UNAVAILABLE"],["Connection terminated unexpectedly","DATABASE_UNAVAILABLE"]]);
      return typeof e?.message==="string"?messages.get(e.message)??"UNCLASSIFIED":"UNCLASSIFIED";
    }catch{return "UNCLASSIFIED";}
  }
  private async release(id:string):Promise<void>{
    const started=performance.now(),client=await this.pool.connect();observeQaDatabaseClient(client);let failed=false;
    const query=async(text:string,values?:unknown[])=>{
      const remaining=200-(performance.now()-started);if(remaining<=0)throw Error("ReleaseDeadline");
      const config:QueryConfig & {query_timeout:number}={text,values,query_timeout:Math.max(1,Math.min(100,Math.floor(remaining)))};return client.query(config);
    };
    try{
      await query("BEGIN");await query("SET LOCAL lock_timeout='50ms'; SET LOCAL statement_timeout='100ms'");
      await query("SELECT singleton FROM qsc_public_admission.policy WHERE singleton FOR UPDATE");
      await query("DELETE FROM qsc_public_admission.leases WHERE lease_id=$1 AND owner_id=$2",[id,this.ownerId]);await query("COMMIT");
    }catch{failed=true;throw Error("AdmissionReleaseUnavailable");}finally{client.release(failed);}
  }
}
