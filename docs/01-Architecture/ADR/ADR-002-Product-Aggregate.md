# ADR-002: Product Aggregate | تجميع المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

**Context:** Product data needs one consistency boundary without absorbing unrelated domains.
**Decision:** Product is Catalog Aggregate Root and owns identity, lifecycle, commercial details, specification values, image metadata, and domain events. Inventory, definitions, storage, UI state, and persistence implementations stay outside.
**Alternatives considered:** anemic Product record; aggregate including inventory; Product Model as root.
**Consequences:** mutations pass through Product and boundaries stay explicit.
**Risks:** an oversized aggregate if future features are added without boundary review.
**Future implications:** approved Value Objects may refine internals without changing ownership.

## العربية

**السياق:** تحتاج بيانات المنتج إلى حد اتساق واحد دون ابتلاع المجالات الأخرى.
**القرار:** المنتج هو Aggregate Root للكتالوج ويملك الهوية ودورة الحياة والتفاصيل التجارية وقيم المواصفات وبيانات الصور والأحداث، وتبقى التعريفات والمخزون والتخزين والواجهة والتنفيذ خارجه.
**البدائل:** سجل منتج بلا سلوك، أو تجميع يضم المخزون، أو جعل Product Model جذراً.
**النتائج:** تمر التغييرات عبر المنتج وتظل الحدود واضحة.
**المخاطر:** تضخم التجميع إذا أضيفت قدرات بلا مراجعة.
**المستقبل:** يمكن للكائنات القيمية المعتمدة تحسين الداخل دون تغيير الملكية.

