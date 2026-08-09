# Task 3.14.9-D-R1 — Product Entry Media Metadata Operations, Safe Reset, Complete Localization, and Worker Failure Correction — Final Report

## Status

ReadyForReview

## Task

3.14.9-D-R1 — Product Entry Media Metadata Operations, Safe Reset, Complete Localization, and Worker Failure Correction

## Branch

`feature/product-entry-mobile-ui`

## Summary — English

Corrected all Task 3.14.9-D blocking review findings without replacing its Product Entry Presentation. Existing-image order and cover changes are now first-class, source-free `Reorder` and `SetCover` operations from Presentation derivation through Local Draft restore, canonical request fingerprinting, PostgreSQL persistence, Phase 2 coordination, and canonical Product Media Workflow mapping. Only `Add` and genuine source `Replace` operations require files.

`Add New Product` now establishes the next exact Create session before any destructive Presentation cleanup. Establishment failure preserves the current form, selected files, preview URLs, Product receipt, coordinator state, draft identity, URL, and current step, while a transition gate prevents parallel attempts. Static Product Entry Presentation copy now comes from one typed English/Arabic dictionary with RTL/LTR direction and explicit Western digits. Hash Worker runtime failures now settle all active and queued work exactly once and permanently fail the adapter without a main-thread fallback.

## الملخص — العربية

تم تصحيح جميع ملاحظات المراجعة الحاجبة للمهمة 3.14.9-D دون استبدال واجهة إدخال المنتج. أصبحت تغييرات ترتيب الصور الموجودة وتحديد الغلاف عمليتي `Reorder` و`SetCover` أصليتين لا تحتاجان إلى مصدر، بدءاً من اشتقاق العرض واستعادة المسودة المحلية، مروراً بالبصمة المعتمدة والحفظ في PostgreSQL، ووصولاً إلى تنسيق المرحلة الثانية والتحويل إلى سير وسائط المنتج الأصلي. لا تحتاج إلى الملفات إلا عمليتا `Add` و`Replace` الحقيقية للمصدر.

يبدأ زر «إضافة منتج جديد» الآن بإنشاء جلسة الإنشاء الدقيقة التالية قبل أي تنظيف في طبقة العرض. يحافظ فشل الإنشاء على النموذج والملفات المحددة وروابط المعاينة وإيصال المنتج وحالة المنسق وهوية المسودة والرابط والخطوة الحالية، ويمنع حاجز الانتقال المحاولات المتوازية. تأتي جميع النصوص الثابتة لواجهة إدخال المنتج من قاموس إنجليزي/عربي مركزي ومحدد الأنواع مع اتجاهي RTL/LTR وأرقام غربية صريحة. كما تنهي أعطال عامل البصمة جميع الأعمال النشطة والمنتظرة مرة واحدة وتجعل المحول في حالة فشل نهائية دون أي بديل للبصمة في الخيط الرئيسي.

## Blocking Findings Corrected

- Replaced the incorrect existing-image `Replace`/reselection behavior with first-class zero-file `Reorder` and `SetCover` operations.
- Extended the Product Entry media plan, command validation, Local Draft schema, persistence constraints, coordinator port, use case, and adapter consistently.
- Made metadata reversal a no-op while retaining stable operation IDs for an active change.
- Made Add New failure-safe and single-flight, with cleanup deferred until exact next-session establishment succeeds.
- Centralized the complete static Product Entry Presentation copy in typed English and Arabic dictionaries.
- Made Worker `error`, `messageerror`, and `postMessage` failure terminal for all active, queued, and future hash requests.
- Corrected the bilingual architecture guide and manual QA matrix so no Task D statement contradicts R1.

## Architecture Review

- Clean Architecture direction remains Presentation → application ports/use cases → infrastructure adapters.
- Product Entry Submission remains the Phase 1 idempotency and transaction boundary.
- Product Media Workflow remains the sole canonical authority for Media mutation.
- Local Draft remains metadata-only and does not own source bytes.
- Components do not access PostgreSQL, repositories, or IndexedDB directly.
- The existing Task D Presentation and two-phase save coordinator were preserved and corrected in place.

## Architecture Changes

No architectural boundary was changed. The approved Product Entry media operation union was widened to express the already-canonical Product Media `Reorder` and `SetCover` capabilities, and one focused Presentation transition now sequences safe Add New establishment and cleanup.

## Media Contract Review

- The Product Entry plan supports `Add`, `Replace`, `Remove`, `Reorder`, and `SetCover`.
- `Add` carries a new source and final order/cover metadata and cannot target an existing Media ID.
- Genuine source `Replace` targets existing Media and carries its source plus final order/cover metadata.
- `Remove` targets existing Media and carries no source, order, or cover metadata.
- `Reorder` targets existing Media, carries matching requested/final non-negative order, and carries no source or cover metadata.
- `SetCover` targets existing Media, requires `selectedAsCover: true`, and carries no source or order metadata.
- The plan rejects duplicate cover targets and conflicting Remove/Replace plus metadata operations for the same existing Media.

## Reorder and SetCover Review

`ProductEntryImagesService` compares current existing-image metadata with its immutable original order and cover state. Effective changes produce stable `reorderOperationId` and `setCoverOperationId` values. Returning to the original metadata removes the effective operation. Add and genuine Replace carry their final metadata directly, avoiding redundant operations. The coordinator adapter calculates the final ordered Media ID set and maps Product Entry metadata operations to the existing canonical Product Media `Reorder` and `SetCover` operations; retained resume reuses persisted canonical Reorder input.

## Phase 2 Source Requirement Review

Only `Add` and genuine source `Replace` may require multipart fields named `source:<operationId>`. `Reorder`, `SetCover`, and `Remove` reject uploaded sources. Local Draft restore marks only Add/Replace as `RequiresReselection`; metadata-only operations restore as `NotRequired`. Completed replay and retained Staging retry continue to support zero-file Phase 2 execution.

## Safe Add New Review

`ProductEntryAddNewTransition` gates the transition and calls exact next-session establishment first. The wizard performs Media registry cleanup, object URL revocation, receipt/coordinator reset, form/session replacement, URL replacement, and return to the first step only in the success callback. Rejection reports a localized stable failure and leaves all current Presentation artifacts intact. The asynchronous action is awaited; no fire-and-forget `void onAddNew()` remains.

## Localization Review

- One typed `PRODUCT_ENTRY_PRESENTATION_TEXT` dictionary provides compile-time English/Arabic key parity.
- Product Images, Commercial Details, workflow steps, navigation, progress, identity, Review, completion, recovery/conflict/exit dialogs, failures, controls, empty/loading states, and accessible labels use the centralized copy.
- Arabic rendering uses `dir="rtl"`; English uses `dir="ltr"`.
- `formatProductEntryWesternNumber` explicitly uses Latin digits for both locales.
- Server-provided catalog labels and user-entered values remain authoritative dynamic data rather than hardcoded translated business data.

## Hash Worker Failure Review

- The adapter listens for `message`, `error`, and `messageerror`.
- Worker runtime events and synchronous `postMessage` failures reject every active and queued Promise exactly once with `MEDIA_HASH_FAILED`.
- Terminal failure clears active/queued state, removes all listeners, terminates the Worker, and causes later calls to fail immediately.
- Worker construction/unavailability remains `MEDIA_HASH_UNAVAILABLE`.
- Explicit cancellation and disposal remain `MEDIA_HASH_CANCELLED`.
- There is no main-thread hashing fallback.

## Trusted Context Review

Workspace and actor identity are resolved by the trusted server context adapter. Browser forms, query parameters, multipart fields, Local Draft data, and client request bodies do not supply business authority. Production remains fail-closed until real authentication is integrated.

## Multi-Tenant Review

Submission, Product, Media plan, workflow, Local Draft, and Product reads remain Workspace-scoped. Existing composite ownership and authorization checks are unchanged. Integration tests continue to cover foreign-Workspace not-found behavior and database ownership constraints.

## Security Review

- No raw image bytes, `File`, `Blob`, `ArrayBuffer`, object URL, storage path, authentication material, or Reference Purchase Cost is serialized to IndexedDB.
- No Product request body or Media bytes are logged.
- Hashing uses native Worker Web Crypto only.
- No dependency was added or changed.
- No audit, migration-application, dependency-install, or Git write command was executed.

## Accessibility Review

The corrected copy retains explicit labels, accessible control names, visible focus, keyboard-operable Move Up/Down/Set Cover/Replace/Remove actions, `aria-live` status, dialog naming and descriptions, safe initial focus, Escape behavior, minimum touch targets, and reduced-motion-safe transitions. RTL/LTR component output is selected at the Presentation root.

## Browser and Manual QA Evidence

The approved in-app browser runtime was initialized for `http://127.0.0.1:3000/products/new`, but discovery returned `No browser is available`; the required troubleshooting inspection then returned an empty browser surface list (`[]`) on 2026-08-05. No unrelated browser driver or automation mechanism was installed or used, and no visual/touch interaction claim is made.

Automated server-rendered component tests verify actual Arabic and English Product Images and Commercial Details output, RTL/LTR contracts, Western digits, and absence of fallback English controls in the tested Arabic output. The bilingual guide retains a deterministic manual matrix for 390 × 844, 768 × 1024, and 1440 × 900 using touch, mouse, and keyboard, including metadata-only Media changes, Add New establishment failure, all Worker terminal failure classes, IndexedDB inspection, and locale switching.

## Test Results

All required checks passed before bundle generation:

| Command | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| `npx.cmd tsc --noEmit -p tsconfig.integration.json` | Passed |
| `npm.cmd run lint` | Passed |
| `npm.cmd test` | Passed, including 118 Product Entry tests |
| `npm.cmd run test:integration` | Passed, 67 tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run db:check` | Passed |
| `git diff --check` | Passed; line-ending notices are non-failing working-copy warnings |
| `git status --short` | Inspected; expected unstaged/untracked Task D and D-R1 work only |
| `git diff --stat` | Inspected |

Focused R1 coverage includes operation shapes, stable metadata derivation and reversal, Local Draft source-free restore, PostgreSQL persistence, canonical workflow mapping/resume, Add New failure preservation and single-flight behavior, actual bilingual component output, Worker `error`, `messageerror`, `postMessage` terminal failure, cancellation, disposal, and construction unavailability.

## Files Created

- `docs/05-Development/Reports/Task-3.14.9-D-R1-Final-Report.md`
- `domains/catalog/product-entry/domain/product-entry-media-plan.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.test.ts`
- `domains/catalog/product-entry/presentation/product-entry-add-new.transition.ts`
- `domains/catalog/product-entry/presentation/product-entry-i18n.ts`
- `drizzle/0006_product_entry_media_metadata_operations.sql`
- `drizzle/meta/0006_snapshot.json`

The Worker/browser adapter and Presentation test paths are new in the combined uncommitted Task D working tree and were extended rather than discarded during R1 recovery.

## Files Modified

- `app/products/new/page.tsx`
- `docs/05-Development/Mobile-Product-Entry-Two-Phase-UI.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `domains/catalog/product-entry/application/product-entry-command-validator.ts`
- `domains/catalog/product-entry/application/product-entry-local-draft.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-coordination.test.ts`
- `domains/catalog/product-entry/application/upload-product-entry-submission-media.use-case.ts`
- `domains/catalog/product-entry/components/ProductEntryCompletion.tsx`
- `domains/catalog/product-entry/components/ProductEntryExitDialog.tsx`
- `domains/catalog/product-entry/components/ProductEntryNavigation.tsx`
- `domains/catalog/product-entry/components/ProductEntryProgress.tsx`
- `domains/catalog/product-entry/components/ProductEntryStepContent.tsx`
- `domains/catalog/product-entry/components/ProductEntryWizard.tsx`
- `domains/catalog/product-entry/components/ProductEntryWizardHeader.tsx`
- `domains/catalog/product-entry/components/ProductIdentityCard.tsx`
- `domains/catalog/product-entry/components/SpecificationFieldGuidance.tsx`
- `domains/catalog/product-entry/components/steps/CategoryStep.tsx`
- `domains/catalog/product-entry/components/steps/CommercialDetailsStep.tsx`
- `domains/catalog/product-entry/components/steps/DeviceClassStep.tsx`
- `domains/catalog/product-entry/components/steps/EntryMethodStep.tsx`
- `domains/catalog/product-entry/components/steps/ProductImagesStep.tsx`
- `domains/catalog/product-entry/components/steps/ProductModelStep.tsx`
- `domains/catalog/product-entry/components/steps/ProductReviewStep.tsx`
- `domains/catalog/product-entry/components/steps/SpecificationsStep.tsx`
- `domains/catalog/product-entry/domain/product-entry-media-plan.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.schema.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.types.ts`
- `domains/catalog/product-entry/infrastructure/browser/worker-product-entry-media-hashing.adapter.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry.integration.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-presentation.test.ts`
- `domains/catalog/product-entry/ports/product-entry-media-workflow-coordinator.port.ts`
- `domains/catalog/product-entry/react/product-entry-media-adapter.tsx`
- `domains/catalog/product-entry/services/product-entry-images.service.ts`
- `drizzle/meta/_journal.json`

## Files Deleted

None.

## Files Intentionally Unchanged

- `package.json` and lockfiles: no dependency was needed.
- Product Aggregate and Product Media domain ownership: Product Media Workflow remains canonical.
- Migrations `0000` through `0005`: historical migration evidence was preserved.
- Task 3.14.9-D final report: preserved as the original review record; R1 corrections are authoritative in this separate report and the updated guide.
- Git index, refs, commits, and history: no Git write operation was performed.

## Migration Review

The inspected PostgreSQL schema used check constraints that permitted only three operation types and their original shapes, so a migration was required. `0006_product_entry_media_metadata_operations.sql` is the smallest correction: it replaces only the operation-type/shape checks to admit the five approved types and adds a partial unique index for one selected cover target per Workspace/submission. It does not change table columns, redesign the schema, or add a parallel command model. The Drizzle snapshot and journal were generated and `drizzle-kit check` passed. The migration was not applied to an application database; only the isolated integration-test migration lifecycle executed.

## Known Limitations

- Real authentication remains outside this task; Production trusted context intentionally fails closed.
- Existing Product Media read data has no approved public preview URL, so the UI retains its labeled placeholder.
- No approved Product Type reference service exists in the repository; no hardcoded catalog was invented.
- New Product Media replacement-source execution remains intentionally represented by `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED`.
- Direct visual/touch browser QA remains a reviewer action because the approved browser surface list was empty.

## Required Confirmations

- Existing-image Reorder does not require source reselection.
- Existing-image SetCover does not require source reselection.
- Only Add and Replace require source files.
- Reorder and SetCover are persisted and fingerprinted.
- Product Media Workflow remains canonical.
- Product is not rolled back by Media failure.
- Media retry does not repeat Phase 1.
- Add New cleanup occurs only after new-session success.
- Failed Add New preserves form, files, receipt, draft identity, and URL.
- All major Product Entry user-facing strings support Arabic and English.
- Arabic uses RTL and Western digits.
- Hash Worker runtime failure settles every pending Promise.
- No main-thread hashing fallback exists.
- No raw image bytes are stored in IndexedDB.
- Reference Purchase Cost remains absent.
- Workspace and actor are not accepted as browser authority.
- No unapproved dependency command was executed.
- No unapproved audit command was executed.
- No Git write operation was performed.

## التأكيدات المطلوبة

- لا تتطلب إعادة ترتيب صورة موجودة إعادة تحديد المصدر.
- لا يتطلب تعيين صورة موجودة غلافاً إعادة تحديد المصدر.
- تحتاج عمليتا Add وReplace فقط إلى ملفات مصدر.
- تُحفظ عمليتا Reorder وSetCover وتدخلان في البصمة المعتمدة.
- يبقى سير وسائط المنتج هو السلطة الأصلية.
- لا يُتراجع عن المنتج عند فشل الوسائط.
- لا تعيد محاولة الوسائط تنفيذ المرحلة الأولى.
- لا يحدث تنظيف «إضافة منتج جديد» إلا بعد نجاح الجلسة الجديدة.
- يحافظ فشل «إضافة منتج جديد» على النموذج والملفات والإيصال وهوية المسودة والرابط.
- تدعم جميع النصوص الرئيسية الموجهة للمستخدم في إدخال المنتج العربية والإنجليزية.
- تستخدم العربية اتجاه RTL وأرقاماً غربية.
- ينهي عطل عامل البصمة كل Promise منتظر.
- لا يوجد بديل للبصمة في الخيط الرئيسي.
- لا تُحفظ bytes الصور الخام في IndexedDB.
- تبقى تكلفة الشراء المرجعية غائبة.
- لا تُقبل مساحة العمل أو هوية المنفذ من المتصفح كسلطة.
- لم يُنفذ أي أمر اعتماديات غير معتمد.
- لم يُنفذ أي أمر تدقيق غير معتمد.
- لم تُنفذ أي عملية كتابة Git.

## Next Recommendation

Review the DEV-001 bundle, then run the documented touch/mouse/keyboard matrix in an approved browser surface with trusted Development context and the required local infrastructure. Do not advance to another task until this R1 is approved.

## Git and Review Integrity

- Current branch: `feature/product-entry-mobile-ui`.
- The working tree remains intentionally unstaged with the recovered Task D and D-R1 files.
- No checkout, switch, reset, clean, stash, commit, merge, rebase, push, branch deletion, staging, or other Git write operation was performed.
- No `npm audit`, `npm audit fix`, dependency installation/update, or `db:migrate` command was run.
- DEV-001 is invoked with both required audit skip flags; it captures source, manifest, diffs/statistics, verification output, test/build/database/Git evidence, browser/manual evidence, and verified SHA-256 while sanitizing evidence only.
