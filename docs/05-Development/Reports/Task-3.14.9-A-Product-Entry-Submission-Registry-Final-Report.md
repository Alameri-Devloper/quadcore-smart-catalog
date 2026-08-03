# Task 3.14.9-A — Product Entry Submission Registry and Transactional Product Save — Final Report

**Date:** 2026-08-03

**Status:** ReadyForReview before the single automated review-bundle invocation

**Task ID:** `3.14.9-A`

## Summary | الملخص

Implemented Phase 1 Product Entry integration with an independent Workspace-scoped submission registry, deterministic request fingerprints, persisted media-operation plans, exact Smart Save receipts, transactional Product/Submission/Plan/Audit persistence, Create/Edit authorization, trusted server context, cost-redacted retrieval, and thin POST/GET routes. Product Media upload and workflow execution remain outside this task. | نُفذت المرحلة الأولى لتكامل إدخال المنتج عبر سجل طلبات مستقل ومقيد بمساحة العمل، وبصمة طلب حتمية، وخطة عمليات وسائط محفوظة، وإيصال دقيق لنتيجة Smart Save، ومعاملة واحدة لحفظ المنتج والطلب والخطة والتدقيق، مع صلاحيات الإنشاء والتعديل وسياق خادم موثوق وإخفاء التكلفة ومساري POST وGET رفيعين. بقي رفع الوسائط وتشغيل دورتها خارج المهمة.

## Root Cause Analysis | تحليل السبب الجذري

The pre-change repository was healthy: baseline `npm.cmd test` and `npm.cmd run db:check` passed. The failure was missing integration architecture, not a regression: no Product Entry Submission model, canonical Phase 1 request fingerprint, media-plan registry, audit port/table, transaction-composing Unit of Work, trusted API context adapter, or application use cases existed. The existing PostgreSQL Product repository also always opened its own transaction, so it could not safely participate in the required larger Application-owned transaction. | كانت الشجرة سليمة قبل التغيير ونجحت الفحوص الأساسية. كان السبب نقص طبقة التكامل وليس عطلًا سابقًا: لم توجد نماذج الطلب أو البصمة أو سجل خطة الوسائط أو التدقيق أو Unit of Work أو سياق API الموثوق أو حالات الاستخدام. كما كان مستودع Product يفتح معاملته الخاصة دائماً، فلم يكن قابلاً للتركيب داخل معاملة Application الأشمل.

The smallest safe fix was to add the approved adjacent Product Entry boundary and make the existing Product repository optionally transaction-scoped without changing its port or standalone behavior. Product Aggregate and Product Media Workflow code were not changed. | كان أصغر إصلاح آمن هو إضافة حد Product Entry المجاور المعتمد وتمكين مستودع Product الحالي من استخدام معاملة يملكها المستدعي دون تغيير عقده أو سلوكه المستقل. لم يتغير Product Aggregate ولا Product Media Workflow.

## Architecture Discovery and Reuse | اكتشاف المعمارية وإعادة الاستخدام

- Reused the canonical `Product`, `ProductRepository`, optimistic `ProductRevision`, `SmartSaveProduct`, publication requirements, Product Code rules, Drizzle schema conventions, guarded `TEST_DATABASE_URL`, and DEV-001 review tooling.
- Added Product Entry Domain/Application/Ports/Repositories/Infrastructure folders under the existing `domains/catalog/product-entry` boundary; no folder was renamed.
- Application coordinates authorization, fingerprinting, Product ownership, policy resolution, transaction decisions, Smart Save, audit, and result mapping.
- PostgreSQL repositories contain mapping/data access only and never call one another.
- أُعيد استخدام Product وSmart Save وعقود الحفظ والمراجعة وسياسة النشر وقواعد Product Code وأنماط Drizzle وحارس قاعدة الاختبار وأداة المراجعة الحالية، وبقي التنسيق في Application والوصول للبيانات في Infrastructure دون استدعاء مستودع لمستودع آخر.

## Files Created | الملفات المنشأة

- `app/api/catalog/product-entry-submissions/route.ts`
- `app/api/catalog/product-entry-submissions/[submissionId]/route.ts`
- `docs/05-Development/Product-Entry-Submission-Registry.md`
- `docs/05-Development/Reports/Task-3.14.9-A-Product-Entry-Submission-Registry-Final-Report.md`
- `domains/catalog/product-entry/application/get-product-entry-submission.use-case.ts`
- `domains/catalog/product-entry/application/product-entry-api-response.test.ts`
- `domains/catalog/product-entry/application/product-entry-api-response.ts`
- `domains/catalog/product-entry/application/product-entry-command-validator.ts`
- `domains/catalog/product-entry/application/product-entry-command.ts`
- `domains/catalog/product-entry/application/product-entry-execution-context.ts`
- `domains/catalog/product-entry/application/product-entry-request-fingerprint.test.ts`
- `domains/catalog/product-entry/application/product-entry-request-fingerprint.ts`
- `domains/catalog/product-entry/application/submit-product-entry.use-case.test.ts`
- `domains/catalog/product-entry/application/submit-product-entry.use-case.ts`
- `domains/catalog/product-entry/domain/product-entry-media-plan.ts`
- `domains/catalog/product-entry/domain/product-entry-submission.test.ts`
- `domains/catalog/product-entry/domain/product-entry-submission.ts`
- `domains/catalog/product-entry/infrastructure/configured-product-publication-requirements-resolver.ts`
- `domains/catalog/product-entry/infrastructure/environment-product-entry-trusted-context.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-context-adapters.test.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-random-identity-allocator.ts`
- `domains/catalog/product-entry/infrastructure/product-entry-server-runtime.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-audit.repository.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-media-plan.repository.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-submission.repository.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry-unit-of-work.ts`
- `domains/catalog/product-entry/infrastructure/persistence/postgresql-product-entry.integration.test.ts`
- `domains/catalog/product-entry/ports/product-entry-clock.port.ts`
- `domains/catalog/product-entry/ports/product-entry-identity-allocator.port.ts`
- `domains/catalog/product-entry/ports/product-entry-trusted-context.port.ts`
- `domains/catalog/product-entry/ports/product-entry-unit-of-work.port.ts`
- `domains/catalog/product-entry/repositories/product-entry-audit.repository.ts`
- `domains/catalog/product-entry/repositories/product-entry-media-plan.repository.ts`
- `domains/catalog/product-entry/repositories/product-entry-submission.repository.ts`
- `drizzle/0004_product_entry_submission_registry.sql`
- `drizzle/0005_product_entry_submission_constraint_hardening.sql`
- `drizzle/meta/0004_snapshot.json`
- `drizzle/meta/0005_snapshot.json`

## Files Modified | الملفات المعدلة

- `docs/05-Development/README.md`
- `domains/catalog/infrastructure/persistence/postgresql-product.repository.ts`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `drizzle/meta/_journal.json`
- `package.json`
- `tsconfig.integration.json`

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Files Intentionally Unchanged | الملفات التي تُركت دون تغيير عمداً

- Product Aggregate, Product lifecycle, Product domain events, and Product repository port.
- Product Media Workflow domain, application services, repositories, storage, image processing, and media paths.
- Product Entry React components, browser drafts, local-draft behavior, and all UI routes/pages.
- Existing migrations `0000`–`0003`, `package-lock.json`, `.env.example`, and dependency versions.
- لم تتغير حدود Product أو Media أو الواجهة أو المسودات المحلية أو الاعتمادات أو الترحيلات السابقة.

## Architecture Changes | تغييرات البنية

No architecture redesign or new dependency was introduced. The approved Product Entry Submission boundary was implemented adjacent to Product and Product Media. The only existing Infrastructure adjustment lets `PostgreSqlProductRepository` reuse a caller-owned Drizzle transaction; its public `ProductRepository` contract and default standalone transaction/read-snapshot behavior remain unchanged. | لم يحدث إعادة تصميم معماري أو إضافة اعتماد. نُفذ حد Product Entry Submission المجاور، والتعديل الوحيد في البنية الحالية يسمح لمستودع Product باستخدام معاملة Drizzle يملكها المستدعي مع بقاء العقد والسلوك المستقل كما هما.

## Domain and Fingerprint | المجال والبصمة

- Submission identity is `workspaceId + submissionId`.
- Status transitions are `Claimed → ProductSaved → Completed/PartiallyCompleted`, with `PartiallyCompleted → Completed` allowed for the later Media phase.
- Create claims have no Product ID; Edit claims require one; every saved status requires Product ID and safe non-negative Revision.
- Request fingerprints are lowercase SHA-256 over deterministic UTF-8 canonical serialization. Object keys are sorted, arrays preserve order, unsupported/cyclic/non-finite/negative-zero values are rejected, and server timestamps/file bytes are excluded.
- The normalized request contract makes omitted optional fields explicit as `null` or a documented default, while the generic canonicalizer distinguishes an omitted key from a present `null` key.
- Media operations use contiguous zero-based sequence. Add has no existing Media target and requires source hash/length; Replace requires target and source; Remove requires target and forbids source fields. `finalOrder` is independent and persisted.
- تفرض نماذج المجال الهوية والحالات والطوابع الآمنة، وتستخدم البصمة SHA-256 حتمية، وتحافظ على ترتيب عمليات الوسائط، ويُحفظ `finalOrder` مستقلاً.

## Application Use Cases and API | حالات الاستخدام وواجهة API

`SubmitProductEntryUseCase` validates, authorizes, fingerprints, prepares immutable inputs, verifies Edit ownership, claims idempotently, persists the plan, resolves publication requirements, allocates identity when required, executes Smart Save, appends audit records, and marks Product saved. It returns explicit Accepted, fingerprint conflict, Product not found, Revision conflict, Product ID conflict, Product Code conflict, Forbidden, or Invalid Request results. | تنسق حالة الإرسال التحقق والتفويض والبصمة والملكية والمطالبة والحفظ والتدقيق، وتعيد نتائج صريحة دون generic success flag.

`GetProductEntrySubmissionUseCase` performs a Workspace-scoped read, reloads Product truth, returns the plan ordered by sequence, excludes storage paths, and hides wholesale/reference cost without `catalog.product.reference-cost.read`. | تعيد حالة القراءة حقيقة Product والخطة المرتبة وتمنع المسارات وتخفي التكلفة دون صلاحيتها.

Routes:

```text
POST /api/catalog/product-entry-submissions
GET  /api/catalog/product-entry-submissions/:submissionId
```

The routes only translate HTTP/application results. Workspace, actor, and permissions come from a trusted environment adapter, never from the request body. Publication policy configuration is selected by exact Workspace+Catalog scope. | تظل المسارات رفيعة، وتأتي الهوية والصلاحيات من محول خادم موثوق لا من body، وتُحل سياسة النشر بنطاق Workspace+Catalog دقيق.

## Persistence and Migration Review | مراجعة الحفظ والترحيل

### `0004_product_entry_submission_registry`

- Creates `catalog_product_entry_submissions`, `catalog_product_entry_submission_media_operations`, and `catalog_product_entry_audit_records`.
- Adds composite Workspace primary/foreign keys, Product and Media Workflow linkage, `RESTRICT` deletes, sequence/identity uniqueness, Workspace-first indexes, status/mode/hash/type checks, safe numeric bounds, timestamp order, operation-specific nullability, and an independent `final_order` column.

### `0005_product_entry_submission_constraint_hardening`

- Generated after manual SQL review identified that direct SQL could create Edit without Product linkage even though the Domain rejected it.
- Replaces the mode/linkage check, adds non-empty submission/operation checks, and requires the saved receipt to be a JSON object.

Both migrations were generated with the existing Drizzle tooling and passed `db:check`. Integration migration ran only through the guarded `TEST_DATABASE_URL`; `npm.cmd run db:migrate` was not run against the application database. No unsafe delete cascade was added and no file bytes are stored. | أُنشئ الترحيلان بأداة Drizzle، وأضيف التقوية بعد المراجعة اليدوية، ونجح الفحص. طُبقت الترحيلات في اختبار التكامل فقط على قاعدة الاختبار المحمية، ولم يُشغل ترحيل على قاعدة التطبيق.

## Transaction-Boundary Review | مراجعة حد المعاملة

One Application-facing Unit of Work creates one PostgreSQL transaction and passes the same handle to Product, Submission, Media Plan, and Audit adapters. New success commits claim + plan + Smart Save Product + Product children + audit + ProductSaved receipt/linkage. Expected Product ID/Code/Revision outcomes return an explicit Rollback decision; Infrastructure converts that decision into a rollback without exposing an exception to the caller. Unexpected errors propagate after rollback. Replays and fingerprint conflicts are no-write commits. No nested independent Product transaction, file I/O, multipart processing, Media storage, or Product Media Workflow call occurs. | تنشئ Unit of Work معاملة واحدة وتشارك المقبض نفسه بين جميع المحولات. تُرجع التعارضات قرار Rollback صريحاً، وتُعاد الأخطاء غير المتوقعة بعد التراجع، ولا توجد معاملة متداخلة أو آثار ملفات أو تشغيل Media.

## Audit Review | مراجعة التدقيق

Successful Phase 1 saves append four in-transaction records: Submission claimed, Product Create/Edit requested, Product saved, and lifecycle outcome. Records contain Workspace, actor, submission, Product, stable result code, and timestamp only. They contain no request payload, reference cost, secrets, tokens, file bytes, or paths. | يسجل النجاح أربعة أحداث داخل المعاملة بالمعرفات والأكواد والوقت فقط دون payload أو تكلفة أو أسرار أو ملفات أو مسارات.

## Product Code Allocation | تخصيص Product Code

No allocator existed. The current Domain allows a Draft without Product Code. A new Application port and UUID-based adapter are therefore used only for Create when the resolved publication policy requires Product Code and the draft omits it. The adapter is called within the Unit of Work; Workspace-wide PostgreSQL uniqueness is authoritative, a collision is typed and rolls back, and no unprotected `MAX + 1` is used. | أضيف منفذ واضح لأن allocator لم يكن موجوداً، ويُستخدم داخل المعاملة عند الحاجة فقط، مع تفرد Workspace وعدم استخدام `MAX + 1`.

## Security and Tenant-Isolation Review | مراجعة الأمن وعزل المستأجر

- Every repository lookup and mutation is Workspace-scoped.
- Composite FKs prevent cross-Workspace Product, Submission, Plan, Audit, and future Media Workflow linkage.
- Edit ownership is checked inside the transaction before claim; a foreign Product returns the same sanitized Product-not-found result as a missing Product.
- Submission IDs may repeat independently across Workspaces; no lookup falls back to an unscoped identity.
- Trusted identity is separated from payload. Unknown body fields, including attempted body identity, are rejected.
- GET cost disclosure requires a separate permission and storage references are omitted.
- Routes expose stable codes and never return internal exception/database/OS messages.
- No credentials or real environment values were added to source, tests, documentation, or evidence.
- كل الاستعلامات والقيود مقيدة بمساحة العمل، وتُرفض الروابط العابرة للمساحات، وتبقى الهوية الموثوقة خارج payload، وتُخفى التكلفة والمسارات والأخطاء الداخلية.

## Verification Results | نتائج التحقق

### Baseline before changes

- `npm.cmd test`: Passed — 106 Product tests, 45 review-tool tests, and 95 Product Media tests (94 passed, 1 existing Windows permission skip).
- `npm.cmd run db:check`: Passed.

### Migration generation and review

- `npm.cmd run db:generate -- --name=product_entry_submission_registry`: Passed; generated `0004` and snapshot.
- `npm.cmd run db:generate -- --name=product_entry_submission_constraint_hardening`: Passed; generated `0005` and snapshot after manual constraint review.
- Repeated `npm.cmd run db:check`: Passed.

### Final implementation verification

- `npx.cmd tsc --noEmit`: Passed.
- `npx.cmd tsc --project tsconfig.integration.json`: Passed.
- `npm.cmd run lint`: Passed with zero warnings.
- `npm.cmd test`: Passed — 106 Product tests, 45 review-tool tests, 95 Product Media tests (94 passed, 1 existing Windows link-permission skip), and 33 Product Entry tests; 279 total tests, 278 passed, 1 existing platform skip.
- `npm.cmd run test:integration`: Passed — 60/60 tests across 12 suites, sequentially, against the guarded dedicated test database.
- `npm.cmd run build`: Passed; both Product Entry API routes compiled as dynamic Next.js routes.
- `npm.cmd run db:check`: Passed.
- `git diff --check`: Passed; only Git line-ending notices were printed.

The first integration attempt compiled but could not connect because local PostgreSQL was stopped (`ECONNREFUSED`); no database assertion failed. Docker Desktop and the existing project PostgreSQL container were then started through the documented workflow, health was confirmed, and the complete final integration run passed 60/60. | فشلت المحاولة الأولى للاتصال فقط لأن PostgreSQL المحلي كان متوقفاً، ثم شُغلت الحاوية الموثقة وتأكدت صحتها ونجحت النتيجة النهائية كاملة.

`npm audit`, `npm audit --omit=dev`, audit fixes, dependency installation, and dependency upgrades were not run because Task 3.14.9-A explicitly forbids audit without separate user approval. The automated review invocation must record both optional audit commands as intentionally skipped. | لم يُشغل تدقيق npm أو أي إصلاح أو تغيير اعتماد لأن المهمة تمنعه دون موافقة مستقلة، وستسجل الحزمة الأمرين الاختياريين كمتجاوزين عمداً.

## Test Coverage | تغطية الاختبارات

Unit/foundation coverage includes valid/invalid Submission invariants, timestamp immutability, legal/illegal transitions, Workspace isolation, canonical fingerprints and every required sensitivity, Create Draft/Published outcomes, Edit, auto-archive, idempotency, fingerprint conflict, duplicate prevention, Revision/ID/Code rollback, Audit/Plan/Product failure rollback, authorization, foreign ownership, no Media/storage calls, ordered GET, cost redaction, trusted context, publication configuration scope, and HTTP mappings. | تشمل اختبارات الوحدة جميع ثوابت الطلب والبصمة والحفظ والتعارض والتراجع والتفويض والعزل وعدم تشغيل الوسائط والقراءة وإخفاء التكلفة والسياق الموثوق وHTTP.

PostgreSQL coverage includes one-time claim, concurrent same/different fingerprints, cross-Workspace identical IDs, atomic four-boundary commit, forced Audit rollback, Revision rollback, foreign Product rejection, operation identity/sequence uniqueness, independent final order, mapping/rehydration, non-empty/linkage constraints, and migration table availability. | تشمل اختبارات PostgreSQL التزامن والمعاملة والتراجع والعزل والتفرد والترتيب وإعادة البناء وصلاحية الترحيل.

## Known Limitations | القيود المعروفة

- Phase 2 multipart upload, double source verification, Media idempotency key, workflow resolve/create/resume, file staging, and Product Media execution are intentionally absent.
- The runtime uses a fail-closed environment-backed trusted context because the repository has no authentication provider yet. Deployment must supply trusted Workspace/actor/permission configuration and exact Workspace+Catalog publication requirements before the routes become available.
- `Completed` and `PartiallyCompleted` exist in the Domain/schema for resumability but Task 3.14.9-A only writes `ProductSaved`.
- No UI, local draft recovery, cleanup/retry worker, or scheduler was added.
- The existing Windows symlink/junction permission test remains the only skipped test for the same platform reason.
- لا تشمل المهمة الرفع أو تشغيل Media أو الواجهة أو الاستعادة المحلية أو العمال الخلفيين، ويتطلب تشغيل API إعداد سياق موثوق وسياسة نشر، وتبقى حالات اكتمال Media للمرحلة التالية.

## Review Bundle | حزمة المراجعة

This report is the exact source report for one `3.14.9-A` DEV-001 invocation. The invocation remains after report creation and must skip only `audit-runtime` and `audit-full`, preserve exact source files, sanitize evidence only, verify `overallStatus: ReadyForReview` and `gitIntegrity.passed: true`, publish repository-local ZIP/SHA-256 artifacts, export the report/ZIP/SHA-256 set to Desktop, and perform no Git write. | هذا التقرير هو المصدر الدقيق لاستدعاء مراجعة واحد، ويجب أن يتجاوز تدقيقي npm الاختياريين فقط، ويحفظ المصدر كما هو، وينقح الأدلة فقط، ويتحقق من الجاهزية وسلامة Git، وينشر الملفات محلياً وعلى سطح المكتب دون كتابة Git.

## Status | الحالة

Implementation, migration review, transaction review, tenant/security review, unit verification, PostgreSQL integration verification, build verification, and Drizzle verification are complete. Status is `ReadyForReview` before the single automated review-bundle invocation. | اكتمل التنفيذ ومراجعات الترحيل والمعاملة والأمن والعزل وجميع الفحوص، والحالة `ReadyForReview` قبل استدعاء الحزمة الآلية الوحيد.

## Next Recommendation | التوصية التالية

After reviewing this implementation and its generated bundle, proceed with Task 3.14.9-B for Phase 2 upload coordination, double source verification, media idempotency, resolve-or-create workflow behavior, and resume handling. Do not begin UI/local-draft work until the later 3.14.9-C/D tasks. | بعد مراجعة التنفيذ والحزمة، انتقل إلى 3.14.9-B لتنسيق الرفع والتحقق المزدوج وIdempotency للوسائط وإنشاء/استكمال الدورة، ولا تبدأ الواجهة أو المسودات المحلية قبل المهمتين C/D.
