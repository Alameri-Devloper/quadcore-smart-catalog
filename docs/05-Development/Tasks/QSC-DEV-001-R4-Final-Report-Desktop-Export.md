# DEV-001-R4 — Final Report Desktop Export

**Project:** Quadcore Smart Catalog — QSC
**Parent:** DEV-001 Automated Task Review Bundle
**Task Type:** Development tooling correction
**Implementation Language:** TypeScript only
**Documentation:** English and Arabic
**Target Branch:** `chore/review-report-desktop-export`

Do not modify Product, Media, Smart Save, PostgreSQL schema, migrations, or UI behavior.
Do not stage, commit, push, or merge.

# 1. Objective

Extend `review:bundle` so every successful task-review export publishes exactly three Desktop artifacts:

```text
QSC-Task-{task}-Final-Report.md
QSC-Task-{task}-Review.zip
QSC-Task-{task}-Review.zip.sha256
```

When any target already exists, generate one shared timestamped basename for all three artifacts.

# 2. Required Guarantees

The export must remain collision-safe, atomic/all-or-nothing, non-overwriting, source-report hash verified, repository-stability verified, sanitized, and limited to invocation-owned temporary artifacts.

Do not publish only one or two of the three artifacts.

If any publication step fails:

- no final Desktop artifact from the current invocation may remain,
- previous artifacts must remain untouched,
- local review artifacts inside the repository must remain valid,
- return a typed failure.

# 3. Report Export

The report supplied through `--report=<path>` must be resolved inside the repository, included in the manifest, copied byte-for-byte to Desktop, verified against the source SHA-256, never rewritten during export, and named with the same sanitized task identifier and timestamp used by ZIP and checksum.

Do not export a report that differs from the report bundled in the ZIP.

# 4. Publication Sequence

Use a two-phase flow:

```text
verify source report
build local ZIP and checksum
prepare temporary Desktop report/ZIP/checksum
verify all temporary artifacts
verify repository fingerprint remains stable
publish all three final names
verify final artifacts
cleanup invocation temporary artifacts
```

Do not claim cross-filesystem atomic rename when Desktop and repository are on different volumes.

# 5. Collision Policy

If any one of the three non-timestamped target names already exists:

- do not overwrite it,
- do not mix timestamped and non-timestamped outputs,
- choose one UTC timestamp,
- apply it to report, ZIP, and checksum,
- recheck collisions immediately before final publication.

# 6. Integrity

Required checks:

- Desktop report SHA-256 equals source report SHA-256,
- checksum file matches Desktop ZIP,
- ZIP manifest report hash matches Desktop report,
- no unsafe path,
- final sizes are non-zero,
- all three artifacts share the same task identifier and timestamp policy.

# 7. Tooling Tests

Add focused TypeScript tests for:

- successful three-artifact export,
- report byte/hash equality,
- shared timestamp collision handling,
- collision caused by report, ZIP, or checksum only,
- failure before publication leaves zero new final artifacts,
- failure after temporary copy cleans invocation-owned files,
- final-publication failure rolls back current-invocation artifacts,
- previous artifacts remain untouched,
- repository fingerprint change blocks publication,
- report changed after bundle generation blocks publication,
- unsafe/external report path rejection,
- Windows and POSIX filename behavior.

Preserve all existing DEV-001 tests.

# 8. Documentation

Update bilingual DEV-001 documentation to state that every successful review bundle exports:

```text
Final Report
Review ZIP
Detached SHA-256
```

Document naming, timestamp collisions, all-or-nothing guarantee, Desktop location, failure behavior, and no-overwrite policy.

# 9. Verification

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test
npm.cmd run build
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Generate a DEV-001-R4 review bundle and prove all three Desktop artifacts exist.

# 10. Acceptance Criteria

Accepted only when:

1. exactly three Desktop artifacts are exported,
2. one shared basename/timestamp policy is used,
3. no existing artifact is overwritten,
4. report bytes and SHA-256 match the bundled report,
5. ZIP checksum matches,
6. all-or-nothing behavior is tested,
7. partial publication cleanup is tested,
8. previous artifacts remain untouched,
9. repository stability remains enforced,
10. existing DEV-001 tests pass,
11. bilingual documentation is updated,
12. no unrelated behavior changes,
13. no Git commit is created.

# 11. Required Final Report

Create:

```text
docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

Required sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Three-Artifact Export
6. Report Source Validation
7. Report Hash Verification
8. Shared Naming Policy
9. Timestamp Collision Policy
10. Two-Phase Publication
11. All-or-Nothing Guarantee
12. Failure Cleanup
13. Previous Artifact Preservation
14. Repository Stability
15. Windows Compatibility
16. Ubuntu Compatibility
17. Tooling Tests
18. TypeScript Result
19. Lint Result
20. Unit Test Result
21. Build Result
22. Runtime Audit Result
23. Development Audit Result
24. Documentation
25. Remaining Risks
26. Architecture Changes
27. Status

Status:

```text
Ready for review.
```

or:

```text
Blocked pending architecture decision.
```

# 12. Review Bundle

Generate:

```powershell
npm.cmd run review:bundle -- --task=DEV-001-R4 --report=docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

The corrected tool must export the Final Report, ZIP, and `.sha256` to Desktop.

Stop after DEV-001-R4.
