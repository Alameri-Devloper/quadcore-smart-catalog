import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { unzipSync } from "fflate";
import { calculateFileSha256 } from "../calculate-sha256";
import { createArchiveChecksumSidecar, createReviewArchive, verifyReviewArchive } from "../create-review-archive";
import { exportReviewArchive } from "../export-review-archive";
import { runVerificationCommand } from "../run-verification-command";

test("runs success, required failure, optional failure, missing executable, and timeout", async () => {
  const root = mkdtempSync(join(tmpdir(), "qsc-review-command-"));
  const make = (key: string, script: string, required = true, timeoutMs = 2_000) => ({ key, command: process.execPath, args: ["-e", script], required, timeoutMs });
  assert.equal((await runVerificationCommand(make("success", "console.log('ok')"), root)).result.exitCode, 0);
  assert.equal((await runVerificationCommand(make("required", "process.exit(2)"), root)).result.exitCode, 2);
  assert.equal((await runVerificationCommand(make("optional", "process.exit(1)", false), root)).result.exitCode, 1);
  const missing = await runVerificationCommand({ key: "missing", command: "qsc-command-that-does-not-exist", args: [], required: true, timeoutMs: 1_000 }, root);
  assert.equal(missing.result.termination, "SpawnFailed");
  const timeout = await runVerificationCommand(make("timeout", "setTimeout(() => {}, 10000)", true, 25), root);
  assert.match(timeout.stderr, /timed out/);
  assert.equal(timeout.result.termination, "TimedOut");
});

test("creates deterministic-path ZIP entries and exports to an injected directory", () => {
  const root = mkdtempSync(join(tmpdir(), "qsc-review-archive-"));
  const source = join(root, "file.txt");
  const archive = join(root, "QSC-Task-TEST-Review.zip");
  writeFileSync(source, "content");
  const manifestPath = join(root, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "1.1.0", integrityCoverage: { rule: "AllArchivePayloadEntriesExceptManifest", manifestPath: "manifest.json", detachedArchiveChecksum: true }, bundleFiles: [{ path: "source-files/docs/file.txt", sha256: calculateFileSha256(source) }] }));
  createReviewArchive([{ path: "manifest.json", absolutePath: manifestPath }, { path: "source-files/docs/file.txt", absolutePath: source }], archive);
  verifyReviewArchive(archive, ["manifest.json", "source-files/docs/file.txt"]);
  const sidecar = createArchiveChecksumSidecar(archive);
  assert.match(readFileSync(sidecar, "utf8"), /^[a-f0-9]{64}  QSC-Task-TEST-Review\.zip\n$/);
  const entries = unzipSync(readFileSync(archive));
  assert.deepEqual(Object.keys(entries).sort(), ["manifest.json", "source-files/docs/file.txt"]);
  assert.equal(calculateFileSha256(source), calculateFileSha256(source));
  const exportDirectory = join(root, "desktop-test");
  const exported = exportReviewArchive(archive, exportDirectory, new Date("2026-07-22T04:15:30Z"));
  assert.equal(readFileSync(exported.archivePath).byteLength, readFileSync(archive).byteLength);
  const collision = exportReviewArchive(archive, exportDirectory, new Date("2026-07-22T04:15:30Z"));
  assert.notEqual(collision.archivePath, exported.archivePath);
  assert.ok(existsSync(collision.checksumPath));
});

test("archive verification rejects omitted, duplicate, wrong-hash, extra, and missing manifest payload coverage", () => {
  const root = mkdtempSync(join(tmpdir(), "qsc-review-coverage-"));
  const payload = join(root, "payload.txt");
  writeFileSync(payload, "payload");
  const coverage = { rule: "AllArchivePayloadEntriesExceptManifest", manifestPath: "manifest.json", detachedArchiveChecksum: true };
  const make = (name: string, bundleFiles: unknown[], entries: { path: string; absolutePath: string }[]) => {
    const manifest = join(root, `${name}.json`);
    writeFileSync(manifest, JSON.stringify({ schemaVersion: "1.1.0", integrityCoverage: coverage, bundleFiles }));
    const archive = join(root, `${name}.zip`);
    createReviewArchive([{ path: "manifest.json", absolutePath: manifest }, ...entries], archive);
    return archive;
  };
  const omitted = make("omitted", [], [{ path: "payload.txt", absolutePath: payload }]);
  assert.throws(() => verifyReviewArchive(omitted, ["manifest.json", "payload.txt"]), /unlisted payload: payload\.txt/);
  const duplicate = make("duplicate", [{ path: "payload.txt", sha256: calculateFileSha256(payload) }, { path: "payload.txt", sha256: calculateFileSha256(payload) }], [{ path: "payload.txt", absolutePath: payload }]);
  assert.throws(() => verifyReviewArchive(duplicate, ["manifest.json", "payload.txt"]), /duplicate payload path/);
  const wrong = make("wrong", [{ path: "payload.txt", sha256: "0".repeat(64) }], [{ path: "payload.txt", absolutePath: payload }]);
  assert.throws(() => verifyReviewArchive(wrong, ["manifest.json", "payload.txt"]), /payload integrity failed: payload\.txt/);
  const missingPayload = make("missing-payload", [{ path: "payload.txt", sha256: calculateFileSha256(payload) }], []);
  assert.throws(() => verifyReviewArchive(missingPayload, ["manifest.json"]), /missing a listed payload: payload\.txt/);
  const noManifest = join(root, "no-manifest.zip");
  createReviewArchive([{ path: "payload.txt", absolutePath: payload }], noManifest);
  assert.throws(() => verifyReviewArchive(noManifest, ["payload.txt"]), /missing manifest/);
});
