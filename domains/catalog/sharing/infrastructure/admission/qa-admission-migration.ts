import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
/** Separate operational ledger avoids unmerged P5's 0018/0019. Does not alter
 * Drizzle's journal, snapshots or app schema. No runtime auto-migration/bootstrap. */
export async function migrateNewQaAdmissionDatabase(pool: Pool, expectedDatabase: string, sourceFingerprint: string) {
  if (!/^qsc_p6_admission_test_[0-9_]+$/.test(expectedDatabase) || !/^[a-f0-9]{64}$/.test(sourceFingerprint)) throw Error("UnsafeAdmissionMigration");
  const endpoint=new URL(pool.options.connectionString ?? "");
  if ((endpoint.search!=="" || endpoint.hash!=="" || endpoint.port!=="5432" || !["postgres:","postgresql:"].includes(endpoint.protocol) || !["127.0.0.1","localhost","[::1]"].includes(endpoint.hostname)) || endpoint.pathname !== "/"+expectedDatabase) throw Error("UnsafeAdmissionEndpoint");
  const sql=await readFile("domains/catalog/sharing/infrastructure/admission/migrations/0001_public_admission.sql","utf8");
  const hash=createHash("sha256").update(sql).digest("hex"), c=await pool.connect();
  try {
    await c.query("BEGIN");
    const db=(await c.query("SELECT current_database() AS name")).rows[0];
    if (db.name!==expectedDatabase) throw Error("UnsafeAdmissionMigration");
    // Fresh namespace only. Existing state is never replaced, reset or silently opened.
    await c.query(sql);
    await c.query("INSERT INTO qsc_public_admission.migrations VALUES(1,$1)",[hash]);
    await c.query("INSERT INTO qsc_public_admission.policy(version,source_key_fingerprint,ready) VALUES('p6-local-qa-a-o-v1',$1,false)",[sourceFingerprint]);
    await c.query("COMMIT"); return {version:1,sha256:hash,ready:false};
  } catch {await c.query("ROLLBACK");throw Error("AdmissionMigrationUnavailable");} finally {c.release();}
}
