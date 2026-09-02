# Current Roadmap | خارطة الطريق الحالية

**Status:** Reservation performance gate outcome is `EXISTING INDEX SUFFICIENT`; Task 3.22-A is the sole Approved Next Implementation pending independent review, beginning with A1 · **Last Updated:** 2026-09-02 · **Scope:** Authoritative delivery sequence

## English

### Authority and status meanings

This document is the current delivery authority. The original [project roadmap](../00-Project/Roadmap.md) is historical direction, not evidence that a capability is implemented. Architecture documents and merged source remain the implementation truth.

- **Completed / merged:** independently reviewed and present in the integration branch history.
- **Approved next implementation:** the only task authorized for implementation after this planning review.
- **Planned:** sequenced for later definition; not implementation approval.
- **Deferred:** intentionally postponed until a bounded task is approved.
- **Vision-only:** directional intent without delivery commitment.
- **ADR-gated:** implementation must not begin before the named architecture decision is approved.

### Completed and merged baseline

| Task | Merged outcome | Boundary that remains |
| --- | --- | --- |
| 3.14 | Product lifecycle, Product Entry, local draft, media upload/workflow, and responsive entry foundations | Approval workflow, version history, and broader workflow automation remain future work. |
| 3.15 | Workspace identity, server sessions, member administration, authentication/recovery/bootstrap, and bilingual account Presentation | A concrete production WhatsApp recovery provider remains fail-closed and separately decision-gated. |
| 3.16 | Workspace Catalog Reference Data, hierarchy/template contracts, management APIs, and live Product Entry integration | No Reference Data management page or starter-data bootstrap exists. |
| 3.17 | Branch lifecycle, listing, Inventory ledger/read models, base/Branch pricing, permissions, and transactional APIs | No Branch, Inventory, or Pricing management Presentation exists; this is not general Multi-Warehouse support. |
| 3.18 | Workspace- and Branch-safe Catalog query/search, filters, Product Cards, Product Details, cursor pagination, and permission-filtered read APIs | No canonical Catalog browsing or Product Details Presentation exists. Search is deterministic PostgreSQL search, not AI/NLP search. |
| 3.19 | Customer-safe Direct Device Sharing payload, authenticated media handoff, Web Share/Clipboard/manual fallback, and reusable Presentation component | No public Product URL, recipient integration, WhatsApp delivery, delivery receipt, or analytics exists. |
| 3.20 | Canonical authenticated Catalog browsing and Product Details Presentation; Direct Device Sharing integration; canonical URL/query-state navigation; server-authorized Retail, Wholesale, and Inventory rendering; safe N.A. Money Presentation and semantic active-filter corrections from 3.20-R1; authenticated Catalog media transport | No public Product sharing, anonymous access, WhatsApp integration, Reference Data management, or Branch/Inventory/Pricing management exists. |
| 3.21 | Authenticated bilingual Catalog Reference Data management Presentation, typed HTTP coordination, conflict recovery, native accessible deactivation confirmation, and exact focus restoration | No Branch, Inventory, or Pricing management Presentation was added. |

The current integration baseline is `69f0bd48628a5ae4018504dae8bce1d11b0d8d43` on `feature/product-entry-engine`. It contains Tasks 3.14–3.21 plus the Task 3.22-A planning corrections merged through PR #26. The preceding Task 3.22 Planning/Planning-R1 baseline remains `260b4116749d3460b8262b3ccf034b8ba26d00a5` through PR #25, and Task 3.21 remains merged through PR #24 at `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.

### Task 3.22 planning-gate decision — ReScopeRequired

**Task 3.22 — Branch, Inventory, and Pricing Management Presentation** remains **not implementation-approved**. The planning gate confirmed that the Task 3.17 mutation contracts, transaction ownership, atomic transfer, tenant isolation, Money model, and optimistic/idempotent concurrency foundations are sound, but the complete operational Presentation cannot be implemented safely from existing browser-facing reads alone.

The smallest source-proven contract gaps, corrected by Planning-R1, are:

- management read and mutation permissions are independent: listing read requires `catalog.products.view` while listing mutation accepts `catalog.product.edit` or `catalog.products.edit`; Branch pricing read requires `pricing.view` while override mutation uses `pricing.branchOverride.manage`; Reference Cost visibility requires `pricing.view` and `referenceCost.view` while its base/override mutations use independent manage permissions;
- listing Product discovery is compatible only for actors who also hold `catalog.products.view` and plural `catalog.products.edit`; a valid singular-only `catalog.product.edit` mutation actor cannot use Task 3.18 expanded lifecycle/listing discovery, and the standard Catalog Staff template currently has this singular-only edit composition;
- no active reservation list/detail read exists from which Release and Fulfill can safely select the current reservation and remaining quantity;
- no Branch-independent Workspace base-pricing read supplies authoritative current Retail, Wholesale, and Reference Cost values/revisions, and `pricing.manage`/`referenceCost.manage` do not imply the corresponding read permissions;
- Task 3.18 Product search cannot discover every Task 3.17-valid Inventory, Pricing, or Reference Cost target because those operational permissions do not imply Catalog view/edit authority;
- availability-only direct Inventory reads retain numeric `available`, while Inventory mutation responses contain detailed balances without a separate quantity-disclosure check;
- no bounded server-derived management-authority/capability projection resolves these read/manage compositions without exposing raw permissions, role, Workspace/actor identity, or allowed Branch IDs.

Task 3.22 remains **Planned / blocked** and is not implementation-approved until every Task 3.22-A slice is independently reviewed and merged. The Reservation performance gate resolves the remaining A3 persistence question without changing the other Planning-R1/R2 decisions. See [Sprint 03 Continuation](Sprint-03-Continuation.md), the historical [Task 3.22-A Planning Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-Final-Report.md), the historical [Task 3.22-A Planning-R1 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R1-Final-Report.md), the corrective [Task 3.22-A Planning-R2 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R2-Final-Report.md), the [Reservation Performance Planning Final Report](../05-Development/Reports/QSC-Task-3.22-A-Reservation-Performance-Planning-Final-Report.md), and the [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md).

### Task 3.22-A Reservation performance gate — Existing index sufficient

**Task 3.22-A — Operational Management Contract Remediation** is the **sole Approved Next Implementation pending independent review**, with **A1 first**. The isolated PostgreSQL evidence gate measured the approved Product-scoped actionable Reservation keyset query against the current `(workspace_id, branch_id, product_id, status)` index at 10, 100, 1,000, and 10,000 actionable rows plus equal terminal rows. PostgreSQL selected that index in all first-page and deep-cursor plans. At stress cardinality, the current plan used 28 kB top-N heapsort memory, zero temporary I/O, and 217 shared-hit blocks; the measured execution time was 3.775 ms for the first page and 2.006 ms for the deep page. Timing is supporting evidence, not a service-level budget.

The gate outcome is exactly **`EXISTING INDEX SUFFICIENT`** for the approved current use case and measured range. No Candidate Optimization was created because the current plan showed no material concern, no migration `0016` is required, and the migration chain remains `0000–0015`. A1 retains the repository-free effective capability projection in Identity Application; A2 retains one canonical Catalog Query SQL/keyset result over server-derived Draft+Published lifecycle scope; A3 implements `(updatedAt DESC, reservationId DESC)` pagination using the current index; A4 retains one shared Product revision for Retail/Wholesale and a separate Reference Cost revision; A5 retains server-side Inventory disclosure projection. Task 3.22 Presentation remains blocked.

Task 3.21 is **Completed / merged** through PR #24 at baseline `4f1115d2ac98fc4411ac46f081652554f6d04ec9`. Its approved historical contract remains [Task 3.21 Implementation Contract](Task-3.21-Implementation-Contract.md).

### Deferred, vision-only, and ADR-gated

- A Public Product Share Link is **deferred and ADR-gated** because it creates an anonymous boundary, public identity/lifecycle policy, tenant-safe read model, privacy/SEO/media exposure policy, and Branch price/availability decisions.
- WhatsApp-oriented product sharing is **deferred**. A provider/API or backend-sending model is **ADR-gated**. Native device sharing already permits the user to choose any installed share target without assuming WhatsApp.
- The remaining advanced capabilities in [Future Capabilities](Future-Capabilities.md) are vision-only or deferred; their presence is not approval.
- The unresolved architecture questions in [Deferred Decisions](Deferred-Decisions.md) require their stated decisions before implementation.

## العربية

### السلطة ومعاني الحالات

هذه الوثيقة هي المرجع الحالي لتسلسل التسليم. تمثل [خارطة المشروع الأصلية](../00-Project/Roadmap.md) توجهاً تاريخياً، ولا تثبت أن القدرة منفذة. تبقى وثائق المعمارية والمصدر المدمج مرجع حقيقة التنفيذ.

- **مكتملة ومدمجة:** راجعتها جهة مستقلة وأصبحت ضمن تاريخ فرع التكامل.
- **التنفيذ التالي المعتمد:** المهمة الوحيدة المصرح بتنفيذها بعد مراجعة التخطيط هذه.
- **مخططة:** موضوعة في التسلسل لتعريف لاحق، وليست تصريح تنفيذ.
- **مؤجلة:** أُجّلت عمداً حتى اعتماد مهمة محددة الحدود.
- **رؤية فقط:** توجه بلا التزام تسليم.
- **مشروطة بقرار ADR:** لا يبدأ التنفيذ قبل اعتماد القرار المعماري المحدد.

### خط الأساس المكتمل والمدمج

| المهمة | النتيجة المدمجة | الحد المتبقي |
| --- | --- | --- |
| 3.14 | دورة حياة المنتج، وإدخال المنتج، والمسودة المحلية، ورفع الوسائط وسير عملها، وأساس واجهة الإدخال المتجاوبة | تبقى الموافقات وتاريخ الإصدارات والأتمتة الأوسع قدرات مستقبلية. |
| 3.15 | هوية مساحة العمل، وجلسات الخادم، وإدارة الأعضاء، والمصادقة والاستعادة والتهيئة، وواجهة الحساب ثنائية اللغة | يبقى مزود WhatsApp الفعلي لاستعادة الحساب مغلقاً بأمان ومشروطاً بقرار مستقل. |
| 3.16 | البيانات المرجعية للكتالوج ضمن مساحة العمل، وعقود التسلسل والقوالب، وواجهات الإدارة، وربطها الفعلي بإدخال المنتج | لا توجد صفحة لإدارة البيانات المرجعية ولا حزمة بيانات ابتدائية. |
| 3.17 | دورة حياة الفرع، والإدراج، ودفتر المخزون ونماذج القراءة، والتسعير الأساسي وتسعير الفرع، والصلاحيات والواجهات الذرية | لا توجد واجهة لإدارة الفروع أو المخزون أو التسعير، وهذا ليس دعماً عاماً للمستودعات المتعددة. |
| 3.18 | استعلام وبحث الكتالوج الآمنان لمساحة العمل والفرع، والمرشحات، وبطاقات وتفاصيل المنتج، والمؤشرات، وواجهات القراءة المرشحة بالصلاحيات | لا توجد واجهة تصفح معتمدة للكتالوج أو تفاصيل المنتج. البحث حتمي عبر PostgreSQL وليس بحث AI/NLP. |
| 3.19 | حمولة مشاركة آمنة للعميل عبر الجهاز، وتسليم الوسائط الموثق، والمشاركة الأصلية/الحافظة/النص اليدوي، ومكوّن عرض قابل لإعادة الاستخدام | لا يوجد رابط منتج عام أو تكامل مستلم أو إرسال WhatsApp أو إيصال تسليم أو تحليلات. |
| 3.20 | واجهة موثقة لتصفح الكتالوج وتفاصيل المنتج، وربط المشاركة المباشرة عبر الجهاز، وحالة URL والاستعلام المعتمدة، وعرض التجزئة والجملة والمخزون وفق صلاحيات الخادم، وتصحيح العرض الآمن للعملات ذات الوحدة الصغرى غير المنطبقة والمرشحات الدلالية في 3.20-R1، ونقل وسائط الكتالوج الموثق | لا توجد مشاركة منتجات عامة أو وصول مجهول أو تكامل WhatsApp أو إدارة للبيانات المرجعية أو الفروع أو المخزون أو التسعير. |
| 3.21 | واجهة موثقة وثنائية اللغة لإدارة البيانات المرجعية للكتالوج، وتنسيق HTTP مكتوب بالأنواع، ومعالجة التعارضات، وتأكيد تعطيل أصلي متاح، واستعادة دقيقة للتركيز | لم تُضف واجهة لإدارة الفروع أو المخزون أو التسعير. |

خط أساس التكامل الحالي هو `69f0bd48628a5ae4018504dae8bce1d11b0d8d43` على `feature/product-entry-engine`. ويحتوي المهام 3.14–3.21 وتصحيحات تخطيط 3.22-A المدمجة عبر طلب السحب #26. ويبقى خط أساس تخطيط/تخطيط-R1 السابق للمهمة 3.22 هو `260b4116749d3460b8262b3ccf034b8ba26d00a5` عبر طلب السحب #25، كما تبقى المهمة 3.21 مدمجة عبر طلب السحب #24 عند `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.

### قرار بوابة تخطيط المهمة 3.22 — تتطلب إعادة تحديد النطاق

تبقى **المهمة 3.22 — واجهة إدارة الفروع والمخزون والتسعير** **غير معتمدة للتنفيذ**. أثبتت بوابة التخطيط سلامة عقود التعديل وحدود المعاملات والتحويل الذري وعزل المستأجر ونموذج الأموال وآليات التزامن التفاؤلي/التكرار الآمن في المهمة 3.17، لكن لا يمكن تنفيذ الواجهة التشغيلية الكاملة بأمان من قراءات المتصفح الحالية وحدها.

أصغر فجوات العقود المثبتة من المصدر، والمصححة في تخطيط-R1، هي:

- صلاحيات القراءة والتعديل الإداري مستقلة: تتطلب قراءة الإدراج `catalog.products.view` بينما يقبل تعديله `catalog.product.edit` أو `catalog.products.edit`؛ وتتطلب قراءة تسعير الفرع `pricing.view` بينما يستخدم تعديل التجاوز `pricing.branchOverride.manage`؛ كما تتطلب رؤية التكلفة المرجعية `pricing.view` و`referenceCost.view` بينما تستخدم تعديلات الأساس/التجاوز صلاحيات إدارة مستقلة؛
- يتوافق اكتشاف منتجات الإدراج فقط مع الممثل الذي يملك أيضاً `catalog.products.view` و`catalog.products.edit` بصيغتها الجمعية؛ ولا يستطيع ممثل التعديل الصالح الذي يملك فقط `catalog.product.edit` استخدام اكتشاف دورة الحياة/الإدراج الموسع في المهمة 3.18، ويحتوي قالب موظف الكتالوج القياسي حالياً هذه التركيبة ذات صيغة التعديل المفردة؛
- لا توجد قراءة لقائمة الحجوزات النشطة أو تفاصيلها لاختيار الحجز الحالي والكمية المتبقية بأمان للتحرير أو التنفيذ؛
- لا توجد قراءة مستقلة عن الفرع لأسعار التجزئة والجملة والتكلفة المرجعية الأساسية وقيمها ومراجعاتها الموثوقة، كما لا تستلزم `pricing.manage` و`referenceCost.manage` صلاحيات القراءة المقابلة؛
- لا يستطيع بحث المهمة 3.18 اكتشاف كل هدف مخزون أو تسعير أو تكلفة مرجعية صالح وفق المهمة 3.17 لأن صلاحيات التشغيل هذه لا تستلزم عرض/تعديل الكتالوج؛
- تحتفظ قراءة المخزون المباشرة لممثل الإتاحة فقط بالقيمة الرقمية `available`، وتعيد طفرات المخزون أرصدة تفصيلية دون فحص مستقل لصلاحية كشف الكمية؛
- لا يوجد إسقاط محدود لسلطة/قدرات الإدارة مشتق من الخادم يحل تركيبات القراءة والإدارة هذه دون كشف الصلاحيات الخام أو الدور أو معرف مساحة العمل/الممثل أو معرفات الفروع المسموحة.

تبقى المهمة 3.22 **مخططة / محجوبة** وغير معتمدة للتنفيذ حتى تُراجع جميع شرائح 3.22-A مستقلاً وتُدمج. تحسم بوابة أداء الحجوزات سؤال استمرارية A3 المتبقي دون تغيير بقية قرارات تخطيط-R1/R2. راجع [استمرار Sprint 03](Sprint-03-Continuation.md)، و[تقرير تخطيط 3.22-A التاريخي](../05-Development/Reports/QSC-Task-3.22-A-Planning-Final-Report.md)، و[تقرير تخطيط-R1 التاريخي](../05-Development/Reports/QSC-Task-3.22-A-Planning-R1-Final-Report.md)، و[تقرير تخطيط-R2 المصحح](../05-Development/Reports/QSC-Task-3.22-A-Planning-R2-Final-Report.md)، و[تقرير تخطيط أداء الحجوزات](../05-Development/Reports/QSC-Task-3.22-A-Reservation-Performance-Planning-Final-Report.md)، و[عقد إدارة العمليات للمهمة 3.22-A](Task-3.22-A-Operational-Management-Contract.md).

### بوابة أداء الحجوزات للمهمة 3.22-A — الفهرس الحالي كافٍ

تصبح **المهمة 3.22-A — تصحيح عقود إدارة العمليات** **التنفيذ التالي المعتمد الوحيد بانتظار المراجعة المستقلة**، وتبدأ بالشريحة **A1**. قاست البوابة في PostgreSQL معزولاً استعلام الحجوزات النشطة المحدد بالمنتج باستخدام الفهرس الحالي `(workspace_id, branch_id, product_id, status)` عند 10 و100 و1,000 و10,000 صف قابل للتنفيذ مع عدد مساوٍ من الصفوف النهائية. اختار PostgreSQL الفهرس الحالي في جميع خطط الصفحة الأولى والمؤشر العميق. وعند أعلى حجم استخدمت الخطة 28 كيلوبايت للفرز، دون إدخال/إخراج مؤقت، و217 كتلة مشتركة من الذاكرة؛ وكانت الأزمنة المقاسة 3.775 مللي ثانية للصفحة الأولى و2.006 مللي ثانية للصفحة العميقة. الزمن دليل مساعد وليس ميزانية خدمة.

النتيجة الدقيقة للبوابة هي **`EXISTING INDEX SUFFICIENT`** لحالة الاستخدام الحالية المعتمدة والنطاق المقاس. لم يُنشأ الفهرس المرشح لأن الخطة الحالية لم تُظهر مصدر قلق جوهرياً، ولا حاجة إلى الترحيل `0016`، وتبقى سلسلة الترحيلات `0000–0015`. تُنفذ شرائح A1–A5 بالتتابع وفق العقد المصحح بعد المراجعة المستقلة، بينما تبقى واجهة المهمة 3.22 محجوبة.

المهمة 3.21 **مكتملة ومدمجة** عبر طلب السحب #24 عند خط الأساس `4f1115d2ac98fc4411ac46f081652554f6d04ec9`. ويبقى عقدها التاريخي المعتمد في [عقد تنفيذ المهمة 3.21](Task-3.21-Implementation-Contract.md).

### المؤجل والرؤية فقط والمشروط بقرار ADR

- رابط مشاركة المنتج العام **مؤجل ومشروط بقرار ADR** لأنه ينشئ حداً مجهول الهوية وسياسة للمعرف العام ودورة حياته ونموذج قراءة آمناً للمستأجر وقرارات الخصوصية وSEO والوسائط وسعر الفرع وإتاحته.
- مشاركة المنتج الموجهة إلى WhatsApp **مؤجلة**. نموذج المزود/API أو الإرسال من الخادم **مشروط بقرار ADR**. تسمح مشاركة الجهاز الأصلية الحالية للمستخدم باختيار أي تطبيق مثبت دون افتراض WhatsApp.
- القدرات المتقدمة المتبقية في [القدرات المستقبلية](Future-Capabilities.md) هي رؤية فقط أو مؤجلة، ولا يعني إدراجها الاعتماد.
- تتطلب الأسئلة غير المحسومة في [القرارات المؤجلة](Deferred-Decisions.md) القرارات المحددة قبل التنفيذ.

## Related Documents | الوثائق المرتبطة

- [Sprint 03 Continuation](Sprint-03-Continuation.md)
- [Task 3.21 Implementation Contract](Task-3.21-Implementation-Contract.md)
- [Task 3.22 Planning Final Report](../05-Development/Reports/QSC-Task-3.22-Planning-Final-Report.md)
- [Task 3.22 Planning-R1 Final Report](../05-Development/Reports/QSC-Task-3.22-Planning-R1-Final-Report.md)
- [Task 3.22-A Planning Final Report — historical](../05-Development/Reports/QSC-Task-3.22-A-Planning-Final-Report.md)
- [Task 3.22-A Planning-R1 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R1-Final-Report.md)
- [Task 3.22-A Planning-R2 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R2-Final-Report.md)
- [Task 3.22-A Reservation Performance Planning Final Report](../05-Development/Reports/QSC-Task-3.22-A-Reservation-Performance-Planning-Final-Report.md)
- [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Original roadmap](../00-Project/Roadmap.md)
- [Capability map](../02-Domain/Business-Capability-Map.md)

