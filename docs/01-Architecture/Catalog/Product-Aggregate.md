# Product Aggregate | تجميع المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Catalog Product boundary

## English

```text
Product
├── Identity
├── Lifecycle
├── Commercial Details
├── Specification Values
├── Images
└── Domain Events
```

Product is the Aggregate Root. Intended Value Objects include `ProductIdentity`, `ProductLifecycleState`, `Money`, `ProductPricing`, `ProductSpecificationValue`, and Product Image identity/metadata; exact implementations require later approval.

Outside Product: inventory quantity, warehouses, stock movements, persisted Quality Score, persisted Ready for Customer, specification and Option Set definitions, file-storage implementation, React state, and repository implementation.

## العربية

المنتج هو Aggregate Root ويضم الهوية ودورة الحياة والتفاصيل التجارية وقيم المواصفات والصور وأحداث المجال. الكائنات القيمية المقصودة تشمل الهوية والحالة والمال والتسعير وقيمة المواصفة وهوية الصورة وبياناتها، دون تثبيت تفاصيل تنفيذ غير معتمدة. تبقى الكميات والمستودعات وحركات المخزون ومؤشرات الجاهزية المحسوبة والتعريفات وتخزين الملفات وحالة React وتنفيذ المستودع خارج المنتج.

## Related Documents | الوثائق المرتبطة

- [ADR-002](../ADR/ADR-002-Product-Aggregate.md)
- [Specifications](Product-Specifications.md)
- [Images](Product-Images.md)

