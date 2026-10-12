import assert from "node:assert/strict";
import { inspect } from "node:util";
import { it } from "node:test";
import { createPublicShareCryptoRuntime, evaluatePublicShareKeyCoverage } from "./public-share-crypto-runtime";
import { AesGcmPublicShareBearerProtection } from "./crypto/aes-gcm-public-share-bearer-protection";
import { CryptographicPublicShareTokenGenerator } from "./crypto/public-share-token-generator";
import { HmacPublicShareLookupDigest } from "./crypto/hmac-public-share-lookup-digest";
import { AES_KEY, CONTEXT, DIGEST, HMAC_KEY, TOKEN, encryptionRing, environment, lookupRing,
  success } from "./crypto/public-share-crypto.test-fixtures";

it("composes all three ports for the complete in-process chain without persistence or HTTP",()=>{
  const runtime=createPublicShareCryptoRuntime(environment());
  const token=success(runtime.tokenGenerator.generate());
  const digest=success(runtime.lookupDigest.create(token));
  const envelope=success(runtime.bearerProtection.encrypt(token,CONTEXT));
  assert.deepEqual(runtime.bearerProtection.decrypt(envelope,CONTEXT,digest),{ok:true,value:token});
  assert.deepEqual(runtime.lookupDigest.verify(token,digest),{ok:true,value:true});
  assert.equal(runtime.publicOrigin,'https://example.com');
  assert.equal(runtime.readiness.durableCoverage,'UNCHECKED');
  assert.deepEqual(Object.keys(runtime).sort(),['bearerProtection','evaluateCoverage','lookupDigest','publicOrigin','readiness','tokenGenerator']);
  assert.equal(Object.isFrozen(runtime),true);
});
it("keeps lookup available with invalid encryption, and keeps URL construction independently unavailable",()=>{
  const runtime=createPublicShareCryptoRuntime(environment({QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:'SYNTHETIC_BAD_JSON',
    QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:'SYNTHETIC_BAD_ORIGIN'}));
  assert.deepEqual(success(runtime.lookupDigest.create(TOKEN)),DIGEST);
  assert.equal(runtime.readiness.lookup,'READY');assert.equal(runtime.publicOrigin,null);
  assert.deepEqual(runtime.bearerProtection.encrypt(TOKEN,CONTEXT),{ok:false,error:'CryptoUnavailable'});
  assert.deepEqual(runtime.bearerProtection.decrypt({} as never,CONTEXT,DIGEST),{ok:false,error:'CryptoUnavailable'});
});
it("allows encryption with valid encryption configuration, but retrieval fails closed without lookup",()=>{
  const runtime=createPublicShareCryptoRuntime(environment({QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:'invalid'}));
  const encrypted=success(runtime.bearerProtection.encrypt(TOKEN,CONTEXT));
  assert.deepEqual(runtime.bearerProtection.decrypt(encrypted,CONTEXT,DIGEST),{ok:false,error:'CryptoUnavailable'});
  assert.deepEqual(runtime.lookupDigest.candidates(TOKEN),{ok:false,error:'CryptoUnavailable'});
  assert.deepEqual(runtime.lookupDigest.verify(TOKEN,DIGEST),{ok:false,error:'CryptoUnavailable'});
});
it("never reads Host or Identity origin as Public Share authority and never falls back to keys",()=>{
  const runtime=createPublicShareCryptoRuntime({...environment(),HOST:'attacker.example',
    HTTP_HOST:'attacker.example',QSC_PUBLIC_ORIGIN:'https://attacker.example'} as never);
  assert.equal(runtime.publicOrigin,'https://example.com');
  const missing=createPublicShareCryptoRuntime({NODE_ENV:'production',QSC_PUBLIC_ORIGIN:'https://attacker.example'} as never);
  assert.equal(missing.publicOrigin,null);assert.equal(missing.readiness.lookup,'UNAVAILABLE');
  assert.equal(missing.readiness.encryption,'UNAVAILABLE');
});
it("fails URL readiness closed for missing or malformed NODE_ENV even with a valid origin",()=>{
  for(const mode of [undefined,'','Production','production ',' development','unknown']){
    for(const protocol of ['http','https']){
      const runtime=createPublicShareCryptoRuntime(environment({NODE_ENV:mode,
        QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:`${protocol}://example.com/`}));
      assert.equal(runtime.publicOrigin,null);
      assert.deepEqual(runtime.readiness,{lookup:'READY',encryption:'READY',urlConstruction:'UNAVAILABLE',
        durableCoverage:'UNCHECKED',diagnostics:['PublicOriginInvalid']});
      assert.deepEqual(success(runtime.lookupDigest.create(TOKEN)),DIGEST);
      assert.equal(JSON.stringify(runtime.readiness).includes(`${protocol}://example.com`),false);
    }
  }
});
it("distinguishes absent evidence from explicit empty sets without upgrading durable coverage",()=>{
  const runtime=createPublicShareCryptoRuntime(environment());
  assert.deepEqual(runtime.evaluateCoverage(),{lookup:{state:'UNCHECKED',missingVersions:[]},
    encryption:{state:'UNCHECKED',missingVersions:[]},durableCoverage:'UNCHECKED'});
  for(const input of [{lookupVersions:[],encryptionVersions:[]},{lookupVersions:[1],encryptionVersions:[2]}]){
    assert.deepEqual(runtime.evaluateCoverage(input),{lookup:{state:'COVERED',missingVersions:[]},
      encryption:{state:'COVERED',missingVersions:[]},durableCoverage:'UNCHECKED'});
  }
  assert.equal(runtime.readiness.durableCoverage,'UNCHECKED');
});
it("evaluates supplied referenced versions deterministically with duplicates/order and separate missing sets",()=>{
  assert.deepEqual(evaluatePublicShareKeyCoverage({lookupVersions:[10,1,1],encryptionVersions:[2]},
    {lookupVersions:[7,10,7,3],encryptionVersions:[9,2,4]}),{
    lookup:{state:'MISSING',missingVersions:[3,7]},encryption:{state:'MISSING',missingVersions:[4,9]},durableCoverage:'UNCHECKED',
  });
  // P4 excludes revoked-only encryption references before supplying this synthetic set.
  assert.equal(evaluatePublicShareKeyCoverage({lookupVersions:[1],encryptionVersions:[2]},
    {encryptionVersions:[]}).encryption.state,'COVERED');
});
it("rejects malformed/unsafe/sparse coverage versions with fixed diagnostics",()=>{
  for(const invalid of [[0],[-1],[1.1],[Number.MAX_SAFE_INTEGER+1],['1'],[NaN],null,new Array(1)]){
    assert.throws(()=>evaluatePublicShareKeyCoverage({lookupVersions:[1],encryptionVersions:[2]},
      {lookupVersions:invalid as never}),{message:'PublicShareCoverageInputInvalid'});
    assert.throws(()=>evaluatePublicShareKeyCoverage({lookupVersions:invalid as never,encryptionVersions:[2]}),
      {message:'PublicShareCoverageInputInvalid'});
  }
  assert.throws(()=>evaluatePublicShareKeyCoverage({lookupVersions:[1],encryptionVersions:[2]},null as never),
    {message:'PublicShareCoverageInputInvalid'});
});
it("keeps synthetic sentinels out of runtime inspection, diagnostics and captured log/error surfaces",(t)=>{
  const captured:unknown[][]=[];
  for(const method of ['log','error','warn','debug','info','trace','dir'] as const)t.mock.method(console,method,(...args:unknown[])=>captured.push(args));
  const runtime=createPublicShareCryptoRuntime(environment());
  const encrypted=success(runtime.bearerProtection.encrypt(TOKEN,CONTEXT));
  const malformed=createPublicShareCryptoRuntime(environment({QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:'SYNTHETIC_SECRET_JSON'}));
  const surfaces:unknown[]=[runtime.readiness,runtime.evaluateCoverage(),malformed.readiness,
    runtime.bearerProtection.decrypt({...encrypted,authTag:'A'.repeat(22)},CONTEXT,DIGEST),
    runtime.lookupDigest.verify(TOKEN,{...DIGEST,keyVersion:900}),
    runtime.lookupDigest.create('SYNTHETIC_PRIVATE_BAD_TOKEN'),
    new CryptographicPublicShareTokenGenerator(()=>{throw {innocentName:TOKEN,secret:'SYNTHETIC_SECRET_EXCEPTION'};}).generate(),
    new AesGcmPublicShareBearerProtection(encryptionRing(),new HmacPublicShareLookupDigest(lookupRing()),
      ()=>{throw new Error(TOKEN);}).encrypt(TOKEN,CONTEXT)];
  const diagnosticText=JSON.stringify(surfaces)+JSON.stringify(runtime)+inspect(runtime,{showHidden:true,depth:10});
  for(const secret of [TOKEN,'https://example.com/share/'+TOKEN,HMAC_KEY.toString('base64'),AES_KEY.toString('base64'),
    HMAC_KEY.toString('hex'),AES_KEY.toString('hex'),DIGEST.value,encrypted.ciphertext,encrypted.iv,encrypted.authTag,
    'SYNTHETIC_SECRET_JSON','SYNTHETIC_SECRET_EXCEPTION','SYNTHETIC_PRIVATE_BAD_TOKEN']){
    assert.equal(diagnosticText.includes(secret),false,'prohibited synthetic value present');
  }
  assert.deepEqual(captured,[]);
});
