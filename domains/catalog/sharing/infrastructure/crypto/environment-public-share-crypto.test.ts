import assert from "node:assert/strict";
import { it } from "node:test";
import { canonicalPublicShareOrigin, parsePublicShareKeyMap, readPublicShareCryptoConfiguration } from "./environment-public-share-crypto";
import { PublicShareKeyRing } from "./public-share-key-ring";
import { AES_KEY, HMAC_KEY, environment } from "./public-share-crypto.test-fixtures";

it("validates the exact dedicated environment and keeps capabilities independent",()=>{
  const config=readPublicShareCryptoConfiguration(environment());
  assert.deepEqual(config.readiness,{lookup:'READY',encryption:'READY',urlConstruction:'READY',durableCoverage:'UNCHECKED',diagnostics:[]});
  assert.equal(config.publicOrigin,'https://example.com');
  assert.equal(readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:'invalid'})).readiness.lookup,'READY');
  assert.equal(readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:'invalid'})).readiness.encryption,'READY');
  assert.deepEqual(readPublicShareCryptoConfiguration({}).readiness.diagnostics,
    ['LookupConfigurationInvalid','EncryptionConfigurationInvalid','PublicOriginInvalid']);
});
it("detects duplicate decoded members before overwrite and accepts legal JSON whitespace/string escaping",()=>{
  const key=HMAC_KEY.toString('base64');
  for(const json of [`{"1":"${key}","1":"${key}"}`,`{"1":"${key}","1":"different"}`,
    `{"1":"${key}","\\u0031":"${key}"}`]) assert.throws(()=>parsePublicShareKeyMap(json),{message:'PublicShareConfigurationInvalid'});
  assert.equal(parsePublicShareKeyMap(` \n{ "\\u0031"\t: "${key}" }\r\n`)[0].version,1);
  for(const json of ['', 'null','[]','{}','{"1":null}','{"1":{}}','{"1":[]}','{"1":32}',
    '{1:"key"}','{"1":"bad\\x00"}','{"1":"unterminated}','{"1":"bad\n"}',
    `{"1":"${key}",}`,`{"1":"${key}"} trailing`,`{"1":"${key}"}{}`,`\u00a0{"1":"${key}"}`]) {
    assert.throws(()=>parsePublicShareKeyMap(json),{message:'PublicShareConfigurationInvalid'});
  }
});
for(const [index,invalid] of ['0','-1','+1','01',' 1','1 ','1.0','1e0','9007199254740992','Infinity','NaN','',1].entries()){
  it(`rejects noncanonical active/map version case ${index}`,()=>{
    assert.equal(readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION:invalid as string})).readiness.lookup,'UNAVAILABLE');
    if(typeof invalid==='string') assert.throws(()=>parsePublicShareKeyMap(JSON.stringify({[invalid]:HMAC_KEY.toString('base64')})),{message:'PublicShareConfigurationInvalid'});
  });
}
it("requires active membership, validates sizes and canonical standard base64 without aliases",()=>{
  assert.equal(readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION:'2'})).readiness.lookup,'UNAVAILABLE');
  for(const size of [0,31]) assert.equal(readPublicShareCryptoConfiguration(environment({
    QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:JSON.stringify({1:Buffer.alloc(size).toString('base64')}),
  })).readiness.lookup,'UNAVAILABLE');
  for(const size of [32,33,64]) assert.equal(readPublicShareCryptoConfiguration(environment({
    QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:JSON.stringify({1:Buffer.alloc(size,9).toString('base64')}),
  })).readiness.lookup,'READY');
  for(const size of [31,33]) assert.equal(readPublicShareCryptoConfiguration(environment({
    QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:JSON.stringify({2:Buffer.alloc(size,9).toString('base64')}),
  })).readiness.encryption,'UNAVAILABLE');
  const encoded=HMAC_KEY.toString('base64');
  for(const bad of [encoded.slice(0,-1),encoded+'=',encoded+'\n','_'+encoded.slice(1),encoded.slice(0,-2)+'B=']){
    assert.equal(readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:JSON.stringify({1:bad})})).readiness.lookup,'UNAVAILABLE');
  }
});
for(const purpose of ['lookup','encryption'] as const){
  it(`accepts eight and rejects nine ${purpose} keys without truncation`,()=>{
    const bytes=purpose==='lookup'?HMAC_KEY:AES_KEY;
    for(const count of [1,8,9]){
      const entries=Array.from({length:count},(_,index)=>({version:index+1,bytes}));
      if(count===9)assert.throws(()=>new PublicShareKeyRing(purpose,entries,1),{message:'PublicShareKeyRingInvalid'});
      else assert.equal(new PublicShareKeyRing(purpose,entries,1).versions().length,count);
      const json=JSON.stringify(Object.fromEntries(entries.map(({version})=>[version,bytes.toString('base64')])));
      const config=readPublicShareCryptoConfiguration(environment(purpose==='lookup'?{QSC_PUBLIC_SHARE_HMAC_KEYS_JSON:json}:
        {QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:json,QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION:'1'}));
      assert.equal(config.readiness[purpose],count===9?'UNAVAILABLE':'READY');
    }
    assert.throws(()=>new PublicShareKeyRing(purpose,[],1),{message:'PublicShareKeyRingInvalid'});
    assert.throws(()=>new PublicShareKeyRing(purpose,[{version:1,bytes},{version:1,bytes}],1),{message:'PublicShareKeyRingInvalid'});
  });
}
it("rejects cross-purpose decoded key reuse regardless of version and sanitized input spelling",()=>{
  const config=readPublicShareCryptoConfiguration(environment({QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION:'17',
    QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON:JSON.stringify({17:HMAC_KEY.toString('base64')})}));
  assert.equal(config.lookup,null);assert.equal(config.encryption,null);
  assert.deepEqual(config.readiness.diagnostics,['PurposeKeyReuse']);
});
it("accepts both root spellings, canonicalizes URL.origin and enforces Production HTTPS",()=>{
  for(const source of ['https://example.com','https://example.com/'])assert.equal(canonicalPublicShareOrigin(source,true),'https://example.com');
  assert.equal(canonicalPublicShareOrigin('http://example.com/',false),'http://example.com');
  assert.throws(()=>canonicalPublicShareOrigin('http://example.com',true),{message:'PublicShareOriginInvalid'});
  assert.equal(readPublicShareCryptoConfiguration(environment({NODE_ENV:'production',QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:'http://example.com'})).readiness.urlConstruction,'UNAVAILABLE');
});
for(const mode of ['production','development','test']){
  for(const protocol of ['http','https']){
    it(`validates canonical ${mode} mode with ${protocol} origin`,()=>{
      const allowed=mode!=='production'||protocol==='https';
      const config=readPublicShareCryptoConfiguration(environment({NODE_ENV:mode,
        QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:`${protocol}://example.com/`}));
      assert.equal(config.readiness.urlConstruction,allowed?'READY':'UNAVAILABLE');
      assert.equal(config.publicOrigin,allowed?`${protocol}://example.com`:null);
      assert.deepEqual(config.readiness.diagnostics,allowed?[]:['PublicOriginInvalid']);
    });
  }
}
for(const [index,mode] of [undefined,'','Production','production ',' development','unknown',null,42].entries()){
  it(`rejects missing or malformed environment mode case ${index} without normalizing or leaking`,()=>{
    for(const protocol of ['http','https']){
      const config=readPublicShareCryptoConfiguration(environment({NODE_ENV:mode as string,
        QSC_PUBLIC_SHARE_PUBLIC_ORIGIN:`${protocol}://example.com/`}));
      assert.equal(config.publicOrigin,null);
      assert.deepEqual(config.readiness,{lookup:'READY',encryption:'READY',urlConstruction:'UNAVAILABLE',
        durableCoverage:'UNCHECKED',diagnostics:['PublicOriginInvalid']});
    }
  });
}
for(const [index,source] of ['https://user:test@example.com','https://@example.com','https://example.com/path',
  'https://example.com/a/..','https://example.com/%2e/','https://example.com//','https://example.com?',
  'https://example.com?x=1','https://example.com#','https://example.com#fragment','ftp://example.com',
  '//example.com','https:\\example.com',' https://example.com','https://example.com\n',
  'https://exam\tple.com','https://'].entries()){
  it(`rejects forbidden or normalization-hidden origin spelling ${index}`,()=>{
    assert.throws(()=>canonicalPublicShareOrigin(source,false),{message:'PublicShareOriginInvalid'});
  });
}
