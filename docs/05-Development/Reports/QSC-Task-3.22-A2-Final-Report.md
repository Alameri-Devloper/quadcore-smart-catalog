# QSC Task 3.22-A2 Final Report | التقرير النهائي للمهمة QSC 3.22-A2

## Status | الحالة

`ReadyForReview` — independent review is required; this report does not self-approve the implementation. | `ReadyForReview` — تلزم مراجعة مستقلة، ولا يعتمد هذا التقرير التنفيذ ذاتياً.

## Task | المهمة

Task 3.22-A2 — Canonical Operational Product Discovery and Listing Management State. Only A2 was implemented. | المهمة 3.22-A2 — الاكتشاف التشغيلي المعتمد للمنتجات وحالة إدارة الإدراج. نُفذت A2 فقط.

## Branch | الفرع

`feature/task-3.22-a2-operational-discovery-listing`

## Baseline | خط الأساس

Required and verified ancestor/starting HEAD: `32012c87a521c6fa510ad7ccf03216a180a88725`, containing merged PR #28 / Task 3.22-A1. The working tree was clean at task start. Historical PR #24–#27 baselines remain historical and unchanged. | السلف المطلوب ورأس البداية المتحقق منه هو `32012c87a521c6fa510ad7ccf03216a180a88725` ويحتوي A1 المدمجة عبر طلب السحب #28. كانت شجرة العمل نظيفة عند البدء، وبقيت خطوط #24–#27 مراجع تاريخية دون تغيير.

## English Summary | الملخص الإنجليزي

A2 adds exactly two bounded authenticated server capabilities. `GET /api/catalog/operational-products` reuses the canonical Catalog Query Application, PostgreSQL repository, normalization, deterministic sort, cursor codec, Workspace predicate, Branch validation, and existing Branch/listing projection. `GET /api/branches/{branchId}/products/{productId}/listing` returns authoritative Listing absence/configured state and revision from Catalog Branch Product Application. No A3, A4, A5, Presentation, schema, migration, dependency, duplicate repository, or client authority was added.

## Arabic Summary | الملخص العربي

تضيف A2 قدرتين محدودتين وموثقتين على الخادم فقط. يعيد `GET /api/catalog/operational-products` استخدام تطبيق Catalog Query ومستودع PostgreSQL والتطبيع والترتيب الحتمي وترميز المؤشر وقيد مساحة العمل والتحقق من الفرع وإسقاط الإدراج الحالي. ويعيد `GET /api/branches/{branchId}/products/{productId}/listing` الغياب الموثوق أو حالة الإدراج المهيأة ومراجعتها من Catalog Branch Product Application. لم تنفذ A3 أو A4 أو A5 أو الواجهة، ولم يضف مخطط أو ترحيل أو اعتماد أو مستودع مكرر أو سلطة عميل.

## Architecture | المعمارية

DDD, Clean Architecture, the modular monolith, TypeScript, server-trusted authority, and multi-tenant boundaries are preserved. Application owns authorization/orchestration, Route Handlers remain thin, repositories do not call repositories, and PostgreSQL remains canonical persistence/search. | حُفظت DDD والمعمارية النظيفة والوحدة النمطية وTypeScript وسلطة الخادم وعزل المستأجر. يملك التطبيق التفويض والتنسيق، وتبقى المسارات رقيقة، ولا تستدعي المستودعات مستودعات أخرى، ويبقى PostgreSQL مرجع البحث والاستمرارية.

## Catalog Query Ownership | ملكية استعلام الكتالوج

Catalog Query remains the only Product search authority. A2 extends its internal repository query with `CatalogLifecycleScope`; it does not create a second search module, repository, aggregate, BFF, projection store, client merge, or external search engine. | يبقى Catalog Query مرجع بحث المنتجات الوحيد. توسع A2 عقد المستودع الداخلي بـ`CatalogLifecycleScope` ولا تنشئ وحدة بحث أو مستودعاً أو تجميعاً أو BFF أو مخزن إسقاط أو دمج عميل أو محرك بحث خارجياً.

## Operational Discovery Contract | عقد الاكتشاف التشغيلي

The new endpoint accepts only `purpose`, optional normalized `q`, purpose-valid `branchId`, opaque `cursor`, and `limit`. Limits are minimum 1, default 24, maximum 60, with repository `limit + 1`. The response contains only Product ID/code/name, Draft/Published lifecycle, and—only for Branch-scoped purposes—the requested Branch ID and `Listed | Unlisted | NotConfigured`. Listing state is projection data, never a discovery filter. | يقبل المسار الجديد الغرض و`q` المطبع اختيارياً و`branchId` الموافق للغرض والمؤشر المعتم والحد فقط. الحدود 1/24/60 ويطلب المستودع `limit + 1`. لا تعيد الاستجابة سوى معرف/رمز/اسم المنتج ودورة Draft أو Published، ومع أغراض الفرع فقط معرف الفرع وحالة الإدراج. لا تستخدم حالة الإدراج مرشحاً للاكتشاف.

## Lifecycle Scope | نطاق دورة الحياة

Ordinary search maps its existing singular lifecycle to `Exact`. Operational discovery uses `Allowed(["Draft", "Published"])`, compiled into one parenthesized SQL `IN` predicate in the existing PostgreSQL statement. Archived Products are excluded. No two-query lifecycle merge or post-pagination filter exists. | يحول البحث العادي دورة الحياة المفردة الحالية إلى `Exact`. يستخدم الاكتشاف التشغيلي `Allowed(["Draft", "Published"])` ضمن شرط SQL واحد مقوس `IN` في الاستعلام الحالي، وتستبعد المنتجات المؤرشفة. لا يوجد دمج استعلامين أو ترشيح بعد التقسيم.

## Purpose Authorization | تفويض الغرض

Purpose selects intent and never grants authority. Trusted effective permissions are checked server-side: Listing accepts singular or plural Catalog edit; Inventory accepts each specified availability/quantity/mutation authority independently; Workspace/Branch Pricing and Reference Cost purposes require their exact independent manage permissions. Ordinary `catalog.products.view` is not required, and no permission implication was introduced. | يحدد الغرض النية ولا يمنح السلطة. تفحص الصلاحيات الفعلية الموثوقة على الخادم: يقبل الإدراج صلاحية التعديل المفردة أو الجمعية، ويقبل المخزون كل صلاحية عرض/تعديل محددة مستقلة، وتتطلب أغراض التسعير والتكلفة المرجعية صلاحيات الإدارة الدقيقة المستقلة. لا تلزم `catalog.products.view` ولم تضف قاعدة استلزام صلاحيات.

## Branch Scope | نطاق الفرع

Listing, Inventory, Branch Pricing, and Branch Reference Cost require a request Branch and enforce trusted Branch scope plus same-Workspace canonical Branch validation. Workspace Pricing and Workspace Reference Cost reject Branch input and never infer one. Foreign, missing, or out-of-scope Branches follow safe non-disclosing behavior. | تتطلب أغراض الإدراج والمخزون وتسعير الفرع وتكلفته المرجعية فرعاً في الطلب وتفرض النطاق الموثوق والتحقق المعتمد داخل مساحة العمل. ترفض أغراض مساحة العمل إدخال الفرع ولا تستنتجه. تستخدم الفروع الأجنبية أو المفقودة أو الخارجة عن النطاق سلوكاً آمناً غير كاشف.

## Cursor/Fingerprint Compatibility | توافق المؤشر والبصمة

Operational search has a separate versioned fingerprint bound to type/version, purpose, normalized query, purpose-valid Branch, canonical Draft/Published lifecycle order, and deterministic sort. Cross-purpose, cross-Branch, cross-query, and ordinary/operational cursor reuse fails. The existing cursor codec is reused. The ordinary fingerprint function, public singular lifecycle filter, defaults, normalization, projection, sort, limits, cursor version, and byte output remain unchanged; a baseline literal-hash regression test proves the default ordinary fingerprint remains `1fffc93da3f5d5254f7d60b5b3bc16b7d65e99f3adb0763c952672c8a0be009b`. | للاكتشاف التشغيلي بصمة مستقلة مرتبطة بالإصدار والنوع والغرض والبحث المطبع والفرع ونطاق Draft/Published والترتيب. يرفض تبادل المؤشر بين غرض أو فرع أو بحث مختلف وبين العادي والتشغيلي. يعاد استخدام مرمز المؤشر الحالي. لم تتغير بصمة الكتالوج العادي أو مرشح دورة حياته المفرد أو افتراضاته أو تطبيعه أو إسقاطه أو ترتيبه أو حدوده أو إصدار مؤشره، ويثبت اختبار تجزئة حرفي بقاء البصمة الافتراضية بالقيمة المذكورة.

## Listing Management State | حالة إدارة الإدراج

The dedicated read authorizes `catalog.product.edit` OR `catalog.products.edit` without Catalog view, then verifies trusted Branch scope, same-Workspace Branch, same-Workspace Product, current Branch state, current Product lifecycle, and current Listing row/absence through existing ports. `NotConfigured` uses revision `0` and `updatedAt: null` only after authoritative absence; configured rows return their actual revision and timestamp. `allowedActions` reuses `permittedListingManagementActions(...)` and becomes empty for an Inactive Branch or Archived Product. | تفوض القراءة `catalog.product.edit` أو `catalog.products.edit` دون صلاحية العرض، ثم تتحقق عبر المنافذ الحالية من نطاق الفرع والفرع والمنتج والحالتين الحالية وصف الإدراج أو غيابه. تستخدم `NotConfigured` المراجعة صفر ووقتاً فارغاً فقط بعد تأكيد الغياب، وتعيد الصفوف المهيأة مراجعتها ووقتها الفعليين. تعيد `allowedActions` استخدام سياسة A1 وتصبح فارغة للفرع غير النشط أو المنتج المؤرشف.

## Concurrency | التزامن

Existing Listing PUT behavior is unchanged and remains mutation-time authoritative. The GET supplies the current `expectedRevision`; revision zero is valid only for confirmed absence. Existing optimistic conflict behavior remains 409, after which the consumer must refetch before another explicit write. | لم يتغير PUT ويبقى مرجع التفويض والتحقق وقت التعديل. توفر GET المراجعة الحالية، ولا يصح الصفر إلا للغياب المؤكد. يبقى التعارض التفاؤلي 409 ويلزم بعده إعادة القراءة قبل كتابة صريحة أخرى.

## HTTP/API Impact | أثر HTTP/API

Created `GET /api/catalog/operational-products` and added GET beside the existing Listing PUT at `/api/branches/{branchId}/products/{productId}/listing`. Both use existing authentication/trusted-context infrastructure, private/no-store success responses, safe 401/403/404/400/503 mappings, and sanitized infrastructure failures. The Next.js production build recognizes both routes. | أضيف مسار الاكتشاف التشغيلي وGET بجانب PUT الحالي للإدراج. يستخدم كلاهما بنية المصادقة والسياق الموثوق الحالية واستجابات خاصة غير مخزنة ورموزاً آمنة وأخطاء بنية تحتية منقحة. تعرف بناء Next.js الإنتاجي على المسارين.

## Security | الأمان

Operational DTO tests prove no Workspace/actor/role/permission/Branch-scope authority, media, classification, price, Reference Cost, Inventory quantity, audit data, or internal revisions leak. Request purpose, Workspace ID, actor ID, and lifecycle are never accepted as authority. | تثبت الاختبارات عدم كشف مساحة العمل أو الممثل أو الدور أو الصلاحيات أو نطاق الفروع أو الوسائط أو التصنيف أو الأسعار أو التكلفة المرجعية أو كميات المخزون أو التدقيق أو المراجعات الداخلية. لا يقبل الغرض أو معرف مساحة العمل أو الممثل أو دورة الحياة كسلطة من الطلب.

## R1 Review Correction | تصحيح مراجعة R1

R1 adds test coverage only; production code is unchanged. Explicit negative authorization cases now cover Listing, Inventory, Workspace Pricing, Branch Pricing, Workspace Reference Cost, and Branch Reference Cost with an unrelated operational authority for each purpose, proving that purpose-specific permissions do not imply one another. A separate same-scope `branch-a` case supplies the correct Listing permission, makes `repository.branchExists` return `false`, verifies `BranchNotFound`, and proves search is not invoked. | يضيف R1 تغطية اختبارية فقط دون تغيير كود الإنتاج. تغطي حالات التفويض السلبية صراحةً أغراض الإدراج والمخزون وتسعير مساحة العمل وتسعير الفرع والتكلفة المرجعية لمساحة العمل والفرع بصلاحية تشغيلية غير مرتبطة لكل غرض، بما يثبت عدم استلزام الصلاحيات بعضها لبعض. وتوفر حالة مستقلة للفرع `branch-a` داخل النطاق صلاحية الإدراج الصحيحة، وتجعل `repository.branchExists` يعيد `false`، وتتحقق من `BranchNotFound` ومن عدم استدعاء البحث.

## Multi-Tenant | تعدد المستأجرين

Every query/read starts from `TrustedActorContext.workspaceId`; Branch and Product persistence predicates remain Workspace-scoped. Foreign and wrong-scope resources are non-disclosing, and no request can override Workspace or actor identity. | يبدأ كل استعلام وقراءة من مساحة العمل في السياق الموثوق، وتبقى قيود الفرع والمنتج مقيدة بها. لا تكشف الموارد الأجنبية أو الخارجة عن النطاق، ولا يستطيع الطلب تجاوز هوية مساحة العمل أو الممثل.

## Files Created | الملفات المنشأة

- `app/api/catalog/operational-products/route.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-A2-Final-Report.md`

## Files Modified | الملفات المعدلة

- `app/api/branches/[branchId]/products/[productId]/listing/route.ts`
- `domains/catalog/branch-products/application/branch-product.use-cases.ts`
- `domains/catalog/branch-products/application/branch-product.use-cases.test.ts`
- `domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.ts`
- `domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.test.ts`
- `domains/catalog/query/domain/catalog-query.ts`
- `domains/catalog/query/ports/catalog-query-repository.port.ts`
- `domains/catalog/query/application/catalog-query.use-cases.ts`
- `domains/catalog/query/application/catalog-query.use-cases.test.ts`
- `domains/catalog/query/infrastructure/catalog-query-server-runtime.ts`
- `domains/catalog/query/infrastructure/http/catalog-query-route-handlers.ts`
- `domains/catalog/query/infrastructure/http/catalog-query-route-handlers.test.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.integration.test.ts`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Database/Migration Decision | قرار قاعدة البيانات/الترحيل

Current schema is sufficient. No schema file, Drizzle migration, metadata, index, Product table, or search projection changed. **Migration 0016 NOT REQUIRED.** Production database access was prohibited and did not occur. | المخطط الحالي كافٍ. لم يتغير ملف مخطط أو ترحيل Drizzle أو بياناته أو فهرس أو جدول منتج أو إسقاط بحث. **الترحيل 0016 غير مطلوب.** لم يحدث وصول إلى قاعدة الإنتاج.

## Dependency Decision | قرار الاعتماديات

No runtime or development dependency was added; `package.json` and `package-lock.json` are unchanged. | لم يضف اعتماد تشغيلي أو تطويري، ولم يتغير ملفا الحزم.

## Tests | الاختبارات

Focused Catalog Query and HTTP tests passed 32/32 after R1. Focused Branch Product/Application/HTTP/A1-policy tests passed 15/15. The refreshed broad `npm test` gate passed 725 tests with one existing platform-permission skip out of 726 total and no failures. Coverage includes every exact purpose permission, every listed Inventory authority, explicit negative authorization for all six purposes, required/forbidden Branch input, out-of-scope Branch non-disclosure, same-scope nonexistent Branch validation without search, mixed lifecycle DTOs, limits, cursor binding, ordinary compatibility, singular/plural Listing edit, authoritative absence/configured revision, inactive/Archived actions, safe HTTP errors, and unchanged Listing PUT behavior. | نجحت اختبارات Catalog Query وعددها 32 بعد R1 واختبارات Branch Product وعددها 15. نجحت البوابة العامة المحدثة في 725 اختباراً مع تخطٍ واحد متعلق بصلاحيات المنصة من أصل 726 ودون فشل. تغطي الصلاحيات الدقيقة، والتفويض السلبي الصريح للأغراض الستة، وسياق الفرع، وعدم كشف الفرع خارج النطاق، والتحقق من فرع غير موجود داخل النطاق دون استدعاء البحث، ودورات الحياة والحدود والمؤشرات والمراجعات وحالة الموارد وأخطاء HTTP وبقاء PUT.

## PostgreSQL Integration Evidence | أدلة تكامل PostgreSQL

The repository guard accepted only the configured isolated test database and rejected equivalence with the application database. Migrations were prepared through the repository-approved test path, using generated non-sensitive rows. The focused Catalog Query PostgreSQL file passed 15/15. It proves one globally ordered Draft+Published page, Archived exclusion, equal `createdAt` tie-breaking by unique Product ID, forward keyset traversal without duplicate/skip, and Listed/Unlisted/NotConfigured projection without Listing filtering, while all ordinary Catalog persistence tests remain green. The initial synthetic Archived fixture omitted/then used an invalid archive reason; this setup-only inconsistency was corrected to the schema-approved `Manual` value before the successful evidence run. No Production credentials or data are recorded. | قبل حارس المستودع قاعدة الاختبار المعزولة فقط، ونُفذت الترحيلات عبر المسار المعتمد وبصفوف اصطناعية غير حساسة. نجحت اختبارات PostgreSQL الخمسة عشر، وأثبتت صفحة Draft+Published واحدة وترتيب التعادل والمؤشر دون تكرار أو فقد وإسقاط حالات الإدراج دون ترشيحها، مع نجاح اختبارات الكتالوج العادي. صُحح عدم اتساق أولي في سبب أرشفة الصف الاصطناعي إلى القيمة المعتمدة `Manual` قبل التشغيل الناجح. لا تسجل الأدلة أسراراً أو بيانات إنتاج.

## Ordinary Catalog Non-Regression | عدم تراجع الكتالوج العادي

The public `CatalogSearchFilters.lifecycle` remains singular. Existing default/explicit lifecycle, normalization, projection, listing defaults, sort, limits, cursor version, and fingerprint serialization remain unchanged. Unit tests include a literal baseline fingerprint; application tests reject operational cursors; PostgreSQL tests retain ordinary exact-lifecycle, filtering, sorting, keyset, tenant, hierarchy, media, and index-plan behavior. | يبقى مرشح دورة الحياة العادي مفرداً، ولم تتغير افتراضاته أو تطبيعه أو إسقاطه أو الإدراج أو الترتيب أو الحدود أو إصدار المؤشر أو تسلسل البصمة. تثبت الاختبارات البصمة الحرفية ورفض المؤشرات التشغيلية وبقاء سلوك PostgreSQL العادي.

## Verification | التحقق

- Baseline branch/HEAD/ancestor/clean-start gate: passed.
- `npx` was unavailable under local PowerShell execution policy; direct local TypeScript CLI was used and passed.
- TypeScript: passed; Next.js build TypeScript phase also passed.
- ESLint: passed.
- Next.js production build: passed and listed both A2 routes.
- Focused unit/HTTP suites: 47/47 passed.
- Focused isolated PostgreSQL suite: 15/15 passed.
- Broad `npm test`: 725 passed, 1 existing platform-permission skip, 0 failed.
- `git diff --check`: passed.
- `npm audit`: not run, as prohibited.

نجحت بوابة الفرع وخط الأساس وTypeScript وESLint وبناء Next.js والاختبارات المركزة والعامة واختبارات PostgreSQL وفحص فروق Git. لم يشغل `npm audit` امتثالاً للمنع.

## Git Integrity | سلامة Git

No Git write was performed: no add, commit, push, merge, rebase, reset, restore, clean, stash, tag, switch, checkout, or branch deletion. The required branch and ancestor remain unchanged. | لم تنفذ أي كتابة Git أو تبديل فرع أو حذف، وبقي الفرع والسلف المطلوبان دون تغيير.

## DEV-001 Integrity | سلامة DEV-001

The final review ZIP contains exact changed source/documentation, focused sanitized command evidence, PostgreSQL integration evidence, Git evidence, and an integrity manifest with SHA-256 and byte size for every payload. The detached ZIP digest, archive opening, manifest coverage/hashes/sizes, and bundled/exported report identity are independently verified. Secrets, connection strings, `.env` files, Production data, Git internals, generated datasets, and unrelated build output are excluded. | تحتوي الحزمة المصدر والوثائق الدقيقة والأدلة المنقحة وبيان سلامة لكل حمولة. تُتحقق بصمة ZIP المنفصلة وفتح الأرشيف وتغطية البيان وتطابق التقرير. تستبعد الأسرار وسلاسل الاتصال وملفات البيئة وبيانات الإنتاج وداخل Git والبيانات المولدة ومخرجات البناء غير المرتبطة.

## Risks | المخاطر

- Operational discovery is selection-only; it must not be reused as ordinary Catalog cards/details.
- Capability/action projections are advisory; every mutation must continue to reauthorize and revalidate state.
- Cursor compatibility relies on preserving the ordinary fingerprint serializer and operational fingerprint fields.

- الاكتشاف التشغيلي للاختيار فقط ولا يستبدل عرض الكتالوج.
- القدرات والأفعال إرشادية، وتبقى إعادة التفويض والتحقق واجبة عند التعديل.
- يعتمد توافق المؤشر على ثبات بصمة الكتالوج العادي وحقول البصمة التشغيلية.

## Known Limitations | القيود المعروفة

A2 adds no management UI, client hook, Reservation read, Pricing management read, or Inventory disclosure change. Operational discovery does not guarantee that a selected resource remains mutable; the dedicated resource read and mutation remain authoritative. | لا تضيف A2 واجهة أو خطاف عميل أو قراءة حجوزات أو قراءة إدارة تسعير أو تغيير كشف مخزون. لا يضمن الاكتشاف بقاء المورد قابلاً للتعديل؛ تبقى قراءة المورد والطفرات مرجع الحقيقة.

## Architecture Changes | تغييرات المعمارية

No architecture redesign. The only internal contract extension is `CatalogLifecycleScope` on the existing Catalog Query repository query. | لا توجد إعادة تصميم معماري؛ التوسعة الداخلية الوحيدة هي `CatalogLifecycleScope` في عقد مستودع Catalog Query الحالي.

## Summary | الخلاصة

A2 with its bounded R1 test correction is implemented within the exact approved server boundary and is `ReadyForReview`. R1 changed no production code. Catalog Query remains canonical; operational lifecycle is one Draft+Published SQL query; ordinary cursors remain compatible; Listing state/revision is authoritative; and schema/dependencies/Presentation remain untouched. | نُفذت A2 مع تصحيح R1 الاختباري المحدود ضمن حدود الخادم المعتمدة وهي جاهزة للمراجعة، ولم يغير R1 كود الإنتاج. بقي Catalog Query مرجعاً وحيداً، والاستعلام التشغيلي واحد، والمؤشر العادي متوافق، وحالة الإدراج ومراجعتها موثوقتان، ولم يمس المخطط أو الاعتماديات أو الواجهة.

## Next Recommendation | التوصية التالية

Submit A2 and its DEV-001 bundle for independent review and merge. **A3 is NOT automatically approved and is NOT started. A4 is NOT started. A5 is NOT started. Task 3.22 Presentation is BLOCKED. Migration 0016 is NOT REQUIRED.** Stop here; do not begin another slice automatically. | قدم A2 وحزمة DEV-001 للمراجعة المستقلة والدمج. **A3 غير معتمدة تلقائياً ولم تبدأ، وA4 لم تبدأ، وA5 لم تبدأ، وواجهة 3.22 محجوبة، والترحيل 0016 غير مطلوب.** يجب التوقف هنا وعدم بدء شريحة أخرى تلقائياً.
