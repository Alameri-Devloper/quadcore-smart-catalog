# QSC Task 3.22 Planning Final Report

## Status

ReadyForReview. This status requests independent review of the planning result; it does not approve Task 3.22 implementation.

## Task

Task 3.22 Planning Gate — Branch, Inventory, and Pricing Management Presentation

## Branch

`docs/task-3.22-planning`

## Baseline

Required base branch: `feature/product-entry-engine`  
Required and actual HEAD: `4f1115d2ac98fc4411ac46f081652554f6d04ec9`  
Merged Task 3.21 authority: PR #24

## English Summary

The existing Task 3.17 foundation is architecturally sound but is not sufficient for the complete Task 3.22 Presentation. Branch lifecycle, listing mutations, every named Inventory mutation, atomic transfer, base/override pricing mutations, tenant isolation, audit, Money, optimistic concurrency, row locking, and idempotency are implemented. Material browser-facing read gaps remain: there is no server-derived mutation-capability projection, no active reservation list/detail read, no Branch-independent Workspace base-pricing read, and Task 3.18 cannot discover every Task 3.17-valid operational Product for actors whose operational permissions are independent of `catalog.products.edit`. Task 3.22 is therefore `ReScopeRequired` and remains not implementation-approved. No schema, migration, dependency, Application, repository, route, test, or UI change is approved by this gate.

## Arabic Summary

أساس المهمة 3.17 سليم معمارياً، لكنه غير كافٍ لواجهة المهمة 3.22 الكاملة. نُفذت دورة حياة الفرع وتعديلات الإدراج وكل حركة مخزون صريحة والتحويل الذري وتعديلات التسعير الأساسي وتجاوزات الفروع وعزل المستأجر والتدقيق والأموال والتزامن التفاؤلي والأقفال والتكرار الآمن. لكن توجد فجوات جوهرية في قراءات المتصفح: لا يوجد إسقاط قدرات تعديل مشتق من الخادم، ولا قراءة لقائمة الحجوزات النشطة أو تفاصيلها، ولا قراءة لتسعير مساحة العمل الأساسي مستقلة عن الفرع، ولا يستطيع بحث المهمة 3.18 اكتشاف كل منتج تشغيلي صالح وفق 3.17 لممثلين تكون صلاحياتهم التشغيلية مستقلة عن `catalog.products.edit`. لذلك تتطلب المهمة 3.22 إعادة تحديد النطاق وتبقى غير معتمدة للتنفيذ. لا تعتمد هذه البوابة أي تغيير في المخطط أو الترحيلات أو الاعتماديات أو التطبيق أو المستودعات أو المسارات أو الاختبارات أو الواجهة.

## Roadmap Authority Reconciliation

`Current-Roadmap.md` and `Sprint-03-Continuation.md` now agree in English and Arabic:

- Tasks 3.14–3.21 are Completed / merged.
- Task 3.21 merged through PR #24 at `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.
- Task 3.22 is Planned / ReScopeRequired and not implementation-approved.
- No later task is approved and no task currently holds Approved Next Implementation status.

Historical Task 3.20 baseline text remains explicitly historical and is not current roadmap authority.

## Task 3.21 Completion Confirmation

Task 3.21 is no longer described as the current Approved Next Implementation. It is recorded as Completed / merged through PR #24, including its reviewed authenticated bilingual Reference Data Presentation and R1/R2 corrections.

## Task 3.17 Contract Review

The review used the minimum relevant source contracts:

- Branch Domain/Application/HTTP: `domains/workspace/branches/domain/branch.ts`, `application/branch.use-cases.ts`, `application/branch-results.ts`, and `infrastructure/http/branch-route-handlers.ts` plus its HTTP test.
- Listing/Pricing Domain/Application/HTTP: `domains/catalog/branch-products/domain/branch-product.ts`, `application/branch-product.use-cases.ts`, `application/branch-product-results.ts`, and `infrastructure/http/branch-product-route-handlers.ts` plus its HTTP test.
- Inventory Domain/Application/HTTP: `domains/inventory/domain/inventory.ts`, `application/inventory.use-cases.ts`, `application/inventory-results.ts`, and `infrastructure/http/inventory-route-handlers.ts` plus its HTTP test.
- Concurrency/persistence contracts: the three corresponding Unit-of-Work ports and PostgreSQL implementations.
- Permissions: `domains/identity/domain/permission.ts` and `shared/auth/trusted-actor-context.ts`.
- Product selection: `domains/catalog/query/domain/catalog-query.ts`, `application/catalog-query.use-cases.ts`, and `infrastructure/http/catalog-query-route-handlers.ts`.
- Architecture: `docs/01-Architecture/Inventory/Branch-Inventory-and-Pricing.md` and Task 3.17-R1 transfer report.

No Product Entry or Direct Sharing internals were inspected because no concrete Task 3.22 dependency required them.

## Branch Resource Matrix

| Action | Existing HTTP contract | Request / response | Authority and semantics | Class |
| --- | --- | --- | --- | --- |
| List Branches | `GET /api/branches` | Success array of Branch views | `workspace.branches.view` or `.manage`; Owner bypass; SelectedBranches results filtered; includes Active and Inactive | A |
| Get Branch | `GET /api/branches/{branchId}` | Branch view | Same view/manage authority; out-of-scope Staff receives safe `404 NotFound` | A |
| Create Branch | `POST /api/branches` | `{ code, displayName, sortOrder }`; `201` Branch | `workspace.branches.manage`; code normalized once and Workspace-unique; starts Active, revision 1 | A |
| Update name/order | `PATCH /api/branches/{branchId}` | `{ expectedRevision, displayName?, sortOrder? }`; updated Branch | `workspace.branches.manage`; stable code/ID; optimistic revision | A |
| Activate/deactivate | same `PATCH` | `{ expectedRevision, status: "Active" | "Inactive" }` | No delete; history remains resolvable; audited as activation/deactivation | A |
| Delete/hierarchy/move | none | none | Explicitly outside Task 3.17 | Not in scope |

Branch views contain `branchId`, stable `code`, `displayName`, `status`, `sortOrder`, `revision`, timestamps, and current same-Workspace metadata. A future typed Presentation adapter must retain only UI fields and never treat returned Workspace metadata as browser authority.

## Listing Resource Matrix

| Action | Existing HTTP contract | Exact semantics | Class |
| --- | --- | --- | --- |
| Read one Product/Branch listing | `GET /api/branches/{branchId}/products/{productId}` | Operational view contains `listing.status`, `revision`, and `updatedAt`; absence is `NotConfigured` revision 0 | B — sufficient by Presentation composition |
| Set Listed | `PUT /api/branches/{branchId}/products/{productId}/listing` with `{ listingStatus: "Listed", expectedRevision }` | Insert from NotConfigured uses revision 0; later writes use returned revision | A |
| Set Unlisted | same route with `Unlisted` | Preserves Inventory, Pricing, and history | A |
| Discover all configurable Products | Task 3.18 `GET /api/catalog/products` with Branch/listing/lifecycle filters | Non-Listed or non-Published discovery requires `catalog.products.edit`, although Inventory/Pricing permissions are independent | C for the complete operational scope |

Listing writes require `catalog.product.edit` or `catalog.products.edit`, trusted Branch scope, an Active Branch, and a non-Archived same-Workspace Product. There is no listing delete; `NotConfigured` is absence and cannot be restored through a delete API. The existing UI candidate may set Listed or Unlisted only.

## Inventory Operation Matrix

All mutation bodies use positive decimal-string `quantity` in unit `Piece` and a Workspace-scoped `operationId` of 8–128 trimmed characters. Success is `{ type: "Success", value: InventoryMutationView }`. Mutations require an Active same-Workspace Branch, a same-Workspace non-Archived Product, and trusted Branch scope; they do not require Listed state.

| Operation | Endpoint / method | Meaningful request DTO | Permission | Transaction/concurrency | Presentation safety |
| --- | --- | --- | --- | --- | --- |
| Receive | `POST /api/branches/{branchId}/inventory/receive` | `{ operationId, productId, quantity, reasonCode?, note? }` | `inventory.receive` | One locked balance, movement, audit, operation claim/result | Review before submit; retain operation ID across uncertain retry |
| Issue | `POST /api/branches/{branchId}/inventory/issue` | same | `inventory.issue` | Locked balance; rejects negative available | Explicit confirmation |
| Reserve | `POST /api/branches/{branchId}/inventory/reservations` | `{ operationId, productId, quantity }` | `inventory.reserve` | Balance + reservation + movement + audit atomically; `201` | Review/confirmation and preserve returned reservation ID |
| ReleaseReservation | `POST /api/branches/{branchId}/inventory/reservations/{reservationId}/release` | `{ operationId, quantity }` | `inventory.reserve` | Locks reservation and balance; supports partial release | Explicit confirmation; blocked by missing reservation read |
| FulfillReservation | `POST /api/branches/{branchId}/inventory/reservations/{reservationId}/fulfill` | `{ operationId, quantity }` | `inventory.reserve` | Locks reservation/balance; reduces reserved and onHand | Explicit confirmation; blocked by missing reservation read |
| MarkDamaged | `POST /api/branches/{branchId}/inventory/damage` | receive-style DTO | `inventory.damage` | Locked balance; increases damaged only within invariant | Explicit confirmation |
| RestoreDamaged | `POST /api/branches/{branchId}/inventory/damage/restore` | receive-style DTO | `inventory.damage` | Locked balance; reduces damaged | Review/confirmation |
| TransferOut / TransferIn | `POST /api/inventory/transfers` | `{ operationId, sourceBranchId, destinationBranchId, productId, quantity }` | `inventory.transfer` | One atomic transaction and two correlated movements | Explicit confirmation showing both Branches and quantity |
| CorrectionIncrease / Decrease | `POST /api/branches/{branchId}/inventory/corrections` | `{ operationId, productId, quantity, direction, reasonCode, note? }` | `inventory.adjust` | Compensating movement; never rewrites history | Explicit confirmation; reason required |
| Balance read | `GET /api/branches/{branchId}/inventory/{productId}` | no body | availability or quantity view | No client mutation revision | Use only when visibility can be safely established |
| Movement history | `GET /api/branches/{branchId}/inventory/{productId}/movements?limit=1..200` | no body | `inventory.quantity.view` | Newest first; immutable | Empty list is valid; no cursor beyond bounded limit |
| Reservation list/detail | none | none | none | Persistence has internal find-by-ID only | C — critical missing read |

## Transfer Review

The transfer mutation is suitable for a future UI and must remain one call. It validates different source/destination IDs, both Branch scopes, both Active Branches, Product existence/lifecycle, positive quantity, and source availability. The Application owns one PostgreSQL transaction, claims idempotency inside it, locks both balances in sorted Branch-ID order, writes source and destination balances, appends correlated `TransferOut` and `TransferIn`, audits once, and completes the operation result. Task 3.17-R1 ensures a failed second balance save throws through the Unit of Work so every partial write and operation claim rolls back. The Presentation must never simulate two HTTP mutations.

## Inventory Permission Matrix

| Capability | Exact permission |
| --- | --- |
| Availability-only view | `inventory.availability.view` |
| Exact quantities and movement history | `inventory.quantity.view` |
| Receive | `inventory.receive` |
| Issue | `inventory.issue` |
| Reserve, release, fulfill | `inventory.reserve` |
| Atomic transfer | `inventory.transfer` |
| Damage and restore | `inventory.damage` |
| Correction | `inventory.adjust` |

Owner receives effective authority through the trusted role. Staff permissions are independent. The direct balance/operational DTO includes numeric `available` for availability viewers, and every mutation success includes detailed balances without separately checking `inventory.quantity.view`. Because the gate requires no numeric Inventory disclosure without quantity authority and the browser must not receive raw permission codes, a safe capability/output projection is a critical contract gap. Task 3.18 already provides the safe `InStock`/`OutOfStock` availability projection for Catalog reads, but it does not solve every mutation response or operational target.

## Inventory Idempotency

The server persists a Workspace-scoped operation claim and SHA-256 fingerprint inside the same transaction. A successful identical replay returns the stored result. Reusing the operation ID with a changed operation/command returns `IdempotencyConflict` (`409`). A rolled-back transaction leaves no claim and can execute again.

Future Presentation policy after re-scope:

- generate one cryptographically strong operation ID for one confirmed intent;
- retain it while the outcome is unknown and for an explicit retry of the unchanged command;
- never create a new key for an automatic network retry;
- never auto-retry a mutation;
- create a new key only after the user changes the command or begins a new intended operation;
- after a known success, render the returned result and do not resubmit.

## Inventory Concurrency

Inventory does not accept browser `expectedRevision`. PostgreSQL row locks and idempotency serialize operations. Single-Branch operations lock one balance; reservation mutations also lock the reservation; transfers lock both balances deterministically. Invariants prevent negative `onHand`, `reserved`, `damaged`, or `available`. `InventoryConflict` is an explicit refresh/review outcome, not permission for client last-write-wins.

## Pricing Resource Matrix

| Action | Existing HTTP contract | Exact semantics | Class |
| --- | --- | --- | --- |
| Read Branch pricing | `GET /api/branches/{branchId}/products/{productId}/pricing` | Per visible type returns `base`, `override`, `effective`, and source (`WorkspaceBase`, `BranchOverride`, `NotConfigured`) | A |
| Read Workspace base pricing without a Branch | none | No GET route under `/api/products/{productId}/pricing` | C — critical missing read |
| Set Workspace Retail/Wholesale/Reference Cost | `PUT /api/products/{productId}/pricing/{priceType}` | `{ amountMinor, currency, expectedRevision }` | A mutation, blocked as a complete UI workflow by missing read |
| Clear Workspace base value | `DELETE` same route | body `{ expectedRevision }`; missing is distinct from zero | A mutation, blocked as a complete UI workflow by missing read |
| Set Branch override | `PUT /api/branches/{branchId}/products/{productId}/pricing/{priceType}` | `{ amountMinor, currency, expectedRevision }` | A |
| Clear override / inherit | `DELETE` same route | body `{ expectedRevision }`; removes override only | A |

## Base Pricing

Retail and Wholesale are Workspace Product fields and share the Product revision. Changing either increments that shared revision, so a future editor must refresh both after every successful Retail/Wholesale change or conflict. Reference Cost is a separate protected row with its own revision; absent creation uses expected revision 0. All set/clear actions reject Archived Products. Set validates a fixed ISO 4217 code and enabled Workspace currency. Zero is valid. Clear is an explicit operation and must not be represented as amount zero.

The only existing read that includes base values/revisions requires a Branch ID and `pricing.view`. It cannot initialize Workspace pricing when no Branch exists and unnecessarily couples Workspace-level editing to Branch scope. This is a critical missing read, not permission to invent a browser default revision.

## Branch Overrides

Overrides are independent rows keyed by Workspace, Branch, Product, and `Retail | Wholesale | ReferenceCost`. Expected revision 0 inserts; later set/clear uses the returned per-override revision. An absent override inherits the current base live. Branch must be Active and within trusted scope for writes. The UI must label `Inherited`, `Overridden`, and `NotConfigured` distinctly and must never copy an inherited value into an override draft unless the user explicitly chooses to create an override.

## Reference Cost

Reference Cost uses the same decimal-string Money shape but separate `referenceCost.*` permissions and a protected Product-scoped base row. It must be omitted from cards, customer sharing, ordinary sharing payloads, and unauthorized views. The existing Branch pricing read includes it only when both the route's `pricing.view` gate and `referenceCost.view` are satisfied. Reference Cost base/override mutations exist, but the missing base read and missing mutation-capability projection prevent approval of the complete authorized management surface.

## Pricing Permission Matrix

| Capability | Exact permission |
| --- | --- |
| Pricing read / Retail visibility | `pricing.view` |
| Workspace Retail/Wholesale mutation | `pricing.manage` |
| Wholesale visibility | `pricing.wholesale.view` |
| Retail/Wholesale Branch override mutation | `pricing.branchOverride.manage` |
| Reference Cost visibility | `referenceCost.view` |
| Workspace Reference Cost mutation | `referenceCost.manage` |
| Reference Cost Branch override mutation | `referenceCost.branchOverride.manage` |

These permissions are independent. The Presentation may not infer Wholesale visibility from Retail visibility, Reference Cost authority from Pricing authority, or mutation authority from read DTO presence. Existing reads also do not return a browser-safe action-capability projection, which is one reason this task cannot proceed unchanged.

## Money Contract

- PostgreSQL: non-negative `BIGINT` minor units.
- TypeScript Domain/Application: `bigint`.
- HTTP: canonical decimal-string `amountMinor`.
- UI draft: validated decimal string; never JavaScript `Number` for Money.
- Currency: canonical ISO 4217 code enabled for the Workspace.
- Zero: configured price with value zero.
- Missing: no configured value, never equivalent to zero.
- No FX, tax, conversion, repricing, promotions, or floating point.

## Branch Scope

`TrustedActorContext` remains server authority. Owners are constrained to `AllBranches`. Staff may hold `AllBranches` or a non-empty `SelectedBranches`. Branch lists are filtered for selected Staff; exact reads and operational mutations verify requested Branch IDs. Transfer requires both source and destination in scope. Branch IDs in URLs/bodies are requested resources only.

## Multi-Tenant

Every reviewed repository query includes `workspaceId` from trusted context. Branch, Product, listing, balance, reservation, movement, price, currency, and audit operations are Workspace-scoped. The browser does not choose Workspace or Actor. No cross-Workspace discovery or movement exists.

## Non-Disclosure

Out-of-scope or foreign Branch/Product/reservation targets map to safe not-found outcomes where specified. Route handlers map missing authentication to `401`, restricted sessions and disallowed write origins to `403`, and infrastructure failures to subsystem-specific `503`. A future typed client must discard same-Workspace metadata and raw actor IDs it does not need, never reconstruct authority from raw IDs, and render only server-permitted DTO fields. The missing capability projection must be solved server-side before implementation; raw permission arrays, role, or allowed Branch IDs are not an approved substitute.

## Product Selection / Task 3.18 Reuse

Task 3.18 `GET /api/catalog/products` is the canonical Product search and supplies Product ID, exact code/name, lifecycle, listing state, cursor pagination, and Branch-aware filters. It must be reused; no duplicate Product repository/search endpoint or generic BFF is approved.

It is sufficient for listing managers because non-Listed/non-Published filters require the same `catalog.products.edit` authority used by listing mutation. It is not sufficient for every Inventory/Pricing operator: Task 3.17 accepts active non-Archived Products regardless of listing and allows Draft operations, while Task 3.18 limits an actor without `catalog.products.edit` to Published Products and, with Branch context, Listed Products. Inventory/Pricing permissions are independently assignable. A user may therefore be authorized for an operation but unable to discover a valid Product target. This is a critical missing read/capability composition, not approval for a duplicate search API.

## HTTP / API Sufficiency Matrix

Classification: A existing API sufficient; B sufficient with Presentation composition; C missing read; D missing mutation; E architecture/contract decision required.

| UI workflow | Class | Finding |
| --- | --- | --- |
| Branch list/detail/create/edit/status | A | Complete, revisioned, audited, tenant-safe |
| Branch hard delete or hierarchy | Out of scope | Must not be invented |
| Read exact listing state | B | Available through operational Branch Product GET |
| Set Listed/Unlisted from NotConfigured or configured state | A | Complete optimistic mutation |
| Product selection for listing managers | B | Reuse Task 3.18 with edit-authorized filters |
| Product selection for all valid Inventory/Pricing targets | C | Operational permissions do not grant non-Listed/non-Published discovery |
| Availability-only Catalog overview | B | Reuse Task 3.18 semantic availability projection |
| Exact balance and movement history | A | Per Product/Branch, permission-filtered; history limit 1–200 |
| Receive/Issue/Reserve/Damage/Restore/Correction | A | Named, idempotent, transactional mutations |
| Release/Fulfill usable management flow | C | Mutations exist, but active reservation discovery/detail does not |
| Atomic transfer | A | One transaction and one endpoint; must not be client-orchestrated |
| Server-derived mutation action availability | C | No safe capability DTO for independent permissions |
| Workspace base price read/edit/clear | C | Mutations exist; Branch-independent current value/revision read is missing |
| Branch override read/edit/clear | A | Read and mutation are complete when Branch/Product are known |
| Reference Cost management | C | Mutations exist, but base read/capability gaps remain |
| Schema/migration expansion | E / prohibited | Any persistence need requires a later re-scope; none is approved here |

No critical Task 3.22 mutation is entirely absent (`D`), but the `C` gaps make the complete operational workflows unsafe or unusable. They are blockers under the planning-gate rule.

## Critical Gaps

1. **Mutation capabilities:** add or augment a server-derived, browser-safe action-capability read without exposing raw permissions, role, actor ID, Workspace ID, or allowed Branch IDs. It must cover Branch, listing, each Inventory action, base pricing, Branch override, and Reference Cost independently.
2. **Reservation discovery:** add a tenant- and Branch-scoped active reservation list/detail read containing the safe Product identity, reservation ID, status, original/remaining quantity, and timestamps needed for Release/Fulfill. No persistence change appears necessary, but no API expansion is approved by this task.
3. **Workspace base-pricing read:** expose current visible Retail/Wholesale/Reference Cost base values and exact concurrency revisions without requiring an arbitrary Branch. It must preserve independent visibility permissions.
4. **Operational Product discovery:** decide the smallest safe reuse/extension that lets an independently authorized Inventory/Pricing actor discover every Product state the corresponding Task 3.17 mutation accepts, without duplicating Task 3.18 search or silently broadening Catalog disclosure.
5. **Inventory response disclosure:** reconcile availability-only authority with direct/mutation DTOs that carry numeric balances. The resolved contract must prevent numeric Inventory from reaching an actor without `inventory.quantity.view`.

These are bounded contract gaps, not reasons to redesign Domain ownership, add persistence, or create a generic BFF.

## Presentation Information Architecture

The following remains a proposed IA for a future re-scoped and approved contract; it is not implementation authorization:

```text
Operations
├── Branches
├── Product Listings
├── Inventory
│   ├── Stock Overview
│   ├── Receive / Issue
│   ├── Reservations
│   ├── Damage / Restore
│   ├── Transfers
│   └── Corrections
└── Pricing
    ├── Workspace Prices
    ├── Branch Overrides
    └── Reference Cost
```

One authenticated Operations area should use semantic section navigation and URL-backed selected section/Branch/Product context. UI grouping does not move Branch, Catalog Branch Product, Inventory, or Pricing ownership.

## Mobile First

Phone is a complete workflow: Branch selector, canonical Product search, compact status/balance/price cards, progressive operation forms, review step, full-width actions, touch-sized controls, and explicit success/retry state. No desktop-only stock table, hover dependency, drag/drop, or horizontal action strip is approved.

## Responsive

Phone uses stacked cards and progressive disclosure. Tablet may place selector and detail panes adjacent. Desktop/wide desktop may add denser summaries or a progressively enhanced table only when the same actions remain available by keyboard/touch and the phone card flow remains canonical. No horizontal page overflow.

## RTL/LTR

English is LTR and Arabic is RTL in the same component tree. System labels, validation, state, confirmation, and outcomes are localized. Workspace-entered Branch/Product names, stable codes, currency codes, operation IDs, quantities, and Money strings remain exact with direction isolation; they are never auto-translated.

## Accessibility

A future approved implementation must provide semantic navigation/headings, persistent labels and descriptions, visible focus, keyboard operation, touch/mouse parity, non-color-only stock/listing/status meaning, polite live success/loading updates, alert errors, reduced-motion compliance, and native accessible confirmation dialogs with initial focus, containment, Escape handling, background inertness, and exact focus restoration.

## Confirmation Policy

- Explicit modal confirmation: Branch deactivation, Issue, FulfillReservation, MarkDamaged, Transfer, Correction, Workspace price clear, and Branch override clear/inherit.
- Review-before-submit step: Receive, Reserve, ReleaseReservation, RestoreDamaged, listing changes, price set/update, and Branch create/update.
- Confirmation copy shows exact Branch/Product, operation, quantity/unit or price/currency, and irreversible historical meaning without inventing approvals.
- No automatic mutation retry. Conflict/idempotency outcomes require refresh and explicit user action.

## Error / Loading / Empty States

| Subsystem | Safe HTTP outcomes from current handlers |
| --- | --- |
| Branch | `200/201`; `400 InvalidInput`; `401 AuthenticationRequired`; `403 Forbidden`, restricted session, OriginNotAllowed; `404 NotFound`; `409 Conflict`/`CodeConflict`; `503 BranchServiceUnavailable` |
| Listing/Pricing | `200`; `400 InvalidInput`, BranchInactive, ProductArchived, CurrencyNotAllowed; `401`; `403` permission/restricted/origin; `404 BranchNotFound`/`ProductNotFound`; `409 Conflict`; `503 BranchProductServiceUnavailable` |
| Inventory | `200` (`201` Reserve); `400 InvalidInput`, InvalidQuantity, BranchInactive, ProductArchived, InsufficientAvailableStock, ReservationNotActive; `401`; `403` permission/restricted/origin; `404 BranchNotFound`, ProductNotFound, ReservationNotFound; `409 InventoryConflict`/`IdempotencyConflict`; `503 InventoryServiceUnavailable` |
| Task 3.18 Product selection | `200`; `400 InvalidQuery`/`InvalidCursor`; `401`; `403` permission/restricted; `404 BranchNotFound`/ProductNotFound; `503 CatalogQueryServiceUnavailable` |

No reviewed route uses `422`. Presentation mapping must retain subsystem distinctions.

Explicit states after re-scope: loading; no Branches; no selected Branch; no Products; NotConfigured listing; zero balance versus unavailable balance; empty movement history; no active reservations; no base price; inherited override; explicit override; no Reference Cost; action unavailable by server capability; optimistic conflict; idempotency conflict; safe not-found; expired/restricted/forbidden/origin-denied; retryable `503`/network failure; success with refreshed server truth. Empty is not an error.

## Database / Migration Decision

No database or migration change is approved. The current chain ends at `0015`; no `0016` exists or is required by this planning work. The identified gaps appear to be read/Application/HTTP contract gaps over existing persistence. If later analysis proves persistence is required, the next decision must remain ReScopeRequired and obtain separate approval before schema work.

## Dependency Decision

No new runtime or development dependency is approved. Existing Next.js, React, TypeScript, CSS, native HTML controls/dialogs, typed clients, and test tools are sufficient for a future UI after contract gaps are resolved. No table, form, state, drag/drop, chart, localization, or Money library is approved.

## Architecture Decision

No architecture redesign and no new ADR are approved. Existing DDD/Clean Architecture/Modular Monolith ownership remains correct. The missing reads/capabilities must be resolved through separately reviewed Application-owned authorization/orchestration and thin HTTP contracts; repositories must not call repositories, React must not own business rules, and transfer remains Inventory-owned and atomic.

## Task 3.22 Decision

**ReScopeRequired — Planned and not implementation-approved.**

No `Task-3.22-Implementation-Contract.md` was created because critical workflows classify as `C`. This gate does not self-approve Task 3.22 and does not approve any later task.

## WILL IMPLEMENT

This planning task implements documentation only: roadmap reconciliation, source-truth API/permission/concurrency matrices, a provisional Mobile-First IA, and the ReScopeRequired decision.

A future Task 3.22 implementation may include the Branch/listing/Inventory/Pricing surfaces described here only after the critical contracts are independently planned, implemented, verified, merged, and a new implementation contract is approved.

## WILL NOT IMPLEMENT

- React UI, route/page implementation, Application use cases, repositories, schema, migrations, new implementation tests, or Production deployment in this planning task.
- General Multi-Warehouse or Warehouse/geographic hierarchy.
- Purchasing, suppliers, purchase/sales orders, invoices, accounting, payments, tax, FX, promotions, price rules, or automatic repricing.
- Product Entry, Catalog Search, Reference Data, Direct Sharing, public sharing, WhatsApp, barcode, analytics, AI, forecasting, ERP, or marketplace redesign.
- Approval workflows, arbitrary units, batch/lot/serial tracking, direct quantity editing, movement/history deletion, or client-simulated transfer.
- New dependency or migration `0016`.

## Acceptance Criteria

1. Roadmap authority records Tasks 3.14–3.21 Completed / merged, PR #24, and baseline `4f1115d2ac98fc4411ac46f081652554f6d04ec9` in English and Arabic.
2. Task 3.22 is unambiguously ReScopeRequired and not implementation-approved; no later task is approved.
3. Every current Branch/listing/Inventory/pricing route, DTO, permission, scope, error, concurrency, idempotency, and transaction contract is source-cited without invented semantics.
4. Atomic transfer remains one server operation.
5. Critical missing reads/capabilities are explicit and are not silently approved as API work.
6. No implementation contract, application source, schema, migration, dependency, test behavior, or Production resource is changed.
7. The provisional IA is Mobile-First, bilingual, RTL/LTR-safe, accessible, and constrained to existing Domain ownership.
8. Documentation-only verification and review-bundle integrity pass.

## Known Limitations

- This gate validates current contracts; it does not design or approve the missing endpoints/DTOs.
- Movement history is bounded to the newest 1–200 entries and has no cursor contract.
- Listing has no operation to return configured state to `NotConfigured`; this is documented and not treated as a blocker for Listed/Unlisted management.
- Direct Task 3.17 availability and mutation DTOs need disclosure reconciliation before an availability-only UI can be approved.
- No live UI/browser QA applies because no Task 3.22 UI was implemented.

## Risks

| Risk | Required control |
| --- | --- |
| UI infers permissions or Branch scope | Server-derived safe capabilities; every request reauthorized |
| Release/Fulfill acts on stale or guessed reservation | Approved reservation read plus explicit review and idempotency |
| Base pricing uses guessed revision | Branch-independent authoritative read; refresh after success/conflict |
| Operational user cannot discover valid Product | Approved Task 3.18-aligned discovery contract without duplicate search |
| Availability viewer receives numeric stock | Server output filtering/capability correction before UI approval |
| Duplicate Inventory movement after uncertain network result | Stable operation ID, no automatic retry, explicit unchanged retry |
| Transfer becomes partially client-orchestrated | One `/api/inventory/transfers` call only |
| Money loses precision or missing becomes zero | Decimal strings/`bigint`, explicit configured/absent states |
| Scope expands into ERP/Multi-Warehouse | Enforce WILL NOT boundaries and separate decisions |

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.22-Planning-Final-Report.md`
- Planning review ZIP and detached checksum under `artifacts/task-reviews/` after verification.

## Files Modified

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Verification Results

Planning-only verification passed: `git diff --check`, `git status --short`, `git diff --stat`, focused authority/matrix assertions, strict UTF-8 and bilingual checks, relative-link checks, docs-only scope, no Task 3.22 implementation contract/source, no migration `0016`, dependency-file non-change, and review artifact hashing. Git emitted only normal Windows LF-to-CRLF working-copy notices. Full application tests, npm audit, database operations, and migrations are prohibited by this task and were not run.

## Git Integrity

Work remains on `docs/task-3.22-planning` at `4f1115d2ac98fc4411ac46f081652554f6d04ec9`, which is the required baseline. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion is performed.

## DEV-001 Integrity

The planning bundle uses the current manifest schema while replacing the generic implementation verification matrix with only the task-permitted documentation checks. The generic `review:bundle` executable is not invoked because its required full unit, PostgreSQL integration, build, and database checks directly conflict with this planning gate. The bundle contains exact changed documentation, sanitized Git/documentation evidence, a complete hash manifest, and a detached ZIP checksum; no credentials, environment files, database content, or application source are copied.

Artifacts:

- `artifacts/task-reviews/3.22-Planning/`
- `artifacts/task-reviews/QSC-Task-3.22-Planning-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-Planning-Review.zip.sha256`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-Final-Report.md`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-Review.zip`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-Review.zip.sha256`

## Next Recommendation

Stop after independent review of this planning bundle. Define and independently approve the smallest browser-safe capability, reservation-read, base-pricing-read, Product-discovery, and Inventory-disclosure contracts. Do not create an implementation branch or begin Task 3.22 UI until those contracts are implemented/merged and a new planning gate explicitly changes Task 3.22 to Approved Next Implementation.
