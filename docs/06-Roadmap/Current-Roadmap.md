# Current Roadmap | خارطة الطريق الحالية

**Status:** Reconciled through merged Task 3.19 · **Last Updated:** 2026-08-27 · **Scope:** Authoritative delivery sequence

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

The reconciled baseline is merge commit `083ebdd` (PR #20), which contains the reviewed Task 3.19 line after Tasks 3.14–3.18.

### Approved next implementation — Task 3.20

**Task 3.20 — Canonical Catalog Browsing, Product Details, and Direct Share Presentation** is the only approved next implementation task. It will connect the existing Task 3.18 read contracts and Task 3.19 direct-device share boundary into one authenticated, bilingual, responsive Catalog workflow. It will not add a public/anonymous route, a new sharing channel, a schema or migration, or a second source of Catalog truth.

The complete task contract, candidate analysis, acceptance criteria, and architecture constraints are in [Sprint 03 Continuation](Sprint-03-Continuation.md).

### Proposed sequence after Task 3.20

These tasks are **Planned, not approved for implementation**:

1. **Task 3.21 — Catalog Reference Data Management Presentation:** provide an owner/authorized-manager UI over the existing Task 3.16 scoped management APIs.
2. **Task 3.22 — Branch, Inventory, and Pricing Management Presentation:** provide a permission- and Branch-scope-aware operational UI over the existing Task 3.17 contracts.

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

خط الأساس المتصالح هو دمج `083ebdd` (طلب السحب #20)، ويحتوي خط المهمة 3.19 المراجع بعد المهام 3.14–3.18.

### التنفيذ التالي المعتمد — المهمة 3.20

**المهمة 3.20 — واجهة تصفح الكتالوج وتفاصيل المنتج والمشاركة المباشرة** هي مهمة التنفيذ التالية الوحيدة المعتمدة. ستربط عقود القراءة الموجودة من 3.18 وحد المشاركة عبر الجهاز من 3.19 في سير كتالوج موثق وثنائي اللغة ومتجاوب. لن تضيف مساراً عاماً أو مجهولاً، ولا قناة مشاركة جديدة، ولا مخططاً أو ترحيلاً، ولا مصدراً ثانياً لحقيقة الكتالوج.

يوجد عقد المهمة الكامل وتحليل البدائل ومعايير القبول والقيود المعمارية في [استمرار Sprint 03](Sprint-03-Continuation.md).

### التسلسل المقترح بعد المهمة 3.20

المهمتان التاليتان **مخططتان وليستا معتمدتين للتنفيذ**:

1. **المهمة 3.21 — واجهة إدارة البيانات المرجعية للكتالوج:** واجهة للمالك أو المدير المخول فوق واجهات الإدارة المقيدة الموجودة من 3.16.
2. **المهمة 3.22 — واجهة إدارة الفروع والمخزون والتسعير:** واجهة تشغيلية تراعي الصلاحيات ونطاق الفرع فوق عقود 3.17 الموجودة.

### المؤجل والرؤية فقط والمشروط بقرار ADR

- رابط مشاركة المنتج العام **مؤجل ومشروط بقرار ADR** لأنه ينشئ حداً مجهول الهوية وسياسة للمعرف العام ودورة حياته ونموذج قراءة آمناً للمستأجر وقرارات الخصوصية وSEO والوسائط وسعر الفرع وإتاحته.
- مشاركة المنتج الموجهة إلى WhatsApp **مؤجلة**. نموذج المزود/API أو الإرسال من الخادم **مشروط بقرار ADR**. تسمح مشاركة الجهاز الأصلية الحالية للمستخدم باختيار أي تطبيق مثبت دون افتراض WhatsApp.
- القدرات المتقدمة المتبقية في [القدرات المستقبلية](Future-Capabilities.md) هي رؤية فقط أو مؤجلة، ولا يعني إدراجها الاعتماد.
- تتطلب الأسئلة غير المحسومة في [القرارات المؤجلة](Deferred-Decisions.md) القرارات المحددة قبل التنفيذ.

## Related Documents | الوثائق المرتبطة

- [Sprint 03 Continuation](Sprint-03-Continuation.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Original roadmap](../00-Project/Roadmap.md)
- [Capability map](../02-Domain/Business-Capability-Map.md)

