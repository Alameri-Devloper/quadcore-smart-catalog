# Product Entry Media Upload Coordination | تنسيق رفع وسائط إدخال المنتج

**Status:** Implemented Phase 2 server coordination with R1 resume correction · **Task:** 3.14.9-B / 3.14.9-B-R1 · **Last Updated:** 2026-08-04

## English

### Phase boundary and ownership

Phase 1 claims the Product Entry Submission, persists its immutable request fingerprint and ordered Media Plan, runs Smart Save once, and commits the Product linkage and receipt in one PostgreSQL transaction. Phase 2 is a separate request. It never reruns Smart Save, never changes the persisted plan, and never rolls back the saved Product because Media failed.

Product Entry is an Application coordinator only. The existing Product Media Workflow remains the sole authority that stages normalized sources, publishes or replaces final objects, moves removed objects to Trash, and writes canonical Product image state. The Submission records idempotency and the Workspace-scoped workflow link; the Product remains the source of truth for Product state and Product Media remains the source of truth for Media state.

### HTTP contract

```text
POST /api/catalog/product-entry-submissions/:submissionId/media
GET  /api/catalog/product-entry-submissions/:submissionId/media
```

POST accepts `multipart/form-data`. Every file field must be named exactly `source:<operationId>`. Filenames, multipart order, client MIME, client metadata, Workspace fields, and actor fields have no identity or policy authority. For a new workflow, Add and Replace require exactly one source. For an existing workflow, the server first resolves durable state from the Submission link and deterministic idempotency key: Completed operations and retryable operations with retained Staging require no file, while `requiresNewSource=true` requires a file only for that affected operation. Remove, Reorder, and SetCover accept no source. Missing, empty, duplicate, unknown, non-required, or count-inconsistent parts are rejected with stable `SOURCE_*` codes.

GET is read-only. It returns the Submission status, Product and workflow linkage, deterministic Media idempotency key, sanitized workflow/operation states, planned operations, retryable operations, and operations that require a new source. It does not expose staging keys, final storage keys, Trash keys, filesystem paths, or uploaded bytes, and it never retries automatically.

GET and POST use the same Application source-requirement projection. The projection distinguishes `RequiredFromPlan`, `RetainedSourceAvailable`, `NewSourceRequired`, `Completed`, and `NotRequired`; client-supplied workflow state is never authoritative.

Task 3.15.2 implements `NewSourceRequired` through a persisted Product Media [Source Attempt](Product-Media-Source-Replacement.md). The same multipart boundary accepts the deliberately different replacement source without rebuilding the Product Entry request or changing its fingerprint. | تنفذ المهمة 3.15.2 حالة المصدر الجديد عبر [محاولة مصدر](Product-Media-Source-Replacement.md) محفوظة في Product Media، ويقبل حد multipart نفسه الملف البديل المختلف دون إعادة بناء طلب Product Entry أو تغيير بصمته.

The App Router rejects a malformed or clearly oversized `Content-Length` before `request.formData()`, limits multipart requests to 32 entries, and still performs authoritative byte-length checks on every parsed file. The early request limit is 32 configured maximum-size sources plus 1 MiB of multipart overhead. `Content-Length` is only an early guard, never proof of the actual body size. The current App Router transport buffers multipart content; true streaming upload remains outside this correction.

### Persisted plan and double verification

The Workspace-scoped persisted Phase 1 Media Plan is authoritative for operation ID, type, sequence, target Media ID, requested order, cover selection, expected raw SHA-256, expected raw byte length, and `finalOrder`. Phase 2 maps sources by operation ID and reconstructs Product Media commands in persisted sequence. `finalOrder` overrides the earlier requested order when present, including Replace; Product Media applies the order as part of its canonical mutation.

The server independently calculates the raw byte length and lowercase SHA-256, detects JPEG/PNG/WebP from content, decodes the image, rejects corrupt or animated/unsupported content, and enforces configured raw-size, width, height, and decoded-pixel limits. Client MIME is ignored. Product Media then performs its own normalization and storage checksum checks, creating two independent verification boundaries.

Stable source codes are `SOURCE_SHA256_MISMATCH`, `SOURCE_BYTE_LENGTH_MISMATCH`, `SOURCE_MIME_UNSUPPORTED`, `SOURCE_IMAGE_INVALID`, `SOURCE_DIMENSIONS_UNSUPPORTED`, `SOURCE_TOO_LARGE`, `SOURCE_REQUIRED`, `SOURCE_UNEXPECTED`, `SOURCE_DUPLICATED`, and `SOURCE_OPERATION_UNKNOWN`.

### Idempotency, resume, and partial success

The Media idempotency key is lowercase SHA-256 over the unambiguous UTF-8 JSON tuple `[workspaceId, submissionId, productId, requestFingerprint]`. The linked workflow and the idempotency-key workflow are both resolved and must agree before any upload is mapped or verified. The workflow repository's Workspace-scoped unique constraint remains the resolve-or-create authority under concurrency. A completed replay accepts zero files, skips source verification and coordination, and returns the existing workflow without another image mutation. A retained-Staging retry also accepts zero files and invokes only the canonical Product Media retry path. Durable source hashes reconstruct the unchanged Product Media request fingerprint when a different Pending operation still needs bytes; completed operations are not re-executed. Staged sources use the existing 14-day lifecycle. Expiry produces `SourceUnavailable`, `retryAllowed=false`, and `requiresNewSource=true`. There is no worker or scheduler.

Task 3.15.2 now handles an existing `SourceUnavailable` operation through a persisted Source Attempt. POST accepts the required replacement file, creates or reuses the attempt by its dedicated source fingerprint, validates and stages it, atomically attaches it to the same operation, and invokes the canonical retry path without changing the Product Entry request fingerprint.

After coordination, a separate PostgreSQL transaction atomically and idempotently links the workflow and marks the Submission `Completed` or `PartiallyCompleted`. There is deliberately no distributed transaction with filesystem work. If the linkage transaction fails after Media completion, a later POST or GET resolves the same workflow by idempotency key and can restore the link without duplicating Media. Storage ambiguity remains durable as `ReconciliationRequired`.

### Authorization, tenancy, and responses

The Application layer requires `catalog.product-entry-media.upload` for ordinary Phase 2 sources and `catalog.productMedia.source.replace` for replacement Source Attempts; GET requires the existing submission read permission. Workspace and actor come only from the trusted-context resolver. Submission, plan, Product, workflow, and every repository lookup use exact Workspace scope; foreign Workspace resources are not found. Production remains fail-closed until a real authentication adapter is composed.

Response policy: `200` completed/existing; `202` accepted, partial, retryable, or accepted-source/resume-unavailable; `400` malformed multipart/source mapping or multipart-entry overflow; `403` permission denied; `404` Workspace-scoped Submission missing; `409` lifecycle/workflow/link or active-attempt conflict; `413` configured raw-size or clear request-size limit; `415` unsupported, invalid, or declared/detected MIME mismatch; `422` raw integrity, dimensions, or plan mismatch; `503` trusted context, storage, or unexpected service failure. Unexpected failures expose only `PRODUCT_ENTRY_MEDIA_SERVICE_UNAVAILABLE`; trusted-context failure keeps `AUTHENTICATION_CONTEXT_UNAVAILABLE`.

### Known limitations

There is no automatic retry, scheduler, object-storage adapter, permanent Trash deletion, true streaming multipart parser, or additional authentication provider in this capability. Task 3.20 owns scheduled Source Attempt cleanup. An empty Media Plan is not executable through the upload endpoint. Task 3.15.2 adds migration `0011` and no dependency.

## العربية

### حدود المرحلتين والملكية

تطالب المرحلة الأولى بسجل إدخال المنتج وتحفظ بصمة الطلب وخطة الوسائط المرتبة وتشغل Smart Save مرة واحدة داخل معاملة PostgreSQL واحدة. أما المرحلة الثانية فهي طلب مستقل؛ لا تعيد Smart Save ولا تعدل الخطة المحفوظة ولا تتراجع عن المنتج المحفوظ بسبب فشل الوسائط.

تنسق طبقة تطبيق Product Entry فقط، بينما تبقى دورة Product Media Workflow المرجع الوحيد لتجهيز المصدر ونشر الملف النهائي والاستبدال والنقل إلى سلة المحذوفات وكتابة حالة صور المنتج. يحتفظ سجل الطلب بالربط وبيانات الاستئناف، ويبقى المنتج مرجع حالة المنتج ودورة الوسائط مرجع حالة الوسائط.

### عقد HTTP

يقبل POST بيانات `multipart/form-data`، ويجب أن يكون اسم كل حقل ملف مطابقاً للصيغة `source:<operationId>`. لا تُستخدم أسماء الملفات أو ترتيب الأجزاء أو MIME القادم من العميل أو بيانات Workspace والممثل لتحديد العملية. تحتاج Add وReplace إلى مصدر واحد بالضبط، ولا تقبل Remove أو Reorder أو SetCover أي مصدر. أما GET فهو للقراءة فقط، ويعيد حالة الاستئناف المنقحة دون مفاتيح تخزين أو مسارات أو بايتات ودون إعادة محاولة تلقائية.

### سلطة الخطة والتحقق المزدوج

يحل الخادم دورة الوسائط المرتبطة ودورة مفتاح Idempotency قبل تحديد الملفات المطلوبة. تستخدم استجابتا GET وPOST الإسقاط نفسه في طبقة التطبيق، ولا تكون حالة الدورة المرسلة من العميل مرجعاً. لا يحتاج الطلب المكتمل ولا إعادة محاولة مصدر مرحلي محفوظ إلى إعادة رفع الملف، بينما تتطلب `requiresNewSource=true` ملفاً للعملية المتأثرة فقط.

يرفض App Router قيمة `Content-Length` غير الصالحة أو الكبيرة بوضوح قبل تحليل `formData`، ويقيد الطلب بـ 32 جزءاً، ثم يتحقق من طول كل ملف فعلياً بعد التحليل. لا تعد قيمة `Content-Length` دليلاً موثوقاً بمفردها. ما زال تنفيذ App Router الحالي يخزن multipart في الذاكرة، ويبقى الرفع المتدفق الحقيقي خارج نطاق هذا التصحيح.

خطة الوسائط المحفوظة في المرحلة الأولى والمقيدة بمساحة العمل هي المرجع للعملية والتسلسل والهدف والترتيب والغلاف وبصمة المصدر وطوله و`finalOrder`. تربط المرحلة الثانية الملف بمعرف العملية وتعيد بناء الأوامر حسب التسلسل المحفوظ، وتكون `finalOrder` هي القيمة النهائية الموثوقة عند وجودها.

يحسب الخادم طول البايتات الخام وSHA-256 مستقلاً، ويكتشف JPEG وPNG وWebP من المحتوى، ويفك ترميز الصورة، ويرفض المحتوى التالف أو المتحرك أو غير المدعوم، ويفرض حدود الحجم والأبعاد وعدد البكسلات. لا يثق الخادم في MIME المرسل. ثم تنفذ دورة Product Media تحقق التطبيع والتخزين المستقل.

### Idempotency والاستئناف والنجاح الجزئي

يقبل تكرار دورة مكتملة طلباً بلا ملفات، ويتجاوز مدقق المصدر والتجهيز والتنفيذ، ويعيد النتيجة المحفوظة دون تكرار صورة أو دورة. كما تعيد محاولة المصدر المرحلي المحفوظ استخدام الدورة والمصدر نفسيهما بلا رفع جديد. وإذا كانت العملية `SourceUnavailable` وتحتاج مصدراً جديداً، تنشئ المهمة 3.15.2 محاولة مصدر محفوظة أو تعيد استخدامها حسب بصمتها، ثم تتحقق من الملف وتربطه بالعملية نفسها وتستأنف مسار الإعادة المعتمد دون تغيير بصمة طلب Product Entry.

مفتاح Media هو SHA-256 للصفيف الحتمي `[workspaceId, submissionId, productId, requestFingerprint]`. يمنع القيد الفريد المقيد بمساحة العمل إنشاء دورتين للمفتاح نفسه. تعيد الطلبات المكتملة الدورة نفسها دون تكرار تعديل الصورة، ويستأنف POST المتكرر العمليات Pending ويعيد صراحةً محاولة العمليات التي ما زال مصدرها المرحلي صالحاً. تبقى المصادر المرحلية 14 يوماً، وبعد الانتهاء تصبح `SourceUnavailable` مع منع الإعادة وطلب مصدر جديد. لا توجد خدمة خلفية أو مجدول.

يحدث ربط الدورة وتغيير حالة الطلب داخل معاملة منفصلة وآمنة للتزامن. لا توجد معاملة موزعة مع نظام الملفات. إذا فشل الربط بعد اكتمال الوسائط، يمكن لطلب لاحق حل الدورة نفسها بواسطة مفتاح Idempotency وإكمال الربط دون تكرار الوسائط، وتبقى حالات الغموض محفوظة باسم `ReconciliationRequired`.

### الأمن والقيود

يتطلب POST صلاحية `catalog.product-entry-media.upload` للمصادر العادية وصلاحية `catalog.productMedia.source.replace` لمحاولات الاستبدال، ويتطلب GET صلاحية القراءة الحالية. تأتي مساحة العمل وهوية الممثل من محلل السياق الموثوق فقط، وتكون جميع القراءات والروابط مقيدة بمساحة العمل.

لا تضيف هذه القدرة إعادة تلقائية أو مجدولاً أو تخزين كائنات أو حذفاً دائماً لسلة المحذوفات أو مزود مصادقة جديداً، وتملك المهمة 3.20 تشغيل التنظيف المجدول. لا تنفذ نقطة الرفع خطة وسائط فارغة. أضيف الترحيل `0011` دون اعتماد جديد.
