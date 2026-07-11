# ADR-0002: Product Model Specification Templates

# ADR-0002: قوالب مواصفات نموذج المنتج

## Title | العنوان

Product Model Specification Templates

قوالب مواصفات نموذج المنتج

## Status | الحالة

Accepted

معتمد

## Context | السياق

Products in the catalog need dynamic specifications such as CPU, RAM, GPU, SSD, Resolution, Lens, Night Vision, and PoE. These fields vary by product type, but employees should not manually decide which fields belong to each product while creating catalog items.

تحتاج المنتجات في الكتالوج إلى مواصفات ديناميكية مثل المعالج، الذاكرة، كرت الشاشة، وحدة التخزين، الدقة، العدسة، الرؤية الليلية، و PoE. تختلف هذه الحقول حسب نوع المنتج، لكن لا يجب أن يقرر الموظف يدويا الحقول التي تنتمي إلى كل منتج أثناء إنشاء عناصر الكتالوج.

The previous model allowed Specification Field records to belong directly to Product Models. This made field definitions less reusable and risked duplicating shared fields like CPU or RAM for each Product Model.

كان النموذج السابق يسمح لحقول المواصفات بأن ترتبط مباشرة بنماذج المنتجات. هذا جعل تعريفات الحقول أقل قابلية لإعادة الاستخدام وزاد احتمال تكرار حقول مشتركة مثل المعالج أو الذاكرة لكل نموذج منتج.

## Decision | القرار

Every Product Model owns one Specification Template.

كل نموذج منتج يمتلك قالب مواصفات واحدا.

The Specification Template owns Specification Template Fields. Each Specification Template Field references one reusable workspace-level Specification Field.

يمتلك قالب المواصفات حقول قالب المواصفات. ويرتبط كل حقل في قالب المواصفات بحقل مواصفة واحد قابل لإعادة الاستخدام على مستوى مساحة العمل.

The approved relationship is:

العلاقة المعتمدة هي:

```text
Product Model
  -> Specification Template
  -> Specification Template Fields
  -> Specification Fields

Product
  -> Specification Values
  -> Specification Fields
```

Products do not define which fields they use. Products only provide values for fields assigned through the Product Model Specification Template.

لا تحدد المنتجات الحقول التي تستخدمها. المنتجات تقدم القيم فقط للحقول المعينة من خلال قالب مواصفات نموذج المنتج.

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

Specification Field becomes a reusable workspace-level definition and no longer belongs directly to one Product Model.

يصبح حقل المواصفة تعريفا قابلا لإعادة الاستخدام على مستوى مساحة العمل، ولا يعود تابعا مباشرة لنموذج منتج واحد.

Product creation must resolve required fields through the Product Model Specification Template before accepting Specification Values.

يجب أن تعتمد عملية إنشاء المنتج على قالب مواصفات نموذج المنتج لمعرفة الحقول المطلوبة قبل قبول قيم المواصفات.

Changing a Product Model template affects which fields future products must complete for that model.

تغيير قالب نموذج المنتج يؤثر على الحقول التي يجب إكمالها للمنتجات المستقبلية التابعة لذلك النموذج.

## Examples | أمثلة

Lenovo LOQ Gaming Laptop uses one template with CPU, RAM, GPU, and SSD fields.

يستخدم نموذج Lenovo LOQ Gaming Laptop قالبا يحتوي على حقول المعالج، الذاكرة، كرت الشاشة، ووحدة التخزين.

Dell Latitude Business Laptop uses one template with CPU, RAM, and SSD fields.

يستخدم نموذج Dell Latitude Business Laptop قالبا يحتوي على حقول المعالج، الذاكرة، ووحدة التخزين.

Dahua Bullet Camera uses one template with Resolution, Lens, Night Vision, and PoE fields.

يستخدم نموذج Dahua Bullet Camera قالبا يحتوي على حقول الدقة، العدسة، الرؤية الليلية، و PoE.
