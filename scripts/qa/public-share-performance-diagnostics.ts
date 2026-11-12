import {AsyncLocalStorage} from 'node:async_hooks';
import {performance} from 'node:perf_hooks';
export type QaFailureCode='POOL_WAIT_TIMEOUT'|'POOL_CONNECT_TIMEOUT'|'QUERY_READ_TIMEOUT'|'LOCK_TIMEOUT'|'STATEMENT_TIMEOUT'|'DATABASE_UNAVAILABLE'|'ADMISSION_DEADLINE'|'UNCLASSIFIED';
/** Classification reads driver data in memory; only fixed codes leave this QA boundary. */
export function qaFailureCode(error:unknown):QaFailureCode {
 try {const e=error as {code?:unknown;message?:unknown};if(e?.code==='55P03')return 'LOCK_TIMEOUT';if(e?.code==='57014')return 'STATEMENT_TIMEOUT';if(['ECONNREFUSED','ECONNRESET','EPIPE','57P01','57P02','57P03'].includes(String(e?.code)))return 'DATABASE_UNAVAILABLE';
 const m=e?.message;if(m==='timeout exceeded when trying to connect')return 'POOL_WAIT_TIMEOUT';if(m==='Connection terminated due to connection timeout'||m==='timeout expired')return 'POOL_CONNECT_TIMEOUT';if(m==='Query read timeout')return 'QUERY_READ_TIMEOUT';if(m==='AdmissionDeadline'||m==='ReleaseDeadline')return 'ADMISSION_DEADLINE';if(m==='Connection terminated'||m==='Connection terminated unexpectedly')return 'DATABASE_UNAVAILABLE';}catch{}return 'UNCLASSIFIED';
}
export interface QaPoolEvent {kind:'Acquire'|'Query';pool:'Main'|'Admission';phase:string;operation:string;elapsedMs:number;failed:boolean;code?:QaFailureCode;preparedClosed?:boolean;total:number;idle:number;waiting:number;}
export const diagnosticContext=new AsyncLocalStorage<{ordinal:number;events:QaPoolEvent[];closedReason?:string}>();
export class QaPerformanceDiagnostics {
 private start=performance.now();private failures:unknown[]=[];private counts=new Map<string,number>();private seen=0;
 reset(){this.start=performance.now();this.failures=[];this.counts.clear();this.seen=0;}
 readonly observe=(event:QaPoolEvent)=>{const c=diagnosticContext.getStore();if(c&&c.events.length<64)c.events.push(event);if(event.failed){const k=event.pool+'.'+event.code;this.counts.set(k,(this.counts.get(k)??0)+1);}};
 admission(event:{failure:string}){const c=diagnosticContext.getStore();if(c&&['RECOVERY_STATE','STATE_UNRECONCILED','INVALID_CONTEXT'].includes(event.failure))c.closedReason=event.failure;}
 http(route:'Page'|'Media',status:number,durationMs:number){if(status!==503)return;this.seen++;const c=diagnosticContext.getStore(),events=c?.events??[],failed=[...events].reverse().find(e=>e.failed),closed=events.some(e=>e.preparedClosed),reason=failed?.code??c?.closedReason??(closed?'RECOVERY_OR_POLICY_STATE':'SERVING_COMPOSITION_UNCLASSIFIED');this.counts.set('HTTP503.'+reason,(this.counts.get('HTTP503.'+reason)??0)+1);if(this.failures.length<256)this.failures.push({elapsedMs:performance.now()-this.start,ordinal:c?.ordinal,route,status,durationMs,reason,events});}
 snapshot(){return {scope:'synthetic QA ordinals only; no visitor/source/grant identifiers, SQL, parameters or raw errors',http503:this.seen,counts:Object.fromEntries(this.counts),firstFailures:this.failures,omittedFailureTraces:Math.max(0,this.seen-this.failures.length)};}
}