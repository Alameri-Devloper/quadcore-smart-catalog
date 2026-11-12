import {qaFailureCode,type QaPoolEvent} from './public-share-performance-diagnostics';
import {AsyncLocalStorage} from "node:async_hooks";
import {performance} from "node:perf_hooks";
import type {Pool,PoolClient} from "pg";
import {observeQaDatabaseClient} from "../../domains/catalog/sharing/infrastructure/admission/qa-database-client-errors";
export const measurementContext=new AsyncLocalStorage<{route:"Page"|"Media";phase:string}>();
export const distribution=(values:readonly number[])=>{
 const sorted=[...values].sort((a,b)=>a-b);const q=(p:number)=>sorted.length?sorted[Math.max(0,Math.ceil(p*sorted.length)-1)]:null;
 return {count:sorted.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1)??null,mean:sorted.length?sorted.reduce((a,b)=>a+b,0)/sorted.length:null};
};
export class PerformanceMeasurements {
 private values=new Map<string,number[]>();private counts=new Map<string,number>();
 add(key:string,value:number){const values=this.values.get(key)??[];if(values.length>=500_000)throw Error("QaMeasurementBoundExceeded");values.push(value);this.values.set(key,values);}
 count(key:string,n=1){this.counts.set(key,(this.counts.get(key)??0)+n);}
 clear(){this.values.clear();this.counts.clear();}
 snapshot(){return {durationsMs:Object.fromEntries([...this.values].map(([key,values])=>[key,distribution(values)])),counts:Object.fromEntries(this.counts)};}
}
const queryKind=(text:unknown)=>{
 if(typeof text!=="string")return "Other";
 if(text.includes("prepare_operation"))return "Prepare";if(text.includes("decide_operation"))return "Decide";
 if(text.includes("finalize_operation"))return "Finalize";if(/^BEGIN/i.test(text))return "Begin";
 if(/^COMMIT/i.test(text))return "Commit";if(/^ROLLBACK/i.test(text))return "Rollback";
 if(text.includes("DELETE FROM qsc_public_admission.leases"))return "Release";
 return /^select/i.test(text.trim())?"Read":"Other";
};
const profiling=new WeakMap<Pool,{sessions:number;profiled:number;failed:number}>();
export const profilingCoverage=(pool:Pool)=>profiling.get(pool)??{sessions:0,profiled:0,failed:0};
type UnknownMethod=(...args:unknown[])=>unknown;
/** Transparent instrumentation of owned QA pools only; no SQL/parameters/errors are exported. */
export function instrumentPool(pool:Pool,label:"Main"|"Admission",metrics:PerformanceMeasurements,options:{profileFunctions?:boolean;observe?:(event:QaPoolEvent)=>void}={}){
 const observe=(event:QaPoolEvent)=>{try{options.observe?.(event);}catch{metrics.count("ObserverFailures");}};const initialized=new WeakMap<object,Promise<void>>(),coverage={sessions:0,profiled:0,failed:0};profiling.set(pool,coverage);
 const originalConnect=pool.connect.bind(pool) as unknown as UnknownMethod;
 const instrument=(client:PoolClient):Promise<void>=>{
  const ready=initialized.get(client);if(ready)return ready;coverage.sessions++;observeQaDatabaseClient(client);
  const original=client.query.bind(client) as unknown as UnknownMethod;
  (client as unknown as {query:UnknownMethod}).query=(...args:unknown[])=>{
   const first=args[0],kind=queryKind(typeof first==="object"&&first&&"text"in first?first.text:first);
   const context=measurementContext.getStore(),key="Query."+label+"."+(context?.phase??"Main")+"."+kind,start=performance.now();
   let finished=false;const finish=(failed:boolean,error?:unknown,result?:unknown)=>{if(finished)return;finished=true;const elapsedMs=performance.now()-start;metrics.add(key,elapsedMs);if(failed)metrics.count("QueryFailures."+label);const preparedClosed=kind==="Prepare"&&(result as {rows?:{prepared?:boolean}[]})?.rows?.[0]?.prepared===false;observe({kind:"Query",pool:label,phase:context?.phase??"Main",operation:kind,elapsedMs,failed,code:failed?qaFailureCode(error):undefined,preparedClosed,total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount});};
   const last=args.at(-1);
   if(typeof last==="function"){args[args.length-1]=(...callbackArgs:unknown[])=>{finish(Boolean(callbackArgs[0]),callbackArgs[0],callbackArgs[1]);return Reflect.apply(last,undefined,callbackArgs);};try{return original(...args);}catch(error){finish(true,error);throw error;}}
   try{const result=original(...args);if(result&&typeof result==="object"&&"then"in result)return (result as Promise<unknown>).then(value=>{finish(false,undefined,value);return value;},error=>{finish(true,error);throw error;});finish(false);return result;}catch(error){finish(true,error);throw error;}
  };
  const setup=(async()=>{try{if(options.profileFunctions!==false){await (original("SET track_functions='pl'") as Promise<unknown>);coverage.profiled++;}}catch{coverage.failed++;}})();initialized.set(client,setup);return setup;
 };
 (pool as unknown as {connect:UnknownMethod}).connect=(...args:unknown[])=>{
  const start=performance.now(),context=measurementContext.getStore(),key="Acquire."+label+"."+(context?.phase??"Main"),callback=args[0];const observed=(error?:unknown)=>{observe({kind:"Acquire",pool:label,phase:context?.phase??"Main",operation:"Acquire",elapsedMs:performance.now()-start,failed:Boolean(error),code:error?qaFailureCode(error):undefined,total:pool.totalCount,idle:pool.idleCount,waiting:pool.waitingCount});};
  if(typeof callback==="function")return originalConnect((error:unknown,client:PoolClient,release:unknown)=>{
   if(error||!client){metrics.add(key,performance.now()-start);metrics.count("PoolFailures."+label);observed(error);return Reflect.apply(callback,undefined,[error,client,release]);}
   void instrument(client).then(()=>{metrics.add(key,performance.now()-start);observed();Reflect.apply(callback,undefined,[error,client,release]);});
  });
  return (originalConnect() as Promise<PoolClient>).then(async client=>{await instrument(client);metrics.add(key,performance.now()-start);observed();return client;},error=>{metrics.add(key,performance.now()-start);metrics.count("PoolFailures."+label);observed(error);throw error;});
 };
 return pool;
}
export function qualifyLocalPerformance(input:{profile:string;durationSeconds:number;metrics:ReturnType<PerformanceMeasurements['snapshot']>;finalOccupancy:number;hostCpu:number[];requiredBurstFailed?:boolean}) {
 const {metrics}=input,entries=Object.entries(metrics.durationsMs);
 const admission=entries.filter(([key])=>key.startsWith('Admission.'));
 const ttfb=entries.filter(([key])=>key.startsWith('HttpTTFB.'));
 const pools=Object.entries(metrics.counts).filter(([key])=>/PoolFailures|QueryFailures|AdmissionFailure|CleanupFailures|ObserverFailures/.test(key)).reduce((n,[,v])=>n+v,0);
 const bad=(metrics.counts.UnexpectedStatus??0)+(metrics.counts.FixtureExceptions??0)+(metrics.counts.UnexpectedImageFallback??0)+(metrics.counts.HttpTransportFailures??0)+(metrics.counts.SchedulerShed??0);
 const state=(pass:boolean)=>pass?'LOCAL_QA_PASS':'LOCAL_QA_FAIL';
 const criteria={workloadCorrectness:state(bad===0),admissionLatency:admission.length?state(admission.every(([,v])=>v.p95!==null&&v.p95<=25&&v.p99!==null&&v.p99<=75)):'INCONCLUSIVE',
  httpTtfb:ttfb.length?state(ttfb.every(([,v])=>v.p95!==null&&v.p95<=500&&v.p99!==null&&v.p99<=1000)):'INCONCLUSIVE',
  normalPoolAndLockErrors:state(pools===0),finalLeases:state(input.finalOccupancy===0),duration:input.profile==='nat'?'INCONCLUSIVE':input.durationSeconds>=900?'LOCAL_QA_PASS':'INCONCLUSIVE',
  hostCpu:input.hostCpu.length?state(input.hostCpu.reduce((a,b)=>a+b,0)/input.hostCpu.length<70&&(distribution(input.hostCpu).p95??100)<85):'INCONCLUSIVE',
  requiredNatBurst:input.profile==='nat'?(input.requiredBurstFailed===true?'LOCAL_QA_FAIL':input.requiredBurstFailed===false?'LOCAL_QA_PASS':'INCONCLUSIVE'):'NOT_APPLICABLE',combinedProcessAndDatabaseMemory:'INCONCLUSIVE',actualVps:'DEPLOYMENT_PENDING',actualNginx:'DEPLOYMENT_PENDING'};
 const local=[criteria.workloadCorrectness,criteria.admissionLatency,criteria.httpTtfb,criteria.normalPoolAndLockErrors,criteria.finalLeases,criteria.duration,criteria.hostCpu,criteria.combinedProcessAndDatabaseMemory,criteria.requiredNatBurst];
 return {workloadCorrectnessStatus:criteria.workloadCorrectness,localProfileStatus:local.includes('LOCAL_QA_FAIL')?'LOCAL_QA_FAIL':local.includes('INCONCLUSIVE')?'INCONCLUSIVE':'LOCAL_QA_PASS',criteria,formalAcceptance:'HOLD'};
}
