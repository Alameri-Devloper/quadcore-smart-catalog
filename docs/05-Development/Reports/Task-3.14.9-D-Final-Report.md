# Task 3.14.9-D — Mobile Product Entry UI and Two-Phase Save Integration — Final Report

**Status:** ReadyForReview

**Task:** 3.14.9-D

**Branch:** `feature/product-entry-mobile-ui`

**Date:** 2026-08-05

## Summary — English

Implemented the final Mobile-First Product Entry Presentation for Create and Edit while preserving the approved Product Aggregate, Product Entry Submission, Product Media Workflow, Local Draft, and Presentation boundaries. The existing `ProductEntryWizard` now binds trusted context, Workspace-scoped Product read, explicit draft recovery/conflict decisions, serialized autosave, native worker hashing, Phase 1 Product save, durable Phase 2 status/upload, separate Product/Media outcomes, RTL/LTR direction, accessible dialogs, and explicit Add New Product lifecycle.

Create retains one submission ID across refresh, autosave, restore, Product retry, Media retry, and completed replay. Product success never clears the form or Create draft. Media retry never repeats normal Product Smart Save. Add New Product exact-deletes the prior Create draft, revokes previews, clears selected files, allocates a different submission ID, resets the form, and returns to the first step.

## الملخص — العربية

تم تنفيذ واجهة إدخال المنتج النهائية والمصممة للجوال في وضعي الإنشاء والتعديل مع الحفاظ على استقلال تجميع المنتج وسجل طلب الإدخال وسير وسائط المنتج والمسودة المحلية والعرض. يربط معالج `ProductEntryWizard` الحالي السياق الموثوق وقراءة المنتج المقيدة بمساحة العمل وقرارات استعادة المسودة والتعارض والحفظ التلقائي المتسلسل وعامل البصمة الأصلي وحفظ المنتج في المرحلة الأولى وحالة ورفع الوسائط في المرحلة الثانية والنتائج المنفصلة واتجاهي RTL/LTR ومربعات الحوار المتاحة ودورة «إضافة منتج جديد» الصريحة.

يحتفظ الإنشاء بمعرف طلب واحد عبر تحديث الصفحة والحفظ التلقائي والاستعادة وإعادة محاولة المنتج والوسائط وإعادة تشغيل الاكتمال. لا يمسح نجاح المنتج النموذج أو مسودة الإنشاء، ولا تعيد محاولة الوسائط تنفيذ Smart Save للمنتج. يحذف «إضافة منتج جديد» المسودة القديمة الدقيقة ويلغي روابط المعاينة ويمسح الملفات المحددة وينشئ معرفاً مختلفاً ويعيد النموذج إلى الخطوة الأولى.

## Architecture Review

- Dependency direction remains React Presentation → Presentation coordinator/clients → existing Phase 1, Phase 2, Local Draft, hashing, and Product-read ports/adapters.
- The Product Aggregate, Product Entry Submission, Product Media Workflow, Product Entry Local Draft, and Product Entry Presentation remain independent.
- Components do not call repositories, PostgreSQL, Product Media repositories, or IndexedDB directly.
- New route handlers are thin: trusted context is resolved server-side and the Product read route delegates to an Application use case and Unit of Work.
- Product Smart Save remains server-only and Product Media Workflow remains the canonical Media mutation authority.
- No database migration, second Media command model, dependency, inventory model, branch pricing, or Reference Purchase Cost was added.

## Mobile Layout Review

- Mobile is single-column with a sticky safe action area, compact four-column step grid, no intentional horizontal scrolling, and 44–48 pixel controls.
- Tablet and desktop progressively use multi-column content and the existing Product identity side panel.
- Media ordering uses explicit touch/keyboard-friendly Move Up and Move Down controls rather than drag-only interaction.
- Dialogs are bottom-aligned on narrow viewports, bounded by the dynamic viewport, scroll internally, and center on larger screens.
- Reduced-motion-safe progress transitions and visible focus styling are retained.

## Create Flow Review

- `/products/new` starts or resumes one Create session and preserves its non-authoritative submission ID in the URL.
- Trusted Workspace and actor are never read from the URL.
- Create completion keeps the Product form visible and preserves the exact Create draft.
- No-Media submission skips Phase 2.
- Add New Product is available only after Product success and performs the exact approved reset sequence.

## Edit Flow Review

- `/products/[productId]/edit` reads the Workspace-scoped Product through `GetProductEntryProductUseCase` and maps Product revision, classification, commercial data, specifications, and existing Media identifiers into the canonical form.
- Edit identity uses Product ID and base Product revision.
- Explicit conflict discard re-reads current Product truth and starts a fresh Edit submission; no silent reload or merge occurs.
- A terminal fully completed Edit removes only its exact Edit draft using the approved `EditSessionCompleted` reason.

## Local Draft Integration Review

- `ProductEntryLocalDraftController` is the only UI-facing draft controller.
- Autosave is debounced, serial, stale-write safe, and reports Saving/Saved/Unavailable independently of Product state.
- Draft work flushes before Phase 1, explicit navigation, and document visibility becoming hidden.
- Restore, Discard, and Continue Without Restore are explicit. Restore marks revalidation required and Add/Replace descriptors require source reselection.
- Cross-Workspace and cross-actor draft isolation remains enforced by the approved keys/store and existing tests.

## Submission ID Lifecycle Review

- Create allocates or resolves one ID at session start; rerender does not allocate another.
- Autosave and both save phases consume the exact identity supplied by the session.
- Uncertain Phase 1 retry reuses the same command ID.
- Phase 2 retry uses the saved receipt and does not call Phase 1.
- Completed replay retains the ID and form.
- Add New Product exact-deletes the old session and requires a different ID before reset.
- Edit restoration adopts the persisted Edit submission ID when explicitly accepted.

## Two-Phase Save and Product/Media Outcome Separation

- Save flushes Local Draft, validates the complete workflow and Media readiness, builds the exact approved Phase 1 command, and records server Product ID/revision/lifecycle truth.
- Phase 2 first reads durable status and uploads only `requiredSourceOperationIds` with exact multipart names `source:<operationId>`.
- Completed replay and retained Staging retry support zero-file continuation.
- Product success is retained when Media is partial, retryable, rejected, or requires reselection.
- Product is not rolled back by Media failure.
- UI states separately report Product failure/Media not started, Product saved/Media uploading, partial, retry, reselection, no-Media completion, and full completion.

## Media Hashing Worker Review

- A dedicated browser Worker uses native `crypto.subtle.digest("SHA-256", ...)`.
- Results contain stable operation ID, lowercase hexadecimal SHA-256, and byte length.
- Concurrency is bounded to two for mobile devices.
- Request IDs, latest-operation tracking, cancellation, registry file identity, and disposal prevent stale results from replacing a newer file.
- Unsupported Worker/Web Crypto returns typed failure; there is no insecure main-thread hash fallback and no hashing dependency.
- Worker bootstrap object URLs are revoked immediately; selected Media preview URLs are revoked on replace/remove/disposal/Add New.

## Media Operation Review

- Multiple Add, existing/pending Replace, existing/pending Remove, deterministic ordering, and one cover are supported.
- Existing Media IDs remain separate from local stable operation IDs.
- The approved Phase 1 plan contains Add/Replace/Remove. Reorder and Set Cover use its approved `finalOrder`, `requestedDisplayOrder`, and `selectedAsCover` fields; changing existing server Media is therefore represented by approved Replace and requires reselection. No second Media model was introduced.
- Descriptors are serializable metadata only. File objects, bytes, and object URLs never enter Local Draft payloads.

## Retry and Resume Review

- Phase 1 transport retry keeps the same logical submission ID.
- Retry Media uses only Phase 2.
- Completed Media status short-circuits without asking for files or uploading.
- Retained Staging with no required sources posts an exact zero-file resume.
- Required sources are matched by exact operation ID and only those sources are uploaded.
- Resumed sources are rehashed and mismatching hash/length is rejected locally before upload.
- `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED` is preserved as a stable partial outcome without an invented workaround.

## Revision Conflict Review

- Local Draft base revision mismatch shows base/current revisions, preserves the draft, and does not expose an invalid restore action.
- Phase 1 expected revision mismatch preserves visible local state and offers Continue Reviewing, explicit discard/reload, or Cancel.
- No automatic merge, overwrite, or form reset is implemented.

## Trusted Context and Multi-Tenant Review

- Workspace and actor never come from form values, query parameters, hidden fields, Local Storage, Product JSON, or multipart fields.
- The client context endpoint is Development/Test-only and resolves the same trusted server identity; Production remains fail-closed.
- Product read, Phase 1, Phase 2 status, and Phase 2 upload all resolve trusted server context.
- Local Draft identity uses only injected trusted Workspace/actor.
- Browser adapter tests prove Product business requests omit Workspace/actor authority.

## Security Review

- No authentication/session token, password, trusted-context secret, storage/staging/final/trash key, filesystem path, raw server exception, Media byte log, or Product body log was introduced.
- No raw image bytes are stored in IndexedDB.
- Reference Purchase Cost is absent from form, command, persistence, documentation payload, and tests.
- Server authorization, Product validation, source hash recomputation, content signature inspection, size/dimension limits, and Product Media Workflow remain authoritative.

## RTL/LTR Review

- Trusted locale defaults to English or Arabic and the Presentation offers an in-session override.
- Root `dir` changes to `rtl` for Arabic and `ltr` for English without locale-prefixed routes.
- Core lifecycle, navigation, status, recovery, conflict, and header controls have Arabic/English Presentation text.
- Arabic numeric formatting explicitly selects Latin digits (`ar-u-nu-latn`); automated tests verify Western digits.

## Accessibility Review

- Save progress and important outcomes use live regions and non-color text.
- Dialogs use modal semantics, labelled title/description, safe initial focus, and explicit Escape behavior.
- Native labels, radios, inputs, buttons with explicit type, progress bars, error descriptions, visible focus, contextual Media action labels, and keyboard navigation are retained.
- Media remains fully operable without drag-and-drop.
- Invalid full-form save navigates to the invalid step and focuses the first invalid/error target when available.

## Browser and Manual QA Evidence

The required browser skill/runtime was initialized against `http://127.0.0.1:3000/products/new`. Browser selection returned `No browser is available`. The prescribed troubleshooting documentation was followed once; read-only discovery returned an exact empty list (`[]`). No unrelated browser driver was installed or substituted, and no visual/touch claim is fabricated.

The bilingual implementation guide contains a deterministic manual checklist for 390×844, 768×1024, and 1440×900; touch, mouse, keyboard/Escape, restore/conflict/exit dialogs, Media ordering, autosave/refresh, two-phase retry, Add New, RTL, LTR, and IndexedDB inspection are included. Automated interaction/state contracts passed; direct visual and touch QA remains a reviewer action.

## Test Results

All required final-state commands passed:

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed with no warnings.
- `npm.cmd test`: passed. Product Aggregate 106/106; DEV-001 45/45; Product Media 97 passed with the unchanged one Windows symlink/junction capability skip; Product Entry 105/105, including 12 new Presentation/Media/client tests.
- `npm.cmd run test:integration`: passed 67/67 across 13 suites against the guarded dedicated PostgreSQL test database.
- `npm.cmd run build`: passed. Next.js compiled the Create/Edit pages and trusted context, Phase 1, Phase 2, and Product-read routes.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed.
- Final `git status` and `git diff --stat` were captured without changing Git state.

The final ReadyForReview DEV-001 invocation explicitly skipped both optional audit commands. During recovery, an earlier wrapper timed out while its child process continued and ran DEV-001's optional read-only audit checks before the omission of the required skip flags was detected. That invocation produced a `VerificationFailed` artifact because of one untracked-document trailing space; its evidence is preserved separately. No audit fix, database migration, dependency install, or dependency update command was run.

## Files Created

- `app/api/catalog/product-entry-client-context/route.ts`
- `app/api/catalog/products/[productId]/product-entry/route.ts`
- `app/products/[productId]/edit/page.tsx`
- `docs/05-Development/Mobile-Product-Entry-Two-Phase-UI.md`
- `docs/05-Development/Reports/Task-3.14.9-D-Final-Report.md`
- `domains/catalog/product-entry/application/get-product-entry-product.use-case.ts`
- `domains/catalog/product-entry/components/ProductEntryRecoveryDialog.tsx`
- `domains/catalog/product-entry/components/ProductEntryRevisionConflictDialog.tsx`
- `domains/catalog/product-entry/drafts/infrastructure/browser-product-entry-local-draft.factory.ts`
- `domains/catalog/product-entry/infrastructure/browser/http-product-entry-clients.ts`
- `domains/catalog/product-entry/infrastructure/browser/product-entry-media-file.registry.ts`
- `domains/catalog/product-entry/infrastructure/browser/product-entry-media-hash-worker.messages.ts`
- `domains/catalog/product-entry/infrastructure/browser/product-entry-media-hash.ts`
- `domains/catalog/product-entry/infrastructure/browser/product-entry-media-hash.worker.ts`
- `domains/catalog/product-entry/infrastructure/browser/worker-product-entry-media-hashing.adapter.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-presentation.test.ts`
- `domains/catalog/product-entry/presentation/product-entry-i18n.ts`
- `domains/catalog/product-entry/presentation/product-entry-media-hashing.port.ts`
- `domains/catalog/product-entry/presentation/product-entry-presentation.mapper.ts`
- `domains/catalog/product-entry/presentation/product-entry-presentation.reducer.ts`
- `domains/catalog/product-entry/presentation/product-entry-presentation.types.ts`
- `domains/catalog/product-entry/presentation/product-entry-save.coordinator.ts`
- `domains/catalog/product-entry/react/product-entry-media-adapter.tsx`

## Files Modified

- `app/products/new/page.tsx`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- `domains/catalog/product-entry/components/ProductEntryExitDialog.tsx`
- `domains/catalog/product-entry/components/ProductEntryNavigation.tsx`
- `domains/catalog/product-entry/components/ProductEntryProgress.tsx`
- `domains/catalog/product-entry/components/ProductEntryStepContent.tsx`
- `domains/catalog/product-entry/components/ProductEntryWizard.tsx`
- `domains/catalog/product-entry/components/ProductEntryWizardHeader.tsx`
- `domains/catalog/product-entry/components/steps/CommercialDetailsStep.tsx`
- `domains/catalog/product-entry/components/steps/ProductImagesStep.tsx`
- `domains/catalog/product-entry/drafts/product-entry-local-draft.controller.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-server-runtime.ts`
- `domains/catalog/product-entry/product-entry-commercial-options.ts`
- `domains/catalog/product-entry/product-entry.development-config.ts`
- `domains/catalog/product-entry/product-entry.reconciliation.ts`
- `domains/catalog/product-entry/product-entry.types.ts`
- `domains/catalog/product-entry/product-entry.validation.ts`
- `domains/catalog/product-entry/services/product-entry-identity.service.ts`
- `domains/catalog/product-entry/services/product-entry-images.service.ts`
- `domains/catalog/product-entry/services/product-entry-review.service.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- Product Aggregate behavior, Smart Save service, repositories, Product Entry Phase 1 transaction/idempotency/audit/fingerprint contracts.
- Product Entry Phase 2 server source requirements, verifier, coordinator, and multipart endpoint contract.
- Product Media Aggregate/workflow/repositories/storage and canonical Media mutation authority.
- Local Draft IndexedDB database name/version/store/indexes, schema version, retention, security filter, and version-zero migration.
- Database schema and migrations.
- `package.json`, lockfiles, dependency/runtime versions, and audit state.
- Real authentication provider, Product Media replacement-source use case, server-side drafts, cross-device sync, offline submission, Service Worker, scheduler, WhatsApp, and public Product pages.

## Architecture Changes

No architecture redesign. Task D fills the already reserved Product Entry Presentation boundary with a reducer/coordinator and focused browser infrastructure, and adds one Workspace-scoped Product-read Application use case plus thin routes. Existing dependency direction and ownership rules remain intact.

## Known Limitations

- Production authentication is pending and Product Entry deliberately fails closed in Production.
- Existing server Media read data has identifiers/order/cover but no approved preview URL, so Edit displays a labelled placeholder for server images.
- No approved Product Type reference service exists in the current repository. Existing Edit Product Type is preserved and stale Product Type is cleared when Category changes; no hardcoded selector was invented.
- New-source replacement remains unimplemented unless separately approved.
- Direct browser visual/touch QA could not run because the connected browser runtime exposed zero browser surfaces; deterministic manual QA is documented.

## Required Confirmations

- No raw image bytes are stored in IndexedDB.
- Reference Purchase Cost is absent.
- Product is not rolled back by Media failure.
- Create completion does not clear the form or draft.
- Add New Product generates a different submission ID after exact old-draft deletion.
- Files and object URLs are in-memory only and are revoked/cleared at the approved boundaries.
- Workspace/actor are not accepted as browser business authority.
- No dependency or database migration was added.
- No Git write operation was performed.

## التأكيدات المطلوبة

- لا تُحفظ bytes الصور الخام في IndexedDB.
- تكلفة الشراء المرجعية غائبة.
- لا يتم التراجع عن المنتج عند فشل الوسائط.
- لا يمسح اكتمال الإنشاء النموذج أو المسودة.
- ينشئ «إضافة منتج جديد» معرف طلب مختلفاً بعد حذف المسودة القديمة الدقيقة.
- تبقى الملفات وروابط المعاينة في الذاكرة فقط وتُلغى عند الحدود المعتمدة.
- لا تُقبل مساحة العمل أو المنفذ كسلطة عمل من المتصفح.
- لم تُضف اعتمادية أو ترحيل قاعدة بيانات.
- لم تُنفذ أي عملية كتابة في Git.

## Next Recommendation

Execute the documented manual browser matrix in a review environment with a connected browser and trusted Development context, then review Task 3.14.9-D together with the approved A/B/C contracts. Real authentication and an approved Product Type reference/read-media-preview contract should be separate follow-up tasks; the new-source replacement use case must remain separately approved.

## Git and Review Integrity

No Git write operation was performed. Nothing was staged, committed, pushed, merged, reset, restored, checked out, switched, cleaned, stashed, rebased, or deleted through Git. The dirty working tree is intentionally preserved for DEV-001 review.
