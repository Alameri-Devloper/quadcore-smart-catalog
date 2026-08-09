# Identity Accounts, Recovery, and Bootstrap | حسابات الهوية والاستعادة والتهيئة

**Status:** Implemented foundation · **Task:** 3.15.1-A · **Last Updated:** 2026-08-09

## English

### Architecture and boundaries

Task 3.15.1-A establishes the first Identity bounded-context foundation with Domain, Application, and Infrastructure layers. Application use cases own transaction orchestration. Focused repository ports own persistence contracts; repositories never call other repositories. PostgreSQL adapters use Drizzle ORM only inside Infrastructure.

Authentication Account, Password Credential, Member Profile, Workspace Membership, Login Protection, Recovery Challenge, and Session remain separate concepts. Workspace owns `workspaceId`, `workspaceCode`, display name, recovery policy, and communication settings. Identity consumes Workspace ports without duplicating its aggregate. Catalog source and persistence boundaries are unchanged. Session is not implemented.

Membership branch scope uses the approved `AllBranches | SelectedBranches` vocabulary. Every Owner is constrained to `AllBranches`. Task A represents scoped Staff membership with `SelectedBranches` only; selected Branch ID persistence and management remain deferred to Task C.

### Login identity and username

Login lookup is always `workspaceCode + normalizedUsername`. `workspaceCode` is readable, stable, lowercase canonical, 3–32 characters, uses lowercase ASCII letters/digits/hyphen, forbids repeated hyphens, and is globally unique. It is not a primary key.

Username accepts 3–64 ASCII letters, digits, `.`, `_`, and `-`. Original valid form is retained; lowercase form is used for Workspace-scoped uniqueness and lookup. No repository resolves by username without Workspace scope. No mutation contract exists after creation, and suspension never deletes or releases it.

### Account and password lifecycles

Account status is `PendingActivation`, `Active`, or `Suspended`. Password lifecycle is independently `Temporary` or `Permanent`.

- Bootstrap/new account: `PendingActivation + Temporary`.
- First trusted activation: `Active + Permanent`, with password version increment.
- Owner/emergency reset: account status is preserved and password becomes `Temporary`.
- Recovery completion: account status is preserved and password becomes `Permanent`.
- Suspension invalidates open recovery challenges; reactivation clears login protection.

There is no hard-delete path. Password version starts at 1 and increments atomically for every replacement. Task A defines `SessionRevocationPort` only as the future integration seam. Reset and recovery use cases do not invoke session revocation; actual revocation is intentionally deferred until Task B provides server-side session persistence. Task A creates no session table or fake adapter.

### Password security and Argon2id

Passwords contain 12–128 Unicode code points. Spaces are allowed. Values are never trimmed, lowercased, or Unicode-normalized; all-whitespace values are rejected. Presentation confirmation is not persisted.

The `PasswordHasher` port hides the maintained `argon2` adapter. Central parameters are Argon2id v19, 64 MiB memory, time cost 3, parallelism 1, and 32-byte output. It emits self-describing PHC strings and exposes `needsRehash`. Plaintext and hashes never enter Application read models or Audit.

### Login protection

Login protection is persisted separately. Five failures inside 15 minutes create a five-minute lock. Repeated lockouts double through 10, 20, and 40 minutes and cap at 60 minutes. Row locking prevents lost counters. Successful authentication can clear state; password reset and reactivation also clear it. Lock expiry never changes a suspended account.

### Recovery challenges and HMAC storage

Identity uses the provider-neutral channel `PrimaryRecoveryContact`. It does not encode WhatsApp delivery in the challenge model. Task E will map the trusted delivery result to a WhatsApp provider adapter.

Each code is exactly eight numeric digits, valid for ten minutes, limited to five verification attempts, subject to a 60-second resend interval and three sends per hour, and single-use. Only one `Active` or `Verified` challenge may exist per account. A replacement invalidates the previous open challenge. Other states are `Consumed`, `Invalidated`, and `Expired`.

Recovery completion locks and consumes the verified challenge, replaces the credential as Permanent, increments version, clears login protection, invalidates other open challenges, and writes Audit in one transaction. It does not create a session.

Codes are stored only as HMAC-SHA-256 digests. The adapter receives versioned server secrets of at least 32 bytes. `QSC_RECOVERY_HMAC_ACTIVE_VERSION` selects the active version and `QSC_RECOVERY_HMAC_KEYS_JSON` supplies a server-only JSON map of version to canonical base64 secret. Configuration errors are sanitized; values are never logged or documented. Raw SHA-256 is forbidden and unused.

### Bootstrap and emergency reset

Bootstrap is local CLI only:

```powershell
npm.cmd run workspace:bootstrap -- --company-id company-a --workspace-code store-01 --workspace-name "Store One" --owner-username owner --owner-name "Initial Owner" --owner-phone +967711234567
```

The temporary password is always requested through a hidden TTY prompt. Password command-line arguments are rejected. One transaction creates Workspace, login code/policy, Owner account, credential, profile, Owner/AllBranches membership, Workspace communication settings, login protection, and security Audit.

Emergency reset is local CLI only:

```powershell
npm.cmd run owner:reset-password -- --workspace-code store-01 --owner-username owner
```

It resolves one Owner through unique Workspace code plus scoped username, requests the replacement through a hidden prompt, issues a Temporary credential, increments version, clears lock state, invalidates open challenges, and audits the event. It never reveals an existing password or creates a universal administrator credential.

### Persistence, concurrency, and Audit

Migration `0007_identity_accounts_recovery_bootstrap` creates `workspaces`, `workspace_communication_settings`, `identity_accounts`, `identity_password_credentials`, `identity_login_protection`, `identity_member_profiles`, `identity_memberships`, `identity_password_recovery_challenges`, and `security_audit_events`.

Composite keys enforce `workspaceId + actorId` and `workspaceId + challengeId`. Unique indexes enforce Workspace code, Workspace-normalized username, and one open challenge. Row locks serialize counters, issue/verify/complete flows, and credential replacement. Optimistic password versions add a stable conflict contract.

Security Audit uses a shared platform contract rather than an Identity-private generic audit system. It stores scoped identifiers, result codes, timestamps, and safe metadata. Infrastructure rejects metadata keys that could carry credentials, hashes, OTPs, digests, secrets, or tokens.

### Security and task boundaries

No public bootstrap, emergency-reset, recovery, or authentication route exists. Normal commands require trusted Workspace/Actor context. Browser input cannot provide business authority. There is no plaintext credential/OTP storage, credential logging, password viewing, default password, login by phone, or session implementation.

- Task B: opaque sessions, cookies, trusted actor resolution, logout, and `/api/auth/me`.
- Task C: final Owner member/profile/role/permission/branch-scope operations.
- Task D: login, password, recovery, and member-management presentation.
- Task E: WhatsApp delivery adapter and provider-facing security limits.

## العربية

### المعمارية والحدود

تنشئ المهمة 3.15.1-A الأساس الأول لمجال الهوية بطبقات المجال والتطبيق والبنية التحتية. يملك التطبيق تنسيق المعاملات، وتحدد منافذ مركزة عقود التخزين، ولا يستدعي أي مستودع مستودعًا آخر. تستخدم محولات PostgreSQL مكتبة Drizzle داخل البنية التحتية فقط.

تبقى حسابات المصادقة وبيانات اعتماد كلمات المرور وملفات الأعضاء والعضويات وحماية الدخول وتحديات الاستعادة والجلسات مفاهيم منفصلة. يمتلك مجال مساحة العمل المعرّف والرمز واسم العرض وسياسة الاستعادة وإعدادات الاتصال، ويستهلك مجال الهوية منافذه دون تكرار التجميع. لم تتغير حدود الكتالوج، ولم تُنفذ الجلسات.

تستخدم العضوية مفردات نطاق الفروع المعتمدة `AllBranches | SelectedBranches`. يُقيد كل مالك بالقيمة `AllBranches`. تمثل المهمة A عضوية الموظف المقيدة بالقيمة `SelectedBranches` فقط، بينما يبقى تخزين معرفات الفروع المختارة وإدارتها مؤجلاً إلى المهمة C.

### هوية الدخول واسم المستخدم

يتم البحث دائمًا بواسطة `workspaceCode + normalizedUsername`. رمز مساحة العمل مقروء وثابت ومطبّع إلى أحرف صغيرة، طوله 3–32، ويستخدم الحروف والأرقام والشرطة، ويمنع الشرطتين المتتاليتين، وهو فريد وغير مساوي للمفتاح الأساسي.

يقبل اسم المستخدم 3–64 من أحرف ASCII والأرقام و`.` و`_` و`-`. تُحفظ الصيغة الأصلية الصحيحة وتستخدم الصيغة الصغيرة للتفرد والبحث داخل مساحة العمل. لا يوجد بحث باسم المستخدم دون مساحة العمل، ولا عقد لتغييره بعد الإنشاء، ولا يحرره التعليق.

### دورات حياة الحساب وكلمة المرور

حالة الحساب هي `PendingActivation` أو `Active` أو `Suspended`، ودورة كلمة المرور مستقلة وهي `Temporary` أو `Permanent`. يبدأ الحساب الجديد معلقًا بكلمة مؤقتة. يحوله التفعيل الموثوق إلى نشط بكلمة دائمة. تحافظ إعادة الضبط على حالة الحساب وتصدر كلمة مؤقتة، بينما تنشئ الاستعادة المكتملة كلمة دائمة. يبطل التعليق التحديات المفتوحة وتمسح إعادة التفعيل حماية الدخول.

لا يوجد حذف نهائي. يبدأ إصدار كلمة المرور من 1 ويزيد ذريًا عند كل استبدال. تعرّف المهمة A المنفذ `SessionRevocationPort` كحد تكامل مستقبلي فقط. لا تستدعي حالات استخدام إعادة التعيين أو الاستعادة إبطال الجلسات؛ فالإبطال الفعلي مؤجل عمداً إلى المهمة B بعد توفر تخزين جلسات الخادم. لا تنشئ المهمة A جدول جلسات أو محولاً وهمياً.

### أمن كلمة المرور وArgon2id

تتكون كلمة المرور من 12–128 نقطة Unicode. تسمح بالمسافات ولا تُقص أو تُحوّل إلى أحرف صغيرة أو تُطبّع، وترفض القيم المكونة كلها من فراغات. يخفي `PasswordHasher` محول Argon2id بإصدار 19 وذاكرة 64 MiB وتكلفة زمنية 3 وتوازٍ 1 ومخرج 32 بايت. تنتج صيغة PHC ذاتية الوصف وتدعم فحص إعادة التجزئة. لا تدخل الكلمات أو التجزئات نماذج القراءة أو التدقيق.

### حماية تسجيل الدخول

تُحفظ الحماية منفصلة. تؤدي خمس محاولات خلال 15 دقيقة إلى قفل مدته خمس دقائق، ثم تتضاعف الأقفال إلى 10 و20 و40 دقيقة بحد أقصى 60 دقيقة. تمنع أقفال الصفوف ضياع العدادات. يمسح النجاح وإعادة ضبط الكلمة وإعادة التفعيل الحالة، ولا يجعل انتهاء القفل الحساب المعلق قابلًا للاستخدام.

### تحديات الاستعادة وتخزين HMAC

يستخدم المجال القناة المحايدة `PrimaryRecoveryContact` ولا يضع واتساب داخل نموذج التحدي. ستحول المهمة E نتيجة التسليم الموثوقة إلى محول مزود واتساب.

يتكون الرمز من ثمانية أرقام، وصلاحيته عشر دقائق، وله خمس محاولات، وفاصل إعادة إرسال 60 ثانية، وثلاث عمليات إرسال في الساعة، ويستخدم مرة واحدة. لا يبقى أكثر من تحدٍ `Active` أو `Verified` للحساب، ويُبطل التحدي الجديد السابق. الحالات الأخرى هي `Consumed` و`Invalidated` و`Expired`.

تستهلك الاستعادة التحدي الموثق وتستبدل بيانات الاعتماد وتزيد الإصدار وتمسح القفل وتبطل أي تحدٍ آخر وتكتب التدقيق في معاملة واحدة، ولا تنشئ جلسة.

لا يُخزن الرمز الخام؛ يُحفظ HMAC-SHA-256 فقط بمفاتيح خادم ذات إصدارات وطول لا يقل عن 32 بايت. يحدد `QSC_RECOVERY_HMAC_ACTIVE_VERSION` الإصدار النشط، وتوفر `QSC_RECOVERY_HMAC_KEYS_JSON` خريطة خادم فقط من الإصدار إلى سر base64 قانوني. لا تُسجل القيم ولا تُوثق، ولا يستخدم SHA-256 خام.

### التهيئة وإعادة ضبط المالك الطارئة

الأمر `npm.cmd run workspace:bootstrap` محلي فقط. تمرر البيانات غير السرية كوسائط، وتدخل كلمة المرور المؤقتة في مطالبة مخفية، وتُرفض وسائط كلمات المرور. تنشئ معاملة واحدة مساحة العمل والرمز والسياسة وحساب المالك وبيانات الاعتماد والملف والعضوية `Owner/AllBranches` وإعدادات الاتصال وحالة الحماية والتدقيق.

الأمر `npm.cmd run owner:reset-password` محلي فقط. يحل مالكًا واحدًا بواسطة رمز مساحة العمل واسم المستخدم المقيد، ويطلب كلمة جديدة مخفية، ويصدر كلمة مؤقتة، ويزيد الإصدار، ويمسح القفل، ويبطل التحديات، ويسجل الحدث. لا يعرض كلمة قديمة ولا ينشئ كلمة مسؤول عامة.

### التخزين والتزامن والتدقيق

ينشئ الترحيل `0007_identity_accounts_recovery_bootstrap` جداول مساحة العمل والحسابات وبيانات الاعتماد والحماية والملفات والعضويات والتحديات والتدقيق الأمني. تفرض المفاتيح المركبة نطاق مساحة العمل، وتفرض الفهارس تفرد الرمز واسم المستخدم المطبّع وتحديًا مفتوحًا واحدًا. تسلسل أقفال الصفوف العدادات والإصدار والتحقق والاستهلاك والاستبدال، وتوفر إصدارات كلمات المرور عقد تعارض إضافيًا.

يستخدم التدقيق عقد منصة مشتركًا بدل نظام عام خاص بالهوية. يخزن المعرفات المقيدة والنتائج والأوقات والبيانات الوصفية الآمنة، ويرفض محول التخزين المفاتيح التي قد تحمل كلمات أو تجزئات أو رموز OTP أو أسرارًا أو رموز جلسات.

### الأمن وحدود المهام التالية

لا توجد مسارات HTTP عامة للتهيئة أو الطوارئ أو الاستعادة أو المصادقة. تتطلب العمليات العادية سياق مساحة عمل وممثل موثوقًا. لا توجد كلمات أو رموز خام مخزنة، أو سجلات أسرار، أو عرض لكلمة المرور، أو كلمة افتراضية، أو دخول برقم الهاتف، أو جلسات.

- المهمة B: الجلسات والرموز وملفات الارتباط والسياق الموثوق والخروج و`/api/auth/me`.
- المهمة C: إدارة الأعضاء والأدوار والصلاحيات ونطاق الفروع وملفات الاتصال.
- المهمة D: واجهات الدخول وكلمات المرور والاستعادة وإدارة الأعضاء.
- المهمة E: محول تسليم واتساب وحدود الأمان الخاصة بالمزود.
