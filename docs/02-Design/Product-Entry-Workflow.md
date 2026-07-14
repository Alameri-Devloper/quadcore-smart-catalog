# Product Entry Workflow Foundation

# أساس سير عمل إدخال المنتج

## Scope | النطاق

Sprint 03 Task 3.1 introduces a reusable workflow engine in `shared/workflow/`. Product Entry is its first intended consumer, but the engine contains no Product rules, React UI, forms, persistence, images, Excel import, AI, OCR, API, or backend integration.

تقدم المهمة 3.1 من السبرنت 03 محرك سير عمل قابلا لإعادة الاستخدام داخل `shared/workflow/`. إدخال المنتج هو أول استخدام مقصود له، لكن المحرك لا يحتوي على قواعد المنتج أو واجهة React أو نماذج أو حفظ أو صور أو استيراد Excel أو ذكاء اصطناعي أو OCR أو API أو تكامل خلفي.

## Workflow Diagram | مخطط سير العمل

```text
Workflow Definition
  ├─ Ordered Steps
  ├─ Visibility / Disabled Predicates
  ├─ Step Validators
  └─ Optional Value Reconciler
              │
              v
       Workflow Engine
  ┌──────────────────────────────┐
  │ Current Step                 │
  │ Completed Steps              │
  │ Visible / Hidden Steps       │
  │ Enabled / Disabled Steps     │
  │ Preserved Values             │
  │ Validation + Progress        │
  └──────────────────────────────┘
      │ Next / Back / Jump
      v
 Step Entered / Step Completed
 Step Changed / Workflow Completed
```

```text
تعريف سير العمل
  ├─ خطوات مرتبة
  ├─ شروط الظهور والتعطيل
  ├─ أدوات تحقق لكل خطوة
  └─ منسق اختياري للقيم
              │
              v
       محرك سير العمل
  ┌──────────────────────────────┐
  │ الخطوة الحالية               │
  │ الخطوات المكتملة             │
  │ الخطوات الظاهرة والمخفية     │
  │ الخطوات المفعلة والمعطلة     │
  │ القيم المحفوظة               │
  │ التحقق والتقدم                │
  └──────────────────────────────┘
  │ التالي / الرجوع / الانتقال
  v
 دخول خطوة / اكتمال خطوة
 تغير خطوة / اكتمال سير العمل
```

## Responsibilities | المسؤوليات

- `workflow.types.ts` defines reusable workflow, step, state, validation, event, and reconciliation contracts.
- `workflow.state.ts` creates and recalculates state and progress.
- `workflow.validation.ts` runs an injected step validator and supplies standard valid/invalid result helpers.
- `workflow.engine.ts` coordinates navigation, validation, dynamic recalculation, completion, and events.
- A consuming domain defines its own steps, validation rules, context, values, and compatibility behavior.

- يعرف `workflow.types.ts` عقود سير العمل والخطوة والحالة والتحقق والأحداث وتنسيق القيم القابلة لإعادة الاستخدام.
- ينشئ `workflow.state.ts` الحالة ويعيد حسابها مع نسبة التقدم.
- يشغل `workflow.validation.ts` أداة التحقق المحقونة لكل خطوة ويوفر نتائج قياسية للنجاح والفشل.
- ينسق `workflow.engine.ts` التنقل والتحقق وإعادة الحساب الديناميكي والإكمال والأحداث.
- يحدد المجال المستهلك خطواته وقواعد التحقق والسياق والقيم وسلوك التوافق الخاص به.

## Navigation Rules | قواعد التنقل

1. The first visible, enabled step becomes the current step.
2. `next()` validates the current step. Invalid steps remain current and expose their validation issues.
3. A valid step is marked complete before navigation to the next visible, enabled step.
4. Completing the final navigable step completes the workflow.
5. `back()` moves one position backward among visible, enabled steps without deleting values or completion history.
6. `jumpTo()` permits navigation only to a visible, enabled, previously completed step.
7. Hidden and disabled steps are not navigation targets and do not count toward progress.
8. An optional step defines how to detect an empty value through `isEmpty`. When empty, it does not block navigation. When data is supplied, its validator runs normally and invalid data blocks navigation.

1. تصبح أول خطوة ظاهرة ومفعلة هي الخطوة الحالية.
2. يتحقق `next()` من الخطوة الحالية. تبقى الخطوة غير الصالحة حالية وتعرض مشاكل التحقق.
3. تعلم الخطوة الصالحة كمكتملة قبل الانتقال إلى الخطوة الظاهرة والمفعلة التالية.
4. يؤدي إكمال آخر خطوة قابلة للتنقل إلى إكمال سير العمل.
5. ينتقل `back()` خطوة واحدة إلى الخلف بين الخطوات الظاهرة والمفعلة دون حذف القيم أو سجل الإكمال.
6. يسمح `jumpTo()` بالانتقال فقط إلى خطوة ظاهرة ومفعلة ومكتملة سابقا.
7. الخطوات المخفية والمعطلة ليست أهدافا للتنقل ولا تدخل في حساب التقدم.
8. تحدد الخطوة الاختيارية طريقة اكتشاف القيمة الفارغة عبر `isEmpty`. عندما تكون فارغة، لا تعيق التنقل. وعندما تقدم بيانات، تعمل أداة التحقق بصورة طبيعية وتعيق البيانات غير الصالحة التنقل.

## Dynamic Step Rules | قواعد الخطوات الديناميكية

Step visibility and disabled status are predicates evaluated from the workflow context and values. Calling `update()` recalculates every step. For example, a future Product Entry definition may hide Device Class when the selected Category does not require one, without adding that Product rule to the shared engine.

حالة ظهور الخطوة وتعطيلها هي شروط تقيم من سياق سير العمل وقيمه. يعيد استدعاء `update()` حساب كل خطوة. فمثلا يمكن لتعريف إدخال المنتج مستقبلا إخفاء فئة الجهاز عندما لا يحتاج التصنيف المحدد إليها، دون إضافة قاعدة المنتج هذه إلى المحرك المشترك.

Progress is calculated only from currently visible, enabled steps. When a step disappears or becomes disabled, it stops contributing to the denominator and completed count. If the current step becomes unavailable, the engine selects the first incomplete navigable step, or the last navigable step when all are complete.

تحسب نسبة التقدم من الخطوات الظاهرة والمفعلة حاليا فقط. عندما تختفي خطوة أو تتعطل، تتوقف عن المساهمة في إجمالي الخطوات وعدد المكتمل منها. وإذا أصبحت الخطوة الحالية غير متاحة، يختار المحرك أول خطوة غير مكتملة قابلة للتنقل، أو آخر خطوة قابلة للتنقل عندما تكون كلها مكتملة.

## Back Navigation and State Preservation | الرجوع والحفاظ على الحالة

Navigation never clears workflow values. The generic `reconcileValues` callback lets a consuming domain preserve compatible values and remove only incompatible ones when context changes. The engine supplies previous values, proposed values, current context, and active step IDs; the domain remains responsible for defining compatibility.

لا يمسح التنقل قيم سير العمل أبدا. تتيح دالة `reconcileValues` العامة للمجال المستهلك الحفاظ على القيم المتوافقة وإزالة غير المتوافق منها فقط عند تغير السياق. يوفر المحرك القيم السابقة والقيم المقترحة والسياق الحالي ومعرفات الخطوات النشطة؛ ويبقى المجال مسؤولا عن تعريف التوافق.

The Product Entry consumer may later use this boundary when Category or Device Class changes. No Product compatibility logic exists in the shared engine.

يمكن لمستهلك إدخال المنتج استخدام هذا الحد مستقبلا عند تغير التصنيف أو فئة الجهاز. ولا يوجد منطق لتوافق المنتج داخل المحرك المشترك.

## Events | الأحداث

Consumers may subscribe to `step-entered`, `step-completed`, `step-changed`, and `workflow-completed`. Events expose a read-only state snapshot and navigation identifiers. Event listeners must not become a hidden data-access path.

يمكن للمستهلكين الاشتراك في أحداث `step-entered` و`step-completed` و`step-changed` و`workflow-completed`. تعرض الأحداث لقطة حالة للقراءة فقط ومعرفات التنقل. ويجب ألا تصبح مستمعات الأحداث مسارا مخفيا للوصول إلى البيانات.

## Future Auto Save | الحفظ التلقائي المستقبلي

Auto Save is not implemented. A future domain service may observe explicit workflow changes and persist through its repository. Persistence errors must not corrupt in-memory navigation, and the shared engine must not call an API or repository directly.

الحفظ التلقائي غير منفذ. يمكن لخدمة مجال مستقبلية مراقبة تغييرات سير العمل الصريحة والحفظ عبر مستودعها. يجب ألا تفسد أخطاء الحفظ التنقل في الذاكرة، ويجب ألا يستدعي المحرك المشترك API أو مستودعا مباشرة.

## Future Draft | المسودة المستقبلية

Draft support is not implemented. A future draft service may serialize domain-owned context and values together with a workflow version. Restore and migration rules belong to the consuming domain so obsolete or incompatible values can be reconciled safely.

دعم المسودة غير منفذ. يمكن لخدمة مسودات مستقبلية حفظ السياق والقيم المملوكة للمجال مع إصدار سير العمل. تنتمي قواعد الاستعادة والترحيل إلى المجال المستهلك حتى يمكن تنسيق القيم القديمة أو غير المتوافقة بأمان.

## Future AI Entry | الإدخال المستقبلي بالذكاء الاصطناعي

AI entry is not implemented. A future assisted-entry adapter may propose values to the consuming domain. Suggestions must remain optional, reviewable, and subject to the same step validators and compatibility reconciler as manual values. AI must not navigate, complete, or save a workflow autonomously.

الإدخال بالذكاء الاصطناعي غير منفذ. يمكن لمحول إدخال بمساعدة مستقبلي اقتراح قيم للمجال المستهلك. يجب أن تبقى الاقتراحات اختيارية وقابلة للمراجعة وخاضعة لأدوات تحقق الخطوات ومنسق التوافق نفسيهما المستخدمين مع القيم اليدوية. ولا يجوز للذكاء الاصطناعي التنقل أو إكمال سير العمل أو حفظه بصورة مستقلة.

## Future Reuse | إعادة الاستخدام المستقبلية

The same engine can drive Product Entry, Excel Import, Solution Builder, Supplier Wizard, and setup wizards. Each consumer supplies its own definition and domain rules without changing the engine.

يمكن للمحرك نفسه تشغيل إدخال المنتج واستيراد Excel ومحرك بناء الحلول ومعالج المورد ومعالجات الإعداد. يوفر كل مستهلك تعريفه وقواعد مجاله دون تغيير المحرك.

## Product Entry Definition | تعريف إدخال المنتج

The Catalog domain defines Product Entry in `domains/catalog/product-entry/`. It depends on the shared workflow contracts, while `shared/workflow/` has no dependency on Catalog. The definition contains workflow configuration only; it creates no UI and performs no persistence or data access.

يعرف مجال الكتالوج إدخال المنتج داخل `domains/catalog/product-entry/`. يعتمد على عقود سير العمل المشتركة، بينما لا يعتمد `shared/workflow/` على مجال الكتالوج. يحتوي التعريف على إعدادات سير العمل فقط؛ ولا ينشئ واجهة مستخدم ولا ينفذ حفظا أو وصولا إلى البيانات.

### Product Entry Steps | خطوات إدخال المنتج

1. Entry Method: currently accepts Manual Entry. Excel Import is represented as a future disabled option.
2. Category: requires a selected Category.
3. Device Class: appears and becomes required only when the selected Category requires Device Class.
4. Product Model: requires a selected Product Model. Brand resolution may be supplied later by the Product Model context.
5. Specifications: validates required fields from the resolved Specification Template by field ID, without hardcoded specification names.
6. Commercial Details: validates product name, non-negative price and quantity, condition, and availability status.
7. Images: optional; no image handling is implemented.
8. Review: always last and revalidates all required previous steps.

1. طريقة الإدخال: تقبل حاليا الإدخال اليدوي. يمثل استيراد Excel كخيار مستقبلي معطل.
2. التصنيف: يتطلب اختيار تصنيف.
3. فئة الجهاز: تظهر وتصبح مطلوبة فقط عندما يتطلب التصنيف المحدد فئة جهاز.
4. نموذج المنتج: يتطلب اختيار نموذج منتج. ويمكن توفير تحديد العلامة التجارية لاحقا من سياق نموذج المنتج.
5. المواصفات: تتحقق من الحقول المطلوبة في قالب المواصفات المحدد باستخدام معرف الحقل، دون أسماء مواصفات مثبتة.
6. التفاصيل التجارية: تتحقق من اسم المنتج، وأن السعر والكمية لا يقلان عن الصفر، والحالة، وحالة التوفر.
7. الصور: اختيارية؛ ولا توجد معالجة للصور في هذه المهمة.
8. المراجعة: تأتي دائما أخيرا وتعيد التحقق من جميع الخطوات السابقة المطلوبة.

### Dynamic Device Class Behavior | السلوك الديناميكي لفئة الجهاز

`categoryRequiresDeviceClass` is supplied by Catalog context. When false, the Device Class step is hidden, excluded from navigation and progress, and its selected value is cleared as incompatible. When true, the step is visible and its validator requires a compatible selection.

يوفر سياق الكتالوج قيمة `categoryRequiresDeviceClass`. عندما تكون خاطئة، تخفى خطوة فئة الجهاز وتستبعد من التنقل والتقدم وتمسح قيمتها المحددة لأنها غير متوافقة. وعندما تكون صحيحة، تظهر الخطوة وتتطلب أداة التحقق اختيار قيمة متوافقة.

### Product Entry State Preservation | الحفاظ على حالة إدخال المنتج

Backward navigation does not mutate Product Entry values. When Category or Device Class context changes, shared commercial values remain intact. Category, Device Class, Product Model, Brand, and specification values are retained only when the newly resolved compatibility context permits them.

لا يغير التنقل إلى الخلف قيم إدخال المنتج. عند تغير سياق التصنيف أو فئة الجهاز، تبقى القيم التجارية المشتركة كما هي. ولا يحتفظ بالتصنيف وفئة الجهاز ونموذج المنتج والعلامة التجارية وقيم المواصفات إلا عندما يسمح سياق التوافق المحدد حديثا بها.

### Validation Responsibility | مسؤولية التحقق

Product Entry owns its step validators. The shared engine only invokes them. Required specification field IDs come from the resolved Specification Template context; validation does not know field names or query repositories. Review composes the required previous validators so it cannot complete while required Product Entry data is invalid.

Review includes Device Class validation only while the Device Class step is visible. Device Class and Product Model validation also verifies that selected IDs belong to the compatibility lists supplied by Catalog context. Price and quantity accept zero and require finite, non-negative numbers.

يمتلك إدخال المنتج أدوات التحقق الخاصة بخطواته، ولا يفعل المحرك المشترك سوى تشغيلها. تأتي معرفات حقول المواصفات المطلوبة من سياق قالب المواصفات المحدد؛ ولا يعرف التحقق أسماء الحقول ولا يستعلم من المستودعات. تجمع خطوة المراجعة أدوات تحقق الخطوات السابقة المطلوبة، ولذلك لا يمكن إكمالها عندما تكون بيانات إدخال المنتج المطلوبة غير صالحة.

تتضمن المراجعة التحقق من فئة الجهاز فقط عندما تكون خطوة فئة الجهاز ظاهرة. ويتحقق إدخال المنتج أيضا من أن معرفي فئة الجهاز ونموذج المنتج ينتميان إلى قوائم التوافق التي يوفرها سياق الكتالوج. يقبل السعر والكمية الصفر ويجب أن يكونا رقمين محدودين وغير سالبين.

The shared `WorkflowState.currentStepId` is the single source of truth for the active step. Product Entry values do not duplicate navigation state.

تمثل قيمة `WorkflowState.currentStepId` المشتركة مصدر الحقيقة الوحيد للخطوة النشطة. ولا تكرر قيم إدخال المنتج حالة التنقل.

### Reconciliation Behavior | سلوك التنسيق

The reconciliation function receives compatibility facts already resolved by the Catalog domain. It removes specification entries whose field IDs are not compatible, clears an incompatible Device Class or Product Model, and clears Brand when its Product Model becomes incompatible. It preserves product name, price, currency, quantity, condition, availability, images references, and every compatible specification value. A future resolved Product Model Brand may be applied through context without placing Brand lookup logic in the workflow.

تستقبل دالة التنسيق حقائق التوافق التي حددها مجال الكتالوج مسبقا. تزيل قيم المواصفات التي لا تتوافق معرفات حقولها، وتمسح فئة الجهاز أو نموذج المنتج غير المتوافق، وتمسح العلامة التجارية عندما يصبح نموذج المنتج غير متوافق. وتحافظ على اسم المنتج والسعر والعملة والكمية والحالة والتوفر ومراجع الصور وكل قيمة مواصفة متوافقة. ويمكن تطبيق علامة تجارية محددة مستقبلا من نموذج المنتج عبر السياق دون وضع منطق البحث عن العلامة التجارية داخل سير العمل.
