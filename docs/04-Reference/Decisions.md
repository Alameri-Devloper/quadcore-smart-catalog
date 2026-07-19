# Project Decisions

> **Historical Document — Superseded**
>
> This document is preserved for project history and is not the current authoritative source.
>
> Authoritative replacement: [Constitution and current ADR register](../00-Constitution/README.md)
>
> **وثيقة تاريخية — تم استبدالها**
>
> تم الاحتفاظ بهذه الوثيقة لحفظ تاريخ المشروع، لكنها ليست المرجع الحالي المعتمد.
>
> الوثيقة المعتمدة البديلة: [الدستور وسجل ADR الحالي](../00-Constitution/README.md)

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

Catalog workflows must be designed for Mobile, Tablet, and Desktop from the beginning as equally first-class environments. Functional QA verifies touch, mouse, and keyboard navigation; Desktop and Tablet are never secondary adaptations.

يجب تصميم سير عمل الكتالوج للجوال والجهاز اللوحي والكمبيوتر منذ البداية كبيئات أساسية ومتساوية. يتحقق QA الوظيفي من اللمس والفأرة والتنقل بلوحة المفاتيح، ولا يعد الكمبيوتر أو الجهاز اللوحي نسخة ثانوية.
