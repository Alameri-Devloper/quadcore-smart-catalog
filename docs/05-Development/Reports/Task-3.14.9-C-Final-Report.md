# Task 3.14.9-C — Product Entry Local Draft Recovery — Final Report

**Status:** ReadyForReview

**Task:** 3.14.9-C

**Branch:** `feature/product-entry-local-draft`

**Date:** 2026-08-04

## Summary — English

Implemented the headless Product Entry local-draft foundation for Create and Edit on browser-native IndexedDB. The implementation adds exact Workspace/actor identities, seven-day Create and 24-hour Edit retention, persistent submission identity, deterministic schema migration, explicit recovery decisions, preserving Edit revision conflicts, scoped deletion/cleanup, security filtering, Media source reselection, serialized debounced autosave, and a Presentation-facing controller. It preserves the approved transactional Phase 1 and Phase 2 boundaries.

The incompatible pre-existing `localStorage` prototype was retired because it searched for a most-recent draft rather than an exact submission/revision identity. Task 3.14.9-D remains responsible for binding the new headless contract to final Create/Edit visuals and trusted client identity. Until that binding exists, the current Product Entry page truthfully presents an unsaved-changes guard and does not claim local persistence.

## الملخص — العربية

نُفذ أساس عديم الواجهة لاستعادة مسودة إدخال المنتج محلياً في وضعي الإنشاء والتعديل باستخدام IndexedDB الأصلي في المتصفح. يشمل التنفيذ هوية دقيقة لمساحة العمل والممثل، ومدة سبعة أيام للإنشاء و24 ساعة للتعديل، وثبات معرف الطلب، وترحيلاً حتمياً للمخطط، وقرارات استعادة صريحة، وحفظ المسودة عند تعارض مراجعة التعديل، وحذفاً وتنظيفاً مقيدين، وتصفية أمنية، وإعادة اختيار مصادر الوسائط، وحفظاً تلقائياً مؤجلاً ومتسلسلاً، ومتحكماً لطبقة العرض. بقيت حدود المرحلة الأولى والثانية المعتمدة بلا تغيير.

أزيل النموذج الأولي غير المتوافق الذي استخدم `localStorage` والبحث عن أحدث مسودة بدلاً من الهوية الدقيقة. تتولى المهمة 3.14.9-D ربط العقد عديم الواجهة بالعرض النهائي وهوية العميل الموثوقة. وحتى ذلك الحين تعرض صفحة إدخال المنتج تحذير تغييرات غير محفوظة ولا تدعي نجاح الحفظ المحلي.

## Files Created

- `domains/catalog/product-entry/drafts/product-entry-local-draft.types.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.store.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.schema.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.use-cases.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.autosave.ts`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.controller.ts`
- `domains/catalog/product-entry/drafts/infrastructure/indexeddb-product-entry-local-draft.store.ts`
- `domains/catalog/product-entry/drafts/infrastructure/in-memory-product-entry-local-draft.store.ts`
- `domains/catalog/product-entry/application/product-entry-local-draft.test.ts`
- `domains/catalog/product-entry/infrastructure/indexeddb-product-entry-local-draft.test.ts`
- `docs/05-Development/Product-Entry-Local-Draft-Recovery.md`
- `docs/05-Development/Reports/Task-3.14.9-C-Final-Report.md`

## Files Modified

- `domains/catalog/product-entry/components/ProductEntryWizard.tsx`
- `domains/catalog/product-entry/components/ProductEntryExitDialog.tsx`
- `domains/catalog/product-entry/product-entry.development-config.ts`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`

## Files Deleted

- `domains/catalog/product-entry/components/ProductEntryResumeDialog.tsx`
- `domains/catalog/product-entry/drafts/product-entry-draft.entity.ts`
- `domains/catalog/product-entry/drafts/product-entry-draft.repository.interface.ts`
- `domains/catalog/product-entry/drafts/product-entry-draft.service.ts`
- `domains/catalog/product-entry/drafts/infrastructure/browser-product-entry-draft.repository.ts`

These deletions remove only the superseded unscoped `localStorage` prototype and its premature restore dialog. The final Presentation integration belongs to Task 3.14.9-D.

## Files Intentionally Unchanged

- Product Aggregate and Product repository contracts.
- Product Entry Phase 1 submission, transaction, audit, request fingerprint, routes, and PostgreSQL persistence.
- Product Entry Phase 2 Media coordination, source verification, status routes, and Product Media Workflow.
- Database schema and migration files.
- `package.json` and lockfiles.
- Existing dependencies and runtime versions.

## Architecture Review

The added dependency flow is `Presentation -> Local Draft Application -> ProductEntryLocalDraftStore port -> IndexedDB Infrastructure`. The Product Aggregate, Submission Registry, Product Media Workflow, React components, and server repositories contain no IndexedDB access. The in-memory adapter is deterministic test infrastructure. No database call was added to a component, no business rule moved into Presentation, and no architecture redesign or dependency was introduced.

## IndexedDB Schema and Upgrade Review

- Database: `qsc-product-entry`.
- Database version: `1`.
- Object store: `product-entry-local-drafts`.
- Primary key: deterministic length-prefixed exact identity encoding.
- Indexes: Workspace/actor, Workspace/actor/mode, exact Create identity, exact Edit identity, and expiration.
- Save/delete are atomic one-record read-write transactions.
- Normal lookup uses the exact primary key; cleanup uses the scoped Workspace/actor index.
- Payload schema version `1` is independent of database version.
- Version `0` migrates deterministically and changes Add/Replace sources to `RequiresReselection`.
- Future versions return `IncompatibleDraft`; malformed records return `CorruptDraft`; neither is overwritten automatically.
- Provider errors map to one sanitized storage-unavailable result.

## Create Draft Lifecycle Review

Create retention is exactly seven days from the latest successful local save. Its key includes Workspace, actor, mode, and submission ID. The initial `createdAt` is preserved, while `updatedAt` and `expiresAt` advance on save. Expired drafts are not recoverable. Create `SubmissionCompleted` preserves the exact draft and submission ID through Phase 1 success, Phase 2 completion, completed replay, retry, restore, and later saved-Product viewing. Explicit Add New Product is the only replacement-session path: it deletes the exact prior Create draft and allocates a different submission ID. Explicit user discard and scoped expiry cleanup remain approved deletion paths. Validation failure, network failure, Phase 1 retry, Phase 2 retry, Phase 1 success alone, and revision conflict preserve the draft.

## Edit Draft Lifecycle Review

Edit retention is exactly 24 hours from the latest successful local save. Its key includes Workspace, actor, mode, Product ID, and base Product revision. The first Edit submission ID is preserved on every save and retry even if a caller supplies another value for the same Edit key. The explicit terminal policy exact-deletes only the matching Edit draft on `SubmissionCompleted`; non-terminal failure, retry, Phase 1 success, and revision-conflict events preserve it. A later Edit session allocates a new submission ID.

## SubmissionId Lifecycle Review

Create and Edit session services allocate submission IDs once at session start. Autosave accepts and reuses the supplied identity and never allocates one. Recovery returns the persisted identity. Create changes the ID only after explicit Add New Product. Edit changes it only when a new session begins after completed Edit. The ID is not derived from Product ID.

## Revision Conflict Review

Edit recovery requires the caller to provide the current server Product revision. Equality returns a recoverable decision. A mismatch returns Product ID, base revision, current revision, and local update time. The draft remains stored. Revision conflicts do not auto-merge, overwrite, reload, or delete local state.

## Security and Multi-Tenant Review

Every record and operation is scoped by trusted Workspace and actor identity. Create additionally requires exact submission identity; Edit additionally requires exact Product and base-revision identity. Missing, blank, or malformed identity fails with a stable typed result. Cross-Workspace and cross-actor lookups return `NoDraft`. There is no anonymous/default identity, Product-only lookup, submission-only lookup, normal full-store scan, or global-latest lookup.

Production authentication remains pending. Task 3.14.9-D must inject Workspace/actor from a trusted client session context and must not read them from form values.

## Forbidden-Field Review

Save sanitizes into an explicit allowlisted form and Media schema. Raw `File`, `Blob`, `ArrayBuffer`, shared/buffer views, typed arrays, image bytes, and browser/filesystem data URLs are rejected. Credentials, authentication/session material, passwords, trusted-context tokens, employee WhatsApp, server stack/context, storage references, filesystem paths, and staging/final/trash keys are rejected. Unexpected provider messages do not reach Presentation.

No raw image bytes are stored. Reference Purchase Cost is not stored and is rejected if supplied. No dependency was added or updated.

## Media Descriptor Recovery Review

Only ordered operation descriptors are stored: operation identity/type, target Media ID, order, cover choice, optional expected SHA-256/byte length, file name, and MIME type. No `File`, bytes, preview/object URL, storage key, or server-completion truth is persisted. After recovery every Add/Replace source is `RequiresReselection`; Remove remains `NotRequired`. Accepted/completed Media state must come from the Phase 2 status path.

## Autosave Concurrency Review

The coordinator uses a configurable debounce, coalesces rapid changes, and serializes writes per exact draft identity. A newer generation either supersedes a queued stale generation or runs after an already-started write, preventing the older operation from completing after the newer write. Different identities use independent chains. Explicit flush is available before Phase 1, navigation, and visibility-hidden transitions. The visibility listener is detachable; disposal cancels scheduled work and prevents a new save from starting after disposal.

## Revalidation and Presentation Review

Recovery never silently applies form state. It returns `requiresExplicitAcceptance: true`; acceptance produces `revalidationRequired: true`. Task 3.14.9-D must revalidate Department/Category ownership, Brand, Product Type, Device Class, currency, permissions, publication rules, current Product revision, Media descriptors, forbidden-field absence, and trusted Workspace/actor before submission. Stable codes contain no translated UI strings. RTL Arabic/LTR English translation, focus order, mirrored layout, and directional icons remain Presentation responsibilities.

## Test Results

All required automated commands completed successfully before review packaging:

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed; existing aggregate, review-tool, Product Media, and Product Entry suites passed, with the one documented Windows symlink-capability skip.
- Focused Task C and C-R1 tests: 27 passed, 0 failed, 0 skipped.
- `npm.cmd run test:integration`: 67 passed, 0 failed, 0 skipped.
- `npm.cmd run build`: passed; `/products/new` and all Product Entry routes compiled.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed.

The production build was served locally and became ready. Automated mouse, keyboard/Escape, and viewport execution could not run because the in-app browser runtime exposed no browser surface in this session. No unrelated browser driver was substituted. The changed guard retains a focused Continue Editing button, Escape handling, 48-pixel minimum controls, and mobile-bottom/desktop-centered responsive classes; Task 3.14.9-D still owns final functional UI QA.

## Known Limitations

- Final Product Entry Create/Edit binding and restore/conflict visuals are intentionally deferred to Task 3.14.9-D.
- The current Product Entry page does not claim local save/recovery until that trusted binding exists.
- Production authentication and the final trusted client identity adapter remain pending.
- IndexedDB is browser-local and can be unavailable or cleared by browser/user policy.
- No real-browser surface was available for automated functional interaction QA in this session.
- No cross-device sync, server-side draft, background Worker, Service Worker, scheduler, offline submission, Media picker, or hashing Worker is implemented.

## Architecture Changes

Added one Clean Architecture local-draft slice and retired the incompatible development-only `localStorage` slice. No Product, Submission, Media, persistence, route, database, or dependency architecture changed.

## Next Recommendation

Proceed to Task 3.14.9-D. Bind `ProductEntryLocalDraftController` to the final Create/Edit Presentation using trusted Workspace/actor identity and an explicit persisted/route-resolved submission ID. Implement translated explicit restore/discard/conflict decisions, revalidation feedback, Add New Product behavior, Media reselection, pre-navigation/Phase-1 flush, and full touch/mouse/keyboard RTL/LTR browser QA.

## Git and Review Integrity

No Git write operation was performed. Nothing was staged, committed, pushed, merged, reset, switched, cleaned, stashed, rebased, or deleted through Git. The working tree remains intentionally reviewable with source additions, modifications, and deletions visible to DEV-001.
