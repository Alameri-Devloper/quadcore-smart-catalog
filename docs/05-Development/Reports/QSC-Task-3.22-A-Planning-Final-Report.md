# QSC Task 3.22-A Planning Final Report

## Status

ReadyForReview. Planning outcome: **Corrective Contracts Approved**. This status does not claim independent review and does not approve the Task 3.22 Presentation.

## Task

Task 3.22-A Planning Gate — Operational Management Contract Remediation.

## Branch

`docs/task-3.22-a-contract-remediation-planning`

## Baseline

Required base and actual planning HEAD: `260b4116749d3460b8262b3ccf034b8ba26d00a5` on `feature/product-entry-engine`. This baseline contains merged Task 3.22 Planning/Planning-R1 through PR #25 and descends from the Task 3.21 PR #24 baseline.

## English Summary

All seven independently approved Task 3.22 gaps are resolvable through bounded server-contract work over existing persistence and architecture. The selected decision is a narrow hybrid: operation-specific management reads may disclose the minimum state/revision needed by an actor who already holds the corresponding mutation permission, while semantic server-derived capability DTOs support Presentation navigation and resource actions. No permission globally implies another permission. Task 3.18 remains the only Product search authority; Task 3.17 Domains retain Listing, Inventory, Reservation, Pricing, and Reference Cost ownership. No schema, migration, dependency, new permission code, ADR, or UI is required.

## Arabic Summary

يمكن حل الفجوات السبع المعتمدة للمهمة 3.22 عبر أعمال محدودة لعقود الخادم فوق قاعدة البيانات والمعمارية الحاليتين. القرار المختار حل هجين ضيق: تسمح قراءات الإدارة الخاصة بالعملية بكشف الحد الأدنى من الحالة والمراجعة لممثل يملك صلاحية التعديل المقابلة، وتدعم إسقاطات قدرات دلالية مشتقة من الخادم تنقل الواجهة وأفعال الموارد. لا تستلزم أي صلاحية صلاحية أخرى بصورة عامة. تبقى المهمة 3.18 سلطة بحث المنتجات الوحيدة، وتحتفظ مجالات المهمة 3.17 بملكية الإدراج والمخزون والحجوزات والتسعير والتكلفة المرجعية. لا يلزم مخطط أو ترحيل أو اعتماد أو صلاحية جديدة أو ADR أو واجهة.

## Approved Gap Baseline

The plan accepts without re-litigation: management read/mutation composition; Listing read/revision and singular-edit discovery; Inventory/Pricing/Reference Cost Product discovery; Reservation list/detail reads; Branch-independent base-pricing reads; Inventory numeric disclosure; and browser-safe management capability/state projection.

تقبل الخطة دون إعادة مناقشة فجوات تركيب القراءة/التعديل الإداري، وقراءة الإدراج ومراجعته واكتشاف ممثل الصلاحية المفردة، واكتشاف منتجات المخزون والتسعير والتكلفة المرجعية، وقراءات الحجوزات، وقراءة التسعير الأساسي المستقلة عن الفرع، وكشف أرقام المخزون، وإسقاط حالة/قدرات الإدارة الآمن للمتصفح.

## Read/Manage Authority Options

| Option | Authorization consistency | Least privilege/disclosure | API/UI/test impact | Decision |
| --- | --- | --- | --- | --- |
| A — manage implies view | Changes independent permission semantics and broadens general reads | Weakest boundary | Simple UI but high semantic/regression risk | Rejected |
| B — operation-specific management reads | Keeps ordinary reads unchanged | Minimum state for an already authorized operation | Explicit endpoints and permission cross-product tests | Selected |
| C — bounded capability DTO | Semantic and server-derived | No resource data or raw authority | Simplifies navigation; writes still reauthorize | Selected |
| D — hybrid B+C | Preserves existing philosophy while completing management workflows | Bounded per operation/resource | Clear UI and testable policies without a generic data BFF | **Selected** |

## Selected Decision or DecisionRequired

**Selected Decision: Option D, bounded hybrid.** This is an explicit operation-specific authorization-composition change, not a global permission implication. It is fully defined by the existing Application-owned authorization model and requires no ADR. If implementation later requires a global implication, a new permission philosophy, Domain ownership change, or persistence expansion, that slice must stop as `ReScopeRequired`.

## Security Impact

- `TrustedActorContext` remains authoritative and is never serialized.
- No raw PermissionCode array, role, Workspace/actor ID, allowed Branch ID list, creator ID, audit internals, or persistence internals are returned.
- Ordinary Catalog and sharing disclosure is unchanged.
- Reference Cost management state remains isolated to explicitly authorized management reads.
- Every Branch-scoped read and every write validates trusted Branch scope and same-Workspace existence.
- Every write remains independently authorized; capability and allowed-action fields are advisory.

## Listing Management Contract

`GET /api/branches/{branchId}/products/{productId}/listing` returns `listingStatus`, authoritative `revision`, `updatedAt`, and resource-scoped `allowedActions`. It accepts singular `catalog.product.edit` or plural `catalog.products.edit`, plus Branch scope. `NotConfigured` remains absence; revision `0` is valid only when returned by the server for that absence. Existing Listing PUT remains the mutation authority and conflicts require a fresh GET.

## Operational Product Discovery Contract

`GET /api/catalog/operational-products` is added within Catalog Query, using the current repository, normalization, deterministic search, cursor fingerprint, Workspace constraints, Branch checks, and 24/default–60/max pagination. Required `purpose` values are `Listing`, `Inventory`, `WorkspacePricing`, `BranchPricing`, `WorkspaceReferenceCost`, and `BranchReferenceCost`. The Application derives authority from trusted existing permissions and fixes results to non-Archived Products; Branch purposes require scoped `branchId` and allow any Listing state. Output is minimal Product ID/code/name/lifecycle and optional Branch/listing state. Ordinary Catalog behavior is unchanged.

## Reservation Read Contract

- `GET /api/branches/{branchId}/inventory/reservations?productId=...&cursor=...&limit=...` returns only `Active`/`PartiallyFulfilled` reservations for a required Product.
- `GET /api/branches/{branchId}/inventory/reservations/{reservationId}` returns the current status, including non-actionable status after a stale selection.

Both require `inventory.reserve`, trusted Branch scope, and same-Workspace resources. DTO fields are reservation ID, Branch ID, Product ID, status, original/remaining decimal-string quantity, timestamps, and `Release`/`Fulfill` allowed actions. `createdByActorId` and audit data are excluded. Release/Fulfill still lock and revalidate current state and remaining quantity.

## Workspace Base Pricing Read Contract

`GET /api/products/{productId}/pricing` is Branch-independent and field-filtered. Retail is visible through `pricing.view` or operation-specific `pricing.manage`; Wholesale through the existing read composition or operation-specific `pricing.manage`; Reference Cost through the existing read composition or operation-specific `referenceCost.manage`. Actions appear only for the appropriate manage permission. Every slot distinguishes `Configured` from `NotConfigured`, preserves zero, returns decimal-string Money, currency, and the exact optimistic revision. Absent Retail/Wholesale uses the Product revision; only an absent Reference Cost row uses revision `0`.

## Branch Override Management Contract

`GET /api/branches/{branchId}/products/{productId}/pricing/management` returns independently authorized Retail/Wholesale and Reference Cost slots with base, override, effective, source, revisions, and allowed set/clear actions. `pricing.branchOverride.manage` and `referenceCost.branchOverride.manage` authorize their respective minimum management state without becoming general view permissions. Absent override revision is `0`; clear means inherit; inherited values are never copied into overrides silently.

## Reference Cost Contract

Reference Cost has separate operational-discovery purposes, base management authorization, Branch override management authorization, capability booleans, and negative disclosure tests. Neither manage permission implies `referenceCost.view`. Reference Cost remains absent from ordinary Catalog cards, customer sharing, Direct Sharing, Retail/Wholesale-only responses, and unauthorized Staff responses.

## Inventory Disclosure Contract

The direct Inventory read becomes discriminated. Availability-only output contains Product/Branch/unit plus `InStock` or `OutOfStock`, with no numbers, revision, or timestamp. Exact `available`, `onHand`, `reserved`, and `damaged` plus revision/timestamp require `inventory.quantity.view`.

Every Inventory mutation and idempotent replay is projected in Application using the current trusted context. Quantity-authorized actors may receive detailed balances; availability-authorized actors receive semantic states; actors with neither read permission receive no balance/availability. Operation ID and success status remain; Reservation ID/status/remaining quantity remain minimum state for `inventory.reserve`; Transfer ID remains for `inventory.transfer`. Persisted idempotency outcome is internal and never bypasses response-time disclosure.

## Management Capability Contract

`GET /api/operations/capabilities` returns nested semantic booleans for Branch view/manage, Listing manage, each Inventory view/action, Pricing view/Wholesale/manage/override, and Reference Cost view/base-manage/override-manage. It reads trusted context only, performs no repository access, returns no Branch IDs, and does not prove any particular resource is mutable. Resource reads add scoped `allowedActions`; writes remain decisive.

## Exact API Matrix

| Contract | Owner | Endpoint | Request | Response core | Permission/Branch rule | Errors/non-disclosure | Revision/persistence | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Semantic capabilities | Application authorization composition | `GET /api/operations/capabilities` | none | semantic booleans | trusted context; no resource scope | `401/403/503`; no raw authority | no repository | A/C |
| Operational Product page | Catalog Query | `GET /api/catalog/operational-products` | `purpose,q?,branchId?,cursor?,limit?` | minimal Product page | purpose permission; Branch scope when required | `400/401/403/404/503`; no price/stock/ref-cost | existing search/cursor; no schema | A/C |
| Listing state | Catalog Branch Product | `GET /api/branches/{branchId}/products/{productId}/listing` | path | status/revision/actions | singular or plural edit; Branch scope | safe `404`; no Catalog field broadening | existing listing port; absence `0` | A/C |
| Reservation page | Inventory | `GET /api/branches/{branchId}/inventory/reservations` | `productId,cursor?,limit?` | actionable page | `inventory.reserve`; Branch scope | safe `404`; no creator/audit | add list port; existing index; no schema | A |
| Reservation detail | Inventory | `GET /api/branches/{branchId}/inventory/reservations/{reservationId}` | path | current state/actions | `inventory.reserve`; Branch scope | wrong Branch/foreign/missing `404` | existing find port | A |
| Workspace prices | Catalog Branch Product | `GET /api/products/{productId}/pricing` | path | field-filtered slots/actions | read or base-manage per field | omit unauthorized; none `403`; Product `404` | exact Product/ref-cost revision | A/C |
| Branch price management | Catalog Branch Product | `GET /api/branches/{branchId}/products/{productId}/pricing/management` | path | base/override/effective/source/actions | override-manage per field; Branch scope | omit unauthorized; safe `404` | existing pricing port; override absence `0` | A/C |
| Direct Inventory read | Inventory | existing balance GET | path | semantic or detailed view | availability or quantity; Branch scope | no number without quantity | existing balance port | B |
| Inventory mutation results | Inventory | all existing mutation routes | existing bodies | context-filtered outcome | existing mutation permission | no unauthorized balance; replay filtered | existing idempotency persistence | B |

Class key: `A` read-only Application/HTTP addition; `B` existing DTO hardening; `C` authorization composition; `D` persistence; `E` ADR. No proposed item is `D` or `E`.

## Permission Matrix

| Management need | Existing permission rule |
| --- | --- |
| Listing discovery/state/mutation | `catalog.product.edit` or `catalog.products.edit` |
| Inventory operational discovery | any Inventory view or mutation permission |
| Reservation page/detail/release/fulfill | `inventory.reserve` |
| Workspace Retail/Wholesale management state/actions | `pricing.manage`; read-only fields retain existing view rules |
| Branch Retail/Wholesale override state/actions | `pricing.branchOverride.manage` |
| Workspace Reference Cost management state/actions | `referenceCost.manage`; read-only field retains existing composed view rule |
| Branch Reference Cost override state/actions | `referenceCost.branchOverride.manage` |
| Semantic Inventory availability | `inventory.availability.view` or `inventory.quantity.view` |
| Numeric Inventory balances | `inventory.quantity.view` only |

No new permission is required and no code is aliased or deleted.

## Branch Scope

Branch IDs are requested resources only. Every Branch read checks `AllBranches` or membership in `SelectedBranches`, then same-Workspace Branch existence. Operational discovery validates its Branch. Reservation and management reads use safe not-found behavior. Transfer still validates both Branches atomically; discovery against one Branch never authorizes another.

## Multi-Tenant

Every proposed repository call receives `workspaceId` only from trusted context. Product, Branch, Listing, Reservation, price, balance, and operation queries remain Workspace-scoped. No request or DTO accepts/returns Workspace identity as authority.

## Non-Disclosure

Unauthorized fields are omitted server-side. Foreign/out-of-scope resources are non-disclosing. Capability DTOs reveal semantic actions only and never resource existence. Management visibility does not flow into ordinary Catalog, sharing, or unrelated reads. Inventory numeric values never reach availability-only or mutation-only actors.

## Database Decision

Existing PostgreSQL persistence is sufficient. Catalog Query and Branch Product ports already support the required reads. Reservation exact lookup uses the existing Workspace/Reservation primary key. The Product-scoped actionable collection uses `inventory_reservations_product_idx` over Workspace, Branch, Product, and status.

## Migration Decision

No migration. The chain remains `0000–0015`; migration `0016` is neither required nor approved. If implementation cannot meet the focused Reservation query contract with the current index, stop and re-scope rather than adding persistence silently.

## Dependency Decision

No runtime or development dependency is required or approved.

## Architecture Decision

No redesign and no ADR. The hybrid is a bounded Application authorization composition. DDD, Clean Architecture, Modular Monolith boundaries, multi-tenancy, thin handlers, PostgreSQL authority, Domain ownership, repository isolation, atomic Inventory transfer, and BIGINT/`bigint`/decimal-string Money remain unchanged.

## Implementation Slices

1. **3.22-A1 — Authorization policies and semantic capabilities:** shared policy vocabulary, global semantic booleans, resource action projection.
2. **3.22-A2 — Operational Product discovery and Listing state:** canonical bounded search plus authoritative Listing read.
3. **3.22-A3 — Reservation reads:** Product-scoped actionable page and exact detail.
4. **3.22-A4 — Pricing management reads:** Workspace base and Branch override state with Reference Cost isolation.
5. **3.22-A5 — Inventory disclosure hardening:** direct reads, mutation results, and idempotent replay projection.

Each slice must include focused Application, HTTP, persistence where relevant, permission-combination, scope, tenant, error, non-disclosure, cursor/revision/conflict, and regression tests.

## Dependencies Between Slices

A1 establishes policy/action vocabulary and must merge first. A2–A5 depend on A1 but are otherwise independently implementable and may proceed in parallel after it. A3 consumes A2 discovery only at future Presentation time, not as a repository dependency. Task 3.22 Presentation remains blocked until A1–A5 are all merged.

## Roadmap Decision

**Outcome A — Corrective Contracts Approved.** Task 3.22-A corrective implementation becomes the sole **Approved Next Implementation**, subject to independent review of this planning artifact. Task 3.22 Presentation remains Planned / blocked and is not approved. No later task is approved.

## WILL IMPLEMENT

After independent review, implement only A1–A5 as specified in `Task-3.22-A-Operational-Management-Contract.md`, including focused tests and documentation. No code is implemented by this planning gate.

## WILL NOT IMPLEMENT

- Task 3.22 UI, React components, operational pages, or client-side authority.
- Global manage-implies-view, new permissions, permission aliasing/deletion, Domain ownership changes, or generic BFF/search duplication.
- Schema, migration `0016`, dependency, database write, or Production deployment.
- Multi-Warehouse, ERP, purchasing, orders, accounting, tax, FX, promotions, analytics, AI, WhatsApp, or public sharing.

## Acceptance Criteria

1. Capability and resource-action responses contain semantic values only; every write reauthorizes.
2. Singular/plural Listing actors both receive canonical non-Archived discovery and authoritative Listing state without permission aliasing.
3. Operational Product selection reuses Task 3.18 search/repository/cursor behavior and does not alter ordinary Catalog disclosure.
4. Reservation page/detail are Product-scoped, actionable, paginated, tenant/Branch-safe, and omit creator/audit data.
5. Workspace/Branch pricing state preserves independent permissions, exact revisions, configured/missing/zero, inherit/override/source, and Reference Cost isolation.
6. No exact Inventory balance reaches an actor without `inventory.quantity.view`, including first mutation and idempotent replay.
7. No schema, migration, dependency, new permission, duplicate repository, architecture change, or UI is introduced.
8. All five slices pass focused Application/HTTP/persistence and regression gates before Task 3.22 is reconsidered.

## Risks

| Risk | Required control |
| --- | --- |
| Management read accidentally becomes general view | Dedicated endpoints, field policies, negative cross-permission tests |
| Capability DTO becomes client authority | Advisory semantics and mutation-time reauthorization |
| Operational search forks Task 3.18 | Same Catalog Query repository/normalizer/cursor, separate minimal projection only |
| Reservation list becomes unbounded or inefficient | Required Product, actionable statuses, max 60, opaque cursor, current composite index |
| Reference Cost leaks | Separate purpose/field policy and ordinary Catalog/sharing regression tests |
| Replay returns formerly stored detail | Current-context response projection on every replay |
| Absent state produces guessed revision | Only server-returned explicit absent state supplies the revision |

## Known Limitations

- Reservation collection is Product-scoped and actionable-only; general history/reporting is excluded.
- Global capabilities do not enumerate Branches or guarantee resource mutability.
- Operational discovery is selection-only, not a replacement for ordinary Catalog cards/details.
- This gate does not implement or approve Task 3.22 Presentation.

## Files Created

- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.22-A-Planning-Final-Report.md`
- `artifacts/task-reviews/3.22-A-Planning/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-Review.zip.sha256`

## Files Modified

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Verification

Planning-only verification passed: `git diff --check`, `git status --short`, `git diff --stat`, focused permission/Application/HTTP/port/index assertions, bilingual/UTF-8/relative-link checks, exact branch/HEAD/ancestor checks, docs-only scope, no migration `0016`, no implementation contract, and no application/schema/dependency changes. The fresh review archive passed exact-source manifest verification and its detached SHA-256 matched. Git emitted only normal Windows LF-to-CRLF working-copy warnings. Full application tests, `npm audit`, database writes, and migrations were prohibited and were not run.

## Git Integrity

The planning branch remains `docs/task-3.22-a-contract-remediation-planning` at `260b4116749d3460b8262b3ccf034b8ba26d00a5`, with that commit confirmed as the required ancestor. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was performed.

## DEV-001 Integrity

The planning-only bundle contains exact copies of the four changed/created documentation files, sanitized Git and focused-verification evidence, a complete SHA-256 manifest, and a detached ZIP checksum. Credentials, environment files, database content, application source, and Git internals are excluded. The full-suite review command was not run because this planning gate prohibits the full application suite and database operations.

Repository-local artifacts:

- `artifacts/task-reviews/3.22-A-Planning/`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-A-Planning-Review.zip.sha256`

Exported review copies:

- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-Final-Report.md`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-Review.zip`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-A-Planning-Review.zip.sha256`

## Next Recommendation

Submit this planning gate for independent review. If accepted, implement Task 3.22-A1 first, then A2–A5 as bounded corrective slices. Do not begin Task 3.22 Presentation until every corrective slice is independently reviewed and merged and a later roadmap gate explicitly approves the UI.

## التوصية التالية

تقدم بوابة التخطيط هذه للمراجعة المستقلة. عند قبولها تنفذ 3.22-A1 أولاً ثم A2–A5 كشرائح تصحيح محدودة. لا تبدأ واجهة المهمة 3.22 حتى تراجع كل شريحة تصحيحية بصورة مستقلة وتدمج، وتعتمد بوابة خارطة لاحقة الواجهة صراحةً.
