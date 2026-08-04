# Task 3.14.9-B — Product Entry Media Upload Coordination — Final Report

**Date:** 2026-08-04

**Status:** ReadyForReview

**Task ID:** `3.14.9-B`

## Summary | الملخص

Implemented the separate Product Entry Phase 2 server boundary. The new multipart POST maps raw files only by persisted operation ID, independently verifies raw integrity and decoded image limits, derives one deterministic Workspace-scoped Media idempotency key, and coordinates the existing Product Media Application to resolve, stage, execute, replay, or resume one canonical workflow. The read-only GET exposes sanitized resume state. A separate idempotent PostgreSQL transaction links the workflow and records `Completed` or `PartiallyCompleted`; Product Smart Save is never repeated and Media failure never rolls back the saved Product. | نُفذت حدود الخادم المستقلة للمرحلة الثانية من إدخال المنتج. تربط نقطة POST الملفات الخام بمعرف العملية المحفوظ فقط، وتتحقق مستقلاً من سلامة البايتات وحدود الصورة، وتحسب مفتاح Media حتمياً ومقيداً بمساحة العمل، ثم تنسق مع طبقة تطبيق Product Media الحالية لحل دورة أساسية واحدة أو تجهيزها أو تنفيذها أو استئنافها. تعرض GET حالة الاستئناف المنقحة للقراءة فقط، وتربط معاملة PostgreSQL مستقلة الدورة بالطلب دون إعادة Smart Save أو التراجع عن المنتج عند فشل الوسائط.

## Root Cause Analysis and Reproduction | تحليل السبب الجذري وإعادة الإنتاج

The approved Phase 1 implementation already persisted the authoritative ordered Media Plan and reserved submission lifecycle fields, while Product Media already owned canonical image mutation, staging, 14-day source retention, compensation, and reconciliation. The missing seam was the Phase 2 Application/HTTP coordination boundary: there was no multipart source-to-operation mapper, no independent raw verifier, no Product Entry Media key, no resolve/resume adapter, no submission-link transition, and no upload/status routes. Product Media replay also returned an existing Pending workflow without resuming it, and Replace commands had no order input for an authoritative persisted `finalOrder`.

Baseline reproduction on `feature/product-entry-media-upload` showed a clean tree, the approved A/A-R1 and Product Media commits, a passing Drizzle check, and 288 existing tests with 287 passed plus the one known Windows link-permission skip. The smallest safe implementation preserved both boundaries, added focused Product Entry ports/use cases and Infrastructure adapters, and extended only the canonical Product Media Application where pending resume and Replace ordering had to be executed. | كانت المرحلة الأولى تحفظ الخطة الموثوقة وكانت دورة Product Media تملك التغيير الأساسي والتجهيز والتعويض والمصالحة، لكن لم توجد وصلة تنسيق للمرحلة الثانية أو ربط للملف بالعملية أو تحقق خام مستقل أو مفتاح Media أو مسارات HTTP أو ربط حالة الطلب. كما كانت إعادة دورة Pending تعيد الحالة دون استئناف، ولم تحمل Replace ترتيب `finalOrder`. أثبت خط الأساس سلامة الفرع والاختبارات، ثم أضيفت أصغر وصلة تحافظ على الحدود الحالية.

## Files Created | الملفات المنشأة

- `app/api/catalog/product-entry-submissions/[submissionId]/media/route.ts`
- `docs/05-Development/Product-Entry-Media-Upload-Coordination.md`
- `docs/05-Development/Reports/Task-3.14.9-B-Final-Report.md`
- `domains/catalog/product-entry/application/get-product-entry-submission-media-status.use-case.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-coordination.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-idempotency-key.ts`
- `domains/catalog/product-entry/application/product-entry-media-source-mapping.ts`
- `domains/catalog/product-entry/application/upload-product-entry-submission-media.use-case.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-media.integration.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.ts`
- `domains/catalog/product-entry/infrastructure/sharp-product-entry-media-source-verifier.ts`
- `domains/catalog/product-entry/infrastructure/sharp-product-entry-media-source-verifier.test.ts`
- `domains/catalog/product-entry/ports/product-entry-media-source-verifier.port.ts`
- `domains/catalog/product-entry/ports/product-entry-media-workflow-coordinator.port.ts`

## Files Modified | الملفات المعدلة

- `docs/05-Development/Product-Entry-Submission-Registry.md`
- `docs/05-Development/Product-Media-Workflow-Orchestration.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- `domains/catalog/media/services/product-media-workflow.ts`
- `domains/catalog/media/services/product-media-workflow.test.ts`
- `domains/catalog/product-entry/application/get-product-entry-submission.use-case.ts`
- `domains/catalog/product-entry/application/product-entry-execution-context.ts`
- `domains/catalog/product-entry/application/submit-product-entry.use-case.test.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-submission.repository.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-context-adapters.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-route-handlers.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-server-runtime.ts`
- `domains/catalog/product-entry/repositories/product-entry-submission.repository.ts`
- `package.json`

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Files Intentionally Unchanged | الملفات المتروكة دون تغيير عمداً

- Product Aggregate, Smart Save service, Product repository write contract, Phase 1 submission command/fingerprint/transaction flow, and Product publication rules.
- Drizzle schema, migrations, snapshots, and existing Workspace-scoped constraints; all Phase 2 persistence needs were already represented.
- Local Product Media storage paths, key policy, normalization defaults, Trash policy, 14-day retention, cleanup/cancellation use cases, and reconciliation rules.
- Product Entry UI, browser drafts, IndexedDB, browser hashing, public catalog, and authentication-provider composition.
- Dependency versions and lockfile; no package was installed or updated.
- بقيت حدود المنتج وSmart Save ومعاملة المرحلة الأولى والمخطط والترحيلات وسياسات التخزين والواجهة والمسودات والمصادقة والاعتمادات دون تغيير.

## Architecture Review | مراجعة البنية

DDD and Clean Architecture direction is preserved. Product Entry Application owns the two focused use cases, source mapping, key policy, and sanitized projections. Its ports import no Infrastructure. Product Entry repositories do not call Product Media repositories. Infrastructure composes PostgreSQL, Sharp, local storage, and the existing Product Media Application use cases. The route resolves trusted context, parses transport, calls one use case, translates typed results, and sanitizes unexpected failures; it contains no repository, hashing, storage, workflow, tenant, or actor policy.

Product Media Workflow remains the only canonical Media mutation authority. Product Entry never writes Product images, Media state, staging keys, final keys, or Trash keys. The bounded Product Media extension resumes only durable Pending operations and accepts authoritative order for Replace inside the same existing service. No architecture redesign, boundary merge, UI, worker, scheduler, or substitute Media implementation was introduced. | بقي اتجاه التبعيات سليماً؛ تملك Application التنسيق والعقود، وتملك Infrastructure التركيب، وتبقى المسارات مترجمات HTTP رفيعة. تظل دورة Product Media وحدها صاحبة تغيير حالة الوسائط الأساسية ولا يكتب Product Entry الصور أو مفاتيح التخزين.

## Transaction and Cross-Boundary Consistency Review | مراجعة المعاملة والاتساق عبر الحدود

Phase 1 is unchanged and still commits claim, plan, Smart Save Product, receipt, and audit atomically. Phase 2 first reads the Workspace-scoped Submission and plan in a Product Entry Unit of Work, then leaves that transaction before Product Media stages or mutates files. Product Media uses its existing durable operation transitions, optimistic versions, compensation, and `ReconciliationRequired` semantics. A second Product Entry Unit of Work links the workflow and outcome atomically and idempotently.

There is no distributed transaction. Media failure cannot roll back Product persistence. If the linkage database update fails after Media completion, the workflow remains durable; GET or a repeated POST resolves it by the same Media key, and a later successful POST links it without duplicating image mutation. A guarded integration trigger proves this recovery. | بقيت معاملة المرحلة الأولى مستقلة، وتحدث أعمال الملفات خارجها، ثم يربط طلب إدخال المنتج الدورة في معاملة ثانية. لا توجد معاملة موزعة، ويحافظ الفشل بعد اكتمال الوسائط على دورة قابلة للحل والاسترداد دون تكرار الصورة.

## Media Plan Authority Review | مراجعة سلطة خطة الوسائط

Only the persisted Phase 1 plan supplies operation ID, type, zero-based sequence, target Media ID, requested order, cover selection, expected raw hash, expected raw length, and `finalOrder`. Multipart supplies bytes only through exact `source:<operationId>` fields. Filename, client MIME, multipart order, and client metadata are ignored. Commands are rebuilt in persisted sequence. `finalOrder` overrides the earlier requested order when present; Product Media applies it for Add and Replace. Phase 2 exposes no plan mutation and integration tests confirm stored plan values remain unchanged. | الخطة المحفوظة وحدها تحدد هوية العملية ونوعها وتسلسلها وهدفها وترتيبها والغلاف وبصمة المصدر وطوله، بينما يقدم multipart البايتات فقط. يُحفظ التسلسل و`finalOrder` ولا يستطيع العميل تعديل الخطة.

## Source Verification Review | مراجعة التحقق من المصدر

Add and Replace require exactly one non-empty source. Missing, duplicate, unknown, malformed, or unexpected sources—including sources for Remove and future Reorder/SetCover descriptors—return stable codes. The verifier independently checks configured raw size, exact raw length, lowercase raw SHA-256, content-detected JPEG/PNG/WebP, successful decoding, non-animation, width, height, and decoded pixels. Client MIME is accepted only as untrusted transport information and is never used for the decision. Product Media then normalizes and verifies staged/final checksums independently. Tests cover every required `SOURCE_*` result, corrupt and unsupported content, false client MIME, and limits. | تتحقق المرحلة الثانية مستقلاً من الحجم والطول والبصمة ونوع المحتوى وفك الترميز والأبعاد وعدد البكسلات، ولا تثق في MIME القادم من العميل. ثم تعيد دورة Product Media تحقق التطبيع والتخزين بصورة مستقلة.

## Idempotency and Concurrency Review | مراجعة Idempotency والتزامن

The deterministic Media key is SHA-256 over the unambiguous UTF-8 JSON tuple `[workspaceId, submissionId, productId, requestFingerprint]`. Tests prove determinism, sensitivity to every field, Workspace isolation, and resistance to concatenation ambiguity. PostgreSQL's existing unique `(workspaceId, idempotencyKey)` workflow constraint is the concurrency authority. Concurrent requests resolve one workflow and one operation set. Completed replay performs no second mutation; a repeated POST resumes Pending operations and retries only durable `retryAllowed` operations. Submission linkage accepts only the same workflow and legal `ProductSaved → PartiallyCompleted/Completed` or `PartiallyCompleted → Completed` progress, with exact replay returning Existing. | يمنع المفتاح الحتمي والقيد الفريد المقيد بمساحة العمل إنشاء دورة مكررة. لا تعيد النتيجة المكتملة التغيير، ويستأنف POST المتكرر العمليات القابلة للاستئناف، ويبقى ربط الطلب قانونياً وآمناً للتزامن.

## Security and Multi-Tenant Review | مراجعة الأمن وتعدد المستأجرين

- POST requires `catalog.product-entry-media.upload`; GET requires the existing submission read permission.
- Workspace and actor originate only from the trusted-context resolver; body/form identity fields are rejected and never become authority.
- Submission, plan, Product, workflow, operation, media state, and linkage use exact Workspace scope with no global fallback.
- Foreign Workspace submissions and workflows are not exposed.
- Production still selects the fail-closed resolver before multipart parsing or database/storage composition.
- Workflow responses omit staged/final/Trash keys, paths, bytes, hashes, and internal exception messages.
- Unexpected errors expose only `PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE`; trusted-context errors retain `AUTHENTICATION_CONTEXT_UNAVAILABLE`.
- Existing Product Media actor/status persistence supplies durable coordination evidence; no new audit payload or sensitive audit schema was introduced.
- تتطلب العمليات صلاحيات مستقلة، وتأتي الهوية من السياق الموثوق فقط، وتكون جميع الموارد مقيدة بمساحة العمل، وتبقى الاستجابات منقحة وProduction مغلقاً.

## HTTP Review | مراجعة HTTP

Implemented `POST` and read-only `GET` at `/api/catalog/product-entry-submissions/:submissionId/media`. Status mappings are: `200` completed/existing, `202` accepted/partial/retryable, `400` malformed multipart or mapping, `403` forbidden, `404` scoped Submission missing, `409` lifecycle/workflow/link conflict, `413` raw size, `415` unsupported/invalid image, `422` raw integrity/dimensions/plan mismatch, and `503` trusted context or unexpected service failure. The production build lists the new path as one dynamic Node.js route. | نُفذت نقطتا POST وGET مع ربط ثابت للحالات، وتبقى GET للقراءة فقط والمسار ديناميكياً في بناء Next.js.

## Test Results | نتائج الاختبارات

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed with zero warnings.
- `npm.cmd test`: passed 308 tests total; 307 passed, 1 known Windows symlink/junction permission skip, 0 failed. Breakdown: Product 106/106; DEV-001 45/45; Product Media 96 passed plus 1 known skip; Product Entry 60/60.
- `npm.cmd run test:integration`: passed 67/67 across 13 suites against only the guarded `TEST_DATABASE_URL`, including 7 new end-to-end Product Entry Media coordination tests.
- `npm.cmd run build`: passed; the Phase 1 routes and new `/[submissionId]/media` route compiled.
- `npm.cmd run db:check`: passed.
- `git diff --check`: passed; Git printed only expected Windows line-ending notices.
- `git status` and `git diff --stat`: executed; the reviewable implementation remains unstaged and uncommitted.
- نجحت فحوص TypeScript وLint والوحدة والتكامل والبناء وDrizzle وGit، ولم يفشل أي اختبار.

The suite covers required source mappings and codes, double verification, plan sequence/final order, completed replay, pending resume, retry with retained staging, same-key concurrency, foreign Workspace denial, read-only GET, partial success, durable reconciliation, linkage recovery after a database failure, Product independence, and production fail-closed behavior. `npm.cmd audit`, `npm.cmd audit --omit=dev`, all audit-fix commands, `npm.cmd run db:migrate`, and dependency installation/update were not run as prohibited.

## Explicit Confirmations | تأكيدات صريحة

- Product Smart Save is not repeated in Phase 2; tests make claim/create/update Product calls fail if invoked.
- Product persistence is not rolled back or rewritten by Media failure; PostgreSQL tests compare the saved Product revision before and after failure.
- Product Media Workflow remains the only canonical Media mutation authority.
- No database migration was added because the existing Submission workflow link/status, persisted Media Plan, Media workflows/operations/state, staging metadata, retry flags, and expiry fields are sufficient.
- لا تعاد Smart Save ولا يتراجع المنتج بسبب فشل الوسائط، وتبقى Product Media المرجع الوحيد لتغيير الوسائط، ولم يلزم ترحيل جديد.

## Known Limitations | القيود المعروفة

- Real authentication/session/JWT/OAuth integration is not implemented; Product Entry remains intentionally unavailable in Production.
- There is no Product Entry UI, IndexedDB draft, browser Web Worker hashing, automatic retry, scheduler, object-storage adapter, or permanent Trash deletion.
- GET reports `requiresNewSource`; replacing a source after it reaches non-retryable `SourceUnavailable` requires a separately approved new-source flow.
- The upload endpoint treats an empty persisted Media Plan as a plan mismatch; no synthetic empty workflow is created.
- The existing Windows symlink/junction privilege-dependent test remains the only accepted skip.
- لا تشمل المهمة المصادقة الحقيقية أو الواجهة أو المسودات المحلية أو العامل الخلفي أو المجدول أو استبدال المصدر غير المتاح، ويبقى تخطي Windows المعروف وحده.

## Architecture Changes | تغييرات البنية

No architecture redesign occurred. The existing modular boundaries gained a Product Entry media coordinator port/adapter and the canonical Product Media Application gained bounded pending-resume, idempotency-key query, and Replace-order behavior. No component accesses persistence, no route calls a repository, no business logic was hardcoded in UI, and no dependency was added. | لم يحدث إعادة تصميم؛ أضيفت وصلة تنسيق محدودة وامتد التطبيق الأساسي للوسائط بالاستئناف والترتيب فقط دون تغيير اتجاه التبعيات.

## Review Bundle | حزمة المراجعة

This byte-exact report is the source for the single DEV-001 Task `3.14.9-B` review invocation. The invocation must preserve exact source, sanitize evidence only, skip only the prohibited optional npm audit checks, rerun required configured verification, verify `ReadyForReview` and Git integrity, publish the repository-local ZIP/SHA-256 pair, and atomically export the byte-exact report/ZIP/SHA-256 set to Desktop without any Git write. | هذا التقرير هو المصدر المطابق بايتاً لاستدعاء DEV-001، ويجب أن يحفظ المصدر وينقح الأدلة فقط ويتحقق من الجاهزية وسلامة Git وينشر الملفات المحلية وملفات سطح المكتب دون كتابة Git.

## Next Recommendation | التوصية التالية

After review approval, proceed to Task `3.14.9-C` only within its approved scope, using the Phase 2 read-only resume projection and stable source codes for client behavior. Prioritize the real trusted authentication adapter before Production enablement. If review requests a correction to Task B, address that correction before beginning C. | بعد اعتماد المراجعة، انتقل إلى المهمة 3.14.9-C ضمن نطاقها المعتمد فقط، واستفد من إسقاط الاستئناف وأكواد المصدر الثابتة، وقدّم محول المصادقة الحقيقي قبل تمكين Production، وعالج أي تصحيح مراجعة قبل بدء C.
