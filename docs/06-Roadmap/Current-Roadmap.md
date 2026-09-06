# Current Roadmap | خارطة الطريق الحالية

**Status:** Task 3.22-A1–A5 are completed / merged; Task 3.22 Presentation is Planned / Blocked by the Branch Selector Authorization Composition Gap · **Last Updated:** 2026-09-06 · **Scope:** Authoritative delivery sequence

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

The current integration baseline is `0f102dd020efacc517f0e27601f4a54ecce2eca0`. It contains Task 3.22-A1 merged through PR #28, A2 through #29, A3 through #30, A4 through #31, and A5 through #32. Earlier slice baselines remain historical references.

### Task 3.22 correction-review decision — Planned / Blocked

**Task 3.22 — Branch, Inventory, and Pricing Management Presentation** is **Planned / Blocked** and is not implementation-approved. It is not started or completed. Independent correction review confirmed the **Branch Selector Authorization Composition Gap**; see the [Gap Analysis](../05-Development/Reports/QSC-Task-3.22-Branch-Selector-Gap-Analysis.md).

The A1–A5 contracts remain correct and merged: capabilities, operational Product discovery, Listing state, Reservation reads, Pricing management reads/revisions, Inventory disclosure, trusted scope, and mutation-time authorization are preserved. The post-merge composition gap is separate: operational permissions are independently assignable from `workspace.branches.view/manage`; A1 can advertise a Branch-scoped capability while `GET /api/branches` is forbidden; and A2 requires a known `branchId` before Branch-scoped Product discovery can begin.

A1–A5 are **Completed / merged** through PR #32. The smallest recommended remediation is a separately planned **Task 3.22-A6 — Operational Branch Selector Read** owned by Workspace Branch Application. It is not approved or implemented. Expected gates are no ADR, database change, dependency, or new permission. Do not begin A6 or Task 3.22-P1 automatically. See [Sprint 03 Continuation](Sprint-03-Continuation.md), the [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md), and the corrected [Presentation Planning Report](../05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md).

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

خط أساس التكامل الحالي هو `0f102dd020efacc517f0e27601f4a54ecce2eca0`، ويحتوي A1 مدمجة عبر طلب السحب #28 وA2 عبر #29 وA3 عبر #30 وA4 عبر #31 وA5 عبر #32. تبقى الخطوط الأقدم مراجع تاريخية.

### قرار مراجعة تصحيح المهمة 3.22 — مخططة / محجوبة

تبقى **المهمة 3.22 — واجهة إدارة الفروع والمخزون والتسعير** **مخططة / محجوبة** وغير معتمدة للتنفيذ. لم تبدأ ولم تكتمل. أكدت مراجعة التصحيح المستقلة **فجوة تركيب تفويض محدد الفروع**؛ راجع [تحليل الفجوة](../05-Development/Reports/QSC-Task-3.22-Branch-Selector-Gap-Analysis.md).

تبقى عقود A1–A5 صحيحة ومدمجة وتحفظ القدرات واكتشاف المنتج والإدراج والحجوزات والتسعير وكشف المخزون والنطاق والتفويض عند التعديل. أما فجوة التركيب اللاحقة للدمج فهي مستقلة: يمكن تعيين صلاحية تشغيل مقيدة بالفرع دون عرض/إدارة الفروع؛ وقد تعرض A1 القدرة بينما تمنع قائمة الفروع؛ وتتطلب A2 معرف فرع معروفاً قبل بدء الاكتشاف.

اكتملت A1–A5 ودُمجت عبر طلب السحب #32. أصغر معالجة موصى بها هي تخطيط مستقل للمهمة **3.22-A6 — قراءة محدد الفروع التشغيلي** ضمن تطبيق فروع مساحة العمل. ليست معتمدة أو منفذة، ولا يتوقع أن تحتاج ADR أو قاعدة بيانات أو اعتماداً أو صلاحية جديدة. لا تبدأ A6 أو P1 تلقائياً.

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

