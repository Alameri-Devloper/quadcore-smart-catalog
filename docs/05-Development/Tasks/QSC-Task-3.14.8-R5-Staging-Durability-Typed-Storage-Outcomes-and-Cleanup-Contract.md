# QSC Task 3.14.8-R5 — Staging Durability, Typed Storage Outcomes, and Cleanup Contract
## تثبيت Staging وتصنيف نتائج التخزين وعقد Cleanup

**Project:** Quadcore Smart Catalog — QSC

**Parent:** Task 3.14.8-R4

**Target Branch:** `feature/product-media-workflow-orchestration`

**Implementation:** TypeScript only

**Architecture:** Existing DDD, Clean Architecture, Modular Monolith

**Documentation:** English and Arabic

Do not stage, commit, push, merge, or begin Task 3.14.9.

---

# 1. Objective | الهدف

Complete Task 3.14.8 by correcting:

1. durable Staged-state establishment,
2. Stage cleanup ambiguity,
3. typed storage failure-code classification,
4. active `InProgress` cancellation safety,
5. canonical operation-ID validation,
6. the approved detailed cleanup result,
7. Final Report audit accuracy.

Preserve every accepted Task 3.14.8/R1/R2/R3/R4 architectural decision.

---

# 2. Preserve Existing Architecture | الحفاظ على البنية

Keep unchanged:

- `catalog_product_images` as the only canonical image table,
- Product publication independence,
- Product Media Workflow as the only image-mutation path,
- Workspace scoping,
- full-request idempotency fingerprint,
- immutable ProductMediaRoot,
- fixed 14-day Staging retention,
- manual retry and reconciliation,
- Trash-based removal,
- partial success,
- `v → v+1 → v+2` retry versioning,
- focused operation-only terminal transitions,
- deterministic cover and display-order behavior,
- no Background Worker,
- no UI or Product Entry implementation.

---

# 3. Canonical ProductMediaOperationId | معرف عملية الوسائط الأساسي

Introduce or reuse one Domain-level validator/value object for Product Media operation identity.

Required canonical rules must match storage-key requirements:

```text
lowercase only
1 to 80 characters
starts with [a-z0-9]
remaining characters: [a-z0-9._-]
no reserved Windows device segment
no _staging, _trash, or _variants reserved identity
```

Use the same validation in:

- Execute command validation,
- Staging key creation,
- Trash key creation,
- persisted operation rehydration where applicable.

Reject invalid IDs before:

- authorization,
- Product lookup,
- root resolution/creation,
- Workflow persistence,
- filesystem effects.

Do not maintain two different regular expressions for the same identity.

---

# 4. Focused Durable Staging Transition | انتقال Staging الدائم

Add the minimum focused Workspace-scoped optimistic repository transition required to establish Staged state without rewriting canonical Media.

Equivalent contract:

```typescript
interface StageProductMediaOperationTransition {
  readonly stagingArtifactKey: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
  readonly expiresAt: Date;
  readonly retryAllowed: true;
  readonly requiresNewSource: false;
}
```

Required properties:

- Workspace + Workflow + operation identity,
- expected Workflow version,
- allowed previous status `Pending`,
- exact immutable first-stage expiry,
- all Staging integrity fields written atomically,
- Workflow status and version updated atomically,
- no Media revision dependency,
- no canonical image delete/reinsert,
- typed `Transitioned`, `Conflict`, and `NotFound`,
- sanitized provider failure.

---

# 5. Establish Staged After External Effect | تثبيت Staged بعد الأثر

After a Stage file is created:

1. attempt the focused Staged transition,
2. on conflict reload the exact Workspace-scoped Workflow once,
3. inspect the exact operation,
4. accept only an exact compatible Staged truth:
   - same key,
   - same SHA-256,
   - same byte length,
   - same dimensions,
   - same fixed expiry,
5. if the operation remains `Pending`, retry once using the reloaded Workflow version,
6. never reuse a stale expected version,
7. never rewrite canonical Media,
8. never re-stage automatically during this recovery.

If Staged state still cannot be established:

1. discard only the exact owned Staging key,
2. confirmed discard or confirmed absence:
   - establish `SourceUnavailable`,
   - `retryAllowed = false`,
   - `requiresNewSource = true`,
3. ambiguous discard:
   - establish `ReconciliationRequired`,
   - `retryAllowed = false`,
4. return a truthful sanitized error,
5. never leave an undiscoverable Staging orphan represented as `Pending`.

---

# 6. Stage Adapter Ambiguity | غموض محول Stage

Extend the typed partial-operation contract to include Stage cleanup ambiguity.

Equivalent:

```typescript
new ProductMediaStoragePartialOperationError("stage")
```

In `LocalProductMediaStorageAdapter.stage`:

- do not suppress failure to unlink an owned Stage file,
- use injectable filesystem operations for the cleanup call,
- throw the typed partial-operation error when an owned file may remain,
- preserve `UnsafeKey`, `TargetConflict`, and checksum outcomes as typed results.

Add deterministic adapter tests without timing sleeps.

---

# 7. Typed Storage Failure Mapping | تصنيف فشل التخزين

Create one Application policy/helper used by both initial execution and retry.

Do not collapse every `Failed` result into generic retryable `ProductMediaStorageFailed`.

Mandatory mappings:

```text
TemporaryObjectMissing during Add/Replace publication
→ SourceUnavailable
→ retryAllowed = false
→ requiresNewSource = true

FinalObjectMissing for canonical Replace/Remove
→ ReconciliationRequired
→ retryAllowed = false

TrashConflict
→ ReconciliationRequired
→ retryAllowed = false

TargetConflict for an allocated canonical final key
→ ReconciliationRequired
→ retryAllowed = false

ReplacementRestorationFailed
→ ReconciliationRequired
→ retryAllowed = false
```

For other codes, document and test whether the adapter contract proves:

- canonical state is unchanged and retry is safe,
- a new source is required,
- or reconciliation is required.

The same code must produce the same logical classification in initial execution and manual retry.

---

# 8. InProgress Cancellation Safety | سلامة إلغاء العملية النشطة

For V1:

```text
operation.status = InProgress
→ throw ProductMediaOperationAlreadyInProgress
→ perform no storage call
→ perform no database mutation
```

Keep existing idempotency for Completed and Cancelled.

Keep ReconciliationRequired non-cancellable automatically.

Do not add cancellation tokens, leases, or a Background Worker.

---

# 9. Approved Detailed Cleanup Result | نتيجة Cleanup التفصيلية المعتمدة

Implement the approved Application result:

```typescript
export interface CleanupExpiredMediaStagingResult {
  readonly scannedCount: number;
  readonly cleanedCount: number;
  readonly reconciliationRequiredCount: number;
  readonly skippedCount: number;
  readonly outcomes: readonly CleanupExpiredMediaStagingOutcome[];
}
```

The outcome union must distinguish at least:

```text
SourceUnavailableEstablished
CompatibleConcurrentTruth
ReconciliationRequired
Skipped
```

Each outcome includes only Workspace-scoped Workflow and operation identities plus stable reason/status codes.

Rules:

- `cleanedCount` increases only for durably established `SourceUnavailable`,
- physical deletion alone is not cleaned success,
- `reconciliationRequiredCount` matches reconciliation outcomes,
- `skippedCount` matches skipped outcomes,
- `scannedCount` is deterministic and documented,
- no other Workspace data is exposed.

Update documentation in English and Arabic.

---

# 10. Final Report Audit Accuracy | دقة تقرير التدقيق

Update:

```text
docs/05-Development/Reports/
Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Do not copy the previous audit baseline.

Record the exact results produced by the R5 bundle.

The R4 bundle evidence was:

```text
Runtime audit: 3 high
Full audit: 8 total — 4 moderate, 4 high
```

The new report must use the new command results, even if they differ.

Do not run:

```text
npm audit fix
npm audit fix --force
```

Do not change dependencies in this task.

---

# 11. Deterministic Tests | الاختبارات الحتمية

Add tests for:

## Staging durability

1. Stage success plus unrelated Workflow-version advance,
2. exact compatible concurrent Staged truth,
3. one reloaded Staged transition attempt,
4. database failure after Stage plus successful discard,
5. database failure after Stage plus missing owned file,
6. database failure after Stage plus ambiguous discard,
7. Stage cleanup unlink failure raises partial-operation ambiguity,
8. operation-only Staged transition preserves canonical Media and Media revision.

## Typed result mapping

9. initial and retry `TemporaryObjectMissing`,
10. initial and retry `FinalObjectMissing`,
11. `TrashConflict`,
12. `TargetConflict`,
13. `ReplacementRestorationFailed`,
14. safe retryable failure remains retryable only when explicitly proven.

## Cancellation and validation

15. InProgress cancellation performs no storage call,
16. uppercase operation ID rejected before effects,
17. operation ID longer than 80 rejected before effects,
18. reserved and unsafe operation IDs rejected before effects.

## Cleanup contract

19. scanned count,
20. cleaned count,
21. reconciliation-required count,
22. skipped count,
23. operation-scoped outcomes,
24. Workspace isolation.

## Evidence

25. tracked and untracked integrity pass,
26. report audit counts match bundled audit evidence,
27. manifest status and report status agree.

Do not use timing sleeps.

---

# 12. Required Verification | التحقق المطلوب

Use distinct guarded databases:

```text
DATABASE_URL
→ application/development database

TEST_DATABASE_URL
→ isolated test database
```

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

Explicit network consent for the two read-only npm audits must be included in the same Codex execution request that authorizes the bundle.

Do not expose or persist credentials.

---

# 13. Mandatory Review Publication | النشر الإلزامي للمراجعة

The task is not complete when code and tests finish.

Before bundle invocation, verify:

- `DATABASE_URL` exists,
- `TEST_DATABASE_URL` exists,
- normalized database identities are distinct,
- Desktop `QSC-Reviews` is writable from the Codex/Node process,
- Final Report exists,
- tracked integrity passes,
- untracked integrity passes,
- audit network consent is active in the same request.

After every blocking check passes, generate exactly one R5 bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8-R5 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-3.14.8-R5-Final-Report.md
QSC-Task-3.14.8-R5-Review.zip
QSC-Task-3.14.8-R5-Review.zip.sha256
```

A shared collision suffix is acceptable.

Required manifest:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Verify after generation:

- all three files exist,
- detached checksum matches the ZIP,
- ZIP contains `manifest.json` and Final Report,
- `taskId = 3.14.8-R5`,
- all required verification exit codes are zero,
- report audit counts match audit evidence.

Do not automatically retry a started bundle command if it fails.

---

# 14. Acceptance Criteria | معايير القبول

R5 is ready for review only when:

1. Staged state is durably established through a focused transition,
2. post-Stage conflict never reuses a stale Workflow version,
3. failed Staged persistence cannot leave an undiscoverable orphan,
4. Stage cleanup ambiguity becomes ReconciliationRequired,
5. storage failure codes are classified truthfully,
6. canonical target absence never remains ordinary retryable failure,
7. InProgress cancellation performs no external effect,
8. operation IDs are validated before all effects,
9. the approved detailed cleanup result is implemented,
10. Product publication independence remains unchanged,
11. canonical Media ownership remains unchanged,
12. fixed 14-day retention remains unchanged,
13. all required checks pass,
14. report, audit evidence, and manifest agree,
15. the three R5 review artifacts are created automatically,
16. no UI/Product Entry/Task 3.14.9 work is included,
17. no commit, push, or merge is performed.

Stop only after producing the R5 Final Report, Review ZIP, and detached SHA-256, or after reporting a real blocking failure before bundle execution.
