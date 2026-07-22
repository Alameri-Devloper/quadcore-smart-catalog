# DEV-001 — Automated Task Review Bundle
## TypeScript Review Evidence, Manifest, Sanitization, and Desktop Export

**Project:** Quadcore Smart Catalog — QSC
**Task Type:** Developer Tooling and Delivery Governance
**Architecture Status:** Approved
**Implementation Language:** TypeScript only
**Target Branch:** `chore/automated-task-review-bundle`

Do not begin Task 3.14.6.

Do not create a Git commit.

Do not modify Product Domain, Application use cases, PostgreSQL production schema, migrations, Product Entry, Smart Save, media behavior, or runtime business logic.

---

# 1. Objective

Create one reliable TypeScript command that prepares a complete, reviewable, sanitized evidence bundle after every approved implementation task.

The command must:

1. Read the task identifier and report file.
2. Capture Git evidence.
3. Run configured verification commands.
4. Preserve exact command output and exit codes.
5. Copy changed and newly created project files while preserving repository-relative paths.
6. Keep source files byte-for-byte exact.
7. Sanitize logs and generated reports that may contain secrets.
8. Create deterministic manifest metadata.
9. Calculate SHA-256 checksums.
10. Create a ZIP review bundle.
11. Export the ZIP to the configured Desktop review folder.
12. Never stage, commit, push, merge, or delete project files.
13. Stop and fail safely when evidence cannot be trusted.

---

# 2. Approved Workflow

After any implementation task:

```text
Implementation
→ Required verification
→ Final report
→ Automated review bundle
→ Human/architecture review
→ Git commit
→ Push
→ Merge
```

The tool is not a replacement for tests or review.

The source of truth is:

```text
Raw command output
+ exact exit code
+ changed files
+ manifest
+ checksums
```

A narrative report alone is not sufficient evidence.

---

# 3. Command Interface

Add an npm script:

```json
{
  "scripts": {
    "review:bundle": "tsx scripts/task-review/create-task-review-bundle.ts"
  }
}
```

Approved command shape:

```powershell
npm.cmd run review:bundle -- `
  --task=3.14.6 `
  --report=docs/05-Development/Reports/Task-3.14.6-Final-Report.md
```

Optional supported arguments:

```text
--output=<absolute-or-relative-directory>
--base-ref=<git-reference>
--skip-command=<command-key>
--no-desktop-export
```

Rules:

- `--task` is required.
- `--report` is required and must exist inside the repository.
- Default output root inside the repository:
  `artifacts/task-reviews/<task-id>/`
- Default exported ZIP directory on Windows:
  `%USERPROFILE%/Desktop/QSC-Reviews/`
- On non-Windows platforms, use the user Desktop directory when resolvable; otherwise require `--output`.
- Do not silently fall back to an unexpected directory.
- Do not accept arbitrary shell commands from CLI input.
- Verification commands come from trusted project configuration only.

---

# 4. Proposed Structure

Follow the existing project structure and keep the tool isolated:

```text
scripts/
└── task-review/
    ├── create-task-review-bundle.ts
    ├── task-review.types.ts
    ├── task-review.config.ts
    ├── task-review.errors.ts
    ├── parse-task-review-arguments.ts
    ├── resolve-repository-root.ts
    ├── collect-git-evidence.ts
    ├── run-verification-command.ts
    ├── collect-verification-evidence.ts
    ├── collect-changed-files.ts
    ├── copy-source-file.ts
    ├── sanitize-text-evidence.ts
    ├── detect-secret-material.ts
    ├── calculate-sha256.ts
    ├── create-review-manifest.ts
    ├── create-review-archive.ts
    ├── export-review-archive.ts
    └── __tests__/
        ├── parse-task-review-arguments.test.ts
        ├── sanitize-text-evidence.test.ts
        ├── detect-secret-material.test.ts
        ├── collect-changed-files.test.ts
        ├── calculate-sha256.test.ts
        ├── create-review-manifest.test.ts
        └── review-bundle.integration.test.ts
```

Exact filenames may adapt to existing conventions, but responsibilities must remain separated.

Do not place the implementation inside React, Domain, or Catalog Infrastructure.

---

# 5. Review Bundle Layout

Generate:

```text
artifacts/task-reviews/<task-id>/
├── report/
│   └── final-report.md
├── git/
│   ├── branch.txt
│   ├── head.txt
│   ├── base-ref.txt
│   ├── status-short.txt
│   ├── diff-name-status.txt
│   ├── diff-stat.txt
│   ├── diff-check.txt
│   └── changed-files.json
├── verification/
│   ├── typescript.txt
│   ├── integration-typescript.txt
│   ├── lint.txt
│   ├── unit-tests.txt
│   ├── integration-tests.txt
│   ├── build.txt
│   ├── drizzle-check.txt
│   ├── audit-runtime.txt
│   └── audit-full.txt
├── source-files/
│   └── <repository-relative paths>
├── manifest.json
└── README.md
```

The exported ZIP name:

```text
QSC-Task-<task-id>-Review.zip
```

Example:

```text
QSC-Task-3.14.6-Review.zip
```

---

# 6. Canonical Repository Paths

All paths recorded in:

- manifest,
- changed-files list,
- README,
- ZIP entry names,

must use forward slashes:

```text
domains/catalog/...
docs/05-Development/...
```

Never record Windows-only backslash paths in the bundle manifest.

Absolute local paths must not appear in the manifest unless explicitly redacted.

---

# 7. Changed File Collection

Use Git as the authoritative changed-file source.

Collect:

- staged changes,
- unstaged changes,
- untracked files.

Do not depend only on `git diff`, because it omits untracked files.

Record the Git state for every file:

```typescript
export type ReviewFileGitState =
  | "Added"
  | "Modified"
  | "Deleted"
  | "Renamed"
  | "Copied"
  | "Untracked";
```

Rules:

- Preserve repository-relative paths.
- Include changed text and binary source artifacts unless excluded by security policy.
- Deleted files appear in the manifest but have no copied source payload.
- Renames record old and new paths.
- Do not follow symlinks outside the repository.
- Reject path traversal.
- Do not include ignored files merely because they exist.

---

# 8. Exact Source File Preservation

Project source files copied into:

```text
source-files/
```

must be byte-for-byte copies.

Do not sanitize or rewrite source files.

For every copied source file, calculate:

```text
sourceSha256
bundleSha256
```

These must match for exact copies.

When a changed source file contains suspected secret material:

- do not silently sanitize it,
- fail the bundle,
- identify only the repository-relative file path and secret category,
- do not print the secret value.

This protects evidence integrity.

---

# 9. Text Evidence Sanitization

Sanitize only generated evidence such as:

- command output,
- Git output,
- final report copy,
- generated README.

Redact at minimum:

- PostgreSQL passwords,
- URLs containing credentials,
- API keys,
- access tokens,
- private keys,
- authorization headers,
- GitHub tokens,
- npm tokens,
- common `.env` secret assignments.

Replacement format:

```text
[REDACTED:<CATEGORY>]
```

Examples:

```text
postgresql://qsc:[REDACTED:PASSWORD]@127.0.0.1:5432/qsc_test
Authorization: Bearer [REDACTED:TOKEN]
```

Rules:

- Never log the raw matched secret.
- Record redaction count by category in the manifest.
- A sanitized evidence checksum is calculated after redaction.
- Do not claim no secrets were detected unless the detector completed successfully.

---

# 10. File Exclusion Policy

Always exclude:

```text
.env
.env.*
!.env.example
node_modules/
.next/
coverage/
dist/
build/
.npm-cache/
PostgreSQL data directories
database dumps unless explicitly approved
product media files
Git credentials
private keys
review ZIP files
artifacts/task-reviews/
```

`.env.example` is allowed and should be included when changed.

Do not include the exported ZIP inside itself.

Update `.gitignore` to exclude:

```text
artifacts/task-reviews/
QSC-Reviews/
*.review-temp
```

Do not ignore official Markdown task specifications or final reports.

---

# 11. Verification Command Configuration

Create trusted configuration in TypeScript.

Default verification commands:

```typescript
export const taskReviewVerificationCommands = [
  {
    key: "typescript",
    command: "npx.cmd",
    args: ["tsc", "--noEmit"],
    required: true,
  },
  {
    key: "integration-typescript",
    command: "npx.cmd",
    args: ["tsc", "--project", "tsconfig.integration.json"],
    required: true,
  },
  {
    key: "lint",
    command: "npm.cmd",
    args: ["run", "lint"],
    required: true,
  },
  {
    key: "unit-tests",
    command: "npm.cmd",
    args: ["test"],
    required: true,
  },
  {
    key: "integration-tests",
    command: "npm.cmd",
    args: ["run", "test:integration"],
    required: true,
  },
  {
    key: "build",
    command: "npm.cmd",
    args: ["run", "build"],
    required: true,
  },
  {
    key: "drizzle-check",
    command: "npm.cmd",
    args: ["run", "db:check"],
    required: true,
  },
  {
    key: "audit-runtime",
    command: "npm.cmd",
    args: ["audit", "--omit=dev"],
    required: false,
  },
  {
    key: "audit-full",
    command: "npm.cmd",
    args: ["audit"],
    required: false,
  },
] as const;
```

Cross-platform execution may resolve `.cmd` commands on Windows and their non-`.cmd` equivalents elsewhere.

Rules:

- Use `spawn`, not shell-string concatenation.
- Do not use `shell: true` unless a documented platform-specific reason is unavoidable.
- Capture stdout and stderr separately and together in chronological order where feasible.
- Record start time, end time, duration, exit code, signal, and command key.
- Required-command failure makes bundle status `VerificationFailed`.
- Optional audit nonzero exit codes do not prevent bundle creation but must be reported accurately.
- Do not convert a failed required command into success.

---

# 12. Environment Preconditions

Before running integration tests:

- Require `TEST_DATABASE_URL`.
- Do not include its raw value in output.
- Allow the existing test-database safety guard to protect the database.
- Do not create or delete databases automatically.
- Do not start or stop Docker automatically in V1.
- Report missing preconditions clearly and safely.

The bundle tool must not alter application data.

---

# 13. Manifest Contract

Create a versioned immutable manifest.

Conceptual TypeScript model:

```typescript
export interface TaskReviewManifest {
  readonly schemaVersion: "1.0.0";
  readonly project: "Quadcore Smart Catalog";
  readonly taskId: string;
  readonly generatedAt: string;
  readonly platform: NodeJS.Platform;
  readonly nodeVersion: string;
  readonly repository: {
    readonly branch: string;
    readonly headCommit: string;
    readonly baseRef: string | null;
    readonly workingTreeClean: boolean;
  };
  readonly report: {
    readonly repositoryPath: string;
    readonly sanitizedBundlePath: string;
    readonly sha256: string;
  };
  readonly changedFiles: readonly TaskReviewChangedFile[];
  readonly verification: readonly TaskReviewVerificationResult[];
  readonly redactions: {
    readonly total: number;
    readonly byCategory: Readonly<Record<string, number>>;
  };
  readonly bundleFiles: readonly TaskReviewBundleFile[];
  readonly overallStatus:
    | "ReadyForReview"
    | "VerificationFailed"
    | "SecretDetectedInSource"
    | "BundleFailed";
}
```

Each bundle file entry includes:

```typescript
export interface TaskReviewBundleFile {
  readonly path: string;
  readonly type: "SourceExact" | "EvidenceSanitized" | "Generated";
  readonly byteSize: number;
  readonly sha256: string;
  readonly originalSha256?: string;
}
```

Use stable JSON indentation and canonical path ordering.

---

# 14. ZIP Creation

Use a stable maintained development dependency suitable for programmatic ZIP creation from TypeScript.

Rules:

- Add it as a development dependency only.
- Do not invoke arbitrary shell compression commands.
- Preserve forward-slash entry names.
- Do not include timestamps as the only integrity mechanism.
- Create the archive first in a temporary path.
- Verify archive creation completed.
- Atomically rename to the final ZIP path when possible.
- Never overwrite an existing final ZIP silently.

Collision strategy:

```text
QSC-Task-3.14.6-Review.zip
QSC-Task-3.14.6-Review-20260722T041530Z.zip
```

Report the actual path.

---

# 15. Desktop Export

Export only after the repository-local bundle is complete.

Rules:

- Resolve the user profile directory safely.
- Create `Desktop/QSC-Reviews` when permitted.
- If sandbox approval is required, request it only for this export.
- If export fails, keep the repository-local ZIP and return `DesktopExportFailed`.
- Do not require full machine access.
- Do not delete prior review ZIP files.
- Do not copy any raw `.env` file.

---

# 16. Final Report Location

Every implementation task must write its final report to:

```text
docs/05-Development/Reports/<task-id>-Final-Report.md
```

Create:

```text
docs/05-Development/Reports/README.md
```

in English and Arabic, documenting:

- report purpose,
- naming convention,
- review status,
- relationship to temporary review bundles,
- what belongs in Git,
- what does not belong in Git.

The automated bundle copies the report into the ZIP but does not generate fictional implementation results.

If the report file is missing, stop.

---

# 17. AGENTS.md Task Completion Rules

Add a concise permanent section to the root `AGENTS.md`.

Required rules:

```text
After every approved implementation task:

1. Write the exact final report to docs/05-Development/Reports/.
2. Run all task-required verification commands.
3. Generate the automated review bundle.
4. Preserve exact source files and sanitize evidence only.
5. Never include credentials or real environment files.
6. Never stage, commit, push, merge, or delete files automatically.
7. Report the repository-local and exported ZIP paths.
8. Stop for review.
```

Do not duplicate the full DEV-001 specification inside `AGENTS.md`.

Do not modify architecture rules already present.

---

# 18. Tool Tests

Use dependency-free Node test patterns where possible.

Test:

## Arguments

- required task,
- required report,
- unknown argument rejection,
- invalid task identifier,
- report path outside repository rejected.

## Paths

- Windows paths normalized to `/`,
- Linux paths preserved,
- path traversal rejected,
- symlinks escaping repository rejected.

## Changed files

- staged,
- unstaged,
- untracked,
- deleted,
- renamed,
- ignored review artifacts excluded.

Use an isolated temporary Git repository for integration testing.

## Sanitization

- PostgreSQL credential URL,
- bearer token,
- npm token,
- private key marker,
- secret assignment,
- no raw secret in error output.

## Exact source integrity

- copied source checksum equals original,
- source with detected secret fails rather than rewriting.

## Manifest

- deterministic ordering,
- schema version,
- exact exit codes,
- redaction counts,
- source and bundle checksums.

## Verification execution

- success,
- required failure,
- optional audit failure,
- missing executable,
- timeout handling if timeouts are supported.

## Archive

- ZIP created,
- expected entries present,
- forward-slash paths,
- no excluded files,
- manifest checksum matches bundled files.

## Desktop export

- test with injected temporary export directory,
- do not write to the real Desktop during automated tests.

---

# 19. Self-Validation Run

After implementation, create a temporary final report for DEV-001 under the approved reports directory and run:

```powershell
npm.cmd run review:bundle -- `
  --task=DEV-001 `
  --report=docs/05-Development/Reports/DEV-001-Final-Report.md `
  --output=artifacts/task-reviews/DEV-001-self-test
```

For the self-test:

- use a safe dedicated `TEST_DATABASE_URL`,
- generate the repository-local ZIP,
- Desktop export may be tested manually after tool verification,
- inspect the manifest,
- verify source checksums,
- verify sanitized evidence,
- verify no ignored or secret files,
- do not commit the generated artifact directory or ZIP.

---

# 20. Documentation

Create bilingual documentation:

```text
docs/05-Development/Automated-Task-Review-Bundle.md
```

Cover:

- purpose,
- command usage,
- arguments,
- bundle structure,
- verification semantics,
- required versus optional commands,
- source integrity,
- sanitization,
- security exclusions,
- manifest,
- checksums,
- Desktop export,
- failures and recovery,
- Git policy,
- Windows usage,
- Linux/Ubuntu compatibility.

Update the relevant development README with a relative link.

---

# 21. What Will Be Implemented

Implement only:

- TypeScript task-review tool.
- npm review command.
- Git evidence collection.
- configured verification execution.
- exact exit-code capture.
- changed-file collection.
- exact source-file copying.
- text-evidence sanitization.
- secret detection.
- SHA-256 checksums.
- manifest generation.
- ZIP generation.
- Desktop export.
- reports directory convention.
- AGENTS.md completion rules.
- tests.
- bilingual documentation.
- `.gitignore` updates for temporary artifacts.

---

# 22. What Will NOT Be Implemented

Do not implement:

- Task 3.14.6.
- Product behavior.
- PostgreSQL production changes.
- migrations.
- Product Entry.
- media storage.
- Git staging.
- Git commit.
- Git push.
- Git merge.
- GitHub Actions.
- cloud artifact upload.
- automatic ChatGPT upload.
- Docker lifecycle management.
- automatic database creation.
- automatic audit remediation.
- arbitrary command execution from CLI.
- full secret-scanning platform.
- telemetry.
- external service integration.

---

# 23. Acceptance Criteria

The task is accepted only when:

- one TypeScript command creates the review bundle,
- task/report arguments are validated,
- source files remain byte-for-byte exact,
- generated evidence is sanitized,
- source secrets fail closed,
- changed staged/unstaged/untracked files are collected,
- deleted and renamed files are represented correctly,
- canonical `/` paths are used,
- `.env.example` can be included,
- real `.env` files are excluded,
- command outputs and exit codes are exact,
- required failures are not hidden,
- audit failures remain accurately represented,
- manifest is versioned and deterministic,
- checksums cover every bundled file,
- ZIP contains expected entries,
- Desktop export is supported safely,
- no Git write action occurs,
- temporary artifacts are ignored,
- final reports have a documented Git-tracked location,
- AGENTS.md contains concise completion rules,
- documentation is bilingual,
- Windows workflow works,
- design remains compatible with Ubuntu,
- tests pass,
- self-validation bundle succeeds,
- TypeScript passes,
- lint passes,
- unit tests pass,
- build passes,
- `git diff --check` passes,
- no unrelated files change,
- no Git commit is created.

---

# 24. Verification

Run and report:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
npm.cmd run review:bundle -- --task=DEV-001 --report=docs/05-Development/Reports/DEV-001-Final-Report.md --output=artifacts/task-reviews/DEV-001-self-test
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Inspect:

- source checksum equality,
- sanitized report and logs,
- manifest ordering,
- excluded secret files,
- canonical paths,
- ZIP entries,
- no recursive bundle inclusion,
- no Git staging or commits,
- no production architecture changes.

---

# 25. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Tool Architecture
6. Command Interface
7. Arguments Validation
8. Repository Root Resolution
9. Git Evidence Collection
10. Changed File Collection
11. Exact Source Preservation
12. Secret Detection
13. Evidence Sanitization
14. Exclusion Policy
15. Verification Command Execution
16. Required Failure Handling
17. Optional Audit Handling
18. Manifest Contract
19. SHA-256 Integrity
20. Canonical Path Handling
21. ZIP Creation
22. Desktop Export
23. Reports Directory
24. AGENTS.md Rules
25. Unit Tests
26. Tool Integration Tests
27. Self-Validation Bundle
28. TypeScript Result
29. Integration TypeScript Result
30. Lint Result
31. Existing Unit Tests Result
32. PostgreSQL Integration Tests Result
33. Build Result
34. Drizzle Check Result
35. Runtime Audit Result
36. Development Audit Result
37. Diff Integrity Result
38. Architecture Integrity Review
39. Documentation Updates
40. Remaining Risks
41. Architecture Changes
42. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

Stop after DEV-001.
