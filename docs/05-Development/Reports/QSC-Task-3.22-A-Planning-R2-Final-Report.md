# QSC Task 3.22-A Planning-R2 Final Report

**Status:** ReadyForReview  
**Outcome:** **ReScopeRequired for Reservation Query Performance Evidence** — no implementation approved  
**Branch:** `docs/task-3.22-a-contract-remediation-planning`  
**Required ancestor / HEAD:** `260b4116749d3460b8262b3ccf034b8ba26d00a5`  
**Date:** 2026-09-01

## Objective and scope

This focused planning correction removes the unsupported Planning-R1 conclusion that a Reservation index migration is already proven necessary. It preserves the exact Reservation API/keyset contract and every other Planning-R1 architecture, authorization, Pricing, Reference Cost, Inventory, and slicing decision.

No application source, test, schema, migration, dependency, database, or Git state was changed. The original Planning and Planning-R1 reports remain unchanged as historical evidence; this R2 report supersedes only the R1 persistence conclusion.

## Corrected persistence finding

Source still proves:

- `InventoryRepository` has `findReservation(...)` but no collection method;
- the current index is exactly `(workspace_id, branch_id, product_id, status)`;
- the index lacks `updated_at` and `reservation_id`;
- the approved query requires Product scope, `Active` plus `PartiallyFulfilled`, and `ORDER BY updatedAt DESC, reservationId DESC`.

The missing order columns mean the current index cannot itself deliver the keyset order. They do not prove PostgreSQL requires another index. PostgreSQL may use the existing index for filtering, sort the candidate rows, and return `limit + 1`. Whether this is acceptable depends on representative cardinality and a measured plan. Current source and planning evidence contain no representative `EXPLAIN` result proving either sufficiency or a material need for an index.

The corrected status is therefore **ReScopeRequired for Reservation Query Performance Evidence**, not ReScopeRequired for a proven index migration.

## Reservation contract preserved

- Required Product and exact Workspace/Branch/Product scoping.
- Actionable statuses `Active` and `PartiallyFulfilled` only.
- Order `updatedAt DESC, reservationId DESC` with Reservation ID as the unique tie-breaker.
- Cursor `{ version: 1, fingerprint, updatedAt, reservationId }` bound to purpose, Branch, Product, statuses, and order.
- Default limit 24, maximum 60, persistence fetch `limit + 1`.
- Canonical cursor validation; malformed or cross-query cursor returns `400 InvalidCursor`.
- Live keyset semantics, no offset pagination.
- Empty first or later page returns `200 { items: [], nextCursor: null }`.

## Candidate Optimization only

The following partial ordered index remains documented solely as a **Candidate Optimization**:

```sql
(workspace_id, branch_id, product_id, updated_at DESC, reservation_id DESC)
WHERE status IN ('Active', 'PartiallyFulfilled')
```

It is not an approved migration, required migration, or proven requirement. Migration `0016` remains unapproved and was not created.

## Task 3.22-A Reservation Persistence / Query Performance Planning Gate

The next bounded gate must evaluate the exact approved query first against the current schema/index using an isolated PostgreSQL test database and generated, non-sensitive, representative data. Production is prohibited.

Evidence uses `EXPLAIN (FORMAT JSON)` and, when project verification policy permits execution, preferably `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. The Candidate Optimization is compared only if current-plan evidence identifies a material concern.

The gate evaluates at minimum:

- Workspace, Branch, Product, and actionable-status selectivity;
- candidate rows before `LIMIT` and expected actionable Reservations per Product;
- scan type, rows scanned, Sort presence/cost/memory, and effective LIMIT behavior;
- estimated versus actual rows when `ANALYZE` is allowed;
- first page and representative deep-keyset pagination;
- plan stability at low, typical, and high current-approved cardinalities; and
- added-index write amplification, storage, vacuum, and maintenance cost.

It must avoid arbitrary microsecond thresholds without an accepted project budget. It must not create an index merely for possible future usefulness, and it must not accept a clearly pathological plan merely to avoid persistence.

The gate returns exactly one result:

1. **EXISTING INDEX SUFFICIENT:** add only the collection repository query; no schema change and no migration `0016`.
2. **INDEX REQUIRED:** only material query-plan/performance evidence permits a later separately approved smallest-index migration.
3. **DECISION REQUIRED:** representative evidence cannot be produced reliably; A3 remains blocked.

Planning-R2 chooses none of these evidence outcomes.

## Other Planning-R1 decisions preserved

- Option D bounded hybrid; no global manage-implies-view.
- Identity Application owns the repository-free global effective capability projection.
- Domain Applications own resource `allowedActions`; every mutation reauthorizes.
- Operational Product discovery uses one canonical Draft+Published Catalog Query result with ordinary Catalog non-regression.
- Retail and Wholesale share Product revision; Reference Cost has an independent revision.
- Ordinary Reference Cost view requires `pricing.view` and `referenceCost.view` together.
- Inventory availability-only disclosure is semantic; quantities require quantity view; mutation-only responses disclose neither; idempotent replay uses current-context projection.
- A1–A5 slicing remains unchanged.

## Roadmap decision

Task 3.22-A remains not implementation-approved pending the persistence/query-performance gate. Task 3.22 Presentation remains Planned / blocked and not implementation-approved. There is no Approved Next Implementation and no later task is approved.

## Verification

Planning-only verification covers branch/HEAD/ancestor integrity, `git diff --check`, `git status --short`, `git diff --stat`, UTF-8/relative links, exact current-index source evidence, the corrected performance-evidence language, all three allowed gate outcomes, Candidate Optimization status, preservation of R1 decisions, and documentation-only scope.

Full application tests, npm audit, database operations, migrations, and the standard full-suite review command were prohibited and were not run.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.22-A-Planning-R2-Final-Report.md`
- `artifacts/task-reviews/3.22-A-Planning-R2/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R2-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R2-Review.zip.sha256`

## Files Modified

- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Architecture Changes

No implemented architecture change. Planning-R2 changes only the persistence decision state: the existing-index plan and Candidate Optimization must be compared through evidence before any schema decision. Every non-persistence Planning-R1 architectural decision remains unchanged.

## Summary

Planning-R2 corrects an inference error without weakening the performance gate. Missing ordering columns establish a measurable risk, not automatic proof of migration need. The next gate must test the current plan first and select exactly one evidence-based outcome.

Repository-local review artifacts:

- `artifacts/task-reviews/3.22-A-Planning-R2/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R2-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-R2-Review.zip.sha256`

Exported review artifacts:

- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R2-Final-Report.md`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R2-Review.zip`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-R2-Review.zip.sha256`

## Next Recommendation

Submit Planning-R2 for independent review. If accepted, perform only the Task 3.22-A Reservation Persistence / Query Performance Planning Gate. Do not implement A1–A5, create migration `0016`, add the Candidate Optimization, or begin Task 3.22 Presentation.

## التقرير العربي

**الحالة:** `ReadyForReview`  
**النتيجة:** **تتطلب إعادة تحديد النطاق لأدلة أداء استعلام الحجوزات** — لا يعتمد أي تنفيذ.

يصحح R2 الاستنتاج غير المدعوم في R1 بأن ترحيل فهرس الحجوزات أصبح ضرورة مثبتة. يحفظ عقد المؤشر الدقيق وكل قرارات R1 الأخرى دون تغيير، وتبقى تقارير التخطيط وR1 أدلة تاريخية غير معدلة.

يثبت المصدر أن الفهرس الحالي هو `(workspace_id, branch_id, product_id, status)` وأنه لا يحتوي `updated_at` أو`reservation_id`. لكنه يستطيع ترشيح المرشحين ثم يفرزهم PostgreSQL ويعيد `limit + 1`. لا يثبت غياب عمودي الترتيب وحده أن الأداء غير مقبول، ولا توجد أدلة `EXPLAIN` تمثيلية تحسم القرار.

يبقى الفهرس الجزئي المرتب المقترح **تحسيناً مرشحاً فقط**، وليس ترحيلاً معتمداً أو مطلوباً أو حاجة مثبتة. لا يعتمد أو ينشأ `0016`.

تقيس بوابة **Task 3.22-A Reservation Persistence / Query Performance Planning Gate** الاستعلام الحقيقي أولاً مع المخطط الحالي داخل قاعدة اختبار PostgreSQL وبيانات مولدة غير حساسة وتمثيلية، ولا تستخدم Production. تفحص الانتقائية وعدد المرشحين والصفوف المفحوصة وعقدة الفرز والحد والمؤشر العميق والتقدير مقابل الواقع وكلفة الكتابة والتخزين والصيانة لأي فهرس إضافي.

تعيد البوابة نتيجة واحدة فقط:

1. `EXISTING INDEX SUFFICIENT`: لا مخطط ولا ترحيل.
2. `INDEX REQUIRED`: دليل مادي فقط يسمح بخطة ترحيل مستقلة لاحقة.
3. `DECISION REQUIRED`: يبقى A3 محجوباً إذا تعذر الدليل الموثوق.

لا يختار R2 أياً من النتائج الثلاث، ويحفظ الخيار D وملكية Identity Application واستعلام Draft+Published الواحد ومراجعة المنتج المشتركة للتجزئة والجملة واستقلال التكلفة المرجعية وتشديد كشف المخزون وشرائح A1–A5.

### الملفات المنشأة

- تقرير R2 وحزمة المراجعة وZIP وملف SHA-256 المحددة أعلاه.

### الملفات المعدلة

- عقد إدارة العمليات، وخارطة الطريق الحالية، واستمرار Sprint 03.

### الملفات المحذوفة

لا شيء.

### تغييرات المعمارية

لا تغيير منفذاً. يتغير فقط وضع قرار الاستمرارية من ادعاء ضرورة فهرس إلى بوابة أدلة تقارن الخطة الحالية بالتحسين المرشح عند الحاجة.

### الملخص

يفصل R2 بين الخطر المثبت والحاجة غير المثبتة إلى ترحيل. تبقى 3.22-A وواجهة 3.22 محجوبتين، ولا يوجد تنفيذ تالٍ معتمد.

### التوصية التالية

قدم R2 للمراجعة المستقلة، ثم نفذ بوابة تخطيط أداء/استمرارية الحجوزات فقط. لا تنفذ A1–A5 أو الفهرس أو الترحيل `0016` أو واجهة 3.22.
