# Architecture Decision Records

# سجلات قرارات المعمارية

> **Historical Reference | مرجع تاريخي**
>
> This index preserves the original four-digit ADR series. New ADRs are registered in the [current authoritative ADR index](../01-Architecture/ADR/README.md). Individual records retain the status shown below; ADR-0005 is Superseded.
>
> يحفظ هذا الفهرس سلسلة ADR الأصلية ذات الأرقام الأربعة. تسجل القرارات الجديدة في [فهرس ADR الحالي المعتمد](../01-Architecture/ADR/README.md). يحتفظ كل سجل بالحالة الموضحة أدناه، وقد تم استبدال ADR-0005.

## What ADR Means | معنى ADR

ADR stands for Architecture Decision Record.

ADR تعني سجل قرار معماري.

An ADR documents an important architecture decision, the context behind it, and the consequences of choosing it.

يوثق ADR قرارا معماريا مهما، والسياق وراءه، ونتائج اختياره.

## Why We Use ADRs | لماذا نستخدم ADR

ADRs help the team preserve the reasoning behind technical decisions as the SaaS platform grows.

تساعد ADRs الفريق على حفظ أسباب القرارات التقنية مع نمو منصة SaaS.

They make decisions easier to review, explain, and revisit without losing historical context.

تجعل القرارات أسهل في المراجعة والشرح وإعادة التقييم دون فقدان السياق التاريخي.

## How To Create A New ADR | طريقة إنشاء ADR جديد

Create a new Markdown file inside this folder when an architecture decision is approved.

أنشئ ملف Markdown جديدا داخل هذا المجلد عند اعتماد قرار معماري.

Use a numbered kebab-case filename, for example:

استخدم اسما مرقما بصيغة kebab-case، مثل:

```text
ADR-0001-example-decision.md
```

Each ADR should include:

يجب أن يحتوي كل ADR على:

- Title | العنوان
- Status | الحالة
- Context | السياق
- Decision | القرار
- Consequences | النتائج

## ADR Index | فهرس ADR

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-0002](./ADR-0002-Category-Device-Class-Specification-Templates.md) | Category and Device Class Specification Templates | Accepted |
| [ADR-0003](./ADR-0003-Assisted-Product-Data-Entry.md) | Assisted Product Data Entry | Accepted for future implementation |
| [ADR-0004](./ADR-0004-Context-Aware-Product-Entry.md) | Context-Aware Product Entry | Accepted; implementation staged |
| [ADR-0005](./ADR-0005-Product-Lifecycle-and-Soft-Delete.md) | Product Lifecycle and Soft Delete | Superseded by ADR-001 |
| [ADR-0006](./ADR-0006-Impact-Analysis-and-Safe-Reconciliation.md) | Impact Analysis and Safe Reconciliation | Accepted; full implementation planned |
| [ADR-0007](./ADR-0007-Context-Aware-Smart-Search.md) | Context-Aware Smart Search | Accepted; future implementation planned |
| [ADR-0008](./ADR-0008-Dynamic-Context-Aware-Template-Generation-Engine.md) | Dynamic Context-Aware Template Generation Engine | Accepted; future implementation planned |
| [ADR-0009](./ADR-0009-Sales-Intelligence-Engine-Architecture.md) | Sales Intelligence Engine Architecture | Accepted; future implementation planned |

| ADR | العنوان | الحالة |
| --- | --- | --- |
| [ADR-0002](./ADR-0002-Category-Device-Class-Specification-Templates.md) | قوالب المواصفات حسب التصنيف وفئة الجهاز | معتمد |
| [ADR-0003](./ADR-0003-Assisted-Product-Data-Entry.md) | إدخال بيانات المنتج بمساعدة | معتمد للتنفيذ المستقبلي |
| [ADR-0004](./ADR-0004-Context-Aware-Product-Entry.md) | إدخال المنتج الواعي بالسياق | معتمد؛ التنفيذ مرحلي |
| [ADR-0005](./ADR-0005-Product-Lifecycle-and-Soft-Delete.md) | دورة حياة المنتج والحذف المنطقي | تم استبداله بواسطة ADR-001 |
| [ADR-0006](./ADR-0006-Impact-Analysis-and-Safe-Reconciliation.md) | تحليل التأثير والتنسيق الآمن | معتمد؛ التنفيذ الكامل مخطط له |
| [ADR-0007](./ADR-0007-Context-Aware-Smart-Search.md) | البحث الذكي الواعي بالسياق | معتمد؛ التنفيذ مخطط له مستقبلا |
| [ADR-0008](./ADR-0008-Dynamic-Context-Aware-Template-Generation-Engine.md) | محرك توليد القوالب الديناميكي الواعي بالسياق | معتمد؛ التنفيذ مخطط له مستقبلا |
| [ADR-0009](./ADR-0009-Sales-Intelligence-Engine-Architecture.md) | معمارية محرك Sales Intelligence | معتمد؛ التنفيذ مخطط له مستقبلا |
