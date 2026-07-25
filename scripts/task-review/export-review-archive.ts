import {
  accessSync,
  constants,
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { calculateFileSha256 } from "./calculate-sha256";
import { copyFileExclusive, writeFileExclusive, type TemporaryArtifactCreated } from "./create-exclusive-file";
import { verifyArchiveChecksum, writeArchiveChecksum } from "./create-review-archive";
import { ArtifactPublicationPartialFailure, TaskReviewError } from "./task-review.errors";

export interface ArtifactPair {
  readonly archivePath: string;
  readonly checksumPath: string;
}

export interface DesktopArtifactSet extends ArtifactPair {
  readonly reportPath: string;
}

export interface PublicationPath {
  readonly temporaryPath: string;
  readonly finalPath: string;
}

export type ArtifactPublicationState =
  | "Prepared"
  | "Published"
  | "Verified"
  | "TemporaryCleaned"
  | "RolledBack"
  | "RollbackFailed";

export interface ArtifactPublicationRecord extends PublicationPath {
  state: ArtifactPublicationState;
  finalCreated: boolean;
}

export interface ArtifactCleanupResult {
  readonly attemptedCount: number;
  readonly removedCount: number;
  readonly failedCount: number;
}

export interface ReviewArtifactFileSystemOperations {
  readonly publishNoReplace: (temporaryPath: string, finalPath: string) => ExclusivePublicationOutcome;
  readonly remove: (path: string) => void;
}

export type ExclusivePublicationOutcome =
  | { readonly type: "Published" }
  | { readonly type: "DestinationExists" }
  | { readonly type: "StateUnknown"; readonly reconciliationRequired: true };

export const nodeReviewArtifactFileSystemOperations: ReviewArtifactFileSystemOperations = {
  publishNoReplace: (temporaryPath, finalPath) => {
    try {
      linkSync(temporaryPath, finalPath);
      return { type: "Published" };
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      return code === "EEXIST"
        ? { type: "DestinationExists" }
        : { type: "StateUnknown", reconciliationRequired: true };
    }
  },
  remove: (path) => rmSync(path, { force: true }),
};

export function createReviewInvocationId(): string {
  return randomUUID().replaceAll("-", "");
}

function assertPortableInvocationId(invocationId: string): void {
  if (!/^[a-f0-9]{32}$/.test(invocationId)) {
    throw new TaskReviewError("Review invocation identity is invalid.", "BundleFailed");
  }
}

function invocationTemporaryPath(finalPath: string, invocationId: string): string {
  assertPortableInvocationId(invocationId);
  return join(dirname(finalPath), `.${basename(finalPath)}.${invocationId}.review-temp`);
}

function timestampToken(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function desktopArtifactSet(outputDirectory: string, taskId: string, suffix = ""): DesktopArtifactSet {
  return {
    reportPath: join(outputDirectory, `QSC-Task-${taskId}-Final-Report${suffix}.md`),
    archivePath: join(outputDirectory, `QSC-Task-${taskId}-Review${suffix}.zip`),
    checksumPath: join(outputDirectory, `QSC-Task-${taskId}-Review${suffix}.zip.sha256`),
  };
}

function artifactSetPaths(set: DesktopArtifactSet): readonly string[] {
  return [set.reportPath, set.archivePath, set.checksumPath];
}

export function resolveDesktopReviewDirectory(): string {
  const home = process.env.USERPROFILE || homedir();
  if (!home) throw new TaskReviewError("The user home directory could not be resolved.", "DesktopExportFailed");
  const desktop = join(home, "Desktop");
  if (process.platform !== "win32" && !existsSync(desktop)) {
    throw new TaskReviewError("Desktop could not be resolved; provide --output and --no-desktop-export.", "DesktopExportFailed");
  }
  return join(desktop, "QSC-Reviews");
}

export function preflightDesktopReviewDirectory(outputDirectory: string, invocationId: string): void {
  let probePath: string | null = null;
  let renamedProbePath: string | null = null;
  let probeOwned = false;
  let renamedProbeOwned = false;
  try {
    assertPortableInvocationId(invocationId);
    mkdirSync(outputDirectory, { recursive: true });
    accessSync(outputDirectory, constants.R_OK | constants.W_OK);
    probePath = join(outputDirectory, `.qsc-review-preflight.${invocationId}.review-temp`);
    renamedProbePath = `${probePath}.renamed`;
    const expected = Buffer.from("QSC review export preflight", "utf8");
    writeFileExclusive(probePath, expected, () => {
      probeOwned = true;
    });
    if (!readFileSync(probePath).equals(expected)) throw new Error("Desktop preflight byte verification failed.");
    linkSync(probePath, renamedProbePath);
    renamedProbeOwned = true;
    rmSync(probePath);
    probeOwned = false;
    rmSync(renamedProbePath);
    renamedProbeOwned = false;
  } catch {
    try {
      if (probeOwned && probePath) rmSync(probePath, { force: true });
    } catch {}
    try {
      if (renamedProbeOwned && renamedProbePath) rmSync(renamedProbePath, { force: true });
    } catch {}
    throw new TaskReviewError("Desktop export directory is not writable.", "DesktopExportFailed");
  }
}

export function resolveCollisionSafeArtifactPair(
  outputDirectory: string,
  desiredArchiveName: string,
  now: Date,
): ArtifactPair {
  mkdirSync(outputDirectory, { recursive: true });
  const extension = extname(desiredArchiveName);
  const stem = basename(desiredArchiveName, extension).replace(/-\d{8}T\d{6}Z(?:-\d+)?$/, "");
  let archivePath = join(outputDirectory, `${stem}${extension}`);
  let checksumPath = `${archivePath}.sha256`;
  if (existsSync(archivePath) || existsSync(checksumPath)) {
    const timestamp = timestampToken(now);
    archivePath = join(outputDirectory, `${stem}-${timestamp}${extension}`);
    checksumPath = `${archivePath}.sha256`;
    let counter = 2;
    while (existsSync(archivePath) || existsSync(checksumPath)) {
      archivePath = join(outputDirectory, `${stem}-${timestamp}-${counter}${extension}`);
      checksumPath = `${archivePath}.sha256`;
      counter += 1;
    }
  }
  return { archivePath, checksumPath };
}

export function resolveDesktopArtifactSet(
  outputDirectory: string,
  taskId: string,
  now: Date,
): DesktopArtifactSet {
  mkdirSync(outputDirectory, { recursive: true });
  const desired = desktopArtifactSet(outputDirectory, taskId);
  if (!artifactSetPaths(desired).some(existsSync)) return desired;

  const timestamp = timestampToken(now);
  let counter = 1;
  while (true) {
    const suffix = `-${timestamp}${counter === 1 ? "" : `-${counter}`}`;
    const candidate = desktopArtifactSet(outputDirectory, taskId, suffix);
    if (!artifactSetPaths(candidate).some(existsSync)) return candidate;
    counter += 1;
  }
}

export function resolveTemporaryArtifactPair(finalPair: ArtifactPair, invocationId: string): ArtifactPair {
  return {
    archivePath: invocationTemporaryPath(finalPair.archivePath, invocationId),
    checksumPath: invocationTemporaryPath(finalPair.checksumPath, invocationId),
  };
}

export function resolveTemporaryDesktopArtifactSet(
  finalSet: DesktopArtifactSet,
  invocationId: string,
): DesktopArtifactSet {
  return {
    reportPath: invocationTemporaryPath(finalSet.reportPath, invocationId),
    archivePath: invocationTemporaryPath(finalSet.archivePath, invocationId),
    checksumPath: invocationTemporaryPath(finalSet.checksumPath, invocationId),
  };
}

export function prepareDesktopArtifactPair(
  localTemporaryArchive: string,
  temporaryPair: ArtifactPair,
  finalPair: ArtifactPair,
  onCreated?: TemporaryArtifactCreated,
): void {
  try {
    copyFileExclusive(localTemporaryArchive, temporaryPair.archivePath, onCreated);
    writeArchiveChecksum(temporaryPair.archivePath, temporaryPair.checksumPath, basename(finalPair.archivePath), onCreated);
    verifyArchiveChecksum(temporaryPair.archivePath, temporaryPair.checksumPath, basename(finalPair.archivePath));
    if (calculateFileSha256(localTemporaryArchive) !== calculateFileSha256(temporaryPair.archivePath)) {
      throw new TaskReviewError("Desktop temporary ZIP differs from the local temporary ZIP.", "DesktopExportFailed");
    }
  } catch (error) {
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Desktop temporary artifact preparation failed.", "DesktopExportFailed");
  }
}

export function prepareDesktopArtifactSet(
  sourceReportPath: string,
  localTemporaryArchive: string,
  temporarySet: DesktopArtifactSet,
  finalSet: DesktopArtifactSet,
  expectedReportSha256: string,
  onCreated?: TemporaryArtifactCreated,
): void {
  try {
    copyFileExclusive(sourceReportPath, temporarySet.reportPath, onCreated);
    copyFileExclusive(localTemporaryArchive, temporarySet.archivePath, onCreated);
    writeArchiveChecksum(temporarySet.archivePath, temporarySet.checksumPath, basename(finalSet.archivePath), onCreated);
    if (calculateFileSha256(sourceReportPath) !== expectedReportSha256) {
      throw new TaskReviewError("Final Report source changed before Desktop export.", "DesktopExportFailed");
    }
    if (calculateFileSha256(temporarySet.reportPath) !== expectedReportSha256) {
      throw new TaskReviewError("Desktop temporary Final Report differs from the source report.", "DesktopExportFailed");
    }
    if (calculateFileSha256(localTemporaryArchive) !== calculateFileSha256(temporarySet.archivePath)) {
      throw new TaskReviewError("Desktop temporary ZIP differs from the local temporary ZIP.", "DesktopExportFailed");
    }
    verifyArchiveChecksum(temporarySet.archivePath, temporarySet.checksumPath, basename(finalSet.archivePath));
    for (const path of artifactSetPaths(temporarySet)) {
      if (statSync(path).size === 0) throw new TaskReviewError("Desktop temporary artifact is empty.", "DesktopExportFailed");
    }
  } catch (error) {
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Desktop temporary artifact preparation failed.", "DesktopExportFailed");
  }
}

export function publicationPaths(temporary: ArtifactPair, final: ArtifactPair): PublicationPath[] {
  return [
    { temporaryPath: temporary.archivePath, finalPath: final.archivePath },
    { temporaryPath: temporary.checksumPath, finalPath: final.checksumPath },
  ];
}

export function desktopPublicationPaths(temporary: DesktopArtifactSet, final: DesktopArtifactSet): PublicationPath[] {
  return [
    { temporaryPath: temporary.reportPath, finalPath: final.reportPath },
    { temporaryPath: temporary.archivePath, finalPath: final.archivePath },
    { temporaryPath: temporary.checksumPath, finalPath: final.checksumPath },
  ];
}

export function cleanupArtifactPaths(
  paths: readonly string[],
  operations: ReviewArtifactFileSystemOperations = nodeReviewArtifactFileSystemOperations,
): ArtifactCleanupResult {
  let removedCount = 0;
  let failedCount = 0;
  for (const path of paths) {
    try {
      operations.remove(path);
      removedCount += 1;
    } catch {
      failedCount += 1;
    }
  }
  return { attemptedCount: paths.length, removedCount, failedCount };
}

function rollbackPublicationRecords(
  records: readonly ArtifactPublicationRecord[],
  operations: ReviewArtifactFileSystemOperations,
): ArtifactCleanupResult {
  let attemptedCount = 0;
  let removedCount = 0;
  let failedCount = 0;
  for (const record of [...records].reverse()) {
    if (!record.finalCreated) continue;
    attemptedCount += 1;
    try {
      operations.remove(record.finalPath);
      record.finalCreated = false;
      record.state = "RolledBack";
      removedCount += 1;
    } catch {
      record.state = "RollbackFailed";
      failedCount += 1;
    }
  }
  const temporaryCleanup = cleanupArtifactPaths(records.map(({ temporaryPath }) => temporaryPath), operations);
  return {
    attemptedCount: attemptedCount + temporaryCleanup.attemptedCount,
    removedCount: removedCount + temporaryCleanup.removedCount,
    failedCount: failedCount + temporaryCleanup.failedCount,
  };
}

export function rollbackPublishedArtifactPaths(
  paths: readonly PublicationPath[],
  operations: ReviewArtifactFileSystemOperations = nodeReviewArtifactFileSystemOperations,
): ArtifactCleanupResult {
  const finalCleanup = cleanupArtifactPaths([...paths].reverse().map(({ finalPath }) => finalPath), operations);
  const temporaryCleanup = cleanupArtifactPaths(paths.map(({ temporaryPath }) => temporaryPath), operations);
  return {
    attemptedCount: finalCleanup.attemptedCount + temporaryCleanup.attemptedCount,
    removedCount: finalCleanup.removedCount + temporaryCleanup.removedCount,
    failedCount: finalCleanup.failedCount + temporaryCleanup.failedCount,
  };
}

export function publishPreparedArtifactPaths(
  paths: readonly PublicationPath[],
  operations: ReviewArtifactFileSystemOperations = nodeReviewArtifactFileSystemOperations,
): ArtifactPublicationRecord[] {
  const records: ArtifactPublicationRecord[] = paths.map((path) => ({ ...path, state: "Prepared", finalCreated: false }));
  let publicationStateUnknown = false;
  try {
    for (const record of records) {
      let outcome: ExclusivePublicationOutcome;
      try {
        outcome = operations.publishNoReplace(record.temporaryPath, record.finalPath);
      } catch {
        publicationStateUnknown = true;
        record.state = "RollbackFailed";
        throw new ArtifactPublicationPartialFailure();
      }
      if (outcome.type === "DestinationExists") {
        throw new TaskReviewError("Review artifact destination already exists.", "ArtifactPublicationFailed");
      }
      if (outcome.type === "StateUnknown") {
        publicationStateUnknown = true;
        record.state = "RollbackFailed";
        throw new ArtifactPublicationPartialFailure();
      }
      record.finalCreated = true;
      record.state = "Published";
      if (calculateFileSha256(record.temporaryPath) !== calculateFileSha256(record.finalPath)) {
        throw new TaskReviewError("Published review artifact integrity verification failed.", "ArtifactPublicationFailed");
      }
      record.state = "Verified";
    }
    for (const record of records) {
      operations.remove(record.temporaryPath);
      record.state = "TemporaryCleaned";
    }
    return records;
  } catch (error) {
    const rollback = rollbackPublicationRecords(records, operations);
    if (publicationStateUnknown || rollback.failedCount > 0) throw new ArtifactPublicationPartialFailure();
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Review artifact publication failed.", "ArtifactPublicationFailed");
  }
}

export function publishPreparedArtifactPairs(
  pairs: readonly { readonly temporary: ArtifactPair; readonly final: ArtifactPair }[],
): void {
  publishPreparedArtifactPaths(pairs.flatMap(({ temporary, final }) => publicationPaths(temporary, final)));
}

export function verifyPublishedArtifactPair(pair: ArtifactPair): void {
  if (!existsSync(pair.archivePath) || !existsSync(pair.checksumPath)) {
    throw new TaskReviewError(`Published artifact pair is incomplete: ${basename(pair.archivePath)}`, "ArtifactPublicationFailed");
  }
  verifyArchiveChecksum(pair.archivePath, pair.checksumPath, basename(pair.archivePath));
}

export function verifyPublishedDesktopArtifactSet(
  set: DesktopArtifactSet,
  sourceReportSha256: string,
  bundledReportSha256: string,
): void {
  if (artifactSetPaths(set).some((path) => !existsSync(path) || statSync(path).size === 0)) {
    throw new TaskReviewError("Published Desktop artifact set is incomplete.", "ArtifactPublicationFailed");
  }
  const desktopReportSha256 = calculateFileSha256(set.reportPath);
  if (desktopReportSha256 !== sourceReportSha256 || desktopReportSha256 !== bundledReportSha256) {
    throw new TaskReviewError("Published Desktop Final Report integrity verification failed.", "ArtifactPublicationFailed");
  }
  verifyArchiveChecksum(set.archivePath, set.checksumPath, basename(set.archivePath));
}

export function cleanupTemporaryArtifactPair(pair: ArtifactPair | null | undefined): void {
  if (!pair) return;
  const cleanup = cleanupArtifactPaths([pair.archivePath, pair.checksumPath]);
  if (cleanup.failedCount > 0) throw new ArtifactPublicationPartialFailure();
}

export function cleanupDesktopArtifactSet(set: DesktopArtifactSet | null | undefined): void {
  if (!set) return;
  const cleanup = cleanupArtifactPaths(artifactSetPaths(set));
  if (cleanup.failedCount > 0) throw new ArtifactPublicationPartialFailure();
}

export function exportReviewArchive(
  archivePath: string,
  outputDirectory = resolveDesktopReviewDirectory(),
  now = new Date(),
): ArtifactPair {
  const invocationId = createReviewInvocationId();
  const finalPair = resolveCollisionSafeArtifactPair(outputDirectory, basename(archivePath), now);
  const temporaryPair = resolveTemporaryArtifactPair(finalPair, invocationId);
  const ownedTemporaryPaths = new Set<string>();
  const publication = publicationPaths(temporaryPair, finalPair);
  let publicationCompleted = false;
  try {
    prepareDesktopArtifactPair(archivePath, temporaryPair, finalPair, (path) => ownedTemporaryPaths.add(path));
    publishPreparedArtifactPaths(publication);
    publicationCompleted = true;
    verifyPublishedArtifactPair(finalPair);
    return finalPair;
  } catch (error) {
    if (error instanceof ArtifactPublicationPartialFailure) throw error;
    const cleanup = publicationCompleted
      ? rollbackPublishedArtifactPaths(publication)
      : cleanupArtifactPaths([...ownedTemporaryPaths]);
    if (cleanup.failedCount > 0) throw new ArtifactPublicationPartialFailure();
    throw error;
  }
}
