# QSC Task 3.22-A6 Planning Report | تقرير تخطيط المهمة QSC 3.22-A6

**Planning only, completed for review. A6: `ApprovedForImplementation`. Presentation: `Blocked`.** No A6 or Presentation implementation started. | **اكتمل التخطيط فقط للمراجعة. A6: `ApprovedForImplementation`، والواجهة: `Blocked`.** لم يبدأ تنفيذ أي منهما.

## Baseline and draft reconciliation | خط الأساس ومصالحة المسودات

The resumed preflight ran git status, git branch --show-current, git rev-parse HEAD and the required ancestor check. Branch and HEAD matched exactly, the ancestor check returned 0, and nothing was staged. Only the two expected untracked A6 drafts existed; the user explicitly allowed them. No production, migration, package, lockfile or unrelated documentation changes existed. Both drafts were inspected before rewriting; their claim of a clean initial worktree was corrected. | أعيدت فحوص Git المطلوبة وطابق الفرع وHEAD ونجح السلف دون ملفات مرحلة. وُجدت المسودتان المصرح بهما فقط دون تغييرات مصدر أو ترحيل أو حزم أو وثائق غير مرتبطة. فُحصتا قبل إعادة الكتابة وصُحح ادعاء نظافة شجرة العمل الأولية.

The interrupted draft's Active-only Transfer selector was reconsidered. The completed contract returns Active and Inactive for all purposes, preserving discovery versus mutation boundaries. It also records that A2 needs an Active Branch, Reservation allowedActions do not check Branch activity, Branch counts have no proven hard cap, and no-store cannot erase already delivered data. | أعيد تقييم اقتراح حصر التحويل بالنشط؛ يعيد العقد المكتمل الحالتين لكل الأغراض ويحفظ فصل الاكتشاف عن الطفرة. يوثق اشتراط نشاط الفرع في A2، وعدم فحص أفعال الحجز لنشاط الفرع، وغياب سقف فروع مثبت، وحدود عدم التخزين.

## Complete 33-item final handoff | التسليم النهائي الكامل من 33 بنداً

1. **A6 planning decision / قرار التخطيط:** `ApprovedForImplementation`, limited to the documented bounded server read; stop for review / لقراءة الخادم المحدودة فقط مع التوقف للمراجعة.

2. **Source-proven reason / السبب المثبت:** Registry allows operational-only Staff; A1 exposes operational capability independently; general List requires Owner or Branch view/manage; A2 requires a known Branch ID. A source trace with inventory.receive reproduces the gap without executing application tests. Existing Branch list/UoW is sufficient. See the linked source evidence in the [Implementation Contract](../../06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md). / يثبت تتبع المصدر استقلال صلاحيات العمليات ومنع القائمة العامة واحتياج A2 لمعرف معلوم، وكفاية المستودع ووحدة العمل الحاليين.

3. **Exact purpose vocabulary / الأغراض الدقيقة:** `Listing | Inventory | Transfer | BranchPricing | BranchReferenceCost`. WorkspacePricing/WorkspaceReferenceCost remain Branch-independent; no Reservation or source/destination-specific purpose / تبقى أغراض مساحة العمل مستقلة ولا يضاف غرض حجز أو مصدر/وجهة.

4. **Authorization matrix / مصفوفة التفويض:** ANY permission in the selected row; current effective context is decisive / يكفي أي تصريح في صف الغرض ويظل السياق الفعلي حاسماً.

   | Purpose | Exact existing qualifying permissions |
   | --- | --- |
   | Listing | `catalog.product.edit` OR `catalog.products.edit` |
   | Inventory | `inventory.availability.view` OR `inventory.quantity.view` OR `inventory.receive` OR `inventory.issue` OR `inventory.reserve` OR `inventory.damage` OR `inventory.adjust` |
   | Transfer | `inventory.transfer` |
   | BranchPricing | `pricing.branchOverride.manage` |
   | BranchReferenceCost | `referenceCost.branchOverride.manage` |

   Branch view/manage alone does not authorize A6 and is not required alongside an operational permission. Owner uses Identity's effective permission expansion, with no new role bypass. Generic Catalog/Pricing/Reference Cost view is not implied. / لا تكفي صلاحية الفروع وحدها ولا تشترط مع العملية. يستخدم المالك صلاحيات الهوية الموسعة دون تجاوز دور جديد ولا يمنح العرض العام.

5. **DTO / الحمولة:** Exactly `{ branchId: string; code: string; displayName: string; status: "Active" | "Inactive" }`. ID selects the resource, stable code distinguishes names, displayName labels it, status explains lifecycle. Exclude workspaceId, actorId, branchScope, permissions, role, authorizationVersion, revision, sortOrder and timestamps / المعرف للاختيار والكود للتمييز والاسم للعرض والحالة للتفسير؛ تستبعد السلطة الخام وبيانات الإدارة.

6. **Lifecycle / دورة الحياة:** Active + Inactive for every purpose, including Transfer. No server lifecycle filter. Inactive is explanatory; A2 rejects inactive Branches and mutations recheck their own eligibility. A3 Reservation reads may expose actions for an inactive Branch while the mutation rejects BranchInactive; preserve that distinction / تعاد الحالتان لكل غرض دون ترشيح، وتبقى A2 والطفرات مرجع الأهلية مع حفظ اختلاف أفعال الحجز عن نشاط الفرع.

7. **Transfer / التحويل:** Independent Transfer purpose, inventory.transfer only; one same-Workspace, trusted-scope set for source and destination. Inventory retains inequality, both scopes, activity, stock, quantity, Product, deterministic locks, atomicity and replay. Transfer-only staff use unchanged A2 Inventory for source Product selection / غرض مستقل ومجموعة واحدة للفرعين؛ تبقى الشروط والذرية وإعادة الطلب في المخزون وتستخدم A2 Inventory للمنتج.

8. **Pagination and ordering / الصفحات والترتيب:** No pagination; reuse the existing unpaged list. Operational Branch scale is an explicit assumption; no hard count cap or measured production performance is claimed. Application MUST preserve the order returned by BranchRepository.list while filtering trusted scope, with no locale/client-style re-sort; HTTP preserves Application result order. The port does not specify a three-key comparator. `sortOrder ASC, displayName ASC, branchId ASC` is current PostgreSQL persistence behavior, not an independent Application/API ordering guarantee; sortOrder stays undisclosed / لا صفحات ولا ادعاء سقف أو قياس إنتاجي. يحفظ التطبيق ترتيب نتيجة المستودع عند ترشيح النطاق دون إعادة فرز لغوي أو بأسلوب العميل، ويحفظ HTTP ترتيب نتيجة التطبيق. لا تحدد واجهة المستودع مقارناً ثلاثياً؛ الترتيب الثلاثي المذكور سلوك PostgreSQL الحالي وليس ضماناً مستقلاً للتطبيق أو API، ولا يكشف sortOrder.

9. **Search / البحث:** No backend search or q; future Presentation may filter already-authorized labels/codes locally / لا بحث خادم، ويمكن الترشيح المحلي المخول لاحقاً.

10. **HTTP route / المسار:** `GET /api/branches/operational?purpose=...`. Exactly one case-sensitive purpose and no extra query key. Success `{ type: "Success", value: [...] }`; Branch Application projects the four-field array / غرض دقيق واحد دون مفاتيح زائدة وغلاف النجاح الحالي.

11. **Errors/non-disclosure / الأخطاء وعدم الكشف:** 401 AuthenticationRequired; 403 ForbiddenForRestrictedSession; 400 InvalidInput for absent/empty/duplicate/unknown/case-invalid purpose or extras; 403 Forbidden for missing authority; 200 Success [] only for an authorized empty trusted scope; 503 BranchServiceUnavailable for unexpected failures. Resolve full context before query validation. No resource-ID input or 404; no internal errors or cross-tenant/scope data / تفصل أخطاء الجلسة والمدخل والتفويض والعطل عن الفراغ الحقيقي ولا يكشف السياق أو وجود موارد خارج النطاق.

12. **Cache / التخزين:** `Cache-Control: private, no-store` on all responses/errors. A6-specific behavior follows management endpoints; existing general Branch responses stay unchanged. Future client refetches across session changes / عدم التخزين لكل النتائج مع حفظ القائمة العامة وإعادة طلب العميل عند تغير الجلسة.

13. **Ownership / الملكية:** Workspace Branch Application owns the purpose policy/use case/projection. Reuse BranchUnitOfWork.execute and BranchRepository.list(trustedWorkspaceId); HTTP/runtime are thin. No Operations Domain, BFF, React authority or repository-to-repository call / الملكية لتطبيق الفروع مع إعادة استخدام وحدة العمل والمستودع والمحولات الرقيقة.

14. **Domain / المجال:** `NO DOMAIN CHANGE` / لا تغيير مجال.
15. **Repository / المستودع:** `NO REPOSITORY CONTRACT CHANGE`; existing list and persistence suffice / يكفي العقد الحالي.
16. **ADR:** `ADR NOT REQUIRED`; ownership and architecture remain intact / لا يلزم قرار معماري جديد.
17. **Database/migration / قاعدة البيانات والترحيل:** `NO DATABASE CHANGE`; no schema/index/migration, especially no 0016 / لا مخطط أو فهرس أو ترحيل 0016.
18. **Dependency / الاعتماديات:** `NO NEW DEPENDENCY`; no package/lockfile edits / لا اعتماد أو تعديل حزم.
19. **Permission registry / سجل الصلاحيات:** `NO NEW PERMISSION`; no registry/assignment/global implication change / لا تغيير سجل أو تعيين أو استلزام عام.
20. **A1/A2 relationship / العلاقة:** A1 navigation hint → A6 Branch discovery → selection → A2 Product discovery → resource GET/current state/actions where supplied → mutation reauthorization. Workspace-level pricing skips A6; A1–A5 unchanged / تلميح ثم اكتشاف فرع ثم منتج ثم مورد وإعادة تفويض دون تغيير A1–A5.
21. **Exact future implementation scope / نطاق التنفيذ المستقبلي:** Add Application purpose/policy/DTO and ListOperationalBranchesUseCase; add its tests and app/api/branches/operational/route.ts delegate; extend existing Branch runtime and HTTP handler/tests with isolated private responses; extend existing PostgreSQL Branch integration tests only for ordering/isolation; bilingual delivery docs. Exact paths are in the contract. No implementation files were created / سياسة وحالة استخدام واختبارات ومسار رقيق وأسلاك حالية وتوثيق فقط وفق المسارات المحددة، دون إنشاء كود الآن.
22. **Test scope / نطاق الاختبار:** Plan all five purposes × all 12 exact permission literals, denial before repository access, Branch-only negatives, real Owner effective permissions, Selected/AllBranches, tenant isolation and faulty foreign-row non-disclosure, empty/all-inactive/mixed lists, four-field projection, strict HTTP/auth/error/cache behavior, cross-session/context changes, unchanged general reads, independent Pricing/Reference Cost, transfer-only flow and Reservation/Transfer resource regressions. Application/unit tests verify relative order preservation from repository results after scope filtering, without owning a comparator; HTTP tests preserve Application result order; PostgreSQL integration tests explicitly verify the current three-key persistence ordering, including ties. Future implementation runs focused Branch/Identity/Query/Pricing/Inventory tests, typecheck, lint, build and guarded integration. No implementation tests written now / خطة شاملة للصلاحيات والنطاق والحالة والحمولة والأخطاء والعزل والانحدارات. تختبر الوحدات حفظ ترتيب نتيجة المستودع بعد ترشيح النطاق دون امتلاك مقارن، ويختبر HTTP حفظ ترتيب نتيجة التطبيق، وتثبت اختبارات تكامل PostgreSQL ترتيب الاستمرارية الثلاثي الحالي وتعادل مفاتيحه. تشغل بوابات التنفيذ لاحقاً فقط.
23. **Presentation status / حالة الواجهة:** `Blocked` until A6 implementation, independent review, merge and renewed gate reconciliation. A6 approval does not approve P1 / تبقى محجوبة حتى المراحل الأربع ولا يعتمد P1.
24. **Files created / الملفات المنشأة:** No newly created files in this resumed session. Two expected pre-existing untracked drafts were completed and remain new relative to HEAD: the A6 Implementation Contract and A6 Planning Report at items 32–33 / لم تنشأ ملفات جديدة في المتابعة؛ اكتملت المسودتان الموجودتان وبقيتا غير متتبعتين وجديدتين نسبة إلى HEAD.
25. **Files modified / الملفات المعدلة:** The two drafts above were rewritten. Five tracked planning documents were minimally reconciled: Current-Roadmap.md, Sprint-03-Continuation.md, Task-3.22-A-Operational-Management-Contract.md, Task-3.22-Presentation-Implementation-Contract.md, and QSC-Task-3.22-Presentation-Planning-Report.md. Full paths below / أعيدت كتابة المسودتين وصودقت خمس وثائق متتبعة بتعديلات محدودة.
26. **Files deleted / الملفات المحذوفة:** None / لا توجد.
27. **Verification performed / التحقق المنفذ:** Git baseline/ancestor and unstaged docs-only scope checks; source and existing test inspection; strict UTF-8/bilingual and relative Markdown file-target validation across all seven changed documents; whitespace checks including both untracked drafts; final status/stat. No repository Markdown validation command was found in package scripts, scripts/ or .github, so an inline read-only validator was used. No application tests, typecheck, lint, build, PostgreSQL, migrations or npm audit were run. No implementation review ZIP was generated for this planning-only task / فحوص Git والنطاق والمصدر وUTF-8 واللغتين والروابط والمسافات والحالة والإحصاء فقط، بمدقق قراءة مؤقت لعدم وجود أمر جاهز. لم تشغل بوابات التطبيق أو قاعدة البيانات ولم تنشأ حزمة تنفيذ.
28. **git diff --check:** Passed; separate no-index whitespace checks for the two untracked drafts passed / نجح مع فحص المسودتين غير المتتبعتين أيضاً.
29. **Final git status / حالة Git النهائية:** Five tracked documentation modifications and two untracked A6 documentation drafts; nothing staged, no source changes / خمسة تعديلات توثيق متتبعة ومسودتان غير متتبعتين دون ترحيل أو تغيير مصدر.
30. **Branch / الفرع:** `feature/task-3.22-a6-operational-branch-selector-planning`.
31. **HEAD:** `54b27673824b833f8597594c1e0107c5f017da69`.
32. **Implementation Contract / عقد التنفيذ:** [docs/06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md](../../06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md).
33. **Planning Report / تقرير التخطيط:** [docs/05-Development/Reports/QSC-Task-3.22-A6-Planning-Report.md](QSC-Task-3.22-A6-Planning-Report.md).

## Verification Evidence | أدلة التحقق

Verification detail: `git diff --check` exited 0. The two `git diff --no-index --check -- NUL <draft>` checks emitted no whitespace-error diagnostics; exit 1 denotes their content difference from NUL. Git emitted normal Windows LF-to-CRLF notices. The inline validator checked 111 relative file targets across all seven documents; it did not validate Markdown heading fragments. | تفاصيل التحقق: نجح فحص فرق Git برمز 0؛ لم يجد فحص المسودتين أخطاء مسافات، ويعني الرمز 1 اختلافهما عن الملف الفارغ. ظهرت إشعارات نهايات الأسطر المعتادة، وفُحص 111 هدف ملف نسبي في الوثائق السبع دون التحقق من أجزاء عناوين Markdown.

## Files Created | الملفات المنشأة

None newly created on resumption. These two existing drafts were completed; both remain untracked relative to HEAD / لم ينشأ جديد في المتابعة؛ اكتملت المسودتان وبقيتا غير متتبعتين:

- `docs/06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.22-A6-Planning-Report.md`

## Files Modified | الملفات المعدلة

The two existing drafts above, plus five tracked documents / المسودتان أعلاه وخمس وثائق متتبعة:

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`
- `docs/06-Roadmap/Task-3.22-Presentation-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Architecture Changes | تغييرات المعمارية

None implemented. This is a bounded future Application composition contract, with all no-change gates preserved. No production source, test source, migration, package or lockfile changed. | لم ينفذ تغيير معماري؛ العقد لتركيب تطبيق مستقبلي محدود مع حفظ البوابات وعدم تغيير كود أو اختبارات أو ترحيلات أو حزم.

## Summary | الخلاصة

A6 planning is complete: five exact purposes, existing permission composition, four-field scoped discovery, Active/Inactive results, unpaged repository-order preservation, no backend search, safe private HTTP and focused future tests. The PostgreSQL three-key comparator is documented and tested as current persistence behavior only. A1–A5 and PR #33 remain merged; A6 implementation has not started; Presentation remains Blocked. | اكتمل التخطيط بخمسة أغراض وصلاحيات حالية وأربعة حقول ونطاق موثوق وحالتين وحفظ ترتيب المستودع دون صفحات أو بحث خادم، مع HTTP خاص آمن واختبارات مستقبلية. يوثق ويختبر المقارن الثلاثي كسلوك استمرارية PostgreSQL الحالي فقط. تبقى A1–A5 و#33 مدمجة ولم يبدأ A6 وتبقى الواجهة محجوبة.

## Next Recommendation | التوصية التالية

Review this planning contract/report independently. If accepted, implement only A6 as a separate bounded task, verify and review it, merge through the authorized workflow, then reconcile the Presentation gate again. Stop here; nothing staged or committed. | راجع العقد والتقرير مستقلاً، ثم نفذ A6 فقط كمهمة منفصلة عند الاعتماد وتحقق منها وراجعها وادمجها عبر المسار المصرح، ثم أعد مصالحة بوابة الواجهة. التوقف هنا دون ترحيل أو التزام.
