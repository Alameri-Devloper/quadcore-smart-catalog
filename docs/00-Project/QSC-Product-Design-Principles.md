# QSC Product Design Principles

## English

## Purpose

This document defines how every future screen, workflow, feature, Wizard, search experience, AI capability, and interaction inside QSC must be designed.

These principles are mandatory. They translate the QSC Product Vision into design behavior and apply across mobile and desktop experiences, every tenant and workspace, and every current or future domain. They do not replace approved Architecture Decision Records; design must satisfy both this document and the applicable ADRs.

## 1. Employee First

Every feature must reduce employee effort, improve productivity, or increase sales effectiveness.

Design begins with the employee's business outcome, not with a technical capability or database structure. If an interaction adds effort without protecting data, teaching the employee, or improving a decision, it should be removed or redesigned.

## 2. One Business Question Per Screen

Every screen should ask one clear business question. Avoid mixing unrelated decisions.

The screen title, primary action, guidance, and validation should all support that question. Related context may remain visible, but it must not compete with the decision the employee needs to make now.

## 3. One Business Decision Per Step

Every Wizard step should collect one business decision. The system performs the complex work internally.

A step may contain multiple fields only when they form one coherent decision. Technical implementation concerns must not become extra employee steps.

## 4. One Employee Decision Can Trigger Many System Decisions

A single employee action may automatically resolve:

- Specification Templates.
- Validation Rules.
- Search Context.
- Workflow Steps.
- Sales Knowledge.
- Recommendations.
- Import Templates.
- Future AI actions.

The employee should experience simplicity. Automatic behavior must remain deterministic where it affects confirmed data, and important results must be visible and reviewable.

## 5. Context Over Repetition

Never ask employees for information already known by the current confirmed context.

Category, Device Class, Brand, Product Model, workspace, permissions, entry method, and other trusted context should prefill values, remove unnecessary questions, narrow choices, and generate applicable templates. Known information must remain understandable during review.

## 6. Dynamic Workflow

Workflow steps should be generated according to:

- Entry Context.
- Entry Method.
- Known Information.
- Permissions.
- Future Business Rules.

Avoid fixed Wizards whenever possible. Show only visible and applicable steps, calculate progress from those steps, and keep Review last when review is required. Dynamic behavior must come from workflow and domain rules, not duplicated component conditions.

## 7. Never Lose Employee Work

Employees should never lose their work because of:

- Navigation.
- Refresh.
- Browser close.
- Internet interruption.
- Power failure.
- Unexpected errors.

Support automatic Drafts whenever appropriate. Preserve compatible values during navigation and context changes. Before discarding or reconciling work, explain the impact and require confirmation when employee action is necessary.

## 8. Data Quality Before Speed

Fast entry is valuable only when Product Data Quality is preserved.

Defaults, bulk imports, templates, AI suggestions, and shortcuts must pass the same approved validation and compatibility rules as manual entry. Speed must never bypass required fields, tenant boundaries, review, or confirmed-data requirements.

## 9. Knowledge Before Specifications

Specifications are important. Knowledge is more valuable.

The system should help employees understand Products instead of memorizing specifications. When useful, explain why a specification matters, who benefits from it, when to recommend it, and when not to recommend it. Explanations must be traceable to confirmed Product data and approved knowledge.

## 10. Recommend, Don't Just Display

QSC should recommend suitable solutions instead of displaying Products only.

Recommendations must connect confirmed Product capabilities to customer needs and explain the business reason for the match. Missing data must not be invented or treated as proof. Employees remain responsible for the final recommendation.

## 11. Search Everywhere

Search should exist wherever employees work. Employees should never waste time looking for information.

Domain pages default to Context Search, while the Employee Workspace provides Global Search. Traditional filters remain available, search works without AI, and smart-ranked results explain why they matched.

## 12. Decision Driven UX

Every interaction should feel like a conversation. Employees answer business questions; the system performs business logic.

Use employee language, short decisions, clear choices, and meaningful outcomes. Do not expose internal IDs, service boundaries, data relationships, or technical steps unless the employee needs them to make a business decision.

## 13. Progressive Disclosure

Show only the information needed for the current decision. Reveal additional complexity only when necessary.

Advanced options, explanations, exceptions, and secondary actions should remain accessible without overwhelming the primary task. Progressive disclosure must not hide required warnings, active context, validation, or destructive consequences.

## 14. Smart Defaults

Whenever the system can safely predict a value, provide it automatically. Employees should confirm decisions rather than repeatedly entering obvious information.

Defaults must come from confirmed context or approved configuration, remain visible, and be editable when business rules allow. A smart default is assistance, not permission to invent data or override a restored Draft.

## 15. Explain Before Rejecting

Whenever validation blocks progress, explain:

- What happened.
- Why it happened.
- How to fix it.

Never display unexplained errors. Place guidance near the affected decision, identify the field or row when applicable, and use calm, specific language. When reconciliation removes incompatible data, explain what changed and what remains preserved.

## 16. Learn While Working

Every screen should help employees become better sales professionals.

Use concise contextual guidance, Product benefits, comparison reasons, suitable-customer information, and approved sales knowledge where they improve the current decision. Learning support should assist work rather than become unrelated training content.

## 17. Self-Explaining System

The interface should require as little training as possible. Employees should understand what to do naturally.

Use clear titles, descriptions, labels, examples, states, progress, next actions, and recovery guidance. Generated templates and smart results should explain their context and purpose without requiring separate documentation.

## 18. Simplicity Outside, Intelligence Inside

Internal complexity belongs inside the system. External simplicity belongs to the employee.

Services, repositories, workflow engines, parsers, validation, context resolution, template generation, and future AI adapters may coordinate complex behavior behind stable boundaries. The interface should expose only the decision, its relevant context, its consequences, and the employee's available actions.

## 19. Responsive by Design

Every future feature must be designed for Desktop and Mobile from the beginning instead of adapting one platform later.

Do not make desktop users feel like they are using a stretched mobile application. Desktop should have layouts designed for productivity, while Mobile should remain optimized for touch interaction.

## Applying These Principles

Every proposed screen, feature, or interaction should be reviewed against these questions:

- What employee business outcome does it improve?
- What single question or decision does it present?
- What confirmed context can remove repetition?
- How is employee work preserved?
- How is Product Data Quality protected?
- What must the system explain?
- How does the experience provide an excellent, platform-appropriate result on both Desktop and Mobile?
- Can the employee complete the core task without AI?

If a design contradicts an accepted ADR, the ADR governs until a new decision is formally approved. If a design violates these principles without an approved reason, it should not be implemented.

## Closing Statement

QSC is not designed to build forms.

QSC is designed to help employees make better business decisions with less effort and higher confidence.

---

## العربية

## الغرض

تحدد هذه الوثيقة كيفية تصميم كل شاشة وسير عمل وميزة ومعالج وتجربة بحث وقدرة ذكاء اصطناعي وتفاعل مستقبلي داخل QSC.

هذه المبادئ إلزامية. وهي تحول رؤية منتج QSC إلى سلوك تصميمي، وتنطبق على تجارب الجوال وسطح المكتب، وعلى كل مستأجر ومساحة عمل، وعلى كل مجال حالي أو مستقبلي. ولا تستبدل سجلات القرارات المعمارية المعتمدة؛ بل يجب أن يطابق التصميم هذه الوثيقة وسجلات ADR المنطبقة معا.

## 1. الموظف أولا

يجب أن تقلل كل ميزة جهد الموظف أو تحسن إنتاجيته أو تزيد فعاليته في البيع.

يبدأ التصميم من نتيجة العمل التي يحتاج إليها الموظف، لا من قدرة تقنية أو بنية قاعدة بيانات. وإذا أضاف التفاعل جهدا دون حماية البيانات أو تعليم الموظف أو تحسين القرار، فيجب حذفه أو إعادة تصميمه.

## 2. سؤال عمل واحد لكل شاشة

يجب أن تطرح كل شاشة سؤال عمل واحدا واضحا. تجنب خلط القرارات غير المرتبطة.

يجب أن يدعم عنوان الشاشة والإجراء الرئيسي والإرشاد والتحقق هذا السؤال. ويمكن أن يبقى السياق المرتبط ظاهرا، لكنه لا ينافس القرار الذي يحتاج الموظف إلى اتخاذه الآن.

## 3. قرار عمل واحد لكل خطوة

يجب أن تجمع كل خطوة في المعالج قرار عمل واحدا. وينفذ النظام العمل المعقد داخليا.

يمكن أن تحتوي الخطوة على عدة حقول فقط عندما تشكل قرارا مترابطا واحدا. ويجب ألا تصبح اهتمامات التنفيذ التقنية خطوات إضافية للموظف.

## 4. قرار واحد من الموظف يمكن أن يشغل قرارات كثيرة للنظام

يمكن لإجراء واحد من الموظف أن يحدد تلقائيا:

- قوالب المواصفات.
- قواعد التحقق.
- سياق البحث.
- خطوات سير العمل.
- المعرفة البيعية.
- التوصيات.
- قوالب الاستيراد.
- إجراءات الذكاء الاصطناعي المستقبلية.

يجب أن يختبر الموظف البساطة. ويجب أن يبقى السلوك التلقائي حتميا عندما يؤثر في البيانات المؤكدة، وأن تكون نتائجه المهمة ظاهرة وقابلة للمراجعة.

## 5. السياق أهم من التكرار

لا تطلب من الموظفين معلومات يعرفها السياق الحالي المؤكد بالفعل.

يجب أن تستخدم معلومات التصنيف وفئة الجهاز والعلامة التجارية ونموذج المنتج ومساحة العمل والصلاحيات وطريقة الإدخال وغيرها من السياقات الموثوقة لتعبئة القيم وإزالة الأسئلة غير الضرورية وتضييق الخيارات وتوليد القوالب المنطبقة. ويجب أن تبقى المعلومات المعروفة مفهومة أثناء المراجعة.

## 6. سير العمل الديناميكي

يجب توليد خطوات سير العمل وفقا لما يلي:

- سياق الإدخال.
- طريقة الإدخال.
- المعلومات المعروفة.
- الصلاحيات.
- قواعد العمل المستقبلية.

تجنب المعالجات الثابتة كلما أمكن. اعرض الخطوات الظاهرة والمنطبقة فقط، واحسب التقدم منها، وأبق المراجعة أخيرا عندما تكون مطلوبة. ويجب أن يأتي السلوك الديناميكي من قواعد سير العمل والمجال، لا من شروط مكررة داخل المكونات.

## 7. لا تفقد عمل الموظف أبدا

يجب ألا يفقد الموظفون عملهم بسبب:

- التنقل.
- تحديث الصفحة.
- إغلاق المتصفح.
- انقطاع الإنترنت.
- انقطاع الكهرباء.
- الأخطاء غير المتوقعة.

ادعم المسودات التلقائية كلما كان ذلك مناسبا. حافظ على القيم المتوافقة أثناء التنقل وتغير السياق. وقبل تجاهل العمل أو تنسيقه، اشرح التأثير واطلب التأكيد عندما يكون إجراء الموظف ضروريا.

## 8. جودة البيانات قبل السرعة

لا تكون سرعة الإدخال مفيدة إلا عندما تحافظ على جودة بيانات المنتجات.

يجب أن تمر القيم الافتراضية والاستيرادات المجمعة والقوالب واقتراحات الذكاء الاصطناعي والاختصارات بقواعد التحقق والتوافق المعتمدة نفسها التي يمر بها الإدخال اليدوي. ويجب ألا تتجاوز السرعة الحقول المطلوبة أو حدود المستأجر أو المراجعة أو متطلبات البيانات المؤكدة.

## 9. المعرفة قبل المواصفات

المواصفات مهمة. والمعرفة أكثر قيمة.

يجب أن يساعد النظام الموظفين على فهم المنتجات بدلا من حفظ المواصفات. وعندما يكون ذلك مفيدا، يجب أن يشرح سبب أهمية المواصفة، ومن يستفيد منها، ومتى يوصى بها، ومتى لا يوصى بها. ويجب أن تكون التفسيرات قابلة للتتبع إلى بيانات المنتجات المؤكدة والمعرفة المعتمدة.

## 10. رشح، لا تعرض فقط

يجب أن يرشح QSC الحلول المناسبة بدلا من عرض المنتجات فقط.

يجب أن تربط التوصيات قدرات المنتج المؤكدة باحتياجات العميل، وأن تشرح سبب المطابقة من ناحية العمل. ولا يجوز اختلاق البيانات المفقودة أو اعتبارها دليلا. ويبقى الموظفون مسؤولين عن التوصية النهائية.

## 11. البحث في كل مكان

يجب أن يوجد البحث في كل مكان يعمل فيه الموظفون. ويجب ألا يهدر الموظفون وقتهم في البحث عن المعلومات.

تستخدم صفحات المجال البحث ضمن السياق افتراضيا، بينما توفر مساحة عمل الموظف البحث الشامل. وتبقى المرشحات التقليدية متاحة، ويعمل البحث دون ذكاء اصطناعي، وتشرح النتائج المرتبة بذكاء سبب مطابقتها.

## 12. تجربة مستخدم تقودها القرارات

يجب أن يبدو كل تفاعل كأنه محادثة. يجيب الموظفون عن أسئلة العمل، وينفذ النظام منطق العمل.

استخدم لغة الموظف وقرارات قصيرة وخيارات واضحة ونتائج ذات معنى. ولا تعرض المعرفات الداخلية أو حدود الخدمات أو علاقات البيانات أو الخطوات التقنية إلا عندما يحتاج إليها الموظف لاتخاذ قرار عمل.

## 13. الإفصاح التدريجي

اعرض فقط المعلومات المطلوبة للقرار الحالي. واكشف التعقيد الإضافي عند الحاجة فقط.

يجب أن تبقى الخيارات المتقدمة والتفسيرات والاستثناءات والإجراءات الثانوية متاحة دون إرباك المهمة الرئيسية. ويجب ألا يخفي الإفصاح التدريجي التحذيرات المطلوبة أو السياق النشط أو التحقق أو النتائج التدميرية.

## 14. القيم الافتراضية الذكية

عندما يستطيع النظام توقع قيمة بأمان، يجب أن يقدمها تلقائيا. وينبغي أن يؤكد الموظفون القرارات بدلا من تكرار إدخال المعلومات الواضحة.

يجب أن تأتي القيم الافتراضية من سياق مؤكد أو إعداد معتمد، وأن تبقى ظاهرة وقابلة للتعديل عندما تسمح قواعد العمل. والقيمة الافتراضية الذكية مساعدة، وليست إذنا لاختلاق البيانات أو استبدال مسودة مستعادة.

## 15. اشرح قبل الرفض

عندما يمنع التحقق التقدم، اشرح:

- ما الذي حدث.
- لماذا حدث.
- كيفية إصلاحه.

لا تعرض أخطاء غير مفسرة أبدا. ضع الإرشاد بالقرب من القرار المتأثر، وحدد الحقل أو الصف عندما ينطبق، واستخدم لغة هادئة ومحددة. وعندما يزيل التنسيق بيانات غير متوافقة، اشرح ما تغير وما بقي محفوظا.

## 16. التعلم أثناء العمل

يجب أن تساعد كل شاشة الموظفين على أن يصبحوا متخصصي مبيعات أفضل.

استخدم إرشادا سياقيا موجزا وفوائد المنتجات وأسباب المقارنة ومعلومات العميل المناسب والمعرفة البيعية المعتمدة عندما تحسن القرار الحالي. ويجب أن يدعم التعلم العمل، لا أن يتحول إلى محتوى تدريبي غير مرتبط.

## 17. نظام يشرح نفسه

يجب أن تتطلب الواجهة أقل قدر ممكن من التدريب. وينبغي أن يفهم الموظفون ما يجب فعله بصورة طبيعية.

استخدم عناوين وأوصاف وتسميات وأمثلة وحالات وتقدما وإجراءات تالية وإرشادات استعادة واضحة. ويجب أن تشرح القوالب المولدة والنتائج الذكية سياقها وغرضها دون الحاجة إلى وثائق منفصلة.

## 18. البساطة في الخارج والذكاء في الداخل

ينتمي التعقيد الداخلي إلى النظام، وتنتمي البساطة الخارجية إلى الموظف.

يمكن للخدمات والمستودعات ومحركات سير العمل والمحللات والتحقق وتحديد السياق وتوليد القوالب ومحولات الذكاء الاصطناعي المستقبلية تنسيق سلوك معقد خلف حدود مستقرة. ويجب ألا تعرض الواجهة إلا القرار وسياقه المرتبط ونتائجه والإجراءات المتاحة للموظف.

## 19. متجاوب منذ التصميم

يجب تصميم كل ميزة مستقبلية للكمبيوتر والجوال منذ البداية بدلا من تكييفها لاحقا لمنصة أخرى.

لا تجعل مستخدم الكمبيوتر يشعر بأنه يستخدم نسخة جوال مكبرة. يجب أن تكون تخطيطات الكمبيوتر مصممة للإنتاجية، بينما يبقى الجوال محسنا للتفاعل باللمس.

## تطبيق هذه المبادئ

يجب مراجعة كل شاشة أو ميزة أو تفاعل مقترح وفقا للأسئلة التالية:

- ما نتيجة العمل التي تحسنها للموظف؟
- ما السؤال أو القرار الواحد الذي تعرضه؟
- ما السياق المؤكد الذي يمكنه إزالة التكرار؟
- كيف يحفظ عمل الموظف؟
- كيف يحمي جودة بيانات المنتجات؟
- ما الذي يجب أن يشرحه النظام؟
- كيف تقدم التجربة نتيجة ممتازة ومناسبة لكل من الكمبيوتر والجوال؟
- هل يستطيع الموظف إكمال المهمة الأساسية دون ذكاء اصطناعي؟

إذا تعارض التصميم مع ADR معتمد، فيحكم ADR حتى يعتمد قرار جديد رسميا. وإذا خالف التصميم هذه المبادئ دون سبب معتمد، فلا ينبغي تنفيذه.

## العبارة الختامية

لم يصمم QSC لبناء النماذج.

صمم QSC لمساعدة الموظفين على اتخاذ قرارات عمل أفضل بجهد أقل وثقة أعلى.
