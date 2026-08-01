# QSC Task 3.14.8-R1 — Canonical Media Persistence and Durable Orchestration Correction
## تصحيح التخزين الأساسي والتنسيق الدائم لدورة وسائط المنتج

**Project:** Quadcore Smart Catalog — QSC
**Parent Task:** Task 3.14.8 — Product Media Workflow Orchestration
**Target Branch:** `feature/product-media-workflow-orchestration`
**Implementation:** TypeScript only
**Architecture:** Existing DDD, Clean Architecture, Modular Monolith
**Documentation:** English and Arabic

Do not stage, commit, push, merge, or begin Task 3.14.9.

---

# 1. Objective | الهدف

Correct the blocking Task 3.14.8 findings without redesigning the approved architecture:

1. restore one canonical Product image source,
2. create ProductMediaRoot lazily and idempotently,
3. persist workflow transitions around every filesystem effect,
4. persist reconciliation truthfully,
5. make retry eligibility and compensation safe,
6. bind idempotency to the full logical request,
7. correct cancellation and expiry cleanup,
8. add deterministic failure and concurrency tests,
9. correct the Final Report and regenerate the review bundle.

Preserve:

- Product publication independence,
- partial Media success,
- 14-day fixed Staging retention,
- deterministic cover fallback,
- Trash-based removal,
- manual retry,
- Workspace scoping,
- Task 3.14.7 storage primitives.

---

# 2. Canonical Product Image Persistence | التخزين الأساسي للصور

The repository already contains the canonical table:

```text
catalog_product_images
```

Do not keep a second canonical item collection.

## Required correction

- Remove `catalog_product_media_items` from the uncommitted Task 3.14.8 schema, migration, snapshot, repository, and tests.
- Reuse `catalog_product_images` as the canonical image identity/order/cover collection.
- Map:
  - `productImageId` ↔ `mediaId`
  - `storageKey` ↔ `storageArtifactKey`
  - `position` ↔ `displayOrder`
  - `isMain` ↔ canonical cover
- Domain may expose `coverMediaId`, but persistence must derive it from the one canonical main-image representation.
- Do not keep `isMain` and a separately persisted `coverMediaId` as competing truths.
- Keep `catalog_product_media_states` only for Media revision/update metadata when needed.
- Add the minimum companion integrity metadata required for workflow-managed images without creating a second item table.
- Do not fabricate checksums for legacy rows.
- Document and test safe handling for any existing image row that lacks workflow integrity metadata.

## Ownership and concurrency

Inspect the existing Product repository image mapping and update behavior.

Prove that:

- Product repository reads and Product Media queries observe the same canonical rows.
- Product updates cannot blindly delete or overwrite concurrent Media workflow changes.
- Media revision is enforced where image rows are mutated.
- Product publication remains independent from Media success.

Any architecture conflict discovered here must be documented; do not silently redesign Product Aggregate ownership.

---

# 3. ProductMediaRoot Resolve-or-Create | إنشاء أو استعادة جذر الوسائط

Implement an Application-level resolve-or-create operation using the existing:

```text
ProductMediaRoot
ProductMediaRootRepository
DepartmentStorageSegment
Product Media root path policy
```

Requirements:

- load the trusted Workspace-scoped Product,
- reuse an existing root when present,
- otherwise create the immutable root,
- use the approved immutable Department segment or `unclassified` fallback,
- use stable Product identity collision material,
- handle concurrent creation deterministically,
- never rename or delete the root after later failure,
- never require tests or callers to pre-seed the root.

Root resolution must occur before filesystem preparation.

A root failure must not leave an unusable idempotent Workflow.

---

# 4. Command Validation Before Effects | التحقق قبل الآثار

Before workflow creation or filesystem effects, validate:

- non-empty canonical idempotency key,
- unique operation IDs inside the command,
- valid operation IDs for typed storage keys,
- non-negative safe display order,
- valid Product/target identities,
- Reorder identity uniqueness,
- conflicting storage mutations targeting the same Media item,
- Add/Replace source presence,
- supported operation graph.

Reject invalid commands with typed sanitized errors.

Do not stage or publish before this validation completes.

---

# 5. Full Request Idempotency Fingerprint | بصمة الطلب الكاملة

Persist a canonical SHA-256 request fingerprint.

The fingerprint must include:

```text
workspace logical scope
productId
expectedMediaRevision
ordered operation descriptors
operation IDs and types
target Media IDs
display-order values
cover flags
ordered Media IDs
source content SHA-256 for Add/Replace
```

Do not persist source bytes.

Behavior:

```text
same idempotency key + same fingerprint
→ return or safely resume the existing logical workflow

same idempotency key + different fingerprint
→ ProductMediaIdempotencyConflict
```

Do not classify a different workflow payload as Existing merely because Product and revision match.

---

# 6. Durable Workflow State Machine | آلة حالات محفوظة

The workflow must not remain an in-memory batch.

Persist state boundaries equivalent to:

```text
Workflow created
Operation Pending
Operation Staged
Operation InProgress / attempt claimed
Filesystem effect succeeded or failed
Media Metadata committed
Operation terminal
Workflow status recomputed
Compensation completed or reconciliation required
```

Requirements:

- Staging metadata and fixed `expiresAt` are durable before publication.
- Every successful independent operation is durable before the next unsafe operation.
- A later operation failure does not erase previous completed state.
- A handled storage exception does not leave the workflow falsely Pending.
- Process interruption leaves enough persisted identity/state for manual inspection or retry.
- Do not claim a distributed transaction.

Repository methods may be refined into focused transition operations rather than deleting and reinserting the whole operation collection for every step.

---

# 7. Storage Exception Mapping | تحويل أخطاء التخزين

Catch and map:

```text
ProductMediaStorageInfrastructureError
ProductMediaStoragePartialOperationError
typed Failed storage outcomes
```

Rules:

- ordinary known failure → `Failed` when the previous state is known,
- ambiguous/partial storage state → `ReconciliationRequired`,
- independent operations continue only when safety is known,
- no raw filesystem paths or provider errors escape,
- no automatic retry.

---

# 8. Durable Compensation and Reconciliation | التعويض والمصالحة

When filesystem effects succeed and Metadata persistence fails:

1. run operation-scoped compensation,
2. persist ordinary failure only when compensation restores a known safe state,
3. persist `ReconciliationRequired` when compensation fails or state is ambiguous,
4. disable retry and cleanup for reconciliation operations,
5. recompute and persist Workflow status.

Do not only mutate an in-memory workflow before throwing.

Tests must reload the workflow from the repository after every reconciliation scenario.

When PostgreSQL itself is unavailable, return a sanitized reconciliation-required result and do not claim the transition was durably saved.

---

# 9. Retry Eligibility Before Claim | صلاحية الإعادة قبل المطالبة

Before the database claim:

- reject `Completed` idempotently,
- reject `Cancelled`,
- reject `SourceUnavailable`,
- reject `ReconciliationRequired`,
- reject operations with `retryAllowed = false`,
- validate fixed expiry,
- verify owned Staging exists for Add/Replace.

The atomic repository claim must itself enforce:

```text
allowed retry status
retryAllowed = true
not already InProgress
expected workflow version
Workspace + workflow + operation identity
```

Return enough claimed state to avoid running another local claim that can fail after the database mutation.

No handled rejection may change the persisted operation to `InProgress`.

---

# 10. Retry Compensation | تعويض إعادة المحاولة

Retry Add, Replace, and Remove must use the same safety model as initial execution.

Cover:

- filesystem success + Metadata save success,
- filesystem ordinary failure,
- filesystem partial/ambiguous failure,
- Metadata save conflict,
- Metadata provider exception,
- successful compensation,
- failed compensation.

No handled retry path may leave the operation permanently `InProgress`.

Preserve unrelated completed operations.

---

# 11. Cancellation Correction | تصحيح الإلغاء

Cancellation remains operation-scoped and idempotent.

Rules:

- Completed and already Cancelled return the current logical state.
- ReconciliationRequired remains non-cancellable automatically.
- Missing owned Staging is an idempotent cleanup outcome, not automatically reconciliation-required.
- Ambiguous cleanup failure becomes durably `ReconciliationRequired`.
- Check and handle repository save results.
- Do not remove published Media through cancellation.
- Do not alter Product publication.

---

# 12. Expired Staging Cleanup Correction | تصحيح تنظيف الملفات المنتهية

`CleanupExpiredMediaStagingUseCase` must:

- process only Workspace-scoped expired eligible operations,
- exclude ReconciliationRequired,
- clean only the exact operation-owned typed Staging key,
- treat missing Staging as `SourceUnavailable`,
- check repository transition results,
- count only durably persisted transitions,
- surface concurrency conflicts truthfully,
- persist reconciliation after ambiguous cleanup failure,
- remain repeatable,
- add no scheduler or Background Worker.

---

# 13. Repository and Migration Correction | تصحيح المستودع والترحيل

Because Task 3.14.8 is not committed:

- correct migration `0003` and its snapshot rather than layering a knowingly duplicate canonical item model,
- preserve the valid 0000→0001→0002 chain,
- regenerate Drizzle metadata,
- maintain Workspace-composite keys,
- keep provider-global storage-key uniqueness where canonical,
- maintain safe revision ranges,
- maintain cover/main-image same-Product constraints,
- test migration from the pre-3.14.8 schema.

Do not drop or rewrite historical committed migrations.

---

# 14. Required Deterministic Tests | الاختبارات المطلوبة

## Canonical persistence

1. Product repository and Media query read the same image rows.
2. No `catalog_product_media_items` table exists.
3. One canonical main/cover is enforced.
4. Product update cannot erase a concurrent Media mutation.
5. cross-Workspace image references are rejected.

## Root lifecycle

6. first Add succeeds with no pre-created root,
7. concurrent first workflows reuse one immutable root,
8. root remains after workflow failure,
9. unclassified fallback is deterministic.

## Durable execution

10. Staged state reloads before publish,
11. successful first operation remains completed when a later one fails,
12. storage Infrastructure exception persists Failed or ReconciliationRequired,
13. partial storage exception persists ReconciliationRequired,
14. repeated idempotent request resumes/returns safely after interruption.

## Retry

15. non-retryable Remove/SetCover/Reorder rejection does not mutate the database,
16. cancelled/source-unavailable/reconciliation operations are not claimed,
17. one concurrent eligible retry is claimed,
18. retry save failure compensates successfully,
19. retry compensation failure persists reconciliation,
20. no handled retry remains InProgress.

## Idempotency

21. same key and same payload returns/resumes existing workflow,
22. same key and changed operation fails with IdempotencyConflict,
23. same key and changed source bytes fails with IdempotencyConflict.

## Cancellation and cleanup

24. cancellation with missing Staging is idempotent,
25. ambiguous cancellation cleanup persists reconciliation,
26. cleanup counts only persisted transitions,
27. cleanup conflict does not report false success,
28. cleanup never touches unknown residue.

Use injected deterministic faults. Do not use timing sleeps.

---

# 15. Final Report Correction | تصحيح التقرير

Update:

```text
docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Correct or extend:

1. Architecture discovery
2. Canonical Media persistence
3. Root lifecycle
4. Durable workflow transitions
5. Idempotency fingerprint
6. Retry claim and compensation
7. Cancellation
8. Cleanup
9. Migration changes
10. Deterministic failure tests
11. Remaining risks
12. Status

Do not claim persistence or reconciliation guarantees that were not reloaded and verified in tests.

---

# 16. Required Verification | التحقق المطلوب

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

Do not run:

```text
npm audit fix
npm audit fix --force
```

Do not expose database or storage credentials in code, tests, reports, scripts, or task documents.

---

# 17. Review Bundle | حزمة المراجعة

Preserve the current 3.14.8 review artifacts.

After all blocking verification passes, generate exactly one corrected bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8-R1 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-3.14.8-R1-Final-Report.md
QSC-Task-3.14.8-R1-Review.zip
QSC-Task-3.14.8-R1-Review.zip.sha256
```

A shared timestamp/counter suffix is acceptable.

Required manifest result:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Do not automatically retry a failed bundle run.

---

# 18. Acceptance Criteria | معايير القبول

R1 is ready for review only when:

1. exactly one canonical Product image collection exists,
2. Product and Media repositories observe that same collection,
3. first Media workflow creates/reuses its immutable root,
4. workflow state transitions are durably persisted,
5. independent partial success survives later failure,
6. storage ambiguity becomes durable reconciliation when possible,
7. retry eligibility is validated before claim,
8. no handled retry remains InProgress,
9. retry persistence failure receives compensation,
10. same idempotency key with changed payload is rejected,
11. cancellation missing-source behavior is idempotent,
12. cleanup reports only durable outcomes,
13. Product publication remains independent,
14. 14-day retention remains fixed,
15. cover selection remains deterministic,
16. no Product Entry/UI/Task 3.14.9 work is included,
17. all required verification passes,
18. the corrected bundle is ReadyForReview,
19. no Git commit, push, or merge is performed.

Stop after producing the corrected Final Report, ZIP, and detached SHA-256.
