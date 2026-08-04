# Development Documentation | توثيق التطوير

**Status:** Active · **Last Updated:** 2026-07-22 · **Scope:** Delivery and governance

## English

The Product Media compatibility workflow runs focused foundation tests on Windows and Ubuntu; hosted success requires an actual pull-request run.

The [GitHub CI Quality Gate](GitHub-CI-Quality-Gate.md) defines the independent Ubuntu quality and PostgreSQL integration checks for relevant pushes and pull requests.

Use the [documentation audit](Documentation-Audit.md), [refactoring report](Documentation-Refactoring-Report.md), [contribution guide](Contribution-and-Review.md), [acceptance criteria](Acceptance-Criteria.md), [dependency security risk register](Dependency-Security-Risks.md), [automated task review bundle guide](Automated-Task-Review-Bundle.md), and [final report index](Reports/README.md). Legacy development guides remain preserved and indexed by the audit.

The [Product Entry Submission Registry](Product-Entry-Submission-Registry.md) documents the Phase 1 idempotency, transaction, persistence, authorization, and API boundary introduced by Task 3.14.9-A.

The [Product Entry Media Upload Coordination](Product-Entry-Media-Upload-Coordination.md) guide documents Task 3.14.9-B Phase 2 multipart mapping, double source verification, Media idempotency, workflow resume, partial success, tenancy, and HTTP behavior.

Task 3.14.9-B-R1 corrects that contract so completed replay and retained-Staging retry need no re-upload, GET and POST share durable source requirements, and bounded multipart guards run before application opening.

## العربية

يوثق دليل [تنسيق رفع وسائط إدخال المنتج](Product-Entry-Media-Upload-Coordination.md) عقد المرحلة الثانية للرفع متعدد الأجزاء والتحقق المزدوج وIdempotency والاستئناف والنجاح الجزئي والعزل بين مساحات العمل واستجابات HTTP.

تصحح المهمة 3.14.9-B-R1 الاستئناف بحيث لا يحتاج الطلب المكتمل أو المصدر المرحلي المحفوظ إلى رفع جديد، وتوحد متطلبات المصدر بين GET وPOST، وتضيف حدوداً مبكرة للطلب متعدد الأجزاء.

يشغل سير توافق Product Media اختبارات الأساس المركزة على Windows وUbuntu، ولا يثبت النجاح المستضاف إلا تشغيل فعلي لطلب سحب.

تحدد [بوابة جودة GitHub CI](GitHub-CI-Quality-Gate.md) فحوص الجودة وتكامل PostgreSQL المستقلة على Ubuntu لعمليات الدفع وطلبات السحب ذات الصلة.

استخدم تدقيق الوثائق وتقرير إعادة التنظيم ودليل المساهمة والمراجعة ومعايير القبول وسجل مخاطر أمن الاعتماديات ودليل حزمة مراجعة المهام الآلية وفهرس التقارير النهائية. تبقى أدلة التطوير السابقة محفوظة ومفهرسة في التدقيق.

توثق صفحة [سجل طلبات إدخال المنتج](Product-Entry-Submission-Registry.md) حدود Idempotency والمعاملة والحفظ والتفويض وواجهة API للمرحلة الأولى في المهمة 3.14.9-A.
