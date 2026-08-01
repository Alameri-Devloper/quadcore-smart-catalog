# Task 3.14.8-R1 — Independent Review Report
## تقرير المراجعة المستقلة للمهمة 3.14.8-R1

**Project:** Quadcore Smart Catalog — QSC
**Task:** Canonical Media Persistence and Durable Orchestration Correction
**Reviewed artifacts:**

- `QSC-Task-3.14.8-R1-Final-Report.md`
- `QSC-Task-3.14.8-R1-Review.zip`
- `QSC-Task-3.14.8-R1-Review.zip.sha256`

**Decision:** R1 contains major architectural corrections, but it is not ready for Git commit. Task 3.14.8-R2 is required.

---

# 1. Executive Decision | القرار التنفيذي

The uploaded ZIP and detached checksum match. Archive structure, manifest coverage, payload hashes, copied-source hashes, and standalone Final Report identity are valid.

R1 successfully restores `catalog_product_images` as the single canonical image table, adds request fingerprinting, resolves the Media root lazily, and persists more workflow boundaries.

However, the submitted evidence is explicitly failed:

```text
overallStatus: VerificationFailed
gitIntegrity.passed: false
```

The source review also found blocking retry and Metadata-consistency defects.

```text
Artifact integrity: Passed
Manifest coverage: Passed
Report byte identity: Passed
PostgreSQL integration: Passed

Drizzle verification: Failed
Git untracked integrity: Failed
Retry reconciliation semantics: Failed
Retry version compensation: Failed
Retry Remove support: Failed
Metadata-only operation recovery: Failed
Product repository Media mutation boundary: Incomplete

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R2 required: Yes
```

---

# 2. Artifact Integrity | سلامة الملفات

```text
ZIP SHA-256:
26d67148b1eeea1c7df5b39ce7f80d62219cf61e79d5005af9ea5ec629f60ad1

Detached SHA-256:
26d67148b1eeea1c7df5b39ce7f80d62219cf61e79d5005af9ea5ec629f60ad1

Result:
Matched
```

```text
ZIP entries including manifest: 50
Manifest payload entries: 49
Missing payloads: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
Unsafe archive paths: 0
```

The standalone report is byte-for-byte identical to both report copies in the ZIP:

```text
Final Report SHA-256:
549e03320c2b2a970df58922ec24073c822006c1460e1a1c3ab8190acac70d2d
```

---

# 3. Evidence Failure | فشل أدلة التحقق

The manifest says:

```text
taskId: 3.14.8-R1
overallStatus: VerificationFailed
gitIntegrity.untracked.passed: false
gitIntegrity.passed: false
```

The untracked integrity failure is trailing whitespace in:

```text
docs/05-Development/Tasks/
QSC-Task-3.14.8-R1-Canonical-Media-Persistence-and-Durable-Orchestration-Correction.md
```

Known lines:

```text
4, 5, 6, 7, 8
```

The required Drizzle command also failed:

```text
npm.cmd run db:check
exitCode: 1

DATABASE_URL is required for Drizzle Kit.
```

The Final Report states that Drizzle check passed and that the task is Ready for review. Those statements do not match the bundled evidence. fileciteturn10file0

---

# 4. Positive R1 Findings | نتائج R1 الإيجابية

R1 correctly implements or demonstrates:

- one canonical `catalog_product_images` table,
- no `catalog_product_media_items` table,
- request fingerprint persisted with the Workflow,
- source-byte SHA-256 included in idempotency,
- lazy `ProductMediaRoot` resolve-or-create,
- fixed 14-day Staging retention,
- Workspace-scoped Workflow and Media persistence,
- durable `Staged`, `InProgress`, and terminal boundaries on the initial execution path,
- Product content updates preserving canonical Media rows,
- successful 42/42 PostgreSQL integration tests,
- Product publication remaining independent from Media.

The report correctly identifies the intended canonical table, root lifecycle, request fingerprint, and test counts, but its final verification status is inaccurate. fileciteturn10file0

---

# 5. High — Retry Partial-Operation Ambiguity Is Overwritten
## مرتفع — غموض عملية الإعادة يُستبدل بحالة فشل عادية

In `RetryProductMediaOperationUseCase`, a `ProductMediaStoragePartialOperationError` first sets:

```text
operation.status = ReconciliationRequired
retryAllowed = false
```

Immediately afterward, the generic unsuccessful branch overwrites it with:

```text
operation.status = Failed
retryAllowed = true
errorCode = ProductMediaStorageFailed
```

Therefore an ambiguous filesystem state is exposed as an ordinary retryable failure.

This violates:

- durable reconciliation,
- no automatic retry for ambiguity,
- truthful partial-operation reporting.

### Required correction

Preserve the storage outcome as an explicit typed result:

```typescript
type RetryEffectOutcome =
  | { type: "Succeeded"; compensation: Compensation }
  | { type: "KnownFailure"; retryAllowed: boolean }
  | { type: "ReconciliationRequired" };
```

Do not use a later generic branch that can overwrite reconciliation.

Reload the Workflow in tests and prove the persisted operation remains:

```text
ReconciliationRequired
retryAllowed = false
```

---

# 6. High — Retry Compensation Save Uses the Wrong Expected Version
## مرتفع — حفظ التعويض يستخدم إصدار دورة غير صحيح

The retry claim atomically increments the persisted Workflow version from `v` to `v + 1`.

After the final save fails, the code decrements the local version and calls the reconciliation save with an expected version equivalent to `v`, while PostgreSQL is already at `v + 1`.

The reconciliation save therefore conflicts instead of persisting the compensated `Failed` or `ReconciliationRequired` state.

Possible result:

```text
Database operation: InProgress
Filesystem effect: compensated or ambiguous
Public result: ReconciliationRequired
Durable terminal status: not saved
```

### Required correction

Track explicit versions:

```text
loadedVersion
claimedVersion
nextTerminalVersion
```

After claim:

```text
claimedVersion = loadedVersion + 1
```

Every post-claim terminal/reconciliation save must compare against `claimedVersion`, not the pre-claim version.

Add deterministic PostgreSQL and Application tests that reload the Workflow after:

- save conflict + successful compensation,
- save exception + successful compensation,
- failed compensation,
- ambiguous storage effect.

No handled path may remain `InProgress`.

---

# 7. High — Retry Can Remain InProgress When Root Resolution Fails
## مرتفع — قد تبقى الإعادة قيد التنفيذ عند فقدان الجذر

The retry operation is claimed before the Media root is loaded again.

If the root cannot be loaded after the claim, the Use Case throws `ProductMediaStorageFailed` while the persisted operation remains `InProgress`.

### Required correction

Resolve and validate every prerequisite before claim:

- Product authorization,
- operation eligibility,
- fixed expiry,
- Staging existence,
- immutable Media root,
- target Media item.

Only then perform the atomic claim.

If a post-claim prerequisite can still fail, persist a terminal or reconciliation state before returning.

---

# 8. High — Remove Retry Is Rejected Although R1 Requires It
## مرتفع — إعادة محاولة الحذف مرفوضة رغم أن R1 يطلبها

The retry eligibility check permits only:

```text
Add
Replace
```

but the implementation still contains a `Remove` retry branch.

The R1 specification explicitly requires retry safety for Add, Replace, and Remove.

The Remove code is currently unreachable.

### Required correction

Support safe manual retry for a failed Remove when the previous state is known and the target remains published.

Requirements:

- no Staging requirement,
- target existence checked before claim,
- `moveToTrash` uses the existing operation-owned Trash key,
- Metadata save failure restores from Trash,
- failed restore becomes durable reconciliation,
- completed Remove remains idempotent.

---

# 9. High — Reorder Persistence Failure Can Apply a Failed Operation
## مرتفع — فشل حفظ الترتيب قد يطبق عملية معلنة كفاشلة

The Reorder path mutates the in-memory Media state, increments the Media revision, and marks the operation Completed before saving.

If persistence fails, the catch only marks the operation Failed. It does not restore the previous Media state and revision.

A later final save can therefore persist the reordered rows while the operation is recorded as Failed.

### Required correction

For every Metadata-only operation:

```text
clone previous Media state
apply mutation
attempt persistence
on failure restore previous state
persist Failed or ReconciliationRequired truthfully
```

Add deterministic tests proving:

```text
failed Reorder → old order remains
failed SetCover → old cover remains
operation status matches durable Metadata
```

---

# 10. High — SetCover Persistence Failure Has No Recovery Boundary
## مرتفع — فشل حفظ الغلاف لا يملك مسار تعافٍ

`SetCover` marks the operation Completed and awaits persistence without a local compensation/recovery block.

A persistence failure aborts the Use Case while the Workflow remains incomplete. Repeating the same idempotency key returns the existing stored Workflow rather than safely completing the pending operation.

### Required correction

Use the same Metadata-only transition helper for both:

```text
SetCover
Reorder
```

The helper must:

- snapshot the prior Media state,
- save with optimistic revision,
- persist a terminal operation status,
- never leave a handled operation falsely Pending/InProgress/Completed.

---

# 11. Medium — Automatic Cover Fallback Is Not Applied Before the First Status Save
## متوسط — الغلاف التلقائي لا يُحل قبل أول حفظ للحالة

A legacy Product may have canonical image rows but no `is_main = true`; the database enforces at most one Main image, not at least one.

The repository save rejects non-empty Media with no cover.

During Add/Replace, the first Staged status save occurs before deterministic cover fallback is applied. That can block the workflow before publication.

### Required correction

Immediately after loading canonical Media state:

```text
coverMediaId = resolveProductMediaCover(items, undefined, existingCover)
```

Persist the fallback only when needed and under the Media revision guard.

Add a test for legacy canonical rows without a Main image.

---

# 12. Medium — Display Order Allocation Can Collide
## متوسط — تخصيص ترتيب العرض قد يتصادم

A new Add defaults to:

```text
displayOrder = state.items.length
```

This can collide when existing positions are sparse or start above zero.

A requested display order can also collide with an existing row.

The database then fails the unique-position constraint, and the error is reported as a storage failure.

### Required correction

Use a deterministic Metadata policy:

- validate requested insertion order,
- shift affected positions transactionally, or
- allocate the next free non-negative position.

Do not classify a position conflict as a filesystem failure.

---

# 13. Architecture Boundary — Product Aggregate Images
## حد معماري — صور Product Aggregate

R1 changes `PostgreSqlProductRepository.update` so Product content updates no longer persist `Product.images`.

This avoids erasing Media Workflow changes, but it also means the repository no longer blindly persists every field present in the Product Aggregate.

This is an ownership-boundary change and must not remain implicit.

### Recommended interim boundary

For Task 3.14.8-R2:

```text
catalog_product_images is canonical
all image mutation goes through Product Media Workflow
ProductRepository reads canonical images
ProductRepository content updates preserve canonical image rows
```

Add a guard so a Product update that attempts to change its loaded image collection fails explicitly rather than being silently ignored.

Do not remove images from Product Aggregate in R2. A broader aggregate refactor requires a separate architectural discussion.

Document this as an interim ownership contract for Task 3.14.9.

---

# 14. Test Gaps | فجوات الاختبار

Add deterministic tests for:

1. retry partial-operation error persists ReconciliationRequired,
2. retry reconciliation is not overwritten by a generic Failed branch,
3. correct post-claim expected Workflow version,
4. successful retry compensation persists Failed,
5. failed compensation persists ReconciliationRequired,
6. root absence before claim does not create InProgress,
7. retry Remove success,
8. retry Remove save failure and restore,
9. retry Remove restore failure,
10. failed Reorder preserves old order,
11. failed SetCover preserves old cover,
12. legacy images with no Main receive deterministic fallback,
13. sparse display positions do not collide,
14. Product update attempting an image mutation fails explicitly,
15. report and manifest status match,
16. Drizzle verification passes with a transient guarded `DATABASE_URL`.

---

# 15. Final Decision | القرار النهائي

```text
Artifact authenticity: Approved
Canonical table correction: Approved
Root resolve-or-create: Approved
Initial durable boundaries: Substantially improved
PostgreSQL integration: Approved

Bundle verification: Rejected
Retry reconciliation: Rejected
Retry compensation versioning: Rejected
Remove retry: Rejected
Metadata-only operation recovery: Rejected
Architecture ownership documentation: Incomplete

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R2 required: Yes
```

Do not stage, commit, push, merge, or begin Task 3.14.9 before R2 is reviewed.
