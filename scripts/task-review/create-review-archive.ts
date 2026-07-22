import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { unzipSync, zipSync } from "fflate";
import { calculateSha256 } from "./calculate-sha256";
import { isExcludedReviewPath } from "./task-review.config";
import { TaskReviewError } from "./task-review.errors";
import type { TaskReviewManifest } from "./task-review.types";

export interface ArchiveEntry {
  readonly path: string;
  readonly absolutePath: string;
}

export function createReviewArchive(entries: readonly ArchiveEntry[], finalPath: string): string {
  if (existsSync(finalPath)) throw new TaskReviewError(`Review archive already exists: ${finalPath}`, "BundleFailed");
  mkdirSync(dirname(finalPath), { recursive: true });
  const temporaryPath = `${finalPath}.review-temp`;
  const archiveInput: Record<string, [Uint8Array, { mtime: Date }]> = {};
  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    archiveInput[entry.path] = [readFileSync(entry.absolutePath), { mtime: new Date("1980-01-01T00:00:00.000Z") }];
  }
  try {
    const archive = zipSync(archiveInput, { level: 6 });
    if (archive.byteLength === 0) throw new TaskReviewError("ZIP creation produced an empty archive.", "BundleFailed");
    writeFileSync(temporaryPath, archive);
    renameSync(temporaryPath, finalPath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("ZIP creation failed.", "BundleFailed");
  }
  return finalPath;
}

export function verifyReviewArchive(archivePath: string, expectedPaths: readonly string[]): TaskReviewManifest {
  const bytes = readFileSync(archivePath);
  const seen = new Set<string>();
  let duplicate = false;
  const extracted = unzipSync(bytes, {
    filter(file) {
      if (seen.has(file.name)) duplicate = true;
      seen.add(file.name);
      return true;
    },
  });
  if (duplicate) throw new TaskReviewError("Review archive contains duplicate entries.", "BundleFailed");
  const actualPaths = Object.keys(extracted).sort();
  const expected = [...expectedPaths].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expected)) {
    throw new TaskReviewError("Review archive entries do not match the expected payload.", "BundleFailed");
  }
  for (const path of actualPaths) {
    if (path.includes("\\") || path.startsWith("/") || path.split("/").includes("..") || isExcludedReviewPath(path)) {
      throw new TaskReviewError(`Review archive contains an unsafe entry: ${path}`, "BundleFailed");
    }
  }
  const manifestBytes = extracted["manifest.json"];
  if (!manifestBytes) throw new TaskReviewError("Review archive is missing manifest.json.", "BundleFailed");
  let manifest: TaskReviewManifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as TaskReviewManifest;
  } catch {
    throw new TaskReviewError("Review archive manifest is invalid JSON.", "BundleFailed");
  }
  if (manifest.schemaVersion !== "1.1.0") throw new TaskReviewError("Review archive manifest schema is unsupported.", "BundleFailed");
  if (
    manifest.integrityCoverage?.rule !== "AllArchivePayloadEntriesExceptManifest" ||
    manifest.integrityCoverage?.manifestPath !== "manifest.json"
  ) {
    throw new TaskReviewError("Review archive manifest integrity coverage is unsupported.", "BundleFailed");
  }
  const listedPaths = manifest.bundleFiles.map(({ path }) => path);
  const listedSet = new Set(listedPaths);
  if (listedSet.size !== listedPaths.length) {
    throw new TaskReviewError("Review archive manifest contains a duplicate payload path.", "BundleFailed");
  }
  const actualPayloadPaths = actualPaths.filter((path) => path !== "manifest.json");
  for (const path of listedPaths) {
    if (!actualPayloadPaths.includes(path)) throw new TaskReviewError(`Review archive is missing a listed payload: ${path}`, "BundleFailed");
  }
  for (const path of actualPayloadPaths) {
    if (!listedSet.has(path)) throw new TaskReviewError(`Review archive contains an unlisted payload: ${path}`, "BundleFailed");
  }
  for (const file of manifest.bundleFiles) {
    const payload = extracted[file.path];
    if (!payload || calculateSha256(payload) !== file.sha256) {
      throw new TaskReviewError(`Review archive payload integrity failed: ${file.path}`, "BundleFailed");
    }
  }
  return manifest;
}

export function createArchiveChecksumSidecar(archivePath: string): string {
  const sidecarPath = `${archivePath}.sha256`;
  if (existsSync(sidecarPath)) throw new TaskReviewError(`Archive checksum already exists: ${sidecarPath}`, "BundleFailed");
  writeArchiveChecksum(archivePath, sidecarPath, basename(archivePath));
  return sidecarPath;
}

export function writeArchiveChecksum(archivePath: string, checksumPath: string, publishedArchiveName: string): void {
  if (existsSync(checksumPath)) throw new TaskReviewError(`Archive checksum already exists: ${checksumPath}`, "ArtifactPreparationFailed");
  writeFileSync(checksumPath, `${calculateSha256(readFileSync(archivePath))}  ${publishedArchiveName}\n`, "utf8");
}

export function verifyArchiveChecksum(archivePath: string, checksumPath: string, expectedArchiveName: string): void {
  let value: string;
  try {
    value = readFileSync(checksumPath, "utf8");
  } catch {
    throw new TaskReviewError(`Archive checksum is unreadable: ${basename(checksumPath)}`, "ArtifactPreparationFailed");
  }
  const match = /^([a-f0-9]{64})  ([^\r\n]+)\r?\n$/.exec(value);
  if (!match || match[2] !== expectedArchiveName || match[1] !== calculateSha256(readFileSync(archivePath))) {
    throw new TaskReviewError(`Archive checksum verification failed: ${basename(checksumPath)}`, "ArtifactPreparationFailed");
  }
}
