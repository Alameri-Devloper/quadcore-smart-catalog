# Mobile Product Entry and Two-Phase Save | إدخال المنتج للجوال والحفظ على مرحلتين

**Task:** 3.14.9-D / 3.14.9-D-R1 / 3.14.9-D-R2
**Status:** R2 implemented; pending review | نُفذ تصحيح R2؛ بانتظار المراجعة

> **R1 correction authority:** The R1 rules below supersede the original Task D statements about existing-image metadata requiring Replace/reselection, immediate Add New cleanup, partial localization, and message-only Worker failure handling. | **مرجعية تصحيح R1:** تستبدل قواعد R1 أدناه عبارات المهمة D الأصلية حول استخدام Replace وإعادة تحديد المصدر لتغييرات بيانات الصور الموجودة، والتنظيف الفوري عند إضافة منتج جديد، والتعريب الجزئي، ومعالجة أعطال Worker المحدودة برسائل النجاح.

> **R2 correction authority:** The R2 rules below supersede D-R1 where unchanged Media used sentinel ordering, metadata ran before source dependencies completed, the old persisted Create draft was deleted before next-identity allocation, or English error/accessibility strings remained in Presentation state or markup. | **مرجعية تصحيح R2:** تستبدل قواعد R2 أدناه قواعد D-R1 حيث استُخدم ترتيب رمزي للوسائط غير المتغيرة، أو نُفذت عمليات البيانات الوصفية قبل اكتمال اعتماديات المصدر، أو حُذفت مسودة الإنشاء القديمة قبل تخصيص الهوية التالية، أو بقيت نصوص أخطاء وإتاحة وصول إنجليزية في حالة العرض أو بنيته.

## English

### Architecture and routes

The final Presentation keeps the existing Product Entry wizard and the independent Product Aggregate, Product Entry Submission, Product Media Workflow, Local Draft, and Presentation boundaries. React calls a Presentation coordinator and focused browser clients. Route Handlers resolve trusted server context and call Application use cases; components never call repositories or IndexedDB directly.

The supported routes are `/products/new` for Create and `/products/[productId]/edit` for Edit. The Create route puts only the non-authoritative `submissionId` in its URL so refresh and retry retain one logical session. Workspace and actor never come from forms, query parameters, hidden fields, or browser storage.

### Create and Edit lifecycle

Create allocates one submission ID and uses it for autosave, restore, Phase 1 retry, Phase 2 retry, and completed replay. Completion leaves the form and Create draft intact. `Add New Product` allocates and validates a different submission ID before exact-deleting the old persisted draft. Only after that transition succeeds does Presentation revoke preview URLs, clear in-memory files, reset the wizard, update the URL, and return to the first step.

Edit reads the Workspace-scoped Product through an Application use case, records its base revision, and initializes the same canonical form state. A Local Draft with the same revision requires explicit acceptance. A changed server revision shows a structured conflict and preserves the local draft without merging or overwriting it. A Phase 1 revision conflict also preserves the visible local state. Explicit discard and reload reads current Product truth and starts a new Edit submission.

### Local Draft and exit behavior

`ProductEntryLocalDraftController` owns recovery, debounced autosave, serialization, visibility flush, navigation flush, discard, and session replacement. The UI reports Saving, Saved, and unavailable storage without conflating Local Draft state with Product submission state. Restore actions are `Restore Draft`, `Discard Draft`, and `Continue Without Restore`; restored references are revalidated by the wizard and authoritative server validation.

The exit dialog focuses Continue Editing, treats Escape as Continue Editing, flushes text changes before navigation when possible, and explicitly states that selected image files are not stored locally.

### Browser Media and hashing

Serializable Media descriptors and in-memory `File` objects are separate. Local Draft persistence never receives a `File`, `Blob`, `ArrayBuffer`, raw bytes, object URL, filesystem path, or Media storage key. A registry maps stable operation IDs to selected files, preview URLs, and completed hashes. Replacing, removing, disposal, and Add New Product revoke the applicable object URLs.

A dedicated Web Worker uses native `crypto.subtle.digest("SHA-256", ...)`, returns lowercase hexadecimal SHA-256 and byte length, limits concurrency to two, correlates request IDs, cancels stale work, and has no insecure main-thread fallback. Add/Replace cannot be submitted until hashing succeeds. A restored source must be reselected and its recomputed hash and length must match the persisted descriptor.

The approved Phase 1 plan contains five first-class operations: `Add`, `Replace`, `Remove`, `Reorder`, and `SetCover`. Only Add and genuine source Replace require bytes, hashing, multipart fields, or reselection. Reorder and SetCover target an existing `mediaId`, carry no source metadata, persist in the canonical fingerprint and PostgreSQL plan, and map to the existing Product Media Workflow operations without upload. Add/Replace carry their final order and cover metadata without redundant metadata operations; Remove remains removal-only. Returning an existing image to its original order or cover state removes the metadata operation while retaining stable operation IDs during an active change.

Migration `0006_product_entry_media_metadata_operations.sql` widens the existing Product Entry operation-type and shape constraints and adds a partial unique cover-target index. It does not create a second command model or change Product Media ownership.

### R1 failure-safety, localization, and Worker recovery

`Add New Product` first allocates and validates a different next Create identity, then exact-deletes the old persisted draft. Only after that succeeds does Presentation revoke URLs, clear in-memory files, reset the save coordinator and receipt, replace form/session state, update the URL, and return to the first step. Allocation, validation, unchanged-ID, or deletion failure returns a stable typed code and preserves both the current in-memory state and recoverable persisted draft; an in-flight gate rejects parallel clicks.

All static Product Entry Presentation copy is selected from one typed English/Arabic dictionary, including Product Images, Commercial Details, step navigation, dialogs, progress, identity, Review, errors, empty/loading states, controls, and accessible labels. The root uses `dir="rtl"` for Arabic and `dir="ltr"` for English, while numbers explicitly use Latin digits.

The hash adapter listens for `message`, `error`, and `messageerror`. A Worker runtime event or `postMessage` failure terminally rejects all active and queued requests exactly once with `MEDIA_HASH_FAILED`, removes every listener, clears internal state, terminates the Worker, and makes later calls fail immediately. Construction failure remains `MEDIA_HASH_UNAVAILABLE`; cancel and disposal remain `MEDIA_HASH_CANCELLED`. No main-thread hashing fallback exists.

### R2 deterministic ordering, dependency resume, and localization

The Product Entry adapter reconstructs the complete final Media order with an exact fixed-slot algorithm. It derives the final set from current Media minus Remove targets plus Add operation IDs, places every explicit requested position, then fills gaps in stable current-server order followed by Add plan order. Duplicate IDs or positions, unknown IDs, out-of-range positions, and final-set mismatches return typed validation failures. Unchanged Media therefore retain stable relative order; no sentinel such as `Number.MAX_SAFE_INTEGER` is used.

Product Media Application classifies pending `Reorder` and `SetCover` operations as `Ready`, `WaitingForDependencies`, or `BlockedByTerminalFailure`. Metadata remains Pending, without an attempt or independent validation error, until every required Add/Replace/Remove operation completes. A successful source retry or retained-Staging publication immediately re-evaluates and executes eligible metadata in the same Phase 2 flow. A terminal source failure preserves Product success and produces a partial Media outcome; Media retry never repeats Phase 1.

Reference-data state now stores stable typed error codes rather than localized messages. The English/Arabic dictionary resolves all four loading failures and the remaining Product Review accessibility label at render time. Component-level server-rendered tests verify Arabic text with no English fallback, English text, major dialog/progress/media/review accessibility labels, RTL/LTR direction, and Western digits in Arabic. A curated source scan prevents the corrected user-facing English literals from returning outside the dictionary.

### تصحيحات R2 للترتيب والاستئناف والتعريب

يعيد محول إدخال المنتج بناء الترتيب النهائي الكامل للوسائط بخوارزمية خانات ثابتة ودقيقة. تُشتق المجموعة النهائية من الوسائط الحالية بعد طرح أهداف Remove وإضافة معرفات عمليات Add، ثم توضع المواضع المطلوبة صراحة وتُملأ الفجوات بترتيب الخادم الحالي المستقر ثم ترتيب خطة Add. تُرفض معرفات الوسائط أو المواضع المكررة والمعرفات المجهولة والمواضع خارج النطاق وعدم تطابق المجموعة بأخطاء تحقق محددة الأنواع. لذلك تحافظ الوسائط غير المتغيرة على ترتيبها النسبي دون استخدام قيمة رمزية مثل `Number.MAX_SAFE_INTEGER`.

تصنف طبقة تطبيق وسائط المنتج عمليتي `Reorder` و`SetCover` المعلقتين إلى جاهزة أو منتظرة للاعتماديات أو محجوبة بفشل نهائي. تبقى عملية البيانات الوصفية معلقة بلا زيادة للمحاولة أو خطأ تحقق مستقل حتى تكتمل كل عمليات Add وReplace وRemove المطلوبة. بعد نجاح إعادة محاولة المصدر أو نشر Staging المحفوظ، تعاد مراجعة الأهلية وتُنفذ البيانات الوصفية المؤهلة في تدفق المرحلة الثانية نفسه. يحافظ فشل المصدر النهائي على نجاح المنتج ويعطي نتيجة وسائط جزئية، ولا تعيد محاولة الوسائط تنفيذ المرحلة الأولى.

تخزن حالة البيانات المرجعية الآن رموز أخطاء ثابتة محددة الأنواع بدلاً من الرسائل المترجمة. يحل القاموس الإنجليزي والعربي حالات فشل التحميل الأربع وتسمية إتاحة الوصول المتبقية لمراجعة المنتج وقت العرض. تتحقق اختبارات العرض الفعلي من النص العربي وغياب النص الإنجليزي، والنص الإنجليزي، وتسميات إتاحة الوصول الأساسية، واتجاهي RTL/LTR، والأرقام الغربية في العربية، ويمنع فحص مصدر منسق عودة العبارات المصححة خارج القاموس.

### تصحيحات R1

تتضمن خطة المرحلة الأولى خمس عمليات أصلية: `Add` و`Replace` و`Remove` و`Reorder` و`SetCover`. تحتاج عمليتا Add والاستبدال الحقيقي للمصدر فقط إلى ملف وبصمة ورفع متعدد الأجزاء أو إعادة تحديد. تستهدف عمليتا Reorder وSetCover معرّف وسائط موجوداً بلا بيانات مصدر، وتدخلان في البصمة المعتمدة والحفظ في PostgreSQL وتُحوّلان إلى عمليتي Product Media الأصليتين دون إعادة رفع. يؤدي الرجوع إلى ترتيب الصورة أو غلافها الأصلي إلى إزالة عملية البيانات الوصفية، مع ثبات معرّف العملية أثناء بقاء التغيير.

يضيف الترحيل `0006_product_entry_media_metadata_operations.sql` النوعين والقيود الشكلية وفهرساً جزئياً يضمن هدف غلاف واحداً، دون إنشاء نموذج أوامر ثانٍ. يبدأ «إضافة منتج جديد» بحذف المسودة الدقيقة وإنشاء هوية الجلسة التالية؛ ولا تُمسح الملفات والروابط والإيصال والمنسق والنموذج والرابط والخطوة إلا بعد النجاح. يحافظ الفشل على الحالة كاملة ويمنع الحاجز النقرات المتوازية.

تأتي جميع نصوص العرض الإنجليزية والعربية من قاموس Presentation مركزي ومحدد الأنواع. كما يستمع عامل البصمة إلى `message` و`error` و`messageerror`؛ ويؤدي عطل وقت التشغيل أو فشل `postMessage` إلى رفض جميع الأعمال النشطة والمنتظرة مرة واحدة بالرمز `MEDIA_HASH_FAILED`، وإزالة المستمعين وإنهاء العامل. يبقى فشل الإنشاء `MEDIA_HASH_UNAVAILABLE` والإلغاء أو التخلص `MEDIA_HASH_CANCELLED`، ولا يوجد بديل غير آمن في الخيط الرئيسي.

### Two-phase save and retry

Save flushes the Local Draft, validates the full wizard, validates source readiness, builds the current Phase 1 request, and submits the same logical submission ID. Product ID, revision, lifecycle, and idempotent replay truth come only from the server.

After Product success, Phase 2 reads durable Media status. It uploads only exact `requiredSourceOperationIds` using multipart field names `source:<operationId>`. A no-Media plan skips Phase 2. Completed replay uses zero files. Retained Staging retry may also use zero files. Normal Media retry calls only Phase 2 and never repeats Product Smart Save.

Product and Media outcomes remain separate. Product is not rolled back when Media partially completes or fails. The UI distinguishes Product failure before Media start, Product success with Media completion, partial completion, retry, reselection, and `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED`.

### Responsive, RTL/LTR, and accessibility

Mobile uses a single column, four-column compact step grid without horizontal scrolling, approximately 44–48 pixel controls, and a sticky action area. Tablet and desktop add readable grids and a Product identity side panel. Media has explicit Move Up, Move Down, Set Cover, Replace, and contextual Remove controls and never depends on drag-and-drop.

The trusted default locale is English or Arabic, with a Presentation override. Root direction changes between LTR and RTL. Arabic number formatting explicitly requests Latin digits. Status is announced through `aria-live`; dialogs have labels, descriptions, safe initial focus, and explicit Escape behavior. Native labels, field errors, radio groups, progress semantics, visible focus, keyboard controls, and reduced-motion-safe progress transitions are retained.

### Trusted context and security

Browser requests do not send Workspace or actor as business authority. A development context route is available only in Development/Test and resolves the same trusted server adapter. Production remains fail-closed until real authentication supplies trusted context. Server validation, authorization, content inspection, hash recomputation, and Product Media Workflow authority remain canonical.

Reference Purchase Cost is absent. No dependency was added. R1 adds only migration `0006` for the existing Product Entry Media Plan constraints. Product request bodies and Media bytes are not logged.

### Known limitations and manual QA

- Real authentication is outside this task; Production intentionally remains unavailable.
- The Product read contract currently exposes Media identifiers and ordering but no public preview URL, so existing server images use a labeled placeholder until an approved read URL is available.
- The Product Type reference selector has no approved reference service in the current repository. Existing Edit values are preserved, and changing Category clears a stale Product Type; no hardcoded Product Type catalog was invented.
- The Product Media replacement-source use case remains intentionally unimplemented and is shown with its stable code.
- The approved in-app browser runtime reported `No browser is available`, and its required recovery inspection returned an empty browser surface list (`[]`) on 2026-08-06. No unrelated driver was installed. Automated interaction contracts passed; direct visual/touch QA remains a reviewer action.

Deterministic manual QA checklist:

1. Start the app with trusted Development context and required infrastructure, then open `/products/new` at 390 × 844.
2. Verify no horizontal page scroll, 44-pixel targets, sticky actions, keyboard-visible field errors, Back/Next behavior, and Media Move Up/Down with touch and keyboard.
3. Enter text, wait for Saved locally, refresh the same `submissionId`, and verify the explicit restore dialog. Exercise Restore, Continue Without Restore, Discard, initial focus, and Escape.
4. Select two new files; replace, remove, reorder, and set cover. Verify only one cover. After refresh, verify only Add and genuine source Replace require reselection; existing-image Reorder and SetCover remain source-free.
5. Save a no-Media Product and confirm Phase 2 is skipped, the form remains visible, and Add New Product creates a different URL submission ID.
6. Exercise Product success with Media partial/retry and confirm Retry Media does not issue another Phase 1 request.
7. Open an Edit Product, create a local change, advance the server revision, and verify conflict revisions plus explicit discard/reload without auto-merge.
8. Repeat at 768 × 1024 and 1440 × 900 with mouse and keyboard.
9. Switch to Arabic and verify `dir="rtl"`, mirrored alignment, Western numeric digits, dialog fit, and keyboard order; switch back to English and verify `dir="ltr"`.
10. Inspect IndexedDB and confirm descriptors contain no file bytes, object URLs, authentication material, or Reference Purchase Cost.
11. Verify existing order `[A, B, C]` can become `[A, C, B]` and `[C, A, B]`; combine Remove and Add-between-existing operations, and confirm unchanged images preserve relative order.
12. Force retryable Add/Replace/Remove failures with dependent Reorder/SetCover; verify metadata remains Pending, one Media retry completes the source and eligible metadata, and Phase 1 is not repeated. Verify terminal source unavailability remains partial without a metadata validation error.
13. Force next-session allocation failure, an invalid/same candidate, and exact-delete failure. Select Add New Product twice and verify one attempt runs while the persisted draft, form, files, preview URLs, receipt, coordinator state, draft identity, URL, and current step remain unchanged with a localized failure. Then verify a successful Add New deletes only the exact old draft.
14. Exercise every reference-data loading failure and the Review, Media, Progress, Exit, Conflict, and Recovery accessible labels in English and Arabic.
15. Force Worker `error`, `messageerror`, and `postMessage` failure independently; verify every active and queued hash settles once with `MEDIA_HASH_FAILED`, later hashes fail immediately, and no main-thread hashing occurs.

## العربية

### البنية والمسارات

تحافظ الواجهة النهائية على معالج إدخال المنتج الحالي وعلى استقلال حدود تجميع المنتج وسجل طلب الإدخال وسير وسائط المنتج والمسودة المحلية والعرض. تستدعي مكونات React منسق العرض وعملاء متصفح محددين، بينما تحل معالجات المسارات السياق الموثوق وتستدعي حالات استخدام طبقة التطبيق. لا تتصل المكونات بالمستودعات أو IndexedDB مباشرة.

المساران المعتمدان هما `/products/new` للإنشاء و`/products/[productId]/edit` للتعديل. يحتفظ مسار الإنشاء بمعرف الطلب غير السلطوي فقط كي ينجو من التحديث وإعادة المحاولة، ولا تأتي هوية مساحة العمل أو المنفذ من النموذج أو الاستعلام أو التخزين المحلي.

### دورة الإنشاء والتعديل

يستخدم الإنشاء معرف طلب واحداً للحفظ التلقائي والاستعادة وإعادة محاولة المرحلتين وإعادة تشغيل الطلب المكتمل. لا يمسح الاكتمال النموذج أو مسودة الإنشاء. يخصص زر «إضافة منتج جديد» معرف طلب مختلفاً ويتحقق منه قبل حذف المسودة القديمة الدقيقة، ولا يلغي روابط المعاينة أو يمسح الملفات والإيصال والمنسق والنموذج أو يغير الرابط والخطوة إلا بعد نجاح الانتقال. يحافظ فشل التخصيص أو التحقق أو الحذف على الحالة الحالية والمسودة القابلة للاستعادة، ويمنع حاجز التنفيذ المحاولات المتوازية.

يقرأ التعديل المنتج ضمن مساحة العمل عبر حالة استخدام، ويسجل المراجعة الأساسية. تتطلب المسودة المطابقة قبولاً صريحاً، بينما يعرض اختلاف المراجعة تعارضاً منظماً ويحفظ التغييرات المحلية بلا دمج أو استبدال تلقائي. يعيد الحذف والتحميل الصريح قراءة حقيقة المنتج الحالية ويبدأ جلسة تعديل جديدة.

### المسودة المحلية والخروج

يمتلك `ProductEntryLocalDraftController` الاستعادة والحفظ التلقائي المؤجل والتسلسل والحفظ عند إخفاء الصفحة أو التنقل والحذف وتبديل الجلسة. تعرض الواجهة حالات الحفظ المحلي دون خلطها بنتيجة حفظ المنتج. لا تحفظ ملفات الصور محلياً، ويشرح مربع الخروج أن العودة قد تتطلب إعادة تحديدها.

### الوسائط والبصمة

تفصل الواجهة بين واصف الوسائط القابل للتسلسل وملف `File` الموجود في الذاكرة. لا تحتوي المسودة على bytes أو `Blob` أو `ArrayBuffer` أو object URL أو مسار نظام ملفات أو مفاتيح تخزين. يلغي السجل روابط المعاينة عند الاستبدال أو الإزالة أو التخلص أو بدء منتج جديد.

يستخدم Web Worker مخصص Web Crypto الأصلي لحساب SHA-256 سداسي عشري صغير الحروف وطول الملف، مع تزامن محدود ومعرفات طلب وإلغاء النتائج القديمة وعدم وجود بديل غير آمن في الخيط الرئيسي. لا يصبح Add/Replace جاهزاً قبل اكتمال البصمة، ويجب أن يطابق الملف المعاد تحديده البصمة والطول المحفوظين.

تتضمن الخطة المعتمدة خمس عمليات أصلية: Add وReplace وRemove وReorder وSetCover. تحتاج Add والاستبدال الحقيقي للمصدر فقط إلى ملف وبصمة وإعادة تحديد. تستهدف Reorder وSetCover وسائط موجودة بلا بيانات مصدر، وتُحفظان وتدخلان في البصمة المعتمدة ثم تُحوّلان إلى عمليات Product Media Workflow الأصلية دون رفع. تحمل Add وReplace ترتيبها النهائي وحالة الغلاف، وتبقى Remove للإزالة فقط. يؤدي الرجوع إلى الترتيب أو الغلاف الأصلي إلى إزالة عملية البيانات الوصفية مع ثبات معرف العملية أثناء استمرار التغيير.

أضاف الترحيل الأدنى `0006_product_entry_media_metadata_operations.sql` النوعين الجديدين وقيودهما الشكلية وفهرساً جزئياً لهدف الغلاف الوحيد، دون تغيير شكل الجدول أو إنشاء نموذج أوامر موازٍ.

### الحفظ على مرحلتين

يفرغ الحفظ المسودة ثم يتحقق من المعالج ومصادر الوسائط ويبني طلب المرحلة الأولى الحالي بنفس معرف الطلب. بعد نجاح المنتج تقرأ المرحلة الثانية الحالة الدائمة وترفع المصادر المطلوبة فقط بأسماء `source:<operationId>`. تتجاوز الخطة الفارغة المرحلة الثانية، ولا تحتاج الإعادة المكتملة أو إعادة محاولة Staging المحفوظ إلى ملفات جديدة. لا تعيد محاولة الوسائط تنفيذ Smart Save للمنتج.

تبقى نتيجة المنتج مستقلة عن نتيجة الوسائط. لا يُتراجع عن المنتج عند فشل الوسائط أو اكتمالها الجزئي، وتعرض الواجهة النجاح الجزئي وإعادة المحاولة وإعادة التحديد والحالة `MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED` بوضوح.

### الاستجابة وإتاحة الوصول والاتجاه

يستخدم الجوال عموداً واحداً وشبكة خطوات بلا تمرير أفقي وأهداف لمس كبيرة ومنطقة إجراءات مثبتة، بينما يستفيد الجهاز اللوحي وسطح المكتب من الشبكات ولوحة هوية المنتج. تتوفر أزرار نقل لأعلى ولأسفل واختيار الغلاف والاستبدال والإزالة ولا يعتمد الترتيب على السحب.

يتبدل الاتجاه بين RTL للعربية وLTR للإنجليزية، وتستخدم الأرقام العربية أرقاماً غربية. تستخدم الحالات `aria-live`، وتملك مربعات الحوار عناوين وأوصافاً وتركيزاً أولياً آمناً وسلوك Escape صريحاً. تبقى التسميات والأخطاء ومجموعات الاختيار وشريط التقدم والتركيز المرئي ولوحة المفاتيح وتقليل الحركة مدعومة.

### السياق الموثوق والأمن والقيود

لا ترسل طلبات المتصفح مساحة العمل أو المنفذ كسلطة عمل. لا يعمل محول التطوير إلا في Development/Test، ويبقى الإنتاج مغلقاً حتى دمج المصادقة الحقيقية. يظل تحقق الخادم والتفويض وإعادة حساب البصمة وسير وسائط المنتج مصادر الحقيقة.

تكلفة الشراء المرجعية غائبة، ولم تُضف أي اعتمادية. يضيف R1 الترحيل `0006` فقط لتوسيع قيود خطة وسائط إدخال المنتج الحالية، ولا يحتاج R2 إلى ترحيل أو تعديل `0006`. لا تُسجل أجسام طلب المنتج أو bytes الوسائط. لا يوفر عقد القراءة الحالي رابط معاينة عام للوسائط الموجودة، ولا توجد خدمة مراجع معتمدة لاختيار Product Type، كما يبقى تدفق مصدر الاستبدال الجديد غير منفذ. أبلغ سطح المتصفح المعتمد أن لا متصفح متاح، وأعاد فحص الاستعادة قائمة فارغة (`[]`) في 2026-08-06؛ لذلك لم يُثبت برنامج قيادة بديل وتبقى قائمة الفحص اليدوي أعلاه مطلوبة للمراجع.
