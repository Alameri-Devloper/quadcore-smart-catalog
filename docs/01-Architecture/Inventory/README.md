# Inventory Boundary | حدود المخزون

**Status:** Task 3.17 foundation implemented · **Last Updated:** 2026-08-20 · **Scope:** Inventory domain

## English

Inventory is independent from Catalog and owns Branch-scoped balances, reservations, immutable movements, and atomic transfers. Product is referenced by its Workspace identity and never contains stock state. The V1 unit is the integer `Piece`; quantity changes occur only through named movement use cases. See [Branch Inventory and Pricing](./Branch-Inventory-and-Pricing.md).

## العربية

المخزون مجال مستقل عن الكتالوج، ويملك الأرصدة المقيدة بالفروع والحجوزات والحركات غير القابلة للتعديل والتحويلات الذرية. تتم الإشارة إلى المنتج بهويته داخل مساحة العمل ولا يحتوي المنتج على حالة مخزون. وحدة الإصدار الأول هي `Piece` الصحيحة، ولا تتغير الكمية إلا من خلال حالات استخدام صريحة للحركات. راجع [مخزون الفروع والتسعير](./Branch-Inventory-and-Pricing.md).

