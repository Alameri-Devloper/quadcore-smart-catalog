import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { calculateFileSha256 } from "../calculate-sha256";
import { ArtifactPublicationPartialFailure } from "../task-review.errors";
import {
  cleanupDesktopArtifactSet,
  createReviewInvocationId,
  desktopPublicationPaths,
  nodeReviewArtifactFileSystemOperations,
  preflightDesktopReviewDirectory,
  prepareDesktopArtifactSet,
  publishPreparedArtifactPaths,
  resolveDesktopArtifactSet,
  resolveTemporaryArtifactPair,
  resolveTemporaryDesktopArtifactSet,
  verifyPublishedDesktopArtifactSet,
  type DesktopArtifactSet,
  type PublicationPath,
  type ReviewArtifactFileSystemOperations,
} from "../export-review-archive";

const fixedTime = new Date("2026-07-25T12:34:56Z");
const invocationA = "a".repeat(32);
const invocationB = "b".repeat(32);

function paths(set: DesktopArtifactSet): string[] {
  return [set.reportPath, set.archivePath, set.checksumPath];
}

test("preflights a writable directory and returns one sanitized error for an unwritable path", () => {
  const root = mkdtempSync(join(tmpdir(), "qsc-review-preflight-"));
  const writable = join(root, "desktop", "QSC-Reviews");
  preflightDesktopReviewDirectory(writable, invocationA);
  assert.deepEqual(paths(resolveDesktopArtifactSet(writable, "PREFLIGHT", fixedTime)).filter(existsSync), []);
  const unknownProbe = join(writable, `.qsc-review-preflight.${invocationA}.review-temp`);
  writeFileSync(unknownProbe, "unknown probe bytes");
  assert.throws(() => preflightDesktopReviewDirectory(writable, invocationA), /Desktop export directory is not writable/);
  assert.equal(readFileSync(unknownProbe, "utf8"), "unknown probe bytes");

  const blockingFile = join(root, "not-a-directory");
  writeFileSync(blockingFile, "blocked");
  assert.throws(
    () => preflightDesktopReviewDirectory(join(blockingFile, "QSC-Reviews"), invocationA),
    (error: unknown) => error instanceof Error && error.message === "Desktop export directory is not writable.",
  );
});

test("creates cryptographically random portable invocation identifiers", () => {
  const first = createReviewInvocationId();
  const second = createReviewInvocationId();
  assert.match(first, /^[a-f0-9]{32}$/);
  assert.match(second, /^[a-f0-9]{32}$/);
  assert.notEqual(first, second);
});

test("uses one shared timestamp when the report, ZIP, or checksum alone collides", () => {
  for (const collisionIndex of [0, 1, 2]) {
    const directory = mkdtempSync(join(tmpdir(), `qsc-review-collision-${collisionIndex}-`));
    const desired = resolveDesktopArtifactSet(directory, "COLLISION", fixedTime);
    writeFileSync(paths(desired)[collisionIndex], "historical");
    const resolved = resolveDesktopArtifactSet(directory, "COLLISION", fixedTime);
    for (const path of paths(resolved)) assert.match(basename(path), /-20260725T123456Z(?:\.md|\.zip|\.zip\.sha256)$/);
    assert.equal(readFileSync(paths(desired)[collisionIndex], "utf8"), "historical");
  }
});

test("uses a shared counter without overwriting timestamped historical artifacts", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-counter-"));
  const desired = resolveDesktopArtifactSet(directory, "COUNTER", fixedTime);
  writeFileSync(desired.reportPath, "historical base");
  const timestamped = resolveDesktopArtifactSet(directory, "COUNTER", fixedTime);
  for (const path of paths(timestamped)) writeFileSync(path, "historical timestamp");
  const counter = resolveDesktopArtifactSet(directory, "COUNTER", fixedTime);
  for (const path of paths(counter)) assert.match(basename(path), /-20260725T123456Z-2(?:\.md|\.zip|\.zip\.sha256)$/);
  assert.equal(readFileSync(desired.reportPath, "utf8"), "historical base");
  for (const path of paths(timestamped)) assert.equal(readFileSync(path, "utf8"), "historical timestamp");
});

test("prepares, publishes, and verifies exactly three byte-exact Desktop artifacts", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-three-artifacts-"));
  const sourceReport = join(directory, "source-report.md");
  const localArchive = join(directory, "local-review.zip.review-temp");
  writeFileSync(sourceReport, Buffer.from("# Final Report\r\n\r\nExact bytes.\r\n", "utf8"));
  writeFileSync(localArchive, Buffer.from([80, 75, 3, 4, 1, 2, 3, 4]));
  const output = join(directory, "desktop");
  mkdirSync(output);
  const finalSet = resolveDesktopArtifactSet(output, "EXACT", fixedTime);
  const temporarySet = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  const reportSha256 = calculateFileSha256(sourceReport);
  prepareDesktopArtifactSet(sourceReport, localArchive, temporarySet, finalSet, reportSha256);
  const records = publishPreparedArtifactPaths(desktopPublicationPaths(temporarySet, finalSet));
  verifyPublishedDesktopArtifactSet(finalSet, reportSha256, reportSha256);
  assert.deepEqual(readFileSync(finalSet.reportPath), readFileSync(sourceReport));
  assert.deepEqual(readFileSync(finalSet.archivePath), readFileSync(localArchive));
  assert.equal(paths(finalSet).filter(existsSync).length, 3);
  assert.equal(paths(temporarySet).filter(existsSync).length, 0);
  assert.ok(records.every(({ state }) => state === "TemporaryCleaned"));
});

test("rejects report hash drift and cleanup removes only invocation-owned temporary files", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-report-drift-"));
  const sourceReport = join(directory, "source-report.md");
  const localArchive = join(directory, "local.zip");
  writeFileSync(sourceReport, "original report\n");
  writeFileSync(localArchive, "archive bytes");
  const finalSet = resolveDesktopArtifactSet(directory, "DRIFT", fixedTime);
  const temporarySet = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  const originalHash = calculateFileSha256(sourceReport);
  writeFileSync(sourceReport, "changed report\n");
  assert.throws(
    () => prepareDesktopArtifactSet(sourceReport, localArchive, temporarySet, finalSet, originalHash),
    /Final Report source changed before Desktop export/,
  );
  cleanupDesktopArtifactSet(temporarySet);
  assert.equal(paths(temporarySet).some(existsSync), false);
  assert.equal(paths(finalSet).some(existsSync), false);
  assert.equal(readFileSync(sourceReport, "utf8"), "changed report\n");
});

test("partial final publication rolls back current files and preserves historical artifacts", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-publication-rollback-"));
  const historical = join(directory, "historical.zip");
  writeFileSync(historical, "historical bytes");
  const finalSet = resolveDesktopArtifactSet(directory, "ROLLBACK", fixedTime);
  const temporarySet = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  writeFileSync(temporarySet.reportPath, "report");
  // The missing ZIP temporary source forces failure after the report rename succeeds.
  writeFileSync(temporarySet.checksumPath, "checksum");
  assert.throws(() => publishPreparedArtifactPaths(desktopPublicationPaths(temporarySet, finalSet)), ArtifactPublicationPartialFailure);
  assert.equal(paths(finalSet).some(existsSync), false);
  assert.equal(readFileSync(historical, "utf8"), "historical bytes");
  cleanupDesktopArtifactSet(temporarySet);
  assert.equal(paths(temporarySet).some(existsSync), false);
});

test("builds portable filenames without embedded path separators", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-portable-names-"));
  const set = resolveDesktopArtifactSet(directory, "DEV-001_R4.test", fixedTime);
  assert.deepEqual(paths(set).map((path) => basename(path)), [
    "QSC-Task-DEV-001_R4.test-Final-Report.md",
    "QSC-Task-DEV-001_R4.test-Review.zip",
    "QSC-Task-DEV-001_R4.test-Review.zip.sha256",
  ]);
  for (const name of paths(set).map((path) => basename(path))) {
    assert.equal(name.includes("/"), false);
    assert.equal(name.includes("\\"), false);
  }
});

function writePrepared(paths_: readonly PublicationPath[], label: string): void {
  for (const [index, path] of paths_.entries()) writeFileSync(path.temporaryPath, `${label}-${index}`);
}

test("an artifact appearing after name resolution is never overwritten", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-late-collision-"));
  const finalSet = resolveDesktopArtifactSet(directory, "LATE", fixedTime);
  const temporarySet = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  const publication = desktopPublicationPaths(temporarySet, finalSet);
  writePrepared(publication, "candidate");
  writeFileSync(finalSet.reportPath, "historical report bytes");
  assert.throws(() => publishPreparedArtifactPaths(publication), /Review artifact destination already exists/);
  assert.equal(readFileSync(finalSet.reportPath, "utf8"), "historical report bytes");
  assert.equal(existsSync(finalSet.archivePath), false);
  assert.equal(existsSync(finalSet.checksumPath), false);
  assert.equal(publication.some(({ temporaryPath }) => existsSync(temporaryPath)), false);
});

test("two invocations resolve finals and unique temporaries before either prepares, then only one publishes", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-simultaneous-"));
  const firstFinal = resolveDesktopArtifactSet(directory, "SIMULTANEOUS", fixedTime);
  const secondFinal = resolveDesktopArtifactSet(directory, "SIMULTANEOUS", fixedTime);
  assert.deepEqual(firstFinal, secondFinal);
  const firstTemporary = resolveTemporaryDesktopArtifactSet(firstFinal, invocationA);
  const secondTemporary = resolveTemporaryDesktopArtifactSet(secondFinal, invocationB);
  assert.equal(paths(firstTemporary).some(existsSync), false);
  assert.equal(paths(secondTemporary).some(existsSync), false);
  assert.equal(paths(firstTemporary).some((path) => paths(secondTemporary).includes(path)), false);

  const firstReport = join(directory, "first-report.md");
  const firstArchive = join(directory, "first-local.zip");
  const secondReport = join(directory, "second-report.md");
  const secondArchive = join(directory, "second-local.zip");
  writeFileSync(firstReport, "first report bytes\n");
  writeFileSync(firstArchive, "first archive bytes");
  writeFileSync(secondReport, "second report bytes\n");
  writeFileSync(secondArchive, "second archive bytes");
  prepareDesktopArtifactSet(firstReport, firstArchive, firstTemporary, firstFinal, calculateFileSha256(firstReport));
  prepareDesktopArtifactSet(secondReport, secondArchive, secondTemporary, secondFinal, calculateFileSha256(secondReport));
  assert.deepEqual(readFileSync(firstTemporary.reportPath), readFileSync(firstReport));
  assert.deepEqual(readFileSync(secondTemporary.reportPath), readFileSync(secondReport));

  const unknownResidue = join(directory, ".unknown-owner.review-temp");
  writeFileSync(unknownResidue, "unknown residue");
  const firstPublication = desktopPublicationPaths(firstTemporary, firstFinal);
  const secondPublication = desktopPublicationPaths(secondTemporary, secondFinal);

  publishPreparedArtifactPaths(firstPublication);
  const firstHashes = paths(firstFinal).map(calculateFileSha256);
  assert.throws(() => publishPreparedArtifactPaths(secondPublication), /Review artifact destination already exists/);
  assert.deepEqual(paths(firstFinal).map(calculateFileSha256), firstHashes);
  assert.equal(secondPublication.some(({ temporaryPath }) => existsSync(temporaryPath)), false);
  assert.equal(readFileSync(unknownResidue, "utf8"), "unknown residue");
});

test("exclusive publication is no-clobber on the active Windows or POSIX filesystem", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-exclusive-platform-"));
  const temporary = join(directory, "candidate.review-temp");
  const final = join(directory, "historical.zip");
  writeFileSync(temporary, "candidate bytes");
  writeFileSync(final, "historical bytes");
  assert.deepEqual(nodeReviewArtifactFileSystemOperations.publishNoReplace(temporary, final), { type: "DestinationExists" });
  assert.equal(readFileSync(final, "utf8"), "historical bytes");
  assert.equal(readFileSync(temporary, "utf8"), "candidate bytes");
});

test("all local and Desktop temporary names share one portable invocation ID", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-invocation-names-"));
  const finalSet = resolveDesktopArtifactSet(directory, "PORTABLE", fixedTime);
  const desktopTemporary = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  const localFinal = { archivePath: join(directory, "local.zip"), checksumPath: join(directory, "local.zip.sha256") };
  const localTemporary = resolveTemporaryArtifactPair(localFinal, invocationA);
  const temporaryNames = [...paths(desktopTemporary), localTemporary.archivePath, localTemporary.checksumPath].map((path) => basename(path));
  assert.equal(temporaryNames.length, 5);
  for (const name of temporaryNames) {
    assert.ok(name.includes(invocationA));
    assert.match(name, /^[A-Za-z0-9._-]+$/);
    assert.ok(name.endsWith(".review-temp"));
  }
});

test("exclusive temporary preparation preserves a pre-existing unknown temporary", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-unknown-temp-"));
  const finalSet = resolveDesktopArtifactSet(directory, "UNKNOWN", fixedTime);
  const temporarySet = resolveTemporaryDesktopArtifactSet(finalSet, invocationA);
  const sourceReport = join(directory, "source.md");
  const localArchive = join(directory, "source.zip");
  writeFileSync(sourceReport, "new report\n");
  writeFileSync(localArchive, "new archive");
  writeFileSync(temporarySet.reportPath, "unknown historical temporary");
  const owned = new Set<string>();
  assert.throws(
    () => prepareDesktopArtifactSet(
      sourceReport,
      localArchive,
      temporarySet,
      finalSet,
      calculateFileSha256(sourceReport),
      (path) => owned.add(path),
    ),
    /Desktop temporary artifact preparation failed/,
  );
  assert.equal(owned.size, 0);
  assert.equal(readFileSync(temporarySet.reportPath, "utf8"), "unknown historical temporary");
});

test("throw-after-create publication is reconciliation-required and cleanup remains ownership-scoped", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-ambiguous-publish-"));
  const publication: PublicationPath[] = Array.from({ length: 3 }, (_, index) => ({
    temporaryPath: join(directory, `.candidate-${index}.${invocationA}.review-temp`),
    finalPath: join(directory, `final-${index}.zip`),
  }));
  writePrepared(publication, "candidate");
  const unknownResidue = join(directory, ".unknown-invocation.review-temp");
  writeFileSync(unknownResidue, "unknown bytes");
  let callCount = 0;
  const operations: ReviewArtifactFileSystemOperations = {
    publishNoReplace: (temporaryPath, finalPath) => {
      callCount += 1;
      const outcome = nodeReviewArtifactFileSystemOperations.publishNoReplace(temporaryPath, finalPath);
      if (callCount === 2) throw new Error(`raw throw after create ${finalPath}`);
      return outcome;
    },
    remove: nodeReviewArtifactFileSystemOperations.remove,
  };
  let thrown: unknown;
  try {
    publishPreparedArtifactPaths(publication, operations);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ArtifactPublicationPartialFailure);
  assert.equal(thrown.operation, "publish-review-artifacts");
  assert.equal(thrown.reconciliationRequired, true);
  assert.equal(thrown.message.includes(directory), false);
  assert.equal(thrown.message.includes(invocationA), false);
  assert.equal(existsSync(publication[0].finalPath), false);
  assert.equal(existsSync(publication[1].finalPath), true);
  assert.equal(existsSync(publication[2].finalPath), false);
  assert.equal(publication.some(({ temporaryPath }) => existsSync(temporaryPath)), false);
  assert.equal(readFileSync(unknownResidue, "utf8"), "unknown bytes");
  nodeReviewArtifactFileSystemOperations.remove(publication[1].finalPath);
});

test("rollback attempts every owned final and temporary before reporting reconciliation", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-partial-cleanup-"));
  const historical = join(directory, "historical.zip");
  writeFileSync(historical, "historical bytes");
  const publication: PublicationPath[] = Array.from({ length: 5 }, (_, index) => ({
    temporaryPath: join(directory, `candidate-${index}.review-temp`),
    finalPath: join(directory, `final-${index}.zip`),
  }));
  writePrepared(publication, "candidate");
  const removalAttempts: string[] = [];
  let publicationCount = 0;
  const operations: ReviewArtifactFileSystemOperations = {
    publishNoReplace: (temporaryPath, finalPath) => {
      publicationCount += 1;
      if (publicationCount === 4) throw new Error(`raw publish failure at ${finalPath}`);
      return nodeReviewArtifactFileSystemOperations.publishNoReplace(temporaryPath, finalPath);
    },
    remove: (path) => {
      removalAttempts.push(path);
      if (path === publication[1].finalPath) throw new Error(`raw cleanup failure at ${path}`);
      nodeReviewArtifactFileSystemOperations.remove(path);
    },
  };
  let thrown: unknown;
  try {
    publishPreparedArtifactPaths(publication, operations);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ArtifactPublicationPartialFailure);
  assert.equal(thrown.operation, "publish-review-artifacts");
  assert.equal(thrown.reconciliationRequired, true);
  assert.equal(thrown.message, "Review artifact publication requires reconciliation.");
  assert.equal(thrown.message.includes(directory), false);
  assert.equal(thrown.message.includes("raw cleanup failure"), false);
  for (const path of publication.slice(0, 3).map(({ finalPath }) => finalPath)) assert.ok(removalAttempts.includes(path));
  for (const path of publication.map(({ temporaryPath }) => temporaryPath)) assert.ok(removalAttempts.includes(path));
  assert.equal(readFileSync(historical, "utf8"), "historical bytes");
  nodeReviewArtifactFileSystemOperations.remove(publication[1].finalPath);
});

test("a one-shot temporary cleanup failure rolls back every final and reports a sanitized ordinary failure", () => {
  const directory = mkdtempSync(join(tmpdir(), "qsc-review-temp-cleanup-"));
  const publication: PublicationPath[] = Array.from({ length: 3 }, (_, index) => ({
    temporaryPath: join(directory, `candidate-${index}.review-temp`),
    finalPath: join(directory, `final-${index}.zip`),
  }));
  writePrepared(publication, "candidate");
  let injected = false;
  const operations: ReviewArtifactFileSystemOperations = {
    publishNoReplace: nodeReviewArtifactFileSystemOperations.publishNoReplace,
    remove: (path) => {
      if (!injected && path === publication[0].temporaryPath) {
        injected = true;
        throw new Error(`raw temporary cleanup failure at ${path}`);
      }
      nodeReviewArtifactFileSystemOperations.remove(path);
    },
  };
  assert.throws(
    () => publishPreparedArtifactPaths(publication, operations),
    (error: unknown) => error instanceof Error
      && error.message === "Review artifact publication failed."
      && !error.message.includes(directory),
  );
  for (const path of publication.flatMap(({ temporaryPath, finalPath }) => [temporaryPath, finalPath])) {
    assert.equal(existsSync(path), false);
  }
});
