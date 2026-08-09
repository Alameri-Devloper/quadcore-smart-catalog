# Development Documentation | توثيق التطوير

**Status:** Active · **Last Updated:** 2026-08-09 · **Scope:** Delivery and governance

## English

The Product Media compatibility workflow runs focused foundation tests on Windows and Ubuntu; hosted success requires an actual pull-request run.

The [GitHub CI Quality Gate](GitHub-CI-Quality-Gate.md) defines the independent Ubuntu quality and PostgreSQL integration checks for relevant pushes and pull requests.

Use the [documentation audit](Documentation-Audit.md), [refactoring report](Documentation-Refactoring-Report.md), [contribution guide](Contribution-and-Review.md), [acceptance criteria](Acceptance-Criteria.md), [dependency security risk register](Dependency-Security-Risks.md), [automated task review bundle guide](Automated-Task-Review-Bundle.md), and [final report index](Reports/README.md). Legacy development guides remain preserved and indexed by the audit.

The [Product Entry Submission Registry](Product-Entry-Submission-Registry.md) documents the Phase 1 idempotency, transaction, persistence, authorization, and API boundary introduced by Task 3.14.9-A.

The [Identity Accounts, Recovery, and Bootstrap](Identity-Accounts-Recovery-Bootstrap.md) guide documents Task 3.15.1-A account/credential separation, Workspace login codes, Argon2id, login protection, HMAC recovery challenges, atomic bootstrap, emergency Owner reset, multi-tenant persistence, and the boundaries reserved for Tasks B–E. | يوثق دليل [حسابات الهوية والاستعادة والتهيئة](Identity-Accounts-Recovery-Bootstrap.md) فصل الحساب وبيانات الاعتماد ورموز الدخول وحماية تسجيل الدخول وتحديات HMAC والتهيئة الذرية وإعادة ضبط المالك الطارئة وعزل المستأجرين.

The [Identity Server Sessions and Trusted Context](Identity-Server-Sessions-and-Trusted-Context.md) guide documents Task 3.15.1-B opaque sessions, secure cookies, restricted first login, expiry, revocation, trusted actor resolution, version validation, redacted HTTP routes, and Task C/D/E handoff. | يوثق دليل [جلسات الهوية على الخادم والسياق الموثوق](Identity-Server-Sessions-and-Trusted-Context.md) الجلسات المبهمة وملفات الارتباط الآمنة والجلسة المقيدة والانتهاء والإبطال والسياق الموثوق والتحقق من الإصدارات وحدود المهام التالية.

The [Product Entry Media Upload Coordination](Product-Entry-Media-Upload-Coordination.md) guide documents Task 3.14.9-B Phase 2 multipart mapping, double source verification, Media idempotency, workflow resume, partial success, tenancy, and HTTP behavior.

Task 3.14.9-B-R1 corrects that contract so completed replay and retained-Staging retry need no re-upload, GET and POST share durable source requirements, and bounded multipart guards run before application opening.

The [Product Entry Local Draft Recovery](Product-Entry-Local-Draft-Recovery.md) guide documents Task 3.14.9-C IndexedDB identities, retention, schema migration, explicit recovery, Edit revision conflicts, Media reselection, security filtering, autosave serialization, revalidation, and the Task 3.14.9-D Presentation boundary.

The [Mobile Product Entry and Two-Phase Save](Mobile-Product-Entry-Two-Phase-UI.md) guide documents Tasks 3.14.9-D, D-R1, and D-R2: Create/Edit routes, trusted client context, Local Draft binding, first-class Reorder/SetCover operations, deterministic complete Media ordering, dependency-safe metadata resume, allocate-before-delete Add New safety, typed English/Arabic Presentation copy, terminal Worker failure handling, two-phase retry/resume, responsive layout, accessibility, security, and deterministic manual QA.

يوثق دليل [إدخال المنتج للجوال والحفظ على مرحلتين](Mobile-Product-Entry-Two-Phase-UI.md) المهام 3.14.9-D وD-R1 وD-R2، بما يشمل مساري الإنشاء والتعديل والسياق الموثوق وربط المسودة المحلية وعمليتي Reorder وSetCover الأصليتين، وإعادة بناء ترتيب الوسائط الكامل، واستئناف البيانات الوصفية الآمن للاعتماديات، وتخصيص الهوية قبل حذف المسودة عند «إضافة منتج جديد»، وحد التعريب المركزي المحدد الأنواع، ومعالجة أعطال عامل البصمة، والاستئناف والتصميم المتجاوب وإتاحة الوصول والأمن وقائمة التحقق اليدوية.

## العربية

يوثق دليل [استعادة مسودة إدخال المنتج محلياً](Product-Entry-Local-Draft-Recovery.md) مفاتيح IndexedDB ومدد الاحتفاظ وترحيل المخطط والاستعادة الصريحة وتعارض مراجعة التعديل وإعادة اختيار الوسائط والتصفية الأمنية وتسلسل الحفظ التلقائي وحدود العرض للمهمة 3.14.9-D.

يوثق دليل [تنسيق رفع وسائط إدخال المنتج](Product-Entry-Media-Upload-Coordination.md) عقد المرحلة الثانية للرفع متعدد الأجزاء والتحقق المزدوج وIdempotency والاستئناف والنجاح الجزئي والعزل بين مساحات العمل واستجابات HTTP.

تصحح المهمة 3.14.9-B-R1 الاستئناف بحيث لا يحتاج الطلب المكتمل أو المصدر المرحلي المحفوظ إلى رفع جديد، وتوحد متطلبات المصدر بين GET وPOST، وتضيف حدوداً مبكرة للطلب متعدد الأجزاء.

يشغل سير توافق Product Media اختبارات الأساس المركزة على Windows وUbuntu، ولا يثبت النجاح المستضاف إلا تشغيل فعلي لطلب سحب.

تحدد [بوابة جودة GitHub CI](GitHub-CI-Quality-Gate.md) فحوص الجودة وتكامل PostgreSQL المستقلة على Ubuntu لعمليات الدفع وطلبات السحب ذات الصلة.

استخدم تدقيق الوثائق وتقرير إعادة التنظيم ودليل المساهمة والمراجعة ومعايير القبول وسجل مخاطر أمن الاعتماديات ودليل حزمة مراجعة المهام الآلية وفهرس التقارير النهائية. تبقى أدلة التطوير السابقة محفوظة ومفهرسة في التدقيق.

توثق صفحة [سجل طلبات إدخال المنتج](Product-Entry-Submission-Registry.md) حدود Idempotency والمعاملة والحفظ والتفويض وواجهة API للمرحلة الأولى في المهمة 3.14.9-A.
