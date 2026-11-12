import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { lstat, realpath, chmod } from "node:fs/promises";
import path from "node:path";
import { realpathSync, lstatSync } from "node:fs";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../shared/infrastructure/persistence/schema";
import { ResolvePublicProductShare } from "../../domains/catalog/sharing/application/resolve-public-product-share";
import { PostgreSqlPublicShareAdmission } from "../../domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission";
import { PostgreSqlPublicShareReadSnapshot } from "../../domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-read-snapshot";
import { LocalPublicShareMediaReader } from "../../domains/catalog/sharing/infrastructure/media/local-public-share-media-reader";
import { createPublicShareCryptoRuntime } from "../../domains/catalog/sharing/infrastructure/public-share-crypto-runtime";
import type { PublicShareCryptoEnvironment } from "../../domains/catalog/sharing/infrastructure/crypto/environment-public-share-crypto";
import { QaTrustedPublicShareSource, canonicalSource } from "../../domains/catalog/sharing/infrastructure/admission/qa-public-share-source";
import { assertQaAdmissionEndpoint } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-endpoint";
import { observeQaDatabaseClient } from "../../domains/catalog/sharing/infrastructure/admission/qa-database-client-errors";
import { cleanupQaAdmission } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-operations";
import { createPublicShareMediaGet, publicShareFailureResponse, publicShareHeaders } from "../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http";
import { publicShareView } from "../../domains/catalog/sharing/presentation/public-share-view";
import type { PublicShareAdmissionPort } from "../../domains/catalog/sharing/ports/public-share-admission.port";
import { QaColdMediaReader, type QaColdConfiguration, type QaColdEvidence } from "./public-share-cold-storage";
import { PerformanceMeasurements } from "./public-share-performance-measurements";

export function assertTargetQaMode() {
  if (process.env.NODE_ENV !== "test") throw Error("TargetQaModeRequired");
}
export interface TargetWorkerConfiguration {
  mode: "PRIVATE_P6_QA"; databaseUrl: string; mediaRoot: string;
  sourceKey: Buffer; crypto: PublicShareCryptoEnvironment;
  cold?: QaColdConfiguration;
  socketDirectory: string; socketName: "worker-1.sock" | "worker-2.sock";
}
/** Measurements return the EXACT decision/release capability; no retry or accounting. */
export function measuredTargetAdmission(port: PublicShareAdmissionPort, metrics: PerformanceMeasurements): PublicShareAdmissionPort {
  return { admit: async input => {
    const start = performance.now(); let outcome="Unavailable";
    try { const result = await port.admit(input); outcome=result.type; metrics.count("Outcome." + result.type); return result; }
    finally { const duration=performance.now()-start;metrics.add("Admission." + input.routeClass + "." + input.phase,duration);metrics.add("OutcomeLatency."+input.routeClass+"."+input.phase+"."+outcome,duration); }
  } };
}
export function composeTargetRuntime(config: TargetWorkerConfiguration) {
  assertTargetQaMode();
  if (config.mode !== "PRIVATE_P6_QA" || config.crypto.NODE_ENV !== "test" || !Buffer.isBuffer(config.sourceKey) || config.sourceKey.length !== 32 || !path.isAbsolute(config.mediaRoot)) throw Error("TargetQaConfigurationInvalid");
  assertQaAdmissionEndpoint(config.databaseUrl);
  // Only task-owned generated media; never read an operator's personal media tree.
  const artifacts = path.resolve("artifacts/task-reviews");
  if (!path.resolve(config.mediaRoot).startsWith(artifacts + path.sep) || lstatSync(config.mediaRoot).isSymbolicLink() || realpathSync(config.mediaRoot)!==path.resolve(config.mediaRoot)) throw Error("TargetQaMediaScopeInvalid");
  for (const ring of [config.crypto.QSC_PUBLIC_SHARE_HMAC_KEYS_JSON, config.crypto.QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON]) {
    if (ring && Object.values(JSON.parse(ring) as Record<string,string>).some(v => Buffer.from(v,"base64").equals(config.sourceKey))) throw Error("TargetQaPurposeKeyReuse");
  }
  const crypto = createPublicShareCryptoRuntime(config.crypto);
  if (crypto.readiness.lookup !== "READY") throw Error("TargetQaLookupUnavailable");
  const metrics = new PerformanceMeasurements(), trusted = new WeakSet<Request>();
  const source = new QaTrustedPublicShareSource(Buffer.from(config.sourceKey), r => trusted.has(r));
  const main = new Pool({ connectionString: config.databaseUrl, max: 8, connectionTimeoutMillis: 75, statement_timeout: 750, query_timeout: 750 });
  const admission = new Pool({ connectionString: config.databaseUrl, max: 2, connectionTimeoutMillis: 75, statement_timeout: 100, query_timeout: 100 });
  for (const pool of [main, admission]) { pool.on("connect", observeQaDatabaseClient); pool.on("error", () => metrics.count("PoolFailures")); }
  const adapter = new PostgreSqlPublicShareAdmission(admission, randomUUID(), source.fingerprint,e=>metrics.count("AdmissionFailure."+e.stage+"."+e.failure));
  const coldReads:QaColdEvidence[]=[];
  if(config.cold && config.cold.mediaRoot!==config.mediaRoot)throw Error("TargetQaColdRootMismatch");
  const nativeReader=new LocalPublicShareMediaReader(config.mediaRoot);
  const reader=config.cold?new QaColdMediaReader(nativeReader,config.cold,e=>{coldReads.push(e);metrics.count("ColdReadVerified");metrics.add("ColdPreparation",e.preparationMs);},()=>{metrics.count("ColdReadRejected");process.send?.({coldUnsafe:true});}):nativeReader;
  const resolver = new ResolvePublicProductShare(new PostgreSqlPublicShareReadSnapshot(drizzle(main,{schema})), crypto.lookupDigest, measuredTargetAdmission(adapter, metrics), reader);
  const media = createPublicShareMediaGet(resolver, source);
  let cleaning: Promise<unknown> | undefined;
  const cleanup = setInterval(() => { if (!cleaning) cleaning = cleanupQaAdmission(admission,source.fingerprint).catch(() => {metrics.count("CleanupFailures");}).finally(() => {cleaning=undefined;}); },60000); cleanup.unref();
  return {
    metrics, coldReads,
    async execute(request: Request, canonicalIp: string, token: string, route: "Page" | "Media") {
      trusted.add(request); request.headers.set("x-qsc-qa-source",canonicalIp);
      if (route === "Media") return media(request,token);
      const identity = await source.resolve(request);
      const result = await resolver.resolvePage(token,identity ?? "");
      if (!result.ok) return publicShareFailureResponse(result,"Page","en");
      if (!publicShareView(result.value,token,"en")) return publicShareFailureResponse({ok:false,error:"NotFound"},"Page","en");
      if (result.value.hasMainImage) metrics.count("PageWithMainImage");
      // A constant QA sentinel, NEVER a public projection API or P7 SSR claim.
      const headers = publicShareHeaders(); headers.set("Content-Type","text/plain; charset=utf-8");
      return new Response("Private P6 QA projection accepted",{status:200,headers});
    },
    async close() { clearInterval(cleanup); await cleaning; await Promise.all([main.end(),admission.end()]); },
  };
}
export type TargetRuntime = Pick<ReturnType<typeof composeTargetRuntime>,"execute"|"metrics">;
function ingressSource(req: IncomingMessage) {
  const headers: string[] = [];
  for(let i=0;i<req.rawHeaders.length;i+=2) {
    const key=req.rawHeaders[i].toLowerCase();
    if (["forwarded","x-forwarded-for","x-real-ip"].includes(key)) return null;
    if(key==="x-qsc-qa-source") headers.push(req.rawHeaders[i+1]);
  }
  return headers.length===1 && canonicalSource(headers[0])===headers[0] ? headers[0] : null;
}
/** Authorization is request-object identity minted ONLY by the private socket listener. */
export function targetRequestHandler(runtime: TargetRuntime, authorized: (request: IncomingMessage)=>boolean) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const start=performance.now(); let route:"Page"|"Media"="Page";
    try {
      const raw=req.url ?? "", match=/^\/share\/([^/?#]{1,256})(\/media)?$/.exec(raw);
      route=match?.[2]?"Media":"Page";
      const source=ingressSource(req);
      if(!authorized(req) || !source) {const r=publicShareFailureResponse({ok:false,error:"ServiceUnavailable"},route,"en");res.writeHead(r.status,Object.fromEntries(r.headers));res.end();return;}
      if(!match) {const r=publicShareFailureResponse({ok:false,error:"NotFound"},route,"en");res.writeHead(r.status,Object.fromEntries(r.headers));res.end();return;}
      if(!["GET","HEAD"].includes(req.method??"")) {
        const h=publicShareHeaders();h.set("Allow","GET, HEAD, OPTIONS");res.writeHead(req.method==="OPTIONS"?204:405,Object.fromEntries(h));res.end();return;
      }
      const request=new Request("http://private-p6.invalid"+raw,{method:req.method});
      const response=await runtime.execute(request,source,match[1],route);
      const bytes=Buffer.from(await response.arrayBuffer());
      runtime.metrics.count("HTTP."+route+"."+response.status);
      runtime.metrics.add("HttpTTFB."+route,performance.now()-start);
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(req.method==="HEAD"?undefined:bytes);
    } catch {const r=publicShareFailureResponse({ok:false,error:"ServiceUnavailable"},route,"en");if(!res.headersSent)res.writeHead(r.status,Object.fromEntries(r.headers));res.end();runtime.metrics.count("TransportFailures");}
  };
}
export async function startTargetSocket(runtime: TargetRuntime, config: Pick<TargetWorkerConfiguration,"socketDirectory"|"socketName">) {
  assertTargetQaMode();
  if(process.platform!=="linux" || !process.getuid || !process.getgid || !path.isAbsolute(config.socketDirectory) || !["worker-1.sock","worker-2.sock"].includes(config.socketName)) throw Error("TargetQaLinuxSocketRequired");
  const directory=await lstat(config.socketDirectory);
  if(!directory.isDirectory() || directory.isSymbolicLink() || (await realpath(config.socketDirectory))!==path.resolve(config.socketDirectory) || directory.uid!==process.getuid() || directory.gid!==process.getgid() || (directory.mode&0o777)!==0o750) throw Error("TargetQaSocketDirectoryUnsafe");
  const socket=path.join(config.socketDirectory,config.socketName);
  // No unlink/stale-socket override: a collision is an operator-visible refusal.
  try {await lstat(socket);throw Error("TargetQaSocketCollision");} catch(e) {if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const trusted=new WeakSet<IncomingMessage>();const handler=targetRequestHandler(runtime,r=>trusted.has(r));
  let active=0;
  const server=createServer({maxHeaderSize:8192},(req,res)=>{trusted.add(req);active++;void handler(req,res).finally(()=>{active--;});});
  server.maxConnections=128;server.headersTimeout=5000;server.requestTimeout=10000;server.keepAliveTimeout=5000;
  server.on("clientError",(_error,socket)=>{socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nCache-Control: private, no-store\r\nReferrer-Policy: no-referrer\r\nX-Robots-Tag: noindex, nofollow\r\nX-Content-Type-Options: nosniff\r\nContent-Length: 0\r\n\r\n");});
  server.listen(socket);try{await once(server,"listening");await chmod(socket,0o660);}catch{server.close();throw Error("TargetQaSocketUnavailable");}
  return {socket,idle:()=>active===0,async close(){await new Promise<void>((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeIdleConnections();});}};
}
/** Fork-only control channel. No CLI credential arguments, HTTP control route or recovery/reset command. */
async function workerEntry() {
  assertTargetQaMode();if(!process.send)throw Error("TargetQaPrivateIpcRequired");
  let runtime:ReturnType<typeof composeTargetRuntime>|undefined, transport:Awaited<ReturnType<typeof startTargetSocket>>|undefined, initialized=false;
  let stopping:Promise<void>|undefined;
  const stop=()=>stopping??=(async()=>{await transport?.close();await runtime?.close();})();
  process.on("disconnect",()=>{void stop().then(()=>{process.exitCode=0;},()=>{process.exitCode=1;});});
  process.on("message",(raw:unknown)=>{const messageId=(raw as {id?:unknown})?.id;void (async()=>{
    const m=raw as {id:number;action:string;configuration?:TargetWorkerConfiguration&{sourceKey:Buffer}};
    if(!Number.isSafeInteger(m.id))throw Error();
    if(m.action==="init"&&!initialized){initialized=true;const c=m.configuration!;c.sourceKey=Buffer.from(c.sourceKey);runtime=composeTargetRuntime(c);try{transport=await startTargetSocket(runtime,c);}catch{await runtime.close();runtime=undefined;throw Error();}process.send?.({id:m.id,ready:true});}
    else if(m.action==="beginMeasurements"&&runtime&&transport?.idle()){runtime.metrics.clear();runtime.coldReads.length=0;process.send?.({id:m.id,begun:true});}
    else if(m.action==="snapshot"&&runtime){process.send?.({id:m.id,metrics:runtime.metrics.snapshot(),rssBytes:process.memoryUsage().rss,coldReads:runtime.coldReads});}
    else if(m.action==="stop"&&runtime){await stop();process.send?.({id:m.id,stopped:true});process.disconnect();}
    else throw Error();
  })().catch(()=>{process.send?.({id:messageId,failed:true,classification:"TargetQaUnavailable"});});});
}
if(/\/public-share-target-worker\.(ts|cjs)$/.test(process.argv[1]?.replaceAll("\\","/")??""))void workerEntry().catch(()=>{process.stderr.write("TargetQaWorkerRefused\n");process.exitCode=1;});
