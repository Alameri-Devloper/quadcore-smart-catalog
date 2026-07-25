# DEV-001-R4-R1 — Exclusive Publication and Rollback Integrity Correction

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** DEV-001-R4 — Final Report Desktop Export
**Target Branch:** `chore/review-report-desktop-export`
**Implementation Language:** TypeScript only
**Documentation:** English and Arabic

Do not modify Product, Product Media, Product Entry, PostgreSQL schema, migrations, dependencies, UI, or Task 3.14.8.
Do not stage, commit, push, or merge.

---

# 1. Objective

Correct the remaining DEV-001-R4 evidence and publication-safety defects:

1. remove task-spec trailing whitespace,
2. replace check-then-rename publication with atomic no-clobber publication,
3. prevent historical artifact overwrite under race/concurrency,
4. report rollback cleanup ambiguity truthfully,
5. add deterministic failure-injection tests,
6. correct the Final Report,
7. regenerate a `ReadyForReview` bundle.

Preserve the existing architecture and successful three-artifact behavior.

---

# 2. Remove Evidence Whitespace

Remove trailing whitespace from:

```text
docs/05-Development/Tasks/QSC-DEV-001-R4-Final-Report-Desktop-Export.md
```

The known lines are:

```text
3, 4, 5, 6, 7, 10
```

Do not change visible wording.

Run:

```powershell
git diff --check
```

LF/CRLF warnings are acceptable; trailing-whitespace findings are not.

---

# 3. Atomic No-Clobber Publication

The following pattern is forbidden as the no-overwrite guarantee:

```typescript
if (!existsSync(finalPath)) {
  renameSync(temporaryPath, finalPath);
}
```

A precheck is not atomic and `rename` may replace a destination on POSIX.

Create or extend an Infrastructure-only filesystem publication seam with an operation equivalent to:

```typescript
publishNoReplace(temporaryPath, finalPath): void
```

Required contract:

- create the final only when it does not exist,
- fail atomically when the final exists,
- never overwrite a report, ZIP, or checksum,
- work for local and Desktop artifacts,
- preserve temporary source until final publication is verified or the owned cleanup path is known,
- return sanitized typed failures.

Use a reviewed Node primitive with exclusive destination creation, for example `COPYFILE_EXCL`, or another explicit no-replace strategy.

Do not rely on `existsSync` for correctness. It may remain only as an early diagnostic optimization.

---

# 4. Publication Transaction State

Track each current-invocation artifact through explicit logical states:

```text
Prepared
Published
Verified
TemporaryCleaned
RolledBack
RollbackFailed
```

The state is Infrastructure/tooling state and must not enter Product Domain code.

Publication includes:

```text
local ZIP
local SHA-256
Desktop Final Report
Desktop ZIP
Desktop SHA-256
```

When Desktop export is disabled, publication includes only the local pair.

---

# 5. Rollback and Partial Publication

If any publication or verification step fails:

1. attempt rollback for every current-invocation final that was created,
2. do not stop cleanup after the first cleanup failure,
3. attempt cleanup of every current-invocation temporary artifact,
4. preserve all pre-existing historical artifacts,
5. retain the original failure as the primary cause when rollback fully succeeds.

If rollback cannot restore the pre-publication state, throw a dedicated sanitized error such as:

```typescript
ArtifactPublicationPartialFailure
```

Required semantics:

```typescript
operation: "publish-review-artifacts";
reconciliationRequired: true;
```

The error must not expose:

- absolute paths,
- usernames,
- raw ACL details,
- another invocation's artifact contents.

The CLI should print a stable logical message and stop without retrying.

---

# 6. Outer Cleanup Safety

The outer bundle catch must not use cleanup calls that abort on the first `rmSync` failure.

Create a cleanup result that records:

```typescript
attemptedCount
removedCount
failedCount
```

If `failedCount > 0`, return or throw the partial-publication failure.

Do not falsely report ordinary `ArtifactPublicationFailed` when final artifacts may remain.

---

# 7. Deterministic Tests

Add deterministic TypeScript tests for:

1. a historical destination appears after name resolution but before publication,
2. the no-clobber primitive preserves the historical bytes,
3. two publishers resolve the same names and only one succeeds,
4. the second publisher does not alter the first publisher's artifacts,
5. Ubuntu/POSIX no-replace behavior,
6. Windows no-replace behavior,
7. publication failure after one final succeeds,
8. rollback deletion succeeds and restores the pre-publication state,
9. rollback deletion fails for one final,
10. cleanup still attempts all other owned finals,
11. rollback ambiguity throws `ArtifactPublicationPartialFailure`,
12. temporary cleanup failure is reported without deleting historical files,
13. post-publication verification failure plus rollback failure,
14. no absolute path or raw OS error leaks,
15. existing DEV-001 tests remain passing.

Use injected filesystem operations. Do not depend on random ACL behavior as the primary test method.

---

# 8. Final Report Correction

Update:

```text
docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

Correct the sections covering:

```text
All-or-Nothing Guarantee
Failure Cleanup
Previous Artifact Preservation
Tooling Tests
Remaining Risks
Status
```

The report must distinguish:

```text
successful rollback
reconciliation-required partial publication
process interruption residue
```

Do not claim absolute all-or-nothing behavior when rollback itself fails.

After correction and verification, Status may be:

```text
Ready for review.
```

---

# 9. Required Verification

Run:

```powershell
npx.cmd tsc --noEmit
npx.cmd tsc --project tsconfig.integration.json
npm.cmd run lint
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run db:check
git diff --check
git status --short
git diff --name-status
git diff --stat
npm.cmd audit --omit=dev
npm.cmd audit
```

Audit findings remain visible and non-blocking under the accepted temporary baseline.

---

# 10. Hosted Compatibility

The Pull Request must run:

```text
Quality
PostgreSQL Integration
DEV-001 Review Export Compatibility (ubuntu-latest)
DEV-001 Review Export Compatibility (windows-latest)
```

The compatibility jobs must exercise the no-clobber publication tests.

Do not claim hosted success in the local report before the Pull Request run.

---

# 11. Acceptance Criteria

R1 is accepted only when:

1. `git diff --check` passes,
2. final publication cannot overwrite an existing destination,
3. correctness does not depend on an `existsSync` precheck,
4. simultaneous publishers preserve the first completed artifact set,
5. rollback attempts every owned final,
6. cleanup failure becomes a truthful reconciliation-required error,
7. no historical artifact is deleted or changed,
8. no absolute path or raw OS error leaks,
9. three Desktop artifacts remain byte/hash consistent,
10. local ZIP and Desktop ZIP remain identical,
11. repository fingerprints remain stable,
12. all required tests pass,
13. no unrelated architecture changes,
14. no Git commit is created,
15. Task 3.14.8 remains untouched.

---

# 12. Required Final Report

Update the existing report rather than creating another implementation report:

```text
docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

Add a clearly labelled R1 correction section or update the existing relevant sections with factual evidence.

---

# 13. Review Bundle

Preserve historical review bundles.

Archive only an incomplete active output directory when necessary.

Generate:

```powershell
npm.cmd run review:bundle -- --task=DEV-001-R4-R1 --report=docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

The corrected tool must export:

```text
QSC-Task-DEV-001-R4-R1-Final-Report.md
QSC-Task-DEV-001-R4-R1-Review.zip
QSC-Task-DEV-001-R4-R1-Review.zip.sha256
```

A shared timestamp/counter suffix is acceptable.

Required manifest result:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Do not retry automatically after a failed run.

Stop after producing the R1 report evidence and three Desktop artifacts.
