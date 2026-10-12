import assert from "node:assert/strict";
import { it } from "node:test";
import { canonicalPublicShareToken, decodePublicShareBase64Url, decodePublicShareKeyBase64,
  encodePublicShareBase64Url, publicShareRetrievalAad } from "./public-share-encoding";
import { AAD, CONTEXT, HMAC_KEY, TOKEN } from "./public-share-crypto.test-fixtures";

it("round-trips canonical base64url and rejects transport aliases and malformed lengths", () => {
  assert.equal(encodePublicShareBase64Url(decodePublicShareBase64Url(TOKEN, 32)), TOKEN);
  for (const input of [null,42,{},TOKEN+'=',TOKEN+'\n',' '+TOKEN,TOKEN.slice(1),TOKEN+'A',
    '+'.repeat(43),'/'.repeat(43),TOKEN+'/media',TOKEN+'.extra','%41'+TOKEN.slice(1)]) {
    assert.throws(() => canonicalPublicShareToken(input));
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  for (let index = 0; index < 64; index++) {
    const input = 'A'.repeat(42)+alphabet[index];
    if (index%4===0) assert.equal(canonicalPublicShareToken(input),input);
    else assert.throws(() => canonicalPublicShareToken(input));
  }
});
it("requires exact standard-base64 round trips for environment keys", () => {
  const encoded=HMAC_KEY.toString("base64");
  assert.deepEqual(decodePublicShareKeyBase64(encoded),HMAC_KEY);
  for (const input of ['',null,encoded.slice(0,-1),encoded+'=',encoded+'\n',' '+encoded,
    '_'.repeat(44),'A===','AB==','AAB=','A']) assert.throws(()=>decodePublicShareKeyBase64(input),{message:'PublicShareKeyEncodingInvalid'});
});
it("emits exact UTF-8 ordered AAD and excludes unrelated mutable fields", () => {
  assert.equal(publicShareRetrievalAad(2,CONTEXT).toString('utf8'),AAD);
  assert.equal(publicShareRetrievalAad(2,{...CONTEXT,revision:42,lookupKeyVersion:10} as never).toString('utf8'),AAD);
  const unicode={...CONTEXT,workspaceId:'مساحة'};
  assert.deepEqual(publicShareRetrievalAad(2,unicode),Buffer.from(JSON.stringify([
    'qsc:catalog:public-sharing:retrieval:v1',1,2,unicode.workspaceId,CONTEXT.grantId,CONTEXT.productId,CONTEXT.branchId,
  ]),'utf8'));
  for(const value of ['',null,42,'\ud800'])assert.throws(()=>publicShareRetrievalAad(2,{...CONTEXT,branchId:value} as never));
  assert.throws(()=>publicShareRetrievalAad(0,CONTEXT));
});
