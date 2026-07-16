# ADR-0007: Context-Aware Smart Search

## English

## Title

Context-Aware Smart Search

## Status

Accepted; implementation is planned for a future task.

## Context

Employees search from pages that already establish useful business context, such as a Category, Brand, Device Class, or Product Model. Ignoring that context creates noisy results and makes employees repeat information that QSC already knows. At the same time, employees need a system-wide entry point when they do not want to limit the search to the current page.

Product discovery must also support confirmed Specification Field labels and Specification Values, not only Product names and codes. Future natural-language assistance may make complex requests easier to express, but search cannot depend on AI or allow AI to invent Product facts.

## Decision

QSC will support four complementary search capabilities:

1. Context Search.
2. Global Search.
3. Specification and Feature Search.
4. Future Natural Language Search.

### Context Search

Context Search is the default inside domain pages. The current page supplies the Search Context, and results remain inside that context unless the employee explicitly selects **Search Everywhere**.

Examples include:

- A Laptop page searches only Laptop Products.
- A Lenovo page searches only Lenovo Products.
- A CCTV page searches only CCTV Products.
- A Product Model page searches only within that Product Model.

Search Context is an explicit structured input. It must be tenant- and workspace-aware and must not be inferred from display text alone.

### Global Search

The Employee Workspace provides the system-wide Global Search entry point. Global Search may include:

- Products.
- Brands.
- Product Models.
- Categories.
- Specifications.
- Drafts.
- Future Suppliers.
- Future Customers.

Global Search results must preserve entity type and business context so employees can distinguish similarly named records.

### Searchable Product Data

Product search must support confirmed QSC data from:

- Product name.
- Product code.
- Brand.
- Product Model.
- Category.
- Device Class.
- Specification Field labels.
- Specification Values.
- Availability.
- Condition.
- Future generated Product benefits, when they have been confirmed and stored as QSC data.

Specification and feature requests may include:

- `16GB RTX 4060 Gaming Laptop`
- `Color printer with 30 pages per minute`
- `5MP PoE camera with night vision`
- `Business laptop with touchscreen and 360-degree design`

### Search Flow

The accepted search flow is:

```text
Search Query
-> Search Context
-> Query Parser
-> Structured Filters
-> Product Search Service
-> Ranked Results
```

The Query Parser converts supported query terms into structured filters. The Product Search Service applies the Search Context, tenant and workspace boundaries, permissions, confirmed data, and ranking rules. UI components must not contain search business logic or access data sources directly. Data access remains behind repositories.

Traditional filters remain available before and after parsing. Employees can inspect, change, or clear the structured filters.

### Future Natural Language Search

The future natural-language flow is:

```text
Natural Language
-> Intent Parser
-> Structured Specification Filters
-> Confirmed QSC Data
-> Ranked Results
```

Natural-language processing is an optional interpretation layer. It may propose an intent or structured filters, but the Product Search Service searches only confirmed QSC data. Search must continue to work when AI is unavailable or disabled.

## Mandatory Principles

- Search results must come from confirmed QSC data.
- AI must never invent Product specifications.
- Traditional filters must remain available.
- Search must work without AI.
- Context Search is the default inside domain pages.
- Global Search is available from the Employee Workspace.
- Smart-ranked results must explain why they matched.
- Search behavior and result presentation must be Responsive First, with purpose-designed Desktop and Mobile experiences.
- Every search must respect tenant, workspace, and permission boundaries.

## Consequences

- Search Context becomes a first-class input to search use cases.
- Context and Global Search share parsing and search services while using different scope inputs.
- Specification Field labels and values require structured, searchable representations.
- Ranking rules belong to the search service and must remain deterministic without AI.
- Smart ranking requires match-reason metadata, such as a matched Product Model, Specification Field, or Specification Value.
- Future generated benefits cannot affect results until they are confirmed QSC data.
- The mobile UI must communicate the active scope, provide an explicit Search Everywhere action, keep filters accessible, and present concise match reasons.
- Indexing, persistence, ranking weights, parser grammar, permissions, and UI implementation require separate implementation design.
- This ADR documents architecture only and does not implement search.

---

## العربية

## العنوان

البحث الذكي الواعي بالسياق

## الحالة

معتمد؛ التنفيذ مخطط له في مهمة مستقبلية.

## السياق

يبحث الموظفون من صفحات تحدد مسبقا سياقا مفيدا للعمل، مثل التصنيف أو العلامة التجارية أو فئة الجهاز أو نموذج المنتج. يؤدي تجاهل هذا السياق إلى نتائج غير دقيقة ويجعل الموظف يكرر معلومات يعرفها QSC بالفعل. وفي الوقت نفسه، يحتاج الموظفون إلى نقطة بحث على مستوى النظام عندما لا يريدون تقييد البحث بالصفحة الحالية.

يجب أن يدعم اكتشاف المنتجات أيضا تسميات حقول المواصفات وقيم المواصفات المؤكدة، لا أسماء المنتجات ورموزها فقط. وقد تسهل مساعدة اللغة الطبيعية مستقبلا التعبير عن الطلبات المعقدة، لكن البحث لا يجوز أن يعتمد على الذكاء الاصطناعي أو يسمح له باختلاق حقائق عن المنتجات.

## القرار

سيدعم QSC أربع قدرات بحث متكاملة:

1. البحث ضمن السياق.
2. البحث الشامل.
3. البحث بالمواصفات والميزات.
4. البحث المستقبلي باللغة الطبيعية.

### البحث ضمن السياق

البحث ضمن السياق هو الوضع الافتراضي داخل صفحات المجال. توفر الصفحة الحالية سياق البحث، وتبقى النتائج ضمن ذلك السياق ما لم يختر الموظف **البحث في كل مكان** بشكل صريح.

تشمل الأمثلة:

- تبحث صفحة اللابتوبات في منتجات اللابتوب فقط.
- تبحث صفحة Lenovo في منتجات Lenovo فقط.
- تبحث صفحة CCTV في منتجات CCTV فقط.
- تبحث صفحة نموذج المنتج ضمن نموذج المنتج نفسه فقط.

سياق البحث مدخل منظم وصريح. ويجب أن يكون واعيا بالمستأجر ومساحة العمل، وألا يستنتج من نص العرض وحده.

### البحث الشامل

توفر مساحة عمل الموظف نقطة الدخول للبحث الشامل على مستوى النظام. وقد يشمل البحث الشامل:

- المنتجات.
- العلامات التجارية.
- نماذج المنتجات.
- التصنيفات.
- المواصفات.
- المسودات.
- الموردين مستقبلا.
- العملاء مستقبلا.

يجب أن تحافظ نتائج البحث الشامل على نوع الكيان وسياق العمل حتى يستطيع الموظفون التمييز بين السجلات متشابهة الأسماء.

### بيانات المنتج القابلة للبحث

يجب أن يدعم بحث المنتجات بيانات QSC المؤكدة من:

- اسم المنتج.
- رمز المنتج.
- العلامة التجارية.
- نموذج المنتج.
- التصنيف.
- فئة الجهاز.
- تسميات حقول المواصفات.
- قيم المواصفات.
- التوفر.
- الحالة.
- فوائد المنتج المولدة مستقبلا، عندما تكون مؤكدة ومحفوظة كبيانات QSC.

قد تشمل طلبات البحث بالمواصفات والميزات:

- `لابتوب ألعاب بذاكرة 16GB وكرت RTX 4060`
- `طابعة ملونة بسرعة 30 صفحة في الدقيقة`
- `كاميرا 5MP تدعم PoE والرؤية الليلية`
- `لابتوب أعمال بشاشة لمس وتصميم 360 درجة`

### مسار البحث

مسار البحث المعتمد هو:

```text
استعلام البحث
-> سياق البحث
-> محلل الاستعلام
-> المرشحات المنظمة
-> خدمة بحث المنتجات
-> النتائج المرتبة
```

يحول محلل الاستعلام المصطلحات المدعومة إلى مرشحات منظمة. وتطبق خدمة بحث المنتجات سياق البحث وحدود المستأجر ومساحة العمل والصلاحيات والبيانات المؤكدة وقواعد الترتيب. يجب ألا تحتوي مكونات الواجهة على منطق عمل البحث أو تصل مباشرة إلى مصادر البيانات. ويبقى الوصول إلى البيانات خلف المستودعات.

تبقى المرشحات التقليدية متاحة قبل التحليل وبعده. ويمكن للموظفين فحص المرشحات المنظمة أو تغييرها أو مسحها.

### البحث المستقبلي باللغة الطبيعية

مسار اللغة الطبيعية المستقبلي هو:

```text
اللغة الطبيعية
-> محلل القصد
-> مرشحات المواصفات المنظمة
-> بيانات QSC المؤكدة
-> النتائج المرتبة
```

معالجة اللغة الطبيعية طبقة تفسير اختيارية. يمكنها اقتراح قصد أو مرشحات منظمة، لكن خدمة بحث المنتجات لا تبحث إلا في بيانات QSC المؤكدة. ويجب أن يستمر البحث في العمل عند عدم توفر الذكاء الاصطناعي أو تعطيله.

## المبادئ الإلزامية

- يجب أن تأتي نتائج البحث من بيانات QSC المؤكدة.
- يجب ألا يختلق الذكاء الاصطناعي مواصفات المنتجات أبدا.
- يجب أن تبقى المرشحات التقليدية متاحة.
- يجب أن يعمل البحث دون ذكاء اصطناعي.
- البحث ضمن السياق هو الوضع الافتراضي داخل صفحات المجال.
- البحث الشامل متاح من مساحة عمل الموظف.
- يجب أن توضح النتائج المرتبة بذكاء سبب مطابقتها.
- يجب أن يكون سلوك البحث وعرض النتائج مصممين للجوال أولا.
- يجب أن يحترم كل بحث حدود المستأجر ومساحة العمل والصلاحيات.

## النتائج

- يصبح سياق البحث مدخلا أساسيا لحالات استخدام البحث.
- يشترك البحث ضمن السياق والبحث الشامل في خدمات التحليل والبحث، مع اختلاف مدخلات النطاق.
- تتطلب تسميات حقول المواصفات وقيمها تمثيلات منظمة وقابلة للبحث.
- تنتمي قواعد الترتيب إلى خدمة البحث ويجب أن تبقى حتمية دون ذكاء اصطناعي.
- يتطلب الترتيب الذكي بيانات توضح سبب المطابقة، مثل نموذج المنتج أو حقل المواصفة أو قيمة المواصفة المطابقة.
- لا يجوز أن تؤثر فوائد المنتجات المولدة مستقبلا في النتائج حتى تصبح بيانات QSC مؤكدة.
- يجب أن توضح واجهة الجوال النطاق النشط، وتوفر إجراء صريحا للبحث في كل مكان، وتبقي المرشحات متاحة، وتعرض أسباب مطابقة موجزة.
- تتطلب الفهرسة والحفظ وأوزان الترتيب وقواعد المحلل والصلاحيات وتنفيذ الواجهة تصميما تنفيذيا منفصلا.
- يوثق هذا السجل المعمارية فقط ولا ينفذ البحث.
