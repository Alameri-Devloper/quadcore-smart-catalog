# Task 3.22-A Operational Management Contract | عقد تصحيح إدارة العمليات للمهمة 3.22-A

**Status:** Task 3.22-A2 implementation complete / **ReadyForReview**; A3 is not started or automatically approved · **Implementation baseline:** `32012c87a521c6fa510ad7ccf03216a180a88725` · **Date:** 2026-09-02

A1 is merged through PR #28. A2 implements only the approved canonical operational Product discovery and authoritative Listing management-state boundary. It does not approve A3, A4, A5, or Task 3.22 Presentation; independent A2 review and merge are required before any next slice is considered.

يعتمد هذا العقد شرائح تنفيذ عقود الخادم التصحيحية المحددة أدناه فقط، ولا يعتمد واجهة المهمة 3.22.

## English Contract

### Objective and approved gap baseline

Task 3.22-A resolves the seven independently approved blockers without changing Domain ownership or persistence:

1. management read/mutation permission composition;
2. Listing state/revision access for mutation-authorized actors;
3. canonical operational Product discovery for Listing, Inventory, Pricing, and Reference Cost actors;
4. actionable Reservation collection/detail reads;
5. Branch-independent Workspace base-pricing reads;
6. server-side Inventory numeric-disclosure hardening; and
7. browser-safe semantic management capabilities.

Task 3.22 remains Planned and blocked until every Task 3.22-A slice is implemented, independently reviewed, and merged. The bounded Reservation persistence gate selected `EXISTING INDEX SUFFICIENT`; no migration or preliminary persistence task is required.

### Read/manage authority options

| Option | Assessment | Decision |
| --- | --- | --- |
| A — global or selected manage-implies-view | Simple for clients but silently changes the meaning of independently registered permissions and broadens existing read surfaces | Rejected for 3.22-A |
| B — operation-specific management reads | Preserves least privilege by returning only state/revision required to exercise an existing mutation permission | Selected |
| C — bounded server-derived capability DTO | Gives Presentation semantic booleans/action identifiers without raw authority data; writes remain independently authorized | Selected |
| D — narrow hybrid | Combines B for authoritative management state with C for navigation/resource actions, while leaving ordinary reads unchanged | **Selected contract** |

The hybrid is an explicit, bounded authorization-composition change (`C` classification below), not a global permission implication. `pricing.manage` still does not imply general `pricing.view`; `referenceCost.manage` still does not imply general `referenceCost.view`; and singular/plural Catalog edit codes remain distinct.

### Security impact

- `TrustedActorContext` remains the only Workspace, actor, permission, role, and Branch-scope authority.
- Management reads disclose only the minimum state needed by an actor who already holds the corresponding mutation permission.
- Ordinary Catalog, Pricing, Inventory availability, customer sharing, and Direct Sharing behavior is not broadened.
- No response contains raw permission codes, role, `workspaceId`, `actorId`, `allowedBranchIds`, `createdByActorId`, audit data, storage data, or persistence internals.
- Resource-scoped actions are advisory Presentation data only. Every mutation reauthorizes permission, Workspace, Branch scope, resource state, lifecycle, and concurrency.
- Authentication failures remain `401`; restricted sessions and explicit permission failures remain `403`; foreign/out-of-scope resources use the existing safe `404` behavior; infrastructure failures remain subsystem-specific `503`.

### Management capability contract and architectural home

Add `GET /api/operations/capabilities`. Its exact owner is **Identity Application**, because Identity already owns `PermissionCode`, the permission registry, role semantics, and effective permission assignment. The implementation unit is `domains/identity/application/get-operational-management-capabilities.use-case.ts`, exporting `GetOperationalManagementCapabilitiesUseCase`. Its sole responsibility is to project one supplied `TrustedActorContext` into the fixed semantic DTO below. It performs no repository, database, or resource lookup.

Allowed dependencies are deliberately narrow:

- a type-only import of `TrustedActorContext` from `shared/auth/trusted-actor-context.ts`;
- a type-only import of `PermissionCode` from `domains/identity/domain/permission.ts`, with every fixed permission literal checked against that type; and
- no imports from Catalog, Branch, Inventory, Pricing, Reference Cost, Presentation, repositories, or persistence.

The HTTP adapter belongs at `domains/identity/infrastructure/http/operational-management-capability-route-handler.ts`; the route `app/api/operations/capabilities/route.ts` only delegates to that adapter. The adapter resolves the trusted context, invokes the use case, maps established authentication/session errors, and serializes the DTO. It must contain no permission composition or business rule. Identity runtime composition wires the use case with no repository dependency.

The alternatives were evaluated and rejected: `shared/` contains only the cross-cutting trusted-context contract and must not absorb Domain business policy; Presentation composition would make browser-facing coordination the owner of authorization meaning; and a new Operations module would add a convenience module with no independent model or persistence. Identity Application is therefore the smallest clean existing home. This endpoint does not become a generic BFF because it returns a fixed authorization-derived DTO, aggregates no resource data, and calls no other Domain. It is never write authority: every mutation continues to enforce its own Domain/Application permission, tenant, Branch, resource-state, and concurrency rules. Domain-local resource `allowedActions` remain owned by the corresponding Domain Application use case, not Identity.

```ts
interface OperationalManagementCapabilitiesView {
  readonly branches: { readonly canView: boolean; readonly canManage: boolean };
  readonly listing: { readonly canManage: boolean };
  readonly inventory: {
    readonly canViewAvailability: boolean;
    readonly canViewQuantities: boolean;
    readonly canReceive: boolean;
    readonly canIssue: boolean;
    readonly canReserve: boolean;
    readonly canTransfer: boolean;
    readonly canManageDamage: boolean;
    readonly canAdjust: boolean;
  };
  readonly pricing: {
    readonly canView: boolean; // pricing.view
    readonly canViewWholesale: boolean;
    readonly canManageWorkspace: boolean;
    readonly canManageBranchOverrides: boolean;
  };
  readonly referenceCost: {
    readonly canView: boolean; // pricing.view AND referenceCost.view
    readonly canManageWorkspace: boolean;
    readonly canManageBranchOverrides: boolean;
  };
}
```

These are **effective semantic capabilities**, not one-to-one mirrors of raw permission flags. Owner authority is projected through the existing effective-authorization semantics. `pricing.canViewWholesale` is true only when the effective ordinary policy has both `pricing.view` and `pricing.wholesale.view`; `referenceCost.canView` is true only when it has both `pricing.view` and `referenceCost.view`. Management booleans represent the selected operation-specific policy and therefore use their exact existing manage permission. Listing management accepts singular `catalog.product.edit` or plural `catalog.products.edit`. Inventory availability is effective for `inventory.availability.view` or `inventory.quantity.view`; exact quantities require `inventory.quantity.view`. No raw permission array, role, Workspace ID, actor ID, or allowed Branch IDs is returned. Branch-specific capability is resolved only by Domain resource responses after Branch scope and resource-state checks.

### Operational Product discovery contract

Add `GET /api/catalog/operational-products` inside the existing Catalog Query Application/HTTP boundary. It must reuse the existing `CatalogQueryRepository.search`, text normalization, deterministic sorting, cursor codec, Workspace predicate, Branch existence/scope checks, and page limits. No second repository, search engine, client merge, client filtering after pagination, or two-query lifecycle union is allowed.

The exact internal extension is:

```ts
type CatalogLifecycleScope =
  | { readonly type: "Exact"; readonly lifecycle: CatalogLifecycle }
  | { readonly type: "Allowed"; readonly lifecycles: readonly CatalogLifecycle[] };

interface CatalogSearchRepositoryQuery {
  // existing fields remain
  readonly filters: Omit<CatalogSearchFilters, "lifecycle">;
  readonly lifecycleScope: CatalogLifecycleScope;
}
```

`CatalogSearchFilters.lifecycle` remains singular and unchanged at the ordinary HTTP/Application boundary. The ordinary use case converts it to `Exact` and otherwise builds the same repository query and byte-equivalent existing catalog query fingerprint, preserving ordinary cursor compatibility. The operational use case supplies the canonical server constant `Allowed(["Draft", "Published"])`; callers cannot provide lifecycles.

The PostgreSQL repository converts `Exact` to the current equality predicate and `Allowed` to one parenthesized `lifecycle_state IN (...)` predicate in the same SQL statement. It then reuses the current normalized search predicate, projection, sort expression, unique `product_id` tie-breaker, keyset cursor predicate, and `limit + 1` fetch. Operational search has its own versioned fingerprint over purpose, normalized query, Branch ID where applicable, the canonical ordered lifecycle set, sort, and operational visibility shape. A cursor from ordinary Catalog or a different purpose/Branch/query is invalid (`400 InvalidCursor`). The server returns at most the requested page size and emits `nextCursor` only when the single combined result contains another row. Draft and Published Products therefore share one global deterministic order, with no duplicate/skip behavior caused by lifecycle merging.

Branch-scoped purposes validate the Branch before search and project any Listing state through the existing Catalog Query join/projection; Listing is not a filter. Workspace purposes neither accept nor infer a Branch. The lifecycle-leading Catalog indexes remain usable for each value in the bounded `IN` set and no schema change is required. Focused PostgreSQL integration tests must prove mixed Draft/Published ordering and pagination (including equal sort values and lifecycle boundaries), cursor binding, Branch/Listing projection, and byte-compatible ordinary Catalog behavior.

Query:

```ts
interface OperationalProductSearchQuery {
  readonly purpose:
    | "Listing"
    | "Inventory"
    | "WorkspacePricing"
    | "BranchPricing"
    | "WorkspaceReferenceCost"
    | "BranchReferenceCost";
  readonly q?: string;
  readonly branchId?: string;
  readonly cursor?: string;
  readonly limit?: number; // default 24, maximum 60
}
```

`branchId` is required for `Listing`, `Inventory`, `BranchPricing`, and `BranchReferenceCost`; it is forbidden for the two Workspace purposes. The requested purpose is an intent selector, never authority. Application authorization is:

| Purpose | Required existing permission | Lifecycle/listing scope |
| --- | --- | --- |
| `Listing` | `catalog.product.edit` **or** `catalog.products.edit` | non-Archived; any Listing state |
| `Inventory` | at least one Inventory view or mutation permission | non-Archived; any Listing state |
| `WorkspacePricing` | `pricing.manage` | non-Archived; Branch-independent |
| `BranchPricing` | `pricing.branchOverride.manage` | non-Archived; any Listing state |
| `WorkspaceReferenceCost` | `referenceCost.manage` | non-Archived; Branch-independent |
| `BranchReferenceCost` | `referenceCost.branchOverride.manage` | non-Archived; any Listing state |

Response:

```ts
interface OperationalProductSearchView {
  readonly items: readonly {
    readonly productId: string;
    readonly productCode: string | null;
    readonly productName: string | null;
    readonly lifecycle: "Draft" | "Published";
    readonly branchId?: string;
    readonly listingStatus?: "Listed" | "Unlisted" | "NotConfigured";
  }[];
  readonly nextCursor: string | null;
}
```

The response intentionally omits media, classification, price, Reference Cost, stock numbers, actor data, and raw capabilities. Ordinary `GET /api/catalog/products` behavior remains unchanged. This is a separate bounded projection within the same canonical Task 3.18 query authority, not a duplicate search authority.

### Listing management contract

Add the dedicated read `GET /api/branches/{branchId}/products/{productId}/listing`. It is owned by Catalog Branch Product Application and authorized by `catalog.product.edit` **or** `catalog.products.edit`, plus trusted Branch scope. It does not require `catalog.products.view` because it is an operation-specific management read.

```ts
interface ListingManagementStateView {
  readonly branchId: string;
  readonly productId: string;
  readonly listingStatus: "NotConfigured" | "Listed" | "Unlisted";
  readonly revision: number; // 0 only when server confirms absence
  readonly updatedAt: string | null;
  readonly allowedActions: readonly ("SetListed" | "SetUnlisted")[];
}
```

The Application verifies the same-Workspace Branch and Product. `allowedActions` is empty for an Inactive Branch or Archived Product; otherwise it reflects the existing listing mutation permission. `NotConfigured` remains absence, there is no hard delete, and only a server-returned absent state authorizes `expectedRevision: 0`. Existing `PUT /api/branches/{branchId}/products/{productId}/listing` remains unchanged and authoritative. A `409 Conflict` requires refetching this read before another explicit write.

### Reservation read contract

Add two Inventory-owned reads, both authorized by `inventory.reserve` and trusted Branch scope:

- `GET /api/branches/{branchId}/inventory/reservations?productId={productId}&cursor={cursor?}&limit={1..60}`
- `GET /api/branches/{branchId}/inventory/reservations/{reservationId}`

The collection requires `productId` and returns only actionable `Active` and `PartiallyFulfilled` reservations. Its exact keyset contract is:

- authoritative order: `updatedAt DESC, reservationId DESC`; `reservationId` is the unique deterministic tie-breaker;
- repository predicate after a cursor: `updated_at < cursor.updatedAt OR (updated_at = cursor.updatedAt AND reservation_id < cursor.reservationId)` in addition to exact Workspace/Branch/Product and actionable-status predicates;
- default `limit`: `24`; accepted range: `1..60`; persistence fetch: `limit + 1` (at most 61 rows returned internally);
- cursor payload: `{ version: 1, fingerprint, updatedAt, reservationId }`, encoded with the existing opaque canonical base64url cursor convention;
- fingerprint input: `{ version: 1, purpose: "ActionableReservations", branchId, productId, statuses: ["Active", "PartiallyFulfilled"], order: "UpdatedAtDescReservationIdDesc" }`; Workspace identity is never accepted from the request;
- validation: maximum encoded length, canonical base64url, exact object keys, integer version `1`, exact fingerprint, canonical ISO-8601 `updatedAt`, and valid canonical Reservation ID. Any malformed, non-canonical, cross-query, cross-Branch/Product, or unsupported-version cursor returns `400 InvalidCursor`;
- `nextCursor` is generated from the last returned item only when the `limit + 1` fetch proves another result; a first or later empty page returns `200 { items: [], nextCursor: null }`;
- the cursor is keyset position, not a snapshot. If a live reservation is updated, fulfilled, or released between requests, the next page reflects current rows after the encoded tuple and may omit a row that moved or left the actionable set. A structurally valid cursor remains valid even if its source row was deleted; clients restart without a cursor when they need a fresh view.

The detail read may return any status so a stale client can render the current non-actionable state.

```ts
interface ReservationManagementView {
  readonly reservationId: string;
  readonly branchId: string;
  readonly productId: string;
  readonly status: "Active" | "PartiallyFulfilled" | "Fulfilled" | "Released";
  readonly quantity: string;
  readonly remainingQuantity: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly allowedActions: readonly ("Release" | "Fulfill")[];
}

interface ReservationPageView {
  readonly items: readonly ReservationManagementView[];
  readonly nextCursor: string | null;
}
```

`productId` is the exact safe Product identity in this DTO; Product code/name is obtained from the already selected canonical operational Product result and is not duplicated by Inventory. `createdByActorId` is excluded. Detail returns `ReservationNotFound` for a foreign Workspace, wrong Branch, or missing reservation. The Release/Fulfill mutations continue to lock and recheck actionable status and remaining quantity; the read never replaces mutation-time validation.

#### Reservation query-performance evidence decision

The current `inventory_reservations_product_idx (workspace_id, branch_id, product_id, status)` supports exact tenant/Branch/Product/status filtering, but it **does not** contain `updated_at` or `reservation_id` and therefore cannot itself provide the required global order across both actionable statuses. PostgreSQL may legally filter candidates through the existing index, sort them, and return `limit + 1`. The source contains no representative `EXPLAIN` evidence proving whether that plan is acceptable or pathological. Missing order columns establish a performance question; they do **not** by themselves prove that a migration is required.

Planning-R2 therefore required query-performance evidence. The following partial ordered index was documented only as a **Candidate Optimization**, not an approved migration, required migration, or proven requirement:

```sql
(workspace_id, branch_id, product_id, updated_at DESC, reservation_id DESC)
WHERE status IN ('Active', 'PartiallyFulfilled')
```

No index or migration is approved by this contract, and migration `0016` remains unapproved.

#### Task 3.22-A-Persistence Planning Gate

The separate bounded **Task 3.22-A Reservation Persistence / Query Performance Planning Gate** was required to run the exact approved query against an isolated PostgreSQL test database populated only with generated, non-sensitive, representative data. Production was prohibited. It first evaluated the current schema/index using `EXPLAIN (FORMAT JSON)` and `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, with Candidate Optimization comparison allowed only if the current plan showed a material concern.

The gate must evaluate:

- Workspace, Branch, Product, and actionable-status predicate selectivity;
- expected actionable Reservation cardinality per Product and candidate rows before `LIMIT`;
- scan type, rows scanned, Sort node presence/cost/memory, and whether `LIMIT` stops work effectively;
- estimated versus actual rows when `ANALYZE` is allowed;
- first-page behavior and pagination after a representative deep keyset cursor;
- the write amplification, storage, vacuum/index maintenance, and operational cost of an additional index; and
- plan stability across representative low, typical, and high current-approved cardinalities.

Do not invent arbitrary microsecond thresholds without an accepted project performance budget. The evidence must distinguish a materially inefficient or clearly unbounded pathological plan from normal bounded filtering/sorting. Do not add an index solely because it may be useful in the future, and do not reject a currently necessary index merely to avoid a migration.

The gate must return exactly one decision:

1. **EXISTING INDEX SUFFICIENT:** current query-plan/performance evidence is acceptable; use a new Reservation collection repository method with current schema, no schema change, and no migration `0016`.
2. **INDEX REQUIRED:** evidence demonstrates a material reason; a later separately approved migration may add the smallest justified index, after comparing the Candidate Optimization and documenting rollback/verification.
3. **DECISION REQUIRED:** representative evidence cannot be produced reliably; A3 remains blocked and no persistence choice is guessed.

#### Evidence result — EXISTING INDEX SUFFICIENT

The gate ran on the repository-guarded loopback test database `quadcore_smart_catalog_test`, distinct from the application database, using PostgreSQL 17.10 and generated non-sensitive data only. It asserted the exact current index definition, then collected `EXPLAIN (FORMAT JSON)` and `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for first and 75%-deep keyset pages at 10, 100, 1,000, and 10,000 actionable Reservations, with equal Fulfilled/Released rows in the same Product scope.

The current index was selected at every cardinality. Low/typical plans used Index Scan; high/stress plans used Bitmap Index Scan plus Bitmap Heap Scan. A Sort node remained, as expected, but it stayed entirely in memory: quicksort at low/deep-typical and top-N heapsort elsewhere, with 25–28 KB sort space, zero temporary reads/writes, and no index recheck removals. At 10,000 actionable plus 10,000 terminal rows, the first page scanned exactly 10,000 actionable candidates, touched 217 shared-hit blocks, and executed in 3.775 ms; the deep cursor scanned the same indexed candidates, removed 7,500 by the keyset filter, sorted 2,500 surviving rows with 28 KB memory, touched 217 shared-hit blocks, and executed in 2.006 ms. Timing is supporting evidence only, not a new performance budget.

The plan scaled predictably across the approved evidence matrix, used the selective Workspace/Branch/Product/status index, avoided sequential scans, disk sorts, and temporary I/O, and bounded result/sort memory through `LIMIT 25` top-N behavior. The 10,000-actionable stress case showed no material current concern warranting candidate-index comparison. Per the gate rule, the Candidate Optimization was not created or tested.

The final persistence decision is **EXISTING INDEX SUFFICIENT** for the current approved Product-scoped actionable query. A3 may add only the planned collection repository method and Application/HTTP contract on current schema. No schema change, migration `0016`, or candidate index is approved. Synthetic rows were removed; zero gate Reservations remained, and no temporary index existed.

### Workspace base-pricing read contract

Add Branch-independent `GET /api/products/{productId}/pricing`, owned by Catalog Branch Product Application. It returns only independently authorized price types.

```ts
interface PriceManagementSlot {
  readonly state: "Configured" | "NotConfigured";
  readonly value: null | { readonly amountMinor: string; readonly currency: string };
  readonly allowedActions: readonly ("Set" | "Clear")[];
}

interface ReferenceCostManagementSlot extends PriceManagementSlot {
  readonly referenceCostRevision: number;
}

interface WorkspacePricingManagementView {
  readonly productId: string;
  readonly productRevision: number;
  readonly retail?: PriceManagementSlot;
  readonly wholesale?: PriceManagementSlot;
  readonly referenceCost?: ReferenceCostManagementSlot;
}
```

Field authorization:

| Slot | Read visibility | Operation-specific management visibility | Actions |
| --- | --- | --- | --- |
| Retail | `pricing.view` | `pricing.manage` | Set/Clear only with `pricing.manage` |
| Wholesale | `pricing.view` + `pricing.wholesale.view` | `pricing.manage` | Set/Clear only with `pricing.manage` |
| Reference Cost | `pricing.view` + `referenceCost.view` | `referenceCost.manage` | Set/Clear only with `referenceCost.manage` |

Operation-specific visibility does not grant the corresponding value to ordinary Catalog, sharing, or existing general Pricing reads. Ordinary Reference Cost visibility through the existing pricing read requires the complete effective composition `pricing.view` **and** `referenceCost.view`; `referenceCost.view` alone is insufficient. The management-only `referenceCost.manage` visibility above remains confined to this endpoint. If no slot is authorized, return `403 Forbidden`.

Retail and Wholesale are columns on the same Catalog Product and share the single response-level `productRevision`. Configured and `NotConfigured` Retail both use the returned current Product revision; configured and `NotConfigured` Wholesale do the same. Existing mutation request field `expectedRevision` remains compatible, but for either Retail or Wholesale the client must populate it from `productRevision`, never from a slot-local token. A successful Retail change increments Product revision and invalidates every previously read Wholesale token; a Wholesale change symmetrically invalidates Retail. After any successful Retail/Wholesale mutation the consumer reloads this authoritative management read before another edit. `409 Conflict` requires reload, review of both prices, and a new explicit submission.

Reference Cost is an independent protected row and uses only `referenceCostRevision`; its writes do not invalidate `productRevision`, and Retail/Wholesale writes do not invalidate its revision. An absent Reference Cost returns explicit `NotConfigured` with `referenceCostRevision: 0` only under the existing row-creation contract. Zero remains a configured amount and is distinct from missing. Existing Money and currency validation remains unchanged.

### Branch override management contract

Add `GET /api/branches/{branchId}/products/{productId}/pricing/management`, owned by Catalog Branch Product Application. It is authorized per field by `pricing.branchOverride.manage` for Retail/Wholesale and `referenceCost.branchOverride.manage` for Reference Cost, plus trusted Branch scope.

```ts
interface BranchPriceManagementSlot {
  readonly base: PriceManagementSlot;
  readonly override: PriceManagementSlot;
  readonly overrideRevision: number; // absent override is 0
  readonly effective: null | { readonly amountMinor: string; readonly currency: string };
  readonly source: "WorkspaceBase" | "BranchOverride" | "NotConfigured";
  readonly allowedActions: readonly ("SetOverride" | "ClearOverride")[];
}

interface BranchPricingManagementView {
  readonly branchId: string;
  readonly productId: string;
  readonly baseProductRevision?: number; // present when Retail or Wholesale is returned
  readonly baseReferenceCostRevision?: number; // present when Reference Cost is returned
  readonly prices: Readonly<Partial<Record<"Retail" | "Wholesale" | "ReferenceCost", BranchPriceManagementSlot>>>;
}
```

The bounded management read may disclose the base/effective value needed by an authorized override manager without granting general `pricing.view` or `referenceCost.view`. Reference Cost remains field-isolated and appears only for `referenceCost.branchOverride.manage`. `ClearOverride` is present only when an override exists; clearing means inherit. An inherited value is never copied into an override draft by the server. Inactive Branch or Archived Product returns state with no write actions or the existing safe Domain error, as fixed by implementation tests; mutation use cases remain decisive.

### Reference Cost contract

Reference Cost follows separate field authorization in operational discovery, base management state, Branch override management state, and capability DTOs. No selected rule implies `referenceCost.view` from either manage permission. Management visibility is confined to the two management endpoints and the exact Product identity discovery required to reach them. Reference Cost must remain absent from ordinary Catalog cards, customer sharing, Direct Sharing payloads, Retail/Wholesale-only management responses, and unauthorized Staff responses.

### Inventory disclosure contract

Harden existing Inventory Application DTOs; React filtering is prohibited.

Direct `GET /api/branches/{branchId}/inventory/{productId}` becomes a discriminated response:

```ts
type InventoryReadView =
  | {
      readonly branchId: string;
      readonly productId: string;
      readonly unit: "Piece";
      readonly availability: "InStock" | "OutOfStock";
    }
  | {
      readonly branchId: string;
      readonly productId: string;
      readonly unit: "Piece";
      readonly availability: "InStock" | "OutOfStock";
      readonly quantities: {
        readonly available: string;
        readonly onHand: string;
        readonly reserved: string;
        readonly damaged: string;
      };
      readonly revision: number;
      readonly updatedAt: string;
    };
```

The first shape is returned for `inventory.availability.view`; the second requires `inventory.quantity.view`. Availability-only output contains no numeric balance, revision, or timestamp.

All Inventory mutation responses are projected after authorization for both first execution and idempotent replay:

```ts
interface InventoryMutationResultView {
  readonly operationId: string;
  readonly status: "Succeeded";
  readonly availability?: "InStock" | "OutOfStock";
  readonly sourceAvailability?: "InStock" | "OutOfStock";
  readonly destinationAvailability?: "InStock" | "OutOfStock";
  readonly balance?: InventoryReadView; // detailed variant only
  readonly sourceBalance?: InventoryReadView; // detailed variant only
  readonly destinationBalance?: InventoryReadView; // detailed variant only
  readonly reservationId?: string;
  readonly reservationStatus?: string;
  readonly remainingQuantity?: string;
  readonly transferId?: string;
}
```

- With `inventory.quantity.view`, return detailed balance variants.
- Without quantity view but with `inventory.availability.view`, return semantic availability only.
- With neither read permission, return no balance or availability fields.
- Reservation ID/status/remaining quantity remain available to `inventory.reserve` as minimum operation-specific state.
- Transfer ID remains available to `inventory.transfer`.
- The persisted idempotency result is an internal outcome. The Application applies current-context disclosure projection on every response, including replay, so stored detailed balances never bypass current authorization.

### Exact corrective API matrix

Classification: `A` read-only Application/HTTP addition using existing persistence; `B` existing endpoint DTO hardening; `C` bounded authorization composition change; `D` persistence change; `E` ADR required.

| Corrective capability | Owner | Endpoint/method | Request | Response | Permission and scope | Non-disclosure/errors | Concurrency | Repository/schema | Tests | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Global semantic capabilities | Identity Application: `GetOperationalManagementCapabilitiesUseCase` | `GET /api/operations/capabilities` | none | effective semantic nested booleans | trusted context only; no resource scope | no raw authority; `401/403/503` | none | no repository/schema | exact composite mapping, Owner/Staff, restricted session, field exclusion, thin handler | A/C |
| Operational Product discovery | Catalog Query | `GET /api/catalog/operational-products` | `purpose,q?,branchId?,cursor?,limit?` | one mixed Draft/Published identity/lifecycle/listing page | purpose-to-existing-permission mapping; Branch scope when Branch-scoped | wrong/out-of-scope Branch `404`; unauthorized purpose `403`; invalid/cursor `400`; `503` | operational fingerprint and one combined keyset cursor | extend current repository query with `CatalogLifecycleScope`; one SQL query; no schema | every purpose/permission, singular edit, mixed-lifecycle order/cursor, equal-sort ties, scope, ordinary-query cursor non-regression | A/C |
| Listing state/revision | Catalog Branch Product | `GET /api/branches/{branchId}/products/{productId}/listing` | path | Listing management state/actions | singular **or** plural edit; Branch scope | foreign/out-of-scope `404`; `401/403/503` | authoritative revision; absence only is `0` | existing listing/scope ports; no schema | both edit codes, absence, inactive/archive actions, conflict refresh | A/C |
| Actionable Reservation page | Inventory | `GET /api/branches/{branchId}/inventory/reservations` | `productId,cursor?,limit?` | actionable page | `inventory.reserve`; Branch scope | no actor/audit data; safe `404`; invalid/cursor `400` | `(updatedAt DESC,reservationId DESC)` keyset; mutation rechecks | add list port method over existing `inventory_reservations_product_idx`; no schema; Candidate Optimization not approved | tenant/scope/filter/mixed-status/order/ties/cursor binding/live-stale/empty/limits/representative plan regression | A |
| Reservation detail | Inventory | `GET /api/branches/{branchId}/inventory/reservations/{reservationId}` | path | current reservation/actions | `inventory.reserve`; Branch scope | foreign/wrong Branch/missing `404` | current state; mutation rechecks | existing find-by-ID port; no schema | every status, stale state, non-disclosure | A |
| Workspace base management state | Catalog Branch Product | `GET /api/products/{productId}/pricing` | path | field-filtered base slots/actions plus shared `productRevision` | independent read or base-manage rule per type; ordinary Reference Cost requires both view permissions | omit unauthorized types; none authorized `403`; Product `404`; `503` | one shared Product revision for Retail/Wholesale; independent Reference Cost revision | existing scope/pricing ports; no schema | permission cross-product, zero/missing, Retail↔Wholesale invalidation/refresh/conflict, ref-cost independence/isolation | A/C |
| Branch override management state | Catalog Branch Product | `GET /api/branches/{branchId}/products/{productId}/pricing/management` | path | base/override/effective/source/actions | override-manage per type; Branch scope | omit unauthorized types; safe `404`; `403/503` | exact base/override revisions; absent override `0` | existing pricing/scope ports; no schema | permission cross-product, inherit/override/absent, scope, inactive/archive | A/C |
| Inventory direct read | Inventory | existing `GET /api/branches/{branchId}/inventory/{productId}` | path | semantic or detailed discriminated view | availability or quantity view; Branch scope | no numeric fields without quantity view | revision only in detailed view | existing balance port; no schema | exact field absence, zero semantics, tenant/scope | B |
| Inventory mutation results | Inventory | all existing Inventory mutation routes | existing bodies | filtered mutation result | existing mutation permission; response disclosure from current trusted context | no detailed balances without quantity view | idempotent replay receives current-authorized projection | existing persistence; internal-result projection only | every mutation × view combination, replay after permission change | B |

### Permission matrix

| Contract | Existing permissions accepted | Explicitly not implied |
| --- | --- | --- |
| Listing discovery/state | `catalog.product.edit` or `catalog.products.edit` | neither becomes the other; no general Catalog view grant |
| Inventory operational discovery | any relevant Inventory view/mutation permission | no Catalog view/edit grant |
| Reservation reads | `inventory.reserve` | no general balance quantity grant |
| Workspace Retail/Wholesale state | corresponding existing view permissions or `pricing.manage` in this endpoint | no global `pricing.view` implication |
| Branch Retail/Wholesale management state | `pricing.branchOverride.manage` | no global `pricing.view` implication |
| Workspace Reference Cost state | `pricing.view` + `referenceCost.view`, or `referenceCost.manage` in this endpoint | no global Reference Cost view implication |
| Branch Reference Cost management state | `referenceCost.branchOverride.manage` | no global `pricing.view`/`referenceCost.view` implication |
| Detailed Inventory fields | `inventory.quantity.view` | mutation success and availability view do not imply quantities |
| Semantic Inventory availability | `inventory.availability.view` or quantity view | no numeric disclosure |

No new permission code is required.

### Branch scope, multi-tenancy, and non-disclosure

- Every Branch-scoped read uses `branchId` only as requested input and validates it against `TrustedActorContext.branchScope` plus same-Workspace persistence.
- Operational transfer still validates both Branches in the existing atomic mutation. Discovery against one Branch does not authorize the destination.
- Every repository call receives `workspaceId` from trusted context; no request accepts Workspace or actor identity.
- Selected-Branch Staff never receive `allowedBranchIds`; existing Branch listing remains the safe selector.
- Foreign/out-of-scope Branch, Product, or Reservation states remain non-disclosing. Capability booleans reveal permissions only as semantic actions, not resource existence.

### Database, migration, dependency, and architecture decisions

- **Database:** current persistence is sufficient, including the Product-scoped actionable Reservation collection. Representative first/deep-page PostgreSQL 17.10 evidence through 10,000 actionable rows selected `inventory_reservations_product_idx`, used bounded in-memory sorting, and showed no material concern.
- **Migration:** none. The migration chain remains `0000–0015`; `0016` must not be created. The partial ordered actionable-Reservation index remains an unapproved future candidate and is unnecessary for the current approved scale.
- **Dependency:** none. Existing TypeScript, Application ports, Drizzle/PostgreSQL, HTTP, and cursor utilities are sufficient.
- **Architecture:** no redesign and no ADR. The selected hybrid is a documented operation-specific authorization composition, not a global permission-semantic change. Catalog Query remains canonical Product search; Branch Product owns Listing/Pricing; Inventory owns Reservations/balances/mutations; transfer remains atomic.

Capability ownership, operational query shape, cursor semantics, Pricing concurrency, and Reservation persistence remain resolved. A1 is merged and A2 is implemented / ReadyForReview. Do not begin A3–A5 before independent A2 review and merge, and do not add migration `0016` or the Candidate Optimization.

### Implementation slices and dependencies

#### 3.22-A1 — Authorization policies and semantic capabilities — Implemented / ReadyForReview

Implemented the repository-free `GetOperationalManagementCapabilitiesUseCase` in Identity Application, its thin Identity HTTP adapter/runtime wiring, and reusable permission-only action vocabulary without persistence or resource-state assumptions.

Acceptance: exact effective/composite boolean mapping (including ordinary Reference Cost); type-checked fixed `PermissionCode` literals; no raw authority fields; Owner/Staff/restricted-session coverage; no business rules in the route handler; writes still reauthorize; no repository/schema/dependency or generic BFF.

#### 3.22-A2 — Canonical operational discovery and Listing state — Implemented / ReadyForReview

Extend the Catalog Query repository query with `CatalogLifecycleScope`, issue one canonical Draft+Published operational SQL query, and implement the dedicated Listing management state read.

Implemented on baseline `32012c87a521c6fa510ad7ccf03216a180a88725`: the existing Catalog Query repository executes the combined lifecycle predicate and retains ordinary fingerprint/cursor compatibility; the dedicated purpose-authorized endpoint returns only selection identity and optional Branch/listing state; Catalog Branch Product Application returns authoritative absence/configured revision and intersects the A1 action policy with current Branch/Product state.

Acceptance: singular/plural edit parity without aliasing; purpose-specific permissions; one mixed Draft+Published page; deterministic sort/tie-break and operational cursor fingerprint; non-Archived/any-listing discovery; Branch scope/projection; search normalization reuse; authoritative Listing revision; ordinary Catalog filter/fingerprint/cursor byte-compatibility.

Depends on A1 policy vocabulary.

#### 3.22-A3 — Reservation reads

Add the Product-scoped actionable Reservation page and exact detail with the specified `(updatedAt,reservationId)` keyset, query fingerprint, live-cursor behavior, existing table/filter index, and minimal DTO.

Acceptance: `inventory.reserve` authorization; tenant/Branch/Product scoping; Active/PartiallyFulfilled only; default 24/max 60/limit+1; exact order/ties/cursor validation/fingerprint/empty/live-stale behavior; no actor/audit fields; stale/non-actionable detail; Release/Fulfill mutation revalidation; current index used without schema change; focused PostgreSQL integration plan regression at representative cardinality.

Depends on A1 resource-action rules; consumes A2 Product selection in the future Presentation but can be implemented/tested independently.

#### 3.22-A4 — Pricing management reads

Add Workspace base and Branch override management state reads with independent Retail/Wholesale/Reference Cost field authorization and explicit shared Product concurrency for Retail/Wholesale.

Acceptance: exact configured/absent/zero semantics; response-level `productRevision` for configured or absent Retail/Wholesale; Retail change invalidates Wholesale and vice versa; success reloads authoritative state; conflict requires refresh/review; independent Reference Cost revision and absent-row zero; complete ordinary Reference Cost read composition; inherit/override source; no global view implication; Reference Cost isolation; no Branch required for Workspace base.

Depends on A1 policy vocabulary.

#### 3.22-A5 — Inventory disclosure hardening

Replace availability-only numeric output with semantic availability and project every mutation result, including idempotent replay, from current trusted visibility.

Acceptance: no numeric balance without `inventory.quantity.view`; correct semantic states; minimal mutation identifiers; reservation-operation state preserved; transfer remains atomic; replay cannot bypass current visibility; existing mutation/idempotency behavior otherwise unchanged.

Depends on A1 visibility policy. It may proceed in parallel with A2–A4 after A1.

### Roadmap decision

**A1 is merged and A2 is implemented / ReadyForReview.** A3 is not automatically approved by A2 completion and is not started. A4–A5 are not started. Task 3.22 Presentation remains Planned / blocked and is not approved.

## العقد العربي

### القرار المختار

اختير حل هجين محدود يجمع بين قراءات إدارة خاصة بالعملية مخولة بصلاحية التعديل الحالية، وإسقاط قدرات دلالي مشتق من الخادم. رُفضت قاعدة عامة بأن الإدارة تستلزم العرض لأنها تغير معنى الصلاحيات المستقلة وتوسع أسطح القراءة. لا تمنح قراءات الإدارة الجديدة صلاحية عرض عامة، وتبقى كل طفرة مسؤولة عن إعادة التحقق من الصلاحية ومساحة العمل ونطاق الفرع وحالة المورد والمراجعة.

### العقود التصحيحية

- يملك Identity Application المسار `GET /api/operations/capabilities` من خلال `GetOperationalManagementCapabilitiesUseCase` بلا مستودع أو قاعدة بيانات. تعتمد القيم الدلالية الفعلية على السياسات المركبة؛ لذلك يتطلب عرض التكلفة المرجعية العادي كلاً من `pricing.view` و`referenceCost.view`. يبقى معالج HTTP محولاً رقيقاً بلا قواعد أعمال، ولا تعاد الصلاحيات الخام أو الدور أو معرفات مساحة العمل/الممثل/الفروع.
- يضيف `GET /api/catalog/operational-products` إسقاط اختيار محدوداً داخل سلطة Catalog Query نفسها. يمدد شكل المستودع الداخلي بـ`CatalogLifecycleScope` ويصدر استعلام PostgreSQL واحداً يجمع Draft وPublished في ترتيب حتمي واحد مع كاسر تعادل `productId` ومؤشر مرتبط بالغرض/الفرع/البحث. لا يسمح باستعلامين ودمجهما في React أو بالترشيح بعد التقسيم، وتبقى صيغة استعلام ومؤشر الكتالوج العادي دون تغيير.
- يضيف `GET /api/branches/{branchId}/products/{productId}/listing` حالة الإدراج ومراجعتها الموثوقة لممثل يملك `catalog.product.edit` أو `catalog.products.edit`. تبقى `NotConfigured` غياباً ولا تُستخدم المراجعة صفر إلا إذا أعادها الخادم.
- يضيف Inventory قائمة حجوزات قابلة للفعل حسب الفرع والمنتج وتفاصيل دقيقة، محمية بـ`inventory.reserve`، دون `createdByActorId` أو بيانات التدقيق. ترتيب القائمة `updatedAt DESC, reservationId DESC` ومؤشرها يحمل الإصدار والبصمة والطابع الزمني ومعرف الحجز؛ الحد الافتراضي 24 والأقصى 60. المؤشر موضع حي وليس لقطة، وتعاد الصفحة الفارغة مع `nextCursor: null`. تعيد طفرات التحرير والتنفيذ التحقق من الحالة والكمية تحت القفل.
- يضيف `GET /api/products/{productId}/pricing` قراءة مستقلة عن الفرع للتسعير الأساسي، و`GET /api/branches/{branchId}/products/{productId}/pricing/management` لحالة التجاوز. يحمل Retail وWholesale مراجعة منتج مشتركة واحدة `productRevision` حتى عند الغياب؛ فتعديل أحدهما يبطل رمز الآخر ويتطلب نجاح التعديل أو تعارضه إعادة تحميل الحالة ومراجعتها. تبقى مراجعة Reference Cost مستقلة، ولا تكون صفراً إلا عند غياب الصف وفق عقد الإنشاء الحالي.
- تصبح قراءة المخزون المباشرة دلالية فقط لممثل الإتاحة، ولا تظهر `available` أو`onHand` أو`reserved` أو`damaged` إلا مع `inventory.quantity.view`. تُرشح نتائج كل طفرة وإعادة idempotent في الخادم وفق السياق الموثوق الحالي.

### الصلاحيات والأمان

تبقى الصلاحيات المفردة والجمعية للكتالوج منفصلة، ولا تستلزم `pricing.manage` صلاحية `pricing.view` العامة، ولا تستلزم صلاحيات إدارة التكلفة المرجعية عرضها العام. يسمح عقد الإدارة فقط بالحد الأدنى من الحالة اللازمة للعمل المصرح به. لا تصل التكلفة المرجعية إلى الكتالوج العادي أو المشاركة مع العميل أو المشاركة المباشرة، ولا يصبح المتصفح سلطة.

### قاعدة البيانات والمعمارية

يغطي فهرس الحجوزات الحالي ترشيح مساحة العمل/الفرع/المنتج/الحالة لكنه لا يغطي `updated_at` و`reservation_id` ولا يوفر بنفسه الترتيب العالمي للحالتين القابلتين للفعل. لذلك قاست البوابة فعلياً استخدام PostgreSQL للفهرس الحالي ثم فرز المرشحين وإعادة `limit + 1`، ولم تفترض الحاجة إلى ترحيل من غياب عمودي الترتيب وحده.

استخدمت الأدلة قاعدة الاختبار المحروسة على loopback مع PostgreSQL 17.10 وبيانات مولدة غير حساسة عند 10 و100 و1,000 و10,000 حجز قابل للفعل مع عدد مساوٍ من الحالات النهائية. اختير الفهرس الحالي في كل خطة. بقي الفرز في الذاكرة بين 25 و28 كيلوبايت دون ملفات مؤقتة؛ وعند 10,000 حجز قابل للفعل نفذت الصفحة الأولى في 3.775 مللي ثانية والمؤشر العميق عند 75% في 2.006 مللي ثانية مع 217 كتلة مشتركة مصابة في الذاكرة. تمثل الأزمنة دليلاً مساعداً وليست ميزانية جديدة.

النتيجة النهائية هي **EXISTING INDEX SUFFICIENT** للاستعلام الحالي المحدود بالمنتج والحالات القابلة للفعل. لم يظهر سبب مادي لمقارنة التحسين المرشح، لذلك لم ينشأ أو يختبر. لا يعتمد فهرس أو ترحيل `0016`، وتضيف A3 مستقبلاً طريقة المجموعة في المستودع والعقد المخطط فقط فوق المخطط الحالي.

حذفت كل الصفوف الاصطناعية وبقي صفر صف للبادئة الاختبارية، ولم يوجد فهرس مؤقت. إذا تجاوزت الكثافة التشغيلية مستقبلاً نطاق 10,000 حجز قابل للفعل لمنتج واحد أو تغير شكل الخطة، تعاد القياسات قبل اعتماد أي فهرس.

### شرائح التنفيذ

1. **3.22-A1 — منفذة / جاهزة للمراجعة:** إسقاط القدرات الفعلية في Identity Application ومفردات أفعال الموارد النقية دون وصول للاستمرارية.
2. **3.22-A2 — منفذة / جاهزة للمراجعة:** استعلام Draft+Published تشغيلي واحد وقراءة حالة الإدراج الموثوقة، مع بقاء بصمة/مؤشر الكتالوج العادي متوافقين.
3. **3.22-A3:** قراءات الحجوزات بعقد المؤشر الدقيق وبوابة خطة الاستعلام.
4. **3.22-A4:** قراءات إدارة التسعير مع مراجعة المنتج المشتركة للتجزئة والجملة ومراجعة مستقلة للتكلفة المرجعية.
5. **3.22-A5:** تشديد كشف المخزون ونتائج الطفرات وإعادة idempotent.

دُمجت A1 ونُفذت A2 فوق خط الأساس `32012c87a521c6fa510ad7ccf03216a180a88725`. لا تعتمد A3 تلقائياً قبل مراجعة A2 مستقلاً ودمجها، ولم تبدأ A3–A5، مع بقاء واجهة المهمة 3.22 محظورة حتى اكتمال الشرائح كلها ومراجعتها ودمجها.

### قرار الخارطة

**دُمجت A1، ونُفذت A2 وهي جاهزة للمراجعة.** لا تعتمد A3 تلقائياً بإكمال A2 ولم تبدأ. كما لم تبدأ A4–A5، وتبقى واجهة المهمة 3.22 مخططة ومحجوبة وغير معتمدة.

## WILL IMPLEMENT | سينفذ

- After independent A2 review and merge, consider the next bounded slice under the documented sequence; do not infer A3 approval from this status update.
- بعد مراجعة A2 مستقلاً ودمجها، ينظر في الشريحة المحدودة التالية وفق التسلسل الموثق؛ ولا يستنتج اعتماد A3 من تحديث الحالة هذا.

## WILL NOT IMPLEMENT | لن ينفذ

- Task 3.22 UI, the Candidate Optimization, migration `0016`, public/WhatsApp sharing, new permissions, global permission redesign, dependency, Multi-Warehouse, ERP, purchasing, orders, accounting, tax, FX, promotions, analytics, AI, or Production deployment.
- واجهة المهمة 3.22 أو التحسين المرشح أو الترحيل `0016` أو المشاركة العامة/WhatsApp أو صلاحيات جديدة أو إعادة تصميم عامة للصلاحيات أو اعتماد أو المستودعات المتعددة أو ERP أو المشتريات أو الطلبات أو المحاسبة أو الضرائب أو FX أو العروض أو التحليلات أو AI أو النشر الإنتاجي.

## Acceptance Criteria | معايير القبول

1. The selected hybrid is implemented without global permission implication or raw authority disclosure. | ينفذ الحل الهجين دون استلزام عام للصلاحيات أو كشف السلطة الخام.
2. Singular-edit Listing actors can discover non-Archived Products and read authoritative Listing state/revision. | يستطيع ممثل الإدراج ذي الصلاحية المفردة اكتشاف المنتجات غير المؤرشفة وقراءة حالة الإدراج ومراجعتها الموثوقة.
3. Operational discovery issues one deterministic Draft+Published query, reuses Task 3.18 normalization/order/cursor machinery, and leaves ordinary Catalog behavior unchanged. | يصدر الاكتشاف التشغيلي استعلام Draft+Published حتمياً واحداً ويعيد استخدام التطبيع/الترتيب/المؤشر دون تغيير الكتالوج العادي.
4. Reservation page/detail implement the exact tuple, fingerprint, limits, live-cursor behavior, tenant/Branch/Product safety, and index-plan gate while excluding actor/audit data. | تنفذ قراءات الحجوزات الترتيب والبصمة والحدود وسلوك المؤشر الحي وبوابة خطة الفهرس بدقة ولا تكشف بيانات الممثل/التدقيق.
5. Pricing reads expose one shared Product revision for Retail/Wholesale, reload after success/conflict, and keep Reference Cost visibility and revision independent. | تكشف قراءات التسعير مراجعة منتج مشتركة للتجزئة والجملة وتعيد التحميل بعد النجاح/التعارض وتحفظ رؤية ومراجعة التكلفة المرجعية مستقلتين.
6. No numeric Inventory balance reaches an actor without `inventory.quantity.view`, including mutation replay. | لا يصل رصيد مخزون رقمي دون صلاحية الكمية، بما في ذلك إعادة الطفرة.
7. A3 uses the current schema/index; no migration `0016`, Candidate Optimization, dependency, duplicate repository, or client authority is introduced. | تستخدم A3 المخطط والفهرس الحاليين ولا تضيف `0016` أو التحسين المرشح أو اعتماداً أو مستودعاً مكرراً أو سلطة عميل.
8. Focused Application/HTTP/persistence tests pass for permission combinations, scope, non-disclosure, errors, cursor/revision, conflict, and idempotency. | تنجح الاختبارات المركزة لتركيبات الصلاحيات والنطاق وعدم الكشف والأخطاء والمؤشر/المراجعة والتعارض والتكرار الآمن.

## Risks and controls | المخاطر والضوابط

| Risk | Control | الخطر | الضابط |
| --- | --- | --- | --- |
| Management read becomes a general view grant | Dedicated endpoint and field-level policy tests | تحول قراءة الإدارة إلى عرض عام | مسار مخصص واختبارات سياسة على مستوى الحقول |
| Capability booleans become security authority | Every write reauthorizes; resource actions are advisory | تحول القدرات إلى سلطة أمن | تعيد كل طفرة التفويض وتبقى الأفعال إرشادية |
| Operational search forks Catalog truth | One Catalog Query repository/normalizer and one mixed-lifecycle SQL/keyset result | تكرار حقيقة البحث | مستودع واحد واستعلام دورة حياة مختلط واحد ضمن Catalog Query |
| Reservation page becomes unbounded or assumes index ordering | Product required, actionable statuses, max 60, exact cursor, integration/`EXPLAIN` gate | تضخم القائمة أو افتراض ترتيب الفهرس | اشتراط المنتج والحالة والحد والمؤشر الدقيق وبوابة خطة الاستعلام |
| Reference Cost leaks through management composition | Separate purpose/field policies and negative tests | تسرب التكلفة المرجعية | سياسات مستقلة واختبارات سلبية |
| Idempotent replay leaks historical detail | Project every replay against current trusted visibility | تسرب التفاصيل من إعادة التكرار | ترشيح كل إعادة وفق الرؤية الحالية |

## Known Limitations | القيود المعروفة

- Reservation collection is intentionally Product-scoped and actionable-only; general reservation history/reporting is outside 3.22-A.
- Performance evidence covers up to 10,000 actionable Reservations for one Product/Branch on PostgreSQL 17.10 with a warm-cache synthetic dataset; remeasure before approving materially higher current scale or after meaningful distribution/plan changes.
- The capability projection does not enumerate Branches or guarantee a resource remains mutable; resource reads and writes remain authoritative.
- Operational discovery is selection-only and does not replace ordinary Catalog cards/details.
- This contract does not approve Task 3.22 Presentation or any later task.
- قائمة الحجوزات مقيدة بالمنتج والحالات القابلة للفعل، ولا تشمل التقارير أو التاريخ العام.
- تغطي أدلة الأداء حتى 10,000 حجز قابل للفعل لمنتج/فرع واحد على PostgreSQL 17.10 ببيانات اصطناعية دافئة الذاكرة؛ تعاد القياسات قبل اعتماد كثافة أعلى مادياً أو بعد تغير توزيع/خطة مهم.
- لا يسرد إسقاط القدرات الفروع ولا يضمن بقاء المورد قابلاً للتعديل؛ تبقى قراءات المورد وطفراته مرجع الحقيقة.
- الاكتشاف التشغيلي للاختيار فقط ولا يستبدل بطاقات/تفاصيل الكتالوج العادية.
- لا يعتمد هذا العقد واجهة المهمة 3.22 أو أي مهمة لاحقة.
