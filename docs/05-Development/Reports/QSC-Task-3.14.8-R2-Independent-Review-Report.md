# Task 3.14.8-R2 — Independent Review Report
## تقرير المراجعة المستقلة للمهمة 3.14.8-R2

**Project:** Quadcore Smart Catalog — QSC
**Task:** Retry Integrity, Metadata Recovery, and Evidence Correction
**Reviewed artifacts:**

- `QSC-Task-3.14.8-R2-Final-Report.md`
- `QSC-Task-3.14.8-R2-Review.zip`
- `QSC-Task-3.14.8-R2-Review.zip.sha256`

**Decision:** The R2 implementation contains important corrections, but the submitted bundle is explicitly failed and several durable-state paths remain unsafe. Task 3.14.8-R3 is required before Git commit.

---

# 1. Executive Decision | القرار التنفيذي

The ZIP and detached checksum match. Archive structure, payload coverage, source-copy hashes, and Final Report byte identity are valid.

R2 correctly improves retry versions, Remove retry, Metadata rollback, deterministic cover normalization, display-order allocation, and the Product/Media mutation boundary.

However, the bundle manifest says:

```text
overallStatus: VerificationFailed
gitIntegrity.passed: false
```

The required PostgreSQL integration command also failed inside the bundle because `DATABASE_URL` and `TEST_DATABASE_URL` identified the same database, which the safety guard correctly rejects.

Independent source review found additional blocking durability defects in retry reconciliation, SourceUnavailable persistence, cancellation, cleanup, and consumed Staging handling.

```text
Artifact integrity: Passed
Manifest coverage: Passed
Report byte identity: Passed
TypeScript/lint/unit/build/Drizzle evidence: Passed
Audit evidence: Passed

Git integrity: Failed
Bundled PostgreSQL integration: Failed
Retry reconciliation fallback: Failed
SourceUnavailable persistence: Failed
Cancellation durability: Failed
Cleanup durability: Failed
Consumed-Staging compensation result: Failed

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R3 required: Yes
```

---

# 2. Artifact Integrity | سلامة الملفات

```text
ZIP SHA-256:
f29521ee813ac33ad072dd3ef2994ce0b9ad32aec411c183c42e8c6abaf01d51

Detached SHA-256:
f29521ee813ac33ad072dd3ef2994ce0b9ad32aec411c183c42e8c6abaf01d51

Result:
Matched
```

```text
ZIP entries including manifest: 52
Manifest payload entries: 51
Missing payloads: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
Unsafe paths: 0
```

The standalone Final Report is byte-for-byte identical to both copies inside the ZIP.

```text
Final Report SHA-256:
8eb3d81c285c6bc67a1fe1cace303da9d2a812b0febe12c56c2c5e9006be3bbc
```

---

# 3. Manifest Failure | فشل البيان

The manifest records:

```text
taskId: 3.14.8-R2
overallStatus: VerificationFailed
gitIntegrity.untracked.passed: false
gitIntegrity.passed: false
```

Trailing whitespace exists in:

```text
docs/05-Development/Reports/QSC-Task-3.14.8-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Reports/QSC-Task-3.14.8-R1-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Tasks/QSC-Task-3.14.8-R2-Retry-Integrity-Metadata-Recovery-and-Evidence-Correction.md
lines 4, 5, 6, 7, and 8
```

These findings are blocking under the existing DEV-001 policy.

---

# 4. Bundled PostgreSQL Integration Failed
## فشل تكامل PostgreSQL داخل الحزمة

The required bundled command exited with code 1.

The safety guard reported:

```text
TEST_DATABASE_URL must not target the application database.
```

Three PostgreSQL suites did not run:

```text
postgresql-product-media-root.repository.integration.test
postgresql-product-media-workflow.repository.integration.test
postgresql-product.repository.integration.test
```

The bundle therefore does not contain the claimed 43/43 successful PostgreSQL evidence.

The environment must use two distinct databases:

```text
DATABASE_URL → application/development database
TEST_DATABASE_URL → isolated test database
```

They may use the same PostgreSQL container and credentials, but must not resolve to the same normalized database identity.

The Final Report claims PostgreSQL integration passed and the task is Ready for review, while the submitted manifest is VerificationFailed. That report status is not truthful for this bundle. fileciteturn11file0

---

# 5. Positive R2 Findings | النتائج الإيجابية

R2 correctly adds or improves:

- claimed Workflow version returned by the repository,
- `v → v+1 → v+2` retry intent,
- typed retry effect outcomes,
- prerequisite validation before retry claim,
- reachable Remove retry,
- Trash restoration on Remove Metadata failure,
- shared Metadata-only transition helper,
- deterministic cover normalization,
- sparse display-order allocation,
- explicit `ProductImageMutationNotAllowedError`,
- one canonical `catalog_product_images` table,
- successful Drizzle evidence,
- completed npm audit evidence.

The report accurately describes these intended changes, but its final verification status conflicts with the actual bundle. fileciteturn11file0

---

# 6. High — Reconciliation Can Still Be Converted to Retryable Failed
## مرتفع — ما زال من الممكن تحويل المصالحة إلى فشل قابل للإعادة

In retry, when the storage effect produces `ReconciliationRequired`, the operation is initially marked correctly.

If the terminal save then fails, the fallback branch uses:

```text
restored = true
operation.status = Failed
operation.retryAllowed = true
```

because no compensation is run for a non-success outcome.

This converts an ambiguous filesystem state into a normal retryable failure.

Required invariant:

```text
Once the effect is ReconciliationRequired,
no generic save-failure branch may convert it to Failed.
```

A failed persistence attempt must preserve the public reconciliation result and must attempt a focused reconciliation transition without replaying the filesystem effect.

---

# 7. High — SourceUnavailable Persistence Result Is Ignored
## مرتفع — يتم تجاهل نتيجة حفظ SourceUnavailable

`persistWithoutMediaChange` calls the repository `save` but does not inspect the result.

When retry detects expired or missing Staging:

1. the local operation becomes `SourceUnavailable`,
2. repository save may return a Workflow or Media conflict,
3. the result is ignored,
4. the Use Case throws `ProductMediaSourceUnavailable` as if the transition were durable.

The database can therefore remain:

```text
Failed or Staged
retryAllowed = true
```

while the caller is told the source is unavailable.

Required correction:

- inspect every save result,
- persist SourceUnavailable through a focused Workflow/operation transition that does not require rewriting canonical Media rows,
- return a truthful conflict/reconciliation result when durability cannot be established.

---

# 8. High — Cancellation Deletes Staging Before Durable Cancellation
## مرتفع — الإلغاء يحذف Staging قبل حفظ الإلغاء

Cancellation removes the Staging file first and then saves `Cancelled`.

If the save conflicts or PostgreSQL fails:

```text
Filesystem: Staging removed
Database: old retryable state
Public error: AlreadyInProgress
```

The old database state no longer represents reality.

Required correction:

- use an explicit cancellation transition protocol,
- after successful physical deletion, persist `Cancelled`,
- if persistence cannot complete, persist `SourceUnavailable` or `ReconciliationRequired` through a focused operation transition,
- never report only `AlreadyInProgress` while the source has already been removed,
- add reload-based tests.

---

# 9. High — Expired Cleanup Can Remove Sources Without Durable State
## مرتفع — قد يحذف التنظيف المصادر دون حفظ الحالة

Cleanup can delete multiple Staging files and save the Workflow only once afterward.

If the final save conflicts:

```text
Filesystem: one or more Staging files removed
Database: operations still retryable
cleaned count: not incremented
public result: conflict
```

Although the count avoids false success, the durable operation state is stale.

Required correction:

- process each owned operation through a focused durable transition,
- count only committed SourceUnavailable transitions,
- when the physical file is gone but the transition cannot be saved, report reconciliation-required,
- do not leave retryable database state for a deleted source,
- continue to exclude existing ReconciliationRequired operations.

---

# 10. High — Compensated Add/Replace Lose Their Retry Source
## مرتفع — تعويض الإضافة والاستبدال يفقد مصدر الإعادة

After a successful Add or Replace filesystem effect, the Staging object has been consumed.

When Metadata persistence fails and compensation restores the previous canonical state:

- Add compensation removes the new final,
- Replace compensation restores the previous final,
- the original Staging source no longer exists.

The current fallback marks the operation:

```text
Failed
retryAllowed = true
requiresNewSource = false
```

That is not truthful.

For compensated Add/Replace the terminal state must be equivalent to:

```text
SourceUnavailable
retryAllowed = false
requiresNewSource = true
```

or another approved non-retryable state requiring a new source.

Remove compensation may remain retryable because it does not depend on Staging.

---

# 11. Medium — Empty Workflow Commands Remain Pending
## متوسط — الأمر دون عمليات يبقى Pending

The command validator allows an empty operation list.

The Workflow is then created and finalized with no operation, while status derivation returns `Pending`.

Task 3.14.8 does not define an empty Workflow as a meaningful operation.

Required correction:

```text
operations.length must be greater than zero
```

Reject the command before root creation, Workflow creation, or filesystem effects.

---

# 12. Repository Transition Boundary | حدود انتقالات المستودع

The repository still uses one broad `save` method that rewrites Workflow operations and canonical Media state together for statuses that do not change Media.

This makes SourceUnavailable, cancellation, cleanup, and reconciliation unnecessarily dependent on the current Media revision.

R3 should add focused Workspace-scoped transitions for operation-only changes, such as:

```text
markSourceUnavailable
markCancelled
markFailed
markReconciliationRequired
completeCleanupTransition
```

These transitions must use Workflow/operation optimistic versions without deleting and reinserting canonical image rows.

Do not redesign the module or add another canonical Media table.

---

# 13. Required Test Additions | الاختبارات المطلوبة

Add deterministic tests for:

1. retry reconciliation followed by terminal-save failure remains ReconciliationRequired,
2. reconciliation is never converted to retryable Failed,
3. SourceUnavailable save conflict is not ignored,
4. cancellation deletion plus save conflict reloads a truthful terminal/reconciliation state,
5. cleanup deletion plus save conflict does not leave retryable state,
6. cleanup counts only durable transitions,
7. compensated Add requires a new source,
8. compensated Replace requires a new source,
9. compensated Remove remains safely retryable when appropriate,
10. empty operation command is rejected before root/Workflow creation,
11. the review environment uses distinct application and test database names,
12. all PostgreSQL suites execute inside the bundle,
13. Git untracked integrity passes,
14. report status matches manifest status.

---

# 14. Final Decision | القرار النهائي

```text
Artifact authenticity: Approved
R2 architectural direction: Approved
Retry Remove path: Approved in normal path
Metadata rollback direction: Approved
Drizzle and audits: Approved

Bundle status: Rejected
Git integrity: Rejected
Bundled PostgreSQL integration: Rejected
Durable SourceUnavailable: Rejected
Cancellation durability: Rejected
Cleanup durability: Rejected
Compensated source semantics: Rejected

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R3 required: Yes
```

Do not stage, commit, push, merge, or begin Task 3.14.9 before R3 is reviewed.
