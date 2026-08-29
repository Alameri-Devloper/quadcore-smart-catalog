# Catalog Query and Search | استعلام الكتالوج والبحث

## English

### Boundary and ownership

`domains/catalog/query` is a query-only Clean Architecture boundary. It projects the canonical Workspace Product, Task 3.16 Reference Data, Task 3.17 Branch listing/pricing, Inventory balance, and Product Media tables directly from PostgreSQL. It does not define another Product aggregate, own writes, call other repositories, or maintain an asynchronous/denormalized source of truth. Application use cases own authorization and orchestration; the PostgreSQL adapter owns parameterized joins; route handlers only validate transport input and map typed results.

Every query begins with `TrustedActorContext.workspaceId`. A requested `branchId` is accepted only after both trusted Branch-scope validation and an active same-Workspace Branch lookup. A missing, foreign, inactive, or out-of-scope Branch receives the same non-disclosing `BranchNotFound` result. Product and Reference joins always include `workspace_id`.

### Read models and disclosure

Search returns compact Product Cards: identity, classification labels, main-media identifier/alt text, lifecycle, optional Branch ID/listing, and only authorized commercial/availability fields. Details return ordered media and persisted specification values independently of current Product Type template membership, with optional same-Workspace Specification Definition metadata. Persisted Product value position defines historical specification order. Storage keys are never projected. Same-Workspace inactive reference labels and Specification Definitions remain visible on historical Product details, while filter options contain Active values only.

The application omits unauthorized fields entirely. Retail requires `pricing.view`; Wholesale requires `pricing.wholesale.view`; derived `InStock`/`OutOfStock` availability requires a Branch plus `inventory.availability.view` or quantity authority; the exact `available`, `onHand`, `reserved`, and `damaged` quantities require a Branch plus `inventory.quantity.view`. Availability-only DTOs never contain numeric stock values. Reference Cost is forced off in the card repository query and is present only in internal details with `referenceCost.view`. Money remains PostgreSQL `BIGINT` / TypeScript `bigint` and becomes a decimal string at HTTP serialization.

### Search, filters, ranking, and hierarchy

Search trims and collapses whitespace, supports case-insensitive English and PostgreSQL `simple` text-token behavior for Arabic, and parameterizes every value. It searches Product name/code plus Brand, Category, and Product Type display names. Ranking is deterministic: exact code, exact name, code/name prefixes, exact/prefix reference labels, FTS rank, then Product name/code trigram similarity; `productId` is the final tie-breaker. No translation, NLP, specification scan, external search engine, or asynchronous projection is used.

Supported filters are Department, Category, Product Type, Brand, Device Class, Condition, Supply Status, lifecycle, Branch listing, stock availability, and precision-safe Retail range/currency. The hierarchy policy is typed rejection: unknown/inactive/foreign IDs, inactive ancestors, or incompatible Department → Category → Product Type combinations return `InvalidQuery`. Filter options omit an Active child whose Category or Department ancestor is Inactive. With Branch context, listing defaults to `Listed`; `Unlisted`, `NotConfigured`, and `Any` require Catalog edit authority. `InStock` means `onHand - reserved - damaged > 0`; `OutOfStock` means zero.

Retail range and Retail sort require an explicit ISO-style three-letter currency so unlike minor-unit currencies are never compared. Null prices are retained for Retail sorting and ordered last. Fixed sorts are `relevance`, `newest`, `name-asc`, `name-desc`, `retail-price-asc`, and `retail-price-desc`; browser-provided SQL fields are impossible.

### Pagination and HTTP

Cursor pagination defaults to 24 and rejects limits outside 1–60. The opaque base64url cursor contains only version, fixed sort, SHA-256 query fingerprint, sort position, null rank where needed, and Product ID. It is canonical-form validated and bound to normalized filters, Branch request, sort, and visibility. Before repository execution, validation enforces a canonical finite relevance score, exact `Date.toISOString()` newest timestamp, bounded lowercase name value with no null rank, BIGINT-safe Retail value and strict null tuple, and the normal Catalog identifier contract for Product ID. It contains no actor, Workspace, permission, or Branch authority; current trusted context is re-evaluated on every request.

Endpoints are `GET /api/catalog/products`, `GET /api/catalog/products/[productId]`, and `GET /api/catalog/filters`. Unknown/duplicate parameters are rejected. Responses use `Cache-Control: private, no-store` to avoid tenant, Branch, or sensitive-price cache leakage.

### PostgreSQL and performance baseline

Migration `0015_bumpy_terrax.sql` safely installs `pg_trgm` and creates focused indexes for Workspace/lifecycle/newest browsing, normalized name order, base Retail lookup, FTS, Product name/code trigram matching, Branch listing, and inventory availability. Brand, Category, and Product Type exact/prefix matching is a real candidate path, but no speculative reference-label trigram indexes are retained because V1 does not provide fuzzy reference-label search. Existing primary/lookup indexes cover effective Branch override joins. The card page is one SQL query with joins and a lateral main-media selection; details use one identity/projection query plus one ordered-media and one persisted-specification query—constant query count, never one query per Product.

Performance verification used 5,004 sanitized Products, two Workspaces, one active Branch, canonical Reference rows, listings, balances, and prices in the guarded test database. After `ANALYZE`, the actual `created_at DESC, product_id ASC` Workspace/lifecycle browse shape used `catalog_products_query_newest_idx` through an Index Only Scan Backward plus Incremental Sort for the mixed-direction Product-ID tie break. This proves index eligibility on the sanitized fixture only; it is not a Production latency claim.

### Presentation, responsive behavior, and accessibility

Task 3.18 does not add or connect a Catalog browsing UI, so responsive layout, touch/mouse/keyboard interaction, RTL/LTR chrome, and visual accessibility QA are not applicable to this implementation. The transport contracts are browser-safe and ready for a separately reviewed Presentation task.

### Task 3.20 Presentation integration and focused contract corrections

Task 3.20 adds the authenticated `/catalog` and `/catalog/[productId]` Presentation over the existing query HTTP boundary. URL parameters are the meaningful browse-state authority; server cursors remain opaque and are discarded whenever search, filter, sort, or Branch input changes. Details links carry a canonical `returnTo` path and requested `branchId`, while the browser never supplies Workspace, actor, role, permission, or Branch-scope authority. API failure produces an explicit typed state and never falls back to legacy mock Products. Cards cannot represent Reference Cost, and the browser-safe adapter reconstructs only allow-listed DTO fields.

Implementation exposed four narrow contract gaps needed by the approved Presentation. The existing filter DTO now returns active, trusted-scope Branch choices, enabled currency codes, and server-derived filter capabilities; non-editors receive Published/Listed choices only. Details now return independent `directSharePriceModes`, derived from trusted sharing and Retail/Wholesale authority plus Product/Branch eligibility. Ordinary viewers receive non-disclosing not-found results for unpublished or Branch-unlisted details. Approved Catalog media is served through an authenticated, private, same-origin WebP route; storage roots, keys, checksums, and filesystem paths remain infrastructure-only, and unpublished media is unavailable to ordinary viewers. These are focused corrections to the existing read contract, not a second query service or convenience BFF.

The Presentation renders decimal-string Money through the canonical bigint/ISO minor-unit formatter, independently omits Retail or Wholesale when absent, shows exact Inventory only when returned, preserves historical labels/specifications in server order, and labels Reference Cost as internal on Details only. The same mobile-first component system supports English/LTR and Arabic/RTL, semantic controls, visible focus, keyboard/touch operation, responsive grids, loading/empty/error announcements, and media fallbacks without external URLs.

### تكامل العرض في المهمة 3.20 وتصحيحات العقد المحدودة

تضيف المهمة 3.20 مساري `/catalog` و`/catalog/[productId]` الموثقين فوق حدود HTTP الحالية للاستعلام. تمثل معاملات URL حالة التصفح ذات المعنى، ويبقى مؤشر الخادم معتماً ويُحذف عند تغيير البحث أو المرشح أو الترتيب أو الفرع. يحمل رابط التفاصيل مسار عودة معتمداً و`branchId` مطلوباً فقط، ولا يرسل المتصفح هوية مساحة العمل أو الممثل أو الدور أو الصلاحيات أو نطاق الفروع. يؤدي فشل API إلى حالة خطأ صريحة ومصنفة ولا يؤدي أبداً إلى عرض منتجات وهمية قديمة.

كشف التكامل أربع فجوات عقدية محدودة: يعيد عقد المرشحات الآن الفروع النشطة ضمن النطاق الموثوق والعملات المفعلة والقدرات المشتقة على الخادم؛ وتعيد التفاصيل أوضاع مشاركة التجزئة والجملة بصورة مستقلة ومشتقة من السياق الموثوق وأهلية المنتج والفرع. كما تُخفى تفاصيل المنتجات غير المنشورة أو غير المدرجة في الفرع عن قارئ الكتالوج العادي بنتيجة عامة، وتُعرض وسائط الكتالوج المعتمدة عبر مسار WebP موثق وخاص من الأصل نفسه دون كشف مفاتيح التخزين أو البصمات أو مسارات الملفات. هذه تصحيحات مركزة لعقد القراءة وليست خدمة استعلام ثانية.

يعرض المكوّن المالي النص العشري عبر منسق `bigint` المعتمد، ولا يستنتج سعر التجزئة أو الجملة أو كميات المخزون عند غيابها. تظهر التكلفة المرجعية في التفاصيل الداخلية فقط عند إعادتها من الخادم، وتبقى المواصفات والتسميات التاريخية بترتيب الخادم. يدعم نظام المكونات نفسه الهاتف واللوحي وسطح المكتب، والإنجليزية من اليسار إلى اليمين والعربية من اليمين إلى اليسار، ولوحة المفاتيح واللمس، وحالات التحميل والفراغ والخطأ، وبدائل الوسائط الآمنة.

## العربية

### الحدود والملكية

تُعد الوحدة `domains/catalog/query` حدًا مخصصًا للقراءة وفق Clean Architecture. وهي تعرض بيانات المنتج الأساسية المملوكة لمساحة العمل، والبيانات المرجعية من المهمة 3.16، وحالة عرض الفرع وتسعيره من المهمة 3.17، وأرصدة المخزون، ووسائط المنتج مباشرة من PostgreSQL. لا تنشئ الوحدة Product Aggregate آخر، ولا تملك عمليات كتابة، ولا تستدعي مستودعات أخرى، ولا تنشئ مصدر حقيقة غير متزامن أو مكرر. تملك طبقة التطبيق التفويض والتنسيق، ويملك محول PostgreSQL الاستعلامات المعلّمة، وتبقى Route Handlers رقيقة.

يبدأ كل استعلام من `TrustedActorContext.workspaceId`. ولا يُستخدم `branchId` المطلوب إلا بعد التحقق من نطاق الفروع الموثوق ومن وجود فرع نشط داخل مساحة العمل نفسها. تُعاد نتيجة `BranchNotFound` غير الكاشفة للحالات المفقودة أو الخارجية أو غير النشطة أو الخارجة عن النطاق. وتشمل جميع روابط المنتج والبيانات المرجعية شرط `workspace_id`.

### نماذج القراءة ومنع الإفصاح

تعيد نتائج البحث بطاقات مختصرة تحتوي هوية المنتج وتصنيفاته ومعرّف صورة الغلاف والنص البديل ودورة الحياة، مع فرع وحالة عرض اختيارية، والحقول التجارية والمخزنية المصرح بها فقط. تبدأ مواصفات التفاصيل من قيم مواصفات المنتج المخزنة بصرف النظر عن العضوية الحالية في قالب نوع المنتج، وتحل بيانات تعريف المواصفة من مساحة العمل نفسها عند توفرها، ويحدد موضع قيمة المنتج ترتيب العرض التاريخي. لا تُعرض مسارات التخزين مطلقًا. تبقى أسماء المراجع وتعريفات المواصفات التاريخية غير النشطة ظاهرة للمنتج داخل مساحة العمل نفسها، بينما تعيد خيارات التصفية القيم النشطة فقط.

تحذف طبقة التطبيق الحقول غير المصرح بها بالكامل. يتطلب سعر التجزئة `pricing.view`، وسعر الجملة `pricing.wholesale.view`، وتتطلب حالة الإتاحة المشتقة `InStock` أو `OutOfStock` فرعًا وصلاحية الإتاحة أو الكمية. لا تظهر القيم الرقمية `available` و`onHand` و`reserved` و`damaged` إلا مع فرع وصلاحية `inventory.quantity.view`، ولا تحتوي استجابة الإتاحة فقط أي كمية رقمية. لا تظهر التكلفة المرجعية في بطاقات البحث مطلقًا، ولا تظهر في التفاصيل الداخلية إلا مع `referenceCost.view`. تبقى الأموال `BIGINT` في PostgreSQL و`bigint` في TypeScript وتتحول إلى نص عشري في HTTP.

### البحث والتصفية والترتيب

يطبع البحث المسافات ويزيل الزائد منها، ويدعم الإنجليزية دون حساسية لحالة الأحرف وتقسيم PostgreSQL البسيط للنص العربي، مع تمرير كل القيم كمعاملات آمنة. يشمل البحث اسم المنتج ورمزه والعلامة التجارية والفئة ونوع المنتج. الترتيب حتمي: تطابق الرمز الكامل، ثم الاسم الكامل، ثم بادئات الرمز والاسم، ثم أسماء المراجع الكاملة وبادئاتها، ثم FTS، ثم تشابه trigram، وأخيرًا `productId`. لا توجد ترجمة آلية أو NLP أو مسح عام للمواصفات أو محرك بحث خارجي أو إسقاط غير متزامن.

تشمل المرشحات القسم والفئة ونوع المنتج والعلامة التجارية وفئة الجهاز والحالة وحالة التوريد ودورة حياة المنتج وحالة عرض الفرع والإتاحة ونطاق سعر التجزئة. سياسة تسلسل القسم ← الفئة ← نوع المنتج هي الرفض المطبوع: تعيد التركيبات غير المتوافقة أو المعرّفات غير النشطة أو الخارجية أو ذات السلف غير النشط `InvalidQuery`، ولا تعرض خيارات التصفية ابنًا نشطًا تحت فئة أو قسم غير نشط. عند اختيار فرع تكون الحالة الافتراضية `Listed`، وتتطلب الحالات التشغيلية الأخرى صلاحية تعديل الكتالوج. تعني `InStock` أن `onHand - reserved - damaged > 0` وتعني `OutOfStock` أن الناتج صفر.

يتطلب نطاق سعر التجزئة أو فرزه رمز عملة صريحًا من ثلاثة أحرف لمنع مقارنة وحدات صغرى لعملات مختلفة. تبقى الأسعار المفقودة ضمن الفرز وتأتي أخيرًا. مفردات الفرز ثابتة ولا يمكن للمتصفح تمرير أسماء أعمدة SQL.

### التصفح المتتابع وHTTP

الحجم الافتراضي للصفحة 24، وتُرفض القيم خارج 1–60. يحتوي المؤشر المعتم على الإصدار والفرز الثابت وبصمة SHA-256 للاستعلام وموضع الفرز وترتيب NULL عند الحاجة ومعرّف المنتج فقط. قبل تنفيذ المستودع، يفرض التحقق درجة ملاءمة رقمية محدودة وصيغة زمن مطابقة لـ`Date.toISOString()` وقيمة اسم محدودة الطول وصغيرة الأحرف دون ترتيب NULL وقيمة سعر آمنة لـBIGINT مع زوج NULL صحيحًا وعقد معرّف الكتالوج المعتاد لمعرّف المنتج. لا يحمل المؤشر صلاحيات أو هوية موثوقة، ويُعاد تقييم السياق الموثوق في كل طلب.

المسارات هي `GET /api/catalog/products` و`GET /api/catalog/products/[productId]` و`GET /api/catalog/filters`. تُرفض المعاملات المجهولة أو المكررة، وتستخدم الاستجابات `Cache-Control: private, no-store` لمنع تسرب بيانات مساحة العمل أو الفرع أو الأسعار الحساسة عبر التخزين المؤقت.

### PostgreSQL والأداء

تثبت الهجرة `0015_bumpy_terrax.sql` إضافة `pg_trgm` بأمان، وتضيف فهارس مركزة للتصفح والاسم وسعر التجزئة وFTS وtrigram لاسم المنتج ورمزه وعرض الفرع وإتاحة المخزون. أصبح تطابق بادئات Brand وCategory وProduct Type مسار مرشح فعليًا، ولم تُحتفظ بفــهارس trigram تخمينية لأسماء المراجع لأن الإصدار الأول لا يدعم البحث التقريبي فيها. تستخدم بطاقة الصفحة استعلام SQL واحدًا، وتستخدم التفاصيل عددًا ثابتًا من ثلاثة استعلامات؛ لذلك لا يوجد N+1.

استخدم التحقق من الأداء 5,004 منتجات تجريبية منقحة في قاعدة الاختبار المحمية. بعد `ANALYZE` استخدم الشكل الفعلي `created_at DESC, product_id ASC` الفهرس `catalog_products_query_newest_idx` عبر Index Only Scan Backward مع Incremental Sort لكسر التعادل المختلط الاتجاه. يثبت ذلك أهلية الفهرس لهذه البيانات التجريبية فقط ولا يمثل ادعاءً بزمن استجابة الإنتاج.

### العرض والاستجابة وإمكانية الوصول

لا تضيف المهمة 3.18 واجهة تصفح ولا تربط واجهة قائمة، لذلك لا ينطبق اختبار التخطيط المتجاوب أو اللمس والفأرة ولوحة المفاتيح أو RTL/LTR أو الاختبار البصري لإمكانية الوصول على هذا التنفيذ. عقود HTTP آمنة للمتصفح وجاهزة لمهمة عرض مستقلة خاضعة للمراجعة.
