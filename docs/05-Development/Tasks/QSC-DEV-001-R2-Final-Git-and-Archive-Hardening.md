# DEV-001-R2 — Final Git Evidence and Archive Coverage Hardening
## Focused Correction for the Automated Task Review Bundle

**Project:** Quadcore Smart Catalog — QSC
**Parent Tasks:** DEV-001 and DEV-001-R1
**Task Type:** Final focused developer-tooling correction
**Architecture Status:** No business architecture change
**Implementation Language:** TypeScript only
**Target Branch:** `chore/automated-task-review-bundle`

Do not begin Task 3.14.6.

Do not stage, commit, push, or merge.

Do not modify Product Domain, Application, PostgreSQL production schema or migrations, Product Entry, Smart Save, media behavior, or runtime business logic.

---

# 1. Objective

Close the final review gaps found in `QSC-Task-DEV-001-R1-Review.zip` while preserving the approved DEV-001 architecture.

This correction must:

1. make Git whitespace integrity cover staged, unstaged, and untracked task files,
2. make archive verification enforce exact manifest payload coverage,
3. prevent custom output paths from escaping through symlink/junction ancestors or creating non-ignored project artifacts,
4. revalidate the repository fingerprint after archive creation,
5. add the missing DEV-001-R1 task specification to project history,
6. add focused tests and documentation,
7. produce the final automated review ZIP and `.sha256`.

---

# 2. Verified Existing Strengths to Preserve

Preserve:

- TypeScript-only tooling.
- final-state evidence collection after verification.
- initial/final repository fingerprints.
- mutation failure before source collection.
- required-command skip prohibition.
- optional audit skip representation.
- exact source copying and checksum equality.
- source secret fail-closed behavior.
- nested `.env` exclusion.
- binary source handling.
- raw versus sanitized hashes.
- per-command redaction counts.
- manifest schema `1.1.0`, unless a compatible schema increment is justified.
- ZIP reopening and payload hash verification.
- detached ZIP checksum.
- collision-safe Desktop export.
- trusted command configuration.
- no Git write actions.
- current passing Product, PostgreSQL, TypeScript, lint, build, and Drizzle checks.

---

# 3. Complete Git Whitespace Integrity

The current `git diff --check` execution without a base reference checks only the unstaged tracked diff. It can miss:

- staged whitespace errors,
- new untracked files.

Replace the single ambiguous gate with explicit immutable evidence.

## 3.1 Tracked unstaged changes

Run:

```text
git diff --check
```

## 3.2 Staged changes

Run:

```text
git diff --cached --check
```

## 3.3 Base-reference mode

When `--base-ref` is supplied, retain a comparison against that reference for tracked changes, while still checking untracked files separately.

## 3.4 Untracked files

Check changed untracked text files without staging or modifying the index.

Use a dependency-free TypeScript whitespace validator or a safe read-only Git mechanism.

At minimum detect the same high-value integrity problems expected from `git diff --check`:

- trailing spaces or tabs,
- whitespace-only errors at end of line,
- conflict markers where applicable.

Do not treat binary files as text.

Do not run `git add -N`, `git add`, or any other index-writing command.

## 3.5 Manifest contract

Replace or extend `gitIntegrity` so it records:

```typescript
readonly gitIntegrity: {
  readonly unstaged: GitIntegrityCheck;
  readonly staged: GitIntegrityCheck;
  readonly untracked: GitIntegrityCheck;
  readonly baseRef?: GitIntegrityCheck;
  readonly passed: boolean;
};
```

Each check contains:

- exact exit/status result,
- sanitized evidence path,
- passed flag.

`ReadyForReview` is impossible when any applicable Git integrity check fails.

Add tests proving:

- unstaged whitespace failure blocks readiness,
- staged whitespace failure blocks readiness,
- untracked text whitespace failure blocks readiness,
- clean binary untracked files do not produce false failures,
- no Git index mutation occurs.

---

# 4. Exact Manifest Payload Coverage

The current archive verifier validates hashes for listed manifest entries, but must also prove that the manifest lists every archive payload except `manifest.json`.

Update `verifyReviewArchive` to enforce:

```text
actual ZIP entries excluding manifest.json
===
manifest.bundleFiles paths
```

Rules:

- exact set equality,
- no duplicates in either set,
- no missing payload,
- no unlisted extra payload,
- every listed payload hash matches,
- `integrityCoverage.rule` is supported,
- `integrityCoverage.manifestPath` is `manifest.json`.

Add focused tests for:

- omitted manifest payload entry,
- extra unlisted ZIP entry,
- duplicate manifest path,
- wrong payload hash,
- missing manifest,
- valid archive.

The verifier must fail closed with safe path-only errors.

---

# 5. Safe Custom Output Directory

The current lexical inside-repository check can be bypassed through a symlink or Windows junction ancestor.

Strengthen output resolution.

Rules:

- default output remains `artifacts/task-reviews/<task-id>/`,
- all existing output path ancestors must be checked with `lstat` and `realpath`,
- reject symlink/junction traversal outside the repository,
- reject an output path equal to the repository root,
- reject path traversal,
- reject output paths that are not Git-ignored,
- allow only a dedicated review-artifact area or another path proven ignored by `git check-ignore`,
- never create non-ignored review artifacts in the working tree,
- do not silently delete an existing output directory.

Use read-only Git checks only.

Add tests for:

- default ignored output accepted,
- ignored custom output accepted,
- non-ignored output rejected,
- symlink/junction escape rejected,
- repository-root output rejected.

---

# 6. Post-Archive Repository Fingerprint

After:

- source copy,
- manifest creation,
- ZIP creation,
- ZIP verification,
- checksum sidecar creation,
- optional Desktop export,

capture one final repository fingerprint excluding approved ignored artifacts.

Compare it with the fingerprint captured immediately after verification.

If the repository changed:

- return `WorkingTreeChangedDuringBundleCreation`,
- report repository-relative paths only,
- do not claim `ReadyForReview`.

This closes the final source-state race between the pre-archive recheck and completion.

Add an injected end-to-end test that modifies a non-excluded source during archive/export and proves safe failure.

---

# 7. Git Evidence Completeness

Keep `status-short.txt` and `changed-files.json` as authoritative sources for untracked files.

Improve textual evidence so it is not misleading:

- clearly label unstaged diff evidence,
- clearly label staged diff evidence,
- clearly label base-reference diff evidence when supplied,
- record untracked integrity evidence separately.

Do not claim `diff-name-status.txt` contains untracked files.

Update README and documentation wording accordingly.

---

# 8. Task Specification History

Add the approved corrective specification to:

```text
docs/05-Development/Tasks/QSC-DEV-001-R1-Review-Evidence-Hardening.md
```

Also add this R2 specification to:

```text
docs/05-Development/Tasks/QSC-DEV-001-R2-Final-Git-and-Archive-Hardening.md
```

These Markdown task specifications belong in Git.

Temporary ZIP review bundles and `.sha256` files do not belong in Git.

---

# 9. Documentation Updates

Update bilingual documentation:

- `docs/05-Development/Automated-Task-Review-Bundle.md`
- `docs/05-Development/Reports/README.md` only when necessary
- relevant development index if necessary

Document:

- staged, unstaged, and untracked integrity gates,
- read-only untracked whitespace validation,
- exact manifest payload coverage,
- safe ignored output-directory policy,
- post-archive fingerprint check,
- distinction between textual Git diff evidence and changed-file metadata.

Keep English and Arabic aligned.

---

# 10. Scope Protection

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
- catalog UI,
- application routes,
- deployment configuration.

Do not add runtime dependencies.

Do not begin Task 3.14.6.

---

# 11. Verification

Run and report exact results:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
npm.cmd run review:bundle -- --task=DEV-001-R2 --report=docs/05-Development/Reports/DEV-001-R2-Final-Report.md
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

The self-review run must:

- use the dedicated safe `TEST_DATABASE_URL`,
- export ZIP and `.sha256`,
- include all final changed source files,
- prove staged/unstaged/untracked integrity,
- prove exact manifest coverage,
- prove output-path safety,
- prove post-archive repository stability,
- contain no secret,
- create no Git stage or commit.

---

# 12. Acceptance Criteria

The correction is accepted only when:

- unstaged whitespace errors block readiness,
- staged whitespace errors block readiness,
- untracked text whitespace errors block readiness,
- binary untracked files are handled safely,
- no Git index write occurs,
- manifest payload paths exactly equal ZIP payload paths excluding the manifest,
- missing or extra manifest payload entries fail,
- custom output cannot escape through symlink/junction ancestors,
- custom output must be Git-ignored,
- repository-root output is rejected,
- repository state is revalidated after archive/export,
- concurrent non-excluded mutation causes safe failure,
- R1 and R2 specifications are stored as official Markdown task history,
- no production or business architecture changes occur,
- all tests and verification commands pass,
- no unrelated files change,
- no Git commit is created.

---

# 13. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Unstaged Git Integrity
6. Staged Git Integrity
7. Untracked Git Integrity
8. Base Reference Integrity
9. Git Integrity Manifest Contract
10. Git Index Write Protection
11. Manifest Payload Set Equality
12. Missing Payload Detection
13. Extra Payload Detection
14. Duplicate Payload Detection
15. Payload Hash Verification
16. Output Path Ancestor Safety
17. Ignored Output Policy
18. Output Collision Policy
19. Post-Archive Fingerprint
20. Bundle-Creation Mutation Detection
21. Git Evidence Documentation
22. Task Specification History
23. Exact Source Integrity
24. Secret Safety
25. ZIP and Sidecar Result
26. Desktop Export Result
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

Stop after DEV-001-R2.
