# Identity Boundary | حدود الهوية

**Status:** Foundation implemented · **Last Updated:** 2026-08-09 · **Scope:** Identity domain

## English

Identity owns authentication accounts, stable `actorId` values, Workspace-scoped login identities, password credentials, login protection, recovery challenges, member profiles, memberships, and access foundations. These remain distinct models: an Account is not a Member Profile, a Membership, a credential, a recovery challenge, or a session.

Tasks 3.15.1-A through C now implement account/recovery/bootstrap, server sessions, and Owner-managed member administration. Login is resolved by trusted `workspaceCode + normalizedUsername`; internal `workspaceId` is never a public login identifier. Owner authority is derived from the fixed permission registry and `AllBranches`. Staff authority comes from normalized explicit permission rows and persisted `AllBranches | SelectedBranches` scope with actual selected IDs. Authorization changes increment `authorizationVersion` and revoke sessions; full session resolution now supplies real permissions and Branch IDs to Catalog.

Last Active Owner protection is serialized with a Workspace database lock. WhatsApp is a Workspace-scoped E.164 recovery contact: changing it increments the recovery-contact version and invalidates recovery challenges without revoking sessions. Task D still owns the UI, Task E owns WhatsApp delivery, and Task 3.17 owns the full Branch aggregate. See [Identity Member Administration](../../05-Development/Identity-Member-Administration.md).

See [Identity Accounts, Recovery, and Bootstrap](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) for lifecycle, security, schema, CLI, and task-boundary details.

## العربية

يمتلك مجال الهوية حسابات المصادقة، ومعرّف `actorId` الثابت، وهويات الدخول المقيدة بمساحة العمل، وبيانات اعتماد كلمات المرور، وحماية تسجيل الدخول، وتحديات الاستعادة، وملفات الأعضاء، والعضويات، وأسس الوصول. تبقى هذه نماذج منفصلة؛ فالحساب ليس ملف العضو أو العضوية أو بيانات الاعتماد أو تحدي الاستعادة أو الجلسة.

تنفذ المهمة 3.15.1-A أساس التخزين والتطبيق فقط. يُحل تسجيل الدخول بواسطة `workspaceCode + normalizedUsername` من سياق موثوق، ولا يُستخدم `workspaceId` الداخلي كمعرّف دخول عام. تستخدم العضوية فقط `AllBranches | SelectedBranches`، ويبقى كل مالك `AllBranches`، بينما تُؤجل معرفات الفروع المختارة إلى المهمة C. تعرّف المهمة A المنفذ `SessionRevocationPort` كحد تكامل مستقبلي فقط؛ ولا تستدعي حالات استخدام إعادة التعيين أو الاستعادة إبطال الجلسات لأن تخزين جلسات الخادم يخص المهمة B. لا تتضمن المهمة جلسات الخادم أو ملفات الارتباط أو مسارات مصادقة عامة أو واجهة دخول أو موصل تسليم واتساب. يستهلك الكتالوج سياق الهوية الموثوق ولا يمتلك بياناتها.

راجع [حسابات الهوية والاستعادة والتهيئة](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) لتفاصيل دورات الحياة والأمن والمخطط وأوامر CLI وحدود المهام.
