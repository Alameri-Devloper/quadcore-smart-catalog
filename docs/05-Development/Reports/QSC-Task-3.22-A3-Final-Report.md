# QSC Task 3.22-A3 Final Report | التقرير النهائي للمهمة QSC 3.22-A3

## Status | الحالة

`ReadyForReview` — independent review is required; this report does not self-approve the implementation. | `ReadyForReview` — تلزم مراجعة مستقلة، ولا يعتمد هذا التقرير التنفيذ ذاتياً.

## Task | المهمة

Task 3.22-A3 — Reservation Management Reads. Only A3 was implemented. | المهمة 3.22-A3 — قراءات إدارة الحجوزات. نُفذت A3 فقط.

## Branch | الفرع

`feature/task-3.22-a3-reservation-management-reads`

## Baseline | خط الأساس

Required and verified ancestor/starting HEAD: `43c5b5581aff634547767a198d0065d08c6a390b`, containing Task 3.22-A1 merged through PR #28 and Task 3.22-A2 merged through PR #29. The working tree was clean at task start. Earlier A-series and planning baselines remain historical references. | السلف المطلوب ورأس البداية المتحقق منه هو `43c5b5581aff634547767a198d0065d08c6a390b` ويحتوي A1 المدمجة عبر طلب السحب #28 وA2 المدمجة عبر #29. كانت شجرة العمل نظيفة عند البدء، وتبقى الخطوط الأقدم مراجع تاريخية.

## English Summary | الملخص الإنجليزي

A3 adds exactly two authenticated Inventory-owned reads: a Product-scoped actionable Reservation collection and an exact Reservation detail. The collection filters and keyset-paginates in PostgreSQL; detail may return any persisted Reservation status. Both require `inventory.reserve` and trusted Branch scope. No A4, A5, Presentation, schema, migration, index, dependency, or mutation-contract change was added.

## Arabic Summary | الملخص العربي

تضيف A3 قراءتين موثقتين ومملوكتين لـInventory فقط: قائمة حجوزات قابلة للفعل ومقيدة بالمنتج، وتفاصيل حجز دقيقة. يجري الترشيح والتقسيم بالمؤشر في PostgreSQL، بينما قد تعيد التفاصيل أي حالة حجز محفوظة. تتطلب القراءتان `inventory.reserve` ونطاق الفرع الموثوق. لم تنفذ A4 أو A5 أو الواجهة، ولم يتغير مخطط أو ترحيل أو فهرس أو اعتماد أو عقد طفرة.

## Architecture | المعمارية

DDD, Clean Architecture, the modular monolith, TypeScript, server-trusted authorization, and multi-tenant boundaries are preserved. Application owns authorization/orchestration, Inventory owns Reservation reads and mutations, Route Handlers remain thin, and PostgreSQL remains canonical persistence. No BFF, generic management module, projection database, duplicate aggregate, repository, or authorization stack was created. | حُفظت DDD والمعمارية النظيفة والوحدة النمطية وTypeScript وسلطة الخادم وعزل المستأجر. يملك التطبيق التفويض والتنسيق، ويملك Inventory قراءات الحجوزات وطفراتها، وتبقى المسارات رقيقة وPostgreSQL مرجع الاستمرارية. لم تنشأ BFF أو وحدة إدارة عامة أو قاعدة إسقاط أو تجميع أو مستودع أو تفويض مكرر.

## Inventory Ownership | ملكية Inventory

The existing `InventoryRepository` was extended minimally with `listReservations(...)`; exact detail reuses `findReservation(..., false)`. Both reads execute through the existing Inventory Unit of Work. Repositories do not call repositories, and Release/Fulfill continue to use the existing locked mutation path. | مُدد `InventoryRepository` الحالي بأصغر عملية `listReservations(...)`، وتعيد التفاصيل استخدام `findReservation(..., false)`. تمر القراءتان عبر وحدة عمل Inventory الحالية، ولا تستدعي المستودعات مستودعات أخرى، وتبقى طفرات التحرير والتنفيذ في مسارها المقفل الحالي.

## Authorization | التفويض

Both reads require effective `inventory.reserve`; Catalog view/edit, Inventory quantity/availability, receive, issue, and adjust permissions do not authorize them. The requested purpose and resource identifiers never grant authority. `allowedActions` reuses the A1 `permittedReservationManagementActions(...)` vocabulary and is advisory only. | تتطلب القراءتان صلاحية `inventory.reserve` الفعلية، ولا تخولهما صلاحيات الكتالوج أو عرض الكميات/الإتاحة أو الاستلام أو الصرف أو التسوية. لا يمنح الغرض أو المعرفات سلطة. تعيد `allowedActions` استخدام مفردات A1 وهي إرشادية فقط.

## Tenant / Branch Scope | نطاق المستأجر والفرع

Workspace identity comes only from `TrustedActorContext`. Collection reads enforce trusted Branch scope, same-Workspace Branch, and same-Workspace Product before querying. Detail returns `ReservationNotFound` for missing, foreign-Workspace, wrong-requested-Branch, missing-Branch, and out-of-scope resources without revealing which condition occurred. Branch-scope lists are never serialized. | تأتي مساحة العمل من `TrustedActorContext` فقط. تتحقق القائمة من نطاق الفرع والفرع والمنتج داخل مساحة العمل قبل الاستعلام. تعيد التفاصيل `ReservationNotFound` للحجز المفقود أو الأجنبي أو التابع لفرع آخر أو الفرع المفقود أو الخارج عن النطاق دون كشف السبب، ولا تسلسل قوائم نطاق الفروع.

## Reservation Collection Contract | عقد قائمة الحجوزات

`GET /api/branches/{branchId}/inventory/reservations?productId={productId}&cursor={cursor?}&limit={limit?}` requires `productId`, accepts only `productId`, `cursor`, and `limit`, defaults to 24, accepts 1–60, and fetches `limit + 1` with a maximum of 61 candidates. It returns only `Active` and `PartiallyFulfilled`. Empty first/later pages return `{ items: [], nextCursor: null }`. | يتطلب مسار القائمة `productId` ولا يقبل سوى `productId` و`cursor` و`limit`. الحد الافتراضي 24 والمسموح 1–60 ويجلب `limit + 1` بحد أقصى 61 مرشحاً. يعيد حالتي `Active` و`PartiallyFulfilled` فقط، وتعيد الصفحة الفارغة عناصر فارغة ومؤشراً فارغاً.

## Reservation Detail Contract | عقد تفاصيل الحجز

`GET /api/branches/{branchId}/inventory/reservations/{reservationId}` accepts no query parameters and performs a non-locking read. It may return `Active`, `PartiallyFulfilled`, `Fulfilled`, or `Released`, allowing stale management clients to refresh current truth. | لا يقبل مسار التفاصيل معاملات استعلام وينفذ قراءة بلا قفل. قد يعيد الحالات الأربع حتى يستطيع العميل القديم تحديث الحقيقة الحالية.

## Actionable Status Policy | سياسة الحالات القابلة للفعل

The collection sends the fixed canonical status set `Active`, then `PartiallyFulfilled`, to PostgreSQL and never accepts status input from the browser. `Fulfilled` and `Released` are excluded by the repository query, not filtered in HTTP or Application. | ترسل القائمة مجموعة الحالات الثابتة `Active` ثم `PartiallyFulfilled` إلى PostgreSQL ولا تقبل الحالات من المتصفح. تستبعد `Fulfilled` و`Released` في استعلام المستودع لا في HTTP أو التطبيق.

## Cursor / Fingerprint | المؤشر والبصمة

Inventory owns a version-1 opaque canonical base64url cursor with exact payload `{ version, fingerprint, updatedAt, reservationId }`. Its SHA-256 fingerprint contains only version 1, purpose `ActionableReservations`, Branch, Product, the fixed ordered actionable statuses, and order `UpdatedAtDescReservationIdDesc`. Validation rejects overlong/non-canonical base64url, malformed JSON, wrong keys/version/fingerprint, cross-Branch/Product reuse, non-canonical timestamps, and invalid Reservation IDs as `InvalidCursor`. Workspace and authority are absent. | يملك Inventory مؤشراً معتماً canonical base64url بالإصدار الأول والحقول الدقيقة المذكورة. تحتوي البصمة فقط الإصدار والغرض والفرع والمنتج والحالات الثابتة والترتيب. يرفض التشفير غير القياسي أو الطويل وJSON غير الصحيح والحقول أو الإصدار أو البصمة المختلفة وتبادل الفرع/المنتج والطابع أو معرف الحجز غير الصحيح كـ`InvalidCursor`. لا تدخل مساحة العمل أو السلطة في المؤشر.

## Keyset Pagination | التقسيم بالمؤشر

PostgreSQL orders globally by `updated_at DESC, reservation_id DESC`. After a cursor it applies `updated_at < cursor.updatedAt OR (updated_at = cursor.updatedAt AND reservation_id < cursor.reservationId)` together with exact Workspace, Branch, Product, and actionable-status predicates. No OFFSET, page number, unbounded fetch, or Application/HTTP sorting/filtering exists. | يرتب PostgreSQL عالمياً حسب وقت التحديث ثم معرف الحجز تنازلياً، ويطبق شرط الموضع الدقيق مع قيود مساحة العمل والفرع والمنتج والحالات. لا يوجد OFFSET أو رقم صفحة أو جلب غير محدود أو فرز/ترشيح في التطبيق أو HTTP.

## Allowed Actions | الأفعال المسموحة

Active and Partially Fulfilled views intersect current state with the A1 permission-only `Release`/`Fulfill` action vocabulary. Fulfilled and Released detail views return an empty action list. Every mutation still reauthorizes and revalidates state and remaining quantity under its transaction. | تربط الحالات القابلة للفعل الحالة الحالية بمفردات A1 للتحرير والتنفيذ، بينما تعيد الحالات النهائية قائمة أفعال فارغة. تعيد كل طفرة التفويض والتحقق من الحالة والكمية المتبقية داخل معاملتها.

## Live Cursor Semantics | دلالة المؤشر الحي

The cursor is a keyset position, not a snapshot. Current rows after the tuple are returned; terminal rows may disappear and updated rows may move. The source Reservation is never looked up during cursor validation, so deletion or terminal transition of that source does not invalidate a structurally valid cursor. | المؤشر موضع ترتيب لا لقطة. تعاد الصفوف الحالية بعد الموضع وقد تختفي الحالات النهائية أو تتحرك الصفوف المحدثة. لا يبحث التحقق عن صف مصدر المؤشر، لذلك لا يبطل حذف المصدر أو انتقاله النهائي مؤشراً صحيح البنية.

## HTTP/API Impact | أثر HTTP/API

Added GET beside the existing Reservation POST collection route and created the exact Reservation detail GET route. Authentication/restricted-session behavior remains 401/403; typed permission failures are 403; safe resource failures are 404; malformed non-cursor input and cursor input are distinct 400 responses; infrastructure failures are sanitized 503. Read responses use `cache-control: private, no-store`. Existing write-origin behavior is unchanged. | أضيف GET بجانب POST الحالي للقائمة وأُنشئ GET لتفاصيل الحجز. بقيت المصادقة والجلسة المقيدة 401/403 والرفض 403 والغياب الآمن 404 ومدخلات الاستعلام/المؤشر 400 مميزة وفشل البنية 503 منقحاً. تستخدم القراءات `private, no-store` ولم يتغير سلوك أصل الكتابة.

## Security | الأمان

Request input cannot provide Workspace, actor, role, permissions, Branch-scope lists, statuses, sort, order, offset, page, or arbitrary filters. The server derives all authority and fixed query shape. Exception text is never returned. | لا يستطيع الطلب توفير مساحة العمل أو الممثل أو الدور أو الصلاحيات أو نطاق الفروع أو الحالات أو الفرز أو الترتيب أو offset أو الصفحة أو المرشحات. يشتق الخادم السلطة وشكل الاستعلام الثابت ولا يعيد نص الاستثناء.

## Non-Disclosure | عدم الكشف

The exact DTO contains only Reservation ID, Branch ID, Product ID, status, decimal-string quantity/remaining quantity, ISO timestamps, and semantic allowed actions. It omits `createdByActorId`, audit/movement/idempotency data, operation fingerprints, Workspace/authority fields, balances, unrelated Inventory quantities, Product labels/classification/media, Pricing, and Reference Cost. | لا تحتوي الحمولة إلا معرفات الحجز والفرع والمنتج والحالة والكميات النصية والطوابع والأفعال الدلالية. تحذف منشئ الحجز والتدقيق والحركات والثبات والبصمات ومساحة العمل والسلطة والأرصدة والكمية غير المرتبطة وتسميات/تصنيف/وسائط المنتج والتسعير والتكلفة المرجعية.

## Multi-Tenant | تعدد المستأجرين

Every persistence predicate begins with trusted `workspaceId`. PostgreSQL tests include foreign Workspace, Branch, and Product distractors and prove they do not cross the collection/detail boundary. | يبدأ كل قيد استمرارية بمعرف مساحة العمل الموثوق، وتثبت اختبارات PostgreSQL أن صفوف مساحة العمل والفرع والمنتج الأجنبية لا تعبر حدود القائمة أو التفاصيل.

## Files Created | الملفات المنشأة

- `app/api/branches/[branchId]/inventory/reservations/[reservationId]/route.ts`
- `domains/inventory/domain/reservation-management-query.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-A3-Final-Report.md`

## Files Modified | الملفات المعدلة

- `app/api/branches/[branchId]/inventory/reservations/route.ts`
- `domains/inventory/application/inventory-results.ts`
- `domains/inventory/application/inventory.use-cases.ts`
- `domains/inventory/application/inventory.use-cases.test.ts`
- `domains/inventory/ports/inventory-unit-of-work.port.ts`
- `domains/inventory/infrastructure/inventory-server-runtime.ts`
- `domains/inventory/infrastructure/http/inventory-route-handlers.ts`
- `domains/inventory/infrastructure/http/inventory-route-handlers.test.ts`
- `domains/inventory/infrastructure/persistence/postgresql-inventory-unit-of-work.ts`
- `domains/inventory/infrastructure/persistence/postgresql-inventory.integration.test.ts`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Database / Migration Decision | قرار قاعدة البيانات والترحيل

Current schema is sufficient. No schema, migration, Drizzle metadata, table, constraint, or seed changed. The migration chain remains `0000–0015`. **Migration 0016 NOT REQUIRED.** Production database access did not occur. | المخطط الحالي كافٍ. لم يتغير مخطط أو ترحيل أو بيانات Drizzle أو جدول أو قيد أو seed. بقيت السلسلة `0000–0015`. **الترحيل 0016 غير مطلوب.** لم يحدث وصول إلى قاعدة الإنتاج.

## Existing Index Decision | قرار الفهرس الحالي

**EXISTING INDEX SUFFICIENT.** A3 uses `inventory_reservations_product_idx (workspace_id, branch_id, product_id, status)` for exact candidate filtering and lets PostgreSQL perform the approved bounded order before `limit + 1`. The prior guarded PostgreSQL 17.10 performance gate selected this index through 10,000 actionable plus 10,000 terminal rows without disk sort or material concern. The Candidate Optimization was not created or tested. | **الفهرس الحالي كافٍ.** تستخدم A3 الفهرس الحالي للترشيح الدقيق ويجري PostgreSQL الترتيب المحدود المعتمد قبل `limit + 1`. اختارت بوابة الأداء السابقة هذا الفهرس حتى 10,000 صف قابل للفعل ومثلها نهائية دون فرز قرصي أو قلق مادي. لم ينشأ أو يختبر التحسين المرشح.

## Dependency Decision | قرار الاعتماديات

No runtime or development dependency was added; `package.json` and `package-lock.json` are unchanged. | لم يضف اعتماد تشغيلي أو تطويري، ولم يتغير ملفا الحزم.

## Tests | الاختبارات

Focused Inventory Application/authorization/HTTP tests passed 23/23. They cover exact permission composition, Branch scope, required Product, limits, actionable mapping, decimal strings, exact disclosure, cursor generation/tampering/binding, empty/live pages, source deletion, all detail states/actions, authentication, restricted sessions, strict query parsing, cache control, safe errors, and sanitized failures. The broad `npm test` gate passed 738 tests with one existing platform-permission skip out of 739 total and zero failures. | نجحت اختبارات التطبيق والتفويض وHTTP وعددها 23. تغطي الصلاحية والنطاق والمنتج والحدود والحمولة والمؤشرات والصفحات الحية والحالات والمصادقة والتحليل الصارم والأخطاء الآمنة. نجحت البوابة العامة في 738 اختباراً مع تخطٍ منصي موجود من أصل 739 ودون فشل.

## PostgreSQL Integration Evidence | أدلة تكامل PostgreSQL

The repository-approved isolated database guard remained active. The focused PostgreSQL Inventory file passed 8/8, including three new A3 scenarios. Generated non-sensitive rows prove exact Workspace/Branch/Product/status filtering; Fulfilled/Released exclusion; global timestamp/ID ordering; equal-timestamp tie-break; first/forward/empty pages; stable no-duplicate/no-skip traversal; source deletion; terminal transition; every detail status; and foreign/wrong-Branch/missing non-disclosure. | بقي حارس قاعدة الاختبار المعزولة فعالاً. نجح ملف Inventory في 8/8 ومنها ثلاث حالات A3 جديدة. تثبت الصفوف الاصطناعية الترشيح والترتيب والتعادل والصفحات وعدم التكرار/الفقد والحذف والانتقال النهائي والحالات الأربع وعدم كشف الموارد الأجنبية أو المفقودة.

## Mutation Non-Regression | عدم تراجع الطفرات

Existing Receive/Issue/Reserve/Release/Fulfill/Damage/Restore/Correct/Transfer tests remain green. The Application mutation suite preserves authorization, state/quantity validation, balance changes, movement/audit persistence, idempotency, optimistic conflict, rollback, and atomic transfer. PostgreSQL concurrency tests still serialize issue/reserve and keep transfer atomic, idempotent, correlated, and tenant-safe. A read never substitutes for mutation-time validation. | بقيت اختبارات الطفرات الحالية ناجحة وحفظت التفويض والحالة والكمية والأرصدة والحركات والتدقيق والثبات والتعارض والتراجع والتحويل الذري. ما زالت اختبارات PostgreSQL تسلسل الصرف والحجز وتحفظ التحويل آمناً. لا تستبدل القراءة تحقق وقت الطفرة.

## Verification | التحقق

- Required branch/HEAD/ancestor/clean-start gate: passed.
- Focused Inventory Application/authorization/HTTP: 23/23 passed.
- Focused guarded PostgreSQL Inventory integration: 8/8 passed.
- TypeScript and integration TypeScript: passed.
- ESLint: passed.
- Next.js production build: passed and listed both Reservation GET routes.
- Drizzle check: passed.
- Broad `npm test`: 738 passed, 1 existing platform-permission skip, 0 failed.
- `git diff --check`: passed.
- `npm audit`: not run, as prohibited.

نجحت بوابة الفرع وخط الأساس والاختبارات المركزة والعامة وTypeScript وESLint والبناء وتكامل PostgreSQL وفحص Drizzle وفروق Git. لم يشغل `npm audit` امتثالاً للمنع.

## Git Integrity | سلامة Git

No Git write was performed: no add, commit, push, merge, rebase, reset, restore, clean, stash, tag, switch, checkout, or branch deletion. The required branch and baseline remain unchanged. | لم تنفذ أي كتابة Git أو تبديل أو حذف فرع، وبقي الفرع وخط الأساس المطلوبان دون تغيير.

## DEV-001 Integrity | سلامة DEV-001

The final DEV-001 invocation must preserve exact changed source/tests/docs, include sanitized required verification and PostgreSQL/Git evidence, record SHA-256 and byte size for every payload, skip both optional npm audit commands explicitly, verify repository stability and Git integrity, publish the repository ZIP/checksum atomically, and export the byte-exact report/ZIP/checksum set. It excludes secrets, connection strings, `.env`, Production data, Git internals, generated datasets, and unrelated build output. | يجب أن يحفظ استدعاء DEV-001 النهائي المصدر والاختبارات والوثائق مطابقة، ويضم أدلة التحقق وPostgreSQL وGit المنقحة وبيان التجزئة والحجم، ويتجاوز تدقيقي npm صراحةً، ويتحقق من استقرار المستودع وسلامة Git، وينشر ZIP وبصمته ويصدر التقرير وZIP والبصمة مطابقة. يستبعد الأسرار وسلاسل الاتصال وملفات البيئة وبيانات الإنتاج وداخل Git والبيانات المولدة والمخرجات غير المرتبطة.

## Risks | المخاطر

- The cursor is live, so updates can move rows and terminal transitions can remove them between pages; clients restart without a cursor when they need a fresh view.
- `allowedActions` is advisory; mutations remain authoritative.
- The existing index decision is bounded by the approved Product-scoped density evidence and should be remeasured after material scale/distribution changes.

- المؤشر حي وقد تتحرك الصفوف أو تختفي بين الصفحات، ويبدأ العميل من جديد عند طلب عرض حديث.
- الأفعال إرشادية وتبقى الطفرات مرجع الحقيقة.
- قرار الفهرس مقيد بأدلة الكثافة المعتمدة ويعاد قياسه بعد تغير مادي.

## Known Limitations | القيود المعروفة

A3 provides no general Reservation history/report, cross-Product list, Product labels, management UI, client hook, new mutation, Pricing read, or Inventory disclosure hardening. The collection is intentionally Product-scoped and actionable-only; detail is exact-ID refresh. | لا توفر A3 تاريخاً أو تقريراً عاماً أو قائمة متعددة المنتجات أو تسميات منتج أو واجهة أو خطاف عميل أو طفرة أو قراءة تسعير أو تشديد كشف المخزون. القائمة مقيدة بالمنتج والحالات القابلة للفعل، والتفاصيل تحديث بمعرف دقيق.

## Next Recommendation | التوصية التالية

Submit A3 and its DEV-001 bundle for independent review and merge. **A4 is NOT automatically approved and is NOT started. A5 is NOT started. Task 3.22 Presentation is BLOCKED. EXISTING INDEX SUFFICIENT. Migration 0016 NOT REQUIRED.** Stop here; do not begin another slice automatically. | قدم A3 وحزمة DEV-001 للمراجعة المستقلة والدمج. **A4 غير معتمدة تلقائياً ولم تبدأ، وA5 لم تبدأ، وواجهة المهمة 3.22 محجوبة، والفهرس الحالي كافٍ، والترحيل 0016 غير مطلوب.** يجب التوقف هنا وعدم بدء شريحة أخرى تلقائياً.
