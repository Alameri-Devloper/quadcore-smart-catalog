# Product Principles | مبادئ المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Product constitution

## English

- Product First; Product is the Catalog Aggregate Root.
- Strong Domain, Simple Experience.
- Product definitions remain Catalog-owned; Product stores specification values only.
- Product owns lifecycle behavior and identity (`ProductId`, `WorkspaceId`, `CatalogId`); identity is generated and immutable.
- Images belong to Product; binary storage belongs to Infrastructure.
- Quality Score, Ready to Save, and Ready for Customer are calculated, not persisted.
- Inventory and stock never belong inside Product.

## العربية

- المنتج أولاً وهو الجذر التجميعي للكتالوج.
- مجال قوي وتجربة بسيطة.
- تبقى تعريفات المنتج ملكاً للكتالوج، ويخزن المنتج قيم المواصفات فقط.
- يملك المنتج دورة حياته وهويته المولدة والثابتة.
- الصور جزء من المنتج، أما تخزين الملفات فمن مسؤولية البنية التحتية.
- مؤشرات الجودة والجاهزية محسوبة وليست حقولاً مخزنة.
- المخزون والكميات خارج المنتج.

