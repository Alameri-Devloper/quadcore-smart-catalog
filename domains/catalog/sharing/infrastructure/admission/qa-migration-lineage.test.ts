import assert from "node:assert/strict";
import { test } from "node:test";
import { assertQaMigrationLineage, readQaMigrationLineage } from "./qa-migration-lineage";

// Local source reads only. No pg import, connection, migration, fixture or service.
const expected = readQaMigrationLineage();
const ledger = () => expected.map((entry, index) => ({
  id: index + 1, hash: entry.sha256, created_at: String(entry.createdAt),
}));
test("complete authoritative Drizzle lineage includes P5 and accepts runner ledger values", () => {
  assert.equal(expected.length, 20);
  assert.equal(expected[18].tag, "0018_public_share_manage_permission");
  assert.equal(expected[19].tag, "0019_public_share_management_admission");
  assertQaMigrationLineage(expected, ledger());
});
test("missing migration, including either integrated P5 migration, fails closed", () => {
  for (const index of [0, 18, 19]) {
    assert.throws(() => assertQaMigrationLineage(expected, ledger().filter((_, i) => i !== index)), /QaMigrationLineageMismatch/);
  }
});
test("unexpected additional applied migration fails closed", () => {
  const rows = ledger();
  rows.push({ id: 21, hash: "a".repeat(64), created_at: String(expected.at(-1)!.createdAt + 1) });
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
});
test("reordered insertion history cannot be hidden by timestamp sorting", () => {
  const rows = ledger();
  [rows[18], rows[19]] = [rows[19], rows[18]];
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
  // Even monotonic IDs must retain each corresponding journal timestamp/hash.
  rows.forEach((row, i) => { row.id = i + 1; });
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
});
test("modified SQL fingerprint fails closed", () => {
  const rows = ledger();
  rows[19].hash = expected[19].sha256 === "a".repeat(64) ? "b".repeat(64) : "a".repeat(64);
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
});
test("wrong migration timestamp fails closed", () => {
  const rows = ledger();
  rows[18].created_at = String(expected[18].createdAt + 1);
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
});
test("missing, duplicate, malformed or ambiguous ledger identifiers fail closed", () => {
  for (const id of [undefined, 0, -1, 1.5, "01", "1e2", Number.MAX_SAFE_INTEGER + 1]) {
    const rows: Record<string, unknown>[] = ledger();
    rows[0].id = id;
    assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
  }
  const rows = ledger(); rows[1].id = rows[0].id;
  assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
});
test("legitimate serial rollback gaps preserve ordering and are accepted", () => {
  const rows = ledger().map(row => ({ ...row, id: String(row.id * 2 + 3) }));
  assertQaMigrationLineage(expected, rows);
});
test("missing or malformed ledger cannot produce verification success", () => {
  for (const rows of [undefined, null, {}, [], ledger().map(() => null)]) {
    assert.throws(() => assertQaMigrationLineage(expected, rows), /QaMigrationLineageMismatch/);
  }
});
test("incomplete or ambiguous expected inventory fails closed", () => {
  const reordered = [...expected]; [reordered[18], reordered[19]] = [reordered[19], reordered[18]];
  const duplicateTime = expected.map((entry, index) => index === 19 ? { ...entry, createdAt: expected[18].createdAt } : entry);
  for (const lineage of [[], reordered, duplicateTime]) {
    assert.throws(() => assertQaMigrationLineage(lineage, ledger()), /QaMigrationLineageMismatch/);
  }
});
