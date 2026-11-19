import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { sql } from "drizzle-orm";
import { publicSharePostgresFixture } from "../../mock/public-share-postgres.fixture";
import { publicShareMediaFixture } from "../../mock/public-share-media.fixture";
import { environment } from "../crypto/public-share-crypto.test-fixtures";
import { createIsolatedPublicShareQaRuntime } from "../isolated-public-share-qa-runtime";
import { canonicalSource,admissionDiagnostic } from "./qa-public-share-source";
import { publicShareHeaders } from "../http/public-share-resolution-http";
export async function verifyQaServingComposition(url:string,sourceKey:Buffer) {
 process.env.TEST_DATABASE_URL=url;
 // Preserve any application DATABASE_URL so the existing isolation guard checks it.
 process.env.DATABASE_SSL="false";
 const f=publicSharePostgresFixture("p6-admission-serving-new-isolated");
 const media=await publicShareMediaFixture("p4-workspace","p4-product");
 const trusted=new WeakSet<Request>(),logs:unknown[]=[];
 const runtime=createIsolatedPublicShareQaRuntime({mode:"ISOLATED_LOCAL_QA",databaseUrl:url,mediaRoot:media.root,sourceKey,crypto:environment(),verifiedIngressRequest:r=>trusted.has(r)});
 let port=0;
 const server=createServer(async(req,res)=>{
  const started=performance.now();
  try {
   if(!["127.0.0.1","::1","::ffff:127.0.0.1"].includes(req.socket.remoteAddress??"")) {res.writeHead(503);res.end();return;}
   const headers=new Headers(); // Incoming forwarding and dedicated source values are discarded.
   headers.set("x-qsc-qa-source",canonicalSource(req.socket.remoteAddress!)!);
   const request=new Request("http://127.0.0.1:"+port+(req.url??"/"),{method:req.method,headers});trusted.add(request);
   let response:Response;
   if(req.method!=="GET" && req.method!=="HEAD") {const h=publicShareHeaders();h.set("Allow","GET, HEAD, OPTIONS");response=new Response(null,{status:req.method==="OPTIONS"?204:405,headers:h});}
   else {const token=new URL(request.url).pathname.split("/")[2];response=await runtime.media(request,token);}
   logs.push(admissionDiagnostic("Media",req.method??"OTHER",response.status,performance.now()-started));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==="HEAD"?undefined:Buffer.from(await response.arrayBuffer()));
  } catch {logs.push(admissionDiagnostic("Media",req.method??"OTHER",503,performance.now()-started));res.writeHead(503,Object.fromEntries(publicShareHeaders()));res.end();}
 });
 try {
  await f.migrate();await f.seed();
  const issued=await f.lifecycle.issue(f.command);assert.ok(issued.ok);const token=issued.value.url.split("/").at(-1)!;
  await f.execute(sql`INSERT INTO catalog_product_media_roots(workspace_id,product_id,storage_root_key,created_at) VALUES('p4-workspace','p4-product',${media.input.storageRootKey},clock_timestamp())`);
  await f.execute(sql`INSERT INTO catalog_product_images(workspace_id,product_id,product_image_id,storage_key,position,is_main,checksum_sha256,mime_type,media_created_at,media_created_by)
   VALUES('p4-workspace','p4-product','p6-image',${media.input.storageKey},0,true,${media.input.expectedSha256},'image/webp',clock_timestamp(),'synthetic-operator')`);
  await f.execute(sql`UPDATE qsc_public_admission.policy SET ready=true WHERE singleton`);
  server.listen(0,"127.0.0.1");await once(server,"listening");const addr=server.address();assert.ok(addr&&typeof addr!=="string");port=addr.port;
  const base="http://127.0.0.1:"+port,path="/share/"+token+"/media";
  let response=await fetch(base+path,{headers:{"Forwarded":"for=spoof","X-Forwarded-For":"spoof","x-qsc-qa-source":"spoof","Referer":"https://example.invalid/SYNTHETIC_SENSITIVE_MARKER"}});
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),media.bytes);
  for(const [key,value] of publicShareHeaders())assert.equal(response.headers.get(key),value);
  assert.equal((await fetch(base+path,{method:"HEAD"})).status,200);
  for(const method of ["POST","PUT","PATCH","DELETE","OPTIONS"]){response=await fetch(base+path,{method});assert.equal(response.status,method==="OPTIONS"?204:405);for(const [k,v]of publicShareHeaders())assert.equal(response.headers.get(k),v);}
  const untrusted=new Request(base+path,{headers:{"x-qsc-qa-source":"127.0.0.1"}});assert.equal((await runtime.media(untrusted,token)).status,503);
  await f.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility='internal' WHERE workspace_id='p4-workspace'`);
  assert.equal((await fetch(base+path)).status,404);
  await f.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility='public' WHERE workspace_id='p4-workspace'`);
  const source=await runtime.source.resolve((()=>{const r=new Request(base+path,{headers:{"x-qsc-qa-source":"192.0.2.1"}});trusted.add(r);return r;})());
  const page=await runtime.resolver.resolvePage(token,source!);assert.ok(page.ok);assert.equal(page.value.retail.amount,"0.00");
  assert.ok(!JSON.stringify(page.value).match(/wholesale|referenceCost|actorId|workspaceId|grantId/));
  const grant=(await f.execute(sql`SELECT grant_id FROM catalog_public_product_share_grants WHERE workspace_id='p4-workspace'`)).rows[0];
  assert.ok((await f.lifecycle.revoke({context:f.command.context,grantId:String(grant.grant_id)})).ok);
  assert.equal((await fetch(base+path)).status,404);
  await f.execute(sql`UPDATE qsc_public_admission.policy SET ready=false WHERE singleton`);
  assert.equal((await fetch(base+path)).status,503);
  await f.execute(sql`UPDATE qsc_public_admission.policy SET ready=true WHERE singleton`);
  assert.equal((await fetch(base+"/share/malformed/media?secret=SYNTHETIC_SENSITIVE_MARKER")).status,404);
  const localRequest=new Request(base+path,{headers:{"x-qsc-qa-source":"127.0.0.1"}});trusted.add(localRequest);
  const localSource=await runtime.source.resolve(localRequest);
  await f.execute(sql`UPDATE qsc_public_admission.buckets SET tokens=0,sampled_ms=floor(extract(epoch FROM clock_timestamp())*1000)+60000 WHERE key=${"request:source:"+localSource+":Media"}`);
  const denied=await fetch(base+path);assert.equal(denied.status,429);
  const retry=Number(denied.headers.get("Retry-After"));assert.ok(retry>=1&&retry<=60);
  const encoded=JSON.stringify(logs);for(const marker of [token,"SYNTHETIC_SENSITIVE_MARKER","127.0.0.1","spoof","/share/",source!])assert.ok(!encoded.includes(marker));
  return {realLoopbackHttp:true,realPostgreSql:true,actualNativeFileRead:true,checks:["GET200 exact WebP","HEAD200 independently admitted","five method security boundaries","socket verified overwrite, direct untrusted request503","live visibility404","exact Retail zero and confidential fields absent","committed revoke404","missing readiness503, malformed404, bounded Retry-After429","synthetic markers absent from application and simulated-ingress allowlist collectors"],logs,qualification:"local simulated ingress, not deployed Nginx or VPS"};
 }finally{if(server.listening){server.close();server.closeAllConnections();await once(server,"close");}await runtime.close();await f.execute(sql`UPDATE qsc_public_admission.policy SET ready=false WHERE singleton`);await f.connection.close();}
}
