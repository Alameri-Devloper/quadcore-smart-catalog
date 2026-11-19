import { assertQaAdmissionEndpoint } from "./qa-admission-endpoint";
import { once } from "node:events";
import { Pool } from "pg";
import { PostgreSqlPublicShareAdmission } from "./postgresql-public-share-admission";
// Child-only synthetic contention worker; connection string enters through private IPC.
process.once("message", async (message:{url:string;owner:string;fingerprint:string;source:string;count:number;hold?:boolean})=>{
 let pool:Pool|undefined;try{assertQaAdmissionEndpoint(message.url);pool=new Pool({connectionString:message.url,max:2,connectionTimeoutMillis:75,statement_timeout:100}); pool.on("error",()=>{});
 let warmed=false;for(let i=0;i<3;i++){try{await pool.query("SELECT 1");warmed=true;break;}catch{}}if(!warmed)throw Error("QaWorkerWarmupUnavailable"); if(!message.hold){process.send?.({ready:true});await once(process,"message");} const events:unknown[]=[];const adapter=new PostgreSqlPublicShareAdmission(pool,message.owner,message.fingerprint,e=>events.push(e));
 if(message.hold){const result=await adapter.admit({phase:"MediaRead",routeClass:"Media",sourceIdentity:message.source,workspaceId:"qa-workspace",grantId:"qa-grant",maximumBytes:8*1024*1024});process.send?.({held:result.type,events});await new Promise(()=>{});}
 const results=[];for(let i=0;i<message.count;i++)results.push((await adapter.admit({phase:"Source",routeClass:"Page",sourceIdentity:message.source})).type);
 process.send?.({results}); }catch{process.send?.({error:"SanitizedWorkerFailure"});}
 finally{await pool?.end();process.disconnect();}
});
