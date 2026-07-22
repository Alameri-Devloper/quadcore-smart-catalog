import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectChangedFiles } from "./collect-changed-files";
import { isLikelyText } from "./detect-secret-material";
import type { GitIntegrityCheck } from "./task-review.types";

export interface GitCheckEvidence extends GitIntegrityCheck {
  readonly output: string;
}

export interface GitEvidence {
  readonly branch: string;
  readonly head: string;
  readonly baseRef: string | null;
  readonly statusShort: string;
  readonly unstagedNameStatus: string;
  readonly stagedNameStatus: string;
  readonly baseRefNameStatus: string | null;
  readonly unstagedStat: string;
  readonly stagedStat: string;
  readonly baseRefStat: string | null;
  readonly integrity: {
    readonly unstaged: GitCheckEvidence;
    readonly staged: GitCheckEvidence;
    readonly untracked: GitCheckEvidence;
    readonly baseRef?: GitCheckEvidence;
    readonly passed: boolean;
  };
}

function git(repositoryRoot: string, args: readonly string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitCheck(repositoryRoot: string, args: readonly string[], evidencePath: string): GitCheckEvidence {
  try {
    return { exitCode: 0, evidencePath, passed: true, output: git(repositoryRoot, args) };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number };
    return {
      exitCode: failure.status ?? 1,
      evidencePath,
      passed: false,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

export function validateUntrackedWhitespace(repositoryRoot: string): GitCheckEvidence {
  const issues: string[] = [];
  let textCount = 0;
  let binaryCount = 0;
  const untracked = collectChangedFiles(repositoryRoot).filter(({ state, copied }) => state === "Untracked" && copied);
  for (const file of untracked) {
    const bytes = readFileSync(join(repositoryRoot, ...file.path.split("/")));
    if (!isLikelyText(bytes)) {
      binaryCount += 1;
      continue;
    }
    textCount += 1;
    const lines = bytes.toString("utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) issues.push(`${file.path}:${index + 1}: trailing whitespace.`);
      if (/^(?:<{7}|={7}|>{7})(?: |$)/.test(line)) issues.push(`${file.path}:${index + 1}: conflict marker.`);
    });
  }
  const summary = `Checked ${textCount} untracked text file(s); skipped ${binaryCount} binary file(s).`;
  const output = issues.length > 0 ? `${issues.join("\n")}\n${summary}\n` : `${summary}\n`;
  return {
    exitCode: issues.length > 0 ? 1 : 0,
    evidencePath: "git/integrity-untracked.txt",
    passed: issues.length === 0,
    output,
  };
}

export function collectGitEvidence(repositoryRoot: string, baseRef?: string): GitEvidence {
  if (baseRef) git(repositoryRoot, ["rev-parse", "--verify", `${baseRef}^{commit}`]);
  const unstaged = gitCheck(repositoryRoot, ["diff", "--check"], "git/integrity-unstaged.txt");
  const staged = gitCheck(repositoryRoot, ["diff", "--cached", "--check"], "git/integrity-staged.txt");
  const untracked = validateUntrackedWhitespace(repositoryRoot);
  const base = baseRef
    ? gitCheck(repositoryRoot, ["diff", "--check", baseRef, "--"], "git/integrity-base-ref.txt")
    : undefined;
  return {
    branch: git(repositoryRoot, ["branch", "--show-current"]).trim(),
    head: git(repositoryRoot, ["rev-parse", "HEAD"]).trim(),
    baseRef: baseRef ?? null,
    statusShort: git(repositoryRoot, ["status", "--short"]),
    unstagedNameStatus: git(repositoryRoot, ["diff", "--name-status"]),
    stagedNameStatus: git(repositoryRoot, ["diff", "--cached", "--name-status"]),
    baseRefNameStatus: baseRef ? git(repositoryRoot, ["diff", "--name-status", baseRef, "--"]) : null,
    unstagedStat: git(repositoryRoot, ["diff", "--stat"]),
    stagedStat: git(repositoryRoot, ["diff", "--cached", "--stat"]),
    baseRefStat: baseRef ? git(repositoryRoot, ["diff", "--stat", baseRef, "--"]) : null,
    integrity: {
      unstaged,
      staged,
      untracked,
      ...(base ? { baseRef: base } : {}),
      passed: unstaged.passed && staged.passed && untracked.passed && (base?.passed ?? true),
    },
  };
}
