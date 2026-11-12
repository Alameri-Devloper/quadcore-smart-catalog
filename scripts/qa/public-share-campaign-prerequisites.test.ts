import test from "node:test";
import assert from "node:assert/strict";
import { campaignPreflightPass, type GuardConfiguration } from "./public-share-campaign-guard";
import { campaignCpuDelta } from "./public-share-campaign-prerequisites";

test("Campaign admission requires EVERY independent gate, including cold and restoration",()=>{
 const pass:GuardConfiguration["gates"]={fixtures:"PASS",resources:"PASS",cold:"PASS",restoration:"PASS"};assert.equal(campaignPreflightPass(pass),true);
 for(const key of Object.keys(pass))for(const value of ["FAIL","INCONCLUSIVE","NOT RUN",undefined])assert.equal(campaignPreflightPass({...pass,[key]:value} as GuardConfiguration["gates"]),false);
});
test("CPU percentages normalize elapsed usage by the actual cgroup quota",()=>{
 const before={monotonicMs:1000,cpu:{usage_usec:100000,quotaCores:2,nr_throttled:3,throttled_usec:20}};
 const after={monotonicMs:2000,cpu:{usage_usec:1100000,quotaCores:2,nr_throttled:5,throttled_usec:1020}};
 assert.deepEqual(campaignCpuDelta(before,after),{elapsedMs:1000,quotaNormalizedCpuPercent:50,throttledPeriods:2,throttledMicroseconds:1000});
 assert.throws(()=>campaignCpuDelta(after,before),/Invalid/);
});
import { Pool } from 'pg';
import { prepareCampaignControl } from './public-share-campaign-guard';

test('Independent control preparation refuses open, uncertain, foreign or missing shared state without writing', async()=>{
 const config:GuardConfiguration={databaseUrl:'postgresql://qa@127.0.0.1:5432/qsc_p6_admission_test_1',primaryId:'synthetic-primary',fingerprint:'synthetic-fingerprint',guardFile:'unused',ownershipFile:'unused',purpose:'CONTROL_ONLY_TEST',gates:{fixtures:'PASS',resources:'PASS',cold:'INCONCLUSIVE',restoration:'NOT RUN'},timeoutMs:1000};
 const valid={primary_id:config.primaryId,version:'p6-local-qa-a-o-v1',source_key_fingerprint:config.fingerprint,ready:false,pending:false,leases:0};
 for(const row of [{...valid,ready:true},{...valid,pending:true},{...valid,leases:1},{...valid,primary_id:'foreign'},{...valid,source_key_fingerprint:'foreign'},undefined]){
  const statements:string[]=[];let destroyed=false;
  const pool={connect:async()=>({query:async(sql:string)=>{statements.push(sql);return{rows:row?[row]:[]};},release:(failed:boolean)=>{destroyed=failed;}})} as unknown as Pool;
  await assert.rejects(prepareCampaignControl(pool,config),/CampaignControlNotPreparedClosed/);
  assert.ok(destroyed);assert.ok(statements.every(sql=>sql.startsWith('SELECT ')));
 }
});
