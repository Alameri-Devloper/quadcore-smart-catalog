# Identity Boundary | حدود الهوية

**Status:** Foundation implemented · **Last Updated:** 2026-08-09 · **Scope:** Identity domain

## English

Identity owns authentication accounts, stable `actorId` values, Workspace-scoped login identities, password credentials, login protection, recovery challenges, member profiles, memberships, and access foundations. These remain distinct models: an Account is not a Member Profile, a Membership, a credential, a recovery challenge, or a session.

Task 3.15.1-A implements the persistence and application foundation only. Login is resolved by trusted `workspaceCode + normalizedUsername`; internal `workspaceId` is never a public login identifier. Membership branch scope uses only `AllBranches | SelectedBranches`; every Owner remains `AllBranches`, while selected Branch IDs remain deferred to Task C. Task A defines `SessionRevocationPort` only as a future integration seam: reset and recovery use cases do not invoke session revocation because server-side session persistence belongs to Task B. No server session, cookie, public authentication route, login UI, or WhatsApp delivery adapter is implemented. Catalog continues to consume trusted identity context without owning Identity data.

See [Identity Accounts, Recovery, and Bootstrap](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) for lifecycle, security, schema, CLI, and task-boundary details.

## العربية

يمتلك مجال الهوية حسابات المصادقة، ومعرّف `actorId` الثابت، وهويات الدخول المقيدة بمساحة العمل، وبيانات اعتماد كلمات المرور، وحماية تسجيل الدخول، وتحديات الاستعادة، وملفات الأعضاء، والعضويات، وأسس الوصول. تبقى هذه نماذج منفصلة؛ فالحساب ليس ملف العضو أو العضوية أو بيانات الاعتماد أو تحدي الاستعادة أو الجلسة.

تنفذ المهمة 3.15.1-A أساس التخزين والتطبيق فقط. يُحل تسجيل الدخول بواسطة `workspaceCode + normalizedUsername` من سياق موثوق، ولا يُستخدم `workspaceId` الداخلي كمعرّف دخول عام. تستخدم العضوية فقط `AllBranches | SelectedBranches`، ويبقى كل مالك `AllBranches`، بينما تُؤجل معرفات الفروع المختارة إلى المهمة C. تعرّف المهمة A المنفذ `SessionRevocationPort` كحد تكامل مستقبلي فقط؛ ولا تستدعي حالات استخدام إعادة التعيين أو الاستعادة إبطال الجلسات لأن تخزين جلسات الخادم يخص المهمة B. لا تتضمن المهمة جلسات الخادم أو ملفات الارتباط أو مسارات مصادقة عامة أو واجهة دخول أو موصل تسليم واتساب. يستهلك الكتالوج سياق الهوية الموثوق ولا يمتلك بياناتها.

راجع [حسابات الهوية والاستعادة والتهيئة](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) لتفاصيل دورات الحياة والأمن والمخطط وأوامر CLI وحدود المهام.
