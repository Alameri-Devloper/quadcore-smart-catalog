import assert from "node:assert/strict";
import { test } from "node:test";
import { createReviewManifest, serializeReviewManifest } from "../create-review-manifest";

test("creates a versioned, ordered manifest with exact exit codes and redactions", () => {
  const manifest = createReviewManifest({
    taskId: "DEV-001", generatedAt: "2026-01-01T00:00:00.000Z", branch: "test", headCommit: "abc", baseRef: null,
    workingTreeClean: false, initialFingerprintSha256: "same", finalFingerprintSha256: "same",
    gitIntegrity: { unstaged: { exitCode: 0, evidencePath: "git/u", passed: true }, staged: { exitCode: 0, evidencePath: "git/s", passed: true }, untracked: { exitCode: 0, evidencePath: "git/n", passed: true }, passed: true },
    reportRepositoryPath: "docs/report.md", reportBundlePath: "report/final-report.md", reportSha256: "hash",
    changedFiles: [{ path: "z.ts", state: "Modified", copied: true }, { path: "a.ts", state: "Added", copied: true }],
    verification: [{ key: "audit", command: "npm", args: ["audit"], required: false, skipped: false, skipReason: null, startedAt: "x", endedAt: "y", durationMs: 1, exitCode: 1, signal: null, termination: "Exited", rawOutputHashes: { stdoutSha256: "a", stderrSha256: "b", combinedSha256: "c" }, bundledEvidence: { path: "verification/audit.txt", sanitizedSha256: "d", redactionCount: 1 } }],
    redactions: { TOKEN: 2, PASSWORD: 1 },
    bundleFiles: [{ path: "z", type: "Generated", byteSize: 1, sha256: "z" }, { path: "a", type: "Generated", byteSize: 1, sha256: "a" }],
  });
  assert.equal(manifest.schemaVersion, "1.1.0");
  assert.equal(manifest.overallStatus, "ReadyForReview");
  assert.equal(manifest.verification[0].exitCode, 1);
  assert.equal(manifest.redactions.total, 3);
  assert.deepEqual(manifest.changedFiles.map(({ path }) => path), ["a.ts", "z.ts"]);
  assert.equal(serializeReviewManifest(manifest), serializeReviewManifest(manifest));
});

test("Git diff-check and skipped required commands prevent ReadyForReview", () => {
  const base = {
    taskId: "DEV", generatedAt: "x", branch: "b", headCommit: "h", baseRef: null, workingTreeClean: false,
    initialFingerprintSha256: "f", finalFingerprintSha256: "f", reportRepositoryPath: "r", reportBundlePath: "report/final-report.md",
    reportSha256: "x", changedFiles: [], redactions: {}, bundleFiles: [],
  } as const;
  const failedIntegrity = { unstaged: { exitCode: 1, evidencePath: "git/u", passed: false }, staged: { exitCode: 0, evidencePath: "git/s", passed: true }, untracked: { exitCode: 0, evidencePath: "git/n", passed: true }, passed: false };
  assert.equal(createReviewManifest({ ...base, gitIntegrity: failedIntegrity, verification: [] }).overallStatus, "VerificationFailed");
  const skippedRequired = { key: "typescript", command: "npx", args: [], required: true, skipped: true, skipReason: "bad", startedAt: "x", endedAt: "x", durationMs: 0, exitCode: null, signal: null, termination: "Exited" as const, rawOutputHashes: { stdoutSha256: "", stderrSha256: "", combinedSha256: "" }, bundledEvidence: { path: null, sanitizedSha256: "", redactionCount: 0 } };
  const passedIntegrity = { unstaged: { exitCode: 0, evidencePath: "git/u", passed: true }, staged: { exitCode: 0, evidencePath: "git/s", passed: true }, untracked: { exitCode: 0, evidencePath: "git/n", passed: true }, passed: true };
  assert.equal(createReviewManifest({ ...base, gitIntegrity: passedIntegrity, verification: [skippedRequired] }).overallStatus, "VerificationFailed");
});
