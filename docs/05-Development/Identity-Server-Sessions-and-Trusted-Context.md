# Identity Server Sessions and Trusted Context | جلسات الهوية على الخادم والسياق الموثوق

**Status:** Implemented foundation · **Task:** 3.15.1-B · **Last Updated:** 2026-08-09

## English

### Architecture and ownership

Identity owns the server-session aggregate, login coordination, credential rotation, revocation, cleanup, and request authentication. Application use cases coordinate every transaction through the existing Identity Unit of Work. Infrastructure owns cryptographic generation/HMAC, PostgreSQL, cookies, and Next.js-compatible adapters. Route Handlers only parse HTTP input and map typed results.

The shared `TrustedActorContext` contract is the only authenticated identity shape exposed to downstream application code. Catalog owns the adapter from that contract to `ProductEntryExecutionContext`; Catalog does not import Identity Infrastructure. App-layer composition connects the adapters. Browser body, query, route, or header claims never provide Workspace, Actor, role, permission, or branch authority.

### Opaque server sessions

The browser receives one random 32-byte base64url value only through the authenticated-session cookie. PostgreSQL stores only a versioned HMAC-SHA-256 digest. The session HMAC purpose is independent from recovery-code HMAC. `QSC_SESSION_HMAC_ACTIVE_VERSION` selects the active key version and `QSC_SESSION_HMAC_KEYS_JSON` supplies the server-only canonical-base64 key map; every key must contain at least 32 bytes. Raw values and digests are excluded from Audit and HTTP response bodies.

Migration `0008_supreme_vector` adds `identity_sessions` and `identity_memberships.authorization_version`. The migration backfills existing memberships with version 1, then removes the temporary database default. Sessions use Workspace-scoped primary and foreign keys, a globally unique digest, lookup/revocation/expiry indexes, lifecycle checks, and no plaintext-value column. Historical migrations `0000` through `0007` remain unchanged.

### Cookie and HTTP policy

The central cookie adapter uses `HttpOnly`, `SameSite=Lax`, and `Path=/`. Production also uses `Secure` and defaults to the `__Host-qsc_session` name; non-production defaults to `qsc_session`. `QSC_SESSION_COOKIE_NAME` may configure the name without introducing cookie knowledge into Domain or Application. The server never places the value in URLs, Web Storage, IndexedDB, or a client-side authority model.

The implemented backend routes are:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/auth/me`

The three write routes use a centralized Origin/Host policy. `QSC_PUBLIC_ORIGIN` may pin the public origin; otherwise the request URL origin is used. Login responses are enumeration-safe. Logout always clears the cookie and is idempotent. `/api/auth/me` returns only safe presentation fields and never returns credential/session versions, hashes, HMAC material, or the opaque value.

### Lifetime, validation, and concurrency

Every session has a two-hour idle timeout and a twelve-hour absolute timeout. Activity extends the idle deadline only after the central five-minute `lastSeenAt` threshold and never beyond the absolute deadline. Normal request validation does not write Audit. Cleanup is an explicit, bounded, idempotent use case for expired rows and revoked rows older than the seven-day retention threshold; no scheduler is introduced by Task B.

Validation resolves digest to session and then re-reads the scoped account, credential, membership, profile, and Workspace. It rejects revoked, idle-expired, absolute-expired, suspended, missing, class-incompatible, stale-password-version, and stale-authorization-version state. PostgreSQL row locks serialize login-protection updates, session validation/revocation, credential rotation, and concurrent stale-version reads. Suspension remains authoritative even before explicit revocation is observed.

### Restricted first login and rotation

`Temporary` credentials create a `Restricted` session for both `PendingActivation` and `Active` accounts. That session may call only password change, logout, and the minimal current-session endpoint. It cannot produce a full trusted Catalog context. `Active + Permanent` creates a `Full` session.

Successful password change validates the current session/password, validates and hashes the new password, increments `passwordVersion`, makes the credential `Permanent`, activates `PendingActivation`, clears login protection, revokes all prior sessions, creates a different full-session value, rotates the cookie, and writes safe Audit records in one transaction. The restricted value is never promoted in place.

Owner/emergency reset, recovery completion, and suspension now revoke applicable server sessions inside their existing Identity transactions. The focused `SessionRevocationPort` also supports actor-wide, specific-session, and all-except-current revocation for later application coordination.

### Trusted actor and authorization version

Each membership starts at `authorizationVersion = 1`; sessions capture that value. Any later mismatch fails before a context reaches Catalog. Task C owns role/permission/branch mutation and will increment the version. Task B does not add permission-editing or selected-Branch-ID persistence.

The current forward-compatible context exposes Owner/Staff and `AllBranches | SelectedBranches`. Because Task C storage is absent, Identity emits no explicit permissions and an empty selected-Branch-ID set. The Catalog-owned adapter applies the existing Owner Product Entry policy and gives Staff no Product Entry permissions. This is a conservative Task B bridge, not Task C member authorization.

### Security invariants and handoff

- Production Product Entry APIs resolve a full server session and fail closed when configuration or infrastructure is unavailable.
- Missing/expired/revoked/stale sessions receive authentication rejection; restricted sessions receive a forbidden result.
- Client-supplied Workspace/Actor claims are ignored, and all persistence joins remain Workspace-scoped.
- Audit records stable event/result codes and safe counts only; it never stores passwords, cookie values, session values/digests, password hashes, OTPs, or HMAC keys.
- Task C owns member, permission, selected-branch, and authorization-version mutation.
- Task D owns final login/password/member UI.
- Task E owns WhatsApp delivery and provider/external security limits.

## العربية

### المعمارية والملكية

يمتلك مجال الهوية نموذج جلسة الخادم وتنسيق تسجيل الدخول وتدوير بيانات الاعتماد والإبطال والتنظيف ومصادقة الطلب. تنسق حالات استخدام التطبيق جميع المعاملات عبر وحدة عمل الهوية الحالية، بينما تملك البنية التحتية التوليد والتجزئة المشفرة وPostgreSQL وملف الارتباط ومحولات Next.js. تظل معالجات المسارات رقيقة ولا تنفذ قواعد المصادقة.

عقد `TrustedActorContext` المشترك هو شكل الهوية الموثوق الوحيد المتاح للتطبيقات اللاحقة. يمتلك الكتالوج محول هذا العقد إلى `ProductEntryExecutionContext` ولا يستورد البنية التحتية للهوية. يتم الربط في طبقة التطبيق. لا تصبح قيم مساحة العمل أو الممثل أو الدور أو الصلاحيات أو نطاق الفروع القادمة من المتصفح مصدر سلطة.

### الجلسة المبهمة والتخزين

يستلم المتصفح قيمة عشوائية آمنة بطول 32 بايت بصيغة base64url عبر ملف ارتباط الجلسة فقط. تخزن PostgreSQL تجزئة HMAC-SHA-256 ذات إصدار ولا تخزن القيمة الخام. مفاتيح جلسات HMAC مستقلة عن مفاتيح استعادة الحساب، ويحدد `QSC_SESSION_HMAC_ACTIVE_VERSION` الإصدار النشط وتوفر `QSC_SESSION_HMAC_KEYS_JSON` خريطة المفاتيح السرية على الخادم فقط.

يضيف الترحيل `0008_supreme_vector` جدول `identity_sessions` وحقل `authorization_version` للعضوية. يعيد ملء العضويات الحالية بالقيمة 1 ثم يحذف القيمة الافتراضية المؤقتة. تستخدم الجلسات مفاتيح أساسية وخارجية مقيدة بمساحة العمل، وتفردا عالميا للتجزئة، وفهارس للبحث والإبطال والتنظيف، ولا يوجد عمود للقيمة الخام. بقيت الترحيلات من `0000` إلى `0007` دون تعديل.

### سياسة ملف الارتباط وHTTP

يستخدم المحول المركزي `HttpOnly` و`SameSite=Lax` و`Path=/`. يضيف الإنتاج `Secure` ويستخدم افتراضيا الاسم `__Host-qsc_session`، بينما تستخدم بيئات التطوير والاختبار `qsc_session`. لا توضع قيمة الجلسة في عنوان URL أو Web Storage أو IndexedDB أو حالة React.

المسارات الخلفية هي تسجيل الدخول والخروج وتغيير كلمة المرور و`/api/auth/me`. تتحقق مسارات الكتابة من Origin وHost عبر سياسة مركزية. لا تكشف نتيجة تسجيل الدخول وجود مساحة العمل أو اسم المستخدم أو سبب التعليق. الخروج متكرر بأمان ويمسح ملف الارتباط دائما. يعيد مسار `me` بيانات عرض منقحة فقط ولا يعيد الإصدارات أو التجزئات أو أسرار HMAC أو قيمة الجلسة.

### الصلاحية والتحقق والتزامن

مهلة الخمول ساعتان والحد المطلق اثنتا عشرة ساعة. لا يكتب `lastSeenAt` إلا بعد مرور خمس دقائق تقريبا، ولا يتجاوز تمديد الخمول الحد المطلق. التنظيف حالة استخدام صريحة ومحدودة ومتكررة بأمان للجلسات المنتهية والجلسات الملغاة بعد احتفاظ سبعة أيام، ولا تضيف المهمة مجدولا إنتاجيا.

يعيد التحقق قراءة الحساب وبيانات الاعتماد والعضوية والملف ومساحة العمل ضمن النطاق نفسه. يرفض الجلسات الملغاة أو المنتهية أو التابعة لحساب معلق أو ذات إصدار كلمة مرور أو تفويض قديم. تسلسل أقفال الصفوف تحديث حماية الدخول والإبطال وتدوير كلمة المرور والقراءات المتزامنة. يبقى تعليق الحساب حاكما حتى قبل ملاحظة الإبطال الصريح.

### الجلسة المقيدة والتدوير

تنشئ كلمة المرور `Temporary` جلسة `Restricted` سواء كان الحساب `PendingActivation` أو `Active`. تسمح هذه الجلسة بتغيير كلمة المرور والخروج وقراءة الحد الأدنى من الهوية فقط، ولا تنشئ سياق كتالوج موثوقا. تنشئ الحالة `Active + Permanent` جلسة `Full`.

عند نجاح تغيير كلمة المرور، يتحقق التطبيق من الجلسة والكلمة الحالية والجديدة، ويزيد `passwordVersion`، ويحول الاعتماد إلى `Permanent`، وينشط الحساب المعلق، ويمسح حماية الدخول، ويلغي الجلسات السابقة، وينشئ قيمة جديدة لجلسة كاملة، ويدور ملف الارتباط، ويسجل تدقيقا آمنا ضمن معاملة واحدة. لا تتم ترقية القيمة المقيدة نفسها.

أصبحت إعادة ضبط المالك والاستعادة المكتملة وتعليق الحساب تلغي الجلسات المناسبة داخل معاملات الهوية الحالية. يدعم منفذ الإبطال أيضا إلغاء جميع جلسات الممثل أو جلسة محددة أو جميع الجلسات عدا الحالية.

### السياق الموثوق وإصدار التفويض

تبدأ كل عضوية بقيمة `authorizationVersion = 1` وتلتقط الجلسة هذه القيمة. يمنع أي اختلاف لاحق إنشاء السياق قبل وصوله إلى الكتالوج. تمتلك المهمة C تعديل الأدوار والصلاحيات والفروع وزيادة الإصدار. لا تضيف المهمة B إدارة الصلاحيات أو تخزين معرفات الفروع المختارة.

يعرض الحد الحالي الدورين Owner وStaff والنطاقين `AllBranches | SelectedBranches`. لعدم وجود تخزين المهمة C، لا تصدر الهوية صلاحيات صريحة وتصدر قائمة فروع مختارة فارغة. يطبق محول الكتالوج سياسة المالك الحالية لإدخال المنتج ولا يمنح Staff صلاحيات إدخال المنتج. هذا جسر محافظ للمهمة B وليس بديلا عن تفويض المهمة C.

### ثوابت الأمان والتسليم

- تحل واجهات إدخال المنتج في الإنتاج جلسة خادم كاملة وتفشل بإغلاق آمن عند غياب الإعداد أو البنية التحتية.
- ترفض الجلسات المفقودة أو المنتهية أو الملغاة أو القديمة كمصادقة غير صالحة، وترفض الجلسة المقيدة بصلاحية ممنوعة.
- يتم تجاهل ادعاءات مساحة العمل والممثل القادمة من العميل، وتظل جميع الروابط مقيدة بمساحة العمل.
- لا يخزن التدقيق كلمات المرور أو ملفات الارتباط أو قيم الجلسات أو تجزئاتها أو OTP أو مفاتيح HMAC.
- تمتلك المهمة C إدارة الأعضاء والصلاحيات والفروع وتغيير إصدار التفويض، وتمتلك D الواجهات النهائية، وتمتلك E تسليم واتساب والحدود الخارجية.
