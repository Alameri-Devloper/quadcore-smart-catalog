import { constants, type BigIntStats } from 'node:fs';
import { lstat, realpath, open, mkdir, rmdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { PublicShareMediaReaderPort, PublicShareMediaReadResult } from '../../domains/catalog/sharing/ports/public-share-resolution.port';

export interface QaColdFile { file:string; device:string; inode:string; bytes:number; expectedSha256:string }
export interface QaColdConfiguration { mediaRoot:string; lockDirectory:string; toolRoot:string; hashes:Readonly<Record<'fadvise'|'fincore'|'libsmartcols',string>>; files:readonly QaColdFile[] }
export interface QaResidency { pages:number; size:number; dirtyPages:number|null; writebackPages:number|null; method:'cachestat'|'mincore' }
export interface QaColdEvidence { device:string; inode:string; bytes:number; links:number; before:QaResidency; prepared:QaResidency; after:QaResidency; preparationMs:number; nativeReadMs:number }
export const QA_COLD_TOOL_HASHES=Object.freeze({fadvise:'a57e093e92191321d2236a033abe7fbc27177c3f58b14eec371c8468c70a3b88',fincore:'3c6017c10a9841aeccf391d4702469918709a46d0e91a8d77c1b9f4147c207ec',libsmartcols:'9ad4a671570d556a0776c5b85c8665c2b8706adfcec4178c8d8afa08578ec7ac'});
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export function parseQaResidency(text:string,bytes:number):QaResidency {
  const data=JSON.parse(text) as {fincore?:{pages?:unknown;size?:unknown;dirty_pages?:unknown;writeback_pages?:unknown}[]};
  const r=data.fincore?.length===1?data.fincore[0]:undefined;
  if(!r||!Number.isSafeInteger(r.pages)||Number(r.pages)<0||r.size!==bytes)throw Error('QaColdResidencyInvalid');
  for(const v of [r.dirty_pages,r.writeback_pages])if(v!==null&&(!Number.isSafeInteger(v)||Number(v)<0))throw Error('QaColdResidencyInvalid');
  return{pages:Number(r.pages),size:bytes,dirtyPages:r.dirty_pages===null?null:Number(r.dirty_pages),writebackPages:r.writeback_pages===null?null:Number(r.writeback_pages),method:r.dirty_pages===null?'mincore':'cachestat'};
}
export function qaColdNonresident(r:QaResidency){return r.pages===0&&(r.dirtyPages===null||r.dirtyPages===0)&&(r.writebackPages===null||r.writebackPages===0);}
function exactFile(s:BigIntStats,f:QaColdFile){if(!s.isFile()||s.isSymbolicLink()||s.uid!==BigInt(process.getuid!())||s.nlink!==BigInt(1)||s.dev.toString()!==f.device||s.ino.toString()!==f.inode||s.size!==BigInt(f.bytes))throw Error('QaColdFileIdentityUnsafe');}
/** QA-only port decorator; actual application/native reader and admission remain unchanged.
 * Every participating reader must share this lock directory. Never remove a foreign/orphan lock.
 */
export class QaColdMediaReader implements PublicShareMediaReaderPort {
  constructor(private readonly delegate:PublicShareMediaReaderPort,private readonly config:QaColdConfiguration,private readonly record:(e:QaColdEvidence)=>void=()=>{},private readonly rejected:()=>void=()=>{}){}
  private async scoped(){
    if(process.env.NODE_ENV!=='test'||process.platform!=='linux'||process.arch!=='x64'||!process.getuid)throw Error('QaColdLinuxTestOnly');
    const root=path.resolve('artifacts/task-reviews')+path.sep;
    for(const p of [this.config.mediaRoot,this.config.lockDirectory,this.config.toolRoot]){
      if(!path.isAbsolute(p)||!p.startsWith(root)||await realpath(p)!==p)throw Error('QaColdScopeUnsafe');
      const s=await lstat(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o022)!==0)throw Error('QaColdScopeUnsafe');
    }
    for(const [name,relative] of Object.entries({fadvise:'usr/bin/fadvise',fincore:'usr/bin/fincore',libsmartcols:'usr/lib/libsmartcols.so.1.1.0'})){
      const key=name as keyof QaColdConfiguration['hashes'];
      if(this.config.hashes[key]!==QA_COLD_TOOL_HASHES[key])throw Error('QaColdUtilityOriginInvalid');
      const p=path.join(this.config.toolRoot,relative),s=await lstat(p);
      if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||hash(await readFile(p))!==this.config.hashes[name as keyof QaColdConfiguration['hashes']])throw Error('QaColdUtilityIntegrityInvalid');
    }
    const alias=path.join(this.config.toolRoot,'usr/lib/libsmartcols.so.1');
    if(await realpath(alias)!==path.join(this.config.toolRoot,'usr/lib/libsmartcols.so.1.1.0'))throw Error('QaColdUtilityAliasUnsafe');
  }
  private utility(name:'fadvise'|'fincore',args:readonly string[],fd:number){
    return new Promise<string>((resolve,reject)=>{
      const child=spawn(path.join(this.config.toolRoot,'usr/bin',name),[...args],{env:{...process.env,LD_LIBRARY_PATH:path.join(this.config.toolRoot,'usr/lib'),LC_ALL:'C'},stdio:['ignore','pipe','pipe',fd]});
      let out='',overflow=false;child.stdout!.on('data',b=>{if(out.length+b.length>16384){overflow=true;child.kill('SIGKILL');}else out+=String(b);});child.stderr!.resume();
      const timer=setTimeout(()=>{overflow=true;child.kill('SIGKILL');},2000);
      child.once('error',()=>{clearTimeout(timer);reject(Error('QaColdUtilityUnavailable'));});
      child.once('exit',code=>{clearTimeout(timer);if(code!==0||overflow)reject(Error('QaColdUtilityUnavailable'));else resolve(out);});
    });
  }
  async read(input:Parameters<PublicShareMediaReaderPort['read']>[0]):Promise<PublicShareMediaReadResult>{
    try{return await this.readOwned(input);}catch(e){this.rejected();throw e;}
  }
  private async readOwned(input:Parameters<PublicShareMediaReaderPort['read']>[0]):Promise<PublicShareMediaReadResult>{
    await this.scoped();const file=path.resolve(this.config.mediaRoot,...input.storageKey.split('/'));
    const allowed=this.config.files.find(f=>f.file===file);
    if(!allowed||!file.startsWith(this.config.mediaRoot+path.sep)||await realpath(file)!==file||allowed.expectedSha256!==input.expectedSha256||allowed.bytes>input.maximumBytes)throw Error('QaColdFileNotOwned');
    exactFile(await lstat(file,{bigint:true}),allowed);
    const lock=path.join(this.config.lockDirectory,allowed.device+'-'+allowed.inode);
    try{await mkdir(lock,{mode:0o700});}catch{throw Error('QaColdCompetingOrUnknownReader');}
    let handle:Awaited<ReturnType<typeof open>>|undefined;
    try{
      handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);exactFile(await handle.stat({bigint:true}),allowed);
      const residency=async()=>parseQaResidency(await this.utility('fincore',['--json','--bytes','--output','PAGES,SIZE,DIRTY_PAGES,WRITEBACK_PAGES','--','/proc/self/fd/3'],handle!.fd),allowed.bytes);
      const before=await residency(),start=performance.now();
      // Per-file writeback only. Full-file DONTNEED includes EOF; actual residency must prove tail eviction.
      await handle.sync();await this.utility('fadvise',['--advice','dontneed','--offset','0','--length','0','--fd','3'],handle.fd);
      const prepared=await residency();if(!qaColdNonresident(prepared))throw Error('QaColdEvictionUnproven');
      exactFile(await lstat(file,{bigint:true}),allowed);const preparationMs=performance.now()-start,readStart=performance.now();
      const result=await this.delegate.read(input),nativeReadMs=performance.now()-readStart;
      const after=await residency();exactFile(await handle.stat({bigint:true}),allowed);exactFile(await lstat(file,{bigint:true}),allowed);
      if(result.type!=='Found'||after.pages<=0||result.bytes.length!==allowed.bytes||hash(result.bytes)!==allowed.expectedSha256)throw Error('QaColdNativeReadUnproven');
      this.record({device:allowed.device,inode:allowed.inode,bytes:allowed.bytes,links:1,before,prepared,after,preparationMs,nativeReadMs});return result;
    }finally{await handle?.close();await rmdir(lock);}
  }
}
