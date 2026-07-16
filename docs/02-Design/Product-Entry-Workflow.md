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
6. Commercial Details: validates identity, separate retail and wholesale prices, currency, whole Catalog quantity, condition, availability, and Catalog presentation settings.
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

The reconciliation function receives compatibility facts already resolved by the Catalog domain. It removes specification entries whose field IDs are not compatible, clears an incompatible Device Class or Product Model, and clears Brand when its Product Model becomes incompatible. It preserves product name, product code, retail and wholesale prices, currency, quantity, condition, availability, Featured and active Catalog settings, image references, and every compatible specification value. A future resolved Product Model Brand may be applied through context without placing Brand lookup logic in the workflow.

تستقبل دالة التنسيق حقائق التوافق التي حددها مجال الكتالوج مسبقا. تزيل قيم المواصفات التي لا تتوافق معرفات حقولها، وتمسح فئة الجهاز أو نموذج المنتج غير المتوافق، وتمسح العلامة التجارية عندما يصبح نموذج المنتج غير متوافق. وتحافظ على اسم المنتج والسعر والعملة والكمية والحالة والتوفر ومراجع الصور وكل قيمة مواصفة متوافقة. ويمكن تطبيق علامة تجارية محددة مستقبلا من نموذج المنتج عبر السياق دون وضع منطق البحث عن العلامة التجارية داخل سير العمل.

## React Workflow Adapter | محول سير العمل لـ React

### Separation of Responsibilities | فصل المسؤوليات

The framework-independent core remains in `shared/workflow/`. It owns navigation, validation, completion, reconciliation, dynamic steps, progress, reset, and workflow events. It does not import React.

يبقى المحرك المستقل عن إطار العمل داخل `shared/workflow/`. وهو مسؤول عن التنقل والتحقق والإكمال والتنسيق والخطوات الديناميكية والتقدم وإعادة الضبط وأحداث سير العمل. ولا يستورد React.

The React adapter lives in `shared/workflow/react/`. It subscribes to engine snapshots, derives presentation-friendly state, and exposes typed actions. It contains no Catalog or Product Entry rules.

يوجد محول React داخل `shared/workflow/react/`. يشترك في لقطات حالة المحرك، ويشتق حالة مناسبة للعرض، ويعرض إجراءات معرفة الأنواع. ولا يحتوي على قواعد الكتالوج أو إدخال المنتج.

```text
Domain Workflow Definition
        ↓
WorkflowProvider
        ↓ delegates to
Shared Workflow Engine
        ↓ publishes snapshots
useWorkflow()
        ↓
Future React Components
```

```text
تعريف سير عمل المجال
        ↓
مزود سير العمل
        ↓ يفوض إلى
محرك سير العمل المشترك
        ↓ ينشر لقطات الحالة
خطاف سير العمل
        ↓
مكونات React المستقبلية
```

### WorkflowProvider | مزود سير العمل

`createWorkflowReactAdapter<TContext, TValues>()` creates a private typed context and returns a matched `WorkflowProvider` and `useWorkflow` hook. Consumers cannot supply different generic arguments to the returned hook. This preserves the Provider's context and value types without an erased singleton context or caller type assertions.

تنشئ `createWorkflowReactAdapter<TContext, TValues>()` سياقا خاصا محدد الأنواع، وتعيد `WorkflowProvider` وخطاف `useWorkflow` متطابقين. ولا يستطيع المستهلك توفير أنواع عامة مختلفة للخطاف المعاد. وبذلك يحافظ النظام على أنواع سياق المزود وقيمه دون سياق مفرد ممسوح الأنواع أو تأكيدات أنواع يقدمها المستهلك.

`WorkflowProvider` receives the workflow definition, workflow context, an initial-values factory, initial step, optional event handler, and optional reconciliation override. It creates one engine instance and uses React's external-store subscription mechanism to keep rendering synchronized with engine state without copying workflow rules into React.

يستقبل `WorkflowProvider` تعريف سير العمل وسياقه ومصنع القيم الأولية والخطوة الأولية ومعالج أحداث اختياري ومنسق قيم اختياري بديل. ينشئ نسخة واحدة من المحرك ويستخدم آلية اشتراك React في المخزن الخارجي لمزامنة العرض مع حالة المحرك دون نسخ قواعد سير العمل إلى React.

The event handler is subscribed inside a React effect. The effect replays the current step to preserve initialization behavior and returns the engine unsubscribe function, so an unmounted Provider cannot receive later events.

يتم الاشتراك في معالج الأحداث داخل تأثير React. يعيد التأثير إرسال الخطوة الحالية للحفاظ على سلوك التهيئة، ويعيد دالة إلغاء الاشتراك من المحرك، ولذلك لا يمكن لمزود أزيل من الصفحة استقبال أحداث لاحقة.

The initial-values factory creates a fresh value object for engine initialization and every reset. Reset does not reuse an externally mutable initial-values object reference. The factory must return a new independent value graph each time.

ينشئ مصنع القيم الأولية كائن قيم جديدا عند تهيئة المحرك وعند كل إعادة ضبط. ولا تعيد إعادة الضبط استخدام مرجع خارجي قابل للتغيير للقيم الأولية. ويجب أن يعيد المصنع بنية قيم جديدة ومستقلة في كل استدعاء.

When values change, the Provider delegates reconciliation and dynamic-step recalculation to the engine, then revalidates completed steps. A completed step becomes incomplete if its current data is no longer valid. Back navigation continues to preserve values.

عند تغير القيم، يفوض المزود تنسيق القيم وإعادة حساب الخطوات الديناميكية إلى المحرك، ثم يعيد التحقق من الخطوات المكتملة. تصبح الخطوة المكتملة غير مكتملة إذا لم تعد بياناتها الحالية صالحة. ويستمر التنقل إلى الخلف في الحفاظ على القيم.

### useWorkflow Hook | خطاف useWorkflow

The factory-returned `useWorkflow()` exposes current step, current step ID, visible steps, completed steps, progress, values, current validation result, and forward/back availability. It also exposes `next`, `back`, `goToStep`, `setValue`, `setValues`, `validateCurrentStep`, `completeWorkflow`, and `resetWorkflow`.

يعرض `useWorkflow()` المعاد من المصنع الخطوة الحالية ومعرفها والخطوات الظاهرة والمكتملة والتقدم والقيم ونتيجة التحقق الحالية وإمكانية التقدم والرجوع. ويعرض أيضا `next` و`back` و`goToStep` و`setValue` و`setValues` و`validateCurrentStep` و`completeWorkflow` و`resetWorkflow`.

The hook throws a clear error outside `WorkflowProvider`. Components consume state and invoke actions; they do not recreate navigation, validation, reconciliation, or completion logic.

يعرض الخطاف خطأ واضحا عند استخدامه خارج `WorkflowProvider`. تستهلك المكونات الحالة وتستدعي الإجراءات؛ ولا تعيد إنشاء منطق التنقل أو التحقق أو التنسيق أو الإكمال.

## Product Entry Wizard Shell | هيكل معالج إدخال المنتج

Sprint 03 Task 3.4 adds the first responsive visual shell at `/products/new`. It demonstrates the existing Product Entry workflow without implementing Product form controls, saving, database access, Excel import, image upload, AI, or OCR.

تضيف المهمة 3.4 من السبرنت 03 أول هيكل مرئي متجاوب على المسار `/products/new`. يعرض الهيكل سير عمل إدخال المنتج الحالي دون تنفيذ حقول نموذج المنتج أو الحفظ أو الوصول إلى قاعدة البيانات أو استيراد Excel أو رفع الصور أو الذكاء الاصطناعي أو OCR.

### Shell Structure | بنية الهيكل

- `ProductEntryWizard` owns composition and isolated development-only initialization.
- `ProductEntryWizardHeader` displays the page title, current user-facing step title, and description.
- `ProductEntryProgress` displays percentage, a progress bar, visible steps, the current step, and completed-step revisit controls.
- `ProductEntryStepContent` displays one clear placeholder and nearby validation messages for the active step.
- `ProductEntryNavigation` displays Back, Next, and final-step Complete actions.
- The route page composes only the Product Entry Wizard.

- يتولى `ProductEntryWizard` تركيب الواجهة والتهيئة المؤقتة المعزولة الخاصة بالتطوير.
- يعرض `ProductEntryWizardHeader` عنوان الصفحة وعنوان الخطوة الحالية الموجه للمستخدم ووصفها.
- يعرض `ProductEntryProgress` النسبة وشريط التقدم والخطوات الظاهرة والخطوة الحالية وأزرار العودة إلى الخطوات المكتملة.
- يعرض `ProductEntryStepContent` عنصرا نائبا واضحا ورسائل التحقق بالقرب من محتوى الخطوة النشطة.
- يعرض `ProductEntryNavigation` إجراءات الرجوع والتالي والإكمال في الخطوة الأخيرة.
- تركب صفحة المسار معالج إدخال المنتج فقط.

### Workflow Integration | تكامل سير العمل

The Product Entry-specific adapter is created once with `createWorkflowReactAdapter<ProductEntryWorkflowContext, ProductEntryValues>()`. It exports the matched `ProductEntryWorkflowProvider` and `useProductEntryWorkflow` without caller-supplied generic arguments.

ينشأ محول إدخال المنتج مرة واحدة باستخدام `createWorkflowReactAdapter<ProductEntryWorkflowContext, ProductEntryValues>()`. ويصدر `ProductEntryWorkflowProvider` و`useProductEntryWorkflow` المتطابقين دون أنواع عامة يقدمها المستهلك.

UI components read workflow snapshots and call adapter actions. They do not decide validation, completion, reconciliation, dynamic visibility, or navigation eligibility. The Review step remains last, Images remains optional, future incomplete steps remain disabled, and completed previous steps can be revisited.

تقرأ مكونات الواجهة لقطات سير العمل وتستدعي إجراءات المحول. ولا تقرر التحقق أو الإكمال أو التنسيق أو الظهور الديناميكي أو أهلية التنقل. تبقى المراجعة أخيرا، وتبقى الصور اختيارية، وتظل الخطوات المستقبلية غير المكتملة معطلة، ويمكن العودة إلى الخطوات السابقة المكتملة.

The temporary development context and valid placeholder values are isolated inside `ProductEntryWizard`. They make every shell step reviewable without adding fake form controls or bypassing workflow validation. They must be replaced by resolved Catalog context and real employee input in later tasks.

يعزل سياق التطوير المؤقت والقيم المؤقتة الصالحة داخل `ProductEntryWizard`. وهي تجعل كل خطوات الهيكل قابلة للمراجعة دون إضافة حقول نموذج وهمية أو تجاوز تحقق سير العمل. ويجب استبدالها بسياق الكتالوج المحدد وإدخال الموظف الحقيقي في المهام اللاحقة.

### Dynamic Steps | الخطوات الديناميكية

The progress UI renders only `visibleSteps` from the adapter. When `categoryRequiresDeviceClass` becomes false in a future real context update, Device Class disappears and progress recalculates through the core engine. The UI has no Device Class visibility condition of its own.

تعرض واجهة التقدم `visibleSteps` فقط من المحول. عندما تصبح `categoryRequiresDeviceClass` خاطئة في تحديث حقيقي مستقبلي للسياق، تختفي فئة الجهاز ويعيد المحرك الأساسي حساب التقدم. ولا تحتوي الواجهة على شرط خاص بها لظهور فئة الجهاز.

### Accessibility | إمكانية الوصول

- Navigation actions use semantic buttons and native `disabled` attributes.
- The active progress step uses `aria-current="step"`.
- The progress bar exposes its current numeric value.
- Validation messages use an alert region near the active step.
- Buttons provide visible keyboard focus and large touch targets.
- Step navigation includes accessible labels, while visual numbering remains concise.

- تستخدم إجراءات التنقل أزرارا دلالية وخصائص `disabled` الأصلية.
- تستخدم خطوة التقدم النشطة `aria-current="step"`.
- يعرض شريط التقدم قيمته الرقمية الحالية لتقنيات الوصول.
- تستخدم رسائل التحقق منطقة تنبيه قرب الخطوة النشطة.
- توفر الأزرار تركيز لوحة مفاتيح مرئيا وأهداف لمس كبيرة.
- يتضمن تنقل الخطوات تسميات وصول واضحة مع إبقاء الترقيم المرئي مختصرا.

### Responsive Behavior | السلوك المتجاوب

The shell starts as a single-column layout with horizontal step scrolling, compact spacing, full-height content, and sticky bottom navigation. At wider sizes it uses a centered maximum width, expanded spacing, grid progress steps, and non-sticky navigation. Visible text uses customer-facing labels such as “Product Details” and “Device Specifications.”

يبدأ الهيكل بتخطيط عمود واحد مع تمرير أفقي للخطوات ومسافات مدمجة ومحتوى كامل الارتفاع وتنقل مثبت أسفل الشاشة. وفي الشاشات الأوسع يستخدم عرضا أقصى في المنتصف ومسافات أوسع وشبكة لخطوات التقدم وتنقلا غير مثبت. تستخدم النصوص الظاهرة تسميات موجهة للمستخدم مثل «تفاصيل المنتج» و«مواصفات الجهاز».

## Wizard Step States and Session Actions | حالات خطوات المعالج وإجراءات الجلسة

### English

Every visible Product Entry step has one explicit state:

- **Not Started:** The employee has not completed the step. Future Not Started steps remain disabled.
- **Current:** The active step. It uses `aria-current="step"` and remains visually and textually distinct.
- **Completed:** The step's current values passed its validator and remain valid.
- **Needs Attention:** A previously completed step became invalid after a later value or context change. It loses completion, progress is recalculated, and the employee can revisit it directly.

Pressing Next does not complete a step by itself. The workflow stores the current values, validates them through the step's domain validator, and marks the step Completed only after validation succeeds. Whenever values or context change, completed steps are revalidated. Invalidated completion is removed immediately; compatible values remain preserved through reconciliation.

Previous Completed and Needs Attention steps are reachable. Future incomplete steps remain disabled, Back preserves values, and Review remains the final step. A completed workflow session does not allow Back navigation.

Home and Close are visible wizard actions. When no Product Entry values differ from the initial session values, Close may leave immediately. Home continues to save automatically before navigation. When work exists, Close opens the safe-exit confirmation with:

- **Save Draft and Close:** Saves the active Draft before navigation.
- **Discard Changes and Close:** Discards the active Draft before navigation.
- **Continue Editing:** Returns to Product Entry without losing work.

The confirmation uses semantic dialog behavior, moves focus into the dialog, and treats Escape as Continue Editing.

After Complete successfully validates every applicable step, the active editing shell closes and a completion state replaces it. Back is unavailable. The completion shell provides **Add Another Product**, **Back to Catalog**, and **Home**. Add Another Product resets the workflow to a clean initial session. This state is a UI placeholder and does not save a Product.

Dirty state is derived in the React workflow adapter by comparing current workflow values with the initial session values. Presentational components do not own or duplicate Product Entry values.

### العربية

تملك كل خطوة ظاهرة في إدخال المنتج حالة صريحة واحدة:

- **لم تبدأ:** لم يكمل الموظف الخطوة. وتبقى الخطوات المستقبلية التي لم تبدأ معطلة.
- **الحالية:** الخطوة النشطة. تستخدم `aria-current="step"` وتبقى مميزة بصريا ونصيا.
- **مكتملة:** اجتازت القيم الحالية للخطوة أداة التحقق وما زالت صالحة.
- **تحتاج إلى انتباه:** أصبحت خطوة مكتملة سابقا غير صالحة بعد تغيير لاحق في القيم أو السياق. تفقد حالة الاكتمال، ويعاد حساب التقدم، ويستطيع الموظف العودة إليها مباشرة.

لا يؤدي ضغط التالي وحده إلى إكمال الخطوة. يخزن سير العمل القيم الحالية ويتحقق منها عبر أداة تحقق المجال الخاصة بالخطوة، ولا يعلم الخطوة كمكتملة إلا بعد نجاح التحقق. عند تغير القيم أو السياق، يعاد التحقق من الخطوات المكتملة. تزال حالة الاكتمال غير الصالحة فورا، بينما تبقى القيم المتوافقة محفوظة من خلال التنسيق.

يمكن الوصول إلى الخطوات السابقة المكتملة والخطوات التي تحتاج إلى انتباه. وتبقى الخطوات المستقبلية غير المكتملة معطلة، ويحافظ الرجوع على القيم، وتبقى المراجعة الخطوة الأخيرة. ولا تسمح جلسة سير العمل المكتملة بالرجوع.

إجراءا الرئيسية والإغلاق ظاهران في المعالج. يمكن للإغلاق المغادرة مباشرة من جلسة نظيفة تماما، بينما تستمر الرئيسية في حفظ المسودة تلقائيا قبل التنقل. وعندما يوجد عمل، يفتح الإغلاق تأكيد الخروج الآمن، ويحتوي على:

- **حفظ المسودة والإغلاق:** يحفظ المسودة النشطة قبل التنقل.
- **تجاهل التغييرات والإغلاق:** يتجاهل المسودة النشطة قبل التنقل.
- **متابعة التعديل:** يعود إلى إدخال المنتج دون فقدان العمل.

يستخدم التأكيد سلوك مربع حوار دلاليا، وينقل التركيز إلى داخله، ويعامل مفتاح Escape كاختيار متابعة التعديل.

بعد أن يتحقق إجراء الإكمال بنجاح من كل خطوة منطبقة، يغلق هيكل التعديل النشط وتحل محله حالة اكتمال. ولا يتوفر الرجوع. توفر حالة الاكتمال إجراءات **إضافة منتج آخر** و**العودة إلى الكتالوج** و**الرئيسية**. يعيد إجراء إضافة منتج آخر سير العمل إلى جلسة أولية نظيفة. هذه الحالة هي عنصر نائب للواجهة ولا تحفظ منتجا.

تشتق حالة التغيير داخل محول React لسير العمل من مقارنة قيم سير العمل الحالية بقيم بداية الجلسة. ولا تمتلك مكونات العرض قيم إدخال المنتج ولا تكررها.

## Local Draft Persistence | حفظ المسودة محليا

### English

Product Entry supports a browser-local Draft foundation. The UI calls `ProductEntryDraftService`, the service applies ownership and lifecycle rules, and a replaceable repository writes to browser storage. UI components never access browser storage directly. A future server or Supabase repository may replace the browser implementation without changing Product Entry UI components.

A Draft stores company, workspace, and employee ownership; entry mode; workflow values; current step; completed step IDs; status; and created and updated timestamps. Temporary development ownership identifiers are isolated in one Product Entry configuration file.

Drafts are saved after successful workflow movement, when Home is selected, and when **Save Draft and Close** is selected from Close. An existing active Draft is updated instead of duplicated. Storage failure keeps the workflow open, prevents closing, and displays a clear error.

Home saves automatically and navigates only after success. Close navigates immediately only for a completely clean, unstarted session. Otherwise it offers **Save Draft and Close**, **Discard Changes and Close**, and **Continue Editing**. Discard marks the active Draft discarded before closing.

When Product Entry opens, the most recent active Draft for the current owner is offered before new work begins. **Continue Draft** restores values, entry mode, current step, completion candidates, and timestamps; the engine then reconciles and revalidates the restored state. **Start New Product** discards the old Draft and starts clean. **Delete Draft** permanently removes it and starts clean.

Successful workflow completion removes the active Draft. **Add Another Product** starts a new clean session. Draft persistence never creates or saves a Product.

### العربية

يدعم إدخال المنتج أساسا لحفظ المسودة محليا في المتصفح. تستدعي الواجهة `ProductEntryDraftService`، وتطبق الخدمة قواعد الملكية ودورة الحياة، ويكتب مستودع قابل للاستبدال في تخزين المتصفح. ولا تصل مكونات الواجهة إلى تخزين المتصفح مباشرة. ويمكن لمستودع خادم أو Supabase مستقبلي أن يحل محل تنفيذ المتصفح دون تغيير مكونات واجهة إدخال المنتج.

تحفظ المسودة ملكية الشركة ومساحة العمل والموظف، وطريقة الإدخال، وقيم سير العمل، والخطوة الحالية، ومعرفات الخطوات المكتملة، والحالة، ووقتي الإنشاء والتحديث. وتعزل معرفات الملكية المؤقتة للتطوير في ملف إعداد واحد لإدخال المنتج.

تحفظ المسودات بعد الانتقال الناجح في سير العمل، وعند اختيار الرئيسية، وعند اختيار **حفظ المسودة والإغلاق** من الإغلاق. تحدث المسودة النشطة الحالية بدلا من إنشاء نسخة مكررة. ويبقي فشل التخزين سير العمل مفتوحا، ويمنع الإغلاق، ويعرض خطأ واضحا.

تحفظ الرئيسية تلقائيا ولا تنتقل إلا بعد النجاح. ويغلق إجراء الإغلاق مباشرة فقط جلسة نظيفة تماما لم تبدأ. وإلا فإنه يوفر **حفظ المسودة والإغلاق** و**تجاهل التغييرات والإغلاق** و**متابعة التعديل**. ويعلم التجاهل المسودة النشطة كمتجاهلة قبل الإغلاق.

عند فتح إدخال المنتج، تعرض أحدث مسودة نشطة للمالك الحالي قبل بدء عمل جديد. يعيد **متابعة المسودة** القيم وطريقة الإدخال والخطوة الحالية وحالات الاكتمال المرشحة والأوقات، ثم ينسق المحرك الحالة المستعادة ويعيد التحقق منها. ويعلم **بدء منتج جديد** المسودة القديمة كمتجاهلة ويبدأ جلسة نظيفة. ويحذف **حذف المسودة** المسودة نهائيا ويبدأ جلسة نظيفة.

يزيل اكتمال سير العمل الناجح المسودة النشطة. ويبدأ **إضافة منتج آخر** جلسة نظيفة جديدة. ولا ينشئ حفظ المسودة منتجا ولا يحفظه أبدا.

## Entry Method Step | خطوة طريقة الإدخال

### English

Entry Method is the first real Product Entry step. It presents large semantic radio cards for:

- **Manual Entry:** Enabled, recommended, and selected by default only for a fresh Standard Wizard session. It guides the employee through one Product step by step.
- **Excel Import:** Disabled and marked Available in a Future Version. Its future template will be resolved from Category and optional Device Class.
- **Product Model Lookup:** Disabled and marked Available in a Future Version.
- **Label Scan:** Disabled and marked Available in a Future Version.

Disabled methods cannot receive selection. Next remains unavailable unless the current method is enabled, and the existing Product Entry validator confirms the selection before the step becomes Completed. Validation messages appear beside the method options.

The selected method lives only in workflow values. Back navigation preserves it. Draft restoration restores the saved method before rendering and does not reapply the fresh-session default over restored values.

The options use a fieldset, legend, native radio inputs, visible Selected, Available, and Unavailable text, Recommended and Available in a Future Version badges, large touch targets, keyboard navigation, native disabled behavior, and visible focus rings. State does not depend on color alone.

### العربية

طريقة الإدخال هي أول خطوة حقيقية في إدخال المنتج. تعرض بطاقات اختيار دلالية وكبيرة من نوع radio للخيارات التالية:

- **الإدخال اليدوي:** مفعل وموصى به، ويحدد افتراضيا فقط في جلسة جديدة للمعالج القياسي. ويرشد الموظف لإدخال منتج واحد خطوة بخطوة.
- **استيراد Excel:** معطل ويحمل علامة متاح في إصدار مستقبلي. وسيحدد قالبه المستقبلي من التصنيف وفئة الجهاز الاختيارية.
- **البحث عن نموذج المنتج:** معطل ويحمل علامة متاح في إصدار مستقبلي.
- **مسح الملصق:** معطل ويحمل علامة متاح في إصدار مستقبلي.

لا يمكن تحديد الطرق المعطلة. ويبقى التالي غير متاح ما لم تكن الطريقة الحالية مفعلة، وتؤكد أداة تحقق إدخال المنتج الحالية الاختيار قبل أن تصبح الخطوة مكتملة. وتظهر رسائل التحقق بجانب خيارات الطريقة.

توجد الطريقة المحددة داخل قيم سير العمل فقط. ويحافظ عليها التنقل إلى الخلف. وتستعيد المسودة الطريقة المحفوظة قبل العرض ولا تعيد تطبيق القيمة الافتراضية للجلسة الجديدة فوق القيم المستعادة.

تستخدم الخيارات مجموعة `fieldset` وعنوان `legend` ومدخلات radio أصلية ونصوصا ظاهرة للحالات محدد ومتاح وغير متاح، وعلامتي موصى به ومتاح في إصدار مستقبلي، وأهداف لمس كبيرة، وتنقلا بلوحة المفاتيح، وسلوك التعطيل الأصلي، وحلقات تركيز ظاهرة. ولا تعتمد الحالة على اللون وحده.

## Category Decision Page | صفحة قرار نوع المنتج

### English

Category is the first Catalog decision page and asks one business question: **What would you like to add?** It displays active Categories from the current workspace as reusable semantic radio cards. Each card shows the Category name and its Department as supporting context. The employee selects only the Product Category; QSC resolves and stores `departmentId` from the confirmed Category relationship.

The page obtains data through the Product Entry Category service, which coordinates Category, Department, Product Model, and Specification Template services. The component does not access repositories or mock data. Loading, empty Catalog, query failure, and retry states remain explicit even while the current repositories are synchronous.

Context-provided `categoryId` and `departmentId` appear as selected but remain editable. Workflow validation confirms that the Category and Department exist, are active, belong to the active company and workspace, and match each other. Stale, unavailable, cross-workspace, or mismatched context marks the step Needs Attention and requires another selection. Draft restoration restores both IDs before validation; fresh defaults never replace them.

Context Search is limited to available Categories in the active workspace. It matches Category name, Category code, and Department name without case sensitivity or surrounding whitespace. Search changes only the displayed cards, preserves workflow selection, provides a reset action, and never changes Product Entry values until the employee selects a card.

Selecting a different Category updates `categoryId` and the resolved `departmentId` together through workflow values. The existing reconciliation boundary removes incompatible Device Class, Product Model, Brand, and Specification relationships while preserving compatible Specification values and commercial values. Selecting the current card creates no workflow update or redundant Draft write. The active Draft is updated after a value change and after successful navigation.

The step becomes Completed only after Next runs successful validation. Missing or invalid selection keeps the step Current. A previously completed selection that becomes invalid loses Completed state and becomes Needs Attention when revalidated.

The Responsive First layout uses one column and large touch targets on Mobile, two columns where comfortable on Tablet, and an efficient three-column maximum-width layout on Desktop. Native radio semantics, a fieldset and legend, accessible search labeling, visible focus, selected text, live status messages, and mouse, keyboard, and touch interaction are supported.

Recently Used, Favorites, and Frequently Used Categories may later group the same reusable cards. This task adds no fake history, ranking, storage, or services for those future features.

### العربية

التصنيف هو أول صفحة قرار فعلية في الكتالوج، ويطرح سؤال عمل واحدا: **ما نوع المنتج الذي تريد إضافته؟** تعرض الصفحة التصنيفات النشطة في مساحة العمل الحالية كبطاقات radio دلالية قابلة لإعادة الاستخدام. وتعرض كل بطاقة اسم التصنيف والقسم كسياق مساعد. يختار الموظف تصنيف المنتج فقط، ويحدد QSC قيمة `departmentId` ويحفظها من علاقة التصنيف المؤكدة.

تحصل الصفحة على البيانات من خلال خدمة تصنيفات إدخال المنتج التي تنسق خدمات التصنيف والقسم ونموذج المنتج وقالب المواصفات. ولا يصل المكون إلى المستودعات أو البيانات الوهمية. وتبقى حالات التحميل والكتالوج الفارغ وفشل الاستعلام وإعادة المحاولة واضحة حتى مع كون المستودعات الحالية متزامنة.

تظهر قيمتا `categoryId` و`departmentId` المقدمتان من السياق كمحددتين، لكنهما تبقيان قابلتين للتغيير. ويتحقق سير العمل من وجود التصنيف والقسم ونشاطهما وانتمائهما إلى الشركة ومساحة العمل النشطتين وتطابقهما. ويجعل السياق القديم أو غير المتاح أو التابع لمساحة عمل أخرى أو غير المتطابق الخطوة بحاجة إلى انتباه، ويتطلب اختيارا آخر. وتستعيد المسودة المعرفين قبل التحقق، ولا تستبدلهما القيم الافتراضية الجديدة.

يقتصر البحث ضمن السياق على التصنيفات المتاحة في مساحة العمل النشطة. ويطابق اسم التصنيف ورمزه واسم القسم دون حساسية لحالة الأحرف أو المسافات المحيطة. ويغير البحث البطاقات المعروضة فقط، ويحافظ على اختيار سير العمل، ويوفر إجراء لإعادة الضبط، ولا يغير قيم إدخال المنتج حتى يحدد الموظف بطاقة.

يحدث اختيار تصنيف مختلف `categoryId` و`departmentId` المحدد تلقائيا معا من خلال قيم سير العمل. ويزيل حد التنسيق الحالي علاقات فئة الجهاز ونموذج المنتج والعلامة التجارية والمواصفات غير المتوافقة، مع الحفاظ على قيم المواصفات المتوافقة والقيم التجارية. ولا ينشئ اختيار البطاقة الحالية تحديثا لسير العمل أو كتابة مسودة مكررة. وتحدث المسودة النشطة بعد تغير القيمة وبعد التنقل الناجح.

لا تصبح الخطوة مكتملة إلا بعد أن يشغل زر التالي تحققا ناجحا. ويبقي الاختيار المفقود أو غير الصالح الخطوة حالية. وإذا أصبح اختيار مكتمل سابقا غير صالح، تفقد الخطوة حالة مكتملة وتصبح بحاجة إلى انتباه عند إعادة التحقق.

يستخدم تخطيط Responsive First عمودا واحدا وأهداف لمس كبيرة على الجوال، وعمودين عندما تكون المساحة مريحة على الجهاز اللوحي، وتخطيطا فعالا بحد أقصى ثلاثة أعمدة وعرض مريح على الكمبيوتر. وتدعم الصفحة دلالات radio الأصلية و`fieldset` و`legend` وتسمية بحث قابلة للوصول وتركيزا ظاهرا ونصا يوضح التحديد ورسائل حالة حية والتفاعل بالفأرة ولوحة المفاتيح واللمس.

يمكن مستقبلا تجميع البطاقات القابلة لإعادة الاستخدام نفسها ضمن المستخدمة مؤخرا والمفضلة والتصنيفات كثيرة الاستخدام. ولا تضيف هذه المهمة سجلا أو ترتيبا أو تخزينا أو خدمات وهمية لهذه الميزات المستقبلية.

## Device Class Decision Page | صفحة قرار فئة الجهاز

### English

Device Class is a conditional decision page that asks: **What type of device is this?** It appears only when the selected Category has active Device Class-specific Specification Templates. This follows ADR-0002 and avoids inventing a separate Category-to-Device-Class mapping. Categories with a Category-only template omit the step, remove it from progress, clear stale `deviceClassId` through reconciliation, and continue without blocking.

The page loads active Device Class records for the current company and workspace through the Product Entry Device Class service and `DeviceClassService`. It shows only classes with a confirmed active Specification Template for the selected Category. Cards display the real name and description, use native radio semantics, and never contain hardcoded Device Class records.

Context and Draft values appear selected when valid and remain editable. Validation confirms presence when required, existence, active status, company and workspace ownership, and compatibility with the selected Category. Missing, stale, cross-workspace, or incompatible values cannot complete the step and become Needs Attention after revalidation.

Changing Device Class uses the existing reconciliation boundary. It removes incompatible Brand, Product Model, and Specification values while preserving compatible Specification values, Department, Category, commercial values, and image references. The active Draft persists the decision through the existing automatic Draft behavior.

Responsive First cards use one column on Mobile, two columns on Tablet, and an efficient multi-column layout on Desktop. The fieldset, legend, native radios, visible Selected text, focus indicators, live validation, and large targets support keyboard, mouse, and touch interaction.

### العربية

فئة الجهاز صفحة قرار شرطية تطرح السؤال: **ما نوع هذا الجهاز؟** ولا تظهر إلا عندما يملك التصنيف المحدد قوالب مواصفات نشطة خاصة بفئات الأجهزة. يتبع ذلك ADR-0002 ويتجنب اختراع علاقة منفصلة بين التصنيف وفئة الجهاز. أما التصنيفات التي تملك قالب تصنيف فقط فتتخطى الخطوة، وتحذفها من التقدم، وتمسح قيمة `deviceClassId` القديمة من خلال التنسيق، وتتابع دون تعطيل.

تحمل الصفحة سجلات فئات الأجهزة النشطة للشركة ومساحة العمل الحاليتين من خلال خدمة فئات أجهزة إدخال المنتج و`DeviceClassService`. ولا تعرض إلا الفئات التي تملك قالب مواصفات نشطا ومؤكدا للتصنيف المحدد. تعرض البطاقات الاسم والوصف الحقيقيين، وتستخدم دلالات radio الأصلية، ولا تحتوي على سجلات فئات أجهزة ثابتة.

تظهر قيم السياق والمسودة كمحددة عندما تكون صالحة وتبقى قابلة للتعديل. ويتحقق النظام من وجود القيمة عندما تكون مطلوبة، ووجود فئة الجهاز ونشاطها وملكيتها للشركة ومساحة العمل وتوافقها مع التصنيف المحدد. ولا تستطيع القيم المفقودة أو القديمة أو التابعة لمساحة عمل أخرى أو غير المتوافقة إكمال الخطوة، وتصبح بحاجة إلى انتباه بعد إعادة التحقق.

يستخدم تغيير فئة الجهاز حد التنسيق الحالي. ويزيل العلامة التجارية ونموذج المنتج وقيم المواصفات غير المتوافقة، مع الحفاظ على قيم المواصفات المتوافقة والقسم والتصنيف والقيم التجارية ومراجع الصور. وتحفظ المسودة النشطة القرار من خلال سلوك المسودة التلقائي الحالي.

تستخدم بطاقات Responsive First عمودا واحدا على الجوال، وعمودين على الجهاز اللوحي، وتخطيطا فعالا متعدد الأعمدة على الكمبيوتر. وتدعم مجموعة `fieldset` والعنوان `legend` ومدخلات radio الأصلية ونص التحديد الظاهر ومؤشرات التركيز والتحقق الحي والأهداف الكبيرة التفاعل بلوحة المفاتيح والفأرة واللمس.

## Product Model Decision Page | صفحة قرار نموذج المنتج

### English

Product Model is a business decision page that asks: **Which product model are you adding?** It follows Category and optional Device Class and shows only active models compatible with the current company, workspace, Department, Category, and applicable Device Class. Category-only Products such as Cameras do not require a Device Class before model resolution.

The page obtains display-ready decision options through `ProductEntryProductModelService`, which coordinates Product Model, Brand, and Device Class services. The component does not access repositories or mock data. Each card displays confirmed Product Model name, Brand, model code, and Device Class supporting context when applicable.

Brand is not a repeated employee decision. Selecting a Product Model updates `productModelId`, and the workflow resolves `brandId` from the confirmed current Product Model relationship. Brand validity, ownership, and agreement with the selected Product Model are verified outside the component.

Context-provided and restored `productModelId` and `brandId` remain editable. Draft restoration waits for current Catalog context, then reconciles and revalidates the stored model against company, workspace, Department, Category, optional Device Class, and active Brand data. Fresh initial values do not replace the restored decision. Invalid inherited relationships lose completion, become Needs Attention when applicable, and require a compatible selection.

Context Search filters only the already-compatible Product Model options. It matches confirmed model name, model code, and Brand name without case sensitivity or surrounding whitespace. Search never changes workflow values, preserves a valid selection, and provides clear empty and reset actions.

If no compatible models exist, the page explains that no Product Models are currently available and displays a disabled **Create a New Product Model — Available in a Future Task** action. A future creation flow should preserve Department, Category, and optional Device Class, collect only unresolved Brand and Product Model information, and return with the new model selected. This task adds no creation or persistence behavior.

Changing Product Model uses the existing reconciliation boundary. It resolves the new Brand, clears stale Brand relationships, preserves Specification Values only when compatible with the current resolved template, and preserves Category, Device Class, commercial values, and image references. Full destructive Impact Analysis remains future work.

After selection, a compact confirmed summary shows Selected Model, Brand, and the next Specifications decision. The same decision DTO is suitable for a future Wizard title such as **Add Lenovo LOQ Gaming Laptop** without requerying or duplicating Catalog data.

Responsive First behavior uses one column on Mobile, two columns on Tablet, and an efficient multi-column layout on Desktop. Search, context, cards, selected summary, loading, failure, validation, and empty states remain readable. Native radio semantics, a fieldset and legend, accessible Search labeling, live messages, visible focus, selected text, and large targets support keyboard, mouse, and touch interaction.

### العربية

نموذج المنتج صفحة قرار عمل تطرح السؤال: **ما نموذج المنتج الذي تضيفه؟** تأتي بعد التصنيف وفئة الجهاز الاختيارية، ولا تعرض إلا النماذج النشطة المتوافقة مع الشركة ومساحة العمل والقسم والتصنيف وفئة الجهاز المنطبقة. ولا تتطلب المنتجات المعتمدة على التصنيف فقط، مثل الكاميرات، فئة جهاز قبل تحديد النموذج.

تحصل الصفحة على خيارات قرار جاهزة للعرض من خلال `ProductEntryProductModelService` التي تنسق خدمات نموذج المنتج والعلامة التجارية وفئة الجهاز. ولا يصل المكون إلى المستودعات أو البيانات الوهمية. وتعرض كل بطاقة اسم نموذج المنتج والعلامة التجارية ورمز النموذج وسياق فئة الجهاز عندما ينطبق، وجميعها من بيانات مؤكدة.

العلامة التجارية ليست قرارا مكررا للموظف. يحدث اختيار نموذج المنتج `productModelId`، ويحدد سير العمل `brandId` من علاقة نموذج المنتج الحالية والمؤكدة. ويتم التحقق من صلاحية العلامة التجارية وملكيتها واتفاقها مع نموذج المنتج المحدد خارج المكون.

تبقى قيمتا `productModelId` و`brandId` المقدمتان من السياق أو المستعادتان قابلتين للتعديل. تنتظر استعادة المسودة تحميل سياق الكتالوج الحالي، ثم تنسق النموذج المحفوظ وتعيد التحقق منه مقابل الشركة ومساحة العمل والقسم والتصنيف وفئة الجهاز الاختيارية والعلامة التجارية النشطة. ولا تستبدل القيم الأولية الجديدة القرار المستعاد. وتفقد العلاقات الموروثة غير الصالحة حالة الاكتمال، وتصبح بحاجة إلى انتباه عندما ينطبق، وتتطلب اختيارا متوافقا.

يصفي البحث ضمن السياق خيارات نماذج المنتجات المتوافقة مسبقا فقط. ويطابق اسم النموذج المؤكد ورمزه واسم العلامة التجارية دون حساسية لحالة الأحرف أو المسافات المحيطة. ولا يغير البحث قيم سير العمل، ويحافظ على الاختيار الصالح، ويوفر حالتي فراغ وإعادة ضبط واضحتين.

إذا لم توجد نماذج متوافقة، تشرح الصفحة عدم توفر نماذج منتجات حاليا وتعرض إجراء **إنشاء نموذج منتج جديد — متاح في مهمة مستقبلية** معطلا. ويجب أن يحافظ مسار الإنشاء المستقبلي على القسم والتصنيف وفئة الجهاز الاختيارية، وأن يجمع معلومات العلامة التجارية ونموذج المنتج غير المحددة فقط، ثم يعود مع تحديد النموذج الجديد. ولا تضيف هذه المهمة إنشاء أو حفظا.

يستخدم تغيير نموذج المنتج حد التنسيق الحالي. ويحدد العلامة التجارية الجديدة ويمسح علاقات العلامة التجارية القديمة، ويحافظ على قيم المواصفات فقط عندما تتوافق مع القالب الحالي المحدد، ويحافظ على التصنيف وفئة الجهاز والقيم التجارية ومراجع الصور. ويبقى تحليل التأثير التدميري الكامل عملا مستقبليا.

بعد الاختيار، يعرض ملخص مؤكد وموجز النموذج المحدد والعلامة التجارية وقرار المواصفات التالي. ويصلح DTO القرار نفسه لعنوان معالج مستقبلي مثل **إضافة Lenovo LOQ Gaming Laptop** دون إعادة الاستعلام أو تكرار بيانات الكتالوج.

يستخدم سلوك Responsive First عمودا واحدا على الجوال، وعمودين على الجهاز اللوحي، وتخطيطا فعالا متعدد الأعمدة على الكمبيوتر. وتبقى حالات البحث والسياق والبطاقات والملخص المحدد والتحميل والفشل والتحقق والفراغ مقروءة. وتدعم دلالات radio الأصلية و`fieldset` و`legend` وتسمية البحث القابلة للوصول والرسائل الحية والتركيز الظاهر ونص التحديد والأهداف الكبيرة التفاعل بلوحة المفاتيح والفأرة واللمس.
## Dynamic Specifications Decision Step

### English

The Specifications step resolves its active field set through `Category + optional Device Class -> Specification Template -> Template Fields -> Specification Fields`. Product Entry UI never assigns fixed technical fields to a Category. The Product Entry Specifications service verifies company and workspace ownership, resolves the active Template, orders active Template Fields, and returns presentation-ready field decisions.

The step supports the approved text, number, select, and boolean field types. Required and optional status comes from the resolved Template Field. Required text is trimmed, numbers must be finite, select values must belong to confirmed configured options, and both `true` and `false` are valid explicit boolean decisions. When a select field has no confirmed options, QSC reports a configuration error and does not invent choices.

A missing Template blocks completion and is different from a valid active Template with no fields. An intentionally empty Template displays that no additional specifications are required and completes successfully. Completion is based on live Template validation, not merely on pressing Next. The step summarizes progress using required fields only.

Draft Entry restores `specificationValues`, re-resolves the Template from live Catalog data, preserves compatible field IDs, removes incompatible values, and revalidates completion and Needs Attention. Category, Device Class, and Product Model changes use the same reconciliation boundary; shared compatible fields remain while unrelated fields are removed. Commercial Details and Images remain untouched.

The Responsive First layout uses one comfortable field group per row on Mobile, up to two readable columns on Tablet, and an efficient multi-column layout on Desktop. Native inputs, connected labels, semantic required state, fieldsets and legends for Yes/No decisions, visible focus, field-level messages, and live loading/error states support keyboard, touch, and assistive technology use.

Confirmed dynamic Specification values remain in Product Entry workflow state together with Category, optional Device Class, Brand, and Product Model context. This creates a future application boundary for Sales Intelligence without implementing Sales Intelligence or generating sales content in this step.

### العربية

تحدد خطوة المواصفات مجموعة الحقول النشطة من خلال المسار: `التصنيف + فئة الجهاز الاختيارية -> قالب المواصفات -> حقول القالب -> حقول المواصفات`. ولا تحدد واجهة إدخال المنتج حقولاً تقنية ثابتة لأي تصنيف. تتحقق خدمة مواصفات إدخال المنتج من ملكية الشركة ومساحة العمل، وتحل القالب النشط، وترتب حقول القالب النشطة، ثم تعيد قرارات حقول جاهزة للعرض.

تدعم الخطوة أنواع الحقول المعتمدة: النص والرقم والاختيار والقيمة المنطقية. وتأتي حالة الإلزام أو الاختيار من حقل القالب المحلول. تُزال المسافات من النص المطلوب عند التحقق، ويجب أن تكون الأرقام محدودة وصحيحة، ويجب أن تنتمي قيم الاختيار إلى الخيارات المؤكدة والمهيأة، وتُعد القيمتان `true` و`false` قرارين صريحين صالحين للحقول المنطقية. وإذا لم تتوفر خيارات مؤكدة لحقل اختيار، يعرض QSC خطأ إعداد ولا يخترع قيماً.

يمنع غياب القالب إكمال الخطوة، وهو يختلف عن وجود قالب نشط وصالح بلا حقول. يعرض القالب الفارغ المقصود أن المنتج لا يحتاج إلى مواصفات إضافية ويسمح بإكمال الخطوة. يعتمد الإكمال على التحقق الحي من القالب، وليس على الضغط على زر التالي فقط. ويحسب ملخص التقدم الحقول المطلوبة فقط.

يعيد مسار المسودة قيم `specificationValues`، ثم يعيد حل القالب من بيانات الكتالوج الحية، ويحافظ على معرفات الحقول المتوافقة، ويحذف القيم غير المتوافقة، ويعيد حساب الاكتمال وحالة يحتاج إلى انتباه. وتستخدم تغييرات التصنيف أو فئة الجهاز أو موديل المنتج حد المصالحة نفسه؛ فتبقى الحقول المشتركة المتوافقة وتُحذف الحقول غير المرتبطة. وتبقى التفاصيل التجارية والصور دون تغيير.

يستخدم تصميم Responsive First مجموعة حقل مريحة واحدة في كل صف على الجوال، وحتى عمودين مقروءين على الجهاز اللوحي، وتخطيطاً فعالاً متعدد الأعمدة على الكمبيوتر. وتدعم المدخلات الأصلية والتسميات المرتبطة والحالة الإلزامية الدلالية ومجموعات الحقول وعناوينها لقرارات نعم أو لا والتركيز المرئي ورسائل الحقول وحالات التحميل والخطأ الحية استخدام لوحة المفاتيح واللمس وتقنيات المساعدة.

تبقى قيم المواصفات الديناميكية المؤكدة في حالة سير عمل إدخال المنتج مع سياق التصنيف وفئة الجهاز الاختيارية والعلامة التجارية وموديل المنتج. ويوفر ذلك حداً تطبيقياً مستقبلياً لمحرك Sales Intelligence دون تنفيذ المحرك أو توليد محتوى مبيعات في هذه الخطوة.
## Normalized Specification Select Decisions

### English

Dynamic Specifications resolves every select field through its optional Specification Option Set relationship and returns active ordered Options as presentation DTOs. Product Entry stores each selected Option's stable normalized value, not its array index, display label, Option ID, or a combined presentation string.

RAM Capacity and RAM Type appear as independent decisions in every current Laptop Template. For example, Capacity stores `16` and Type stores `DDR5`. A future summary may display `16 GB DDR5`, while validation, Drafts, Search, comparison, Excel, upgrade rules, and Sales Intelligence continue using both values independently.

Draft restoration re-resolves active scoped Option Sets. A saved select value is preserved only while its field remains in the Template and its normalized value remains active in the current Option Set. A removed, inactive, or cross-workspace value is deleted without choosing a replacement; required fields then become Needs Attention. Reconciliation treats each field independently and preserves Commercial Details and Images.

### العربية

تحل المواصفات الديناميكية كل حقل اختيار من خلال علاقته الاختيارية بمجموعة خيارات المواصفات، ثم تعيد الخيارات النشطة والمرتبة ضمن DTO للعرض. يخزن إدخال المنتج القيمة المعيارية المستقرة للخيار المحدد، وليس فهرس المصفوفة أو تسمية العرض أو معرف الخيار أو عبارة عرض مدمجة.

تظهر سعة RAM ونوع RAM كقرارين مستقلين في جميع قوالب اللابتوب الحالية. فعلى سبيل المثال تخزن السعة `16` ويخزن النوع `DDR5`. ويمكن لملخص مستقبلي عرض `16 GB DDR5`، بينما يستمر التحقق والمسودات والبحث والمقارنة وExcel وقواعد الترقية ومحرك Sales Intelligence في استخدام القيمتين بصورة مستقلة.

تعيد استعادة المسودة حل مجموعات الخيارات النشطة ومحددة النطاق. ولا تُحفظ قيمة اختيار مخزنة إلا إذا بقي حقلها في القالب وبقيت قيمتها المعيارية نشطة في مجموعة الخيارات الحالية. وتُحذف القيمة المحذوفة أو غير النشطة أو التابعة لمساحة أخرى دون اختيار بديل، ثم تصبح الحقول المطلوبة بحاجة إلى انتباه. وتعالج المصالحة كل حقل بصورة مستقلة وتحافظ على التفاصيل التجارية والصور.
## Commercial Details Decision Step

### English

Commercial Details asks one coherent business question: how should this Product be presented and tracked commercially? The Responsive First page groups values into Identity, Pricing, Availability, and progressively disclosed Additional Settings without creating extra Workflow steps.

Identity contains the required editable Product Name and optional Product Code. Both values trim surrounding whitespace when editing finishes. Product Code remains employee-entered, preserves casing, performs no duplicate lookup, and is ready for future lookup, barcode association, or approved code generation. This task intentionally leaves fresh Product Name empty rather than introducing an unapproved naming rule.

Pricing stores required `retailPrice` and optional `wholesalePrice` separately. Both reject negative and non-finite values; the page provides only a non-blocking review warning when wholesale exceeds retail. Currency is required and comes from one Product Entry configuration boundary. The currently confirmed development currency is USD; no exchange rates, conversion, tax, discount, margin, or accounting rules are applied.

Availability contains a required whole non-negative Catalog quantity, New or Used condition, and the canonical Product statuses displayed as In Stock, Arrived at Port, and On the Way. In Stock with zero quantity blocks completion because it would mislead employees. Zero remains valid for Arrived at Port and On the Way, and neither status creates shipments, Inventory movements, or expected dates.

Additional Settings contains **Feature this product** and **Show this product in the Catalog**. Fresh sessions default Featured to No and future Catalog visibility to Yes. A Product Entry Draft remains incomplete work and never becomes an active Catalog Product. Draft restoration preserves all commercial values and migrates the former single `price` value to `retailPrice`; approved option changes revalidate the step and remove completion without changing unaffected values.

Mobile uses one large touch-friendly control per row. Tablet uses readable two-column groups, while Desktop aligns Pricing and Availability into efficient three-column rows. Product Name remains full width. Native text, number, select, radio, fieldset, legend, required, invalid, described-by, focus, keyboard, mouse, and touch behaviors support accessible and productive entry. The compact summary reports confirmed prices, condition, status, and quantity without calculating commercial derivatives.

The commercial values remain available beside confirmed Product context and Specifications for future Batch Entry defaults, dynamic Excel columns, Product positioning, availability-aware recommendations, and Sales Intelligence. Those capabilities are not implemented here.

### العربية

تطرح التفاصيل التجارية سؤال عمل مترابطاً واحداً: كيف يجب عرض هذا المنتج ومتابعته تجارياً؟ تجمع صفحة Responsive First القيم ضمن الهوية والتسعير والتوفر والإعدادات الإضافية القابلة للكشف التدريجي دون إنشاء خطوات سير عمل إضافية.

تحتوي الهوية على اسم المنتج المطلوب والقابل للتعديل ورمز المنتج الاختياري. وتُزال المسافات المحيطة من القيمتين عند انتهاء التحرير. يبقى رمز المنتج مدخلاً بواسطة الموظف ويحافظ على حالة الأحرف ولا ينفذ فحص التكرار، مع جاهزيته للبحث المستقبلي أو ربط الباركود أو توليد الرموز المعتمد. وتترك هذه المهمة اسم المنتج الجديد فارغاً بدلاً من إدخال قاعدة تسمية غير معتمدة.

يخزن التسعير `retailPrice` المطلوب و`wholesalePrice` الاختياري بصورة منفصلة. ترفض القيمتان الأرقام السالبة وغير المحدودة، وتعرض الصفحة تنبيهاً غير مانع للمراجعة فقط عندما يتجاوز سعر الجملة سعر التجزئة. العملة مطلوبة وتأتي من حد إعداد واحد لإدخال المنتج. العملة المؤكدة حالياً للتطوير هي USD، ولا تُطبق أسعار صرف أو تحويل أو ضرائب أو خصومات أو هوامش أو قواعد محاسبية.

يحتوي التوفر على كمية كتالوج صحيحة وغير سالبة ومطلوبة، وحالة جديد أو مستخدم، وحالات المنتج الأساسية المعروضة بصيغة متوفر في المخزون ووصل إلى الميناء وفي الطريق. يمنع وجود حالة متوفر في المخزون مع كمية صفر إكمال الخطوة لأنه يضلل الموظفين. وتبقى الكمية صفر صالحة لحالتي وصل إلى الميناء وفي الطريق، ولا تنشئ أي منهما شحنات أو حركات مخزون أو تواريخ وصول.

تحتوي الإعدادات الإضافية على **تمييز هذا المنتج** و**عرض هذا المنتج في الكتالوج**. تبدأ الجلسات الجديدة بحالة غير مميز وبظهور مستقبلي في الكتالوج. وتبقى مسودة إدخال المنتج عملاً غير مكتمل ولا تصبح منتجاً نشطاً في الكتالوج. تحافظ استعادة المسودة على كل القيم التجارية وتنقل قيمة `price` المنفردة السابقة إلى `retailPrice`؛ كما تعيد تغييرات الخيارات المعتمدة التحقق من الخطوة وتزيل اكتمالها دون تغيير القيم السليمة الأخرى.

يستخدم الجوال عنصراً كبيراً مناسباً للمس في كل صف. ويستخدم الجهاز اللوحي مجموعات مقروءة بعمودين، بينما يصطف التسعير والتوفر في صفوف فعالة من ثلاثة أعمدة على الكمبيوتر. ويبقى اسم المنتج بعرض كامل. تدعم عناصر النص والرقم والاختيار والراديو ومجموعات الحقول وعناوينها والحالة المطلوبة وغير الصالحة والوصف والتركيز الأصلية الإدخال المتاح والفعال بلوحة المفاتيح والفأرة واللمس. ويعرض الملخص المدمج الأسعار والحالة والتوفر والكمية المؤكدة دون حساب مشتقات تجارية.

تبقى القيم التجارية متاحة بجانب سياق المنتج ومواصفاته المؤكدة لدعم إعدادات الإدخال الدفعي وأعمدة Excel الديناميكية وتموضع المنتج والتوصيات الواعية بالتوفر ومحرك Sales Intelligence مستقبلاً. ولا تنفذ هذه القدرات هنا.
## Product Identity Card and Decision Summary

### English

The Product Identity Card is the reusable presentation boundary for the Product Entry Decision Summary. A Product Entry identity presenter combines current Workflow values, resolved Catalog labels, existing validation state, resolved Specification completion, and existing Draft state into a read-only view model. The card owns no Product data, form state, validation state, or Draft storage and performs no Catalog resolution.

The Product Type section shows only confirmed Category, optional Device Class, Brand, and Product Model decisions. The Specifications section reuses the Product Entry Specifications completion calculation and reports completed required fields as `x / y Required`, adding **Needs Attention** when the resolved step is incomplete or invalid. The Commercial section shows only confirmed Retail Price, optional Wholesale Price, Condition, Availability, and Quantity. Missing values are omitted rather than replaced with placeholders.

The Draft section compares current workflow values with the existing active Draft and reports **Draft Saved** or **Unsaved Changes**. It does not create another Draft status, persistence mechanism, or browser-storage dependency. Category, Device Class, Product Model, Specification, Commercial, and reconciliation updates flow through the existing workflow values and therefore update the live summary without copying them into component state.

The progressive card title uses the confirmed Product Name when valid. Otherwise, it uses confirmed Product Model or Catalog labels without inventing marketing language or modifying Product Name. When no identity decision is confirmed, a neutral message explains that identity will appear progressively. Failed Catalog presentation resolution produces a review message rather than stale or invented identity.

On Mobile, the card uses compact vertically stacked content before the current decision page. Tablet layouts retain a compact readable card above or beside content according to available width. On Desktop, it occupies a dedicated sticky sidebar while the decision page uses the wider primary column. Semantic headings, definition lists, explicit status text, and logical reading order communicate state without relying on color. The card intentionally avoids a live region around changing commercial values so normal typing does not trigger excessive announcements.

The same Product Identity view-model concept may later support final Review. Future context-specific adapters may support smaller Search cards or customer-facing WhatsApp previews; those presentations must apply their own disclosure rules, such as excluding wholesale price and Draft status. Sales Intelligence may consume confirmed identity and Specifications through its application boundary, but neither the card nor presenter generates knowledge, recommendations, or marketing content.

### العربية

بطاقة هوية المنتج هي حد العرض القابل لإعادة الاستخدام لملخص قرارات إدخال المنتج. يجمع مقدم هوية إدخال المنتج قيم سير العمل الحالية وتسميات الكتالوج المحلولة وحالة التحقق الموجودة واكتمال المواصفات المحلول وحالة المسودة الموجودة في نموذج عرض للقراءة فقط. ولا تمتلك البطاقة بيانات المنتج أو حالة النموذج أو حالة التحقق أو تخزين المسودة، ولا تحل علاقات الكتالوج بنفسها.

يعرض قسم نوع المنتج فقط قرارات التصنيف وفئة الجهاز الاختيارية والعلامة التجارية وموديل المنتج المؤكدة. ويعيد قسم المواصفات استخدام حساب اكتمال مواصفات إدخال المنتج ويعرض الحقول المطلوبة المكتملة بصيغة `x / y مطلوبة`، مع إضافة **يحتاج إلى انتباه** عندما تكون الخطوة المحلولة غير مكتملة أو غير صالحة. ويعرض القسم التجاري فقط سعر التجزئة وسعر الجملة الاختياري والحالة والتوفر والكمية المؤكدة. وتُحذف القيم المفقودة بدلاً من عرض عناصر نائبة.

يقارن قسم المسودة قيم سير العمل الحالية بالمسودة النشطة الموجودة ويعرض **تم حفظ المسودة** أو **تغييرات غير محفوظة**. ولا ينشئ حالة مسودة أخرى أو آلية حفظ أو اعتماداً جديداً على تخزين المتصفح. تمر تغييرات التصنيف وفئة الجهاز وموديل المنتج والمواصفات والتفاصيل التجارية والمصالحة عبر قيم سير العمل الحالية، ولذلك تحدث الملخص مباشرة دون نسخها إلى حالة المكون.

يستخدم عنوان البطاقة التدريجي اسم المنتج المؤكد عندما يكون صالحاً. وإلا فإنه يستخدم موديل المنتج المؤكد أو تسميات الكتالوج دون اختراع لغة تسويقية أو تعديل اسم المنتج. وعندما لا توجد هوية مؤكدة، توضح رسالة محايدة أن الهوية ستظهر تدريجياً. كما يؤدي فشل إعداد عرض الهوية إلى رسالة مراجعة بدلاً من إظهار هوية قديمة أو مخترعة.

تستخدم البطاقة على الجوال محتوى مدمجاً متتابعاً رأسياً قبل صفحة القرار الحالي. وتحافظ تخطيطات الجهاز اللوحي على بطاقة مقروءة فوق المحتوى أو بجانبه حسب المساحة. وعلى الكمبيوتر تشغل البطاقة شريطاً جانبياً ثابتاً بينما تستخدم صفحة القرار العمود الأساسي الأوسع. وتنقل العناوين الدلالية وقوائم التعريف ونصوص الحالة الصريحة الحالة دون الاعتماد على اللون. وتتجنب البطاقة عمداً وضع القيم التجارية المتغيرة داخل منطقة حية حتى لا تعلن تقنيات المساعدة كل ضغطة مفتاح.

يمكن لمفهوم نموذج عرض هوية المنتج نفسه دعم المراجعة النهائية مستقبلاً. وقد تستخدم محولات مستقبلية مخصصة للسياق بطاقات بحث أصغر أو معاينات WhatsApp موجهة للعملاء، ويجب أن تطبق هذه العروض قواعد الإفصاح الخاصة بها مثل استبعاد سعر الجملة وحالة المسودة. ويمكن لمحرك Sales Intelligence استهلاك الهوية والمواصفات المؤكدة عبر حد التطبيق الخاص به، لكن البطاقة ومقدم العرض لا يولدان معرفة أو توصيات أو محتوى تسويقياً.
