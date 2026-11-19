import test from 'node:test';import assert from 'node:assert/strict';import {parseQaResidency,qaColdNonresident} from './public-share-cold-storage';
test('Cold qualification requires zero resident/dirty/writeback pages, not successful advice alone',()=>{
 const result=(pages:number,dirty:number|null=0,writeback:number|null=0)=>parseQaResidency(JSON.stringify({fincore:[{pages,size:162272,dirty_pages:dirty,writeback_pages:writeback}]}),162272);
 assert.ok(qaColdNonresident(result(0)));assert.ok(qaColdNonresident(result(0,null,null)));
 for(const r of [result(1),result(0,1),result(0,0,1),result(40)])assert.equal(qaColdNonresident(r),false);
});
test('Missing, malformed or wrong-size residency cannot produce a cold PASS',()=>{
 for(const value of [{},{fincore:[]},{fincore:[{pages:0,size:162271,dirty_pages:0,writeback_pages:0}]},{fincore:[{pages:-1,size:162272,dirty_pages:0,writeback_pages:0}]},{fincore:[{pages:0,size:162272}]}])assert.throws(()=>parseQaResidency(JSON.stringify(value),162272),/Invalid/);
});
