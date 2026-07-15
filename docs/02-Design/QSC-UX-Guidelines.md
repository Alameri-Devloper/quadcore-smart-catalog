# QSC UX Guidelines

# دليل تجربة المستخدم في QSC

## Purpose

This document describes the UX philosophy that every screen and workflow inside QSC must follow.

This document is the UX reference for all future development.

QSC experiences must reduce employee effort, preserve business clarity, and help users complete work without unnecessary navigation or repeated input.

## الهدف

تصف هذه الوثيقة فلسفة تجربة المستخدم التي يجب أن تتبعها كل شاشة وكل سير عمل داخل QSC.

هذه الوثيقة هي مرجع تجربة المستخدم لكل التطوير المستقبلي.

يجب أن تقلل تجارب QSC جهد الموظف، وتحافظ على وضوح العمل، وتساعد المستخدمين على إكمال العمل دون تنقل غير ضروري أو إدخال متكرر.

## 1. UX Philosophy

QSC is designed to reduce employee effort.

The system should think before asking the employee.

Employees should complete their work with the fewest possible clicks.

Never force users to navigate between multiple pages when the task can be completed in one workflow.

Every workflow should feel direct, calm, and purposeful. The interface should guide employees through the task without making them remember hidden rules or repeat information the system can already know.

## 1. فلسفة تجربة المستخدم

تم تصميم QSC لتقليل جهد الموظف.

يجب أن يفكر النظام قبل أن يسأل الموظف.

يجب أن ينجز الموظفون عملهم بأقل عدد ممكن من النقرات.

لا تجبر المستخدمين على التنقل بين صفحات متعددة عندما يمكن إكمال المهمة في سير عمل واحد.

يجب أن يكون كل سير عمل مباشرا وهادئا وذا هدف واضح. يجب أن ترشد الواجهة الموظفين خلال المهمة دون أن تجعلهم يتذكرون قواعد مخفية أو يكررون معلومات يستطيع النظام معرفتها.

## 2. UX Principles

### QSC UX Rule #1

Every step must have a purpose.

If a step does not collect required information, confirm an important decision, or help the employee move forward, it should be removed or merged into another step.

### QSC UX Rule #2

The system should think instead of the employee whenever possible.

Examples:

- Detect Brand from Product Model.
- Hide unnecessary steps.
- Preserve shared values.
- Generate Excel templates automatically.

### QSC UX Rule #3

Never tell users only that an error occurred.

Show:

- where the error is
- why it happened
- how to fix it

### QSC UX Rule #4

Never ask the employee for the same information twice.

Examples:

- If Product Model identifies Brand, Brand should be selected automatically.
- If Category and optional Device Class resolve the Specification Template, the employee should not select specification fields manually.
- If shared values were already entered during import or product creation, preserve them when moving between steps.

### QSC UX Rule #5

Long-running operations must always display progress.

Examples:

- Excel import
- Image upload
- Future synchronization

Progress must make it clear what is happening now, what is complete, and whether the employee can safely leave or continue.

## 2. مبادئ تجربة المستخدم

### قاعدة تجربة المستخدم في QSC رقم 1

يجب أن يكون لكل خطوة هدف.

إذا كانت الخطوة لا تجمع معلومات مطلوبة، ولا تؤكد قرارا مهما، ولا تساعد الموظف على التقدم، فيجب حذفها أو دمجها مع خطوة أخرى.

### قاعدة تجربة المستخدم في QSC رقم 2

يجب أن يفكر النظام بدلا من الموظف كلما أمكن ذلك.

أمثلة:

- اكتشاف العلامة التجارية من نموذج المنتج.
- إخفاء الخطوات غير الضرورية.
- الحفاظ على القيم المشتركة.
- إنشاء قوالب Excel تلقائيا.

### قاعدة تجربة المستخدم في QSC رقم 3

لا تخبر المستخدمين فقط بأن خطأ حدث.

اعرض:

- مكان الخطأ
- سبب حدوثه
- طريقة إصلاحه

### قاعدة تجربة المستخدم في QSC رقم 4

لا تسأل الموظف عن نفس المعلومة مرتين.

أمثلة:

- إذا كان نموذج المنتج يحدد العلامة التجارية، فيجب اختيار العلامة التجارية تلقائيا.
- إذا كان التصنيف وفئة الجهاز الاختيارية يحددان قالب المواصفات، فلا يجب أن يختار الموظف حقول المواصفات يدويا.
- إذا تم إدخال قيم مشتركة أثناء الاستيراد أو إنشاء المنتج، فيجب الحفاظ عليها عند الانتقال بين الخطوات.

### قاعدة تجربة المستخدم في QSC رقم 5

يجب أن تعرض العمليات الطويلة التقدم دائما.

أمثلة:

- استيراد Excel
- رفع الصور
- المزامنة المستقبلية

يجب أن يوضح التقدم ما يحدث الآن، وما اكتمل، وهل يستطيع الموظف المغادرة أو المتابعة بأمان.

## 3. Product Entry Workflow

Product entry should use a Wizard pattern when the workflow contains several decisions or groups of inputs.

The workflow must include:

- Back button
- Next button
- Smart progress indicator
- Manual Entry
- Excel Import

The workflow should support future Draft behavior so employees can pause product creation and continue later without losing work.

The progress indicator should be smart. It should reflect only the steps that apply to the selected Category, optional Device Class, Product Model, and input method.

Manual Entry must always be available.

Excel Import should be available when the employee wants to create or update many products at once.

Future assisted entry options may include:

- Model Lookup
- Barcode Lookup
- Label Scan
- AI Suggestions

These future options must remain optional and must never block manual product creation.

## 3. سير عمل إدخال المنتج

يجب أن يستخدم إدخال المنتج نمط المعالج عندما يحتوي سير العمل على عدة قرارات أو مجموعات من الحقول.

يجب أن يحتوي سير العمل على:

- زر الرجوع
- زر التالي
- مؤشر تقدم ذكي
- الإدخال اليدوي
- استيراد Excel

يجب أن يدعم سير العمل مستقبلا المسودات حتى يستطيع الموظفون إيقاف إنشاء المنتج مؤقتا والمتابعة لاحقا دون فقدان العمل.

يجب أن يكون مؤشر التقدم ذكيا. يجب أن يعرض فقط الخطوات التي تنطبق على التصنيف المحدد، وفئة الجهاز الاختيارية، ونموذج المنتج، وطريقة الإدخال.

يجب أن يبقى الإدخال اليدوي متاحا دائما.

يجب أن يكون استيراد Excel متاحا عندما يريد الموظف إنشاء أو تحديث عدة منتجات دفعة واحدة.

قد تشمل خيارات الإدخال بمساعدة مستقبلا:

- البحث عن النموذج
- البحث بالباركود
- مسح الملصق
- اقتراحات الذكاء الاصطناعي

يجب أن تبقى هذه الخيارات المستقبلية اختيارية وألا تمنع إنشاء المنتج يدويا.

## 4. Smart Behaviour

QSC should reduce unnecessary decisions by using known information.

Required smart behavior:

- Automatic Brand selection when Product Model determines the Brand.
- Shared value preservation between steps.
- Dynamic Specification Template loading based on Category and optional Device Class.
- Dynamic wizard steps that appear only when relevant.
- Optional Device Class when the selected Category does not require it.
- Optional Product Images when images are useful but not required.

Smart behavior must remain transparent. If the system selects, hides, or preserves something automatically, the employee should still understand what happened and be able to review important values before saving.

## 4. السلوك الذكي

يجب أن يقلل QSC القرارات غير الضرورية باستخدام المعلومات المعروفة.

السلوك الذكي المطلوب:

- اختيار العلامة التجارية تلقائيا عندما يحدد نموذج المنتج العلامة التجارية.
- الحفاظ على القيم المشتركة بين الخطوات.
- تحميل قالب المواصفات ديناميكيا حسب التصنيف وفئة الجهاز الاختيارية.
- خطوات معالج ديناميكية تظهر فقط عند الحاجة.
- فئة جهاز اختيارية عندما لا يحتاج التصنيف المحدد إليها.
- صور منتج اختيارية عندما تكون الصور مفيدة لكنها غير مطلوبة.

يجب أن يبقى السلوك الذكي واضحا. إذا اختار النظام شيئا أو أخفاه أو حافظ عليه تلقائيا، فيجب أن يفهم الموظف ما حدث وأن يستطيع مراجعة القيم المهمة قبل الحفظ.

## 5. Validation Guidelines

Validation messages must be useful, specific, and calm.

Validation levels:

- Error: The employee must fix this before continuing or saving.
- Warning: The employee can continue, but should review the issue.
- Info: Helpful context that explains what the system did or what will happen next.

Every validation message must:

- Highlight the field.
- Explain the problem.
- Explain the fix.
- Use simple language.

Validation should happen as close as possible to the field or step where the problem exists. Summary messages may appear at the top of the step, but they must link clearly to the affected fields.

## 5. إرشادات التحقق

يجب أن تكون رسائل التحقق مفيدة ومحددة وهادئة.

مستويات التحقق:

- خطأ: يجب أن يصلحه الموظف قبل المتابعة أو الحفظ.
- تحذير: يستطيع الموظف المتابعة، لكن يجب أن يراجع المشكلة.
- معلومة: سياق مفيد يشرح ما فعله النظام أو ما سيحدث لاحقا.

يجب أن تقوم كل رسالة تحقق بما يلي:

- تمييز الحقل.
- شرح المشكلة.
- شرح طريقة الإصلاح.
- استخدام لغة بسيطة.

يجب أن يحدث التحقق بالقرب من الحقل أو الخطوة التي توجد فيها المشكلة قدر الإمكان. يمكن عرض رسائل ملخصة أعلى الخطوة، لكنها يجب أن ترتبط بوضوح بالحقول المتأثرة.

## 6. Excel Import UX

Excel Import should help employees create or update many products without guessing the required columns.

The Excel template must be generated from:

```text
Category
+
Optional Device Class
```

Import flow:

1. Download Template
2. Fill Template
3. Upload
4. Validation
5. Preview
6. Confirmation
7. Import

The template should include only fields that belong to the resolved Specification Template. Required fields should be clear. Optional fields should be included when useful but must not block import unless business rules require them.

Validation must show row-level and field-level issues. Employees should know exactly which row and column need attention.

## 6. تجربة استيراد Excel

يجب أن يساعد استيراد Excel الموظفين على إنشاء أو تحديث عدة منتجات دون تخمين الأعمدة المطلوبة.

يجب إنشاء قالب Excel من:

```text
التصنيف
+
فئة الجهاز الاختيارية
```

سير الاستيراد:

1. تنزيل القالب
2. تعبئة القالب
3. رفع الملف
4. التحقق
5. المعاينة
6. التأكيد
7. الاستيراد

يجب أن يحتوي القالب فقط على الحقول التابعة لقالب المواصفات الذي تم تحديده. يجب أن تكون الحقول المطلوبة واضحة. يجب تضمين الحقول الاختيارية عندما تكون مفيدة، لكنها لا تمنع الاستيراد إلا إذا تطلبت قواعد العمل ذلك.

يجب أن يعرض التحقق المشاكل على مستوى الصف وعلى مستوى الحقل. يجب أن يعرف الموظفون بالضبط أي صف وأي عمود يحتاج إلى انتباه.

## 7. Product Images

Product images improve trust and clarity, but upload should remain optional unless a future business rule requires it.

Image support should include:

- Primary Image
- Additional Images
- Optional upload
- Future image suggestions

The Primary Image should be easy to identify and replace. Additional Images should support reorder and removal in future UI work.

Image upload must show progress and clear failure messages.

## 7. صور المنتج

تحسن صور المنتج الثقة والوضوح، لكن يجب أن يبقى الرفع اختياريا إلا إذا تطلبت قاعدة عمل مستقبلية خلاف ذلك.

يجب أن يدعم النظام:

- الصورة الرئيسية
- الصور الإضافية
- رفعا اختياريا
- اقتراحات صور مستقبلية

يجب أن يكون تحديد الصورة الرئيسية واستبدالها سهلا. يجب أن تدعم الصور الإضافية إعادة الترتيب والحذف في عمل الواجهة المستقبلي.

يجب أن يعرض رفع الصور التقدم ورسائل فشل واضحة.

## 8. Mobile First

All workflows must be optimized for mobile.

Avoid long forms.

Prefer Wizard.

Each step should contain only a small number of inputs.

Mobile workflows should prioritize clarity, large touch targets, readable labels, and short decisions. If a workflow feels heavy on mobile, split it into smaller steps instead of making one long screen.

## 8. الجوال أولا

يجب تحسين كل سير عمل للجوال.

تجنب النماذج الطويلة.

فضل المعالج.

يجب أن تحتوي كل خطوة على عدد قليل من الحقول.

يجب أن تركز سير العمل على الجوال على الوضوح، وأهداف لمس كبيرة، وتسميات مقروءة، وقرارات قصيرة. إذا كان سير العمل ثقيلا على الجوال، فقسمه إلى خطوات أصغر بدلا من جعله شاشة طويلة واحدة.

## 8.1 Search UX

Search inside a domain page must default to the current context, such as Category, Brand, Device Class, or Product Model. The active scope must be visible, and the employee must have an explicit **Search Everywhere** action.

The Employee Workspace must provide the Global Search entry point. Traditional filters must remain accessible even when QSC parses a query into structured filters. Employees must be able to review, change, or clear those filters.

When smart ranking is used, each result must provide a concise reason for the match based on confirmed QSC data. Search must remain useful without AI and must never present an invented specification as a match reason.

On mobile, keep the active scope and query visible, use large touch targets for scope and filter controls, avoid hiding essential filters behind unclear gestures, and present short result summaries with readable match reasons.

## 8.1 تجربة البحث

يجب أن يكون البحث داخل صفحة المجال مقيدا افتراضيا بالسياق الحالي، مثل التصنيف أو العلامة التجارية أو فئة الجهاز أو نموذج المنتج. ويجب أن يكون النطاق النشط ظاهرا، مع توفير إجراء صريح للموظف باسم **البحث في كل مكان**.

يجب أن توفر مساحة عمل الموظف نقطة الدخول للبحث الشامل. ويجب أن تبقى المرشحات التقليدية متاحة حتى عندما يحلل QSC الاستعلام إلى مرشحات منظمة. ويجب أن يستطيع الموظفون مراجعة هذه المرشحات أو تغييرها أو مسحها.

عند استخدام الترتيب الذكي، يجب أن يقدم كل ناتج سببا موجزا للمطابقة مبنيا على بيانات QSC المؤكدة. ويجب أن يبقى البحث مفيدا دون ذكاء اصطناعي، وألا يعرض أبدا مواصفة مختلقة كسبب للمطابقة.

على الجوال، يجب إبقاء النطاق النشط والاستعلام ظاهرين، واستخدام أهداف لمس كبيرة لعناصر التحكم في النطاق والمرشحات، وتجنب إخفاء المرشحات الأساسية خلف إيماءات غير واضحة، وعرض ملخصات قصيرة للنتائج مع أسباب مطابقة مقروءة.

## 9. Future UX Vision

Future QSC workflows may include:

- Product Model Lookup
- Label OCR
- AI Suggestions
- Offline Drafts
- Auto Save
- Voice Entry

These capabilities should support the employee, not replace their control. Every future smart feature must remain reviewable, editable, and optional when manual entry is still possible.

## 9. الرؤية المستقبلية لتجربة المستخدم

قد تشمل سير عمل QSC المستقبلية:

- البحث عن نموذج المنتج
- قراءة الملصق OCR
- اقتراحات الذكاء الاصطناعي
- المسودات دون اتصال
- الحفظ التلقائي
- الإدخال الصوتي

يجب أن تدعم هذه القدرات الموظف، لا أن تستبدل تحكمه. يجب أن تبقى كل ميزة ذكية مستقبلية قابلة للمراجعة والتعديل واختيارية عندما يكون الإدخال اليدوي ممكنا.

## 10. Final Principle

QSC is not built to impress developers.

It is built to help employees sell faster.

Technology serves the employee.

The employee never serves the technology.

Every product decision should be judged by this principle. If a workflow is technically impressive but makes the employee slower, it is not a QSC workflow.

## 10. المبدأ النهائي

لم يتم بناء QSC لإبهار المطورين.

تم بناؤه لمساعدة الموظفين على البيع بسرعة أكبر.

التقنية تخدم الموظف.

الموظف لا يخدم التقنية أبدا.

يجب تقييم كل قرار منتج بناء على هذا المبدأ. إذا كان سير العمل مبهرا تقنيا لكنه يجعل الموظف أبطأ، فهو ليس سير عمل مناسب لـ QSC.
