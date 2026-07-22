import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { calculateFileSha256 } from "./calculate-sha256";
import { collectChangedFiles } from "./collect-changed-files";
import { collectGitEvidence } from "./collect-git-evidence";
import { changedFingerprintPaths, collectRepositoryFingerprint } from "./collect-repository-fingerprint";
import { collectVerificationEvidence, validateSkippedVerificationCommands } from "./collect-verification-evidence";
import { copySourceFile } from "./copy-source-file";
import {
  createReviewArchive,
  verifyReviewArchive,
  verifyArchiveChecksum,
  writeArchiveChecksum,
  type ArchiveEntry,
} from "./create-review-archive";
import { createBundleFile, createReviewManifest, serializeReviewManifest } from "./create-review-manifest";
import {
  cleanupTemporaryArtifactPair,
  prepareDesktopArtifactPair,
  publishPreparedArtifactPairs,
  resolveCollisionSafeArtifactPair,
  resolveDesktopReviewDirectory,
  resolveTemporaryArtifactPair,
  verifyPublishedArtifactPair,
  type ArtifactPair,
} from "./export-review-archive";
import { parseTaskReviewArguments } from "./parse-task-review-arguments";
import {
  resolvePathInsideRepository,
  resolveRepositoryRoot,
  resolveSafeReviewOutputPath,
  toCanonicalPath,
} from "./resolve-repository-root";
import { sanitizeTextEvidence } from "./sanitize-text-evidence";
import { TaskReviewError } from "./task-review.errors";
import type { TaskReviewBundleFile, TaskReviewChangedFile, TaskReviewVerificationResult } from "./task-review.types";
import type { VerificationExecution } from "./run-verification-command";

interface BundleDependencies {
  readonly clock?: () => Date;
  readonly exportDirectory?: string;
  readonly collectVerification?: typeof collectVerificationEvidence;
  readonly afterLocalPreparation?: () => void | Promise<void>;
  readonly afterDesktopPreparation?: () => void | Promise<void>;
  readonly writeChecksum?: typeof writeArchiveChecksum;
  readonly prepareDesktop?: typeof prepareDesktopArtifactPair;
}

function mergeCounts(target: Record<string, number>, source: Readonly<Record<string, number>>): void {
  for (const [category, count] of Object.entries(source)) target[category] = (target[category] ?? 0) + count;
}

function writeSanitized(path: string, value: string, redactions: Record<string, number>) {
  const result = sanitizeTextEvidence(value);
  mergeCounts(redactions, result.byCategory);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, result.text, "utf8");
  return { ...result, sha256: calculateFileSha256(path) };
}

function listFiles(root: string): string[] {
  const found: string[] = [];
  const visit = (directory: string) => {
    for (const name of readdirSync(directory).sort()) {
      const absolute = join(directory, name);
      const stat = statSync(absolute);
      if (stat.isDirectory()) visit(absolute);
      else found.push(absolute);
    }
  };
  visit(root);
  return found;
}

function finalizedVerificationResults(
  executions: readonly VerificationExecution[],
  outputRoot: string,
  redactions: Record<string, number>,
): TaskReviewVerificationResult[] {
  return executions.map((execution) => {
    if (execution.result.skipped || !execution.result.bundledEvidence.path) return execution.result;
    const path = execution.result.bundledEvidence.path;
    const sanitized = writeSanitized(join(outputRoot, ...path.split("/")), execution.combined, redactions);
    const redactionCount = Object.values(sanitized.byCategory).reduce((total, count) => total + count, 0);
    return {
      ...execution.result,
      bundledEvidence: { path, sanitizedSha256: sanitized.sha256, redactionCount },
    };
  });
}

function recheckExactSources(
  repositoryRoot: string,
  outputRoot: string,
  changedFiles: readonly TaskReviewChangedFile[],
): void {
  for (const file of changedFiles.filter((candidate) => candidate.copied)) {
    const source = join(repositoryRoot, ...file.path.split("/"));
    const bundled = join(outputRoot, "source-files", ...file.path.split("/"));
    const sourceHash = calculateFileSha256(source);
    const bundleHash = calculateFileSha256(bundled);
    if (sourceHash !== file.sourceSha256 || bundleHash !== file.bundleSha256 || sourceHash !== bundleHash) {
      throw new TaskReviewError(`Source changed before archive creation: ${file.path}`, "WorkingTreeChangedDuringVerification");
    }
  }
}

export async function createTaskReviewBundle(argv: readonly string[], dependencies: BundleDependencies = {}) {
  const arguments_ = parseTaskReviewArguments(argv);
  validateSkippedVerificationCommands(arguments_.skippedCommandKeys);
  const repositoryRoot = resolveRepositoryRoot();
  const reportAbsolutePath = resolvePathInsideRepository(repositoryRoot, arguments_.reportPath);
  const reportRepositoryPath = toCanonicalPath(relative(repositoryRoot, reportAbsolutePath));
  const outputCandidate = arguments_.output ?? join("artifacts", "task-reviews", arguments_.taskId);
  const outputAbsolutePath = resolveSafeReviewOutputPath(repositoryRoot, outputCandidate);
  if (existsSync(outputAbsolutePath)) throw new TaskReviewError("The bundle output directory already exists.", "BundleFailed");

  const generatedAt = (dependencies.clock ?? (() => new Date()))().toISOString();
  const initialFingerprint = collectRepositoryFingerprint(repositoryRoot, reportRepositoryPath);
  const collectVerification = dependencies.collectVerification ?? collectVerificationEvidence;
  const verification = await collectVerification(repositoryRoot, arguments_.skippedCommandKeys);
  const finalFingerprint = collectRepositoryFingerprint(repositoryRoot, reportRepositoryPath);
  if (initialFingerprint.sha256 !== finalFingerprint.sha256) {
    const paths = changedFingerprintPaths(initialFingerprint, finalFingerprint);
    throw new TaskReviewError(
      `Working tree changed during verification: ${paths.join(", ") || reportRepositoryPath}`,
      "WorkingTreeChangedDuringVerification",
    );
  }

  const git = collectGitEvidence(repositoryRoot, arguments_.baseRef);
  const originalChangedFiles = collectChangedFiles(repositoryRoot);
  const changedFiles: TaskReviewChangedFile[] = [];
  mkdirSync(outputAbsolutePath, { recursive: true });
  for (const file of originalChangedFiles) {
    if (!file.copied) changedFiles.push(file);
    else {
      const copied = copySourceFile(repositoryRoot, outputAbsolutePath, file.path);
      changedFiles.push({ ...file, sourceSha256: copied.sourceSha256, bundleSha256: copied.bundleSha256 });
    }
  }

  const redactions: Record<string, number> = {};
  const reportBundlePath = "report/final-report.md";
  writeSanitized(join(outputAbsolutePath, reportBundlePath), readFileSync(reportAbsolutePath, "utf8"), redactions);
  const gitFiles: Readonly<Record<string, string>> = {
    "branch.txt": `${git.branch}\n`,
    "head.txt": `${git.head}\n`,
    "base-ref.txt": `${git.baseRef ?? ""}\n`,
    "initial-fingerprint.txt": `${initialFingerprint.sha256}\n`,
    "final-fingerprint.txt": `${finalFingerprint.sha256}\n`,
    "status-short.txt": git.statusShort,
    "unstaged-diff-name-status.txt": git.unstagedNameStatus,
    "staged-diff-name-status.txt": git.stagedNameStatus,
    ...(git.baseRefNameStatus === null ? {} : { "base-ref-diff-name-status.txt": git.baseRefNameStatus }),
    "unstaged-diff-stat.txt": git.unstagedStat,
    "staged-diff-stat.txt": git.stagedStat,
    ...(git.baseRefStat === null ? {} : { "base-ref-diff-stat.txt": git.baseRefStat }),
    "integrity-unstaged.txt": git.integrity.unstaged.output,
    "integrity-staged.txt": git.integrity.staged.output,
    "integrity-untracked.txt": git.integrity.untracked.output,
    ...(git.integrity.baseRef ? { "integrity-base-ref.txt": git.integrity.baseRef.output } : {}),
    "changed-files.json": `${JSON.stringify(changedFiles, null, 2)}\n`,
  };
  for (const [name, content] of Object.entries(gitFiles)) writeSanitized(join(outputAbsolutePath, "git", name), content, redactions);
  const verificationResults = finalizedVerificationResults(verification.executions, outputAbsolutePath, redactions);

  const readme = `# QSC Task Review Bundle\n\nTask: ${arguments_.taskId}\n\nEvidence reflects the unchanged repository state after verification. status-short.txt and changed-files.json are authoritative for untracked files; staged, unstaged, untracked-integrity, and optional base-reference evidence are labelled separately. Source files are byte-exact. The manifest covers every archive payload except itself, and the detached .sha256 file authenticates the ZIP.\n\n## حزمة مراجعة مهمة QSC\n\nتعكس الأدلة حالة المستودع النهائية غير المتغيرة بعد التحقق. يمثل status-short.txt وchanged-files.json المصدر الموثوق للملفات غير المتتبعة، وتُفصل أدلة التغييرات المرحلية وغير المرحلية وسلامة الملفات غير المتتبعة والمرجع الأساسي. ملفات المصدر مطابقة بايتًا، ويغطي البيان كل حمولة باستثناء نفسه، ويوثق ملف .sha256 سلامة ZIP.\n`;
  writeSanitized(join(outputAbsolutePath, "README.md"), readme, redactions);

  recheckExactSources(repositoryRoot, outputAbsolutePath, changedFiles);
  const sourceOriginalHashes = new Map(
    changedFiles.filter((file) => file.bundleSha256).map((file) => [`source-files/${file.path}`, file.sourceSha256!]),
  );
  const bundleFiles: TaskReviewBundleFile[] = listFiles(outputAbsolutePath).map((absolutePath) => {
    const path = toCanonicalPath(relative(outputAbsolutePath, absolutePath));
    const type = path.startsWith("source-files/") ? "SourceExact" : path === "README.md" ? "Generated" : "EvidenceSanitized";
    return createBundleFile(absolutePath, path, type, sourceOriginalHashes.get(path));
  });
  const manifest = createReviewManifest({
    taskId: arguments_.taskId,
    generatedAt,
    branch: git.branch,
    headCommit: git.head,
    baseRef: git.baseRef,
    workingTreeClean: originalChangedFiles.length === 0,
    initialFingerprintSha256: initialFingerprint.sha256,
    finalFingerprintSha256: finalFingerprint.sha256,
    gitIntegrity: {
      unstaged: {
        exitCode: git.integrity.unstaged.exitCode,
        evidencePath: git.integrity.unstaged.evidencePath,
        passed: git.integrity.unstaged.passed,
      },
      staged: {
        exitCode: git.integrity.staged.exitCode,
        evidencePath: git.integrity.staged.evidencePath,
        passed: git.integrity.staged.passed,
      },
      untracked: {
        exitCode: git.integrity.untracked.exitCode,
        evidencePath: git.integrity.untracked.evidencePath,
        passed: git.integrity.untracked.passed,
      },
      ...(git.integrity.baseRef
        ? {
            baseRef: {
              exitCode: git.integrity.baseRef.exitCode,
              evidencePath: git.integrity.baseRef.evidencePath,
              passed: git.integrity.baseRef.passed,
            },
          }
        : {}),
      passed: git.integrity.passed,
    },
    reportRepositoryPath,
    reportBundlePath,
    reportSha256: calculateFileSha256(join(outputAbsolutePath, reportBundlePath)),
    changedFiles,
    verification: verificationResults,
    redactions,
    bundleFiles,
  });
  writeFileSync(join(outputAbsolutePath, "manifest.json"), serializeReviewManifest(manifest), "utf8");
  recheckExactSources(repositoryRoot, outputAbsolutePath, changedFiles);

  const archiveDirectory = dirname(outputAbsolutePath);
  const archiveEntries: ArchiveEntry[] = listFiles(outputAbsolutePath).map((absolutePath) => ({
    absolutePath,
    path: toCanonicalPath(relative(outputAbsolutePath, absolutePath)),
  }));
  const publicationTime = dependencies.clock?.() ?? new Date();
  const localFinal = resolveCollisionSafeArtifactPair(
    archiveDirectory,
    `QSC-Task-${arguments_.taskId}-Review.zip`,
    publicationTime,
  );
  const localTemporary = resolveTemporaryArtifactPair(localFinal);
  let desktopFinal: ArtifactPair | null = null;
  let desktopTemporary: ArtifactPair | null = null;
  let published = false;
  try {
    createReviewArchive(archiveEntries, localTemporary.archivePath);
    verifyReviewArchive(localTemporary.archivePath, archiveEntries.map(({ path }) => path));
    const writeChecksum = dependencies.writeChecksum ?? writeArchiveChecksum;
    writeChecksum(localTemporary.archivePath, localTemporary.checksumPath, basename(localFinal.archivePath));
    verifyArchiveChecksum(localTemporary.archivePath, localTemporary.checksumPath, basename(localFinal.archivePath));
    await dependencies.afterLocalPreparation?.();
    const localPreparedFingerprint = collectRepositoryFingerprint(repositoryRoot, reportRepositoryPath);
    if (localPreparedFingerprint.sha256 !== finalFingerprint.sha256) {
      const paths = changedFingerprintPaths(finalFingerprint, localPreparedFingerprint);
      throw new TaskReviewError(
        `Working tree changed during bundle creation: ${paths.join(", ") || reportRepositoryPath}`,
        "WorkingTreeChangedDuringBundleCreation",
      );
    }

    if (arguments_.desktopExport) {
      const desktopDirectory = dependencies.exportDirectory ?? resolveDesktopReviewDirectory();
      desktopFinal = resolveCollisionSafeArtifactPair(desktopDirectory, basename(localFinal.archivePath), publicationTime);
      desktopTemporary = resolveTemporaryArtifactPair(desktopFinal);
      const prepareDesktop = dependencies.prepareDesktop ?? prepareDesktopArtifactPair;
      prepareDesktop(localTemporary.archivePath, desktopTemporary, desktopFinal);
      await dependencies.afterDesktopPreparation?.();
    }

    const preparedFingerprint = collectRepositoryFingerprint(repositoryRoot, reportRepositoryPath);
    if (preparedFingerprint.sha256 !== finalFingerprint.sha256) {
      const paths = changedFingerprintPaths(finalFingerprint, preparedFingerprint);
      throw new TaskReviewError(
        `Working tree changed during bundle creation: ${paths.join(", ") || reportRepositoryPath}`,
        "WorkingTreeChangedDuringBundleCreation",
      );
    }

    const pairs = [
      { temporary: localTemporary, final: localFinal },
      ...(desktopFinal && desktopTemporary ? [{ temporary: desktopTemporary, final: desktopFinal }] : []),
    ];
    publishPreparedArtifactPairs(pairs);
    published = true;
    verifyPublishedArtifactPair(localFinal);
    if (desktopFinal) {
      verifyPublishedArtifactPair(desktopFinal);
      if (calculateFileSha256(localFinal.archivePath) !== calculateFileSha256(desktopFinal.archivePath)) {
        throw new TaskReviewError("Published local and Desktop ZIP files differ.", "ArtifactPublicationFailed");
      }
    }
    const publishedFingerprint = collectRepositoryFingerprint(repositoryRoot, reportRepositoryPath);
    if (publishedFingerprint.sha256 !== finalFingerprint.sha256) {
      const paths = changedFingerprintPaths(finalFingerprint, publishedFingerprint);
      throw new TaskReviewError(
        `Working tree changed during bundle creation: ${paths.join(", ") || reportRepositoryPath}`,
        "WorkingTreeChangedDuringBundleCreation",
      );
    }
    return { outputPath: outputAbsolutePath, archivePath: localFinal.archivePath, checksumPath: localFinal.checksumPath, exported: desktopFinal, manifest };
  } catch (error) {
    cleanupTemporaryArtifactPair(localTemporary);
    cleanupTemporaryArtifactPair(desktopTemporary);
    if (published) {
      rmSync(localFinal.archivePath, { force: true });
      rmSync(localFinal.checksumPath, { force: true });
      if (desktopFinal) {
        rmSync(desktopFinal.archivePath, { force: true });
        rmSync(desktopFinal.checksumPath, { force: true });
      }
    }
    if (error instanceof TaskReviewError) throw error;
    throw new TaskReviewError("Review artifact preparation failed.", "ArtifactPreparationFailed");
  }
}

async function main(): Promise<void> {
  try {
    const result = await createTaskReviewBundle(process.argv.slice(2));
    process.stdout.write(`Repository bundle: ${result.outputPath}\nRepository ZIP: ${result.archivePath}\nRepository checksum: ${result.checksumPath}\n`);
    if (result.exported) {
      process.stdout.write(`Exported ZIP: ${result.exported.archivePath}\nExported checksum: ${result.exported.checksumPath}\n`);
    }
    process.stdout.write(`Status: ${result.manifest.overallStatus}\n`);
    if (result.manifest.overallStatus === "VerificationFailed") process.exitCode = 1;
  } catch (error) {
    const safe = error instanceof TaskReviewError ? `${error.code}: ${error.message}` : "BundleFailed: Unexpected task review failure.";
    process.stderr.write(`${safe}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();
