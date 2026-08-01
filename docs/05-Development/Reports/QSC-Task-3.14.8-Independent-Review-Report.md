# Task 3.14.8 — Independent Review Report
## تقرير المراجعة المستقلة للمهمة 3.14.8

**Project:** Quadcore Smart Catalog — QSC
**Task:** Product Media Workflow Orchestration
**Reviewed artifacts:**

- `QSC-Task-3.14.8-Final-Report.md`
- `QSC-Task-3.14.8-Review.zip`
- `QSC-Task-3.14.8-Review.zip.sha256`

**Decision:** The evidence bundle is authentic and internally consistent, but the implementation is not ready for Git commit. Task 3.14.8-R1 is required.

---

# 1. Executive Decision | القرار التنفيذي

The submitted ZIP and detached checksum match. Archive structure, manifest coverage, bundled-source hashes, report byte identity, Git integrity, repository fingerprints, verification commands, unit tests, PostgreSQL integration tests, build, Drizzle check, and audit evidence are internally consistent.

The implementation demonstrates substantial Domain, Application, Infrastructure, and PostgreSQL work. However, independent source review found blocking architecture and recovery defects:

1. two canonical Product image stores now exist,
2. the first Media workflow cannot create its Product Media Root,
3. operation transitions are not durably persisted while filesystem effects execute,
4. reconciliation mutations are frequently changed only in memory,
5. retry can leave an operation permanently `InProgress`,
6. retry lacks compensation when Metadata persistence fails,
7. the idempotency key is not bound to the full request,
8. cancellation and expiry cleanup do not handle persistence/missing-source outcomes truthfully.

```text
Artifact integrity: Passed
Manifest integrity: Passed
Git integrity: Passed
Required verification: Passed
Happy-path workflow tests: Passed

Canonical Media ownership: Rejected
First-workflow root lifecycle: Rejected
Durable operation lifecycle: Rejected
Reconciliation persistence: Rejected
Retry safety: Rejected
Request idempotency integrity: Rejected

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R1 required: Yes
```

---

# 2. Artifact Integrity | سلامة الملفات

```text
ZIP SHA-256:
2c483552133a0f8d310a217acf85bf7cb60bef7a8889bb9b01fbde78de080c47

Detached SHA-256:
2c483552133a0f8d310a217acf85bf7cb60bef7a8889bb9b01fbde78de080c47

Result:
Matched
```

Archive inspection:

```text
ZIP entries including manifest: 46
Manifest payload entries: 45
Missing payloads: 0
Extra payloads: 0
Duplicate paths: 0
Unsafe paths: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
```

The standalone Final Report is byte-for-byte identical to both bundled report copies:

```text
Final Report SHA-256:
7b188cc9de4cd2f497aa4eff5a480aca7cf0a047b85918c72fdff08401cbb994
```

---

# 3. Manifest and Verification | البيان والتحقق

```text
overallStatus: ReadyForReview
gitIntegrity.unstaged.passed: true
gitIntegrity.staged.passed: true
gitIntegrity.untracked.passed: true
gitIntegrity.passed: true
```

```text
Branch:
feature/product-media-workflow-orchestration

HEAD:
baa18608b186965bce61f001aee7cef7988ccaba

Initial repository fingerprint:
875929214df06701c791e0e810b56778260de1c6dd6020e93dc405f8827bdcd1

Final repository fingerprint:
875929214df06701c791e0e810b56778260de1c6dd6020e93dc405f8827bdcd1
```

Verification evidence:

```text
TypeScript: Passed
Integration TypeScript: Passed
Lint: Passed
Product/domain tests: 106 passed
DEV-001 tests: 45 passed
Product Media tests: 53 passed, 1 platform-permission skip
PostgreSQL integration tests: 42 passed
Build: Passed
Drizzle check: Passed
```

Audit baseline:

```text
Runtime: 3 high
Full tree: 16 total — 4 moderate, 12 high
```

No forced audit fix was run.

---

# 4. Positive Findings | النتائج الإيجابية

The implementation correctly demonstrates:

- Product publication remains outside Media orchestration,
- Add and Replace execute before Remove,
- partial logical success is represented,
- deterministic cover fallback,
- Metadata-only reorder,
- 14-day fixed Staging retention,
- Workspace-scoped workflow and operation keys,
- typed workflow statuses,
- PostgreSQL optimistic workflow/Media revisions,
- manual retry intent,
- Trash-based removal,
- existing Task 3.14.7 typed storage primitives,
- Local filesystem no-clobber and compensation primitives,
- bilingual documentation and report evidence.

The submitted Final Report truthfully lists the intended six use cases, four new persistence tables, 42 integration tests, and the temporary dependency-audit baseline. Its own status is `Ready for review`. fileciteturn8file0

---

# 5. High — Duplicate Canonical Product Image Stores
## مرتفع — وجود مصدرين أساسيين لصور المنتج

The existing schema already contains:

```text
catalog_product_images
```

with canonical Product image identity, storage key, position, main-image flag, and Product composite ownership.

Task 3.14.8 adds a second item table:

```text
catalog_product_media_items
```

with another image identity, storage key, display order, and cover relationship.

The existing PostgreSQL Product repository integration evidence still verifies Product-owned Image rows. The new workflow repository reads and writes only the new Media item table.

This creates two independent sources of truth for the same Product images:

```text
Product Repository → catalog_product_images
Media Workflow Repository → catalog_product_media_items
```

Possible failures:

- Product reads show different images from Media queries.
- Product update replaces one collection while Media workflow updates another.
- Task 3.14.9 cannot know which collection is authoritative.
- `isMain` and `coverMediaId` can disagree.
- image order can disagree.
- migrations do not define synchronization or retirement.

This directly violates Task section 6:

```text
If canonical Product Media Metadata already exists, extend and reuse it.
```

### Required correction

Preserve the existing architecture:

- reuse `catalog_product_images` as the canonical Product image identity/order/cover store,
- remove `catalog_product_media_items`,
- adapt Product Media Domain names through repository mapping,
- add only the minimum companion integrity metadata when the existing table cannot hold it,
- do not create a second canonical item collection,
- prove Product repository and Media workflow repository observe the same image rows,
- prevent blind Product updates from erasing concurrent Media changes,
- derive `coverMediaId` from the one canonical main-image representation rather than maintaining two cover truths.

Do not redesign Product Aggregate ownership silently.

---

# 6. High — First Media Workflow Cannot Create ProductMediaRoot
## مرتفع — أول دورة وسائط لا تنشئ جذر التخزين

`ExecuteProductMediaWorkflowUseCase` calls only:

```typescript
roots.findByProduct(workspaceId, productId)
```

and throws `ProductMediaStorageFailed` when the root does not already exist.

Both unit and integration tests pre-create the root manually before invoking the workflow.

This means a real Product with no previous Media root cannot execute its first Add operation, even though the approved design requires lazy root creation on the first Media workflow.

The workflow row is created before the root lookup. Therefore root absence also leaves a persisted `Pending` workflow that a repeated idempotency key simply returns.

### Required correction

Resolve-or-create the immutable registry through the existing `ProductMediaRoot` factory and repository before filesystem preparation.

Requirements:

- trusted Workspace/Product identity,
- existing immutable Department/unclassified policy,
- stable product folder,
- deterministic concurrent create handling,
- no root deletion after later failure,
- first Add succeeds without test pre-seeding,
- root absence or creation failure does not leave an unusable idempotent workflow.

---

# 7. High — Workflow Transitions Are Not Durably Persisted
## مرتفع — انتقالات الدورة لا تُحفظ أثناء التنفيذ

The initial workflow is persisted once as:

```text
Pending operations
version 0
```

All Staging, InProgress, Completed, Failed, and Media Metadata mutations then occur in memory. One final repository save occurs after all filesystem operations.

Handled or abrupt failure between creation and the final save can leave:

```text
Database: Pending
Filesystem: staged, published, replaced, or trashed artifacts
```

Consequences:

- partial success is not durable,
- retry metadata such as `stagedArtifactKey` and `expiresAt` may be lost,
- a process interruption cannot reconstruct completed effects,
- a thrown storage Infrastructure/partial-operation error aborts independent operations,
- repeated idempotency returns the stale Pending workflow,
- orphaned files cannot be associated reliably with the persisted operation.

The workflow is acting as an in-memory batch rather than a durable orchestration record.

### Required correction

Persist each state boundary:

```text
Workflow/operations created
Staging completed
Attempt claimed
Filesystem effect completed or failed
Metadata committed
Compensation completed or reconciliation required
```

Independent successful operations must remain durably completed even if a later operation fails.

Do not claim a distributed transaction.

---

# 8. High — Reconciliation Status Is Often Not Persisted
## مرتفع — حالة المصالحة تتغير في الذاكرة فقط

`compensateOrThrow` changes Workflow and completed operations to `ReconciliationRequired`, then throws without saving that state.

The cancellation path similarly changes the operation and Workflow to `ReconciliationRequired`, then throws before repository persistence.

A typed storage partial-operation exception is not caught by the Application orchestrator, so it can escape while the database remains `Pending` or `InProgress`.

The report claims failed compensation produces persisted reconciliation semantics, but the submitted code does not establish that guarantee.

### Required correction

Every handled ambiguity must attempt a durable transition to:

```text
Operation: ReconciliationRequired
Workflow: ReconciliationRequired
retryAllowed: false
```

If PostgreSQL itself is unavailable, the public result must still be a sanitized reconciliation-required failure and must not claim persistence succeeded.

Add deterministic tests that reload the workflow after the error.

---

# 9. High — Retry Can Become Permanently InProgress
## مرتفع — إعادة المحاولة قد تبقى قيد التنفيذ دائمًا

Retry performs the persisted claim before the local eligibility function.

The repository claim allows statuses other than Completed/InProgress and does not require `retryAllowed = true`.

After the database marks the operation `InProgress`, `claimOperationAttempt` may reject it because local `retryAllowed` is false.

This affects failed Remove, SetCover, Reorder, Cancelled, and other non-retryable operations.

Result:

```text
Database status: InProgress
Use Case result: ProductMediaRetryNotAllowed
Future retries: ProductMediaOperationAlreadyInProgress
```

Additionally, after a successful retry filesystem effect, repository-save failure has no compensation path. Add/Replace/Remove effects can exist while the operation remains claimed `InProgress`.

### Required correction

- Validate eligibility before claiming.
- Enforce eligible statuses and `retryAllowed` atomically in the repository claim.
- Do not run a second local claim that can fail after the database mutation.
- Return the claimed version/attempt state from the repository.
- Apply the same compensation/reconciliation policy used by initial execution.
- Prove no handled retry path leaves `InProgress`.

---

# 10. High — Idempotency Key Is Not Bound to the Full Request
## مرتفع — مفتاح منع التكرار غير مرتبط بالطلب الكامل

A repeated key is accepted as the same request when only these values match:

```text
productId
expectedMediaRevision
```

Different operations, targets, order, cover selection, and source bytes can reuse the same key and silently receive the previous workflow.

This can discard a legitimate new Media command without a conflict.

### Required correction

Persist a canonical request fingerprint that includes:

- Product identity,
- expected Media revision,
- ordered operation descriptors,
- targets/order/cover flags,
- source content SHA-256 for Add/Replace.

Do not persist source bytes in the fingerprint record.

Behavior:

```text
same key + same fingerprint → return/resume previous logical workflow
same key + different fingerprint → ProductMediaIdempotencyConflict
```

---

# 11. Medium — Cancellation and Cleanup Outcomes Are Not Truthful
## متوسط — نتائج الإلغاء والتنظيف غير دقيقة

Cancellation treats `TemporaryObjectMissing` as reconciliation-required, although missing owned Staging can be an idempotent cancellation outcome.

Expiry cleanup ignores the result returned by repository `save`. It can increment the reported cleaned count while the operation transition was not persisted.

Required correction:

- Missing Staging during cancellation must be handled deterministically and idempotently.
- Check every cleanup persistence result.
- Do not report an item cleaned when the durable state did not change.
- Map concurrency conflicts explicitly.
- Persist reconciliation on ambiguous cleanup failure.

---

# 12. Medium — Command Validation Happens After Durable/Filesystem Effects
## متوسط — التحقق من الأمر متأخر

Examples include:

- duplicate operation IDs,
- invalid/negative requested display order,
- reused idempotency key with a changed payload,
- conflicting multiple replacements/removals of the same Media item,
- invalid operation identifiers that fail only when creating storage keys.

Some invalid inputs can create a workflow or stage/publish files before failing.

Required correction:

Validate the complete command and operation graph before workflow creation or filesystem effects.

---

# 13. Test Gaps | فجوات الاختبار

The existing tests do not deterministically cover:

- first workflow with no pre-created Media root,
- Product repository and Media workflow sharing one canonical image collection,
- crash/failure after Staging persistence,
- crash/failure after filesystem success before Metadata save,
- storage partial-operation exceptions during initial execution,
- persisted ReconciliationRequired reload,
- retry rejection without database mutation,
- retry save failure with successful compensation,
- retry save failure with failed compensation,
- same idempotency key with a different payload,
- cancellation with missing Staging,
- cleanup repository conflict,
- multiple conflicting operations targeting one Media item.

---

# 14. Final Report Accuracy | دقة التقرير النهائي

The report should not currently claim complete persisted workflow orchestration, canonical Media persistence, or durable reconciliation.

The corrected report must describe:

- the one canonical image collection,
- root resolve-or-create,
- durable state boundaries,
- retry compensation,
- request fingerprint semantics,
- exact remaining process-interruption limits.

---

# 15. Final Decision | القرار النهائي

```text
Artifact authenticity: Approved
Bundle completeness: Approved
Git integrity: Approved
Verification evidence: Approved
Basic Domain policy: Approved
Task 3.14.7 primitive reuse: Approved

Canonical persistence: Rejected
Root lifecycle: Rejected
Durable orchestration: Rejected
Reconciliation persistence: Rejected
Retry safety: Rejected
Idempotency integrity: Rejected

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R1 required: Yes
```

Do not stage, commit, push, merge, or begin Task 3.14.9 before the R1 correction is reviewed.
