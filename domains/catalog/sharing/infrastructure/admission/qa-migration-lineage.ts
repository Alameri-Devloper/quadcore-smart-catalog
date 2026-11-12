import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";

export interface QaMigrationLineageEntry {
  readonly index: number;
  readonly tag: string;
  readonly createdAt: number;
  readonly sha256: string;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function mismatch(): never { throw Error("QaMigrationLineageMismatch"); }
const positiveInteger = (value: unknown): bigint => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return BigInt(value);
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value)) return BigInt(value);
  return mismatch();
};
function validateExpected(expected: readonly QaMigrationLineageEntry[]): void {
  if (!Array.isArray(expected) || expected.length === 0) mismatch();
  let previous = BigInt(0);
  const tags = new Set<string>();
  for (let index = 0; index < expected.length; index++) {
    const entry = expected[index];
    if (!record(entry) || entry.index !== index || typeof entry.tag !== "string"
      || !/^[0-9]{4}_[a-z0-9_]+$/.test(entry.tag) || Number(entry.tag.slice(0, 4)) !== index
      || tags.has(entry.tag) || !Number.isSafeInteger(entry.createdAt)
      || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) mismatch();
    const createdAt = positiveInteger(entry.createdAt);
    if (createdAt <= previous) mismatch();
    previous = createdAt;
    tags.add(entry.tag);
  }
}

/** Read-only QA verification source: the existing Drizzle journal and runner's
 * SQL hashing convention. This never imports or invokes a database migrator. */
export function readQaMigrationLineage(migrationsFolder = "drizzle"): readonly QaMigrationLineageEntry[] {
  try {
    const journal: unknown = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"));
    if (!record(journal) || journal.dialect !== "postgresql" || typeof journal.version !== "string"
      || !journal.version || !Array.isArray(journal.entries) || journal.entries.length === 0) mismatch();
    const entries = journal.entries.map((entry: unknown, index: number) => {
      if (!record(entry) || entry.idx !== index || entry.version !== journal.version
        || typeof entry.breakpoints !== "boolean" || typeof entry.tag !== "string"
        || !/^[0-9]{4}_[a-z0-9_]+$/.test(entry.tag) || Number(entry.tag.slice(0, 4)) !== index
        || typeof entry.when !== "number" || !Number.isSafeInteger(entry.when) || entry.when <= 0) mismatch();
      return { index, tag: entry.tag, createdAt: entry.when };
    });
    const files = readdirSync(migrationsFolder, { withFileTypes: true }).filter(file => file.name.endsWith(".sql"));
    const names = files.map(file => file.name).sort();
    const declared = entries.map(entry => entry.tag + ".sql").sort();
    if (files.some(file => !file.isFile()) || names.length !== declared.length
      || names.some((name, index) => name !== declared[index])) mismatch();
    const migrations = readMigrationFiles({ migrationsFolder });
    if (migrations.length !== entries.length) mismatch();
    const lineage = entries.map((entry, index) => {
      const migration = migrations[index];
      if (migration.folderMillis !== entry.createdAt) mismatch();
      return { ...entry, sha256: migration.hash };
    });
    validateExpected(lineage);
    return lineage;
  } catch { throw Error("QaMigrationLineageUnavailable"); }
}

/** Rows must arrive in actual ledger insertion order (ORDER BY id), not sorted
 * here by timestamps. Serial IDs may have rollback gaps; they must be positive,
 * unique and increasing. Drizzle stores no tag: journal order/time/hash bind it. */
export function assertQaMigrationLineage(expected: readonly QaMigrationLineageEntry[], applied: unknown): void {
  validateExpected(expected);
  if (!Array.isArray(applied) || applied.length !== expected.length) mismatch();
  let previousId = BigInt(0);
  for (let index = 0; index < expected.length; index++) {
    const row: unknown = applied[index];
    if (!record(row)) mismatch();
    const id = positiveInteger(row.id);
    if (id <= previousId || positiveInteger(row.created_at) !== BigInt(expected[index].createdAt)
      || row.hash !== expected[index].sha256) mismatch();
    previousId = id;
  }
}
