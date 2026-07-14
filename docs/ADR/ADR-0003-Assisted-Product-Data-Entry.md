# ADR-0003: Assisted Product Data Entry

# ADR-0003: إدخال بيانات المنتج بمساعدة

## Title | العنوان

Assisted Product Data Entry

إدخال بيانات المنتج بمساعدة

## Status | الحالة

Accepted for future implementation

معتمد للتنفيذ المستقبلي

## Context | السياق

Employees may need to create catalog products quickly while still entering complete and standardized specification values. Product details can often be inferred or suggested from Product Model lookup, part number lookup, barcode scanning, or label image scanning.

قد يحتاج الموظفون إلى إنشاء منتجات الكتالوج بسرعة مع إدخال قيم مواصفات كاملة وموحدة. يمكن في كثير من الحالات استنتاج تفاصيل المنتج أو اقتراحها من خلال البحث عن نموذج المنتج، أو البحث برقم القطعة، أو مسح الباركود، أو مسح صورة الملصق.

The platform already resolves allowed fields through the Specification Template for the selected Category and optional Device Class. Any assisted data entry must respect that resolved template.

تحدد المنصة الحقول المسموح بها من خلال قالب المواصفات الخاص بالتصنيف وفئة الجهاز الاختيارية. يجب أن يحترم أي إدخال بيانات بمساعدة هذا القالب المحدد.

## Decision | القرار

QSC may provide an optional Product Data Enrichment capability for assisted product entry.

قد توفر QSC قدرة اختيارية لإثراء بيانات المنتج أثناء إدخال المنتج.

The capability may support:

يمكن أن تدعم القدرة:

- Product Model lookup.
- Part number lookup.
- Barcode or label image scanning.
- Suggested specification values.
- Mapping extracted data to the resolved Specification Template.
- Human review before saving.

- البحث عن نموذج المنتج.
- البحث برقم القطعة.
- مسح الباركود أو صورة الملصق.
- اقتراح قيم المواصفات.
- ربط البيانات المستخرجة بقالب المواصفات الذي تم تحديده.
- المراجعة البشرية قبل الحفظ.

Manual entry must always remain available. Assisted enrichment must be optional and must not block product creation.

يجب أن يبقى الإدخال اليدوي متاحا دائما. يجب أن يكون الإثراء بمساعدة النظام اختياريا وألا يمنع إنشاء المنتج.

## Reasons | الأسباب

- Reduce employee effort while entering product specifications.
- Improve consistency by mapping suggestions to the resolved Specification Template.
- Preserve data quality through human review before saving.
- Support multiple input sources without making any source mandatory.
- Keep product creation resilient when lookup or scanning is unavailable.

- تقليل جهد الموظف عند إدخال مواصفات المنتج.
- تحسين الاتساق من خلال ربط الاقتراحات بقالب المواصفات الذي تم تحديده.
- الحفاظ على جودة البيانات من خلال المراجعة البشرية قبل الحفظ.
- دعم مصادر إدخال متعددة دون جعل أي مصدر إلزاميا.
- إبقاء إنشاء المنتج مرنا عند عدم توفر البحث أو المسح.

## Consequences | النتائج

Assisted data entry must be treated as a suggestion layer, not as an authority that saves data automatically.

يجب التعامل مع الإدخال بمساعدة النظام كطبقة اقتراحات، وليس كجهة تحفظ البيانات تلقائيا.

Extracted values must be normalized and mapped to the resolved Specification Template fields before review.

يجب توحيد القيم المستخرجة وربطها بحقول قالب المواصفات الذي تم تحديده قبل المراجعة.

The product creation flow must continue to support fully manual entry.

يجب أن يستمر سير إنشاء المنتج في دعم الإدخال اليدوي الكامل.

Failure to find a Product Model, part number, barcode, label, or suggested value must not block saving a product manually.

عدم العثور على نموذج منتج أو رقم قطعة أو باركود أو ملصق أو قيمة مقترحة يجب ألا يمنع حفظ المنتج يدويا.

## Examples | أمثلة

An employee scans a laptop label. The system suggests CPU, RAM, Storage, GPU, Screen Size, and Operating System values mapped to the Laptop + Gaming template. The employee reviews and edits the suggestions before saving.

يقوم الموظف بمسح ملصق لابتوب. يقترح النظام قيم المعالج والذاكرة والتخزين وكرت الشاشة وحجم الشاشة ونظام التشغيل ويربطها بقالب لابتوب + ألعاب. يراجع الموظف الاقتراحات ويعدلها قبل الحفظ.

An employee enters a camera part number. The system suggests Resolution and Lens values mapped to the CCTV Camera template. If no suggestion is found, the employee continues with manual entry.

يدخل الموظف رقم قطعة لكاميرا. يقترح النظام قيم الدقة والعدسة ويربطها بقالب كاميرات CCTV. إذا لم يتم العثور على اقتراح، يستمر الموظف بالإدخال اليدوي.
