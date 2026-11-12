import { assertQaAdmissionEndpoint } from "./qa-admission-endpoint";
import net from "node:net";
import { once } from "node:events";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { PostgreSqlPublicShareAdmission } from "./postgresql-public-share-admission";
import { MIB } from "./public-admission-policy";
/** Real PostgreSQL protocol fault fixture; observes only command tags in memory.
 * No packets/credentials/URLs are logged or exported. Owned loopback sockets only. */
export async function verifyAmbiguousAdmissionCommit(url:string,fingerprint:string,admin:Pool) {
 const target=assertQaAdmissionEndpoint(url);assert.ok(["127.0.0.1","localhost"].includes(target.hostname));
 let armed=false,cut=false,commitTags=0;const sockets=new Set<net.Socket>();
 const proxy=net.createServer(front=>{
  sockets.add(front);const back=net.connect({host:target.hostname,port:Number(target.port)});sockets.add(back);
  front.on("error",()=>back.destroy());back.on("error",()=>front.destroy());
  front.on("close",()=>{sockets.delete(front);back.destroy();});back.on("close",()=>{sockets.delete(back);front.destroy();});
  front.on("data",data=>back.write(data));let pending=Buffer.alloc(0);
  back.on("data",data=>{
   if(!armed){front.write(data);return;}
   pending=Buffer.concat([pending,data]);
   while(pending.length>=5){const length=pending.readUInt32BE(1)+1;if(length<5||length>1024*1024){front.destroy();back.destroy();return;}if(pending.length<length)return;
    const frame=pending.subarray(0,length);pending=pending.subarray(length);
    if(frame[0]===90){
     commitTags++;if(commitTags===2){cut=true;front.destroy();back.destroy();return;}
    }
    front.write(frame);
   }
  });
 });
 proxy.listen(0,"127.0.0.1");await once(proxy,"listening");const address=proxy.address();assert.ok(address&&typeof address!=="string");
 const proxyUrl=new URL(url);proxyUrl.port=String(address.port);
 const pool=new Pool({connectionString:proxyUrl.href,max:1,connectionTimeoutMillis:75,statement_timeout:100,query_timeout:100});pool.on("error",()=>{});
 try {
  await pool.query("SELECT 1");armed=true;
  const adapter=new PostgreSqlPublicShareAdmission(pool,randomUUID(),fingerprint);
  assert.equal((await adapter.admit({routeClass:"Media",phase:"MediaRead",sourceIdentity:"c".repeat(64),workspaceId:"qa:مساحة",grantId:"qa:grant",maximumBytes:8*MIB})).type,"Unavailable");
  assert.equal(cut,true,"RealDebitCommitAcknowledgementMustBeCut");
  const state=(await admin.query("SELECT pending_operation FROM qsc_public_admission.policy WHERE singleton")).rows[0];assert.ok(state.pending_operation);
  assert.equal(Number((await admin.query("SELECT count(*) AS n FROM qsc_public_admission.leases")).rows[0].n),1);
  const restarted=new PostgreSqlPublicShareAdmission(admin,randomUUID(),fingerprint);
  assert.equal((await restarted.admit({routeClass:"Page",phase:"Source",sourceIdentity:"d".repeat(64)})).type,"Unavailable");
  return {realCommitAcknowledgementDropped:true,durableIntentPreserved:true,leaseRetained:true,restartedAdapterClosed:true,nativeIoNeverAuthorized:true};
 }finally{for(const socket of sockets)socket.destroy();proxy.close();await pool.end();}
}
