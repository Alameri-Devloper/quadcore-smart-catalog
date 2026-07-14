# ADR-0006: Impact Analysis and Safe Reconciliation

## English

## Title

Impact Analysis and Safe Reconciliation

## Status

Accepted; full impact analysis is planned for future implementation.

## Context

Category, optional Device Class, Brand, and Product Model determine important Product relationships and the applicable Specification Template. Changing one of these values may make existing selections or Specification Values invalid.

Silently removing data would hide important consequences from employees. Preserving every old value would allow Products to violate the newly resolved template. QSC needs a transparent process that preserves compatible work while preventing invalid Product data.

## Decision

Changing an important Product attribute must never silently discard data. Important attributes include:

- Category.
- Device Class.
- Brand.
- Product Model.

Before a Product is saved, the system performs Impact Analysis against confirmed QSC configuration. It identifies:

- Fields that will become invalid or unavailable.
- Specification Values that must be removed.
- Values that remain compatible and will be preserved.
- Related selections that must be cleared or changed.
- Warnings and required employee actions.

The impact must be presented clearly before destructive reconciliation is confirmed. Safe reconciliation removes only incompatible values and preserves compatible values.

After reconciliation, Product validation runs against the newly resolved Specification Template. A Product cannot be saved as a valid Product until it satisfies that template. Incomplete work may remain a Draft under the Product lifecycle rules.

Reconciliation is deterministic domain behavior. AI may explain an impact in the future, but AI must not decide which confirmed fields are compatible.

## Reasons

- Prevent silent data loss.
- Preserve employee work whenever it remains valid.
- Keep Products consistent with the current Specification Template.
- Make automatic behavior understandable and reviewable.
- Provide one integrity rule for Standard, Context, Batch, Draft, Excel, and assisted entry modes.
- Separate compatibility rules from UI components.

## Consequences

- Attribute changes require comparison between the previous and newly resolved context.
- Impact Analysis must be tenant- and workspace-aware.
- The UI must explain preserved values, removed values, warnings, and required fixes.
- Reconciliation must not remove a value merely because its step became hidden; incompatibility must come from confirmed domain rules.
- Validation completion may be invalidated after a context change.
- Saving is blocked until required fields in the new template have valid values.
- Drafts may preserve incomplete post-change work without affecting active Catalog or Inventory data.
- Detailed impact models, confirmation UX, service boundaries, audit behavior, and persistence require separate implementation design.
- This ADR does not implement Product saving or modify current data.

## Examples

An employee changes a Laptop from Gaming to Business Device Class. CPU, RAM, and Storage remain because they are compatible. A Gaming-only GPU value is listed for removal. Newly required Business fields must be completed before save.

An employee changes Category from Laptops to CCTV Cameras. Impact Analysis shows that Laptop specification fields will become invalid, preserves any values mapped to compatible reusable fields, and prevents save until the CCTV Camera template is satisfied.

An employee selects a different Product Model with the same Brand and compatible template. Shared valid values remain; only incompatible Product Model-dependent values are cleared.

---

## العربية

## العنوان

تحليل التأثير والتنسيق الآمن

## الحالة

معتمد؛ التنفيذ الكامل لتحليل التأثير مخطط للمستقبل.

## السياق

يحدد التصنيف وفئة الجهاز الاختيارية والعلامة التجارية ونموذج المنتج علاقات مهمة للمنتج وقالب المواصفات المنطبق. وقد يؤدي تغيير إحدى هذه القيم إلى جعل اختيارات أو قيم مواصفات حالية غير صالحة.

يخفي حذف البيانات بصمت نتائج مهمة عن الموظفين. كما أن الحفاظ على كل قيمة قديمة يسمح للمنتجات بمخالفة القالب المحدد حديثا. تحتاج QSC إلى عملية واضحة تحافظ على العمل المتوافق وتمنع بيانات المنتج غير الصالحة.

## القرار

يجب ألا يؤدي تغيير سمة مهمة للمنتج إلى تجاهل البيانات بصمت أبدا. وتشمل السمات المهمة:

- التصنيف.
- فئة الجهاز.
- العلامة التجارية.
- نموذج المنتج.

قبل حفظ المنتج، ينفذ النظام تحليل التأثير مقابل إعدادات QSC المؤكدة. ويحدد:

- الحقول التي ستصبح غير صالحة أو غير متاحة.
- قيم المواصفات التي يجب إزالتها.
- القيم التي تبقى متوافقة وسيتم الحفاظ عليها.
- الاختيارات المرتبطة التي يجب مسحها أو تغييرها.
- التحذيرات والإجراءات المطلوبة من الموظف.

يجب عرض التأثير بوضوح قبل تأكيد التنسيق الذي يزيل البيانات. يزيل التنسيق الآمن القيم غير المتوافقة فقط ويحافظ على القيم المتوافقة.

بعد التنسيق، يعمل تحقق المنتج مقابل قالب المواصفات المحدد حديثا. ولا يمكن حفظ المنتج كمنتج صالح حتى يطابق ذلك القالب. ويمكن أن يبقى العمل غير المكتمل مسودة وفقا لقواعد دورة حياة المنتج.

التنسيق سلوك مجال حتمي. يمكن للذكاء الاصطناعي شرح التأثير مستقبلا، لكنه لا يقرر الحقول المؤكدة المتوافقة.

## الأسباب

- منع فقدان البيانات بصمت.
- الحفاظ على عمل الموظف كلما بقي صالحا.
- إبقاء المنتجات متوافقة مع قالب المواصفات الحالي.
- جعل السلوك التلقائي مفهوما وقابلا للمراجعة.
- توفير قاعدة سلامة واحدة للمعالج القياسي والإدخال من السياق والدفعات والمسودات وExcel والإدخال بمساعدة.
- فصل قواعد التوافق عن مكونات الواجهة.

## النتائج

- تتطلب تغييرات السمات مقارنة السياق السابق بالسياق المحدد حديثا.
- يجب أن يكون تحليل التأثير واعيا بالمستأجر ومساحة العمل.
- يجب أن تشرح الواجهة القيم المحفوظة والقيم المزالة والتحذيرات والإصلاحات المطلوبة.
- يجب ألا يزيل التنسيق قيمة لمجرد أن خطوتها أصبحت مخفية؛ بل يجب أن يأتي عدم التوافق من قواعد المجال المؤكدة.
- قد تصبح حالة إكمال التحقق غير صالحة بعد تغير السياق.
- يمنع الحفظ حتى تملك الحقول المطلوبة في القالب الجديد قيما صالحة.
- يمكن للمسودات الحفاظ على العمل غير المكتمل بعد التغيير دون التأثير في بيانات الكتالوج أو المخزون النشطة.
- تتطلب نماذج التأثير التفصيلية وتجربة التأكيد وحدود الخدمات وسلوك التدقيق والحفظ تصميما تنفيذيا منفصلا.
- لا ينفذ هذا السجل حفظ المنتج ولا يعدل البيانات الحالية.

## الأمثلة

يغير موظف فئة جهاز لابتوب من الألعاب إلى الأعمال. تبقى قيم المعالج والذاكرة والتخزين لأنها متوافقة. وتدرج قيمة كرت شاشة خاصة بالألعاب للإزالة. ويجب إكمال حقول الأعمال المطلوبة الجديدة قبل الحفظ.

يغير موظف التصنيف من لابتوبات إلى كاميرات CCTV. يوضح تحليل التأثير أن حقول مواصفات اللابتوب ستصبح غير صالحة، ويحافظ على أي قيم مرتبطة بحقول قابلة لإعادة الاستخدام متوافقة، ويمنع الحفظ حتى تتم مطابقة قالب كاميرات CCTV.

يختار موظف نموذج منتج مختلفا بالعلامة التجارية نفسها وقالب متوافق. تبقى القيم المشتركة الصالحة، ولا تمسح إلا القيم غير المتوافقة المعتمدة على نموذج المنتج.
