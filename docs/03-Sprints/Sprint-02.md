# Sprint 02

# السبرنت 02

## Status | الحالة

Completed ✅

مكتمل ✅

## Objectives | الأهداف

### English

- Complete the Catalog Engine foundation.
- Replace hardcoded product display with dynamic Product and Specification Value rendering.
- Preserve the Clean Architecture flow from Component to Service to Repository to Mock Data.
- Establish specification templates based on Category and optional Device Class.
- Document architecture decisions and future assisted product entry direction.

### العربية

- إكمال أساس محرك الكتالوج.
- استبدال عرض المنتجات الثابت بعرض ديناميكي يعتمد على المنتج وقيم المواصفات.
- الحفاظ على تدفق المعمارية النظيفة من المكون إلى الخدمة إلى المستودع إلى البيانات الوهمية.
- تأسيس قوالب المواصفات حسب التصنيف وفئة الجهاز الاختيارية.
- توثيق القرارات المعمارية واتجاه إدخال بيانات المنتج بمساعدة مستقبلا.

## Implemented Modules | الوحدات المنفذة

### English

- Department, Category, Brand, Product Model, and Product mock repository flow.
- Dynamic Specification Field and Specification Value display.
- Device Class module.
- Specification Template and Specification Template Field modules.
- Catalog selection coordination through services.

### العربية

- تدفق المستودعات الوهمية للأقسام والتصنيفات والعلامات التجارية ونماذج المنتجات والمنتجات.
- عرض حقول المواصفات وقيم المواصفات بشكل ديناميكي.
- وحدة فئة الجهاز.
- وحدات قالب المواصفات وحقول قالب المواصفات.
- تنسيق اختيار الكتالوج من خلال الخدمات.

## Architecture Decisions | القرارات المعمارية

### English

- Specification Fields are reusable workspace-level definitions.
- Category and optional Device Class determine the Specification Template.
- Product Models reference Category, Brand, and optional Device Class.
- Products provide Specification Values only for fields defined by the resolved template.
- Assisted product data entry is documented as an optional future capability.

### العربية

- حقول المواصفات تعريفات قابلة لإعادة الاستخدام على مستوى مساحة العمل.
- التصنيف وفئة الجهاز الاختيارية يحددان قالب المواصفات.
- نماذج المنتجات ترتبط بالتصنيف والعلامة التجارية وفئة الجهاز الاختيارية.
- المنتجات تقدم قيم المواصفات فقط للحقول المعرفة في القالب الذي يتم تحديده.
- تم توثيق إدخال بيانات المنتج بمساعدة كقدرة مستقبلية اختيارية.

## Major Discoveries | الاكتشافات الرئيسية

### English

- Product specifications should be driven by templates, not by individual products.
- Device Class is useful for Laptop categories but unnecessary for CCTV Camera categories.
- Data integrity checks are important before moving from mock data to database design.
- Documentation needs to stay close to the domain model as architecture evolves.

### العربية

- يجب أن تقود القوالب مواصفات المنتج بدلا من أن يحددها كل منتج بشكل مستقل.
- فئة الجهاز مفيدة لتصنيفات اللابتوب لكنها غير ضرورية لتصنيفات كاميرات CCTV.
- فحوصات سلامة البيانات مهمة قبل الانتقال من البيانات الوهمية إلى تصميم قاعدة البيانات.
- يجب أن يبقى التوثيق قريبا من نموذج المجال مع تطور المعمارية.

## Completed Features | الميزات المكتملة

### English

- Dynamic product cards with product name, price, currency, availability, and dynamic specifications.
- Catalog selector filtering for Department, Category, Brand, and Product Model.
- Category and optional Device Class specification template foundation.
- Device Class mock data and service/repository flow.
- ADR documentation for specification templates and assisted product data entry.

### العربية

- بطاقات منتجات ديناميكية تعرض اسم المنتج والسعر والعملة وحالة التوفر والمواصفات الديناميكية.
- تصفية محدد الكتالوج حسب القسم والتصنيف والعلامة التجارية ونموذج المنتج.
- أساس قوالب المواصفات حسب التصنيف وفئة الجهاز الاختيارية.
- بيانات وهمية وتدفق خدمة ومستودع لفئة الجهاز.
- توثيق ADR لقوالب المواصفات وإدخال بيانات المنتج بمساعدة.

## Known Future Improvements | التحسينات المستقبلية المعروفة

### English

- Product Form UI is not implemented yet.
- Product creation validation should enforce required template fields.
- Existing mock products do not yet provide every required specification value.
- Database integration is still planned for a later phase.
- Assisted Product Data Entry is documented only and not implemented.

### العربية

- واجهة نموذج إنشاء المنتج لم تنفذ بعد.
- يجب أن يتحقق إنشاء المنتج من الحقول المطلوبة في القالب.
- المنتجات الوهمية الحالية لا توفر كل قيم المواصفات المطلوبة بعد.
- تكامل قاعدة البيانات ما زال مخططا لمرحلة لاحقة.
- إدخال بيانات المنتج بمساعدة موثق فقط ولم ينفذ بعد.

## Lessons Learned | الدروس المستفادة

### English

- Keep business rules in services and data access in repositories.
- Refactor domain relationships early when mock data exposes better modeling.
- ADRs reduce confusion when architecture changes.
- Closing a sprint should include documentation, status, and data integrity review.

### العربية

- يجب إبقاء منطق العمل داخل الخدمات والوصول للبيانات داخل المستودعات.
- من الأفضل تعديل علاقات المجال مبكرا عندما تكشف البيانات الوهمية نموذجا أفضل.
- تساعد ADRs على تقليل الالتباس عند تغير المعمارية.
- يجب أن يتضمن إغلاق السبرنت التوثيق والحالة ومراجعة سلامة البيانات.

## Next Sprint | السبرنت التالي

### English

Sprint 03 is not planned yet. It should start with review, prioritization, and approved scope before implementation.

### العربية

لم يتم تخطيط السبرنت 03 بعد. يجب أن يبدأ بالمراجعة وتحديد الأولويات واعتماد النطاق قبل التنفيذ.
