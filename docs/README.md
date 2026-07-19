# QSC Documentation | توثيق QSC

**Status:** Authoritative index
**Last Updated:** 2026-07-19
**Scope:** Project documentation

## English

QSC documentation is organized by purpose. The **Constitution** defines durable principles; **Architecture** describes structural decisions; **ADRs** preserve decision history; **Domain** defines business language and rules; **Application** describes use cases; **Infrastructure** describes technical boundaries; **Development** governs delivery; **Roadmap** separates future intent from implemented capability; and **Archive** retains superseded knowledge.

- [Constitution](00-Constitution/README.md)
- [Architecture and ADRs](01-Architecture/README.md)
- [Domain](02-Domain/README.md)
- [Application](03-Application/README.md)
- [Infrastructure](04-Infrastructure/README.md)
- [Development and audit](05-Development/README.md)
- [Roadmap](06-Roadmap/README.md)
- [Archive policy](99-Archive/README.md)

Recommended order: developers read Constitution, Architecture, Domain, Application, then Development; product managers read Vision, Product Principles, UX, and Roadmap; architects read all Constitution files, Architecture, ADRs, and boundaries; QA reads UX, invariants, lifecycle policies, use cases, and roadmap status.

## العربية

يُنظّم التوثيق حسب الغرض: يثبت **الدستور** المبادئ الدائمة، وتشرح **المعمارية** البنية، وتحفظ **سجلات ADR** تاريخ القرارات، ويعرّف **المجال** لغة العمل وقواعده، وتصف **طبقة التطبيق** حالات الاستخدام، وتحدد **البنية التحتية** الحدود التقنية، وينظم قسم **التطوير** التسليم، ويفصل قسم **خارطة الطريق** المستقبل عن المنفذ، ويحفظ **الأرشيف** المعرفة المستبدلة.

ترتيب القراءة المقترح: يبدأ المطور بالدستور ثم المعمارية والمجال والتطبيق والتطوير؛ ويقرأ مدير المنتج الرؤية ومبادئ المنتج وتجربة المستخدم والخارطة؛ ويراجع المعماري الدستور والمعمارية وADR والحدود؛ ويركز مختبر الجودة على UX والثوابت وسياسات دورة الحياة وحالات الاستخدام وحالة الميزات.

## Bilingual Policy | سياسة اللغتين

Authoritative documents contain English and Arabic with equivalent meaning. Technical names remain in English when translation would reduce precision. | تحتوي الوثائق المعتمدة على الإنجليزية والعربية بمعنى متكافئ، وتبقى الأسماء التقنية بالإنجليزية عندما تكون أدق.

## Source-of-Truth Map | خريطة مصادر الحقيقة

When documents differ, use this authority order:

1. **QSC Constitution** — defines permanent principles and governance.
2. **Accepted current ADRs** — explain approved decisions for a specific context; an explicit later supersession replaces the earlier decision.
3. **Current Architecture documentation** — describes the current approved design under the Constitution and ADRs.
4. **Domain and Application documentation** — defines business language, invariants, policies, and use-case orchestration within approved architecture.
5. **Roadmap and Deferred Decisions** — records intent and unresolved choices; it is not implemented architecture and does not authorize implementation.
6. **Historical and Archived documentation** — preserves context and rationale; it must not guide new implementation when it conflicts with a higher source.

Status and scope matter. An Accepted ADR is authoritative only for the decision it covers. A document labelled `Historical Reference` may provide useful context but is not the current source of truth. A document labelled `Historical Document — Superseded` must direct readers to its authoritative replacement. See the [current ADR authority model](01-Architecture/ADR/README.md).

عند اختلاف الوثائق يُستخدم ترتيب المرجعية التالي:

1. **دستور QSC** — يحدد المبادئ الدائمة والحوكمة.
2. **سجلات ADR الحالية المعتمدة** — تشرح القرارات المعتمدة في سياق محدد؛ ويستبدل القرار اللاحق السابق عندما يعلن ذلك صراحة.
3. **وثائق المعمارية الحالية** — تصف التصميم الحالي المعتمد تحت الدستور وADR.
4. **وثائق المجال والتطبيق** — تعرف لغة العمل والثوابت والسياسات وتنسيق حالات الاستخدام داخل المعمارية المعتمدة.
5. **خارطة الطريق والقرارات المؤجلة** — تسجل النية والمسائل غير المحسومة؛ ولا تمثل معمارية منفذة ولا تمنح إذن التنفيذ.
6. **الوثائق التاريخية والمؤرشفة** — تحفظ السياق والأسباب، ولا يجوز أن توجه تنفيذاً جديداً عند تعارضها مع مصدر أعلى.

الحالة والنطاق مهمان. يكون ADR المعتمد مرجعاً في القرار الذي يغطيه فقط. توفر وثيقة `مرجع تاريخي` سياقاً مفيداً لكنها ليست مصدر الحقيقة الحالي. ويجب أن توجه وثيقة `وثيقة تاريخية — تم استبدالها` القارئ إلى بديلها المعتمد. راجع [نموذج مرجعية ADR الحالي](01-Architecture/ADR/README.md).
