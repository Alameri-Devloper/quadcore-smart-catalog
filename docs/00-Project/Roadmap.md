# QSC Platform Roadmap

# خارطة طريق منصة QSC

## English

This roadmap describes the planned growth of QSC Platform while preserving Domain Driven Design, Clean Architecture, multi-tenant boundaries, and mobile-first delivery.

## العربية

توضح هذه الخارطة نمو منصة QSC المخطط له مع الحفاظ على التصميم الموجه بالمجال، والمعمارية النظيفة، وحدود تعدد المستأجرين، وتجربة الجوال أولا.

## Completed ✅ | مكتمل ✅

### Sprint 01: Foundation | السبرنت 01: الأساس

#### English

- Established project structure and documentation structure.
- Started the Catalog domain foundation.
- Adopted feature branch workflow.

#### العربية

- تأسيس هيكل المشروع وهيكل التوثيق.
- بدء أساس مجال الكتالوج.
- اعتماد سير عمل فروع الميزات.

### Sprint 02: Catalog Engine | السبرنت 02: محرك الكتالوج

#### English

- Completed the Catalog Engine foundation.
- Added dynamic product display with specification values.
- Added hierarchy-aware catalog selector behavior.
- Added Device Class and Specification Template foundations.
- Documented ADR-0002 and ADR-0003.

#### العربية

- إكمال أساس محرك الكتالوج.
- إضافة عرض ديناميكي للمنتجات مع قيم المواصفات.
- إضافة سلوك محدد كتالوج واع بالهرمية.
- إضافة أساس فئة الجهاز وقوالب المواصفات.
- توثيق ADR-0002 و ADR-0003.

## Sprint 03: Placeholder | السبرنت 03: عنصر نائب

### English

Sprint 03 scope is not defined yet. It will be planned after Sprint 02 review and approval.

Placeholders:

- Objective: To be defined.
- Scope: To be defined.
- Architecture decisions: To be defined if needed.
- Verification requirements: To be defined.

### العربية

لم يتم تحديد نطاق السبرنت 03 بعد. سيتم تخطيطه بعد مراجعة السبرنت 02 واعتماده.

عناصر نائبة:

- الهدف: سيتم تحديده.
- النطاق: سيتم تحديده.
- القرارات المعمارية: سيتم تحديدها عند الحاجة.
- متطلبات التحقق: سيتم تحديدها.

## Future Phases | المراحل المستقبلية

### SaaS Foundation | أساس SaaS

#### English

- Strengthen company and workspace boundaries.
- Prepare tenant-aware repositories and services.
- Add authentication and authorization when approved.

#### العربية

- تقوية حدود الشركة ومساحة العمل.
- تجهيز المستودعات والخدمات لتكون واعية بالمستأجر.
- إضافة تسجيل الدخول والصلاحيات عند اعتمادها.

### Database Integration | تكامل قاعدة البيانات

#### English

- Introduce Supabase after architecture approval.
- Keep database access inside repositories only.
- Preserve service-level business rules.

#### العربية

- إدخال Supabase بعد اعتماد المعمارية.
- إبقاء الوصول إلى قاعدة البيانات داخل المستودعات فقط.
- الحفاظ على قواعد العمل داخل الخدمات.

### Operations | العمليات

#### English

- Add future inventory, sales, employee, reporting, and analytics workflows after approval.
- Keep each feature inside its domain boundary.

#### العربية

- إضافة سير عمل المخزون والمبيعات والموظفين والتقارير والتحليلات مستقبلا بعد الاعتماد.
- إبقاء كل ميزة داخل حدود مجالها.

### Assisted Product Data Entry | إدخال بيانات المنتج بمساعدة

#### English

Future optional capability. It must support manual entry, human review, and non-blocking product creation.

#### العربية

قدرة مستقبلية اختيارية. يجب أن تدعم الإدخال اليدوي والمراجعة البشرية وألا تمنع إنشاء المنتج.

### Advanced Future Version | الإصدار المستقبلي المتقدم

#### English

- Market Catalog Module.
- Solution Builder Engine.
- Smart Product Discovery.
- Natural Language Specification Search.
- AI Sales Assistant.
- Product Benefit Generation.
- Product Comparison Assistance.
- WhatsApp Marketing Text Suggestions.
- Manual search and traditional filters remain available at all times.
- AI remains optional, non-blocking, based on confirmed QSC data, and subject to human review.

See [Future Smart Sales Features](../04-Reference/Future-Smart-Sales-Features.md) for capability boundaries and future architecture direction.

#### العربية

- وحدة كتالوج السوق.
- محرك بناء الحلول.
- الاكتشاف الذكي للمنتجات.
- البحث في المواصفات باللغة الطبيعية.
- مساعد المبيعات بالذكاء الاصطناعي.
- توليد فوائد المنتج.
- المساعدة في مقارنة المنتجات.
- اقتراحات النصوص التسويقية عبر واتساب.
- يظل البحث اليدوي وعوامل التصفية التقليدية متاحين دائماً.
- يظل الذكاء الاصطناعي اختيارياً وغير معيق، ومعتمداً على بيانات QSC المؤكدة، وخاضعاً للمراجعة البشرية.
