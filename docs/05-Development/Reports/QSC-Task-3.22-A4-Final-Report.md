# QSC Task 3.22-A4 Final Report | التقرير النهائي للمهمة QSC 3.22-A4

## Status | الحالة

**ReadyForReview** — implementation and required verification are complete; independent review is required. | **جاهزة للمراجعة** — اكتمل التنفيذ والتحقق المطلوب، وتلزم مراجعة مستقلة.

## Task | المهمة

Task 3.22-A4 — Pricing Management Reads and Revision Semantics. Focused server-contract implementation only. | المهمة 3.22-A4 — قراءات إدارة التسعير ودلالات المراجعة. تنفيذ مركز لعقد الخادم فقط.

## Branch | الفرع

`feature/task-3.22-a4-pricing-management-reads`

## Baseline | خط الأساس

`5ad78863cf141349975f0100d2e93b674c7e6819`, containing A1 merged through PR #28, A2 through PR #29, and A3 through PR #30. Branch, HEAD, ancestry, and clean-start checks passed before modification. | يحتوي خط الأساس A1 مدمجة عبر طلب السحب #28 وA2 عبر #29 وA3 عبر #30. نجحت فحوص الفرع وHEAD والسلف ونظافة البداية قبل التعديل.

## English Summary

A4 adds exactly two authenticated, private management reads: Branch-independent Workspace base pricing and Branch override management state. Catalog Branch Product Application composes the exact bounded DTOs from existing scope and pricing ports, applies per-field authorization, and returns authoritative shared Product, independent Reference Cost, and independent Branch override revisions. Existing mutations and ordinary pricing reads remain unchanged and authoritative.

## الملخص العربي

تضيف A4 قراءتين موثقتين وخاصتين فقط: تسعير مساحة العمل الأساسي المستقل عن الفرع، وحالة إدارة تجاوزات الفرع. يركب Catalog Branch Product Application الحمولات المحدودة الدقيقة من منافذ النطاق والتسعير الحالية، ويطبق التفويض حسب الحقل، ويعيد مراجعة المنتج المشتركة ومراجعة التكلفة المرجعية المستقلة ومراجعات تجاوزات الفروع المستقلة. بقيت الطفرات وقراءات التسعير العادية دون تغيير ومرجعاً للحقيقة.

## Root Cause Analysis | تحليل السبب الجذري

The required baseline was healthy: focused pricing tests and TypeScript passed before implementation. The source-proven gap was that A4 had no Workspace/Branch management use cases, runtime wiring, HTTP handlers, or parent/management routes, although existing repositories already exposed all required values and revisions. The smallest safe fix was therefore an Application/HTTP addition over existing ports, with no persistence or architecture redesign. | كان خط الأساس سليماً ونجحت اختبارات التسعير وTypeScript قبل التنفيذ. كانت الفجوة المثبتة من المصدر هي غياب حالات استخدام A4 وربط التشغيل ومعالجات HTTP والمسارات، مع أن المستودعات الحالية تعرض القيم والمراجعات المطلوبة. لذلك كان أصغر إصلاح آمن إضافة في طبقتي التطبيق وHTTP فوق المنافذ الحالية دون تغيير الاستمرارية أو المعمارية.

## Architecture | المعمارية

DDD, Clean Architecture, the modular monolith, TypeScript, server-trusted authorization, and multi-tenant boundaries are preserved. Route Handlers delegate; Application owns authorization and DTO composition; the existing `BranchProductUnitOfWork`, scope repository, and `ProductPricingRepository` remain the only persistence boundary. No Pricing module, BFF, generic management service, duplicate repository, projection database, Money model, revision system, or ADR was added. | حُفظت DDD والمعمارية النظيفة والوحدة النمطية وTypeScript وسلطة الخادم وعزل المستأجر. تفوض المسارات، ويملك التطبيق التفويض وتركيب الحمولة، وتبقى وحدة العمل ومستودعات النطاق والتسعير الحالية حد الاستمرارية الوحيد. لم تضف وحدة تسعير أو BFF أو خدمة عامة أو مستودع مكرر أو نموذج أموال/مراجعة جديد أو ADR.

## Catalog Branch Product Ownership | ملكية Catalog Branch Product

Both reads are owned and orchestrated by Catalog Branch Product Application and use its existing runtime and transaction composition. Repositories never call repositories. | يملك Catalog Branch Product Application القراءتين وينسقهما عبر التشغيل والمعاملة الحاليين، ولا تستدعي المستودعات مستودعات أخرى.

## Authorization | التفويض

Workspace Retail is visible with `pricing.view` or `pricing.manage`; Wholesale with `pricing.view` plus `pricing.wholesale.view`, or `pricing.manage`; Reference Cost with `pricing.view` plus `referenceCost.view`, or `referenceCost.manage`. Branch Retail/Wholesale require `pricing.branchOverride.manage`; Branch Reference Cost requires `referenceCost.branchOverride.manage`. No manage permission globally implies an ordinary view permission. No authorized slot returns `Forbidden`. | يظهر Retail وفق تركيبة العرض/الإدارة المعتمدة، وWholesale وReference Cost وفق تركيباتهما المستقلة، وتتطلب حقول الفرع صلاحيات إدارة التجاوز الدقيقة. لا تستلزم أي صلاحية إدارة صلاحية عرض عادية، ويعاد `Forbidden` عند غياب كل الحقول المخولة.

## Multi-Tenant / Branch Scope | تعدد المستأجرين ونطاق الفرع

Workspace and actor authority come only from `TrustedActorContext`. Product ownership is validated in the trusted Workspace. Branch reads enforce trusted `branchScope` before same-Workspace Branch/Product lookup. Foreign, missing, and out-of-scope resources retain safe `404` behavior. No request accepts Workspace, actor, role, permission, or Branch authority. | تأتي سلطة مساحة العمل والممثل من السياق الموثوق فقط، وتتحقق ملكية المنتج والفرع داخل مساحة العمل ونطاق الفروع الموثوق. تبقى الموارد الأجنبية أو المفقودة أو خارج النطاق غير كاشفة عبر `404` آمن، ولا يقبل الطلب سلطة من المتصفح.

## Workspace Pricing Management Contract | عقد إدارة تسعير مساحة العمل

`GET /api/products/{productId}/pricing` accepts path identity only and returns exact configured/not-configured slots, transport Money, allowed `Set`/`Clear` actions, response-level `productRevision`, and independent `referenceCostRevision`. Any query parameter is `400 InvalidInput`; success and safe failures are `private, no-store`. | يقبل المسار هوية المنتج فقط ويعيد الحالات والقيم والأفعال والمراجعات الدقيقة. يرفض أي معامل استعلام، وتبقى الاستجابات خاصة وغير مخزنة.

## Branch Override Management Contract | عقد إدارة تجاوز الفرع

`GET /api/branches/{branchId}/products/{productId}/pricing/management` returns only authorized price types with bounded base, override, effective value, source, override revision, and advisory override actions. Nested base/override state slots expose no Workspace `Set`/`Clear` actions; the containing slot is the sole action surface and returns `SetOverride`, plus `ClearOverride` only when an override exists. | يعيد المسار أنواع الأسعار المخولة فقط مع الأساس والتجاوز والقيمة الفعلية والمصدر والمراجعة وأفعال التجاوز. لا تعرض حالات الأساس/التجاوز الداخلية أفعال مساحة العمل، ويعرض الحقل الخارجي `SetOverride` و`ClearOverride` عند وجود تجاوز فقط.

## Field Authorization | تفويض الحقول

Tests cover the complete view/manage cross-product, management-only disclosure, omission of independently unauthorized fields, and `Forbidden` when no slot is authorized. Branch management permissions do not authorize the Workspace read, and ordinary view/manage permissions do not authorize the Branch management read. | تغطي الاختبارات تراكيب العرض والإدارة والعزل والحذف الدقيق للحقول ورفض الاستجابة الفارغة، ولا تتبادل صلاحيات الفرع ومساحة العمل السلطة.

## Reference Cost Isolation | عزل التكلفة المرجعية

Reference Cost appears only under its exact ordinary composite or operation-specific manage permission. It remains absent from Retail/Wholesale-only management responses and unchanged ordinary Catalog, sharing, and Direct Device Sharing DTOs. | لا تظهر التكلفة المرجعية إلا بتركيبتها الدقيقة، وتبقى غائبة عن استجابات التجزئة/الجملة وعن حمولات الكتالوج والمشاركة غير المعدلة.

## Retail / Wholesale Shared Revision | مراجعة التجزئة والجملة المشتركة

Both Product-column prices use only `productRevision`, including when either slot is absent. A successful Retail write increments Product revision and makes a prior Wholesale token stale; Wholesale behaves symmetrically. No slot-local revisions were introduced. | يستخدم السعران مراجعة المنتج المشتركة فقط حتى عند الغياب، ويبطل تعديل أحدهما رمز الآخر القديم، دون مراجعات محلية للحقل.

## Reference Cost Independent Revision | مراجعة التكلفة المرجعية المستقلة

Configured Reference Cost returns its row revision; authoritative absence returns `0`. Reference Cost writes do not change Product revision, and Retail/Wholesale writes do not change Reference Cost revision. | تعيد التكلفة المرجعية المكونة مراجعة صفها ويعيد الغياب الموثوق صفراً، ولا تتداخل مراجعتها مع مراجعة المنتج.

## Branch Override Revision | مراجعة تجاوز الفرع

Each configured override returns its existing row revision; confirmed absence returns `0`. Override writes do not reuse or alter Product or Reference Cost base revisions. | يعيد كل تجاوز مراجعة صفه الحالية ويعيد الغياب الموثوق صفراً، دون إعادة استخدام مراجعات الأساس أو تغييرها.

## Zero vs NotConfigured | الصفر مقابل عدم التهيئة

Money amount `"0"` is projected as `Configured`; only missing persistence state is `NotConfigured`. Existing Money and currency validation is unchanged. | تعرض القيمة `"0"` كقيمة مكونة، ويعني غياب صف الاستمرارية وحده عدم التهيئة، مع بقاء التحقق الحالي دون تغيير.

## Allowed Actions | الأفعال المسموحة

Workspace actions reuse A1 `Set`/`Clear` policies. Branch actions reuse A1 `SetOverride`/`ClearOverride` policies, remove clear on inherited/absent state, and are empty for an Inactive Branch or Archived Product. Workspace actions are also empty for an Archived Product. All actions remain advisory; mutations reauthorize and revalidate lifecycle, currency, scope, and expected revision. | تعيد الأفعال استخدام سياسات A1 وتزيل المسح عند غياب التجاوز، وتصبح فارغة للفرع غير النشط أو المنتج المؤرشف. تبقى الأفعال إرشادية وتعيد الطفرات كل التحقق.

## HTTP/API Impact | أثر HTTP/API

- Added `GET /api/products/[productId]/pricing`.
- Added `GET /api/branches/[branchId]/products/[productId]/pricing/management`.
- Preserved the existing ordinary Branch pricing GET and all mutation routes.

أضيف مساران للقراءة فقط، وبقيت قراءة تسعير الفرع العادية وكل مسارات الطفرات دون تغيير.

## Security | الأمان

Both endpoints require an authenticated full session, reject restricted sessions, reject all query parameters, emit private no-store responses, and map only safe `401`, `403`, `404`, and sanitized `503` results. Mutation origin protections are unchanged. | يتطلب المساران جلسة كاملة ويرفضان الجلسة المقيدة وكل معاملات الاستعلام، ويعيدان استجابات خاصة وأخطاء آمنة منقحة، دون تغيير حماية أصل الطفرات.

## Non-Disclosure | عدم الكشف

DTOs contain no persistence objects, raw permissions, role, Workspace/actor IDs, Branch-scope lists, audit fields, storage data, or exception text. Foreign resources remain non-disclosing. | لا تحتوي الحمولات كائنات استمرارية أو صلاحيات خام أو دوراً أو هوية مساحة عمل/ممثل أو قوائم فروع أو تدقيقاً أو تخزيناً أو نص استثناء، وتبقى الموارد الأجنبية غير كاشفة.

## Files Created | الملفات المنشأة

- `app/api/products/[productId]/pricing/route.ts`
- `app/api/branches/[branchId]/products/[productId]/pricing/management/route.ts`
- `domains/catalog/branch-products/application/pricing-management.use-cases.test.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-A4-Final-Report.md`

## Files Modified | الملفات المعدلة

- `domains/catalog/branch-products/application/branch-product.use-cases.ts`
- `domains/catalog/branch-products/infrastructure/branch-product-server-runtime.ts`
- `domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.ts`
- `domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.test.ts`
- `domains/inventory/infrastructure/persistence/postgresql-inventory.integration.test.ts`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Architecture Changes | تغييرات المعمارية

None. This is a bounded Application/HTTP contract addition using existing architecture. | لا توجد. هذا امتداد محدود لعقد التطبيق وHTTP فوق المعمارية الحالية.

## Database / Migration Decision | قرار قاعدة البيانات والترحيل

Current schema and ports are sufficient. No schema, migration, index, Drizzle metadata, table, constraint, or seed changed. The migration chain remains `0000–0015`. **Migration 0016 NOT REQUIRED.** Production database access did not occur. | المخطط والمنافذ الحالية كافية، ولم يتغير مخطط أو ترحيل أو فهرس أو بيانات Drizzle. بقيت السلسلة `0000–0015`. **الترحيل 0016 غير مطلوب.** لم يحدث وصول إلى قاعدة الإنتاج.

## Dependency Decision | قرار الاعتماديات

No runtime or development dependency was added; `package.json` and `package-lock.json` are unchanged. | لم يضف اعتماد تشغيلي أو تطويري، ولم يتغير ملفا الحزم.

## Tests | الاختبارات

Focused Branch Product Application/authorization/HTTP tests passed 28/28. They cover the required permission matrices, configured/missing/zero values, exact transport projection, Product/Workspace/Branch scope, effective/source resolution, all revision domains, lifecycle actions, authentication, restricted sessions, query rejection, private caching, safe errors, and sanitized failures. The broad `npm test` gate passed 751 tests with one existing platform-permission skip out of 752 total and zero failures. | نجحت الاختبارات المركزة 28/28 وغطت الصلاحيات والقيم والمراجعات والنطاق والحالات وHTTP والأخطاء الآمنة. نجحت البوابة العامة في 751 اختباراً مع تخطٍ منصي موجود من أصل 752 ودون فشل.

## PostgreSQL Integration Evidence | أدلة تكامل PostgreSQL

The repository-guarded isolated PostgreSQL database was used after the local service was started; production access was prohibited. The focused Inventory/Pricing file passed 11/11, including three A4 cases. The full integration gate passed 136/136. Generated non-sensitive rows prove current shared Product revision, opposite-price stale conflicts, independent Reference Cost revision/absence, independent Branch override revision/absence, base/override/effective/source resolution, zero value, and tenant/Branch/Product isolation. | استُخدمت قاعدة PostgreSQL الاختبارية المعزولة والمحروسة بعد تشغيل الخدمة المحلية، وحُظر الإنتاج. نجح الملف المركز 11/11 والبوابة الكاملة 136/136، وأثبتت الصفوف المولدة المراجعات المشتركة والمستقلة والتعارض والعزل والدلالات الدقيقة.

## Mutation Non-Regression | عدم تراجع الطفرات

`SetWorkspaceBasePrice`, `ClearWorkspaceBasePrice`, `SetBranchPriceOverride`, and `ClearBranchPriceOverride` remain unchanged and passed unit/integration regression coverage for permission, currency, lifecycle, expected revision, conflict, audit, persistence ownership, zero values, and explicit clear. Management reads remain advisory; a `409` requires refetch before resubmission. | بقيت طفرات التسعير الأربع دون تغيير ونجحت تغطية عدم التراجع للصلاحيات والعملات والحالة والمراجعة والتعارض والتدقيق والاستمرارية والصفر والمسح الصريح. تتطلب `409` إعادة القراءة قبل إعادة الإرسال.

## Ordinary Pricing Non-Regression | عدم تراجع التسعير العادي

Explicit tests preserve ordinary Branch pricing visibility: Retail requires `pricing.view`; Wholesale requires it plus `pricing.wholesale.view`; Reference Cost requires it plus `referenceCost.view`. Management permissions alone do not widen the ordinary endpoint. | تحفظ الاختبارات الصريحة تركيبات عرض التسعير العادي، ولا توسع صلاحيات الإدارة المسار العادي.

## Verification | التحقق

- Required branch/HEAD/ancestor/clean-start gate: passed.
- Baseline focused pricing tests and TypeScript reproduction: passed.
- Focused Branch Product Application/A1 policy/HTTP/pricing regressions: 28/28 passed.
- Focused guarded PostgreSQL Inventory/Pricing integration: 11/11 passed.
- TypeScript and integration TypeScript: passed.
- ESLint: passed.
- Next.js production build: passed and listed both new GET routes.
- Drizzle check: passed.
- Broad `npm test`: 751 passed, 1 existing platform-permission skip, 0 failed.
- Full guarded PostgreSQL integration: 136/136 passed.
- `git diff --check`: passed.
- `npm audit`: not run, as prohibited.

نجحت بوابات البداية والاختبارات المركزة والعامة وTypeScript وESLint والبناء وتكامل PostgreSQL وفحص Drizzle وفروق Git. لم يشغل `npm audit` امتثالاً للمنع.

## Git Integrity | سلامة Git

No Git write was performed: no add, commit, push, merge, rebase, reset, restore, clean, stash, tag, switch, checkout, or branch deletion. Branch and HEAD remain the required values; task changes remain unstaged for review. | لم تنفذ أي كتابة Git أو تبديل أو حذف فرع، وبقي الفرع وHEAD بالقيم المطلوبة، وتبقى تغييرات المهمة غير مرحّلة للمراجعة.

## DEV-001 Integrity | سلامة DEV-001

The final DEV-001 invocation passed all required commands, explicitly skipped both prohibited optional npm audit commands, preserved exact changed source/tests/docs, sanitized evidence only, verified SHA-256/byte-size manifest coverage and repository stability, and published the repository-local and Desktop report/ZIP/checksum sets without Git writes. The exact collision-safe repository and exported paths are reported in the implementation handoff. | نجح استدعاء DEV-001 النهائي وتجاوز تدقيقي npm المحظورين صراحةً، وحفظ المصدر الدقيق ونقح الأدلة فقط وتحقق من البيان واستقرار المستودع ونشر التقرير والحزمة والبصمة محلياً وعلى سطح المكتب دون كتابة Git. ترد المسارات الدقيقة والآمنة من التعارض في تسليم التنفيذ.

## Risks | المخاطر

- `allowedActions` is advisory; resource state or revision may change before mutation.
- Retail/Wholesale share one Product token by design; clients must refetch after either write or any `409`.
- Reference Cost and Branch override absence revision `0` is valid only after this authoritative read confirms absence.

- الأفعال إرشادية وقد تتغير الحالة أو المراجعة قبل الطفرة.
- تشترك التجزئة والجملة في رمز منتج واحد ويجب إعادة القراءة بعد الكتابة أو `409`.
- مراجعة الغياب صفر صالحة فقط بعد تأكيد هذه القراءة الموثوقة.

## Known Limitations | القيود المعروفة

A4 adds no UI, client hooks, navigation, forms, dialogs, new mutation, general pricing history, A5 Inventory disclosure hardening, schema change, or migration. Task 3.22 Presentation remains blocked. | لا تضيف A4 واجهة أو خطافات عميل أو تنقلاً أو نماذج أو طفرة أو تاريخ تسعير أو تشديد A5 أو مخططاً أو ترحيلاً. تبقى واجهة المهمة 3.22 محجوبة.

## Summary | الخلاصة

The two approved A4 reads are implemented with exact authorization, scope, revision, inheritance, zero, action, HTTP, and non-disclosure semantics over existing Catalog Branch Product architecture. All focused and broad gates pass. | نُفذت قراءتا A4 المعتمدتان بالدلالات الدقيقة فوق معمارية Catalog Branch Product الحالية، ونجحت كل البوابات المركزة والعامة.

## Next Recommendation | التوصية التالية

Submit A4 and its DEV-001 bundle for independent review and merge. **A5 NOT automatically approved. A5 NOT started. Task 3.22 Presentation BLOCKED. Migration 0016 NOT REQUIRED.** Stop here; do not begin another slice automatically. | قدم A4 وحزمة DEV-001 للمراجعة المستقلة والدمج. **A5 غير معتمدة تلقائياً. A5 لم تبدأ. واجهة المهمة 3.22 محجوبة. الترحيل 0016 غير مطلوب.** يجب التوقف هنا وعدم بدء شريحة أخرى تلقائياً.
