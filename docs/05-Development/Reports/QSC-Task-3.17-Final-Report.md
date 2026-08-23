# QSC Task 3.17 Final Report

## Status

ReadyForReview

## Task

Task 3.17 — Branch Inventory, Stock Ledger and Price Overrides

## Branch

`feature/branch-inventory-pricing` at baseline commit `65021e26ba1d8e9d0a979835d51e3a0294b7a22a`.

## English Summary

Implemented Workspace-scoped Branch lifecycle management, Branch Product listing, an immutable piece-based Inventory movement ledger with reservations and transfers, Workspace base pricing, Reference Cost protection, Branch price overrides, and a permission-filtered operational read model. The implementation preserves the existing Clean Architecture and Domain Driven Design boundaries and uses generated Drizzle migrations.

## Arabic Summary

تم تنفيذ إدارة دورة حياة الفروع ضمن نطاق مساحة العمل، وإتاحة المنتجات لكل فرع، وسجل حركات مخزون غير قابل للتعديل يعتمد على القطع، والحجوزات والتحويلات، والأسعار الأساسية لمساحة العمل، وحماية التكلفة المرجعية، وتجاوزات أسعار الفروع، ونموذج قراءة تشغيلي يرشّح البيانات حسب الصلاحيات. يحافظ التنفيذ على حدود البنية النظيفة والتصميم الموجّه بالمجال، ويستخدم ترحيلات Drizzle مولّدة آليًا.

## Architecture Review

- New business behavior is separated into Workspace Branch, Inventory, and Catalog Branch Product modules.
- Route handlers validate HTTP input and delegate to application use cases.
- Business invariants are owned by domain/application services; persistence is behind unit-of-work ports.
- Components do not access PostgreSQL directly, and no new dependency was introduced.

## Branch Boundary Review

Branch lifecycle is implemented under `domains/workspace/branches`. Branch Product listing and pricing remain in the Catalog domain, while stock state and movements remain in the Inventory domain.

## Existing Branch Identity Compatibility Review

The existing `workspace_branch_references` identity is evolved in place. Existing `branchId` values and Identity branch-scope references remain valid; the table now adds stable code, display name, ordering, lifecycle state, and revision data.

## Branch Lifecycle Review

Branches support create, read, rename, reorder, activate, and deactivate operations with optimistic revision checks. There is no business delete operation. Codes are normalized, stable after creation, and unique inside a Workspace.

## Branch Scope Review

Every Branch lookup carries trusted Workspace scope. Staff reads are filtered by selected Branch authority; foreign Workspace and unselected Branch targets map to non-disclosing not-found outcomes.

## Branch Product Listing Review

Listing is explicit per Workspace, Branch, and Product. Missing configuration is returned as `NotConfigured`; list/unlist state is persisted, and archived Products cannot be listed.

## Inventory Boundary Review

Inventory owns balances, movements, reservations, corrections, damage state, and transfers. It references Workspace, Branch, and Product identities without moving Product ownership out of Catalog.

## Piece Unit Review

Inventory quantities are whole pieces. HTTP DTOs use canonical decimal strings, application/domain code uses `bigint`, and PostgreSQL uses `BIGINT`; fractional, signed where disallowed, unsafe, and malformed values are rejected.

## Movement Ledger Review

Stock changes are represented by append-only movement rows. The business repository contract exposes append/list behavior and no movement update or delete operation. Correlation and operation identities support traceability and retry safety.

## Inventory Balance Review

Balances are derived transactionally from locked state. The model uses `available = onHand - reserved - damaged`; damaged physical stock remains included in `onHand` while excluded from availability.

## Receive Review

Receive appends a positive receipt movement and increases on-hand and available stock exactly once per idempotency key.

## Issue Review

Issue locks the balance, verifies sufficient available pieces, appends an issue movement, and prevents negative stock.

## Reservation Review

Create, release, and fulfill operations are explicit and idempotent. Reservation creation locks the balance and prevents oversubscription; fulfill consumes the reserved quantity atomically.

## Damaged Inventory Review

Damage and restore operations are explicit movements. Damage reduces availability without falsely removing physical on-hand stock, and restore returns pieces to available stock.

## Transfer Review

Transfers lock source and destination balances in deterministic Branch order, validate scope for both Branches, and append correlated source/destination movements in one transaction. Partial transfer persistence is not possible.

## Correction Review

Corrections require an explicit signed delta and reason and are recorded as immutable movements. Transactional invariants prevent a correction from producing invalid balance state.

## Inventory Idempotency Review

Mutation operation identities are unique in Workspace scope. Repeating the same operation returns the existing outcome, while conflicting reuse is rejected.

## Inventory Concurrency Review

PostgreSQL `SELECT FOR UPDATE`, operation uniqueness, and deterministic transfer lock ordering serialize contested stock changes and avoid oversubscription and transfer deadlocks.

## Non-Negative Invariant Review

Database checks and transaction-owned validation prevent negative on-hand, reserved, damaged, or available quantities. Concurrent issue/reservation tests prove that only one claimant can consume the last available piece.

## Pricing Boundary Review

Workspace base pricing, protected Reference Cost, and Branch overrides are implemented under Catalog Branch Products. Price access is separated from inventory and guarded by dedicated permissions.

## Workspace Base Pricing Review

Retail and Wholesale base prices reuse the Product commercial columns. Typed Product pricing endpoints update or clear one price type without hardcoded tenant behavior.

## Money Review

Money amounts cross HTTP as canonical decimal strings, are represented internally as `bigint`, and persist as PostgreSQL `BIGINT`. Currency codes are validated against the fixed registry and Workspace-enabled currencies.

## Retail Review

Retail base prices may be inherited by Branches or replaced by an explicit Branch Retail override. An explicit zero is a valid price.

## Wholesale Review

Wholesale uses the same inheritance and override semantics as Retail and is hidden unless the caller has `pricing.wholesale.view`.

## Reference Cost Security Review

Reference Cost is stored separately from customer-facing price fields and is returned only with `referenceCost.view`. It is not leaked through the operational read model or Product Entry responses to callers without that permission.

## Branch Price Override Review

Overrides are unique by Workspace, Branch, Product, price type, and currency. Writes require trusted Branch scope, pricing management authority, and an active Workspace currency.

## Price Inheritance Review

Without an override, the operational read model resolves the live Workspace base price. A stored override remains stable when the base price later changes.

## Override Clearing Review

Clearing is an explicit delete operation and is distinct from setting zero. After clear, the Branch immediately inherits the current base price.

## Currency Validation Review

Currency codes must exist in the fixed ISO registry and be enabled for the Workspace. Invalid or disabled currencies are rejected before persistence.

## Multi-Tenant Review

Tables, uniqueness constraints, foreign keys, repository queries, operation identities, and use cases carry Workspace identity. Cross-Workspace targets are rejected without disclosing foreign records.

## Authorization Review

Added `workspace.branches.view` and `workspace.branches.manage` permissions and integrated existing pricing permissions into Product Entry reads and writes. Owner-derived/non-assignable management rules remain enforced. Server-derived authority is used; clients cannot supply trusted Workspace, actor, permission, or Branch-scope fields.

## Transaction Review

Inventory mutations, transfer pairs, reservations, Branch revisions, listings, price updates, and Audit persistence use transaction-owned unit-of-work implementations. Rollback prevents partial domain state.

## Audit Review

Mutation use cases create structured Audit records inside their owning transaction, including Workspace, actor, target, operation, and relevant before/after or reason metadata without storing credentials.

## Security Review

Routes require authenticated server context, same-origin checks for mutations, strict DTO validation, tenant-safe error mapping, and permission checks. Product Entry now omits protected price fields on reads and preserves hidden prices when an authorized edit omits fields it could not see.

## HTTP Boundary Review

HTTP handlers parse identifiers, revisions, integer quantities, and Money strings before invoking use cases. Domain failures map to typed safe responses; database errors and tenant existence details are not exposed.

## Read Model Review

`GET /api/branches/[branchId]/products/[productId]` composes listing, inventory balance, and effective pricing. Wholesale and Reference Cost are conditionally omitted according to dedicated view permissions.

## Presentation Review

No management UI was added by this task. The delivered APIs and operational read model are ready for a separately reviewed presentation task; no architecture or UX behavior was implied beyond the approved scope.

## Responsive Review

Not applicable to this backend/API implementation because no visual layout was introduced. Mobile, tablet, and desktop behavior must be verified when a UI consumes these contracts.

## Accessibility Review

Not applicable to this backend/API implementation because no interactive presentation was introduced. Keyboard, screen-reader, focus, and touch QA remain required for the future UI.

## Migration Review

Generated migrations `0013_spooky_talkback.sql` and `0014_cuddly_switch.sql` add the approved Branch, listing, pricing, Inventory, permission, ownership, constraint, and index changes. Historical migrations `0000` through `0012` were intentionally untouched. No Production migration was executed.

## Drizzle Metadata Review

`drizzle/meta/0013_snapshot.json`, `drizzle/meta/0014_snapshot.json`, and `_journal.json` were generated through `npm run db:generate`. `npm run db:check` passes.

## PostgreSQL Integration Review

The guarded local PostgreSQL test database was prepared and the complete integration suite passed: 110 tests in 22 suites. Tests cover migrations, real constraints, tenant isolation, Branch lifecycle, BIGINT Money, inheritance/clear behavior, Inventory locking, idempotency, and atomic transfer behavior.

## Test Results

- `npx tsc --noEmit`: passed.
- `npx tsc --project tsconfig.integration.json --noEmit`: passed.
- `npm run lint`: passed with zero errors and zero warnings.
- `npm test`: passed, including Branch (5), Inventory (8), Pricing/Listing (8), and the existing regression suites.
- Product Entry focused regression suite: 151 tests in 16 suites passed.
- `npm run test:integration`: 110 tests in 22 suites passed.
- `npm run db:check`: passed.
- `npm run build`: passed; Next.js generated 37 static pages and all new dynamic API routes.
- `git diff --check`: passed; only Git line-ending normalization notices were emitted.

## Concurrency Test Results

PostgreSQL tests passed for concurrent issue of the final piece, concurrent reservations without oversubscription, idempotent atomic transfer, Branch-scoped uniqueness, and optimistic revision behavior.

## Manual QA Results

API routes were exercised through automated HTTP boundary tests and confirmed in the production route manifest. Visual, touch, mouse, and keyboard QA are not applicable because this task contains no UI. No Production data or migration target was used.

## Files Created

- `app/api/branches/**` — Branch lifecycle, listing, pricing, inventory, movements, reservations, damage, and correction routes.
- `app/api/inventory/transfers/route.ts` — atomic transfer route.
- `app/api/products/[productId]/pricing/[priceType]/route.ts` — Workspace base pricing route.
- `domains/workspace/branches/**` — Branch domain, application, ports, PostgreSQL adapter, runtime, HTTP adapter, and tests.
- `domains/inventory/**` — Inventory domain, application, ports, PostgreSQL adapter/schema, runtime, HTTP adapter, and tests.
- `domains/catalog/branch-products/**` — listing/pricing domain, application, ports, PostgreSQL adapter, runtime, HTTP adapter, and tests.
- `docs/01-Architecture/Inventory/Branch-Inventory-and-Pricing.md`.
- `drizzle/0013_spooky_talkback.sql` and `drizzle/meta/0013_snapshot.json`.
- `drizzle/0014_cuddly_switch.sql` and `drizzle/meta/0014_snapshot.json`.
- `docs/05-Development/Reports/QSC-Task-3.17-Final-Report.md`.

## Files Modified

- `docs/01-Architecture/Inventory/README.md`.
- `domains/catalog/infrastructure/persistence/schema.ts`.
- `domains/catalog/product-entry/application/get-product-entry-product.use-case.ts`.
- `domains/catalog/product-entry/application/get-product-entry-submission.use-case.ts`.
- `domains/catalog/product-entry/application/product-entry-execution-context.ts`.
- `domains/catalog/product-entry/application/submit-product-entry.use-case.ts`.
- `domains/catalog/product-entry/application/submit-product-entry.use-case.test.ts`.
- `domains/identity/domain/permission.ts`.
- `domains/identity/infrastructure/persistence/schema.ts`.
- `domains/identity/presentation/identity-i18n.tsx`.
- `domains/workspace/infrastructure/persistence/schema.ts`.
- `drizzle.config.ts`.
- `drizzle/meta/_journal.json`.
- `package.json`.
- `shared/infrastructure/persistence/schema.ts`.
- `tsconfig.integration.json`.

## Files Deleted

None.

## Files Intentionally Unchanged

- Historical migrations and snapshots `0000` through `0012`.
- Existing Product, Category, Department, Workspace, Company, and Identity architecture outside the minimal compatibility and permission integrations listed above.
- Existing UI pages and component structure.
- Production environment and real environment files.

## Known Limitations

- This task intentionally provides no Branch/Inventory/Pricing management UI.
- No in-transit transfer state, valuation engine, or historical price-event ledger was introduced because those are outside Task 3.17.
- Reference Cost is a protected current value, not a full cost-accounting subsystem.
- PostgreSQL verification used the guarded local test database only.

## Required Confirmations

- Independent review should confirm the migration SQL and composite tenant constraints.
- Independent review should confirm permission assignments and Reference Cost/Wholesale non-disclosure.
- Independent review should confirm API semantics before beginning a presentation task.
- Production migration requires separate approval and is not part of this handoff.

## Git and Review Integrity

- Work remained on `feature/branch-inventory-pricing`.
- Baseline/HEAD is `65021e26ba1d8e9d0a979835d51e3a0294b7a22a`; no commit, stage, push, merge, reset, or checkout operation was performed.
- Task 3.16 merge commit is present in ancestry.
- `git diff --check` passed.
- Historical Drizzle migrations were not modified.
- Review evidence preserves source files byte-for-byte and sanitizes command evidence only.
- Optional runtime/full audits were not run because they require explicit approval; the review bundle records them as intentionally skipped.

## Architecture Changes

No architecture redesign was made. The approved Branch lifecycle was added inside Workspace, Inventory was introduced as its own domain, and Branch listing/pricing was added inside Catalog. Existing branch identity was evolved compatibly, persistence remains behind repository/unit-of-work ports, and multi-tenant scope remains mandatory throughout.

## Summary

Task 3.17 is implemented and verified without Production changes or Git mutation. Branch lifecycle, Branch Product listing, immutable piece stock movements, balance protection, reservations, damage/restore, atomic transfers, corrections, base prices, protected cost, overrides, inheritance, clear semantics, authorization, and tenant isolation are covered by unit, HTTP, PostgreSQL, metadata, lint, type, and production-build verification.

## Next Recommendation

Stop for independent review of Task 3.17. Do not begin Task 3.18 or any UI implementation until this report, the generated review archive, migrations, permission model, and API contracts are approved.
