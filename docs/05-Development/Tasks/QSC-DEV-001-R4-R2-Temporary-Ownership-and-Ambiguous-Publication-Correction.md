# DEV-001-R4-R2 — Temporary Ownership and Ambiguous Publication Correction

**Project:** Quadcore Smart Catalog — QSC
**Parent:** DEV-001-R4-R1
**Target Branch:** `chore/review-report-desktop-export`
**Implementation:** TypeScript only
**Documentation:** English and Arabic

Do not modify Product, Product Media, Product Entry, PostgreSQL schema, migrations, dependencies, UI, or Task 3.14.8.
Do not stage, commit, push, or merge.

---

# 1. Objective

Close the remaining DEV-001 publication-boundary gaps:

1. make all temporary artifacts invocation-unique,
2. create temporary artifacts exclusively,
3. prevent one invocation from overwriting or cleaning another invocation's temporary files,
4. handle `publishNoReplace` throw-after-create ambiguity truthfully,
5. add true preparation-concurrency and ambiguous-publication tests,
6. correct the Final Report,
7. regenerate a `ReadyForReview` bundle.

Preserve all accepted R4 and R1 behavior.

---

# 2. Invocation Identity

Create one strong invocation identifier at the start of bundle generation.

Requirements:

```text
cryptographically strong
portable filename characters
not derived only from PID or current milliseconds
not a credential
not exposed as a tenant or user identifier
```

A UUID without separators, or equivalent random token, is acceptable.

The same invocation identifier must be used for every temporary artifact created by that invocation.

---

# 3. Invocation-Unique Temporary Names

Temporary artifacts must not use only:

```text
.review-temp
.2.review-temp
```

Use names equivalent to:

```text
.<final-basename>.<invocation-id>.review-temp
```

for:

```text
local ZIP
local SHA-256
Desktop Final Report
Desktop ZIP
Desktop SHA-256
Desktop preflight probe
```

Temporary names remain in the relevant final destination directory.

Historical temporary files from another invocation must not be overwritten or deleted.

---

# 4. Exclusive Temporary Creation

Every temporary file must be created with exclusive-create semantics.

Required contract:

```text
create only when absent
fail on EEXIST
never truncate an existing temporary file
```

Preparation helpers must not use ordinary overwrite-capable copy/write calls for first creation.

When copying source bytes into an invocation-owned temporary path, use an exclusive destination operation and verify bytes afterward.

Checksum creation must also be exclusive for the invocation-owned checksum path.

---

# 5. Cleanup Ownership

Cleanup may target only temporary files carrying the current invocation identifier and final files proven to have been created by the current invocation.

Do not discover cleanup targets by broad filename pattern.

Do not remove:

- another invocation's temporary files,
- historical final artifacts,
- unknown `.review-temp` residue.

Cleanup should continue after one failure and report reconciliation when state cannot be restored.

---

# 6. Ambiguous `publishNoReplace` Failure

The current sequence:

```typescript
publishNoReplace(...);
record.finalCreated = true;
```

does not cover an operation that creates a destination and then throws.

Correct the contract using one reviewed approach.

## Preferred approach

Use an atomic no-replace hard link from a complete temporary file in the same directory:

```text
temporary complete
link temporary → final atomically
final exists complete or not at all
unlink temporary after verification
```

The operation must be tested on active Windows and POSIX platforms.

## Alternative approach

Return or throw a typed publication outcome that distinguishes:

```typescript
type ExclusivePublicationOutcome =
  | { type: "Published" }
  | { type: "DestinationExists" }
  | { type: "StateUnknown"; reconciliationRequired: true };
```

A `StateUnknown` outcome must become `ArtifactPublicationPartialFailure`.

Never remove a destination after `DestinationExists`, because it may be historical.

---

# 7. True Concurrency Tests

Add deterministic tests that model two invocations before either temporary set exists.

Required tests:

1. two invocations resolve the same final set,
2. each receives a distinct invocation identifier,
3. each receives a distinct temporary set,
4. both prepare concurrently without overwriting bytes,
5. only one final publication succeeds,
6. the winner's report, ZIP, and checksum remain byte-identical,
7. the loser cleans only its own temporaries,
8. the loser's cleanup does not alter the winner's temporaries or finals,
9. pre-existing unknown `.review-temp` residue remains untouched.

Use controlled barriers/hooks rather than timing sleeps.

---

# 8. Ambiguous Publication Tests

Add deterministic Infrastructure tests for:

1. publication creates a final and then throws,
2. the error becomes reconciliation-required when ownership/state is ambiguous,
3. `EEXIST` preserves historical bytes and does not trigger historical cleanup,
4. a completed atomic link cannot expose partial bytes,
5. cleanup continues for other owned paths after ambiguity,
6. no absolute path, username, raw OS error, or invocation token leaks in the public error.

---

# 9. Preflight Probe

Use the invocation identifier for the Desktop preflight probe.

Create it exclusively.

Cleanup only the exact probe owned by the current invocation.

Do not use PID plus milliseconds as the sole identity.

---

# 10. Final Report Correction

Update:

```text
docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

Correct or extend:

```text
Two-Phase Publication
All-or-Nothing Guarantee
Failure Cleanup
Previous Artifact Preservation
Tooling Tests
Remaining Risks
Status
```

The report must distinguish:

```text
final no-clobber
temporary invocation isolation
ambiguous publication state
process interruption residue
```

Do not claim true simultaneous-publisher coverage unless both preparation and publication concurrency are tested.

---

# 11. Required Verification

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

Audit findings remain visible and non-blocking under the current accepted baseline.

---

# 12. Hosted Compatibility

The Pull Request must run:

```text
Quality
PostgreSQL Integration
DEV-001 Review Export Compatibility (ubuntu-latest)
DEV-001 Review Export Compatibility (windows-latest)
```

Compatibility jobs must exercise:

```text
exclusive temporary creation
atomic no-replace final publication
true two-invocation isolation
```

Do not claim hosted success before those jobs run.

---

# 13. Acceptance Criteria

R2 is accepted only when:

1. every temporary artifact is invocation-unique,
2. every temporary first creation is exclusive,
3. two invocations cannot share or overwrite temporary files,
4. cleanup targets only current-invocation artifacts,
5. unknown residue is preserved,
6. final `EEXIST` never deletes historical content,
7. throw-after-create cannot be misreported as an ordinary clean failure,
8. ambiguous final state is reconciliation-required,
9. tests model concurrency before temporary preparation,
10. only one publisher wins the final names,
11. winner bytes and hashes remain unchanged,
12. loser cleanup is isolated,
13. all existing DEV-001 tests remain passing,
14. all required verification passes,
15. no unrelated architecture changes,
16. no Git commit is created,
17. Task 3.14.8 remains untouched.

---

# 14. Review Bundle

Preserve historical bundles.

Generate:

```powershell
npm.cmd run review:bundle -- --task=DEV-001-R4-R2 --report=docs/05-Development/Reports/DEV-001-R4-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-DEV-001-R4-R2-Final-Report.md
QSC-Task-DEV-001-R4-R2-Review.zip
QSC-Task-DEV-001-R4-R2-Review.zip.sha256
```

A shared timestamp/counter suffix is acceptable.

Required manifest result:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Do not retry automatically after a failed run.

Stop after producing the R2 review evidence.
