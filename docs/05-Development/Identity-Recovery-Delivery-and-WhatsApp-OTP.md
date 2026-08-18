# Identity Recovery Delivery and WhatsApp OTP | توصيل استعادة الهوية ورمز واتساب

**Status:** Hardened, pending independent review
**Task:** 3.15.1-E / 3.15.1-E-R1
**Last Updated:** 2026-08-17

## English

### Boundary and architecture

Task E completes the approved self-service password-recovery path without changing the Identity aggregate boundaries. `PasswordRecoveryChallenge` remains provider-neutral and continues to use `PrimaryRecoveryContact`; WhatsApp message composition, Workspace delivery configuration, timeout behavior, and provider contracts live in Identity Infrastructure. Application owns recovery orchestration and transaction boundaries. Route Handlers validate exact DTOs, apply the existing same-origin policy, call Application, and map safe typed results.

The public routes are:

- `POST /api/auth/recovery/request`
- `POST /api/auth/recovery/resend`
- `POST /api/auth/recovery/verify`
- `POST /api/auth/recovery/reset`

The browser submits only Workspace Code and Username to start. It receives an authenticated, AES-GCM-protected public-flow token in the same response shape for eligible and ineligible identities. The token encrypts either real or decoy flow state, uses a purpose-separated key derived from the recovery key ring, exposes no Workspace/Actor/account/challenge identifier, and has bounded lifetime. Unknown Workspace, unknown username, suspension, `OwnerManagedOnly`, and missing profile/contact remain indistinguishable across request, resend, verify, and reset. Both real and decoy tokens enforce the same public resend cooldown and rotate to equal-shape protected tokens after the cooldown. A bounded HMAC operation is performed for every well-formed request before eligibility resolution. The reference is kept only in the root React recovery context; it is not placed in a URL, cookie, Local Storage, Session Storage, or IndexedDB. A page reload intentionally requires a new request.

### OTP and challenge lifecycle

The existing challenge is reused. Codes contain exactly eight Western digits, retain leading zeroes, expire after ten minutes, allow five verification attempts, require a sixty-second resend interval, and permit at most three challenge deliveries per account in one hour. A resend creates a new cryptographically generated code and HMAC digest, invalidates the previous challenge, and returns a different opaque reference. PostgreSQL locking plus the existing one-open-challenge partial unique index serialize request, resend, verify, and reset operations.

Only versioned HMAC-SHA-256 digests are stored. Plaintext exists only during generation and the delivery call. Recovery keys remain purpose-separated from session HMAC keys and password hashes. Migration `0010_bent_chronomancer.sql` adds global uniqueness for the random challenge reference so Infrastructure can resolve the opaque public reference once and then continue through Workspace-scoped repository operations. It adds no plaintext, provider secret, or second OTP model.

Verification rechecks Workspace policy, account suspension, challenge state/expiry/attempt budget, and recovery-contact version under the Workspace lock. Reset first performs a cheap read-only eligibility preflight and does not invoke Argon2 for Active, invalid, expired, consumed, invalidated, decoy, suspended, policy-blocked, or contact-version-stale authority. Only a successful `Verified` preflight permits hashing outside the transaction. The final transaction locks and revalidates every security condition, including current expiry, before replacing the credential. It applies the existing 12–128 Unicode password policy without trimming or normalization, creates a Permanent credential, increments `passwordVersion`, clears login protection, consumes the challenge, revokes every server Session with `RecoveryCompleted`, and creates no new Session.

### Delivery and transaction boundary

`RecoveryDeliveryPort` is the provider-neutral Application boundary. Each challenge produces one stable purpose-specific delivery idempotency key (`identity-recovery-delivery:<challenge-id>`); it never contains the OTP and is passed explicitly through `WhatsAppProviderPort` so a future provider adapter can map it to vendor idempotency. `WhatsAppRecoveryDeliveryAdapter` composes concise Arabic or English content from the member profile locale, resolves generic Workspace configuration, and calls a replaceable `WhatsAppProviderPort` with an abort signal and a centrally bounded timeout. Core Domain and Application contain no Meta, Twilio, template, HTTP-client, access-token, or authorization-header knowledge.

Challenge creation and safe Audit commit in the first transaction. The provider call occurs only after that transaction returns. A focused follow-up transaction records attempted/succeeded/failed Audit events. Definitive non-delivery (`ConfigurationMissing`, `ProviderRejected`, or `PermanentFailure`) invalidates the challenge. Ambiguous or temporary outcomes (`ProviderUnavailable`, `TemporaryFailure`, or `Timeout`) keep it open because delivery may have occurred. In every outcome, the latest-attempt query preserves the 60-second spacing even when no Active challenge exists, while the existing three-per-hour limit still counts all created challenges. If the follow-up transaction itself is unavailable, the caller receives decoy authority and the operation fails closed without exposing eligibility. Audit and normal logs never receive the OTP, digest, destination message body, password, session value, idempotency key, provider token, or authorization header.

No production vendor was approved in this task. The adapter contract is ready for a concrete provider without Domain/Application changes. Production remains globally unavailable unless a production `WhatsAppProviderPort` is explicitly supplied; it never falls back to Development capture.

### Configuration and Development/Test delivery

System configuration uses the existing recovery HMAC variables:

- `QSC_RECOVERY_HMAC_ACTIVE_VERSION`
- `QSC_RECOVERY_HMAC_KEYS_JSON`

Delivery selection/configuration uses:

- `QSC_RECOVERY_DELIVERY_MODE=development|production`
- `QSC_RECOVERY_PROVIDER_WORKSPACES_JSON`
- `QSC_RECOVERY_PROVIDER_TIMEOUT_MS` (optional; default 8000 ms)
- `QSC_RECOVERY_PUBLIC_SEND_FLOOR_MS` (optional; default provider timeout plus 250 ms)
- `QSC_RECOVERY_PUBLIC_PROBE_FLOOR_MS` (optional; default 250 ms)

The injected public timing policy uses asynchronous timers, never busy waiting. Request and resend share a response-duration floor that must exceed the provider timeout; verify and reset use the smaller probe floor. Decoy identities never call the provider. This closes the obvious external-network timing branch while keeping the policy deterministic in tests.

The Workspace JSON accepts only `enabled`, `providerAccountReference`, `senderReference`, and `templateReference`. Extra fields are rejected so provider secrets cannot be placed in this normal configuration object. A future concrete provider must obtain access secrets from the deployment secret boundary and never from Workspace domain tables. Task 3.20 owns the production secret-management and operational hardening handoff.

`DevelopmentRecoveryDeliveryAdapter` is explicit, sends no network message, exposes safe metadata without destination or code, and allows code retrieval only through an in-process test method. Construction is forbidden in Production, and no HTTP route exposes captured codes. Without explicit Development mode or an injected production provider, recovery fails closed.

### Failure, invalidation, cleanup, and rate limits

Provider/configuration details never reach unauthenticated clients. Request responses stay generic; resend/verify/reset disclose only safe flow-state results to a party already holding an opaque reference. Changing member WhatsApp invalidates open challenges as before. Changing policy to `OwnerManagedOnly` now invalidates all open Workspace recovery challenges; verify/reset also recheck policy. Suspension remains authoritative throughout the flow.

The focused cleanup use case deletes bounded batches of expired open/verified challenges and retained terminal `Consumed`, `Invalidated`, or `Expired` challenges. It is idempotent and unscheduled; Task 3.20 owns scheduling. Account-scoped request/resend protection prevents challenge recreation bypass. Broader IP/edge throttling and operational telemetry remain a documented Task 3.20 concern; Task E does not invent browser fingerprinting or a general rate-limit platform.

### R1 persistence decision

No migration `0011` is required. Protected decoy/public authority is stateless and authenticated, provider idempotency is derived deterministically from the existing challenge attempt, and send spacing is enforced by querying the latest persisted challenge regardless of status. The existing challenge table already contains the minimum durable attempt timestamp and hourly-count history needed by this correction.

### Presentation

`/recover-password` now performs the real generic request and keeps the response indistinguishable. `/recover-password/verify` performs OTP verification first, then reveals the new-password step, supports full-code paste and numeric keyboard metadata, uses the server-provided safe cooldown, resends to a new reference, and returns to `/login` after reset. The client countdown is advisory. No automatic login occurs.

## العربية

### الحدود والمعمارية

تكمل المهمة E مسار الاستعادة الذاتية المعتمد دون تغيير حدود نماذج الهوية. يبقى `PasswordRecoveryChallenge` محايدًا للمزوّد ويستخدم `PrimaryRecoveryContact`، بينما توجد صياغة رسالة واتساب وتهيئة مساحة العمل والمهلة وعقد المزوّد في طبقة Infrastructure. تملك طبقة Application التنسيق وحدود المعاملات، وتتحقق معالجات المسارات من DTO الدقيقة وسياسة المصدر نفسه ثم تحول النتائج إلى حالات عامة آمنة.

المسارات العامة هي طلب الاستعادة وإعادة الإرسال والتحقق وإكمال إعادة الضبط تحت `/api/auth/recovery/*`. يرسل المتصفح رمز مساحة العمل واسم المستخدم فقط. تعيد الاستجابة مرجعًا عشوائيًا معتمًا بالشكل نفسه للحساب المؤهل وغير المؤهل، لذلك لا تكشف مساحة العمل أو المستخدم غير الموجود أو التعليق أو سياسة `OwnerManagedOnly` أو غياب الملف/جهة الاتصال. تُنفذ كلفة HMAC محدودة لكل طلب صحيح الصيغة قبل تقييم الأهلية. يبقى المرجع في سياق React بالذاكرة فقط ولا يوضع في الرابط أو ملفات الارتباط أو أي Web Storage، ويؤدي تحديث الصفحة عمدًا إلى طلب بدء جديد.

### OTP ودورة حياة التحدي

تعيد المهمة استخدام نموذج التحدي الحالي. يتكون الرمز من ثمانية أرقام غربية مع قبول الصفر في البداية، وتنتهي صلاحيته بعد عشر دقائق، وله خمس محاولات تحقق، وفاصل إعادة إرسال ستين ثانية، وثلاث عمليات توصيل كحد أقصى للحساب خلال ساعة. تنشئ إعادة الإرسال رمزًا وتجزئة جديدين وتبطل السابق وتعيد مرجعًا جديدًا. تضمن أقفال PostgreSQL وفهرس التحدي المفتوح الواحد التسلسل الآمن.

لا يُخزن إلا HMAC-SHA-256 ذي الإصدار. تبقى قيمة OTP الخام خلال التوليد واستدعاء التوصيل فقط، وتظل مفاتيح الاستعادة منفصلة عن مفاتيح الجلسة وتجزئات كلمات المرور. يضيف الترحيل `0010_bent_chronomancer.sql` تفردًا عالميًا لمرجع التحدي العشوائي، ثم تستمر كل العمليات بمستودعات مقيدة بمساحة العمل. لا يضيف الترحيل رمزًا خامًا أو سر مزوّد أو نموذج OTP منافسًا.

يعيد التحقق فحص السياسة والتعليق والحالة والانتهاء وعدد المحاولات وإصدار جهة الاتصال تحت قفل مساحة العمل. تعيد عملية الإكمال الفحوص الحاكمة، وتطبق سياسة كلمة المرور الحالية دون قص أو تطبيع، وتجعل الاعتماد `Permanent`، وترفع `passwordVersion`، وتمسح حماية الدخول، وتستهلك التحدي، وتلغي جميع الجلسات بسبب `RecoveryCompleted`، ولا تنشئ جلسة جديدة.

### التوصيل وحد المعاملة

يمثل `RecoveryDeliveryPort` الحد المحايد في Application. يصوغ `WhatsAppRecoveryDeliveryAdapter` رسالة عربية أو إنجليزية حسب لغة ملف العضو، ويحل تهيئة مساحة العمل العامة، ويستدعي `WhatsAppProviderPort` قابلاً للاستبدال مع مهلة محدودة. لا يعرف Domain أو Application أي تفاصيل Meta أو Twilio أو HTTP أو رموز الوصول أو قوالب المزوّد.

تُحفظ التحديات والتدقيق أولًا وتُغلق المعاملة، ثم يجري اتصال المزوّد خارجها، ثم تسجل معاملة قصيرة نتيجة المحاولة. يبطل الفشل النهائي أو انتهاء المهلة التحدي. لا تدخل OTP أو التجزئة أو نص الرسالة أو كلمة المرور أو الجلسة أو سر المزوّد أو ترويسة التفويض إلى التدقيق أو السجلات العادية.

لم يُعتمد مزوّد إنتاج محدد في هذه المهمة. يسمح العقد بإضافته دون تعديل Domain أو Application، وتبقى بيئة الإنتاج مغلقة وغير متاحة ما لم يُحقن مزوّد إنتاج صريح. لا يوجد رجوع صامت إلى محول التطوير.

### التهيئة ومحول التطوير/الاختبار

تستخدم HMAC متغيرات الاستعادة الحالية المذكورة أعلاه. يحدد `QSC_RECOVERY_DELIVERY_MODE` الوضع، وتحتوي `QSC_RECOVERY_PROVIDER_WORKSPACES_JSON` مراجع الحساب والمرسل والقالب العامة فقط، وتحدد `QSC_RECOVERY_PROVIDER_TIMEOUT_MS` المهلة الاختيارية. تُرفض أي حقول إضافية لمنع وضع الأسرار في تهيئة مساحة العمل العادية. يجب أن يحصل مزوّد الإنتاج المستقبلي على سره من حد أسرار النشر، وتملك المهمة 3.20 التقوية التشغيلية وإدارة الأسرار.

لا يرسل محول التطوير رسالة حقيقية، ولا يعرض رقم الوجهة أو الرمز ضمن بياناته الآمنة، ويوفر الرمز فقط لدالة اختبار داخل العملية. يُمنع تشغيله في Production ولا يوجد مسار HTTP لكشف الرموز. يفشل النظام بإغلاق آمن عند غياب الوضع الصريح أو مزوّد الإنتاج.

### الفشل والإبطال والتنظيف والحدود

لا تصل تفاصيل المزوّد أو الأهلية إلى العميل غير المصادق. تبقى نتيجة الطلب عامة، ولا تعرض عمليات المرجع سوى حالة تدفق آمنة. يستمر تغيير واتساب في إبطال التحديات، ويؤدي تغيير السياسة إلى `OwnerManagedOnly` الآن إلى إبطال تحديات مساحة العمل المفتوحة، كما يعاد فحص السياسة في التحقق والإكمال. يبقى تعليق الحساب حاكمًا طوال التدفق.

تحذف حالة التنظيف المركزة دفعات محدودة من التحديات المفتوحة المنتهية والحالات النهائية القديمة، وهي متكررة بأمان وغير مجدولة. تملك المهمة 3.20 الجدولة والحماية الأوسع على مستوى IP والحافة والمراقبة التشغيلية. لا تضيف المهمة بصمة متصفح أو منصة عامة لتحديد المعدل.

### طبقة العرض

ينفذ `/recover-password` الطلب العام الحقيقي. تنفذ `/recover-password/verify` التحقق من OTP أولًا ثم تعرض خطوة كلمة المرور الجديدة، وتدعم اللصق ولوحة الأرقام والعد التنازلي الإرشادي وإعادة الإرسال بمرجع جديد. بعد النجاح تعود الواجهة إلى `/login` دون إنشاء جلسة أو تسجيل دخول تلقائي.

### تقوية المراجعة R1

أصبح المرجع العام رمز تدفق مشفرًا وموثقًا بواسطة AES-GCM، ويحمل داخليًا حالة حقيقية أو وهمية متساوية الشكل دون كشف معرف مساحة العمل أو الممثل أو الحساب أو التحدي. تتطابق نتائج الطلب وإعادة الإرسال والتحقق وإعادة الضبط للحساب المؤهل والحالات غير المؤهلة، ويطبق الرمز الحقيقي والوهمي مهلة إعادة الإرسال نفسها ويستبدلان بمرجع محمي جديد بعد ستين ثانية.

تطبق سياسة توقيت محقونة وقابلة للاختبار حدًا أدنى موحدًا لزمن الطلب وإعادة الإرسال يتجاوز مهلة المزود، وحدًا أصغر لفحوص التحقق وإعادة الضبط. تستخدم السياسة مؤقتًا غير متزامن ولا تستخدم الانتظار المشغول، ولا يستدعى أي مزود للحساب الوهمي.

تجري إعادة ضبط كلمة المرور فحص أهلية رخيصًا للسياسة وحالة `Verified` والانتهاء والتعليق وإصدار جهة الاتصال قبل Argon2. لا يحدث التجزئة إلا بعد نجاح الفحص وخارج المعاملة، ثم تعيد المعاملة النهائية المقفلة التحقق من جميع الشروط لمقاومة السباقات قبل استبدال الاعتماد وإلغاء الجلسات واستهلاك التحدي.

يحصل كل تحد على مفتاح idempotency ثابت ومخصص للتوصيل لا يحتوي OTP، ويمر المفتاح صراحة إلى حد مزود واتساب. يؤدي الرفض النهائي أو غياب التهيئة أو الفشل الدائم إلى إبطال التحدي، بينما تبقى حالات انقطاع المزود والفشل المؤقت وانتهاء المهلة غير يقينية ولا تعامل كرفض نهائي. يعتمد حد الستين ثانية على أحدث محاولة محفوظة مهما كانت حالتها، ويبقى حد ثلاث محاولات في الساعة نافذًا.

لم تضف الهجرة `0011`: حالة التدفق الوهمي محمية وعديمة الحالة، ومفتاح idempotency مشتق حتميًا من محاولة التحدي الحالية، وجدول التحديات الحالي يحتوي بالفعل وقت المحاولة والتاريخ اللازمين لحدود الإرسال.
