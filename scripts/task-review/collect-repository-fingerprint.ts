import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { calculateFileSha256, calculateSha256 } from "./calculate-sha256";
import { collectChangedFiles } from "./collect-changed-files";
import type { RepositoryFingerprint } from "./task-review.types";

export function collectRepositoryFingerprint(repositoryRoot: string, reportPath: string): RepositoryFingerprint {
  const status = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const headCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const paths = new Set(collectChangedFiles(repositoryRoot).filter(({ copied }) => copied).map(({ path }) => path));
  paths.add(reportPath);
  const files = [...paths].sort().map((path) => {
    const absolute = join(repositoryRoot, ...path.split("/"));
    return { path, sha256: existsSync(absolute) ? calculateFileSha256(absolute) : null };
  });
  const statusPorcelainSha256 = calculateSha256(status);
  return {
    sha256: calculateSha256(JSON.stringify({ headCommit, statusPorcelainSha256, files })),
    headCommit,
    statusPorcelainSha256,
    files,
  };
}

export function changedFingerprintPaths(initial: RepositoryFingerprint, final: RepositoryFingerprint): string[] {
  const initialFiles = new Map(initial.files.map((file) => [file.path, file.sha256]));
  const finalFiles = new Map(final.files.map((file) => [file.path, file.sha256]));
  const paths = new Set([...initialFiles.keys(), ...finalFiles.keys()]);
  return [...paths].filter((path) => initialFiles.get(path) !== finalFiles.get(path)).sort();
}

