# Product Aggregate | تجميع المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Catalog Product boundary

## English

```text
Product
├── Identity
├── Lifecycle
├── Revision
├── Commercial Details
├── Specification Values
├── Images
└── Domain Events
```

Product is the Aggregate Root. Its Value Objects include `ProductIdentity`, `ProductLifecycleState`, `ProductRevision`, `ProductCode`, `Money`, `ProductPricing`, `ProductSpecificationValue`, and Product Image identity/metadata.

The Aggregate implements controlled `Product.create` and `Product.rehydrate` paths, typed `ProductId`, `WorkspaceId`, and `CatalogId`, deterministic caller-supplied timestamps, Draft initialization, composed Product content, and a read-only Domain Event collection. Rehydration requires an explicit persisted Revision and records no event. Legacy Product DTOs, mocks, and Product Entry Draft remain compatibility models and are not the canonical Aggregate.

Task 3.14.2 composes the Aggregate from optional Catalog classification references, optional commercial details and minor-unit pricing, Product-owned specification values, and Product image metadata. An incomplete Draft remains structurally valid; missing content is a future publication concern, not a Draft-preservation failure. Catalog availability is an opaque Catalog configuration reference and is never a Product lifecycle state. Controlled content replacements require an effective time, preserve identity, lifecycle, and `CreatedAt`, and update `UpdatedAt` only when content changes.

Product classification includes an optional immutable `ProductTypeId` reference. Product Type is the functional or structural subtype inside Category; it remains independent from Device Class and Specification Values. Catalog owns Product Type definitions, while Product stores only the opaque identifier. See [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

Revision begins at 0 and increments once for every effective content mutation and successful lifecycle transition. No-op and failed operations do not increment it. `ProductPublicationPolicy` evaluates supplied immutable requirements and returns an immutable decision bound to Product ID and current Revision. Draft→Published and Archived→Published require a current approved decision; Published→Archived is controlled directly by the Aggregate. Each successful transition records exactly one corresponding lifecycle event. See [ADR-007](../ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md).

Optional `ProductCode` is canonicalized by trimming surrounding whitespace and applying uppercase. It remains optional for Draft and may be required by supplied publication requirements. The canonical `ProductRepository` port saves the complete Aggregate through distinct create and update operations. Retrieval and uniqueness are Workspace-scoped; Product Code uniqueness is Workspace-wide and lifecycle-independent. Update compares the stored Revision with the expected persisted Revision observed at load time. Repository methods do not consume Domain Events. See [ADR-008](../ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md).

### Version scope and Workspace boundary

V1 is Single-Workspace and Multi-Branch. Exactly one active `WorkspaceId` is supplied automatically from trusted Application context; it remains part of Product Identity as the future-ready ownership boundary and is never entered or selected by an end user. V1 has no Workspace selector, company switching, tenant provisioning, multi-company user membership, or cross-tenant administration. These operational Multi-Tenant capabilities belong to V2, which is Multi-Workspace and Multi-Tenant.

A Branch is not a Workspace. Product belongs to the Workspace Catalog, so `BranchId` is not part of Product Identity. Future Branch- and Warehouse-specific quantities belong to the Inventory Domain and must not be stored in Product. Task 3.14.1-R1 documents this boundary only; it implements no Workspace, Branch, Warehouse, or tenant operation.

Outside Product: inventory quantity, warehouses, stock movements, persisted Quality Score, persisted Ready for Customer, specification and Option Set definitions, file-storage implementation, React state, and repository implementation.

### Smart Save archive reason
An Archived Product has exactly one Domain-owned `ProductArchiveReason`; Draft and Published Products have none. Controlled archive sets the reason and restore clears it.

## العربية

### سبب الأرشفة في الحفظ الذكي
للمنتج المؤرشف سبب واحد يملكه المجال، بينما لا تحمل المسودة والمنتج المنشور سبباً. تضبط الأرشفة السبب وتمسحه الاستعادة عبر عمليات مضبوطة.

المنتج هو Aggregate Root ويضم الهوية ودورة الحياة والمراجعة والتفاصيل التجارية وقيم المواصفات والصور وأحداث المجال. تشمل كائناته القيمية `ProductIdentity` و`ProductLifecycleState` و`ProductRevision` و`ProductCode` والمال والتسعير وقيمة المواصفة وهوية الصورة وبياناتها. تبقى الكميات والمستودعات وحركات المخزون ومؤشرات الجاهزية المحسوبة والتعريفات وتخزين الملفات وحالة React وتنفيذ المستودع خارج المنتج.

ينفذ Aggregate مساري `Product.create` و`Product.rehydrate` المضبوطين، والمعرفات typed، والطوابع الزمنية الحتمية التي يمررها المستدعي، وحالة Draft الأولية، ومحتوى Product المركب، ومجموعة أحداث مجال للقراءة فقط. تتطلب إعادة البناء مراجعة مخزنة صريحة ولا تسجل حدثاً. وتظل DTOs والبيانات الوهمية وProduct Entry Draft نماذج توافق وليست التجميع المعتمد.

تركب Task 3.14.2 التجميع من مراجع تصنيف Catalog الاختيارية، والتفاصيل التجارية والتسعير بالوحدات النقدية الصغرى، وقيم المواصفات المملوكة للمنتج، وبيانات صور المنتج. تبقى المسودة غير المكتملة صالحة بنيوياً؛ فغياب المحتوى يتعلق بالنشر مستقبلاً ولا يمنع حفظ Draft. تمثل حالة التوفر مرجع تهيئة مبهم من Catalog وليست حالة في دورة حياة Product. تتطلب استبدالات المحتوى المضبوطة وقتاً فعالاً، وتحافظ على الهوية ودورة الحياة و`CreatedAt`، ولا تحدث `UpdatedAt` إلا عند تغير المحتوى.

يتضمن تصنيف Product مرجع `ProductTypeId` ثابتاً واختيارياً. يمثل Product Type النوع الوظيفي أو البنيوي داخل Category، ويبقى مستقلاً عن Device Class وقيم المواصفات. يملك Catalog تعريفات Product Type، بينما يخزن Product المعرف المبهم فقط. راجع [ADR-006](../ADR/ADR-006-Product-Classification-Taxonomy.md).

تبدأ المراجعة من 0 وتزيد مرة واحدة مع كل تغيير محتوى مؤثر وكل انتقال ناجح في دورة الحياة، ولا تزيدها العمليات غير المؤثرة أو الفاشلة. تقيّم `ProductPublicationPolicy` المتطلبات الثابتة الممررة وتعيد قراراً ثابتاً مرتبطاً بمعرف Product ومراجعته الحالية. يتطلب الانتقال من Draft إلى Published ومن Archived إلى Published قراراً حالياً معتمداً، بينما يضبط Aggregate الانتقال من Published إلى Archived مباشرة. يسجل كل انتقال ناجح حدث دورة حياة واحداً مطابقاً. راجع [ADR-007](../ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md).

يُعتمد `ProductCode` الاختياري بإزالة المسافات المحيطة وتطبيق الأحرف الكبيرة. يبقى اختيارياً في Draft وقد تتطلبه متطلبات النشر الممررة. يحفظ منفذ `ProductRepository` المعتمد Aggregate كاملاً عبر عمليتي إنشاء وتحديث منفصلتين. يتقيد الاسترجاع والتفرد بـWorkspace، ويكون تفرد Product Code عبر Workspace كاملاً ومستقلاً عن دورة الحياة. يقارن التحديث المراجعة المخزنة بالمراجعة المتوقعة التي شوهدت عند التحميل. لا تستهلك طرق Repository أحداث Domain. راجع [ADR-008](../ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md).

### نطاق الإصدارات وحد Workspace

الإصدار V1 هو Single-Workspace وMulti-Branch. يمرر سياق Application الموثوق `WorkspaceId` النشط الوحيد تلقائياً، ويبقى المعرف جزءاً من هوية المنتج كحد ملكية جاهز للمستقبل ولا يدخله المستخدم أو يختاره. لا يحتوي V1 على محدد Workspace أو تبديل الشركات أو تهيئة المستأجرين أو عضوية المستخدم في شركات متعددة أو إدارة عابرة للمستأجرين. تنتمي قدرات Multi-Tenant التشغيلية هذه إلى V2، وهو Multi-Workspace وMulti-Tenant.

الفرع ليس Workspace. ينتمي المنتج إلى كتالوج Workspace، ولذلك لا يدخل `BranchId` في هوية المنتج. تنتمي كميات الفروع والمستودعات المستقبلية إلى مجال Inventory ولا تخزن داخل Product. توثق Task 3.14.1-R1 هذا الحد فقط ولا تنفذ أي سلوك تشغيلي لمساحة العمل أو الفرع أو المستودع أو المستأجر.

## Related Documents | الوثائق المرتبطة

- [ADR-002](../ADR/ADR-002-Product-Aggregate.md)
- [Specifications](Product-Specifications.md)
- [Images](Product-Images.md)
- [ADR-006: Product Classification Taxonomy](../ADR/ADR-006-Product-Classification-Taxonomy.md)
- [ADR-007: Product Revision and Publication Decision Integrity](../ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)
- [ADR-008: Product Repository Contract and Optimistic Concurrency](../ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md)

