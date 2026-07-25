import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { calculateFileSha256 } from "../calculate-sha256";
import { createTaskReviewBundle } from "../create-task-review-bundle";
import {
  nodeReviewArtifactFileSystemOperations,
  preflightDesktopReviewDirectory,
  type ReviewArtifactFileSystemOperations,
} from "../export-review-archive";
import { runVerificationCommand, type VerificationExecution } from "../run-verification-command";
import { ArtifactPublicationPartialFailure } from "../task-review.errors";

function initializeRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-e2e-"));
  const git = (args: string[]) => execFileSync("git", args, { cwd: repository, stdio: "ignore" });
  git(["init"]); git(["config", "user.email", "test@example.invalid"]); git(["config", "user.name", "Test"]);
  writeFileSync(join(repository, ".gitignore"), "artifacts/task-reviews/\n");
  mkdirSync(join(repository, "docs"));
  writeFileSync(join(repository, "tracked.ts"), "export const value = 1;\n");
  git(["add", "."]); git(["commit", "-m", "base"]);
  writeFileSync(join(repository, "tracked.ts"), "export const value = 2;\n");
  writeFileSync(join(repository, "untracked.ts"), "export const added = true;\n");
  writeFileSync(join(repository, "docs", "report.md"), "Final report\n");
  return repository;
}

function recursiveFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (path: string) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) visit(child);
      else files.push(child);
    }
  };
  visit(root);
  return files;
}

async function executions(repository: string, requiredExit = 0): Promise<VerificationExecution[]> {
  const url = `${"postgresql"}://user:${"runtime-secret"}@host/database`;
  const required = await runVerificationCommand({
    key: "required", command: process.execPath, args: ["-e", `console.log(${JSON.stringify(url)});process.exit(${requiredExit})`], required: true, timeoutMs: 2_000,
  }, repository);
  const optional = await runVerificationCommand({
    key: "audit-runtime", command: process.execPath, args: ["-e", "process.exit(1)"], required: false, timeoutMs: 2_000,
  }, repository);
  return [required, optional];
}

test("full orchestration uses final state, sanitized hashes, sidecars, collisions, and no Git writes", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  try {
    const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-export-"));
    writeFileSync(join(exportDirectory, "QSC-Task-E2E-Review.zip"), "existing");
    const result = await createTaskReviewBundle(
      ["--task=E2E", "--report=docs/report.md", "--output=artifacts/task-reviews/e2e"],
      {
        clock: () => new Date("2026-07-22T04:15:30Z"),
        exportDirectory,
        collectVerification: async () => {
          const items = await executions(repository);
          return { executions: items, results: items.map(({ result }) => result) };
        },
      },
    );
    assert.equal(result.manifest.overallStatus, "ReadyForReview");
    assert.equal(result.manifest.schemaVersion, "1.1.0");
    assert.ok(result.manifest.changedFiles.some(({ path }) => path === "tracked.ts"));
    assert.ok(result.manifest.changedFiles.some(({ path }) => path === "untracked.ts"));
    assert.equal(result.manifest.changedFiles.some(({ path }) => path.startsWith("artifacts/")), false);
    const required = result.manifest.verification.find(({ key }) => key === "required")!;
    const evidence = join(result.outputPath, ...required.bundledEvidence.path!.split("/"));
    assert.equal(calculateFileSha256(evidence), required.bundledEvidence.sanitizedSha256);
    assert.ok(required.bundledEvidence.redactionCount > 0);
    assert.equal(readFileSync(evidence, "utf8").includes("runtime-secret"), false);
    assert.notEqual(required.rawOutputHashes.combinedSha256, required.bundledEvidence.sanitizedSha256);
    assert.equal(result.manifest.redactions.total, required.bundledEvidence.redactionCount);
    assert.ok(existsSync(result.checksumPath));
    assert.ok(result.exported!.archivePath.includes("20260722T041530Z"));
    assert.ok(result.exported!.reportPath.includes("20260722T041530Z"));
    assert.ok(existsSync(result.exported!.reportPath));
    assert.ok(existsSync(result.exported!.checksumPath));
    assert.deepEqual(readFileSync(result.exported!.reportPath), readFileSync(join(repository, "docs", "report.md")));
    assert.equal(calculateFileSha256(result.exported!.reportPath), result.manifest.report.sha256);
    assert.equal(recursiveFiles(repository).some((path) => path.endsWith(".review-temp")), false);
    assert.equal(recursiveFiles(exportDirectory).some((path) => path.endsWith(".review-temp")), false);
    assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repository, encoding: "utf8" }), "");

    const failed = await createTaskReviewBundle(
      ["--task=E2E-FAIL", "--report=docs/report.md", "--output=artifacts/task-reviews/fail", "--no-desktop-export"],
      { collectVerification: async () => { const items = await executions(repository, 2); return { executions: items, results: items.map(({ result }) => result) }; } },
    );
    assert.equal(failed.manifest.overallStatus, "VerificationFailed");

    writeFileSync(join(repository, "tracked.ts"), "export const value = 3;  \n");
    const whitespace = await createTaskReviewBundle(
      ["--task=E2E-DIFF", "--report=docs/report.md", "--output=artifacts/task-reviews/diff", "--no-desktop-export"],
      { collectVerification: async () => ({ executions: [], results: [] }) },
    );
    assert.equal(whitespace.manifest.gitIntegrity.passed, false);
    assert.equal(whitespace.manifest.overallStatus, "VerificationFailed");
  } finally {
    process.chdir(previous);
  }
});

test("working-tree mutation during verification fails before source collection", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=MUTATION", "--report=docs/report.md", "--output=artifacts/task-reviews/mutation", "--no-desktop-export"],
        { collectVerification: async () => { writeFileSync(join(repository, "untracked.ts"), "changed during verification\n"); return { executions: [], results: [] }; } },
      ),
      /Working tree changed during verification: untracked\.ts/,
    );
    assert.equal(existsSync(join(repository, "artifacts", "task-reviews", "mutation")), false);
  } finally {
    process.chdir(previous);
  }
});

test("working-tree mutation during archive or export fails after evidence creation", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=POST-ARCHIVE", "--report=docs/report.md", "--output=artifacts/task-reviews/post-archive", "--no-desktop-export"],
        {
          collectVerification: async () => ({ executions: [], results: [] }),
          afterLocalPreparation: () => writeFileSync(join(repository, "tracked.ts"), "changed during archive\n"),
        },
      ),
      /Working tree changed during bundle creation: tracked\.ts/,
    );
    const artifactRoot = join(repository, "artifacts", "task-reviews");
    assert.equal(recursiveFiles(artifactRoot).some((path) => path.includes("QSC-Task-POST-ARCHIVE-Review")), false);
    assert.equal(recursiveFiles(artifactRoot).some((path) => path.endsWith(".review-temp")), false);
    assert.equal(readFileSync(join(repository, "tracked.ts"), "utf8"), "changed during archive\n");
  } finally {
    process.chdir(previous);
  }
});

test("one invocation ID owns preflight plus all five local and Desktop temporaries", async () => {
  const repository = initializeRepository();
  const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-invocation-e2e-"));
  const previous = process.cwd();
  const invocationId = "c".repeat(32);
  const publishedTemporaryNames: string[] = [];
  let preflightInvocationId: string | null = null;
  process.chdir(repository);
  try {
    await createTaskReviewBundle(
      ["--task=INVOCATION-ID", "--report=docs/report.md", "--output=artifacts/task-reviews/invocation-id"],
      {
        invocationId,
        exportDirectory,
        preflightDesktop: (directory, receivedInvocationId) => {
          preflightInvocationId = receivedInvocationId;
          preflightDesktopReviewDirectory(directory, receivedInvocationId);
        },
        publicationFileSystem: {
          publishNoReplace: (temporaryPath, finalPath) => {
            publishedTemporaryNames.push(temporaryPath);
            return nodeReviewArtifactFileSystemOperations.publishNoReplace(temporaryPath, finalPath);
          },
          remove: nodeReviewArtifactFileSystemOperations.remove,
        },
        collectVerification: async () => ({ executions: [], results: [] }),
      },
    );
    assert.equal(preflightInvocationId, invocationId);
    assert.equal(publishedTemporaryNames.length, 5);
    assert.ok(publishedTemporaryNames.every((path) => basename(path).includes(invocationId)));
  } finally {
    process.chdir(previous);
  }
});

test("Desktop preflight failure is sanitized and happens before expensive verification", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  let verificationStarted = false;
  try {
    const blockingFile = join(repository, "desktop-blocker");
    writeFileSync(blockingFile, "not a directory");
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=PREFLIGHT", "--report=docs/report.md", "--output=artifacts/task-reviews/preflight"],
        {
          exportDirectory: join(blockingFile, "QSC-Reviews"),
          collectVerification: async () => {
            verificationStarted = true;
            return { executions: [], results: [] };
          },
        },
      ),
      (error: unknown) => error instanceof Error && error.message === "Desktop export directory is not writable.",
    );
    assert.equal(verificationStarted, false);
    assert.equal(existsSync(join(repository, "artifacts", "task-reviews", "preflight")), false);
  } finally {
    process.chdir(previous);
  }
});

test("Final Report mutation after Desktop preparation blocks publication and cleans both destinations", async () => {
  const repository = initializeRepository();
  const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-report-mutation-"));
  const previous = process.cwd();
  process.chdir(repository);
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=REPORT-MUTATION", "--report=docs/report.md", "--output=artifacts/task-reviews/report-mutation"],
        {
          exportDirectory,
          collectVerification: async () => ({ executions: [], results: [] }),
          afterDesktopPreparation: () => writeFileSync(join(repository, "docs", "report.md"), "changed after bundling\n"),
        },
      ),
      /Working tree changed during bundle creation: docs\/report\.md/,
    );
    assert.equal(recursiveFiles(exportDirectory).length, 0);
    assert.equal(recursiveFiles(join(repository, "artifacts", "task-reviews")).some((path) => path.includes("QSC-Task-REPORT-MUTATION")), false);
  } finally {
    process.chdir(previous);
  }
});

test("post-publication verification plus rollback failure reports sanitized reconciliation and attempts every cleanup", async () => {
  const repository = initializeRepository();
  const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-post-verify-partial-"));
  const previous = process.cwd();
  process.chdir(repository);
  const removalAttempts: string[] = [];
  let temporaryRemovalCount = 0;
  let publicationFinished = false;
  const desktopReport = join(exportDirectory, "QSC-Task-POST-VERIFY-PARTIAL-Final-Report.md");
  const desktopZip = join(exportDirectory, "QSC-Task-POST-VERIFY-PARTIAL-Review.zip");
  const operations: ReviewArtifactFileSystemOperations = {
    publishNoReplace: nodeReviewArtifactFileSystemOperations.publishNoReplace,
    remove: (path) => {
      removalAttempts.push(path);
      if (publicationFinished && path === desktopZip) throw new Error(`raw locked path ${path}`);
      nodeReviewArtifactFileSystemOperations.remove(path);
      if (path.endsWith(".review-temp")) {
        temporaryRemovalCount += 1;
        if (temporaryRemovalCount === 5) {
          publicationFinished = true;
          writeFileSync(desktopReport, "corrupted after generic publication verification\n");
        }
      }
    },
  };
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=POST-VERIFY-PARTIAL", "--report=docs/report.md", "--output=artifacts/task-reviews/post-verify-partial"],
        {
          exportDirectory,
          publicationFileSystem: operations,
          collectVerification: async () => ({ executions: [], results: [] }),
        },
      ),
      (error: unknown) => error instanceof ArtifactPublicationPartialFailure
        && error.operation === "publish-review-artifacts"
        && error.reconciliationRequired
        && error.message === "Review artifact publication requires reconciliation."
        && !error.message.includes(repository)
        && !error.message.includes("raw locked path"),
    );
    const localRoot = join(repository, "artifacts", "task-reviews");
    const expectedFinals = [
      join(localRoot, "QSC-Task-POST-VERIFY-PARTIAL-Review.zip"),
      join(localRoot, "QSC-Task-POST-VERIFY-PARTIAL-Review.zip.sha256"),
      desktopReport,
      desktopZip,
      `${desktopZip}.sha256`,
    ];
    for (const path of expectedFinals) assert.ok(removalAttempts.includes(path));
    assert.equal(expectedFinals.filter(existsSync).length, 1);
    assert.equal(existsSync(desktopZip), true);
    nodeReviewArtifactFileSystemOperations.remove(desktopZip);
  } finally {
    process.chdir(previous);
  }
});

test("Desktop-temporary mutation cleans both destinations without touching the source change", async () => {
  const repository = initializeRepository();
  const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-r3-export-mutation-"));
  const previous = process.cwd();
  process.chdir(repository);
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=EXPORT-MUTATION", "--report=docs/report.md", "--output=artifacts/task-reviews/export-mutation"],
        {
          exportDirectory,
          collectVerification: async () => ({ executions: [], results: [] }),
          afterDesktopPreparation: () => writeFileSync(join(repository, "tracked.ts"), "changed during export\n"),
        },
      ),
      /Working tree changed during bundle creation: tracked\.ts/,
    );
    assert.equal(recursiveFiles(join(repository, "artifacts", "task-reviews")).some((path) => path.includes("QSC-Task-EXPORT-MUTATION-Review")), false);
    assert.equal(recursiveFiles(exportDirectory).length, 0);
    assert.equal(readFileSync(join(repository, "tracked.ts"), "utf8"), "changed during export\n");
  } finally {
    process.chdir(previous);
  }
});

test("checksum and Desktop preparation failures publish no pair and preserve prior evidence", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  try {
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=CHECKSUM-FAIL", "--report=docs/report.md", "--output=artifacts/task-reviews/checksum-fail", "--no-desktop-export"],
        {
          collectVerification: async () => ({ executions: [], results: [] }),
          writeChecksum: () => { throw new Error("injected checksum failure"); },
        },
      ),
      /Review artifact preparation failed/,
    );
    assert.equal(recursiveFiles(join(repository, "artifacts", "task-reviews")).some((path) => path.includes("QSC-Task-CHECKSUM-FAIL-Review")), false);

    const exportDirectory = mkdtempSync(join(tmpdir(), "qsc-review-r3-export-fail-"));
    const priorReport = join(exportDirectory, "QSC-Task-DESKTOP-FAIL-Final-Report.md");
    const priorZip = join(exportDirectory, "QSC-Task-DESKTOP-FAIL-Review.zip");
    const priorChecksum = `${priorZip}.sha256`;
    writeFileSync(priorReport, "prior report");
    writeFileSync(priorZip, "prior zip");
    writeFileSync(priorChecksum, "prior checksum");
    await assert.rejects(
      createTaskReviewBundle(
        ["--task=DESKTOP-FAIL", "--report=docs/report.md", "--output=artifacts/task-reviews/desktop-fail"],
        {
          exportDirectory,
          collectVerification: async () => ({ executions: [], results: [] }),
          prepareDesktop: (_report, _archive, temporary, _final, _hash, onCreated) => {
            writeFileSync(temporary.reportPath, "invocation temporary report");
            onCreated?.(temporary.reportPath);
            throw new Error("injected Desktop failure");
          },
        },
      ),
      /Review artifact preparation failed/,
    );
    assert.equal(readFileSync(priorReport, "utf8"), "prior report");
    assert.equal(readFileSync(priorZip, "utf8"), "prior zip");
    assert.equal(readFileSync(priorChecksum, "utf8"), "prior checksum");
    assert.deepEqual(recursiveFiles(exportDirectory).sort(), [priorChecksum, priorReport, priorZip].sort());
    assert.equal(recursiveFiles(join(repository, "artifacts", "task-reviews")).some((path) => path.includes("QSC-Task-DESKTOP-FAIL-Review")), false);
  } finally {
    process.chdir(previous);
  }
});

test("no-Desktop mode publishes one verified local pair after stability checks", async () => {
  const repository = initializeRepository();
  const previous = process.cwd();
  process.chdir(repository);
  try {
    const result = await createTaskReviewBundle(
      ["--task=LOCAL-ONLY", "--report=docs/report.md", "--output=artifacts/task-reviews/local-only", "--no-desktop-export"],
      { collectVerification: async () => ({ executions: [], results: [] }) },
    );
    assert.equal(result.exported, null);
    assert.ok(existsSync(result.archivePath));
    assert.ok(existsSync(result.checksumPath));
    assert.equal(recursiveFiles(join(repository, "artifacts", "task-reviews")).some((path) => path.endsWith(".review-temp")), false);
  } finally {
    process.chdir(previous);
  }
});
