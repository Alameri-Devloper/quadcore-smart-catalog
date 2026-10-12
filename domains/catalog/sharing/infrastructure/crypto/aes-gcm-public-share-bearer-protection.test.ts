import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHmac, webcrypto } from "node:crypto";
import { it } from "node:test";
import { AesGcmPublicShareBearerProtection } from "./aes-gcm-public-share-bearer-protection";
import { HmacPublicShareLookupDigest } from "./hmac-public-share-lookup-digest";
import { PublicShareKeyRing } from "./public-share-key-ring";
import { AAD, AES_KEY, CIPHERTEXT_HEX, CONTEXT, DIGEST, IV, TAG_HEX, TOKEN,
  encryptionRing, lookupRing, success } from "./public-share-crypto.test-fixtures";

const digest = () => new HmacPublicShareLookupDigest(lookupRing());
const protection = () => new AesGcmPublicShareBearerProtection(encryptionRing([2,3]),digest(),()=>IV);
const envelope = () => success(protection().encrypt(TOKEN,CONTEXT));
const decipherPrototype = () => Object.getPrototypeOf(createDecipheriv('aes-256-gcm',AES_KEY,IV,{authTagLength:16}));

it("matches fixed expected ciphertext/tag and an independently constructed Web Crypto vector", async () => {
  const value=envelope();
  assert.deepEqual(Object.keys(value).sort(),['authTag','ciphertext','formatVersion','iv','keyVersion']);
  assert.equal(value.iv.length,16);assert.equal(value.ciphertext.length,58);assert.equal(value.authTag.length,22);
  assert.equal(Buffer.from(value.ciphertext,'base64url').toString('hex'),CIPHERTEXT_HEX);
  assert.equal(Buffer.from(value.authTag,'base64url').toString('hex'),TAG_HEX);
  const key=await webcrypto.subtle.importKey('raw',Uint8Array.from(AES_KEY),'AES-GCM',false,['encrypt']);
  const reference=Buffer.from(await webcrypto.subtle.encrypt({name:'AES-GCM',iv:Uint8Array.from(IV),
    additionalData:Buffer.from(AAD,'utf8'),tagLength:128},key,Buffer.from(TOKEN,'ascii')));
  assert.equal(reference.toString('hex'),CIPHERTEXT_HEX+TAG_HEX);
  assert.deepEqual(protection().decrypt(value,CONTEXT,DIGEST),{ok:true,value:TOKEN});
});
it("requests fresh 12-byte cryptographic nonces and never encrypts the URL or decoded token", () => {
  const requests:number[]=[];
  const adapter=new AesGcmPublicShareBearerProtection(encryptionRing(),digest(),size=>{requests.push(size);return IV;});
  assert.equal(success(adapter.encrypt(TOKEN,CONTEXT)).ciphertext.length,58);
  assert.deepEqual(requests,[12]);
  const random=new AesGcmPublicShareBearerProtection(encryptionRing(),digest());
  assert.notEqual(success(random.encrypt(TOKEN,CONTEXT)).iv,success(random.encrypt(TOKEN,CONTEXT)).iv);
  assert.deepEqual(adapter.encrypt('https://example.com/share/'+TOKEN,CONTEXT),{ok:false,error:'IntegrityFailure'});
});
for(const field of ['workspaceId','grantId','productId','branchId'] as const){
  it(`authenticates the supplied ${field} tenant/resource context`,()=>{
    assert.deepEqual(protection().decrypt(envelope(),{...CONTEXT,[field]:'another-synthetic-id'},DIGEST),
      {ok:false,error:'IntegrityFailure'});
  });
}
it("binds encryption version even when two retained versions have identical bytes",()=>{
  assert.deepEqual(protection().decrypt({...envelope(),keyVersion:3},CONTEXT,DIGEST),{ok:false,error:'IntegrityFailure'});
});
for(const field of ['iv','ciphertext','authTag'] as const){
  it(`rejects authenticated ${field} corruption without returning plaintext`,()=>{
    const value=envelope(),bytes=Buffer.from(value[field],'base64url');bytes[0]^=1;
    assert.deepEqual(protection().decrypt({...value,[field]:bytes.toString('base64url')},CONTEXT,DIGEST),
      {ok:false,error:'IntegrityFailure'});
  });
}
it("strictly rejects missing/extra/symbol/non-enumerable fields, wrong types and noncanonical encoding",()=>{
  const value=envelope();
  const invalid:unknown[]=[null,[],{...value,extra:'SYNTHETIC_PRIVATE_FIELD'}, {...value,formatVersion:2},
    {...value,keyVersion:'2'},{...value,keyVersion:0},{...value,keyVersion:2.1},Object.create(value),
    {...value,[Symbol('extra')]:true},Object.defineProperty({...value},'hidden',{value:true})];
  for(const key of Object.keys(value)) { const missing={...value} as Record<string,unknown>;delete missing[key];invalid.push(missing); }
  for(const field of ['iv','ciphertext','authTag'] as const){
    for(const bad of [null,42,'',value[field]+'=',value[field]+'\n',value[field].slice(1),'+'.repeat(value[field].length)]) {
      invalid.push({...value,[field]:bad});
    }
  }
  for(const field of ['ciphertext','authTag'] as const) invalid.push({...value,[field]:value[field].slice(0,-1)+'B'});
  for(const input of invalid) assert.deepEqual(protection().decrypt(input as never,CONTEXT,DIGEST),
    {ok:false,error:'IntegrityFailure'});
});
it("rejects authenticated invalid plaintext, including non-ASCII bytes, after successful tag authentication",()=>{
  for(const plaintext of [Buffer.from('A'.repeat(42)+'B','ascii'),Buffer.alloc(43,0xc1),Buffer.from('x'.repeat(43),'ascii')]) {
    const cipher=createCipheriv('aes-256-gcm',AES_KEY,IV,{authTagLength:16});cipher.setAAD(Buffer.from(AAD,'utf8'));
    const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
    assert.deepEqual(protection().decrypt({...envelope(),ciphertext:ciphertext.toString('base64url'),
      authTag:cipher.getAuthTag().toString('base64url')},CONTEXT,DIGEST),{ok:false,error:'IntegrityFailure'});
  }
});
it("checks stored lookup digest and distinguishes missing lookup/encryption versions from integrity failure",()=>{
  assert.deepEqual(protection().decrypt(envelope(),CONTEXT,{...DIGEST,value:'0'.repeat(64)}),{ok:false,error:'IntegrityFailure'});
  assert.deepEqual(protection().decrypt(envelope(),CONTEXT,{...DIGEST,keyVersion:10}),{ok:false,error:'KeyUnavailable'});
  assert.deepEqual(protection().decrypt({...envelope(),keyVersion:10},CONTEXT,DIGEST),{ok:false,error:'KeyUnavailable'});
  assert.deepEqual(protection().decrypt({...envelope(),keyVersion:10,authTag:''},CONTEXT,DIGEST),{ok:false,error:'IntegrityFailure'});
  assert.deepEqual(protection().decrypt(envelope(),{...CONTEXT,branchId:''},DIGEST),{ok:false,error:'IntegrityFailure'});
});
it("retains old keys across active switches; pure re-encryption preserves bearer/context and uses a new IV",()=>{
  const original=envelope();
  const newHmac=Buffer.alloc(32,9),newEncryption=Buffer.alloc(32,8);
  const rotatedDigest=new HmacPublicShareLookupDigest(new PublicShareKeyRing('lookup',
    [{version:1,bytes:Buffer.from(Array.from({length:32},(_,i)=>i+32))},{version:10,bytes:newHmac}],10));
  const rotated=new AesGcmPublicShareBearerProtection(new PublicShareKeyRing('encryption',
    [{version:2,bytes:AES_KEY},{version:3,bytes:newEncryption}],3),rotatedDigest,()=>Buffer.alloc(12,7));
  const recovered=success(rotated.decrypt(original,CONTEXT,DIGEST));assert.equal(recovered,TOKEN);
  const renewed=success(rotated.encrypt(recovered,CONTEXT));assert.equal(renewed.keyVersion,3);assert.notEqual(renewed.iv,original.iv);
  const newDigest=success(rotatedDigest.create(TOKEN));
  assert.equal(newDigest.keyVersion,10);
  assert.equal(newDigest.value,createHmac('sha256',newHmac)
    .update(Buffer.from('qsc:catalog:public-sharing:lookup:v1\0','utf8')).update(TOKEN,'ascii').digest('hex'));
  assert.notEqual(newDigest.value,DIGEST.value);
  assert.deepEqual(rotatedDigest.verify(TOKEN,DIGEST),{ok:true,value:true});
  assert.deepEqual(new AesGcmPublicShareBearerProtection(new PublicShareKeyRing('encryption',
    [{version:3,bytes:newEncryption}],3),rotatedDigest).decrypt(renewed,CONTEXT,newDigest),{ok:true,value:TOKEN});
  assert.deepEqual(new AesGcmPublicShareBearerProtection(encryptionRing([3]),rotatedDigest)
    .decrypt(original,CONTEXT,DIGEST),{ok:false,error:'KeyUnavailable'});
  assert.deepEqual(new HmacPublicShareLookupDigest(lookupRing([10])).verify(TOKEN,DIGEST),{ok:false,error:'KeyUnavailable'});
});
for(const code of ['ERR_CRYPTO_INVALID_STATE','ERR_SYNTHETIC_CRYPTO_RUNTIME']){
  it(`maps coded finalization ${code} to sanitized CryptoUnavailable without plaintext`,(t)=>{
    const value=envelope();
    t.mock.method(decipherPrototype(),'final',()=>{
      throw Object.assign(new Error(TOKEN,{cause:{innocentName:TOKEN}}),{code});
    });
    const failure=protection().decrypt(value,CONTEXT,DIGEST);
    assert.deepEqual(failure,{ok:false,error:'CryptoUnavailable'});
    for(const field of ['code','message','stack','cause','value'])assert.equal(Object.hasOwn(failure,field),false);
    assert.equal(JSON.stringify(failure).includes(TOKEN),false);
  });
}
it("treats uncoded native finalization faults as integrity failures under the accepted Node 24 ambiguity",(t)=>{
  const value=envelope();
  t.mock.method(decipherPrototype(),'final',()=>{throw new Error('SYNTHETIC_UNCODED_FAULT',{cause:TOKEN});});
  assert.deepEqual(protection().decrypt(value,CONTEXT,DIGEST),{ok:false,error:'IntegrityFailure'});
});
it("maps non-Error finalization throws to operational failure without trusting message-like properties",(t)=>{
  const value=envelope();
  t.mock.method(decipherPrototype(),'final',()=>{throw {message:TOKEN};});
  assert.deepEqual(protection().decrypt(value,CONTEXT,DIGEST),{ok:false,error:'CryptoUnavailable'});
});
it("keeps concatenation faults outside the authentication classification boundary",(t)=>{
  const value=envelope();
  t.mock.method(Buffer,'concat',()=>{throw new Error(TOKEN);});
  assert.deepEqual(protection().decrypt(value,CONTEXT,DIGEST),{ok:false,error:'CryptoUnavailable'});
});
it("sanitizes RNG and unexpected post-authentication execution failures",()=>{
  const fail=new AesGcmPublicShareBearerProtection(encryptionRing(),digest(),()=>{throw new Error('SYNTHETIC_SECRET_RANDOM');});
  assert.deepEqual(fail.encrypt(TOKEN,CONTEXT),{ok:false,error:'CryptoUnavailable'});
  assert.deepEqual(new AesGcmPublicShareBearerProtection(encryptionRing(),digest(),()=>Buffer.alloc(11)).encrypt(TOKEN,CONTEXT),
    {ok:false,error:'CryptoUnavailable'});
  const unexpected={create:digest().create,candidates:digest().candidates,verify:()=>{throw {innocentName:TOKEN};}};
  assert.deepEqual(new AesGcmPublicShareBearerProtection(encryptionRing(),unexpected).decrypt(envelope(),CONTEXT,DIGEST),
    {ok:false,error:'CryptoUnavailable'});
});
