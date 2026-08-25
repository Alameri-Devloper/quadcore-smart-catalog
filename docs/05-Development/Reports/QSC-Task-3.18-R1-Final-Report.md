# QSC Task 3.18-R1 Final Report

## Status

ReadyForReview

## Task

Task 3.18-R1 — Catalog Query Security, Cursor and Historical Read Hardening

## Branch

`feature/catalog-query-search` at baseline/HEAD commit `43cecd4a1b45baa9c48574ed131ea8f42ebdccd2`. No Git write command was used.

## English Summary

Corrected the four independent-review findings without redesigning Task 3.18. Availability-only Catalog cards and details now expose only `InStock` or `OutOfStock`; exact Inventory balances require `inventory.quantity.view`. Canonical cursors now validate the complete sort tuple before any repository call. Product Details now start specification projection from persisted Product Specification Values, preserving historical values after current-template changes. Reference-label prefixes are reachable search candidates, unused reference trigram indexes were removed from the uncommitted migration 0015, hierarchy choices exclude orphan active children, and the actual newest mixed-direction plan was verified in guarded PostgreSQL. Task 3.19 was not started.

## Arabic Summary

تم تصحيح ملاحظات المراجعة المستقلة الأربع دون إعادة تصميم المهمة 3.18. تعرض بطاقات وتفاصيل الكتالوج لصلاحية الإتاحة فقط الحالة `InStock` أو `OutOfStock`، ولا تعرض أرصدة المخزون الرقمية إلا مع `inventory.quantity.view`. يتحقق المؤشر الآن من زوج الفرز كاملًا قبل أي استدعاء للمستودع. تبدأ مواصفات تفاصيل المنتج من قيم مواصفات المنتج المخزنة، ولذلك تبقى القيم التاريخية بعد تغيير القالب الحالي. أصبحت بادئات أسماء المراجع ضمن مجموعة المرشحين الفعلية، وأزيلت فهارس trigram التخमينية للمراجع من الهجرة 0015 غير الملتزم بها، ومنعت خيارات التسلسل الأبناء النشطين تحت أسلاف غير نشطين، وتم التحقق من خطة فرز الأحدث الفعلية في PostgreSQL المحمية. لم تبدأ المهمة 3.19.

## Independent Review Findings

All three blockers and the focused search/index consistency finding were valid. The prior verification suite passed because one test explicitly accepted the numeric availability leak, cursor tests covered only envelope/fingerprint failure, the specification fixture retained current template membership, reference tests used full labels, and EXPLAIN used an ascending order different from Production semantics.

## Root Cause Review

- DTO mapping placed exact `available` quantity inside the availability-authorized projection.
- Cursor decoding checked canonical JSON shape, sort, fingerprint, lengths, and generic tuple structure but did not validate the sort-specific `value`, `nullRank`, or normal Catalog identifier constraints.
- Product Details used mandatory Product → current template → current template entry joins before resolving a persisted specification value.
- Reference prefix ranking existed in `CASE`, while the candidate predicate admitted reference labels through full-text token matching only.
- Active Catalog filter queries checked child status without requiring Active hierarchy ancestors.
- The prior EXPLAIN used `created_at ASC, product_id ASC`, while the actual newest sort is `created_at DESC, product_id ASC`.

## Inventory Availability Disclosure Review

`inventory.availability.view` now emits only `availability: "InStock" | "OutOfStock"` when a trusted Branch context exists. It emits no `inventory` object and no numeric `available`, `onHand`, `reserved`, or `damaged` values on either Catalog Cards or Product Details. Stock filtering continues to use the exact server-side balance internally.

## Inventory Quantity Permission Review

`inventory.quantity.view` emits the complete authorized decimal-string balance: `available`, `onHand`, `reserved`, and `damaged`, plus the derived availability state. Owner behavior remains fully authorized. Branchless reads emit neither availability nor quantities.

## Cursor Validation Review

Cursor validation is performed after normalized query shape/fingerprint construction and before Branch lookup, hierarchy lookup, or `repository.search()`. The Product ID uses the same trimmed, bounded, control-character-safe identifier contract as Catalog inputs. Non-Retail sorts reject `nullRank`; Retail sorts require it.

## Relevance Cursor Review

Relevance values must first match canonical non-negative numeric syntax and then round-trip through finite JavaScript numeric serialization. Text, empty values, `NaN`, `Infinity`, `-Infinity`, noncanonical numeric spelling, and overflow are rejected before repository execution.

## Newest Cursor Review

Newest values must match the exact millisecond UTC shape produced by `Date.toISOString()` and round-trip to the same string. Invalid dates and valid-but-noncanonical timestamps are rejected.

## Retail Cursor Review

Non-null Retail positions require `nullRank: 0` and canonical non-negative integer syntax within `9007199254740991`; parsing uses `BigInt`, never unsafe `Number`. Null Retail positions require exactly `{ nullRank: 1, value: "0" }`. Negative, decimal, alphabetic, unsafe, missing-rank, and impossible null tuples are rejected.

## Cursor HTTP Error Review

Every malformed/tampered sort tuple returns typed `InvalidCursor`; the HTTP boundary maps it to 400. Unit coverage proves the repository receives zero calls. PostgreSQL casts cannot convert these malformed positions into a 503.

## Historical Specification Review

Product Details now selects `catalog_product_specification_values` by `workspace_id` and `product_id` first. Same-Workspace Specification Definition metadata is resolved with an optional scoped join. The persisted Product value type and value remain authoritative; a missing Definition falls back safely to the stable field ID and no inferred value is created. Ordering uses persisted Product value `position`, then specification field ID.

## Template Change Compatibility Review

The live fixture persists `RAM = 16` while RAM belongs to the Product Type template, then removes RAM from the current template without touching the Product value. Details still return RAM with the inactive same-Workspace Definition label/unit and persisted position. A foreign Workspace Definition with the same ID and different metadata is never selected. Before/after SQL rows prove the Product value was not rewritten, and repeated reads prove deterministic ordering.

## Reference Search Candidate Review

The candidate predicate now includes explicit case-insensitive prefixes for Product code/name and Brand, Category, and Product Type labels. Prefix comparisons use length equality rather than treating user `%` or `_` characters as wildcard authority. Ranking and candidate behavior are reachable and consistent.

## Reference Prefix Review

Guarded PostgreSQL assertions prove `Len` matches `Lenovo`, `Lap` matches `Laptops`, and `Bus` matches `Business Laptop`, while existing full-label, Arabic, case-insensitive, deterministic, parameterized-hostile-text, and Product typo behavior remains intact.

## Trigram Index Justification Review

Selected Option B. V1 fuzzy matching remains supported only for Product name/code, so their GIN trigram indexes and `pg_trgm` remain. The three Brand/Category/Product Type display-name trigram indexes were removed from schema, migration 0015, and the Drizzle snapshot. PostgreSQL evidence confirms those three indexes are absent after a clean migration.

## Hierarchy Focused Audit Review

Task 3.16 permits a Department to become Inactive while child rows remain Active for history. Catalog Query now requires Active ancestors when validating a Category or Product Type and when returning filter options. Live assertions prove an Active Category/Product Type below an Inactive Department is neither selectable nor accepted. No Reference Data lifecycle redesign was introduced.

## Performance / Actual Query EXPLAIN Review

The sanitized 5,004-Product fixture ran the actual newest order `created_at DESC, product_id ASC`. PostgreSQL selected an Index Only Scan Backward using `catalog_products_query_newest_idx`, followed by Incremental Sort for the mixed-direction Product-ID tie break. The existing index is useful and no speculative direction change was made. This is index-eligibility evidence, not a Production latency claim.

## Multi-Tenant Review

All Product, Definition, hierarchy, Branch, Inventory, price, media, and reference joins retain `workspace_id`. Live tests include a foreign Product and a foreign Specification Definition with the same ID; neither leaks into Workspace A.

## Branch Scope Review

Trusted Branch scope, same-Workspace Active Branch lookup, and non-disclosing `BranchNotFound` behavior are unchanged. Branchless reads contain no Branch Inventory projection. Stock filters remain available only to authorized availability/quantity viewers.

## Pricing Non-Regression Review

Retail requires `pricing.view`; Wholesale requires `pricing.wholesale.view`. Effective Branch override/fallback behavior, Retail currency requirements, null-price ordering, and BIGINT transport are unchanged and passed focused/live tests.

## Reference Cost Non-Disclosure Review

Cards never include Reference Cost even with `referenceCost.view`. Details omit the field without `referenceCost.view` and include it only with explicit authority. Existing focused tests remain passing.

## Money Review

Money remains PostgreSQL `BIGINT`, TypeScript `bigint`, and decimal strings at HTTP. Cursor validation also uses `BigInt` with the approved safe transport maximum. Live tests preserve zero, Branch overrides, inheritance, null Retail, and `9007199254740991` fidelity.

## Migration Review

Migration `0015_bumpy_terrax.sql` remains the only Task 3.18 migration. A temporary ignored Drizzle output was generated from the frozen 0014 snapshot, and its generated 0015 SQL/snapshot replaced the uncommitted 0015 artifacts. The explicit `CREATE EXTENSION IF NOT EXISTS pg_trgm` statement remains because extensions are not represented by the schema snapshot. A clean guarded test-database migration through 0015 passed.

## Migration Non-Change Confirmation 0000–0014

Migrations `0000` through `0014` and their snapshots were not modified. No migration 0016 was created.

## Drizzle Metadata Review

`drizzle/meta/0015_snapshot.json` was regenerated by Drizzle tooling from the 0014 baseline and matches the corrected schema. The existing uncommitted journal entry remains index 15 for `0015_bumpy_terrax`. `npm.cmd run db:check` passed.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed; all included suites passed, with the existing platform-permission Product Media link test skipped as designed.
- `npm.cmd run test:reference-data` — 14 passed.
- `npm.cmd run test:product-entry` — 151 passed.
- `npm.cmd run test:product-media` — 108 passed, 1 existing platform-permission skip.
- `npm.cmd run test:branch` — 5 passed.
- `npm.cmd run test:inventory` — 9 passed.
- `npm.cmd run test:pricing` — 8 passed.
- `npm.cmd run test:catalog-query` — 16 passed.
- `npm.cmd run test:integration` — 121 passed, 0 failed, against guarded live PostgreSQL.
- `npm.cmd run build` — passed.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed.
- `git status --short` and `git diff --stat` — captured read-only.
- No npm audit command was run, as explicitly required.

## Cursor Security Test Results

Canonical base64url JSON cursors with correct current fingerprints reject relevance text/`NaN`/infinities, invalid and noncanonical timestamps, negative/decimal/alphabetic/unsafe Retail values, impossible Retail null tuples, forbidden name null rank, uppercase/non-bounded name positions, and invalid Product IDs. Every case returns `InvalidCursor`, invokes no repository method, and maps to HTTP 400. Changed-query, changed-sort, first/next/final-page, duplicate-key, and all fixed-sort behavior remains passing.

## Historical Specification Test Results

Live PostgreSQL proves template membership existed when `RAM = 16` was persisted, was removed afterward, and Details still returned the value. Inactive local metadata remained renderable, foreign metadata did not join, persisted rows remained byte-for-value equivalent at the SQL projection level, and ordering followed Product value position deterministically.

## Permission Disclosure Test Results

Card and Details tests prove availability-only authority returns only the derived state; quantity authority returns exact authorized balances; branchless reads return neither; Retail/Wholesale/Reference Cost field omission remains enforced; and Owner remains fully authorized.

## Search Test Results

Live PostgreSQL proves Brand, Category, and Product Type prefix behavior, existing exact/reference/Arabic/case-insensitive search, Product trigram typo behavior, deterministic ranking, hostile parameter text safety, and Workspace isolation.

## PostgreSQL Integration Results

The guarded target was `quadcore_smart_catalog_test`, distinct from application database `qsc`. Its test-only `public` and `drizzle` schemas were reset to rehearse the corrected uncommitted migration chain; no application/Production database was touched. The schemas are recoverable by rerunning the migration chain and were rebuilt successfully. The final full run passed 121/121 assertions.

## Performance Verification Results

The exact plan shape was `Limit → Incremental Sort → Index Only Scan Backward using catalog_products_query_newest_idx`, with `created_at` as the presorted key and Workspace/lifecycle as index conditions. No Production latency statement is made.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.18-R1-Final-Report.md`

## Files Modified

- `docs/01-Architecture/Catalog/Catalog-Query-and-Search.md`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `domains/catalog/query/application/catalog-query.use-cases.test.ts`
- `domains/catalog/query/application/catalog-query.use-cases.ts`
- `domains/catalog/query/domain/catalog-query.ts`
- `domains/catalog/query/infrastructure/http/catalog-query-route-handlers.test.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.integration.test.ts`
- `domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts`
- `drizzle/0015_bumpy_terrax.sql`
- `drizzle/meta/0015_snapshot.json`

## Files Deleted

None.

## Files Intentionally Unchanged

- Historical migrations and snapshots `0000`–`0014`.
- Product Aggregate and Product Entry write contracts.
- Inventory movement/balance write semantics and permission registry codes.
- Branch listing/pricing write semantics.
- Catalog Query route composition and public endpoints, except focused HTTP regression coverage.
- Existing Task 3.18 report, which remains historical evidence of the reviewed pre-R1 state.
- React Presentation, dependencies, and lockfile.

## Architecture Changes

None. The approved query-only Catalog boundary, DDD/Clean Architecture layering, trusted application authorization, query repository, direct PostgreSQL reads, Workspace ownership, and existing domain write boundaries are preserved.

## Summary

Task 3.18-R1 corrected the independent-review security/correctness findings with focused application, query, migration, documentation, and regression-test changes. All required manual gates passed. Status is ready for independent review, not self-approved.

## Known Limitations

- Search intentionally provides no stemming, translation, transliteration, or fuzzy matching for reference labels.
- Cursor pagination is deterministic for stable data; concurrent catalog mutation can naturally alter later-page membership.
- Performance evidence is a sanitized test-fixture plan, not a Production benchmark.
- No browsing Presentation was added; responsive/touch/mouse/keyboard UI QA remains outside this backend correction.

## Required Confirmations

- Independent review should confirm the availability/quantity DTO boundary, sort-specific cursor contract, persisted-value specification source, prefix behavior, and migration/index scope.
- Deployment provisioning must permit migration-role installation of `pg_trgm` or provide the extension beforehand.
- No self-approval, commit, push, merge, Production migration, or Task 3.19 work has occurred.

## Git and Review Integrity

The branch remained `feature/catalog-query-search` at baseline HEAD `43cecd4`. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was used. Source files remain exact in the review bundle; only evidence text is sanitized. Credentials, environment files, database dumps, and real customer/cost data are excluded. Audit commands were not run.

## Next Recommendation

Perform independent Task 3.18-R1 review. Only after approval should the authorized human workflow commit, push, wait for GitHub Actions, and merge into `feature/product-entry-engine`. Do not begin Task 3.19 before that approval and merge.
