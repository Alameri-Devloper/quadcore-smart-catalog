import { fork, type ChildProcess } from "node:child_process";
import https from "node:https";
import { readFile, writeFile, realpath, lstat, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { assertTargetQaMode, type TargetWorkerConfiguration } from "./public-share-target-worker";
import { PerformanceMeasurements, qualifyLocalPerformance } from "./public-share-performance-measurements";

export const targetGateMapping = Object.freeze({p6:"Resolution, snapshots, tenant/pricing, admission, native media, component HTTP/no-JS errors, cleanup and I4-B/D-V1",p7:"Successful Next SSR/page/metadata/RSC, built-server cache/freshness, final browser/deployment integration",acceptance:"HOLD"});
export function targetProfile(profile:"text"|"images"|"nat") {
  if(!["text","images","nat"].includes(profile))throw Error("TargetQaProfileInvalid");
  return Object.freeze({profile,durationSeconds:900,opensPerSecond:profile==="text"?10:profile==="images"?2:1,sources:profile==="nat"?1:5,workspaces:5,grants:10,maximumImageBytes:256*1024,natBurst:profile==="nat"?{opens:5,spacingMs:200,idleMs:5100}:null});
}
/** Private fork IPC, never passed as a URL/header or exposed by the QA server. */
export async function startTargetWorkers(config: Omit<TargetWorkerConfiguration,"socketName">, count:1|2, compiledWorker?: string) {
  assertTargetQaMode();if(process.platform!=="linux" || ![1,2].includes(count))throw Error("TargetQaLinuxRequired");
  let workerFile=path.resolve("scripts/qa/public-share-target-worker.ts"),execArgv=["--import","tsx"];
  if(compiledWorker!==undefined){workerFile=path.resolve(compiledWorker);const scope=path.resolve("artifacts/task-reviews")+path.sep;
    if(!path.isAbsolute(compiledWorker)||!workerFile.startsWith(scope)||path.basename(workerFile)!=="public-share-target-worker.cjs"||await realpath(workerFile)!==workerFile)throw Error("TargetQaCompiledWorkerUnsafe");
    const file=await lstat(workerFile);if(!file.isFile()||file.isSymbolicLink())throw Error("TargetQaCompiledWorkerUnsafe");execArgv=[];
  }
  const workers:{child:ChildProcess;request:(action:string,configuration?:TargetWorkerConfiguration)=>Promise<Record<string,unknown>>}[]=[];
  const close=async()=>{for(const w of workers){try{await w.request("stop");}catch{/* Unknown leases remain reserved; no recovery or forced release. */}if(w.child.connected)w.child.disconnect();}};
  try {for(let i=0;i<count;i++){
    const child=fork(workerFile,[],{execArgv,env:{...process.env,NODE_ENV:"test"},serialization:"advanced",stdio:["ignore","ignore","ignore","ipc"]});
    let next=0;const pending=new Map<number,{resolve:(v:Record<string,unknown>)=>void;reject:()=>void;timer:NodeJS.Timeout}>();
    const fail=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject();}pending.clear();};child.on("error",fail);child.on("exit",fail);
    child.on("message",(value:unknown)=>{const m=value as Record<string,unknown>;const p=pending.get(Number(m.id));if(!p)return;clearTimeout(p.timer);pending.delete(Number(m.id));if(m.failed)p.reject();else p.resolve(m);});
    const request=(action:string,configuration?:TargetWorkerConfiguration)=>new Promise<Record<string,unknown>>((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error("TargetQaIpcUnavailable"));},10000);pending.set(id,{resolve,reject:()=>reject(Error("TargetQaWorkerUnavailable")),timer});child.send({id,action,configuration},e=>{if(e){clearTimeout(timer);pending.delete(id);reject(Error("TargetQaIpcUnavailable"));}});});
    workers.push({child,request});await request("init",{...config,socketName:i===0?"worker-1.sock":"worker-2.sock"});
  }return{snapshot:()=>Promise.all(workers.map(w=>w.request("snapshot"))),beginMeasurements:()=>Promise.all(workers.map(w=>w.request("beginMeasurements"))),close};}catch{await close();throw Error("TargetQaWorkerStartupUnavailable");}
}
export async function renderTargetIngress(input:{directory:string;instances:1|2}) {
  assertTargetQaMode();const directory=path.resolve(input.directory),root=path.resolve("artifacts/task-reviews");
  if(!directory.startsWith(root+path.sep) || directory.includes(" ") || !/^[a-zA-Z0-9_./-]+$/.test(directory) || await realpath(directory)!==directory || ![1,2].includes(input.instances))throw Error("TargetQaIngressScopeInvalid");
  const stat=await lstat(directory);if(!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode&0o777)!==0o750 || stat.uid!==process.getuid?.() || stat.gid!==process.getgid?.())throw Error("TargetQaIngressDirectoryUnsafe");
  let template=await readFile("scripts/qa/public-share-ingress.target.conf","utf8");
  template=template.replaceAll("__QA_RUN_DIRECTORY__",directory).replace("__QA_SECOND_WORKER__",input.instances===2?"server unix:"+directory+"/worker-2.sock;":"# One-instance qualification");
  await mkdir(path.join(directory,"logs"),{mode:0o750});
  const output=path.join(directory,"nginx.conf");await writeFile(output,template,{flag:"wx",mode:0o600});return output;
}
export interface TargetProfileInput {
  profile:"text"|"images"|"nat"; origin:string; certificateAuthority:Buffer; tokens:readonly string[];
  directory:string; beginMeasurements:()=>Promise<unknown>; workerSnapshots:()=>Promise<readonly Record<string,unknown>[]>;
}
/** Existing schedules/assertions, transported over verified HTTPS; NEVER auto-invoked. */
export async function runTargetProfile(input:TargetProfileInput) {
  assertTargetQaMode();const origin=new URL(input.origin);
  if(origin.protocol!=="https:" || origin.hostname!=="127.0.0.1" || origin.port!=="9443" || origin.pathname!=="/" || origin.search || origin.hash || origin.username || origin.password || input.tokens.length!==10 || input.tokens.some(t=>!/^[A-Za-z0-9_-]{43}$/.test(t)))throw Error("TargetQaProfileInvalid");
  const directory=path.resolve(input.directory);if(process.platform!=="linux" || !directory.startsWith(path.resolve("artifacts/task-reviews")+path.sep) || await realpath(directory)!==directory)throw Error("TargetQaEvidenceScopeInvalid");
  const directoryStat=await lstat(directory);if(!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || (directoryStat.mode&0o777)!==0o750 || directoryStat.uid!==process.getuid?.())throw Error("TargetQaEvidenceDirectoryUnsafe");
  await input.beginMeasurements();
  const plan=targetProfile(input.profile),metrics=new PerformanceMeasurements();
  const agents=Array.from({length:5},(_,i)=>new https.Agent({keepAlive:true,maxSockets:4,localAddress:"127.0.0."+(i+1),ca:input.certificateAuthority,servername:"isolated-public-share-qa",rejectUnauthorized:true}));
  const request=(token:string,route:"Page"|"Media",source:number)=>new Promise<number>(resolve=>{
    const start=performance.now();let settled=false;
    const finish=(status:number)=>{if(settled)return;settled=true;clearTimeout(timeout);metrics.count("HTTP."+route+"."+status);metrics.add("HttpTotal."+route,performance.now()-start);resolve(status);};
    const req=https.request({hostname:"127.0.0.1",port:9443,path:"/share/"+token+(route==="Media"?"/media":""),agent:agents[source],method:"GET",headers:{"x-qsc-qa-source":"spoof",forwarded:"for=spoof","x-forwarded-for":"spoof",referer:"https://example.invalid/SYNTHETIC_REDACTION_PROBE"}},res=>{metrics.add("HttpTTFB."+route,performance.now()-start);if(route==="Media"&&res.statusCode===200&&Number(res.headers["content-length"])>plan.maximumImageBytes)metrics.count("UnexpectedImageSize");res.resume();res.on("end",()=>finish(res.statusCode??0));res.on("error",()=>finish(0));res.on("aborted",()=>finish(0));});
    const timeout=setTimeout(()=>{finish(0);req.destroy();},5000);req.on("error",()=>finish(0));req.end();
  });
  const pair=async(token:string,source:number)=>{const page=await request(token,"Page",source),media=await request(token,"Media",source);if(page!==200||media!==200)metrics.count("UnexpectedStatus");return{page,media};};
  const pending=new Set<Promise<void>>();const resources:{rssBytes:number;freeRamBytes:number}[]=[];let timer:NodeJS.Timeout|undefined;const start=performance.now();let emitted=0;
  try{timer=setInterval(()=>resources.push({rssBytes:process.memoryUsage().rss,freeRamBytes:os.freemem()}),5000);timer.unref();
    while(performance.now()-start<plan.durationSeconds*1000){const wait=start+emitted*1000/plan.opensPerSecond-performance.now();if(wait>0){await new Promise(r=>setTimeout(r,Math.min(wait,100)));continue;}const i=emitted++,source=input.profile==="nat"?0:i%5;
      if(pending.size>=64){metrics.count("SchedulerShed");continue;}
      const task=(async()=>{if(input.profile==="text"){const unknown=i%5===4;const status=await request(unknown?"A".repeat(43):input.tokens[(Math.floor(i/5)*4+i%4)%10],"Page",source);if(status!==(unknown?404:200))metrics.count("UnexpectedStatus");}else await pair(input.tokens[i%10],source);})();pending.add(task);void task.finally(()=>pending.delete(task));
    }await Promise.all(pending);
    let natBurst:unknown=null;if(plan.natBurst){await new Promise(r=>setTimeout(r,plan.natBurst!.idleMs));const pairs=[];for(let i=0;i<5;i++){if(i)await new Promise(r=>setTimeout(r,200));pairs.push(pair(input.tokens[i],0));}natBurst=await Promise.all(pairs);}
    const workers=await input.workerSnapshots();const result={scope:"P6 private HTTPS component transport ONLY; P7 NOT RUN",plan,offered:emitted,durationSeconds:(performance.now()-start)/1000,metrics:metrics.snapshot(),workers,resources,natBurst,qualification:"INCONCLUSIVE until target resources, storage state, per-outcome metrics, redaction, cleanup and recovery are independently verified",acceptance:"HOLD"};
    await writeFile(path.join(directory,"profile-"+input.profile+"-"+Date.now()+".json"),JSON.stringify(result,null,2),{flag:"wx",mode:0o600});return result;
  }finally{if(timer)clearInterval(timer);for(const a of agents)a.destroy();}
}
/** Preserve existing local assertions; never overwrite their INCONCLUSIVE/VPS gates. */
export { qualifyLocalPerformance };
