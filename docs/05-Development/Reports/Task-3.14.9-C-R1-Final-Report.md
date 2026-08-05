# Task 3.14.9-C-R1 — Correct Create Draft Completion Lifecycle — Final Report

**Status:** ReadyForReview

**Task:** 3.14.9-C-R1

**Branch:** `feature/product-entry-local-draft`

**Date:** 2026-08-05

## Summary — English

Corrected the Task 3.14.9-C completion lifecycle without restarting or redesigning the local-draft slice. A Create `SubmissionCompleted` event now returns `Preserved` and leaves the exact draft, submission ID, form state, and Media descriptors unchanged through Phase 1 success, Phase 2 completion, completed-response replay, retry, restore, and later saved-Product viewing. Only the explicit Add New Product application flow deletes the exact old Create draft and allocates a different submission ID. Explicit discard and scoped expiry cleanup remain the other approved Create deletion paths.

The Edit policy is explicit: terminal Edit `SubmissionCompleted` exact-deletes only the matching Edit draft. The generic `SavedSuccessfully` reason was removed and replaced with a mode-restricted `EditSessionCompleted` reason. No Product Aggregate, Phase 1, Phase 2, IndexedDB schema, retention, migration, security filter, dependency, or database architecture changed.

## الملخص — العربية

صُححت دورة اكتمال المهمة 3.14.9-C من دون إعادة بدء شريحة المسودة المحلية أو إعادة تصميمها. يعيد حدث `SubmissionCompleted` في وضع الإنشاء النتيجة `Preserved` ويحافظ على المسودة الدقيقة ومعرف الطلب وحالة النموذج وأوصاف الوسائط من دون تغيير بعد نجاح المرحلة الأولى واكتمال المرحلة الثانية وإعادة استجابة الاكتمال والمحاولة والاستعادة وعرض المنتج المحفوظ لاحقاً. وحده مسار «إضافة منتج جديد» الصريح يحذف مسودة الإنشاء القديمة الدقيقة ويخصص معرف طلب مختلفاً. ويبقى الحذف الصريح من المستخدم وتنظيف الانتهاء المقيد مساري الحذف الآخرين المعتمدين للإنشاء.

سياسة التعديل صريحة: يحذف حدث `SubmissionCompleted` النهائي في وضع التعديل مسودة التعديل المطابقة وحدها. أزيل سبب الحذف العام `SavedSuccessfully` واستُبدل بسبب `EditSessionCompleted` المقيد بوضع التعديل. لم يتغير مجمّع المنتج أو المرحلة الأولى أو الثانية أو مخطط IndexedDB أو الاحتفاظ أو الترحيل أو مرشح الأمان أو الاعتمادات أو معمارية قاعدة البيانات.

## Recovery and Root-Cause Evidence

- Recovery resumed on the required `feature/product-entry-local-draft` branch with the interrupted Task C changes preserved.
- Every modified, deleted, and untracked Task C file was inspected; no interrupted/truncated source file was found.
- The pre-fix regression assertion failed as required: Create `SubmissionCompleted` returned `{ type: "Completed" }` instead of `{ type: "Preserved" }`.
- Root cause: `ApplyProductEntryLocalDraftLifecycleEventUseCase` routed `SubmissionCompleted` for both modes through a generic successful-save deletion reason.
- Smallest safe correction: branch the lifecycle by mode, preserve Create completion, exact-delete terminal Edit completion, and remove Add New from the generic deletion-reason API.

## Corrected Lifecycle Proof

- Create completion and a repeated completed response both return `Preserved`.
- The stored Create record is byte-for-value unchanged at the application boundary and retains the same `submissionId`.
- Phase 1 success, Phase 1 retry, Phase 2 retry, validation failure, network failure, and revision conflict preserve the draft.
- `ProductEntryLocalDraftSessionService.startNewProduct` owns the replacement-session sequence: exact-delete the current Create identity, then allocate a different submission ID.
- The Presentation-facing controller supports save/flush → completion/replay preservation → explicit Add New → exact old-record deletion → different ID.
- Add New, discard, completion, and expiry tests prove Workspace/actor scoping; unrelated records remain stored.
- Edit terminal completion exact-deletes only its matching Edit identity. The generic delete use case rejects `EditSessionCompleted` for Create mode.
- Recovery still requires explicit acceptance and revalidation; revision conflicts still preserve without automatic merge.
- No raw Media bytes, object URLs, authentication/session material, or Reference Purchase Cost can be stored.

## Files Created

- `docs/05-Development/Reports/Task-3.14.9-C-R1-Final-Report.md`

## Files Modified

- `domains/catalog/product-entry/drafts/product-entry-local-draft.types.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.use-cases.ts`
- `domains/catalog/product-entry/application/product-entry-local-draft.test.ts`
- `docs/05-Development/Product-Entry-Local-Draft-Recovery.md`
- `docs/05-Development/Reports/Task-3.14.9-C-Final-Report.md`
- `docs/05-Development/Reports/README.md`

## Files Deleted

None for C-R1. The pre-existing Task C deletions remain preserved and reviewable.

## Files Intentionally Unchanged

- Product Aggregate, repositories, Smart Save, and Product Entry Phase 1 registry/transaction/audit/fingerprint paths.
- Phase 2 Media coordinator, source validation, status/replay routes, and Product Media Workflow.
- IndexedDB database `qsc-product-entry`, version `1`, store `product-entry-local-drafts`, primary key, and indexes.
- Payload schema version and version-zero migration.
- Seven-day Create and 24-hour Edit retention.
- Tenant identity, restore/revalidation, revision-conflict, forbidden-field, and Media reselection policies.
- React Presentation scope reserved for Task 3.14.9-D.
- Database schema/migrations, `package.json`, lockfiles, dependencies, and runtime versions.

## Architecture Changes

No architecture change. Dependency flow remains `Presentation -> Local Draft Application -> ProductEntryLocalDraftStore port -> IndexedDB adapter`. The session application service now invokes exact deletion through the existing store port for the exclusive Add New replacement flow; the controller and React layers still do not access IndexedDB directly. No database access or business policy moved into a component.

## Verification

All mandated final-state commands passed:

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed. Product Aggregate 106/106, DEV-001 45/45, Product Media 97 passed with one pre-existing Windows symlink-capability skip, and Product Entry 93/93.
- Focused Task C/C-R1 local-draft suite: 27/27 passed.
- `npm.cmd run test:integration`: passed 67/67 across 13 suites against the guarded dedicated test database. The first attempt after the power interruption found the local PostgreSQL service stopped; the existing repository service was restored and the exact command then passed. No application database migration was run.
- `npm.cmd run build`: passed; all Product Entry routes compiled.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed.
- Final `git status` and `git diff --stat` were captured without modifying Git state.

The prohibited audit, migration, dependency-install, and audit-fix commands were not run.

## Required Confirmations

- Create completion does not delete the draft.
- Create completion replay does not delete or mutate the draft.
- Create submission ID remains unchanged until explicit Add New Product.
- Only the explicit Add New session service intentionally replaces the old Create session and allocates a different ID.
- Add New, discard, Edit completion, and expiry deletion remain exact and tenant/actor scoped.
- Edit terminal deletion policy is explicit and mode restricted.
- Raw Media bytes and Reference Purchase Cost remain forbidden.
- Task C architecture, schema, retention, recovery, autosave, Product Aggregate, Phase 1, Phase 2, and Presentation boundaries remain intact.
- No Git write operation was performed.

## التأكيدات المطلوبة

- لا يؤدي اكتمال الإنشاء أو إعادة استجابة الاكتمال إلى حذف المسودة أو تغييرها.
- يبقى معرف طلب الإنشاء ثابتاً حتى إجراء «إضافة منتج جديد» الصريح.
- يملك مسار الجلسة الصريح وحده استبدال جلسة الإنشاء القديمة وتخصيص معرف مختلف.
- يبقى الحذف عند إضافة منتج جديد أو رفض المسودة أو اكتمال التعديل أو الانتهاء دقيقاً ومقيداً بالمستأجر والممثل.
- سياسة حذف التعديل النهائي صريحة ومقيدة بوضع التعديل.
- تبقى بايتات الوسائط وتكلفة الشراء المرجعية ممنوعة.
- بقيت معمارية المهمة C ومخططها واحتفاظها واستعادتها وحفظها التلقائي وحدود مجمّع المنتج والمرحلتين والعرض بلا تغيير.
- لم تُنفذ أي عملية كتابة في Git.

## Next Recommendation

Review Task 3.14.9-C and this C-R1 correction together. After approval, Task 3.14.9-D may bind the corrected headless lifecycle to the final Create/Edit Presentation, including an explicit Add New Product action and full touch, mouse, keyboard, RTL, and LTR QA.

## Git and Review Integrity

No Git write operation was performed. Nothing was staged, committed, pushed, merged, reset, restored, switched, cleaned, stashed, rebased, or deleted through Git. The intentionally dirty Task C working tree remains visible for DEV-001 review.
