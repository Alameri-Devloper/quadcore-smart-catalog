import { statSync } from "node:fs";
import { calculateFileSha256 } from "./calculate-sha256";
import type {
  GitIntegrityCheck,
  TaskReviewBundleFile,
  TaskReviewChangedFile,
  TaskReviewManifest,
  TaskReviewVerificationResult,
} from "./task-review.types";

export function createBundleFile(
  absolutePath: string,
  path: string,
  type: TaskReviewBundleFile["type"],
  originalSha256?: string,
): TaskReviewBundleFile {
  return { path, type, byteSize: statSync(absolutePath).size, sha256: calculateFileSha256(absolutePath), originalSha256 };
}

export function createReviewManifest(input: {
  taskId: string;
  generatedAt: string;
  branch: string;
  headCommit: string;
  baseRef: string | null;
  workingTreeClean: boolean;
  initialFingerprintSha256: string;
  finalFingerprintSha256: string;
  gitIntegrity: {
    readonly unstaged: GitIntegrityCheck;
    readonly staged: GitIntegrityCheck;
    readonly untracked: GitIntegrityCheck;
    readonly baseRef?: GitIntegrityCheck;
    readonly passed: boolean;
  };
  reportRepositoryPath: string;
  reportBundlePath: string;
  reportSha256: string;
  changedFiles: readonly TaskReviewChangedFile[];
  verification: readonly TaskReviewVerificationResult[];
  redactions: Readonly<Record<string, number>>;
  bundleFiles: readonly TaskReviewBundleFile[];
}): TaskReviewManifest {
  const requiredFailure = input.verification.some(
    (result) => result.required && (result.skipped || result.exitCode !== 0 || result.termination !== "Exited"),
  );
  const byCategory = Object.fromEntries(Object.entries(input.redactions).sort(([left], [right]) => left.localeCompare(right)));
  return Object.freeze({
    schemaVersion: "1.1.0",
    project: "Quadcore Smart Catalog",
    taskId: input.taskId,
    generatedAt: input.generatedAt,
    platform: process.platform,
    nodeVersion: process.version,
    repository: {
      branch: input.branch,
      headCommit: input.headCommit,
      baseRef: input.baseRef,
      workingTreeClean: input.workingTreeClean,
      initialFingerprintSha256: input.initialFingerprintSha256,
      finalFingerprintSha256: input.finalFingerprintSha256,
    },
    gitIntegrity: input.gitIntegrity,
    report: {
      repositoryPath: input.reportRepositoryPath,
      sanitizedBundlePath: input.reportBundlePath,
      sha256: input.reportSha256,
    },
    changedFiles: [...input.changedFiles].sort((left, right) => left.path.localeCompare(right.path)),
    verification: [...input.verification],
    redactions: {
      total: Object.values(byCategory).reduce((total, count) => total + count, 0),
      byCategory,
    },
    bundleFiles: [...input.bundleFiles].sort((left, right) => left.path.localeCompare(right.path)),
    integrityCoverage: {
      rule: "AllArchivePayloadEntriesExceptManifest" as const,
      manifestPath: "manifest.json" as const,
      detachedArchiveChecksum: true as const,
    },
    overallStatus: requiredFailure || !input.gitIntegrity.passed ? "VerificationFailed" : "ReadyForReview",
  });
}

export function serializeReviewManifest(manifest: TaskReviewManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
