# Product Entry Submission Registry | سجل طلبات إدخال المنتج

**Status:** Implemented Phase 1 foundation with approved R1 corrections · **Task:** 3.14.9-A-R1 · **Last Updated:** 2026-08-04

## English

### Boundary and lifecycle

`ProductEntrySubmission` is an independent Product Entry model. It is not part of the Product Aggregate and it is not a Product Media Workflow. Its Workspace-scoped identity is `workspaceId + submissionId`; the same identity and request fingerprint is an idempotent replay, while a different fingerprint is a structured conflict. Phase 1 advances a new submission from `Claimed` to `ProductSaved`. `Completed` and `PartiallyCompleted` are reserved for a later Media phase.

The canonical request fingerprint is lowercase SHA-256 over deterministic UTF-8 serialization. Object keys are sorted, media-operation array order remains significant, and the normalized Phase 1 contract represents omitted optional fields as explicit `null` or contract defaults. Server timestamps and file bytes are excluded. Add and Replace descriptors require the browser source hash and byte length.

### Transaction boundary

The Application-layer Unit of Work owns one PostgreSQL transaction. Its transaction-scoped Product, Submission, Media Plan, and Audit repositories share the same Drizzle transaction handle. A successful new submission commits the claim, zero-based media plan, Smart Save Product result, four minimal audit records, and the `ProductSaved` linkage together. Expected Product ID, Product Code, or Revision conflicts return typed results and explicitly roll back the claim and plan. Unexpected failures roll back the entire callback.

No file I/O, image processing, multipart upload, storage mutation, or Product Media Workflow execution occurs in this transaction or in Task 3.14.9-A.

Request descriptors and media-plan invariants are validated before the transaction and return structured `InvalidRequest` results. Unexpected failures from the Clock, request-fingerprint/Crypto service, runtime composition, or Infrastructure are not converted to media validation; they propagate to the Route Handler and become the sanitized `PRODUCT_ENTRY_SERVICE_UNAVAILABLE` response.

### Persistence and ownership

- `catalog_product_entry_submissions` stores the immutable claim fingerprint/mode, Product linkage, operational status, exact Smart Save receipt, and timestamps.
- `catalog_product_entry_submission_media_operations` stores one explicit zero-based sequence and independent `final_order` per operation. Add/Replace require source integrity metadata; Remove forbids it.
- `catalog_product_entry_audit_records` stores only scoped identifiers, stable event/result codes, actor, and timestamp. It stores no payload, token, credential, cost, file bytes, or filesystem path.
- Every key, lookup, index, and foreign key includes Workspace ownership where identity crosses a table boundary. Delete behavior is `RESTRICT`; no new cascade delete was introduced.

Product remains the source of truth for current Product state and Revision. The saved receipt preserves the exact first Smart Save outcome for an idempotent replay; the replay also reloads the Product and persisted media plan rather than trusting submission status alone.

### Authorization and API

The Application layer enforces distinct Create, Edit, and Submission Read permissions. Edit checks Product ownership in the trusted Workspace before claiming. GET returns wholesale selling price only as `wholesalePrice` and retail selling price only as `retailPrice`; Reference Purchase Cost is not implemented in the current Product model and is not returned or fabricated. The reserved `catalog.product.reference-cost.read` permission does not rename, hide, or transform wholesale price. GET never returns storage references or local paths.

The Phase 1 routes are:

```text
POST /api/catalog/product-entry-submissions
GET  /api/catalog/product-entry-submissions/:submissionId
```

Authentication integration is still pending. In Production, Product Entry is fail-closed: runtime composition selects a resolver that always returns the typed authentication-context-unavailable failure, never an environment actor, Workspace, or permission set. The environment-backed resolver is explicitly limited to development/test, rejects missing, empty, duplicate, or unsupported configuration, and also rejects direct use in Production. Body-supplied Workspace or actor identity is rejected as an unsupported field. Trusted-context failure returns only `AUTHENTICATION_CONTEXT_UNAVAILABLE`; other unexpected failures return only `PRODUCT_ENTRY_SERVICE_UNAVAILABLE`. Neither response exposes configuration names or internal messages. Runtime publication requirements remain scoped to an exact Workspace+Catalog pair.

### Product Code decision

The current Product domain permits Product Code to remain absent on a Draft and contains no final commercial allocator. Phase 1 therefore uses an Application port with a collision-safe fallback UUID adapter. This fallback is not the final human-friendly commercial Product Code policy. On Create only, when the resolved publication requirements require Product Code and the draft omits it, the transaction-scoped flow allocates a UUID-based `QSC-...` code. Workspace-wide database uniqueness remains authoritative and any collision returns the existing typed Product Code conflict, rolling back the whole Product Entry transaction. No `MAX + 1` allocation is used.

## العربية

### الحدود ودورة الحالة

يمثل `ProductEntrySubmission` نموذجاً مستقلاً داخل إدخال المنتج، ولا يدخل في Product Aggregate ولا في Product Media Workflow. هويته المقيدة بمساحة العمل هي `workspaceId + submissionId`. يعيد المعرف نفسه مع البصمة نفسها نتيجة متكررة Idempotent، بينما يعيد اختلاف البصمة تعارضاً منظماً. تنقل المرحلة الأولى الطلب الجديد من `Claimed` إلى `ProductSaved`، وتبقى حالتا `Completed` و`PartiallyCompleted` لمرحلة الوسائط اللاحقة.

تحسب بصمة الطلب بصيغة SHA-256 سداسية صغيرة فوق تسلسل UTF-8 حتمي. ترتب مفاتيح الكائنات وتبقى مصفوفة عمليات الوسائط حساسة للترتيب، وتمثل الحقول الاختيارية المحذوفة بقيم `null` أو القيم الافتراضية المحددة في العقد. لا تدخل طوابع الخادم ولا بايتات الملفات في البصمة، وتتطلب عمليتا Add وReplace بصمة المصدر وطوله المحسوبين في المتصفح.

### حد المعاملة

تملك طبقة Application معاملة PostgreSQL واحدة عبر Unit of Work. تستخدم مستودعات Product وSubmission وخطة الوسائط والتدقيق مقبض Drizzle نفسه. يحفظ النجاح المطالبة والخطة ذات التسلسل الصفري ونتيجة Smart Save وأربعة سجلات تدقيق والربط بحالة `ProductSaved` معاً. تعيد تعارضات المعرف أو الكود أو المراجعة نتائج typed وتطلب Rollback صريحاً، بينما تعيد الأعطال غير المتوقعة المعاملة كلها.

لا تنفذ هذه المهمة أي رفع أو معالجة صور أو كتابة ملفات أو تشغيل Product Media Workflow.

يُتحقق من أوصاف الطلب وثوابت خطة الوسائط قبل بدء المعاملة، وتُعاد أخطاؤها المتوقعة بصيغة `InvalidRequest` منظمة. لا تُحوّل الأعطال غير المتوقعة في Clock أو خدمة البصمة/Crypto أو تركيب Runtime أو Infrastructure إلى خطأ في خطة الوسائط، بل تصل إلى Route Handler وتُعاد بالرمز المنقح `PRODUCT_ENTRY_SERVICE_UNAVAILABLE`.

### الحفظ والملكية

- يحفظ جدول `catalog_product_entry_submissions` البصمة والنمط الثابتين وربط المنتج والحالة التشغيلية وإيصال نتيجة Smart Save والطوابع الزمنية.
- يحفظ جدول `catalog_product_entry_submission_media_operations` تسلسلاً صفرياً صريحاً و`final_order` مستقلاً، ويفرض بيانات المصدر على Add/Replace ويمنعها على Remove.
- يحفظ جدول `catalog_product_entry_audit_records` المعرفات المقيدة والأكواد المستقرة والممثل والوقت فقط، ولا يحفظ payload أو token أو credential أو تكلفة أو بايتات أو مسارات ملفات.
- تتضمن المفاتيح والاستعلامات والفهارس والمفاتيح الخارجية حد Workspace، ويستخدم الحذف `RESTRICT` دون إضافة cascade جديد.

يبقى Product Repository مصدر الحقيقة لحالة المنتج ومراجعته. يحفظ الإيصال النتيجة الأصلية لإعادة الطلب Idempotently، مع إعادة قراءة Product وخطة الوسائط وعدم الاعتماد على status وحده.

### التفويض وواجهة API

تفرض طبقة Application صلاحيات مستقلة للإنشاء والتعديل وقراءة الطلب. يتحقق التعديل من ملكية المنتج داخل Workspace الموثوقة قبل المطالبة. تعيد GET سعر بيع الجملة باسم `wholesalePrice` وسعر بيع التجزئة باسم `retailPrice` فقط. لم تُنفذ تكلفة الشراء المرجعية في نموذج Product الحالي، لذلك لا تُعاد ولا تُختلق من سعر بيع. لا تغير الصلاحية المحجوزة `catalog.product.reference-cost.read` اسم سعر الجملة ولا تخفيه ولا تحوله، كما لا تعيد GET مراجع التخزين أو المسارات المحلية.

ما زال تكامل المصادقة الحقيقي قيد الانتظار. يفشل Product Entry بصورة مغلقة في Production، إذ يختار تركيب Runtime محللاً لا يعيد أي ممثل أو Workspace أو صلاحيات من البيئة، بل يعيد خطأ typed ثابتاً. يقتصر محلل البيئة على التطوير والاختبار، ويرفض الإعداد الناقص أو الفارغ أو المكرر أو غير المدعوم، ويرفض أيضاً استخدامه المباشر في Production. تُرفض هوية Workspace أو الممثل المرسلة داخل body. يعاد فشل السياق الموثوق بالرمز `AUTHENTICATION_CONTEXT_UNAVAILABLE` فقط، وتُعاد الأعطال الأخرى بالرمز `PRODUCT_ENTRY_SERVICE_UNAVAILABLE` فقط، دون أسماء إعدادات أو رسائل داخلية. تبقى متطلبات النشر مقيدة بزوج Workspace+Catalog دقيق.

### قرار Product Code

يسمح المجال الحالي بغياب Product Code في Draft ولا يملك سياسة تجارية نهائية للتخصيص، لذلك يستخدم منفذ Application مع محول UUID احتياطي آمن من التصادم. هذا المحول ليس السياسة التجارية النهائية ذات الأكواد سهلة القراءة. عند Create فقط، إذا اشترطت سياسة النشر الكود ولم يرسله الطلب، يولد التدفق داخل المعاملة كوداً بصيغة `QSC-...`. يبقى قيد التفرد على مستوى Workspace هو المرجع النهائي، ويعيد أي تصادم تعارض Product Code typed مع Rollback كامل. لا يستخدم التنفيذ أسلوب `MAX + 1`.
