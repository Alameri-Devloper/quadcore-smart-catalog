# QSC Platform Roadmap

# خارطة طريق منصة QSC

## English

This roadmap describes the planned growth of QSC Platform while preserving Domain Driven Design, Clean Architecture, multi-tenant boundaries, and mobile-first delivery.

## العربية

توضح خارطة الطريق هذه نمو منصة QSC المخطط له مع الحفاظ على التصميم الموجه بالمجال، والمعمارية النظيفة، وحدود تعدد المستأجرين، وتجربة الجوال أولا.

## Phase 1: Smart Catalog | المرحلة الأولى: الكتالوج الذكي

- Build the public catalog experience.
- Support departments, categories, product models, and products.
- Use mock repositories until database integration is approved.
- Support store WhatsApp and employee WhatsApp fallback rules.

- بناء تجربة الكتالوج العام.
- دعم الأقسام، والتصنيفات، ونماذج المنتجات، والمنتجات.
- استخدام مستودعات وهمية إلى أن يتم اعتماد تكامل قاعدة البيانات.
- دعم قواعد واتساب الخاصة بالمحل والموظف مع آلية الرجوع للرقم الافتراضي.

## Phase 2: SaaS Foundation | المرحلة الثانية: أساس SaaS

- Strengthen company and workspace boundaries.
- Prepare tenant-aware repositories and services.
- Add authentication and authorization when approved.
- Document architecture decisions using ADRs.

- تقوية حدود الشركة ومساحة العمل.
- تجهيز المستودعات والخدمات لتكون واعية بالمستأجر.
- إضافة تسجيل الدخول والصلاحيات عند اعتمادها.
- توثيق القرارات المعمارية باستخدام ADR.

## Phase 3: Database Integration | المرحلة الثالثة: تكامل قاعدة البيانات

- Introduce Supabase after architecture approval.
- Keep database access inside repositories only.
- Keep components free from direct database calls.
- Preserve service-level business rules.

- إدخال Supabase بعد اعتماد المعمارية.
- إبقاء الوصول لقاعدة البيانات داخل المستودعات فقط.
- منع مكونات الواجهة من الاتصال المباشر بقاعدة البيانات.
- الحفاظ على قواعد العمل داخل الخدمات.

## Phase 4: Operations | المرحلة الرابعة: العمليات

- Add inventory workflows.
- Add sales and employee workflows.
- Add reporting and analytics domains.
- Keep each feature inside its domain boundary.

- إضافة سير عمل المخزون.
- إضافة سير عمل المبيعات والموظفين.
- إضافة مجالات التقارير والتحليلات.
- إبقاء كل ميزة داخل حدود مجالها.
