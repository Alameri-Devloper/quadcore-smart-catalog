# QSC Task 3.21 Planning Final Report

## Status

ReadyForReview

Independent review is required. This planning report does not self-approve implementation.

## Task

Task 3.21 Planning Gate — Catalog Reference Data Management Presentation

## Branch

`docs/task-3.21-planning`

## Baseline

`e2719cda489aa52b8baf51f985cf0b360292874d`

The baseline is based on `feature/product-entry-engine`, which contains the merged Task 3.20 branch.

## English Summary

The existing Task 3.16 Catalog Reference Data contracts are sufficient for a production Task 3.21 management Presentation. The approved implementation contract uses one authenticated Mobile-First surface over the existing aggregate read and resource-specific mutation endpoints. It preserves server authority, Workspace isolation, the Department → Category → Product Type hierarchy, stable dynamic identity, fixed registries, optimistic versions, historical references, and Product Type Specification Template semantics. No business API, schema, migration, runtime dependency, or architecture redesign is required.

Task 3.21 is therefore **Approved Next Implementation**. Task 3.22 remains **Planned — not implementation-approved**.

## Arabic Summary

عقود البيانات المرجعية للكتالوج في المهمة 3.16 كافية لتنفيذ واجهة إدارة إنتاجية للمهمة 3.21. يعتمد عقد التنفيذ المعتمد على صفحة محمية ومتجاوبة ومصممة للجوال أولاً، وتستخدم واجهات القراءة والتعديل الحالية فقط. يحافظ العقد على سلطة الخادم وعزل مساحة العمل والتسلسل Department → Category → Product Type والهوية الديناميكية الثابتة والسجلات النظامية والتزامن المتفائل والمراجع التاريخية وسلوك قوالب المواصفات. لا حاجة إلى API أعمال جديد أو مخطط أو ترحيل أو اعتماد تشغيل أو إعادة تصميم معمارية.

لذلك أصبحت المهمة 3.21 **التنفيذ التالي المعتمد**، بينما تبقى المهمة 3.22 **مخططة وغير معتمدة للتنفيذ**.

## Task 3.16 Contract Review

Task 3.16 already supplies:

- a Workspace-scoped aggregate GET for active Product Entry selection data;
- `includeInactive=true` management reads guarded by both view and manage authority;
- dedicated create and update operations for dynamic references;
- fixed registry configuration for Conditions and Currencies;
- a fixed read-only Device Class registry;
- versioned whole-template configuration by Product Type;
- server-owned parent validation, authorization, audit, optimistic concurrency, and PostgreSQL transactions;
- safe 400/401/403/404/409/503 HTTP outcomes;
- an existing typed Product Entry client/coordinator proving the Presentation integration seam.

No generic CRUD abstraction or additional endpoint is required.

## Resource Management Matrix

| Resource | Existing supported operations | Explicitly unsupported |
| --- | --- | --- |
| Department | Create; versioned name/order/status update | Parent, delete |
| Category | Create under active Department; versioned name/order/status update | Parent change, delete |
| Product Type | Create under active Category; versioned name/order/status update; configure template | Parent change, delete |
| Brand | Create; versioned name/order/status update | Hierarchy parent, delete |
| Supply Status | Create; versioned name/order/status update | Seeded business values, delete |
| Device Class | Read fixed localized registry | Create, edit, enable, reorder, delete |
| Condition | Configure existing code enablement/order | Arbitrary creation, label editing |
| Currency | Configure ISO code enablement/order | Creation, exchange rate, conversion, tax, precision edit |
| Specification Definition | Create; versioned name/order/status/type/unit update | JSON metadata, formulas, computed/dependent rules, delete |
| Specification Template | Whole-template create/update with ordered required entries | Product rewrite/migration, independent delete |

## HTTP/API Mapping

The approved contract enumerates every existing endpoint and DTO. The API set is:

- `GET /api/catalog/reference-data[?includeInactive=true]`
- `POST /api/catalog/reference-data/departments`
- `PATCH /api/catalog/reference-data/departments/[id]`
- `POST /api/catalog/reference-data/categories`
- `PATCH /api/catalog/reference-data/categories/[id]`
- `POST /api/catalog/reference-data/product-types`
- `PATCH /api/catalog/reference-data/product-types/[id]`
- `POST /api/catalog/reference-data/brands`
- `PATCH /api/catalog/reference-data/brands/[id]`
- `POST /api/catalog/reference-data/supply-statuses`
- `PATCH /api/catalog/reference-data/supply-statuses/[id]`
- `POST /api/catalog/reference-data/specification-definitions`
- `PATCH /api/catalog/reference-data/specification-definitions/[id]`
- `PUT /api/catalog/reference-data/conditions`
- `PUT /api/catalog/reference-data/currencies`
- `PUT /api/catalog/reference-data/product-types/[id]/specification-template`

Dynamic PATCH DTOs require `expectedVersion`; parent identifiers appear only in Category/Product Type creation. Condition/Currency PUTs upsert supplied fixed-registry rows and have no current version field. Template create omits `expectedVersion`; an existing template requires the exact current version. No new business API is approved.

## Authorization Review

`catalog.referenceData.view` controls read/use. `catalog.referenceData.manage` controls inactive-inclusive management reads and every mutation. A view-only actor receives the active read-only surface. A manager requires both permissions to load full management state. The client derives this mode only from safe server responses, never raw browser-stored permissions. Restricted, expired, forbidden, and origin-rejected requests retain their existing safe behavior.

## Multi-Tenant Review

Every owned query and mutation remains scoped by `TrustedActorContext.workspaceId`. Parents and template references are revalidated within the same Workspace. Browser DTOs never include authoritative Workspace, actor, role, permission, or audit fields. The typed Presentation adapter will reconstruct only UI-required fields and ignore server metadata not needed for rendering.

## Hierarchy Review

The only hierarchy remains Department → Category → Product Type. Parent selection is required at child creation and immutable afterward because no parent-change contract exists. Brand and Supply Status remain independent. Presentation filtering is navigation convenience over a trusted snapshot; server parent validation is decisive.

## Active/Inactive Review

Dynamic records use Active/Inactive. Condition and Currency configuration use Enabled/Disabled. Device Classes are fixed. Deactivation is never called Delete and requires confirmation explaining that the record leaves new selections while existing Products keep historical meaning. Parent deactivation also warns that descendants on that path become unavailable for new Product Entry selections without being deleted. Managers continue to see inactive records.

## Optimistic Concurrency Review

Every dynamic edit sends the server-returned version. Existing template updates send the current template version; new templates omit it. A `409` preserves the user's draft, refreshes server truth, and requires explicit review and a new Save. There is no silent overwrite or automatic mutation replay. Conditions/Currencies have no version contract; the UI sends only dirty rows, refreshes after success, and documents same-code concurrent updates as a residual limitation.

## Ordering Review

No drag-and-drop dependency or batch dynamic endpoint is needed. The UI uses an explicit validated integer `sortOrder` plus optional local increment/decrement controls. Dynamic order saves through one versioned record PATCH. Condition/Currency changes send only dirty rows. Template order is saved atomically with the complete template. The server's deterministic tie-break remains authoritative.

## Specification Definition Review

The UI exposes only Text, Number, Boolean, and the existing optional unit. Stable code is create-only. Name, order, status, type, and unit use the existing versioned PATCH. Deactivation or changes do not rewrite stored Product specification values.

## Specification Template Review

Each Product Type owns one existing default template. The editor selects active same-Workspace Definitions, supports unique entries, required flags, explicit order, and empty templates, and saves the complete entry set. Historical inactive entries remain visible but must be removed or replaced before a server-valid save. Required UX copy states that template changes affect future/default Product Entry only and do not change existing Product specification values.

## Historical Data Safety Review

No hard delete exists or is proposed. Inactive dynamic records remain available to the management read and retain stable ID/code/displayName for historical Products. The UI never suggests that deactivation erases prior meaning and never fabricates impacted-Product counts because the existing API does not supply them.

## Presentation Information Architecture

One route, `/catalog/reference-data`, uses an allow-listed `section` query for hierarchy, brands, supply statuses, device classes, conditions, currencies, specification definitions, and specification templates. Record selection and unsaved forms remain ephemeral local state. The hierarchy uses progressive navigation; all other resources remain independent sections. The page reuses the existing authenticated shell and shared Presentation primitives.

## Mobile-First Review

Phone layout uses stacked cards, full-width actions, progressive hierarchy navigation, touch-sized controls, and no mandatory wide table. Forms follow the selected list and receive managed focus. Fixed-registry and template entries wrap without horizontal page overflow. No interaction depends on hover.

## Responsive Review

The same component tree adapts from one column to list/form columns and, where useful, adjacent hierarchy panes at established breakpoints. Representative phone, tablet, desktop, and wide-desktop QA is an implementation acceptance gate.

## RTL/LTR Review

System copy is bilingual and uses the existing shell direction. Workspace `displayName`, codes, ISO currency codes, numeric order, and versions remain unchanged and direction-isolated where necessary. Logical CSS is required; no separate Arabic component tree is approved.

## Accessibility Review

The contract requires semantic section navigation and headings, persistent form labels, linked hints/errors, text status independent of color, accessible deactivation confirmation, focus movement/restoration, polite loading/save announcements, error alerts, touch/mouse/keyboard parity, visible focus, reduced-motion support, and no hover-only disclosure.

## Database Gap Review

No database gap exists. Task 3.21 is a Presentation over Task 3.16 persistence. No migration `0016`, seed, bootstrap pack, Production migration, or Production database operation is approved. A future discovered persistence requirement would stop implementation as `ReScopeRequired`.

## Dependency Gap Review

No dependency gap exists. Existing Next.js, React, TypeScript, CSS, authenticated shell, HTTP-client, and test conventions are sufficient. No form, state, table, drag-and-drop, or localization library is approved.

## Architecture Gap Review

No architecture gap exists. Presentation can use typed clients/coordinators while Application remains responsible for authorization, parent validation, optimistic concurrency, audit, and transaction semantics. Repositories remain the only PostgreSQL boundary. Task 3.16 is not redesigned.

## Task 3.21 Decision

**Approved Next Implementation**

The complete implementation-ready contract is documented in `docs/06-Roadmap/Task-3.21-Implementation-Contract.md`.

## WILL IMPLEMENT

- One authenticated Reference Data management route and semantic sections.
- Server-derived view-only and management modes.
- Exact resource-specific Task 3.16 operations.
- Safe deactivation, historical meaning, deterministic ordering, optimistic conflicts, and template warnings.
- Typed browser-safe adapters/coordinators with no mock fallback.
- English/Arabic, LTR/RTL, Mobile-First responsiveness, accessibility, and focused verification.

## WILL NOT IMPLEMENT

- Branch, Inventory, Pricing, Product Entry, Product editing/search, Direct Sharing, public sharing, WhatsApp, approvals, Product history, AI, analytics, ERP, or marketplace scope.
- New hierarchy levels, Brand nesting, parent changes, hard delete, arbitrary fixed-registry values, automatic translation, or multilingual dynamic name fields.
- Exchange rates, conversion, tax, editable currency precision, formulas, computed/dependent Specifications, or generic metadata.
- New business APIs, schema, migration, dependencies, Production deployment, Production database use, or Task 3.22.

## Acceptance Criteria

The implementation contract contains twelve auditable criteria covering authenticated access, server-derived authorization modes, absence of browser authority/mock fallback, exact hierarchy, stable dynamic identity, version conflicts, historical-safe deactivation, fixed registry limits, Specification semantics, Mobile-First ordering, complete localized states, responsive/accessibility QA, and absence of schema/dependency/Task 3.22 expansion.

## Known Risks

- Management mode is inferred from safe server responses rather than a client permission flag.
- Condition/Currency rows have no optimistic version.
- Dynamic ordering has no atomic batch endpoint.
- Deactivation impact counts are unavailable.
- The aggregate ISO registry is large.
- Historical templates may contain inactive Definitions.

Each risk has a bounded control in the implementation contract; none requires re-scoping.

## Task 3.22 Status Confirmation

Task 3.22 remains **Planned — not implementation-approved**. No Task 3.22 contract, implementation, or approval was added.

## Files Created

- `docs/06-Roadmap/Task-3.21-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.21-Planning-Final-Report.md`

## Files Modified

- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Git Integrity

The branch and baseline were confirmed before planning. The initial worktree was clean. Only the two planning documents and this report changed. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was performed. Planning verification is limited to `git diff --check`, `git status --short`, and `git diff --stat`; no audit, application suite, migration, or Production database operation is run.

The fresh repository review ZIP and checksum are generated under `artifacts/task-reviews/3.21-Planning/` and the exact report, ZIP, and checksum are exported to `C:\Users\dell\Desktop\QSC-Reviews\`.

## Next Recommendation

Conduct independent architecture/security/product review of the implementation contract. If approved, implement Task 3.21 on a dedicated implementation branch exactly within this contract. Do not begin or approve Task 3.22.
