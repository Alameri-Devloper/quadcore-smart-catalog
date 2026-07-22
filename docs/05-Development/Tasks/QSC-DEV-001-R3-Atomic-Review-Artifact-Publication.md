# DEV-001-R3 — Atomic Review Artifact Publication
## Final Failure-Safety Correction for the Automated Task Review Bundle

**Project:** Quadcore Smart Catalog — QSC
**Parent Tasks:** DEV-001, DEV-001-R1, DEV-001-R2
**Task Type:** Final focused developer-tooling reliability correction
**Architecture Status:** No business architecture change
**Implementation Language:** TypeScript only
**Target Branch:** `chore/automated-task-review-bundle`

Do not begin Task 3.14.6.

Do not stage, commit, push, or merge.

Do not modify Product Domain, Application, PostgreSQL production schema or migrations, Product Entry, Smart Save, media behavior, or runtime business logic.

---

# 1. Objective

Close the final trust gap found during review of `QSC-Task-DEV-001-R2-Review.zip`.

The current implementation creates and exports final-looking ZIP and checksum files before the final post-archive repository fingerprint succeeds. If the repository changes during archive creation or Desktop export, the command fails correctly, but a ZIP whose embedded manifest says `ReadyForReview` may remain locally or on the Desktop.

Implement atomic artifact publication so that:

1. final-looking ZIP and `.sha256` names appear only after all repository-stability checks pass,
2. a failed run leaves no publishable review ZIP/checksum pair from that invocation,
3. temporary artifacts created by the tool are cleaned safely,
4. existing user artifacts are never overwritten or deleted,
5. local and Desktop ZIP/checksum pairs are verified before promotion,
6. focused tests prove failure safety.

---

# 2. Existing R2 Results to Preserve

Preserve:

- staged, unstaged, untracked, and optional base-reference Git integrity gates,
- exact manifest payload set equality,
- exact payload hashes,
- safe ignored output-directory validation,
- symlink/junction ancestor protection,
- final-state source collection,
- verification-time mutation detection,
- post-archive repository fingerprint comparison,
- exact source copying,
- source secret fail-closed behavior,
- evidence sanitization,
- detached SHA-256 checksum,
- Desktop collision handling,
- no Git writes,
- TypeScript-only tooling,
- current test and documentation coverage.

---

# 3. Problem to Correct

The current sequence is effectively:

```text
Create final local ZIP
→ Create final local checksum
→ Export final Desktop ZIP/checksum
→ Run final repository fingerprint
→ Fail when repository changed
```

Therefore a failed invocation can leave apparently valid artifacts.

This violates the intended workflow:

```text
Successful command
= publishable evidence

Failed command
= no publishable evidence from that invocation
```

---

# 4. Two-Phase Artifact Publication

Implement two phases.

## Phase A — Prepare and verify temporary artifacts

Use invocation-owned temporary paths that cannot be mistaken for final artifacts:

```text
<final-name>.review-temp
<final-name>.sha256.review-temp
```

or a dedicated invocation-owned temporary directory beneath the ignored artifact root.

Perform:

1. Create temporary local ZIP.
2. Reopen and verify ZIP entries, manifest payload equality, and hashes.
3. Create temporary local checksum.
4. Verify temporary checksum against temporary ZIP.
5. Capture repository fingerprint.
6. Prepare temporary Desktop ZIP/checksum when Desktop export is enabled.
7. Verify Desktop temporary ZIP checksum and byte equality with local temporary ZIP.
8. Capture the final repository fingerprint after temporary Desktop export.

No final `.zip` or `.zip.sha256` filename may exist yet.

## Phase B — Publish

Only when every check passes:

1. Atomically rename the local temporary ZIP to the collision-safe final ZIP.
2. Atomically rename its temporary checksum to the matching final checksum.
3. Atomically rename the Desktop temporary ZIP/checksum pair to their final collision-safe names.
4. Return and print final paths.

Use the strongest atomic rename semantics available on the platform.

Do not silently overwrite an existing file.

---

# 5. Failure Cleanup

On any failure before complete publication:

- remove only temporary files and temporary directories created by the current invocation,
- never remove or modify source files,
- never remove an existing final review ZIP/checksum,
- never remove a prior Desktop review artifact,
- never modify Git state,
- never remove database or media files.

After cleanup, rethrow the original safe typed error.

The cleanup operation is allowed only for tool-owned temporary artifacts.

Update the AGENTS.md wording only if necessary to clarify:

```text
The review tool may clean temporary artifacts created by its own failed invocation.
It must never delete project source, user data, prior review evidence, or Git content.
```

Do not weaken the general Git and source-file protection rules.

---

# 6. Publication Pair Integrity

A review artifact is publishable only as a verified pair:

```text
QSC-Task-<task>-Review.zip
QSC-Task-<task>-Review.zip.sha256
```

Before final publication verify:

- the checksum file names the matching ZIP,
- the checksum is lowercase SHA-256,
- the checksum matches ZIP bytes,
- local and Desktop ZIP hashes match,
- local and Desktop sidecar hashes identify their corresponding ZIP filenames,
- ZIP verification has already passed.

If only one member of a final pair can be promoted, treat publication as failed and avoid leaving a partial final pair where platform semantics permit.

Use temporary pair names in the same destination directory to maximize rename atomicity.

---

# 7. Post-Publication Safety

After final renames:

- verify both final local files exist,
- verify both final Desktop files exist when export is enabled,
- recheck ZIP/checksum agreement,
- do not rerun source-changing verification commands,
- do not modify the repository.

If an unexpected post-promotion filesystem error occurs, return a typed `ArtifactPublicationFailed` result and report the paths requiring manual inspection. Do not delete previously existing evidence.

The ordinary successful path must leave exactly one new local pair and, when enabled, one new Desktop pair.

---

# 8. Collision Handling

Resolve collision-safe final names before creating temporary files.

Rules:

- existing final ZIP or checksum causes selection of a timestamped/counter name,
- ZIP and checksum always share one resolved base filename,
- local and Desktop collision resolution remain independent,
- temporary paths derive from the resolved final paths,
- temporary names must also avoid collision,
- never overwrite prior evidence.

---

# 9. Focused Tests

Add or extend tests covering:

## 9.1 Mutation after archive preparation

Inject a source change after temporary archive creation.

Verify:

- command rejects with `WorkingTreeChangedDuringBundleCreation`,
- no final local ZIP/checksum exists,
- no final Desktop ZIP/checksum exists,
- tool-owned temporary files are removed,
- source change remains untouched,
- no Git write occurs.

## 9.2 Mutation during Desktop temporary export

Inject a source change during temporary Desktop export.

Verify the same failure-safety conditions.

## 9.3 Checksum creation failure

Inject checksum-writing failure.

Verify no final pair is published and temporary artifacts are cleaned.

## 9.4 Desktop export failure

Inject copy/write failure.

Verify:

- no final Desktop pair,
- no misleading successful result,
- prior Desktop evidence remains unchanged,
- local publication policy follows the approved all-or-nothing orchestration.

Preferred policy for a run requesting Desktop export:

```text
Desktop export failure
→ no new final local or Desktop pair is published
```

The repository evidence directory may remain ignored for diagnosis, but no publishable ZIP/checksum pair may remain.

## 9.5 Successful publication

Verify:

- one final local pair,
- one final Desktop pair,
- no `.review-temp` files,
- all checksums match,
- collision-safe existing files remain untouched.

## 9.6 No Desktop export

With `--no-desktop-export`, verify the local pair is published only after final repository stability checks.

---

# 10. Safe Error Model

Add or reuse typed error codes such as:

```text
WorkingTreeChangedDuringBundleCreation
ArtifactPreparationFailed
ArtifactPublicationFailed
DesktopExportFailed
```

Errors must:

- contain safe paths only,
- contain no credentials,
- not claim `ReadyForReview`,
- preserve the original failure category where possible.

---

# 11. Documentation

Update bilingual documentation:

- `docs/05-Development/Automated-Task-Review-Bundle.md`
- relevant report documentation only if necessary.

Document:

- prepared versus published artifacts,
- final-name publication only after all checks,
- failure cleanup limited to invocation-owned temporary files,
- ZIP/checksum pair semantics,
- Desktop export all-or-nothing behavior,
- recovery after interrupted execution,
- collision behavior.

Add this specification to:

```text
docs/05-Development/Tasks/QSC-DEV-001-R3-Atomic-Review-Artifact-Publication.md
```

Temporary ZIPs and checksums remain excluded from Git.

---

# 12. Scope Protection

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

# 13. Verification

Run and report exact results:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
npm.cmd run review:bundle -- --task=DEV-001-R3 --report=docs/05-Development/Reports/DEV-001-R3-Final-Report.md
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

The self-review run must:

- use the dedicated safe `TEST_DATABASE_URL`,
- export one final ZIP/checksum pair only after successful checks,
- contain no temporary artifact,
- verify ZIP/checksum agreement,
- include all final changed source files,
- contain no secret,
- create no Git stage or commit.

---

# 14. Acceptance Criteria

The correction is accepted only when:

- final-looking artifacts are not created before final stability checks,
- failed runs leave no new publishable ZIP/checksum pair,
- temporary artifacts from failed invocations are cleaned,
- existing evidence is never overwritten or deleted,
- local and Desktop pairs are verified before promotion,
- Desktop export is all-or-nothing for an export-enabled run,
- successful runs leave no temporary files,
- collision-safe naming remains correct,
- no Git or source write occurs outside ignored review artifacts,
- all focused tests pass,
- all existing tests pass,
- TypeScript passes,
- lint passes,
- PostgreSQL integration tests pass,
- build passes,
- Drizzle check passes,
- `git diff --check` passes,
- no unrelated files change,
- no Git commit is created.

---

# 15. Required Final Report

Return exactly:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Two-Phase Artifact Preparation
6. Local Temporary ZIP
7. Local Temporary Checksum
8. Desktop Temporary Pair
9. Final Repository Stability Gate
10. Local Pair Publication
11. Desktop Pair Publication
12. Failure Cleanup
13. Existing Evidence Protection
14. Pair Checksum Verification
15. Local and Desktop Equality
16. Collision Handling
17. Mutation After Archive Test
18. Mutation During Export Test
19. Checksum Failure Test
20. Desktop Export Failure Test
21. Successful Publication Test
22. No-Desktop Publication Test
23. Temporary Artifact Cleanup Test
24. Git Write Protection
25. Secret Safety
26. Task Specification History
27. Documentation Updates
28. Existing Product Tests
29. Tooling Unit Tests
30. Tooling Integration Tests
31. PostgreSQL Integration Tests
32. TypeScript Result
33. Integration TypeScript Result
34. Lint Result
35. Build Result
36. Drizzle Check Result
37. Runtime Audit Result
38. Development Audit Result
39. Diff Integrity Result
40. Architecture Integrity Review
41. Remaining Risks
42. Architecture Changes
43. Status

Status must be one of:

- `Ready for review.`
- `Blocked pending architecture decision.`

Stop after DEV-001-R3.
