# Future Smart Sales Features

# ميزات المبيعات الذكية المستقبلية

## Purpose | الغرض

This document defines two optional capabilities for a future advanced QSC version. It documents direction only and does not authorize implementation or change the current architecture.

تحدد هذه الوثيقة ميزتين اختياريتين لإصدار متقدم مستقبلي من QSC. وهي توثق الاتجاه فقط ولا تجيز التنفيذ أو تغير المعمارية الحالية.

## Mandatory Principles | المبادئ الإلزامية

- Confirmed QSC data remains the source of truth.
- Manual search and traditional filters must always remain available.
- AI is optional and must never block sales workflows.
- AI suggestions require employee review.
- Tenant and workspace boundaries apply to every query and suggestion.

- تظل بيانات QSC المؤكدة هي مصدر الحقيقة.
- يجب أن يظل البحث اليدوي وعوامل التصفية التقليدية متاحين دائماً.
- الذكاء الاصطناعي اختياري ويجب ألا يعيق سير عمل المبيعات أبداً.
- تتطلب اقتراحات الذكاء الاصطناعي مراجعة الموظف.
- تنطبق حدود المستأجر ومساحة العمل على كل استعلام واقتراح.

## Smart Product Discovery | الاكتشاف الذكي للمنتجات

Employees may search in natural language. The system interprets the request, converts it into structured specification filters, searches confirmed QSC data, ranks products, and explains every match.

يمكن للموظفين البحث بلغة طبيعية. يفسر النظام الطلب ويحوله إلى عوامل تصفية منظمة للمواصفات، ثم يبحث في بيانات QSC المؤكدة ويرتب المنتجات ويشرح كل مطابقة.

Examples include a color printer with at least 30 pages per minute; a business laptop with 16GB RAM, touchscreen, and 360-degree convertible design; or a 5MP PoE camera with night vision.

تشمل الأمثلة طابعة ملونة بسرعة 30 صفحة على الأقل في الدقيقة؛ أو حاسوباً محمولاً للأعمال بذاكرة 16 جيجابايت وشاشة لمس وتصميم قابل للتحول بزاوية 360 درجة؛ أو كاميرا PoE بدقة 5 ميجابكسل ورؤية ليلية.

### Future Flow | التدفق المستقبلي

```text
Natural Language Query
-> Search Intent Parser
-> Structured Specification Filters
-> Product Search Service
-> Ranked Results
```

```text
استعلام بلغة طبيعية
-> محلل نية البحث
-> عوامل تصفية منظمة للمواصفات
-> خدمة البحث عن المنتجات
-> نتائج مرتبة
```

### Search Rules | قواعد البحث

1. AI may identify concepts, constraints, units, ranges, and requested capabilities, but parsed intent must become explicit, inspectable filters.
2. The Product Search Service searches Product, Specification Field, Specification Value, and Inventory through approved services and repositories.
3. Only confirmed QSC values may satisfy a constraint. AI must never invent an unavailable specification.
4. Ranking may consider confirmed matches, explicit constraints, and inventory availability. Ranking rules belong in services, not components.
5. Each result identifies confirmed matching fields and any requested conditions that could not be confirmed.
6. Missing or ambiguous data reduces confidence or excludes a result; AI must not fill the gap.
7. If AI is unavailable, employees continue with manual search and traditional filters.

1. يمكن للذكاء الاصطناعي تحديد المفاهيم والقيود والوحدات والنطاقات والقدرات المطلوبة، لكن يجب تحويل النية إلى عوامل تصفية صريحة وقابلة للفحص.
2. تبحث خدمة البحث عن المنتجات في المنتج وحقل المواصفة وقيمة المواصفة والمخزون عبر الخدمات والمستودعات المعتمدة.
3. لا تحقق الشرط إلا قيم QSC المؤكدة. ويجب ألا يخترع الذكاء الاصطناعي مواصفة غير متاحة أبداً.
4. يمكن أن يراعي الترتيب المطابقات المؤكدة والقيود الصريحة وتوفر المخزون. تنتمي قواعد الترتيب إلى الخدمات لا المكونات.
5. تحدد كل نتيجة الحقول المؤكدة المطابقة والشروط المطلوبة التي تعذر تأكيدها.
6. تقلل البيانات المفقودة أو الغامضة الثقة أو تستبعد النتيجة؛ ولا يجوز للذكاء الاصطناعي ملء النقص.
7. إذا لم يتوفر الذكاء الاصطناعي، يواصل الموظفون البحث اليدوي واستخدام عوامل التصفية التقليدية.

Example explanation: “Matched because QSC confirms color printing, 32 pages per minute, and inventory in this workspace.” No unconfirmed capability may be mentioned.

مثال: «تمت المطابقة لأن QSC يؤكد الطباعة الملونة، و32 صفحة في الدقيقة، وتوفر المخزون في مساحة العمل هذه». ولا يجوز ذكر قدرة غير مؤكدة.

## AI Sales Assistant | مساعد المبيعات بالذكاء الاصطناعي

Using selected, confirmed data, the assistant may suggest a short WhatsApp sales message, three main benefits, suitable customer profiles, a comparison of two selected products, and Arabic or English marketing text.

باستخدام البيانات المختارة والمؤكدة، يمكن للمساعد اقتراح رسالة مبيعات قصيرة عبر واتساب، وثلاث فوائد رئيسية، والفئات المناسبة للمنتج، ومقارنة منتجين مختارين، ونص تسويقي بالعربية أو الإنجليزية.

### Future Flow | التدفق المستقبلي

```text
Confirmed Product Data
-> Product Benefit Generator
-> Employee Review
-> WhatsApp Share
```

```text
بيانات المنتج المؤكدة
-> مولد فوائد المنتج
-> مراجعة الموظف
-> المشاركة عبر واتساب
```

### Content Rules | قواعد المحتوى

1. The generator receives confirmed data only, within the employee's authorized tenant and workspace.
2. Benefits must be traceable to confirmed input specifications.
3. Comparisons use confirmed fields and identify unavailable data. Missing data does not prove a capability is absent.
4. Generated content is a suggestion, not canonical product data or an authoritative claim.
5. Employees must review and may edit every suggestion before sharing.
6. Content must never be sent automatically, including through WhatsApp.
7. Content must never overwrite Product, Product Model, Specification Field, Specification Value, Inventory, or other QSC data.
8. Generator failure must not block product viewing, manual comparison, or existing sharing workflows.

1. يستقبل المولد بيانات مؤكدة فقط ضمن المستأجر ومساحة العمل المصرح بهما للموظف.
2. يجب أن تكون الفوائد قابلة للتتبع إلى مواصفات الإدخال المؤكدة.
3. تستخدم المقارنات الحقول المؤكدة وتوضح البيانات غير المتاحة. ولا يثبت غياب البيانات أن القدرة غير موجودة.
4. المحتوى المولد اقتراح، وليس من بيانات المنتج الأساسية أو ادعاءً رسمياً.
5. يجب على الموظفين مراجعة كل اقتراح، ويمكنهم تعديله قبل المشاركة.
6. يجب ألا يرسل المحتوى تلقائياً أبداً، بما في ذلك عبر واتساب.
7. يجب ألا يستبدل المحتوى بيانات المنتج أو نموذج المنتج أو حقل المواصفة أو قيمة المواصفة أو المخزون أو غيرها من بيانات QSC.
8. يجب ألا يؤدي فشل المولد إلى منع عرض المنتجات أو المقارنة اليدوية أو مسارات المشاركة الحالية.

## Architecture Direction | اتجاه المعمارية

- Components collect requests and display results; business logic remains in services.
- Services coordinate parsing, filtering, search, ranking, benefit generation, and comparison.
- Repositories remain the only data-access boundary.
- Future AI integrations must be replaceable adapters behind service interfaces, never the source of truth.
- Suggestions remain separate from canonical records. Persistence, audit, privacy, and retention require a separately approved architecture decision.
- This document selects no AI provider, model, library, or implementation date.

- تجمع المكونات الطلبات وتعرض النتائج؛ ويبقى منطق الأعمال في الخدمات.
- تنسق الخدمات التحليل والتصفية والبحث والترتيب وتوليد الفوائد والمقارنة.
- تظل المستودعات الحد الوحيد للوصول إلى البيانات.
- يجب أن تكون تكاملات الذكاء الاصطناعي المستقبلية محولات قابلة للاستبدال خلف واجهات الخدمات، وألا تصبح مصدر الحقيقة.
- تبقى الاقتراحات منفصلة عن السجلات الأساسية. ويتطلب الحفظ والتدقيق والخصوصية والاحتفاظ قراراً معمارياً منفصلاً ومعتمداً.
- لا تحدد هذه الوثيقة مزوداً أو نموذجاً أو مكتبة للذكاء الاصطناعي أو تاريخ تنفيذ.

## Related Approved Future Modules | الوحدات المستقبلية المعتمدة ذات الصلة

- Market Catalog Module may expose eligible offerings within approved tenant and workspace boundaries.
- Solution Builder Engine may assemble compatible products into solutions using confirmed QSC data.
- Smart discovery and sales assistance may support both modules later without bypassing data, service, repository, review, or tenant-boundary rules.

- قد تعرض وحدة كتالوج السوق العروض المؤهلة ضمن حدود المستأجر ومساحة العمل المعتمدة.
- قد يجمع محرك بناء الحلول منتجات متوافقة ضمن حلول باستخدام بيانات QSC المؤكدة.
- قد يدعم الاكتشاف الذكي ومساعدة المبيعات الوحدتين لاحقاً دون تجاوز قواعد البيانات أو الخدمات أو المستودعات أو المراجعة أو حدود المستأجر.
