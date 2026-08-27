# Deferred Decisions | القرارات المؤجلة

**Status:** Deferred / ADR-gated · **Last Updated:** 2026-08-27 · **Scope:** Unresolved architecture choices

## English

### Sharing decisions

| Decision | Status | ADR must resolve before implementation |
| --- | --- | --- |
| Public Product Share Link / public Catalog read | ADR required | Anonymous authorization boundary; tenant-safe public read model; non-enumerable public identifier; creation, revocation, expiry, and archival lifecycle; Branch selection and price/availability freshness; wholesale and Reference Cost exclusion; SEO/indexing and privacy policy; media delivery/cache policy; abuse controls and observability. |
| WhatsApp `wa.me` product navigation | ADR required before a dedicated channel task | Authoritative phone source, employee/store fallback rules, recipient-data handling, URL/text policy, consent, privacy, unsupported-device fallback, and relationship to a future public link. |
| WhatsApp Cloud API/provider or backend sending | ADR required | Provider selection, credentials/secrets, tenant/provider ownership, templates and consent, queue/retry/idempotency, rate limits/cost, delivery receipts/webhooks, data retention, regional/privacy requirements, failure handling, and audit ownership. |

Task 3.19 native device sharing is already implemented and requires no new ADR for integration into Task 3.20. It intentionally does not know the target application, recipient, or delivery result.

### Other deferred decisions

- Multi-Warehouse consistency, replenishment, and procurement. Task 3.17 resolved the approved single-Branch Inventory transaction model only.
- Algorithms and ownership for dependent options and contextual rules.
- Revision history, approval models, event dispatch, audit retention, and notifications.
- Temporary image-storage policy beyond the approved Product Media lifecycle.
- Quality Score normalization across Product Type templates.
- Knowledge implementation and AI provider/model, data use, evaluation, and safeguards.
- Analytics data ownership, retention, aggregation, and tenant boundaries.
- Marketplace and ERP contracts, sync ownership, conflict handling, and credentials.
- A cross-application automated browser-regression strategy. Task-specific responsive and interaction QA remains mandatory even while the broader strategy is deferred.

Every item requires context, alternatives, decision, consequences, multi-tenant/privacy/security analysis, and explicit approval before its implementation task begins.

## العربية

### قرارات المشاركة

| القرار | الحالة | ما يجب أن يحسمه ADR قبل التنفيذ |
| --- | --- | --- |
| رابط مشاركة منتج عام أو قراءة عامة للكتالوج | ADR مطلوب | حد التفويض المجهول، ونموذج قراءة عام آمن للمستأجر، ومعرف عام غير قابل للتعداد، ودورة الإنشاء والإلغاء والانتهاء والأرشفة، واختيار الفرع وحداثة السعر والإتاحة، ومنع الجملة والتكلفة المرجعية، وسياسة SEO والفهرسة والخصوصية، وتسليم الوسائط وتخزينها المؤقت، وضوابط الإساءة والمراقبة. |
| انتقال مشاركة المنتج إلى `wa.me` | ADR مطلوب قبل مهمة قناة مستقلة | مصدر رقم الهاتف المعتمد، وقواعد رجوع رقم الموظف/المتجر، ومعالجة بيانات المستلم، وسياسة الرابط والنص، والموافقة والخصوصية، والبديل للأجهزة غير المدعومة، وعلاقته برابط عام مستقبلي. |
| WhatsApp Cloud API أو مزود أو إرسال من الخادم | ADR مطلوب | اختيار المزود، والأسرار، وملكية المستأجر/المزود، والقوالب والموافقة، والطوابير والإعادة والثبات، والحدود والتكلفة، وإيصالات التسليم وwebhooks، والاحتفاظ بالبيانات، ومتطلبات المنطقة والخصوصية، والفشل، وملكية التدقيق. |

المشاركة الأصلية عبر الجهاز في 3.19 منفذة ولا تحتاج ADR جديداً لربطها بالمهمة 3.20. وهي لا تعرف تطبيق الهدف أو المستلم أو نتيجة التسليم عمداً.

### قرارات مؤجلة أخرى

- اتساق المستودعات المتعددة والتجديد والمشتريات. حسمت 3.17 نموذج معاملات مخزون الفرع الواحد المعتمد فقط.
- خوارزميات وملكية الخيارات التابعة والقواعد السياقية.
- تاريخ المراجعات ونماذج الموافقة وتوزيع الأحداث والاحتفاظ بالتدقيق والتنبيهات.
- سياسة تخزين الصور المؤقت خارج دورة وسائط المنتج المعتمدة.
- توحيد درجة الجودة بين قوالب نوع المنتج.
- تنفيذ المعرفة ومزود/نموذج AI واستخدام البيانات والتقييم والضوابط.
- ملكية بيانات التحليلات والاحتفاظ والتجميع وحدود المستأجر.
- عقود الأسواق وERP وملكية المزامنة والتعارض والأسرار.
- استراتيجية انحدار متصفح آلية على مستوى التطبيق. تبقى اختبارات التجاوب والتفاعل الخاصة بكل مهمة إلزامية رغم تأجيل الاستراتيجية الأوسع.

يتطلب كل بند سياقاً وبدائل وقراراً ونتائج وتحليلاً لتعدد المستأجرين والخصوصية والأمان واعتماداً صريحاً قبل بدء مهمة تنفيذه.

