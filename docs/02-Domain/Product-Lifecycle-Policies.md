# Product Lifecycle Policies | سياسات دورة حياة المنتج

**Status:** Accepted architecture · **Last Updated:** 2026-07-19 · **Scope:** Policy responsibilities

## English

`ProductSavePolicy` determines whether work can be preserved. `ProductPublicationPolicy` checks customer readiness and business rules. `ProductArchivePolicy` authorizes Published→Archived. `ProductRestorePolicy` authorizes Archived→Published. Policies belong to Domain and receive explicit context; UI renders results but never selects lifecycle.

## العربية

تحدد `ProductSavePolicy` إمكان حفظ العمل، وتتحقق `ProductPublicationPolicy` من جاهزية العميل وقواعد العمل، وتجيز سياستا الأرشفة والاستعادة الانتقالين الخاصين بهما. تنتمي السياسات إلى Domain وتتلقى سياقاً صريحاً؛ تعرض الواجهة النتائج ولا تختار الحالة.

