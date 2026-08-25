# QSC Task 3.18 Final Report

## Status

ReadyForReview

## Task

Task 3.18 — Catalog Query, Search and Read Models

## Branch

`feature/catalog-query-search` at baseline/HEAD commit `43cecd4a1b45baa9c48574ed131ea8f42ebdccd2`. Task 3.17 is confirmed in ancestry. No Git write command was used.

## English Summary

Implemented a production-oriented, PostgreSQL-backed Catalog read boundary for Workspace-scoped Product browsing, deterministic search, canonical filters, Branch listing/availability/effective pricing, safe Product cards, historical Product details, active filter options, fixed sorting, and query-bound cursor pagination. Added three focused authenticated GET endpoints, migration-managed FTS/trigram/query indexes, permission-based DTO omission, guarded PostgreSQL coverage, performance-plan evidence, and bilingual architecture documentation. No Product write ownership, external search engine, cache, asynchronous projection, or Task 3.19 behavior was introduced.

## Arabic Summary

تم تنفيذ حد قراءة إنتاجي للكتالوج يعتمد على PostgreSQL لتصفح المنتجات ضمن مساحة العمل، والبحث الحتمي، والمرشحات المرجعية، وحالة عرض المنتج في الفرع، وإتاحة المخزون، والتسعير الفعّال، وبطاقات المنتجات الآمنة، والتفاصيل التاريخية، وخيارات التصفية النشطة، والفرز الثابت، والتصفح بمؤشر مرتبط بالاستعلام. أضيفت ثلاثة مسارات GET موثقة ومحمية، وفهارس FTS وtrigram وفهارس الاستعلام عبر الهجرة، وحذف الحقول من DTO حسب الصلاحيات، واختبارات PostgreSQL محمية، ودليل EXPLAIN، ووثائق معمارية بالإنجليزية والعربية. لم تتغير ملكية كتابة المنتج، ولم يُضف محرك بحث خارجي أو Cache أو إسقاط غير متزامن أو أي جزء من المهمة 3.19.

## Architecture Review

The new `domains/catalog/query` module follows Domain Driven Design and Clean Architecture with domain contracts, focused application use cases, a query-repository port, a PostgreSQL adapter, HTTP mapping, and runtime composition. Repositories do not call repositories. Application code owns authorization; SQL owns only scoped read projection; route handlers remain thin. No new library or service was introduced.

## Query Boundary Review

The boundary is read-only and query-focused. `SearchCatalogProductsUseCase`, `GetCatalogProductDetailsUseCase`, and `GetCatalogFilterOptionsUseCase` coordinate independent read intents instead of creating a giant service. Direct optimized joins are used because PostgreSQL is canonical and V1 measurements do not justify asynchronous projections.

## Product Ownership Review

Product remains one Workspace-level aggregate and canonical table. Branch listing, Inventory, pricing overrides, Reference Data, and Media are joined into read models without duplicating Product rows or business write rules.

## Product Card Read Model Review

Cards contain Product identity, lifecycle, classification labels, main-media identity/alt text, optional requested Branch ID/listing, and only authorized Retail, Wholesale, and availability fields. They exclude ordered galleries, specifications, internal storage paths, and Reference Cost.

## Product Details Read Model Review

Details use a dedicated query and include complete same-Workspace classification labels, ordered media, persisted specifications with definition/template metadata, optional Branch projection, authorized quantities, effective Retail/Wholesale, and explicitly authorized internal Reference Cost.

## Historical Reference Resolution Review

Details resolve same-Workspace references regardless of Active/Inactive state, preserving legitimate historical display names. Normal filter options and hierarchy validation accept Active values only. Foreign-Workspace reference resolution is impossible through scoped joins.

## Search Review

Search accepts empty browse, normalizes boundary/internal whitespace, and searches Product name/code plus Brand, Category, and Product Type display names. All values are parameterized; no arbitrary SQL or specification-wide scan exists.

## FTS Review

PostgreSQL `to_tsvector('simple', ...)` and `plainto_tsquery` provide focused token search. The Product name/code expression has a migration-managed GIN index; joined reference labels participate in the focused query without a drifting stored projection.

## Trigram Review

Migration `0015` installs `pg_trgm` with `IF NOT EXISTS`. Focused GIN trigram indexes cover Product name/code and Brand/Category/Product Type display names. Similarity is a fallback for Product name/code typo matching.

## Search Ranking Review

Ranking order is exact Product code, exact Product name, code/name prefix, exact/prefix reference label, FTS rank, then trigram similarity. Every order finishes with Product ID, and integration tests prove repeatable ordering.

## Arabic/English Search Review

English matching is case-insensitive. Arabic text is preserved and tokenized using PostgreSQL's `simple` configuration without translation or transliteration. Live PostgreSQL assertions cover Arabic Product name, English case variation, reference labels, and a typo fallback.

## Filter Review

Implemented Department, Category, Product Type, Brand, Device Class, Condition, Supply Status, lifecycle, Branch listing, stock, Retail range, and Retail currency filters. Filter-option reads use Task 3.16 canonical Active data rather than static mock vocabularies.

## Hierarchy Filter Review

The chosen policy is typed rejection. Unknown, inactive, foreign, or incompatible Department → Category → Product Type combinations return `InvalidQuery`; correctness does not depend on React.

## Branch Listing Filter Review

An explicit Branch defaults browse to `Listed`. `Unlisted`, `NotConfigured`, and `Any` require Owner or `catalog.products.edit`. Listing never overrides Product lifecycle.

## Inventory Availability Filter Review

Availability comes from server-owned balance columns as `onHand - reserved - damaged`. `InStock` is greater than zero and `OutOfStock` is zero. Branchless reads expose no inventory projection; quantity and boolean availability permissions are enforced separately.

## Pricing Projection Review

Effective Branch price is the Task 3.17 rule: matching Branch override, otherwise Workspace base. The SQL uses the canonical price tables and fixed price types. Retail ranges/sorts require a three-letter currency to prevent invalid cross-currency minor-unit comparisons.

## Wholesale Security Review

Wholesale is projected only with `pricing.wholesale.view` (or Owner authority) and omitted from unauthorized HTTP objects.

## Reference Cost Non-Disclosure Review

Card queries force Reference Cost projection off even if the actor can view it. Details include it only with `referenceCost.view`. Unauthorized output does not reveal value presence through a null placeholder.

## Money Review

Database values remain `BIGINT`, repository/application values remain `bigint`, request parsing uses decimal strings and safe bounds, and HTTP emits decimal strings. Tests cover zero, Branch override, inherited price, range filtering, null price, and `9007199254740991` without Number conversion.

## Branch Context Review

Browser `branchId` is treated only as a requested resource. The application validates trusted Workspace, trusted Branch scope, and an active same-Workspace Branch before repository search/details execution.

## Branch Scope Review

SelectedBranches Staff can use an authorized Branch and receives the same `BranchNotFound` for an unauthorized, inactive, foreign, or missing Branch. Owner AllBranches retains complete scope.

## Multi-Tenant Review

All Product, reference, listing, inventory, pricing, cost, media, specification, and Branch predicates include Workspace scope. Integration fixtures prove Workspace B Product data never appears in Workspace A reads.

## Authorization Review

Application use cases inspect the existing permission registry semantics: `catalog.products.view`, `pricing.view`, `pricing.wholesale.view`, `referenceCost.view`, `inventory.availability.view`, and `inventory.quantity.view`. Cursor content never becomes authority.

## Sorting Review

The only accepted values are `relevance`, `newest`, `name-asc`, `name-desc`, `retail-price-asc`, and `retail-price-desc`. SQL order fragments come from server-owned mappings. Retail nulls are explicitly last in both directions.

## Cursor Pagination Review

Page size defaults to 24 and values outside 1–60 are rejected. Responses contain `items` and `nextCursor | null`; there is no offset or per-search total count.

## Cursor Stability Review

Cursors carry the sort tuple plus Product ID. Tests cover the first page, continuation, changed-query rejection, deterministic results, and no repeated row for a stable dataset.

## Cursor Security Review

Cursors are canonical base64url JSON with a version and SHA-256 fingerprint bound to normalized search, filters, Branch request, sort, and disclosure visibility. They contain no trusted Workspace, actor, permissions, or Branch scope.

## Media Projection Review

Cards select only the main media row. Details return ordered media identifiers and alt text. Storage keys and Media workflow internals are not selected or serialized.

## Specification Projection Review

Details return only persisted values, joined through the Product's Product Type template entry to same-Workspace Specification Definition metadata and ordered by template sort order. Missing values are not inferred or rewritten.

## PostgreSQL Query Repository Review

The adapter performs one joined Product Card query per page. Details use a constant three-query pattern (projection, ordered media, specifications), avoiding N+1 behavior. Dynamic values are Drizzle SQL parameters; sort vocabulary is fixed code.

## Index Review

Added focused indexes for Workspace/lifecycle/newest, normalized name, base Retail, Product FTS/trigram, reference display-name trigram, Branch listing, and inventory available quantity. Existing primary/lookup indexes cover Branch overrides and point joins. No speculative search table was added.

## Performance/EXPLAIN Review

The sanitized performance fixture contained 5,004 Workspace A Products (plus one foreign-Workspace isolation row), canonical references, one active Branch, listings, balances, and prices. After `ANALYZE`, `EXPLAIN (COSTS OFF)` for a representative Workspace/lifecycle browse selected `catalog_products_query_newest_idx`. This is index-eligibility evidence only, not a Production latency claim.

## HTTP Boundary Review

Added `GET /api/catalog/products`, `GET /api/catalog/products/[productId]`, and `GET /api/catalog/filters`. Unknown/duplicate parameters and invalid types map to 400; missing authentication maps to 401; permission failure maps to 403; foreign/unauthorized Branch/Product maps safely to 404. Responses specify `Cache-Control: private, no-store`.

## Presentation Review

No Catalog browsing Presentation existed that Task 3.18 needed to connect, so no React/UI behavior was added. The implementation is intentionally the API/read-contract foundation only.

## Responsive Review

Not applicable: no Presentation surface changed. Phone, tablet, desktop, wide, RTL, and LTR layout behavior remain intentionally unchanged.

## Accessibility Review

Not applicable: no interactive or visual component changed. Touch, mouse, keyboard, screen-reader, focus, and contrast QA are deferred to the separately reviewed browsing Presentation task.

## Migration Review

The existing `0000`–`0014` chain was not edited. Drizzle generated `0015_bumpy_terrax.sql`; guarded migration rehearsal reached real PostgreSQL. The first rehearsal identified PostgreSQL's immutability rejection for `concat_ws` in an expression index. The smallest correction aligned schema, migration, and metadata on immutable `coalesce(...) || ...`, after which migration preparation and the full chain passed.

## Drizzle Metadata Review

Drizzle generated `drizzle/meta/0015_snapshot.json` and journal entry 15. Metadata and SQL remain aligned with schema index expressions; `npm.cmd run db:check` passed.

## PostgreSQL Integration Review

`TEST_DATABASE_URL` passed the existing guard and remained distinct from the application database. The full suite migrated through `0015` and completed 119 real assertions with no Production migration or credential output.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed; all included suites passed, with one existing platform-permission Product Media test skipped as designed.
- Required focused Reference Data, Product Entry, Product Media, Branch, Inventory, Pricing, and Catalog Query commands — passed.
- `npm.cmd run test:integration` — 119 passed, 0 failed.
- `npm.cmd run build` — passed; all three new API routes compiled as dynamic server routes.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed.
- No audit command was run, as explicitly required.

## Search Test Results

Focused PostgreSQL assertions cover empty browse, exact code, Product prefix/name, Brand, Category, Product Type, Arabic, English case-insensitivity, trigram typo fallback, deterministic ranking, parameterized hostile text, and Workspace isolation.

## Pagination Test Results

Application tests cover default 24, maximum-policy rejection over 60, opaque next cursor, final-page semantics in repository continuation, malformed/changed-query cursors, and Product ID continuation without duplicate rows. Repository tests cover newest and every fixed sort, including null Retail last.

## Permission Test Results

Tests prove Catalog-view denial, Branch-scope non-disclosure, authorized availability without raw quantities, authorized quantity detail, Retail/Wholesale gating, branchless inventory omission, and Reference Cost exclusion from cards even for a cost-authorized actor.

## Performance Verification Results

The 5,004-row scoped plan fixture was analyzed; PostgreSQL selected `catalog_products_query_newest_idx`. Query counts are constant per page/details request. No benchmark latency or Production-scale claim is made.

## Files Created

- `domains/catalog/query/domain/catalog-query.ts`
- `domains/catalog/query/application/catalog-query-results.ts`
- `domains/catalog/query/application/catalog-query.use-cases.ts`
- `domains/catalog/query/application/catalog-query.use-cases.test.ts`
- `domains/catalog/query/ports/catalog-query-repository.port.ts`
- `domains/catalog/query/infrastructure/catalog-query-server-runtime.ts`
- `domains/catalog/query/infrastructure/http/catalog-query-route-handlers.ts`
- `domains/catalog/query/infrastructure/http/catalog-query-route-handlers.test.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.integration.test.ts`
- `app/api/catalog/catalog-query-server-runtime.ts`
- `app/api/catalog/products/route.ts`
- `app/api/catalog/products/[productId]/route.ts`
- `app/api/catalog/filters/route.ts`
- `docs/01-Architecture/Catalog/Catalog-Query-and-Search.md`
- `drizzle/0015_bumpy_terrax.sql`
- `drizzle/meta/0015_snapshot.json`
- `docs/05-Development/Reports/QSC-Task-3.18-Final-Report.md`

## Files Modified

- `docs/01-Architecture/Catalog/README.md`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `domains/inventory/infrastructure/persistence/schema.ts`
- `drizzle/meta/_journal.json`
- `package.json`
- `tsconfig.integration.json`

## Files Deleted

None.

## Files Intentionally Unchanged

- Migrations `0000`–`0014`.
- Product Aggregate/write repositories and Product Entry write behavior.
- Task 3.17 pricing/inventory write semantics and permission registry.
- Existing React Presentation and public/sharing routes.
- Dependencies and lockfile.

## Architecture Changes

Added one read-only Catalog query submodule and focused API composition. This is an architecture-preserving extension, not a redesign; canonical ownership and write boundaries are unchanged.

## Summary

Task 3.18 is implemented and all required local verification gates passed. The implementation is ready for independent review, not self-approved.

## Known Limitations

- PostgreSQL `simple` search intentionally provides no stemming, translation, transliteration, or ML ranking.
- Cursor results are deterministic for stable data; concurrent catalog changes can naturally change later-page membership.
- Performance evidence is sanitized test-dataset index eligibility, not Production latency.
- Media contracts return safe identifiers/alt text under the existing convention, not a new public delivery URL system.
- No browsing UI, cache, total count, external search engine, or asynchronous projection is included.

## Required Confirmations

- Independent reviewer should confirm the query contract, sensitive-field omission, migration/index scope, and performance-plan evidence.
- Deployment provisioning must allow the migration role to install or already own `pg_trgm` in the target non-test environment; no Production action was performed here.
- No self-approval, commit, push, or merge has occurred.

## Git and Review Integrity

Branch remained `feature/catalog-query-search`; Task 3.17 ancestry was confirmed. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was used. Exact changed source files are intended for the automated sanitized review bundle; credentials, environment files, database dumps, and real customer/cost data are excluded.

## Next Recommendation

Perform independent Task 3.18 review. Only after approval should a human-authorized workflow commit, push, wait for GitHub Actions, and merge. Do not begin Task 3.19 until that approval and merge are complete.
