import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { collectChangedFiles, parseGitPorcelainZ } from "../collect-changed-files";
import { isExcludedReviewPath } from "../task-review.config";
import { collectGitEvidence } from "../collect-git-evidence";

test("parses staged, unstaged, untracked, deleted, renamed and excluded records", () => {
  const parsed = parseGitPorcelainZ("M  staged.ts\0 M unstaged.ts\0?? new.ts\0D  deleted.ts\0R  renamed.ts\0old.ts\0?? artifacts/task-reviews/x.txt\0");
  assert.deepEqual(parsed.map(({ path, state }) => [path, state]), [
    ["deleted.ts", "Deleted"], ["new.ts", "Untracked"], ["renamed.ts", "Renamed"], ["staged.ts", "Modified"], ["unstaged.ts", "Modified"],
  ]);
  assert.equal(parsed.find(({ path }) => path === "renamed.ts")?.oldPath, "old.ts");
});

test("gates unstaged, staged, and untracked whitespace without mutating the index", () => {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-integrity-"));
  const gitText = (args: string[]) => execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
  execFileSync("git", ["init"], { cwd: repository, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repository });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repository });
  writeFileSync(join(repository, "tracked.ts"), "clean\n");
  execFileSync("git", ["add", "tracked.ts"], { cwd: repository });
  execFileSync("git", ["commit", "-m", "base"], { cwd: repository, stdio: "ignore" });

  writeFileSync(join(repository, "tracked.ts"), "unstaged  \n");
  assert.equal(collectGitEvidence(repository).integrity.unstaged.passed, false);
  writeFileSync(join(repository, "tracked.ts"), "staged  \n");
  execFileSync("git", ["add", "tracked.ts"], { cwd: repository });
  assert.equal(collectGitEvidence(repository).integrity.staged.passed, false);
  writeFileSync(join(repository, "untracked.ts"), "untracked  \n");
  assert.equal(collectGitEvidence(repository).integrity.untracked.passed, false);
  unlinkSync(join(repository, "untracked.ts"));
  writeFileSync(join(repository, "binary.bin"), Buffer.from([0, 255, 1]));
  const indexBefore = gitText(["ls-files", "--stage"]);
  assert.equal(collectGitEvidence(repository).integrity.untracked.output.includes("skipped 1 binary"), true);
  assert.equal(gitText(["ls-files", "--stage"]), indexBefore);
});

test("excludes nested environment files but allows exact lowercase env examples", () => {
  assert.equal(isExcludedReviewPath("packages/example/.env"), true);
  assert.equal(isExcludedReviewPath("domains/catalog/.env.local"), true);
  assert.equal(isExcludedReviewPath("packages/example/.env.example"), false);
  assert.equal(isExcludedReviewPath("packages/example/.ENV"), true);
  assert.equal(isExcludedReviewPath("artifacts/task-reviews/x/file.ts"), true);
});

test("collects changes from an isolated Git repository and excludes ignored artifacts", () => {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-git-"));
  const git = (args: string[]) => execFileSync("git", args, { cwd: repository, stdio: "ignore" });
  git(["init"]); git(["config", "user.email", "test@example.invalid"]); git(["config", "user.name", "Test"]);
  writeFileSync(join(repository, ".gitignore"), "artifacts/task-reviews/\n");
  writeFileSync(join(repository, "staged.ts"), "one");
  writeFileSync(join(repository, "deleted.ts"), "delete");
  writeFileSync(join(repository, "old.ts"), "rename");
  git(["add", "."]); git(["commit", "-m", "base"]);
  writeFileSync(join(repository, "staged.ts"), "two"); git(["add", "staged.ts"]);
  unlinkSync(join(repository, "deleted.ts")); renameSync(join(repository, "old.ts"), join(repository, "renamed.ts"));
  writeFileSync(join(repository, "untracked.ts"), "new");
  const files = collectChangedFiles(repository);
  assert.ok(files.some(({ state }) => state === "Untracked"));
  assert.ok(files.some(({ state }) => state === "Deleted"));
  assert.ok(readFileSync(join(repository, "staged.ts"), "utf8") === "two");
});
