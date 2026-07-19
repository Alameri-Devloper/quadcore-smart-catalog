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

The Task 3.14.1 foundation implements controlled `Product.create` and `Product.rehydrate` paths, typed `ProductId`, `WorkspaceId`, and `CatalogId`, deterministic timestamps supplied by callers, Draft initialization, and a lightweight read-only Domain Event collection containing `ProductCreated`. Commercial details, specification values, and images remain outside this initial code foundation until their approved Aggregate integration tasks. Legacy Product DTOs, mocks, and Product Entry Draft remain compatibility models and are not the canonical Aggregate.

Task 3.14.2 composes the Aggregate from optional Catalog classification references, optional commercial details and minor-unit pricing, Product-owned specification values, and Product image metadata. An incomplete Draft remains structurally valid; missing content is a future publication concern, not a Draft-preservation failure. Catalog availability is an opaque Catalog configuration reference and is never a Product lifecycle state. Controlled content replacements require an effective time, preserve identity, lifecycle, and `CreatedAt`, and update `UpdatedAt` only when content changes.

Product classification includes an optional immutable `ProductTypeId` reference. Product Type is the functional or structural subtype inside Category; it remains independent from Device Class and Specification Values. Catalog owns Product Type definitions, while Product stores only the opaque identifier. See [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

### Version scope and Workspace boundary

V1 is Single-Workspace and Multi-Branch. Exactly one active `WorkspaceId` is supplied automatically from trusted Application context; it remains part of Product Identity as the future-ready ownership boundary and is never entered or selected by an end user. V1 has no Workspace selector, company switching, tenant provisioning, multi-company user membership, or cross-tenant administration. These operational Multi-Tenant capabilities belong to V2, which is Multi-Workspace and Multi-Tenant.

A Branch is not a Workspace. Product belongs to the Workspace Catalog, so `BranchId` is not part of Product Identity. Future Branch- and Warehouse-specific quantities belong to the Inventory Domain and must not be stored in Product. Task 3.14.1-R1 documents this boundary only; it implements no Workspace, Branch, Warehouse, or tenant operation.

Outside Product: inventory quantity, warehouses, stock movements, persisted Quality Score, persisted Ready for Customer, specification and Option Set definitions, file-storage implementation, React state, and repository implementation.

## العربية

المنتج هو Aggregate Root ويضم الهوية ودورة الحياة والتفاصيل التجارية وقيم المواصفات والصور وأحداث المجال. الكائنات القيمية المقصودة تشمل الهوية والحالة والمال والتسعير وقيمة المواصفة وهوية الصورة وبياناتها، دون تثبيت تفاصيل تنفيذ غير معتمدة. تبقى الكميات والمستودعات وحركات المخزون ومؤشرات الجاهزية المحسوبة والتعريفات وتخزين الملفات وحالة React وتنفيذ المستودع خارج المنتج.

ينفذ أساس Task 3.14.1 مساري `Product.create` و`Product.rehydrate` المضبوطين، والمعرفات typed، والطوابع الزمنية التي يمررها المستدعي لضمان الحتمية، وحالة Draft الأولية، ومجموعة أحداث مجال للقراءة فقط تحتوي `ProductCreated`. تبقى التفاصيل التجارية وقيم المواصفات والصور خارج أساس الشفرة الأولي حتى مهام دمجها المعتمدة. وتظل DTOs والبيانات الوهمية وProduct Entry Draft نماذج توافق وليست التجميع المعتمد.

تركب Task 3.14.2 التجميع من مراجع تصنيف Catalog الاختيارية، والتفاصيل التجارية والتسعير بالوحدات النقدية الصغرى، وقيم المواصفات المملوكة للمنتج، وبيانات صور المنتج. تبقى المسودة غير المكتملة صالحة بنيوياً؛ فغياب المحتوى يتعلق بالنشر مستقبلاً ولا يمنع حفظ Draft. تمثل حالة التوفر مرجع تهيئة مبهم من Catalog وليست حالة في دورة حياة Product. تتطلب استبدالات المحتوى المضبوطة وقتاً فعالاً، وتحافظ على الهوية ودورة الحياة و`CreatedAt`، ولا تحدث `UpdatedAt` إلا عند تغير المحتوى.

يتضمن تصنيف Product مرجع `ProductTypeId` ثابتاً واختيارياً. يمثل Product Type النوع الوظيفي أو البنيوي داخل Category، ويبقى مستقلاً عن Device Class وقيم المواصفات. يملك Catalog تعريفات Product Type، بينما يخزن Product المعرف المبهم فقط. راجع [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

### نطاق الإصدارات وحد Workspace

الإصدار V1 هو Single-Workspace وMulti-Branch. يمرر سياق Application الموثوق `WorkspaceId` النشط الوحيد تلقائياً، ويبقى المعرف جزءاً من هوية المنتج كحد ملكية جاهز للمستقبل ولا يدخله المستخدم أو يختاره. لا يحتوي V1 على محدد Workspace أو تبديل الشركات أو تهيئة المستأجرين أو عضوية المستخدم في شركات متعددة أو إدارة عابرة للمستأجرين. تنتمي قدرات Multi-Tenant التشغيلية هذه إلى V2، وهو Multi-Workspace وMulti-Tenant.

الفرع ليس Workspace. ينتمي المنتج إلى كتالوج Workspace، ولذلك لا يدخل `BranchId` في هوية المنتج. تنتمي كميات الفروع والمستودعات المستقبلية إلى مجال Inventory ولا تخزن داخل Product. توثق Task 3.14.1-R1 هذا الحد فقط ولا تنفذ أي سلوك تشغيلي لمساحة العمل أو الفرع أو المستودع أو المستأجر.

## Related Documents | الوثائق المرتبطة

- [ADR-002](../ADR/ADR-002-Product-Aggregate.md)
- [Specifications](Product-Specifications.md)
- [Images](Product-Images.md)
- [ADR-006: Product Classification Taxonomy](../ADR/ADR-006-Product-Classification-Taxonomy.md)

