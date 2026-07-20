# ADR-008: Product Repository Contract and Optimistic Concurrency | عقد مستودع المنتج والتحكم بالتزامن المتفائل

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

### Context

The canonical Product Aggregate now owns identity, composition, lifecycle, Revision, publication decisions, and Domain Events. Future Application use cases need one persistence-agnostic port that saves and returns the complete Aggregate while preventing cross-Workspace access, duplicate identity or Product Code, and lost updates. Database technology and persistence representation remain undecided.

The existing synchronous `ProductEntity` mock repository serves a legacy read model. It is compatibility code, not the canonical Aggregate persistence contract.

### Decision

`ProductRepository` is the canonical persistence port in the Catalog repository layer. It accepts and returns canonical Product Aggregates and exposes only:

- `findById(workspaceId, productId)` for explicitly Workspace-scoped retrieval;
- `create(product)` for explicit insertion; and
- `update(product, expectedPersistedRevision)` for explicit replacement of an existing Aggregate.

Create and update are separate operations. A nullable expected Revision must not select between them. Create requires no expected persisted Revision and does not require the current Product Revision to be 0. It must atomically reject an existing Product ID or conflicting Product Code.

Update receives the Revision observed when the Product was loaded. The adapter may replace the complete persisted Aggregate only when stored Revision equals that expected value. The current Aggregate Revision may be higher after Domain changes. A mismatch returns a structured Revision conflict containing Product ID, expected Revision, and actual persisted Revision; it must never overwrite newer data. No automatic retry or merge is part of this contract.

Every operation is Workspace-scoped. Retrieval receives `WorkspaceId` explicitly; create and update derive their mandatory scope from immutable Product Identity. An adapter must not return or update a Product outside that scope and cannot reassign its Workspace.

`ProductCode` is an optional immutable Domain value for Drafts. Its canonical representation trims surrounding whitespace and uses uppercase, making comparisons case-insensitive. When present, it is unique across the complete Workspace, not within one Catalog, and remains reserved across Draft, Published, and Archived lifecycle states. Atomic create/update enforcement is authoritative.

An advisory availability query is not included now because no current Application use case consumes it. A later port extension may add a Workspace-scoped query with an optional excluded Product ID, but it can never replace atomic write enforcement.

Repository methods do not pull, clear, create, persist, publish, or dispatch Domain Events. Event orchestration belongs to a future Application use case after successful persistence. Expected create and update conflicts use immutable discriminated results. Unexpected infrastructure failures remain thrown or rejected failures and are not disguised as business outcomes.

### Alternatives considered

- A combined save/upsert operation with nullable expected Revision was rejected because it obscures create intent and can silently create missing Products.
- Catalog-scoped Product Code uniqueness was rejected because codes identify Products across the Workspace.
- Case-sensitive Product Codes were rejected because equivalent human input would create duplicates.
- Releasing codes on archive was rejected because archived identity remains reserved and restorable.
- Database DTOs in the port were rejected because they couple Application and Domain to Infrastructure.
- An advisory availability query was deferred because it has no current consumer and cannot guarantee uniqueness.
- Selecting a database or implementing an adapter now was deferred to the next approved architecture task.

### Consequences

Future Application services receive stable typed outcomes for creation, not-found, Revision conflict, and Product Code conflict. Future adapters must atomically check Workspace-wide uniqueness and expected persisted Revision while mapping the complete Aggregate. Existing legacy Product read models remain separate compatibility models.

### Risks

An adapter that checks availability before writing without a database-level atomic guarantee can still admit duplicates. Incorrect mapping can lose Revision, canonical Product Code, composition, timestamps, or lifecycle. Callers must retain the Revision observed at load time rather than substituting the Aggregate's post-mutation Revision as the expected persisted value.

### Future implications

A later persistence ADR and adapter must select database technology, define schema and mapping, implement atomic Product ID and Product Code constraints, and perform compare-and-update using Revision. Conflict recovery, merge behavior, retry, Domain Event dispatch, and Outbox behavior require separate decisions.

## العربية

### السياق

يملك Product Aggregate المعتمد الآن الهوية والتركيب ودورة الحياة والمراجعة وقرارات النشر وأحداث Domain. تحتاج حالات استخدام Application المستقبلية إلى منفذ تخزين واحد مستقل عن التقنية يحفظ Aggregate كاملاً ويعيده، ويمنع الوصول عبر مساحات العمل وتكرار الهوية أو Product Code وفقدان التحديثات. تبقى تقنية قاعدة البيانات وتمثيل التخزين غير محددين.

يخدم مستودع `ProductEntity` الوهمي المتزامن الحالي نموذج قراءة قديماً. إنه شفرة توافق وليس عقد تخزين Aggregate المعتمد.

### القرار

يمثل `ProductRepository` منفذ التخزين المعتمد في طبقة مستودعات Catalog. يقبل Product Aggregates المعتمدة ويعيدها، ولا يعرض إلا:

- `findById(workspaceId, productId)` للاسترجاع المقيد صراحة بمساحة العمل؛
- `create(product)` للإنشاء الصريح؛
- `update(product, expectedPersistedRevision)` للاستبدال الصريح لـ Aggregate موجود.

الإنشاء والتحديث عمليتان منفصلتان، ولا يجوز استخدام مراجعة متوقعة nullable للاختيار بينهما. لا يتطلب الإنشاء مراجعة مخزنة متوقعة ولا يشترط أن تكون مراجعة Product الحالية 0. يجب أن يرفض ذرياً معرف Product الموجود أو Product Code المتعارض.

يتلقى التحديث المراجعة التي شوهدت عند تحميل Product. لا يجوز للمحول استبدال Aggregate المخزن كاملاً إلا عندما تطابق المراجعة المخزنة تلك القيمة المتوقعة. قد تكون مراجعة Aggregate الحالية أعلى بعد تغييرات Domain. يعيد عدم التطابق تعارض مراجعة منظماً يحتوي معرف Product والمراجعة المتوقعة والمراجعة المخزنة الفعلية، ولا يجوز أن يستبدل بيانات أحدث. لا يتضمن العقد إعادة محاولة أو دمجاً تلقائياً.

كل العمليات مقيدة بمساحة العمل. يتلقى الاسترجاع `WorkspaceId` صراحة، بينما يستمد الإنشاء والتحديث نطاقهما الإلزامي من هوية Product الثابتة. لا يجوز للمحول إعادة Product أو تحديثه خارج هذا النطاق ولا إعادة تعيين مساحة عمله.

يمثل `ProductCode` قيمة Domain ثابتة واختيارية في Draft. يزيل تمثيله المعتمد المسافات المحيطة ويستخدم الأحرف الكبيرة، ولذلك تكون المقارنة غير حساسة لحالة الأحرف. عندما يوجد يكون فريداً عبر مساحة العمل كاملة لا داخل Catalog واحد، ويبقى محجوزاً في حالات Draft وPublished وArchived. يمثل الإنفاذ الذري عند الإنشاء والتحديث الضمان المعتمد.

لا يضاف استعلام إرشادي للتوفر الآن لعدم وجود حالة استخدام حالية تستهلكه. قد يضيف امتداد لاحق للمنفذ استعلاماً مقيداً بمساحة العمل مع معرف Product مستثنى اختيارياً، لكنه لا يمكن أن يحل محل الإنفاذ الذري للكتابة.

لا تسحب طرق Repository أحداث Domain ولا تمسحها أو تنشئها أو تخزنها أو تنشرها أو ترسلها. ينتمي تنسيق الأحداث إلى حالة استخدام Application مستقبلية بعد نجاح التخزين. تستخدم تعارضات الإنشاء والتحديث المتوقعة نتائج مميزة وثابتة. تبقى أعطال البنية التحتية غير المتوقعة أخطاء مرفوضة أو thrown ولا تُخفى كأنها نتائج أعمال.

### البدائل المدروسة

- رُفضت عملية save/upsert موحدة ذات مراجعة متوقعة nullable لأنها تخفي نية الإنشاء وقد تنشئ منتجاً مفقوداً بصمت.
- رُفض تفرد Product Code ضمن Catalog لأنه يعرف المنتجات عبر Workspace.
- رُفضت حساسية Product Code لحالة الأحرف لأنها تسمح بتكرار إدخالات بشرية متكافئة.
- رُفض تحرير الرمز عند الأرشفة لأن الهوية المؤرشفة تبقى محجوزة وقابلة للاستعادة.
- رُفض كشف DTOs قاعدة البيانات عبر المنفذ لأنه يربط Application وDomain بالبنية التحتية.
- أُجل استعلام التوفر الإرشادي لعدم وجود مستهلك حالي ولأنه لا يضمن التفرد.
- أُجل اختيار قاعدة البيانات وتنفيذ المحول إلى مهمة العمارة المعتمدة التالية.

### النتائج

تحصل خدمات Application المستقبلية على نتائج typed مستقرة للإنشاء وعدم العثور وتعارض المراجعة وتعارض Product Code. يجب أن تتحقق المحولات المستقبلية ذرياً من التفرد عبر Workspace ومن المراجعة المخزنة المتوقعة أثناء تحويل Aggregate كاملاً. تبقى نماذج قراءة Product القديمة نماذج توافق منفصلة.

### المخاطر

قد يسمح محول يتحقق من التوفر قبل الكتابة دون ضمان ذري في قاعدة البيانات بالتكرار. قد يفقد التحويل غير الصحيح المراجعة أو Product Code المعتمد أو التركيب أو الأوقات أو دورة الحياة. يجب أن يحتفظ المستدعون بالمراجعة التي شوهدت عند التحميل بدلاً من استخدام مراجعة Aggregate بعد التغيير كقيمة مخزنة متوقعة.

### الآثار المستقبلية

يجب أن يختار ADR ومحول تخزين لاحقان تقنية قاعدة البيانات ويعرفا المخطط والتحويل وينفذا قيود Product ID وProduct Code الذرية والمقارنة والتحديث بالمراجعة. تحتاج استعادة التعارض والدمج وإعادة المحاولة وإرسال أحداث Domain وOutbox إلى قرارات منفصلة.

## Related Documents | الوثائق المرتبطة

- [ADR-002: Product Aggregate](ADR-002-Product-Aggregate.md)
- [ADR-007: Product Revision and Publication Decision Integrity](ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)
- [Persistence Boundaries](../../04-Infrastructure/Persistence-Boundaries.md)
- [Product Use Cases](../../03-Application/Product-Use-Cases.md)
