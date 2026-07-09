# Architecture Decision Records

# سجلات قرارات المعمارية

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
0001-use-supabase-for-database.md
```

Each ADR should include:

يجب أن يحتوي كل ADR على:

- Title | العنوان
- Status | الحالة
- Context | السياق
- Decision | القرار
- Consequences | النتائج
