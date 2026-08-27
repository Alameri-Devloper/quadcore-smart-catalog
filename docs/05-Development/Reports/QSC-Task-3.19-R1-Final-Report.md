# QSC Task 3.19-R1 Final Report

## Status

ReadyForReview

Both independent-review findings are corrected and every required verification gate passes. Independent review is still required; this report does not self-approve the task.

## Task

Task 3.19-R1 — Direct Share Money Semantics and Browser-Safe Adapter Hardening

## Branch

`feature/direct-device-sharing` at baseline/HEAD commit `4371bcc`. No Git write command was used.

## English Summary

Corrected customer-facing Direct Share money text without changing canonical Money storage or transport. The existing Task 3.16 ISO 4217 List One registry now carries authoritative Minor Unit metadata, including explicit `null` for official N.A. entries. One reusable bigint-only formatter produces major-unit customer text with the required fractional width. Direct Share returns a typed `UnsupportedCurrencyForDirectShare` outcome instead of guessing for N.A. currencies, while `price.amountMinor` remains the original decimal string. The browser adapter now resolves `navigator` lazily during the explicit share interaction, so component construction and server/prerender rendering do not evaluate browser-only globals.

## Arabic Summary

تم تصحيح نص الأموال الموجه للعميل في المشاركة المباشرة من دون تغيير تخزين الأموال المعياري أو عقد النقل. أصبح سجل ISO 4217 الحالي من المهمة 3.16 يتضمن بيانات الوحدة الصغرى الرسمية، مع تمثيل قيم N.A. صراحةً بالقيمة `null`. ينتج منسق واحد قابل لإعادة الاستخدام ويعتمد `bigint` فقط نص الوحدات الرئيسية مع العدد المطلوب من المنازل الكسرية. تعيد المشاركة المباشرة النتيجة المعرّفة `UnsupportedCurrencyForDirectShare` بدل افتراض مقياس للعملات ذات N.A.، بينما تبقى `price.amountMinor` السلسلة العشرية الأصلية. يحل محول المتصفح `navigator` بصورة كسولة عند تفاعل المشاركة الصريح، لذلك لا يقيّم إنشاء المكوّن أو عرضه المسبق على الخادم المتغيرات العامة الخاصة بالمتصفح.

## Independent Review Findings

Finding 1 was valid: Direct Share rendered minor-unit bigint values as though they were major-unit customer prices. Finding 2 was valid: the adapter default constructor evaluated `navigator` during component render. Both root causes were reproduced in source, corrected with focused policy changes, and covered by regressions without redesigning the approved sharing boundary.

## Money Contract Review

PostgreSQL `BIGINT`, TypeScript `bigint`, HTTP `amountMinor` decimal strings, Task 3.17 price inheritance, Branch overrides, and zero-versus-missing behavior are unchanged. Only human-readable share text is formatted into major units.

## Minor Unit Review

Minor Unit values come from the official SIX ISO 4217 List One published `2026-01-01`. Defined values are `0`, `2`, `3`, or `4`; official N.A. values are represented as `null`. No scale is inferred for N.A. entries.

## Currency Registry Review

The existing canonical Task 3.16 fixed registry was enriched; Sharing has no second Currency registry. The complete existing 178-code set is preserved in the same order with no duplicates or missing codes. `ISO_CURRENCY_CODES`, `isCurrencyCode`, Workspace enablement, existing Reference Data APIs, and persisted codes remain compatible. No Currency table or migration was added.

## BIGINT Formatting Review

`formatIsoCurrencyAmountMinor` uses bigint/string operations only. It performs no `Number` conversion or floating-point division, preserves required trailing zeroes, handles zero, and preserves the full safe Money range. Focused tests prove `750` formats as `7.50` USD, `750` JPY, `0.750` KWD, and `0.0750` CLF, while maximum safe stored Money formats without precision loss.

## Customer Share Text Review

English and Arabic system labels use the formatted major-unit amount followed by the unchanged ISO code. Product, Branch, Workspace, and specification display data remain unchanged. There is no FX, tax calculation, conversion, truncation, or locale-driven reinterpretation.

## Machine DTO Non-Regression Review

The payload still returns `{ mode, amountMinor, currency }`. HTTP regression coverage proves `amountMinor` remains the original minor-unit decimal string while the human text uses major-unit formatting. Unsupported N.A. currencies return a typed 422 business outcome without emitting a guessed customer price or modifying stored Money.

## Browser Environment Review

`BrowserDeviceShareAdapter` now accepts a lazy browser-capability resolver. The default resolver uses one guarded `typeof navigator` check and is invoked only by the explicit `share` operation. Browser-global checks are not scattered through React.

## Prerender Safety Review

A server-render regression installs a throwing `navigator` getter and successfully renders `DirectProductShare`. This proves default component construction and prerender do not inspect `navigator.share`, `navigator.canShare`, or `navigator.clipboard`.

## Device Share Adapter Review

`DeviceSharePort` remains unchanged. Native text and file sharing, `canShare` fallback, neutral `AbortError`, Clipboard fallback, manual fallback, and non-cancellation failure semantics remain intact. A focused test proves capability resolution is lazy and occurs once on the explicit share interaction.

## Retail Review

Retail still requires `catalog.sharing.create`, `catalog.products.view`, and `pricing.view`. Workspace Retail and Branch override projections use the same canonical formatter only after authorization and eligibility checks.

## Wholesale Review

Wholesale still independently requires `pricing.wholesale.view`. Its customer text uses the same canonical formatter, and the machine amount remains unchanged.

## Reference Cost Non-Disclosure Review

No Reference Cost mode, query, DTO property, or text path was introduced. Existing serialized non-disclosure assertions continue to pass.

## Branch Scope Review

Trusted Branch scope, active same-Workspace Branch validation, explicit `Listed` eligibility, Branch override selection, and non-disclosing not-found behavior are unchanged.

## Inventory Disclosure Review

Direct Share still emits only `InStock` or `OutOfStock` for a Branch. Exact `onHand`, `reserved`, `damaged`, available values, and Workspace totals remain absent.

## Media Security Review

Authenticated same-origin media, Published Product checks, main-media membership, identity-bound canonical key validation, filesystem containment, WebP signature, SHA-256, private no-store responses, and the 8 MiB limit are unchanged.

## Multi-Tenant Review

All existing Workspace-scoped repository queries and trusted-context rules are unchanged. Currency metadata is fixed system Reference Data and introduces no tenant-owned lookup or cross-Workspace path.

## Migration Non-Change Confirmation

Migrations and snapshots `0000` through `0015` are unchanged. No `0016` migration exists or was created.

## PostgreSQL Integration Results

The complete guarded local PostgreSQL suite passed 126 tests across 24 suites with zero failures and zero skips. All five Direct Product Sharing repository assertions passed, covering Branch overrides, Workspace inheritance, zero/missing Money, listing/availability, historical specifications, media, tenant isolation, and Reference Cost non-disclosure. No new PostgreSQL assertion was required because R1 changes fixed code-owned Currency metadata, pure bigint text formatting, and Presentation capability resolution without changing persistence. Only the configured `TEST_DATABASE_URL` was used; no Production database or URL was printed or changed.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed with zero errors or warnings.
- `npm.cmd test` — passed; all included suites passed, with the existing Product Media platform-permission test skipped as designed.
- `npm.cmd run test:reference-data` — 15 passed.
- `npm.cmd run test:product-entry` — 151 passed.
- `npm.cmd run test:product-media` — 108 passed, 1 existing platform-permission skip.
- `npm.cmd run test:branch` — 5 passed.
- `npm.cmd run test:inventory` — 9 passed.
- `npm.cmd run test:pricing` — 8 passed.
- `npm.cmd run test:catalog-query` — 16 passed.
- `npm.cmd run test:direct-sharing` — 35 passed.
- `npm.cmd run test:integration` — 126 passed across 24 suites.
- `npm.cmd run build` — passed; both Direct Share routes remain in the Production manifest and static pages prerender successfully.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed.
- No npm audit command was run, as explicitly required.

## Money Formatting Test Results

Focused tests cover USD two digits, JPY zero digits, KWD three digits, CLF four digits, USD/YER zero, maximum safe stored Money, Branch override text, Workspace/branchless text, Wholesale text, unchanged machine `amountMinor`, registry completeness/uniqueness, and typed N.A. rejection without guessed output.

## Browser/Prerender Test Results

The prerender regression passes with any `navigator` access configured to throw. Adapter tests continue to cover text native share, accepted file share, unsupported/rejected file fallback, neutral cancellation, Clipboard success, Clipboard absence/failure, native failure, and lazy capability resolution.

## Direct Sharing Test Results

The focused Direct Sharing suite passes 35 tests across seven suites. Authorization, same-origin policy, safe DTO serialization, Branch eligibility, Inventory disclosure, historical specifications, media security, native-device outcomes, and manual fallback remain covered.

## Regression Results

All required Product Entry, Product Media, Reference Data, Branch, Inventory, Pricing, Catalog Query, Identity (through `npm test`), Production build, Drizzle, and live PostgreSQL regressions pass. The existing Product Media link-permission skip remains unchanged and intentional.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.19-R1-Final-Report.md`
- `domains/catalog/sharing/presentation/DirectProductShare.prerender.test.ts`

## Files Modified

- `docs/01-Architecture/Catalog/Catalog-Reference-Data.md`
- `docs/01-Architecture/Catalog/Direct-Device-Sharing.md`
- `domains/catalog/reference-data/domain/catalog-reference-data.ts`
- `domains/catalog/reference-data/domain/catalog-reference-data.test.ts`
- `domains/catalog/sharing/application/direct-product-share-results.ts`
- `domains/catalog/sharing/application/direct-product-share.use-cases.ts`
- `domains/catalog/sharing/application/direct-product-share.use-cases.test.ts`
- `domains/catalog/sharing/domain/direct-product-share.ts`
- `domains/catalog/sharing/infrastructure/http/direct-product-share-route-handlers.ts`
- `domains/catalog/sharing/infrastructure/http/direct-product-share-route-handlers.test.ts`
- `domains/catalog/sharing/presentation/browser-device-share.adapter.ts`
- `domains/catalog/sharing/presentation/browser-device-share.adapter.test.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- PostgreSQL Money columns, price repositories, and Task 3.17 inheritance/override logic.
- Direct Share repository SQL and PostgreSQL integration fixtures.
- `DirectProductShare` React business coordination and `DeviceSharePort`.
- Permissions, trusted context, Branch scope, Inventory, Product Media, same-origin, and serialized non-disclosure policies.
- Migrations/snapshots `0000` through `0015`.

## Git and Review Integrity

The branch remained `feature/direct-device-sharing` at baseline HEAD `4371bcc`. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was used. Source files remain exact; generated evidence sanitizes outputs only and excludes environment files, credentials, URLs, dumps, customer data, and media. No Production database or migration was touched.

## Known Limitations

- ISO 4217 List One changes require a reviewed code-registry update; metadata is intentionally fixed rather than fetched at runtime.
- Official N.A. Minor Unit codes cannot produce customer-facing Direct Share prices and intentionally return a typed rejection.
- Native share targets and actual delivery remain unknowable; file support remains platform-dependent with text/Clipboard/manual fallback.
- No public Product link or recipient integration exists.

## Next Recommendation

Perform an independent review of Task 3.19-R1, focusing on canonical Minor Unit metadata, bigint formatting, typed N.A. rejection, unchanged machine Money, and browser/prerender safety. Do not commit, push, merge, deploy, or begin the next roadmap task before approval.
