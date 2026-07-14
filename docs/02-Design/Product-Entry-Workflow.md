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
8. Optional is step metadata for consumers. It does not bypass a validator when the consumer provides one.

1. تصبح أول خطوة ظاهرة ومفعلة هي الخطوة الحالية.
2. يتحقق `next()` من الخطوة الحالية. تبقى الخطوة غير الصالحة حالية وتعرض مشاكل التحقق.
3. تعلم الخطوة الصالحة كمكتملة قبل الانتقال إلى الخطوة الظاهرة والمفعلة التالية.
4. يؤدي إكمال آخر خطوة قابلة للتنقل إلى إكمال سير العمل.
5. ينتقل `back()` خطوة واحدة إلى الخلف بين الخطوات الظاهرة والمفعلة دون حذف القيم أو سجل الإكمال.
6. يسمح `jumpTo()` بالانتقال فقط إلى خطوة ظاهرة ومفعلة ومكتملة سابقا.
7. الخطوات المخفية والمعطلة ليست أهدافا للتنقل ولا تدخل في حساب التقدم.
8. الاختيارية هي وصف للخطوة يستخدمه المستهلك، ولا تتجاوز أداة التحقق إذا وفرها المستهلك.

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
