# Current Roadmap | خارطة الطريق الحالية

**Status:** A1–A6 Completed / merged; Presentation `ApprovedNextImplementation` — P1 only, unstarted · **Last Updated:** 2026-09-10 · **Scope:** Authoritative delivery sequence

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

The current integration baseline is `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`, merging A6 through PR #35 (after Planning PR #34 and Correction PR #33). A1–A5 remain merged through PRs #28–#32. Earlier slice baselines are historical.

### Task 3.22 post-A6 gate — ApprovedNextImplementation, P1 only

**Task 3.22 Presentation: `ApprovedNextImplementation` — P1 only; unstarted.** Source reconciliation proves the Branch Selector Authorization Composition Gap is closed. [A6](Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md) is **Completed / merged through PR #35** at `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`. See the [gate report](../05-Development/Reports/QSC-Task-3.22-Presentation-Gate-Reconciliation-Report.md) and [updated Presentation contract](Task-3.22-Presentation-Implementation-Contract.md).

Composition is A1 semantic navigation → A6 exact-purpose Branch discovery → Branch selection → A2 Product discovery where required → authorized resource read/actions → mutation. Operational workflows always use A6, with no general Branch List fallback. General Branch management retains List/Get under its existing Branch authority. Workspace Pricing/Reference Cost skip A6.

A6 returns Active + Inactive for all five purposes; fresh Branch-scoped A2 discovery requires Active. P1 must distinguish/disable inactive choices for new workflows while preserving existing-resource inspection that its server contract permits. Status and allowedActions are never mutation guarantees; Reservation actions may remain visible while mutation rejects BranchInactive. Transfer uses A6 Transfer for the same source/destination set and A2 Inventory with source branchId. A4 field disclosure and A5 numeric/semantic/minimal-success projection remain server-owned; raw permissions and branchScope never enter Presentation.

Next slice: **P1 shell, strict clients/types, A1 capabilities, URL/coordinator state, general Branch management, A6 Branch selectors and A2 Product selectors**, including English/Arabic, LTR/RTL, mobile/tablet/desktop and touch/mouse/keyboard QA. **P2–P8 remain planned and require separate approval**, with no combined implementation authorization. No Domain/repository/database/migration/dependency/permission change or new ADR is required. This task changes documentation only and stops for reconciliation review.

### Task 3.22-A1–A5 — Completed / merged

Task 3.22-A1–A5 are merged through PRs #28–#32 at baseline `0f102dd020efacc517f0e27601f4a54ecce2eca0`. No repository, schema, migration, dependency, permission-registry, or transaction-boundary change is required by the Presentation. The Reservation gate outcome remains `EXISTING INDEX SUFFICIENT`; migration `0016` is not required.

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

خط أساس التكامل الحالي هو `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6` مع دمج A6 عبر #35 بعد تخطيط #34 وتصحيح #33. تبقى A1–A5 مدمجة عبر #28–#32، والخطوط السابقة تاريخية.

### بوابة المهمة 3.22 بعد A6 — ApprovedNextImplementation لشريحة P1 فقط

**واجهة 3.22: `ApprovedNextImplementation` لشريحة P1 فقط؛ لم يبدأ التنفيذ.** يثبت المصدر إغلاق فجوة محدد الفروع. **اكتملت A6 ودُمجت عبر #35** عند الخط المذكور؛ راجع [تقرير البوابة](../05-Development/Reports/QSC-Task-3.22-Presentation-Gate-Reconciliation-Report.md) و[عقد الواجهة المحدث](Task-3.22-Presentation-Implementation-Contract.md).

التسلسل هو قدرات A1 الدلالية ثم اكتشاف A6 بالغرض المطابق ثم اختيار الفرع واكتشاف A2 عند الحاجة ثم قراءة المورد وأفعاله المخولة ثم الطفرة. تستخدم العمليات A6 دائماً دون fallback لقائمة الفروع العامة، وتبقى List/Get العامة لإدارة الفروع بصلاحيتها الحالية. يتجاوز تسعير وتكلفة مساحة العمل A6.

تعيد A6 النشط وغير النشط للأغراض الخمسة، بينما يتطلب اكتشاف A2 الجديد فرعاً نشطاً. تميز P1 الخيارات غير النشطة وتعطلها للتدفق الجديد مع حفظ فحص المورد القائم المسموح بعقده. ليست الحالة ولا allowedActions ضمان طفرة؛ قد تظهر أفعال الحجز مع رفض BranchInactive. يستخدم التحويل A6 Transfer بمجموعة واحدة للفرعين ثم A2 Inventory ومعرف المصدر. يبقى كشف الحقول في A4 والكشف الرقمي أو الدلالي أو نجاح العملية الأدنى في A5 ملك الخادم، ولا تدخل الصلاحيات الخام أو branchScope العرض.

الشريحة التالية **P1: الغلاف والأنواع والعملاء الصارمة وقدرات A1 وحالة URL والمنسق وإدارة الفروع العامة ومحدد A6 ومحدد منتجات A2**، مع تحقق اللغتين والاتجاهين والجوال واللوحي وسطح المكتب واللمس والفأرة واللوحة. **تبقى P2–P8 مخططة وتتطلب اعتماداً مستقلاً** دون تصريح مجمع. لا تغيير مجال أو عقد مستودع أو قاعدة أو ترحيل أو اعتماد أو صلاحية ولا ADR جديد. هذه المهمة توثيقية وتتوقف لمراجعة المصالحة.

### المهمة 3.22-A1–A5 — مكتملة / مدمجة

دُمجت A1–A5 عبر طلبات السحب #28–#32 عند خط الأساس `0f102dd020efacc517f0e27601f4a54ecce2eca0`. لا تحتاج الواجهة إلى تغيير مستودع أو مخطط أو ترحيل أو اعتماد أو سجل صلاحيات أو حد معاملة. وتبقى نتيجة بوابة الحجوزات `EXISTING INDEX SUFFICIENT`، ولا يلزم الترحيل `0016`.

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
- [Task 3.22-A4 Final Report](../05-Development/Reports/QSC-Task-3.22-A4-Final-Report.md)
- [Task 3.22-A5 Final Report](../05-Development/Reports/QSC-Task-3.22-A5-Final-Report.md)
- [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md)
- [Task 3.22 Presentation Implementation Contract](Task-3.22-Presentation-Implementation-Contract.md)
- [Task 3.22 Presentation Planning Report](../05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md)
- [Task 3.22 Branch Selector Gap Analysis](../05-Development/Reports/QSC-Task-3.22-Branch-Selector-Gap-Analysis.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Original roadmap](../00-Project/Roadmap.md)
- [Capability map](../02-Domain/Business-Capability-Map.md)

