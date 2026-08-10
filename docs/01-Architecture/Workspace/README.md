# Workspace Boundary | حدود مساحة العمل

**Status:** Persistence foundation implemented · **Last Updated:** 2026-08-09 · **Scope:** Workspace domain

## English

Workspace belongs to a Company and is the tenant ownership boundary for configuration and repository operations. Workspace owns its stable internal `workspaceId`, readable normalized `workspaceCode`, display name, recovery policy, and communication settings. Identity references Workspace through scoped ports and foreign keys; it does not duplicate the Workspace aggregate.

The login code is separate from the primary key and display name. V1 bootstrap normalizes it to lowercase, enforces global uniqueness, and stores the approved recovery policy. Task C adds a narrow `workspace_branch_references` integration registry so Identity can validate same-Workspace Active Branch IDs without duplicating the Branch aggregate. Its repository contract requires the trusted `workspaceId`, and persistence applies that scope before returning rows; a foreign-only Branch ID is therefore indistinguishable from a nonexistent ID. Branch lifecycle remains a Task 3.17 concern, and Branch/Warehouse quantities remain Inventory concerns. Trusted Application context supplies `workspaceId` to normal operations; browser or request-body identity is never authoritative.

## العربية

تنتمي مساحة العمل إلى شركة وتمثل حد ملكية المستأجر للإعدادات وعمليات المستودعات. يمتلك مجال مساحة العمل المعرّف الداخلي الثابت `workspaceId`، ورمز الدخول المقروء والمطبّع `workspaceCode`، واسم العرض، وسياسة الاستعادة، وإعدادات الاتصال. يشير مجال الهوية إلى مساحة العمل عبر منافذ ومفاتيح أجنبية مقيدة، ولا يكرر تجميع مساحة العمل.

رمز الدخول منفصل عن المفتاح الأساسي واسم العرض. تطبّعه تهيئة الإصدار الأول إلى أحرف صغيرة، وتفرض تفرده العام، وتحفظ سياسة الاستعادة المعتمدة. تضيف المهمة C سجل التكامل الضيق `workspace_branch_references` للتحقق من مراجع الفروع النشطة داخل مساحة العمل نفسها. يفرض عقد المستودع تمرير `workspaceId` الموثوق، ويطبق التخزين هذا النطاق قبل إعادة الصفوف؛ لذلك لا يمكن تمييز معرّف فرع موجود في مساحة عمل أجنبية عن معرّف غير موجود. يبقى الفرع مختلفًا عن مساحة العمل، وتظل كميات الفروع والمستودعات ضمن مجال المخزون. يمرر سياق التطبيق الموثوق `workspaceId` للعمليات العادية، ولا تصبح هوية المتصفح أو جسم الطلب مصدر سلطة.
