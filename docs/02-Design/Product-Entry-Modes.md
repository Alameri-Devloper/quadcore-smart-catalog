# Product Entry Modes

## English

## Purpose

Product Entry is a platform capability, not a single screen. This document defines how employees may start creating products and how each entry mode should prepare the shared Product Entry workflow.

The modes described here share the same Product Entry rules, validation, reconciliation, review, and future save boundaries. A mode may supply known context, preserve selected values, or change the starting point, but it must not bypass required validation.

This document defines product and UX direction only. It does not change the current architecture or authorize implementation of future modes.

## Shared Rules

- Standard Wizard remains the default and always-available entry path.
- Employees must never be asked twice for information QSC already knows.
- Every Catalog page should be capable of starting Product Entry with its known context.
- Deeper Catalog context should produce fewer required Wizard steps.
- Known values must remain visible and reviewable even when their selection steps are skipped.
- Compatible values must be preserved; only incompatible values may be cleared.
- All modes must respect tenant, company, and workspace boundaries.
- Entry modes must use the same domain validation before a Product can be saved.
- Draft, Excel, and AI capabilities must remain optional and must not block standard manual entry.

## Mode Summary

| Mode | Purpose | Starting behavior | Direction |
| --- | --- | --- | --- |
| Standard Wizard | Guided single-product entry | Starts at the beginning | Default |
| Context Entry | Start from known Catalog context | Skips already resolved decisions | Planned |
| Batch Entry | Enter many similar products | Preserves shared values | Planned |
| Draft Entry | Pause and resume incomplete work | Restores values and current step | Future |
| Excel Import | Import many products from a generated template | Starts from Category and optional Device Class | Future |
| AI Assisted Entry | Suggest product data from assisted lookup | Prefills reviewable suggestions | Future |

## Mode 1: Standard Wizard

Standard Wizard is the default guided workflow and the baseline for every other mode.

It is suitable for:

- New employees.
- Products without known Catalog context.
- One-at-a-time product creation.
- Employees who prefer guided decisions.

Behavior:

- Starts from the beginning.
- Presents only applicable steps.
- Validates each required step before moving forward.
- Allows Back navigation without losing entered values.
- Keeps Images optional.
- Ends with Review before any future save action.

Conceptual flow:

```text
Entry Method
-> Category
-> Optional Device Class
-> Product Model
-> Device Specifications
-> Product Details
-> Optional Images
-> Review
```

## Mode 2: Context Entry

Context Entry starts Product Entry from a Catalog location that already provides trusted context. The workflow accepts known values and removes unnecessary selection steps from the employee's path.

Possible entry points:

- Catalog page.
- Category page.
- Brand page.
- Product Model page.

Context depth:

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

Each deeper context resolves more information:

- From Catalog: start the standard guided path.
- From Category: preselect Category and skip Category selection.
- From Brand: preserve Category when known, preselect Brand, and do not ask for Brand again.
- From Product Model: preselect Category, optional Device Class, Brand, and Product Model; begin at Device Specifications.

Examples:

```text
Category already selected
-> Skip Category
-> Continue with the next unresolved decision
```

```text
Brand already selected
-> Preserve Brand
-> Filter later choices to compatible Product Models
```

```text
Product Model already selected
-> Resolve Category, optional Device Class, and Brand
-> Start from Device Specifications
```

Context Entry principles:

- Known context must come from confirmed QSC Catalog data.
- Skipping a step means skipping repeated selection, not skipping validation.
- Prefilled values must remain visible during Review.
- If context becomes incompatible, reconciliation clears only the affected values and returns the employee to the next unresolved decision.
- The employee must be able to go back to completed applicable steps.

## Mode 3: Batch Entry

Batch Entry is designed for entering many similar products quickly without repeating shared information.

Shared values may include:

- Category.
- Optional Device Class.
- Brand.
- Currency.
- Condition.
- Availability.
- Other values explicitly confirmed as reusable for the batch.

After one Product is reviewed, Batch Entry prepares the next Product by preserving compatible shared values and clearing product-specific values.

Product-specific values may include:

- Product Model when products differ by model.
- Product name.
- Price when it differs.
- Quantity.
- Specification values that do not apply to the next Product.
- Images.

Batch Entry principles:

- Shared values remain until the employee changes the batch context or ends the batch.
- Only incompatible or explicitly product-specific values are cleared.
- Every Product is validated and reviewed independently.
- One invalid Product must not corrupt another Product's values.
- Employees should be able to enter dozens of similar products with minimal repeated input.
- Future saving must create distinct Product records; Batch Entry is not one combined Product.

## Mode 4: Draft Entry

Draft Entry allows employees to pause incomplete Product work and resume later.

A Draft stores at least:

- Current workflow step.
- Entered values.
- Creator.
- Created time.
- Updated time.
- Workflow version or equivalent compatibility information for safe restoration.

Resume behavior:

- Restore the Draft in the applicable workflow version.
- Recalculate dynamic step visibility.
- Reconcile values against the current Catalog context.
- Preserve compatible values.
- Clearly explain any value removed because it is no longer valid.
- Return the employee to the restored current step or the nearest applicable unresolved step.

Draft principles:

- Drafts never affect Inventory.
- Drafts never appear as Products in the Catalog.
- Drafts remain private to their creator unless future permissions explicitly allow sharing.
- Saving a Draft is not the same as saving a Product.
- Deleting or abandoning a Draft must not delete confirmed Catalog data.
- Draft recovery must not bypass current validation.

Future Draft capabilities may include:

- Auto Draft.
- Draft Recovery after interruption.
- Draft expiration policies.
- Shared Drafts controlled by explicit permissions.

### Current Local Draft Foundation

Manual Draft is now supported through replaceable browser storage. Product Entry saves the active Draft after successful step movement, automatically before Home navigation, and when the employee chooses Save Draft and Exit from Cancel. Browser-storage failure prevents navigation and keeps the current session available.

On entry, the latest active Draft for the current company, workspace, and employee is offered for resume. Continuing restores workflow values, entry mode, current step, completion candidates, and timestamps, then applies current reconciliation and validation. Starting new marks the previous Draft discarded; deleting removes it permanently. Successful workflow completion removes the active Draft.

This is not Product persistence. Future server persistence must implement the same repository contract, enforce authenticated tenant ownership and permissions, and add approved audit, retention, conflict, and migration behavior.

## Mode 5: Excel Import

Excel Import is a future batch-oriented mode. It must not replace Standard Wizard or manual entry.

The Excel template is generated from:

```text
Category
+ Optional Device Class
-> Resolved Device Specification fields
```

Principles:

- Required and optional columns come from confirmed QSC configuration.
- Employees must not guess field names or template columns.
- Imported rows pass through the same normalization and validation rules as manual values.
- Row-level and field-level errors must identify where, why, and how to fix a problem.
- Employees review a preview before confirmation.
- No import happens automatically after file selection.
- Invalid rows must not silently create incomplete Products.
- Tenant and workspace context must be explicit.

Excel Import remains future-only in the current Product Entry direction.

## Mode 6: AI Assisted Entry

AI Assisted Entry is a future optional mode that helps propose Product data while keeping the employee in control.

Possible assistance:

- Product Model lookup.
- Part number or barcode lookup.
- OCR from a label image.
- Suggested specification values.
- Mapping suggestions to confirmed QSC fields.

Principles:

- AI suggestions are not confirmed Product data.
- Every suggestion must be reviewable and editable.
- Suggestions must pass the same workflow validation as manual input.
- AI must not invent unavailable specifications.
- AI must not save or publish a Product automatically.
- Failure or unavailability of AI must not block Standard Wizard.
- Confirmed QSC data remains the source of truth.

## Mode Interaction with the Workflow Engine

Entry modes configure the existing Product Entry workflow; they do not require a separate workflow engine for every mode.

A mode may provide:

- Initial context.
- Initial values.
- Initial applicable step.
- Value-preservation policy.
- Reconciliation inputs.
- A future Draft identifier or batch session identifier.

The workflow remains responsible for:

- Dynamic steps.
- Navigation.
- Step validation.
- Completion.
- Progress.
- Reconciliation execution.

Domain services remain responsible for future persistence, Draft ownership, batch coordination, import processing, and assisted-data integration.

## Future Vision

Product Entry becomes a reusable platform for starting, guiding, pausing, accelerating, and reviewing Product creation.

Future modes may be added without redesigning the Product Entry Engine. A new mode should supply context and behavior through approved workflow and domain boundaries rather than duplicate Product validation or navigation logic.

---

## العربية

## الغرض

إدخال المنتج قدرة على مستوى المنصة، وليس شاشة واحدة. تحدد هذه الوثيقة الطرق التي يمكن للموظفين من خلالها بدء إنشاء المنتجات، وكيف يجب أن تجهز كل طريقة سير عمل إدخال المنتج المشترك.

تشترك الطرق الموضحة هنا في قواعد إدخال المنتج والتحقق والتنسيق والمراجعة وحدود الحفظ المستقبلية نفسها. يمكن للطريقة توفير سياق معروف أو الحفاظ على قيم محددة أو تغيير نقطة البداية، لكنها لا تتجاوز التحقق المطلوب.

تحدد هذه الوثيقة اتجاه المنتج وتجربة المستخدم فقط. ولا تغير المعمارية الحالية ولا تجيز تنفيذ الطرق المستقبلية.

## القواعد المشتركة

- يبقى المعالج القياسي هو طريقة الإدخال الافتراضية والمتاحة دائما.
- يجب ألا يطلب من الموظف إدخال معلومة تعرفها QSC مسبقا مرة أخرى.
- يجب أن تتمكن كل صفحة في الكتالوج من بدء إدخال المنتج باستخدام سياقها المعروف.
- كلما كان سياق الكتالوج أعمق، قل عدد خطوات المعالج المطلوبة.
- يجب أن تبقى القيم المعروفة ظاهرة وقابلة للمراجعة حتى عند تخطي خطوات اختيارها.
- يجب الحفاظ على القيم المتوافقة، ولا تمسح إلا القيم غير المتوافقة.
- يجب أن تحترم كل الطرق حدود المستأجر والشركة ومساحة العمل.
- يجب أن تستخدم طرق الإدخال تحقق المجال نفسه قبل حفظ المنتج.
- يجب أن تبقى قدرات المسودة وExcel والذكاء الاصطناعي اختيارية وألا تعيق الإدخال اليدوي القياسي.

## ملخص الطرق

| الطريقة | الغرض | سلوك البداية | الاتجاه |
| --- | --- | --- | --- |
| المعالج القياسي | إدخال موجه لمنتج واحد | يبدأ من البداية | افتراضي |
| الإدخال من السياق | البدء من سياق معروف في الكتالوج | يتخطى القرارات المحددة مسبقا | مخطط |
| الإدخال الدفعي | إدخال عدة منتجات متشابهة | يحافظ على القيم المشتركة | مخطط |
| إدخال المسودة | إيقاف العمل غير المكتمل ومتابعته | يستعيد القيم والخطوة الحالية | مستقبلي |
| استيراد Excel | استيراد عدة منتجات من قالب مولد | يبدأ من التصنيف وفئة الجهاز الاختيارية | مستقبلي |
| الإدخال بمساعدة الذكاء الاصطناعي | اقتراح بيانات المنتج من مصادر مساعدة | يعبئ اقتراحات قابلة للمراجعة | مستقبلي |

## الطريقة 1: المعالج القياسي

المعالج القياسي هو سير العمل الموجه الافتراضي والأساس لكل الطرق الأخرى.

وهو مناسب لـ:

- الموظفين الجدد.
- المنتجات التي لا تملك سياقا معروفا في الكتالوج.
- إنشاء المنتجات واحدا تلو الآخر.
- الموظفين الذين يفضلون القرارات الموجهة.

السلوك:

- يبدأ من البداية.
- يعرض الخطوات المنطبقة فقط.
- يتحقق من كل خطوة مطلوبة قبل التقدم.
- يسمح بالرجوع دون فقدان القيم المدخلة.
- يبقي الصور اختيارية.
- ينتهي بالمراجعة قبل أي إجراء حفظ مستقبلي.

التدفق التصوري:

```text
طريقة الإدخال
-> التصنيف
-> فئة الجهاز الاختيارية
-> نموذج المنتج
-> مواصفات الجهاز
-> تفاصيل المنتج
-> الصور الاختيارية
-> المراجعة
```

## الطريقة 2: الإدخال من السياق

يبدأ الإدخال من السياق عملية إدخال المنتج من موقع في الكتالوج يوفر سياقا موثوقا مسبقا. يقبل سير العمل القيم المعروفة ويزيل خطوات الاختيار غير الضرورية من مسار الموظف.

نقاط البداية الممكنة:

- صفحة الكتالوج.
- صفحة التصنيف.
- صفحة العلامة التجارية.
- صفحة نموذج المنتج.

عمق السياق:

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

يحدد كل مستوى أعمق معلومات أكثر:

- من الكتالوج: ابدأ المسار الموجه القياسي.
- من التصنيف: حدد التصنيف مسبقا وتخط اختيار التصنيف.
- من العلامة التجارية: حافظ على التصنيف عندما يكون معروفا، وحدد العلامة التجارية مسبقا، ولا تطلبها مرة أخرى.
- من نموذج المنتج: حدد التصنيف وفئة الجهاز الاختيارية والعلامة التجارية ونموذج المنتج مسبقا، وابدأ من مواصفات الجهاز.

أمثلة:

```text
التصنيف محدد مسبقا
-> تخط التصنيف
-> تابع إلى القرار التالي غير المحدد
```

```text
العلامة التجارية محددة مسبقا
-> حافظ على العلامة التجارية
-> صف الخيارات اللاحقة إلى نماذج المنتجات المتوافقة
```

```text
نموذج المنتج محدد مسبقا
-> حدد التصنيف وفئة الجهاز الاختيارية والعلامة التجارية
-> ابدأ من مواصفات الجهاز
```

مبادئ الإدخال من السياق:

- يجب أن يأتي السياق المعروف من بيانات كتالوج QSC المؤكدة.
- تخطي الخطوة يعني عدم تكرار الاختيار، وليس تجاوز التحقق.
- يجب أن تبقى القيم المعبأة مسبقا ظاهرة أثناء المراجعة.
- إذا أصبح السياق غير متوافق، يمسح التنسيق القيم المتأثرة فقط ويعيد الموظف إلى القرار التالي غير المحدد.
- يجب أن يستطيع الموظف الرجوع إلى الخطوات المنطبقة المكتملة.

## الطريقة 3: الإدخال الدفعي

صمم الإدخال الدفعي لإدخال عدة منتجات متشابهة بسرعة دون تكرار المعلومات المشتركة.

يمكن أن تشمل القيم المشتركة:

- التصنيف.
- فئة الجهاز الاختيارية.
- العلامة التجارية.
- العملة.
- الحالة.
- التوفر.
- القيم الأخرى المؤكدة صراحة لإعادة استخدامها في الدفعة.

بعد مراجعة منتج واحد، يجهز الإدخال الدفعي المنتج التالي بالحفاظ على القيم المشتركة المتوافقة ومسح القيم الخاصة بالمنتج.

يمكن أن تشمل القيم الخاصة بالمنتج:

- نموذج المنتج عندما تختلف المنتجات حسب النموذج.
- اسم المنتج.
- السعر عندما يختلف.
- الكمية.
- قيم المواصفات التي لا تنطبق على المنتج التالي.
- الصور.

مبادئ الإدخال الدفعي:

- تبقى القيم المشتركة حتى يغير الموظف سياق الدفعة أو ينهيها.
- لا تمسح إلا القيم غير المتوافقة أو المحددة صراحة كقيم خاصة بالمنتج.
- يتم التحقق من كل منتج ومراجعته بصورة مستقلة.
- يجب ألا يفسد منتج غير صالح قيم منتج آخر.
- يجب أن يتمكن الموظفون من إدخال عشرات المنتجات المتشابهة بأقل إدخال متكرر.
- يجب أن ينشئ الحفظ المستقبلي سجلات منتجات مستقلة؛ فالإدخال الدفعي ليس منتجا واحدا مجمعا.

## الطريقة 4: إدخال المسودة

يسمح إدخال المسودة للموظفين بإيقاف عمل المنتج غير المكتمل ومتابعته لاحقا.

تخزن المسودة على الأقل:

- خطوة سير العمل الحالية.
- القيم المدخلة.
- المنشئ.
- وقت الإنشاء.
- وقت التحديث.
- إصدار سير العمل أو معلومات توافق مكافئة للاستعادة الآمنة.

سلوك المتابعة:

- استعادة المسودة في إصدار سير العمل المنطبق.
- إعادة حساب ظهور الخطوات الديناميكية.
- تنسيق القيم مع سياق الكتالوج الحالي.
- الحفاظ على القيم المتوافقة.
- توضيح أي قيمة أزيلت لأنها لم تعد صالحة.
- إعادة الموظف إلى الخطوة الحالية المستعادة أو أقرب خطوة منطبقة غير مكتملة.

مبادئ المسودة:

- لا تؤثر المسودات في المخزون أبدا.
- لا تظهر المسودات كمنتجات في الكتالوج أبدا.
- تبقى المسودات خاصة بمنشئها ما لم تسمح صلاحيات مستقبلية صراحة بالمشاركة.
- حفظ المسودة ليس هو حفظ المنتج.
- يجب ألا يؤدي حذف المسودة أو التخلي عنها إلى حذف بيانات الكتالوج المؤكدة.
- يجب ألا تتجاوز استعادة المسودة التحقق الحالي.

قد تشمل قدرات المسودة المستقبلية:

- المسودة التلقائية.
- استعادة المسودة بعد الانقطاع.
- سياسات انتهاء صلاحية المسودة.
- مسودات مشتركة تتحكم فيها صلاحيات صريحة.

### أساس المسودة المحلية الحالي

يدعم النظام الآن المسودة اليدوية من خلال تخزين متصفح قابل للاستبدال. يحفظ إدخال المنتج المسودة النشطة بعد الانتقال الناجح بين الخطوات، وتلقائيا قبل الانتقال إلى الرئيسية، وعندما يختار الموظف حفظ المسودة والخروج من الإلغاء. ويمنع فشل تخزين المتصفح التنقل ويبقي الجلسة الحالية متاحة.

عند الدخول، تعرض أحدث مسودة نشطة للشركة ومساحة العمل والموظف الحاليين للاستئناف. تعيد المتابعة قيم سير العمل وطريقة الإدخال والخطوة الحالية وحالات الاكتمال المرشحة والأوقات، ثم تطبق التنسيق والتحقق الحاليين. ويعلم بدء جلسة جديدة المسودة السابقة كمتجاهلة، بينما يزيلها الحذف نهائيا. ويزيل اكتمال سير العمل الناجح المسودة النشطة.

هذا ليس حفظا للمنتج. يجب أن ينفذ حفظ الخادم المستقبلي عقد المستودع نفسه، ويفرض ملكية المستأجر المصادق عليه وصلاحياته، ويضيف سلوك التدقيق والاحتفاظ وحل التعارض والترحيل المعتمد.

## الطريقة 5: استيراد Excel

استيراد Excel طريقة مستقبلية موجهة للدفعات. ويجب ألا تستبدل المعالج القياسي أو الإدخال اليدوي.

يولد قالب Excel من:

```text
التصنيف
+ فئة الجهاز الاختيارية
-> حقول مواصفات الجهاز المحددة
```

المبادئ:

- تأتي الأعمدة المطلوبة والاختيارية من إعدادات QSC المؤكدة.
- يجب ألا يخمن الموظفون أسماء الحقول أو أعمدة القالب.
- تمر الصفوف المستوردة عبر قواعد التوحيد والتحقق نفسها المستخدمة للقيم اليدوية.
- يجب أن تحدد الأخطاء على مستوى الصف والحقل مكان المشكلة وسببها وطريقة إصلاحها.
- يراجع الموظفون معاينة قبل التأكيد.
- لا يحدث الاستيراد تلقائيا بعد اختيار الملف.
- يجب ألا تنشئ الصفوف غير الصالحة منتجات ناقصة بصمت.
- يجب أن يكون سياق المستأجر ومساحة العمل صريحا.

يبقى استيراد Excel مستقبليا فقط في اتجاه إدخال المنتج الحالي.

## الطريقة 6: الإدخال بمساعدة الذكاء الاصطناعي

الإدخال بمساعدة الذكاء الاصطناعي طريقة مستقبلية اختيارية تساعد في اقتراح بيانات المنتج مع إبقاء الموظف مسيطرا.

المساعدة المحتملة:

- البحث عن نموذج المنتج.
- البحث برقم القطعة أو الباركود.
- قراءة صورة الملصق عبر OCR.
- اقتراح قيم المواصفات.
- ربط الاقتراحات بحقول QSC المؤكدة.

المبادئ:

- اقتراحات الذكاء الاصطناعي ليست بيانات منتج مؤكدة.
- يجب أن يكون كل اقتراح قابلا للمراجعة والتعديل.
- يجب أن تمر الاقتراحات عبر تحقق سير العمل نفسه المستخدم للإدخال اليدوي.
- يجب ألا يخترع الذكاء الاصطناعي مواصفات غير متاحة.
- يجب ألا يحفظ الذكاء الاصطناعي منتجا أو ينشره تلقائيا.
- يجب ألا يؤدي فشل الذكاء الاصطناعي أو عدم توفره إلى إعاقة المعالج القياسي.
- تبقى بيانات QSC المؤكدة مصدر الحقيقة.

## تفاعل الطرق مع محرك سير العمل

تضبط طرق الإدخال سير عمل إدخال المنتج الحالي؛ ولا تتطلب محرك سير عمل منفصلا لكل طريقة.

يمكن للطريقة توفير:

- السياق الأولي.
- القيم الأولية.
- الخطوة المنطبقة الأولية.
- سياسة الحفاظ على القيم.
- مدخلات التنسيق.
- معرف مسودة مستقبلي أو معرف جلسة دفعة.

يبقى سير العمل مسؤولا عن:

- الخطوات الديناميكية.
- التنقل.
- التحقق من الخطوات.
- الإكمال.
- التقدم.
- تنفيذ التنسيق.

تبقى خدمات المجال مسؤولة عن الحفظ المستقبلي وملكية المسودة وتنسيق الدفعات ومعالجة الاستيراد وتكامل البيانات بمساعدة النظام.

## الرؤية المستقبلية

يصبح إدخال المنتج منصة قابلة لإعادة الاستخدام لبدء إنشاء المنتجات وتوجيهه وإيقافه وتسريعه ومراجعته.

يمكن إضافة طرق مستقبلية دون إعادة تصميم محرك إدخال المنتج. يجب أن توفر الطريقة الجديدة السياق والسلوك من خلال حدود سير العمل والمجال المعتمدة، بدلا من تكرار تحقق المنتج أو منطق التنقل.
