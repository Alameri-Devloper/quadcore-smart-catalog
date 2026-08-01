# Task 3.14.8-R3 — Independent Review Report
## تقرير المراجعة المستقلة للمهمة 3.14.8-R3

**Project:** Quadcore Smart Catalog — QSC

**Task:** Durable Terminal Transitions and Review Evidence Correction

**Reviewed artifacts:**

- `QSC-Task-3.14.8-R3-Final-Report.md`
- `QSC-Task-3.14.8-R3-Review.zip`
- `QSC-Task-3.14.8-R3-Review.zip.sha256`

**Decision:** The archive is authentic and all required verification commands executed successfully, including 44 PostgreSQL integration tests. The submitted manifest is nevertheless `VerificationFailed`, Git integrity is failed, and several external-effect recovery paths remain unsafe. Task 3.14.8-R4 is required before Git commit.

---

# 1. Executive Decision | القرار التنفيذي

The ZIP and detached checksum match. Archive paths, manifest payload coverage, copied-source hashes, and standalone Final Report identity are valid.

The bundle records successful TypeScript, integration TypeScript, lint, unit tests, PostgreSQL integration, production build, and Drizzle verification. Both authorized npm audits also completed.

The bundle manifest still says:

```text
overallStatus: VerificationFailed
gitIntegrity.passed: false
```

Independent source review also found blocking defects in initial partial-operation recovery, cancellation conflict recovery, cleanup conflict recovery, and storage-probe classification.

```text
Artifact integrity: Passed
Manifest coverage: Passed
Report byte identity: Passed
PostgreSQL integration: Passed
Drizzle verification: Passed
Audit evidence: Passed

Git integrity: Failed
Initial partial-operation durability: Failed
Cancellation post-delete conflict recovery: Failed
Cleanup post-delete conflict recovery: Failed
Storage-probe classification: Failed
Report/manifest agreement: Failed

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R4 required: Yes
```

---

# 2. Artifact Integrity | سلامة الملفات

```text
ZIP SHA-256:
a189db6b2a5f819ec57977b9dc5c9bf8c8048835eb3595ffa76b0c6c97e1519b

Detached SHA-256:
a189db6b2a5f819ec57977b9dc5c9bf8c8048835eb3595ffa76b0c6c97e1519b

Result:
Matched
```

```text
ZIP entries including manifest: 54
Manifest payload entries: 53
Missing payloads: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
Unsafe archive paths: 0
```

The standalone Final Report is byte-for-byte identical to both report copies inside the ZIP.

```text
Final Report SHA-256:
ca803411291b58f7f5241a6a86044ef591ef591b40335f8547b319f74e4d36f5
```

---

# 3. Manifest and Git Integrity Failure | فشل البيان وسلامة Git

The manifest records:

```text
taskId: 3.14.8-R3
overallStatus: VerificationFailed
gitIntegrity.untracked.passed: false
gitIntegrity.passed: false
```

Trailing whitespace remains in:

```text
docs/05-Development/Reports/QSC-Task-3.14.8-R2-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Tasks/QSC-Task-3.14.8-R3-Durable-Terminal-Transitions-and-Review-Evidence-Correction.md
lines 4, 5, 6, 7, 8, 201, and 224
```

The Final Report says Git whitespace integrity passed and the task is Ready for review, but the submitted manifest is failed. The report must describe the actual exported bundle status.

---

# 4. Positive R3 Findings | النتائج الإيجابية

R3 correctly demonstrates:

- 44/44 PostgreSQL integration tests across all configured suites,
- distinct guarded application and test database identities,
- successful TypeScript, lint, unit, build, and Drizzle checks,
- focused Workspace-scoped terminal transitions,
- empty-command rejection before effects,
- durable `SourceUnavailable` behavior in normal retry paths,
- reachable Remove retry,
- Metadata-only rollback,
- deterministic cover normalization,
- collision-free display-order allocation,
- canonical `catalog_product_images` ownership,
- completed runtime and full npm audits.

These are valuable corrections and must be preserved.

---

# 5. High — Initial Partial-Operation Ambiguity Can Be Downgraded
## مرتفع — يمكن خفض غموض العملية الأولية إلى حالة غير صحيحة

In the initial Execute path, `ProductMediaStoragePartialOperationError` marks the operation as:

```text
ReconciliationRequired
retryAllowed = false
```

If the following persistence attempt fails, the recovery branch does not preserve that status.

For Add or Replace, an empty or successful compensation set can convert it to:

```text
SourceUnavailable
requiresNewSource = true
```

For Remove, it can convert it to:

```text
Failed
retryAllowed = true
```

An ambiguous filesystem effect must never become a known retryable or source-missing outcome.

### Required correction

Track the initial effect outcome explicitly, equivalent to the Retry typed outcome:

```typescript
type InitialEffectOutcome =
  | { readonly type: "Succeeded"; readonly compensations: readonly Compensation[] }
  | { readonly type: "KnownFailure"; readonly retryAllowed: boolean }
  | { readonly type: "ReconciliationRequired" };
```

When the outcome is `ReconciliationRequired`:

- do not run generic compensation,
- do not convert to `SourceUnavailable`,
- do not convert to retryable `Failed`,
- use the focused reconciliation transition,
- reload and verify the durable operation state in tests.

---

# 6. High — Cancellation Reuses a Stale Workflow Version
## مرتفع — الإلغاء يعيد استخدام إصدار دورة قديم

Cancellation deletes the owned Staging object and then calls the focused `Cancelled` transition.

If that transition conflicts, the fallback immediately calls another focused transition using the same local `workflow.version`.

When the first failure was caused by an unrelated concurrent Workflow update, the second call is guaranteed to conflict again.

Possible result:

```text
Filesystem: Staging deleted
Database operation: still Failed or Staged
retryAllowed: still true
Public result: ReconciliationRequired
Durable reconciliation state: not established
```

### Required correction

After any post-delete transition conflict:

1. reload the Workflow within the same Workspace,
2. inspect the current operation state,
3. if another actor already established a compatible terminal truth, return it,
4. if the operation remains retryable, attempt one focused transition with the reloaded version,
5. never reuse the stale expected version,
6. if durable state still cannot be established, return a sanitized reconciliation-required result without claiming persistence.

Add deterministic tests where another operation advances the Workflow version between deletion and cancellation persistence.

---

# 7. High — Cleanup Reuses a Stale Workflow Version
## مرتفع — التنظيف يعيد استخدام إصدار دورة قديم

Expired cleanup has the same defect.

After physical Staging deletion, a failed SourceUnavailable transition is followed by a reconciliation transition using the same stale Workflow version and previous status.

The comment that a concurrent transition owns the durable truth is not proven. A concurrent update may concern a different operation in the same Workflow.

### Required correction

For every cleanup operation:

- reload after transition conflict,
- inspect that exact operation,
- use the reloaded Workflow version,
- count only durably committed SourceUnavailable transitions,
- verify a compatible concurrent terminal state before suppressing an error,
- never leave a known deleted source represented as retryable merely because another operation changed the Workflow version.

---

# 8. High — Storage Probe Failure Is Misclassified as SourceUnavailable
## مرتفع — فشل فحص التخزين يصنف كمصدر غير متاح

For Add and Replace retry, the code handles both cases identically:

```text
temporaryExists returned Failed
temporaryExists returned Exists(false)
```

Both become:

```text
SourceUnavailable
requiresNewSource = true
```

A failed storage probe means the adapter could not determine the state. It does not prove that Staging is missing.

This can force a new upload during a temporary filesystem outage and hide an ambiguous infrastructure condition.

### Required correction

Use distinct mappings:

```text
Exists(false)
→ SourceUnavailable
→ requiresNewSource = true

Failed with known unavailable provider
→ ProductMediaStorageFailed
→ do not invalidate the source

Failed with ambiguous partial state
→ ReconciliationRequired
```

Do not mutate the durable operation to SourceUnavailable unless absence or expiry is known.

---

# 9. High — Missing Canonical Final Object Is Not Reconciled
## مرتفع — غياب الملف النهائي الأساسي لا يدخل المصالحة

Before Replace or Remove retry, the canonical Media row can exist while the final object is missing.

The current path throws `ProductMediaStorageFailed` and leaves the operation retryable.

That is a database/filesystem divergence, not an ordinary transient retry failure.

### Required correction

Distinguish:

```text
storage probe failed
→ storage/infrastructure failure

probe succeeded and final does not exist
→ ReconciliationRequired
→ retryAllowed = false
```

Persist the reconciliation state through the focused transition before returning when PostgreSQL is available.

---

# 10. Medium — Missing Root During Cleanup Is Silently Ignored
## متوسط — غياب الجذر أثناء التنظيف يتم تجاهله

Cleanup silently skips a Workflow when its immutable Media root cannot be found.

An immutable root missing for an operation that owns Staging indicates inconsistent persisted state.

### Required correction

Do not pattern-derive or delete any path without the root.

Record or surface a reconciliation-required cleanup result for the affected operation or Workflow. Do not silently treat it as normal cleanup inactivity.

---

# 11. Report Accuracy | دقة التقرير

The R3 Final Report retains stale R2 wording in:

- Summary,
- Files Created,
- Files Modified.

It also claims Git integrity passed and Ready for review despite the failed manifest.

The next report must be generated from the final exported evidence and must agree with:

```text
manifest.overallStatus
manifest.gitIntegrity.passed
verification exit codes
```

---

# 12. Required Test Additions | الاختبارات المطلوبة

Add deterministic tests for:

1. initial Add partial-operation ambiguity plus save failure remains ReconciliationRequired,
2. initial Replace partial ambiguity remains ReconciliationRequired,
3. initial Remove partial ambiguity remains ReconciliationRequired,
4. cancellation reloads after an unrelated Workflow version advance,
5. cancellation never retries a transition with the stale version,
6. cleanup reloads after an unrelated Workflow version advance,
7. cleanup counts only a durably established result,
8. `temporaryExists` adapter failure does not become SourceUnavailable,
9. known missing Staging becomes SourceUnavailable,
10. missing canonical final object becomes ReconciliationRequired,
11. storage probe failure remains a storage/reconciliation result,
12. missing immutable root during cleanup is surfaced,
13. all review documents pass untracked whitespace integrity,
14. report status matches manifest status.

Do not use timing sleeps.

---

# 13. Final Decision | القرار النهائي

```text
Artifact authenticity: Approved
R3 implementation direction: Approved
PostgreSQL integration: Approved
Drizzle and audit evidence: Approved

Bundle status: Rejected
Git integrity: Rejected
Initial ambiguity durability: Rejected
Cancellation conflict recovery: Rejected
Cleanup conflict recovery: Rejected
Storage-probe classification: Rejected
Report accuracy: Rejected

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R4 required: Yes
```

Do not stage, commit, push, merge, or begin Task 3.14.9 before R4 is reviewed.
