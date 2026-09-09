# QSC Task 3.22 Presentation Planning Report | تقرير تخطيط واجهة المهمة QSC 3.22

> **Current gate reconciliation — 2026-09-10:** A6 is **Completed / merged through PR #35** at `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`. The [post-A6 report](QSC-Task-3.22-Presentation-Gate-Reconciliation-Report.md) and [current Presentation contract](../../06-Roadmap/Task-3.22-Presentation-Implementation-Contract.md) establish **`ApprovedNextImplementation` — P1 only**; P2–P8 remain separately approval-gated and no Presentation is implemented. Everything below records the original planning/correction session: its `Blocked` decision, baseline, verification, inventory and A6 recommendation are historical, not current delivery status. | **مصالحة البوابة الحالية:** اكتملت A6 ودُمجت عبر #35 عند الخط المذكور. يثبت التقرير الجديد وعقد الواجهة الحالي **`ApprovedNextImplementation` لشريحة P1 فقط**؛ تبقى P2–P8 مشروطة باعتماد مستقل دون تنفيذ للواجهة. يحفظ ما يلي جلسة التخطيط والتصحيح الأصلية بقرارها المحجوب وخطها والتحقق والملفات والتوصية التاريخية، ولا يمثل حالة التسليم الحالية.

## Historical Planning Status | حالة التخطيط التاريخية

**`Blocked`** — independent correction review confirmed the **Branch Selector Authorization Composition Gap**. Task 3.22 Presentation has not started and must not begin until the smallest remediation is separately planned, approved, implemented, reviewed, merged, and the planning gate is reconciled again. | **`Blocked`** — أكدت مراجعة التصحيح المستقلة **فجوة تركيب تفويض محدد الفروع**. لم تبدأ واجهة 3.22 ولا يجوز أن تبدأ قبل تخطيط واعتماد وتنفيذ ومراجعة ودمج أصغر معالجة ثم إعادة مصالحة بوابة التخطيط.

## Independent Review Correction | تصحيح المراجعة المستقلة

The earlier `ApprovedNextImplementation` decision incorrectly classified `GET /api/branches` `403` as a safe “no accessible Branches” empty state. Source proves a valid Staff actor may have Branch-scoped operational permission and trusted Branch scope while lacking both general Branch permissions. That actor is authorized for the operation, but the only Branch collection is forbidden and A2 requires a Branch ID before it can search. This is an unusable capability caused by a missing browser composition contract, not an empty resource collection. | صنف القرار السابق `403` من قائمة الفروع خطأً كحالة «لا توجد فروع متاحة». يثبت المصدر أن موظفاً صالحاً قد يملك صلاحية تشغيل مقيدة بالفرع ونطاقاً موثوقاً مع غياب صلاحيتي الفروع العامتين. يكون مخولاً للعملية لكن قائمة الفروع ممنوعة وA2 تتطلب معرف الفرع قبل البحث. هذه قدرة غير قابلة للاستخدام بسبب عقد تركيب مفقود وليست مجموعة موارد فارغة.

## Branch and Baseline | الفرع وخط الأساس

- Branch: `feature/task-3.22-presentation-planning`
- Exact HEAD/integration baseline: `0f102dd020efacc517f0e27601f4a54ecce2eca0`
- Initial working tree: clean
- Required ancestor check: passed
- Merged remediation: A1/PR #28, A2/#29, A3/#30, A4/#31, A5/#32

- الفرع وخط الأساس وHEAD مطابقان للعقد، وكانت شجرة العمل نظيفة ونجح فحص السلف المطلوب. دُمجت شرائح المعالجة A1–A5 عبر طلبات السحب #28–#32.

## Source Inspection Performed | فحص المصدر المنفذ

The reconciliation read the current roadmap, Sprint continuation, Task 3.22-A operational contract, A1–A5 final reports, prior Task 3.22 planning evidence, Inventory/Catalog/Identity/Workspace architecture and UX guidance, Task 3.20 Catalog and Task 3.21 Reference Data Presentation, shared shell/UI patterns, typed clients/coordinators, and merged Application/HTTP source for Branches, operational Product discovery, Listing, Inventory, Reservations, Pricing, Reference Cost, and capabilities. Merged source was treated as truth where historical status prose differed. | قرأت المصالحة وثائق الخارطة والعقد والتقارير السابقة وتقارير A1–A5 وإرشادات المعمارية والتجربة وواجهتي 3.20 و3.21 والغلاف وعملاء HTTP والمنسقات، ومصدر التطبيق وHTTP المدمج للفروع واكتشاف المنتجات والإدراج والمخزون والحجوزات والتسعير والتكلفة المرجعية والقدرات. عُد المصدر المدمج الحقيقة عند اختلاف النص التاريخي.

## Original Blockers and Resolution Evidence | العوائق الأصلية وأدلة الحل

| # | Source-proven resolution | Safe for Presentation |
| --- | --- | --- |
| 1 | A1 Identity `GET /api/operations/capabilities` returns effective semantic booleans only | Yes; navigation hint only |
| 2 | A2 Catalog Query `GET /api/catalog/operational-products` supports six purpose-bound searches without ordinary Catalog view | Yes; canonical Product selector |
| 3 | A2 Catalog Branch Product Listing GET returns state, revision, timestamp, and actions | Yes; refetch-before-retry |
| 4 | A3 Inventory Reservation collection/detail GETs return current actionable state and actions | Yes; mutation rechecks remain decisive |
| 5 | A4 Workspace pricing management GET is Branch-independent | Yes; field-filtered state/actions |
| 6 | A4 Branch pricing management GET returns base/override/effective/source | Yes; override-specific authority |
| 7 | A4 exposes one shared Retail/Wholesale `productRevision` | Yes; full refetch after either mutation |
| 8 | A4 exposes independent Reference Cost and override revisions | Yes; field isolation preserved |
| 9 | A5 availability-only reads omit every numeric/revision/time field | Yes; semantic state only |
| 10 | A5 applies current trusted visibility to first and replayed mutation outcomes | Yes; no replay disclosure bypass |
| 11 | Resource Applications validate trusted Workspace/Branch/Product scope after an ID is supplied, but no selector composes independent operational authority with Branch discovery | **No; confirmed blocker** |
| 12 | Listing, Reservation, and Pricing resources return semantic `allowedActions`; A1 supplies global capabilities | Yes; every write still reauthorizes |

بالعربية: تبقى إنجازات A1–A5 صحيحة، لكنها لا تحل اكتشاف الفرع لكل تركيب صلاحيات تشغيلي مستقل. التحقق من نطاق معرف معروف لا يوفر محدداً قابلاً للاكتشاف.

## Remaining Gaps | الفجوات المتبقية

One blocking server composition gap remains. `ListBranchesUseCase` permits only Owner, `workspace.branches.view`, or `workspace.branches.manage`; operational permissions grant none of these. A1 computes Branch and operational capabilities independently. A2 requires `branchId` for Listing, Inventory, Branch Pricing, and Branch Reference Cost and correctly validates the supplied ID, but it cannot discover a Branch. A free-form/session-derived ID or a false empty state is not acceptable. | تبقى فجوة تركيب خادم مانعة واحدة. لا تسمح قائمة الفروع إلا للمالك أو عرض/إدارة الفروع، ولا تمنح الصلاحيات التشغيلية ذلك. تحسب A1 القدرات باستقلال، وتتطلب A2 معرف الفرع لأغراض الفرع وتتحقق منه لكنها لا تكتشفه. لا يقبل معرف حر أو مشتق من الجلسة ولا حالة فراغ زائفة.

## Architecture Verdict | الحكم المعماري

**`ADR NOT REQUIRED` for the recommended remediation.** A bounded operational Branch selector read belongs to the existing Workspace Branch Application, reuses the existing Branch repository/trusted context, and does not change Domain ownership or global permission implications. It requires a separate contract review, not an ADR. The retained future Presentation remains Domain-aligned and adds no Operations Domain or BFF. | **`ADR NOT REQUIRED` للمعالجة الموصى بها**؛ تنتمي قراءة المحدد المحدودة إلى تطبيق فروع مساحة العمل وتعيد استخدام المستودع والسياق الحاليين دون تغيير ملكية المجال أو الاستلزام العام للصلاحيات. تحتاج عقداً مستقلاً لا ADR، ويبقى تصميم العرض المستقبلي موزعاً حسب المجالات دون Operations Domain أو BFF.

## Security Verdict | الحكم الأمني

The retained Presentation controls remain sound, but implementation is blocked. The remediation must keep raw permissions and `branchScope` out of Presentation, derive Workspace/scope from `TrustedActorContext`, return only minimal Branch selector data, and leave every resource read/write authoritative. Extending A1 with IDs, consuming session scope IDs, or accepting manual IDs fails these controls. | تبقى ضوابط العرض سليمة لكن التنفيذ محجوب. يجب أن تبقي المعالجة الصلاحيات الخام و`branchScope` خارج العرض، وتشتق مساحة العمل والنطاق من السياق الموثوق، وتعيد الحد الأدنى لبيانات الفرع، وتبقي كل قراءة/كتابة مرجعاً. يفشل توسيع A1 بالمعرفات أو استخدام معرفات الجلسة أو الإدخال اليدوي هذه الضوابط.

## Presentation Scope | نطاق الواجهة

The previously designed bilingual Operations surfaces remain the proposed future scope, but none is implementation-approved. Affected Branch-scoped workflows are Listing, Inventory reads/mutations/Reservations, both Branches of Transfer, Branch Pricing overrides, and Branch Reference Cost overrides. Workspace pricing/reference cost is not directly selector-dependent but remains blocked as part of the coherent Presentation sequence. | تبقى أسطح العمليات المصممة سابقاً النطاق المستقبلي المقترح، لكن لا يعتمد تنفيذ أي منها. تشمل التدفقات المتأثرة الإدراج والمخزون والحجوزات وفرعي التحويل وتجاوزات التسعير والتكلفة المرجعية. لا تعتمد عمليات مساحة العمل مباشرة على المحدد لكنها تبقى محجوبة ضمن تسلسل الواجهة المتماسك.

## Implementation Sequence | تسلسل التنفيذ

1. **Blocked prerequisite:** separately plan/review **Task 3.22-A6 — Operational Branch Selector Read**; if later approved, implement/review/merge it.
2. P1 shell, capabilities, URL state, strict client/coordinator, Branch management, and selectors.
3. P2 Listing.
4. P3 Inventory read and Receive/Issue/Correct/Damage/Restore.
5. P4 Reservations and Reserve/Release/Fulfill.
6. P5 atomic Transfer and idempotency UX.
7. P6 Workspace pricing/Reference Cost concurrency.
8. P7 Branch overrides.
9. P8 integrated bilingual, responsive, accessibility, input-method, and security hardening.

التسلسل العربي: الشرط المسبق المحجوب هو تخطيط ومراجعة A6 مستقلاً ثم تنفيذها ودمجها فقط إذا اعتمدت. بعد إعادة مصالحة التخطيط يمكن أن يبدأ P1 ثم بقية شرائح العرض المحفوظة.

## Database / Migration Decision | قرار قاعدة البيانات والترحيل

**`NO DATABASE CHANGE`.** Existing Branch persistence/list ordering is sufficient for a bounded selector. The chain remains `0000–0015`; migration `0016` and the Reservation candidate index remain unrelated. | **`NO DATABASE CHANGE`**؛ تكفي استمرارية الفروع وترتيبها الحاليان للمحدد المحدود، وتبقى السلسلة `0000–0015` ولا علاقة لـ`0016` أو فهرس الحجوزات.

## Dependency Decision | قرار الاعتماديات

**`NO NEW DEPENDENCY`.** Existing Next.js, React, TypeScript, CSS, browser APIs, shared UI, i18n, and test/build patterns are sufficient. | **`NO NEW DEPENDENCY`**؛ تكفي الاعتماديات والأدوات الحالية.

## Permission Registry Decision | قرار سجل الصلاحيات

**`NO NEW PERMISSION`.** The remediation composes existing Branch-scoped operational permissions with minimum resource discovery. A new selector permission would recreate the same assignment mismatch and is not architecturally necessary. | **`NO NEW PERMISSION`**؛ تركب المعالجة الصلاحيات التشغيلية الحالية مع الحد الأدنى لاكتشاف المورد. ستعيد صلاحية محدد جديدة مشكلة التعيين نفسها ولا تلزم معمارياً.

## Risks | المخاطر

- Treating A1 as authorization rather than navigation guidance; controlled by resource GET/actions and mutation reauthorization.
- Modeling Retail/Wholesale revisions independently; controlled by one shared token and mandatory refetch.
- Rendering missing Inventory/Reference Cost fields as zero/not configured; controlled by strict discriminated/partial DTOs.
- Stale Reservation or Listing action; controlled by current detail/state and refetch-before-retry.
- Reusing operation IDs for changed commands; controlled by coordinator-owned exact-command lifecycle.
- Building a wide ERP dashboard; controlled by the mobile-first three-section IA and progressive panels.
- Misclassifying Branch collection `403` as empty; controlled by blocking Presentation until A6 exists.

- المخاطر الأساسية هي تحويل قدرات A1 إلى تفويض، أو فصل مراجعات التجزئة والجملة، أو تفسير الحقول الغائبة كصفر، أو استخدام فعل قديم، أو إعادة معرف عملية مع أمر مختلف، أو إنشاء لوحة ERP عريضة. يعالج العقد كل خطر بضابط صريح.

## Verification | التحقق

- Required Git branch/HEAD/clean-start/ancestor gates: passed before editing.
- Markdown relative-link validation for the six planning/correction files: passed.
- `git diff --check`: passed.
- No application, database, integration, build, or `npm audit` command was run because this task changes documentation only.

- نجحت بوابات Git وفحص الروابط النسبية و`git diff --check`. لم تشغل اختبارات التطبيق أو قاعدة البيانات أو التكامل أو البناء أو `npm audit` لأن المهمة توثيقية فقط.

## Files Created | الملفات المنشأة

- `docs/06-Roadmap/Task-3.22-Presentation-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md`
- `docs/05-Development/Reports/QSC-Task-3.22-Branch-Selector-Gap-Analysis.md`

## Files Modified | الملفات المعدلة

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Architecture Changes | تغييرات المعمارية

None in this planning task. The future Presentation boundary is a documented composition plan, not an implemented architecture change. | لا توجد في مهمة التخطيط. حد العرض المستقبلي خطة تنسيق موثقة وليس تغييراً معمارياً منفذاً.

## Summary | الخلاصة

Merged source at `0f102dd020efacc517f0e27601f4a54ecce2eca0` confirms A1–A5 correctness but disproves complete Presentation composability. Independently assignable operational authority can coexist with no Branch collection authority, while A2 needs a known Branch ID. The final decision is `Blocked`. | يؤكد المصدر المدمج صحة A1–A5 لكنه ينفي اكتمال قابلية تركيب الواجهة. يمكن أن تجتمع سلطة تشغيلية مستقلة مع غياب سلطة قائمة الفروع بينما تحتاج A2 معرفاً معروفاً. القرار النهائي هو `Blocked`.

## Next Recommendation | التوصية التالية

Independently review the dedicated gap analysis. Separately plan Task 3.22-A6; this report recommends its boundary but does not approve implementation. Do not begin A6 or Task 3.22-P1 automatically. | راجع تحليل الفجوة المستقل، ثم خطط A6 بصورة منفصلة. يوصي التقرير بحدودها لكنه لا يعتمد التنفيذ. لا تبدأ A6 أو P1 تلقائياً.
