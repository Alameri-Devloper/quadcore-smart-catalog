# Sprint 03 — Task 3.14.7-R3
## Publication Compensation and Review-Evidence Integrity Correction

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** Task 3.14.7
**Target Branch:** `feature/product-media-storage-foundation`
**Architecture:** Preserve DDD, Clean Architecture, Modular Monolith, Multi-Tenant readiness
**Implementation:** TypeScript only, except documentation
**Documentation:** English and Arabic

Do not begin Task 3.14.8.
Do not stage, commit, push, or merge.
Do not create migration `0003`.
Do not modify migrations `0000`, `0001`, or `0002`.

---

# 1. Objective

Close the remaining Product Media foundation and review-integrity gaps:

1. make `publishNew` truthful under cleanup failure,
2. make `publishReplacement` restore the old final after ordinary thrown publication failure,
3. report publication/replacement ambiguity as reconciliation-required partial operation,
4. add deterministic fault-injection tests,
5. add real PostgreSQL `StorageRootConflict` evidence,
6. align audit statements with actual bundle evidence,
7. remove the temporary R2 report template,
8. update the bilingual final-report index.

Preserve all approved Task 3.14.7, R1, and R2 behavior.

---

# 2. Publication Filesystem Seam

The existing Infrastructure seam currently injects only move/restore `link` and `unlink` operations.

Use the same narrow Infrastructure seam for all publication ownership transitions, including:

```text
publishNew link
publishNew staging unlink
publishNew final cleanup unlink
```

Do not leak Node.js filesystem types into Domain or Application ports.

Do not use uncontrolled permission behavior as the primary test mechanism.

---

# 3. `publishNew` Ownership and Cleanup

Track whether the current operation created the final link.

Required behavior:

## Successful publication

```text
create final without overwrite
inspect and verify final
remove staging
return Published
```

## Verification or ordinary infrastructure failure before staging removal

```text
remove the operation-owned final
preserve staging
return/rethrow the original truthful failure
```

## Staging removal failure after successful final verification

```text
attempt to remove the operation-owned final
preserve staging
```

If cleanup succeeds:

```text
restore pre-publication state
throw sanitized InfrastructureFailure
```

If cleanup fails:

```text
throw ProductMediaStoragePartialOperationError
reconciliationRequired = true
logical operation = publish-new
```

Never silently swallow failure to remove an operation-owned final.

Do not leave an invalid final while returning only `ChecksumMismatch`.

---

# 4. Extend Partial-Operation Semantics

Extend the sanitized partial-operation model to cover at least:

```text
move-to-trash
restore-from-trash
publish-new
publish-replacement
```

The error/result must expose only:

```text
logical operation
reconciliationRequired
```

It must not expose:

- absolute paths,
- another WorkspaceId,
- another ProductId,
- raw operating-system error text containing physical paths.

---

# 5. `publishReplacement` Compensation

After `moveToTrash` succeeds:

## Typed publication failure

Attempt `restoreFromTrash`.

- restore succeeds → return the original typed publication failure,
- restore returns a typed failure → return `ReplacementRestorationFailed`,
- restore throws an ordinary infrastructure failure → throw reconciliation-required `publish-replacement` partial failure,
- restore throws a partial-operation failure → propagate truthful reconciliation-required failure.

## Ordinary thrown publication infrastructure failure

Attempt `restoreFromTrash`.

- restore succeeds → rethrow the original sanitized publication infrastructure error,
- restore fails → throw reconciliation-required `publish-replacement` partial failure.

## Publication partial-operation failure

Do not perform a blind restore because final state is ambiguous.

Propagate the reconciliation-required publication failure.

Do not return `Replaced` unless:

```text
old final is retained in trash
new final is verified
staging is removed
```

---

# 6. Deterministic Failure-Injection Tests

Add focused tests for:

1. final inspection infrastructure failure after final-link creation,
2. final cleanup succeeds and staging remains,
3. final cleanup failure produces `publish-new` partial-operation failure,
4. staging unlink failure after verified final,
5. final rollback succeeds and pre-publication state is restored,
6. final rollback failure produces reconciliation-required state,
7. replacement restores old final after thrown publication infrastructure failure,
8. replacement rethrows the original infrastructure failure after successful restoration,
9. replacement restoration ordinary failure produces `publish-replacement` partial failure,
10. publication partial failure is not followed by blind restore,
11. no unrelated final, trash, or staging object is removed.

Tests must inspect actual logical file state after each injected failure.

---

# 7. PostgreSQL `StorageRootConflict` Evidence

Correct the misleading integration test name.

Add a deterministic provider-global collision test:

1. insert the required Product rows,
2. derive a valid root candidate for Product B,
3. use controlled SQL test setup to occupy that exact provider storage key with another Product row,
4. call `repository.create(candidateB)`,
5. assert exactly:

```text
{ type: "StorageRootConflict" }
```

6. prove the result exposes no conflicting Workspace or Product identity.

Keep strict rehydration corruption tests separate.

Do not weaken global uniqueness.

---

# 8. Audit Evidence Alignment

The next review-bundle run must not explicitly skip:

```text
audit-runtime
audit-full
```

Run:

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
```

through the review bundle's configured verification path.

Because audits are optional:

- an npm registry/network failure may remain non-blocking,
- a vulnerability exit code may remain non-blocking under the accepted baseline,
- evidence output must still be included,
- the final report must state exactly what occurred.

Correct `Task-3.14.7-R2-Final-Report.md` so its historical audit sections state that the submitted R2 bundle explicitly skipped both audits. Do not claim they executed.

---

# 9. Repository Hygiene

Delete:

```text
docs/05-Development/Reports/Task-3.14.7-R2-Final-Report-Template.md
```

It is a temporary template containing `PENDING` placeholders.

Preserve:

```text
docs/05-Development/Reports/Task-3.14.7-R2-Final-Report.md
```

Scan the final changed source set for:

```text
PENDING
TODO
credential URLs
tokens
private-key markers
```

Any remaining `PENDING` must be intentional and documented; none should remain in final implementation reports.

---

# 10. Documentation Index

Update bilingual:

```text
docs/05-Development/Reports/README.md
```

Add entries for:

```text
Task 3.14.7-R2
Task 3.14.7-R3
```

Follow the existing English/Arabic index style.

Correct the R3 final report's Files Created/Modified/Deleted sections so they match the final Git evidence.

---

# 11. Migration Protection

R3 is Application/Infrastructure/test/documentation correction only.

Required:

```text
0000 unchanged
0001 unchanged
0002 SQL unchanged
0002 snapshot unchanged
journal unchanged
no 0003
```

Record SHA-256 comparison or Git evidence in the final report.

---

# 12. Required Verification

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

Run focused Product Media tests on Windows.

Do not claim hosted Ubuntu or Windows success before the Pull Request workflow.

---

# 13. Acceptance Criteria

R3 is accepted only when:

1. `publishNew` never silently ignores failure to remove an owned final,
2. staging remains available after unsuccessful publication,
3. ordinary publication failure restores the pre-publication state when possible,
4. publication cleanup failure is reconciliation-required and truthful,
5. replacement restores the old final after ordinary thrown publication failure,
6. replacement ambiguity is reported as partial operation,
7. blind restore is not attempted after ambiguous publication state,
8. deterministic failure-injection tests cover all required paths,
9. real `StorageRootConflict` mapping is tested,
10. no conflicting tenant identity is exposed,
11. audits are executed or fail with captured optional evidence rather than explicit skip,
12. R2 audit wording matches its actual manifest,
13. the temporary report template is deleted,
14. report indexes include R2 and R3,
15. no `PENDING` remains in final implementation reports,
16. migrations remain byte-identical,
17. all required checks pass,
18. review bundle reports `ReadyForReview`,
19. no Git commit exists,
20. Task 3.14.8 remains untouched.

---

# 14. Required Final Report

Create:

```text
docs/05-Development/Reports/Task-3.14.7-R3-Final-Report.md
```

Required sections:

1. Summary
2. Files Created
3. Files Modified
4. Files Deleted
5. Publication Filesystem Seam
6. Publish-New Ownership
7. Final Verification Failure Cleanup
8. Staging Removal Failure
9. Publish-New Partial Operation
10. Replacement Thrown-Failure Compensation
11. Replacement Partial Operation
12. Blind-Restore Prevention
13. Publication Failure-Injection Tests
14. Replacement Failure-Injection Tests
15. Logical File-State Assertions
16. PostgreSQL StorageRootConflict Test
17. Tenant Identity Leakage Review
18. R2 Audit Report Correction
19. Runtime Audit Evidence
20. Development Audit Evidence
21. Temporary Template Removal
22. Pending-Placeholder Scan
23. Reports Index Update
24. Migration Byte-Integrity Review
25. Ubuntu Hosted Compatibility Status
26. Windows Hosted Compatibility Status
27. TypeScript Result
28. Integration TypeScript Result
29. Lint Result
30. Unit Test Result
31. PostgreSQL Integration Test Result
32. Build Result
33. Drizzle Check Result
34. Architecture Integrity Review
35. Scope Exclusion Review
36. Remaining Risks
37. Architecture Changes
38. Status

Hosted status must be one of:

```text
Not executed yet; requires pull-request workflow run.
Executed successfully with GitHub Actions evidence.
Executed with failure; details documented.
```

Status must be:

```text
Ready for review.
```

or:

```text
Blocked pending architecture decision.
```

---

# 15. Review Bundle

Generate without audit skips:

```powershell
npm.cmd run review:bundle -- --task=3.14.7-R3 --report=docs/05-Development/Reports/Task-3.14.7-R3-Final-Report.md
```

Export ZIP and detached `.sha256` to Desktop.

The manifest must report:

```text
overallStatus: ReadyForReview
```

Do not stage, commit, push, or merge.

Stop after Task 3.14.7-R3.
