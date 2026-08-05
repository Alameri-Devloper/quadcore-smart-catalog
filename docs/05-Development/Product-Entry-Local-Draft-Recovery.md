# Product Entry Local Draft Recovery | استعادة مسودة إدخال المنتج محلياً

**Status:** Implemented headless foundation · **Task:** 3.14.9-C / 3.14.9-C-R1 · **Last Updated:** 2026-08-05

## English

### Boundary and architecture

Task 3.14.9-C adds browser-local recovery for Product Entry without changing the Product Aggregate, the transactional Phase 1 Submission Registry, the Phase 2 Media coordinator, or server repositories. The dependency direction is:

```text
Presentation -> Local Draft Application -> ProductEntryLocalDraftStore port -> IndexedDB adapter
```

React and routes do not call IndexedDB. The headless `ProductEntryLocalDraftController` exposes draft state, recovery decisions, debounced save, explicit flush, discard, Add New Product, explicit recovery acceptance, visibility flushing, and disposal. Task 3.14.9-D owns the final Create/Edit form binding, restore/conflict visuals, translations, and responsive interaction design.

The obsolete Product Entry `localStorage` prototype was removed. It used an actor-scoped “most recent draft” query and could not enforce the approved exact Create/Edit identities. Until Task 3.14.9-D integrates the headless contract, the current prototype page presents only an unsaved-changes exit guard and does not claim that a local draft was saved.

### Identity, retention, and submission lifecycle

- Create retention is exactly seven days from the most recent successful local save.
- A Create key contains `workspaceId + actorId + mode + submissionId`.
- The Create `submissionId` is allocated when the first Create session starts and is reused by autosave, restore, Phase 1, Phase 2, and retries. Explicit Add New Product deletes the exact prior Create draft and allocates a new ID.
- Edit retention is exactly 24 hours from the most recent successful local save.
- An Edit key contains `workspaceId + actorId + mode + productId + baseProductRevision`.
- The Edit `submissionId` is allocated when an Edit session starts and persists through save, restore, and retry. A session started after a completed Edit receives a new ID.
- `createdAt` is preserved on later saves; `updatedAt` and `expiresAt` advance only with a successful save.

All identities come from a trusted client/presentation session context. Missing or blank Workspace, actor, submission, Product, or invalid Edit revision values fail with a stable typed code. There is no anonymous/default identity, Product-only lookup, submission-only lookup, or global-latest draft query.

### IndexedDB schema and upgrades

The browser adapter uses database `qsc-product-entry`, database version `1`, and object store `product-entry-local-drafts`. Its primary `storageKey` is a deterministic length-prefixed encoding of the approved identity. Stable indexes cover Workspace/actor, Workspace/actor/mode, exact Create identity, exact Edit identity, and expiration. Normal save/read/delete is one-record atomic and uses the exact primary key. Expired cleanup uses the Workspace/actor index and never exposes records to Presentation.

Draft payload schema version `1` is independent of the IndexedDB database version. Version `0` has a deterministic migration that marks Add/Replace sources `RequiresReselection`. Unknown future versions return `IncompatibleDraft`; malformed values return `CorruptDraft`. Neither condition crashes recovery or overwrites the record. IndexedDB/provider messages are mapped to `LOCAL_DRAFT_STORAGE_UNAVAILABLE` and never returned to Presentation.

### Stored and forbidden data

The local record stores approved classification selections, Product type/device/condition/status references, Product name/code, wholesale and retail selling prices with currencies, publication intent, specification values, submission identity, timestamps, and ordered Media operation descriptors.

The record never stores raw `File`, `Blob`, `ArrayBuffer`, typed-array, image bytes, `blob:`, `data:`, or filesystem URLs. It also rejects Reference Purchase Cost, authentication/session tokens, credentials, passwords, trusted-context tokens, employee WhatsApp, server stacks, storage references, file paths, and staging/final/trash keys. No dependency was added.

Add/Replace descriptors may retain file name, MIME type, expected SHA-256, expected byte length, order, and cover selection. On recovery, their source state is always `RequiresReselection`; a stale local “completed” field is not part of the schema. Current accepted/completed Media truth remains the Phase 2 status response.

### Recovery, conflict, deletion, and revalidation

Recovery returns structured states: `NoDraft`, `RecoverableCreateDraft`, `RecoverableEditDraft`, `RevisionConflict`, `ExpiredDraft`, `IncompatibleDraft`, `CorruptDraft`, `IdentityInvalid`, or `StorageUnavailable`. A recoverable decision never mutates the form. Presentation must explicitly accept it before receiving the restorable payload.

For Edit, the caller supplies the current Product revision from the approved server read path. A revision mismatch returns Product ID, base revision, current revision, and local update time. The draft is preserved; there is no automatic merge, overwrite, reload, or delete.

Recovered data always has `revalidationRequired: true`. Task 3.14.9-D must revalidate Department ownership, Category hierarchy, Brand, Product Type, Device Class, currencies, permissions, publication rules, Product revision, Media descriptor consistency, absence of Reference Purchase Cost, and the trusted Workspace/actor before submission. Server-side validation remains authoritative.

Create completion is not a deletion boundary. `SubmissionCompleted` preserves the exact Create draft, its `submissionId`, and all local state through Phase 1 success, Phase 2 completion, completed-response replay, retry, restore, and later viewing of the saved Product. Only explicit Add New Product exact-deletes that Create draft and allocates a different submission ID; explicit user discard and scoped expiry cleanup remain the other approved Create deletion paths. For Edit, the approved terminal `SubmissionCompleted` policy exact-deletes only that Edit draft. Validation failure, network failure, Phase 1 retry, Phase 2 retry, Phase 1 success by itself, and revision conflict preserve both modes.

### Autosave and Presentation integration

Autosave is configurable and debounced. Saves are serialized per exact draft identity, so an older asynchronous save cannot finish after a newer write for that identity. Different identities do not block each other. `flushDraft`, `flushBeforePhaseOne`, `flushBeforeNavigation`, and a detachable visibility-hidden listener support explicit flush points. Disposal cancels scheduled work and prevents post-unmount saves.

Application and Domain code return stable codes only; they contain no Arabic or English UI strings. Task 3.14.9-D must translate those codes in Presentation and verify mirrored placement, reading order, focus order, and directional icons independently for RTL Arabic and LTR English.

### Limitations

This task does not implement final Create/Edit visuals, a Media picker, a hashing Worker, real authentication, server-side drafts, cross-device synchronization, a Worker/Service Worker/scheduler, offline Product submission, or automatic database migration. Production authentication and the final trusted client identity adapter remain pending. IndexedDB is browser-local and can be unavailable or cleared by the browser/user.

## العربية

### الحدود والمعمارية

تضيف المهمة 3.14.9-C استعادة محلية لمسودة إدخال المنتج داخل المتصفح من دون تغيير مجمّع المنتج أو سجل طلبات المرحلة الأولى أو منسق وسائط المرحلة الثانية أو مستودعات الخادم. اتجاه الاعتماد هو: العرض ثم تطبيق المسودة المحلية ثم منفذ التخزين ثم محول IndexedDB. لا تستدعي مكونات React أو المسارات IndexedDB مباشرة.

يوفر المتحكم عديم الواجهة حالة المسودة وقرارات الاستعادة والحفظ المؤجل والتفريغ الصريح والحذف وبدء منتج جديد وقبول الاستعادة صراحةً والتفريغ عند إخفاء الصفحة والتخلص الآمن. تتولى المهمة 3.14.9-D ربط النموذج النهائي وعرض الاستعادة والتعارض والترجمة والتفاعل المتجاوب.

أزيل النموذج الأولي القديم الذي كان يستخدم `localStorage` ويبحث عن «أحدث مسودة». لم يكن هذا المسار قادراً على فرض هوية الإنشاء أو التعديل الدقيقة. إلى أن تنفذ المهمة 3.14.9-D الربط النهائي، تعرض صفحة النموذج الحالية تحذير تغييرات غير محفوظة فقط ولا تدعي نجاح حفظ مسودة محلية.

### الهوية والاحتفاظ ودورة submissionId

- مدة مسودة الإنشاء سبعة أيام بالضبط من آخر حفظ محلي ناجح.
- مفتاح الإنشاء هو `workspaceId + actorId + mode + submissionId`.
- ينشأ `submissionId` عند بدء جلسة الإنشاء الأولى ويستمر مع الحفظ والاستعادة والمرحلتين وإعادة المحاولة. يؤدي «إضافة منتج جديد» الصريح إلى حذف المسودة السابقة الدقيقة وإنشاء معرف جديد.
- مدة مسودة التعديل 24 ساعة بالضبط من آخر حفظ محلي ناجح.
- مفتاح التعديل هو `workspaceId + actorId + mode + productId + baseProductRevision`.
- ينشأ `submissionId` عند بدء التعديل ويستمر مع الحفظ والاستعادة وإعادة المحاولة، وتستخدم جلسة جديدة بعد اكتمال التعديل معرفاً جديداً.
- يبقى `createdAt` ثابتاً، بينما يتغير `updatedAt` و`expiresAt` بعد الحفظ الناجح فقط.

تأتي هوية مساحة العمل والممثل من سياق عرض موثوق، ولا توجد هوية مجهولة أو افتراضية. لا يوجد بحث بمعرف المنتج وحده أو معرف الطلب وحده أو أحدث سجل عام. تعاد الهوية الناقصة أو المراجعة غير الصالحة برمز منظم.

### مخطط IndexedDB والترقية

يستخدم المحول قاعدة `qsc-product-entry` بالإصدار `1` ومخزن `product-entry-local-drafts`. المفتاح الأساسي ترميز حتمي يحفظ جميع أجزاء الهوية المعتمدة. توجد فهارس مستقرة لمساحة العمل والممثل والنمط وهوية الإنشاء وهوية التعديل والانتهاء. يتم الحفظ والقراءة والحذف لسجل دقيق داخل معاملة ذرية، ويستخدم تنظيف المنتهي فهرس مساحة العمل والممثل فقط.

إصدار حمولة المسودة هو `1` ومستقل عن إصدار قاعدة IndexedDB. تهاجر النسخة `0` حتمياً وتحوّل مصادر الإضافة والاستبدال إلى `RequiresReselection`. تعيد النسخة المستقبلية `IncompatibleDraft` والحمولة التالفة `CorruptDraft` من دون انهيار أو استبدال السجل. لا تصل رسائل IndexedDB الخام إلى طبقة العرض.

### البيانات المسموحة والممنوعة

تخزن المسودة اختيارات التصنيف ونوع المنتج والجهاز والحالة والتوفر والاسم والكود وأسعار بيع الجملة والتجزئة وعملاتها ونية النشر وقيم المواصفات وهوية الطلب والطوابع الزمنية وأوصاف عمليات الوسائط المرتبة.

لا تخزن المسودة `File` أو `Blob` أو `ArrayBuffer` أو المصفوفات الثنائية أو بايتات الصور أو روابط `blob:` و`data:` والملفات. كما تمنع تكلفة الشراء المرجعية ورموز المصادقة والجلسة وكلمات المرور وبيانات الاعتماد ورموز السياق الموثوق ورقم واتساب الموظف وتتبع الخادم ومراجع ومسارات ومفاتيح التخزين المرحلي والنهائي والمحذوف. لم تضف المهمة أي اعتماد جديد.

قد يحتفظ وصف الإضافة أو الاستبدال باسم الملف ونوعه وبصمة SHA-256 والطول المتوقع والترتيب والغلاف. بعد الاستعادة تكون حالة المصدر دائماً `RequiresReselection`. تأتي حقيقة اكتمال الوسائط الحالية من استجابة المرحلة الثانية ولا تُوثق من حالة محلية قديمة.

### الاستعادة والتعارض وإعادة التحقق

تعيد الاستعادة حالات منظمة ولا تطبق المسودة تلقائياً. يجب أن يقبل المستخدم الاستعادة صراحةً قبل تسليم الحمولة القابلة للتطبيق. في وضع التعديل يوفر المستدعي مراجعة المنتج الحالية من مسار القراءة المعتمد. عند اختلافها تعاد تفاصيل التعارض وتبقى المسودة محفوظة من دون دمج أو استبدال أو إعادة تحميل أو حذف تلقائي.

تحمل كل مسودة مستعادة العلامة `revalidationRequired: true`. يجب على المهمة 3.14.9-D إعادة التحقق من ملكية القسم وتسلسل الفئة والعلامة التجارية ونوع المنتج وفئة الجهاز والعملات والصلاحيات ومتطلبات النشر ومراجعة المنتج واتساق أوصاف الوسائط وغياب تكلفة الشراء المرجعية وتطابق مساحة العمل والممثل. يبقى تحقق الخادم هو المرجع النهائي.

لا يُعد اكتمال طلب الإنشاء حداً لحذف المسودة. يحافظ الحدث `SubmissionCompleted` على مسودة الإنشاء الدقيقة ومعرف `submissionId` وكل حالتها المحلية بعد نجاح المرحلة الأولى واكتمال المرحلة الثانية وإعادة استجابة الاكتمال والمحاولة والاستعادة وعرض المنتج المحفوظ لاحقاً. وحده إجراء «إضافة منتج جديد» الصريح يحذف مسودة الإنشاء الدقيقة ويخصص معرف طلب مختلفاً، مع بقاء حذف المستخدم الصريح وتنظيف الانتهاء المقيد مساري الحذف الآخرين المعتمدين للإنشاء. أما في وضع التعديل فتقضي السياسة المعتمدة بأن يحذف الحدث النهائي `SubmissionCompleted` مسودة التعديل الدقيقة وحدها. وتحافظ أخطاء التحقق أو الشبكة أو إعادة محاولة المرحلة الأولى أو الثانية أو نجاح المرحلة الأولى وحده أو تعارض المراجعة على المسودة في الوضعين.

### الحفظ التلقائي والعرض والقيود

الحفظ التلقائي مؤجل وقابل للتهيئة ومتسلسل لكل هوية دقيقة، فلا تستطيع عملية قديمة إنهاء الكتابة بعد عملية أحدث للهوية نفسها، بينما لا تمنع الهويات المختلفة بعضها. يدعم العقد التفريغ قبل المرحلة الأولى وقبل التنقل وعند انتقال الصفحة إلى الإخفاء، كما يلغي التخلص العمل المجدول ويمنع الحفظ بعد إلغاء المكون.

تعيد طبقات المجال والتطبيق رموزاً ثابتة بلا نصوص عربية أو إنجليزية. تقع ترجمة الرموز وترتيب القراءة والتركيز والأيقونات الاتجاهية للغتين RTL وLTR ضمن طبقة العرض في المهمة 3.14.9-D.

لا تنفذ هذه المهمة واجهة الإنشاء أو التعديل النهائية أو منتقي الصور أو عامل التجزئة أو المصادقة الحقيقية أو مسودات الخادم أو المزامنة بين الأجهزة أو العمل في الخلفية أو الإرسال دون اتصال أو الترحيل التلقائي. ما زالت مصادقة الإنتاج ومحول هوية العميل الموثوق النهائي قيد الانتظار، وقد يكون IndexedDB غير متاح أو يحذفه المتصفح أو المستخدم.
