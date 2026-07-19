# ADR-005: Catalog and Inventory Boundary | الحد بين الكتالوج والمخزون

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

**Context:** Product description and stock availability change for different reasons and at different rates.
**Decision:** Catalog owns what is sold; Inventory separately owns quantities, warehouses, and movements. Product contains no stock state.
**Alternatives considered:** quantity on Product; Inventory as a Catalog submodule; shared persistence model.
**Consequences:** independent evolution and explicit references between domains.
**Risks:** read models may require careful composition and consistency expectations.
**Future implications:** Multi-Warehouse and reservations need Inventory ADRs.

## العربية

**السياق:** تتغير أوصاف المنتجات وتوفر المخزون لأسباب وبسرعات مختلفة.
**القرار:** يملك الكتالوج ما نبيعه، ويملك المخزون مستقلاً الكميات والمستودعات والحركات، ولا يخزن المنتج حالة مخزون.
**البدائل:** كمية داخل المنتج، أو المخزون كوحدة فرعية، أو نموذج تخزين مشترك.
**النتائج:** تطور مستقل ومراجع واضحة بين المجالين.
**المخاطر:** تحتاج نماذج القراءة المركبة إلى توقعات اتساق دقيقة.
**المستقبل:** تعدد المستودعات والحجوزات يحتاج قرارات للمخزون.

