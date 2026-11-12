import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { publicSharePostgresFixture } from "../../domains/catalog/sharing/mock/public-share-postgres.fixture";
import { publicShareActor } from "../../domains/catalog/sharing/mock/public-share-lifecycle.fixture";
import { ProductMediaPathPolicy } from "../../domains/catalog/media/services/product-media-path-policy";
import { DepartmentStorageSegment } from "../../domains/catalog/media/domain/product-media-keys";
import { WorkspaceId, ProductId } from "../../domains/catalog/types/product-identity.value-object";
import { assertQaAdmissionEndpoint } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-endpoint";
import { assertTargetQaMode } from "./public-share-target-worker";

const digest=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");
export interface CampaignFixturesInput {databaseUrl:string;primaryId:string;sourceFingerprint:string;directory:string;image:Buffer}
export async function prepareCampaignFixtures(input:CampaignFixturesInput) {
  assertTargetQaMode();assertQaAdmissionEndpoint(input.databaseUrl);
  const directory=path.resolve(input.directory),base=path.resolve("artifacts/task-reviews")+path.sep;
  if(!directory.startsWith(base)||fs.realpathSync(directory)!==directory||fs.lstatSync(directory).isSymbolicLink()||input.image.length<65536||input.image.length>262144)throw Error("CampaignFixtureScopeInvalid");
  const ownership={database:new URL(input.databaseUrl).pathname.slice(1),primaryId:input.primaryId,prefix:"qa-p6-campaign-20261027",imageSha256:digest(input.image)};
  const marker=path.join(directory,"fixture-ownership.json");
  if(fs.existsSync(marker)){if(JSON.stringify(JSON.parse(fs.readFileSync(marker,"utf8")))!==JSON.stringify(ownership))throw Error("CampaignFixtureOwnershipMismatch");}
  else fs.writeFileSync(marker,JSON.stringify(ownership),{flag:"wx",mode:0o600});
  const pool=new Pool({connectionString:input.databaseUrl,max:1,statement_timeout:5000,connectionTimeoutMillis:5000});pool.on("error",()=>{});
  const prior=process.env.TEST_DATABASE_URL,priorSsl=process.env.DATABASE_SSL;
  process.env.TEST_DATABASE_URL=input.databaseUrl;process.env.DATABASE_SSL="false";
  const fixture=publicSharePostgresFixture("qsc-p6-campaign-fixtures");
  try {
    const primary=(await pool.query("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0];if(primary.id!==input.primaryId)throw Error("CampaignPrimaryMismatch");
    await pool.query("BEGIN");
    try {
      const state=(await pool.query("SELECT ready,pending_operation IS NOT NULL AS pending,source_key_fingerprint,(SELECT count(*)::int FROM qsc_public_admission.leases) AS leases FROM qsc_public_admission.policy WHERE singleton FOR UPDATE")).rows[0];
      if(state.ready||state.pending||state.leases!==0||state.source_key_fingerprint!==input.sourceFingerprint)throw Error("CampaignFixturePolicyUnsafe");
      for(let n=1;n<=5;n++){
        const workspaceId=ownership.prefix+"-"+n;
        for(const table of ["workspaces","workspace_branch_references","catalog_departments","catalog_categories","catalog_product_types","catalog_specification_definitions","catalog_specification_templates","catalog_specification_template_entries"]){
          const exists=await pool.query('SELECT count(*)::int AS n FROM "'+table+'" WHERE workspace_id=$1',[workspaceId]);
          const source=await pool.query('SELECT count(*)::int AS n FROM "'+table+'" WHERE workspace_id=$1',["p4-workspace"]);
          if(exists.rows[0].n===0){const patch=table==="workspaces"?{workspace_id:workspaceId,workspace_code:workspaceId}:{workspace_id:workspaceId};await pool.query('INSERT INTO "'+table+'" SELECT (jsonb_populate_record(NULL::"'+table+'",to_jsonb(t)||$1::jsonb)).* FROM "'+table+'" t WHERE workspace_id=$2',[JSON.stringify(patch),"p4-workspace"]);}
          else if(exists.rows[0].n!==source.rows[0].n)throw Error("CampaignPartialFixtureMismatch");
        }
        for(const kind of ["text","image"]){const productId="p6-campaign-"+kind;
          for(const table of ["catalog_products","catalog_branch_product_listings","catalog_product_specification_values"]){
            const exists=await pool.query('SELECT count(*)::int AS n FROM "'+table+'" WHERE workspace_id=$1 AND product_id=$2',[workspaceId,productId]);
            const source=await pool.query('SELECT count(*)::int AS n FROM "'+table+'" WHERE workspace_id=$1 AND product_id=$2',["p4-workspace","p4-product"]);
            if(exists.rows[0].n===0)await pool.query('INSERT INTO "'+table+'" SELECT (jsonb_populate_record(NULL::"'+table+'",to_jsonb(t)||$1::jsonb)).* FROM "'+table+'" t WHERE workspace_id=$2 AND product_id=$3',[JSON.stringify({workspace_id:workspaceId,product_id:productId}),"p4-workspace","p4-product"]);
            else if(exists.rows[0].n!==source.rows[0].n)throw Error("CampaignPartialProductMismatch");
          }
        }
        const productId="p6-campaign-image",root=(await ProductMediaPathPolicy.storageRoot({workspaceId:WorkspaceId.create(workspaceId),productId:ProductId.create(productId),departmentSegment:DepartmentStorageSegment.create("phones"),productName:"Synthetic"})).value;
        const mediaRoot=path.join(directory,"media"),key=root+"/main.webp",file=path.join(mediaRoot,...key.split("/"));fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o750});
        if(fs.existsSync(file)){if(digest(fs.readFileSync(file))!==ownership.imageSha256)throw Error("CampaignExistingMediaMismatch");}else fs.writeFileSync(file,input.image,{flag:"wx",mode:0o640});
        const roots=(await pool.query("SELECT storage_root_key FROM catalog_product_media_roots WHERE workspace_id=$1 AND product_id=$2",[workspaceId,productId])).rows;
        if(!roots.length)await pool.query("INSERT INTO catalog_product_media_roots(workspace_id,product_id,storage_root_key,created_at)VALUES($1,$2,$3,clock_timestamp())",[workspaceId,productId,root]);else if(roots.length!==1||roots[0].storage_root_key!==root)throw Error("CampaignExistingRootMismatch");
        const images=(await pool.query("SELECT storage_key,checksum_sha256,is_main FROM catalog_product_images WHERE workspace_id=$1 AND product_id=$2",[workspaceId,productId])).rows;
        if(!images.length)await pool.query("INSERT INTO catalog_product_images(workspace_id,product_id,product_image_id,storage_key,position,is_main,checksum_sha256,mime_type,media_created_at,media_created_by)VALUES($1,$2,'campaign-main',$3,0,true,$4,'image/webp',clock_timestamp(),'synthetic-qa')",[workspaceId,productId,key,ownership.imageSha256]);
        else if(images.length!==1||images[0].storage_key!==key||images[0].checksum_sha256!==ownership.imageSha256||!images[0].is_main)throw Error("CampaignExistingImageMismatch");
      }
      await pool.query("COMMIT");
    }catch{await pool.query("ROLLBACK");throw Error("CampaignFixturePreparationUnavailable");}
    const tokens:{text:string[];images:string[]}={text:[],images:[]};
    for(let n=1;n<=5;n++)for(const kind of ["text","image"] as const)for(const branchId of ["p4-branch","p4-branch-2"]){
      const issued=await fixture.lifecycle.issue({context:publicShareActor({workspaceId:ownership.prefix+"-"+n}),productId:"p6-campaign-"+kind,branchId});
      if(!issued.ok)throw Error("CampaignGrantIssueUnavailable");tokens[kind==="text"?"text":"images"].push(issued.value.url.split("/").at(-1)!);
    }
    if(new Set([...tokens.text,...tokens.images]).size!==20||[...tokens.text,...tokens.images].some(t=>!/^[A-Za-z0-9_-]{43}$/.test(t)))throw Error("CampaignGrantInputInvalid");
    const rows=(await pool.query("SELECT count(*)::int AS grants,count(DISTINCT workspace_id)::int AS workspaces FROM catalog_public_product_share_grants WHERE workspace_id LIKE $1 AND revoked_at IS NULL",[ownership.prefix+"-%"])).rows[0];
    if(rows.grants!==20||rows.workspaces!==5)throw Error("CampaignGrantDistributionInvalid");
    const textImages=Number((await pool.query("SELECT count(*) AS n FROM catalog_product_images WHERE workspace_id LIKE $1 AND product_id='p6-campaign-text'",[ownership.prefix+"-%"])).rows[0].n);if(textImages!==0)throw Error("CampaignTextHasImage");
    const privateFile=path.join(directory,"campaign-fixtures.private.json"),privateValue=JSON.stringify({ownership,tokens,mediaRoot:path.join(directory,"media")});
    if(fs.existsSync(privateFile)){if(fs.readFileSync(privateFile,"utf8")!==privateValue)throw Error("CampaignFixtureManifestMismatch");}else fs.writeFileSync(privateFile,privateValue,{flag:"wx",mode:0o600});
    return{status:"PASS" as const,workspaces:5,textGrants:tokens.text.length,imageGrants:tokens.images.length,distinctGrants:20,textHasImages:false,imageBytes:input.image.length,ownership,privateManifestWritten:true};
  }finally{await fixture.connection.close();await pool.end();if(prior===undefined)delete process.env.TEST_DATABASE_URL;else process.env.TEST_DATABASE_URL=prior;if(priorSsl===undefined)delete process.env.DATABASE_SSL;else process.env.DATABASE_SSL=priorSsl;}
}

const numbers=(file:string)=>Object.fromEntries(fs.readFileSync(file,"utf8").trim().split("\n").map(line=>{const [k,v]=line.trim().split(/\s+/);return[k,Number(v)];}));
export function campaignResources(directory:string,host:{freeBytes:number;observedAtMs:number}) {
  assertTargetQaMode();if(process.platform!=="linux")throw Error("CampaignLinuxResourcesRequired");
  const root="/sys/fs/cgroup",cpu=numbers(root+"/cpu.stat"),events=numbers(root+"/memory.events"),[quota,period]=fs.readFileSync(root+"/cpu.max","utf8").trim().split(/\s+/).map(Number),limit=Number(fs.readFileSync(root+"/memory.max","utf8"));
  if(!Number.isFinite(quota)||quota/period!==2||limit!==2147483648||![cpu.usage_usec,cpu.nr_throttled,cpu.throttled_usec,cpu.nr_periods].every(Number.isFinite)||!Number.isFinite(host.freeBytes)||!Number.isFinite(host.observedAtMs)||host.observedAtMs>Date.now()+1000||Date.now()-host.observedAtMs>60000||host.freeBytes<10*1024**3)throw Error("CampaignInstrumentationUnsafe");
  const pg=fs.readdirSync("/proc").filter(n=>/^\d+$/.test(n)).flatMap(n=>{try{if(fs.readFileSync("/proc/"+n+"/comm","utf8").trim()!=="postgres")return[];const status=fs.readFileSync("/proc/"+n+"/status","utf8"),run=Number(fs.readFileSync("/proc/"+n+"/schedstat","utf8").split(/\s+/)[0]);return[{rssBytes:Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1]??NaN)*1024,cpuRunNanoseconds:run}];}catch{return[];}});
  if(!pg.length||pg.some(p=>!Number.isFinite(p.rssBytes)||!Number.isFinite(p.cpuRunNanoseconds)))throw Error("CampaignPostgresInstrumentationUnavailable");
  let evidenceBytes=0;const visit=(dir:string)=>{for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),s=fs.lstatSync(p);if(s.isSymbolicLink())continue;if(s.isDirectory())visit(p);else if(s.isFile())evidenceBytes+=s.size;}};visit(directory);
  const disk=fs.statfsSync(directory),current=Number(fs.readFileSync(root+"/memory.current","utf8")),peak=Number(fs.readFileSync(root+"/memory.peak","utf8"));
  if(![current,peak,...Object.values(events)].every(Number.isFinite)||current<0||peak<current||!["oom","oom_kill","max","high"].every(k=>k in events))throw Error("CampaignMemoryInstrumentationUnavailable");
  return{status:"PASS" as const,observedAtMs:Date.now(),monotonicMs:performance.now(),cpu:{quotaCores:quota/period,usage_usec:cpu.usage_usec,nr_throttled:cpu.nr_throttled,throttled_usec:cpu.throttled_usec,nr_periods:cpu.nr_periods},memory:{currentBytes:current,peakBytes:peak,limitBytes:limit,events},postgres:{processCount:pg.length,rssSumBytes:pg.reduce((s,p)=>s+p.rssBytes,0),cpuRunNanoseconds:pg.reduce((s,p)=>s+p.cpuRunNanoseconds,0),rssIsNotUniqueMemory:true},disk:{linuxFilesystemFreeBytes:disk.bavail*disk.bsize,hostBackingFreeBytes:host.freeBytes,hostObservedAtMs:host.observedAtMs,evidenceBytes,virtualFreeIsNotHostFree:true}};
}
export function campaignCpuDelta(a:{monotonicMs:number;cpu:{usage_usec:number;quotaCores:number;nr_throttled:number;throttled_usec:number}},b:{monotonicMs:number;cpu:{usage_usec:number;quotaCores:number;nr_throttled:number;throttled_usec:number}}) {
  const elapsed=b.monotonicMs-a.monotonicMs,used=b.cpu.usage_usec-a.cpu.usage_usec;if(elapsed<=0||used<0)throw Error("CampaignCpuSampleInvalid");
  return{elapsedMs:elapsed,quotaNormalizedCpuPercent:100*used/(elapsed*1000*b.cpu.quotaCores),throttledPeriods:b.cpu.nr_throttled-a.cpu.nr_throttled,throttledMicroseconds:b.cpu.throttled_usec-a.cpu.throttled_usec};
}
