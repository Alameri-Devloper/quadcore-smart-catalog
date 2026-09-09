# Task 3.22 — Operational Management Presentation Implementation Contract | عقد تنفيذ واجهة إدارة العمليات للمهمة 3.22

> **A6 reconciliation — 2026-09-09:** Planning Correction PR #33 is merged at `54b27673824b833f8597594c1e0107c5f017da69`; A1–A5 remain merged. Separate [A6 planning](Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md) is completed with `ApprovedForImplementation`; implementation has NOT started. Its five-purpose operational selector contract supersedes recommendations below to plan A6, while this document's original baseline and Presentation design remain historical planning context. Operational workflows will always use A6; general Branch management keeps its current contract. Presentation remains **`Blocked`** until A6 is implemented, independently reviewed, merged, and this gate reconciled again. A6 approval does not approve P1. | **مصالحة A6:** دُمج #33 عند الخط المذكور وبقيت A1–A5 مدمجة. اكتمل تخطيط A6 بقرار `ApprovedForImplementation` دون بدء التنفيذ، ويستبدل عقدها توصيات التخطيط السابقة هنا مع حفظ سياق خط الأساس والتصميم. تستخدم العمليات A6 دائماً وتبقى إدارة الفروع على عقدها الحالي. تبقى الواجهة **`Blocked`** حتى تنفيذ A6 ومراجعتها المستقلة ودمجها وإعادة مصالحة البوابة؛ لا يعتمد P1.

## 1. Status | الحالة

**Planning decision: `Blocked`.** Task 3.22-A1–A5 server remediation is completed and merged through PRs #28–#32, but independent correction review confirmed a remaining **Branch Selector Authorization Composition Gap**. This document preserves the future Presentation design; it does not approve implementation, and Task 3.22 remains unstarted. | **قرار التخطيط: `Blocked`.** اكتملت معالجة الخادم A1–A5 ودُمجت عبر طلبات السحب #28–#32، لكن مراجعة التصحيح المستقلة أكدت بقاء **فجوة تركيب تفويض محدد الفروع**. تحفظ الوثيقة تصميم الواجهة المستقبلي ولا تعتمد التنفيذ، وتبقى المهمة 3.22 غير مبدوءة.

### Independent correction | التصحيح المستقل

The merged permission registry permits a Staff actor to hold `catalog.product.edit`, any Inventory operation permission, `pricing.branchOverride.manage`, or `referenceCost.branchOverride.manage` without either `workspace.branches.view` or `workspace.branches.manage`. A1 intentionally projects these capabilities independently. `ListBranchesUseCase` authorizes only Owner, Branch view, or Branch manage, while A2 requires a known `branchId` for `Listing`, `Inventory`, `BranchPricing`, and `BranchReferenceCost`. Therefore a valid operational actor can have a relevant capability and trusted Branch scope but no browser-safe way to discover a Branch. Treating `GET /api/branches` `403` as “no accessible Branches” hides a missing composition contract; it is not a legitimate empty result. | يسمح سجل الصلاحيات لموظف بامتلاك تعديل الإدراج أو صلاحية مخزون أو تجاوز تسعير/تكلفة مرجعية دون صلاحية عرض/إدارة الفروع. تعرض A1 هذه القدرات باستقلال، بينما لا تسمح قائمة الفروع إلا للمالك أو صلاحية عرض/إدارة الفروع، وتتطلب أغراض A2 المقيدة بالفرع معرفاً معروفاً مسبقاً. لذلك قد يملك الممثل قدرة تشغيلية ونطاق فرع موثوقاً دون وسيلة آمنة لاكتشاف الفرع. اعتبار `403` قائمة فارغة يخفي عقد تركيب مفقوداً.

## 2. Baseline | خط الأساس

- Planning branch: `feature/task-3.22-presentation-planning`.
- Exact reconciled integration baseline and HEAD: `0f102dd020efacc517f0e27601f4a54ecce2eca0`.
- A1 merged through PR #28, A2 through #29, A3 through #30, A4 through #31, and A5 through #32.
- Source, not historical planning prose, is the implementation authority.

- فرع التخطيط هو `feature/task-3.22-presentation-planning`، وخط الأساس وHEAD المطابقان هما `0f102dd020efacc517f0e27601f4a54ecce2eca0`.
- دُمجت A1 عبر #28 وA2 عبر #29 وA3 عبر #30 وA4 عبر #31 وA5 عبر #32.
- المصدر المدمج هو سلطة التنفيذ، وليس نص التخطيط التاريخي.

## 3. Source reconciliation | مصالحة المصدر

The review covered the current roadmap and Sprint continuation; the Task 3.22-A contract and A1–A5 final reports; Workspace Branch, Catalog Query, Catalog Branch Product, Inventory, and Identity capability Application/HTTP source; Task 3.20 Catalog and Task 3.21 Reference Data Presentation; authenticated shell/account pages; typed API clients, coordinators, shared controls, UX guidance, and Inventory/Catalog architecture documents. The source confirms the existing DDD/Clean Architecture boundaries remain sufficient. | شملت المراجعة خارطة الطريق واستمرار Sprint وعقد 3.22-A وتقارير A1–A5، ومصدر التطبيق وHTTP للفروع واستعلام الكتالوج ومنتج الفرع والمخزون وقدرات الهوية، وواجهتي 3.20 و3.21، والغلاف الموثق والعملاء المكتوبين بالأنواع والمنسقات وعناصر الواجهة والإرشادات المعمارية. يؤكد المصدر كفاية حدود DDD والمعمارية النظيفة الحالية.

## 4. Original blocker reconciliation | مصالحة العوائق الأصلية

| # | Previous gap | Merged resolution, owner, and exact contract | Presentation verdict |
| --- | --- | --- | --- |
| 1 | No browser-safe effective management capabilities | A1; Identity Application; `GetOperationalManagementCapabilitiesUseCase`; `GET /api/operations/capabilities` | Safe semantic navigation/section input; never write authority |
| 2 | Operational actors could not discover Products without ordinary Catalog view | A2; Catalog Query Application; `SearchOperationalProductsUseCase`; `GET /api/catalog/operational-products` | Safe purpose-bound Product selector for all six purposes |
| 3 | Listing editor lacked authoritative state/revision | A2; Catalog Branch Product Application; `GetBranchProductListingUseCase`; `GET /api/branches/{branchId}/products/{productId}/listing` | Safe state, revision, timestamp, and actions |
| 4 | Release/Fulfill lacked Reservation collection/detail | A3; Inventory Application; `ListInventoryReservationsUseCase` and `GetInventoryReservationUseCase`; Reservation GET routes | Safe actionable page and current detail; writes still recheck |
| 5 | Workspace pricing lacked Branch-independent management state | A4; Catalog Branch Product Application; `GetWorkspacePricingManagementUseCase`; `GET /api/products/{productId}/pricing` | Safe Retail/Wholesale/Reference Cost editor input |
| 6 | Override managers lacked an operation-specific read | A4; Catalog Branch Product Application; `GetBranchPricingManagementUseCase`; `GET /api/branches/{branchId}/products/{productId}/pricing/management` | Safe base/override/effective/source/action view |
| 7 | Retail and Wholesale concurrency could be modeled incorrectly | A4 returns one `productRevision` (and `baseProductRevision` in Branch management) | Presentation must treat the token as shared and refetch after either write |
| 8 | Reference Cost revision/visibility could be conflated with pricing | A4 returns independent `referenceCostRevision`, `baseReferenceCostRevision`, and field omission | Safe independent concurrency and non-disclosure |
| 9 | Availability-only Inventory exposed numeric state | A5; Inventory Application; discriminated `InventoryReadView` | Only `InStock | OutOfStock` without quantities/revision/time |
| 10 | Idempotent replay could return previously stored detailed balances | A5; Inventory Application current-context mutation projector | Fresh and replayed success have identical current-visibility filtering |
| 11 | Branch/Product/Workspace scoping and non-disclosure needed proof | Resource endpoints correctly validate trusted scope, but no browser-safe Branch selector composes independently assigned Branch-scoped operational authority with Branch discovery | **Blocked:** safe validation after an ID is supplied does not make the ID discoverable |
| 12 | Resource-specific action availability was missing | A1 semantic global capabilities plus A2 Listing, A3 Reservation, and A4 Pricing `allowedActions` | Render only returned actions; every mutation still reauthorizes |

النتيجة العربية: حلت A1–A5 إحدى عشرة حاجة تصحيحية وتحفظ النطاق وعدم الكشف، لكنها لا توفر اكتشاف فرع لممثل تشغيلي يفتقد صلاحية عرض/إدارة الفروع. التحقق الآمن من معرف معروف لا يعوض غياب المحدد؛ لذلك تبقى الواجهة محجوبة.

## 5. Architecture decision | القرار المعماري

The proposed future `/operations` and Domain-aligned Presentation files remain architecturally valid, but none may be implemented until a bounded Workspace Branch Application selector contract is separately planned, approved, implemented, reviewed, and merged. Route composition remains with Workspace Branch Presentation; Identity Presentation owns capability coordination; Catalog Query owns Product selection; Catalog Branch Product owns Listing/Pricing; Inventory owns Inventory workflows. No new Operations Domain, generic BFF, or client authorization authority is approved. | يبقى تصميم `/operations` المستقبلي والملفات الموزعة حسب المجالات سليماً، لكن لا ينفذ شيء قبل تخطيط واعتماد وتنفيذ ومراجعة ودمج عقد محدد محدود يملكه تطبيق فروع مساحة العمل. تبقى الملكيات الأخرى كما هي، ولا يعتمد مجال Operations أو BFF أو سلطة تفويض في العميل.

## 6. Exact Presentation scope | نطاق الواجهة الدقيق

The approved authenticated scope is: Branch list/detail/create/update/activate/deactivate; Branch/Product Listing state and Set Listed/Unlisted; operational Product discovery; Inventory read plus Receive, Issue, Correct Increase/Decrease, Mark Damaged, Restore Damaged, Reserve, Release, Fulfill, and atomic Transfer; actionable Reservation list/detail; Workspace Retail/Wholesale/Reference Cost base management; and Branch Retail/Wholesale/Reference Cost override management. Movement history may be displayed only through the already-existing quantity-authorized endpoint and is not redesigned. | النطاق الموثق المعتمد هو: عرض/تفاصيل/إنشاء/تحديث/تفعيل/تعطيل الفروع؛ إدارة إدراج المنتج في الفرع؛ اكتشاف المنتج التشغيلي؛ قراءة المخزون وعمليات الاستلام والصرف والتصحيح والتلف والاستعادة والحجز والتحرير والتنفيذ والتحويل الذري؛ قائمة/تفاصيل الحجوزات القابلة للفعل؛ إدارة أسعار مساحة العمل والتكلفة المرجعية؛ وإدارة تجاوزات الفرع. يمكن عرض سجل الحركات عبر المسار الحالي المخول بالكميات فقط دون إعادة تصميمه.

## 7. Information architecture | بنية المعلومات

Create one authenticated **Operations / العمليات** entry in the established `PresentationShell`, visible when A1 indicates at least one relevant capability. `/operations` has three primary mobile-first sections: **Branches**, **Inventory**, and **Pricing**. Listing is a Branch/Product tool inside Branches; Reservations and Transfer are Inventory tools; Reference Cost is a separately authorized field inside Pricing. This avoids an ERP mega-dashboard and preserves Domain ownership while giving one coherent employee workspace. | يضاف مدخل موثق واحد باسم **العمليات** إلى الغلاف الحالي عندما تعيد A1 قدرة مناسبة واحدة على الأقل. تضم الصفحة ثلاثة أقسام أساسية: **الفروع** و**المخزون** و**التسعير**. يكون الإدراج أداة ضمن الفرع/المنتج، والحجوزات والتحويل ضمن المخزون، والتكلفة المرجعية حقلاً مستقلاً في التسعير. يمنع ذلك لوحة ERP ضخمة ويحفظ الملكيات.

## 8. User workflows | تدفقات المستخدم

1. Load the authenticated actor, then A1 capabilities; choose the first usable section or show “no operational capability”.
2. For Branch management, load `GET /api/branches`, select a Branch, and create/edit/status-change with its exact revision. Activation and deactivation are both the existing `PATCH`; there is no delete.
3. For Branch-scoped Product work, choose an accessible Branch, search with the exact A2 purpose, select a Product, then load the resource-owned state.
4. Listing: review current status/actions, explicitly Set Listed or Set Unlisted, then refetch.
5. Inventory: render the A5 read shape, choose only an A1-enabled mutation, review the command, submit once, and refresh readable state.
6. Reservations: select a Product, page actionable rows, open current detail, then Release/Fulfill only when returned actions permit it; refetch after write or stale failure.
7. Transfer: select distinct accessible source/destination Branches and a source-scoped operational Product, review, submit one atomic request, show `transferId`, and refresh both readable balances.
8. Pricing: choose Workspace or Branch scope and Price/Reference Cost purpose, select Product, render only returned fields/actions, mutate one field, and refetch authoritative management state.

التدفقات العربية مكافئة: يبدأ المستخدم بالسياق الموثق وقدرات A1، ثم يختار القسم. تستخدم إدارة الفروع مراجعة الخادم ولا تحذف. تبدأ أعمال الفرع باختيار فرع متاح ثم اكتشاف A2 حسب الغرض. يعاد تحميل الإدراج والمخزون والحجز والتسعير بعد النجاح أو التعارض. يرسل التحويل طلباً ذرياً واحداً، ولا تنفذ الواجهة عمليات جزئية.

## 9. Server contracts consumed | عقود الخادم المستهلكة

| Surface | Exact HTTP contract |
| --- | --- |
| Capabilities | `GET /api/operations/capabilities` |
| Branches | `GET/POST /api/branches`; `GET/PATCH /api/branches/{branchId}` |
| Product selector | `GET /api/catalog/operational-products?purpose=...&q=...&branchId=...&cursor=...&limit=...` |
| Listing | `GET/PUT /api/branches/{branchId}/products/{productId}/listing` |
| Inventory read | `GET /api/branches/{branchId}/inventory/{productId}` |
| Basic Inventory writes | `POST` Receive, Issue, Corrections, Damage, Damage Restore routes under `/api/branches/{branchId}/inventory` |
| Reservations | `GET/POST .../inventory/reservations`; `GET .../reservations/{reservationId}`; `POST .../{reservationId}/release|fulfill` |
| Transfer | `POST /api/inventory/transfers` |
| Workspace pricing | `GET /api/products/{productId}/pricing`; `PUT/DELETE /api/products/{productId}/pricing/{priceType}` |
| Branch overrides | `GET /api/branches/{branchId}/products/{productId}/pricing/management`; `PUT/DELETE .../pricing/{priceType}` |

All success envelopes are validated as `{ type: "Success", value }`. Typed adapters must reconstruct only approved fields and reject malformed responses. | تتحقق المحولات من غلاف النجاح وتعيد بناء الحقول المعتمدة فقط، وترفض الاستجابات المشوهة.

## 10. Authorization and capability rules | قواعد التفويض والقدرات

- A1 booleans control navigation, section availability, and initial selection only; raw permissions are never requested, stored, rendered, or submitted.
- Branch management continues to use `GET /api/branches`, authorized by Branch view/manage. It is **not** a complete operational selector for independently authorized operational actors. The future Presentation must consume a separately approved Workspace Branch Application operational selector; until that contract exists, no Branch-scoped Presentation workflow may begin. Do not extract Branch IDs from session internals, accept free-form Branch IDs, or reinterpret `403` as an empty collection.
- A2 `purpose` is derived by the coordinator: `Listing`, `Inventory`, `WorkspacePricing`, `BranchPricing`, `WorkspaceReferenceCost`, or `BranchReferenceCost`. It never grants authority.
- Resource actions come from `allowedActions`. Hidden/disabled controls are usability only; writes remain decisive.
- Field omission is authorization-sensitive, especially Wholesale and Reference Cost; omission is not `NotConfigured`.

- تستخدم قدرات A1 للتنقل فقط ولا تعرض صلاحيات خاماً.
- تبقى قائمة الفروع الحالية لإدارة الفروع فقط ولا تكفي محدداً لكل ممثل تشغيلي مستقل. يلزم عقد محدد تشغيلي مستقل ومعتمد قبل تنفيذ الواجهة، ولا يجوز تحويل `403` إلى فراغ أو استخراج معرفات الجلسة أو قبول معرف حر.
- يشتق المنسق غرض A2 ولا يعده تفويضاً، وتأتي أفعال المورد من `allowedActions`، ويختلف غياب الحقل عن `NotConfigured`.

## 11. Inventory disclosure rules | قواعد كشف المخزون

- Detailed shape: show `available`, `onHand`, `reserved`, and `damaged` from nested `quantities`, plus `unit`, `revision`, and `updatedAt`.
- Semantic shape: show only localized **In stock / متوفر** or **Out of stock / غير متوفر**. Never render a number, revision, timestamp, `Hidden`, or inferred zero.
- Mutation-only shape: show operation success and operation-specific authorized identity/state only; show “Balance not available for this account” rather than a fake quantity.
- Zero, absent balance, fully reserved, and fully damaged all legitimately project `OutOfStock`; Presentation must not distinguish them without the detailed shape.
- Reservation `remainingQuantity` is authorized Reservation state, not a generic balance. Transfer `transferId` remains operation identity.

- يعرض الشكل التفصيلي الكميات المتداخلة فقط. يعرض الشكل الدلالي متوفر/غير متوفر فقط. وعند صلاحية التعديل دون القراءة تعرض الواجهة نجاح العملية دون رصيد مصطنع. لا تميز الواجهة بين الصفر والغياب والحجز/التلف الكامل دون الحمولة التفصيلية.

## 12. Pricing concurrency UX | تجربة تزامن التسعير

Workspace Retail and Wholesale use the single response-level `productRevision`, including when a slot is `NotConfigured`. Every Set/Clear sends that current shared token. A successful Retail write invalidates the token previously shown beside Wholesale and vice versa; disable both editors during submission and reload the entire Workspace management read after every Retail/Wholesale success. On `409`, discard the stale token, retain the draft separately, reload, show the current values, and require explicit review and retry. Reference Cost uses only `referenceCostRevision` (`0` only for authoritative absence), reloads after success/conflict, and never shares the Product token. | تستخدم التجزئة والجملة `productRevision` واحداً حتى عند عدم التهيئة. يبطل نجاح أحدهما رمز الآخر، لذلك يعاد تحميل القراءة كاملة بعد كل تعديل. عند `409` يُهمل الرمز القديم وتُحفظ المسودة للمراجعة دون إعادة تلقائية. تستخدم التكلفة المرجعية `referenceCostRevision` مستقلاً ولا تشارك رمز المنتج.

Branch slots display `base`, `override`, `effective`, and `source`. `ClearOverride` means inherit and appears only when returned. Mutations use `overrideRevision`; nested base data is informational and must never expose a Workspace mutation action. `baseProductRevision` and `baseReferenceCostRevision` explain freshness but are not override write tokens. | تعرض تجاوزات الفرع الأساس والتجاوز والفعلي والمصدر. يعني المسح الوراثة ويستخدم `overrideRevision`. تبقى بيانات الأساس معلوماتية ولا تنشئ تعديل مساحة عمل.

## 13. Reservation UX | تجربة الحجوزات

The collection is Product-scoped, actionable-only (`Active | PartiallyFulfilled`), default 24/max 60, ordered `updatedAt DESC, reservationId DESC`, with the opaque server cursor. “Next” sends the returned cursor unchanged. `InvalidCursor` clears only `reservationCursor` and reloads page one with an explanation. Detail may show any current status; Release/Fulfill are rendered only from current detail `allowedActions`. Before submission show quantity and remaining quantity; after success refetch detail/list. `ReservationNotActive`, missing action, or stale state is a review state, never a client-side override. | القائمة مقيدة بالمنتج والحالات القابلة للفعل وبمؤشر الخادم المعتم. عند مؤشر غير صالح تبدأ الصفحة الأولى. تعرض التفاصيل الحالة الحالية، ولا تظهر إجراءات التحرير/التنفيذ إلا من `allowedActions`. تعاد القراءة بعد النجاح أو الحالة القديمة، ولا تفترض الواجهة بقاء الحجز قابلاً للفعل.

## 14. Transfer UX | تجربة التحويل

Collect source Branch, destination Branch, Product, positive Piece quantity, and optional current `reasonCode`; do not invent fields. Reject an identical source/destination locally for usability, but let Inventory Application validate both scope, activity, Product, and stock. Generate an operation ID with the browser crypto API for the exact confirmed command; preserve it only for an uncertain retry of the identical payload and generate a new ID when the command changes. Submit one `POST /api/inventory/transfers`; never split or optimistically infer partial success. On success announce `transferId` and reload source/destination state only where current disclosure permits. | تجمع الواجهة الفرعين المختلفين والمنتج والكمية والسبب الاختياري الحالي، وتولد معرف عملية للأمر المؤكد. يحفظ المعرف فقط عند إعادة غير مؤكدة لنفس الحمولة. يرسل طلب ذري واحد، ويعرض `transferId` ثم يعيد تحميل الحالة المسموح بها دون افتراض نجاح جزئي.

## 15. Mobile-first design | التصميم المتجاوب أولاً

- 320–480 px: one-column section navigation, Branch/Product selectors before state, stacked cards, progressive forms, full-width primary actions, no core horizontal scrolling.
- 481–1024 px: touch-friendly master/detail or two-card layout where it shortens the workflow; controls still wrap and remain keyboard usable.
- Above 1024 px: productive two/three-pane layouts and optional semantic tables with a complete card alternative; never a stretched phone layout or hover-only action.
- Minimum touch-friendly targets, visible progress, concise review summaries, and deliberate empty space apply at every size.

- على الجوال تكون البطاقات عمودية والإجراءات بعرض كامل، وعلى الجهاز اللوحي يمكن استخدام رئيسي/تفصيلي، وعلى سطح المكتب تستخدم المساحة بكفاءة مع بقاء بديل البطاقات وكل الأفعال متاحة للمس واللوحة دون اعتماد على التحويم.

## 16. RTL/LTR | العربية والإنجليزية

Reuse the existing locale provider and `PresentationShell` direction. Keep one component tree and logical CSS. Translate labels, dialogs, validation, empty/error/success states, actions, pagination, price sources, and Inventory semantics. Isolate Branch/Product codes, IDs, ISO currency codes, decimal quantities, amounts, and operation/transfer IDs with appropriate `dir="ltr"`/bidi isolation; never translate Workspace-entered names. | يعاد استخدام مزود اللغة واتجاه الغلاف الحالي مع شجرة مكونات واحدة وخصائص CSS منطقية. تترجم كل رسائل الواجهة، وتعزل الأكواد والمعرفات والعملات والكميات تقنياً دون ترجمة أسماء مساحة العمل.

## 17. Accessibility | إتاحة الوصول

Require one page heading; semantic section navigation; labeled Branch/Product/search/select/amount/currency/quantity/reason fields; visible focus; touch-sized controls; status plus text/icon rather than color alone; `aria-live` for loading/success; focused error summary linked to fields; accessible native confirmation dialog semantics; initial focus, Escape/cancel, and focus restoration; unique screen-reader action names containing the Branch/Product/Reservation context; disabled and busy states that prevent duplicate submit. Keyboard, mouse, and touch must complete every workflow. | يلزم عنوان واحد وتنقل دلالي وتسميات كاملة وتركيز ظاهر ورسائل حية وتحقق مرتبط بالحقول وحوارات تأكيد متاحة واستعادة التركيز وأسماء أفعال واضحة لقارئ الشاشة. يجب إكمال كل تدفق باللوحة والفأرة واللمس.

## 18. URL and navigation state | حالة URL والتنقل

Use `/operations` and only these allow-listed query keys: `section=branches|inventory|pricing`; `branchTool=details|listing`; `inventoryTool=stock|reservations|transfer`; `pricingScope=workspace|branch`; `pricingField=prices|reference-cost`; `branchId`; `productId`; normalized `q`; `productCursor`; `reservationCursor`; and `reservationId`. Purpose is derived, never accepted from the URL as authority. Duplicate/unknown/invalid combinations resolve to the nearest safe default and clear dependent state. Changing Branch clears Product and all cursors; changing purpose clears Product and product cursor; changing Product clears Reservation state. Never place Workspace/actor/role/permissions, revisions, operation IDs, unsaved forms, money, or quantities in the URL. Server checks every URL identifier. | تستخدم الصفحة مفاتيح URL المذكورة فقط. يشتق الغرض داخلياً، وتزال الحالة التابعة عند تغيير الفرع/الغرض/المنتج. لا توضع السلطة أو المراجعات أو معرفات العمليات أو المسودات أو الأموال أو الكميات في URL، ويتحقق الخادم من كل معرف.

## 19. HTTP/client coordination | تنسيق HTTP والعميل

Create bounded Domain-aligned clients with injected fetch ports: an Identity capability client; a Workspace Branch management client; a Catalog Query operational-product client; a Catalog Branch Product Listing/Pricing client; and an Inventory management client. Each uses same-origin credentials, `cache: "no-store"`, exact allow-listed DTOs, envelope/field validation, and normalized failures. Pure `operations-query-state.ts` and the route-level Presentation coordinator live under Workspace Branch Presentation and own purpose selection, dependent-state reset, request keys, mutation lifecycle, refetch rules, and operation-ID lifecycle only. React never imports repositories, Domain entities, or infrastructure runtimes. Do not turn the existing Catalog Query, Identity, or Reference Data clients into a generic framework. | تنشأ عملاء محدودة وموزعة حسب المجال مع fetch محقون: للقدرات والفروع واكتشاف المنتج والإدراج/التسعير والمخزون. يستخدم كل عميل بيانات الاعتماد من المصدر نفسه وعدم التخزين وDTO مسموحاً به وتحليلاً صارماً. تعيش حالة URL والمنسق على مستوى الصفحة مع عرض الفروع وتملك تنسيق الطلب فقط. لا تستورد React المستودعات أو كيانات المجال ولا تحول العملاء الحاليين إلى إطار عام.

## 20. Component boundaries | حدود المكونات

| Component/boundary | Responsibility and state | Business-rule constraint / accessibility |
| --- | --- | --- |
| `OperationsPage` | Client composition, request keys, selected URL state | No authorization rules; page heading/status regions |
| `OperationsNavigation` | Capability-shaped primary sections | Semantic nav, keyboard/focus; booleans are hints only |
| `BranchSelector` / `OperationalProductSelector` | Server results, q, pagination, selection | No scope/lifecycle filtering after pagination; labeled listbox/search |
| `BranchManagementPanel` | Branch cards and create/edit/status dialogs | Temporary form state only; exact revision/refetch; accessible confirmation |
| `ListingPanel` | Listing DTO and explicit Set actions | Uses returned revision/actions only |
| `InventorySummary` | Discriminated A5 rendering | Exhaustive type handling; never infer numbers |
| `InventoryMutationForm` | One named operation draft/review/submit | No invariant authority; duplicate-submit gate |
| `ReservationList` / `ReservationDetail` | Cursor page, selected detail, Release/Fulfill dialogs | Current actions only; focus restoration |
| `TransferForm` | Source/destination/Product/quantity/reason and confirmation | One atomic request; accessible review summary |
| `WorkspacePricingPanel` | Partial authorized fields and shared/independent revision UX | Field omission preserved; no independent Retail/Wholesale token |
| `BranchOverridePanel` | base/override/effective/source per returned field | Base is informational; actions/revision from slot only |
| `OperationsStatus` | Loading/empty/error/success announcements | No exception text; live-region behavior |

تبقى المكونات المرئية نقية قدر الإمكان ولا تملك قواعد المجال. تملك النماذج حالة مؤقتة فقط، بينما يملك المنسق إعادة التحميل وإعادة ضبط الحالة ودورة الطلب.

## 21. Error, loading, and empty states | حالات الخطأ والتحميل والفراغ

- `400 InvalidInput`: retain draft, show calm field/form guidance; server remains validator. `400 InvalidCursor`: clear the relevant cursor and reload page one.
- `401 AuthenticationRequired`: use the existing single session-expiry redirect; never replay a mutation automatically.
- `403 Forbidden`: safe section/resource denial. `ForbiddenForRestrictedSession` and `OriginNotAllowed`: explicit localized blocked state, no retry loop.
- `404`: generic Branch/Product/Reservation unavailable message, clear dependent selection, refetch collection, reveal no tenant diagnosis.
- `409 Conflict`: preserve draft, discard stale token, reload current state, require explicit review/retry. `IdempotencyConflict` must not be silently retried.
- `503`/network/malformed response: typed unavailable state and explicit retry; no mock fallback.
- Distinguish loading Branches/Products/state; no Branches; no accessible Branches; no Products; no Reservations; `NotConfigured`; no override/inherit; absent Inventory projected by the server; no readable balance; no capability; unavailable service.

- تعالج الواجهة 400 للتحقق والمؤشر، و401 بتحويل انتهاء الجلسة، و403 كمنع آمن، و404 دون كشف، و409 بإعادة القراءة والمراجعة، و503/الشبكة كعدم توفر. ولا تخلط الفراغ أو عدم التهيئة أو عدم التفويض أو عدم العثور أو عدم التوفر.

## 22. Security review | مراجعة الأمان

- Raw permissions: consume only A1 semantics; strict parsers drop unexpected authority fields.
- Workspace authority: never accept/store a Workspace ID in URL or command; same-origin authenticated server context is authoritative.
- Branch bypass: use scoped results for selection; direct URL IDs receive the same safe server validation.
- Inventory: render the discriminated DTO exhaustively; never cache/reconstruct hidden numeric state.
- Reference Cost: preserve field omission across selectors, panels, error logs, and local state; never derive it from ordinary pricing capability.
- Concurrency: exact server tokens, refetch after success/conflict, no blind retry or silent merge.
- Reservations: current detail/actions before writes; refetch stale state.
- Idempotency: in-flight submit gate and stable operation ID only for identical uncertain retry.
- Restricted sessions: existing authenticated boundary and subsystem response; no management rendering.
- Caching/cross-tenant reuse: fetch with `no-store`; key state by current selection; clear operational data on actor/session change, logout, 401, and component disposal. Never use public/shared/browser persistence for management DTOs.

- تمنع الضوابط كشف الصلاحيات أو سلطة مساحة العمل وتجاوز نطاق الفرع والأرقام المخفية والتكلفة المرجعية والكتابة بمراجعة قديمة وتكرار العمليات. لا تخزن بيانات الإدارة في مخزن عام أو دائم، وتمسح عند تغير الجلسة.

## 23. Implementation slices | شرائح التنفيذ

1. **3.22-P1 — Operations shell, strict types/client, capabilities, URL state, Branch collection/management, and selectors.** **Blocked** until the proposed Branch selector remediation is separately approved, implemented, reviewed, and merged.
2. **3.22-P2 — Listing.** Small state/revision/action workflow on the Branch/Product selector.
3. **3.22-P3 — Inventory read and basic mutations.** Implement A5 exhaustive rendering and Receive/Issue/Correct/Damage/Restore.
4. **3.22-P4 — Reservations.** Actionable page/detail plus Reserve/Release/Fulfill and cursor/stale-state recovery.
5. **3.22-P5 — Transfer.** Atomic request, idempotency UX, two-Branch refresh.
6. **3.22-P6 — Workspace pricing and Reference Cost.** Partial fields, shared Product revision, independent Reference Cost revision.
7. **3.22-P7 — Branch overrides.** Base/override/effective/source and override revision/actions.
8. **3.22-P8 — Integration hardening.** Navigation, bilingual copy, responsive/accessibility/touch/mouse/keyboard verification, and security regression.

All Presentation slices P1–P8 are blocked because they depend directly or transitively on P1’s safe Branch selection seam. Their designs remain proposed, independently testable future slices; none is implementation-approved by this contract. | كل شرائح العرض P1–P8 محجوبة لاعتمادها المباشر أو غير المباشر على محدد الفروع الآمن في P1. تبقى تصاميم مستقبلية مقترحة وقابلة للاختبار، ولا تعتمد الوثيقة تنفيذ أي منها.

## 24. Tests and verification plan | خطة الاختبارات والتحقق

- Pure/unit: query parsing/reset, purpose derivation, strict response parsing, capability visibility, A5 discriminated rendering, partial pricing fields, shared/independent token selection, operation-ID lifecycle, money/quantity form mapping.
- Component/prerender/behavior: every loading/empty/error state; accessible labels/dialog/focus restoration; action omission; LTR/RTL; Branch/Product selectors; mutation lifecycle and duplicate-submit prevention.
- HTTP coordination with injected fetch: success and malformed success; 400 input/cursor; 401; each 403; safe 404; 409/conflict and idempotency conflict; 503/network; no-store/same-origin; exact DTO allow lists.
- Integrated Presentation: Branch create/edit/activate/deactivate; select Branch/Product; Listing; Receive/Issue/Adjust/Damage/Restore; Reserve/Release/Fulfill; Transfer; Workspace Retail/Wholesale/Reference Cost; Branch overrides; success/conflict refetch.
- Security: no raw authority, Workspace command field, out-of-scope leakage, hidden quantities, unauthorized Reference Cost, stale action, or cross-session cached data.
- Functional responsive QA: representative 320, 480, tablet portrait/landscape, desktop, and wide desktop; English LTR and Arabic RTL; touch, mouse, and keyboard.
- Use current Node test/prerender patterns, TypeScript, ESLint, and Next.js build. Do not introduce E2E tooling or run Production data.

- تغطي الخطة الاختبارات النقية والمكونات وتنسيق HTTP والتدفقات المتكاملة والأمان والاستجابة والاتجاه وأجهزة الإدخال، باستخدام أدوات المستودع الحالية فقط.

## 25. WILL IMPLEMENT | سينفذ

- The eight Presentation slices above only after the Branch selector remediation is separately approved, implemented, reviewed, merged, and this planning gate is reconciled again.
- Existing shell/shared UI/i18n conventions and strict Domain-owned HTTP contracts.
- Explicit authoritative refetch, safe conflict handling, semantic non-disclosure, and full responsive/accessibility QA.

- الشرائح الثماني فقط بعد اعتماد وتنفيذ ومراجعة ودمج معالجة محدد الفروع ثم إعادة مصالحة بوابة التخطيط، مع بقاء بقية ضوابط العرض المقترحة.

## 26. WILL NOT IMPLEMENT | لن ينفذ

Public Product Share Link, anonymous access, `wa.me`, WhatsApp Cloud API/backend messaging, Product Entry, Reference Data or ordinary Catalog redesign, Inventory/pricing history redesign, new permissions, schema/migration `0016`, new Domain/repository/authentication system, generalized Multi-Warehouse, ERP/purchasing/orders/accounting/tax/FX/promotions/analytics/AI, approval workflow, Product version history, Production deployment, a generic BFF, or client-owned business authority. | لن تنفذ المشاركة العامة أو المجهولة أو WhatsApp أو إدخال المنتج أو إعادة تصميم البيانات المرجعية/الكتالوج/السجل أو صلاحيات/مخطط/ترحيل/مجال/مستودع/مصادقة جديدة أو ERP وما شابه أو نشر الإنتاج أو BFF عام أو سلطة أعمال في العميل.

## 27. ADR decision | قرار ADR

**`ADR NOT REQUIRED` for the recommended remediation.** A bounded operation-specific selector read belongs to the existing Workspace Branch Application and reuses trusted context and Branch persistence; it does not change a Domain boundary or global permission semantics. Exact implementation still requires a separately reviewed Task 3.22-A6 contract. | **`ADR NOT REQUIRED` للمعالجة الموصى بها** لأنها قراءة محدودة خاصة بالعملية ضمن تطبيق فروع مساحة العمل وتعيد استخدام السياق والاستمرارية الحاليين دون تغيير حدود المجال أو دلالات الصلاحيات العامة. يبقى عقد A6 المستقل مطلوباً.

## 28. Database/migration decision | قرار قاعدة البيانات والترحيل

**`NO DATABASE CHANGE`.** Task 3.22 Presentation consumes existing reads and writes. The migration chain remains `0000–0015`; migration `0016` and the Reservation candidate index remain unnecessary and unapproved. | **`NO DATABASE CHANGE`**؛ تستهلك الواجهة العقود الحالية، وتبقى سلسلة الترحيلات `0000–0015` ولا يعتمد `0016` أو فهرس الحجوزات المرشح.

## 29. Dependency decision | قرار الاعتماديات

**`NO NEW DEPENDENCY`.** Existing Next.js, React, TypeScript, CSS, browser APIs, shared controls, and repository test/build tools are sufficient. | **`NO NEW DEPENDENCY`**؛ تكفي التقنيات وعناصر الواجهة وواجهات المتصفح وأدوات الاختبار والبناء الحالية.

## 30. Final planning decision | قرار التخطيط النهائي

Independent review confirms the **Branch Selector Authorization Composition Gap**. A1–A5 remain correctly merged, but they do not let every independently authorized Branch-scoped operational actor discover a valid Branch. **Task 3.22 is `Blocked`, unstarted, and not implementation-approved.** Recommend separately planning **Task 3.22-A6 — Operational Branch Selector Read**; this recommendation does not approve or implement A6. | تؤكد المراجعة المستقلة فجوة تركيب تفويض محدد الفروع. تبقى A1–A5 صحيحة ومدمجة، لكنها لا تمكن كل ممثل تشغيلي مستقل من اكتشاف فرع صالح. **المهمة 3.22 محجوبة وغير مبدوءة وغير معتمدة للتنفيذ.** يوصى بتخطيط مستقل للمهمة **3.22-A6 — قراءة محدد الفروع التشغيلي** دون اعتماد تنفيذها أو تنفيذها هنا.
