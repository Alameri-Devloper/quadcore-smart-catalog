import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { PostgreSqlPublicShareAdmission } from "../../domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission";
import { assertQaAdmissionEndpoint } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-endpoint";
import type { PublicShareAdmissionPort } from "../../domains/catalog/sharing/ports/public-share-admission.port";
type Input=Parameters<PublicShareAdmissionPort["admit"]>[0];
type Message={id:number;action:string;url?:string;fingerprint?:string;proxyPort?:number;input?:Input;leaseId?:string;file?:string;count?:number};
let pool:Pool|undefined,adapter:PostgreSqlPublicShareAdmission|undefined,owner="",reads=0;
const releases=new Map<number,()=>Promise<void>>(),handles=new Map<number,fs.FileHandle>();
const diagnostics:{stage:string;failure:string}[]=[];
process.on("message",(message:Message)=>{void execute(message).catch(()=>process.send?.({id:message.id,failed:true,classification:"QaWorkerUnavailable"}));});
async function execute(m:Message){
  let output:object={};
  if(m.action==="init"){
    assertQaAdmissionEndpoint(m.url!);
    const target=new URL(m.url!);
    if(m.proxyPort!==undefined){if(!Number.isInteger(m.proxyPort)||m.proxyPort<1024||m.proxyPort>65535)throw Error();target.hostname="127.0.0.1";target.port=String(m.proxyPort);}
    pool=new Pool({connectionString:target.href,max:1,application_name:"qsc-p6-recovery-worker",connectionTimeoutMillis:75,statement_timeout:100,query_timeout:100});pool.on("error",()=>{});
    await warm();owner=randomUUID();adapter=new PostgreSqlPublicShareAdmission(pool,owner,m.fingerprint!,e=>diagnostics.push({stage:e.stage,failure:e.failure}));
    output={pid:process.pid,owner};
  }else if(m.action==="warm"){await warm();}
  else if(m.action==="admit"){
    const result=await adapter!.admit(m.input!);
    if(result.type==="Allowed"&&result.release)releases.set(m.id,result.release);
    output={type:result.type,reads,diagnostics:[...diagnostics]};
  }else if(m.action==="batch"){
    const results=[];for(let i=0;i<m.count!;i++)results.push((await adapter!.admit(m.input!)).type);output={results};
  }else if(m.action==="readHold"){
    if(!releases.has(m.count!))throw Error();
    const root=path.resolve("artifacts/task-reviews/p6-recovery-alignment-20261024");
    const file=path.resolve(m.file!);if(!file.startsWith(root+path.sep))throw Error();
    const handle=await fs.open(file,"r");handles.set(m.count!,handle);
    const buffer=Buffer.alloc(32);await handle.read(buffer,0,buffer.length,0);reads++;output={reads,nativeHandleHeld:true};
  }else if(m.action==="finishRead"){
    const handle=handles.get(m.count!);if(!handle)throw Error();
    await handle.close();handles.delete(m.count!);await releases.get(m.count!)!();output={actualHandleClosed:true};
  }else if(m.action==="release"){
    if(handles.has(m.count!))throw Error();await releases.get(m.count!)!();output={released:true};
  }else if(m.action==="wrongOwnerRelease"){
    await (adapter as unknown as {release:(id:string)=>Promise<void>}).release(m.leaseId!);output={completed:true};
  }else if(m.action==="close"){
    for(const handle of handles.values())await handle.close();await pool?.end();process.send?.({id:m.id,closed:true});process.disconnect();return;
  }else throw Error();
  process.send?.({id:m.id,...output});
}
async function warm(){
  for(let attempt=0;attempt<3;attempt++){try{await pool!.query("SELECT 1");return;}catch{if(attempt===2)throw Error("QaWarmupUnavailable");}}
}
