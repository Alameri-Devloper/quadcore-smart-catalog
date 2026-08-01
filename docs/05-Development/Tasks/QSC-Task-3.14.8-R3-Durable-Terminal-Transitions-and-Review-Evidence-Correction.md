# QSC Task 3.14.8-R3 — Durable Terminal Transitions and Review Evidence Correction
## تصحيح الانتقالات النهائية الدائمة وأدلة المراجعة

**Project:** Quadcore Smart Catalog — QSC
**Parent:** Task 3.14.8-R2
**Target Branch:** `feature/product-media-workflow-orchestration`
**Implementation:** TypeScript only
**Architecture:** Existing DDD, Clean Architecture, Modular Monolith
**Documentation:** English and Arabic

Do not stage, commit, push, merge, or begin Task 3.14.9.

---

# 1. Objective | الهدف

Complete Task 3.14.8 by correcting:

1. failed bundle evidence,
2. PostgreSQL review-environment separation,
3. durable ReconciliationRequired transitions,
4. durable SourceUnavailable transitions,
5. cancellation persistence after source deletion,
6. expiry-cleanup persistence,
7. compensated Add/Replace source semantics,
8. empty Workflow command validation,
9. focused operation-only persistence transitions.

Preserve all accepted R1/R2 architecture and behavior.

---

# 2. Evidence Whitespace | مسافات الأدلة

Remove trailing whitespace from:

```text
docs/05-Development/Reports/QSC-Task-3.14.8-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Reports/QSC-Task-3.14.8-R1-Independent-Review-Report.md
lines 4 and 5

docs/05-Development/Tasks/QSC-Task-3.14.8-R2-Retry-Integrity-Metadata-Recovery-and-Evidence-Correction.md
lines 4, 5, 6, 7, and 8
```

Do not change visible wording.

Run:

```powershell
git diff --check
```

No trailing-whitespace finding is acceptable.

---

# 3. Correct Database Environment | بيئة قاعدة البيانات الصحيحة

The previous R2 bundle failed because `DATABASE_URL` and `TEST_DATABASE_URL` identified the same database.

Use two distinct database names:

```text
DATABASE_URL
→ application/development database

TEST_DATABASE_URL
→ isolated guarded test database
```

They may use the same local PostgreSQL container and credentials, but must not resolve to the same normalized host/port/database identity.

Requirements:

- no credential output,
- no `.env` file,
- no credentials in source, tests, reports, scripts, summaries, or artifacts,
- the integration safety guard must pass,
- `npm.cmd run db:check` must receive `DATABASE_URL`,
- `npm.cmd run test:integration` must receive both distinct variables.

Do not weaken or bypass the safety guard.

---

# 4. Reject Empty Workflow Commands | رفض الدورة الفارغة

Before Product lookup, root resolution, Workflow creation, or filesystem effects:

```text
operations.length > 0
```

must be enforced.

An empty command must return the typed sanitized validation error.

---

# 5. Focused Operation-Only Repository Transitions
## انتقالات مستودع مخصصة للعملية فقط

Extend the existing repository boundary with the minimum focused Workspace-scoped optimistic transitions required for states that do not mutate canonical Media rows.

Equivalent operations may include:

```typescript
markOperationSourceUnavailable(...)
markOperationCancelled(...)
markOperationFailed(...)
markOperationReconciliationRequired(...)
```

Required properties:

- Workspace + Workflow + operation identity,
- expected Workflow version,
- allowed previous statuses,
- Workflow status recomputed or supplied safely,
- Workflow version incremented exactly once,
- operation status/error/retry fields updated atomically,
- no canonical image delete/reinsert,
- no Media revision dependency when Media does not change,
- typed conflict/not-found outcomes,
- sanitized PostgreSQL failures.

Do not add a second canonical image table.

---

# 6. Retry Reconciliation Persistence | حفظ مصالحة الإعادة

Once the retry storage outcome is:

```text
ReconciliationRequired
```

it must never be converted to:

```text
Failed
retryAllowed = true
```

If the broad terminal save fails:

1. do not replay or compensate an ambiguous storage effect,
2. attempt the focused reconciliation transition,
3. set:
   - `status = ReconciliationRequired`
   - `retryAllowed = false`
   - `requiresNewSource = false`
   - stable reconciliation error code,
4. recompute Workflow status,
5. reload in tests and verify durability.

If PostgreSQL is unavailable, return a sanitized reconciliation-required error without claiming it was persisted.

---

# 7. Durable SourceUnavailable | حالة المصدر غير المتاح الدائمة

When Add/Replace Staging is expired or missing:

1. do not claim the retry,
2. use the focused operation transition,
3. persist:
   - `status = SourceUnavailable`
   - `retryAllowed = false`
   - `requiresNewSource = true`,
4. inspect the transition result,
5. return SourceUnavailable only after durable success,
6. return a typed conflict or reconciliation-required result when durability cannot be established.

Remove the result-ignoring behavior from `persistWithoutMediaChange`, or remove that helper entirely.

---

# 8. Cancellation Protocol | بروتوكول الإلغاء

Cancellation remains idempotent and operation-scoped.

For an operation with owned Staging:

1. validate Workspace, authorization, operation status, and root,
2. discard only the exact typed Staging key,
3. treat missing Staging as an idempotent physical outcome,
4. persist `Cancelled` using the focused transition.

If physical deletion succeeds but persistence fails:

- do not report only `AlreadyInProgress`,
- the source is no longer retryable,
- attempt a focused `SourceUnavailable` or `ReconciliationRequired` transition,
- return a truthful sanitized result.

Completed and already Cancelled remain idempotent.
ReconciliationRequired remains excluded from automatic cancellation.

---

# 9. Expired Cleanup Protocol | بروتوكول تنظيف المنتهي

Process each eligible operation independently.

For each operation:

1. verify exact Workspace-scoped ownership,
2. discard only the exact typed Staging key,
3. treat missing Staging as source unavailable,
4. persist SourceUnavailable through the focused transition,
5. increment the cleaned count only after durable success.

If the file is removed but the transition cannot be persisted:

- report reconciliation-required,
- do not leave a silent retryable result,
- continue only when operation independence and safety are known.

Never pattern-delete unknown residue.
Never process ReconciliationRequired.

---

# 10. Compensated Add/Replace Source Semantics
## حالة مصدر الإضافة والاستبدال بعد التعويض

A successful Add or Replace publication consumes Staging.

When Metadata save fails and compensation restores the previous canonical state:

## Add

```text
new final removed or moved to Trash
Staging consumed
→ SourceUnavailable
→ retryAllowed = false
→ requiresNewSource = true
```

## Replace

```text
previous final restored
Staging consumed
→ SourceUnavailable
→ retryAllowed = false
→ requiresNewSource = true
```

## Remove

```text
previous final restored
no Staging dependency
→ Failed
→ retryAllowed = true
```

Persist these results through focused terminal transitions.

Do not make the user perform one extra Retry merely to discover that Staging is missing.

---

# 11. Metadata Conflict Result | نتيجة تعارض البيانات الوصفية

For SetCover/Reorder when canonical Media persistence fails before any filesystem effect:

- restore the previous in-memory Media state,
- do not label the result as storage failure,
- map Media revision conflicts to `MediaRevisionConflict`,
- use an operation-only failure transition when possible,
- do not claim durable ReconciliationRequired unless actual state is ambiguous.

Keep the accepted R2 rollback invariants.

---

# 12. Deterministic Tests | الاختبارات الحتمية

Add tests for:

1. empty command rejected before root creation,
2. retry partial-operation plus terminal-save failure remains ReconciliationRequired,
3. focused reconciliation transition reloads durably,
4. SourceUnavailable transition result is checked,
5. SourceUnavailable conflict is not ignored,
6. cancelled Staging deletion plus save conflict produces truthful durable state,
7. missing Staging cancellation remains idempotent,
8. cleanup processes operations independently,
9. cleanup counts only durable SourceUnavailable transitions,
10. cleanup persistence failure becomes reconciliation-required,
11. compensated Add becomes SourceUnavailable,
12. compensated Replace becomes SourceUnavailable,
13. compensated Remove remains safely retryable,
14. canonical Media rows are not rewritten by operation-only transitions,
15. Media revision is unchanged by operation-only transitions,
16. distinct `DATABASE_URL` and `TEST_DATABASE_URL` pass the safety guard,
17. identical database identity remains rejected,
18. every PostgreSQL suite executes in the bundle,
19. Git integrity passes,
20. report status matches the manifest.

Use deterministic injected failures. Do not use timing sleeps.

---

# 13. Final Report Correction | تصحيح التقرير النهائي

Update:

```text
docs/05-Development/Reports/
Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Correct or extend:

- durable terminal transitions,
- SourceUnavailable persistence,
- cancellation behavior,
- cleanup behavior,
- compensated source semantics,
- empty-command validation,
- PostgreSQL environment separation,
- actual bundled integration result,
- Git integrity,
- Remaining Risks,
- Status.

Do not claim Ready for review unless the new manifest is `ReadyForReview`.

---

# 14. Required Verification | التحقق المطلوب

Run in one correctly configured transient process environment:

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

The audit findings remain visible and non-blocking under the accepted temporary baseline.

---

# 15. Review Bundle | حزمة المراجعة

Preserve all previous 3.14.8, R1, and R2 artifacts.

After every blocking verification passes, generate exactly one R3 bundle:

```powershell
npm.cmd run review:bundle -- --task=3.14.8-R3 --report=docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md
```

Required Desktop artifacts:

```text
QSC-Task-3.14.8-R3-Final-Report.md
QSC-Task-3.14.8-R3-Review.zip
QSC-Task-3.14.8-R3-Review.zip.sha256
```

A shared timestamp or collision counter is acceptable.

Required manifest:

```text
overallStatus: ReadyForReview
gitIntegrity.passed: true
```

The integration command inside the bundle must exit 0 and execute every configured PostgreSQL suite.

Do not automatically retry a failed bundle command.

---

# 16. Acceptance Criteria | معايير القبول

R3 is ready for review only when:

1. Git integrity passes,
2. bundled PostgreSQL integration exits 0,
3. application and test database identities are distinct,
4. empty Workflows are rejected,
5. retry ambiguity remains ReconciliationRequired,
6. SourceUnavailable is durably persisted,
7. cancellation never leaves stale retryable state after source deletion,
8. cleanup never leaves stale retryable state after source deletion,
9. compensated Add/Replace require a new source,
10. compensated Remove remains safely retryable,
11. operation-only transitions do not rewrite canonical Media,
12. Product publication independence remains unchanged,
13. fixed 14-day retention remains unchanged,
14. no UI/Product Entry/Task 3.14.9 work is included,
15. all required checks pass,
16. report and manifest status agree,
17. no commit, push, or merge is performed.

Stop after producing the R3 Final Report, Review ZIP, and detached SHA-256.
