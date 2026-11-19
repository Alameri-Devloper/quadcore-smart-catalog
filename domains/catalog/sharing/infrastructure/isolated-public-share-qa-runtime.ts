import { observeQaDatabaseClient } from "./admission/qa-database-client-errors";
import { cleanupQaAdmission } from "./admission/qa-admission-operations";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import * as schema from "../../../../shared/infrastructure/persistence/schema";
import { ResolvePublicProductShare } from "../application/resolve-public-product-share";
import { createPublicShareCryptoRuntime } from "./public-share-crypto-runtime";
import type { PublicShareCryptoEnvironment } from "./crypto/environment-public-share-crypto";
import { PostgreSqlPublicShareReadSnapshot } from "./persistence/postgresql-public-share-read-snapshot";
import { LocalPublicShareMediaReader } from "./media/local-public-share-media-reader";
import { createPublicShareMediaGet, publicShareFailureResponse } from "./http/public-share-resolution-http";
import { PostgreSqlPublicShareAdmission } from "./admission/postgresql-public-share-admission";
import { QaTrustedPublicShareSource } from "./admission/qa-public-share-source";
export interface IsolatedPublicShareQaConfiguration {
  mode: "ISOLATED_LOCAL_QA"; databaseUrl: string; mediaRoot: string;
  sourceKey: Buffer; crypto: PublicShareCryptoEnvironment;
  /** Supplied by owned loopback fixture from actual socket-peer verification and request object identity. */
  verifiedIngressRequest: (request: Request)=>boolean;
}
/** Explicit QA composition, never automatically mounted or selected from environment.
 * Production and the default mounted route remain closed. P7 is not implemented. */
export function createIsolatedPublicShareQaRuntime(config: IsolatedPublicShareQaConfiguration) {
  const url=new URL(config.databaseUrl);
  if (config.mode!=="ISOLATED_LOCAL_QA" || (url.search!=="" || url.hash!=="" || url.port!=="5432" || !["postgres:","postgresql:"].includes(url.protocol) || !["127.0.0.1","localhost","[::1]"].includes(url.hostname))
    || !/^\/qsc_p6_admission_test_[0-9_]+$/.test(url.pathname) || !isAbsolute(config.mediaRoot)
    || config.sourceKey.byteLength!==32 || typeof config.verifiedIngressRequest!=="function") throw Error("QaRuntimeConfigurationInvalid");
  const crypto=createPublicShareCryptoRuntime(config.crypto);
  if (process.env.NODE_ENV === "production" || config.crypto.NODE_ENV !== "test" || crypto.readiness.lookup !== "READY") throw Error("QaLookupUnavailable");
  for (const map of [config.crypto.QSC_PUBLIC_SHARE_HMAC_KEYS_JSON,config.crypto.QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON]) { if (map && Object.values(JSON.parse(map) as Record<string,string>).some(value=>Buffer.from(value,"base64").equals(config.sourceKey))) throw Error("QaSourcePurposeKeyReuse"); }
  const source=new QaTrustedPublicShareSource(Buffer.from(config.sourceKey),config.verifiedIngressRequest);
  const main=new Pool({connectionString:config.databaseUrl,max:8,connectionTimeoutMillis:75,statement_timeout:750,query_timeout:750});
  const admissionPool=new Pool({connectionString:config.databaseUrl,max:2,connectionTimeoutMillis:75,statement_timeout:100,query_timeout:100});
  // Idle pool errors are consumed without publishing secret-bearing pg diagnostics.
  main.on("connect",observeQaDatabaseClient);admissionPool.on("connect",observeQaDatabaseClient);
  main.on("error",()=>{}); admissionPool.on("error",()=>{});
  const ownerId=randomUUID();
  const admission=new PostgreSqlPublicShareAdmission(admissionPool,ownerId,source.fingerprint);
  const resolver=new ResolvePublicProductShare(new PostgreSqlPublicShareReadSnapshot(drizzle(main,{schema})),crypto.lookupDigest,admission,new LocalPublicShareMediaReader(config.mediaRoot));
  const media=createPublicShareMediaGet(resolver,source);
  const cleanup=setInterval(()=>{void cleanupQaAdmission(admissionPool,source.fingerprint).catch(()=>{});},60_000); cleanup.unref();
  return Object.freeze({ownerId,resolver,source,media,
    // P6 provides generic no-JS error documents; success SSR is deliberately P7.
    pageFailure:publicShareFailureResponse,
    close:async()=>{clearInterval(cleanup);await Promise.all([main.end(),admissionPool.end()]);}});
}
