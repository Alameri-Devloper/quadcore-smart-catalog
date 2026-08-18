# Identity Authentication and Member Presentation | واجهة المصادقة وإدارة الأعضاء

**Status:** Implemented; Task E recovery integration pending independent review | **Task:** 3.15.1-D / D-R1 / D-R2 / E | **Last Updated:** 2026-08-17

## English

### Architecture and Presentation boundary

Task D adds a focused Identity Presentation layer under `domains/identity/presentation`. Route pages compose feature components; a typed same-origin HTTP client talks only to `/api/auth/*` and `/api/workspace/*`; centralized mapping converts HTTP status and safe response codes into view states. React does not import Identity repositories or Infrastructure, read the session cookie, store a session value, or recreate authorization rules. The backend session and member routes remain authoritative.

The only narrow backend read added for the UI is `GET /api/workspace/branch-references`. It requires a validated Full Owner session and returns only active, trusted-Workspace Branch reference IDs. The Workspace-owned registry still is not a Branch aggregate and does not add Branch CRUD, names, Inventory, or pricing behavior.

### Authentication state and route protection

`GET /api/auth/me` produces `Loading`, `Unauthenticated`, `Restricted`, `Authenticated`, or `Unavailable` Presentation state. Unauthenticated access to Catalog, Product Entry, or member pages redirects to `/login` with a validated internal return path. Restricted sessions redirect to `/change-password`. `/members*` additionally requires Owner in the UI while the backend retains final enforcement. Loading blocks protected content to avoid authorization flicker.

When an authenticated client call returns 401, the UI navigates to Login with a safe internal return path. Absolute, protocol-relative, backslash-based, credential-bearing, and non-application URLs are rejected. Failed POST/PATCH actions are never replayed after login; the user must review and submit again.

Sign out navigates to Login only after the idempotent server endpoint confirms revocation or a safely invalid session. Network, 503, and unexpected failures remain on the controlled page, retain the HttpOnly cookie for a retry, and warn that the session may still be active. An in-flight guard disables repeat submission. A 401 from password change follows the same session-expiry redirect and never replays the password mutation.

### Login and password change

Login accepts Company Code, Username, and Password and always displays a generic public authentication failure. Remember Company Code is opt-in. Only the code is stored under `qsc.remembered-workspace-code`; username, password, Actor/Workspace identifiers, permissions, Branch IDs, cookies, and session values are never written to Web Storage.

Restricted and active users share `/change-password`. Password inputs preserve the exact value: no trimming or Unicode normalization. UX validation mirrors stable metadata only: 12–128 Unicode code points and not all whitespace. The backend remains authoritative. Successful rotation clears fields, refreshes navigation state, and never handles the new opaque session value.

### Recovery UI and Task E boundary

`/recover-password` and `/recover-password/verify` implement the enumeration-safe form, generic public message, 8-Western-digit entry, full-code paste, numeric keyboard metadata, accessible labels, new-password confirmation, and 60-second resend countdown. OTP, password, and recovery identity values remain component memory only.

Tasks A–C exposed no public recovery delivery or verification HTTP route. Task D therefore originally reported `RecoveryUnavailable` and directed the user to an Owner without claiming a message was sent or a reset succeeded. It did not create a fake provider or production success.

Task E now supplies that boundary. The request page calls the enumeration-safe public endpoint and retains only the opaque reference in root React memory. The verify page performs OTP verification, resend, and then password reset through distinct typed calls. It never places the reference, OTP, or password in a URL or Web Storage. A reload intentionally requires a new request. Production remains honestly unavailable until an approved provider is configured.

### Member management

`/members` provides Owner-only loading, empty, forbidden, unavailable, search, role filter, and status filter states. Phones and tablets receive touch-friendly cards; desktop and wide layouts receive a structured table without forcing horizontal page scrolling on small screens.

`/members/new` uses five steps: Member Information, Access, Branches, Temporary Password, and Review. Staff permissions come from the backend registry and optional fixed template; checkbox changes stay local until final submission. Owner always receives full authority and `AllBranches`. Staff selected scope requires at least one active reference. The client can generate a 20-character temporary value with Web Crypto, keeps it only in memory, and shows the locally known value once after success.

`/members/[actorId]` separates Account, Profile, WhatsApp, Permissions, Branch Scope, and Security/Lifecycle. Profile and WhatsApp use separate mutations. Permission and Branch changes require a review step and explicit save. Promotion, demotion, suspension, reactivation, and temporary-password reset use dedicated confirmation surfaces. Demotion requires explicit Staff permissions and scope; reactivation/reset require a new temporary password. Conflict and `LastActiveOwnerProtected` results are translated without client-side merging or replacement of backend protection.

The member list and member details use separate explicit HTTP DTO mappings. The list omits permissions and all optimistic/version metadata. Details adds only `authorizationRevision`, `profileRevision`, and `recoveryContactRevision` for editing. React echoes the observed token unchanged and never increments it. Permission, Branch-scope, promotion, demotion, profile, and WhatsApp mutations compare the token against the locked persisted entity; a mismatch returns 409 without mutation, automatic retry, merge, or draft replacement. The conflict surface keeps the local draft visible until the Owner explicitly chooses Refresh / Review Current Data. The session-issuance timestamp is intentionally omitted because it is not a dedicated login-history fact.

Workspace communication settings are an Owner-only disclosure on the member page. Default WhatsApp and recovery policy are edited together through the existing focused API, using an observed `settingsRevision` to prevent stale overwrite. On confirmed PATCH success, the server returns the committed safe settings DTO with its new `settingsRevision`, and Presentation replaces its settings state from that response before another save is allowed. React never calculates the revision. Network, 503, and other unconfirmed outcomes retain the last confirmed state and revision; a genuine 409 retains the local draft and requires explicit review. No provider credentials appear in this UI.

### Internationalization, responsive design, and accessibility

System text, validation, roles, statuses, branch scopes, permission names, lifecycle actions, and recovery states support Arabic and English. Arabic applies document `dir="rtl"`; English applies `dir="ltr"`. Workspace-entered display names are rendered unchanged. OTP, phone, date, Branch IDs, usernames, and other technical values use Western digits and stable LTR isolation where required.

Layouts are mobile-first with deliberate 600 px, 900 px, and 1100 px adaptations, readable maximum widths, 44–48 px primary controls, cards on small screens, adaptive grids on tablet, and tables/multi-column detail layouts on larger screens. Semantic labels, field descriptions, `aria-live` status, visible focus, skip navigation, password reveal labels, native disclosure keyboard behavior, reduced-motion support, and non-color status labels are provided.

### Sensitive client state

Passwords, temporary passwords, and OTPs live only in local component state and are never logged, placed in URLs, or written to Local Storage, Session Storage, or IndexedDB. Presentation revision tokens are read-only concurrency metadata: they are echoed unchanged to the matching mutation, never calculated, incremented, or treated as authority. Presentation errors never include backend security diagnostics.

## العربية

### المعمارية وحدود طبقة العرض

تضيف المهمة D طبقة عرض مركزة للهوية داخل `domains/identity/presentation`. تركّب صفحات المسارات المكونات، ويتصل عميل HTTP منضبط ومكتوب الأنواع فقط بمسارات `/api/auth/*` و`/api/workspace/*`، وتحول خريطة مركزية حالات HTTP والرموز الآمنة إلى حالات عرض. لا تستورد React مستودعات الهوية أو بنيتها التحتية، ولا تقرأ ملف ارتباط الجلسة، ولا تخزن قيمة الجلسة، ولا تعيد تنفيذ قواعد التفويض. تبقى مسارات الخادم المرجع النهائي.

القراءة الخلفية الضيقة الوحيدة المضافة هي `GET /api/workspace/branch-references`. تتطلب جلسة كاملة وموثوقة لمالك، وتعيد معرفات مراجع الفروع النشطة داخل مساحة العمل الموثوقة فقط. لا يتحول سجل المراجع إلى تجميع Branch، ولا يضيف CRUD للفروع أو أسماء أو مخزونًا أو تسعيرًا.

### حالة المصادقة وحماية المسارات

ينتج `GET /api/auth/me` حالات `Loading` و`Unauthenticated` و`Restricted` و`Authenticated` و`Unavailable`. ينتقل المستخدم غير المصادق من الكتالوج وإدخال المنتج وصفحات الأعضاء إلى `/login` مع مسار عودة داخلي متحقق منه. تنتقل الجلسة المقيدة إلى `/change-password`. تتطلب مسارات `/members*` مالكًا في الواجهة مع بقاء الخادم جهة الإنفاذ النهائية. تمنع حالة التحميل ظهور محتوى غير مصرح به لحظيًا.

عند انتهاء الجلسة لا تعيد الواجهة إرسال أي POST أو PATCH تلقائيًا. تحفظ فقط مسار عودة داخليًا آمنًا، وترفض الروابط المطلقة والخارجية والبروتوكولية والمسارات ذات الشرطة العكسية، ثم تطلب من المستخدم مراجعة الإجراء وإرساله بنفسه.

لا تنتقل عملية تسجيل الخروج إلى صفحة الدخول إلا بعد أن يؤكد الخادم الإلغاء المتكرر الآمن أو أن الجلسة غير صالحة بصورة مؤكدة. عند فشل الشبكة أو 503 أو خطأ غير متوقع تبقى الواجهة في الصفحة المضبوطة، وتحافظ على ملف الارتباط المحمي لإعادة المحاولة، وتحذر من احتمال بقاء الجلسة نشطة. يمنع حارس الطلب تكرار النقر أثناء التنفيذ. كما تعالج 401 من تغيير كلمة المرور كإنهاء جلسة دون إعادة تشغيل العملية.

### تسجيل الدخول وكلمة المرور

يستخدم تسجيل الدخول رمز الشركة واسم المستخدم وكلمة المرور، ويعرض إخفاقًا عامًا لا يكشف وجود مساحة العمل أو الحساب أو سبب الرفض. خيار تذكر رمز الشركة اختياري، ويخزن الرمز وحده. لا تُخزن أسماء المستخدمين أو كلمات المرور أو معرفات الممثل ومساحة العمل أو الصلاحيات أو الفروع أو الجلسات.

تخدم `/change-password` الجلسات المقيدة والمستخدم النشط. تبقى قيمة كلمة المرور كما أدخلت بلا قص أو تطبيع Unicode. يتحقق العرض لتحسين التجربة فقط من طول 12–128 نقطة Unicode ومن عدم كون القيمة مسافات فقط. عند النجاح يمسح الحقول وينتقل بعد تدوير الجلسة على الخادم دون لمس قيمتها المعتمة.

### الاستعادة وحدود المهمة E

تنفذ مسارات الاستعادة نموذج الطلب الآمن ضد تعداد الحسابات، ورسالة عامة، وحقل OTP من ثمانية أرقام غربية، واللصق الكامل، ولوحة أرقام، وتأكيد كلمة المرور، وعدّاد 60 ثانية. تبقى القيم الحساسة في ذاكرة المكون فقط.

لم توفر المهام A–C مسار HTTP عامًا للتوصيل أو التحقق، ولذلك عرضت المهمة D أصلًا حالة `RecoveryUnavailable` بصدق ووجهت المستخدم إلى المالك دون ادعاء إرسال رسالة أو نجاح إعادة الضبط أو إنشاء مزود وهمي.

توفر المهمة E الآن هذا الحد. تستدعي صفحة الطلب المسار العام الآمن ضد التعداد، وتحفظ المرجع المعتم فقط في ذاكرة React. تنفذ صفحة التحقق عمليات OTP وإعادة الإرسال ثم إعادة ضبط كلمة المرور عبر استدعاءات منفصلة. لا يوضع المرجع أو OTP أو كلمة المرور في الرابط أو Web Storage، ويتطلب تحديث الصفحة طلبًا جديدًا. تبقى Production غير متاحة بصدق حتى تهيئة مزوّد معتمد.

### إدارة الأعضاء

تعرض `/members` حالات التحميل والفراغ والمنع وعدم التوفر والبحث ومرشحات الدور والحالة. تستخدم الهواتف والأجهزة اللوحية بطاقات مريحة للمس، وتستخدم الشاشات الكبيرة جدولًا منظمًا دون فرض تمرير أفقي على الهاتف.

تستخدم `/members/new` خمس خطوات: معلومات العضو، الوصول، الفروع، كلمة المرور المؤقتة، والمراجعة. تأتي تعريفات الصلاحيات والقالب من الخادم، وتبقى التعديلات محلية حتى الإرسال. يحصل المالك دائمًا على كل الصلاحيات وكل الفروع. يتطلب نطاق الموظف المحدد فرعًا نشطًا واحدًا على الأقل. يستخدم المولد Web Crypto، ويحفظ القيمة في الذاكرة فقط، ويعرض القيمة المعروفة محليًا مرة واحدة بعد النجاح.

تفصل `/members/[actorId]` الحساب والملف وواتساب والصلاحيات والفروع ودورة الحياة. لكل من الملف وواتساب عملية مستقلة. تتطلب الصلاحيات والفروع مراجعة وحفظًا صريحًا. تستخدم الترقية والتخفيض والتعليق وإعادة التفعيل وإصدار كلمة مؤقتة أسطح تأكيد منفصلة. يتطلب التخفيض صلاحيات ونطاق موظف صريحين، وتتطلب إعادة التفعيل وإعادة الضبط كلمة مؤقتة جديدة. تُترجم التعارضات وحماية آخر مالك دون دمج تلقائي أو استبدال حماية الخادم.

تستخدم قائمة الأعضاء وتفاصيل العضو خرائط HTTP صريحة ومنفصلة. لا تعرض القائمة الصلاحيات أو بيانات الإصدارات الداخلية، بينما تضيف التفاصيل رموز التزامن الدنيا `authorizationRevision` و`profileRevision` و`recoveryContactRevision`. تعيد React الرمز الذي قرأته دون تغييره أو رفعه. تقارن عمليات الصلاحيات والفروع والترقية والتخفيض والملف وواتساب الرمز بالكيان المقفل في التخزين؛ ويعيد الاختلاف 409 بلا كتابة أو دمج أو إعادة محاولة أو استبدال للمسودة. تبقى المسودة المحلية ظاهرة حتى يختار المالك صراحة تحديث البيانات الحالية ومراجعتها. حُذف وقت إصدار آخر جلسة من العرض لأنه ليس سجل دخول مخصصًا.

تظهر إعدادات الاتصال والاستعادة للمالك فقط، وتستخدم `settingsRevision` المقروء لمنع الكتابة فوق تعديل أحدث. بعد نجاح PATCH المؤكد يعيد الخادم DTO الآمن المحفوظ مع `settingsRevision` الجديد، وتستبدل طبقة العرض حالة الإعدادات من هذه الاستجابة قبل السماح بحفظ آخر. لا تحسب React رمز المراجعة. يحتفظ فشل الشبكة أو 503 أو أي نتيجة غير مؤكدة بآخر حالة ورمز مراجعة مؤكدين، بينما يحفظ تعارض 409 الحقيقي المسودة المحلية ويتطلب مراجعة صريحة. لا تتضمن الواجهة بيانات اعتماد مزود واتساب.

### اللغة والاستجابة وإمكانية الوصول

تدعم النصوص والأخطاء والأدوار والحالات والنطاقات والصلاحيات والإجراءات العربية والإنجليزية. تستخدم العربية RTL والإنجليزية LTR، وتظهر أسماء مساحة العمل كما خزنها المستخدم. تستخدم OTP والهواتف والتواريخ ومعرفات الفروع والأسماء التقنية أرقامًا غربية وعزل LTR عند الحاجة.

يبدأ التخطيط من الهاتف، ويتكيف عمدًا عند 600 و900 و1100 بكسل، مع عروض قراءة معقولة وأهداف لمس 44–48 بكسل وبطاقات للهاتف وشبكات للجهاز اللوحي وجداول وتخطيطات متعددة الأعمدة للشاشات الكبيرة. تتوفر التسميات الدلالية، ورسائل `aria-live`، والتركيز المرئي، وتجاوز الرأس، وأزرار إظهار كلمة المرور، وعناصر إفصاح أصلية للوحة المفاتيح، وتقليل الحركة، ودلالات لا تعتمد على اللون وحده.

### الحالة الحساسة في المتصفح

تبقى كلمات المرور والكلمات المؤقتة وOTP في حالة المكون القصيرة فقط. لا تُسجل ولا توضع في الرابط ولا تُكتب في Local Storage أو Session Storage أو IndexedDB. رموز مراجعة التزامن بيانات قراءة فقط تعيدها الواجهة كما قرأتها للعملية المطابقة، ولا تحسبها أو ترفعها أو تستخدمها كسلطة.
