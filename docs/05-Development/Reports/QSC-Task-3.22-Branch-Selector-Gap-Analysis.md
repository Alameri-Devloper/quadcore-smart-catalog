# QSC Task 3.22 Branch Selector Gap Analysis | تحليل فجوة محدد الفروع للمهمة QSC 3.22

## 1. Status | الحالة

**`ConfirmedBlockingGap`** — the **Branch Selector Authorization Composition Gap** blocks Task 3.22 Presentation. This report recommends a bounded remediation for separate planning; it does not approve or implement it. | **`ConfirmedBlockingGap`** — تحجب **فجوة تركيب تفويض محدد الفروع** واجهة المهمة 3.22. يوصي التقرير بمعالجة محدودة لتخطيط مستقل ولا يعتمدها أو ينفذها.

## 2. Branch | الفرع

`feature/task-3.22-presentation-planning`

## 3. Baseline | خط الأساس

Exact HEAD/integration baseline: `0f102dd020efacc517f0e27601f4a54ecce2eca0`. A1–A5 remain completed and merged through PRs #28–#32. The initial dirty state contained only the five expected unstaged planning documents. | خط الأساس وHEAD المطابقان هما `0f102dd020efacc517f0e27601f4a54ecce2eca0`. تبقى A1–A5 مكتملة ومدمجة عبر #28–#32، واحتوت الحالة غير النظيفة الأولية وثائق التخطيط الخمس المتوقعة فقط.

## 4. Independent review finding | نتيجة المراجعة المستقلة

An actor may be validly authorized for a Branch-scoped operation and have trusted Branch scope, yet lack every browser-safe Branch collection contract. The backend mutation could succeed if the actor somehow knew an ID, but Production Presentation cannot require guessed, leaked, or manually entered IDs. | قد يكون الممثل مخولاً لعملية مقيدة بالفرع ويملك نطاقاً موثوقاً، لكنه يفتقد أي عقد آمن لقائمة الفروع. قد تنجح الطفرة إذا عرف المعرف بطريقة ما، لكن الواجهة لا يجوز أن تعتمد التخمين أو التسريب أو الإدخال اليدوي.

## 5. Source evidence | أدلة المصدر

- `PERMISSION_REGISTRY` marks `catalog.product.edit`, Inventory permissions, `pricing.branchOverride.manage`, `referenceCost.branchOverride.manage`, and `workspace.branches.view` as independently assignable Staff permissions. `validateStaffPermissionCodes` validates membership/assignability and adds no implication.
- `workspace.branches.manage` is Owner-only assignable, but neither Owner semantics nor that restriction causes operational permissions to include Branch view.
- `ListBranchesUseCase` checks only Owner, `workspace.branches.view`, or `workspace.branches.manage`.
- `GET /api/branches` delegates directly to that use case; it adds no operational composition.
- A1 calculates Branch, Listing, Inventory, Pricing, and Reference Cost booleans independently.
- A2 defines `Listing`, `Inventory`, `BranchPricing`, and `BranchReferenceCost` as Branch-scoped, rejects a missing `branchId`, and safely validates a supplied ID against trusted scope and same-Workspace persistence.

- يثبت سجل الصلاحيات استقلال تعيين الصلاحيات التشغيلية عن عرض الفروع، ولا تضيف دالة التحقق أي استلزام. تتحقق قائمة الفروع فقط من المالك أو عرض/إدارة الفروع، ويُفوّض مسار GET إليها مباشرة. تحسب A1 القدرات باستقلال، وتتطلب A2 معرف الفرع لأغراض الفرع وتتحقق من نطاقه ووجوده.

## 6. Valid permission composition examples | أمثلة تراكيب الصلاحيات الصالحة

Each of these Staff permission sets is valid without Branch view/manage: `{ inventory.receive }`, `{ inventory.reserve }`, `{ inventory.transfer }`, `{ pricing.branchOverride.manage }`, `{ referenceCost.branchOverride.manage }`, and `{ catalog.product.edit }`. The same applies to other independently assignable Inventory view/mutation permissions accepted by A2. | كل مجموعة منفردة من الصلاحيات المذكورة صالحة للموظف دون عرض/إدارة الفروع، وكذلك بقية صلاحيات عرض/تعديل المخزون المستقلة التي تقبلها A2.

## 7. Branch collection authorization | تفويض قائمة الفروع

`ListBranchesUseCase` returns `Forbidden` unless the context is Owner or contains `workspace.branches.view` or `workspace.branches.manage`. On success it filters the repository list by `TrustedActorContext.branchScope`. No Listing, Inventory, Pricing, or Reference Cost permission grants collection visibility. | تعيد حالة المنع ما لم يكن السياق مالكاً أو يحتوي عرض/إدارة الفروع. وعند النجاح ترشح القائمة بالنطاق الموثوق. لا تمنح أي صلاحية تشغيلية قائمة الفروع.

## 8. A1 capability composition | تركيب قدرات A1

A1 intentionally has no implication between sections. For example, `{ inventory.receive }` produces `inventory.canReceive: true` with `branches.canView: false` and `branches.canManage: false`. Equivalent states exist for Listing, Inventory/Transfer, Branch Pricing, and Branch Reference Cost. This independence is correct and must not be removed. | لا توجد قاعدة استلزام بين أقسام A1. قد تكون `canReceive` صحيحة وقدرتا الفروع خاطئتين، وتنطبق الحالة على الإدراج والمخزون/التحويل وتسعير الفرع وتكلفته المرجعية. هذا الاستقلال صحيح ولا يلغى.

## 9. A2 branchId requirement | اشتراط branchId في A2

A2 requires `branchId` for `Listing`, `Inventory`, `BranchPricing`, and `BranchReferenceCost`; Workspace Pricing/Reference Cost forbid it. A supplied ID is checked against `TrustedActorContext.branchScope` and canonical Branch existence. A browser cannot use a Branch-scoped search without already knowing a valid ID: omission is `InvalidQuery`. | تتطلب أغراض الفرع المعرف وتمنعه أغراض مساحة العمل. يتحقق الخادم من النطاق والوجود، لكن المتصفح لا يستطيع بدء البحث دون معرف صالح معروف مسبقاً، ويؤدي الغياب إلى `InvalidQuery`.

## 10. Affected Task 3.22 workflows | التدفقات المتأثرة

Listing; Inventory availability/quantity reads; Receive, Issue, Correct, Damage, Restore, Reserve, Release, Fulfill; Reservation discovery/detail; both source and destination selection for Transfer; Branch Pricing overrides; and Branch Reference Cost overrides. Branch management itself remains usable through its existing contract for Branch view/manage actors. Workspace-only pricing operations do not require a Branch but remain sequenced behind the coherent Presentation gate. | تتأثر عمليات الإدراج وقراءات/طفرات المخزون والحجوزات وفرعا التحويل وتجاوزات التسعير والتكلفة المرجعية. تبقى إدارة الفروع قابلة للاستخدام لمن يملك صلاحيتها، ولا تحتاج عمليات مساحة العمل فرعاً لكنها تبقى ضمن بوابة الواجهة المتماسكة.

## 11. Why Empty State is insufficient | لماذا لا تكفي حالة الفراغ

`403 Forbidden` from Branch collection means the actor lacks that contract, not that the trusted Branch scope contains zero Branches. Rendering “no accessible Branches” would falsely convert authorization failure into resource emptiness and conceal that A1 advertises a capability the browser cannot reach. This is option B: an unusable capability caused by missing composition. | يعني `403` غياب تفويض العقد لا خلو النطاق الموثوق من الفروع. سيحول عرضه كفراغ فشل التفويض إلى خلو موارد زائفاً ويخفي أن A1 تعرض قدرة لا تصل إليها الواجهة. إنها قدرة غير قابلة للاستخدام بسبب تركيب مفقود.

## 12. Alternatives analyzed | البدائل المحللة

| Option | Assessment | Decision |
| --- | --- | --- |
| Broaden `GET /api/branches` | Would widen a general full Branch contract, disclose revision/timestamps/order metadata, alter existing permission semantics, and affect consumers | Reject |
| Operation-specific Branch selector read | Can compose exact existing operational purpose with minimum Workspace Branch data under trusted scope | Recommend for separate contract |
| Add Branch IDs to A1 | Mixes Identity capability projection with Workspace resource discovery, leaks raw scope, becomes stale, and violates ownership | Reject |
| Read session Branch IDs | Couples UI to trusted authority internals, lacks labels/status, leaks scope, and becomes stale | Reject |
| Free-form Branch ID | Not discoverable or usable, encourages probing/guessing, and is not a Production selector | Reject |

الخيار الموصى به هو قراءة محدد خاصة بالعملية. يرفض توسيع القائمة العامة لأنه يوسع الكشف والدلالات، ويرفض وضع المعرفات في A1 أو الجلسة لأنه يخلط الملكية ويسرب النطاق، ويرفض المعرف الحر لأنه ليس محدداً إنتاجياً.

## 13. Recommended remediation | المعالجة الموصى بها

Separately define a bounded, browser-safe **operational Branch selector read** in Workspace Branch Application. It should accept a semantic purpose, authorize that purpose from existing effective permissions, load Branches through the existing Branch repository, filter by server-derived Workspace and trusted Branch scope, and return only minimum selector data. No exact route or TypeScript DTO exists or is approved yet. | يوصى بتعريف مستقل لقراءة محدد فروع تشغيلي آمن ومحدود في تطبيق فروع مساحة العمل. يقبل غرضاً دلالياً ويفوضه من الصلاحيات الحالية ويستخدم المستودع الحالي ويرشح بمساحة العمل والنطاق الموثوق ويعيد الحد الأدنى فقط. لا يوجد أو يعتمد مسار أو DTO فعلي بعد.

## 14. Ownership | الملكية

Workspace Branch Application owns Branch identity, lifecycle, ordering, tenant lookup, and collection. The HTTP adapter must remain thin. Identity A1 remains capability projection only; Catalog Query, Catalog Branch Product, and Inventory remain consumers of the selected ID and owners of their resource rules. No repository calls another repository. | يملك تطبيق فروع مساحة العمل هوية الفرع ودورته وترتيبه واستعلام المستأجر والقائمة، ويبقى HTTP رقيقاً. تظل A1 إسقاط قدرات فقط، وتبقى المجالات الأخرى مالكة لقواعدها. لا يستدعي مستودع مستودعاً آخر.

## 15. Conceptual authorization | التفويض المفاهيمي

```text
TrustedActorContext
        ↓
A1 semantic operational capability
        ↓
Presentation shows a relevant future section
        ↓
Workspace Branch Application operational selector
        ↓
trusted-Workspace/trusted-scope Branch options
        ↓
resource-specific read and allowedActions
        ↓
mutation independently reauthorizes
```

The selector purpose should cover only Branch-scoped needs: Listing, Inventory, Transfer, Branch Pricing, and Branch Reference Cost. Workspace Pricing/Reference Cost must not require selector access. Transfer must use one trusted-scope option set for both source and destination, while the existing mutation still validates both and rejects equality/inactivity. | يغطي غرض المحدد احتياجات الفرع فقط، ولا يفرض على أغراض مساحة العمل. يستخدم التحويل مجموعة مقيدة واحدة للمصدر والوجهة، بينما تبقى الطفرة الحالية مسؤولة عن التحقق من الاثنين واختلافهما ونشاطهما.

## 16. Minimal DTO recommendation | توصية الحد الأدنى للحمولة

The later contract should evaluate exactly: `branchId`, `displayName`, `code`, and semantic `status: Active | Inactive`. `branchId` is the selected resource key; `displayName` is the label; `code` disambiguates duplicate names using an existing stable human-readable identity; `status` supports honest lifecycle display. Do not return `revision`, `createdAt`, `updatedAt`, or `sortOrder`; the server can reuse canonical ordering without disclosing the sort value. No raw permission, Workspace/actor ID, or branch-scope array belongs in the DTO. | ينبغي تقييم الحقول الأربعة فقط: المعرف والاسم والكود والحالة. يلزم الكود لتمييز الأسماء المتكررة، وتلزم الحالة للعرض الصادق. لا تعاد المراجعة أو الأوقات أو ترتيب الفرع أو الصلاحيات أو هوية مساحة العمل/الممثل أو مصفوفة النطاق.

## 17. Lifecycle considerations | اعتبارات دورة الحياة

Return trusted-scope Active and Inactive Branches with semantic status rather than manufacturing eligibility. Listing and Branch Pricing reads already return state/no actions for inactive Branches, and Inventory reads can remain informative. Presentation may label inactive options and prevent starting an obviously invalid mutation for usability, but resource reads and mutations remain authoritative because status can change after selection. For Transfer, both choices must come from trusted scope; inactive choices should be visibly unavailable, and the atomic mutation rechecks both. The A6 contract must test whether purpose-specific omission is materially safer before choosing it; no such filtering is approved here. | يوصى بإعادة الفروع النشطة وغير النشطة ضمن النطاق مع الحالة بدلاً من اختلاق الأهلية. يمكن تمييز غير النشط ومنع بدء طفرة واضحة البطلان للاستخدام، لكن تبقى القراءات والطفرات مرجعاً لأن الحالة قد تتغير. في التحويل يأتي الفرعان من النطاق وتبقى الطفرة الذرية مسؤولة عن التحقق. يجب أن يحسم عقد A6 أي ترشيح حسب الغرض ولا يعتمد هنا.

## 18. Security and non-disclosure | الأمان وعدم الكشف

Purpose selects an authorization composition and never grants authority. Workspace, actor, permission set, and Branch scope come only from `TrustedActorContext`. The selector returns only same-Workspace, in-scope resources. It must use private/no-store responses, safe authentication/restricted/unavailable errors, strict query allow-listing, and no cross-purpose cursor reuse if pagination is later justified. Resource existence outside scope remains undisclosed. | يحدد الغرض تركيب التفويض ولا يمنح السلطة. تأتي كل السلطة من السياق الموثوق، وتعود موارد مساحة العمل والنطاق فقط. يجب استخدام استجابة خاصة دون تخزين وأخطاء آمنة واستعلام مقيد، مع عدم كشف أي مورد خارج النطاق.

## 19. ADR decision | قرار ADR

**`ADR NOT REQUIRED`.** The recommended read stays inside existing Workspace Branch Application ownership and authorization conventions; it does not change Domain boundaries, global permission semantics, or persistence authority. A separate implementation contract/review is still mandatory. | **`ADR NOT REQUIRED`**؛ تبقى القراءة ضمن ملكية تطبيق الفروع الحالية ولا تغير الحدود أو دلالات الصلاحيات العامة أو سلطة الاستمرارية، مع بقاء العقد والمراجعة المستقلين إلزاميين.

## 20. Database decision | قرار قاعدة البيانات

**`NO DATABASE CHANGE`.** Existing Workspace Branch persistence and canonical list order are sufficient. Migration `0016` is unrelated and must not be created. | **`NO DATABASE CHANGE`**؛ تكفي استمرارية الفروع وترتيبها الحاليان، ولا علاقة للترحيل `0016`.

## 21. Dependency decision | قرار الاعتماديات

**`NO NEW DEPENDENCY`.** Existing TypeScript, Application/HTTP patterns, repository port, and tests are sufficient. | **`NO NEW DEPENDENCY`**؛ تكفي الأنماط والأدوات الحالية.

## 22. Permission-registry decision | قرار سجل الصلاحيات

**`NO NEW PERMISSION`.** Selector access should be composed from existing exact Branch-scoped operational permissions. A new selector permission would require another independent assignment and reproduce the same unusable-capability mismatch. General Branch view remains independent and unchanged. | **`NO NEW PERMISSION`**؛ يركب وصول المحدد من الصلاحيات التشغيلية الحالية. ستعيد صلاحية جديدة مشكلة التعيين المستقل نفسها، وتبقى صلاحية عرض الفروع العامة مستقلة دون تغيير.

## 23. Recommended bounded task name | اسم المهمة المحدودة الموصى به

**Task 3.22-A6 — Operational Branch Selector Read | المهمة 3.22-A6 — قراءة محدد الفروع التشغيلي.** This extends the historical remediation sequence without renumbering merged A1–A5. The name is a recommendation for a separately approved planning/implementation contract, not current implementation authorization. | يمتد الاسم في تسلسل المعالجة دون إعادة ترقيم الشرائح المدمجة، وهو توصية لعقد مستقل لا تصريح تنفيذ حالي.

## 24. Presentation impact | أثر الواجهة

Task 3.22 status changes to `Blocked`. P1 and all P2–P8 slices remain proposed design only and cannot begin because Branch selection is their direct or transitive prerequisite. The existing mobile-first, RTL/LTR, accessibility, URL state, strict typed-client, Inventory disclosure, Pricing concurrency, Reservation, Transfer, error, loading, security, and test plans remain reusable after remediation. | تتغير حالة 3.22 إلى محجوبة، ولا تبدأ P1 أو بقية الشرائح لاعتمادها على المحدد. تبقى خطط الجوال واللغة والإتاحة وURL والعملاء والكشف والتزامن والحجوزات والتحويل والأخطاء والأمان والاختبارات قابلة لإعادة الاستخدام بعد المعالجة.

## 25. Final recommendation | التوصية النهائية

Accept `ConfirmedBlockingGap`; keep A1–A5 recorded as correctly merged; keep Task 3.22 Presentation unstarted and blocked; independently plan and review Task 3.22-A6; do not implement A6 or P1 automatically. | اعتمد `ConfirmedBlockingGap` مع إبقاء A1–A5 صحيحة ومدمجة، وإبقاء واجهة 3.22 غير مبدوءة ومحجوبة، وخطط وراجع A6 مستقلاً دون بدء A6 أو P1 تلقائياً.
