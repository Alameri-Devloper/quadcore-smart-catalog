# Product Entry Future Enhancements

## English

## Current Version 1 Foundation

The basic Product Identity Card and Product Entry Decision Summary are implemented as current Version 1 work. They progressively present confirmed Workflow decisions, Specification completion, valid Commercial values, and existing Draft status through a read-only Product Entry view model.

## Future Work

The following remain future capabilities and are not implemented by the Product Identity Card:

- A global cross-workflow Product Entry summary panel outside the current entry shell.
- Advanced dynamic Wizard or page titles.
- Final Product Review and submission.
- Search-result card reuse through a smaller context-specific presentation.
- Customer-facing WhatsApp previews with disclosure rules that exclude wholesale and Draft information.
- Approved background-removal adapter, durable Original/Processed upload, and permanent image storage. Basic local image entry and preview are current Version 1 work.
- Provider-independent background removal and pure `#FFFFFF` white composition.
- Configurable safe-area padding and optional natural-shadow preservation or removal.
- Employee-reviewed 1:1 square composition without destructive Original cropping.
- Image-purpose classification for Catalog, detail, ports, packaging, lifestyle, installation, diagram, and specification images.
- Camera capture, Cloud upload, EXIF removal, image optimization, thumbnail generation, and stronger duplicate-image detection.
- Product persistence.
- AI, OCR, Excel Import, Sales Guide, and Sales Intelligence generation.

Future Review may reuse the Product Identity view-model concepts, while Search and WhatsApp should use dedicated adapters and appropriately smaller components. No future consumer may turn the read-only card into a second Workflow state store or expose internal employee-only information in customer-facing channels.

### Image Processing Future Direction — التوجه المستقبلي لمعالجة الصور

تشمل الأعمال المستقبلية إزالة الخلفية بصورة مستقلة عن المزود، والتركيب على خلفية بيضاء نقية `#FFFFFF`، ومساحة آمنة قابلة للضبط، والحفاظ الاختياري على الظل الطبيعي أو إزالته، وتكويناً مربعاً 1:1 يراجعه الموظف دون قص الأصل بصورة مدمرة. وتشمل أيضاً تصنيف غرض الصورة، والتقاط الكاميرا، والرفع السحابي، وإزالة EXIF، وتحسين الصور، وإنشاء الصور المصغرة، والكشف الأقوى عن الصور المكررة. ولا يعتمد أي من ذلك على مزود بعينه، ولا يُنفذ في المهمة الحالية.

---

## العربية

## أساس الإصدار الأول الحالي

تم تنفيذ بطاقة هوية المنتج الأساسية وملخص قرارات إدخال المنتج كجزء حالي من الإصدار الأول. وتعرض البطاقة تدريجياً قرارات سير العمل المؤكدة واكتمال المواصفات والقيم التجارية الصالحة وحالة المسودة الموجودة من خلال نموذج عرض للقراءة فقط خاص بإدخال المنتج.

## العمل المستقبلي

تبقى القدرات التالية أعمالاً مستقبلية ولا تنفذها بطاقة هوية المنتج:

- لوحة ملخص عامة لإدخال المنتج خارج غلاف الإدخال الحالي وعبر مسارات العمل.
- عناوين ديناميكية متقدمة للمعالج أو الصفحة.
- مراجعة المنتج النهائية وإرساله.
- إعادة الاستخدام في بطاقات نتائج البحث من خلال عرض أصغر ومخصص للسياق.
- معاينات WhatsApp موجهة للعملاء مع قواعد إفصاح تستبعد سعر الجملة ومعلومات المسودة.
- محول معتمد لإزالة الخلفية ورفع دائم للنسختين الأصلية والمعالجة وتخزين دائم للصور. أصبح الإدخال المحلي الأساسي للصور ومعاينتها من عمل الإصدار الأول الحالي.
- حفظ المنتج.
- الذكاء الاصطناعي وOCR واستيراد Excel ودليل المبيعات وتوليد Sales Intelligence.

يمكن للمراجعة المستقبلية إعادة استخدام مفاهيم نموذج عرض هوية المنتج، بينما يجب أن يستخدم البحث وWhatsApp محولات مخصصة ومكونات أصغر مناسبة. ولا يجوز لأي مستهلك مستقبلي تحويل البطاقة المخصصة للقراءة فقط إلى مخزن ثان لحالة سير العمل أو كشف معلومات الموظفين الداخلية في القنوات الموجهة للعملاء.
# Review Evolution | تطور المراجعة

## English

Future approved work may add Workspace-configurable Quality policies, Category-specific scoring, Sales Intelligence readiness contribution, automated image-quality checks, AI-assisted customer-presentation assessment, Product comparison quality, manager approval workflows, audit history, and Review comments. These capabilities require separate architecture and governance decisions and must not replace confirmed Product validation or employee control.

## العربية

قد يضيف العمل المستقبلي المعتمد سياسات جودة قابلة للإعداد لكل مساحة عمل، ودرجات خاصة بالتصنيفات، ومساهمة جاهزية ذكاء المبيعات، وفحصاً آلياً لجودة الصور، وتقييماً مساعداً بالذكاء الاصطناعي لجاهزية العرض للعميل، وجودة مقارنة المنتجات، ومسارات اعتماد المدير، وسجل التدقيق، وتعليقات المراجعة. تتطلب هذه القدرات قرارات منفصلة للمعمارية والحوكمة، ولا يجوز أن تستبدل تحقق المنتج المؤكد أو تحكم الموظف.
# Guided Entry Future Boundaries | حدود الإدخال الموجّه المستقبلية

## English

Future separately approved work may add Product Model creation and lookup, dependent Option Sets such as Lens Type limiting Lens Size, Catalog-owned context-aware rules, dynamic visibility and required status, multiple active Drafts, temporary Cloud Draft images, Workspace-managed and Arabic Specification guidance, Camera Purpose taxonomy, barcode scanning, and Knowledge Engine relationships.

Context-aware rules may eventually show, hide, require, make optional, change an Option Set, limit options, auto-fill, suggest, disable, or provide context help. For example, IP may prioritize PoE/ONVIF/network fields while Analog HD may prioritize CVI/TVI/AHD. Rules must belong to Catalog metadata; hidden inactive fields must not validate or affect Quality Score. This task does not introduce a rules engine or dependent-option architecture.

## العربية

قد يضيف عمل مستقبلي معتمد بصورة منفصلة إنشاء نماذج المنتجات والبحث عنها، ومجموعات الخيارات التابعة مثل تقييد حجم العدسة بحسب نوعها، وقواعد سياقية يملكها الكتالوج، والظهور والمتطلبات الديناميكية، ومسودات متعددة، وصور مسودات سحابية مؤقتة، وإرشادات مواصفات تديرها مساحة العمل وباللغة العربية، وتصنيف غرض الكاميرا، ومسح الباركود، وعلاقات محرك المعرفة.

يمكن للقواعد السياقية مستقبلاً إظهار الحقول أو إخفاءها أو جعلها مطلوبة أو اختيارية أو تغيير مجموعة الخيارات أو تقييدها أو تعبئة قيمة أو اقتراحها أو تعطيل الحقل أو تقديم مساعدة سياقية. يجب أن تنتمي القواعد إلى بيانات الكتالوج، وألا تولد الحقول المخفية أخطاء أو تؤثر في درجة الجودة. لا تنفذ هذه المهمة محرك قواعد أو بنية خيارات تابعة.
