# Identity Member Administration | إدارة أعضاء الهوية

**Task:** 3.15.1-C
**Status:** Implemented, pending independent review
**Last updated:** 2026-08-09

## English

### Boundary and model

Identity keeps `Account`, `PasswordCredential`, `WorkspaceMembership`, `WorkspaceMemberProfile`, `ServerSession`, and `PasswordRecoveryChallenge` separate. The stable cross-system identity is `actorId`; username remains an immutable Workspace-scoped login identifier. Every member administration command derives its Workspace and acting actor from a validated full server session. Request bodies never supply tenant, actor, role, permission, or branch authority.

V1 member administration is Owner-only. An Owner always has `AllBranches` and derives effective permissions from the code-owned registry. Owner permission rows are neither required nor editable. Staff authority is the deterministic combination of explicit normalized permission rows and `AllBranches` or non-empty `SelectedBranches` rows. `workspace.members.manage` exists to describe Owner authority but is not assignable to Staff.

### Permission registry and templates

`domains/identity/domain/permission.ts` is the single code registry. Definitions contain a stable code, module, translation keys, Staff-assignability, and sensitivity. Existing Product Entry codes remain unchanged; Task C does not silently rename them. The fixed `standard-catalog-staff` template copies an approved non-sensitive default set when applied. It is not a dynamic role, and later template changes cannot mutate persisted Staff permissions.

### Branch scope

`AllBranches | SelectedBranches` is the only vocabulary. Selected scope requires unique IDs and validates each ID through a repository lookup that requires the trusted `workspaceId` and applies it at the database boundary. A returned reference must be Active. A foreign-only ID and a nonexistent ID both produce the scoped `BranchNotFound` result because foreign Workspace rows never leave persistence. `workspace_branch_references` is only an integration registry for Task C; it is not a Branch aggregate and contains no Inventory behavior. Task 3.17 must connect the real Branch lifecycle to this stable reference contract.

### Member lifecycle and security

Member creation atomically creates PendingActivation Account, Temporary credential, login protection, profile, Membership, explicit Staff authorization, and audit records. Display name is bounded and required. Locale is `ar | en`. WhatsApp uses E.164, is not login identity, and is unique per Workspace across retained/non-deleted profiles. Suspended members are not deleted, so their username and WhatsApp ownership remain reserved. The same WhatsApp value is allowed in another Workspace and may equal Workspace communication settings.

Changing display name or locale does not alter authorization or sessions. Changing WhatsApp increments `recoveryContactVersion`, invalidates open recovery challenges, and is audited, but does not change `authorizationVersion` or revoke sessions. Workspace default WhatsApp and recovery policy can be changed independently and never rewrite member profiles.

Suspension preserves identity/history, invalidates recovery, and revokes all sessions. Reactivation requires a new Temporary password, changes the Account to Active, increments `passwordVersion`, clears login protection, invalidates recovery, and revokes residual sessions. Owner reset retains the Task A/B Temporary credential and revocation behavior.

### Authorization and concurrency

Every effective role, permission, or branch-scope change locks the Membership, increments `authorizationVersion` exactly once, replaces normalized authorization rows, proactively revokes sessions, and audits the result in one Application-owned transaction. Session validation independently rejects stale versions as defense in depth. Profile, locale, and WhatsApp-only changes do not increment the authorization version.

Suspension and demotion of an Active Owner first lock the Workspace row and then count Active Owners. All removal paths use the same lock order. Concurrent operations therefore cannot both remove the final coverage; the rejected operation returns `LastActiveOwnerProtected` and is audited.

### HTTP and read models

Backend routes under `/api/workspace` expose members, member details, focused profile/WhatsApp/permission/branch/role/lifecycle operations, permission definitions/templates, and communication settings. Routes resolve a full server session, reject restricted sessions, require Owner, map transport DTOs, and delegate all rules to Application use cases. Read models expose safe profile, lifecycle, authorization summary, and last successful session-creation time. They never expose credential hashes, session/OTP/recovery digests, or secrets.

### Persistence

Migration `0009_identity_member_administration.sql` adds:

- profile locale plus Workspace-scoped WhatsApp uniqueness;
- normalized `identity_membership_permissions`;
- normalized `identity_membership_branches`;
- narrow `workspace_branch_references`;
- composite Workspace-scoped foreign keys and known-code constraints.

The migration backfills existing profile locale to `ar` and removes the temporary default. It fails closed if pre-Task-C `SelectedBranches` Memberships exist without explicit selected IDs, so production data must be reconciled deliberately rather than silently broadening or fabricating scope. No production migration was run by this task.

### Handoffs

- Task 3.15.1-D owns responsive Arabic/English Login, password-change, recovery, member, permission, and branch-scope UI.
- Task 3.15.1-E owns WhatsApp OTP delivery, provider configuration, delivery failures, and delivery-specific rate limiting.
- Task 3.17 owns the full Branch aggregate/lifecycle and must publish active references through the narrow Workspace contract.

## العربية

### الحدود والنموذج

يبقي مجال الهوية مفاهيم `Account` و`PasswordCredential` و`WorkspaceMembership` و`WorkspaceMemberProfile` و`ServerSession` و`PasswordRecoveryChallenge` منفصلة. المعرّف الثابت بين الأنظمة هو `actorId`، بينما يبقى اسم المستخدم معرّف دخول ثابتاً ومقيداً بمساحة العمل. تستمد كل عملية إدارة مساحة العمل والعضو المنفذ من جلسة خادم كاملة وموثوقة، ولا تمنح بيانات المتصفح أي سلطة للمستأجر أو الدور أو الصلاحيات أو الفروع.

إدارة الأعضاء في الإصدار الأول محصورة بالمالك. يستخدم المالك دائماً `AllBranches` وتُشتق صلاحياته الفعلية من السجل الثابت في الكود، ولا تعتمد سلطته على صفوف صلاحيات قابلة للتعديل. تعتمد سلطة الموظف على صفوف صلاحيات صريحة ومطبّعة، مع `AllBranches` أو قائمة غير فارغة من `SelectedBranches`. لا يمكن إسناد `workspace.members.manage` إلى الموظف.

### سجل الصلاحيات والقوالب

الملف `domains/identity/domain/permission.ts` هو المصدر المركزي للصلاحيات. يحتوي كل تعريف على رمز ثابت ووحدة ومفاتيح ترجمة وحالة قابلية الإسناد للموظف وحساسية الصلاحية. بقيت رموز Product Entry المستخدمة سابقاً دون إعادة تسمية. قالب `standard-catalog-staff` ثابت وينسخ مجموعة افتراضية غير حساسة عند التطبيق فقط؛ وهو ليس دوراً ديناميكياً ولا يغير صلاحيات الأعضاء الحاليين عند تعديله لاحقاً.

### نطاق الفروع

المفردات الوحيدة هي `AllBranches | SelectedBranches`. يتطلب النطاق المحدد معرفات فريدة، ويجري التحقق منها عبر مستودع يفرض `workspaceId` الموثوق ويطبق نطاق مساحة العمل عند حد قاعدة البيانات. يجب أن يكون كل مرجع مُعاد نشطاً. يعيد المعرّف الموجود في مساحة عمل أجنبية والمعرّف غير الموجود النتيجة المقيدة نفسها `BranchNotFound`، لأن صفوف مساحات العمل الأجنبية لا تغادر طبقة التخزين. جدول `workspace_branch_references` سجل تكامل ضيق للمهمة C، وليس تجميع Branch ولا يحتوي منطق المخزون. يجب على المهمة 3.17 ربط دورة حياة الفرع الفعلية بهذا العقد.

### دورة حياة العضو والأمان

ينشئ المالك العضو في معاملة واحدة تشمل حساباً بحالة PendingActivation، وبيانات اعتماد Temporary، وحماية الدخول، والملف، والعضوية، وصلاحيات الموظف، والتدقيق. اسم العرض مطلوب ومحدود، واللغة `ar | en`. رقم واتساب بصيغة E.164 وليس هوية دخول، وهو فريد داخل مساحة العمل بين الملفات المحتفظ بها وغير المحذوفة. وبما أنه لا يوجد حذف صلب، يحتفظ العضو الموقوف باسم المستخدم ورقم واتساب. يسمح باستخدام الرقم نفسه في مساحة عمل أخرى أو مساواته بالرقم الافتراضي لمساحة العمل.

لا يغير تعديل الاسم أو اللغة الصلاحيات أو الجلسات. يرفع تغيير واتساب `recoveryContactVersion` ويبطل تحديات الاستعادة المفتوحة ويسجل التدقيق، لكنه لا يرفع `authorizationVersion` ولا يلغي الجلسات. كما أن تغيير رقم مساحة العمل الافتراضي وسياسة الاستعادة لا يغير ملفات الأعضاء.

يحفظ الإيقاف الهوية والسجل، ويبطل الاستعادة، ويلغي الجلسات. تتطلب إعادة التنشيط كلمة مرور مؤقتة جديدة، وتحول الحساب إلى Active، وترفع `passwordVersion`، وتمسح حماية الدخول، وتبطل تحديات الاستعادة، وتلغي أي جلسات باقية. تستمر إعادة تعيين المالك المعتمدة من المهمتين A وB في إصدار بيانات اعتماد مؤقتة وإلغاء الجلسات.

### الصلاحيات والتزامن

يقفل كل تغيير فعلي للدور أو الصلاحيات أو نطاق الفروع صف العضوية، ويرفع `authorizationVersion` مرة واحدة، ويستبدل الصفوف المطبعة، ويلغي الجلسات استباقياً، ويسجل التدقيق ضمن معاملة ينسقها التطبيق. كما يرفض التحقق من الجلسة النسخ القديمة كدفاع إضافي. لا ترفع تغييرات الملف أو اللغة أو واتساب إصدار الصلاحيات.

قبل إيقاف مالك نشط أو تخفيضه إلى موظف، تُقفل مساحة العمل ثم يُحسب المالكون النشطون. تستخدم جميع المسارات ترتيب القفل نفسه، لذلك لا يمكن لعمليتين متزامنتين إزالة آخر تغطية للمالك. تعيد العملية المرفوضة `LastActiveOwnerProtected` وتسجل حدث تدقيق.

### HTTP ونماذج القراءة

توفر مسارات `/api/workspace` عمليات الأعضاء المركزة، وسجل الصلاحيات والقوالب، وإعدادات الاتصال. تتحقق المسارات من جلسة خادم كاملة، وترفض الجلسة المقيدة، وتشترط دور المالك، ثم تحول DTO وتفوض القواعد إلى طبقة التطبيق. نماذج القراءة آمنة ولا تعرض تجزئات كلمات المرور أو الجلسات أو OTP أو الاستعادة أو أي أسرار.

### التخزين والتسليم اللاحق

تضيف الهجرة `0009_identity_member_administration.sql` اللغة، والتفرد المقيد بمساحة العمل لواتساب، وصفوف صلاحيات الموظف، وصفوف الفروع المحددة، وسجل مراجع الفروع الضيق، والمفاتيح الأجنبية المركبة. تعبئ الهجرة اللغة القديمة بالقيمة `ar` ثم تزيل القيمة الافتراضية المؤقتة. وتفشل بأمان إذا وجدت عضويات قديمة من نوع `SelectedBranches` بلا معرفات صريحة حتى لا تُختلق صلاحيات أو تتسع بصمت. لم تُشغّل هجرة إنتاجية.

تملك المهمة D واجهات المستخدم المتجاوبة وثنائية اللغة، وتملك المهمة E توصيل OTP عبر واتساب، بينما تملك المهمة 3.17 تجميع الفرع ودورة حياته الكاملة.
