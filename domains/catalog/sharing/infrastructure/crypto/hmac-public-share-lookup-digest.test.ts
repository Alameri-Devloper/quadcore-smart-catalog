import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { inspect } from "node:util";
import { it } from "node:test";
import { HmacPublicShareLookupDigest } from "./hmac-public-share-lookup-digest";
import { PublicShareKeyRing } from "./public-share-key-ring";
import { DIGEST, HMAC_KEY, TOKEN, lookupRing, success } from "./public-share-crypto.test-fixtures";

it("matches the independently computed HMAC vector with exact purpose, zero separator and ASCII", () => {
  const digest=new HmacPublicShareLookupDigest(lookupRing());
  assert.deepEqual(success(digest.create(TOKEN)),DIGEST);
  assert.match(DIGEST.value,/^[a-f0-9]{64}$/);
  for(const input of [TOKEN,'qsc:catalog:public-sharing:lookup:v1'+TOKEN,'other\0'+TOKEN]) {
    assert.notEqual(createHmac('sha256',HMAC_KEY).update(input).digest('hex'),DIGEST.value);
  }
});
it("creates using the active key and orders all retained candidates numerically", () => {
  const entries=[{version:10,bytes:Buffer.alloc(32,10)},{version:2,bytes:Buffer.alloc(32,2)},
    {version:1,bytes:HMAC_KEY}];
  const digest=new HmacPublicShareLookupDigest(new PublicShareKeyRing('lookup',entries,10));
  const candidates=success(digest.candidates(TOKEN));
  assert.deepEqual(candidates.map(v=>v.keyVersion),[1,2,10]);
  for(const candidate of candidates){
    const key=entries.find(({version})=>version===candidate.keyVersion)!.bytes;
    assert.equal(candidate.value,createHmac('sha256',key)
      .update(Buffer.from('qsc:catalog:public-sharing:lookup:v1\0','utf8')).update(TOKEN,'ascii').digest('hex'));
  }
  assert.deepEqual(success(digest.create(TOKEN)),candidates[2]);
  assert.equal(new Set(candidates.map(({value})=>value)).size,3);
  assert.deepEqual(digest.verify(TOKEN,DIGEST),{ok:true,value:true});
});
it("compares equal-length valid digests timing-safely; distinguishes mismatch, corruption and missing key", () => {
  let comparisons=0;
  const digest=new HmacPublicShareLookupDigest(lookupRing(),(a,b)=>{
    comparisons++;assert.equal(a.byteLength,32);assert.equal(b.byteLength,32);return timingSafeEqual(a,b);
  });
  assert.deepEqual(digest.verify(TOKEN,DIGEST),{ok:true,value:true});
  assert.deepEqual(digest.verify(TOKEN,{...DIGEST,value:'0'.repeat(64)}),{ok:true,value:false});
  assert.equal(comparisons,2);
  assert.deepEqual(digest.verify(TOKEN,{...DIGEST,keyVersion:2}),{ok:false,error:'KeyUnavailable'});
  for(const bad of [{...DIGEST,value:'A'.repeat(64)},{...DIGEST,value:'a'.repeat(63)},{...DIGEST,keyVersion:0},null]){
    assert.deepEqual(digest.verify(TOKEN,bad as never),{ok:false,error:'IntegrityFailure'});
  }
  assert.deepEqual(digest.create(TOKEN+'='),{ok:false,error:'IntegrityFailure'});
  assert.deepEqual(digest.candidates(TOKEN+'='),{ok:false,error:'IntegrityFailure'});
  assert.equal(comparisons,2);
});
it("sanitizes unexpected comparison errors and protects copied key state from mutation and inspection", () => {
  const bytes=Buffer.from(HMAC_KEY);
  const ring=new PublicShareKeyRing('lookup',[{version:1,bytes}],1);
  const digest=new HmacPublicShareLookupDigest(ring);
  bytes.fill(0);ring.key(1)!.fill(0);
  assert.deepEqual(success(digest.create(TOKEN)),DIGEST);
  for(const text of [JSON.stringify(digest),inspect(digest,{showHidden:true}),JSON.stringify(ring),inspect(ring,{showHidden:true})]){
    assert.equal(text.includes(HMAC_KEY.toString('base64')),false);
    assert.equal(text.includes(HMAC_KEY.toString('hex')),false);
  }
  assert.deepEqual(new HmacPublicShareLookupDigest(ring,()=>{throw new Error('SYNTHETIC_PRIVATE_COMPARE');})
    .verify(TOKEN,DIGEST),{ok:false,error:'CryptoUnavailable'});
});
