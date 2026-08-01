# Task 3.14.8-R4 — Independent Review Report
## تقرير المراجعة المستقلة للمهمة 3.14.8-R4

**Project:** Quadcore Smart Catalog — QSC

**Task:** Ambiguity Preservation, Post-Delete Concurrency Recovery, and Final Evidence

**Reviewed artifacts:**

- `QSC-Task-3.14.8-R4-Final-Report.md`
- `QSC-Task-3.14.8-R4-Review.zip`
- `QSC-Task-3.14.8-R4-Review.zip.sha256`

**Decision:** The R4 archive and manifest are authentic and all blocking verification commands passed. The implementation still has blocking staging-durability and typed-storage-result defects, the approved cleanup result contract is incomplete, and the Final Report misstates the full npm audit result. Task 3.14.8-R5 is required before Git commit.

---

# 1. Executive Decision | القرار التنفيذي

The detached SHA-256 matches the ZIP. Archive coverage, payload hashes, copied-source hashes, and standalone Final Report identity are valid.

The manifest correctly records:

```text
taskId: 3.14.8-R4
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Verification evidence records:

```text
TypeScript: passed
Integration TypeScript: passed
Lint: passed
Unit tests: passed
Product Media: 77 total, 76 passed, 1 platform-permission skip
PostgreSQL integration: 45/45 passed
Production build: passed
Drizzle check: passed
Runtime audit: 3 high
Full audit: 8 total — 4 moderate, 4 high
```

The implementation is not ready for commit because important external-effect paths remain unsafe.

```text
Artifact integrity: Passed
Manifest status: Passed
Git integrity: Passed
Required verification: Passed

Staging durability: Failed
Typed storage-result classification: Failed
Active-operation cancellation safety: Failed
Operation-ID pre-effect validation: Failed
Approved cleanup result contract: Incomplete
Final Report audit accuracy: Failed

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R5 required: Yes
```

---

# 2. Artifact Integrity | سلامة الملفات

```text
ZIP SHA-256:
2a67a01e052e7ad6529aa63e59ddb5bca15ebbeeb535f3547282e932ad7ded6c

Detached SHA-256:
2a67a01e052e7ad6529aa63e59ddb5bca15ebbeeb535f3547282e932ad7ded6c

Result:
Matched
```

```text
ZIP entries including manifest: 57
Manifest payload entries: 56
Missing payloads: 0
Payload hash mismatches: 0
Source-to-bundle hash mismatches: 0
Unsafe archive paths: 0
```

The standalone Final Report is byte-for-byte identical to both copies in the ZIP.

```text
Final Report SHA-256:
00ff0620834cdf5060693478f741bec8ae49ffadf74b80c5e7b29601f1b42318
```

---

# 3. Positive R4 Findings | النتائج الإيجابية

R4 successfully corrects and demonstrates:

- valid `ReadyForReview` manifest,
- complete tracked and untracked Git integrity,
- 45/45 PostgreSQL integration tests,
- initial publication ambiguity preserved as `ReconciliationRequired`,
- post-delete Workflow-version reload for cancellation and cleanup,
- known missing Staging distinguished from probe failure,
- missing canonical final objects entering reconciliation during pre-probe,
- missing immutable roots surfaced by cleanup,
- one canonical `catalog_product_images` table,
- operation-only transitions preserving canonical Media rows,
- Product publication independence,
- fixed 14-day retention,
- deterministic cover and display-order behavior.

These corrections must be preserved.

---

# 4. High — Successful Staging Is Not Durably Established
## مرتفع — نجاح Staging لا يُثبت بصورة دائمة وآمنة

In `ExecuteProductMediaWorkflowUseCase`, Add and Replace perform:

```text
stage filesystem object
persist Staged Workflow status
```

If the Staged persistence conflicts or throws, the catch block classifies the database failure as a storage failure and calls the same broad `persist` path again with the old expected Workflow version.

Relevant source:

```text
domains/catalog/media/services/product-media-workflow.ts
lines 320–327
```

Possible result:

```text
Filesystem: Staging exists
Database: operation remains Pending
expiresAt: not durably recorded
Cleanup query: cannot discover the orphan
Repeated idempotency key: returns the existing incomplete Workflow
```

This violates the required durable Staged boundary.

### Required correction

Add a focused optimistic staging transition that writes, atomically:

- `status = Staged`
- exact Staging key,
- checksum,
- byte length,
- width and height,
- fixed first-stage expiry,
- retry fields,
- Workflow status and version.

On conflict:

1. reload once,
2. accept only exact matching Staged metadata,
3. otherwise retry once with the reloaded version,
4. never reuse a stale version,
5. never rewrite canonical Media rows.

If durable Staged state cannot be established after the file was created:

- discard only the exact owned Staging key,
- establish `SourceUnavailable` when removal/absence is known,
- establish `ReconciliationRequired` when cleanup is ambiguous,
- never leave an undiscoverable orphan represented as Pending.

---

# 5. High — Stage Cleanup Failure Can Leave an Unreported Orphan
## مرتفع — فشل تنظيف Stage قد يترك ملفًا يتيمًا دون مصالحة

`LocalProductMediaStorageAdapter.stage` attempts to unlink an owned file after a write/sync/read failure, but suppresses an unlink failure and throws only a generic infrastructure error.

Relevant source:

```text
domains/catalog/media/infrastructure/local-product-media-storage.adapter.ts
lines 169–173
```

An owned Staging object may therefore remain while the Application receives no partial-operation signal.

### Required correction

- Extend the typed partial-operation contract to cover `stage`.
- Do not suppress failure to remove an owned Stage artifact.
- Return or throw explicit reconciliation-required ambiguity.
- Use injectable filesystem operations so deterministic tests can force Stage cleanup failure.

---

# 6. High — Storage Failure Codes Are Collapsed into Generic Retryable Failure
## مرتفع — تُدمج رموز فشل التخزين في فشل عام قابل للإعادة

Initial and retry execution inspect only `result.type === "Failed"` and ignore the failure code.

Relevant source:

```text
domains/catalog/media/services/product-media-workflow.ts
lines 444–475
lines 591–614
```

This misclassifies important states:

```text
ReplacementRestorationFailed
FinalObjectMissing
TrashConflict
TargetConflict
TemporaryObjectMissing
```

Examples:

- `ReplacementRestorationFailed` can mean the previous final object was not restored, but the operation becomes ordinary retryable Failed.
- `FinalObjectMissing` after a successful pre-probe is a race-created Metadata/filesystem divergence, but Remove/Replace can remain retryable.
- `TargetConflict` during Add can indicate an orphan final object; retry reuses the same final key and can fail forever.
- `TemporaryObjectMissing` should require a new source, not a generic retry.

### Required correction

Create one typed mapping policy used by both initial execution and retry.

At minimum:

```text
TemporaryObjectMissing
→ SourceUnavailable
→ retryAllowed = false
→ requiresNewSource = true

FinalObjectMissing for canonical Replace/Remove target
→ ReconciliationRequired

TrashConflict
→ ReconciliationRequired

TargetConflict for a supposedly free canonical final key
→ ReconciliationRequired

ReplacementRestorationFailed
→ ReconciliationRequired
```

Known safe failures may remain retryable only when the adapter contract proves canonical state was restored.

---

# 7. High — Cancellation Can Race an Active InProgress Operation
## مرتفع — قد يتعارض الإلغاء مع عملية InProgress نشطة

`CancelProductMediaOperationUseCase` rejects Completed and ReconciliationRequired, but does not reject `InProgress`.

It may delete Staging while an active Add/Replace attempt is publishing from that same source.

Possible result:

```text
Retry worker: InProgress
Cancellation: deletes Staging
Filesystem effect: races publication
Database result: Cancelled or reconciliation ambiguity
```

### Required correction

For V1:

```text
InProgress cancellation
→ ProductMediaOperationAlreadyInProgress
→ no filesystem call
→ no status mutation
```

Do not introduce cancellation tokens or a Background Worker in this task.

---

# 8. Medium — Operation ID Validation Does Not Match Storage-Key Validation
## متوسط — تحقق Operation ID لا يطابق قواعد مفتاح التخزين

The command validator permits uppercase characters and up to 128 characters:

```text
^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$
```

The storage-key domain accepts lowercase canonical segments only and limits operation IDs to 80 characters.

An invalid storage operation ID can therefore pass command validation, create a root and Workflow, and fail only when deriving Staging or Trash keys.

This violates complete validation before effects.

### Required correction

Introduce or reuse one Domain-level `ProductMediaOperationId` validator and use it in:

- command validation,
- Staging key creation,
- Trash key creation,
- persistence rehydration where applicable.

Reject invalid IDs before authorization, Product lookup, root creation, Workflow creation, or filesystem effects.

---

# 9. Approved Cleanup Contract Is Incomplete
## عقد Cleanup المعتمد غير مكتمل

The approved project decision requires:

```typescript
interface CleanupExpiredMediaStagingResult {
  readonly scannedCount: number;
  readonly cleanedCount: number;
  readonly reconciliationRequiredCount: number;
  readonly skippedCount: number;
  readonly outcomes: readonly CleanupExpiredMediaStagingOutcome[];
}
```

R4 currently returns only:

```text
type
cleanedCount
reconciliationRequired[]
```

### Required correction

Implement the approved detailed result while preserving Workspace isolation.

`cleanedCount` increases only for durably established `SourceUnavailable`.

Every eligible or skipped operation must have a typed outcome without exposing another Workspace.

---

# 10. Final Report Audit Result Is Incorrect
## نتيجة npm audit في التقرير غير صحيحة

The bundled full-audit evidence says:

```text
8 vulnerabilities
4 moderate
4 high
```

The Final Report says:

```text
16 vulnerabilities
4 moderate
12 high
```

Runtime evidence remains:

```text
3 high
```

The report must record the actual result from the new bundle rather than a previous baseline.

No audit fix or forced dependency update belongs in this correction task.

---

# 11. Required Deterministic Tests | الاختبارات الحتمية المطلوبة

Add tests for:

1. successful Stage plus unrelated Workflow-version conflict,
2. successful Stage plus provider failure before durable Staged persistence,
3. exact matching concurrent Staged truth is accepted,
4. failed Stage persistence plus successful exact discard,
5. failed Stage persistence plus ambiguous discard,
6. Stage-owned cleanup unlink failure raises partial-operation ambiguity,
7. initial and retry `TemporaryObjectMissing`,
8. initial and retry `FinalObjectMissing`,
9. `TrashConflict`,
10. `TargetConflict`,
11. `ReplacementRestorationFailed`,
12. InProgress cancellation performs no storage call,
13. uppercase operation ID rejected before effects,
14. operation ID longer than 80 rejected before effects,
15. reserved/unsafe operation ID rejected before effects,
16. cleanup returns scanned, cleaned, reconciliation, skipped counts,
17. cleanup returns operation-scoped typed outcomes,
18. Final Report audit counts match bundled evidence.

Do not use timing sleeps.

---

# 12. Final Decision | القرار النهائي

```text
Artifact authenticity: Approved
Manifest and Git integrity: Approved
R4 concurrency corrections: Approved
PostgreSQL integration: Approved
Drizzle evidence: Approved

Staging durability: Rejected
Storage-result classification: Rejected
Active cancellation safety: Rejected
Validation-before-effects: Rejected
Approved cleanup contract: Incomplete
Report audit accuracy: Rejected

Ready for commit: No
Ready for Pull Request: No
Task 3.14.8-R5 required: Yes
```

Do not stage, commit, push, merge, or begin Task 3.14.9 before R5 is reviewed.
