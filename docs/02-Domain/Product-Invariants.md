# Product Invariants | ثوابت المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Product rules

## English

Product identity is immutable and tenant-scoped. Specification values must correspond to resolved definitions. Lifecycle transitions follow approved policies. Images have one main image at most. Inventory is excluded. Calculated readiness is not persisted as source of truth. A valid Draft is preserved even when publication is blocked.

A Draft may omit classification, commercial content, pricing, specifications, and images. Provided references and text must be non-empty. Money uses non-negative integer minor units and normalized currency. Specification Field IDs, Product Image IDs, and image orders are unique; a non-empty image collection has exactly one Main Image. Catalog availability remains separate from lifecycle. Controlled content changes preserve identity, lifecycle, and `CreatedAt`; effective no-ops do not change `UpdatedAt`.

## العربية

هوية المنتج ثابتة ومقيدة بالمستأجر. يجب أن تطابق قيم المواصفات التعريفات المحلولة. تتبع انتقالات الحالة السياسات المعتمدة، ولا توجد أكثر من صورة رئيسية. المخزون خارج المنتج، والجاهزية المحسوبة ليست مصدراً مخزناً للحقيقة، وتحفظ المسودة الصالحة عند تعذر النشر.

يجوز أن تخلو Draft من التصنيف والمحتوى التجاري والتسعير والمواصفات والصور. يجب ألا تكون المراجع والنصوص المقدمة فارغة. يستخدم Money وحدات صغرى صحيحة غير سالبة ورمز عملة normalized. تكون معرفات حقول المواصفات ومعرفات الصور وترتيباتها فريدة، وتحتوي مجموعة الصور غير الفارغة صورة رئيسية واحدة بالضبط. تبقى حالة توفر Catalog منفصلة عن دورة الحياة. تحافظ تغييرات المحتوى المضبوطة على الهوية ودورة الحياة و`CreatedAt`، ولا تغير العملية غير المؤثرة `UpdatedAt`.

