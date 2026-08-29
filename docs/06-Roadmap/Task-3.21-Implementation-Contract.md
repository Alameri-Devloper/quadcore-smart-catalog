# Task 3.21 — Catalog Reference Data Management Presentation

## Contract status

**Approved Next Implementation**

Planning branch: `docs/task-3.21-planning`  
Planning baseline: `e2719cda489aa52b8baf51f985cf0b360292874d`

Independent review of this contract is required before implementation. Task 3.22 remains planned and is not implementation-approved.

## English

### Objective

Deliver the smallest production, authenticated, bilingual, Mobile-First management Presentation over the existing Task 3.16 Catalog Reference Data boundary. The UI makes existing Workspace setup and maintenance operations usable without adding business APIs, persistence, hierarchy levels, libraries, or React-owned business rules.

### Planning decision

The Task 3.16 contracts are sufficient. Task 3.21 can be implemented entirely with the existing aggregate read endpoint and resource-specific mutation endpoints. There is no blocking API, schema, dependency, or architecture gap; therefore Task 3.21 is approved as the next implementation task. The differing semantics below are contractual and must not be flattened into a generic CRUD engine.

### User roles

| Actor | Server-authoritative behavior |
| --- | --- |
| Authenticated actor with `catalog.referenceData.view` only | Can open the management surface in read-only mode and see the active selection set returned by the base GET. No mutation controls are rendered. Inactive dynamic records are not disclosed. |
| Authenticated actor with both `catalog.referenceData.view` and `catalog.referenceData.manage` | Can load `includeInactive=true`, see full Workspace management state, and use the exact mutation operations described below. |
| Actor lacking view authority | Receives a safe forbidden state; no Reference Data is rendered. |
| Restricted session | Receives the existing safe restricted-session response. |
| Expired or missing session | Follows the existing authenticated-shell session-expiration/login behavior. |

The browser does not read, persist, or submit raw permission lists. Capability is established by server responses: try the management read, fall back to the active read only on its safe `403`, and treat a second `403` as fully forbidden. Every mutation is independently reauthorized by the server.

### Primary user workflows

1. Open Reference Data from the authenticated shell.
2. Load the full management snapshot when authorized, or the active read-only snapshot for a view-only actor.
3. Choose one semantic section from the section navigation.
4. Review records, including explicit Active/Inactive or Enabled/Disabled state where that resource supports it.
5. Create or edit only through that resource's existing contract.
6. Confirm deactivation, then send the server-provided optimistic version where required.
7. On success, replace the local item with the server response and refresh the authoritative snapshot.
8. On conflict, preserve the unsaved draft, fetch current server truth, and require explicit review before another save.
9. Configure a Product Type Specification Template with an explicit warning that changes affect future/default Product Entry behavior only and never rewrite existing Product specifications.

### Route and surface plan

- Add one authenticated page: `/catalog/reference-data`.
- Use one allow-listed URL query key, `section`, for deep-linkable primary navigation. Supported values are `hierarchy`, `brands`, `supply-statuses`, `device-classes`, `conditions`, `currencies`, `specification-definitions`, and `specification-templates`. Unknown or duplicate section state resolves safely to `hierarchy` without becoming business authority.
- Use local ephemeral state for the selected record and create/edit mode. Do not put Workspace, actor, role, permission, version, or unsaved form data in the URL.
- Reuse `ProtectedPage`, `PresentationShell`, `PageHeading`, `Card`, `StatusMessage`, `FormField`, `AsyncButton`, focus styling, logical CSS, and the established responsive breakpoints.
- Use a semantic section navigation, a record list, and a create/edit form card. On narrow screens these are stacked; on larger screens the selected list and form may use two columns.
- Do not add a second management API, convenience BFF, client database, or mock fallback.

### Resource management matrix

| Resource | Ownership and identity | Existing management behavior | Task 3.21 UI behavior |
| --- | --- | --- | --- |
| Department | Workspace dynamic record | Create; update `displayName`, `sortOrder`, or `status` with `expectedVersion`; no delete | List Active and Inactive for managers; create/edit; confirm deactivate; explicit numeric order |
| Category | Workspace dynamic child of Department | Create only under an active same-Workspace Department; versioned update of name/order/status; no parent change | Navigate/filter by Department; parent is required at create and read-only afterward |
| Product Type | Workspace dynamic child of Category | Create only under an active same-Workspace Category; versioned update of name/order/status; no parent change | Navigate/filter by Category; parent is required at create and read-only afterward; link to template editor |
| Brand | Independent Workspace dynamic record | Create; versioned name/order/status update; no delete | Independent list/create/edit/deactivate/order surface |
| Supply Status | Independent Workspace dynamic record | Create; versioned name/order/status update; no delete | Manage actual Workspace records only; seed no example values |
| Device Class | Fixed system registry: `personal`, `business`, `gaming`, `workstation` | Read only; no configuration or mutation endpoint | Localized informational list; no create, edit, enable, reorder, or delete control |
| Condition | Fixed registry: `new`, `used`, `refurbished`; Workspace availability rows | Configure valid registry codes with `enabled` and `sortOrder`; no creation; no version | Merge the fixed registry with Workspace configuration; localized labels; edit only enablement and order |
| Currency | Fixed canonical ISO 4217 registry; Workspace availability rows | Configure valid ISO codes with `enabled` and `sortOrder`; no creation; no version | Search by ISO code; edit only enablement/order; show canonical `minorUnitDigits` read-only, including N.A. |
| Specification Definition | Workspace dynamic record with `Text`, `Number`, or `Boolean` and optional unit | Create; versioned update of name/order/status/value type/unit; no delete | List/create/edit/deactivate/order; value type limited to the three server values; unit optional and bounded by the server contract |
| Specification Template | One stable template per Product Type | Whole-template PUT; create omits `expectedVersion`; update requires current version; entries are unique active definitions with order and optional required flag | Select an active Product Type; add active definitions; edit order/required; save the complete template; allow an empty template; show future/default-only warning |

Dynamic codes are entered only on create. The server normalizes them to the existing stable lowercase ASCII contract; they are displayed read-only afterward. Dynamic `displayName` preserves the Workspace-entered Unicode text without translation or language-specific duplicates; the existing server trims boundary whitespace. IDs are server-generated and never editable.

### Exact existing HTTP/API mapping

All success responses use `{ "type": "Success", "value": ... }`. Dynamic records return `id`, `code`, `displayName`, `status`, `sortOrder`, `version`, `createdAt`, and `updatedAt`; Category adds `departmentId`, Product Type adds `categoryId`, and Specification Definition adds `valueType` and `unit`. Existing raw responses also contain same-Workspace metadata such as `workspaceId`; the typed Presentation adapter must reconstruct only the fields needed by the UI and must never render or resubmit that metadata as authority.

| Method and route | Request DTO | Success | Authority/concurrency |
| --- | --- | --- | --- |
| `GET /api/catalog/reference-data` | No body; exact optional `includeInactive=true` for management | `200` aggregate snapshot; base read filters inactive data and inactive hierarchy paths | `view`; `includeInactive=true` additionally requires `manage` |
| `POST /api/catalog/reference-data/departments` | `{ code, displayName, sortOrder }` | `201` Department | `manage`; server ID; code conflict → `409` |
| `PATCH /api/catalog/reference-data/departments/[id]` | `{ expectedVersion, displayName?, sortOrder?, status? }` | `200` Department | `manage`; version required; stale → `409` |
| `POST /api/catalog/reference-data/categories` | `{ code, displayName, sortOrder, departmentId }` | `201` Category | `manage`; parent must be active and same Workspace; missing/foreign → `404` |
| `PATCH /api/catalog/reference-data/categories/[id]` | `{ expectedVersion, displayName?, sortOrder?, status? }` | `200` Category | `manage`; version required; no parent mutation |
| `POST /api/catalog/reference-data/product-types` | `{ code, displayName, sortOrder, categoryId }` | `201` Product Type | `manage`; parent must be active and same Workspace; missing/foreign → `404` |
| `PATCH /api/catalog/reference-data/product-types/[id]` | `{ expectedVersion, displayName?, sortOrder?, status? }` | `200` Product Type | `manage`; version required; no parent mutation |
| `POST /api/catalog/reference-data/brands` | `{ code, displayName, sortOrder }` | `201` Brand | `manage`; conflict → `409` |
| `PATCH /api/catalog/reference-data/brands/[id]` | `{ expectedVersion, displayName?, sortOrder?, status? }` | `200` Brand | `manage`; version required |
| `POST /api/catalog/reference-data/supply-statuses` | `{ code, displayName, sortOrder }` | `201` Supply Status | `manage`; conflict → `409` |
| `PATCH /api/catalog/reference-data/supply-statuses/[id]` | `{ expectedVersion, displayName?, sortOrder?, status? }` | `200` Supply Status | `manage`; version required |
| `POST /api/catalog/reference-data/specification-definitions` | `{ code, displayName, sortOrder, valueType, unit? }` | `201` Specification Definition | `manage`; conflict → `409` |
| `PATCH /api/catalog/reference-data/specification-definitions/[id]` | `{ expectedVersion, displayName?, sortOrder?, status?, valueType?, unit? }` | `200` Specification Definition | `manage`; version required |
| `PUT /api/catalog/reference-data/conditions` | `{ values: [{ code, enabled, sortOrder }] }` | `200` configured availability rows | `manage`; fixed valid codes only; each supplied row is upserted; no version |
| `PUT /api/catalog/reference-data/currencies` | `{ values: [{ code, enabled, sortOrder }] }` | `200` configured availability rows | `manage`; fixed ISO codes only; each supplied row is upserted; no version |
| `PUT /api/catalog/reference-data/product-types/[id]/specification-template` | `{ entries: [{ specificationDefinitionId, sortOrder, required? }], expectedVersion? }` | `200` Specification Template | `manage`; omit version only for create; existing template requires exact version; stale → `409`; inactive/foreign Product Type or Definition → `404` |

There is no Device Class mutation route, no hard-delete route, no parent-change route, no bulk dynamic reorder route, and no generic table-mutation route. Task 3.21 must not invent them.

### HTTP error contract

- `400 { type: "InvalidInput" }`: malformed DTO or server validation failure. Keep the form draft, show a form summary, and associate known field errors without weakening server validation.
- `401 { type: "AuthenticationRequired" }`: invoke the established session-expiration redirect once; do not replay a mutation automatically.
- `403 { type: "Forbidden" | "ForbiddenForRestrictedSession" | "OriginNotAllowed" }`: show safe localized forbidden state. Only the management-read `Forbidden` result may trigger the active-read fallback used to establish view-only mode.
- `404 { type: "NotFound" }`: use a generic missing/unavailable message, refresh the snapshot, and do not disclose whether the ID or parent was foreign.
- `409 { type: "Conflict" }`: distinguish duplicate create from stale edit only through the operation context; preserve input and require explicit review/retry.
- `503 { type: "CatalogReferenceDataServiceUnavailable" }`: show a retryable unavailable state with no mock fallback.

Mutations are same-origin and browser requests send only the allow-listed DTO. They never send authoritative `workspaceId`, `actorId`, role, permissions, or audit data.

### Authorization behavior

The existing `TrustedActorContext` remains the only Workspace/Actor authority. `catalog.referenceData.view` is the read/use permission. `catalog.referenceData.manage` is sensitive and controls management reads and mutations. Standard Catalog Staff has view but not manage by default; Owner derives both from the registry. React does not duplicate these policies, and hidden controls are never treated as server authorization.

### Multi-tenant behavior

Every owned lookup and parent resolution remains scoped by server-derived `workspaceId`. Category/Department, Product Type/Category, template/Product Type, and template/Definition links must remain same-Workspace. The UI displays only the response for the active server session and never performs cross-Workspace discovery.

### Hierarchy behavior

The only hierarchy is Department → Category → Product Type. The hierarchy surface uses progressive navigation on mobile and adjacent columns only when space permits. Brand and Supply Status stay independent. Parent selection is required only during Category/Product Type creation and cannot be changed afterward because no server contract allows it. React may filter the already trusted snapshot for navigation convenience, but the server remains decisive for every create.

### Active, Inactive, Enabled, and Disabled semantics

- Dynamic Workspace records use `Active` and `Inactive`.
- Condition and Currency availability use `Enabled` and `Disabled`; they are not dynamic records.
- Device Classes are fixed and always presented as system-defined values.
- No surface uses the word Delete for deactivation or disablement.
- Managers can show all records with a clearly visible status label and an Active/Inactive filter; inactive rows are never silently hidden from the management snapshot.
- View-only users see only the active selection set authorized by the base GET.

Required deactivation confirmation copy:

> Deactivate “{displayName}”? It will no longer be available for new selections. Existing Products keep their historical reference. This does not delete the record.

For Department or Category, append:

> Active descendants on this path will also be unavailable for new Product Entry selections. Their records are not deleted.

Activation may use a direct explicit action without destructive confirmation. After either action, announce the server-confirmed result.

### Optimistic concurrency behavior

- Every dynamic edit sends the exact `version` received for that record as `expectedVersion`.
- Existing template edits send the exact template version; new templates omit `expectedVersion`.
- On `409`, do not overwrite, merge silently, auto-retry, or replay. Preserve the user's draft, load current server truth, show both the conflict notice and refreshed version, and require a new explicit Save.
- Conditions and Currencies have no current version contract. The UI sends only dirty registry rows, refreshes after success, and does not claim conflict detection. A same-code concurrent update remains a documented limitation, not a reason to invent client versioning.

### Ordering behavior

Use explicit non-negative integer `sortOrder` fields with small increment/decrement controls that change only the local form value before Save. Do not add drag-and-drop or a dependency. Dynamic order is saved per record through the versioned PATCH. Fixed registry configuration submits only changed rows through its PUT. Template entry ordering is saved atomically as part of the whole template. The server's deterministic tie-break behavior remains authoritative; the UI does not promise globally contiguous positions.

### Specification Definition behavior

Creation and editing expose only `Text`, `Number`, and `Boolean`. Unit is optional and uses the existing bounded server format. Code is create-only and stable. Name, status, sort order, value type, and unit use versioned updates. Changing or deactivating a Definition does not rewrite stored Product specification values; the UI must state that historical Product data remains.

### Specification Template behavior

The editor is owned by the selected active Product Type. It offers active same-Workspace Specification Definitions, rejects duplicates in local form state for usability, exposes `required` and explicit order, and sends the complete entry list to the existing whole-template PUT. Existing inactive entries returned in management history remain visibly identified but cannot be resubmitted because the server accepts only active Definitions; the manager must remove or replace them before Save. Empty templates are valid. Required warning:

> Template changes affect future/default Product Entry behavior only. Existing Product specification values are not changed.

### Loading, empty, success, and error states

- Initial loading: labeled skeleton or progress status without stale data from another request key.
- Section loading/refresh: preserve the current section and identify refresh state.
- Empty dynamic section: setup-needed message plus Create action for managers; read-only explanation for viewers.
- Empty template: explicit “No default specification fields” state, not an error.
- Save success: localized status announcement, server-returned version/state adopted, snapshot refreshed.
- Invalid input: keep values and focus the error summary/first invalid field.
- Conflict: keep draft and show Review current version action.
- Forbidden/session/unavailable/not-found: follow the safe mappings above with no tenant or resource diagnosis.
- Network or malformed response: typed Unavailable result; no mock or cached business fallback.

### Mobile-First and responsive behavior

- Start with one-column cards and full-width actions at phone widths.
- Use semantic section navigation that wraps or scrolls with visible focus and no hover dependency.
- Use cards/definition lists rather than a wide editable table as the only interaction model.
- Hierarchy navigation drills Department → Category → Product Type on mobile and may use two/three adjacent panes at larger widths.
- Forms follow the selected list on mobile; move focus to the form heading when opened and restore focus to the initiating record on Cancel where possible.
- Condition/Currency rows use touch-sized controls and wrap code, label, status, order, and action without horizontal page overflow.
- Template entries stack on mobile and may become a compact grid on desktop; order and required controls remain individually labeled.
- Verify representative phone, tablet, desktop, and wide-desktop layouts.

### RTL/LTR behavior

System labels, instructions, statuses, errors, and confirmations are bilingual. The existing shell supplies English/LTR and Arabic/RTL direction. Workspace-entered `displayName`, stable codes, ISO currency codes, numeric order, and versions remain unmodified and use direction isolation where required. Logical CSS properties must be used; the implementation must not create separate English and Arabic component trees.

### Accessibility behavior

- One page heading and one heading per section/form.
- Semantic navigation with an identifiable current section.
- Every input has a persistent label, hint/error association, and accessible required state.
- Status is conveyed by text, not color alone.
- Create, edit, activate/deactivate, enable/disable, order, save, cancel, retry, and conflict-review actions work with touch, mouse, and keyboard.
- Destructive-looking deactivation requires a named confirmation with initial focus, Escape/Cancel, focus restoration, and no focus loss.
- Loading and save outcomes use polite status announcements; errors use alerts without repeated announcements.
- Minimum touch targets, visible focus, reduced-motion behavior, logical DOM order, and no hover-only disclosure are acceptance gates.

### Test plan

1. Typed management client tests: exact routes/methods/bodies, strict response reconstruction, no authority fields, no mock fallback, safe mapping for 400/401/403/404/409/503 and malformed/network responses.
2. Authorization coordinator tests: management read success; management `403` then active-read success for view-only; full forbidden; session expiration without mutation replay.
3. Dynamic resource tests: create DTOs, immutable code/parent, versioned edit/status/order, stale conflict draft preservation, and raw-ID/Workspace non-display.
4. Hierarchy tests: Department → Category → Product Type filtering; same-Workspace parent request input only; no Brand nesting; no parent-change UI.
5. Fixed registry tests: Device Class read-only; Condition/Currency enablement/order only; ISO precision read-only; dirty-row PUT; no arbitrary creation.
6. Specification tests: exact three Definition types, optional unit, active/inactive safety, template unique entries/order/required, create-vs-update version, empty template, inactive-entry remediation, and future/default-only warning.
7. Presentation tests: loading, empty, setup-needed, success, validation, conflict, forbidden, expired session, unavailable, retry, deactivation confirmation, and bilingual text.
8. Accessibility tests: landmarks/headings, labels/descriptions, status announcements, confirmation focus, keyboard traversal, visible focus hooks, and no color-only status.
9. Responsive/browser QA: English/LTR and Arabic/RTL at phone, tablet, desktop, and wide desktop with touch-equivalent, mouse, and keyboard paths; verify no horizontal overflow.
10. Focused regressions during implementation: TypeScript, integration TypeScript, lint, build, `test:reference-data`, the Product Entry reference-data composition tests, relevant authenticated-shell tests, guarded Reference Data PostgreSQL integration, `db:check`, and Git integrity. Do not run unrelated suites without a concrete dependency and never use Production data.

### Database expectation

No database change. No migration `0016`, seed, bootstrap pack, or Production database operation is approved. Existing Task 3.16 PostgreSQL tables and audit transaction remain canonical. Discovery of a required persistence change stops implementation as `ReScopeRequired`.

### Dependency expectation

No new runtime dependency. Use existing Next.js, React, TypeScript, CSS, authenticated shell, HTTP-client, and test patterns. No form, state, table, drag-and-drop, or localization package is approved.

### WILL IMPLEMENT

- The authenticated `/catalog/reference-data` management surface and section navigation.
- Read-only active mode for view authority and full management mode for view + manage authority, derived from server responses.
- Exact Task 3.16 workflows for Departments, Categories, Product Types, Brands, Supply Statuses, Device Classes, Conditions, Currencies, Specification Definitions, and Specification Templates.
- Version-aware dynamic/template edits, conflict review, safe deactivation language, deterministic order controls, and historical-data warnings.
- Typed browser-safe adapters/coordinators with no mock fallback or browser authority.
- English/Arabic, LTR/RTL, Mobile-First responsive behavior, accessibility, focused tests, and documentation.

### WILL NOT IMPLEMENT

- Branch, Inventory, or Pricing management.
- Product Entry, Product editing, Product search, Catalog browsing, or Direct Sharing redesign.
- Public sharing, WhatsApp integration, recipients, delivery, approval workflow, Product revision history, analytics, AI, ERP, or marketplace behavior.
- A generic/arbitrary metadata engine, formulas, computed Specifications, dependent rules, or AI suggestions.
- New hierarchy levels or moving Brand into the hierarchy.
- Parent changes for existing Categories or Product Types.
- Arbitrary Device Classes, Conditions, or Currencies; currency precision editing, exchange rates, tax, or conversion.
- Hard delete, automatic translation, `displayNameAr`, or `displayNameEn`.
- New business APIs, schema, migration, runtime dependency, Production deployment, or Production database operation.
- Task 3.22 implementation or approval.

### Acceptance criteria

1. `/catalog/reference-data` is authenticated, bilingual, responsive, and uses only Task 3.16 HTTP contracts.
2. View-only actors receive the active read-only state; managers receive inactive-inclusive state and exact mutation controls; forbidden/restricted/expired actors fail safely from server responses.
3. The browser never sends Workspace/Actor/role/permission authority and Production never falls back to mock data.
4. Department → Category → Product Type is the only hierarchy; parents are create-only and server-validated; Brand and Supply Status remain independent.
5. Dynamic IDs/codes remain stable, Workspace `displayName` is not translated, every edit uses the returned version, and conflicts never overwrite silently.
6. Deactivation is never labeled Delete, requires explicit confirmation, retains inactive rows for managers, and explains historical Product preservation.
7. Device Class is read-only; Condition/Currency allow only existing enablement/order; ISO identity/precision is read-only.
8. Specification Definitions expose only Text/Number/Boolean and optional unit; templates use active definitions, exact version rules, whole-template replacement, and the future/default-only warning.
9. Ordering is deterministic and usable on mobile without drag-and-drop or a new dependency.
10. Loading, empty, setup-needed, success, invalid, conflict, unavailable, forbidden, not-found, and expired-session states are localized, accessible, and tested.
11. Phone, tablet, desktop, and wide-desktop layouts work in LTR and RTL with touch, mouse, and keyboard and no horizontal page overflow.
12. No schema, migration, dependency, unrelated architecture, Task 3.22 scope, Git write, or Production operation is introduced; focused gates pass and independent review is requested.

### Known risks and controls

| Risk | Control |
| --- | --- |
| Management capability is not returned as a browser flag | Derive mode only from the management GET and safe active-GET fallback; never inspect stored raw permissions. |
| Condition/Currency configuration has no optimistic version | Send dirty codes only, refresh after success, disclose no conflict guarantee, and do not invent client versioning. |
| Dynamic ordering has no atomic batch endpoint | Use versioned per-record numeric order; never promise contiguous positions or perform unsafe multi-record auto-reordering. |
| Deactivation impact counts are unavailable | Use accurate generic historical/descendant wording; do not fabricate Product usage counts. |
| Aggregate management payload includes the large ISO registry | Load once per request key, render progressively/search locally for navigation only, and keep server mutation validation authoritative. |
| Template replacement encounters inactive historical entries | Mark them clearly, require remove/replace before Save, preserve existing Product values, and let the server revalidate. |
| Concurrent template/dynamic edits | Preserve drafts and require explicit review after `409`; never auto-retry mutation. |
| UI grouping drifts into domain redesign | Keep resource-specific coordinators and exact endpoints; the navigation tree is Presentation organization only. |

## العربية

### الهدف والقرار

تنفيذ أصغر واجهة إنتاج موثقة ومحمية وثنائية اللغة ومتجاوبة لإدارة البيانات المرجعية للكتالوج فوق حدود المهمة 3.16 الحالية. أثبتت المراجعة أن العقود الحالية كافية بالكامل، ولا توجد فجوة مانعة في API أو قاعدة البيانات أو الاعتماديات أو المعمارية. لذلك أصبحت المهمة 3.21 **التنفيذ التالي المعتمد**، بينما تبقى المهمة 3.22 **مخططة وغير معتمدة للتنفيذ**.

### الأدوار والصلاحيات

- المستخدم الذي يملك `catalog.referenceData.view` فقط يرى البيانات النشطة في وضع القراءة فقط، ولا يرى أدوات التعديل أو السجلات الديناميكية غير النشطة.
- المستخدم الذي يملك صلاحيتَي العرض والإدارة يحمّل `includeInactive=true` ويرى حالة الإدارة الكاملة وينفذ العمليات الحالية فقط.
- المستخدم غير المخول أو ذو الجلسة المقيدة يرى حالة منع آمنة، والجلسة المنتهية تتبع سلوك تسجيل الدخول الحالي.
- لا يقرأ المتصفح قوائم صلاحيات خام ولا يخزنها ولا يرسلها. يحدد رد الخادم وضع الإدارة أو القراءة فقط، ويعيد الخادم التحقق من كل تعديل.

### مسار الواجهة

- صفحة واحدة محمية: `/catalog/reference-data`.
- معامل URL واحد مسموح اسمه `section` للأقسام: التسلسل، العلامات التجارية، حالات التوريد، فئات الأجهزة، الحالات، العملات، تعريفات المواصفات، وقوالب المواصفات.
- تبقى هوية السجل المحدد ووضع الإنشاء/التعديل وحالة النموذج محلية ومؤقتة، ولا تُوضع هوية مساحة العمل أو الممثل أو الصلاحيات أو الإصدار أو المسودة في URL.
- تستخدم الصفحة الغلاف الموثق والمكونات والأنماط المتجاوبة الحالية، ولا تنشئ BFF أو API إضافياً أو قاعدة عميل أو بديلاً وهمياً.

### مصفوفة الموارد

| المورد | السلوك المعتمد |
| --- | --- |
| القسم Department | إنشاء وتعديل الاسم والترتيب والحالة بإصدار متفائل؛ لا حذف |
| الفئة Category | إنشاء تحت قسم نشط في مساحة العمل نفسها؛ تعديل بإصدار؛ لا تغيير للأب |
| نوع المنتج Product Type | إنشاء تحت فئة نشطة في مساحة العمل نفسها؛ تعديل بإصدار؛ لا تغيير للأب؛ يملك قالب المواصفات |
| العلامة التجارية Brand | سجل ديناميكي مستقل: إنشاء وتعديل وحالة وترتيب؛ لا حذف |
| حالة التوريد Supply Status | سجل ديناميكي مستقل فعلي لمساحة العمل؛ لا قيم تجارية مضمّنة |
| فئة الجهاز Device Class | سجل نظام ثابت للقراءة فقط؛ لا إنشاء أو تعديل أو تمكين أو ترتيب |
| الحالة Condition | سجل ثابت؛ تدير مساحة العمل التمكين والترتيب فقط |
| العملة Currency | هوية ISO 4217 ثابتة؛ تدير مساحة العمل التمكين والترتيب فقط؛ الدقة للقراءة فقط |
| تعريف المواصفة | سجل ديناميكي بأنواع Text وNumber وBoolean ووحدة اختيارية؛ تعديل بإصدار |
| قالب المواصفات | قالب واحد لكل نوع منتج؛ حفظ كامل للقائمة؛ إنشاء بلا إصدار وتعديل بالإصدار الحالي |

يبقى `displayName` نصاً واحداً أدخلته مساحة العمل ولا يُترجم تلقائياً ولا يُقسم إلى حقول عربية وإنجليزية. ينشئ الخادم المعرف، ويصبح الرمز ثابتاً بعد الإنشاء. لا توجد واجهة حذف نهائي أو تغيير أب أو إنشاء قيم ثابتة اعتباطية.

### العقود وHTTP

تستخدم الواجهة `GET /api/catalog/reference-data` للقراءة النشطة و`includeInactive=true` للإدارة، ومسارات POST/PATCH الحالية للأقسام والفئات وأنواع المنتجات والعلامات التجارية وحالات التوريد وتعريفات المواصفات، ومساري PUT للحالات والعملات، ومسار PUT لقالب نوع المنتج. ترسل طلبات الإنشاء `code` و`displayName` و`sortOrder` مع الأب عند الحاجة، وترسل التعديلات الديناميكية `expectedVersion` والحقول المتغيرة فقط. لا ترسل الطلبات `workspaceId` أو `actorId` أو الدور أو الصلاحيات أو بيانات التدقيق.

تتعامل الواجهة مع 400 كإدخال غير صالح، و401 كجلسة منتهية، و403 كمنع آمن، و404 كنتيجة عامة غير كاشفة، و409 كتعارض يتطلب مراجعة، و503 كتعذر قابل لإعادة المحاولة. لا تعيد الواجهة إرسال التعديل تلقائياً ولا تستخدم بيانات وهمية.

### التسلسل والحالة والتاريخ

يبقى التسلسل الوحيد Department → Category → Product Type، وتبقى Brand مستقلة. اختيار الأب مطلوب عند الإنشاء فقط، والخادم هو المرجع النهائي. تستخدم السجلات الديناميكية Active/Inactive، بينما تستخدم Condition وCurrency Enabled/Disabled. لا يُستخدم وصف «حذف» عند التعطيل.

نص التأكيد المطلوب يوضح أن التعطيل يمنع الاختيار الجديد ولا يحذف السجل وأن المنتجات الحالية تحتفظ بالمرجع التاريخي. وعند تعطيل Department أو Category يوضح أيضاً أن الأبناء النشطين في ذلك المسار لن يكونوا متاحين للاختيارات الجديدة من دون حذف سجلاتهم.

### التزامن والترتيب

يرسل كل تعديل ديناميكي الإصدار الذي أعاده الخادم. ويرسل تعديل القالب إصداره الحالي، بينما يحذف الإصدار عند إنشاء قالب جديد. عند 409 تُحفظ المسودة ويُحمّل الواقع الحالي ويُطلب حفظ صريح جديد، من دون دمج صامت أو كتابة أخيرة أو إعادة تلقائية.

لا تملك إعدادات الحالات والعملات إصداراً حالياً؛ لذلك ترسل الواجهة الصفوف المتغيرة فقط ثم تحدّث القراءة، ولا تدّعي اكتشاف تعارض الرمز نفسه. يستخدم الترتيب حقلاً رقمياً صحيحاً مع أزرار زيادة/نقصان محلية قبل الحفظ، ولا تُضاف مكتبة سحب وإفلات. يبقى ترتيب القالب جزءاً من حفظ القالب الكامل.

### المواصفات والقوالب

تعرض تعريفات المواصفات الأنواع الثلاثة المعتمدة والوحدة الاختيارية فقط. يعرض محرر القالب التعريفات النشطة التابعة لمساحة العمل نفسها، ويمنع التكرار لأغراض الاستخدام، ويحفظ `required` والترتيب والقائمة الكاملة. تظهر المداخل التاريخية غير النشطة بوضوح ويجب إزالتها أو استبدالها قبل الحفظ. القالب الفارغ صالح.

التحذير الإلزامي:

> تؤثر تغييرات القالب في السلوك المستقبلي/الافتراضي لإدخال المنتجات فقط. لا تتغير قيم مواصفات المنتجات الحالية.

### الجوال والتجاوب وRTL وإتاحة الوصول

تبدأ الواجهة بعمود واحد وبطاقات وأزرار كاملة العرض على الهاتف، وتتحول إلى قائمة ونموذج متجاورين عند توفر المساحة. يعمل استكشاف التسلسل تدريجياً على الهاتف ويمكن عرضه في أعمدة على الشاشات الأكبر. لا يعتمد أي إجراء على التحويم، وتبقى جميع عناصر اللمس بالحجم المناسب ولا يحدث تجاوز أفقي.

تُترجم تسميات النظام والتعليمات والحالات والأخطاء والتأكيدات إلى العربية والإنجليزية، بينما تبقى أسماء مساحة العمل والرموز كما هي مع عزل الاتجاه عند الحاجة. تستخدم الواجهة خصائص CSS منطقية وشجرة مكونات واحدة للاتجاهين.

تتطلب الواجهة عناوين دلالية وتسميات دائمة وربط التلميحات والأخطاء وإظهار الحالة بالنص لا باللون فقط، وتشغيل جميع الإجراءات باللمس والفأرة ولوحة المفاتيح، وإدارة تركيز صحيحة في تأكيد التعطيل، وإعلانات مناسبة للتحميل والحفظ والخطأ، وتركيزاً مرئياً واحترام تقليل الحركة.

### الاختبارات والقبول

تشمل الخطة اختبارات المحول المكتوب بالأنواع، وعدم إرسال السلطة، وحالات HTTP، وتحديد وضع القراءة/الإدارة من رد الخادم، وإنشاء وتعديل الموارد الديناميكية بالإصدار، والتسلسل وعدم تغيير الأب، والسجلات الثابتة، والقوالب، وحالات التحميل والفراغ والتعارض والمنع وانتهاء الجلسة، والنصوص الثنائية وإتاحة الوصول. يشمل QA المتصفح الهاتف واللوحي وسطح المكتب والعرض الواسع بالاتجاهين وباللمس والفأرة ولوحة المفاتيح عند توفر بيئة المتصفح.

يُقبل التنفيذ فقط إذا استخدم عقود 3.16 الحالية، وحافظ على السلطة في الخادم وعزل مساحة العمل، ومنع الحذف النهائي والترجمة التلقائية، وحافظ على المعنى التاريخي، ونجحت بوابات TypeScript وlint والبناء واختبارات Reference Data وProduct Entry ذات الصلة وتكامل PostgreSQL المحمي وسلامة Git.

### قاعدة البيانات والاعتماديات

لا تغيير في قاعدة البيانات، ولا ترحيل `0016`، ولا بيانات أولية، ولا عملية على قاعدة الإنتاج. لا اعتماد تشغيل جديد ولا مكتبة نماذج أو حالة أو جداول أو سحب وإفلات أو ترجمة. إذا ظهر احتياج حقيقي للتخزين تتوقف المهمة بحالة `ReScopeRequired`.

### سينفذ

- صفحة الإدارة المحمية وأقسامها ووضع القراءة فقط ووضع الإدارة المستمدان من رد الخادم.
- السلوك الحالي المحدد لكل مورد، والتزامن المتفائل، ورسائل التعطيل الآمنة، والترتيب البسيط، وتحذير التاريخ والقالب.
- محولات ومنسقات عرض مكتوبة بالأنواع من دون بديل وهمي أو سلطة في المتصفح.
- العربية والإنجليزية وRTL/LTR والجوال والتجاوب وإتاحة الوصول والاختبارات المركزة والتوثيق.

### لن ينفذ

- إدارة الفروع أو المخزون أو التسعير أو إعادة تصميم إدخال/تحرير/بحث المنتجات أو المشاركة المباشرة.
- مشاركة عامة أو WhatsApp أو موافقات أو تاريخ إصدارات المنتجات أو AI أو تحليلات أو ERP أو سوق.
- محرك بيانات وصفية عام أو صيغ أو مواصفات محسوبة أو قواعد تابعة.
- مستويات تسلسل جديدة أو نقل Brand أو تغيير آباء السجلات الحالية.
- فئات أجهزة أو حالات أو عملات اعتباطية أو تعديل دقة العملة أو الصرف أو الضريبة أو التحويل.
- حذف نهائي أو ترجمة تلقائية أو `displayNameAr` أو `displayNameEn`.
- API أعمال أو مخطط أو ترحيل أو اعتماد جديد أو نشر إنتاج أو استخدام قاعدة الإنتاج.
- تنفيذ المهمة 3.22 أو اعتمادها.

### المخاطر المعروفة

- لا يوجد علم صلاحية إدارة للمتصفح؛ يُحل ذلك برد الإدارة ثم الرجوع الآمن لقراءة النشط فقط.
- لا يوجد إصدار لإعدادات Condition/Currency؛ تُرسل الصفوف المتغيرة فقط وتبقى الكتابة المتزامنة للرمز نفسه قيداً موثقاً.
- لا يوجد ترتيب دفعي ذري للسجلات الديناميكية؛ يستخدم كل سجل ترتيباً رقمياً وتعديلاً بإصدار.
- لا توفر API أعداد المنتجات المتأثرة بالتعطيل؛ تستخدم الواجهة لغة عامة صحيحة ولا تخمن الأعداد.
- قد يحتوي القالب التاريخي على تعريف غير نشط؛ يظهر بوضوح ويُزال أو يُستبدل قبل الحفظ من دون تغيير منتجات سابقة.

