import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { mkdtempSync } from "node:fs";
import { parseTaskReviewArguments } from "../parse-task-review-arguments";
import { resolvePathInsideRepository, resolveSafeReviewOutputPath, toCanonicalPath } from "../resolve-repository-root";
import { validateSkippedVerificationCommands } from "../collect-verification-evidence";

test("requires a safe task identifier and report argument", () => {
  assert.throws(() => parseTaskReviewArguments([]), /--task/);
  assert.throws(() => parseTaskReviewArguments(["--task=../bad", "--report=x"]), /--task/);
  assert.throws(() => parseTaskReviewArguments(["--task=DEV-001"]), /--report/);
  assert.throws(() => parseTaskReviewArguments(["--task=DEV-001", "--report=x", "--unknown=y"]), /Unknown/);
});

test("allows only ignored real output paths and rejects root, non-ignored, and junction escapes", () => {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-output-"));
  execFileSync("git", ["init"], { cwd: repository, stdio: "ignore" });
  writeFileSync(join(repository, ".gitignore"), "artifacts/task-reviews/\ncustom-review/\n");
  assert.equal(resolveSafeReviewOutputPath(repository, "artifacts/task-reviews/TASK"), join(repository, "artifacts", "task-reviews", "TASK"));
  assert.equal(resolveSafeReviewOutputPath(repository, "custom-review/TASK"), join(repository, "custom-review", "TASK"));
  assert.throws(() => resolveSafeReviewOutputPath(repository, "visible/TASK"), /Git ignore/);
  assert.throws(() => resolveSafeReviewOutputPath(repository, "."), /below the repository root/);
  const outside = mkdtempSync(join(tmpdir(), "qsc-review-output-outside-"));
  try {
    symlinkSync(outside, join(repository, "custom-review"), "junction");
    assert.throws(() => resolveSafeReviewOutputPath(repository, "custom-review/TASK"), /symbolic link|junction/);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
  }
});

test("allows only optional verification skips", () => {
  assert.doesNotThrow(() => validateSkippedVerificationCommands(["audit-runtime", "audit-full"]));
  assert.throws(() => validateSkippedVerificationCommands(["typescript"]), /typescript/);
  assert.throws(() => validateSkippedVerificationCommands(["integration-tests"]), /integration-tests/);
  assert.throws(() => validateSkippedVerificationCommands(["unknown"]), /unknown/);
});

test("parses supported arguments and repeated skip keys", () => {
  const result = parseTaskReviewArguments([
    "--task=DEV-001",
    "--report=docs/report.md",
    "--base-ref=HEAD",
    "--skip-command=audit-runtime",
    "--skip-command=audit-full",
    "--no-desktop-export",
  ]);
  assert.deepEqual(result.skippedCommandKeys, ["audit-runtime", "audit-full"]);
  assert.equal(result.desktopExport, false);
});

test("normalizes canonical paths and rejects traversal and escaping symlinks", (context) => {
  assert.equal(toCanonicalPath("docs\\file.md"), "docs/file.md");
  assert.equal(toCanonicalPath("docs/file.md"), "docs/file.md");
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-path-"));
  const outside = mkdtempSync(join(tmpdir(), "qsc-review-outside-"));
  context.after(() => {});
  mkdirSync(join(repository, "docs"));
  writeFileSync(join(repository, "docs", "report.md"), "report");
  assert.equal(resolvePathInsideRepository(repository, "docs/report.md"), join(repository, "docs", "report.md"));
  assert.throws(() => resolvePathInsideRepository(repository, "../outside"), /outside/);
  try {
    symlinkSync(outside, join(repository, "escape"), "junction");
    assert.throws(() => resolvePathInsideRepository(repository, "escape"), /symbolic link|outside/);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
  }
});
