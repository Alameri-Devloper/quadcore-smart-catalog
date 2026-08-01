# QSC Task 3.14.8 — Product Media Workflow Orchestration
## مهمة QSC 3.14.8 — تنسيق دورة عمل وسائط المنتج

**Project:** Quadcore Smart Catalog — QSC
**Target Branch:** `feature/product-media-workflow-orchestration`
**Base Branch:** `feature/product-entry-engine`
**Architecture:** Domain-Driven Design, Clean Architecture, Modular Monolith
**Implementation:** TypeScript only
**Documentation:** English and Arabic
**Scope:** Multi-tenant-ready, Workspace-scoped, product-level media shared across branches

---

# 1. Objective | الهدف

Implement the Application and Domain orchestration required to execute, persist, retry, cancel, and clean up Product Media workflows by composing the storage primitives delivered by Task 3.14.7.

تنفيذ تنسيق طبقتي Application وDomain اللازم لتشغيل وحفظ وإعادة محاولة وإلغاء وتنظيف عمليات وسائط المنتج، بالاعتماد على بدائيات التخزين المنفذة في Task 3.14.7.

This task must not redesign the Product Aggregate or couple Product publication to Media success.

يجب ألا تعيد هذه المهمة تصميم Product Aggregate، وألا تجعل نشر المنتج معتمدًا على نجاح الصور.

---

# 2. Approved Business Rules | قواعد العمل المعتمدة

## 2.1 Product publication is independent from Media

```text
Product readiness ≠ Media readiness
```

- A product may be published without images.
- Missing or failed images do not roll back Product save.
- Missing or failed images do not change `Published` to `Draft`.
- Missing or failed images do not hide the product.
- Images may be added, replaced, reordered, or removed later.
- When no image exists, Presentation may show a placeholder; no fake Media record is created.

يمكن نشر المنتج بدون صور، ولا يؤدي فشل الصور إلى إلغاء حفظ المنتج أو إرجاعه إلى المسودة أو إخفائه. تعرض الواجهة صورة بديلة فقط دون إنشاء سجل صورة وهمي.

## 2.2 Partial success is allowed

- Successfully completed Media operations remain completed.
- One failed image does not roll back other successful images.
- Workflow status must represent partial completion truthfully.
- Compensation is operation-scoped, not whole-workflow rollback.

النجاح الجزئي معتمد؛ تبقى الصور الناجحة ولا تُلغى بسبب فشل صور أخرى.

## 2.3 Automatic cover selection

When published Media exists and the user did not select a valid cover, resolve the cover deterministically:

1. the user-selected cover, when successfully published,
2. the previous cover, when still published,
3. the first published image ordered by `displayOrder`,
4. then `createdAt`,
5. then `mediaId`.

If the selected cover fails but other images succeed, choose the first valid fallback.
If the cover is removed and other images remain, select a fallback automatically.
If no published image remains, `coverMediaId` becomes undefined.

عند وجود صور وعدم وجود صورة رئيسية صالحة، يختار النظام غلافًا تلقائيًا وحتميًا، ويمكن للمستخدم تغييره لاحقًا.

Cover selection is Metadata only. It must not rename or move files.

## 2.4 Replacement and removal

- Replacement must preserve the previous published image when the replacement fails.
- A successful replacement preserves the previous `displayOrder` unless the command explicitly changes it.
- Media removal moves the file to Trash; no direct permanent deletion.
- Additions and replacements execute before removals.
- A removal failure does not roll back unrelated successful additions.
- Gallery filenames are stable and are not renumbered when display order changes.

## 2.5 Retry policy

- Retry is manual in V1.
- No hidden or automatic retry.
- No numeric retry limit during the retention window.
- Only one active attempt for the same operation is allowed at a time.
- Every started attempt increments `attemptCount`.
- Repeated requests must be idempotent.
- Completed operations are not executed again.
- `ReconciliationRequired` is not retried automatically.

## 2.6 Staging retention

```text
Retention period: 14 days
```

- The 14-day period starts when the Staging artifact is first created successfully.
- Failed attempts do not extend `expiresAt`.
- Successful publication removes the operation's Staging artifact.
- Cancellation removes the operation's owned Staging artifacts.
- Expired or missing Staging changes the operation to `SourceUnavailable`.
- `SourceUnavailable` means:
  - `retryAllowed = false`
  - `requiresNewSource = true`
- `ReconciliationRequired` artifacts are never cleaned automatically.
- V1 has no Background Worker.
- Cleanup is implemented through `CleanupExpiredMediaStagingUseCase`.

---

# 3. Architectural Boundaries | الحدود المعمارية

## 3.1 Product Aggregate boundary

The Product Aggregate must not contain filesystem details, Staging paths, Trash paths, storage provider errors, or workflow execution state.

يجب ألا يحتوي Product Aggregate على تفاصيل نظام الملفات أو حالات تنفيذ الصور.

Product publication lifecycle is not modified by this task.

## 3.2 Product Media Workflow boundary

Create or extend the existing Product Media module with a dedicated workflow model.

Use existing equivalent types and repositories when they already exist. Do not create duplicate canonical models.

The workflow model may be an Aggregate Root when that matches the existing project structure.

## 3.3 Infrastructure boundary

Reuse Task 3.14.7 ports and primitives for:

- staging,
- validation and WebP normalization,
- publish new media,
- publish replacement,
- move to Trash,
- restore from Trash,
- checksum verification,
- cleanup,
- storage-root registry.

Do not duplicate low-level filesystem logic in Application or Domain code.

## 3.4 Product Entry boundary

Task 3.14.8 must remain independently executable and must not implement Product Entry integration.

Task 3.14.9 will coordinate Product Smart Save and this Media Workflow.

Do not modify Product Entry forms, presentation state, public routes, WhatsApp flows, or catalog screens in this task.

---

# 4. Multi-Tenant and Authorization Rules | تعدد المستأجرين والصلاحيات

- `workspaceId` comes only from trusted execution context.
- Never trust a client-supplied Workspace identity.
- Every workflow, operation, Media item, query, and repository mutation is Workspace-scoped.
- Never load a workflow or Media item by identifier alone.
- Product Media is product-level and shared across branches.
- Do not add branch-specific Media copies.
- Reuse the existing Product-edit authorization policy.
- Do not redesign roles or add a new authorization architecture.
- Every sensitive action records `actorId` and timestamps without exposing storage paths.

---

# 5. Canonical Domain Model | نموذج المجال

Map these contracts to the existing project naming conventions. Equivalent existing types must be reused.

```typescript
type ProductMediaWorkflowStatus =
  | "Pending"
  | "InProgress"
  | "Completed"
  | "PartiallyCompleted"
  | "Failed"
  | "ReconciliationRequired"
  | "Cancelled";

type ProductMediaOperationStatus =
  | "Pending"
  | "Staged"
  | "InProgress"
  | "Completed"
  | "Failed"
  | "SourceUnavailable"
  | "ReconciliationRequired"
  | "Cancelled";

type ProductMediaOperationType =
  | "Add"
  | "Replace"
  | "Remove"
  | "SetCover"
  | "Reorder";
```

A persisted workflow must contain the equivalent of:

```typescript
interface ProductMediaWorkflowState {
  workflowId: string;
  workspaceId: string;
  productId: string;
  status: ProductMediaWorkflowStatus;
  expectedMediaRevision: number;
  idempotencyKey: string;
  createdBy: string;
  startedAt: Date;
  completedAt?: Date;
  version: number;
}
```

A persisted operation must contain the equivalent of:

```typescript
interface ProductMediaOperationState {
  operationId: string;
  workflowId: string;
  workspaceId: string;
  type: ProductMediaOperationType;
  status: ProductMediaOperationStatus;
  targetMediaId?: string;
  stagedArtifactKey?: string;
  expiresAt?: Date;
  attemptCount: number;
  lastAttemptAt?: Date;
  retryAllowed: boolean;
  requiresNewSource: boolean;
  errorCode?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

Do not persist physical absolute filesystem paths in Domain records.

---

# 6. Canonical Media Metadata | بيانات الوسائط الأساسية

Inspect the existing persistence model first.

If canonical Product Media Metadata already exists, extend and reuse it.
If it does not exist, introduce the minimum Workspace-scoped persistence needed for this workflow.

The canonical state must support the equivalent of:

```typescript
interface ProductMediaItem {
  mediaId: string;
  workspaceId: string;
  productId: string;
  storageArtifactKey: string;
  checksumSha256: string;
  mimeType: "image/webp";
  displayOrder: number;
  createdAt: Date;
  createdBy: string;
}

interface ProductMediaState {
  workspaceId: string;
  productId: string;
  revision: number;
  coverMediaId?: string;
  updatedAt: Date;
  updatedBy: string;
}
```

Constraints:

- Workspace-scoped foreign keys.
- No cross-workspace reference.
- `coverMediaId`, when present, must reference a published Media item for the same Workspace and Product.
- `displayOrder` is Metadata and does not determine the physical filename.
- `mediaRevision` changes on successful canonical Media Metadata mutations.
- Use the existing Drizzle/PostgreSQL conventions and migration workflow.

---

# 7. Application Use Cases | حالات الاستخدام

Implement or provide equivalent Application use cases:

```text
ExecuteProductMediaWorkflowUseCase
RetryProductMediaOperationUseCase
CancelProductMediaOperationUseCase
CleanupExpiredMediaStagingUseCase
GetProductMediaWorkflowQuery
GetProductMediaStateQuery
```

Optional smaller use cases may be created when they match the current architecture, but the orchestration must remain cohesive and testable.

## 7.1 Execute workflow command

The command must include the equivalent of:

```typescript
interface ExecuteProductMediaWorkflowCommand {
  actorContext: TrustedActorContext;
  productId: string;
  expectedMediaRevision: number;
  idempotencyKey: string;
  operations: ProductMediaCommandOperation[];
}
```

The client must not provide `workspaceId` independently from trusted context.

## 7.2 Operation commands

Support the equivalent of:

```typescript
type ProductMediaCommandOperation =
  | {
      operationId: string;
      type: "Add";
      source: IncomingMediaSource;
      requestedDisplayOrder?: number;
      selectAsCover?: boolean;
    }
  | {
      operationId: string;
      type: "Replace";
      targetMediaId: string;
      source: IncomingMediaSource;
      selectAsCover?: boolean;
    }
  | {
      operationId: string;
      type: "Remove";
      targetMediaId: string;
    }
  | {
      operationId: string;
      type: "SetCover";
      targetMediaId: string;
    }
  | {
      operationId: string;
      type: "Reorder";
      orderedMediaIds: string[];
    };
```

`IncomingMediaSource` must remain provider-neutral at the Application boundary.

---

# 8. Execution Order | ترتيب التنفيذ

For a new workflow:

1. Resolve trusted Workspace and Actor context.
2. Authorize Product editing.
3. Verify Product belongs to the Workspace.
4. Enforce workflow `idempotencyKey`.
5. Verify `expectedMediaRevision`.
6. Create the Workflow and operation records.
7. Stage and validate all Add/Replace sources independently.
8. Execute successful Add operations.
9. Execute successful Replace operations.
10. Execute Remove operations through Trash.
11. Apply Reorder Metadata for surviving published Media.
12. Resolve the deterministic cover.
13. Persist the resulting Media Metadata and revision.
14. Finalize operation and workflow statuses.
15. Return a combined, truthful result.

A failure in one operation must not prevent independent operations from being attempted, except when continuing would violate ownership, Workspace, revision, or reconciliation safety.

---

# 9. Workflow Status Derivation | اشتقاق الحالة

Use deterministic status precedence:

1. Any operation is `ReconciliationRequired`
   → Workflow is `ReconciliationRequired`.

2. All executable operations completed successfully
   → Workflow is `Completed`.

3. At least one operation completed and at least one operation failed or became unavailable
   → Workflow is `PartiallyCompleted`.

4. No operation completed and at least one failed or became unavailable
   → Workflow is `Failed`.

5. All operations were cancelled before completion
   → Workflow is `Cancelled`.

6. Active execution exists
   → Workflow is `InProgress`.

No ambiguous status derivation may be left to Presentation.

---

# 10. Retry Orchestration | تنسيق إعادة المحاولة

`RetryProductMediaOperationUseCase` must:

1. load by `workspaceId + workflowId + operationId`,
2. enforce authorization,
3. reject cross-workspace access,
4. return idempotently when already completed,
5. reject automatic retry for `ReconciliationRequired`,
6. verify Staging existence and `expiresAt`,
7. change expired/missing source to `SourceUnavailable`,
8. atomically claim one active attempt,
9. increment `attemptCount`,
10. execute only the failed operation,
11. preserve unrelated completed operations,
12. recompute workflow status and cover when relevant.

Concurrent retries for the same operation must result in one active attempt and one deterministic conflict/idempotent response.

---

# 11. Cancellation | الإلغاء

Cancellation applies only to operations that have not completed.

- Completed operations remain completed.
- Owned Staging artifacts are cleaned.
- Published files are not removed by cancelling the workflow.
- A cleanup ambiguity becomes `ReconciliationRequired`.
- Cancellation must be idempotent.
- Cancellation must not alter Product publication.

---

# 12. Expired Staging Cleanup | تنظيف الملفات المنتهية

Implement:

```typescript
CleanupExpiredMediaStagingUseCase
```

Rules:

- Process only expired `Staged` or retryable `Failed` operations.
- Never clean `ReconciliationRequired`.
- Never clean another Workspace's operation.
- Never clean unknown filesystem residue by pattern.
- Clean only artifacts proven to belong to the operation.
- After successful cleanup:
  - status becomes `SourceUnavailable`,
  - `retryAllowed = false`,
  - `requiresNewSource = true`.
- A cleanup ambiguity becomes `ReconciliationRequired`.
- The Use Case must be safe to run repeatedly.
- Do not add a scheduler or Background Worker in V1.

---

# 13. Idempotency and Concurrency | منع التكرار والتعارض

Required invariants:

- Unique Workspace-scoped workflow `idempotencyKey`.
- Unique Workspace-scoped operation identity.
- Optimistic concurrency using workflow version and Media revision.
- No automatic stale reload.
- `MediaRevisionConflict` must be distinct from Product revision conflict.
- Filesystem effects must not be repeated for completed operations.
- Retrying the same request must return the previous logical result when available.
- No distributed transaction may be claimed.

When a filesystem effect succeeds and Metadata persistence fails:

1. run the existing supported compensation,
2. mark ordinary failure only when compensation restores the previous state,
3. otherwise mark the operation and workflow `ReconciliationRequired`.

---

# 14. Error Model | نموذج الأخطاء

Use typed, sanitized errors with stable codes, including the equivalent of:

```text
ProductMediaWorkflowNotFound
ProductMediaOperationNotFound
ProductMediaAuthorizationDenied
MediaRevisionConflict
ProductMediaIdempotencyConflict
ProductMediaOperationAlreadyInProgress
ProductMediaSourceUnavailable
ProductMediaRetryNotAllowed
ProductMediaValidationFailed
ProductMediaStorageFailed
ProductMediaReconciliationRequired
```

Do not expose:

- absolute storage paths,
- usernames,
- raw database errors,
- raw operating-system errors,
- storage credentials,
- internal tenant identifiers beyond authorized logical identifiers.

---

# 15. Persistence and Transactions | الحفظ والمعاملات

Use PostgreSQL and Drizzle following the existing project patterns.

Required persistence may include:

```text
Product Media Workflow
Product Media Operation
Product Media State
Product Media Item
```

Only create tables that are not already represented canonically.

Requirements:

- provider-neutral `DATABASE_URL`,
- Workspace-scoped keys and indexes,
- migration files,
- repository ports in the appropriate boundary,
- Infrastructure adapters,
- optimistic concurrency,
- transactional Metadata and workflow-state updates where they share one database,
- no filesystem operation inside a fake database transaction guarantee.

Document every new table, index, and constraint in the Final Report.

---

# 16. Testing Requirements | متطلبات الاختبار

Add deterministic TypeScript tests.

## 16.1 Domain tests

Cover:

- status derivation,
- 14-day retention without extension,
- unlimited manual attempts,
- single active attempt,
- completed-operation idempotency,
- retry eligibility,
- SourceUnavailable transition,
- cover priority,
- previous-cover preservation,
- deterministic fallback,
- no cover when no published Media,
- display-order changes without filename changes.

## 16.2 Application tests

Cover:

- product published without images remains unaffected,
- successful workflow,
- partial success,
- all operations fail,
- replacement failure preserves old image,
- successful replacement,
- removal through Trash,
- removal of cover selects fallback,
- selected cover failure selects fallback,
- retry success,
- concurrent retry conflict,
- cancellation,
- expired cleanup,
- ReconciliationRequired excluded from cleanup,
- Media revision conflict,
- workflow idempotency,
- cross-workspace rejection,
- authorization rejection,
- filesystem success plus database failure with successful compensation,
- filesystem success plus failed compensation.

## 16.3 Infrastructure tests

Cover:

- workflow persistence,
- operation persistence,
- Workspace-scoped uniqueness,
- Media state revision,
- cover foreign-key safety or equivalent invariant,
- transaction rollback,
- optimistic concurrency,
- migration validity,
- PostgreSQL integration.

Use deterministic fault injection. Do not depend on timing sleeps or random platform permissions.

---

# 17. Documentation | التوثيق

Create or update bilingual documentation covering:

- workflow lifecycle,
- operation lifecycle,
- partial-success policy,
- Product/Media independence,
- cover-selection policy,
- retry policy,
- 14-day retention,
- cleanup behavior,
- ReconciliationRequired handling,
- persistence model,
- multi-tenant boundaries,
- operational limitations in V1.

Do not document unimplemented Background Workers or automatic retry as available features.

---

# 18. Explicit Non-Goals | خارج النطاق

Do not implement:

- Product Entry integration,
- product form UI,
- public product page changes,
- WhatsApp sharing,
- automatic Background Worker,
- automatic scheduled retry,
- permanent Trash deletion policy,
- object-storage provider,
- branch-specific product images,
- Product publication rollback because of Media,
- Task 3.14.9,
- unrelated dependency upgrades,
- forced audit fixes,
- a new authorization architecture.

---

# 19. Required Verification | التحقق المطلوب

Run the project-equivalent commands, including:

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

Do not run `npm audit fix --force`.

Database credentials must remain only in the existing transient environment.
Never copy credentials into source files, scripts, tests, reports, or task documents.

---

# 20. Final Report | التقرير النهائي

Create:

```text
docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

The report must include:

1. Summary
2. Architecture discovery and reused components
3. Files created
4. Files modified
5. Files deleted
6. Domain model
7. Application use cases
8. Persistence model and migrations
9. Multi-tenant enforcement
10. Authorization enforcement
11. Partial-success behavior
12. Retry behavior
13. Retention and cleanup
14. Cover-selection policy
15. Idempotency and concurrency
16. Compensation and reconciliation
17. TypeScript result
18. Lint result
19. Unit test result
20. PostgreSQL integration result
21. Build result
22. Drizzle result
23. Runtime audit result
24. Full audit result
25. Documentation
26. Remaining risks
27. Architecture changes
28. Status

---

# 21. Review Bundle | حزمة المراجعة

After all verification succeeds, generate exactly one review bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

The merged DEV-001-R4 tooling must export exactly:

```text
QSC-Task-3.14.8-Final-Report.md
QSC-Task-3.14.8-Review.zip
QSC-Task-3.14.8-Review.zip.sha256
```

A shared timestamp/counter suffix is acceptable.

Required manifest result:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Do not automatically retry a failed bundle run.

---

# 22. Acceptance Criteria | معايير القبول

Task 3.14.8 is ready for review only when:

1. Product publication remains independent from Media.
2. Products can remain published without images.
3. Partial Media success is preserved.
4. replacement failure preserves the previous image.
5. removals use Trash.
6. automatic cover selection is deterministic.
7. display order does not rename files.
8. retry is manual and idempotent.
9. retries are unlimited during the original 14-day window.
10. only one active attempt exists per operation.
11. expired source becomes `SourceUnavailable`.
12. `ReconciliationRequired` is not auto-cleaned or auto-retried.
13. cleanup is repeatable and ownership-scoped.
14. all persistence is Workspace-scoped.
15. cross-workspace access is rejected.
16. Media revision conflicts are enforced.
17. ambiguous compensation becomes reconciliation-required.
18. no Product Entry or UI implementation is included.
19. all required verification passes.
20. the review bundle is `ReadyForReview`.
21. no Git commit, push, merge, or Task 3.14.9 work is performed.

Stop after producing the Final Report, Review ZIP, and detached SHA-256.
