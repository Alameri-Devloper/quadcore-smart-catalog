# QSC Development Strategy

## English

## Purpose

This document defines the official development strategy for QSC. It explains how approved product direction becomes small implementation tasks, how those tasks combine into milestones, and how each milestone is validated before release.

This strategy does not replace the Product Vision, Product Design Principles, UX Guidelines, accepted Architecture Decision Records, or approved architecture. Every implementation must satisfy those documents.

## Mandatory Principle

**Implement feature-by-feature.**

**Validate milestone-by-milestone.**

A feature is the smallest independently reviewable unit of employee or system value. A milestone is a coherent group of features that together produce a complete, testable business outcome. Passing feature checks does not replace validating the integrated milestone.

## 1. Milestone-Based Development

Development is organized around milestones with explicit business outcomes, scope, dependencies, acceptance criteria, and release expectations.

Each milestone must:

- Deliver a coherent employee or customer outcome.
- Define what is included and explicitly excluded.
- Respect approved domain, tenant, workflow, service, repository, and data-quality boundaries.
- Identify applicable ADRs and product principles before implementation begins.
- Include validation across all completed features, not only the final task.
- End with a documented milestone review and decision.

Milestones must not be treated as collections of unrelated tasks. If the combined result cannot be explained, demonstrated, and validated as one business capability, the scope should be reorganized.

## 2. Feature-by-Feature Implementation

Every milestone is implemented one feature at a time. Each feature should be small enough to understand, reproduce, implement, review, and verify without introducing unrelated work.

For every feature:

1. Read the Product Vision, Product Design Principles, UX Guidelines, applicable domain documentation, and relevant ADRs.
2. Reproduce the current behavior or confirm the missing capability.
3. Identify and explain the root cause or implementation boundary.
4. Define the smallest safe scope and explicit exclusions.
5. Implement through the approved architecture.
6. Verify behavior, data quality, tenant scope, responsive behavior, accessibility, and regression risk as applicable.
7. Update bilingual documentation when behavior or guidance changes.
8. Stop for review before continuing to the next feature.

Feature work must not silently expand into the next workflow step, another domain, future intelligence, persistence, or infrastructure unless that work is explicitly approved.

## 3. Milestone Validation

After all planned features are individually accepted, the complete milestone must be validated as an integrated experience.

Milestone validation must confirm:

- The end-to-end business journey works.
- Features cooperate through the approved boundaries.
- Earlier features still behave correctly after later changes.
- Conditional, context-aware, Draft, reconciliation, and recovery paths remain consistent.
- Tenant and workspace isolation is preserved.
- Product Data Quality rules are applied consistently.
- Desktop and Mobile experiences are both intentional and complete.
- Documentation describes the delivered behavior accurately in English and Arabic.
- Known limitations and deferred work are explicit.

A milestone is not complete when its last feature passes. It is complete only when the combined milestone passes its acceptance criteria and review.

## 4. Testing Levels

QSC uses proportional testing at several levels:

### Feature Tests

Verify the requested behavior, validation, edge cases, loading and failure states, accessibility, and regressions directly related to one feature.

### Domain and Service Tests

Verify business rules, compatibility, tenant ownership, context resolution, reconciliation, and repository contracts outside UI components.

### Integration Tests

Verify that components, workflow engines, services, repositories, Draft behavior, and context updates cooperate correctly.

### Milestone Journey Tests

Verify complete employee and customer journeys across all features in the milestone, including alternate and recovery paths.

### Build and Static Verification

Run the approved TypeScript, lint, test, and production-build commands. Perform read-only integrity checks for forbidden dependencies, hardcoded business rules, stale terminology, and scope violations.

### Release Regression Tests

Recheck critical existing journeys before a Release Candidate is approved. Riskier changes require broader regression coverage.

## 5. Review Strategy

Review occurs at both feature and milestone levels.

Feature review evaluates scope, root cause, implementation correctness, architecture compliance, tests, documentation, responsive behavior, accessibility, and remaining risks.

Milestone review evaluates the integrated business outcome, cross-feature consistency, regression results, release readiness, and unresolved risks. Review evidence should include changed files, verification results, integrity findings, architecture impact, and explicit deferred work.

Review approval is required before automatically continuing to another feature or milestone. Review feedback should produce a focused correction task rather than untracked scope expansion.

## 6. Git Strategy

Git history should make implementation and review easy to understand.

- Use a dedicated feature branch for the approved stream of work.
- Keep each commit focused on one feature or one clearly identified correction.
- Do not mix unrelated refactoring, formatting, or cleanup with feature work.
- Preserve working-tree changes that belong to other approved tasks.
- Use clear commit messages that describe the business or technical outcome.
- Keep the branch buildable at accepted checkpoints.
- Tag or otherwise identify approved milestone and Release Candidate checkpoints according to the release process.
- Do not rewrite shared history or use destructive Git operations without explicit approval.

One feature may require more than one commit when review corrections are needed, but every commit must remain traceable to the feature and milestone.

## 7. Responsive Review

Responsive review is mandatory because QSC is Responsive First. Desktop and Mobile have equal importance from Version 1.0.

Review must confirm:

- Mobile supports touch, readability, vertical flow, large targets, and no horizontal scrolling.
- Tablet layouts use available space without becoming overly dense.
- Desktop uses wider screens for productivity, related information, keyboard-friendly workflows, and comfortable data entry.
- Desktop does not appear to be a stretched Mobile layout.
- Sticky navigation, dialogs, validation, loading states, and empty states work at supported sizes.
- Responsive behavior does not create different business rules between platforms.

Responsive acceptance must use code review and, when available, direct visual and interaction verification at representative viewport sizes.

## 8. UX Review

UX review applies the QSC Product Design Principles and UX Guidelines to the complete employee decision.

It must confirm:

- The screen asks one clear business question.
- The step captures one coherent business decision.
- Known context removes repetition.
- Employee-facing language avoids unnecessary technical terminology.
- Defaults and automatic behavior remain visible, explainable, and reviewable.
- Validation explains what happened, why it happened, and how to fix it.
- Work is preserved during navigation, restoration, reconciliation, and recoverable failure.
- Loading, empty, error, selected, disabled, Completed, and Needs Attention states are clear.
- Keyboard, mouse, touch, focus, semantics, and assistive-technology behavior are supported.

UX review is not limited to visual polish. It verifies that the workflow reduces employee friction while protecting Product Data Quality.

## 9. Business Review

Business review confirms that implementation produces the intended QSC outcome.

Reviewers should verify:

- Which employee or customer problem is solved.
- Whether the result increases sales effectiveness, reduces effort or errors, teaches employees, improves recommendations, or protects Product Data Quality.
- Whether business terminology and decisions match real technology-retail work.
- Whether confirmed data remains the source of truth.
- Whether employee control is preserved.
- Whether tenant and workspace ownership remain correct.
- Whether optional or future capabilities are clearly separated from the current release.
- Whether the feature creates measurable value without unnecessary complexity.

A technically correct feature should not be accepted if it fails the approved business outcome.

## 10. Release Candidate Process

A milestone may become a Release Candidate only after feature acceptance and integrated milestone validation.

The Release Candidate process is:

1. Freeze the candidate scope and list all included features.
2. Confirm accepted ADR and architecture compliance.
3. Run required static checks, automated tests, production build, and integrity review.
4. Run milestone journeys and critical regression tests.
5. Complete Responsive, UX, accessibility, business, data-quality, tenant, and documentation reviews.
6. Record known limitations, deferred work, migration considerations, and remaining risks.
7. Fix release-blocking issues through focused correction tasks.
8. Revalidate affected features and the complete milestone.
9. Obtain final review approval.
10. Identify the approved release checkpoint and prepare release notes.

A Release Candidate must not introduce unreviewed features. If a correction changes architecture, business scope, or an accepted ADR, it requires separate approval before the candidate can proceed.

## Final Statement

QSC development combines small, controlled implementation with complete milestone validation.

**Implement feature-by-feature. Validate milestone-by-milestone.**

This approach preserves speed, reviewability, Product Data Quality, Responsive First quality, and confidence in every release.

---

## العربية

## الهدف

تحدد هذه الوثيقة استراتيجية التطوير الرسمية لمنصة QSC. وتوضح كيف يتحول اتجاه المنتج المعتمد إلى مهام تنفيذ صغيرة، وكيف تتجمع هذه المهام في مراحل، وكيف يتم التحقق من كل مرحلة قبل الإصدار.

لا تستبدل هذه الاستراتيجية رؤية المنتج أو مبادئ تصميم المنتج أو إرشادات تجربة المستخدم أو سجلات القرارات المعمارية المعتمدة أو المعمارية المعتمدة. ويجب أن يطابق كل تنفيذ هذه الوثائق.

## المبدأ الإلزامي

**نفذ كل ميزة بشكل مستقل.**

**لكن اختبرها ضمن المرحلة الكاملة.**

الميزة هي أصغر وحدة مستقلة قابلة للمراجعة تقدم قيمة للموظف أو النظام. والمرحلة مجموعة مترابطة من الميزات تنتج معا نتيجة عمل كاملة وقابلة للاختبار. ولا يغني نجاح تحقق كل ميزة عن التحقق من المرحلة المتكاملة.

## 1. التطوير القائم على المراحل

ينظم التطوير ضمن مراحل تملك نتائج عمل ونطاقا واعتماديات ومعايير قبول وتوقعات إصدار واضحة.

يجب أن تقوم كل مرحلة بما يلي:

- تقديم نتيجة مترابطة للموظف أو العميل.
- تحديد ما يدخل في النطاق وما يستبعد منه صراحة.
- احترام حدود المجال والمستأجر وسير العمل والخدمات والمستودعات وجودة البيانات المعتمدة.
- تحديد سجلات ADR ومبادئ المنتج المنطبقة قبل بدء التنفيذ.
- تضمين التحقق من جميع الميزات المكتملة، لا المهمة الأخيرة فقط.
- الانتهاء بمراجعة موثقة للمرحلة وقرار واضح.

يجب ألا تعامل المراحل كمجموعات من المهام غير المرتبطة. وإذا تعذر شرح النتيجة المجمعة وعرضها والتحقق منها كقدرة عمل واحدة، فيجب إعادة تنظيم النطاق.

## 2. التنفيذ ميزة بعد ميزة

تنفذ كل مرحلة ميزة واحدة في كل مرة. ويجب أن تكون كل ميزة صغيرة بما يكفي لفهمها وإعادة إنتاجها وتنفيذها ومراجعتها والتحقق منها دون إدخال عمل غير مرتبط.

لكل ميزة:

1. اقرأ رؤية المنتج ومبادئ تصميم المنتج وإرشادات تجربة المستخدم ووثائق المجال المنطبقة وسجلات ADR المرتبطة.
2. أعد إنتاج السلوك الحالي أو أكد القدرة المفقودة.
3. حدد السبب الجذري أو حد التنفيذ واشرحهما.
4. حدد أصغر نطاق آمن والاستبعادات الصريحة.
5. نفذ من خلال المعمارية المعتمدة.
6. تحقق من السلوك وجودة البيانات ونطاق المستأجر والاستجابة وإمكانية الوصول وخطر الانحدار حسب انطباقها.
7. حدث الوثائق بالإنجليزية والعربية عندما يتغير السلوك أو الإرشاد.
8. توقف للمراجعة قبل المتابعة إلى الميزة التالية.

يجب ألا يتوسع عمل الميزة بصمت إلى خطوة سير العمل التالية أو مجال آخر أو ذكاء مستقبلي أو تخزين أو بنية تحتية ما لم يعتمد ذلك صراحة.

## 3. التحقق من المرحلة

بعد قبول كل الميزات المخططة بصورة مستقلة، يجب التحقق من المرحلة الكاملة كتجربة متكاملة.

يجب أن يؤكد التحقق من المرحلة ما يلي:

- عمل رحلة العمل من البداية إلى النهاية.
- تعاون الميزات من خلال الحدود المعتمدة.
- استمرار عمل الميزات السابقة بصورة صحيحة بعد التغييرات اللاحقة.
- اتساق مسارات الشروط والسياق والمسودات والتنسيق والاستعادة.
- الحفاظ على عزل المستأجر ومساحة العمل.
- تطبيق قواعد جودة بيانات المنتجات بصورة متسقة.
- تصميم تجربتي الكمبيوتر والجوال وإكمالهما بصورة مقصودة.
- وصف الوثائق للسلوك المسلم بدقة بالإنجليزية والعربية.
- توضيح القيود المعروفة والعمل المؤجل.

لا تكتمل المرحلة عند نجاح ميزتها الأخيرة. ولا تكتمل إلا عندما تجتاز المرحلة المجمعة معايير القبول والمراجعة.

## 4. مستويات الاختبار

يستخدم QSC اختبارات متناسبة على عدة مستويات:

### اختبارات الميزة

تتحقق من السلوك المطلوب والتحقق والحالات الطرفية وحالات التحميل والفشل وإمكانية الوصول والانحدارات المرتبطة مباشرة بميزة واحدة.

### اختبارات المجال والخدمات

تتحقق من قواعد العمل والتوافق وملكية المستأجر وتحديد السياق والتنسيق وعقود المستودعات خارج مكونات الواجهة.

### اختبارات التكامل

تتحقق من تعاون المكونات ومحركات سير العمل والخدمات والمستودعات وسلوك المسودات وتحديثات السياق بصورة صحيحة.

### اختبارات رحلة المرحلة

تتحقق من رحلات الموظف والعميل الكاملة عبر جميع ميزات المرحلة، بما في ذلك المسارات البديلة ومسارات الاستعادة.

### التحقق الثابت والبناء

شغل أوامر TypeScript وlint والاختبارات وبناء الإنتاج المعتمدة. ونفذ فحوص سلامة للقراءة فقط للتبعيات المحظورة وقواعد العمل الثابتة والمصطلحات القديمة ومخالفات النطاق.

### اختبارات انحدار الإصدار

أعد فحص الرحلات الحالية المهمة قبل اعتماد النسخة المرشحة للإصدار. وتتطلب التغييرات الأعلى خطرا تغطية انحدار أوسع.

## 5. استراتيجية المراجعة

تحدث المراجعة على مستويي الميزة والمرحلة.

تقيم مراجعة الميزة النطاق والسبب الجذري وصحة التنفيذ ومطابقة المعمارية والاختبارات والوثائق والاستجابة وإمكانية الوصول والمخاطر المتبقية.

وتقيم مراجعة المرحلة نتيجة العمل المتكاملة واتساق الميزات ونتائج الانحدار والجاهزية للإصدار والمخاطر غير المحلولة. ويجب أن تشمل أدلة المراجعة الملفات المتغيرة ونتائج التحقق ونتائج فحص السلامة وتأثير المعمارية والعمل المؤجل الصريح.

يلزم اعتماد المراجعة قبل المتابعة تلقائيا إلى ميزة أو مرحلة أخرى. ويجب أن تنتج ملاحظات المراجعة مهمة تصحيح مركزة بدلا من توسيع غير متتبع للنطاق.

## 6. استراتيجية Git

يجب أن يجعل سجل Git التنفيذ والمراجعة سهلين للفهم.

- استخدم فرع ميزة مخصصا لمسار العمل المعتمد.
- اجعل كل commit مركزا على ميزة واحدة أو تصحيح واحد محدد بوضوح.
- لا تخلط إعادة الهيكلة أو التنسيق أو التنظيف غير المرتبط بعمل الميزة.
- حافظ على تغييرات شجرة العمل التي تخص مهاما معتمدة أخرى.
- استخدم رسائل commit واضحة تصف نتيجة العمل أو النتيجة التقنية.
- أبق الفرع قابلا للبناء عند نقاط التحقق المقبولة.
- ضع tag أو حدد بطريقة أخرى نقاط المرحلة والنسخة المرشحة للإصدار المعتمدة وفقا لعملية الإصدار.
- لا تعد كتابة السجل المشترك ولا تستخدم عمليات Git تدميرية دون موافقة صريحة.

قد تتطلب الميزة الواحدة أكثر من commit عند الحاجة إلى تصحيحات المراجعة، لكن يجب أن يبقى كل commit قابلا للتتبع إلى الميزة والمرحلة.

## 7. مراجعة الاستجابة

مراجعة الاستجابة إلزامية لأن QSC يتبع Responsive First. وللكمبيوتر والجوال أهمية متساوية منذ الإصدار 1.0.

يجب أن تؤكد المراجعة ما يلي:

- دعم الجوال للمس والوضوح والتدفق العمودي والأهداف الكبيرة وعدم وجود تمرير أفقي.
- استخدام تخطيطات الجهاز اللوحي للمساحة المتاحة دون كثافة زائدة.
- استخدام الكمبيوتر للشاشات العريضة لتحسين الإنتاجية وإظهار المعلومات المرتبطة ودعم سير العمل الملائم للوحة المفاتيح وإدخال البيانات المريح.
- ألا يبدو الكمبيوتر كنسخة جوال مكبرة.
- عمل التنقل المثبت ومربعات الحوار والتحقق وحالات التحميل والفراغ في الأحجام المدعومة.
- ألا ينشئ السلوك المتجاوب قواعد عمل مختلفة بين المنصات.

يجب أن يستخدم قبول الاستجابة مراجعة الكود، وعند توفرها، المراجعة المرئية والتفاعلية المباشرة بأحجام شاشات ممثلة.

## 8. مراجعة تجربة المستخدم

تطبق مراجعة تجربة المستخدم مبادئ تصميم منتج QSC وإرشادات تجربة المستخدم على قرار الموظف الكامل.

يجب أن تؤكد ما يلي:

- أن تطرح الشاشة سؤال عمل واحدا واضحا.
- أن تجمع الخطوة قرار عمل واحدا مترابطا.
- أن يزيل السياق المعروف التكرار.
- أن تستخدم اللغة الموجهة للموظف وتتجنب المصطلحات التقنية غير الضرورية.
- أن تبقى القيم الافتراضية والسلوك التلقائي ظاهرة وقابلة للتفسير والمراجعة.
- أن يشرح التحقق ما حدث وسبب حدوثه وطريقة إصلاحه.
- أن يحفظ العمل أثناء التنقل والاستعادة والتنسيق والفشل القابل للاستعادة.
- أن تكون حالات التحميل والفراغ والخطأ والتحديد والتعطيل والاكتمال والحاجة إلى الانتباه واضحة.
- أن تدعم لوحة المفاتيح والفأرة واللمس والتركيز والدلالات والتقنيات المساعدة.

لا تقتصر مراجعة تجربة المستخدم على الصقل البصري. بل تتحقق من أن سير العمل يقلل احتكاك الموظف مع حماية جودة بيانات المنتجات.

## 9. مراجعة العمل

تؤكد مراجعة العمل أن التنفيذ ينتج نتيجة QSC المقصودة.

يجب أن يتحقق المراجعون مما يلي:

- مشكلة الموظف أو العميل التي تم حلها.
- ما إذا كانت النتيجة تزيد فعالية المبيعات أو تقلل الجهد أو الأخطاء أو تعلم الموظفين أو تحسن التوصيات أو تحمي جودة بيانات المنتجات.
- مطابقة مصطلحات العمل وقراراته للعمل الحقيقي في تجارة التقنية.
- بقاء البيانات المؤكدة مصدر الحقيقة.
- الحفاظ على تحكم الموظف.
- صحة ملكية المستأجر ومساحة العمل.
- فصل القدرات الاختيارية أو المستقبلية بوضوح عن الإصدار الحالي.
- تقديم الميزة قيمة قابلة للقياس دون تعقيد غير ضروري.

يجب ألا تقبل ميزة صحيحة تقنيا إذا فشلت في تحقيق نتيجة العمل المعتمدة.

## 10. عملية النسخة المرشحة للإصدار

لا يمكن أن تصبح المرحلة نسخة مرشحة للإصدار إلا بعد قبول الميزات والتحقق المتكامل من المرحلة.

تتبع عملية النسخة المرشحة للإصدار الخطوات التالية:

1. ثبت نطاق النسخة المرشحة واسرد كل الميزات المشمولة.
2. أكد مطابقة سجلات ADR والمعمارية المعتمدة.
3. شغل الفحوص الثابتة والاختبارات الآلية وبناء الإنتاج وفحص السلامة المطلوبة.
4. شغل رحلات المرحلة واختبارات الانحدار المهمة.
5. أكمل مراجعات Responsive وتجربة المستخدم وإمكانية الوصول والعمل وجودة البيانات والمستأجر والوثائق.
6. سجل القيود المعروفة والعمل المؤجل واعتبارات الترحيل والمخاطر المتبقية.
7. أصلح المشكلات المانعة للإصدار من خلال مهام تصحيح مركزة.
8. أعد التحقق من الميزات المتأثرة والمرحلة الكاملة.
9. احصل على اعتماد المراجعة النهائي.
10. حدد نقطة الإصدار المعتمدة وجهز ملاحظات الإصدار.

يجب ألا تقدم النسخة المرشحة للإصدار ميزات غير مراجعة. وإذا غير التصحيح المعمارية أو نطاق العمل أو ADR معتمدا، فإنه يتطلب موافقة منفصلة قبل متابعة النسخة المرشحة.

## العبارة الختامية

يجمع تطوير QSC بين التنفيذ الصغير والمنضبط والتحقق الكامل من المرحلة.

**نفذ كل ميزة بشكل مستقل. لكن اختبرها ضمن المرحلة الكاملة.**

يحافظ هذا النهج على السرعة وقابلية المراجعة وجودة بيانات المنتجات وجودة Responsive First والثقة في كل إصدار.
