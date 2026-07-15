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

Sprint 03 Task 3.4 adds the first mobile-first visual shell at `/products/new`. It demonstrates the existing Product Entry workflow without implementing Product form controls, saving, database access, Excel import, image upload, AI, or OCR.

تضيف المهمة 3.4 من السبرنت 03 أول هيكل مرئي موجه للجوال على المسار `/products/new`. يعرض الهيكل سير عمل إدخال المنتج الحالي دون تنفيذ حقول نموذج المنتج أو الحفظ أو الوصول إلى قاعدة البيانات أو استيراد Excel أو رفع الصور أو الذكاء الاصطناعي أو OCR.

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

### Mobile-First Behavior | السلوك الموجه للجوال

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

Home and Cancel are visible wizard actions. When no Product Entry values differ from the initial session values, either action may leave immediately. When values changed, both actions open the same unsaved-changes confirmation with:

- **Continue Editing:** Close the dialog and preserve the active session.
- **Discard Changes:** Leave Product Entry without persistence.
- **Save Draft:** Visible but disabled with **Coming Soon** until Draft persistence is implemented.

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

إجراءا الرئيسية والإلغاء ظاهران في المعالج. عندما لا تختلف قيم إدخال المنتج عن قيم بداية الجلسة، يمكن لأي منهما المغادرة مباشرة. وعندما تتغير القيم، يفتح الإجراءان تأكيد التغييرات غير المحفوظة نفسه، ويحتوي على:

- **متابعة التعديل:** إغلاق مربع الحوار والحفاظ على الجلسة النشطة.
- **تجاهل التغييرات:** مغادرة إدخال المنتج دون حفظ.
- **حفظ المسودة:** ظاهر لكنه معطل ويحمل عبارة **قريبا** حتى يتم تنفيذ حفظ المسودات.

يستخدم التأكيد سلوك مربع حوار دلاليا، وينقل التركيز إلى داخله، ويعامل مفتاح Escape كاختيار متابعة التعديل.

بعد أن يتحقق إجراء الإكمال بنجاح من كل خطوة منطبقة، يغلق هيكل التعديل النشط وتحل محله حالة اكتمال. ولا يتوفر الرجوع. توفر حالة الاكتمال إجراءات **إضافة منتج آخر** و**العودة إلى الكتالوج** و**الرئيسية**. يعيد إجراء إضافة منتج آخر سير العمل إلى جلسة أولية نظيفة. هذه الحالة هي عنصر نائب للواجهة ولا تحفظ منتجا.

تشتق حالة التغيير داخل محول React لسير العمل من مقارنة قيم سير العمل الحالية بقيم بداية الجلسة. ولا تمتلك مكونات العرض قيم إدخال المنتج ولا تكررها.

## Local Draft Persistence | حفظ المسودة محليا

### English

Product Entry supports a browser-local Draft foundation. The UI calls `ProductEntryDraftService`, the service applies ownership and lifecycle rules, and a replaceable repository writes to browser storage. UI components never access browser storage directly. A future server or Supabase repository may replace the browser implementation without changing Product Entry UI components.

A Draft stores company, workspace, and employee ownership; entry mode; workflow values; current step; completed step IDs; status; and created and updated timestamps. Temporary development ownership identifiers are isolated in one Product Entry configuration file.

Drafts are saved after successful workflow movement, when Home is selected, and when **Save Draft and Exit** is selected from Cancel. An existing active Draft is updated instead of duplicated. Storage failure keeps the workflow open, prevents exit, and displays a clear error.

Home saves automatically and navigates only after success. Cancel exits immediately only for a completely clean, unstarted session. Otherwise it offers **Save Draft and Exit**, **Discard Changes and Exit**, and **Continue Editing**. Discard marks the active Draft discarded before exit.

When Product Entry opens, the most recent active Draft for the current owner is offered before new work begins. **Continue Draft** restores values, entry mode, current step, completion candidates, and timestamps; the engine then reconciles and revalidates the restored state. **Start New Product** discards the old Draft and starts clean. **Delete Draft** permanently removes it and starts clean.

Successful workflow completion removes the active Draft. **Add Another Product** starts a new clean session. Draft persistence never creates or saves a Product.

### العربية

يدعم إدخال المنتج أساسا لحفظ المسودة محليا في المتصفح. تستدعي الواجهة `ProductEntryDraftService`، وتطبق الخدمة قواعد الملكية ودورة الحياة، ويكتب مستودع قابل للاستبدال في تخزين المتصفح. ولا تصل مكونات الواجهة إلى تخزين المتصفح مباشرة. ويمكن لمستودع خادم أو Supabase مستقبلي أن يحل محل تنفيذ المتصفح دون تغيير مكونات واجهة إدخال المنتج.

تحفظ المسودة ملكية الشركة ومساحة العمل والموظف، وطريقة الإدخال، وقيم سير العمل، والخطوة الحالية، ومعرفات الخطوات المكتملة، والحالة، ووقتي الإنشاء والتحديث. وتعزل معرفات الملكية المؤقتة للتطوير في ملف إعداد واحد لإدخال المنتج.

تحفظ المسودات بعد الانتقال الناجح في سير العمل، وعند اختيار الرئيسية، وعند اختيار **حفظ المسودة والخروج** من الإلغاء. تحدث المسودة النشطة الحالية بدلا من إنشاء نسخة مكررة. ويبقي فشل التخزين سير العمل مفتوحا، ويمنع الخروج، ويعرض خطأ واضحا.

تحفظ الرئيسية تلقائيا ولا تنتقل إلا بعد النجاح. ويخرج الإلغاء مباشرة فقط من جلسة نظيفة تماما لم تبدأ. وإلا فإنه يوفر **حفظ المسودة والخروج** و**تجاهل التغييرات والخروج** و**متابعة التعديل**. ويعلم التجاهل المسودة النشطة كمتجاهلة قبل الخروج.

عند فتح إدخال المنتج، تعرض أحدث مسودة نشطة للمالك الحالي قبل بدء عمل جديد. يعيد **متابعة المسودة** القيم وطريقة الإدخال والخطوة الحالية وحالات الاكتمال المرشحة والأوقات، ثم ينسق المحرك الحالة المستعادة ويعيد التحقق منها. ويعلم **بدء منتج جديد** المسودة القديمة كمتجاهلة ويبدأ جلسة نظيفة. ويحذف **حذف المسودة** المسودة نهائيا ويبدأ جلسة نظيفة.

يزيل اكتمال سير العمل الناجح المسودة النشطة. ويبدأ **إضافة منتج آخر** جلسة نظيفة جديدة. ولا ينشئ حفظ المسودة منتجا ولا يحفظه أبدا.

## Entry Method Step | خطوة طريقة الإدخال

### English

Entry Method is the first real Product Entry step. It presents large semantic radio cards for:

- **Manual Entry:** Enabled, recommended, and selected by default only for a fresh Standard Wizard session. It guides the employee through one Product step by step.
- **Excel Import:** Disabled and marked Coming Soon. Its future template will be resolved from Category and optional Device Class.
- **Product Model Lookup:** Disabled and marked Coming Soon.
- **Label Scan:** Disabled and marked Coming Soon.

Disabled methods cannot receive selection. Next remains unavailable unless the current method is enabled, and the existing Product Entry validator confirms the selection before the step becomes Completed. Validation messages appear beside the method options.

The selected method lives only in workflow values. Back navigation preserves it. Draft restoration restores the saved method before rendering and does not reapply the fresh-session default over restored values.

The options use a fieldset, legend, native radio inputs, visible Selected, Available, and Unavailable text, Recommended and Coming Soon badges, large touch targets, keyboard navigation, native disabled behavior, and visible focus rings. State does not depend on color alone.

### العربية

طريقة الإدخال هي أول خطوة حقيقية في إدخال المنتج. تعرض بطاقات اختيار دلالية وكبيرة من نوع radio للخيارات التالية:

- **الإدخال اليدوي:** مفعل وموصى به، ويحدد افتراضيا فقط في جلسة جديدة للمعالج القياسي. ويرشد الموظف لإدخال منتج واحد خطوة بخطوة.
- **استيراد Excel:** معطل ويحمل علامة قريبا. وسيحدد قالبه المستقبلي من التصنيف وفئة الجهاز الاختيارية.
- **البحث عن نموذج المنتج:** معطل ويحمل علامة قريبا.
- **مسح الملصق:** معطل ويحمل علامة قريبا.

لا يمكن تحديد الطرق المعطلة. ويبقى التالي غير متاح ما لم تكن الطريقة الحالية مفعلة، وتؤكد أداة تحقق إدخال المنتج الحالية الاختيار قبل أن تصبح الخطوة مكتملة. وتظهر رسائل التحقق بجانب خيارات الطريقة.

توجد الطريقة المحددة داخل قيم سير العمل فقط. ويحافظ عليها التنقل إلى الخلف. وتستعيد المسودة الطريقة المحفوظة قبل العرض ولا تعيد تطبيق القيمة الافتراضية للجلسة الجديدة فوق القيم المستعادة.

تستخدم الخيارات مجموعة `fieldset` وعنوان `legend` ومدخلات radio أصلية ونصوصا ظاهرة للحالات محدد ومتاح وغير متاح، وعلامتي موصى به وقريبا، وأهداف لمس كبيرة، وتنقلا بلوحة المفاتيح، وسلوك التعطيل الأصلي، وحلقات تركيز ظاهرة. ولا تعتمد الحالة على اللون وحده.
