import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { TaskReviewError } from "./task-review.errors";

export function toCanonicalPath(path: string): string {
  return path.replaceAll("\\", "/");
}

export function resolveSafeReviewOutputPath(repositoryRoot: string, candidate: string): string {
  const absolute = resolve(repositoryRoot, candidate);
  const repositoryRelative = relative(repositoryRoot, absolute);
  if (
    repositoryRelative === "" ||
    repositoryRelative === ".." ||
    repositoryRelative.startsWith(`..${sep}`) ||
    isAbsolute(repositoryRelative)
  ) {
    throw new TaskReviewError("The review output path must remain below the repository root.", "UnsafePath");
  }
  let ancestor = repositoryRoot;
  for (const segment of repositoryRelative.split(sep)) {
    ancestor = join(ancestor, segment);
    if (!existsSync(ancestor)) break;
    if (lstatSync(ancestor).isSymbolicLink()) {
      throw new TaskReviewError("The review output path traverses a symbolic link or junction.", "UnsafePath");
    }
    const realRelative = relative(repositoryRoot, realpathSync(ancestor));
    if (realRelative === ".." || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) {
      throw new TaskReviewError("The review output path escapes the repository.", "UnsafePath");
    }
  }
  const canonicalRelative = toCanonicalPath(repositoryRelative);
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", "--", canonicalRelative], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    throw new TaskReviewError("The review output path must be covered by Git ignore rules.", "UnsafePath");
  }
  return absolute;
}

export function resolveRepositoryRoot(cwd = process.cwd()): string {
  try {
    return realpathSync(execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim());
  } catch {
    throw new TaskReviewError("Unable to resolve the Git repository root.", "RepositoryResolutionFailed");
  }
}

export function resolvePathInsideRepository(repositoryRoot: string, candidate: string, mustExist = true): string {
  const absolute = resolve(repositoryRoot, candidate);
  const repositoryRelative = relative(repositoryRoot, absolute);
  if (repositoryRelative === "" || repositoryRelative.startsWith(`..${sep}`) || repositoryRelative === ".." || isAbsolute(repositoryRelative)) {
    throw new TaskReviewError("A requested path is outside the repository.", "UnsafePath");
  }
  if (mustExist && !existsSync(absolute)) throw new TaskReviewError("A required repository file does not exist.", "UnsafePath");
  if (mustExist) {
    const realRelative = relative(repositoryRoot, realpathSync(absolute));
    if (realRelative.startsWith(`..${sep}`) || realRelative === ".." || isAbsolute(realRelative) || lstatSync(absolute).isSymbolicLink()) {
      throw new TaskReviewError("A repository path resolves through an unsafe symbolic link.", "UnsafePath");
    }
  }
  return absolute;
}
