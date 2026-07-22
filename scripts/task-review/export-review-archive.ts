import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { calculateFileSha256 } from "./calculate-sha256";
import { verifyArchiveChecksum, writeArchiveChecksum } from "./create-review-archive";
import { TaskReviewError } from "./task-review.errors";

export interface ArtifactPair {
  readonly archivePath: string;
  readonly checksumPath: string;
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
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
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

export function resolveTemporaryArtifactPair(finalPair: ArtifactPair): ArtifactPair {
  let suffix = ".review-temp";
  let archivePath = `${finalPair.archivePath}${suffix}`;
  let checksumPath = `${finalPair.checksumPath}${suffix}`;
  let counter = 2;
  while (existsSync(archivePath) || existsSync(checksumPath)) {
    suffix = `.${counter}.review-temp`;
    archivePath = `${finalPair.archivePath}${suffix}`;
    checksumPath = `${finalPair.checksumPath}${suffix}`;
    counter += 1;
  }
  return { archivePath, checksumPath };
}

export function prepareDesktopArtifactPair(localTemporaryArchive: string, temporaryPair: ArtifactPair, finalPair: ArtifactPair): void {
  try {
    copyFileSync(localTemporaryArchive, temporaryPair.archivePath);
    writeArchiveChecksum(temporaryPair.archivePath, temporaryPair.checksumPath, basename(finalPair.archivePath));
    verifyArchiveChecksum(temporaryPair.archivePath, temporaryPair.checksumPath, basename(finalPair.archivePath));
    if (calculateFileSha256(localTemporaryArchive) !== calculateFileSha256(temporaryPair.archivePath)) {
      throw new TaskReviewError("Desktop temporary ZIP differs from the local temporary ZIP.", "DesktopExportFailed");
    }
  } catch (error) {
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Desktop temporary artifact preparation failed.", "DesktopExportFailed");
  }
}

export function publishPreparedArtifactPairs(
  pairs: readonly { readonly temporary: ArtifactPair; readonly final: ArtifactPair }[],
): void {
  const promoted: string[] = [];
  try {
    for (const pair of pairs) {
      if (existsSync(pair.final.archivePath) || existsSync(pair.final.checksumPath)) {
        throw new TaskReviewError(`Artifact publication collision: ${basename(pair.final.archivePath)}`, "ArtifactPublicationFailed");
      }
    }
    for (const pair of pairs) {
      renameSync(pair.temporary.archivePath, pair.final.archivePath);
      promoted.push(pair.final.archivePath);
      renameSync(pair.temporary.checksumPath, pair.final.checksumPath);
      promoted.push(pair.final.checksumPath);
    }
  } catch (error) {
    for (const path of promoted.reverse()) rmSync(path, { force: true });
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Atomic review artifact publication failed.", "ArtifactPublicationFailed");
  }
}

export function verifyPublishedArtifactPair(pair: ArtifactPair): void {
  if (!existsSync(pair.archivePath) || !existsSync(pair.checksumPath)) {
    throw new TaskReviewError(`Published artifact pair is incomplete: ${basename(pair.archivePath)}`, "ArtifactPublicationFailed");
  }
  verifyArchiveChecksum(pair.archivePath, pair.checksumPath, basename(pair.archivePath));
}

export function cleanupTemporaryArtifactPair(pair: ArtifactPair | null | undefined): void {
  if (!pair) return;
  rmSync(pair.archivePath, { force: true });
  rmSync(pair.checksumPath, { force: true });
}

export function exportReviewArchive(
  archivePath: string,
  outputDirectory = resolveDesktopReviewDirectory(),
  now = new Date(),
): ArtifactPair {
  const finalPair = resolveCollisionSafeArtifactPair(outputDirectory, basename(archivePath), now);
  const temporaryPair = resolveTemporaryArtifactPair(finalPair);
  try {
    prepareDesktopArtifactPair(archivePath, temporaryPair, finalPair);
    publishPreparedArtifactPairs([{ temporary: temporaryPair, final: finalPair }]);
    verifyPublishedArtifactPair(finalPair);
    return finalPair;
  } catch (error) {
    cleanupTemporaryArtifactPair(temporaryPair);
    throw error;
  }
}
