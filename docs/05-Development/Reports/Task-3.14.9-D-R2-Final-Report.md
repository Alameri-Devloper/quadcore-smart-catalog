# Task 3.14.9-D-R2 — Deterministic Media Ordering, Dependency-Safe Resume, Persisted Add-New Safety, and Localization Completion — Final Report

## Status

ReadyForReview

## Task

3.14.9-D-R2 — Deterministic Media Ordering, Dependency-Safe Resume, Persisted Add-New Safety, and Localization Completion

## Branch

`feature/product-entry-mobile-ui`

## Summary — English

All four D-R1 blocking findings were corrected without redesigning Product Entry, Product Media, Local Draft, or Presentation. Product Entry now reconstructs the complete final Media set with exact slots and stable server/Add order, rejecting malformed plans instead of using a sentinel for unchanged Media. Product Media metadata waits for source/storage mutations and automatically resumes after a successful source retry or retained-Staging publication.

The persisted Add New transition now allocates and validates a different Create submission ID before exact-deleting the old draft. Every allocation, candidate-validation, unchanged-ID, or deletion failure preserves recoverable persisted state and the active React session. Reference-data state stores typed codes, and actual English/Arabic component output resolves every corrected failure and major accessibility label through the typed Presentation dictionary.

## الملخص — العربية

تم تصحيح الملاحظات الحاجبة الأربع في D-R1 دون إعادة تصميم إدخال المنتج أو وسائط المنتج أو المسودة المحلية أو العرض. يعيد إدخال المنتج الآن بناء مجموعة الوسائط النهائية كاملة بخانات دقيقة وترتيب مستقر من الخادم وخطة Add، ويرفض الخطط غير الصالحة بدلاً من استخدام قيمة رمزية للوسائط غير المتغيرة. تنتظر عمليات البيانات الوصفية لوسائط المنتج عمليات المصدر والتخزين، ثم تُستأنف تلقائياً بعد نجاح إعادة محاولة المصدر أو نشر Staging المحفوظ.

يخصص انتقال «إضافة منتج جديد» الآن معرف طلب إنشاء مختلفاً ويتحقق منه قبل حذف المسودة القديمة الدقيقة. يحافظ فشل التخصيص أو التحقق من المرشح أو تكرار المعرف أو الحذف على المسودة القابلة للاستعادة وعلى جلسة React النشطة. تخزن حالة البيانات المرجعية رموزاً محددة الأنواع، ويحل العرض الفعلي الإنجليزي والعربي جميع حالات الفشل المصححة وتسميات إتاحة الوصول الأساسية من قاموس العرض المحدد الأنواع.

## Blocking Findings Corrected

- Replaced unchanged-Media sentinel ordering with complete deterministic final-set reconstruction.
- Added typed rejection for duplicate IDs/positions, unknown IDs, out-of-range positions, and final-set mismatch.
- Prevented `Reorder` and `SetCover` from executing before required Add/Replace/Remove operations complete.
- Automatically resumes eligible pending metadata after source retry or retained-Staging completion.
- Changed Add New from delete-before-allocation to allocate, validate, compare, then exact-delete.
- Replaced nullable Add New establishment with stable typed success/failure results.
- Removed known English reference-data messages from React state and the hardcoded Product Review accessibility label.
- Added actual bilingual component-output and curated source-regression coverage.

## Architecture Review

- The independent Product Aggregate, Product Entry Submission, Product Media Workflow, Product Entry Local Draft, and Product Entry Presentation boundaries remain intact.
- Dependency direction remains React Presentation → Presentation services/coordinator → Application ports/use cases → infrastructure adapters.
- Product Media Workflow remains the only canonical authority that mutates Product Media.
- Final-order reconstruction is a focused Product Entry Application function consumed by the coordinator adapter.
- Metadata eligibility and retry sequencing remain in Product Media Application logic.
- Local Draft persistence sequencing remains in the Local Draft use-case service; React only consumes typed outcomes.
- Components do not access repositories, PostgreSQL, or IndexedDB directly, and Route Handlers remain thin.

## Architecture Changes

No approved boundary changed. R2 adds one focused immutable final-order resolver, one Product Media Application eligibility decision, and a typed Add New session-result contract inside their existing layers.

## Final Media Order Review

- The final set is derived from current existing Media minus Remove targets plus Add operation IDs; Replace preserves its target Media ID.
- A fixed-size slot array receives every explicit requested position.
- Empty slots are filled first by stable current-server order and then by deterministic Add plan order.
- The resolver confirms that every final Media ID appears exactly once and returns an immutable list.
- `[A, B, C] → [A, C, B]`, `[C, A, B]`, removal, removal plus move, Add at the end or between existing Media, multiple explicit gaps, reversal/no-op, deterministic replay, and immutability are covered.
- Duplicate Media IDs, unknown IDs, duplicate requested positions, out-of-range positions, and final-set mismatch are typed validation failures.
- No `Number.MAX_SAFE_INTEGER` or comparable Media-order sentinel remains.

## Metadata Dependency Review

`resolveProductMediaMetadataExecutionEligibility` classifies pending metadata as `Ready`, `WaitingForDependencies`, or `BlockedByTerminalFailure`. Pending, Staged, InProgress, or retryable-failed Add/Replace/Remove operations cause metadata to wait. SourceUnavailable requiring a new source, ReconciliationRequired, Cancelled, or non-retryable failure blocks metadata without misreporting an independent validation failure. Blocking IDs are stable plan order and immutable.

Waiting or blocked `Reorder`/`SetCover` operations remain Pending: attempt count and last-attempt time do not change and no error code is fabricated. Workflow status is partial while terminally incomplete source dependencies block pending metadata; reconciliation retains its existing priority.

## Retry and Resume Review

- Initial execution evaluates metadata only after the source/storage loops.
- Successful Add, Replace, Remove, or retained-Staging retry invokes the same pending-metadata executor immediately.
- Retryable Add plus Reorder and Add plus SetCover complete in one Phase 2 retry after the source succeeds.
- Retryable Remove/Replace plus Reorder complete after their source mutation succeeds.
- Completed replay performs no duplicate source or metadata mutation.
- Media retry preserves the submission and Product receipt and never repeats Phase 1 Product Smart Save.
- Product success remains independent and is never rolled back by Media partial completion or failure.

## Persisted Add New Review

`startNewProduct` validates the current Create identity, allocates a candidate, validates it, confirms it differs, and only then exact-deletes the old scoped draft. It returns `Started` or a stable `Rejected` code: `IdentityInvalid`, `SubmissionIdAllocationFailed`, `SubmissionIdInvalid`, `SubmissionIdUnchanged`, or `StorageUnavailable`.

Store-level tests prove that allocation throw, invalid candidate, unchanged candidate, and deletion failure preserve the old recoverable draft. Success deletes only the exact Workspace/actor/mode/submission record and returns the new identity. The controller and Presentation transition clear in-memory/React state only after `Started`; single-flight behavior remains intact.

## Localization Review

- React state uses `ProductEntryReferenceDataLoadErrorCode`, never localized English failure strings.
- Device types, Product models, specification fields, and Product classifications failures resolve through the typed English/Arabic dictionary.
- Product Review status now uses the localized `productReviewStatus` accessibility key.
- Server-rendered tests exercise each actual failure component in both locales, require Arabic output without its English message, and require English output.
- The typed dictionary preserves compile-time key parity.
- A curated source scan checks the known corrected user-facing English phrases without rejecting imports, types, codes, tests, identifiers, or the dictionary itself.

## Trusted Context Review

Workspace and actor authority continue to come only from trusted server context. Product JSON, form fields, query parameters, multipart fields, hidden inputs, Local Storage, and IndexedDB do not provide business authority. Production remains fail-closed until approved authentication is integrated.

## Multi-Tenant Review

Product, Submission, Media Plan, Media Workflow, and Product reads remain Workspace-scoped. Local Draft identity remains Workspace/actor/mode/submission scoped. Exact Add New deletion cannot affect another Workspace, actor, mode, or submission, and the integration suite continues to cover foreign-Workspace not-found and database ownership behavior.

## Security Review

- Only Add and genuine source Replace require files.
- Local Draft persistence contains no `File`, `Blob`, `ArrayBuffer`, raw bytes, object URL, filesystem path, authentication material, or storage key.
- Reference Purchase Cost remains absent.
- No Product request body or Media bytes are logged.
- No dependency was added or changed.
- No audit, dependency install/update, application migration, or Git write command was executed.

## Accessibility Review

Actual English and Arabic SSR output covers Product Review status, Media controls, Product Entry progress, Exit, revision-conflict, and Local Draft recovery surfaces. RTL Arabic, LTR English, Western digits in Arabic, native labels, keyboard controls, dialog naming/descriptions, safe focus behavior, `aria-live`, visible focus, touch targets, and reduced-motion behavior remain preserved.

## Browser and Manual QA Evidence

The approved in-app browser runtime was initialized for `http://127.0.0.1:3000/products/new`, but selection returned `No browser is available`. The required bootstrap troubleshooting inspection was read, after which the single permitted browser-surface listing returned exactly `[]` on 2026-08-06. No alternate browser driver was installed or used, and no direct visual, touch, overflow, or viewport result is fabricated.

Automated service, adapter, Local Draft, retry, and real component SSR tests cover the deterministic behavior available without a browser surface. The bilingual guide contains the required 390 × 844, 768 × 1024, and 1440 × 900 manual matrix for RTL/LTR, reference failures, accessibility labels, existing/Add/remove ordering, source retry with automatic metadata completion, SetCover dependency, all Add New failure/success paths, overflow, touch, mouse, and keyboard.

## Test Results

All required checks passed on the final pre-bundle implementation state:

| Command | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| `npx.cmd tsc --noEmit -p tsconfig.integration.json` | Passed |
| `npm.cmd run lint` | Passed |
| `npm.cmd test` | Passed: Product Aggregate 106/106; DEV-001 45/45; Product Media 103 passed with one existing platform skip; Product Entry 129/129 |
| `npm.cmd run test:integration` | Passed: 67/67 |
| `npm.cmd run build` | Passed; Next.js production build generated all Product Entry routes |
| `npm.cmd run db:check` | Passed: `Everything's fine` |
| `git diff --check` | Passed; LF-to-CRLF notices are non-failing working-copy warnings |
| `git status --short` | Inspected; expected unstaged/untracked recovered Task D, D-R1, and R2 work only |
| `git diff --stat` | Inspected |

Focused correction coverage includes complete final-order reconstruction and invalid plans; retryable Add/Remove/Replace dependencies; retained Staging; SetCover dependency; terminal source unavailability; replay; Add New store preservation for every failure; bilingual failure components and accessibility labels; and the curated literal scan.

## Files Created

- `domains/catalog/product-entry/application/resolve-product-entry-final-media-order.ts`
- `domains/catalog/product-entry/application/resolve-product-entry-final-media-order.test.ts`
- `docs/05-Development/Reports/Task-3.14.9-D-R2-Final-Report.md`

## Files Modified

- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.test.ts`
- `domains/catalog/media/domain/product-media-workflow.ts`
- `domains/catalog/media/services/product-media-workflow.ts`
- `domains/catalog/media/services/product-media-workflow.test.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.types.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.use-cases.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.controller.ts`
- `domains/catalog/product-entry/application/product-entry-local-draft.test.ts`
- `domains/catalog/product-entry/presentation/product-entry-add-new.transition.ts`
- `domains/catalog/product-entry/presentation/product-entry-presentation.types.ts`
- `domains/catalog/product-entry/presentation/product-entry-i18n.ts`
- `domains/catalog/product-entry/components/ProductEntryWizard.tsx`
- `domains/catalog/product-entry/components/steps/ProductReviewStep.tsx`
- `domains/catalog/product-entry/infrastructure/product-entry-presentation.test.ts`
- `docs/05-Development/Mobile-Product-Entry-Two-Phase-UI.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`

The working tree also contains preserved, correct uncommitted Task D and D-R1 files documented by their existing reports; R2 recovery did not discard or recreate them.

## Files Deleted

None.

## Files Intentionally Unchanged

- `drizzle/0006_product_entry_media_metadata_operations.sql` and `drizzle/meta/0006_snapshot.json`: preserved exactly as D-R1 migration evidence.
- `package.json` and lockfiles: no dependency was required.
- Historical migrations `0000` through `0005`: untouched.
- Task D and D-R1 final reports: retained as their original review records; this R2 report and the updated guide are the latest correction authority.
- Git index, refs, commits, branch topology, and history: untouched.

## Migration Review

No schema change is required for deterministic in-memory ordering, Application metadata eligibility, typed Local Draft sequencing, or Presentation localization. No `0007` migration, table, enum, or persistence column was added. Existing migration `0006` was not modified. No application database migration command was run; only the existing guarded integration-test lifecycle applied migrations to its isolated test database.

## Known Limitations

- Direct visual/touch browser QA remains a reviewer action because the approved browser surface list was empty.
- Real authentication remains outside this task; Production trusted context intentionally fails closed.
- Existing Product Media read data has no approved public preview URL, so existing server Media retain a labeled placeholder.
- No approved Product Type reference service exists; no hardcoded reference catalog was introduced.
- New Product Media replacement-source execution remains intentionally represented by `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED`.

## Required Confirmations

- Final Media order is reconstructed from the complete final Media set.
- Unchanged Media retain stable relative order.
- No `MAX_SAFE_INTEGER` ordering sentinel remains.
- Invalid or conflicting positions are rejected.
- Metadata operations wait for incomplete source dependencies.
- Retrying a source operation automatically resumes eligible metadata.
- A failed Add cannot permanently invalidate dependent Reorder or SetCover.
- Media retry does not repeat Phase 1.
- Product is not rolled back by Media failure.
- Add New allocates and validates the next identity before deleting the old draft.
- Allocation failure preserves the old persisted draft.
- Deletion failure preserves the old persisted draft.
- Failed Add New preserves React and persisted state.
- All Product Entry loading failures support Arabic and English.
- All major accessibility labels support Arabic and English.
- Arabic uses RTL and Western digits.
- Only Add and Replace require source files.
- No raw image bytes are stored in IndexedDB.
- Reference Purchase Cost remains absent.
- Workspace and actor are not accepted as browser authority.
- No unapproved migration was added.
- No dependency or audit command was executed.
- No Git write operation was performed.

## التأكيدات المطلوبة

- يُعاد بناء ترتيب الوسائط النهائي من مجموعة الوسائط النهائية الكاملة.
- تحافظ الوسائط غير المتغيرة على ترتيبها النسبي المستقر.
- لا توجد قيمة `MAX_SAFE_INTEGER` رمزية لترتيب الوسائط.
- تُرفض المواضع غير الصالحة أو المتعارضة.
- تنتظر عمليات البيانات الوصفية اعتماديات المصدر غير المكتملة.
- تستأنف إعادة محاولة المصدر عمليات البيانات الوصفية المؤهلة تلقائياً.
- لا يستطيع فشل Add إفساد Reorder أو SetCover المعتمدتين عليها بصورة دائمة.
- لا تعيد محاولة الوسائط تنفيذ المرحلة الأولى.
- لا يُتراجع عن المنتج عند فشل الوسائط.
- يخصص «إضافة منتج جديد» الهوية التالية ويتحقق منها قبل حذف المسودة القديمة.
- يحافظ فشل التخصيص على المسودة القديمة المحفوظة.
- يحافظ فشل الحذف على المسودة القديمة المحفوظة.
- يحافظ فشل «إضافة منتج جديد» على حالة React والحالة المحفوظة.
- تدعم جميع حالات فشل تحميل إدخال المنتج العربية والإنجليزية.
- تدعم جميع تسميات إتاحة الوصول الأساسية العربية والإنجليزية.
- تستخدم العربية RTL وأرقاماً غربية.
- تحتاج عمليتا Add وReplace فقط إلى ملفات المصدر.
- لا تُحفظ bytes الصور الخام في IndexedDB.
- تبقى تكلفة الشراء المرجعية غائبة.
- لا تُقبل مساحة العمل أو هوية المنفذ من المتصفح كسلطة.
- لم يُضف أي ترحيل غير معتمد.
- لم يُنفذ أي أمر اعتماديات أو تدقيق.
- لم تُنفذ أي عملية كتابة Git.

## Next Recommendation

Review the DEV-001 bundle and run the documented touch/mouse/keyboard matrix in an approved browser surface. Do not begin Task 3.15.1-A or Product Media new-source replacement until D-R2 is independently approved and merged.

## Git and Review Integrity

- Current branch: `feature/product-entry-mobile-ui`.
- The working tree remains intentionally unstaged with preserved Task D, D-R1, migration `0006`, and R2 work.
- No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, branch deletion, or other Git write operation was performed.
- No `npm audit`, `npm audit fix`, dependency installation/update, or `db:migrate` command was run.
- DEV-001 uses both required audit skip flags and publishes `QSC-Task-3.14.9-D-R2-Final-Report.md`, `QSC-Task-3.14.9-D-R2-Review.zip`, and `QSC-Task-3.14.9-D-R2-Review.zip.sha256` atomically with sanitized evidence and verified hashes.
