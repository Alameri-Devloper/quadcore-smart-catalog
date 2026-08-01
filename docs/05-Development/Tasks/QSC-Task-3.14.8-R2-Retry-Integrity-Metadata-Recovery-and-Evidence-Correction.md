# QSC Task 3.14.8-R2 — Retry Integrity, Metadata Recovery, and Evidence Correction
## تصحيح سلامة الإعادة وتعافي البيانات الوصفية وأدلة التحقق

**Project:** Quadcore Smart Catalog — QSC
**Parent:** Task 3.14.8-R1
**Target Branch:** `feature/product-media-workflow-orchestration`
**Implementation:** TypeScript only
**Architecture:** Existing DDD, Clean Architecture, Modular Monolith
**Documentation:** English and Arabic

Do not stage, commit, push, merge, or begin Task 3.14.9.

---

# 1. Objective | الهدف

Correct the remaining Task 3.14.8-R1 defects:

1. preserve retry reconciliation outcomes,
2. correct post-claim version handling,
3. prevent handled retries from remaining InProgress,
4. implement safe Remove retry,
5. restore Metadata state after failed Reorder/SetCover persistence,
6. apply deterministic cover fallback before status persistence,
7. prevent display-order collisions,
8. make Product/Media mutation ownership explicit,
9. correct Git and Drizzle evidence,
10. regenerate a truthful ReadyForReview bundle.

Preserve all accepted R1 architecture:

- one canonical `catalog_product_images` table,
- Product publication independence,
- partial success,
- lazy immutable Media root,
- full-request idempotency fingerprint,
- fixed 14-day retention,
- Trash-based removal,
- manual retry only,
- Workspace scoping.

---

# 2. Evidence Corrections | تصحيح الأدلة

Remove trailing whitespace from:

```text
docs/05-Development/Tasks/
QSC-Task-3.14.8-R1-Canonical-Media-Persistence-and-Durable-Orchestration-Correction.md
```

Known lines:

```text
4, 5, 6, 7, 8
```

Run:

```powershell
git diff --check
```

The corrected bundle must not be generated until this passes.

The required Drizzle command must run with a transient guarded `DATABASE_URL`.

It is acceptable to assign the isolated test database URL to both process variables for the command session:

```text
TEST_DATABASE_URL
DATABASE_URL
```

Requirements:

- isolated test database only,
- no credential output,
- no `.env` creation,
- no persistence in source, reports, scripts, or artifacts,
- remove user-scoped variables after review.

The Final Report must not claim `db:check` passed unless the bundled command has exit code 0.

---

# 3. Explicit Product/Media Ownership Contract | عقد ملكية المنتج والوسائط

Keep:

```text
catalog_product_images
```

as the only canonical image table.

For this task, adopt and document this interim boundary:

```text
ProductRepository reads canonical image rows.
Product content updates preserve those rows.
All image mutations go through Product Media Workflow.
```

Do not remove images from Product Aggregate in R2.

Add an explicit guard in Product update persistence:

- compare the Product's loaded image projection with the current canonical rows,
- permit unchanged image projection,
- reject attempted image mutation through ProductRepository,
- use a typed sanitized architecture/persistence error,
- never silently ignore a changed image collection.

Product creation behavior must remain compatible with the existing committed architecture. Do not redesign create semantics in R2.

---

# 4. Typed Retry Effect Outcome | نتيجة أثر الإعادة

Refactor retry storage execution into a typed result:

```typescript
type RetryEffectOutcome =
  | {
      readonly type: "Succeeded";
      readonly compensation: Compensation;
    }
  | {
      readonly type: "KnownFailure";
      readonly retryAllowed: boolean;
      readonly errorCode: "ProductMediaStorageFailed";
    }
  | {
      readonly type: "ReconciliationRequired";
      readonly errorCode: "ProductMediaReconciliationRequired";
    };
```

Rules:

- `ProductMediaStoragePartialOperationError` maps only to `ReconciliationRequired`.
- A later generic branch must never overwrite it.
- Reconciliation operations use:
  - `status = "ReconciliationRequired"`
  - `retryAllowed = false`
  - `requiresNewSource = false`
- Persist and reload this state in tests.

---

# 5. Retry Version State Machine | آلة إصدارات الإعادة

Track explicit versions:

```typescript
interface ClaimedRetryVersion {
  readonly loadedVersion: number;
  readonly claimedVersion: number;
  readonly terminalVersion: number;
}
```

Required sequence:

```text
loaded DB version = v
atomic claim writes v + 1
terminal/reconciliation save expects v + 1
terminal/reconciliation save writes v + 2
```

Do not decrement and derive expected versions indirectly.

Repository `claimOperation` should return the claimed Workflow/operation version or enough typed state to avoid local guessing.

Add tests that verify persisted versions after every retry outcome.

---

# 6. Prerequisites Before Retry Claim | المتطلبات قبل المطالبة

Before the atomic claim, verify:

- trusted Workspace and authorization,
- Workflow and operation identity,
- retry-eligible status,
- `retryAllowed = true`,
- operation type,
- fixed expiry,
- exact Staging existence for Add/Replace,
- immutable Media root exists,
- target Media exists for Replace/Remove,
- required final/trash keys can be derived.

A failed prerequisite must not mutate the persisted status.

No handled path may leave an operation `InProgress`.

---

# 7. Safe Remove Retry | إعادة محاولة الحذف الآمنة

Support manual retry for `Remove`.

Eligibility:

```text
status = Failed
retryAllowed = true
target Media still exists
operation is not expired-source dependent
```

Execution:

1. resolve canonical target row,
2. atomically claim operation,
3. move final object to the operation-owned Trash key,
4. remove canonical Metadata under Media revision,
5. persist Completed,
6. if Metadata save fails, restore from Trash,
7. if restore succeeds, persist Failed,
8. if restore fails or state is ambiguous, persist ReconciliationRequired.

Completed Remove retry is idempotent.

Do not retry SetCover or Reorder through the file-effect retry Use Case.

---

# 8. Metadata-Only Transition Helper | مساعد انتقال البيانات الوصفية

Implement one cohesive Application helper for:

```text
Reorder
SetCover
```

The helper must:

1. clone prior Media state,
2. validate the complete mutation,
3. apply deterministic Metadata changes,
4. increment Media revision exactly once,
5. persist Workflow operation and Media state atomically,
6. on conflict or provider failure, restore the in-memory prior state,
7. persist a truthful Failed or ReconciliationRequired status when possible.

Required invariants:

```text
Failed Reorder → canonical old order remains.
Failed SetCover → canonical old cover remains.
Completed status → corresponding Metadata is durable.
```

Do not allow an operation to be Failed while its requested Metadata change is persisted.

---

# 9. Cover Normalization on Load | تطبيع الغلاف عند التحميل

After loading canonical Media:

```typescript
const resolvedCover = resolveProductMediaCover(
  mediaState.items,
  undefined,
  mediaState.coverMediaId,
);
```

When images exist and the stored Main is missing or invalid:

- select the deterministic fallback,
- persist it under optimistic Media revision before other status saves,
- increment Media revision once,
- do not rename or move files.

Add PostgreSQL and Application tests for legacy rows without a Main image.

---

# 10. Display Order Policy | سياسة ترتيب العرض

Do not use `items.length` as the assumed free position.

Implement deterministic behavior:

- for append without requested order, use the next free non-negative position,
- for requested insertion, shift affected canonical positions safely inside one transaction, or reject with a typed validation conflict,
- preserve physical storage keys,
- maintain the unique Workspace/Product/position constraint,
- map order conflicts to a Media validation/revision error, not storage failure.

Add tests with sparse positions such as:

```text
1, 4, 9
```

and requested insertion into an occupied position.

---

# 11. Idempotent Incomplete Workflow Policy | سياسة الدورة غير المكتملة

For an existing matching idempotency fingerprint:

- terminal Workflow → return previous logical result,
- safely retryable failed operation → return the Workflow and require explicit Retry,
- `ReconciliationRequired` → return/throw the reconciliation result without filesystem replay,
- `InProgress` from a possible abrupt process interruption → do not replay automatically.

Document that V1 requires manual reconciliation for stale InProgress state; do not add a Background Worker or automatic lease recovery in R2.

---

# 12. Repository Improvements | تحسينات المستودع

Repository methods must provide focused typed transitions where needed.

Avoid relying on delete/reinsert of operation rows when a focused atomic claim/terminal transition is safer.

At minimum:

- claim returns the persisted claimed version,
- terminal save compares against claimed version,
- reconciliation transition is Workspace/workflow/operation scoped,
- Media revision remains optimistic,
- no cross-Workspace mutation,
- raw PostgreSQL errors remain sanitized.

Do not add a second canonical Media item table.

---

# 13. Deterministic Tests | الاختبارات الحتمية

Add tests for:

## Retry reconciliation

1. partial-operation error remains ReconciliationRequired,
2. retryAllowed remains false,
3. persisted state reload matches public error,
4. generic Failed logic cannot overwrite reconciliation.

## Retry versioning

5. claim returns claimed version,
6. terminal save expects claimed version,
7. successful compensation persists Failed,
8. failed compensation persists ReconciliationRequired,
9. no handled retry remains InProgress.

## Retry prerequisites and Remove

10. missing root before claim leaves status unchanged,
11. missing target before claim leaves status unchanged,
12. Remove retry succeeds,
13. Remove save failure restores from Trash,
14. Remove restore failure persists reconciliation,
15. completed Remove retry is idempotent.

## Metadata-only operations

16. Reorder save failure preserves old order,
17. SetCover save failure preserves old cover,
18. successful Reorder increments revision once,
19. successful SetCover increments revision once.

## Cover/order compatibility

20. legacy rows without Main receive deterministic cover,
21. sparse positions append without collision,
22. occupied requested position follows the approved policy,
23. physical keys remain unchanged after reorder.

## Ownership boundary

24. Product content update with unchanged images succeeds,
25. Product update attempting image mutation fails explicitly,
26. Media Workflow remains the only image-mutation path.

## Evidence

27. `git diff --check` passes,
28. `npm.cmd run db:check` exits 0,
29. report status matches manifest status.

Use deterministic injected failures. Do not use timing sleeps.

---

# 14. Final Report Correction | تصحيح التقرير النهائي

Update:

```text
docs/05-Development/Reports/
Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Correct or extend:

- Verification
- Retry claim and compensation
- Remove retry
- Metadata-only recovery
- cover normalization
- display-order policy
- Product/Media ownership contract
- Remaining risks
- Status

The report must state the actual Drizzle exit result from the corrected bundle.

Do not claim Ready for review while the manifest is VerificationFailed.

---

# 15. Required Verification | التحقق المطلوب

Run in the correctly configured transient process environment:

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

Do not run:

```text
npm audit fix
npm audit fix --force
```

Do not expose credentials.

---

# 16. Review Bundle | حزمة المراجعة

Preserve all existing 3.14.8 and R1 artifacts.

After every blocking verification passes, generate exactly one R2 bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8-R2 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-3.14.8-R2-Final-Report.md
QSC-Task-3.14.8-R2-Review.zip
QSC-Task-3.14.8-R2-Review.zip.sha256
```

A shared collision suffix is acceptable.

Required manifest:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Do not automatically retry a failed bundle command.

---

# 17. Acceptance Criteria | معايير القبول

R2 is ready for review only when:

1. retry ambiguity remains durable ReconciliationRequired,
2. post-claim versioning is correct,
3. no handled retry remains InProgress,
4. Remove retry is implemented safely,
5. failed Reorder preserves old order,
6. failed SetCover preserves old cover,
7. legacy no-Main rows receive deterministic cover,
8. display orders cannot collide,
9. Product image mutation through ProductRepository is rejected explicitly,
10. Media Workflow is the canonical mutation path,
11. Product publication remains independent,
12. fixed 14-day retention remains unchanged,
13. no UI/Product Entry/Task 3.14.9 work is included,
14. every required check passes,
15. manifest is ReadyForReview,
16. Git integrity passes,
17. no commit, push, or merge is performed.

Stop after producing the R2 Final Report, Review ZIP, and detached SHA-256.
