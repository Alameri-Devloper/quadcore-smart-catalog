import { execFileSync } from "node:child_process";
import { isExcludedReviewPath } from "./task-review.config";
import type { ReviewFileGitState, TaskReviewChangedFile } from "./task-review.types";
import { toCanonicalPath } from "./resolve-repository-root";

function stateFor(status: string): ReviewFileGitState {
  if (status === "??") return "Untracked";
  if (status.includes("R")) return "Renamed";
  if (status.includes("C")) return "Copied";
  if (status.includes("D")) return "Deleted";
  if (status.includes("A")) return "Added";
  return "Modified";
}

export function parseGitPorcelainZ(value: string): TaskReviewChangedFile[] {
  const records = value.split("\0");
  const files: TaskReviewChangedFile[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    const state = stateFor(status);
    const path = toCanonicalPath(record.slice(3));
    const oldPath = state === "Renamed" || state === "Copied" ? toCanonicalPath(records[++index] ?? "") : undefined;
    if (!path || isExcludedReviewPath(path)) continue;
    files.push({ path, state, oldPath, copied: state !== "Deleted" });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function collectChangedFiles(repositoryRoot: string): TaskReviewChangedFile[] {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseGitPorcelainZ(output);
}
