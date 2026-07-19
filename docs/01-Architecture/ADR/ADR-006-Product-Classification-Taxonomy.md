# ADR-006: Product Classification Taxonomy | تصنيف المنتج المعتمد

**Status:** Accepted
**Last Updated:** 2026-07-19
**Scope:** Catalog classification and V1 template resolution

**Partially supersedes:** [ADR-0002](../../ADR/ADR-0002-Category-Device-Class-Specification-Templates.md) for the V1 template-selection key only.
**يستبدل جزئياً:** [ADR-0002](../../ADR/ADR-0002-Category-Device-Class-Specification-Templates.md) في مفتاح اختيار القالب للإصدار V1 فقط.

## English

### Context

QSC previously used “Product Type” informally for Category in some interfaces and used optional Device Class as part of template selection. This conflated commercial family, functional subtype, intended-use segment, and technical characteristics. The canonical Product Aggregate needs an unambiguous Catalog-owned taxonomy without embedding definition entities.

### Decision

- **Department** is navigation and high-level commercial grouping.
- **Category** is a broad commercial Product family, such as Laptops or CCTV.
- **Product Type** is a functional or structural subtype inside a Category, such as Standard Laptop or Camera.
- **Device Class** is intended use or market segment, such as Gaming or Business.
- **Specifications** are technical characteristics. Bullet, Dome, camera technology, and installation environment are Specification values where configured; they are not Product Types.

Catalog owns Category, Product Type, Device Class, Specification, Template, and Option Set definitions. Product stores only their approved references and selected Specification Values. `ProductTypeId` is optional for Draft and is an opaque Catalog reference, not an enum or definition object.

V1 resolves a Specification Template in this order:

1. Exact `CategoryId + ProductTypeId` template.
2. `CategoryId` default-template fallback.

`DeviceClassId` is not a primary template key in V1. No resolution engine is implemented by this decision.

### Alternatives considered

- Category-only classification: rejected because it cannot express functional subtypes.
- Category plus Device Class as the primary template key: replaced because intended use is not structural Product Type.
- Store-specific Product Type enum: rejected because definitions are configurable Catalog data.
- Full Product Type definition inside Product: rejected because Product owns references, not Catalog definitions.
- Bullet and Dome as Product Types: rejected because they are technical Specification values.

### Consequences

Product classification gains an optional typed `ProductTypeId`. Category, Product Type, Device Class, and Specifications remain separate concepts. Application and persistence adapters will eventually resolve and validate references. Existing Product Entry behavior is unchanged until a separately approved migration task.

### Risks

Legacy UI wording may continue to call Category “product type,” and legacy records do not yet carry `ProductTypeId`. Migration must avoid mapping Device Classes or Specification values into Product Type merely from labels.

### Future implications

Future work may add Product Type definitions, repositories, management UI, Product Entry selection, template resolution, migration, search, and filters. Those capabilities require separate approved tasks and must preserve the V1 fallback order.

## العربية

### السياق

استخدمت QSC سابقاً عبارة «نوع المنتج» بصورة غير رسمية للدلالة على Category في بعض الواجهات، واستخدمت Device Class الاختيارية ضمن اختيار القالب. أدى ذلك إلى خلط العائلة التجارية والنوع الوظيفي والاستخدام المقصود والخصائص التقنية. يحتاج Product المعتمد إلى تصنيف واضح يملكه Catalog دون تضمين كيانات التعريف داخله.

### القرار

- **Department** للتنقل والتجميع التجاري عالي المستوى.
- **Category** عائلة تجارية واسعة مثل Laptops أو CCTV.
- **Product Type** نوع وظيفي أو بنيوي داخل Category، مثل Standard Laptop أو Camera.
- **Device Class** الاستخدام المقصود أو الشريحة السوقية، مثل Gaming أو Business.
- **Specifications** الخصائص التقنية. تكون Bullet وDome وتقنية الكاميرا وبيئة التركيب قيماً للمواصفات عند تهيئتها، وليست Product Types.

يملك Catalog تعريفات Category وProduct Type وDevice Class والمواصفات والقوالب وOption Sets. يخزن Product المراجع المعتمدة وقيم المواصفات المحددة فقط. يكون `ProductTypeId` اختيارياً في Draft ويمثل مرجع Catalog مبهم، وليس enum أو كائن تعريف.

يحل V1 قالب المواصفات بالترتيب التالي:

1. قالب مطابق تماماً لـ `CategoryId + ProductTypeId`.
2. القالب الافتراضي لـ `CategoryId` كمسار احتياطي.

لا يكون `DeviceClassId` مفتاحاً أساسياً للقالب في V1. ولا ينفذ هذا القرار محرك الحل.

### البدائل المدروسة

- Category وحدها: رُفضت لأنها لا تعبر عن الأنواع الوظيفية.
- Category مع Device Class كمفتاح أساسي: استُبدلت لأن الاستخدام المقصود ليس Product Type بنيوياً.
- enum خاص بالمتجر: رُفض لأن التعريفات بيانات Catalog قابلة للتهيئة.
- تعريف Product Type كاملاً داخل Product: رُفض لأن Product يملك المراجع لا التعريفات.
- Bullet وDome كأنواع منتجات: رُفض لأنهما قيم مواصفات تقنية.

### النتائج

يكتسب تصنيف Product مرجع `ProductTypeId` typed واختيارياً. تبقى Category وProduct Type وDevice Class والمواصفات مفاهيم مستقلة. ستحل محولات Application والتخزين المراجع وتتحقق منها مستقبلاً. لا يتغير Product Entry حتى مهمة ترحيل معتمدة مستقلة.

### المخاطر

قد تستمر واجهات قديمة في تسمية Category «نوع المنتج»، ولا تحتوي السجلات القديمة `ProductTypeId`. يجب ألا يحول الترحيل Device Class أو قيم المواصفات إلى Product Type اعتماداً على التسميات وحدها.

### الآثار المستقبلية

قد تضيف المهام المستقبلية تعريفات Product Type ومستودعاتها وواجهة إدارتها واختيارها في Product Entry وحل القوالب والترحيل والبحث والترشيح. تحتاج هذه القدرات مهاماً معتمدة مستقلة وتحافظ على ترتيب fallback في V1.

## Related Documents | الوثائق المرتبطة

- [Product Aggregate](../Catalog/Product-Aggregate.md)
- [Product Specifications](../Catalog/Product-Specifications.md)
- [Catalog Ubiquitous Language](../../02-Domain/Catalog-Ubiquitous-Language.md)
