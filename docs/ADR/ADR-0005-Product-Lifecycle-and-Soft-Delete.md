# ADR-0005: Product Lifecycle and Soft Delete

> **Historical Document — Superseded**
>
> This document is preserved for project history and is not the current authoritative source.
>
> Authoritative replacement: [ADR-001: Product Lifecycle](../01-Architecture/ADR/ADR-001-Product-Lifecycle.md)
>
> **وثيقة تاريخية — تم استبدالها**
>
> تم الاحتفاظ بهذه الوثيقة لحفظ تاريخ المشروع، لكنها ليست المرجع الحالي المعتمد.
>
> الوثيقة المعتمدة البديلة: [ADR-001: دورة حياة المنتج](../01-Architecture/ADR/ADR-001-Product-Lifecycle.md)

## English

## Title

Product Lifecycle and Soft Delete

## Status

Superseded by ADR-001: Product Lifecycle.

## Context

Products may be incomplete, actively sold, intentionally removed from public use, or deleted by mistake. Immediate hard deletion would make recovery impossible and could break future Inventory, Sales, reporting, audit, or historical references.

QSC needs an explicit lifecycle that distinguishes incomplete work, operational visibility, archival, recoverable deletion, and final removal.

## Decision

Products are never hard-deleted immediately. A Product follows this lifecycle:

```text
Draft
-> Active
-> Archived
-> Deleted
-> Purged
```

- **Draft:** incomplete work that is not an active Catalog Product and does not affect Inventory.
- **Active:** a confirmed Product available to applicable Catalog and operational workflows.
- **Archived:** retained Product data removed from normal active use.
- **Deleted:** soft-deleted Product moved to Trash and eligible for restoration.
- **Purged:** permanently removed Product after retention and reference checks.

Deleted Products move to Trash. The default Trash retention period is 7 days and must be configurable through an approved policy rather than hardcoded in UI components.

Restore is supported during retention. Permanent deletion is available to authorized users, subject to retention, permissions, tenant boundaries, and reference protection.

Future modules may prevent permanent deletion when historical references exist, including Sales, Inventory movements, reports, audits, or other records that require the Product identity.

## Reasons

- Protect employees from accidental destructive actions.
- Support recovery without rebuilding Product data.
- Preserve future historical and operational integrity.
- Separate Catalog visibility from permanent data removal.
- Establish a clear lifecycle for Draft and archived work.
- Allow retention policy to evolve without redesigning deletion behavior.

## Consequences

- Delete actions become lifecycle transitions, not immediate physical deletion.
- Normal Catalog queries must exclude Deleted and Purged Products unless a dedicated view requires them.
- Trash must remain tenant- and workspace-aware.
- Restore must return a Product only when its required relationships and data remain valid.
- Purge requires explicit authorization and future impact/reference analysis.
- Retention configuration, permissions, audit records, storage cleanup, and database enforcement require separate implementation design.
- A Draft is not an Inventory item and is not displayed as an active Catalog Product.
- This ADR does not add persistence, Trash UI, scheduled purge jobs, or permissions.

## Examples

An employee deletes a Product accidentally. The Product moves to Trash and can be restored within the configured retention period.

An administrator requests permanent deletion after retention. QSC finds a historical Sales reference and prevents purge while allowing the Product to remain archived or deleted.

An employee stops halfway through Product Entry. The incomplete work remains a Draft and never affects Catalog or Inventory.

---

## العربية

## العنوان

دورة حياة المنتج والحذف المنطقي

## الحالة

تم استبداله بواسطة ADR-001: دورة حياة المنتج.

## السياق

قد يكون المنتج غير مكتمل، أو معروضا للبيع، أو مستبعدا عمدا من الاستخدام العام، أو محذوفا بالخطأ. يجعل الحذف النهائي الفوري الاستعادة مستحيلة، وقد يكسر مراجع المخزون والمبيعات والتقارير والتدقيق والسجلات التاريخية المستقبلية.

تحتاج QSC إلى دورة حياة صريحة تميز بين العمل غير المكتمل والظهور التشغيلي والأرشفة والحذف القابل للاستعادة والإزالة النهائية.

## القرار

لا تحذف المنتجات حذفا نهائيا بصورة فورية. ويتبع المنتج دورة الحياة التالية:

```text
مسودة
-> نشط
-> مؤرشف
-> محذوف
-> مطهر نهائيا
```

- **مسودة:** عمل غير مكتمل، ليس منتجا نشطا في الكتالوج ولا يؤثر في المخزون.
- **نشط:** منتج مؤكد متاح لمسارات الكتالوج والعمليات المنطبقة.
- **مؤرشف:** بيانات منتج محفوظة أزيلت من الاستخدام النشط المعتاد.
- **محذوف:** منتج محذوف منطقيا، نقل إلى سلة المحذوفات ويمكن استعادته.
- **مطهر نهائيا:** منتج أزيل نهائيا بعد التحقق من مدة الاحتفاظ والمراجع.

تنتقل المنتجات المحذوفة إلى سلة المحذوفات. مدة الاحتفاظ الافتراضية في السلة هي 7 أيام، ويجب أن تكون قابلة للضبط من خلال سياسة معتمدة، لا أن تثبت داخل مكونات الواجهة.

تدعم الاستعادة أثناء مدة الاحتفاظ. ويتوفر الحذف النهائي للمستخدمين المصرح لهم، مع مراعاة مدة الاحتفاظ والصلاحيات وحدود المستأجر وحماية المراجع.

قد تمنع الوحدات المستقبلية الحذف النهائي عند وجود مراجع تاريخية، ومنها المبيعات أو حركات المخزون أو التقارير أو التدقيق أو السجلات الأخرى التي تتطلب هوية المنتج.

## الأسباب

- حماية الموظفين من الإجراءات التدميرية العرضية.
- دعم الاستعادة دون إعادة بناء بيانات المنتج.
- الحفاظ على سلامة السجلات التاريخية والتشغيلية المستقبلية.
- فصل ظهور المنتج في الكتالوج عن إزالة البيانات نهائيا.
- تأسيس دورة حياة واضحة للمسودات والعمل المؤرشف.
- السماح بتطوير سياسة الاحتفاظ دون إعادة تصميم سلوك الحذف.

## النتائج

- تصبح إجراءات الحذف انتقالات في دورة الحياة، وليست حذفا ماديا فوريا.
- يجب أن تستبعد استعلامات الكتالوج المعتادة المنتجات المحذوفة والمطهرة نهائيا إلا عندما يتطلب عرض مخصص خلاف ذلك.
- يجب أن تكون سلة المحذوفات واعية بالمستأجر ومساحة العمل.
- يجب ألا تعيد الاستعادة المنتج إلا عندما تبقى علاقاته وبياناته المطلوبة صالحة.
- يتطلب التطهير النهائي صلاحية صريحة وتحليل تأثير ومراجع مستقبليا.
- يتطلب ضبط مدة الاحتفاظ والصلاحيات وسجلات التدقيق وتنظيف التخزين وفرض قاعدة البيانات تصميما تنفيذيا منفصلا.
- المسودة ليست عنصرا في المخزون ولا تعرض كمنتج نشط في الكتالوج.
- لا يضيف هذا السجل حفظا أو واجهة لسلة المحذوفات أو مهام تطهير مجدولة أو صلاحيات.

## الأمثلة

يحذف موظف منتجا بالخطأ. ينتقل المنتج إلى سلة المحذوفات ويمكن استعادته خلال مدة الاحتفاظ المضبوطة.

يطلب مسؤول الحذف النهائي بعد انتهاء مدة الاحتفاظ. تعثر QSC على مرجع مبيعات تاريخي، فتمنع التطهير النهائي مع السماح ببقاء المنتج مؤرشفا أو محذوفا.

يتوقف موظف في منتصف إدخال المنتج. يبقى العمل غير المكتمل مسودة ولا يؤثر أبدا في الكتالوج أو المخزون.
