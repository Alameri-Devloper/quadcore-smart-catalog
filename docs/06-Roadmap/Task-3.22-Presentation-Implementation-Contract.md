# Task 3.22 — Operational Management Presentation Implementation Contract | عقد تنفيذ واجهة إدارة العمليات للمهمة 3.22

> **Current P1 closure — 2026-09-21 | إغلاق P1 الحالي:** P1 Live Browser Acceptance QA: **PASS**; `P1CompletionGate: PASS`; **P1: COMPLETE**. P2 is **READY_FOR_PLANNING** only, with separate scope/review before implementation. Cosmetic, non-blocking UI ordering feedback is deferred as a UX follow-up. The earlier P1.6 and post-A6 notices below remain historical evidence; this checkpoint changes no architecture or later-slice contract. See the [P1 closure checkpoint](../05-Development/Reports/QSC-Task-3.22-P1.6-Final-Report.md). | نجح تحقق قبول P1 في المتصفح الحي وبوابة اكتمالها، واكتملت P1. أصبحت P2 جاهزة للتخطيط فقط مع تحديد نطاق ومراجعة مستقلين قبل التنفيذ. أُجّلت ملاحظات ترتيب الواجهة الشكلية غير المانعة لمتابعة تجربة المستخدم. تبقى إشعارات P1.6 وما بعد A6 أدلة تاريخية دون تغيير المعمارية أو عقود الشرائح اللاحقة.

> **P1 closure — 2026-09-14 | إغلاق P1:** `P1CompletionGate: PASS`; foundation implementation and safe automated verification complete, awaiting independent review with live browser QA debt. P1 stops at Product selection; P2–P8 remain unstarted and separately gated. [P1.6 evidence](../05-Development/Reports/QSC-Task-3.22-P1.6-Final-Report.md) supersedes only historical P1-unstarted/next-implementation status statements below; the architecture and later-slice contracts are unchanged. | اكتمل تنفيذ الأساسات والتحقق الآلي الآمن مع انتظار مراجعة مستقلة وبقاء دين تحقق المتصفح. تتوقف P1 عند اختيار المنتج، وتبقى P2–P8 غير مبدوءة ومشروطة باعتماد مستقل. يحل تقرير P1.6 محل عبارات الحالة التاريخية لبدء P1 فقط، دون تغيير المعمارية أو عقود الشرائح اللاحقة.

> **Post-A6 gate — 2026-09-10:** A6 is **Completed / merged through PR #35** at `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`. Decision: **`ApprovedNextImplementation` — P1 only**. Presentation is unstarted; this reconciliation implements no P1–P8 code. See the [source evidence and gate report](../05-Development/Reports/QSC-Task-3.22-Presentation-Gate-Reconciliation-Report.md). | **بوابة ما بعد A6:** اكتملت A6 ودُمجت عبر #35 عند الخط المذكور. القرار **`ApprovedNextImplementation` لشريحة P1 فقط**. لم يبدأ تنفيذ الواجهة ولا تنفذ هذه المصالحة كود P1–P8؛ راجع تقرير الأدلة والبوابة.

## 1. Status | الحالة

The Branch Selector Authorization Composition Gap is resolved by merged A6. A1–A5 remain merged through PRs #28–#32. All necessary browser composition contracts exist with the inactive-Branch distinction below; no server remediation is required. Only P1 is the next implementation slice after reconciliation review. P2–P8 remain planned and require separate scope/review; this is not combined implementation approval. | حلت A6 المدمجة فجوة تركيب تفويض محدد الفروع مع بقاء A1–A5 مدمجة. تتوفر عقود تركيب المتصفح اللازمة مع التمييز أدناه للفروع غير النشطة، ولا تلزم معالجة خادم. P1 وحدها شريحة التنفيذ التالية بعد مراجعة المصالحة، وتبقى P2–P8 مخططة وتتطلب نطاقاً ومراجعة مستقلين دون اعتماد تنفيذها مجتمعة.

### Historical root cause and merged resolution | السبب التاريخي وحله المدمج

A Staff actor with only `inventory.receive` and trusted Branch scope receives A1 `canReceive=true` while general Branch List is forbidden and A2 requires a Branch ID. That was a real missing selector contract, never an empty collection. Merged `ListOperationalBranchesUseCase` now authorizes A6 Inventory for that same actor and supplies scoped Branch IDs without general Branch view/manage. Equivalent exact-purpose composition covers Listing, Transfer and Branch overrides. General Branch permissions and A1/A2 semantics remain unchanged. | كان موظف يملك الاستلام ونطاقاً موثوقاً يرى القدرة في A1، لكن قائمة الفروع العامة تمنعه وتحتاج A2 معرف فرع؛ كانت فجوة حقيقية وليست قائمة فارغة. تتيح A6 الآن اكتشاف الفروع المخولة لنفس الموظف بغرض Inventory دون صلاحيات الفروع العامة، وبالمثل للأغراض الأخرى، مع حفظ دلالات A1 وA2 والصلاحيات.

## 2. Baseline | خط الأساس

- Reconciliation branch / فرع المصالحة: `feature/task-3.22-presentation-gate-reconciliation`.
- Exact clean starting HEAD and merge baseline / HEAD الأولي النظيف وخط الدمج المطابق: `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`.
- Local merge commit identifies PR #35 and parents `51562151d9be79b0f6be50c6406cb207c81e70aa` and `85503ca` (abbreviated A6 parent); required ancestor check passed. / يثبت سجل الدمج المحلي #35 والأبوين المذكورين ونجح فحص السلف.
- Historical Presentation planning baseline: `0f102dd020efacc517f0e27601f4a54ecce2eca0`, branch `feature/task-3.22-presentation-planning`; preserved in the [original report](../05-Development/Reports/QSC-Task-3.22-Presentation-Planning-Report.md). / حُفظ خط التخطيط وفرعه التاريخيان في التقرير الأصلي.
- Merged source and current contracts govern; earlier blocked decisions describe their earlier baselines. / يحكم المصدر المدمج والعقود الحالية، وتصف قرارات الحجب السابقة خطوطها التاريخية.

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
| 11 | Branch/Product/Workspace scoping and discoverable Branch IDs | A6; Workspace Branch Application; `ListOperationalBranchesUseCase`; `GET /api/branches/operational?purpose=...` composes exact operational permission with trusted Workspace/Branch scope | Resolved; four-field options, not resource read/write authority |
| 12 | Resource-specific action availability was missing | A1 semantic global capabilities plus A2 Listing, A3 Reservation, and A4 Pricing `allowedActions` | Render only returned actions; every mutation still reauthorizes |

النتيجة العربية: تحفظ A1–A5 عقودها، وتحل A6 الحاجة المتبقية لاكتشاف الفرع دون صلاحية عرض/إدارة الفروع العامة؛ لا تمنح نتيجة المحدد أهلية القراءة أو الطفرة.

## 5. Architecture decision | القرار المعماري

The existing `/operations` plan remains valid with A6 consumed by Workspace Branch Presentation. Route composition stays there; Identity owns capability coordination, Catalog Query owns Product selection, Catalog Branch Product owns Listing/Pricing, and Inventory owns its workflows. Preserve TypeScript, DDD, Clean Architecture, Modular Monolith, Multi-Tenant isolation, Mobile First with first-class tablet/desktop, English/Arabic and LTR/RTL. React renders DTOs and delegates coordination; it has no business rules, repository access or infrastructure runtime imports. No new Domain, generic Operations BFF or permission. | يبقى تصميم العمليات صالحاً مع استهلاك A6 داخل عرض فروع مساحة العمل وحفظ ملكيات الهوية واكتشاف المنتج والإدراج والتسعير والمخزون. تُحفظ TypeScript وDDD والمعمارية النظيفة والتطبيق الأحادي المعياري وتعدد المستأجرين والجوال أولاً مع دعم اللوحي وسطح المكتب واللغتين والاتجاهين. تعرض React الحمولات وتفوض التنسيق دون قواعد أعمال أو وصول للمستودعات أو بيئات البنية، ولا مجال أو BFF أو صلاحية جديدة.

## 6. Exact Presentation scope | نطاق الواجهة الدقيق

The retained P1–P8 design scope (only P1 is approved next) is: Branch list/detail/create/update/activate/deactivate; Branch/Product Listing state and Set Listed/Unlisted; operational Product discovery; Inventory read plus Receive, Issue, Correct Increase/Decrease, Mark Damaged, Restore Damaged, Reserve, Release, Fulfill, and atomic Transfer; actionable Reservation list/detail; Workspace Retail/Wholesale/Reference Cost base management; and Branch Retail/Wholesale/Reference Cost override management. Movement history may be displayed only through the already-existing quantity-authorized endpoint and is not redesigned. | نطاق تصميم P1–P8 المحفوظ (P1 وحدها معتمدة تالياً) هو: عرض/تفاصيل/إنشاء/تحديث/تفعيل/تعطيل الفروع؛ إدارة إدراج المنتج في الفرع؛ اكتشاف المنتج التشغيلي؛ قراءة المخزون وعمليات الاستلام والصرف والتصحيح والتلف والاستعادة والحجز والتحرير والتنفيذ والتحويل الذري؛ قائمة/تفاصيل الحجوزات القابلة للفعل؛ إدارة أسعار مساحة العمل والتكلفة المرجعية؛ وإدارة تجاوزات الفرع. يمكن عرض سجل الحركات عبر المسار الحالي المخول بالكميات فقط دون إعادة تصميمه.

## 7. Information architecture | بنية المعلومات

Create one authenticated **Operations / العمليات** entry in the established `PresentationShell`, visible when A1 indicates at least one relevant capability. `/operations` has three primary mobile-first sections: **Branches**, **Inventory**, and **Pricing**. Listing is a Branch/Product tool inside Branches; Reservations and Transfer are Inventory tools; Reference Cost is a separately authorized field inside Pricing. This avoids an ERP mega-dashboard and preserves Domain ownership while giving one coherent employee workspace. | يضاف مدخل موثق واحد باسم **العمليات** إلى الغلاف الحالي عندما تعيد A1 قدرة مناسبة واحدة على الأقل. تضم الصفحة ثلاثة أقسام أساسية: **الفروع** و**المخزون** و**التسعير**. يكون الإدراج أداة ضمن الفرع/المنتج، والحجوزات والتحويل ضمن المخزون، والتكلفة المرجعية حقلاً مستقلاً في التسعير. يمنع ذلك لوحة ERP ضخمة ويحفظ الملكيات.

## 8. User workflows | تدفقات المستخدم

1. Load the authenticated actor, then A1 capabilities; choose the first usable section or show “no operational capability”.
2. For Branch management, load `GET /api/branches`, select a Branch, and create/edit/status-change with its exact revision. Activation and deactivation are both the existing `PATCH`; there is no delete.
3. For fresh Branch-scoped Product work, load the exact A6 purpose, select an Active Branch, search with the exact A2 purpose, select a Product, then load resource-owned state where authorized. Existing-resource inspection follows section 10's inactive policy.
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
| General Branch management | `GET/POST /api/branches`; `GET/PATCH /api/branches/{branchId}` |
| Canonical operational Branch selector (A6) | `GET /api/branches/operational?purpose=Listing` (example; exactly one of the five purposes in section 10) |
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
- Branch management keeps general List/Get under its existing Owner or Branch view/manage authority. Every operational workflow uses A6, even when general Branch view is available; **no general `GET /api/branches` fallback**. Never consume session `branchScope`, accept free-form Branch discovery IDs, or treat `403` as an empty collection.

- A2 `purpose` is derived by the coordinator: `Listing`, `Inventory`, `WorkspacePricing`, `BranchPricing`, `WorkspaceReferenceCost`, or `BranchReferenceCost`. It never grants authority.
- Resource actions come from `allowedActions`. Hidden/disabled controls are usability only; writes remain decisive.
- Field omission is authorization-sensitive, especially Wholesale and Reference Cost; omission is not `NotConfigured`.

- تستخدم قدرات A1 للتنقل فقط ولا تعرض صلاحيات خاماً.
- تبقى List/Get العامة لإدارة الفروع بصلاحيتها الحالية، وتستخدم كل العمليات A6 دائماً حتى مع صلاحية العرض العام دون fallback. لا يحول `403` إلى فراغ ولا تستخرج معرفات النطاق من الجلسة ولا تقبل معرفات اكتشاف حرة.
- يشتق المنسق غرض A2 ولا يعده تفويضاً، وتأتي أفعال المورد من `allowedActions`، ويختلف غياب الحقل عن `NotConfigured`.

### A6 composition and inactive Branch policy | تركيب A6 وسياسة الفرع غير النشط

A6 accepts exactly one case-sensitive `purpose` query key, with no extra keys, search or pagination. Its exact purposes are `Listing`, `Inventory`, `Transfer`, `BranchPricing`, `BranchReferenceCost`. Success is `{ type: "Success", value: [{ branchId, code, displayName, status }] }`; `value` is a direct array. Preserve server order and parse exactly the four option fields. All responses/errors are private, no-store. Authorized `[]`, `403 Forbidden`, and a non-empty all-inactive collection are different UI states. | تقبل A6 معامل purpose واحداً مطابقاً لحالة الأحرف من الأغراض الخمسة المذكورة دون مفاتيح أخرى أو بحث أو صفحات. النجاح مصفوفة مباشرة بأربعة حقول فقط، ويُحفظ ترتيب الخادم. كل النتائج خاصة وغير مخزنة، وتختلف القائمة الفارغة المصرح بها عن المنع وعن قائمة كاملة غير نشطة.

| Workflow / التدفق | Branch discovery / اكتشاف الفرع | Product discovery / اكتشاف المنتج | Authoritative resource / المورد المرجعي |
| --- | --- | --- | --- |
| Listing / الإدراج | A6 Listing | A2 Listing + branchId | Listing GET state/revision/allowedActions → PUT; no ordinary Catalog browse grant / دون منح تصفح عام |
| Inventory / المخزون | A6 Inventory | A2 Inventory + branchId | A5 read only when authorized → named mutation; mutation-only actors need no generic balance GET / لا تشترط قراءة الرصيد لمن يملك الطفرة فقط |
| Reservations / الحجوزات | A6 Inventory | A2 Inventory + branchId | A3 collection/detail → Reserve/Release/Fulfill under existing contracts / وفق العقود الحالية |
| Transfer / التحويل | A6 Transfer; one set for source and destination / مجموعة واحدة للفرعين | A2 Inventory + source branchId | Read balances only when authorized → one atomic Transfer / قراءات مخولة ثم تحويل ذري واحد |
| Branch Pricing / تسعير الفرع | A6 BranchPricing | A2 BranchPricing + branchId | A4 Branch management fields/actions → override mutation / حقول وأفعال الإدارة ثم الطفرة |
| Branch Reference Cost / تكلفة الفرع المرجعية | A6 BranchReferenceCost | A2 BranchReferenceCost + branchId | A4 independently disclosed Reference Cost → override mutation / كشف مستقل ثم طفرة التجاوز |
| Workspace Pricing / تسعير مساحة العمل | No A6 / دون A6 | A2 WorkspacePricing, no branchId / دون فرع | A4 Workspace management → base mutation / إدارة الأساس ثم الطفرة |
| Workspace Reference Cost / تكلفة مساحة العمل المرجعية | No A6 / دون A6 | A2 WorkspaceReferenceCost, no branchId / دون فرع | A4 independent field/revision → base mutation / حقل ومراجعة مستقلان |

For fresh Branch-scoped Product discovery, show status and disable inactive choices with localized text explaining that an Active Branch is required. A6 returns Active + Inactive for **every** purpose; neither membership in its result nor Active status proves A2 or mutation eligibility. An all-inactive result means “no active Branch for this new workflow,” not “no accessible Branches.” This is Presentation guidance using a server DTO, not a permission/lifecycle policy engine. | للاكتشاف الجديد تعرض الحالة وتعطل الخيارات غير النشطة مع شرح مترجم لاشتراط فرع نشط. تعيد A6 الحالتين لكل غرض؛ لا تعني عضوية القائمة أو النشاط أهلية A2 أو الطفرة. تعني القائمة غير النشطة بالكامل عدم وجود فرع نشط للتدفق الجديد لا غياب الفروع المتاحة، وهذا إرشاد عرض من حمولة الخادم وليس محرك صلاحيات أو دورة حياة.

Do not globally filter out inactive Branches or make A2 success a prerequisite for an already identified resource GET that intentionally permits inactive inspection. Retain such context, for example a resource selected before deactivation or an existing resource URL, and revalidate through its exact resource endpoint. URL identifiers remain untrusted references, never authority or a manual discovery mechanism. If no Product/resource context exists, explain that fresh discovery requires Active; do not fabricate IDs, use another purpose/catalog route to evade A2, or invent historical Product search. Normal Branch changes still clear dependent Product/cursor state; a lifecycle refresh of an existing resource must not erase its permitted inspection view solely because status is Inactive. | لا تحذف الفروع غير النشطة من كل العروض ولا تشترط نجاح A2 لقراءة مورد معروف يسمح عقده بفحص غير النشط. يُحفظ سياق مورد اختير قبل التعطيل أو رابط مورد قائم مع إعادة تحققه عبر مساره؛ المعرفات مراجع غير موثوقة وليست سلطة أو وسيلة اكتشاف يدوي. عند غياب السياق يلزم النشاط للاكتشاف الجديد، دون اختلاق معرفات أو التحايل بغرض آخر أو اختراع بحث تاريخي. يظل تغيير الفرع يمسح الحالة التابعة، لكن تحديث دورة حياة المورد الحالي لا يمحو فحصه المسموح لمجرد تعطيل الفرع.

For new operational mutations, inactive status may disable submission as usability guidance. Never synthesize, extend or rewrite `allowedActions`; never equate them with a lifecycle guarantee. Listing and Branch Pricing reads suppress actions on inactive Branches; Reservation actions currently intersect permission with Reservation status only, so Release/Fulfill can be returned while a fresh mutation rejects `BranchInactive`. Render only server-returned actions, explain inactive/stale state, refetch current resources/options after rejection and require deliberate retry. Inventory reads/mutations retain their own permission checks; A1 is an entry hint where no resource action DTO exists. | قد تعطل الحالة غير النشطة إرسال طفرة جديدة كإرشاد فقط. لا تنشئ أو توسع أو تعدل allowedActions ولا تعتبرها ضمان دورة حياة. تحجب قراءات الإدراج والتسعير أفعال غير النشط، بينما تعتمد أفعال الحجز حالته وصلاحيته فقط وقد تعيد التحرير/التنفيذ مع رفض الطفرة BranchInactive. تعرض الأفعال المعادة فقط ويشرح التعطيل أو التقادم وتعاد قراءة المورد والخيارات قبل إعادة متعمدة، وتحفظ قراءات وطفرات المخزون صلاحياتها مع بقاء A1 تلميح دخول عند غياب DTO أفعال المورد.

**Sufficient entirely in Presentation: yes.** A6 status, existing resource reads/actions, A2 rejection and mutation errors supply the distinction. No server contract is missing for this scope. | **تكفي معالجة التمييز في العرض: نعم.** توفر حالة A6 وقراءات وأفعال الموارد ورفض A2 وأخطاء الطفرات العقود اللازمة دون عقد خادم مفقود لهذا النطاق.

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

Use A6 `Transfer`, authorized only by `inventory.transfer`, for the same source/destination option set; A6 Inventory deliberately excludes transfer-only authority. Product discovery remains A2 `Inventory` with source `branchId`. Disable inactive options for a new Transfer and destination equal to source only for usability. Inventory remains authoritative for same Workspace, both Branch scopes, source != destination, activity, Product, quantity, stock, deterministic locks, atomic writes/rollback and idempotency. Existing replay returns the stored outcome under current disclosure; it is not a new mutation or a fresh lifecycle guarantee. | يستخدم التحويل غرض A6 Transfer بصلاحية inventory.transfer وحدها ومجموعة واحدة للفرعين؛ لا تقبل A6 Inventory صاحب التحويل وحده. يبقى اكتشاف المنتج عبر A2 Inventory ومعرف المصدر. تعطيل غير النشط والوجهة المطابقة إرشاد فقط؛ يفرض المخزون مساحة العمل والنطاقين والاختلاف والنشاط والمنتج والكمية والرصيد والأقفال والذرية والتراجع والتكرار الآمن. تعيد إعادة الطلب نتيجته المخزنة بالكشف الحالي ولا تمثل طفرة جديدة أو ضمان نشاط.

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

Create bounded Domain-aligned clients with injected fetch ports: an Identity capability client; a Workspace Branch client with separate general-management and A6 operational-selector methods; a Catalog Query operational-product client; a Catalog Branch Product Listing/Pricing client; and an Inventory management client. Each uses same-origin credentials, `cache: "no-store"`, exact allow-listed DTOs, envelope/field validation, and normalized failures. Pure `operations-query-state.ts` and the route-level Presentation coordinator live under Workspace Branch Presentation and own purpose selection, dependent-state reset, request keys, mutation lifecycle, refetch rules, and operation-ID lifecycle only. React never imports repositories, Domain entities, or infrastructure runtimes. Do not turn the existing Catalog Query, Identity, or Reference Data clients into a generic framework. | تنشأ عملاء محدودة وموزعة حسب المجال مع fetch محقون: للقدرات والفروع واكتشاف المنتج والإدراج/التسعير والمخزون. يستخدم كل عميل بيانات الاعتماد من المصدر نفسه وعدم التخزين وDTO مسموحاً به وتحليلاً صارماً. تعيش حالة URL والمنسق على مستوى الصفحة مع عرض الفروع وتملك تنسيق الطلب فقط. لا تستورد React المستودعات أو كيانات المجال ولا تحول العملاء الحاليين إلى إطار عام.

## 20. Component boundaries | حدود المكونات

| Component/boundary | Responsibility and state | Business-rule constraint / accessibility |
| --- | --- | --- |
| `OperationsPage` | Client composition, request keys, selected URL state | No authorization rules; page heading/status regions |
| `OperationsNavigation` | Capability-shaped primary sections | Semantic nav, keyboard/focus; booleans are hints only |
| `BranchSelector` / `OperationalProductSelector` | A6 four-field ordered options/status; A2 q/cursor selection | Local filtering of authorized Branch labels/codes only; inactive guidance per section 10; no Product scope/lifecycle filtering after pagination; labeled controls |
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

1. **3.22-P1 — Operations shell, strict types/client, capabilities, URL state, general Branch collection/management, A6 Branch selectors and A2 Product selectors.** **`P1CompletionGate: PASS`**, implementation complete, awaiting independent review; live browser QA debt remains. / **اكتمل التنفيذ وتنتظر P1 المراجعة المستقلة مع بقاء دين تحقق المتصفح.**
2. **3.22-P2 — Listing.** Small state/revision/action workflow on the Branch/Product selector.
3. **3.22-P3 — Inventory read and basic mutations.** Implement A5 exhaustive rendering and Receive/Issue/Correct/Damage/Restore.
4. **3.22-P4 — Reservations.** Actionable page/detail plus Reserve/Release/Fulfill and cursor/stale-state recovery.
5. **3.22-P5 — Transfer.** Atomic request, idempotency UX, two-Branch refresh.
6. **3.22-P6 — Workspace pricing and Reference Cost.** Partial fields, shared Product revision, independent Reference Cost revision.
7. **3.22-P7 — Branch overrides.** Base/override/effective/source and override revision/actions.
8. **3.22-P8 — Integration hardening.** Navigation, bilingual copy, responsive/accessibility/touch/mouse/keyboard verification, and security regression.

P1 must implement strict A6 parsing, exact-purpose request coordination, no general-list fallback, inactive/new-workflow versus existing-resource context, and session-change clearing of options/pending responses. P1 includes its own English/Arabic, LTR/RTL, mobile/tablet/desktop and touch/mouse/keyboard QA; these are not postponed to P8. P2–P8 remain planned, unstarted and separately approval-gated; no Listing/Inventory/Reservation/Transfer/Pricing editors are included in P1. | يجب أن تنفذ P1 تحليل A6 الصارم وتنسيق أغراضها دون fallback وتمييز التدفق الجديد عن سياق المورد القائم ومسح الخيارات والنتائج المعلقة عند تغير الجلسة. تشمل P1 تحقق اللغتين والاتجاهين والجوال واللوحي وسطح المكتب واللمس والفأرة واللوحة ولا يؤجل إلى P8. تبقى P2–P8 مخططة وغير مبدوءة وتتطلب اعتماداً مستقلاً؛ لا تضم P1 محررات الإدراج أو المخزون أو الحجوزات أو التحويل أو التسعير.

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

- Next bounded implementation: P1 only after this reconciliation review. A6 is completed/merged; P2–P8 require their own subsequent approval.
- Existing shell/shared UI/i18n conventions and strict Domain-owned HTTP contracts.
- Explicit authoritative refetch, safe conflict handling, semantic non-disclosure, and full responsive/accessibility QA.

- التنفيذ التالي المحدود هو P1 فقط بعد مراجعة المصالحة. اكتملت A6 ودُمجت، وتتطلب P2–P8 اعتماداً لاحقاً مستقلاً، مع حفظ ضوابط العرض المذكورة.

## 26. WILL NOT IMPLEMENT | لن ينفذ

Public Product Share Link, anonymous access, `wa.me`, WhatsApp Cloud API/backend messaging, Product Entry, Reference Data or ordinary Catalog redesign, Inventory/pricing history redesign, new permissions, schema/migration `0016`, new Domain/repository/authentication system, generalized Multi-Warehouse, ERP/purchasing/orders/accounting/tax/FX/promotions/analytics/AI, approval workflow, Product version history, Production deployment, a generic BFF, or client-owned business authority. | لن تنفذ المشاركة العامة أو المجهولة أو WhatsApp أو إدخال المنتج أو إعادة تصميم البيانات المرجعية/الكتالوج/السجل أو صلاحيات/مخطط/ترحيل/مجال/مستودع/مصادقة جديدة أو ERP وما شابه أو نشر الإنتاج أو BFF عام أو سلطة أعمال في العميل.

## 27. ADR decision | قرار ADR

**`ADR NOT REQUIRED`.** This gate composes merged A1–A6 and existing resource contracts within current ownership. **NO DOMAIN CHANGE; NO REPOSITORY CONTRACT CHANGE; NO NEW PERMISSION.** No new architecture decision is introduced. | **لا حاجة إلى ADR**؛ تركب البوابة العقود المدمجة ضمن ملكياتها الحالية دون قرار معماري جديد أو تغيير مجال أو عقد مستودع أو صلاحية جديدة.

## 28. Database/migration decision | قرار قاعدة البيانات والترحيل

**`NO DATABASE CHANGE`.** Task 3.22 Presentation consumes existing reads and writes. The migration chain remains `0000–0015`; migration `0016` and the Reservation candidate index remain unnecessary and unapproved. | **`NO DATABASE CHANGE`**؛ تستهلك الواجهة العقود الحالية، وتبقى سلسلة الترحيلات `0000–0015` ولا يعتمد `0016` أو فهرس الحجوزات المرشح.

## 29. Dependency decision | قرار الاعتماديات

**`NO NEW DEPENDENCY`.** Existing Next.js, React, TypeScript, CSS, browser APIs, shared controls, and repository test/build tools are sufficient. | **`NO NEW DEPENDENCY`**؛ تكفي التقنيات وعناصر الواجهة وواجهات المتصفح وأدوات الاختبار والبناء الحالية.

## 30. Final planning decision | قرار التخطيط النهائي

**Decision: `ApprovedNextImplementation` — Task 3.22-P1 only.** Merged A6 closes Branch discovery for independently authorized operational actors. The Active/Inactive distinction is fully expressible using A6 status and existing server contracts. No additional API or server remediation is required. Presentation remains unstarted; P2–P8 are planned and not approved as one task. Stop for reconciliation review; no implementation in this task. | **القرار: `ApprovedNextImplementation` للمهمة 3.22-P1 فقط.** تحل A6 المدمجة اكتشاف الفرع لأصحاب الصلاحيات التشغيلية المستقلة، ويمكن التعبير عن تمييز النشاط من حالتها وعقود الخادم الحالية دون API أو معالجة خادم إضافية. تبقى الواجهة غير مبدوءة وP2–P8 مخططة دون اعتماد مجمع. التوقف لمراجعة المصالحة دون تنفيذ هنا.
