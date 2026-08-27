# Future Capabilities | القدرات المستقبلية

**Status:** Vision-only or deferred · **Last Updated:** 2026-08-27 · **Scope:** Capabilities not approved for implementation

## English

Tasks 3.14–3.19 established Product, Identity, Reference Data, single-Branch Inventory/Pricing, Catalog Query, and Direct Device Sharing foundations. Those foundations must not be confused with the broader future capabilities below.

### Near-term planned Presentation gaps

- Task 3.21 Catalog Reference Data Management Presentation — Planned, not approved.
- Task 3.22 Branch, Inventory, and Pricing Management Presentation — Planned, not approved.

Their proposed order follows the approved Task 3.20 Presentation slice in the [current roadmap](Current-Roadmap.md).

### Deferred or vision-only capabilities

- Public Product Share Links and public Catalog browsing.
- WhatsApp-targeted product sharing, Cloud API delivery, backend sending, recipients, delivery receipts, and sharing analytics.
- Multi-Warehouse inventory, replenishment, procurement, and cross-warehouse consistency. Task 3.17 implements Branch-scoped Inventory; it does not claim these broader capabilities.
- Knowledge Engine, AI assistants, AI search, specification suggestions, and contextual help. Task 3.18 search is deterministic PostgreSQL search, not AI/NLP search.
- Analytics, marketplace publishing, ERP, and other external integrations.
- Approval workflow, working copies, version history, audit retention policy, event dispatch, and notifications. Existing Product revisions are optimistic-concurrency revisions, not version history.
- Dependent Option Sets, Lens Type → Lens Size filtering, and context-aware rules.
- Temporary Draft image storage policy beyond the implemented Product Media workflow.
- Cross-application automated browser-regression strategy and normalized Quality Score across templates.

This list records direction only. It neither approves an implementation task nor overrides an ADR gate in [Deferred Decisions](Deferred-Decisions.md).

## العربية

أسست المهام 3.14–3.19 المنتج والهوية والبيانات المرجعية ومخزون وتسعير الفرع الواحد واستعلام الكتالوج والمشاركة المباشرة عبر الجهاز. لا يجوز اعتبار هذه الأسس تنفيذاً للقدرات المستقبلية الأوسع أدناه.

### فجوات العرض المخططة قريباً

- المهمة 3.21: واجهة إدارة البيانات المرجعية للكتالوج — مخططة وغير معتمدة.
- المهمة 3.22: واجهة إدارة الفروع والمخزون والتسعير — مخططة وغير معتمدة.

يأتي ترتيبهما المقترح بعد شريحة العرض المعتمدة للمهمة 3.20 في [خارطة الطريق الحالية](Current-Roadmap.md).

### القدرات المؤجلة أو التي تمثل رؤية فقط

- روابط مشاركة المنتج العامة والتصفح العام للكتالوج.
- مشاركة المنتج الموجهة إلى WhatsApp، والتسليم عبر Cloud API، والإرسال من الخادم، والمستلمون، وإيصالات التسليم، وتحليلات المشاركة.
- المخزون متعدد المستودعات والتجديد والمشتريات واتساق المستودعات. تنفذ 3.17 مخزوناً مقيداً بالفرع ولا تدعي هذه القدرات الأوسع.
- محرك المعرفة ومساعدو AI وبحث AI واقتراحات المواصفات والمساعدة السياقية. بحث 3.18 حتمي عبر PostgreSQL وليس بحث AI/NLP.
- التحليلات والنشر للأسواق وERP والتكاملات الخارجية الأخرى.
- سير الموافقات ونسخ العمل وتاريخ الإصدارات وسياسة الاحتفاظ بالتدقيق وتوزيع الأحداث والتنبيهات. مراجعة المنتج الحالية رقم للتزامن التفاؤلي وليست تاريخ إصدارات.
- مجموعات الخيارات التابعة وترشيح نوع العدسة إلى حجمها والقواعد السياقية.
- سياسة تخزين صور المسودة المؤقتة خارج سير وسائط المنتج المنفذ.
- استراتيجية انحدار متصفح آلية على مستوى التطبيق وتوحيد درجة الجودة بين القوالب.

تسجل هذه القائمة التوجه فقط، ولا تعتمد مهمة تنفيذ ولا تتجاوز أي شرط ADR في [القرارات المؤجلة](Deferred-Decisions.md).

