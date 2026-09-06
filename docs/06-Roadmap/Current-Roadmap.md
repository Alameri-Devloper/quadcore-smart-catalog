# Current Roadmap | خارطة الطريق الحالية

**Status:** Task 3.22-A5 implementation is complete / ReadyForReview; Task 3.22 Presentation remains blocked · **Last Updated:** 2026-09-06 · **Scope:** Authoritative delivery sequence

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

The current integration baseline is `6b753ecc3d6e7627b5c63256a6983bd3d969476c`. It contains Task 3.22-A1 merged through PR #28, Task 3.22-A2 through PR #29, Task 3.22-A3 through PR #30, and Task 3.22-A4 through PR #31. The A4 baseline `5ad78863cf141349975f0100d2e93b674c7e6819`, A2 baseline `43c5b5581aff634547767a198d0065d08c6a390b`, A1 baseline `32012c87a521c6fa510ad7ccf03216a180a88725`, and earlier PR baselines remain historical references.

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

Task 3.22 remains **Planned / blocked** and is not implementation-approved until every Task 3.22-A slice is independently reviewed and merged. A1, A2, A3, and A4 are merged; A5 is implemented and ReadyForReview, but is not yet independently reviewed or merged. See [Sprint 03 Continuation](Sprint-03-Continuation.md), the planning reports, the A1–A4 final reports, the [Task 3.22-A5 Final Report](../05-Development/Reports/QSC-Task-3.22-A5-Final-Report.md), and the [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md).

### Task 3.22-A5 — Implemented / ReadyForReview

**Task 3.22-A4 — Pricing Management Reads and Revision Semantics** is merged through PR #31 in baseline `6b753ecc3d6e7627b5c63256a6983bd3d969476c`. **Task 3.22-A5 — Inventory Disclosure Hardening** is implemented and **ReadyForReview** on that baseline. Inventory Application now returns `InStock` or `OutOfStock` without quantities for availability-only actors, detailed nested quantities only with `inventory.quantity.view`, and the minimum operation result when neither read permission is present. Fresh and replayed mutation outcomes use the current trusted actor visibility; Reservation state and transfer identity remain available under their operation permissions.

No repository, schema, migration, dependency, permission-registry, or transaction-boundary change was required. The Reservation gate outcome remains `EXISTING INDEX SUFFICIENT`; migration `0016` is not required. Task 3.22 Presentation remains blocked until A5 is independently reviewed and merged.

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

خط أساس التكامل الحالي هو `6b753ecc3d6e7627b5c63256a6983bd3d969476c`، ويحتوي A1 مدمجة عبر طلب السحب #28 وA2 عبر #29 وA3 عبر #30 وA4 عبر #31. ويبقى خط A4 السابق `5ad78863cf141349975f0100d2e93b674c7e6819` والخطوط الأقدم مراجع تاريخية.

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

تبقى المهمة 3.22 **مخططة / محجوبة** وغير معتمدة للتنفيذ حتى تُراجع جميع شرائح 3.22-A مستقلاً وتُدمج. دُمجت A1 وA2 وA3 وA4، ونُفذت A5 وهي جاهزة للمراجعة لكنها لم تراجع أو تدمج بعد. راجع [استمرار Sprint 03](Sprint-03-Continuation.md)، وتقارير التخطيط، وتقارير A1–A4، و[تقرير A5 النهائي](../05-Development/Reports/QSC-Task-3.22-A5-Final-Report.md)، و[عقد إدارة العمليات للمهمة 3.22-A](Task-3.22-A-Operational-Management-Contract.md).

### المهمة 3.22-A5 — منفذة / جاهزة للمراجعة

دُمجت **المهمة 3.22-A4 — قراءات إدارة التسعير ودلالات المراجعة** عبر طلب السحب #31 في خط الأساس `6b753ecc3d6e7627b5c63256a6983bd3d969476c`. ونُفذت **المهمة 3.22-A5 — تشديد كشف المخزون** وهي **جاهزة للمراجعة** فوقه. يعرض تطبيق المخزون `InStock` أو `OutOfStock` فقط لصلاحية الإتاحة، ولا يعرض الكميات التفصيلية إلا مع `inventory.quantity.view`، ويعيد الحد الأدنى لنتيجة العملية عند غياب صلاحيتي القراءة. تُسقط نتائج التنفيذ الأول وإعادة idempotent وفق سياق الممثل الموثوق الحالي مع الحفاظ على حالة الحجز ومعرف النقل.

لم يلزم تغيير مستودع أو مخطط أو ترحيل أو اعتماد أو سجل صلاحيات أو حد معاملة. وتبقى نتيجة بوابة الحجوزات `EXISTING INDEX SUFFICIENT`، ولا يلزم الترحيل `0016`. وتبقى واجهة المهمة 3.22 محجوبة حتى مراجعة A5 مستقلاً ودمجها.

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
- [Task 3.22-A1 Final Report](../05-Development/Reports/QSC-Task-3.22-A1-Final-Report.md)
- [Task 3.22-A2 Final Report](../05-Development/Reports/QSC-Task-3.22-A2-Final-Report.md)
- [Task 3.22-A3 Final Report](../05-Development/Reports/QSC-Task-3.22-A3-Final-Report.md)
- [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Original roadmap](../00-Project/Roadmap.md)
- [Capability map](../02-Domain/Business-Capability-Map.md)

