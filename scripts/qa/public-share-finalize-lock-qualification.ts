import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Pool, type PoolClient, type QueryConfig, type QueryResult } from "pg";
import type { EventEmitter } from "node:events";
import { PostgreSqlPublicShareAdmission } from "../../domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission";
import { migrateNewQaAdmissionDatabase } from "../../domains/catalog/sharing/infrastructure/admission/qa-admission-migration";
import { qaFailureCode } from "./public-share-performance-diagnostics";

type Owned = { url: string; name: string; verifyPreservation(): Promise<unknown> };
type Protocol = { event: string; atMs: number; status?: string; code?: string };
type Call = { stage: string; startMs: number; driverStartMs?: number; endMs?: number; code?: string; protocol: Protocol[] };
type Snapshot = { pending: string | null; leases: { lease_id: string; owner_id: string; source_id: string; workspace_id: string; grant_id: string }[]; balances: { key: string; tokens: string }[] };
type Hooks = { before?: () => Promise<void>; after?: () => Promise<void> };
export type FinalizeLockQualification = { case: string; status: "PASS" | "FAIL" | "INCONCLUSIVE"; evidence: unknown };
const source = "b".repeat(64), workspace = "synthetic-workspace", grant = "synthetic-grant";
const media = { phase: "MediaRead" as const, routeClass: "Media" as const, sourceIdentity: source, workspaceId: workspace, grantId: grant, maximumBytes: 8388608 };
const page = { phase: "Source" as const, routeClass: "Page" as const, sourceIdentity: "c".repeat(64) };
const hashScope = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Synthetic newly owned databases only. No recovery-clearing or native I/O. */
export async function qualifyFinalizeLockBound(fresh: () => Promise<Owned>, directory: string, selection?: readonly string[]) {
 const results: FinalizeLockQualification[] = [];
 const run = async (name: string, body: (h: Harness) => Promise<unknown>) => {
  if (selection && !selection.includes(name)) return;
  let owned: Owned | undefined, h: Harness | undefined;
  try {
   owned = await fresh(); h = await harness(owned);
   const evidence = await body(h);
   results.push({ case: name, status: "PASS", evidence: { checks: evidence, preservation: await owned.verifyPreservation() } });
  } catch (error) {
   const failed = error instanceof assert.AssertionError;
   results.push({ case: name, status: failed ? "FAIL" : "INCONCLUSIVE", evidence: { classification: failed ? "AssertionMismatch" : "QaExecutionUnavailable", operator: failed ? error.operator : undefined } });
  } finally {
   await h?.close();
   fs.writeFileSync(path.join(directory, "finalize-lock-results.json"), JSON.stringify({ results, acceptance: "HOLD", nativeIo: "NOT PERFORMED; direct admission qualification" }, null, 2));
  }
  console.log(JSON.stringify(results.at(-1)));
 };
 await run("Normal-Allowed-Denied-single-finalization-and-setting-restoration", async h => {
  const initial = await h.setting();
  assert.equal((await h.adapter.admit(page)).type, "Allowed");
  assert.deepEqual(h.calls.map(c => c.stage), ["Prepare", "Decide", "Finalize"]);
  assert.equal(await h.setting(), initial);
  assert.ok(h.calls.every(c => c.protocol.some(p => p.event === "readyForQuery" && p.status === "I")));
  const finalize = h.finalizeSql();
  const plan = (await h.admin.query("EXPLAIN (VERBOSE, FORMAT JSON) " + finalize, [randomUUID(), h.fingerprint])).rows[0]["QUERY PLAN"];
  const planText = JSON.stringify(plan); assert.ok(planText.includes("CTE Scan")); assert.ok(planText.includes("set_config")); assert.ok(planText.includes("finalize_operation"));
  await h.admin.query("UPDATE qsc_public_admission.buckets SET tokens=0,sampled_ms=floor(extract(epoch FROM clock_timestamp())*1000)+60000 WHERE key='request:global'");
  const before = await h.snapshot(), n = h.calls.length;
  const denied = await h.adapter.admit(page); assert.equal(denied.type, "Denied");
  if (denied.type === "Denied") assert.ok(denied.retryAfterSeconds! >= 1 && denied.retryAfterSeconds! <= 60);
  assert.deepEqual(h.calls.slice(n).map(c => c.stage), ["Prepare", "Decide", "Finalize"]);
  assert.deepEqual((await h.snapshot()).balances, before.balances);
  assert.equal((await h.snapshot()).pending, null); assert.equal(await h.setting(), initial);
  return { callsPerAdmission: 3, normalAllowed: true, normalDenied: true, noDeniedDebit: true, localSettingRestoredAfterBothCommits: true, initialSetting: initial, plan: { rootNode: String(plan[0].Plan["Node Type"]), cteName: String(plan[0].Plan["CTE Name"]), subplanCount: Number(plan[0].Plan.Plans.length), settingExpressionVerified: true, finalizeProjectionVerified: true }, noNativeIo: true };
 });
 for (const repetition of [1, 2, 3]) await run("Finalize-held-policy-row-55P03-" + repetition, async h => {
  assert.equal((await h.adapter.admit(page)).type, "Allowed"); h.calls.length = 0; h.diagnostics.length = 0;
  let committed: Snapshot | undefined; const waits: { atMs: number; ageMs: number; event: string }[] = [];
  let timer: NodeJS.Timeout | undefined, sampling = false;
  h.hooks.before = async () => {
   committed = await h.snapshot(); h.assertMedia(committed);
   await h.holdRow();
   timer = setInterval(() => {
    if (sampling) return; sampling = true;
    void h.admin.query("SELECT extract(epoch FROM clock_timestamp()-query_start)*1000 AS age,wait_event FROM pg_stat_activity WHERE datname=current_database() AND application_name='qsc-p6-finalize-subject' AND wait_event_type='Lock'").then(r => {
     for (const row of r.rows) waits.push({ atMs: performance.now(), ageMs: Number(row.age), event: String(row.wait_event) });
    }).finally(() => { sampling = false; }).catch(() => {});
   }, 10);
  };
  try {
   const t = performance.now(), result = await h.adapter.admit(media), elapsed = performance.now() - t;
   if (timer) clearInterval(timer); while (sampling) await pause(5);
   assert.equal(result.type, "Unavailable"); assert.deepEqual(h.diagnostics.at(-1), { outcome: "Unavailable", stage: "Finalize", failure: "55P03" });
   assert.ok(committed); assert.deepEqual(await h.snapshot(), committed);
   assert.deepEqual(h.calls.map(c => c.stage), ["Prepare", "Decide", "Finalize"]);
   await h.releaseRow(); h.hooks.before = undefined;
   const calls = h.calls.length; assert.equal((await h.adapter.admit(page)).type, "Unavailable");
   assert.equal(h.calls.length, calls); assert.equal(h.diagnostics.at(-1)?.failure, "RECOVERY_STATE");
   assert.equal((await h.peer.admit(page)).type, "Unavailable");
   assert.deepEqual(await h.snapshot(), committed); h.assertMedia(await h.snapshot());
   const final = h.calls.at(-1)!;
   assert.ok(Number.isFinite(final.driverStartMs));
   assert.ok(final.protocol.some(p => p.event === "errorMessage" && p.code === "LOCK_TIMEOUT"));
   return { definitiveServerSqlstate: "55P03", subjectDriverDispatchAsserted: true, subjectServerLockErrorAsserted: true, originalUnavailableAndSticky: true, peerClosedByPending: true, exactOperationOwnerScopeLeaseAndByteDebitsRetained: true, noDuplicateDebitRefundOrRelease: true, admissionMs: elapsed, finalizeDriverMs: final.endMs! - final.driverStartMs!, finalizeWrapperMs: final.endMs! - final.startMs, waits: waits.map(w => ({ ageMs: w.ageMs, event: w.event })), protocol: final.protocol, sampledWaitDuration: "Snapshots are lower-bound observations,not exact wait duration; client includes scheduling/transport", noNativeIo: true };
  } finally { if (timer) clearInterval(timer); while (sampling) await pause(5); await h.releaseRow(); }
 });
 await run("Finalize-aborted-implicit-transaction-restores-setting", async h => {
  assert.equal((await h.adapter.admit(page)).type, "Allowed");
  const sql = h.finalizeSql(), client = await h.connect();
  try {
   const initial = (await client.query("SHOW lock_timeout")).rows[0].lock_timeout, operation = randomUUID();
   await client.query({ text: "SELECT qsc_public_admission.prepare_operation($1,$2) AS prepared", values: [operation, h.fingerprint] });
   await h.holdRow(); let code = "";
   try { await client.query({ text: sql, values: [operation, h.fingerprint], query_timeout: 100 } as QueryConfig & { query_timeout: number }); }
   catch (error) { code = String((error as { code?: string }).code); }
   assert.equal(code, "55P03");
   assert.equal((await client.query("SHOW lock_timeout")).rows[0].lock_timeout, initial);
   await h.releaseRow(); const s = await h.snapshot(); assert.equal(s.pending, operation); assert.equal(s.leases.length, 0);
   return { actualServerLockRejection: true, sameConnectionReusableIdleAfterAbort: true, settingRestoredAfterRollback: true, initialSetting: initial, ownPendingPreserved: true, fixtureScope: "Direct real SQL uses captured actual adapter Finalize statement; no surrounding explicit admission transaction", noNativeIo: true };
  } finally { await h.releaseRow(); client.release(true); }
 });
 await run("Finalize-committed-Ready-then-overall-deadline-no-Allow", async h => {
  assert.equal((await h.adapter.admit(page)).type, "Allowed"); h.calls.length = 0; h.diagnostics.length = 0;
  let committed = false;
  h.hooks.after = async () => {
   const final = h.calls.at(-1)!;
   assert.ok(Number.isFinite(final.driverStartMs));

   committed = final.protocol.some(p => p.event === "readyForQuery" && p.status === "I"); assert.equal(committed, true);
   const stop = performance.now() + 210; while (performance.now() < stop) { /* Deliberate QA client scheduling stall after definitive PG response. */ }
  };
  const result = await h.adapter.admit(media); h.hooks.after = undefined;
  assert.equal(result.type, "Unavailable"); assert.equal(committed, true);
  assert.deepEqual(h.diagnostics.at(-1), { outcome: "Unavailable", stage: "Finalize", failure: "ADMISSION_DEADLINE" });
  const before = await h.snapshot(); assert.equal(before.pending, null); h.assertMedia(before, false);
  assert.equal((await h.adapter.admit(page)).type, "Unavailable"); assert.equal(h.diagnostics.at(-1)?.failure, "RECOVERY_STATE");
  assert.equal((await h.peer.admit(page)).type, "Allowed");
  const after = await h.snapshot(); assert.deepEqual(after.leases, before.leases); assert.deepEqual(after.balances.filter(b => b.key.startsWith("bytes:")), before.balances.filter(b => b.key.startsWith("bytes:")));
  assert.equal(result.type, "Unavailable");
  return { trueFinalizeCompletionObserved: true, deadlineAfterCompletion: true, clientStallMs: 210, originalNeverUpgraded: true, distinctPeerOwnDefinitiveAdmission: true, exactUnknownLeaseAndDebitsPreserved: true, noNativeIo: true };
 });
 return results;
}

async function harness(owned: Owned) {
 const fingerprint = createHash("sha256").update(randomBytes(32)).digest("hex"), owner = randomUUID();
 const admin = new Pool({ connectionString: owned.url, max: 2, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
 const pool = new Pool({ connectionString: owned.url, max: 1, connectionTimeoutMillis: 75, statement_timeout: 100, query_timeout: 100, application_name: "qsc-p6-finalize-subject" });
 const peerPool = new Pool({ connectionString: owned.url, max: 1, connectionTimeoutMillis: 75, statement_timeout: 100, query_timeout: 100 });
 for (const p of [admin, pool, peerPool]) p.on("error", () => {});
 let blocker: PoolClient | undefined; const calls: Call[] = [], hooks: Hooks = {}, diagnostics: { outcome: "Unavailable"; stage: string; failure: string }[] = [];
 const connect = pool.connect.bind(pool), initialized = new WeakSet<PoolClient>(); let operation = "", finalizedSql = "";
 const snapshot = async (): Promise<Snapshot> => ({ pending: (await admin.query("SELECT pending_operation FROM qsc_public_admission.policy")).rows[0].pending_operation, leases: (await admin.query("SELECT lease_id,owner_id,source_id,workspace_id,grant_id FROM qsc_public_admission.leases ORDER BY lease_id")).rows, balances: (await admin.query("SELECT key,tokens::text FROM qsc_public_admission.buckets ORDER BY key")).rows });
 const releaseRow = async () => { if (blocker) { const c = blocker; blocker = undefined; try { await c.query("COMMIT"); } finally { c.release(); } } };
 const close = async () => { try { await releaseRow(); await admin.query("UPDATE qsc_public_admission.policy SET ready=false WHERE singleton"); } finally { await Promise.all([pool.end(), peerPool.end(), admin.end()]); } };
 try {
  await migrateNewQaAdmissionDatabase(admin, owned.name, fingerprint); await admin.query("UPDATE qsc_public_admission.policy SET ready=true WHERE singleton");
  for (let n = 0; n < 3; n++) { try { const c = await connect(); c.release(); break; } catch { if (n === 2) throw Error("QaWarmupUnavailable"); } }
  (pool as unknown as { connect(): Promise<PoolClient> }).connect = async () => {
   const client = await connect(); if (initialized.has(client)) return client; initialized.add(client);
   let active: Call | undefined;
   const original = client.query.bind(client) as (config: string | QueryConfig, values?: unknown[]) => Promise<QueryResult>;
   const connection = (client as unknown as { connection: EventEmitter }).connection;
   for (const event of ["commandComplete", "readyForQuery", "errorMessage"]) connection.on(event, (m: { status?: string; code?: string }) => { try { active?.protocol.push({ event, atMs: performance.now(), status: event === "readyForQuery" ? m.status : undefined, code: event === "errorMessage" ? qaFailureCode(m) : undefined }); } catch {} });
   (client as unknown as { query(config: string | QueryConfig, values?: unknown[]): Promise<QueryResult> }).query = async (config, values) => {
    const text = typeof config === "string" ? config : config.text, args = typeof config === "string" ? values : config.values;
    const stage = text.includes("prepare_operation") ? "Prepare" : text.includes("decide_operation") ? "Decide" : text.includes("finalize_operation") ? "Finalize" : "Other";
    if (stage === "Other") { active = undefined; return original(config, values); }
    if (stage === "Prepare") operation = String(args?.[0]);
    const call: Call = { stage, startMs: performance.now(), protocol: [] }; calls.push(call); active = call;
    try {
     if (stage === "Finalize") { finalizedSql = text; await hooks.before?.(); }
     call.driverStartMs = performance.now(); const r = await original(config, values);
     if (stage === "Finalize") await hooks.after?.();
     return r;
    } catch (error) { call.code = qaFailureCode(error); throw error; }
    finally { call.endMs = performance.now(); }
   };
   return client;
  };
  const adapter = new PostgreSqlPublicShareAdmission(pool, owner, fingerprint, e => diagnostics.push(e)), peer = new PostgreSqlPublicShareAdmission(peerPool, randomUUID(), fingerprint);
  return { admin, adapter, peer, calls, hooks, fingerprint, diagnostics, connect, close, snapshot, releaseRow,
   holdRow: async () => { blocker = await admin.connect(); await blocker.query("BEGIN"); await blocker.query("SELECT singleton FROM qsc_public_admission.policy WHERE singleton FOR UPDATE"); },
   setting: async () => { const c = await connect(); try { return String((await c.query("SHOW lock_timeout")).rows[0].lock_timeout); } finally { c.release(); } },
   finalizeSql: () => { assert.ok(finalizedSql); return finalizedSql; },
   assertMedia: (s: Snapshot, pending = true) => {
    if (pending) assert.equal(s.pending, operation); assert.equal(s.leases.length, 1);
    assert.deepEqual(s.leases[0], { lease_id: operation, owner_id: owner, source_id: source, workspace_id: hashScope([workspace]), grant_id: hashScope([workspace, grant]) });
    assert.deepEqual(s.balances.filter(b => b.key.startsWith("bytes:")).map(b => Number(b.tokens)).sort((a,b) => a-b), [72,72,152].map(n => n*1048576*1000));
   }
  };
 } catch (error) { await close(); throw error; }
}
type Harness = Awaited<ReturnType<typeof harness>>;
