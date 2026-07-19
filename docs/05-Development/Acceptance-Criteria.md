# Responsive First Acceptance Criteria | معايير قبول Responsive First

**Status:** Accepted
**Last Updated:** 2026-07-19
**Scope:** Functional QA and future implementation documentation

## English

Every user-facing feature is incomplete until functional QA verifies all applicable criteria below. Mobile, Tablet, and Desktop are equally first-class environments; Desktop and Tablet are never secondary adaptations.

### Environment coverage

- **Mobile:** content, actions, validation, recovery, and navigation work without unintended horizontal scrolling.
- **Tablet:** layouts deliberately use available space and remain readable and operable in relevant orientations.
- **Desktop:** layouts support productive use of available space and are not stretched Mobile layouts.

### Interaction coverage

- **Touch:** targets, gestures, scrolling, focus changes, and recovery are usable without relying on hover.
- **Mouse:** pointing, clicking, scrolling, hover assistance, selection, and recovery behave correctly without making hover the only way to access information.
- **Keyboard navigation:** all interactive behavior is reachable and operable in logical order with visible focus, appropriate native semantics, and no keyboard trap.

### Required evidence

Future implementation and QA reports must record the Mobile, Tablet, and Desktop contexts tested; touch, mouse, and keyboard results; failures or exclusions with reasons; and recovery, loading, empty, validation, and error-state results where applicable.

## العربية

لا تكتمل أي ميزة موجهة للمستخدم حتى يتحقق QA الوظيفي من المعايير المناسبة أدناه. الجوال والجهاز اللوحي والكمبيوتر بيئات أساسية ومتساوية، ولا يعد الكمبيوتر أو الجهاز اللوحي نسخة ثانوية.

### تغطية البيئات

- **الجوال:** تعمل المحتويات والإجراءات والتحقق والاستعادة والتنقل دون تمرير أفقي غير مقصود.
- **الجهاز اللوحي:** يستفيد التخطيط عمداً من المساحة ويبقى مقروءاً وقابلاً للاستخدام في الاتجاهات المناسبة.
- **الكمبيوتر:** يدعم التخطيط الإنتاجية ويستفيد من المساحة ولا يكون مجرد تمديد لتصميم الجوال.

### تغطية وسائل التفاعل

- **اللمس:** تكون الأهداف والإيماءات والتمرير وتغير التركيز والاستعادة قابلة للاستخدام دون الاعتماد على hover.
- **الفأرة:** تعمل الإشارة والنقر والتمرير ومساعدة hover والتحديد والاستعادة، ولا تكون hover الوسيلة الوحيدة للمعلومة.
- **لوحة المفاتيح:** يمكن الوصول إلى كل تفاعل وتشغيله بترتيب منطقي مع تركيز مرئي ودلالات أصلية مناسبة ودون حجز لوحة المفاتيح.

### الأدلة المطلوبة

يجب أن تسجل وثائق التنفيذ وتقارير QA المستقبلية سياقات الجوال والجهاز اللوحي والكمبيوتر التي اختُبرت، ونتائج اللمس والفأرة ولوحة المفاتيح، وأسباب أي فشل أو استثناء، ونتائج حالات الاستعادة والتحميل والفراغ والتحقق والخطأ عند انطباقها.

## Related Documents | الوثائق المرتبطة

- [UX Principles](../00-Constitution/UX-Principles.md)
- [Architecture Principles](../00-Constitution/Architecture-Principles.md)
- [Contribution and Review](Contribution-and-Review.md)
