# ADR-0002: Category and Device Class Specification Templates

> **Partial supersession | استبدال جزئي**
>
> The V1 template-selection key in this historical decision is superseded by [ADR-006: Product Classification Taxonomy](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md). Its reusable Specification Field and Template rationale remains accepted.
>
> استبدل [ADR-006: تصنيف المنتج المعتمد](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md) مفتاح اختيار القالب في V1 الوارد في هذا القرار التاريخي. وتبقى أسباب حقول المواصفات والقوالب القابلة لإعادة الاستخدام معتمدة.

# ADR-0002: قوالب المواصفات حسب التصنيف وفئة الجهاز

## Title | العنوان

Category and Device Class Specification Templates

قوالب المواصفات حسب التصنيف وفئة الجهاز

## Status | الحالة

Accepted; V1 template-selection key superseded by ADR-006.

معتمد؛ استبدل ADR-006 مفتاح اختيار القالب في V1.

## Context | السياق

Catalog products need dynamic specifications, but the required fields depend on the product category and sometimes on a more specific device class. Laptop products may need classes such as Gaming, Business, Personal, or Workstation. CCTV camera products do not need a Device Class because the category is already specific enough.

تحتاج منتجات الكتالوج إلى مواصفات ديناميكية، لكن الحقول المطلوبة تعتمد على التصنيف وأحيانا على فئة جهاز أكثر تحديدا. منتجات اللابتوب قد تحتاج إلى فئات مثل الألعاب، الأعمال، الشخصي، أو محطة العمل. كاميرات CCTV لا تحتاج إلى فئة جهاز لأن التصنيف واضح بما يكفي.

Products must not decide which fields they use. Employees should only enter values for the fields that the system resolves from the selected category and optional device class.

لا يجب أن تحدد المنتجات الحقول التي تستخدمها. يجب أن يدخل الموظفون القيم فقط للحقول التي يحددها النظام من التصنيف وفئة الجهاز الاختيارية.

## Decision | القرار

Category and optional Device Class determine the Specification Template.

التصنيف وفئة الجهاز الاختيارية يحددان قالب المواصفات.

Device Class is optional for categories where it is not relevant.

فئة الجهاز اختيارية في التصنيفات التي لا تحتاج إليها.

Product Models reference Category, Brand, and optional Device Class.

نماذج المنتجات ترتبط بالتصنيف والعلامة التجارية وفئة الجهاز الاختيارية.

Products only provide Specification Values for fields defined by the resolved template.

المنتجات تقدم قيم المواصفات فقط للحقول المعرفة في القالب الذي يتم تحديده.

The accepted relationship is:

العلاقة المعتمدة هي:

```text
Category + optional Device Class
  -> Specification Template
  -> Template Fields
  -> Reusable Specification Fields

Product Model
  -> Category
  -> optional Device Class
  -> Brand

Product
  -> Product Model
  -> Specification Values
```

## Reasons | الأسباب

- Reduce employee effort when creating products.
- Prevent missing specifications.
- Standardize catalog data across similar products.
- Support laptops, cameras, printers, networking devices, and future product types.
- Keep the interface simple while preserving system flexibility.

- تقليل جهد الموظف عند إنشاء المنتجات.
- منع نقص المواصفات المطلوبة.
- توحيد بيانات الكتالوج بين المنتجات المتشابهة.
- دعم اللابتوبات، الكاميرات، الطابعات، أجهزة الشبكات، وأنواع المنتجات المستقبلية.
- إبقاء الواجهة بسيطة مع الحفاظ على مرونة النظام.

## Consequences | النتائج

Specification Fields are reusable workspace-level definitions.

حقول المواصفات تعريفات قابلة لإعادة الاستخدام على مستوى مساحة العمل.

Specification Templates are selected by Category and optional Device Class, not directly by Product Model.

يتم اختيار قوالب المواصفات حسب التصنيف وفئة الجهاز الاختيارية، وليس مباشرة حسب نموذج المنتج.

Product creation must resolve the template before accepting Specification Values.

يجب على عملية إنشاء المنتج تحديد القالب قبل قبول قيم المواصفات.

The UI can skip Device Class for categories where it is not applicable.

يمكن للواجهة تخطي فئة الجهاز في التصنيفات التي لا تحتاج إليها.

## Examples | أمثلة

Laptops + Gaming requires CPU, RAM, Storage, GPU, Screen Size, and Operating System.

لابتوبات + ألعاب تتطلب المعالج، الذاكرة، التخزين، كرت الشاشة، حجم الشاشة، ونظام التشغيل.

Laptops + Business requires CPU, RAM, Storage, Screen Size, and Operating System, with optional GPU, Touch Screen, and Convertible 360.

لابتوبات + أعمال تتطلب المعالج، الذاكرة، التخزين، حجم الشاشة، ونظام التشغيل، مع كرت الشاشة، شاشة اللمس، والتحويل 360 كخيارات اختيارية.

CCTV Cameras without Device Class requires Resolution and Lens, with optional Night Vision and PoE.

كاميرات CCTV بدون فئة جهاز تتطلب الدقة والعدسة، مع الرؤية الليلية و PoE كخيارات اختيارية.
