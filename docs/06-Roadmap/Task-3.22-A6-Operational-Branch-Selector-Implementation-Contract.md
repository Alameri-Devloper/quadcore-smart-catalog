# Task 3.22-A6 — Operational Branch Selector Read Implementation Contract | عقد تنفيذ قراءة محدد الفروع التشغيلي

## Status and baseline | الحالة وخط الأساس

**A6 planning decision: `ApprovedForImplementation`.** Planning only; A6 implementation has NOT started. Task 3.22 Presentation remains **`Blocked`**, including P1. Approval of this bounded contract does not authorize implementation in this planning session. | **قرار تخطيط A6: `ApprovedForImplementation`.** التخطيط فقط؛ لم يبدأ تنفيذ A6، وتبقى واجهة 3.22 بما فيها P1 **`Blocked`**. لا يصرح اعتماد العقد بالتنفيذ في جلسة التخطيط هذه.

- Branch: `feature/task-3.22-a6-operational-branch-selector-planning`.
- Exact HEAD/baseline: `54b27673824b833f8597594c1e0107c5f017da69`, merge of Planning Correction PR #33.
- A1–A5 remain valid and merged through PRs #28–#32.
- On resumption, branch/HEAD matched, ancestor check passed, nothing was staged, and only the two existing untracked A6 drafts were present. The user explicitly authorized continuing with those drafts; this was **not a clean initial worktree**. No unrelated or production changes existed.
- طابق الفرع وHEAD المطلوبين ونجح فحص السلف، ولم يوجد شيء مرحل. وُجدت مسودتا A6 غير المتتبعتين فقط وصرح المستخدم بمتابعتهما صراحة؛ **لم تكن شجرة العمل الأولية نظيفة**. دُمج تصحيح التخطيط عبر #33 وبقيت A1–A5 صحيحة ومدمجة دون تغييرات إنتاجية أو غير مرتبطة.

## Source evidence and root cause | أدلة المصدر والسبب الجذري

The following merged source was inspected at the exact baseline. This is static source/test inspection, not an executed application or database test. Source line numbers below refer to that baseline; symbols identify the relevant behavior. | فُحص المصدر والاختبارات المدمجة عند خط الأساس المطابق فحصاً ثابتاً؛ لم تُشغّل اختبارات تطبيق أو قاعدة بيانات. تشير الأسطر والرموز إلى ذلك المصدر.

| Evidence | Source and finding |
| --- | --- |
| Branch identity/lifecycle | [Branch](../../domains/workspace/branches/domain/branch.ts), lines 1–47: Active/Inactive, stable ID/code, editable label/order, revision/timestamps. |
| General Branch reads | [List/Get use cases](../../domains/workspace/branches/application/branch.use-cases.ts), lines 6–25: List requires Owner or Branch view/manage; filters SelectedBranches. Get safely uses NotFound for unauthorized/out-of-scope IDs. |
| Existing port/UoW | [Branch ports](../../domains/workspace/branches/ports/branch-unit-of-work.port.ts): list(workspaceId) returns an unpaged collection; execute supplies branches and audit. |
| Tenant/order/transaction | [PostgreSQL Branch repository and UoW](../../domains/workspace/branches/infrastructure/persistence/postgresql-branch-unit-of-work.ts), list at line 18: Workspace predicate and sortOrder/displayName/branchId ascending; execute wraps existing transaction. |
| HTTP/runtime | [Branch handlers](../../domains/workspace/branches/infrastructure/http/branch-route-handlers.ts), [runtime](../../domains/workspace/branches/infrastructure/branch-server-runtime.ts), [Next delegate](../../app/api/branches/route.ts): Success/value envelope, safe 400/401/403/404/409/503 mappings, trusted context, close in finally. |
| Branch tests | [Application](../../domains/workspace/branches/application/branch.use-cases.test.ts), [HTTP](../../domains/workspace/branches/infrastructure/http/branch-route-handlers.test.ts), [PostgreSQL](../../domains/workspace/branches/infrastructure/persistence/postgresql-branch.integration.test.ts): stable identity, scope, inactive history, uniqueness, errors. Full three-key ordering is not explicitly asserted. |
| Effective authority | [Permission registry](../../domains/identity/domain/permission.ts): independently assignable operational permissions, no manage-implies-Branch-view rule; ownerEffectivePermissionCodes expands the registry. [Session validation](../../domains/identity/application/session-validation.ts), trustedContext: effective permissions and Branch scope come from membership. [Resolver](../../domains/identity/infrastructure/identity-server-runtime.ts) rejects absent/restricted contexts. |
| A1 | [Policy](../../domains/identity/application/operational-management-authorization-policy.ts), [use case](../../domains/identity/application/get-operational-management-capabilities.use-case.ts), [tests](../../domains/identity/application/get-operational-management-capabilities.use-case.test.ts): independent navigation capabilities, Owner effective permissions, no resource IDs. |
| A2 | [Application](../../domains/catalog/query/application/catalog-query.use-cases.ts), operationalPurposePermissions and SearchOperationalProductsUseCase: Branch purposes require branchId, exact authority and trusted scope. [PostgreSQL branchExists](../../domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts), line 84: same Workspace AND Active. [Domain purpose union](../../domains/catalog/query/domain/catalog-query.ts) remains unchanged. |
| A2 HTTP/tests | [Handlers](../../domains/catalog/query/infrastructure/http/catalog-query-route-handlers.ts), [Application tests](../../domains/catalog/query/application/catalog-query.use-cases.test.ts), [HTTP tests](../../domains/catalog/query/infrastructure/http/catalog-query-route-handlers.test.ts): strict query, InvalidQuery/BranchNotFound, private no-store, each permission, branchId requirement and scope. A6 reuses Branch error vocabulary instead of copying A2 errors. |
| Listing/Pricing | [Resource policy](../../domains/catalog/branch-products/application/operational-management-authorization-policy.ts), [use cases](../../domains/catalog/branch-products/application/branch-product.use-cases.ts): Listing accepts either edit code; Branch management pricing independently projects Retail/Wholesale versus ReferenceCost; inactive Branch reads retain state with no write actions. Writes reject inactive Branches. |
| Resource tests/cache | [Listing tests](../../domains/catalog/branch-products/application/branch-product.use-cases.test.ts), [Pricing tests](../../domains/catalog/branch-products/application/pricing-management.use-cases.test.ts), [handlers](../../domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.ts): independent disclosure, inactive actions, private management responses. |
| Inventory operations | [Use cases](../../domains/inventory/application/inventory.use-cases.ts), SingleBalanceMutation, validateActiveScope, ReservationMutation, TransferInventoryUseCase, read use cases: permissions and lifecycle rules detailed below; tenant/scope checks, two-Branch atomic Transfer. |
| Reservations and tests | [Policy](../../domains/inventory/application/operational-management-authorization-policy.ts), [query status contract](../../domains/inventory/domain/reservation-management-query.ts), [tests](../../domains/inventory/application/inventory.use-cases.test.ts): reserve authority, Product-scoped actionable list, detail non-disclosure, rollback and replay. |
| Cache convention | [Inventory handlers](../../domains/inventory/infrastructure/http/inventory-route-handlers.ts) and A2/A4 handlers explicitly use private, no-store for management reads/errors. General Branch handlers currently do not set that header; A6 adds it only to its new handler path. |

الأدلة تثبت استقلال صلاحية اكتشاف الفرع العامة عن الصلاحيات التشغيلية، وكفاية المستودع الحالي وعزله وترتيبه. تبقى قواعد الموارد والتفويض والذرية داخل مجالاتها، وتختلف سياسة تخزين قراءات الإدارة الحديثة عن معالج الفروع العام الحالي.

**Concrete reproduction by source trace:** a valid Staff context with only `inventory.receive` and SelectedBranches containing an existing Active Branch passes permission assignment and produces A1 `inventory.canReceive=true`, `branches.canView=false`, `branches.canManage=false`. General List returns Forbidden before repository access; A2 Inventory without branchId returns InvalidQuery. Knowing a Branch ID would permit later operation-specific validation, but the browser cannot discover it. The root cause is the **Branch Selector Authorization Composition Gap**, not a missing mutation permission. | **إعادة إظهار ثابتة من المصدر:** موظف يملك الاستلام فقط ونطاق فرع نشط يمر بتعيين الصلاحية وتعرض A1 قدرته، لكن القائمة العامة تمنعه وتعيد A2 خطأً عند غياب معرف الفرع. السبب هو **فجوة تركيب تفويض محدد الفروع**، وليس نقص صلاحية الطفرة.

Reviewed documentation: [Current Roadmap](Current-Roadmap.md), [Sprint continuation](Sprint-03-Continuation.md), [A contract](Task-3.22-A-Operational-Management-Contract.md), [Presentation contract](Task-3.22-Presentation-Implementation-Contract.md), [Presentation report](../05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md), and [Gap analysis](../05-Development/Reports/QSC-Task-3.22-Branch-Selector-Gap-Analysis.md). | شملت المراجعة وثائق الخارطة والعقود وتقارير الواجهة والفجوة المرتبطة.

## Ownership and purpose vocabulary | الملكية ومفردات الغرض

Workspace Branch Application owns this bounded Branch resource discovery read. Identity owns effective capabilities; Catalog Query owns Product discovery; Catalog Branch Product owns Listing/Pricing; Inventory owns balances, Reservations and Transfer. | يملك تطبيق فروع مساحة العمل قراءة اكتشاف الفروع المحدودة، وتبقى القدرات للهوية واكتشاف المنتج لاستعلام الكتالوج والإدراج والتسعير لمنتج الفرع والمخزون والحجوزات والتحويل للمخزون.

Exact union: `"Listing" | "Inventory" | "Transfer" | "BranchPricing" | "BranchReferenceCost"`.

| Purpose | ANY qualifying existing effective permission |
| --- | --- |
| Listing | `catalog.product.edit` OR `catalog.products.edit` |
| Inventory | `inventory.availability.view` OR `inventory.quantity.view` OR `inventory.receive` OR `inventory.issue` OR `inventory.reserve` OR `inventory.damage` OR `inventory.adjust` |
| Transfer | `inventory.transfer` |
| BranchPricing | `pricing.branchOverride.manage` |
| BranchReferenceCost | `referenceCost.branchOverride.manage` |

The matrix is exhaustive. Transfer is independent: putting transfer permission in Inventory would accept an unnecessarily broad semantic purpose for a transfer-only actor. A6 Inventory deliberately excludes inventory.transfer; A2 Inventory already includes it and stays unchanged. Source/destination rules do not justify SourceTransfer/DestinationTransfer. Reservations do not justify a separate purpose. WorkspacePricing and WorkspaceReferenceCost are Branch-independent and invalid A6 purposes. | المصفوفة حصرية ويكفي أي تصريح في الصف. يفصل التحويل لتحقيق أقل صلاحية ودعم من يملك التحويل وحده؛ تستبعده A6 من غرض المخزون بينما تقبله A2 فيه دون تغيير. لا يلزم غرضان للمصدر والوجهة ولا غرض للحجوزات. أغراض تسعير وتكلفة مساحة العمل مستقلة عن الفرع ولا تقبلها A6.

Branch view/manage alone authorizes no A6 purpose and is never a prerequisite. Catalog browse, pricing.view and referenceCost.view are neither implied nor added as prerequisites. Owner succeeds through Identity's real full-session effective permission expansion; A6 checks permissions without a new role bypass. An artificial Owner context with an empty effective permission set does not bypass the matrix. | لا تكفي صلاحية الفروع العامة لأي غرض A6 ولا تشترط معه، ولا تضاف صلاحيات العرض العامة. ينجح المالك بصلاحياته الفعلية الموسعة في الهوية دون تجاوز جديد بالدور؛ لا يمر سياق مالك مصطنع بصلاحيات فارغة.

**Purpose is untrusted input, never authority.** Application validates the exact value and its permission before querying. Only TrustedActorContext supplies Workspace and scope. A selector result grants no general Branch, Product, Inventory or price read, and no mutation. | **الغرض مدخل غير موثوق وليس سلطة.** يتحقق التطبيق من الغرض والصلاحية قبل الاستعلام؛ يأتي المستأجر والنطاق من السياق الموثوق وحده. لا تمنح النتيجة قراءة عامة أو طفرة.

## Minimal DTO and collection behavior | الحمولة الدنيا وسلوك القائمة

`{ branchId: string; code: string; displayName: string; status: "Active" | "Inactive" }` — exactly four required fields per item. | أربعة حقول إلزامية فقط لكل عنصر.

| Field | Source/UI justification / مبرر المصدر والواجهة |
| --- | --- |
| branchId | Existing canonical resource key for selected Branch in A2/resource endpoints / معرف المورد الحالي للاختيار والطلبات التالية |
| code | Normalized stable code, unique per Workspace; disambiguates duplicate display names / كود ثابت فريد داخل مساحة العمل يميز الأسماء المتكررة |
| displayName | Existing editable human label; required for a usable selector / الاسم المقروء الحالي اللازم للمحدد |
| status | Existing semantic lifecycle; explains unavailable options without claiming eligibility / حالة دلالية تفسر الخيارات غير النشطة دون ادعاء الأهلية |

Reject workspaceId (server derives tenant), actorId (no selection need), branchScope and permissions/role/authorizationVersion (raw authority), revision (no Branch write concurrency here), sortOrder (server ordering only), createdAt/updatedAt (management history irrelevant to selection). Application constructs explicit fields; never spread BranchState. | تستبعد هوية المستأجر والممثل والنطاق والصلاحيات والدور وإصدار التفويض والمراجعة والترتيب والأوقات؛ لا يحتاجها الاكتشاف. يبني التطبيق الحقول صراحة ولا ينسخ حالة المجال كاملة.

**Ordering:** A6 Application MUST preserve the order returned by `BranchRepository.list(...)` while applying trusted Branch-scope filtering and projection. It MUST NOT perform a locale or client-style re-sort. HTTP MUST preserve the Application result order. The current port declares `list(workspaceId: string): Promise<readonly Branch[]>` without specifying a three-key comparator; A6 does not introduce an independent Application/API comparator guarantee. Current PostgreSQL persistence behavior is `sortOrder ASC, displayName ASC, branchId ASC`, with database collation, and is verified at the persistence integration boundary. Do not expose sortOrder. `NO REPOSITORY CONTRACT CHANGE` remains valid; neither port nor persistence implementation is modified during planning. | **الترتيب:** يجب أن يحفظ تطبيق A6 ترتيب نتيجة `BranchRepository.list(...)` عند ترشيح نطاق الفروع الموثوق والإسقاط، ويحظر إعادة الفرز وفق اللغة أو أسلوب العميل. يحفظ HTTP ترتيب نتيجة التطبيق. لا تحدد واجهة المستودع الحالية مقارناً ثلاثياً، ولا تضيف A6 ضمان ترتيب مستقل في التطبيق أو API. السلوك الحالي لاستمرارية PostgreSQL هو `sortOrder ASC, displayName ASC, branchId ASC` وفق مقارنة قاعدة البيانات، ويُثبت باختبارات تكامل الاستمرارية. لا يكشف sortOrder، وتبقى بوابة `NO REPOSITORY CONTRACT CHANGE` دون تعديل الواجهة أو التنفيذ أثناء التخطيط.

**Pagination: none. Search: no backend search, no q.** Existing list is unpaged; a complete authorized option set suits Branch selection. Source provides neither a hard Branch-count cap nor production cardinality/latency measurements, so bounded operational scale is a planning assumption, not a measured guarantee. No evidence justifies adding pagination/search now. Reassess separately if observed Branch counts/response costs materially grow. Future Presentation can locally filter already-authorized labels/codes. | **لا صفحات ولا بحث خادم ولا q.** القائمة الحالية كاملة ومناسبة للاختيار. لا يثبت المصدر سقفاً عددياً أو قياس أداء إنتاجياً؛ الحجم المحدود افتراض تخطيطي لا ضمان مقاس. يعاد التقييم عند نمو ملموس ويمكن للواجهة ترشيح الأسماء والأكواد المخولة محلياً.

## Lifecycle decision | قرار دورة الحياة

**Option A selected: return Active + Inactive for every purpose**, including Transfer; no lifecycle filter or client status query. | **اختير A: إعادة Active وInactive لكل الأغراض** بما فيها التحويل؛ لا ترشيح دورة حياة ولا معامل حالة من العميل.

| Purpose | Returned statuses | Downstream truth |
| --- | --- | --- |
| Listing | Active + Inactive | State readable when inactive; allowedActions empty; writes reject inactive. |
| Inventory | Active + Inactive | Balance/movement/Reservation reads check existence/scope without rejecting inactive; writes require Active. |
| Transfer | Active + Inactive | Discovery explains both operands; only Active operands can execute a new Transfer. |
| BranchPricing | Active + Inactive | Authorized management fields remain readable; inactive suppresses write actions. |
| BranchReferenceCost | Active + Inactive | Same lifecycle rule with independently authorized Reference Cost fields. |

Option B (only Active for mutation purposes) hides existing operational state and confuses absence with inactivity. Option C (Transfer-only Active filter in the interrupted draft) was evaluated and rejected: source proves mutation activity requirements but no asymmetric discovery rule or material security benefit from omitting an otherwise authorized Branch identity. A6 should not copy Inventory eligibility. Transfer remains distinct because of permission semantics, not lifecycle filtering. | رُفض B لأنه يخفي الحالة التشغيلية الموجودة، ورُفض C الذي اقترحته المسودة للتحويل وحده: يثبت المصدر شرط نشاط الطفرة دون قاعدة اكتشاف مختلفة أو فائدة أمنية مادية لإخفاء هوية فرع مخول. لا تنسخ A6 أهلية المخزون، ويبقى فصل التحويل بسبب الصلاحية.

A2 branchExists requires Active. An inactive option may be labelled unavailable for fresh A2 Product discovery or new mutation; it is not a promise of a working Product flow. Known Product/Reservation resources can still be read where their existing endpoint permits. Do not add an inactive Product selector, bypass A2, or synthesize allowedActions. Lifecycle can change after any GET, so the mutation remains decisive. | تشترط A2 النشاط؛ يميز الخيار غير النشط كغير متاح لاكتشاف منتج جديد أو طفرة جديدة ولا يعد بتدفق منتج ناجح. يمكن قراءة موارد معروفة حيث يسمح عقدها، ولا يضاف محدد منتج غير نشط أو تجاوز A2 أو أفعال مصطنعة. تعيد الطفرة التحقق من الحالة المتغيرة.

## Inventory, Transfer and Reservations | المخزون والتحويل والحجوزات

| Existing operation | Exact authority | Branch/lifecycle rule |
| --- | --- | --- |
| Availability read | inventory.availability.view OR inventory.quantity.view | Same Workspace, trusted scope, existing Branch/Product; inactive readable. |
| Quantity and movement reads | inventory.quantity.view | Same Workspace/scope/existence; inactive readable. |
| Receive | inventory.receive | Existing Active Branch, same-Workspace non-Archived Product. |
| Issue | inventory.issue | Same; stock invariant remains Inventory-owned. |
| Correct Increase/Decrease | inventory.adjust | Same; existing quantity/direction/reason rules. |
| Damage and Restore | inventory.damage | Same; no inventory.restore permission exists. |
| Reserve | inventory.reserve | Same; persisted Reservation belongs to Workspace/Branch/Product. |
| Reservation list/detail | inventory.reserve | Trusted scope and existing Branch; list also validates Product; no Active-Branch requirement. |
| Release and Fulfill | inventory.reserve | Exact Reservation Workspace and branchId match, active Branch, non-Archived Product, actionable Reservation and valid remaining quantity. |
| Transfer | inventory.transfer | Both same-Workspace, in-scope, distinct, existing Active Branches; Product, quantity and stock validated in Inventory. |

لا توجد صلاحيات مستقلة للاستعادة أو التحرير أو التنفيذ؛ تستخدم الاستعادة damage ويستخدم الحجز والتحرير والتنفيذ reserve. لا يمنح غرض Inventory صلاحية عرض الكمية أو الحجز لمن يفتقد تصريح المورد نفسه.

One Transfer selector set supplies both sourceBranchId and destinationBranchId. UI may disable inactive options and matching source/destination for usability; the mutation still enforces inequality, both scopes, tenant, activity, Product, quantity and stock. Existing deterministic balance lock order, two balance writes, correlated movements, transaction rollback and idempotency stay unchanged. On replay, the existing operation path returns its stored outcome projected under current permissions; A6 does not redefine replay as a new mutation. Transfer-only staff need no generic Inventory view permission. | تستخدم مجموعة التحويل نفسها للمصدر والوجهة. يمكن تعطيل غير النشط والتطابق في الواجهة للاستخدام فقط؛ تبقى كل شروط العملية والقفل والكتابتين والحركات والتراجع وإعادة الطلب في المخزون دون تغيير، ولا يحتاج صاحب التحويل وحده صلاحية قراءة مخزون عامة.

Reservations use Inventory for Branch discovery, then existing A2 Inventory Product discovery and A3 resource endpoints. The actionable list is scoped by Workspace + Branch + Product and statuses Active/PartiallyFulfilled; detail also returns terminal states with no actions. **Current reservationView intersects permission with Reservation status, not Branch activity**: an inactive Branch's actionable Reservation may still expose Release/Fulfill, while mutation rejects BranchInactive. Preserve this behavior and test the distinction; selector status and allowedActions are never a mutation guarantee. | تستخدم الحجوزات غرض المخزون ثم A2 وA3. تقيد القائمة بمساحة العمل والفرع والمنتج وحالتي Active/PartiallyFulfilled وتعرض التفاصيل الحالات النهائية دون أفعال. **يربط المصدر الحالي الأفعال بصلاحية الحجز وحالته لا بنشاط الفرع**؛ قد تظهر أفعال لفرع غير نشط بينما ترفض الطفرة BranchInactive. يحفظ السلوك ويختبر ولا تعد الحالة أو الأفعال ضماناً.

## Listing, Pricing and general Branch interaction | الإدراج والتسعير وعلاقة القائمة العامة

Listing is distinct because it uses either existing Catalog edit permission and does not grant ordinary Catalog browse. BranchPricing requires pricing.branchOverride.manage without pricing.view; BranchReferenceCost requires referenceCost.branchOverride.manage without referenceCost.view or pricing.view. A4 independently omits unauthorized price types; A6 discloses no prices or costs. | يفصل الإدراج لصلاحية تعديل الكتالوج دون منح التصفح. يعتمد غرضا التسعير والتكلفة على صلاحية تجاوز الفرع الخاصة بكل منهما دون اشتراط العرض، وتحذف A4 الأنواع غير المخولة ولا تكشف A6 أسعاراً أو تكلفة.

**Choose one canonical operational source: always A6**, even when general Branch view is available. No GET /api/branches fallback. Branch management screens keep existing general List/Get semantics and management metadata. | **المصدر التشغيلي الموحد هو A6 دائماً** حتى مع صلاحية عرض الفروع، دون fallback للقائمة العامة. تبقى إدارة الفروع على List/Get الحاليين.

## HTTP contract, errors and cache | عقد HTTP والأخطاء والتخزين

- Method/path: **GET /api/branches/operational?purpose=...**; static Next.js route under Workspace Branch ownership, using existing nodejs delegate convention. Prefer operational over generic selector; no /api/operations resource route.
- Exactly one query parameter: purpose with one exact, case-sensitive union value. Missing/empty/whitespace/duplicate/unknown/case-changed values and **any extra key** are InvalidInput. In particular reject workspaceId, actorId, branchScope, permission codes, role, raw flags, branchId, status, q, cursor and limit. No request-body contract.
- Resolve full trusted context first, then parse bounded query, then Application validation/permission, then UoW read/scope filter/projection. Unauthorized purposes must not call list.
- Successful HTTP 200: `{ "type": "Success", "value": [{ "branchId": "branch-a", "code": "main", "displayName": "Main Store", "status": "Active" }] }`. value is the direct array, not items or a paginated wrapper.
- Application returns existing BranchResult with branchSuccess/branchFailure; HTTP retains the established Branch envelope.
- الطريقة GET والمسار الثابت operational ضمن ملكية الفروع. يقبل غرضاً دقيقاً واحداً فقط ويرفض كل المفاتيح الزائدة، ويحل السياق أولاً ثم يتحقق ويفوض قبل الاستعلام. يستخدم نجاح 200 غلاف Success/value والمصفوفة المباشرة ونتيجة BranchResult الحالية.

| Condition | Exact response |
| --- | --- |
| Unauthenticated, expired/revoked/stale session or no full context | 401 `{ "type": "AuthenticationRequired" }` |
| Restricted session | 403 `{ "type": "ForbiddenForRestrictedSession" }` |
| Missing/invalid query after full context resolution | 400 `{ "type": "InvalidInput" }` |
| Valid purpose without a qualifying effective permission | 403 `{ "type": "Forbidden" }` |
| Authorized purpose, zero Branches in trusted Workspace/scope | 200 `{ "type": "Success", "value": [] }` |
| Unexpected subsystem/persistence/internal-state failure | 503 `{ "type": "BranchServiceUnavailable" }` |

Authentication/restricted failures take precedence over malformed query; unexpected opening/resolution infrastructure failures use sanitized 503. Never serialize exception messages, SQL, raw context or existence hints. No per-resource 404 is needed because A6 accepts no Branch ID. An all-inactive authorized collection is **non-empty**, not Forbidden or an empty eligible-set claim. | تسبق أخطاء الجلسة الاستعلام المشوه، وتعاد أعطال البنية غير المتوقعة بأمان 503 دون رسائل داخلية أو سياق أو تلميحات وجود. لا يلزم 404 لعدم قبول معرف مورد، وتبقى المجموعة غير النشطة غير فارغة إن وجدت فروع مخولة.

**Cache-Control: private, no-store on every success and error**, including opening/context failures. Existing general Branch responses stay unchanged; adopt the opt-in private-response pattern of A3/A4 or an A6-local wrapper. No shared/public cache or validators/304 contract. Future typed client uses same-origin credentials and cache: no-store. | تستخدم جميع النتائج والأخطاء private, no-store بما فيها فشل الفتح والسياق، دون تغيير استجابات القائمة العامة أو إضافة تخزين مشترك أو 304. يستخدم العميل المستقبلي بيانات اعتماد المصدر نفسه وعدم التخزين.

## Multi-tenant proof and threats | إثبات العزل والتهديدات

The Application derives trustedWorkspaceId only from context, calls branches.list(trustedWorkspaceId), filters SelectedBranches server-side (AllBranches still means only this Workspace), preserves the repository result order and constructs four fields. A foreign tenant row is a repository contract breach and must never serialize: the Application should fail closed with a sanitized subsystem error if a returned Branch has a different workspaceId. No raw scope array, permission or general Branch view crosses the adapter. | يشتق التطبيق المستأجر من السياق، ويمرره إلى list ثم يرشح النطاق مع حفظ ترتيب نتيجة المستودع ويبني الحقول الأربعة. AllBranches يعني مساحة العمل الحالية فقط. أي صف بمستأجر مختلف خرق لعقد المستودع يجب إيقافه بخطأ آمن قبل التسلسل، ولا يخرج نطاق خام أو عرض عام.

| Threat | Required behavior / السلوك المطلوب |
| --- | --- |
| Purpose tampering | Revalidate union and permission; valid unauthorized purpose is 403 / إعادة التحقق والمنع |
| Manual request replay | Resolve current session/permissions/scope on each GET / حل الجلسة والصلاحيات والنطاق لكل طلب |
| Guessed Workspace ID | Extra query rejected; tenant lookup accepts only context / رفض المعرف المدخل واستخدام السياق فقط |
| Browser-modified state | Selected IDs and local flags confer no downstream authority / لا تمنح الحالة المحلية سلطة |
| Stale UI | Fresh resource reads and existing mutation validation reject stale scope/lifecycle; no status guarantee / إعادة التحقق وعدم ضمان الحالة |
| Cross-session reuse | No shared/persistent response cache; future client clears options and pending results on session/context change and refetches; backend resolves the new session / مسح حالة العميل عند تغير الجلسة وإعادة الطلب والتفويض |

No-store is cache policy, not erasure of data already delivered to an authorized browser. Client memory handling is a future Presentation requirement, not implemented security in A6; server enforcement never depends on it. | عدم التخزين سياسة ذاكرة مؤقتة وليس محواً لبيانات وصلت إلى متصفح مخول. إدارة ذاكرة العميل مطلب واجهة مستقبلي ولا يعتمد عليها تفويض الخادم.

## Clean Architecture, UoW and gates | المعمارية النظيفة ووحدة العمل والبوابات

Application owns the purpose union, exact permission mapping, validation and projection. It may use a type-only PermissionCode import as existing A1/A2 policies do; do not import other Domains' use cases/policies at runtime. HTTP only resolves context/parses/maps errors/serializes; runtime wires the use case and closes connections. Reuse BranchUnitOfWork.execute and BranchRepository.list in one existing read transaction. No Branch writes, audit append, explicit row locks or cross-domain resource query are required for this read; existing Identity session resolution behavior is preserved. | يملك التطبيق الغرض والسياسة والإسقاط، ويمكن استيراد نوع الصلاحية فقط. يبقى HTTP رقيقاً وتوصل بيئة التشغيل حالة الاستخدام وتغلق الاتصال. تعاد استخدام وحدة العمل الحالية في قراءة واحدة دون كتابة فرع أو تدقيق جديد أو قفل صف أو استعلام موارد مجال آخر، مع حفظ سلوك جلسة الهوية الحالي.

| Gate | Decision and reason / القرار والسبب |
| --- | --- |
| Domain | **NO DOMAIN CHANGE** — identity/status already exist / الهوية والحالة موجودتان |
| Repository contract | **NO REPOSITORY CONTRACT CHANGE** — list(workspaceId) sufficient / تكفي القائمة الحالية |
| Persistence | Reuse current repository/query unchanged; no repository-to-repository calls / إعادة استخدام دون استدعاء مستودع لآخر |
| Database/index | **NO DATABASE CHANGE** — no proven need / لا حاجة مثبتة |
| Migration | None; do not create **0016** / لا ينشأ 0016 |
| Dependency | **NO NEW DEPENDENCY** / لا اعتماد جديد |
| Permission | **NO NEW PERMISSION** and no registry/assignability edits / لا صلاحية أو تعديل سجل |
| ADR | **ADR NOT REQUIRED** — bounded Application composition inside existing ownership / تركيب تطبيق محدود داخل الملكية الحالية |

No inspected source contradicts these gates. If implementation discovers a need to cross them, stop and classify the contract Blocked for review instead of silently expanding scope. | لا يناقض المصدر البوابات؛ إذا كشف التنفيذ حاجة لتجاوزها يتوقف ويصنف العقد Blocked للمراجعة دون توسيع صامت.

## A1/A2 relationship and exact future scope | العلاقة مع A1/A2 ونطاق التنفيذ المستقبلي

Flow: **A1 capability hint → A6 Branch discovery → Branch selection → A2 Product discovery → resource GET/current state + allowedActions where provided → mutation authorization**. This is a responsibility sequence, not a promise that every mutation actor can read generic balances. Workspace pricing/cost skips A6. Transfer uses A6 Transfer followed by unchanged A2 Inventory with source branchId. | التسلسل تلميح A1 ثم اكتشاف A6 واختيار الفرع ثم A2 وقراءة المورد وأفعاله حيث يقدمها ثم تفويض الطفرة. لا يضمن التسلسل قراءة أرصدة عامة لكل ممثل، وتتجاوز عمليات مساحة العمل A6، ويستخدم التحويل غرض Inventory في A2 ومعرف المصدر.

Future file scope (proposed paths; none created as code during planning): | ملفات التنفيذ المستقبلية المقترحة؛ لم ينشأ منها كود أثناء التخطيط:

| Change | Path/responsibility |
| --- | --- |
| New | domains/workspace/branches/application/operational-branch-selector.ts — purpose, typed matrix, DTO and Application policy |
| New | domains/workspace/branches/application/list-operational-branches.use-case.ts — ListOperationalBranchesUseCase over BranchUnitOfWork |
| New | domains/workspace/branches/application/list-operational-branches.use-case.test.ts — permission, tenant/scope, lifecycle and projection cases |
| Modify | domains/workspace/branches/infrastructure/branch-server-runtime.ts — wire operationalList using current UoW |
| Modify | domains/workspace/branches/infrastructure/http/branch-route-handlers.ts — isolated operationalList handler and opt-in private errors/success |
| Modify | domains/workspace/branches/infrastructure/http/branch-route-handlers.test.ts — new handler coverage plus general-list regression |
| New | app/api/branches/operational/route.ts — thin nodejs GET delegate only |
| Modify tests only | domains/workspace/branches/infrastructure/persistence/postgresql-branch.integration.test.ts — prove tenant isolation and the current PostgreSQL three-key ordering behavior |
| Documentation | A6 implementation report and narrowly reconciled roadmap after implementation verification |

No new result vocabulary, repository, read UoW, schema or Domain entity is needed. Do not change existing List/Get semantics or require rewriting A1–A5 tests for new authority behavior. | لا يلزم قاموس نتائج أو مستودع أو وحدة عمل أو مخطط أو كيان جديد، ولا تتغير دلالات List/Get أو تفويض A1–A5.

## Test contract — plan only | عقد الاختبارات — تخطيط فقط

- Table-drive every purpose and each of the 12 exact qualifying permission literals independently, without Branch view/manage; test no permissions, unrelated permissions, Branch view alone, Branch manage alone, pricing.view/referenceCost.view and Workspace management-only negatives. Check Forbidden before UoW access.
- Inventory-only Staff sees four fields for only in-scope Branches; Listing-only Staff still cannot use general GET /api/branches. Pricing authority cannot access BranchReferenceCost and the reverse. Transfer-only passes Transfer, fails A6 Inventory, and can use unchanged A2 Inventory.
- Owner with real effective permissions passes all purposes; role-only empty permissions do not bypass A6.
- SelectedBranches: multiple allowed IDs, excluded IDs, nonexistent IDs, foreign Workspace IDs in scope, and an empty scope. AllBranches: only trusted Workspace. Assert repository argument. A foreign tenant row returned by a faulty fake fails closed without serialization.
- Authorized empty list returns Success []; all-inactive and mixed collections return their actual Branches for every purpose. Verify lifecycle changes on a fresh request and no eligibility claim.
- Application/unit tests: supply a deliberately ordered repository result, including an order different from the PostgreSQL comparator, and verify relative order preservation after trusted scope filtering and projection. Do not make the Application own the three-key comparator. Verify the exact four DTO keys and exclusion of all management/security fields, even when source Branch state contains them.
- HTTP order tests: return a deliberately ordered Application result and assert that serialization preserves that order; do not define an independent database sort contract at HTTP.
- HTTP: exact success/empty envelopes; all five purposes; missing, empty, whitespace, case-invalid, unknown, duplicate purpose; every extra key; unauthenticated/restricted versus malformed-query precedence; Forbidden; sanitized open/resolve/use-case failures; close cleanup; private, no-store on every result.
- Security regressions: purpose tampering/replay under changed context, changed tenant/session scope, no foreign IDs or raw authority, general GET /api/branches unchanged, no added general Catalog/Inventory/Pricing/Reference Cost disclosure.
- Guarded PostgreSQL integration: explicitly verify the current persistence behavior `sortOrder ASC, displayName ASC, branchId ASC`, including distinct sortOrder values, equal sortOrder with differing labels, and ties in both sortOrder and label broken by branchId. Include same code/labels across Workspaces and mixed lifecycle; verify scoped output. Use current database safety tooling only.
- Resource regressions preserve inactive Listing/Pricing reads with no write actions; inactive Reservation read/action-versus-mutation distinction; both Transfer scopes, source inequality, inactive rejection, stock/quantity/Product validation, rollback and idempotent replay.

تغطي الخطة كل الأغراض والصلاحيات الاثنتي عشرة منفردة دون عرض الفروع، وحالات المنع والمالك والنطاقين والعزل والفراغ والحالة والحمولة وHTTP والأخطاء والتخزين. تثبت اختبارات التطبيق حفظ الترتيب النسبي لنتيجة المستودع بعد ترشيح النطاق، حتى إن خالف ترتيب fixture مقارن PostgreSQL؛ وتثبت اختبارات HTTP حفظ ترتيب نتيجة التطبيق. تثبت اختبارات تكامل PostgreSQL وحدها سلوك الفرز الثلاثي الحالي مع حالات اختلاف المفاتيح وتعادلها، دون جعله ضماناً مستقلاً للتطبيق أو API. تثبت الانحدارات استقلال العرض العام والتسعير والتكلفة والتحويل، وتختبر صلاحيات الحجز مقابل نشاط الفرع وذرية التحويل. لا تكتب أو تشغل اختبارات التنفيذ في جلسة التخطيط.

Future implementation verification: focused `npm run test:branch`, `npm run test:identity`, `npm run test:catalog-query`, `npm run test:pricing`, `npm run test:inventory`; `npx tsc --noEmit`, `npm run lint`, `npm run build`, and guarded `npm run test:integration`. These commands are implementation gates, **not run during this planning task**. Touch/mouse/keyboard and mobile/tablet/desktop functional QA belong to future Presentation, which stays blocked. | الأوامر المذكورة بوابات التنفيذ اللاحق ولم تشغل في التخطيط. يخص تحقق اللمس والفأرة ولوحة المفاتيح وكل أحجام الشاشة الواجهة المستقبلية المحجوبة.

## WILL IMPLEMENT / WILL NOT IMPLEMENT | سينفذ / لن ينفذ

**WILL IMPLEMENT later:** only the listed Workspace Branch Application read/policy/projection, thin HTTP/runtime route, focused tests and bilingual delivery evidence. | **سينفذ لاحقاً:** قراءة الفروع المحدودة وسياساتها وإسقاطها والمسار والأسلاك والاختبارات والأدلة الثنائية فقط.

**WILL NOT IMPLEMENT:** production code in this planning task; Presentation/P1–P8 or typed browser client now; Operations Domain/BFF; React authorization; raw scope/permission exposure; general Branch authorization changes; new permission; A1–A5 redesign; cross-domain aggregation; repository-to-repository calls; repository/schema/index/migration/dependency/package/lockfile changes. No staging, commits, pushes, merges, rebases, resets, restores, stashes, branch switches or file deletions. | **لن ينفذ:** كود إنتاجي أو واجهة أو عميل متصفح الآن، أو مجال/BFF أو تفويض React أو سلطة خام أو توسيع قائمة الفروع أو إعادة تصميم A1–A5 أو تغيير مستودع أو قاعدة أو اعتماد. لا ترحيل ملفات إلى الفهرس أو التزام أو دفع أو دمج أو تغيير فرع أو حذف.

## Final decision | القرار النهائي

**`ApprovedForImplementation`** for A6 only: source proves the existing Workspace Branch list, scope, effective permissions and adapters can close the discovery gap without crossing any no-change gate. Submit this contract and the [Planning Report](../05-Development/Reports/QSC-Task-3.22-A6-Planning-Report.md) for review; stop after planning. Presentation remains **`Blocked`** until A6 is implemented, independently reviewed, merged, **and the Presentation gate is reconciled again**. A6 approval does not approve P1. | **`ApprovedForImplementation` لـA6 فقط:** يثبت المصدر كفاية القائمة والنطاق والصلاحيات والمحولات الحالية لمعالجة الفجوة دون تجاوز البوابات. يقدم العقد والتقرير للمراجعة ثم يتوقف التخطيط. تبقى الواجهة **`Blocked`** حتى تنفيذ A6 ومراجعتها المستقلة ودمجها وإعادة مصالحة بوابة الواجهة؛ لا يعتمد P1.
