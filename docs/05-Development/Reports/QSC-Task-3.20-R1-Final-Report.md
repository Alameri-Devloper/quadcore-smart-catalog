# QSC Task 3.20-R1 Final Report

## Status

ReadyForReview

Independent review is required. This report does not self-approve the task.

## Task

Task 3.20-R1 — Safe Catalog Money Rendering and Semantic Active Filters

## Branch

`feature/catalog-presentation`

## Baseline

`941adba81045a31706e14c722036feadc00f5a90`

## English Summary

Task 3.20-R1 corrects the two independent-review findings in the existing Catalog Presentation. Catalog money now has an explicit typed presentation result and never guesses a major-unit number when ISO minor-unit metadata is N.A. or unknown. The active-state summary now resolves trusted dynamic identifiers to Workspace-entered `displayName` values, keeps Search in its control, presents Branch as preserved context, and resets only the filter set it claims to reset. The canonical URL/API identifiers, authorization, query repository, Money transport, Direct Share behavior, and Task 3.20 architecture remain unchanged.

## Arabic Summary

تصحح المهمة 3.20-R1 ملاحظتي المراجعة المستقلة في واجهة الكتالوج الحالية. أصبح عرض المبالغ يستخدم نتيجة عرض صريحة وآمنة، ولا يخمن قيمة رقمية رئيسية عندما تكون خانة الوحدات الصغرى في ISO غير منطبقة أو عندما تكون العملة غير معروفة. كما يعرض ملخص المرشحات أسماء العرض الموثوقة بدلاً من المعرفات الداخلية، ويُبقي البحث في حقل البحث والفرع كسياق محفوظ، ويعيد ضبط المرشحات الفعلية فقط. لم تتغير معرفات URL أو API المعتمدة، ولا الصلاحيات، ولا مستودع الاستعلام، ولا عقد الأموال، ولا سلوك المشاركة المباشرة، ولا بنية المهمة 3.20.

## Independent Review Findings

The expected R1 corrections were not present when final artifact regeneration began: Catalog money still fell back to raw `amountMinor`, and active-state chips still used raw query identifiers. Under the user's explicit exception for missing R1 implementation, only these two defects and their focused tests were corrected. No unrelated implementation was changed.

## Money Contract Review

PostgreSQL `BIGINT`, TypeScript server/application `bigint`, and HTTP decimal-string `amountMinor` remain authoritative. Catalog Presentation performs no floating-point arithmetic and does not alter stored or transported Money.

## ISO Minor Unit Review

Defined ISO minor units use the existing canonical formatter. Focused assertions prove USD `750` → `7.50 USD`, JPY `750` → `750 JPY`, KWD `750` → `0.750 KWD`, CLF `750` → `0.0750 CLF`, and USD `0` → `0.00 USD`. The maximum safe stored Money assertion preserves exact digits without precision loss.

## N.A. Currency Presentation Review

Catalog formatting returns the typed `UnsupportedCurrency` presentation result when the canonical formatter returns `null`. XAU, XAG, and defensive unknown currency ZZZ never render raw `amountMinor` as a guessed major-unit amount. The currency code remains visible for context beside the localized English or Arabic safe-display message, and the Product remains visible.

## Catalog Retail Review

Retail on cards and details uses the same typed safe Money presentation. Authorized formatted values and zero render normally; N.A. or unknown currencies render the explicit safe state without a numeric guess.

## Catalog Wholesale Review

Wholesale remains independently disclosed only when returned by the server and uses the same safe Money presentation policy as Retail.

## Reference Cost Display Review

Internal Reference Cost remains absent from cards and appears in Details only when authorized and returned. When present, it uses the same safe Money policy and remains excluded from Direct Share modes and payloads.

## Machine amountMinor Non-Regression Review

The Catalog HTTP adapter preserves `amountMinor` as an exact decimal string. A focused assertion proves an XAU value of `750` remains `"750"` at the client boundary; presentation safety is applied only while rendering.

## Direct Share Money Non-Regression Review

Task 3.19 sharing application policy and formatter were not changed. `npm.cmd run test:direct-sharing` passed 35/35, including the official N.A. minor-unit assertion and `UnsupportedCurrencyForDirectShare` behavior.

## Active Filter Review

The normal active-filter UI is derived from canonical query state plus the trusted filter-options response. Dynamic filters show semantic labels; fixed filters show existing localized values; price boundaries are explicitly labeled and keep their ISO currency code. Search is not duplicated as a chip, and Branch is not represented as a resettable filter.

## Dynamic displayName Review

Department, Category, Product Type, Brand, and Supply Status identifiers are resolved against trusted same-Workspace options and rendered with their exact `displayName`. Workspace-entered values are not translated. Raw internal reference identifiers are not used as the normal visible value and are omitted if no trusted option resolves them.

## Branch Context Display Review

When selected, Branch is shown separately as preserved context using the trusted Branch `displayName`, never the raw `branchId`. Server Branch authority and revalidation are unchanged.

## Reset Filter Semantics Review

`Reset filters` clears the actual filter set and cursor while preserving Search and Branch context. It preserves non-price sort; a Retail-price sort falls back deterministically to relevance when Search exists or newest otherwise because the required price filter context has been removed. Locale, authentication, session, and Branch authority are untouched.

## Query/Cursor Non-Regression Review

Canonical URL query state and opaque server cursor handling remain unchanged. Cursor-only navigation preserves the token exactly; search, filter, sort, or Branch changes reset it. R1 reset assertions explicitly prove cursor removal while Search and Branch context remain intact.

## No-Mock-Fallback Review

Production Catalog API failure still maps to typed unavailable/error states and never falls back to mock Products.

## Authentication Review

Authenticated pages, server session resolution, TrustedActorContext, same-origin enforcement, and private/no-store responses remain unchanged. No browser-supplied permissions or identity authority were introduced.

## Multi-Tenant Review

Workspace scope remains server-derived. Dynamic display values come only from trusted scoped filter options, and no repository or query ownership boundary changed.

## Reference Cost Non-Disclosure Review

Reference Cost remains structurally excluded from Product cards and customer sharing, and is rendered on Details only when the authorized server response includes it.

## Inventory Disclosure Review

Availability-only and exact-quantity disclosure rules remain unchanged. R1 neither aggregates Inventory nor adds Inventory fields to Presentation or Direct Share.

## Media Non-Regression Review

The authenticated Workspace-scoped Product media route, containment checks, checksum validation, WebP policy, and private/no-store transport remain unchanged.

## Mobile/Responsive Review

R1 reuses the responsive Task 3.20 component system. Semantic chips wrap, the separate Branch context wraps safely, controls retain touch-sized interaction, and unsupported-money text does not replace or hide the Product.

## RTL/LTR Review

The safe-money state and fixed filter labels are localized in English and Arabic. Dynamic Workspace `displayName` values are preserved verbatim. Existing locale direction and logical CSS behavior remain in force.

## Accessibility Review

Unsupported Money uses visible explanatory text with status semantics. Active filters remain readable text, Reset remains a labeled button, Branch is separately labeled, and native keyboard/touch/mouse behavior is preserved. Focused server-render assertions cover semantic output in both locales.

## Manual Browser QA Evidence

The installed managed browser-control runtime could not initialize its browser connection in this environment. Therefore phone, tablet, desktop, wide-desktop, live LTR/RTL, pointer, touch, keyboard, and screenshot QA are not claimed. Automated prerender, semantics, localization, responsive CSS, TypeScript, lint, regression, integration, and build evidence passed. Independent review should repeat representative visual QA when a browser backend is available.

## Migration Non-Change Confirmation

No schema or migration file changed. The migration chain still ends at `0015_bumpy_terrax.sql`; no `0016` exists. Integration preparation used only the guarded `TEST_DATABASE_URL`. No Production database or Production migration was used.

## Dependency Non-Change Confirmation

No dependency or lockfile changed and no runtime library was added. The existing Task 3.20 `test:catalog-presentation` script remains the only package-script addition in the uncommitted Task 3.20 source state. No `npm audit` command was run.

## Focused Test Results

- `npm.cmd run test:catalog-presentation` — passed, 21/21 across 4 suites.
- Money assertions cover USD, JPY, KWD, CLF, zero, maximum safe stored Money, XAU, XAG, ZZZ, Retail, Wholesale, Reference Cost, and unchanged HTTP decimal-string `amountMinor`.
- Filter assertions cover trusted dynamic `displayName`, localized fixed values, separate Branch context, absence of raw reference IDs, deterministic reset behavior, preserved Search/Branch, and cursor removal.
- `npm.cmd run test:catalog-query` — passed, 21/21.
- `npm.cmd run test:direct-sharing` — passed, 35/35.

## Regression Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed, including Product domain 106/106, Task Review 45/45, Product Media 108 passed with 1 platform-guarded skip, Product Entry 151/151, Reference Data 15/15, Identity 110/110, Branch 5/5, Inventory 9/9, Pricing 8/8, Catalog Query 21/21, Direct Sharing 35/35, and Catalog Presentation 21/21. There were no failures.
- All required individual domain scripts were executed within `npm.cmd test`; the focused Catalog Query, Direct Sharing, and Catalog Presentation results are recorded above.
- `git diff --check` — passed.

## PostgreSQL Integration Results

`npm.cmd run test:integration` passed 128/128 across 24 suites with serial execution. The safety guard ran before database preparation and accepted only the isolated test database. The existing local container `quadcore-smart-catalog-postgres-1` was started and confirmed healthy. No other container was intentionally started, and no Production database was accessed.

## Build Results

- `npm.cmd run build` — passed; `/catalog`, `/catalog/[productId]`, and the authenticated Catalog media route remain in the Next.js route manifest.
- `npm.cmd run db:check` — passed.

## Files Created

- `domains/catalog/query/presentation/catalog-active-filters.ts`
- `domains/catalog/query/presentation/catalog-active-filters.test.tsx`
- `docs/05-Development/Reports/QSC-Task-3.20-R1-Final-Report.md`

## Files Modified

- `app/globals.css`
- `domains/catalog/query/presentation/CatalogPage.tsx`
- `domains/catalog/query/presentation/catalog-components.tsx`
- `domains/catalog/query/presentation/catalog-components.prerender.test.tsx`
- `domains/catalog/query/presentation/catalog-presentation.i18n.ts`
- `domains/catalog/query/presentation/catalog-query-api.client.test.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- All migrations `0000`–`0015`, Drizzle metadata, and database schema.
- `package-lock.json`, dependencies, and runtime libraries.
- Catalog query application/repository/HTTP authority introduced by Task 3.20.
- Task 3.19 Direct Share application policy, formatter, device adapter, API client, and routes.
- Product, Product Entry, Reference Data, Branch, Pricing, Inventory, authentication, and media authority boundaries.

## Architecture Changes

No architecture redesign. R1 adds one Presentation-only semantic-filter mapper/reset policy and replaces an unsafe string fallback with an explicit typed Presentation result. Business authorization remains in application services, persistence remains in repositories, and canonical IDs remain transport identity.

## Known Limitations

- Live browser-emulated and physical-device visual QA remains pending because the managed browser backend could not initialize.
- R1 intentionally does not translate Workspace-entered display names.
- Public sharing, management UI, analytics, and Task 3.21/3.22 remain out of scope.

## Git and Review Integrity

Branch `feature/catalog-presentation` and baseline `941adba81045a31706e14c722036feadc00f5a90` were reconfirmed. The worktree contains the expected uncommitted Task 3.20 source plus the focused R1 correction and report. No Git write command was used: no add, commit, push, merge, rebase, reset, restore, checkout, switch, stash, clean, tag, or branch deletion. The review bundle is generated fresh for task ID `3.20-R1`; it does not reuse or rename the old Task 3.20 ZIP. Evidence excludes environment files, credentials, database URLs, tokens, cookies, real customer/member data, and database dumps.

The repository-local final artifacts are:

- `docs/05-Development/Reports/QSC-Task-3.20-R1-Final-Report.md`
- `artifacts/task-reviews/3.20-R1/QSC-Task-3.20-R1-Review.zip`
- `artifacts/task-reviews/3.20-R1/QSC-Task-3.20-R1-Review.zip.sha256`

The generator exports the same three final artifacts to `C:\Users\dell\Desktop\QSC-Reviews\` and verifies byte equality and the fresh SHA-256 before publication.

## Next Recommendation

Perform independent source/security review and repeat English/LTR plus Arabic/RTL browser QA at phone, tablet, desktop, and wide-desktop viewports when a managed browser backend is available. Do not begin Task 3.21 or Task 3.22 until Task 3.20-R1 is independently approved.
