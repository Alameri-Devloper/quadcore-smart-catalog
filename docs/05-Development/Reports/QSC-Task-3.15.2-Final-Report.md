# QSC Task 3.15.2 — Replace Unavailable Product Media Source — Final Report

## Status

`ReadyForReview`. Independent approval is required. Live PostgreSQL and browser-matrix limitations are recorded below. | الحالة `ReadyForReview`. الموافقة المستقلة مطلوبة، وقيود PostgreSQL والمتصفح موثقة أدناه.

## Task

Task 3.15.2 — Replace Unavailable Product Media Source. | المهمة 3.15.2 — استبدال مصدر وسائط المنتج غير المتاح.

## Branch

`feature/product-media-source-replacement`, baseline commit `0c3dd66`; no Git write operation was performed. | الفرع المذكور عند الالتزام الأساسي المحدد، ولم تُنفذ أي عملية كتابة في Git.

## English Summary

Implemented the approved recovery path for an existing Product Media operation in `SourceUnavailable` with `requiresNewSource = true`. A replacement is a persisted, workspace-scoped Source Attempt with a server-generated identifier, dedicated fingerprint, 14-day lifetime, verified metadata, audit history, and one-active-attempt database constraint. The existing multipart upload and Product Media retry path are reused; `operationId`, the Product Entry submission/media plan, and `requestFingerprint` remain unchanged.

## Arabic Summary

نُفذ مسار الاستعادة المعتمد لعملية وسائط منتج حالتها `SourceUnavailable` وتتطلب مصدراً جديداً. يُمثل البديل بمحاولة مصدر محفوظة ومقيدة بمساحة العمل، لها معرف يولده الخادم وبصمة مستقلة وعمر 14 يوماً وبيانات تحقق وسجل تدقيق وقيد يمنع تعدد المحاولات النشطة. أُعيد استخدام رفع multipart ومسار إعادة المحاولة مع الحفاظ على العملية وطلب إدخال المنتج وبصمته دون تغيير.

## Root Cause Analysis

The existing coordinator deliberately returned `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED`. Product Media already owned unavailable-source/retry states but lacked persisted source-attempt identity, concurrency protection, trusted replacement staging, and application coordination. | كان المنسق السابق يتوقف بالرمز المذكور؛ وكانت حالات عدم توفر المصدر موجودة بلا هوية محاولة محفوظة أو حماية تزامن أو تجهيز موثوق أو تنسيق تطبيقي.

## Architecture Review

Domain rules remain in Product Media, application services coordinate, repositories own data access, Product Entry adapts its existing upload flow, and route handlers remain thin. No library or unrelated layer was added. | بقيت قواعد المجال في وسائط المنتج والتنسيق في التطبيق والوصول للبيانات في المستودعات، دون مكتبة أو طبقة غير لازمة.

## Architecture Changes

Added Source Attempt domain/persistence/application pieces inside the existing modular monolith and minimally extended current ports. No boundary was collapsed or renamed. | أُضيفت أجزاء محاولة المصدر داخل البنية الحالية مع توسيع محدود للمنافذ دون دمج الحدود أو إعادة تسميتها.

## Product Media Boundary Review

Product Media remains canonical for operation state, retry, staging, publication, ordering, cover, and completion. Source Attempt records source history only. | تبقى وسائط المنتج المرجع المعتمد، وتسجل محاولة المصدر تاريخ المصدر فقط.

## Operation Identity Review

Replacement resolves the existing scoped operation and preserves its `operationId`; no new media operation is allocated. | يحافظ الاستبدال على معرف العملية القائمة ولا ينشئ عملية وسائط جديدة.

## Source Attempt Review

Each new attempt gets an opaque server-generated 128-bit hexadecimal `sourceAttemptId`. The minimal persisted states are `AwaitingUpload`, `Uploaded`, `Applied`, `Failed`, and `Expired`. | تحصل كل محاولة على معرف معتم يولده الخادم، وتستخدم الحد الأدنى من الحالات المحفوظة.

## Source Fingerprint Review

The dedicated SHA-256 fingerprint uses server-computed raw SHA-256, byte length, and normalized declared type. Client metadata is advisory and Product Entry identity is not reused. | تستخدم البصمة المستقلة تجزئة البايتات التي يحسبها الخادم والحجم والنوع المعلن، ولا تعيد استخدام هوية إدخال المنتج.

## Product Entry Fingerprint Preservation Review

The path never reconstructs the submission or plan and never writes Product Entry `requestFingerprint`; integration assertions cover persistence preservation. | لا يعيد المسار بناء الطلب أو الخطة ولا يكتب بصمة إدخال المنتج، وتغطي اختبارات التكامل بقاءها.

## One Active Attempt Review

A partial unique index permits one active attempt per workspace and operation. A scoped operation lock makes the same fingerprint idempotent and a different fingerprint an `ActiveSourceAttemptConflict`. | يفرض فهرس فريد جزئي محاولة نشطة واحدة، ويجعل القفل البصمة نفسها تكراراً آمناً والمختلفة تعارضاً.

## Attempt Expiry Review

Attempts expire after exactly 14 days by server time. Creation/application evaluate expiry transactionally; an expired attempt cannot apply and does not block a new attempt. | تنتهي المحاولة بعد 14 يوماً وفق وقت الخادم، ويمنع تطبيقها بعد الانتهاء مع السماح بمحاولة جديدة.

## Permission Review

The existing sensitive permission `catalog.productMedia.source.replace` is enforced by the application. Owner derives it, Staff may be explicitly granted it, and Standard Catalog Staff exclusion has a regression assertion. | تُفرض الصلاحية الحساسة في التطبيق، ويحصل عليها المالك، ويمكن منحها صراحة للموظف، ويستبعدها القالب القياسي.

## Multi-Tenant Review

Queries begin with trusted `workspaceId + operationId`; composite foreign keys preserve tenant scope and foreign operations map to not found. | تبدأ الاستعلامات بالنطاق الموثوق، وتحفظ المفاتيح المركبة عزل المستأجر دون إفشاء العمليات الأجنبية.

## Upload Boundary Review

The existing multipart transport is reused. Attempt creation commits before processing/storage, so large-file work does not hold a PostgreSQL transaction. | أُعيد استخدام multipart ويثبت إنشاء المحاولة قبل المعالجة والتخزين دون معاملة طويلة.

## Storage Review

The server derives workspace-rooted staging keys from trusted operation/attempt IDs; client file names never become paths. Identical staging is idempotent and different content still conflicts. | يشتق الخادم مفاتيح التجهيز من معرفات موثوقة ولا يستخدم اسم ملف العميل كمسار، مع تكرار آمن للمحتوى المطابق.

## Server Validation Review

The server hashes bytes, enforces existing size/dimension limits, inspects format/decodability, rejects declared/detected MIME mismatch, normalizes through the existing processor, and persists verified metadata. | يتحقق الخادم من البصمة والحجم والأبعاد والمحتوى وMIME ويطبع الصورة عبر المعالج الحالي ويحفظ البيانات المتحقق منها.

## Workflow Resume Review

Atomic apply stages the same operation, clears `requiresNewSource`, preserves retryability, advances workflow version, then uses `RetryProductMediaOperationUseCase`; Phase 1 and Smart Save are not called. | يجهز التطبيق الذري العملية نفسها ويلغي طلب المصدر ويرفع الإصدار ثم يستخدم مسار إعادة المحاولة القائم دون المرحلة الأولى أو الحفظ الذكي.

## Resume Failure Review

Apply commits before resume. A resume failure returns `MediaWorkflowResumeUnavailable` while the accepted staged source remains persisted and retryable. | يثبت المصدر قبل الاستئناف، ويبقى محفوظاً وقابلاً لإعادة المحاولة إذا تعذر الاستئناف.

## Idempotency Review

Same-source create, already-applied finalize, identical staging, and resume all reuse existing identities; no duplicate media operation is created. | تعيد الطلبات المتكررة استخدام الهويات القائمة ولا تنشئ عملية مكررة.

## Concurrency Review

Scoped operation/attempt locks, conditional updates, workflow versioning, and the partial unique index protect create/finalize/expiry/state-change races. | تحمي الأقفال والتحديثات الشرطية والإصدار والفهرس الفريد سباقات الإنشاء والتطبيق والانتهاء وتغير الحالة.

## Browser Storage Review

Raw `File` values remain in memory. Static security tests reject persistence of raw files, blobs, array buffers, base64 media, or IndexedDB payloads. | تبقى الملفات الخام في الذاكرة وتمنع الاختبارات حفظ البايتات أو الكتل أو base64 أو IndexedDB.

## Presentation Review

The bilingual panel appears only for backend-authored `SourceUnavailable + requiresNewSource + canReplaceSource`, reuses the picker/coordinator, and keeps business rules out of React. | تظهر اللوحة الثنائية اللغة فقط للحالة المصرح بها من الخادم وتعيد استخدام المكونات القائمة دون قواعد عمل في React.

## Responsive Review

The panel is mobile-first, wrapping and width-safe; static tests cover responsive classes. Live ten-viewport RTL/LTR checks remain pending because the browser backend exposed no instance. | اللوحة متجاوبة وآمنة العرض، بينما بقي فحص الأحجام العشرة حياً بانتظار متصفح متاح.

## Accessibility Review

Uses a labelled native file input, status text, keyboard-accessible controls, inherited visible focus, and a 44px minimum touch target; locale controls RTL/LTR. | تستخدم حقلاً أصلياً ذا تسمية وحالة وعناصر بلوحة المفاتيح وتركيزاً مرئياً وهدف لمس 44 بكسل مع اتجاه اللغة الصحيح.

## Audit Review

Scoped audit rows record Created, Applied, Failed, and Expired with safe IDs/result/time; bytes, paths, tokens, URLs, and secrets are excluded. | يسجل التدقيق أحداثاً آمنة مقيدة ويستبعد البايتات والمسارات والرموز والروابط والأسرار.

## Cleanup Review

Existing bounded staging cleanup now resolves the persisted replacement key; expiry is evaluated transactionally. Task 3.20 still owns scheduling. | يستخدم التنظيف المحدود مفتاح البديل المحفوظ ويُفحص الانتهاء داخل المعاملة، وتبقى الجدولة للمهمة 3.20.

## Migration Review

`0011_product_media_source_attempts.sql` adds attempts, audits, scoped foreign keys, checks, active uniqueness, and expiry indexing only. Prior migrations were not edited; the prior permission constraint already accepts the registry code. | يضيف ترحيل `0011` عناصر المهمة فقط دون تعديل الترحيلات السابقة.

## HTTP Boundary Review

No CRUD endpoints were added. The existing multipart route maps typed outcomes: forbidden 403, conflict 409, MIME mismatch 415, and infrastructure unavailable 503; established authentication covers 401/restricted sessions. | لم تُضف واجهات CRUD، ويحول مسار multipart النتائج المكتوبة مع بقاء المصادقة الحالية.

## Security Review

Trusted context supplies workspace/actor/session/permissions; scoped queries, server-derived keys, server content inspection, policy limits, expiry rejection, and safe logging protect the boundary. | يوفر السياق الموثوق السلطة وتحمي الاستعلامات المقيدة والمفاتيح المشتقة والتحقق والحدود والانتهاء والسجلات الآمنة المسار.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- Focused replacement/Product Media suites — passed; Product Media: 108 passed, one platform-permission skip.
- `npm.cmd run test:product-entry` — passed, 132/132.
- `npm.cmd test` — passed, including Product aggregate, task-review, Product Media, Product Entry, and Identity; Identity: 86/86.
- `npm.cmd run build` — passed; production compilation, TypeScript, and 22 static pages completed.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed with informational LF-to-CRLF warnings only.
- `npm.cmd run test:integration` — database preparation returned `IntegrationDatabasePreparationFailed`; local PostgreSQL and Docker service were unavailable, so assertions did not run.
- npm audit commands were not run, per explicit task instruction and absent per-run consent.

نجحت فحوص TypeScript وlint والاختبارات الوحدوية والبناء وDrizzle وسلامة الفروق. لم تصل اختبارات التكامل الحية إلى التأكيدات لعدم توفر PostgreSQL وDocker محلياً، ولم تُشغل أوامر audit دون موافقة.

## Manual QA Results

`/products/new` returned HTTP 200. The in-app browser reported no browser instance, so Arabic RTL and English LTR at 320/375/768/1024/1440 were not claimed. The task-owned dev server was stopped and its two logs removed. | استجاب المسار بالرمز 200، لكن لم تتوفر نسخة متصفح، لذلك لم يُدّع تنفيذ مصفوفة الأحجام، وأُوقف الخادم المؤقت وحُذفت سجلاته.

## Files Created

- `docs/05-Development/Product-Media-Source-Replacement.md`
- `docs/05-Development/Reports/QSC-Task-3.15.2-Final-Report.md`
- `domains/catalog/infrastructure/persistence/postgresql-media-source-attempt.repository.ts`
- `domains/catalog/media/domain/media-source-attempt.ts`
- `domains/catalog/media/repositories/media-source-attempt.repository.ts`
- `domains/catalog/media/services/replace-product-media-source.test.ts`
- `domains/catalog/media/services/replace-product-media-source.ts`
- `drizzle/0011_product_media_source_attempts.sql`

أُنشئت وثيقة المعمارية والتقرير ومفهوم محاولة المصدر ومستودعه وحالة الاستخدام واختبارها وترحيل `0011`.

## Files Modified

- `docs/05-Development/Mobile-Product-Entry-Two-Phase-UI.md`
- `docs/05-Development/Product-Entry-Media-Upload-Coordination.md`
- `docs/05-Development/Product-Media-Workflow-Orchestration.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- `domains/catalog/infrastructure/persistence/postgresql-product-media-workflow.repository.integration.test.ts`
- `domains/catalog/infrastructure/persistence/postgresql-product-media-workflow.repository.ts`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `domains/catalog/media/domain/product-media-keys.ts`
- `domains/catalog/media/infrastructure/local-product-media-storage.adapter.ts`
- `domains/catalog/media/repositories/product-media-workflow.repository.ts`
- `domains/catalog/media/services/product-media-workflow.test.ts`
- `domains/catalog/media/services/product-media-workflow.ts`
- `domains/catalog/product-entry/application/get-product-entry-submission-media-status.use-case.ts`
- `domains/catalog/product-entry/application/product-entry-execution-context.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.test.ts`
- `domains/catalog/product-entry/application/product-entry-media-api-response.ts`
- `domains/catalog/product-entry/application/product-entry-media-coordination.test.ts`
- `domains/catalog/product-entry/application/upload-product-entry-submission-media.use-case.ts`
- `domains/catalog/product-entry/components/ProductEntryWizard.tsx`
- `domains/catalog/product-entry/infrastructure/browser/http-product-entry-clients.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-media-workflow-coordinator.adapter.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-presentation.test.ts`
- `domains/catalog/product-entry/ports/product-entry-media-source-verifier.port.ts`
- `domains/catalog/product-entry/ports/product-entry-media-workflow-coordinator.port.ts`
- `domains/catalog/product-entry/presentation/product-entry-i18n.ts`
- `domains/catalog/product-entry/presentation/product-entry-presentation.types.ts`
- `domains/catalog/product-entry/presentation/product-entry-save.coordinator.ts`
- `domains/identity/domain/permission.test.ts`
- `drizzle/meta/_journal.json`

عُدلت ملفات سير العمل والتخزين والمخطط والتنسيق والعرض والتعريب والاختبارات والوثائق ضمن نطاق المهمة فقط.

## Files Deleted

None. Generated `.next` output was rebuilt; only two invocation-owned dev logs were removed. | لا توجد ملفات مصدر محذوفة؛ أُعيد بناء `.next` وحُذفت فقط سجلات التطوير المؤقتة.

## Files Intentionally Unchanged

Product Entry identity/plan, Smart Save/Product creation, ordering/cover policies, prior migrations, existing permission definition/constraint, dependencies, historical reports, and Task 3.20 scheduling. | بقيت هوية وخطة الإدخال والحفظ الذكي وسياسات الترتيب والغلاف والترحيلات السابقة والصلاحيات والاعتماديات والتقارير والجدولة دون تغيير.

## Known Limitations

Live PostgreSQL assertions require an available isolated test database; neither local PostgreSQL nor a startable Docker service was available. The browser backend exposed no instance, so visual/touch/mouse/keyboard checks across ten viewports remain pending. Scheduling is deferred to Task 3.20. Existing multipart buffering is unchanged. | تتطلب الاختبارات الحية قاعدة معزولة لم تتوفر، ولم تتوفر نسخة متصفح، وتبقى الجدولة للمهمة 3.20 وحد multipart كما هو.

## Required Confirmations

An independent reviewer must run integration tests against the guarded test database, review/apply `0011` only in non-production review, and complete RTL/LTR touch/mouse/keyboard/conflict/validation/success browser QA. This report is not self-approval. | يجب على مراجع مستقل تشغيل التكامل ومراجعة الترحيل وإكمال مصفوفة المتصفح. هذا التقرير ليس موافقة ذاتية.

## Summary

The smallest architecture-consistent fix replaced the placeholder with an authorized, tenant-safe persisted Source Attempt flow that validates/stages new bytes, atomically attaches them to the same operation, and resumes the existing workflow without replaying Product Entry Phase 1. | استبدل الإصلاح الأصغر المتوافق مع المعمارية العنصر المؤقت بمسار محفوظ ومصرح ومعزول يتحقق من المصدر ويربطه بالعملية نفسها دون إعادة المرحلة الأولى.

## Next Recommendation

Complete the environment-dependent confirmations, obtain independent Task 3.15.2 review/merge approval, then proceed to Task 3.16. | أكمل التأكيدات واحصل على المراجعة والدمج المستقلين قبل المهمة 3.16.

## Git and Review Integrity

No staging, commit, push, merge, restore, reset, or Git clean occurred. DEV-001 is invoked with both optional audit commands skipped. Evidence is published under `artifacts/task-reviews/3.15.2`; local names are `QSC-Task-3.15.2-Review.zip` and `.zip.sha256`, with report/ZIP/checksum exported to `Desktop/QSC-Reviews`. Since required integration cannot prepare its database, the manifest is expected to record `VerificationFailed` while preserving exact sanitized evidence. | لم تُنفذ كتابة في Git، وتُتجاوز أوامر audit الاختيارية، وتُنشر الأدلة في المسارات المذكورة. يُتوقع تسجيل `VerificationFailed` بسبب بيئة قاعدة البيانات مع حفظ الأدلة المنقحة الدقيقة.
