# QSC Task 3.14.8-R4 — Ambiguity Preservation, Post-Delete Concurrency Recovery, and Final Evidence
## حفظ الغموض وتعافي التعارض بعد الحذف وتصحيح الأدلة النهائية

**Project:** Quadcore Smart Catalog — QSC

**Parent:** Task 3.14.8-R3

**Target Branch:** `feature/product-media-workflow-orchestration`

**Implementation:** TypeScript only

**Architecture:** Existing DDD, Clean Architecture, Modular Monolith

**Documentation:** English and Arabic

Do not stage, commit, push, merge, or begin Task 3.14.9.

---

# 1. Objective | الهدف

Complete Task 3.14.8 by correcting:

1. remaining untracked-file whitespace,
2. initial partial-operation ambiguity recovery,
3. cancellation concurrency after Staging deletion,
4. cleanup concurrency after Staging deletion,
5. temporary-storage probe classification,
6. missing canonical final-object reconciliation,
7. missing-root cleanup visibility,
8. Final Report and manifest agreement.

Preserve every accepted R1, R2, and R3 architectural decision.

---

# 2. Evidence Whitespace | مسافات ملفات الأدلة

Remove trailing whitespace from:

```text
docs/05-Development/Reports/QSC-Task-3.14.8-R2-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Tasks/QSC-Task-3.14.8-R3-Durable-Terminal-Transitions-and-Review-Evidence-Correction.md
lines 4, 5, 6, 7, 8, 201, and 224
```

Also check every untracked text file, including this R4 task and the R3 independent review.

Do not use Markdown hard-break spaces at line endings.

Run:

```powershell
git diff --check
```

and the review tool's untracked integrity preflight before bundle generation.

---

# 3. Preserve Initial Effect Ambiguity | حفظ غموض الأثر الأولي

Refactor the initial Add/Replace/Remove execution into an explicit typed effect result:

```typescript
type InitialEffectOutcome =
  | {
      readonly type: "Succeeded";
      readonly compensations: readonly Compensation[];
    }
  | {
      readonly type: "KnownFailure";
      readonly retryAllowed: boolean;
      readonly requiresNewSource: boolean;
      readonly errorCode: string;
    }
  | {
      readonly type: "ReconciliationRequired";
      readonly errorCode: "ProductMediaReconciliationRequired";
    };
```

Rules:

- `ProductMediaStoragePartialOperationError` maps only to `ReconciliationRequired`.
- A later persistence or compensation branch must never overwrite this outcome.
- Do not run generic compensation for an ambiguous effect unless the storage adapter returned an explicit safe compensation contract.
- Persist focused ReconciliationRequired when possible.
- Never convert ambiguity to SourceUnavailable.
- Never convert ambiguity to retryable Failed.
- Product publication remains independent.

---

# 4. Post-Delete Transition Recovery | التعافي بعد حذف المصدر

Cancellation and cleanup physically delete or confirm absence of Staging before terminal persistence.

When the first focused transition conflicts:

1. reload the Workflow by Workspace and Workflow ID,
2. find the exact operation,
3. inspect the current durable operation status,
4. return success only when another actor already established a compatible terminal truth,
5. if the operation remains in the prior retryable state, retry the focused transition once using the reloaded Workflow version,
6. do not reuse the stale expected version,
7. if the second transition conflicts or PostgreSQL is unavailable, return a sanitized reconciliation-required result without claiming it was persisted.

A compatible terminal truth for a deleted Add/Replace source is:

```text
Cancelled
SourceUnavailable
ReconciliationRequired
```

A still-retryable Failed or Staged state is not compatible.

Do not add an automatic background retry loop.

---

# 5. Cleanup Per-Operation Concurrency | تعارض التنظيف لكل عملية

Cleanup must continue processing operations independently.

For each eligible operation:

- derive only the exact typed Staging key,
- discard or confirm known absence,
- persist SourceUnavailable,
- update the local Workflow version after every successful transition,
- on conflict reload the Workflow,
- inspect the exact operation,
- perform at most one reloaded transition attempt,
- increment the cleaned count only for a durably established SourceUnavailable transition,
- do not count Cancelled or ReconciliationRequired as cleaned,
- never suppress a conflict merely because another operation changed the Workflow.

Return or expose reconciliation-required cleanup information without introducing a Background Worker.

If the public contract currently returns only a number, introduce a typed cleanup result through the existing Application boundary after architectural discussion inside the task documentation. Do not silently discard reconciliation outcomes.

---

# 6. Storage Probe Classification | تصنيف فحص التخزين

For `temporaryExists`:

```text
Exists(true)
→ continue retry

Exists(false)
→ durable SourceUnavailable
→ retryAllowed = false
→ requiresNewSource = true

Failed with known provider failure
→ ProductMediaStorageFailed
→ do not invalidate Staging

Failed with partial or ambiguous state
→ durable ReconciliationRequired when possible
```

Do not treat all `Failed` results as missing Staging.

For canonical final-object checks:

```text
Exists(true)
→ continue Replace/Remove retry

Exists(false)
→ canonical Metadata and filesystem disagree
→ ReconciliationRequired
→ retryAllowed = false

Failed
→ storage/infrastructure failure or reconciliation according to the typed adapter result
```

Persist reconciliation through the focused operation transition when PostgreSQL is available.

---

# 7. Missing Immutable Root During Cleanup | غياب الجذر غير القابل للتغيير

If an expired operation exists but its immutable ProductMediaRoot cannot be loaded:

- do not derive a path,
- do not delete any file,
- do not silently continue as normal,
- surface a reconciliation-required cleanup outcome,
- preserve Workspace scoping,
- add a deterministic test.

Do not recreate a missing root during cleanup because the original immutable path identity may be unknown.

---

# 8. Focused Transition Helper | مساعد الانتقال المركز

Create one cohesive Application helper for post-external-effect terminal establishment.

Equivalent behavior:

```typescript
interface EstablishTerminalAfterExternalEffectInput {
  readonly workspaceId: WorkspaceId;
  readonly workflowId: string;
  readonly operationId: string;
  readonly initialExpectedVersion: number;
  readonly allowedPreviousStatuses: readonly ProductMediaOperationStatus[];
  readonly terminal: ProductMediaOperationTransitionInput;
  readonly compatibleConcurrentStatuses: readonly ProductMediaOperationStatus[];
}
```

The helper must:

- attempt the focused transition,
- on conflict reload once,
- return a compatible concurrent terminal truth,
- otherwise use the reloaded version for one second attempt,
- never reuse a stale version,
- never replay the filesystem effect,
- return a typed outcome:
  - `Established`
  - `CompatibleConcurrentTruth`
  - `ReconciliationRequired`
  - `NotFound`.

Keep infrastructure errors sanitized.

---

# 9. Tests | الاختبارات

Add deterministic Domain, Application, Infrastructure, and PostgreSQL tests for:

1. initial Add partial ambiguity plus save failure,
2. initial Replace partial ambiguity plus save failure,
3. initial Remove partial ambiguity plus save failure,
4. ambiguity is never downgraded,
5. cancellation conflict caused by another operation advancing Workflow version,
6. cancellation reload and second transition use the new version,
7. cleanup conflict caused by another operation,
8. cleanup does not count a non-SourceUnavailable concurrent terminal state,
9. cleanup does not leave known deleted Staging retryable,
10. temporary probe `Exists(false)` becomes SourceUnavailable,
11. temporary probe `Failed` does not become SourceUnavailable,
12. canonical final `Exists(false)` becomes ReconciliationRequired,
13. canonical final probe failure is not reported as known absence,
14. missing cleanup root is surfaced,
15. operation-only transitions do not rewrite canonical images,
16. all untracked review files pass whitespace integrity,
17. manifest and report status agree.

Use deterministic injected failures. Do not use timing sleeps.

---

# 10. Final Report | التقرير النهائي

Update:

```text
docs/05-Development/Reports/
Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Replace stale R2 wording.

The report must accurately describe:

- R4 files modified,
- initial ambiguity preservation,
- post-delete conflict recovery,
- storage-probe classification,
- cleanup result semantics,
- missing-root behavior,
- actual test counts,
- actual PostgreSQL integration result,
- actual Drizzle result,
- Git tracked and untracked integrity,
- audit results,
- remaining risks,
- final bundle status.

Do not write `Ready for review` until the generated manifest confirms:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

---

# 11. Required Verification | التحقق المطلوب

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

The two npm audit commands are authorized for read-only registry access only.

Do not run:

```text
npm audit fix
npm audit fix --force
```

Do not expose or persist credentials.

---

# 12. Review Bundle | حزمة المراجعة

Preserve all previous 3.14.8, R1, R2, and R3 artifacts as historical evidence.

After every blocking verification and both tracked/untracked integrity checks pass, generate exactly one R4 bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8-R4 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-3.14.8-R4-Final-Report.md
QSC-Task-3.14.8-R4-Review.zip
QSC-Task-3.14.8-R4-Review.zip.sha256
```

A shared collision suffix is acceptable.

Required manifest:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

Every required verification command inside the bundle must exit 0.

Do not automatically retry a failed bundle command.

---

# 13. Acceptance Criteria | معايير القبول

R4 is ready for review only when:

1. no tracked or untracked trailing whitespace remains,
2. initial storage ambiguity remains ReconciliationRequired,
3. cancellation never reuses a stale Workflow version,
4. cleanup never reuses a stale Workflow version,
5. known deleted Staging is not represented as retryable,
6. a failed storage probe is not represented as known missing,
7. missing canonical final objects enter reconciliation,
8. missing immutable roots are surfaced,
9. operation-only transitions do not rewrite canonical Media,
10. Product publication independence remains unchanged,
11. fixed 14-day retention remains unchanged,
12. all required checks pass,
13. report and manifest agree,
14. no UI/Product Entry/Task 3.14.9 work is included,
15. no commit, push, or merge is performed.

Stop after producing the R4 Final Report, Review ZIP, and detached SHA-256.
