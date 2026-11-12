import assert from "node:assert/strict";
import test from "node:test";
import {distribution} from "./public-share-performance-measurements";
test("latency summaries expose count and nearest-rank tails, not only a percentile",()=>{
 const d=distribution(Array.from({length:100},(_,i)=>i+1));assert.equal(d.count,100);assert.equal(d.p50,50);assert.equal(d.p95,95);assert.equal(d.p99,99);assert.equal(d.max,100);
 assert.equal(distribution([42,1]).p95,42);assert.equal(distribution([]).p95,null);
});

import {qualifyLocalPerformance} from './public-share-performance-measurements';
test('short runs cannot qualify and known latency misses remain failures',()=>{
 const m={durationsMs:{'Admission.Page.Source':distribution([40,50]),'HttpTTFB.Page':distribution([100])},counts:{}};
 const q=qualifyLocalPerformance({profile:'pilot',durationSeconds:60,metrics:m,finalOccupancy:0,hostCpu:[10]});
 assert.equal(q.criteria.duration,'INCONCLUSIVE');assert.equal(q.criteria.admissionLatency,'LOCAL_QA_FAIL');assert.equal(q.localProfileStatus,'LOCAL_QA_FAIL');assert.equal(q.formalAcceptance,'HOLD');
});

import {EventEmitter} from 'node:events';
import type {Pool} from 'pg';
import {instrumentPool,measurementContext,PerformanceMeasurements,profilingCoverage} from './public-share-performance-measurements';

test('owned-pool instrumentation preserves promise and callback outcomes and initializes each backend once',async()=>{
 const failure=Error('SyntheticQueryFailure');let setup=0,releaseCount=0;
 const client=Object.assign(new EventEmitter(),{query:(value:unknown,callback?:((error:Error|null,result?:unknown)=>void))=>{
  const text=typeof value==='string'?value:(value as {text:string}).text;if(text.startsWith('SET track_functions'))setup++;
  const result={rows:[{ok:true}]};if(callback){queueMicrotask(()=>callback(text==='FAIL'?failure:null,result));return undefined;}
  return text==='FAIL'?Promise.reject(failure):Promise.resolve(result);
 },release:()=>{releaseCount++;}});
 const release=()=>client.release();const fake={connect:(callback?:((error:null,client:unknown,release:()=>void)=>void))=>{
  if(callback){queueMicrotask(()=>callback(null,client,release));return undefined;}return Promise.resolve(client);
 }} as unknown as Pool;
 const measurements=new PerformanceMeasurements();const pool=instrumentPool(fake,'Admission',measurements);
 await measurementContext.run({route:'Page',phase:'Source'},async()=>{const c=await pool.connect();assert.deepEqual((await c.query('SELECT 1')).rows,[{ok:true}]);await assert.rejects(c.query('FAIL'),error=>error===failure);c.release();});
 await new Promise<void>((resolve,reject)=>pool.connect((error,c,done)=>{if(error||!c)return reject(error??Error('SyntheticClientMissing'));c.query('SELECT 1',(queryError,result)=>{if(queryError)return reject(queryError);assert.deepEqual(result.rows,[{ok:true}]);done();resolve();});}));
 await new Promise<void>((resolve,reject)=>pool.connect((error,c,done)=>{if(error||!c)return reject(error??Error('SyntheticClientMissing'));c.query('FAIL',queryError=>{try{assert.equal(queryError,failure);done();resolve();}catch(e){reject(e);}});}));
 assert.equal(setup,1);assert.equal(releaseCount,3);assert.deepEqual(profilingCoverage(pool),{sessions:1,profiled:1,failed:0});
 const snapshot=measurements.snapshot();assert.equal(snapshot.durationsMs['Acquire.Admission.Source'].count,1);assert.equal(snapshot.counts['QueryFailures.Admission'],2);
});

test('pool instrumentation preserves acquisition rejection and records profiling limitations',async()=>{
 const failure=Error('SyntheticPoolFailure');const metrics=new PerformanceMeasurements();
 const fake={connect:()=>Promise.reject(failure)}as unknown as Pool;instrumentPool(fake,'Main',metrics);await assert.rejects(fake.connect(),error=>error===failure);assert.equal(metrics.snapshot().counts['PoolFailures.Main'],1);
 const client=Object.assign(new EventEmitter(),{query:()=>Promise.reject(failure)});const other={connect:()=>Promise.resolve(client)}as unknown as Pool;instrumentPool(other,'Main',metrics);assert.equal(await other.connect(),client);assert.deepEqual(profilingCoverage(other),{sessions:1,profiled:0,failed:1});
});
test('a failed required NAT burst remains FAIL despite passing steady traffic',()=>{
 const q=qualifyLocalPerformance({profile:'nat',durationSeconds:60,metrics:{durationsMs:{'Admission.Page.Source':distribution([10]),'HttpTTFB.Page':distribution([100])},counts:{}},finalOccupancy:0,hostCpu:[10],requiredBurstFailed:true});
 assert.equal(q.criteria.requiredNatBurst,'LOCAL_QA_FAIL');assert.equal(q.localProfileStatus,'LOCAL_QA_FAIL');assert.equal(q.criteria.workloadCorrectness,'LOCAL_QA_PASS');
});