# QSC Task 3.22-A Planning-R1 Final Report

**Status:** ReadyForReview  
**Outcome:** **ReScopeRequired for Reservation Index** — no implementation is approved  
**Branch:** `docs/task-3.22-a-contract-remediation-planning`  
**Required ancestor / HEAD:** `260b4116749d3460b8262b3ccf034b8ba26d00a5`  
**Date:** 2026-09-01

## Objective and scope

This planning-only correction makes the Task 3.22-A server contracts implementation-precise while preserving Option D: minimum operation-specific management reads plus bounded effective semantic capabilities, no global manage-implies-view, and mutation-time reauthorization. No application code, tests, schema, migration, dependency, database operation, or Task 3.22 Presentation was implemented.

The original `QSC-Task-3.22-A-Planning-Final-Report.md` remains unchanged as historical evidence. This R1 report supersedes its implementation-readiness and roadmap decision.

## Source-proven findings and decisions

### 1. One canonical operational Product query

Current source exposes singular `CatalogSearchFilters.lifecycle`, passes that filter through `CatalogSearchRepositoryQuery`, and applies one lifecycle equality predicate in the PostgreSQL repository. R1 defines the smallest internal Catalog Query extension:

- `CatalogLifecycleScope = Exact | Allowed` inside the Catalog Query boundary;
- the repository query carries `filters: Omit<CatalogSearchFilters, "lifecycle">` plus required `lifecycleScope`;
- ordinary Catalog converts its existing singular filter to `Exact`, preserving its request contract, normalization, fingerprint serialization, cursor compatibility, and behavior;
- operational discovery supplies the fixed ordered set `Allowed(["Draft", "Published"])` and executes one PostgreSQL `IN` query;
- the current deterministic sort, unique Product-ID tie-breaker, keyset mechanics, `limit + 1`, Workspace predicate, Branch validation, and Listing projection are reused;
- a separate operational fingerprint binds purpose, normalized query, Branch when applicable, lifecycle set, sort, and visibility shape.

Two lifecycle queries, React merging, client filtering after pagination, a second repository, and a second search engine are prohibited. No schema change is required for this Catalog correction.

### 2. Exact Reservation keyset and persistence outcome

The future collection contract is now exact:

- Product required; statuses fixed to `Active` and `PartiallyFulfilled`;
- order `updatedAt DESC, reservationId DESC`;
- cursor payload `{ version: 1, fingerprint, updatedAt, reservationId }`;
- fingerprint binds purpose, Branch, Product, status set, and order;
- default limit 24, maximum 60, and `limit + 1` persistence fetch;
- canonical encoding/type/date/ID/fingerprint validation; invalid or cross-query cursor is `400 InvalidCursor`;
- cursor is a live keyset position, not a snapshot; a deleted source row does not invalidate an otherwise valid cursor;
- an empty first or later page returns `200` with `items: []` and `nextCursor: null`.

Source proves `InventoryRepository` has exact `findReservation(...)` but no collection method. The current index is exactly `(workspace_id, branch_id, product_id, status)`. It filters the fixed dimensions but contains neither ordering column and cannot provide one global updated-time order across the two statuses. The source also has no cap on actionable reservations per Product, so a response limit does not bound candidate scan/sort work.

The decision is therefore **RESCOPE REQUIRED FOR RESERVATION INDEX**. The contract records the implementation-ready candidate partial index:

```sql
(workspace_id, branch_id, product_id, updated_at DESC, reservation_id DESC)
WHERE status IN ('Active', 'PartiallyFulfilled')
```

This is a schema/migration change. R1 does not create or approve migration `0016`. A separate persistence planning gate must approve the migration, rollback, and PostgreSQL integration/`EXPLAIN (FORMAT JSON)` evidence before A1–A5 may begin.

### 3. Exact capability ownership

The endpoint `GET /api/operations/capabilities` belongs to **Identity Application**:

- use case: `domains/identity/application/get-operational-management-capabilities.use-case.ts` / `GetOperationalManagementCapabilitiesUseCase`;
- HTTP adapter: `domains/identity/infrastructure/http/operational-management-capability-route-handler.ts`;
- route: `app/api/operations/capabilities/route.ts`, delegation only;
- dependencies: type-only `TrustedActorContext` and type-only `PermissionCode`; no repositories, database, or Catalog/Branch/Inventory/Pricing/Reference Cost/Presentation imports.

Identity is selected because it already owns the permission registry, role semantics, and effective permission assignment. `shared/` is rejected as a business-policy dumping ground, Presentation is rejected as authorization owner, and a new Operations module is rejected because it has no independent model or persistence. The use case returns one fixed authorization-derived DTO and aggregates no resource data, so it is not a generic BFF. Domain-local resource actions remain in their owning Applications, and every write remains independently authoritative.

Capabilities are effective semantics. In particular, ordinary Reference Cost view is true only for the complete `pricing.view AND referenceCost.view` policy; Wholesale view requires both Pricing and Wholesale view; Owner semantics use the existing effective authority; and management booleans use the approved operation-specific manage policies. No raw permissions, role, Workspace ID, actor ID, or allowed Branch IDs are returned.

### 4. Shared Product pricing concurrency

Retail and Wholesale are Catalog Product columns and share `catalog_products.revision`. The Workspace pricing response now exposes one response-level `productRevision`, including when either price is `NotConfigured`. Existing Retail/Wholesale mutation `expectedRevision` must come from that shared token.

A successful Retail write invalidates the previously read Wholesale token, and a Wholesale write invalidates Retail. Success reloads the authoritative management state; `409 Conflict` requires reload, review of both fields, and a new explicit submission. Reference Cost retains its own `referenceCostRevision`; absent Reference Cost uses zero only under the existing row-creation contract. Reference Cost writes and Product price writes do not invalidate each other's tokens.

Ordinary Reference Cost visibility requires both `pricing.view` and `referenceCost.view`. The bounded `referenceCost.manage` management read remains separate and does not broaden ordinary Catalog, Pricing, or sharing disclosure.

### 5. Inventory disclosure preserved

Availability-only responses contain only semantic `InStock`/`OutOfStock`. Exact quantities require `inventory.quantity.view`. Mutation-only actors with neither read permission receive no balance or availability. Every first execution and idempotent replay is projected against the current trusted context in Application; React filtering is prohibited.

## Implementation slices and gate

- A1: resolved Identity Application capability ownership and Domain-local resource actions.
- A2: resolved one-query Draft+Published Catalog discovery and Listing state.
- A3: exact Reservation cursor contract resolved; persistence is re-scope-gated on the partial ordered index migration.
- A4: resolved shared Product pricing concurrency and independent Reference Cost revision.
- A5: Inventory disclosure hardening contract unchanged.

Because A3 requires an unapproved migration, **none of A1–A5 is Approved Next Implementation**. Task 3.22 Presentation remains Planned / blocked and no later task is approved.

## Verification

Planning-only verification covers branch/HEAD/ancestor integrity, `git diff --check`, `git status --short`, `git diff --stat`, documentation links/UTF-8, and focused source/document assertions for all four R1 findings and prohibited scope. Full application tests, npm audit, database operations, migrations, and the standard full-suite review command were prohibited and were not run.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.22-A-Planning-R1-Final-Report.md`
- `artifacts/task-reviews/3.22-A-Planning-R1/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R1-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R1-Review.zip.sha256`

## Files Modified

- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Architecture Changes

No implemented architecture change. The future contract places the global effective capability projection precisely in Identity Application, keeps Domain resource actions local, and extends only the internal Catalog Query repository shape. Option D and existing Domain ownership remain unchanged. The required Reservation index is identified but not approved or implemented.

## Summary

Planning-R1 resolves operational lifecycle search, capability ownership, effective Reference Cost visibility, and Product-owned Pricing concurrency. It also replaces the previous unsupported no-migration claim with the source-proven outcome `ReScopeRequired for Reservation Index`. Status is `ReadyForReview`; this describes artifact readiness, not implementation approval.

Repository-local review artifacts:

- `artifacts/task-reviews/3.22-A-Planning-R1/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R1-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R1-Review.zip.sha256`

Exported review artifacts:

- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R1-Final-Report.md`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R1-Review.zip`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R1-Review.zip.sha256`

## Next Recommendation

Submit R1 for independent review, then create a separate bounded planning gate for the partial actionable-Reservation index/migration, including rollback and query-plan evidence. Do not implement A1–A5 or Task 3.22 Presentation until that persistence gate is approved and the roadmap explicitly names Task 3.22-A as Approved Next Implementation.

## التقرير العربي

**الحالة:** `ReadyForReview`  
**النتيجة:** **تتطلب إعادة تحديد النطاق لفهرس الحجوزات** — لا يعتمد أي تنفيذ.

يحفظ التصحيح الخيار D: قراءات إدارة محدودة خاصة بالعملية وقدرات دلالية فعلية مشتقة من الخادم، دون قاعدة عامة بأن الإدارة تستلزم العرض، مع إعادة تفويض كل طفرة. لم تنفذ شيفرة أو اختبارات أو مخطط أو ترحيل أو اعتماد أو عملية قاعدة بيانات أو واجهة للمهمة 3.22، وبقي تقرير التخطيط الأصلي دليلاً تاريخياً دون تعديل.

يحسم R1 ما يلي:

- يمدد شكل Catalog Query الداخلي بـ`CatalogLifecycleScope` ويصدر استعلام PostgreSQL واحداً لـDraft وPublished مع الترتيب الحتمي والمؤشر الموحد، مع بقاء عقد الكتالوج العادي وبصمته ومؤشره دون تغيير.
- يحدد قائمة الحجوزات بترتيب `updatedAt DESC, reservationId DESC` وبصمة مرتبطة بالفرع والمنتج والحالتين، وحد افتراضي 24 وأقصى 60، وسلوك مؤشر حي وصفحة فارغة صريحة.
- يثبت أن الفهرس الحالي يرشح فقط ولا يغطي عمودي الترتيب، وأن المصدر لا يحد عدد الحجوزات القابلة للفعل للمنتج. لذلك تحتاج A3 فهرساً جزئياً مرتباً وترحيلاً مستقلاً، ولا يعتمد R1 الترحيل `0016`.
- يضع `GetOperationalManagementCapabilitiesUseCase` في Identity Application دون مستودعات أو قواعد أعمال في معالج HTTP، وتبقى أفعال الموارد في تطبيقات مجالاتها.
- يجعل القدرات دلالية فعلية؛ فيتطلب عرض التكلفة المرجعية العادي `pricing.view` و`referenceCost.view` معاً، ولا يعيد صلاحيات خاماً أو دوراً أو معرفات مساحة العمل/الممثل/الفروع.
- يكشف `productRevision` واحداً مشتركاً للتجزئة والجملة؛ فتعديل أحدهما يبطل رمز الآخر، بينما تبقى مراجعة التكلفة المرجعية مستقلة.
- يحفظ كشف المخزون الدلالي فقط لممثل الإتاحة، والكميات الدقيقة لممثل الكمية، وإعادة ترشيح كل نتيجة وإعادة idempotent وفق السياق الحالي.

### الملفات المنشأة

- تقرير تخطيط-R1 هذا وحزمة المراجعة وZIP وملف SHA-256 المحددة أعلاه.

### الملفات المعدلة

- عقد إدارة العمليات، وخارطة الطريق الحالية، واستمرار Sprint 03.

### الملفات المحذوفة

لا شيء.

### تغييرات المعمارية

لا تغيير منفذاً. يحدد العقد المستقبلي ملكية Identity Application بدقة ويحفظ ملكية المجالات والخيار D. يحدد الفهرس المطلوب دون اعتماده أو تنفيذه.

### الملخص

أصبحت العقود الوظيفية دقيقة، لكن دليل المصدر يمنع ادعاء كفاية الفهرس الحالي. لذلك تكون نتيجة التخطيط `ReScopeRequired` مع جاهزية الأدلة للمراجعة المستقلة، ولا يوجد تنفيذ تالٍ معتمد.

### التوصية التالية

قدم R1 للمراجعة المستقلة، ثم أنشئ بوابة تخطيط محدودة للفهرس الجزئي وترحيله وخطة التراجع وأدلة `EXPLAIN`. لا تنفذ A1–A5 أو واجهة 3.22 قبل اعتماد بوابة الاستمرارية وتحديث الخارطة صراحةً.
