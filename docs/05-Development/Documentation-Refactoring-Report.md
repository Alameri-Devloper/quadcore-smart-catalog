# Documentation Refactoring Report | تقرير إعادة تنظيم التوثيق

**Status:** Ready for review · **Last Updated:** 2026-07-19 · **Scope:** Foundation Task 0

## English

Created an authoritative bilingual hierarchy for Constitution, Architecture/ADR, Domain, Application, Infrastructure, Development, Roadmap, and Archive. Existing documents remain in place to preserve Git history and unique detail; the audit classifies every source. Knowledge vision was consolidated at the required destination with a link to the original. No application code, dependency, database, or build configuration changed.

The old `ADR-0002`–`ADR-0009` series and new `ADR-001`–`ADR-005` series intentionally coexist because their identifiers differ. The older lifecycle ADR contains historical soft-delete context; the new ADR-001 is authoritative for the approved foundation.

### ADR authority mapping

The current register is `docs/01-Architecture/ADR/`. Its three-digit ADRs are authoritative for their approved Foundation topics. The original four-digit records retain individual status and scoped authority where non-conflicting; the series is frozen for new decisions. ADR-0002, ADR-0003, ADR-0004, ADR-0006, ADR-0007, ADR-0008, and ADR-0009 are complementary to, rather than replaced by, the similarly numbered three-digit records. ADR-0005 conflicts with the approved lifecycle and is Superseded by ADR-001. Future numbering continues with ADR-006 in the current register.

### Superseded and historical classification

Superseded documents: root Vision, root Architecture, root Catalog, short project Vision, original Knowledge Engine Vision, Project Decisions, small Glossary, and ADR-0005. Each has a bilingual notice and relative replacement link.

Historical References: CHANGELOG, Project Status, original Roadmap, Sprint 01, Sprint 02, and the original ADR index. Valid complementary Product Vision, Product Design Principles, development guidance, detailed architecture/domain/design documents, and non-conflicting legacy ADRs were not marked Superseded.

### Remaining ambiguity

No unresolved lifecycle authority ambiguity remains: ADR-001 governs current Product lifecycle; deletion, Trash, purge, and retention are deferred. Some original ADRs carry statuses such as “Accepted for future implementation.” Those statuses approve direction only and must not be read as evidence of runtime implementation. Any future conflict requires an explicit superseding ADR, not an inference from numbering.

The Responsive First correction was completed separately before this authority pass and was not repeated. Review of `AGENTS.md` confirms its change is limited to the approved Responsive First environments and functional interaction coverage.

## العربية

أُنشئ هيكل رسمي ثنائي اللغة للدستور والمعمارية وADR والمجال والتطبيق والبنية التحتية والتطوير والخارطة والأرشيف. بقيت الوثائق السابقة في أماكنها لحفظ تاريخ Git والتفاصيل الفريدة، وصنف التدقيق كل مصدر. جُمعت رؤية المعرفة في المسار المطلوب مع رابط للأصل. لم يتغير كود التطبيق أو الاعتماديات أو قاعدة البيانات أو إعداد البناء.

تتعايش سلسلة ADR القديمة والجديدة لاختلاف صيغة أرقامها. تحفظ وثيقة دورة الحياة القديمة سياق soft delete التاريخي، بينما تمثل ADR-001 القرار المعتمد للأساس الحالي.

### خريطة مرجعية ADR

السجل الحالي هو `docs/01-Architecture/ADR/`، وقراراته ذات الأرقام الثلاثة معتمدة لموضوعات Foundation التي تغطيها. تحتفظ السجلات الأصلية بحالتها ونطاقها عندما لا تتعارض، وقد جُمّدت سلسلتها للقرارات الجديدة. القرارات ADR-0002 وADR-0003 وADR-0004 وADR-0006 وADR-0007 وADR-0008 وADR-0009 مكملة وليست مستبدلة بسبب تشابه الرقم. يتعارض ADR-0005 مع دورة الحياة المعتمدة ولذلك استبدله ADR-001. يبدأ الترقيم المستقبلي من ADR-006 في السجل الحالي.

### الوثائق المستبدلة والتاريخية

الوثائق المستبدلة هي: Vision وArchitecture وCatalog في الجذر، ورؤية المشروع المختصرة، ورؤية Knowledge Engine الأصلية، وProject Decisions، وGlossary المختصر، وADR-0005. تحمل كل وثيقة ملاحظة ثنائية اللغة ورابطاً نسبياً للبديل.

المراجع التاريخية هي CHANGELOG وProject Status وخارطة الطريق الأصلية وSprint 01 وSprint 02 وفهرس ADR الأصلي. لم تُصنف الرؤية التفصيلية ومبادئ التصميم وإرشادات التطوير ووثائق المعمارية والمجال والتصميم التفصيلية وADRs القديمة غير المتعارضة كمستبدلة لأنها مكملة وصالحة ضمن نطاقها.

### الغموض المتبقي

لا يوجد غموض متبقٍ حول دورة الحياة؛ يحكم ADR-001، وتبقى السلة والحذف النهائي والاحتفاظ مؤجلة. بعض ADR الأصلية تحمل حالة اعتماد للتنفيذ المستقبلي؛ وهي تعتمد الاتجاه ولا تثبت وجود تنفيذ. يتطلب أي تعارض مستقبلي ADR صريحاً للاستبدال ولا يحسم بمجرد الرقم.

اكتمل تصحيح Responsive First بصورة مستقلة قبل هذه المهمة ولم يُكرر هنا. تؤكد مراجعة `AGENTS.md` أن تغييره يقتصر على بيئات Responsive First المعتمدة وتغطية وسائل التفاعل وظيفياً.
