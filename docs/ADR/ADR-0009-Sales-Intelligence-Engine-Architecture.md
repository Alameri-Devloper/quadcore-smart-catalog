# ADR-0009: Sales Intelligence Engine Architecture

## English

## Title

Sales Intelligence Engine Architecture

## Status

Accepted as an architecture direction; implementation is planned for future milestones.

## Context

QSC is a Sales Enablement Platform that transforms confirmed Product data into knowledge employees can understand and use. Specifications alone describe a Product, but employees also need reliable explanations, benefits, suitable users, upgrade guidance, customer answers, comparisons, and recommendations.

This knowledge must not be produced from incomplete, stale, incompatible, cross-tenant, or unconfirmed Product data. Product Entry already resolves context through Category, optional Device Class, Brand, Product Model, and Specification Templates. It also defines validation, Draft restoration, and Safe Reconciliation boundaries through [ADR-0004](./ADR-0004-Context-Aware-Product-Entry.md), [ADR-0006](./ADR-0006-Impact-Analysis-and-Safe-Reconciliation.md), and [ADR-0008](./ADR-0008-Dynamic-Context-Aware-Template-Generation-Engine.md).

Sales Intelligence must extend those confirmed boundaries rather than create a separate source of Product facts or duplicate Catalog rules.

## Decision

QSC will treat the Sales Intelligence Engine as a future application/domain capability that transforms complete, validated, tenant-scoped Product data into explainable and reviewable Sales Knowledge.

The engine is not a UI component, Product repository, Specification Template resolver, or independent source of Product truth. UI consumers request intelligence through approved services. Repositories provide confirmed Product and approved Sales Knowledge data. Future AI adapters may assist generation, but they remain behind the engine boundary and cannot bypass validation or employee review.

## Mandatory Principle

**Sales Intelligence must never rely on incomplete Product data.**

Missing data must not be interpreted as proof. Generated text must not invent specifications, compatibility, prices, availability, warranty outcomes, supported upgrades, customer suitability, or Product relationships.

## 1. Purpose

The Sales Intelligence Engine converts confirmed Product facts into useful sales guidance while preserving Product Data Quality and employee control.

Its purposes are to:

- Explain why confirmed Product capabilities matter.
- Connect Product capabilities to suitable users and business needs.
- Help employees explain, compare, recommend, cross-sell, and upsell Products.
- Support learning while employees work.
- Produce consistent Sales Knowledge across QSC channels.
- Keep every conclusion traceable to confirmed inputs and approved knowledge.

## 2. Position in Product Entry Workflow

Sales Intelligence belongs after Product context and required Specifications are complete and valid.

```text
Entry Method
-> Category
-> optional Device Class
-> Product Model and Brand context
-> Required Specifications
-> Specification Validation
-> Sales Intelligence Eligibility
-> Sales Intelligence Draft or Product Notes
-> Employee Review
-> Final Product Review
```

The exact future workflow presentation may vary by entry mode, but the dependency does not: intelligence generation cannot run before required Product facts pass validation.

Context Entry, Draft Entry, Batch Entry, and future Excel Import may resolve inputs differently, but they must use the same eligibility, completeness, validation, generation, and review boundaries. A skipped selection step does not permit skipped data validation.

## 3. Why It Depends on Completed Specifications

Sales Intelligence explains the practical meaning of Product facts. If those facts are incomplete or incompatible, the resulting guidance may be misleading even when its language sounds plausible.

Completed Specifications are required because they:

- Establish the confirmed capabilities and limits of the Product.
- Allow benefits to be tied to actual values.
- Prevent unsuitable recommendations based on assumptions.
- Provide evidence for comparison, upgrade, cross-selling, and upselling guidance.
- Ensure Category and optional Device Class use the correct Specification Template.
- Allow Safe Reconciliation to remove knowledge invalidated by context changes.
- Make generated outputs explainable and reviewable.

Completeness means all required fields for the resolved Specification Template and Product rules are present and valid. It does not mean every optional field must be populated. When an optional fact is missing, the engine must omit conclusions that require it.

## 4. Inputs

Eligible inputs may include:

- Tenant, company, workspace, employee, language, and permission context.
- Confirmed Department and Category.
- Confirmed optional Device Class.
- Confirmed Brand and Product Model.
- Resolved Specification Template and validated Specification Values.
- Confirmed Product name and commercial context when applicable.
- Approved Product benefits and Product Notes.
- Confirmed compatibility and Upgrade Knowledge.
- Category configuration that enables Sales Intelligence or Product Notes only.
- Approved Sales Knowledge from prior employee review.
- Future customer need, channel, and persona context when explicitly supplied.

Inputs must be versionable, tenant-scoped, permission-aware, and traceable. AI suggestions, OCR results, imported values, and external content are not confirmed inputs until they pass their approved validation and review process.

## 5. Outputs

Depending on Category configuration, confirmed inputs, permissions, and future phase, outputs may include:

- Highlights.
- Benefits.
- Recommended Users.
- Upgrade Guide.
- Customer Questions and Suggested Answers.
- Cross-selling and upselling guidance.
- Product comparison reasons.
- Smart recommendation reasons.
- Sales coaching prompts.
- Customer-persona matches.
- Personalized message drafts.
- Product Notes for Products that do not require full Sales Intelligence.

Every output must identify its Product, tenant, input basis, generation or approval status, language, version, and timestamps when persisted. Generated output is a Draft until an authorized employee reviews and approves it. Approval does not turn generated text into a Product specification; confirmed Product data remains canonical.

## 6. Products That Require Sales Intelligence

Full Sales Intelligence applies only where Category configuration determines that sales guidance provides meaningful value. It must not be selected through hardcoded UI lists.

Applicable Products may include complex, configurable, consultative, or solution-oriented technology such as:

- Gaming and Business Laptops.
- Desktop Computers and Workstations.
- CCTV Systems.
- Fingerprint and access-control devices.
- Hotel Systems.
- Enterprise Networking.
- Products with important compatibility, upgrade, comparison, or customer-suitability decisions.

These examples describe product direction, not hardcoded business rules. Workspace-owned configuration and confirmed Catalog relationships determine applicability.

## 7. Products That Only Require Product Notes

Simple Products may not justify full Sales Intelligence. They may use concise, approved Product Notes alongside confirmed Specifications and Benefits.

Examples may include:

- Network cables.
- HDMI cables.
- Mouse pads.
- USB adapters.
- Small accessories.
- Products whose sales decision does not require complex suitability, upgrade, comparison, or solution guidance.

Product Notes must still be tenant-aware, reviewable, and must not contradict confirmed Product data. A Product Notes-only path must not create empty Sales Intelligence work or fake generated content.

## 8. Usage Throughout QSC

Approved Sales Intelligence may be reused through stable service boundaries in:

- Employee Product pages.
- Public and employee Catalog experiences.
- Context Search and Global Search explanations.
- Product comparison.
- Sales Guide.
- Employee learning and sales coaching.
- Recommendation workflows.
- Cross-selling and upselling experiences.
- Upgrade guidance.
- Offer and quotation preparation.
- Reviewed WhatsApp message preparation.
- Future customer and supplier workflows where explicitly applicable.

Consumers must not independently regenerate or reinterpret Sales Intelligence rules. They request approved or clearly labeled Draft outputs from the engine and respect tenant, workspace, permission, language, version, and approval boundaries.

## 9. Architectural Principles

The Sales Intelligence Engine must follow these principles:

- **Confirmed Data First:** Use validated Product data as the source of truth.
- **Completeness Gate:** Do not generate intelligence until required Product data is complete.
- **Explainability:** Preserve the facts and approved knowledge supporting each conclusion.
- **Human Review:** Generated content remains editable, rejectable, and unapproved by default.
- **Employee Control:** Intelligence assists employee judgment and never silently replaces it.
- **Tenant Isolation:** Never mix Product data, knowledge, configuration, or customer context across tenants or workspaces.
- **Configuration over Hardcoding:** Category and workspace configuration determine applicability and enabled outputs.
- **Safe Reconciliation:** When Product context or Specifications change, identify and invalidate incompatible intelligence before reuse.
- **One Engine, Many Consumers:** UI channels consume one consistent capability through services.
- **AI Optionality:** Core Product and Sales Knowledge workflows remain available without AI.
- **Language Awareness:** Outputs preserve language and localization context without changing Product facts.
- **Auditability and Versioning:** Persisted outputs must support origin, status, revision, approval, and invalidation history.
- **Failure Safety:** Generation failure must not corrupt Product data or block manual Product Notes and approved manual Sales Knowledge.

Accepted architecture direction:

```text
Product Entry / Catalog / Search / Sales Workflow
-> Sales Intelligence Application Service
-> Eligibility and Completeness Validation
-> Confirmed Product Data and Approved Knowledge
-> Rules and Future Generation Adapters
-> Reviewable Sales Intelligence Draft
-> Employee Review and Approval
-> Approved Sales Knowledge Repository
-> Authorized QSC Consumers
```

Future persistence, permissions, audit schemas, eventing, AI providers, prompt governance, and invalidation mechanisms require separately approved implementation design.

## 10. Future Evolution

Evolution must follow the QSC Development Strategy: implement feature-by-feature and validate milestone-by-milestone. Each phase depends on confirmed data, approved boundaries, employee review, and successful validation of the preceding capabilities.

### Phase 1 — Product Understanding

- Highlights.
- Benefits.
- Recommended Users.
- Upgrade Guide.

### Phase 2 — Guided Selling

- Customer Questions.
- Suggested Answers.
- Cross Selling.
- Upselling.

### Phase 3 — Assisted Intelligence

- AI Sales Coaching.
- Smart Recommendations.
- Personalized WhatsApp Messages.

AI outputs remain Drafts, must cite confirmed inputs internally, and require employee review before use or sharing.

### Phase 4 — Real-Time Intelligence

- Real-time Sales Assistant.
- Product Comparison Intelligence.
- Customer Persona Matching.

Real-time and personalized capabilities require future decisions for privacy, permissions, consent, audit, customer-data retention, model governance, performance, and human oversight.

## Consequences

- Sales Intelligence becomes a reusable QSC capability rather than screen-specific logic.
- Required Specifications and Product validation become mandatory upstream dependencies.
- Categories must be able to enable full Sales Intelligence or a Product Notes-only path through approved configuration.
- Generated outputs require Draft, review, approval, versioning, and invalidation states.
- Product context or Specification changes may invalidate existing Sales Intelligence and require Impact Analysis and Safe Reconciliation.
- Consumers gain consistent approved knowledge but must respect tenant and permission boundaries.
- AI can enhance later phases but cannot become the source of Product truth or the only workflow path.
- This ADR does not implement UI, services, repositories, persistence, AI, prompts, recommendations, messaging, or Product Entry steps.

---

## العربية

## العنوان

معمارية محرك Sales Intelligence

## الحالة

معتمد كاتجاه معماري؛ والتنفيذ مخطط له في مراحل مستقبلية.

## السياق

QSC منصة لتمكين المبيعات تحول بيانات المنتجات المؤكدة إلى معرفة يستطيع الموظفون فهمها واستخدامها. تصف المواصفات المنتج، لكن الموظفين يحتاجون أيضا إلى تفسيرات وفوائد ومستخدمين مناسبين وإرشادات ترقية وإجابات للعملاء ومقارنات وتوصيات موثوقة.

يجب ألا تنتج هذه المعرفة من بيانات منتج ناقصة أو قديمة أو غير متوافقة أو تابعة لمستأجر آخر أو غير مؤكدة. يحدد إدخال المنتج السياق بالفعل من خلال التصنيف وفئة الجهاز الاختيارية والعلامة التجارية ونموذج المنتج وقوالب المواصفات. كما يحدد حدود التحقق واستعادة المسودة والتنسيق الآمن من خلال [ADR-0004](./ADR-0004-Context-Aware-Product-Entry.md) و[ADR-0006](./ADR-0006-Impact-Analysis-and-Safe-Reconciliation.md) و[ADR-0008](./ADR-0008-Dynamic-Context-Aware-Template-Generation-Engine.md).

يجب أن يوسع Sales Intelligence هذه الحدود المؤكدة، لا أن ينشئ مصدرا منفصلا لحقائق المنتج أو يكرر قواعد الكتالوج.

## القرار

سيعامل QSC محرك Sales Intelligence كقدرة مستقبلية في طبقة التطبيق والمجال تحول بيانات المنتج الكاملة والمتحقق منها والمقيدة بالمستأجر إلى معرفة بيعية قابلة للتفسير والمراجعة.

المحرك ليس مكون واجهة أو مستودع منتجات أو محدد قوالب مواصفات أو مصدرا مستقلا لحقيقة المنتج. يطلب مستهلكو الواجهة المعرفة من خلال الخدمات المعتمدة. وتوفر المستودعات بيانات المنتج المؤكدة والمعرفة البيعية المعتمدة. ويمكن لمحولات الذكاء الاصطناعي المستقبلية المساعدة في التوليد، لكنها تبقى خلف حدود المحرك ولا تتجاوز التحقق أو مراجعة الموظف.

## المبدأ الإلزامي

**لا يجوز لمحرك Sales Intelligence الاعتماد على بيانات منتج غير مكتملة.**

يجب ألا تفسر البيانات المفقودة كدليل. ويجب ألا يختلق النص المولد مواصفات أو توافقا أو أسعارا أو توفرا أو نتائج ضمان أو ترقيات مدعومة أو ملاءمة للعملاء أو علاقات منتجات.

## 1. الهدف

يحول محرك Sales Intelligence حقائق المنتج المؤكدة إلى إرشاد بيعي مفيد مع الحفاظ على جودة بيانات المنتجات وتحكم الموظف.

تتمثل أهدافه في:

- شرح سبب أهمية قدرات المنتج المؤكدة.
- ربط قدرات المنتج بالمستخدمين واحتياجات العمل المناسبة.
- مساعدة الموظفين على شرح المنتجات ومقارنتها والتوصية بها والبيع المتقاطع والبيع التصاعدي.
- دعم التعلم أثناء عمل الموظفين.
- إنتاج معرفة بيعية متسقة عبر قنوات QSC.
- إبقاء كل استنتاج قابلا للتتبع إلى مدخلات مؤكدة ومعرفة معتمدة.

## 2. موقعه في سير عمل إدخال المنتج

يأتي Sales Intelligence بعد اكتمال سياق المنتج والمواصفات المطلوبة وصلاحيتها.

```text
طريقة الإدخال
-> التصنيف
-> فئة الجهاز الاختيارية
-> سياق نموذج المنتج والعلامة التجارية
-> المواصفات المطلوبة
-> التحقق من المواصفات
-> التحقق من أهلية Sales Intelligence
-> مسودة Sales Intelligence أو ملاحظات المنتج
-> مراجعة الموظف
-> المراجعة النهائية للمنتج
```

قد يختلف عرض سير العمل المستقبلي حسب طريقة الإدخال، لكن الاعتماد لا يتغير: لا يمكن تشغيل توليد المعرفة قبل اجتياز حقائق المنتج المطلوبة للتحقق.

قد تحدد طرق الإدخال من السياق والمسودة والدفعات واستيراد Excel المستقبلي المدخلات بطرق مختلفة، لكنها يجب أن تستخدم حدود الأهلية والاكتمال والتحقق والتوليد والمراجعة نفسها. ولا يسمح تخطي خطوة اختيار بتخطي التحقق من البيانات.

## 3. سبب اعتماده على المواصفات المكتملة

يشرح Sales Intelligence المعنى العملي لحقائق المنتج. وإذا كانت هذه الحقائق ناقصة أو غير متوافقة، فقد تكون الإرشادات الناتجة مضللة حتى لو بدت لغتها مقنعة.

المواصفات المكتملة مطلوبة لأنها:

- تثبت قدرات المنتج وحدوده المؤكدة.
- تسمح بربط الفوائد بالقيم الفعلية.
- تمنع التوصيات غير المناسبة المبنية على افتراضات.
- توفر دليلا للمقارنة والترقية والبيع المتقاطع والبيع التصاعدي.
- تضمن استخدام التصنيف وفئة الجهاز الاختيارية لقالب المواصفات الصحيح.
- تسمح للتنسيق الآمن بإزالة المعرفة التي تبطلها تغييرات السياق.
- تجعل المخرجات المولدة قابلة للتفسير والمراجعة.

يعني الاكتمال وجود كل الحقول المطلوبة لقالب المواصفات المحدد وقواعد المنتج وصلاحيتها. ولا يعني وجوب تعبئة كل حقل اختياري. وعند فقدان حقيقة اختيارية، يجب أن يحذف المحرك الاستنتاجات التي تعتمد عليها.

## 4. المدخلات

قد تشمل المدخلات المؤهلة:

- سياق المستأجر والشركة ومساحة العمل والموظف واللغة والصلاحيات.
- القسم والتصنيف المؤكدين.
- فئة الجهاز الاختيارية المؤكدة.
- العلامة التجارية ونموذج المنتج المؤكدين.
- قالب المواصفات المحدد وقيم المواصفات المتحقق منها.
- اسم المنتج المؤكد والسياق التجاري عند انطباقه.
- فوائد المنتج وملاحظاته المعتمدة.
- قواعد التوافق ومعرفة الترقية المؤكدة.
- إعداد التصنيف الذي يفعل Sales Intelligence أو ملاحظات المنتج فقط.
- المعرفة البيعية المعتمدة من مراجعة موظف سابقة.
- سياق احتياج العميل والقناة والشخصية المستقبلي عند تقديمه صراحة.

يجب أن تكون المدخلات قابلة للإصدار ومقيدة بالمستأجر وواعية بالصلاحيات وقابلة للتتبع. ولا تعد اقتراحات الذكاء الاصطناعي ونتائج OCR والقيم المستوردة والمحتوى الخارجي مدخلات مؤكدة حتى تجتاز عملية التحقق والمراجعة المعتمدة.

## 5. المخرجات

قد تشمل المخرجات حسب إعداد التصنيف والمدخلات المؤكدة والصلاحيات والمرحلة المستقبلية:

- النقاط البارزة.
- الفوائد.
- المستخدمون الموصى بهم.
- دليل الترقية.
- أسئلة العملاء والإجابات المقترحة.
- إرشادات البيع المتقاطع والبيع التصاعدي.
- أسباب مقارنة المنتجات.
- أسباب التوصيات الذكية.
- توجيهات التدريب البيعي.
- مطابقة شخصيات العملاء.
- مسودات الرسائل المخصصة.
- ملاحظات المنتج للمنتجات التي لا تحتاج إلى Sales Intelligence كاملا.

يجب أن يحدد كل مخرج المنتج والمستأجر وأساس المدخلات وحالة التوليد أو الاعتماد واللغة والإصدار والطوابع الزمنية عند حفظه. ويبقى المخرج المولد مسودة حتى يراجعه موظف مخول ويعتمده. ولا يحول الاعتماد النص المولد إلى مواصفة منتج؛ إذ تبقى بيانات المنتج المؤكدة هي البيانات المرجعية.

## 6. المنتجات التي تتطلب Sales Intelligence

ينطبق Sales Intelligence الكامل فقط عندما يحدد إعداد التصنيف أن الإرشاد البيعي يقدم قيمة مهمة. ويجب ألا يحدد من خلال قوائم ثابتة داخل الواجهة.

قد تشمل المنتجات المنطبقة تقنيات معقدة أو قابلة للإعداد أو استشارية أو موجهة للحلول، مثل:

- لابتوبات الألعاب والأعمال.
- أجهزة الكمبيوتر المكتبية ومحطات العمل.
- أنظمة CCTV.
- أجهزة البصمة والتحكم في الدخول.
- أنظمة الفنادق.
- شبكات المؤسسات.
- المنتجات التي تتضمن قرارات مهمة للتوافق أو الترقية أو المقارنة أو ملاءمة العميل.

تصف هذه الأمثلة اتجاه المنتج، ولا تمثل قواعد عمل ثابتة. ويحدد الإعداد المملوك لمساحة العمل وعلاقات الكتالوج المؤكدة الانطباق.

## 7. المنتجات التي تحتاج إلى ملاحظات المنتج فقط

قد لا تبرر المنتجات البسيطة Sales Intelligence كاملا. ويمكنها استخدام ملاحظات منتج موجزة ومعتمدة إلى جانب المواصفات والفوائد المؤكدة.

قد تشمل الأمثلة:

- كابلات الشبكة.
- كابلات HDMI.
- لوحات الفأرة.
- محولات USB.
- الملحقات الصغيرة.
- المنتجات التي لا يحتاج قرار بيعها إلى إرشاد معقد للملاءمة أو الترقية أو المقارنة أو الحلول.

يجب أن تبقى ملاحظات المنتج واعية بالمستأجر وقابلة للمراجعة، وألا تتعارض مع بيانات المنتج المؤكدة. ويجب ألا ينشئ مسار ملاحظات المنتج فقط عملا فارغا أو محتوى مولدا وهميا.

## 8. الاستخدام في أنحاء QSC

يمكن إعادة استخدام Sales Intelligence المعتمد عبر حدود خدمات مستقرة في:

- صفحات المنتج للموظف.
- تجارب الكتالوج العام وكتالوج الموظف.
- تفسيرات البحث ضمن السياق والبحث الشامل.
- مقارنة المنتجات.
- دليل المبيعات.
- تعلم الموظفين والتدريب البيعي.
- سير عمل التوصيات.
- تجارب البيع المتقاطع والبيع التصاعدي.
- إرشادات الترقية.
- إعداد العروض وعروض الأسعار.
- إعداد رسائل WhatsApp الخاضعة للمراجعة.
- سير عمل العملاء والموردين المستقبلي عند انطباقه صراحة.

يجب ألا يعيد المستهلكون توليد قواعد Sales Intelligence أو تفسيرها بصورة مستقلة. بل يطلبون المخرجات المعتمدة أو المسودات ذات العلامة الواضحة من المحرك، ويحترمون حدود المستأجر ومساحة العمل والصلاحيات واللغة والإصدار والاعتماد.

## 9. المبادئ المعمارية

يجب أن يتبع محرك Sales Intelligence المبادئ التالية:

- **البيانات المؤكدة أولا:** استخدم بيانات المنتج المتحقق منها كمصدر للحقيقة.
- **بوابة الاكتمال:** لا تولد المعرفة حتى تكتمل بيانات المنتج المطلوبة.
- **قابلية التفسير:** حافظ على الحقائق والمعرفة المعتمدة التي تدعم كل استنتاج.
- **المراجعة البشرية:** يبقى المحتوى المولد قابلا للتعديل والرفض وغير معتمد افتراضيا.
- **تحكم الموظف:** تساعد المعرفة حكم الموظف ولا تستبدله بصمت.
- **عزل المستأجر:** لا تخلط بيانات المنتج أو المعرفة أو الإعداد أو سياق العميل بين المستأجرين أو مساحات العمل.
- **الإعداد بدلا من التثبيت:** يحدد إعداد التصنيف ومساحة العمل الانطباق والمخرجات المفعلة.
- **التنسيق الآمن:** عند تغير سياق المنتج أو مواصفاته، حدد المعرفة غير المتوافقة وأبطلها قبل إعادة الاستخدام.
- **محرك واحد ومستهلكون متعددون:** تستهلك قنوات الواجهة قدرة متسقة واحدة من خلال الخدمات.
- **اختيارية الذكاء الاصطناعي:** تبقى سير عمل المنتج والمعرفة البيعية الأساسية متاحة دون ذكاء اصطناعي.
- **الوعي باللغة:** تحافظ المخرجات على سياق اللغة والتوطين دون تغيير حقائق المنتج.
- **قابلية التدقيق والإصدار:** يجب أن تدعم المخرجات المحفوظة تاريخ المصدر والحالة والمراجعة والاعتماد والإبطال.
- **سلامة الفشل:** يجب ألا يفسد فشل التوليد بيانات المنتج أو يمنع ملاحظات المنتج اليدوية والمعرفة البيعية اليدوية المعتمدة.

اتجاه المعمارية المعتمد:

```text
إدخال المنتج / الكتالوج / البحث / سير عمل المبيعات
-> خدمة تطبيق Sales Intelligence
-> التحقق من الأهلية والاكتمال
-> بيانات المنتج المؤكدة والمعرفة المعتمدة
-> القواعد ومحولات التوليد المستقبلية
-> مسودة Sales Intelligence قابلة للمراجعة
-> مراجعة الموظف واعتماده
-> مستودع المعرفة البيعية المعتمدة
-> مستهلكو QSC المخولون
```

تتطلب آليات التخزين والصلاحيات ومخططات التدقيق والأحداث وموفري الذكاء الاصطناعي وحوكمة المطالبات والإبطال المستقبلية تصميما تنفيذيا معتمدا بصورة منفصلة.

## 10. التطور المستقبلي

يجب أن يتبع التطور استراتيجية تطوير QSC: نفذ كل ميزة بشكل مستقل، لكن اختبرها ضمن المرحلة الكاملة. وتعتمد كل مرحلة على البيانات المؤكدة والحدود المعتمدة ومراجعة الموظف والتحقق الناجح من القدرات السابقة.

### المرحلة 1 — فهم المنتج

- النقاط البارزة.
- الفوائد.
- المستخدمون الموصى بهم.
- دليل الترقية.

### المرحلة 2 — البيع الموجه

- أسئلة العملاء.
- الإجابات المقترحة.
- البيع المتقاطع.
- البيع التصاعدي.

### المرحلة 3 — المعرفة المساعدة

- التدريب البيعي بالذكاء الاصطناعي.
- التوصيات الذكية.
- رسائل WhatsApp المخصصة.

تبقى مخرجات الذكاء الاصطناعي مسودات، ويجب أن تستند داخليا إلى مدخلات مؤكدة، وتتطلب مراجعة الموظف قبل الاستخدام أو المشاركة.

### المرحلة 4 — المعرفة الفورية

- مساعد مبيعات في الوقت الفعلي.
- ذكاء مقارنة المنتجات.
- مطابقة شخصية العميل.

تتطلب القدرات الفورية والمخصصة قرارات مستقبلية للخصوصية والصلاحيات والموافقة والتدقيق والاحتفاظ ببيانات العملاء وحوكمة النماذج والأداء والإشراف البشري.

## النتائج

- يصبح Sales Intelligence قدرة قابلة لإعادة الاستخدام في QSC بدلا من منطق خاص بالشاشات.
- تصبح المواصفات المطلوبة والتحقق من المنتج اعتمادين إلزاميين سابقين.
- يجب أن تستطيع التصنيفات تفعيل Sales Intelligence الكامل أو مسار ملاحظات المنتج فقط من خلال إعداد معتمد.
- تتطلب المخرجات المولدة حالات المسودة والمراجعة والاعتماد والإصدار والإبطال.
- قد تبطل تغييرات سياق المنتج أو مواصفاته Sales Intelligence الموجود وتتطلب تحليل التأثير والتنسيق الآمن.
- يحصل المستهلكون على معرفة معتمدة ومتسقة، لكن يجب أن يحترموا حدود المستأجر والصلاحيات.
- يمكن للذكاء الاصطناعي تحسين المراحل اللاحقة، لكنه لا يصبح مصدر حقيقة المنتج أو المسار الوحيد لسير العمل.
- لا ينفذ هذا السجل واجهة أو خدمات أو مستودعات أو تخزينا أو ذكاء اصطناعيا أو مطالبات أو توصيات أو رسائل أو خطوات لإدخال المنتج.
