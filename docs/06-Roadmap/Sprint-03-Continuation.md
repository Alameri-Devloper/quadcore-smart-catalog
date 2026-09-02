# Sprint 03 Continuation — Post-Task 3.19 | استمرار Sprint 03 بعد المهمة 3.19

**Status:** Task 3.22-A1 implementation is complete / ReadyForReview; A2 is not implementation-approved before independent A1 review and merge · **Current-state baseline:** `3fa5605bb5f17726eae4805ca768cc90b5b0a213` / PR #27 · **Updated:** 2026-09-02

> **Task 3.22-A1 implementation decision | قرار تنفيذ المهمة 3.22-A1:** Baseline `3fa5605bb5f17726eae4805ca768cc90b5b0a213` contains the approved Reservation gate through PR #27. A1 is implemented and ReadyForReview with a repository-free Identity capability projection and no schema, migration, dependency, or permission-registry change. A2 is not automatically approved before independent A1 review and merge; A3–A5 are not started, and Task 3.22 Presentation remains blocked. | يحتوي خط الأساس بوابة الحجوزات المعتمدة عبر طلب السحب #27. نُفذت A1 وهي جاهزة للمراجعة دون مخطط أو ترحيل أو اعتماد أو تغيير سجل الصلاحيات. لا تعتمد A2 تلقائياً قبل مراجعة A1 ودمجها، ولم تبدأ A3–A5، وتبقى واجهة 3.22 محجوبة.

## English

### Reconciliation outcome

Tasks 3.14–3.21 are completed and merged foundations. The current integration baseline is `3fa5605bb5f17726eae4805ca768cc90b5b0a213` through PR #27; PR #26 at `69f0bd48628a5ae4018504dae8bce1d11b0d8d43` remains the historical Planning-R2 baseline. A1 is implemented and ReadyForReview. A2 is not implementation-approved before independent A1 review and merge.

Legacy Catalog mocks remain fixtures only. They are not Production truth and must not back the next Presentation.

### Candidate evaluation and ADR status

| Candidate | Value and dependency position | ADR status | Roadmap disposition |
| --- | --- | --- | --- |
| Canonical Catalog browsing Presentation | Makes the merged 3.18 query/search boundary usable; prerequisite host for Product Details and sharing | No ADR; existing architecture is sufficient | Included in Task 3.20 |
| Product Details Presentation | Completes browse-to-inspect workflow using the existing permission-filtered detail read model | No ADR | Included in Task 3.20 |
| Direct Device Sharing UI integration | Converts the completed 3.19 boundary into a reachable customer workflow without a new channel | No ADR | Included in Task 3.20 |
| Public Product Share Link | High customer value, but creates a new anonymous security, lifecycle, media, privacy, and price-authority boundary | ADR required | Deferred; excluded from Task 3.20 |
| WhatsApp-oriented customer sharing | Native target selection already works indirectly; `wa.me`, Cloud API, and backend delivery introduce distinct phone/recipient/provider policies | ADR required for a dedicated WhatsApp channel; provider/backend delivery always requires ADR | Deferred; excluded from Task 3.20 |
| Operational management contract remediation | Resolves read/manage composition, one canonical mixed-lifecycle Product query, exact Reservation pagination, shared Product pricing concurrency, Inventory disclosure, and effective semantic capabilities before Presentation work | A1 preserves Option D with no ADR/new permission; current Reservation index remains sufficient | Task 3.22-A1 — implemented / ReadyForReview; A2 not yet approved |
| Branch/Inventory/Pricing management Presentation | Consumes the corrected contracts only after 3.22-A is implemented, reviewed, and merged | Existing architecture remains sufficient | Task 3.22 — Planned / blocked, not approved |
| Reference Data management Presentation | Makes 3.16 management APIs usable and supports Workspace setup | No ADR; implemented within the approved contract | Task 3.21 — Completed / merged through PR #24 |

Combining browsing, details, and existing direct sharing is one coherent vertical slice: find a Product, inspect the Product, then prepare/share its approved customer payload. Separating any one of these would leave either an incomplete navigation path or the completed sharing component unreachable. Adding public access, management mutations, or provider delivery would expand the architecture and is not part of that slice.

### Public-sharing decision analysis

A Public Product Share Link is not a small extension of Direct Device Sharing. It would have to define all of the following before implementation:

- whether and how anonymous callers are authorized;
- a dedicated public read model that cannot expose Workspace identity, wholesale, Reference Cost, exact Inventory, internal lifecycle, storage keys, or other private fields;
- a non-enumerable public identifier that is not the canonical Product ID;
- issuance, activation, revocation, expiry, Product archive/unpublish, Branch unlisting, and deletion behavior;
- whether a link is Workspace-wide or Branch-specific and which Retail price/availability is authoritative when opened later;
- SEO indexing/canonical metadata versus privacy and tenant discoverability;
- public media transformation, caching, invalidation, abuse/bandwidth limits, and failed-media behavior;
- audit/observability without collecting unnecessary recipient or visitor data.

These choices are security- and product-policy decisions, so Public Product Share Links remain ADR-gated rather than being forced into Task 3.20.

### WhatsApp boundary analysis

The following are different capabilities and must not be conflated:

- **Native device share:** Task 3.19 hands safe text/media to the operating system. The user may choose WhatsApp if installed; QSC does not select a recipient or know delivery. This is ready for Task 3.20 integration.
- **`wa.me` navigation:** QSC selects WhatsApp-oriented navigation and therefore needs authoritative employee/store phone fallback, recipient/privacy/consent, text/link, and unsupported-device policy. This requires a dedicated approved decision/task.
- **WhatsApp Cloud API/provider:** QSC integrates provider credentials, templates, consent, rate/cost, and webhooks. An ADR is mandatory.
- **Backend sending:** QSC owns queues, retries, idempotency, delivery state, retention, and audit. An ADR is mandatory even if the provider is already selected.

The existing Identity recovery WhatsApp delivery port does not authorize or define Catalog marketing/product sharing; its purpose, payload, consent, and retention boundary are different.

## Task 3.20 — Canonical Catalog Browsing, Product Details, and Direct Share Presentation

**Status:** Completed / Merged

Task 3.20 merged through PR #22 into `feature/product-entry-engine` and is present in baseline `e2719cda489aa52b8baf51f985cf0b360292874d`. The future-tense wording below is retained as the historical implementation contract; it is not current next-task authority.

### Objective

Deliver one Production, authenticated, bilingual, responsive Catalog workflow that lets an authorized user browse/search/filter Products, inspect Product Details, and invoke the existing customer-safe Direct Device Sharing flow.

### User and business value

The merged Catalog data and operations become usable in daily sales work: staff can find the correct Product in a Branch-aware view, inspect trustworthy details, and hand a customer an approved price/specification/media summary through the device. This closes the largest visible gap without creating a public-access or messaging-provider commitment.

### Primary workflow

1. An authenticated user with Catalog view authority opens the canonical Catalog.
2. The page loads Product Cards from the Task 3.18 API and offers the supported search, active filters, sort choices, and cursor navigation.
3. When an existing trusted Branch context is available, the user may browse within an allowed Branch; the server remains authoritative for scope.
4. The user opens Product Details, including authorized price/availability fields, ordered media, and persisted specifications.
5. If Direct Sharing is available, the user explicitly prepares a Retail or Wholesale customer payload and then invokes native share; Clipboard and selectable-text fallbacks remain available.
6. The user can return to the preserved Catalog query state.

### Bounded scope

Task 3.20 will:

- add the canonical authenticated Catalog browse and Product Details Presentation routes/surfaces;
- compose typed Presentation clients/hooks/coordinators over the existing Task 3.18 endpoints;
- support only the search, filters, sorts, cursor pagination, Branch context, and DTO fields already authorized by Task 3.18;
- connect the existing Task 3.19 `DirectProductShare` workflow from Product Details without duplicating its business rules;
- provide loading, empty, setup-needed where supported, validation, unavailable, forbidden/non-disclosing, retryable-error, and media-degradation states;
- preserve query/filter/sort/cursor state across details navigation where browser navigation allows;
- provide English/Arabic and LTR/RTL behavior with equal mobile, tablet, and desktop support;
- verify touch, mouse, and keyboard interaction plus focus, labels, announcements, contrast, and reduced-motion-safe behavior.

### Dependencies

- Task 3.18 Catalog Query and Search APIs and DTOs are the browsing/details authority.
- Task 3.19 Direct Device Sharing use cases, routes, media handoff, adapter, and component are the sharing authority.
- Task 3.16 Reference Data supplies scoped labels/filter choices; Task 3.17 supplies Branch listing, effective prices, and Inventory visibility; Product Media supplies approved media.
- Existing trusted Identity/session, permission, Branch-scope, routing, localization, and design-system conventions remain authoritative.
- No new library is approved. A dependency change would require explicit approval and re-scoping.

### Architecture and data ownership

- Presentation coordinates view state and user interaction only. React must not own Product, price, listing, Inventory, sharing, permission, or tenant business rules.
- `domains/catalog/query` remains the read authority; `domains/catalog/sharing` remains the share-payload authority. Task 3.20 creates no competing repository or read model.
- Production must call the typed HTTP adapters. Legacy mocks may be used only in isolated tests/fixtures and there must be no Production fallback to them.
- Browser state may hold navigation/filter state, but it must not become canonical business data or persist sensitive share/media payloads.
- No component may access PostgreSQL or infrastructure repositories directly.

### Security, multi-tenancy, permissions, and privacy

- The workflow is authenticated and private. It adds no anonymous/public route and retains `private, no-store` server responses.
- Workspace, actor, permissions, and Branch authority come only from `TrustedActorContext`; browser IDs are untrusted input and server validation remains decisive.
- Catalog access requires `catalog.products.view`. Retail, Wholesale, availability, and exact quantities remain field-omission decisions of the existing server boundary. Ordinary internal Reference Cost visibility requires the complete existing composition `pricing.view` and `referenceCost.view`, never `referenceCost.view` alone.
- Presentation renders only returned authorized fields and must not infer, synthesize, cache, or reveal omitted values. Reference Cost, if returned in internal details, must be clearly internal and must never enter customer sharing.
- Direct payload preparation remains guarded by `catalog.sharing.create`, `catalog.products.view`, the selected price permission, trusted Branch scope, Published lifecycle, and explicit Branch listing.
- Foreign, out-of-scope, unauthorized, unlisted, unpublished, and missing resources remain non-disclosing. UI wording must not reveal which condition occurred.
- Storage keys, checksums, exact Inventory quantities in share output, member data, Workspace IDs, raw permissions, and provider secrets must never reach the customer share UI.

### API and Presentation boundaries

Task 3.20 will consume, not redesign:

- `GET /api/catalog/products`;
- `GET /api/catalog/products/[productId]`;
- `GET /api/catalog/filters`;
- the existing Task 3.19 Direct Share preparation and authenticated-media routes.

No new business API is expected. A discovered contract defect must be reproduced and handled as the smallest separately justified correction; convenience-driven endpoint expansion is out of scope. UI components depend on Presentation coordinators/typed adapters, not route parsing or repository code.

### Database and migration expectations

No schema change, migration, seed/bootstrap data, Production database operation, or new persistence is expected. Existing tables and migration chain through Task 3.18 remain the data authority. If implementation proves persistence is genuinely required, Task 3.20 must stop and be re-scoped before any schema work.

### Test and QA expectations

- Focused tests for Presentation coordinators, query-state transitions, loading/empty/error/non-disclosure states, field omission, and details navigation.
- Integration tests proving typed adapters use the existing endpoints without mock fallback and preserve query/Branch/cursor contracts.
- Direct-share integration tests for prepare/share separation, Retail/Wholesale selection, permission failures, cancellation, native share, Clipboard, selectable text, and media degradation.
- Accessibility tests for semantic controls, accessible names, focus order/restoration, status announcements, keyboard operation, and direction changes.
- Manual browser QA in English/LTR and Arabic/RTL at representative mobile, tablet, and desktop viewports using touch-equivalent, mouse, and keyboard paths.
- Relevant Catalog Query, Direct Sharing, Identity/session, Product Media, Reference Data, Branch/Inventory/Pricing, typecheck, lint, build, and guarded test-database regressions only when the implementation task requires them. Never use Production data.

### WILL

- Deliver a canonical authenticated Catalog browse → details → direct-device-share workflow.
- Reuse the merged query and sharing boundaries exactly as sources of truth.
- Treat mobile, tablet, desktop, English, Arabic, touch, mouse, and keyboard as first-class.
- Preserve server-side authorization, tenant isolation, Branch scoping, price authority, and customer-safe sharing.

### WILL NOT

- Add a public/anonymous Catalog or Product URL.
- Add `wa.me`, WhatsApp Cloud API, a messaging provider, backend sending, recipients, delivery receipts, or analytics.
- Add Catalog, Reference Data, Branch, Inventory, or Pricing mutation/management UI.
- Add new business rules, repositories, data projections, schema, migrations, seed data, dependencies, AI/NLP search, or a new media policy.
- Use legacy Catalog mocks, browser-supplied permissions, or client-side filtering as Production authority.
- Redesign Product Entry, Identity, Product Media, Reference Data, Branch/Inventory/Pricing, Catalog Query, or Direct Sharing.

### Acceptance criteria

1. An authorized authenticated user can reach one canonical Catalog surface; unauthorized/restricted users fail closed without tenant/resource disclosure.
2. Product Cards load exclusively from Task 3.18 and support its defined search, filters, sorts, Branch context, and cursor behavior; Production has no mock fallback.
3. Cards and Details render only fields returned by the server. Hidden Wholesale, Reference Cost, availability, or quantity cannot be reconstructed or exposed by UI state.
4. Opening Details preserves the Product’s historical persisted specification values and approved media order as returned by Task 3.18.
5. Branch-scoped browsing never treats a browser-supplied Branch ID as authority; out-of-scope and foreign Branch/Product cases remain non-disclosing.
6. Direct Sharing is reachable from Details through the existing 3.19 component/boundary and keeps preparation separate from the explicit device-share action.
7. Direct share output contains no Reference Cost, exact Inventory quantities, storage keys, Workspace/member data, or unauthorized price; zero/missing/unsupported Money states preserve 3.19 semantics.
8. Native share, cancellation, Clipboard, selectable-text fallback, and missing/failed media produce accessible, deterministic states without claiming a target, recipient, or delivery.
9. Loading, empty, unavailable, validation, retryable failure, and back-navigation/query-restoration states are implemented and tested.
10. English/LTR and Arabic/RTL layouts pass representative mobile, tablet, and desktop QA; all core actions work by touch-equivalent input, mouse, and keyboard with visible focus and accessible names/status.
11. No direct database access exists in components, no duplicate business/repository authority is introduced, and no new dependency, schema, migration, or Production database operation occurs.
12. Focused and relevant regression gates pass, documentation is bilingual, Git integrity is preserved, and the implementation is submitted for independent review without self-approval.

### Risks and controls

| Risk | Control |
| --- | --- |
| Presentation recreates permission or price rules | Render server DTO presence only; keep all authority in existing use cases. |
| Branch selector leaks or overclaims scope | Source choices from trusted existing context and revalidate every request server-side. |
| Query state becomes inconsistent across navigation | One typed coordinator owns normalized UI state and cursor invalidation/restoration. |
| Share call loses user activation | Keep prepare and native-share actions explicit and preserve the 3.19 adapter contract. |
| Responsive/RTL integration exposes late layout defects | Treat all three viewport classes and both directions as acceptance gates. |
| Scope expands into public sharing or management | Enforce WILL NOT boundaries and require a separately approved task/ADR. |

### What becomes possible after Task 3.20

- Sales staff can complete the private Catalog discovery-to-device-share workflow.
- Reference Data and operational management Presentations can be implemented against proven foundations.
- A future Public Product Share ADR can evaluate a real private workflow without conflating it with anonymous delivery.
- A future WhatsApp decision can choose `wa.me`, provider/API, or backend sending from an explicit boundary rather than assuming native share equals delivery.

### Current planning decision

- **Task 3.21 — Catalog Reference Data Management Presentation — Completed / merged:** merged through PR #24 at `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.
- **Task 3.22-A1 — Authorization Policies and Semantic Capabilities — implemented / ReadyForReview:** use the [A1 Final Report](../05-Development/Reports/QSC-Task-3.22-A1-Final-Report.md). A2 is not automatically approved before independent A1 review and merge; A3–A5 are not started.
- **Task 3.22 — Branch, Inventory, and Pricing Management Presentation — Planned / blocked, not implementation-approved:** it remains blocked until all 3.22-A slices are independently reviewed and merged.
- No later task is approved.

Task 3.22-A preserves operation-specific management reads plus effective semantic server-derived capabilities owned by Identity Application. It rejects global manage-implies-view and raw browser authority. A2 uses one mixed Draft+Published query; A3 implements the exact live keyset using the sufficient current index; A4 uses shared Product revision for Retail/Wholesale and an independent Reference Cost revision. The Candidate Optimization remains unnecessary and unapproved. Task 3.22 Presentation does not start while the A slices remain unmerged.

## العربية

### نتيجة المصالحة

تمثل المهام 3.14–3.21 أسساً مكتملة ومدمجة. خط الأساس الحالي هو `3fa5605bb5f17726eae4805ca768cc90b5b0a213` عبر طلب السحب #27، ويبقى `69f0bd48628a5ae4018504dae8bce1d11b0d8d43` عبر طلب السحب #26 خط تخطيط-R2 التاريخي. نُفذت A1 وهي جاهزة للمراجعة، ولا تعتمد A2 للتنفيذ قبل مراجعة A1 ودمجها.

تبقى بيانات الكتالوج الوهمية القديمة fixtures فقط، وليست حقيقة الإنتاج ولا يجوز أن تشغّل واجهة العرض التالية.

### تقييم المرشحين وحالة ADR

| المرشح | القيمة وموقع الاعتماد | حالة ADR | قرار الخارطة |
| --- | --- | --- | --- |
| واجهة تصفح الكتالوج المعتمدة | تجعل حدود استعلام وبحث 3.18 المدمجة قابلة للاستخدام، وهي المضيف اللازم للتفاصيل والمشاركة | لا يحتاج ADR؛ المعمارية الحالية كافية | ضمن 3.20 |
| واجهة تفاصيل المنتج | تكمل سير التصفح إلى الفحص باستخدام نموذج التفاصيل المرشح بالصلاحيات | لا يحتاج ADR | ضمن 3.20 |
| ربط واجهة المشاركة المباشرة عبر الجهاز | يجعل حدود 3.19 المكتملة قابلة للوصول دون قناة جديدة | لا يحتاج ADR | ضمن 3.20 |
| رابط مشاركة منتج عام | قيمته مرتفعة لكنه ينشئ حدود أمان مجهولة ودورة حياة وسياسة وسائط وخصوصية وسلطة سعر جديدة | ADR مطلوب | مؤجل وخارج 3.20 |
| مشاركة موجهة إلى WhatsApp | اختيار الهدف الأصلي يعمل بصورة غير مباشرة؛ أما `wa.me` وCloud API والإرسال الخلفي فتضيف سياسات هاتف ومستلم ومزود مستقلة | ADR مطلوب لقناة WhatsApp مستقلة، ومطلوب دائماً للمزود أو الإرسال الخلفي | مؤجل وخارج 3.20 |
| تصحيح عقود إدارة العمليات | يحل تركيب القراءة/الإدارة والاستعلام التشغيلي ومؤشر الحجوزات وتزامن التسعير وكشف المخزون والقدرات | تحفظ A1 الحل الهجين دون ADR أو صلاحية جديدة، ويبقى الفهرس الحالي كافياً | المهمة 3.22-A1 — منفذة / جاهزة للمراجعة؛ A2 غير معتمدة بعد |
| واجهة إدارة الفروع والمخزون والتسعير | تستهلك العقود المصححة فقط بعد تنفيذ 3.22-A ومراجعتها ودمجها | تكفي المعمارية الحالية | المهمة 3.22 — مخططة ومحجوبة وغير معتمدة |
| واجهة إدارة البيانات المرجعية | تجعل واجهات إدارة 3.16 قابلة للاستخدام وتدعم إعداد مساحة العمل | لا يحتاج ADR؛ نُفذت ضمن العقد المعتمد | المهمة 3.21 — مكتملة ومدمجة عبر طلب السحب #24 |

يجمع التصفح والتفاصيل والمشاركة الحالية شريحة رأسية واحدة: العثور على المنتج ثم فحصه ثم تجهيز ومشاركة حمولته الآمنة للعميل. فصل أحدها يترك مسار تنقل ناقصاً أو مكوّن المشاركة غير قابل للوصول. أما الوصول العام أو تعديلات الإدارة أو تسليم المزود فتوسع المعمارية وليست جزءاً من هذه الشريحة.

### تحليل قرار المشاركة العامة

رابط المنتج العام ليس امتداداً صغيراً للمشاركة عبر الجهاز. يجب أن يحدد قبل التنفيذ التفويض المجهول، ونموذج قراءة عاماً يمنع هوية مساحة العمل والجملة والتكلفة المرجعية والمخزون الدقيق والحالات الداخلية ومفاتيح التخزين، ومعرفاً عاماً غير قابل للتعداد ومنفصلاً عن معرف المنتج، ودورة الإصدار والتفعيل والإلغاء والانتهاء والأرشفة، وسلوك إلغاء نشر المنتج أو إدراجه، وسياق الفرع وسلطة السعر والإتاحة عند الفتح لاحقاً، وسياسة SEO والخصوصية، وتسليم الوسائط وتخزينها وحدود الإساءة، والمراقبة دون جمع بيانات زائر أو مستلم غير لازمة. لذلك يبقى مشروطاً بقرار ADR وخارج 3.20.

### تحليل حدود WhatsApp

- **المشاركة الأصلية عبر الجهاز:** تسلّم 3.19 نصاً ووسائط آمنة لنظام التشغيل، وقد يختار المستخدم WhatsApp إن كان مثبتاً، ولا يعرف QSC المستلم أو التسليم. هذه جاهزة للربط في 3.20.
- **الانتقال عبر `wa.me`:** يختار QSC مساراً موجهاً إلى WhatsApp، فيحتاج مصدر هاتف معتمداً وقواعد رجوع رقم الموظف/المتجر وسياسات المستلم والخصوصية والموافقة والنص/الرابط والبديل. يحتاج قراراً ومهمة مستقلين.
- **WhatsApp Cloud API أو مزود:** يضيف أسراراً وقوالب وموافقة وحدوداً وتكلفة وwebhooks؛ وADR إلزامي.
- **الإرسال من الخادم:** يحمّل QSC ملكية الطوابير والإعادة والثبات وحالة التسليم والاحتفاظ والتدقيق؛ وADR إلزامي حتى بعد اختيار المزود.

منفذ WhatsApp الموجود لاستعادة الهوية لا يعتمد ولا يعرّف مشاركة منتجات الكتالوج؛ فالهدف والحمولة والموافقة والاحتفاظ مختلفة.

## المهمة 3.20 — واجهة تصفح الكتالوج وتفاصيل المنتج والمشاركة المباشرة

**الحالة:** مكتملة / مدمجة

دُمجت المهمة 3.20 عبر طلب السحب #22 في `feature/product-entry-engine` وهي موجودة في خط الأساس `e2719cda489aa52b8baf51f985cf0b360292874d`. تُحفظ صياغة المستقبل أدناه بوصفها عقد التنفيذ التاريخي، وليست سلطة المهمة التالية الحالية.

### الهدف والقيمة

تسليم سير كتالوج إنتاجي موثق وثنائي اللغة ومتجاوب يتيح للمستخدم المخول تصفح المنتجات والبحث والترشيح، وفحص التفاصيل، واستدعاء المشاركة الآمنة الموجودة عبر الجهاز. بذلك تصبح البيانات والعمليات المدمجة قابلة للاستخدام في عمل المبيعات اليومي دون التزام بوصول عام أو مزود رسائل.

### سير المستخدم الأساسي

1. يفتح مستخدم موثق يملك صلاحية عرض الكتالوج سطح الكتالوج المعتمد.
2. تحمل الصفحة بطاقات المنتج من واجهة 3.18 وتعرض البحث والمرشحات النشطة والترتيب والتنقل بالمؤشر.
3. عند توفر سياق فرع موثوق موجود يمكن التصفح ضمن فرع مسموح، ويبقى الخادم سلطة النطاق.
4. يفتح المستخدم التفاصيل بما فيها الحقول السعرية والإتاحة المصرح بها والوسائط المرتبة والمواصفات المحفوظة.
5. إذا توفرت المشاركة، يجهز المستخدم صراحة حمولة تجزئة أو جملة ثم يستدعي مشاركة الجهاز، مع بقاء بديل الحافظة والنص القابل للتحديد.
6. يعود المستخدم إلى حالة استعلام الكتالوج المحفوظة.

### النطاق المحدد

ستضيف 3.20 أسطح التصفح والتفاصيل الموثقة، وتنسق محولات وخطافات وطبقة عرض مكتوبة بالأنواع فوق واجهات 3.18، وتدعم فقط البحث والمرشحات والترتيب والمؤشرات وسياق الفرع والحقول المعتمدة، وتربط مكوّن `DirectProductShare` من التفاصيل دون تكرار قواعده. ستوفر حالات التحميل والفراغ والحاجة للإعداد عند دعمها والتحقق وعدم الإتاحة والرفض غير الكاشف والفشل القابل للإعادة وتدهور الوسائط، وتحفظ حالة الاستعلام عند التنقل، وتدعم الإنجليزية/العربية وLTR/RTL والجوال واللوحي وسطح المكتب واللمس والفأرة ولوحة المفاتيح وإمكانية الوصول.

### الاعتمادات والملكية المعمارية

- واجهات ونماذج 3.18 هي سلطة التصفح والتفاصيل، وحدود 3.19 هي سلطة حمولة المشاركة.
- توفر 3.16 التسميات والمرشحات، وتوفر 3.17 الإدراج والسعر الفعلي ورؤية المخزون، وتوفر وسائط المنتج الصور المعتمدة.
- تنسق طبقة العرض حالة الواجهة والتفاعل فقط؛ ولا تملك React قواعد المنتج أو السعر أو الإدراج أو المخزون أو المشاركة أو الصلاحيات أو المستأجر.
- تستدعي الإنتاج محولات HTTP المكتوبة بالأنواع فقط. لا رجوع إلى البيانات الوهمية، ولا وصول من المكوّنات إلى PostgreSQL أو المستودعات.
- لا يُعتمد أي اعتماد برمجي جديد، ويتطلب أي تغيير اعتماد موافقة وإعادة تحديد نطاق.

### الأمان وتعدد المستأجرين والصلاحيات والخصوصية

- يبقى السير خاصاً وموثقاً ولا يضيف مساراً عاماً أو مجهولاً، وتبقى استجابات الخادم `private, no-store`.
- تأتي مساحة العمل والممثل والصلاحيات ونطاق الفرع من `TrustedActorContext` فقط، ويعيد الخادم التحقق من كل معرف يرسله المتصفح.
- يتطلب الدخول `catalog.products.view`. يبقى إظهار التجزئة والجملة والإتاحة والكميات الدقيقة قرار حذف حقول في الخادم. ويتطلب عرض التكلفة المرجعية الداخلي العادي التركيب الكامل من `pricing.view` و`referenceCost.view`، ولا تكفي الثانية وحدها.
- تعرض الواجهة الحقول المعادة فقط ولا تستنتج القيم المحذوفة. وإن عادت التكلفة المرجعية في تفاصيل داخلية فتوسم كداخلية ولا تدخل المشاركة أبداً.
- تبقى المشاركة محمية بـ`catalog.sharing.create` وعرض المنتج وصلاحية السعر ونطاق الفرع ودورة Published والإدراج الصريح.
- تبقى الموارد الأجنبية أو الخارجة عن النطاق أو غير المخولة أو غير المدرجة أو غير المنشورة غير كاشفة، ولا تشرح الواجهة سبب الغياب الداخلي.

### حدود API والعرض وتوقع قاعدة البيانات

تستهلك 3.20 ولا تعيد تصميم `GET /api/catalog/products` و`GET /api/catalog/products/[productId]` و`GET /api/catalog/filters` ومسارات تجهيز المشاركة والوسائط الموجودة من 3.19. لا يتوقع API أعمال جديد. عند اكتشاف عيب حقيقي يعاد إنتاجه ويصحح بأصغر تغيير مبرر؛ ولا يسمح بتوسعة راحة. لا يتوقع مخطط أو ترحيل أو seed أو حفظ جديد أو عملية على قاعدة الإنتاج. إذا ثبت احتياج الحفظ تتوقف المهمة لإعادة تحديدها.

### توقعات الاختبار وQA

تشمل الاختبارات منسقات العرض وانتقالات حالة الاستعلام والحالات الفارغة والخاطئة وغير الكاشفة وحذف الحقول والتنقل، وتكاملاً يثبت استعمال الواجهات الموجودة دون mock، وتكامل المشاركة للتجهيز والفعل الصريح والتجزئة والجملة والرفض والإلغاء والمشاركة الأصلية والحافظة والنص وتدهور الوسائط، واختبارات إمكانية الوصول. يلزم QA يدوي بالإنجليزية/LTR والعربية/RTL على الجوال واللوحي وسطح المكتب وبمسارات اللمس المكافئ والفأرة ولوحة المفاتيح. تشغّل الانحدارات ذات الصلة فقط، وتستخدم قاعدة اختبار محروسة عند الحاجة ولا تستخدم بيانات الإنتاج.

### ستفعل

- تسليم سير موثق للتصفح ثم التفاصيل ثم المشاركة عبر الجهاز.
- إعادة استخدام حدود الاستعلام والمشاركة المدمجة كمصادر حقيقة.
- معاملة الأجهزة واللغتين واتجاهي النص ووسائل التفاعل كمتطلبات أولية.
- حفظ تفويض الخادم وعزل المستأجر ونطاق الفرع وسلطة السعر وسلامة المشاركة.

### لن تفعل

- إضافة كتالوج أو رابط منتج عام/مجهول.
- إضافة `wa.me` أو Cloud API أو مزود رسائل أو إرسال خلفي أو مستلمين أو إيصالات أو تحليلات.
- إضافة واجهات تعديل أو إدارة للكتالوج أو البيانات المرجعية أو الفرع أو المخزون أو التسعير.
- إضافة قواعد أعمال أو مستودعات أو إسقاطات أو مخطط أو ترحيلات أو seed أو اعتمادات أو AI/NLP أو سياسة وسائط جديدة.
- استخدام mocks القديمة أو صلاحيات المتصفح أو الترشيح في العميل كسلطة إنتاج.
- إعادة تصميم المجالات والأسس الموجودة.

### معايير القبول

1. يصل المستخدم الموثق والمخول إلى سطح كتالوج معتمد واحد، ويفشل غير المخول أو ذو الجلسة المقيدة بأمان دون كشف.
2. تحمل البطاقات حصراً من 3.18 وتدعم البحث والمرشحات والترتيب وسياق الفرع والمؤشر المعرف؛ ولا رجوع إلى mock في الإنتاج.
3. تعرض البطاقات والتفاصيل الحقول المعادة فقط، ولا يمكن إعادة بناء أو كشف الجملة أو التكلفة المرجعية أو الإتاحة أو الكمية المخفية.
4. تحفظ التفاصيل قيم المواصفات التاريخية وترتيب الوسائط كما تعيدهما 3.18.
5. لا يُعامل معرف الفرع من المتصفح كسلطة، وتبقى حالات الفرع أو المنتج الأجنبي وخارج النطاق غير كاشفة.
6. تصل المشاركة من التفاصيل عبر حدود ومكوّن 3.19 مع فصل التجهيز عن فعل مشاركة الجهاز.
7. لا تحتوي المشاركة التكلفة المرجعية أو كميات دقيقة أو مفاتيح تخزين أو بيانات مساحة العمل/الأعضاء أو سعراً غير مخول، وتحفظ دلالات الصفر والغياب والعملة غير المدعومة.
8. تنتج المشاركة الأصلية والإلغاء والحافظة والنص البديل وفشل الوسائط حالات حتمية وقابلة للوصول دون ادعاء هدف أو مستلم أو تسليم.
9. تنفذ وتختبر حالات التحميل والفراغ وعدم الإتاحة والتحقق والفشل القابل للإعادة والعودة مع استعادة الاستعلام.
10. تنجح الإنجليزية/LTR والعربية/RTL على أحجام الجوال واللوحي وسطح المكتب، وتعمل الأفعال باللمس المكافئ والفأرة ولوحة المفاتيح مع تركيز ظاهر وتسميات وحالات قابلة للوصول.
11. لا يوجد وصول قاعدة مباشر في المكوّنات ولا سلطة مكررة ولا اعتماد أو مخطط أو ترحيل أو عملية إنتاج جديدة.
12. تنجح البوابات المركزة والانحدارات ذات الصلة، ويكون التوثيق ثنائي اللغة وتحفظ سلامة Git وتقدم المهمة لمراجعة مستقلة دون اعتماد ذاتي.

### المخاطر والضوابط

| الخطر | الضابط |
| --- | --- |
| إعادة بناء قواعد الصلاحية أو السعر في العرض | عرض وجود حقول DTO فقط وإبقاء السلطة في حالات الاستخدام. |
| تسريب نطاق الفرع | أخذ الخيارات من السياق الموثوق وإعادة التحقق في الخادم لكل طلب. |
| اضطراب حالة الاستعلام بين الصفحات | منسق مكتوب بالأنواع يملك التطبيع وإبطال المؤشر والاستعادة. |
| فقدان تفعيل المستخدم عند المشاركة | إبقاء التجهيز والمشاركة الأصلية فعلين صريحين وفق عقد 3.19. |
| عيوب تجاوب/RTL متأخرة | جعل الأحجام الثلاثة والاتجاهين بوابات قبول. |
| تمدد النطاق إلى العام أو الإدارة | تطبيق حدود «لن تفعل» واشتراط مهمة/ADR مستقلة. |

### ما يصبح ممكناً بعد 3.20

يستطيع موظف المبيعات إكمال سير اكتشاف الكتالوج الخاص حتى المشاركة عبر الجهاز. ويمكن بعدها بناء واجهات إدارة البيانات المرجعية والعمليات فوق أسس مجربة، وتقييم رابط عام دون خلطه بالسير الخاص، واتخاذ قرار WhatsApp بين `wa.me` أو المزود/API أو الإرسال الخلفي ضمن حد صريح.

### قرار التخطيط الحالي

- **المهمة 3.21 — واجهة إدارة البيانات المرجعية للكتالوج — مكتملة ومدمجة:** دُمجت عبر طلب السحب #24 عند `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.
- **المهمة 3.22-A1 — سياسات التفويض والقدرات الدلالية — منفذة / جاهزة للمراجعة:** يُستخدم [تقرير A1 النهائي](../05-Development/Reports/QSC-Task-3.22-A1-Final-Report.md). لا تعتمد A2 تلقائياً قبل مراجعة A1 ودمجها، ولم تبدأ A3–A5.
- **المهمة 3.22 — واجهة إدارة الفروع والمخزون والتسعير — مخططة / محجوبة وغير معتمدة للتنفيذ:** تبقى محجوبة حتى مراجعة كل شرائح 3.22-A ودمجها.
- لم تعتمد أي مهمة لاحقة.

تحفظ 3.22-A قراءات الإدارة المحدودة وقدرات Identity Application الفعلية، واستعلام Draft+Published واحداً، ومؤشر حجوزات حياً دقيقاً، ومراجعة منتج مشتركة للتجزئة والجملة مع استقلال مراجعة التكلفة المرجعية. تنفذ A3 المؤشر الحي باستخدام الفهرس الحالي الذي أثبتت البوابة كفايته، ويبقى الفهرس الجزئي غير لازم وغير معتمد. ولا تبدأ واجهة 3.22 قبل دمج جميع الشرائح، ولا تُكشف السلطة الخام.

## Related Documents | الوثائق المرتبطة

- [Current Roadmap](Current-Roadmap.md)
- [Future Capabilities](Future-Capabilities.md)
- [Deferred Decisions](Deferred-Decisions.md)
- [Catalog Query and Search](../01-Architecture/Catalog/Catalog-Query-and-Search.md)
- [Direct Device Sharing](../01-Architecture/Catalog/Direct-Device-Sharing.md)
- [Catalog Reference Data](../01-Architecture/Catalog/Catalog-Reference-Data.md)
- [Task 3.21 Implementation Contract](Task-3.21-Implementation-Contract.md)
- [Task 3.22 Planning Final Report](../05-Development/Reports/QSC-Task-3.22-Planning-Final-Report.md)
- [Task 3.22 Planning-R1 Final Report](../05-Development/Reports/QSC-Task-3.22-Planning-R1-Final-Report.md)
- [Task 3.22-A Planning Final Report — historical](../05-Development/Reports/QSC-Task-3.22-A-Planning-Final-Report.md)
- [Task 3.22-A Planning-R1 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R1-Final-Report.md)
- [Task 3.22-A Planning-R2 Final Report](../05-Development/Reports/QSC-Task-3.22-A-Planning-R2-Final-Report.md)
- [Task 3.22-A Reservation Performance Planning Final Report](../05-Development/Reports/QSC-Task-3.22-A-Reservation-Performance-Planning-Final-Report.md)
- [Task 3.22-A1 Final Report](../05-Development/Reports/QSC-Task-3.22-A1-Final-Report.md)
- [Task 3.22-A Operational Management Contract](Task-3.22-A-Operational-Management-Contract.md)
- [Branch Inventory and Pricing](../01-Architecture/Inventory/Branch-Inventory-and-Pricing.md)
