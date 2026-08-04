# Task 3.14.9-B-R1 — Correct Media Resume Source Requirements — Final Report

**Date:** 2026-08-04

**Status:** ReadyForReview

**Task ID:** `3.14.9-B-R1`

## Summary | الملخص

Corrected Phase 2 so the server resolves the Workspace-scoped linked/idempotency Product Media Workflow before deciding which multipart sources are required. Completed replay and retained-Staging retry now accept zero files, skip redundant source verification, reuse one workflow, and do not duplicate canonical image mutations. GET and POST share one Application source-requirement projection. Early bounded multipart checks reject clearly oversized requests before parsing and cap entry count. | صُححت المرحلة الثانية بحيث يحل الخادم دورة Product Media المرتبطة ودورة مفتاح Idempotency والمقيدتين بمساحة العمل قبل تحديد مصادر multipart المطلوبة. يقبل تكرار الدورة المكتملة وإعادة محاولة المصدر المرحلي المحفوظ طلباً بلا ملفات، ويتجاوزان التحقق المتكرر، ويعيدان استخدام دورة واحدة دون تكرار صور أساسية. تستخدم GET وPOST إسقاط متطلبات واحداً في طبقة التطبيق، وتُطبق حدود مبكرة ومقيدة على الطلب متعدد الأجزاء.

## Root Cause Analysis and Reproduction | تحليل السبب الجذري وإعادة الإنتاج

The interrupted Task B files were structurally intact. The defect was ordering: `UploadProductEntrySubmissionMediaUseCase` mapped the full persisted plan and required every Add/Replace source before it calculated the deterministic Media key or queried durable workflow state. Consequently, completed replay and retained-source retry returned `SOURCE_REQUIRED` before idempotency/resume logic could run. The route also called `request.formData()` without an early request-size or entry-count bound.

The existing replay test was changed to send zero files before the fix. It failed with `actual: InvalidRequest`, `expected: Completed`, reproducing the review finding. The smallest correction resolves the workflow first, derives exact source requirements in a focused Application collaborator, then maps and verifies only required uploads. | كانت ملفات المهمة B سليمة من ناحية البنية، لكن ترتيب التنفيذ كان خاطئاً: كانت حالة الاستخدام تفرض ملفات Add وReplace من الخطة كاملة قبل حساب المفتاح أو قراءة حالة الدورة المحفوظة، ولذلك ظهر `SOURCE_REQUIRED` قبل الوصول إلى منطق الاستئناف. أُعيد إنتاج العيب باختبار تكرار بلا ملفات، ثم صُحح بأصغر تغيير يحل الدورة أولاً ويحسب المتطلبات في طبقة التطبيق.

## Files Created | الملفات المنشأة

- `domains/catalog/product-entry/application/product-entry-media-source-requirements.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-multipart-policy.ts`
- `docs/05-Development/Reports/Task-3.14.9-B-R1-Final-Report.md`

## Files Modified | الملفات المعدلة

- `app/api/catalog/product-entry-submissions/[submissionId]/media/route.ts`
- `docs/05-Development/Product-Entry-Media-Upload-Coordination.md`
- `docs/05-Development/Product-Media-Workflow-Orchestration.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- `domains/catalog/media/services/product-media-workflow.ts`
- `domains/catalog/media/services/product-media-workflow.test.ts`
- `domains/catalog/product-entry/application/get-product-entry-submission-media-status.use-case.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-coordination.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-source-mapping.ts`
- `domains/catalog/product-entry/application/upload-product-entry-submission-media.use-case.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-media.integration.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-route-handlers.test.ts`
- `domains/catalog/product-entry/ports/product-entry-media-workflow-coordinator.port.ts`

These are R1 changes within the preserved, still-uncommitted Task B working tree. | هذه تغييرات R1 داخل شجرة عمل المهمة B المحفوظة وغير الملتزم بها.

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Files Intentionally Unchanged | الملفات المتروكة دون تغيير عمداً

- Product Aggregate, Product Smart Save, Phase 1 transaction, request fingerprint, persisted Media Plan, and Product publication behavior.
- Workspace isolation rules and trusted-context composition.
- Product Media durable statuses, canonical image ownership, staging retention, cleanup, compensation, and reconciliation rules.
- Database schema, migrations, and snapshots; no migration was needed.
- UI, IndexedDB, browser hashing, authentication provider, Worker, scheduler, and object storage.
- Dependencies and lockfile; no library was added or upgraded.
- بقيت حدود المنتج وSmart Save ومعاملة المرحلة الأولى وبصمة الطلب وخطة الوسائط وسلوك النشر والعزل بين مساحات العمل وحالات Product Media والمخطط والترحيلات والواجهة والاعتمادات دون تغيير.

## Architecture Changes | تغييرات البنية

No architecture redesign occurred. A focused `ProductEntryMediaSourceRequirementsResolver` now projects `RequiredFromPlan`, `RetainedSourceAvailable`, `NewSourceRequired`, `Completed`, and `NotRequired` from the persisted plan plus durable Product Media state. Both GET and POST use it. The coordinator port gained only the ability to resolve the linked and deterministic-key workflows before source mapping. Product Media commands may carry the durable raw source SHA-256 for already completed source operations, allowing the unchanged Product Media request fingerprint to be reconstructed while only Pending operations receive bytes and execute.

The App Router still owns transport parsing only. Its new policy is a bounded transport guard, not workflow business logic. Product Entry repositories do not call Product Media repositories, Route Handlers call no repositories, and Product Media Workflow remains the only canonical mutation authority. | لم يحدث أي إعادة تصميم؛ أضيف مسقط مركز لمتطلبات المصدر في طبقة التطبيق، وأضيف حل الدورة إلى منفذ التنسيق، مع بقاء منطق النقل في Route Handler وملكية التغيير الأساسي للوسائط داخل Product Media وحدها.

## Workflow Resolution and Conflict Review | مراجعة حل الدورة والتعارض

After the Workspace-scoped Submission and immutable Media Plan load, POST calculates the existing deterministic Media key and resolves both the Submission's `mediaWorkflowId`, when present, and the workflow found by that key. A missing linked workflow, a different key, or different workflow identities produces typed `WorkflowConflict`; the client supplies no workflow state. Product ID and plan operation identity/type are checked against the durable projection before source mapping. GET follows the same resolution path and remains read-only. | بعد تحميل الطلب والخطة المقيدين بمساحة العمل، يحسب POST المفتاح الحتمي ويحل كلاً من الربط المحفوظ ودورة المفتاح، ويرفض أي اختلاف بنتيجة منمطة. لا تُقبل حالة دورة من العميل، وتستخدم GET المسار نفسه دون كتابة.

## Completed Replay Proof | إثبات تكرار الدورة المكتملة

- POST with zero files returns the existing Completed workflow.
- The Source Verifier call count does not increase.
- The coordinator is not called, so no staging, execution, retry, or Media mutation occurs.
- A supplied file for the completed Add/Replace operation returns `SOURCE_UNEXPECTED`.
- PostgreSQL integration proves one workflow, one operation, one canonical image, and one Submission linkage across the original request and zero-file replay.
- Linkage recovery after a forced post-Media database failure also uses zero files and links the same completed workflow.
- يقبل التكرار المكتمل صفراً من الملفات ويتجاوز المدقق والمنسق، ويرفض الملف غير المطلوب، وتثبت اختبارات PostgreSQL بقاء دورة وعملية وصورة وربط واحد فقط.

## Retained-Source Retry Proof | إثبات إعادة محاولة المصدر المحفوظ

- A retryable Failed/Staged Add or Replace with `retryAllowed=true` and `requiresNewSource=false` projects `RetainedSourceAvailable` and requires no multipart source.
- POST sends Product Media the unchanged durable command descriptors and source hashes without source bytes, then the existing canonical retry use case verifies retained Staging and retries it.
- The Source Verifier is not invoked again.
- PostgreSQL integration sends zero files on the second request, reuses the same workflow ID, completes successfully, and leaves exactly one canonical image.
- A Product Media unit test resumes one Pending operation using its bytes while an already completed source operation contributes only its durable hash; the completed operation is not executed again.
- لا تتطلب إعادة محاولة المصدر المرحلي المحفوظ رفعاً جديداً، وتستخدم حالة إعادة المحاولة الأساسية نفسها، ولا تعيد التحقق أو إنشاء دورة أو صورة إضافية.

## GET and POST Source Consistency | اتساق متطلبات المصدر بين GET وPOST

GET `requiredSourceOperationIds` is produced directly from the same resolver input used by POST source mapping. Tests prove a two-operation workflow in which one operation is Completed and the other has `requiresNewSource=true`: GET requests only the affected operation; POST returns `SOURCE_REQUIRED` when it is missing, `SOURCE_UNEXPECTED` for a file on the completed operation, and accepts verification only for the affected operation. New workflows still require exactly one source for every persisted Add/Replace operation. Remove and other non-source operations never accept files. | تُنتج GET قائمة المصادر المطلوبة من المسقط نفسه الذي تستخدمه POST، وتثبت الاختبارات أن العملية المتأثرة وحدها تُطلب، وأن المفقود يعيد `SOURCE_REQUIRED` والملف لعملية غير مطلوبة يعيد `SOURCE_UNEXPECTED`.

## New-Source Flow Review | مراجعة مسار المصدر الجديد

The existing approved Product Media API cannot safely restage a replacement source for an existing non-retryable `SourceUnavailable` operation. R1 does not invent a repository or filesystem workaround. POST requires and independently verifies the affected file against the immutable Phase 1 SHA-256, byte length, MIME/content, decoding, size, and dimension contract, then returns typed `NewSourceFlowNotImplemented` with stable code `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED` and HTTP 409 without staging or Media mutation. A separately approved Product Media new-source use case remains necessary. | لا تدعم واجهة Product Media المعتمدة استبدال مصدر عملية غير قابلة للإعادة بأمان. لذلك يتحقق R1 من الملف المطلوب ثم يعيد النتيجة المنمطة دون تجهيز أو تغيير، ويبقى تنفيذ مسار مستقل معتمد مطلوباً.

## HTTP Memory Protection Review | مراجعة حماية ذاكرة HTTP

- `Content-Length`, when present, must be a non-negative decimal safe integer.
- A value above 32 configured maximum-size files plus 1 MiB multipart overhead returns sanitized HTTP 413 before `request.formData()` or application opening.
- Parsed multipart entries are capped at 32; overflow returns sanitized HTTP 400 before file `arrayBuffer()` reads or application opening.
- Per-file actual byte length and configured 10 MiB maximum remain authoritative after parsing; `Content-Length` is never trusted alone.
- Current Next.js App Router `formData()` buffers multipart content. True streaming upload is explicitly documented as outside R1.
- تُفحص قيمة الطول مبكراً ويُقيد عدد الأجزاء، ثم يبقى طول الملف الفعلي هو المرجع. يخزن App Router الحالي المحتوى في الذاكرة، والرفع المتدفق خارج النطاق.

## Transaction, Product, and Canonical Ownership Review | مراجعة المعاملة والمنتج والملكية الأساسية

Phase 1 and Product Smart Save are never reopened or repeated. Test repositories throw if Phase 2 attempts a claim, `markProductSaved`, Product create, or Product update. Media failure remains independent: unit and PostgreSQL tests prove the Product ID/revision persists unchanged while the Submission records a partial outcome. Product Entry coordinates only through the Product Media Application boundary; it never writes canonical image rows, Media state, staging, final, or Trash artifacts. No distributed transaction was introduced. | لا تعيد المرحلة الثانية Smart Save ولا تكتب المنتج، ويبقى فشل الوسائط مستقلاً، ولا يغير الصور الأساسية إلا Product Media عبر حد التطبيق المعتمد.

## Security and Multi-Tenant Review | مراجعة الأمن وتعدد المستأجرين

Submission, plan, Product, linked workflow, key workflow, and linkage remain exact-Workspace scoped. Foreign Workspace submissions return NotFound before Media resolution. Workspace and actor still originate only from trusted context. Production resolution still fails closed before multipart parsing or database/storage opening. Responses expose no paths, staging keys, bytes, stack traces, or internal errors. | تبقى جميع الموارد مقيدة بمساحة العمل، وتأتي الهوية من السياق الموثوق فقط، وتبقى Production مغلقة بأمان، ولا تكشف الاستجابات تفاصيل داخلية.

## Test Results | نتائج الاختبارات

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed with zero warnings.
- `npm.cmd test`: passed 315 tests total; 314 passed, 1 known Windows symlink/junction permission skip, 0 failed. Breakdown: Product 106/106; DEV-001 45/45; Product Media 97 passed plus 1 known skip; Product Entry 66/66.
- `npm.cmd run test:integration`: passed 67/67 across 13 suites against only the guarded `TEST_DATABASE_URL`.
- `npm.cmd run build`: passed; the Phase 2 media route compiled as a dynamic Node.js route.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed; only expected Windows line-ending notices were printed.
- `git status` and `git diff --stat`: executed; all Task B/R1 source remains unstaged and uncommitted for review.
- نجحت فحوص TypeScript وLint والوحدة والتكامل والبناء وDrizzle وGit دون أي فشل، مع تجاوز Windows المعروف وحده.

The suite explicitly covers all 18 R1 cases: zero-file completed replay, skipped verification/execution, unexpected completed file, zero-file retained retry, skipped retry verification, same workflow, no duplicate image, shared GET/POST requirements, affected-only new source, missing required source, unexpected non-required source, early Content-Length rejection, entry bound, foreign Workspace NotFound, no Smart Save, unchanged Product on Media failure, and production fail-closed behavior.

The prohibited `npm.cmd audit`, `npm.cmd audit --omit=dev`, audit-fix commands, and `npm.cmd run db:migrate` were not run. No dependency installation or update was performed. | لم تُشغل أوامر التدقيق أو الإصلاح أو الترحيل المحظورة، ولم تُثبت أو تُحدث أي تبعية.

## Migration Review | مراجعة الترحيل

No migration was added. Existing Product Entry linkage/status fields, immutable plan metadata, Product Media workflow/operation state, retry flags, source-availability flag, staging metadata, and Workspace constraints are sufficient. | لم يُضف أي ترحيل لأن الحقول والقيود الحالية كافية.

## Known Limitations | القيود المعروفة

- The separately approved Product Media replacement-source flow is not implemented; the typed R1 result is intentional.
- App Router still buffers multipart form data; true streaming parsing remains future work.
- Real Production authentication, UI, IndexedDB, browser hashing, Worker, scheduler, and object storage remain out of scope.
- The known Windows symlink/junction privilege-dependent test remains the only accepted skip.
- يبقى مسار استبدال المصدر والرفع المتدفق والمصادقة الحقيقية والواجهة والعمل الخلفي خارج النطاق، ويبقى تجاوز Windows المعروف وحده.

## Review Bundle | حزمة المراجعة

This byte-exact report is the source for the DEV-001 `3.14.9-B-R1` invocation. The workflow must skip only the two prohibited optional audit commands, rerun every required configured check, preserve exact source, sanitize evidence only, verify `overallStatus: ReadyForReview` and Git integrity, publish the repository-local ZIP/SHA-256 pair, and atomically export the report/ZIP/SHA-256 set to Desktop without any Git write. | هذا التقرير المطابق بايتاً هو مصدر حزمة DEV-001، ويجب أن تحفظ الحزمة المصدر وتعيد الفحوص المطلوبة وتتحقق من الجاهزية وسلامة Git وتنشر الأدلة محلياً وعلى سطح المكتب دون أي كتابة Git.

Expected artifact names:

- `QSC-Task-3.14.9-B-R1-Final-Report.md`
- `QSC-Task-3.14.9-B-R1-Review.zip`
- `QSC-Task-3.14.9-B-R1-Review.zip.sha256`

## Next Recommendation | التوصية التالية

Stop for independent review. If approved, define a separate Product Media Application use case for authenticated replacement of a `SourceUnavailable` operation before enabling that client path; keep Product Media as the canonical mutation authority. Do not begin Task 3.14.9-C until this correction is approved. | التوقف للمراجعة المستقلة. بعد الاعتماد، تُعرّف حالة استخدام مستقلة في Product Media لاستبدال مصدر العملية غير المتاحة قبل تمكين المسار في العميل، مع بقاء Product Media المرجع الوحيد للتغيير. لا تبدأ المهمة 3.14.9-C قبل اعتماد هذا التصحيح.
