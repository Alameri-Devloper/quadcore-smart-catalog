# Identity Boundary | حدود الهوية

**Status:** Recovery delivery implemented; pending independent review · **Last Updated:** 2026-08-17 · **Scope:** Identity domain

## English

Identity owns authentication accounts, stable `actorId` values, Workspace-scoped login identities, password credentials, login protection, recovery challenges, member profiles, memberships, and access foundations. These remain distinct models: an Account is not a Member Profile, a Membership, a credential, a recovery challenge, or a session.

Tasks 3.15.1-A through D now implement account/recovery/bootstrap, server sessions, Owner-managed member administration, and the responsive bilingual Presentation layer. Login is resolved by trusted `workspaceCode + normalizedUsername`; internal `workspaceId` is never a public login identifier. Owner authority is derived from the fixed permission registry and `AllBranches`. Staff authority comes from normalized explicit permission rows and persisted `AllBranches | SelectedBranches` scope with actual selected IDs. Authorization changes increment `authorizationVersion` and revoke sessions; full session resolution now supplies real permissions and Branch IDs to Catalog. Presentation consumes typed HTTP contracts, derives session view state only from `/api/auth/me`, and never reads or stores the opaque session value. See [Identity Authentication and Member Presentation](../../05-Development/Identity-Authentication-and-Member-Presentation.md).

Task 3.15.1-D-R1 hardens the existing boundary with browser-observed concurrency tokens, explicit redacted list/details HTTP DTOs, confirmed logout semantics, and honest session-timestamp labeling. The tokens are never authority: Application compares them with locked persisted entities, while the trusted acting Owner still comes only from server Session context. No schema or migration change is required.

Task 3.15.1-D-R2 completes the communication-settings save loop: a confirmed PATCH returns the committed safe settings DTO and its server-authored revision, which Presentation adopts for the next explicit save. Unconfirmed failures do not advance the revision, and genuine stale writes still return 409.

Last Active Owner protection is serialized with a Workspace database lock. WhatsApp is a Workspace-scoped E.164 recovery contact: changing it increments the recovery-contact version and invalidates recovery challenges without revoking sessions. Task D still owns the UI, Task E owns WhatsApp delivery, and Task 3.17 owns the full Branch aggregate. See [Identity Member Administration](../../05-Development/Identity-Member-Administration.md).

See [Identity Accounts, Recovery, and Bootstrap](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) for lifecycle, security, schema, CLI, and task-boundary details.

Task D Presentation details are documented bilingually in [Identity Authentication and Member Presentation](../../05-Development/Identity-Authentication-and-Member-Presentation.md).

Task 3.15.1-E now completes provider-neutral self-service recovery, the WhatsApp delivery contract, explicit Development/Test capture, public request/resend/verify/reset routes, server-enforced limits, session revocation, and the real recovery Presentation integration. Production fails closed until an approved concrete WhatsApp provider is injected. See [Identity Recovery Delivery and WhatsApp OTP](../../05-Development/Identity-Recovery-Delivery-and-WhatsApp-OTP.md).

تفاصيل طبقة العرض في المهمة D موثقة بالعربية والإنجليزية في [واجهة المصادقة وإدارة الأعضاء](../../05-Development/Identity-Authentication-and-Member-Presentation.md).

## العربية

يمتلك مجال الهوية حسابات المصادقة، ومعرّف `actorId` الثابت، وهويات الدخول المقيدة بمساحة العمل، وبيانات اعتماد كلمات المرور، وحماية تسجيل الدخول، وتحديات الاستعادة، وملفات الأعضاء، والعضويات، وأسس الوصول. تبقى هذه نماذج منفصلة؛ فالحساب ليس ملف العضو أو العضوية أو بيانات الاعتماد أو تحدي الاستعادة أو الجلسة.

تنفذ المهمة 3.15.1-A أساس التخزين والتطبيق فقط. يُحل تسجيل الدخول بواسطة `workspaceCode + normalizedUsername` من سياق موثوق، ولا يُستخدم `workspaceId` الداخلي كمعرّف دخول عام. تستخدم العضوية فقط `AllBranches | SelectedBranches`، ويبقى كل مالك `AllBranches`، بينما تُؤجل معرفات الفروع المختارة إلى المهمة C. تعرّف المهمة A المنفذ `SessionRevocationPort` كحد تكامل مستقبلي فقط؛ ولا تستدعي حالات استخدام إعادة التعيين أو الاستعادة إبطال الجلسات لأن تخزين جلسات الخادم يخص المهمة B. لا تتضمن المهمة جلسات الخادم أو ملفات الارتباط أو مسارات مصادقة عامة أو واجهة دخول أو موصل تسليم واتساب. يستهلك الكتالوج سياق الهوية الموثوق ولا يمتلك بياناتها.

تحصّن المهمة 3.15.1-D-R1 الحدود الحالية برموز تزامن قرأها المتصفح، وخرائط HTTP صريحة ومحجوبة للقائمة والتفاصيل، وتأكيد نزاهة تسجيل الخروج، وحذف وصف غير دقيق لوقت إصدار الجلسة. لا تمنح الرموز أي سلطة؛ تقارنها طبقة التطبيق مع الكيانات المقفلة في التخزين، بينما يُستمد المالك المنفذ من سياق جلسة الخادم فقط. لا يتطلب التصحيح مخططًا أو ترحيلاً جديدًا.

تكمل المهمة 3.15.1-D-R2 دورة حفظ إعدادات الاتصال: تعيد عملية PATCH المؤكدة DTO الآمن المحفوظ ورمز المراجعة الصادر من الخادم، وتعتمده طبقة العرض للحفظ الصريح التالي. لا ترفع النتائج غير المؤكدة الرمز، وتبقى الكتابة القديمة الحقيقية تعيد 409.

راجع [حسابات الهوية والاستعادة والتهيئة](../../05-Development/Identity-Accounts-Recovery-Bootstrap.md) لتفاصيل دورات الحياة والأمن والمخطط وأوامر CLI وحدود المهام.

تكمل المهمة 3.15.1-E الاستعادة الذاتية المحايدة للمزوّد وعقد واتساب ومحول التطوير/الاختبار والمسارات العامة والحدود الأمنية وإلغاء الجلسات وربط الواجهة الفعلي. تفشل بيئة الإنتاج بإغلاق آمن حتى حقن مزوّد واتساب معتمد. راجع [توصيل استعادة الهوية ورمز واتساب](../../05-Development/Identity-Recovery-Delivery-and-WhatsApp-OTP.md).
