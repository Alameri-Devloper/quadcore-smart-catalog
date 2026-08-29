# Current Roadmap | خارطة الطريق الحالية

**Status:** Reconciled through merged Task 3.20 · **Last Updated:** 2026-08-29 · **Scope:** Authoritative delivery sequence

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

The reconciled baseline is `e2719cda489aa52b8baf51f985cf0b360292874d` on `feature/product-entry-engine` (PR #22), which contains the reviewed Task 3.20 line after Tasks 3.14–3.19.

### Approved next implementation — Task 3.21

**Task 3.21 — Catalog Reference Data Management Presentation** is the only approved next implementation task. The planning gate confirmed that the existing Task 3.16 scoped management contracts are sufficient for an authenticated, bilingual, Mobile-First management Presentation without a new business API, schema, migration, runtime dependency, or architecture redesign.

The approved implementation contract is [Task 3.21 Implementation Contract](Task-3.21-Implementation-Contract.md). Historical candidate analysis and the completed Task 3.20 contract remain in [Sprint 03 Continuation](Sprint-03-Continuation.md).

### Planned sequence after Task 3.21

Task 3.22 remains **Planned — not implementation-approved**:

1. **Task 3.22 — Branch, Inventory, and Pricing Management Presentation:** provide a permission- and Branch-scope-aware operational UI over the existing Task 3.17 contracts only after a separate planning and approval gate.

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

خط الأساس المتصالح هو `e2719cda489aa52b8baf51f985cf0b360292874d` على `feature/product-entry-engine` (طلب السحب #22)، ويحتوي خط المهمة 3.20 المراجع بعد المهام 3.14–3.19.

### التنفيذ التالي المعتمد — المهمة 3.21

**المهمة 3.21 — واجهة إدارة البيانات المرجعية للكتالوج** هي مهمة التنفيذ التالية الوحيدة المعتمدة. أثبتت بوابة التخطيط كفاية عقود الإدارة المقيدة الحالية من المهمة 3.16 لتنفيذ واجهة إدارة موثقة وثنائية اللغة ومصممة للجوال أولاً من دون API أعمال جديد أو مخطط أو ترحيل أو اعتماد تشغيل أو إعادة تصميم معمارية.

يوجد عقد التنفيذ المعتمد في [عقد تنفيذ المهمة 3.21](Task-3.21-Implementation-Contract.md). ويبقى تحليل البدائل التاريخي وعقد المهمة 3.20 المكتملة في [استمرار Sprint 03](Sprint-03-Continuation.md).

### التسلسل المخطط بعد المهمة 3.21

تبقى المهمة 3.22 **مخططة وغير معتمدة للتنفيذ**:

1. **المهمة 3.22 — واجهة إدارة الفروع والمخزون والتسعير:** واجهة تشغيلية تراعي الصلاحيات ونطاق الفرع فوق عقود 3.17 الموجودة، ولا تبدأ إلا بعد بوابة تخطيط واعتماد مستقلة.

### المؤجل والرؤية فقط والمشروط بقرار ADR

- رابط مشاركة المنتج العام **مؤجل ومشروط بقرار ADR** لأنه ينشئ حداً مجهول الهوية وسياسة للمعرف العام ودورة حياته ونموذج قراءة آمناً للمستأجر وقرارات الخصوصية وSEO والوسائط وسعر الفرع وإتاحته.
- مشاركة المنتج الموجهة إلى WhatsApp **مؤجلة**. نموذج المزود/API أو الإرسال من الخادم **مشروط بقرار ADR**. تسمح مشاركة الجهاز الأصلية الحالية للمستخدم باختيار أي تطبيق مثبت دون افتراض WhatsApp.
- القدرات المتقدمة المتبقية في [القدرات المستقبلية](Future-Capabilities.md) هي رؤية فقط أو مؤجلة، ولا يعني إدراجها الاعتماد.
- تتطلب الأسئلة غير المحسومة في [القرارات المؤجلة](Deferred-Decisions.md) القرارات المحددة قبل التنفيذ.

## Related Documents | الوثائق المرتبطة

- [Sprint 03 Continuation](Sprint-03-Continuation.md)
- [Task 3.21 Implementation Contract](Task-3.21-Implementation-Contract.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Original roadmap](../00-Project/Roadmap.md)
- [Capability map](../02-Domain/Business-Capability-Map.md)

