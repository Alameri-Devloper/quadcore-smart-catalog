# Product Specifications | مواصفات المنتج

**Status:** Active foundation · **Last Updated:** 2026-07-19 · **Scope:** Catalog specifications

## English

Catalog owns reusable Specification Fields, Templates, and controlled Option Sets. Context such as Category and optional Device Class resolves a template; Product stores only values for resolved fields. Dependent options, suggestions, and context-aware rules remain deferred.

The canonical Product stores immutable pairs of `SpecificationFieldId` and a primitive selected value. Field IDs are unique within one Product. Product does not own field definitions, units, guidance, templates, Option Sets, required-field evaluation, or context-aware rules. An empty value collection is valid for an incomplete Draft.

## العربية

يملك الكتالوج حقول المواصفات والقوالب ومجموعات الخيارات المضبوطة. يحل السياق، مثل التصنيف وفئة الجهاز الاختيارية، القالب المناسب، ويخزن المنتج القيم فقط. الخيارات التابعة والاقتراحات والقواعد السياقية مؤجلة.

يخزن Product المعتمد أزواجاً ثابتة من `SpecificationFieldId` والقيمة الأولية المحددة، ويكون معرف الحقل فريداً داخل المنتج. لا يملك Product تعريفات الحقول أو الوحدات أو الإرشادات أو القوالب أو Option Sets أو تقييم الحقول المطلوبة أو القواعد السياقية. تكون مجموعة القيم الفارغة صالحة لمسودة غير مكتملة.

## Related Documents | الوثائق المرتبطة

- [Legacy ADR-0002](../../ADR/ADR-0002-Category-Device-Class-Specification-Templates.md)
- [Deferred decisions](../../06-Roadmap/Deferred-Decisions.md)

