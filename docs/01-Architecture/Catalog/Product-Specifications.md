# Product Specifications | مواصفات المنتج

**Status:** Active foundation · **Last Updated:** 2026-07-19 · **Scope:** Catalog specifications

## English

Catalog owns reusable Specification Fields, Templates, controlled Option Sets, and Product Type definitions. V1 resolves a template first by exact `CategoryId + ProductTypeId`, then falls back to the `CategoryId` default template. `DeviceClassId` is not a primary V1 template key. Product stores only references and values for resolved fields. The resolution engine, dependent options, suggestions, and context-aware rules remain deferred. See [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

The canonical Product stores immutable pairs of `SpecificationFieldId` and a primitive selected value. Field IDs are unique within one Product. Product does not own field definitions, units, guidance, templates, Option Sets, required-field evaluation, or context-aware rules. An empty value collection is valid for an incomplete Draft.

## العربية

يملك Catalog حقول المواصفات والقوالب وOption Sets المضبوطة وتعريفات Product Type. يحل V1 القالب أولاً بالمطابقة التامة لـ `CategoryId + ProductTypeId`، ثم يستخدم القالب الافتراضي لـ `CategoryId` كمسار احتياطي. لا يكون `DeviceClassId` مفتاحاً أساسياً في V1. يخزن Product المراجع والقيم فقط. يبقى محرك الحل والخيارات التابعة والاقتراحات والقواعد السياقية مؤجلاً. راجع [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

يخزن Product المعتمد أزواجاً ثابتة من `SpecificationFieldId` والقيمة الأولية المحددة، ويكون معرف الحقل فريداً داخل المنتج. لا يملك Product تعريفات الحقول أو الوحدات أو الإرشادات أو القوالب أو Option Sets أو تقييم الحقول المطلوبة أو القواعد السياقية. تكون مجموعة القيم الفارغة صالحة لمسودة غير مكتملة.

## Related Documents | الوثائق المرتبطة

- [Legacy ADR-0002](../../ADR/ADR-0002-Category-Device-Class-Specification-Templates.md)
- [Deferred decisions](../../06-Roadmap/Deferred-Decisions.md)
- [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md)

