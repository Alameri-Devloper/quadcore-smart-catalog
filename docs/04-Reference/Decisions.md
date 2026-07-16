# Project Decisions

# قرارات المشروع

## English

This file tracks lightweight project decisions that do not require a full Architecture Decision Record yet. Major architecture decisions should be documented under `docs/ADR/`.

## العربية

يتتبع هذا الملف قرارات المشروع الخفيفة التي لا تحتاج بعد إلى سجل قرار معماري كامل. القرارات المعمارية الكبيرة يجب توثيقها داخل `docs/ADR/`.

## Current Decisions | القرارات الحالية

### Use Domain Driven Design | استخدام التصميم الموجه بالمجال

QSC Platform is organized around business domains instead of technical folders only.

يتم تنظيم منصة QSC حول مجالات العمل بدلا من المجلدات التقنية فقط.

### Use Clean Architecture | استخدام المعمارية النظيفة

Business logic belongs in services, data access belongs in repositories, and UI components must stay focused on rendering and interaction.

منطق العمل يكون داخل الخدمات، والوصول للبيانات يكون داخل المستودعات، ومكونات الواجهة تبقى مركزة على العرض والتفاعل.

### Build Multi-Tenant From Day One | بناء تعدد المستأجرين من البداية

Company and workspace ownership must be considered in all domain models and future database queries.

يجب مراعاة ملكية الشركة ومساحة العمل في جميع نماذج المجال واستعلامات قاعدة البيانات المستقبلية.

### Use Mock Data Before Database Integration | استخدام البيانات الوهمية قبل تكامل قاعدة البيانات

Mock data is acceptable during early development, but it must stay inside mock folders and be accessed through repositories.

البيانات الوهمية مقبولة أثناء التطوير المبكر، لكنها يجب أن تبقى داخل مجلدات mock ويتم الوصول إليها عبر المستودعات.

### Responsive First | متجاوب منذ التصميم

Catalog workflows must be designed for Desktop and Mobile from the beginning, with desktop productivity and mobile touch interaction treated as equally important.

يجب تصميم سير عمل الكتالوج للكمبيوتر والجوال منذ البداية، مع منح إنتاجية الكمبيوتر والتفاعل باللمس على الجوال أهمية متساوية.
