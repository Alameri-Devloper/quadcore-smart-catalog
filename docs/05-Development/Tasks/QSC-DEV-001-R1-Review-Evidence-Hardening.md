# DEV-001-R1 — Review Evidence Integrity and Secret-Safety Hardening
## Focused Correction for the Automated Task Review Bundle

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** DEV-001 — Automated Task Review Bundle
**Task Type:** Focused developer-tooling correctness and security correction
**Architecture Status:** No business architecture change
**Implementation Language:** TypeScript only
**Target Branch:** `chore/automated-task-review-bundle`

Do not begin Task 3.14.6.

Do not stage, commit, push, or merge.

Do not modify Product Domain, Application, PostgreSQL production schema or migrations, Product Entry, Smart Save, media behavior, or runtime business logic.

---

# 1. Objective

Correct the final integrity and secret-safety gaps found during review of the generated `QSC-Task-DEV-001-Review.zip`.

Preserve the approved DEV-001 architecture and command interface while ensuring that:

1. the bundle represents the repository state **after** verification,
2. required verification cannot be skipped while still producing `ReadyForReview`,
3. `git diff --check` participates in the final status,
4. source credential URLs and nested environment files cannot leak,
5. verification hashes clearly distinguish raw output from sanitized bundled evidence,
6. archive and Desktop collision handling is reliable,
7. manifest integrity coverage is explicit and independently verifiable,
8. focused tests prove all corrections.

---

# 2. Verified Existing Strengths to Preserve

Preserve:

- TypeScript-only implementation under `scripts/task-review`.
- trusted command configuration.
- no arbitrary CLI shell command input.
- `spawn`-based verification execution.
- exact source copying.
- SHA-256 source-copy equality.
- Git collection of staged, unstaged, untracked, deleted, and renamed files.
- forward-slash bundle paths.
- optional audit failures recorded without blocking archive creation.
- source secret failures reported by category and path only.
- sanitized generated evidence.
- repository-local bundle plus Desktop export.
- no Git write actions.
- no Docker or database lifecycle management.
- development-only ZIP dependency.
- bilingual documentation.
- current passing Product, PostgreSQL, TypeScript, lint, build, and Drizzle checks.

---

# 3. Final-State Evidence Ordering

The current implementation collects and copies changed source files before running verification commands.

This can produce a stale bundle if any verification command modifies a tracked or untracked project file.

Change the orchestration to use a trustworthy final-state workflow:

```text
Resolve arguments and repository
→ capture initial Git fingerprint
→ run verification commands
→ capture final Git fingerprint
→ detect unexpected working-tree changes caused during verification
→ collect final Git evidence
→ collect and copy final changed files
→ sanitize evidence
→ create manifest
→ create archive
→ export
```

## Required behavior

- Source files must be collected and copied only after all verification commands finish.
- The report must be re-read after verification.
- Record both initial and final Git fingerprints.
- A fingerprint must cover at least:
  - `git status --porcelain=v1 -z --untracked-files=all`,
  - HEAD commit,
  - hashes of changed source/report files where applicable.
- Ignored generated outputs such as `.next/` and `artifacts/task-reviews/` do not count as working-tree changes.
- When a verification command changes a non-excluded repository file:
  - do not silently bundle mixed-time evidence,
  - return a typed failure such as `WorkingTreeChangedDuringVerification`,
  - identify changed repository-relative paths only,
  - require the task implementer to inspect, accept, and rerun.
- No source file may change between its final hash calculation and archive creation. Recheck copied source hashes immediately before archive creation.

Add tests proving a verification command that modifies a tracked or untracked non-excluded file causes a safe failure.

---

# 4. Required Verification Skip Policy

The current tool allows `--skip-command=<required-key>` and can still produce `ReadyForReview`.

Correct this.

Approved policy:

- `--skip-command` may skip only commands configured with `required: false`.
- Attempting to skip a required command must fail argument/precondition validation before command execution.
- The safe error includes the command key but no environment values.
- A skipped optional command remains explicitly recorded with:
  - `skipped: true`,
  - `exitCode: null`,
  - a documented reason.
- `ReadyForReview` is impossible when any required command did not execute successfully.

Add tests for:

- optional audit skip accepted,
- required TypeScript skip rejected,
- required integration-test skip rejected,
- unknown key rejected.

---

# 5. Git Diff Integrity as a Quality Gate

The current Git collector captures `diffCheckExitCode`, but the manifest and `overallStatus` do not use it.

Add Git integrity metadata to the manifest:

```typescript
readonly gitIntegrity: {
  readonly diffCheckExitCode: number;
  readonly diffCheckOutputPath: string;
  readonly passed: boolean;
};
```

Rules:

- `git diff --check` failure must make the overall status `VerificationFailed`.
- Its exact sanitized output must remain in `git/diff-check.txt`.
- The exit code must be present in `manifest.json`.
- A clean empty output with exit code `0` is valid.
- Add focused tests proving whitespace errors prevent `ReadyForReview`.

---

# 6. Nested Environment File Exclusion

The current exclusion rule protects root `.env*` files but can miss nested files.

Exclude environment files at every repository depth:

```text
.env
.env.local
.env.production
packages/example/.env
domains/catalog/.env.local
```

Allow `.env.example` at every depth only when changed:

```text
.env.example
packages/example/.env.example
```

Use canonical `/` paths.

Add tests proving:

- nested real environment files are excluded,
- nested `.env.example` remains eligible,
- case behavior follows the project’s documented policy,
- review artifacts remain excluded.

Do not include ignored files merely because they exist.

---

# 7. Source Credential-URL Detection

The evidence sanitizer detects credential-bearing URLs, but the exact-source secret detector currently does not.

Add a source secret category such as:

```typescript
"CREDENTIAL_URL"
```

Detect credential-bearing URLs including:

```text
postgresql://user:password@host/database
postgres://user:password@host/database
https://user:token@host/path
```

Also strengthen source detection for:

- `DATABASE_URL` assignments containing credentials,
- password/secret/token assignments,
- authorization bearer values,
- GitHub and npm tokens,
- private-key blocks.

Rules:

- Do not return or print the matched value.
- Error output contains category and repository-relative path only.
- Avoid embedding complete fake credential URLs literally in the tool’s own test source; construct test strings from segments so the review tool does not correctly block its own security tests.
- `.env.example` is not automatically trusted. Placeholder/example values may be allowed only through explicit conservative placeholder detection.
- A realistic credential-looking value in `.env.example` must fail closed.

Add tests proving a changed source file containing a credential URL is rejected before archive creation.

---

# 8. Binary Source Handling

Exact binary source artifacts may be included, but secret detection must not decode arbitrary binaries as if they were trustworthy UTF-8 text.

Introduce a conservative text/binary policy:

- detect likely text using a small bounded sample and null-byte/UTF-8 validity checks,
- run text secret detection on text files,
- copy binary files byte-for-byte,
- apply explicit exclusion rules to known sensitive binary/key formats,
- retain exact source and bundle checksums.

Do not rewrite binary files.

Add tests for:

- exact binary copy,
- no accidental text normalization,
- private-key formats remain excluded or blocked,
- source checksums remain equal.

---

# 9. Raw and Sanitized Verification Hashes

The current verification result hashes raw stdout/stderr/combined data, while `verification/<key>.txt` contains sanitized data.

This becomes unverifiable whenever a redaction occurs.

Change the manifest contract to distinguish clearly:

```typescript
readonly rawOutputHashes: {
  readonly stdoutSha256: string;
  readonly stderrSha256: string;
  readonly combinedSha256: string;
};

readonly bundledEvidence: {
  readonly path: string | null;
  readonly sanitizedSha256: string;
  readonly redactionCount: number;
};
```

Rules:

- Raw output is never written when it contains secrets.
- Raw hashes may be retained as non-reversible evidence.
- The bundled evidence checksum must exactly match the sanitized file included in the ZIP.
- Per-command redaction counts must be recorded.
- Aggregate manifest redaction totals must equal the sum of report, Git, README, and verification evidence redactions.
- Rename ambiguous existing fields or increment the manifest schema version.
- Prefer `schemaVersion: "1.1.0"` for this compatible hardening.

Add a test with a command emitting a fake credential, proving:

- raw secret is absent from the ZIP,
- raw hash is recorded,
- sanitized file hash matches the manifest,
- redaction count is correct.

---

# 10. Manifest and Archive Integrity Coverage

The current archive contains `manifest.json`, while `bundleFiles` intentionally covers files created before the manifest. Make this explicit and independently verifiable.

Implement:

- `manifest.json` lists every payload entry except itself.
- Add an explicit manifest field documenting this rule.
- After ZIP creation, calculate the ZIP SHA-256.
- Create a detached sidecar beside the repository ZIP:

```text
QSC-Task-<task-id>-Review.zip.sha256
```

- Export the sidecar together with the ZIP.
- The sidecar contains only the archive hash and archive filename.
- Verify the ZIP after creation by reopening it and checking:
  - expected entries,
  - no duplicate entries,
  - canonical `/` paths,
  - no excluded paths,
  - all manifest-listed payload hashes match extracted entry bytes,
  - `manifest.json` parses and uses the supported schema.

Do not place the ZIP or sidecar inside itself.

Add archive-tampering and missing-entry tests where practical.

---

# 11. Collision-Safe Desktop Export

Local collision handling does not guarantee Desktop collision handling when the repository artifact directory was cleaned but an older Desktop archive remains.

Make Desktop export collision-safe independently:

```text
QSC-Task-3.14.6-Review.zip
QSC-Task-3.14.6-Review-20260722T041530Z.zip
```

Rules:

- Never overwrite an existing ZIP or checksum sidecar.
- ZIP and sidecar must share the same resolved collision-safe base name.
- Report the actual exported paths.
- Add a test where the Desktop target already contains the initial filename.

---

# 12. Command Execution Robustness

Preserve trusted fixed commands and `shell: false`.

Strengthen timeout behavior:

- On timeout, terminate the spawned process and its child process tree where safely supported.
- Record timeout explicitly in the result, not only as stderr text.
- Add:

```typescript
readonly termination:
  | "Exited"
  | "Signaled"
  | "TimedOut"
  | "SpawnFailed";
```

- Ensure missing executable cannot produce a misleading successful result.
- Ensure each Promise resolves exactly once.
- Keep platform-specific code isolated and tested without granting broader permissions.

Do not accept arbitrary command strings from CLI.

---

# 13. End-to-End Tool Test

Add a true end-to-end test using an isolated temporary Git repository and dependency injection for:

- verification command configuration,
- export directory,
- clock,
- platform command resolution where needed.

The test must execute the full `createTaskReviewBundle` orchestration and verify:

- final-state changed files are included,
- exact source checksum equality,
- generated evidence sanitization,
- required-command failure status,
- optional audit failure status,
- required skip rejection,
- Git diff-check failure status,
- canonical ZIP paths,
- manifest payload integrity,
- ZIP checksum sidecar,
- collision-safe export,
- no Git stage/commit action,
- generated artifacts are excluded from recursive collection.

Do not write to the real Desktop in automated tests.

---

# 14. Documentation Updates

Update bilingual documentation:

- `docs/05-Development/Automated-Task-Review-Bundle.md`
- `docs/05-Development/Reports/README.md` only if the manifest/report relationship changes.
- relevant development index when needed.

Document:

- final-state evidence collection,
- required skip prohibition,
- Git diff-check gating,
- nested `.env` exclusion,
- source credential URL failure,
- raw versus sanitized hashes,
- manifest payload coverage,
- detached ZIP checksum,
- collision-safe Desktop export,
- timeout result semantics,
- safe rerun after working-tree mutation detection.

Keep English and Arabic aligned.

---

# 15. Scope Protection

Do not modify:

- Product Aggregate,
- Product Value Objects,
- ProductRepository contracts,
- PostgreSQL schema,
- migrations,
- persistence repository behavior,
- Product Entry,
- Smart Save,
- ArchiveReason,
- media behavior,
- Next.js application routes,
- catalog UI,
- deployment configuration.

Dependency changes are limited to existing DEV-001 development tooling and must be justified.

Do not begin Task 3.14.6.

---

# 16. Verification

Run and report exact results:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
npm.cmd run review:bundle -- --task=DEV-001-R1 --report=docs/05-Development/Reports/DEV-001-R1-Final-Report.md
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

The self-review run must:

- use the safe dedicated `TEST_DATABASE_URL`,
- export ZIP and `.sha256` to Desktop,
- contain no raw fake or real secret,
- include final-state source files,
- record Git diff-check exit code,
- record no skipped required commands,
- verify all payload hashes,
- leave no staged files or Git commit.

---

# 17. Acceptance Criteria

The correction is accepted only when:

- source collection occurs after verification,
- working-tree changes during verification fail safely,
- required commands cannot be skipped,
- optional skips remain explicit,
- Git diff-check failure prevents `ReadyForReview`,
- nested `.env` files are excluded,
- nested `.env.example` remains eligible under conservative secret detection,
- credential URLs in source fail closed,
- binary files are copied safely and exactly,
- raw and sanitized hashes are unambiguous,
- sanitized evidence hashes match ZIP entries,
- per-command and aggregate redaction counts are correct,
- manifest payload coverage is explicit,
- ZIP is reopened and verified,
- detached ZIP checksum is produced and exported,
- Desktop collisions never overwrite prior evidence,
- timeout/spawn termination states are explicit,
- a full isolated end-to-end test passes,
- no Git write operation occurs,
- no business or production persistence architecture changes,
- TypeScript passes,
- lint passes,
- Product tests pass,
- tooling tests pass,
- PostgreSQL integration tests pass,
- build passes,
- Drizzle check passes,
- `git diff --check` passes,
- no unrelated files change,
- no Git commit is created.

---

# 18. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Final-State Evidence Ordering
6. Working-Tree Mutation Detection
7. Required Skip Policy
8. Optional Skip Behavior
9. Git Diff Integrity Gate
10. Nested Environment Exclusion
11. Source Credential URL Detection
12. Binary Source Handling
13. Raw Output Hashes
14. Sanitized Evidence Hashes
15. Redaction Accounting
16. Manifest Schema
17. Manifest Payload Coverage
18. ZIP Verification
19. Detached ZIP Checksum
20. Desktop Collision Handling
21. Timeout and Spawn Semantics
22. End-to-End Tool Test
23. Exact Source Integrity
24. Canonical Paths
25. Git Write Protection
26. Documentation Updates
27. Existing Product Tests
28. Tooling Unit Tests
29. Tooling Integration Tests
30. PostgreSQL Integration Tests
31. TypeScript Result
32. Integration TypeScript Result
33. Lint Result
34. Build Result
35. Drizzle Check Result
36. Runtime Audit Result
37. Development Audit Result
38. Diff Integrity Result
39. Architecture Integrity Review
40. Remaining Risks
41. Architecture Changes
42. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

Stop after DEV-001-R1.
