# Product Media Source Replacement | استبدال مصدر وسائط المنتج

**Status:** Implemented · **Task:** 3.15.2 · **Last Updated:** 2026-08-19

## Task 3.15.2-R1 reconciliation | تسوية المهمة 3.15.2-R1

Task 3.15.2-R1 verified this implementation on the merged Task 3.15.1-E base at merge commit `c7afcaae15ac041feae7731aa58ccebb7ab2964c`. The preserved migration order is `0009_identity_member_administration` → `0010_bent_chronomancer` → `0011_product_media_source_attempts`; migration `0010`, its snapshot, and Task E recovery code were not modified. A guarded clean test database applied the full `0000`–`0011` chain and passed all PostgreSQL integration tests.

كشف التحقق الحي أن أسلوب الحفظ القديم كان يحذف صفوف عمليات سير العمل ويعيد إدراجها، وهو ما تعارض مع مراجع محاولات المصدر والتدقيق الجديدة. صُحح المستودع لتحديث مجموعة العمليات الثابتة في مكانها داخل معاملة الإصدار نفسها. يحافظ التصحيح على تاريخ محاولة المصدر، ومعرف العملية، وبصمة طلب إدخال المنتج، ومسار إعادة المحاولة الحالي، وقد نجح سيناريو فشل الاستئناف ثم إعادة المحاولة دون تجهيز المصدر مرة ثانية.

## English

### Boundary and stable identity

Source replacement is a Product Media recovery capability. It applies only to an existing `Add` or `Replace` operation whose durable state is `SourceUnavailable` with `requiresNewSource=true`. The existing `operationId`, workflow, Product, Product Entry Submission, persisted Media Plan, and Product Entry `requestFingerprint` remain unchanged. The replacement is represented by a new opaque 128-bit `sourceAttemptId`; it is not a new Media operation and does not rerun Product Entry Phase 1 or Smart Save.

### Source fingerprint and validation

Each attempt has a dedicated deterministic source fingerprint derived from the server-calculated raw SHA-256, byte length, and normalized declared media type. It is separate from the Product Entry request fingerprint. A replacement may intentionally have different bytes and a different SHA-256 from the unavailable source. Browser MIME and filenames are advisory only. The server independently checks the actual bytes, signature-detected MIME, decodability, size, dimensions, pixel limits, and normalized WebP output through the existing Product Media image policy. A declared/detected MIME mismatch fails with a typed validation result.

### Persistence, concurrency, and expiry

Migration `0011_product_media_source_attempts.sql` adds Workspace-scoped Source Attempt and safe audit tables. A partial unique index guarantees one active (`AwaitingUpload` or `Uploaded`) attempt per Workspace and operation. The repository locks the Workspace-scoped operation and attempt rows. The same active fingerprint returns the same attempt; a different fingerprint returns `ActiveSourceAttemptConflict`. Applied, failed, and expired attempts are terminal. Server time expires a non-terminal attempt exactly 14 days after creation; an expired attempt cannot be applied and a later attempt may be created.

The atomic apply transaction stores verified metadata, attaches the attempt-owned staging key to the same operation, clears `requiresNewSource`, makes the operation retryable, advances the existing workflow version, and records a path-safe audit event. The workflow request fingerprint is never updated. Foreign Workspace operations are queried by `workspaceId + operationId` and are indistinguishable from missing operations.

### Upload, storage, and resume

The existing Product Entry multipart route and Product Media storage port are reused; no second upload protocol or provider was introduced. The request body is received before Source Attempt persistence, so a database transaction is never held while the client uploads a large file. Storage keys are generated from trusted Product root, operation, and Source Attempt identities. Client paths and filenames never choose a storage location.

After staging, the Source Attempt is applied in a short transaction. The existing `RetryProductMediaOperationUseCase` then resumes the same operation. If that immediate resume fails, the accepted Source Attempt remains `Applied`, the operation remains staged and retryable, and a later retry uses the accepted source. Repeated apply/resume requests with the same fingerprint are idempotent and never publish duplicate Product media.

### Authorization, audit, and browser safety

Application authorization requires `catalog.productMedia.source.replace` from server-resolved `TrustedActorContext`. Owner authority comes from the fixed registry; Staff may receive the sensitive permission explicitly; the Standard Catalog Staff template excludes it. React visibility is only a usability aid.

Audit events contain Workspace, operation, Source Attempt, actor, event type, result code, and server timestamp. They never contain bytes, filenames, storage paths, tokens, credentials, or provider secrets. The browser keeps the selected `File` only in the in-memory media registry and revokes object URLs. It writes no `File`, `Blob`, `ArrayBuffer`, base64 payload, or media bytes to IndexedDB, localStorage, sessionStorage, or the Product Entry local draft. After reload, the responsive Arabic/English UI asks the user to reselect the local file.

### Cleanup handoff

The repository records expiry and exposes indexed expiry data. This task does not add a scheduler or worker. Task 3.20 owns scheduled cleanup execution for terminal/expired Source Attempt staging residue, using operation-owned keys and the existing storage safety boundary.

## العربية

### الحدود وثبات الهوية

استبدال المصدر قدرة استعادة ضمن Product Media، ولا يسمح به إلا لعملية `Add` أو `Replace` موجودة حالتها المحفوظة `SourceUnavailable` وقيمتها `requiresNewSource=true`. يبقى `operationId` ودورة العمل والمنتج وطلب Product Entry وخطة الوسائط المحفوظة وبصمة طلب Product Entry دون تغيير. يمثل الملف البديل محاولة جديدة بمعرّف مبهم `sourceAttemptId` بطول 128 بت؛ ولا تنشأ عملية وسائط جديدة ولا تعاد المرحلة الأولى أو Smart Save.

### بصمة المصدر والتحقق

لكل محاولة بصمة مصدر مستقلة وحتمية مشتقة من SHA-256 الذي يحسبه الخادم للبايتات الفعلية والحجم ونوع الوسيط المعلن بعد تطبيعه. لا تختلط هذه البصمة ببصمة طلب Product Entry، ويمكن أن تختلف الصورة البديلة وبصمتها عن المصدر المفقود. اسم الملف ونوع MIME القادم من المتصفح معلومات إرشادية فقط. يتحقق الخادم بصورة مستقلة من التوقيع والمحتوى وقابلية فك الصورة والحجم والأبعاد وحد البكسلات، ويعيد استخدام سياسة Product Media الحالية لإنتاج WebP المنمط. يؤدي اختلاف النوع المعلن عن النوع المكتشف إلى نتيجة تحقق نمطية.

### الحفظ والتزامن والانتهاء

يضيف الترحيل `0011_product_media_source_attempts.sql` جدولي محاولات المصدر والتدقيق الآمن المقيدين بمساحة العمل. يضمن فهرس فريد جزئي وجود محاولة نشطة واحدة فقط لكل مساحة عمل وعملية، ويقفل المستودع صف العملية والمحاولة داخل نطاق مساحة العمل. تعيد البصمة النشطة نفسها المحاولة نفسها، بينما تعيد البصمة المختلفة `ActiveSourceAttemptConflict`. تكون المحاولات المطبقة أو الفاشلة أو المنتهية نهائية. ينهي وقت الخادم المحاولة غير النهائية بعد 14 يوماً بالضبط، فلا يمكن تطبيقها بعدها ويمكن إنشاء محاولة لاحقة.

تخزن معاملة التطبيق الذرية البيانات الوصفية المتحقق منها، وتربط مفتاح التخزين المرحلي المملوك للمحاولة بالعملية نفسها، وتزيل طلب المصدر الجديد، وتجعل العملية قابلة للإعادة، وتزيد إصدار الدورة الموجودة، وتسجل حدث تدقيق آمناً من المسارات. لا تُحدَّث بصمة طلب الدورة. تبدأ استعلامات المستودع بـ `workspaceId + operationId` ولا تكشف وجود عملية في مساحة عمل أخرى.

### الرفع والتخزين والاستئناف

يعاد استخدام مسار multipart الحالي ومنفذ تخزين Product Media، ولا ينشأ بروتوكول رفع أو مزود ثانٍ. يستقبل حد HTTP جسم الملف قبل إنشاء محاولة المصدر، لذلك لا تبقى معاملة قاعدة البيانات مفتوحة أثناء رفع ملف كبير. يولد الخادم مفاتيح التخزين من جذر المنتج ومعرّف العملية ومعرّف المحاولة الموثوقة، ولا يحدد العميل مسار التخزين.

بعد التخزين المرحلي تطبق المحاولة في معاملة قصيرة، ثم تستأنف حالة الاستخدام الحالية للعملية نفسها. إذا فشل محفز الاستئناف الفوري تبقى المحاولة مقبولة بحالة `Applied` وتبقى العملية مرحلية وقابلة للإعادة، وتستخدم المحاولة اللاحقة المصدر المقبول. طلبات التطبيق والاستئناف المكررة للبصمة نفسها متوافقة مع Idempotency ولا تنشئ وسائط منتج مكررة.

### التفويض والتدقيق وأمان المتصفح

تفرض طبقة التطبيق صلاحية `catalog.productMedia.source.replace` من `TrustedActorContext` الذي يحله الخادم. يحصل المالك عليها من السجل الثابت، ويمكن منحها للموظف صراحة لأنها حساسة، ولا يتضمنها قالب موظف الكتالوج القياسي. إخفاء الإجراء في React تحسين تجربة فقط وليس حد أمان.

تحتوي أحداث التدقيق على مساحة العمل ومعرّف العملية والمحاولة والممثل ونوع الحدث ورمز النتيجة ووقت الخادم فقط. لا تحتوي على بايتات أو أسماء ملفات أو مسارات تخزين أو رموز جلسات أو أسرار. يحتفظ المتصفح بكائن `File` في سجل الذاكرة فقط ويلغي عناوين الكائنات، ولا يكتب `File` أو `Blob` أو `ArrayBuffer` أو base64 أو بايتات الوسائط في IndexedDB أو localStorage أو sessionStorage أو المسودة المحلية. بعد إعادة تحميل الصفحة تطلب الواجهة العربية/الإنجليزية المتجاوبة إعادة اختيار الملف المحلي.

### تسليم التنظيف

يسجل المستودع الانتهاء ويوفر فهرساً للاستعلام عنه، ولا تضيف هذه المهمة مجدولاً أو عاملاً خلفياً. تملك المهمة 3.20 تنفيذ التنظيف المجدول لبقايا التخزين المرحلي للمحاولات النهائية أو المنتهية باستخدام المفاتيح المملوكة للعملية وحد التخزين الآمن الحالي.
