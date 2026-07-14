# ADR-0004: Context-Aware Product Entry

## English

## Title

Context-Aware Product Entry

## Status

Accepted; implementation is staged.

## Context

Employees may begin Product Entry from different locations in the Catalog. A generic Add Product action begins without selected Catalog context, while actions on a Category, Brand, or Product Model page already have confirmed information.

Repeating those selections increases effort and creates an opportunity for the employee to choose values that conflict with the originating context. QSC's UX principles require the system to use known information and avoid asking for the same information twice.

## Decision

Employees may start Product Entry from any applicable Catalog context, including:

- Catalog.
- Category.
- Brand.
- Product Model.

The Product Entry workflow must accept confirmed context as initial workflow context and values. It must automatically skip selection steps whose decisions are already known and continue at the first unresolved applicable step.

```text
Catalog
  ↓
Category
  ↓
Brand
  ↓
Product Model
  ↓
Add Product
```

The deeper the context, the fewer Wizard decisions are required. Starting from a Product Model may resolve Category, optional Device Class, Brand, and Product Model, allowing the employee to begin at Device Specifications.

Skipping a step skips repeated selection only. It does not bypass validation, reconciliation, tenant boundaries, or final Review. Known values must remain visible and reviewable.

## Reasons

- Reduce employee effort and repeated input.
- Preserve consistency with the Catalog location that started Product Entry.
- Make Add Product available throughout the Catalog.
- Reuse the same Product Entry workflow instead of building separate forms for each page.
- Keep context-aware behavior transparent and reviewable.

## Consequences

- Catalog entry points must provide explicit, confirmed, tenant-aware context.
- The workflow determines the first applicable unresolved step from that context.
- Context values must pass the same validation as manually selected values.
- Completed or skipped decisions must remain visible during Review.
- If context becomes invalid or changes, Impact Analysis and safe reconciliation rules apply.
- Standard Wizard remains available when no context exists or context cannot be resolved.
- This decision does not implement Catalog entry actions or routing by itself.

## Examples

An employee selects Add Product from a Category page. Category is preselected, Category selection is skipped, and the workflow continues with Device Class only when that Category requires it.

An employee selects Add Product from a Brand page. Brand is preserved and Product Model choices are limited to compatible confirmed models.

An employee selects Add Product from a Product Model page. Category, optional Device Class, Brand, and Product Model are resolved; the workflow starts at Device Specifications.

---

## العربية

## العنوان

إدخال المنتج الواعي بالسياق

## الحالة

معتمد؛ التنفيذ مرحلي.

## السياق

يمكن للموظفين بدء إدخال المنتج من مواقع مختلفة في الكتالوج. يبدأ إجراء إضافة منتج العام دون سياق كتالوج محدد، بينما تملك الإجراءات الموجودة في صفحة التصنيف أو العلامة التجارية أو نموذج المنتج معلومات مؤكدة مسبقا.

يؤدي تكرار هذه الاختيارات إلى زيادة جهد الموظف وإتاحة اختيار قيم تتعارض مع السياق الذي بدأت منه العملية. تتطلب مبادئ تجربة المستخدم في QSC أن يستخدم النظام المعلومات المعروفة وألا يطلب المعلومة نفسها مرتين.

## القرار

يمكن للموظفين بدء إدخال المنتج من أي سياق منطبق في الكتالوج، ومن ذلك:

- الكتالوج.
- التصنيف.
- العلامة التجارية.
- نموذج المنتج.

يجب أن يقبل سير عمل إدخال المنتج السياق المؤكد كسياق وقيم أولية. ويجب أن يتخطى تلقائيا خطوات الاختيار التي أصبحت قراراتها معروفة، وأن يتابع من أول خطوة منطبقة لم تحسم بعد.

```text
الكتالوج
  ↓
التصنيف
  ↓
العلامة التجارية
  ↓
نموذج المنتج
  ↓
إضافة منتج
```

كلما كان السياق أعمق، قل عدد قرارات المعالج المطلوبة. قد يؤدي البدء من نموذج المنتج إلى تحديد التصنيف وفئة الجهاز الاختيارية والعلامة التجارية ونموذج المنتج، مما يسمح للموظف بالبدء من مواصفات الجهاز.

يعني تخطي الخطوة عدم تكرار الاختيار فقط. ولا يعني تجاوز التحقق أو التنسيق أو حدود المستأجر أو المراجعة النهائية. ويجب أن تبقى القيم المعروفة ظاهرة وقابلة للمراجعة.

## الأسباب

- تقليل جهد الموظف والإدخال المتكرر.
- الحفاظ على الاتساق مع موقع الكتالوج الذي بدأت منه عملية إدخال المنتج.
- إتاحة إضافة المنتج في أنحاء الكتالوج.
- إعادة استخدام سير عمل إدخال المنتج نفسه بدلا من بناء نماذج منفصلة لكل صفحة.
- إبقاء السلوك الواعي بالسياق واضحا وقابلا للمراجعة.

## النتائج

- يجب أن توفر نقاط البداية في الكتالوج سياقا صريحا ومؤكدا وواعيا بالمستأجر.
- يحدد سير العمل أول خطوة منطبقة لم تحسم بناء على ذلك السياق.
- يجب أن تمر قيم السياق عبر التحقق نفسه المستخدم للقيم المختارة يدويا.
- يجب أن تبقى القرارات المكتملة أو التي تم تخطيها ظاهرة أثناء المراجعة.
- إذا أصبح السياق غير صالح أو تغير، تطبق قواعد تحليل التأثير والتنسيق الآمن.
- يبقى المعالج القياسي متاحا عند غياب السياق أو تعذر تحديده.
- لا ينفذ هذا القرار إجراءات البدء من صفحات الكتالوج أو التوجيه بنفسه.

## الأمثلة

يختار موظف إضافة منتج من صفحة تصنيف. يحدد التصنيف مسبقا، ويتم تخطي اختياره، ويتابع سير العمل إلى فئة الجهاز فقط عندما يتطلبها ذلك التصنيف.

يختار موظف إضافة منتج من صفحة علامة تجارية. يتم الحفاظ على العلامة التجارية، وتقتصر خيارات نموذج المنتج على النماذج المؤكدة المتوافقة.

يختار موظف إضافة منتج من صفحة نموذج منتج. يتم تحديد التصنيف وفئة الجهاز الاختيارية والعلامة التجارية ونموذج المنتج، ويبدأ سير العمل من مواصفات الجهاز.
