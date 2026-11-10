# QSC Staff Catalog — Git Delivery Preparation & Whitespace Fix
# كتالوج الموظفين — تحضير تسليم Git وتصحيح المسافات البيضاء

Date / التاريخ: 2026-11-04 — Asia/Aden.
**STAFF_GIT_DELIVERY_PREPARED_FOR_OWNER_APPROVAL**
**P6_ENGINEERING_CANDIDATE — Acceptance HOLD — unchanged / دون تغيير.**

## Result and authorization / النتيجة والتفويض

The approved whitespace defect is fixed, and an exact 49-file independent Staff delivery candidate is prepared. Recommended PR target: feature/public-product-share-planning, subject to owner confirmation and separately authorized fresh remote verification. No unmerged P5 implementation dependency was found. This is preparation for approval; no staging, commit, push, PR, merge, rebase, fetch, branch/ref change or deployment occurred.

صُححت المخالفة المعتمدة وأُعدت قائمة دقيقة من 49 ملفاً لتسليم Staff مستقلاً. التوصية هي فرع feature/public-product-share-planning بعد تأكيد المالك والتحقق البعيد المفوض لاحقاً. لا اعتماد مثبت على كود P5 غير المدمج، ولم تُنفذ عمليات تسليم Git أو تطبيق تهيئة أو تغيير بيانات.

Only two writes occurred: the six-space correction in the existing component and this new report. Launcher, external Browser QA, generated screenshots/archives, other historical reports and machine-local state are excluded from the current delivery and preserved.

## Verified preflight / التحقق الأولي

| Item / البند | Actual state / الحالة الفعلية |
|---|---|
| Root/worktree | `<Staff Catalog worktree root>` |
| Branch | codex/staff-catalog-local-qa |
| HEAD | 25e50dadc8097a8f1663253917847487e17bd497 |
| Upstream | None configured |
| Initial status | 19 tracked unstaged modifications + 55 untracked = 74 files; 0 staged |
| Final status | 19 tracked unstaged modifications + 56 untracked = 75 files; 0 staged |
| New status entry | This report only |
| Renames/deletions/new commits | None |
| Staff index SHA-256, unchanged | 81e83ca5b7464c9709c5d523576c3a59e2e526fbd1bdf36750308ebbafb286ab |
| Protected Serena hash, unchanged | 405b9ca3d62f62292d41b5435fd7f1c7ee0141ef32063eb64be0bbe87c988bad |
| P5 local branch HEAD | 6e2804ab9f1312efa61e297aafd9df349adda230 |
| P6 local branch HEAD | 25e50dadc8097a8f1663253917847487e17bd497 |

All four requested review documents were present and selectively reviewed. Existing uncommitted work was hashed before the correction. Git optional locks were disabled for read-only inspection. No Git configuration changed.

The complete initial status is the inventory below excluding this new report: each M entry was already a tracked unstaged modification, and each other ?? entry was already untracked. The component correction did not change its existing M status. Thus the table records both the exact original 74-file set and the final 75-file set.

## A — Exact whitespace correction / التصحيح الدقيق

File: [domains/catalog/query/presentation/catalog-components.tsx](<../../../domains/catalog/query/presentation/catalog-components.tsx>); line 104.
Before: otherwise blank LF-terminated line containing six ASCII spaces.
After: the same empty LF-terminated line, without those spaces.

Surrounding region: CatalogFilterPanel, immediately after the catalog-product-type SelectField and before the catalog-extra-context details element. The relevant existing Staff diff was inspected before modification. No meaningful JSX content, symbol, business rule, CSS or API changed.

~~~diff
@@ line 104; visible notation only
-<six ASCII spaces><LF>
+<LF>
~~~

| Verification | Result |
|---|---|
| Initial git diff --check | Exit 2; catalog-components.tsx:104 trailing whitespace |
| Final git diff --check | PASS — exit 0, no whitespace diagnostic |
| Bytes removed | Exactly 6; 20612 → 20606 bytes |
| Line endings | LF preserved; 0 CRLF before/after; line count and encoding/BOM preserved |
| Before source SHA-256 | 2768dd4ca96efb227f5644746c944f6fd1e2331c009d54975fbcf11c74eb3c96 |
| After source SHA-256 | 274333ebf5581a20a14a1211cb4205d8f811e6cc5bfa75c81b13ca798a641e2b |
| In-memory TypeScript/JSX emission comparison | PASS — generated JavaScript byte-identical |
| Emitted JavaScript SHA-256 | f81bde57fcbd05764c06ba2e9695895dfe0d2785ec7ad4066c2431e13b8c3959 |
| Other preexisting file changes | None |

Final byte reconstruction verifies that inserting those same six spaces into the new buffer reproduces the original source hash. The ordinary tracked diff still contains all previously implemented Staff changes; the only new delta from this task is the blank-line correction.

Eighteen preexisting LF/CRLF conversion warnings remain informational; no repository line-ending policy or full-file normalization was changed. No unrelated whitespace correction was performed.

Untracked candidates were checked separately: 27 existing text candidates had no Git whitespace diagnostics and passed explicit trailing-whitespace, leading space-before-tab and blank-at-EOF inspection. The portable implementation report and new report were also inspected at final verification, giving 29 untracked text files in the final candidate. No files were staged for these checks. Git no-index checks against /dev/null returned 1 for a clean new file and 3 for the retained known-violation sample; explicit line-check calibration also detected that historical violation. A failed attempt to suppress the difference-exit signal did not change files and was not treated as an application failure.

أُزيلت ست مسافات فقط، وبقي JavaScript الناتج مطابقاً تماماً. لم تُعد اختبارات الوظائف أو المتصفح أو قواعد البيانات بسبب هذا التصحيح غير السلوكي، ولم تُطبّع نهايات الأسطر.

## B — Delivered technical contract / العقد الفني الذي يحفظه التسليم

The three essential documentation candidates are the existing bilingual portable-configuration runbook, its implementation/verification report and this report. The following current contract preserves essential approved decisions while older review/prototype/planning reports remain local historical evidence. Their old “not implemented” or execution-authorization statements are not current feature status.

- Existing private Catalog Query, DDD/Clean Architecture and TypeScript remain. No schema/migration/dependency/new service/public API is added.
- Presentation uses trusted Workspace/ProductType configuration and existing stored authorized values. Cards retain at most three configured primary summary slots with fallback to lower-priority available fields. Approved composite summaries use independently stored components; no hardware values are inferred. Details preserve all authorized historical/off-template values and at most four applicable approved important missing rows. Zero/false remain present; Outdoor false is not an independently verified Indoor classification.
- Card roles remain Laptop CPU/Memory/Storage with configured GPU/Display fallbacks; existing QA Business Memory; analog/IP cameras Resolution/Outdoor/Technology with Lens fallback; DVR/NVR Channels/Recording Resolution/Technology. Actual scoped manifest/profile bindings remain authoritative.
- Typed filters remain server-authoritative and default-deny: explicit filterability, compatible active definition/type/unit/ProductType, up to eight criteria and ten IN values; OR within IN and AND across criteria plus the existing filters. Missing or invalid constraints are not silently removed.
- Structured search requires explicit selection. Legacy approximate text search remains unchanged. Configured EN/AR aliases, approved digit normalization and canonical units are deterministic; ambiguous, incomplete, unsupported or contradictory requests reject without a fuzzy fallback or guessed conversions. Original manual context/criteria and cursor/page validation remain enforced.
- Authentication, trusted Workspace, Branch authorization, independent pricing/stock/availability permissions, private native media, authorized historical specifications and Details/Back state remain in the existing Query pipeline. Components do not acquire database authority.
- Official R3 Purple/Orange/White identity is implemented only for Staff Catalog/Details. SYSTEM defaults to OS following; LIGHT/DARK override and persist under the non-sensitive qsc.staff.catalog.theme.v1 key. Invalid/denied storage is handled safely. Shared-shell slots retain original defaults for other surfaces.
- Additional Notes remains deferred. No P5 management component, public resolution transport, P6 admission/recovery behavior or P7 feature is introduced.

يحفظ هذا التقرير عقد العرض والبحث والفلاتر والعزل والأذونات والثيم الحالي، بدلاً من تسليم جميع تقارير التخطيط القديمة بما فيها حالات أصبحت تاريخية. تبقى التعريفات والروابط وملفات التشغيل مقيدة بالمساحة ونوع المنتج، ولا تُستنتج القيم أو تُسقط الشروط.

## C — P5 overlap and actual dependencies / تداخل P5 والاعتماد الحقيقي

Local P5 comparison is HEAD...feature/task-3.23-p5-management-api-ui, merge-base 25e50dadc8097a8f1663253917847487e17bd497. P5 has three later commits: b935610 implementation, dff7bab follow-up documentation and 6e2804a handoff documentation. No protected-worktree trial merge or integration commit was performed.

| Exact overlapping file | Staff modifications | P5 modifications | Classification and risk |
|---|---|---|---|
| [app/globals.css](<../../../app/globals.css>) | Appends configured specification, typed filter/drawer, responsive card/Details and Phase4B styles after base EOF line 413; body changes are limited to existing Staff :has selectors | Changes original body min-width from 320px to min(320px,100%); appends public-share-management selectors at the same base EOF | FILE OVERLAP: yes. SEMANTIC DEPENDENCY: none demonstrated. MERGE CONFLICT RISK: same EOF insertion, likely textual conflict; later cascade/global viewport review required. ACTUAL REQUIRED BASE: existing committed stylesheet plus Staff delta, not P5 styles |
| [domains/catalog/query/presentation/CatalogProductDetailsPage.tsx](<../../../domains/catalog/query/presentation/CatalogProductDetailsPage.tsx>) | Replaces PresentationShell import/open/close with CatalogShell; preserves ProtectedPage, expiry handling, media/data requests and ready/failed rendering | Adds PublicProductShareManagement import and renders it before the original closing shell | FILE OVERLAP: yes; same CatalogProductDetailsPage render ending/import region. SEMANTIC DEPENDENCY: none demonstrated. MERGE CONFLICT RISK: competing closing JSX hunk/import edits; later authorized composition review. ACTUAL REQUIRED BASE: existing private Details/auth contracts, not P5 management |

No export signature, Query authorization contract or required Staff input was found to depend on P5's new management component/admission/database changes. Staff currently imports no PublicProductShareManagement in Details. The existing DirectProductShare used by the base component already exists at Staff HEAD; its presence is not a dependency on the later P5 PR.

Verified at HEAD: DirectProductShare.tsx, Query use cases, Query PostgreSQL repository, Identity PresentationShell and Reference Data use cases. New Staff imports are included in the manifest. File overlap alone does not establish semantic or base dependency.

Smallest strategy: independent Staff PR from the approved committed baseline. Preserve both P5 changes locally without copying them into this payload. If the target later includes P5, perform a separately authorized conflict/composition review and affected security/responsive checks in an appropriate integration context. No conflict-free merge is claimed.

التداخل نصي/تركيبي محتمل وليس اعتماداً وظيفياً مثبتاً على P5. الإجراء الأدنى هو PR مستقل، مع مراجعة منفصلة للتعارض عند اجتماع العملين لاحقاً، ودون تعديل PR #65 أو نقل تغييرات P5/P6.

## PR_TARGET_RECOMMENDATION / توصية الفرع

| Locally observed ref | Relationship to current Staff HEAD |
|---|---|
| origin/feature/public-product-share-planning | Exact same 25e50dadc8097a8f1663253917847487e17bd497 |
| local feature/public-product-share-planning | Five commits behind, at ac272123bd3ea9ee522283e97a4e3adffec239f0 |
| main / origin/main | 190 commits behind, at ae42014cfff5f56344336f5407bfd1ee8ccb2b31 |
| local/cached P5 feature branch | Three commits ahead of common base |
| P6 feature branch | Same committed pointer, uncommitted work unavailable for integration |

**Preferred: Option 1, independent PR targeting feature/public-product-share-planning after owner confirmation and fresh remote verification.** With the locally observed target at the same base, the future PR would contain only the authorized Staff commits and no later P5 commits. Advantage: reviewable Staff scope and separate P5/P6 gates. Risks: remote refs may be stale; later P5 overlap needs review; required CI/protections are not freshly verified.

Option 2, stacked PR on P5: not justified by current dependency evidence. It would tie Staff to unaccepted unrelated P5 changes and later retargeting/review complexity. No exact required unmerged P5 dependency was found.

Option 3, controlled integration preparation: contingency only if a subsequently verified target contains incompatible changes. It needs its own authorization; no trial merge, rebase, branch creation, ref update or target switch occurred.

main is not the recommended Staff-only target: it would expose 190 preexisting commits in the comparison. The stale local planning branch would expose five baseline commits. All ref statements are local observations, not current hosted truth. No fetch or PR/CI query was performed. Owner must confirm the recommended target and authorize any fresh fetch/readiness actions and later Git delivery separately.

## CONFIGURATION_DEPENDENCIES / اعتماديات التهيئة

**SOURCE DELIVERY:** included source/test/runbook is ready for review. **TARGET CONFIGURATION INSTALLATION:** not performed and not authorized here. **OPERATIONAL ACCEPTANCE:** remains separate.

C2 includes the actual UUID-free manifest/contracts, Application planner, isolated writes/tests, test fixture, guarded PostgreSQL verifier and bilingual runbook. Approved scope: six existing active ProductTypes/hierarchy, seventeen definition descriptions, twenty-six bindings. Twelve original definitions and twenty-one links must already exist; only five approved missing optional Laptop definitions/links can be created under later authorization: cpu-generation Number/unitless, ram-ddr-type Text/unitless, storage-technology Text/unitless, gpu-memory Number/GB and operating-system Text/unitless.

Future installation prerequisites: an explicitly approved environment/database and real Identity-resolved Workspace context; existing read/manage permissions; reviewed stable-code ProductType/required-definition mappings; active compatible hierarchy/definitions/templates; actual trusted currentProfiles; conflict-free Dry Run; separately authorized operational composition and runtime-profile installation. No target Workspace UUID is invented or copied from QA. QA-labelled source codes and inherited aliases are not a universal taxonomy.

Dry Run is default, with no writer calls. Missing/ambiguous/incompatible state or unknown runtime profiles blocks. Existing scoped uniqueness, optimistic versioning, audit and authorization remain. Isolated repeat application is idempotent. Each existing use case keeps its own transaction; later failure retains earlier commits; uncertain persistence stops with STOPPED_REPLAN_REQUIRED. PREPARED_NOT_INSTALLED does not mean runtime installation. No operational endpoint/CLI/startup hook/launcher applies this manifest.

The serving runtime still reads trusted CATALOG_SPECIFICATION_PRESENTATION_PROFILES. Git delivery does not transfer its current ignored JSON, environment secrets, products, prices, media, identities or databases. No Staff QA or production configuration was applied here.

يشمل التسليم آلية التهيئة واختباراتها ودليلها؛ لا يشمل تثبيت إعدادات أي مساحة أو نسخ بيانات QA. التطبيق التشغيلي والتثبيت يحتاجان تفويضاً وخطة مستهدفين مستقلين.

## Official brand requirements / متطلبات الهوية

C1 includes CatalogShell.tsx, catalog-theme.ts, catalog-brand.css, catalog-theme.test.ts, the optional shared-shell slots and public/brand/quadcore-logo.png, alongside Catalog/Details integration. Light tokens remain #4C1B74 / #381254 / #F6F5F8 / #FFFFFF / #22202A; Dark tokens #C9A4F5 / #DBBEFF / #17161B / #211F27 / #F2EFF6. Orange is selective; semantic colors and focus follow approved R3.

The existing logo was not copied or modified in this task. Repository asset SHA-256:
`762e35778e8d6bd1e877578ce8204a1a6f4afddde67783ffc3278ba3a89d3002`.
Runtime references /brand/quadcore-logo.png and requires no access to the owner's Pictures folder or standalone prototype revisions. Full original artwork, proportions, responsive containment, RTL/LTR and authorized real product content remain.

## Proposed commits / الالتزامات المقترحة

One consolidated Staff PR can contain these two dependency-ordered commits after separate authorization:

| Commit | Suggested title / purpose | Exact scope | Dependency / evidence / risk |
|---|---|---|---|
| C1 | feat(catalog): add scoped staff discovery and official themes | The 39 C1 rows in INCLUDE | Existing approved baseline. Specifications, typed/structured Query, DTO/state, filters, theme, shared-shell slots, actual logo and focused feature tests stay coherent. Includes approved whitespace correction. Reuses current functional/browser/build evidence. Risk MEDIUM; SQL/security/shared-shell/P5-overlap review |
| C2 | feat(catalog): add portable specification configuration and handoff contract | The 10 C2 rows in INCLUDE | C1 profile/domain contracts. Portable source/tests/runner, existing runbook, its implementation report and this report. Reuses 26 unit tests and 9 PostgreSQL scenarios. Risk MEDIUM; operational apply/install remain uncomposed; reviewed target mapping is separate |

The final use-case/repository/DTO/state/Catalog component files contain interleaved specification, filtering, search and UI changes. Splitting them into five historical phase commits would require partial staging, reconstructing intermediate imports/contracts and verifying each state. That reconstruction is not authorized and is unnecessary. A coherent C1 followed by C2 avoids partial staging; no patch extraction or staging script was generated. Whole-file membership is justified for this two-commit structure, not assumed for arbitrary phase slicing.

Essential documentation allowlist: this report, the portable runbook and its implementation/verification report. The runbook explicitly requires that report; retaining it preserves the verified test/concurrency/transaction limitations. Current functionality, architecture/security boundaries, configuration prerequisites, test execution and deferred gates are consolidated here. All 23 remaining historical review/decision/prototype reports remain local references; their architectural decisions are retained in the current contract above. They are not automatically included in Git or deleted.

## INCLUDE — exact candidate manifest / قائمة الإدراج

Repository-relative labels are exact. M means already tracked and unstaged; ?? means untracked. Paths linked for local review resolve under the verified Staff root. Every included path is assigned once. The report is the only newly created path.

| Status | Delivery classification | Commit / feature | Exact path | Inclusion reason | Dependency/integration risk |
|---|---|---|---|---|---|
| M | APPLICATION_SOURCE | C1 — Specifications / filters / Phase4B | [app/globals.css](<../../../app/globals.css>) | Existing scoped Catalog layout rules required by C1 | P5 EOF style overlap; later CSS cascade/viewport review |
| M | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/application/catalog-query.use-cases.test.ts](<../../../domains/catalog/query/application/catalog-query.use-cases.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| M | APPLICATION_SOURCE | C1 — Private Query application | [domains/catalog/query/application/catalog-query.use-cases.ts](<../../../domains/catalog/query/application/catalog-query.use-cases.ts>) | Authorized projection, typed criteria and structured merge | Keep complete dependency set; no phase-hunk reconstruction |
| M | APPLICATION_SOURCE | C1 — Catalog presentation/query | [domains/catalog/query/domain/catalog-query.ts](<../../../domains/catalog/query/domain/catalog-query.ts>) | Required existing Staff implementation delta | Preserve identity, Branch, pricing, stock and navigation contracts |
| M | APPLICATION_SOURCE | C1 — Trusted runtime composition | [domains/catalog/query/infrastructure/catalog-query-server-runtime.ts](<../../../domains/catalog/query/infrastructure/catalog-query-server-runtime.ts>) | Existing profile parser wired into Query use cases | Target-specific profile installation is separate |
| M | APPLICATION_SOURCE | C1 — Catalog presentation/query | [domains/catalog/query/infrastructure/http/catalog-query-route-handlers.ts](<../../../domains/catalog/query/infrastructure/http/catalog-query-route-handlers.ts>) | Required existing Staff implementation delta | Preserve identity, Branch, pricing, stock and navigation contracts |
| M | APPLICATION_SOURCE | C1 — Specification projection / typed query | [domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts](<../../../domains/catalog/query/infrastructure/persistence/postgresql-catalog-query.repository.ts>) | Tenant-bound reads and predicates for delivered private Query | Security-sensitive SQL/authorization/cursor integration |
| M | APPLICATION_SOURCE | C1 — Catalog presentation/query | [domains/catalog/query/ports/catalog-query-repository.port.ts](<../../../domains/catalog/query/ports/catalog-query-repository.port.ts>) | Required existing Staff implementation delta | Preserve identity, Branch, pricing, stock and navigation contracts |
| M | APPLICATION_SOURCE | C1 — Catalog presentation/query | [domains/catalog/query/presentation/CatalogPage.tsx](<../../../domains/catalog/query/presentation/CatalogPage.tsx>) | Required existing Staff implementation delta | Preserve identity, Branch, pricing, stock and navigation contracts |
| M | APPLICATION_SOURCE | C1 — Details / official theme | [domains/catalog/query/presentation/CatalogProductDetailsPage.tsx](<../../../domains/catalog/query/presentation/CatalogProductDetailsPage.tsx>) | CatalogShell replaces original shell; authorization flow preserved | P5 edits same render ending; no P5 dependency |
| M | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-active-filters.test.tsx](<../../../domains/catalog/query/presentation/catalog-active-filters.test.tsx>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| M | APPLICATION_SOURCE | C1 — Query state / DTO / localization | [domains/catalog/query/presentation/catalog-active-filters.ts](<../../../domains/catalog/query/presentation/catalog-active-filters.ts>) | Keep filter/search/context/cursor and disclosure contracts aligned | Must accompany Query and UI changes |
| M | APPLICATION_SOURCE | C1 — Catalog presentation/query | [domains/catalog/query/presentation/catalog-components.tsx](<../../../domains/catalog/query/presentation/catalog-components.tsx>) | Required existing Staff implementation delta | Preserve identity, Branch, pricing, stock and navigation contracts |
| M | APPLICATION_SOURCE | C1 — Query state / DTO / localization | [domains/catalog/query/presentation/catalog-presentation.i18n.ts](<../../../domains/catalog/query/presentation/catalog-presentation.i18n.ts>) | Keep filter/search/context/cursor and disclosure contracts aligned | Must accompany Query and UI changes |
| M | APPLICATION_SOURCE | C1 — Query state / DTO / localization | [domains/catalog/query/presentation/catalog-presentation.types.ts](<../../../domains/catalog/query/presentation/catalog-presentation.types.ts>) | Keep filter/search/context/cursor and disclosure contracts aligned | Must accompany Query and UI changes |
| M | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-query-api.client.test.ts](<../../../domains/catalog/query/presentation/catalog-query-api.client.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| M | APPLICATION_SOURCE | C1 — Query state / DTO / localization | [domains/catalog/query/presentation/catalog-query-api.client.ts](<../../../domains/catalog/query/presentation/catalog-query-api.client.ts>) | Keep filter/search/context/cursor and disclosure contracts aligned | Must accompany Query and UI changes |
| M | APPLICATION_SOURCE | C1 — Query state / DTO / localization | [domains/catalog/query/presentation/catalog-query-state.ts](<../../../domains/catalog/query/presentation/catalog-query-state.ts>) | Keep filter/search/context/cursor and disclosure contracts aligned | Must accompany Query and UI changes |
| M | APPLICATION_SOURCE | C1 — Shared presentation extension | [domains/identity/presentation/components/presentation-shell.tsx](<../../../domains/identity/presentation/components/presentation-shell.tsx>) | Optional brand/header-control slots with original defaults | Other surfaces must retain defaults; prior Operations check PASS |
| ?? | TECHNICAL_DOCUMENTATION | C2 — Portable usage/security runbook | [docs/05-Development/Tasks/QSC-Staff-Catalog-Portable-Specification-Configuration.md](<../../../docs/05-Development/Tasks/QSC-Staff-Catalog-Portable-Specification-Configuration.md>) | Dry Run, prerequisites, conflicts, tests and future approval | No operational CLI/install command is supplied |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/application/catalog-specification-presentation.use-cases.test.ts](<../../../domains/catalog/query/application/catalog-specification-presentation.use-cases.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/application/catalog-structured-search.test.ts](<../../../domains/catalog/query/application/catalog-structured-search.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/application/catalog-typed-filters.test.ts](<../../../domains/catalog/query/application/catalog-typed-filters.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | APPLICATION_SOURCE | C1 — Deterministic structured search | [domains/catalog/query/application/interpret-catalog-search.ts](<../../../domains/catalog/query/application/interpret-catalog-search.ts>) | Explicit mode and fully recognized configured criteria | No fuzzy fallback, dropped constraints or inferred values |
| ?? | AUTOMATED_TESTS | C2 — Focused regression tests | [domains/catalog/query/application/portable-specification-configuration.test.ts](<../../../domains/catalog/query/application/portable-specification-configuration.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | APPLICATION_SOURCE | C2 — Portable planning/application | [domains/catalog/query/application/portable-specification-configuration.use-case.ts](<../../../domains/catalog/query/application/portable-specification-configuration.use-case.ts>) | Dry Run default; isolated writer composition only | Per-operation transactions; unknown outcome stops; no runtime install |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/application/project-catalog-specifications.test.ts](<../../../domains/catalog/query/application/project-catalog-specifications.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | APPLICATION_SOURCE | C1 — Specification presentation | [domains/catalog/query/application/project-catalog-specifications.ts](<../../../domains/catalog/query/application/project-catalog-specifications.ts>) | Actual stored values, grouping, summaries and missing-field policy | Authorized history/zero/false and scoped configuration |
| ?? | APPLICATION_SOURCE | C1 — Typed filtering | [domains/catalog/query/domain/catalog-specification-filters.ts](<../../../domains/catalog/query/domain/catalog-specification-filters.ts>) | Existing private filter UI/domain bounds and semantics | Server allowlist/default-deny, type/unit and ProductType scope |
| ?? | APPLICATION_SOURCE | C1 — Specification presentation | [domains/catalog/query/domain/catalog-specification-presentation.ts](<../../../domains/catalog/query/domain/catalog-specification-presentation.ts>) | Actual stored values, grouping, summaries and missing-field policy | Authorized history/zero/false and scoped configuration |
| ?? | APPLICATION_SOURCE | C1 — Deterministic structured search | [domains/catalog/query/domain/catalog-structured-search.ts](<../../../domains/catalog/query/domain/catalog-structured-search.ts>) | Explicit mode and fully recognized configured criteria | No fuzzy fallback, dropped constraints or inferred values |
| ?? | PORTABLE_CONFIGURATION | C2 — Portable contracts | [domains/catalog/query/domain/portable-specification-configuration.ts](<../../../domains/catalog/query/domain/portable-specification-configuration.ts>) | Manifest types and canonical approved-state comparison | C2 depends on C1 profile/domain types |
| ?? | PORTABLE_CONFIGURATION | C2 — Portable approved manifest | [domains/catalog/query/domain/staff-specification-configuration.ts](<../../../domains/catalog/query/domain/staff-specification-configuration.ts>) | UUID-free desired definitions/bindings/presentation/search configuration | QA-labelled source codes/aliases need explicit target mapping review |
| ?? | PORTABLE_CONFIGURATION | C1 — Trusted runtime profile | [domains/catalog/query/infrastructure/catalog-specification-presentation-config.ts](<../../../domains/catalog/query/infrastructure/catalog-specification-presentation-config.ts>) | Existing scoped profile validation/parser | Default-deny and target ID/profile validation |
| ?? | AUTOMATED_TESTS | C2 — Focused regression tests | [domains/catalog/query/infrastructure/persistence/portable-specification-configuration.integration.test.ts](<../../../domains/catalog/query/infrastructure/persistence/portable-specification-configuration.integration.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | AUTOMATED_TESTS | C2 — In-memory test fixture | [domains/catalog/query/mock/portable-specification-fixture.ts](<../../../domains/catalog/query/mock/portable-specification-fixture.ts>) | Intentional synthetic automated-test source | Not Staff database contents or operational Identity authentication |
| ?? | THEME_IMPLEMENTATION | C1 — Official R3 theme | [domains/catalog/query/presentation/CatalogShell.tsx](<../../../domains/catalog/query/presentation/CatalogShell.tsx>) | Scoped SYSTEM/LIGHT/DARK, tokens and responsive Catalog/Details | All three files and shared-shell extension must ship together |
| ?? | THEME_IMPLEMENTATION | C1 — Official R3 theme | [domains/catalog/query/presentation/catalog-brand.css](<../../../domains/catalog/query/presentation/catalog-brand.css>) | Scoped SYSTEM/LIGHT/DARK, tokens and responsive Catalog/Details | All three files and shared-shell extension must ship together |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-specification-display.test.ts](<../../../domains/catalog/query/presentation/catalog-specification-display.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | APPLICATION_SOURCE | C1 — Specification presentation | [domains/catalog/query/presentation/catalog-specification-display.ts](<../../../domains/catalog/query/presentation/catalog-specification-display.ts>) | Actual stored values, grouping, summaries and missing-field policy | Authorized history/zero/false and scoped configuration |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-specifications.prerender.test.tsx](<../../../domains/catalog/query/presentation/catalog-specifications.prerender.test.tsx>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-theme.test.ts](<../../../domains/catalog/query/presentation/catalog-theme.test.ts>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | THEME_IMPLEMENTATION | C1 — Official R3 theme | [domains/catalog/query/presentation/catalog-theme.ts](<../../../domains/catalog/query/presentation/catalog-theme.ts>) | Scoped SYSTEM/LIGHT/DARK, tokens and responsive Catalog/Details | All three files and shared-shell extension must ship together |
| ?? | APPLICATION_SOURCE | C1 — Typed filtering | [domains/catalog/query/presentation/catalog-typed-filters.tsx](<../../../domains/catalog/query/presentation/catalog-typed-filters.tsx>) | Existing private filter UI/domain bounds and semantics | Server allowlist/default-deny, type/unit and ProductType scope |
| ?? | AUTOMATED_TESTS | C1 — Focused regression tests | [domains/catalog/query/presentation/catalog-uiux.test.tsx](<../../../domains/catalog/query/presentation/catalog-uiux.test.tsx>) | Ship with the feature/library they validate | Fixtures are isolated; no browser runtime or stored credentials |
| ?? | OFFICIAL_BRAND_ASSETS | C1 — Official branding | [public/brand/quadcore-logo.png](<../../../public/brand/quadcore-logo.png>) | Actual application runtime logo in public/brand | Exact original bytes; no Pictures/prototype runtime dependency |
| ?? | AUTOMATED_TESTS | C2 — Isolated PostgreSQL qualification | [scripts/catalog/verify-portable-specifications.ts](<../../../scripts/catalog/verify-portable-specifications.ts>) | Guarded disposable test runner; part of portable source verification | Docker/local image prerequisite; never operational apply |
| ?? | TECHNICAL_DOCUMENTATION | C2 — Delivery contract | [docs/05-Development/Reports/QSC-Staff-Catalog-Git-Delivery-Preparation-and-Whitespace-Fix.md](<../../../docs/05-Development/Reports/QSC-Staff-Catalog-Git-Delivery-Preparation-and-Whitespace-Fix.md>) | Current decisions, exact manifest, evidence and deferred gates | Review baseline/path metadata for intended PR audience |
| ?? | TECHNICAL_DOCUMENTATION | C2 — Portable implementation verification | [docs/05-Development/Reports/QSC-Staff-Catalog-Portable-Specification-Configuration-Implementation-and-Verification.md](<../../../docs/05-Development/Reports/QSC-Staff-Catalog-Portable-Specification-Configuration-Implementation-and-Verification.md>) | Required by the portable runbook; records source scope, isolated qualification and transaction limits | Review local evidence references/baseline metadata; no install or operational-acceptance claim |

## EXCLUDE — exact known repository files / الملفات المستبعدة

These 26 existing nonignored paths are preserved locally and excluded from all proposed commits. This is an explicit documentation selection, not a deletion or acceptance waiver.

| Status | Classification | Exact path | Exclusion reason | Risk/context |
|---|---|---|---|---|
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Final-Engineering-Handoff-Readiness.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Git-Readiness-and-Engineering-Handoff-Review.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Integration-and-Regression-Review.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Laptop-Presentation-Refinement-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Local-Readiness-and-Regression-Hardening-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Local-Runtime-and-Browser-Verification-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Modern-Visual-Design-Discovery-and-Theme-Assessment.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Modern-Visual-Design-Prototypes.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Official-Brand-Visual-Prototypes.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Official-Brand-Visual-Refresh-Implementation-and-Verification.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase1-Specifications-Presentation-Implementation-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase2-Typed-Filters-Compatibility-Gate-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase2-Typed-Filters-Implementation-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase3-Structured-Search-Implementation-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase4A-Visual-Audit-and-UX-Refinement-Plan.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase4B-Browser-Verification-Recovery-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Phase4B-UIUX-Implementation-and-Visual-Regression.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Reusable-Browser-QA-and-Phase4B-Verification.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Specification-Bindings-and-Implementation-Readiness.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Specification-Configuration-Completion-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Specifications-Filters-Structured-Search-Decision.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Unified-Discovery-Evidence-and-QA-Corrections-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | TECHNICAL_DOCUMENTATION | `docs/05-Development/Reports/QSC-Staff-Catalog-Windows-Local-Launcher-Report.md` | Preserve locally; current contract below retains essential decisions | Older proposals/status/counts and machine-local evidence links |
| ?? | LOCAL_LAUNCHER | `scripts/local/Start Staff Catalog.cmd` | Owner B excludes launcher source, test and CMD together | Machine-specific branch/container/Node/profile dependencies |
| ?? | LOCAL_LAUNCHER | `scripts/local/staff-launcher.test.ts` | Owner B excludes launcher source, test and CMD together | Machine-specific branch/container/Node/profile dependencies |
| ?? | LOCAL_LAUNCHER | `scripts/local/staff-launcher.ts` | Owner B excludes launcher source, test and CMD together | Machine-specific branch/container/Node/profile dependencies |

Further bounded exclusions, preserved locally:
- `artifacts/task-reviews/`: all generated screenshots, logs, ZIP/checksum/manifest/source-before evidence, private synthetic credentials/state, current presentation profiles, setup scripts and temporary QA artifacts. No blanket inclusion or force-add.
- `.env.local`, .next/, node_modules/, next-env.d.ts, tsconfig.tsbuildinfo and .serena/cache/: secrets/local build, dependencies, generated types and caches. Protected tool configurations remain outside the changed-file allowlist.
- `<local Browser QA installation>/`: entire existing isolated Browser QA runtime, package installation, runners and profiles; no copying or reinstalling.
- `<local review-export directory>/`: existing exported review ZIPs/checksums. Installed local shortcuts/runtime state are outside the repository payload.
- Existing Staff QA database contents/media storage, Docker/PostgreSQL volumes, disposable test database state, sessions/cookies, personal browser profiles, protected P5/P6 worktrees/evidence and unrelated services: no data transfer, snapshot publication, state change or integration.

The intentional in-memory portable test fixture and guarded disposable verifier are AUTOMATED_TESTS source, not the excluded installed browser runtime or Staff database contents.

## OPTIONAL_LOCAL_TOOLING / الأدوات المحلية

Owner B excludes all three scripts/local launcher paths, including their test, from this delivery. They remain available unchanged locally. The installed Edge/Playwright runtime is also excluded entirely. No launcher generalization, shortcut change, dependency movement, browser-baseline maintenance or replacement QA framework is part of this task.

The included scripts/catalog verifier is limited to already implemented disposable PostgreSQL qualification. It requires existing Docker and locally installed postgres:17-alpine, verifies its task-owned identity, uses synthetic test context and does not apply operational configuration. Its presence does not authorize running Docker or tests in this task.

## REVIEW_REQUIRED / الملفات والمناطق التي تتطلب مراجعة

| Exact file/region | Review needed | Effect |
|---|---|---|
| app/globals.css, appended Staff block after base line 413 | P5 EOF insertion and later cascade/global-body compatibility if branches meet | Prospective merge review; no P5 dependency or current independent-base conflict established |
| domains/catalog/query/presentation/CatalogProductDetailsPage.tsx imports / opening and closing JSX | Preserve CatalogShell/ProtectedPage and separately authorized P5 management component if later integrating | No trial merge; no permission or sharing-policy change |
| domains/identity/presentation/components/presentation-shell.tsx optional slot props | Original defaults for other surfaces | Prior actual Operations check applies; no new shared behavior |
| domains/catalog/query/domain/staff-specification-configuration.ts | Approved source codes/aliases versus actual target mapping and profile state | Target-installation decision; no operational creation from Git commit alone |
| scripts/catalog/verify-portable-specifications.ts | Disposable resource guard and ephemeral credential handling | Included test tool only; no operational apply |
| This new report / portable runbook | Confirm narrow documentation scope and suitability of baseline/path metadata for intended PR audience | No historical report sweep or generated-image publication |

## Security and architecture checks / فحوص الأمن والمعمارية

The initial narrow candidate scan covered 46 text files and one original PNG; final validation covers all 48 text files in the 49-file manifest; targeted secret-pattern inspection found no private key, token or credential-bearing URL. The one quoted-credential-pattern match in the disposable verifier is the POSTGRES_PASSWORD key concatenated with randomBytes-generated test material, not a stored password. New documentation receives the same targeted pattern review. No real .env/credential/session values were printed.

Existing prior inspection resolved 118 changed-source relative imports; no dependency changed here. The delivered Query still uses existing Identity authority, Workspace/Branch scoping, pricing/availability permissions, filterability default-deny and structured validation. The unchanged native media and repository contracts remain. No new unrestricted internal disclosure, public API, Additional Notes, schema, architecture, dependency or serving-composition change was introduced. This is a bounded delivery check, not a complete security certification.

الحمولة تستبعد الأسرار وبيانات العملاء وقواعد QA والمشاركة العامة غير المعتمدة. بقيت حدود DDD وClean Architecture والعزل والصلاحيات دون تغيير، والتصحيح لا يغيّر السلوك.

## Reused verification / الأدلة المعاد استخدامها

| Evidence | Status and scope |
|---|---|
| Whitespace-only change | PASS — tracked diff check and byte-identical compiled JavaScript; no behavioral tests required |
| Untracked delivery text | PASS — 29 untracked text files, including the portable implementation report and this report; no further whitespace violations |
| Latest brand refresh | Reused PASS: 132 focused tests, TypeScript, zero-warning focused ESLint, production build |
| Actual browser | Reused PASS: 16 resolved EN/AR/viewport/Light/Dark cells, SYSTEM behavior, drawer/focus/typed OR/AND, Details/Back, 8 actual images |
| Portable configuration | Reused PASS: final 26 unit tests, 9 real PostgreSQL scenarios (10 Node tests including parent), TypeScript/ESLint |
| Earlier integration | Reused scoped 3 combined browser cases and 5 negative HTTP checks; no additive/fresh-suite claim |
| DDR4 actual authorized browser specimen | NOT RUN/open — earlier deterministic formatting evidence does not close it |
| Owner visual/manual, physical touch, screen-reader | Deferred / not newly executed |
| Hosted CI, current remote/protection status, target installation, production qualification | NOT VERIFIED |

Existing archives remain historical exact-source/evidence records. Their old catalog-components.tsx copy retains the six spaces intentionally; the new byte/compiled-output proof accounts for that sole source difference. No historical evidence was overwritten or regenerated. No 132-test rerun, integration/database test, browser matrix, service restart, runtime change or load profile was run.

## BLOCKERS and owner decisions / الموانع وقرارات المالك

Preparation is complete for owner approval; technical whitespace blocker is resolved. Actual staging/delivery remains blocked by:
1. No authorization to stage, commit, push or create the PR in this task.
2. Owner confirmation of the recommended independent target and exact 49-file/2-commit allowlist.
3. Separately authorized fresh remote/protection/required-CI verification before executing delivery; cached refs are not current hosted evidence.
4. Required exact-payload secret/privacy/diff review at actual delivery. No full security or CI certification follows from this scoped preparation.

Target installation, final operational acceptance, DDR4 specimen and manual/touch gates remain separate and are not waived by approving source delivery. P5 PR #65/P6 acceptance gates remain protected.

Smallest safe next action: approve the independent PR target recommendation and exact two-commit manifest, then explicitly authorize only the desired remote verification and Git delivery steps. No additional feature implementation, configuration application or broad test rerun is needed merely to make that decision.

الخطوة الأدنى هي اعتماد الهدف وقائمة 49 ملفاً ومجموعتي الالتزام، ثم تفويض التحقق البعيد وعمليات Git المطلوبة صراحة. لا يشمل ذلك دمجاً أو نشراً أو تطبيق تهيئة أو إسقاط بوابات القبول.

## Preservation and files / الحفظ والملفات

All 73 preexisting files outside the authorized component were rehashed unchanged. The component was proven to differ by exactly the six spaces. Branch, HEAD, upstream, index and Serena hashes remain unchanged; only this report adds a new untracked status entry. Existing external QA/prototype/archive evidence remains preserved.

Read-only protected fingerprints were captured and compared without modifying worktrees: P5 is clean at its existing HEAD; P6 retains 79 nonignored changed files with identical status/content/index fingerprints. This verifies Git/nonignored-file preservation, not a fresh certification of protected databases or ignored pending-state contents. No DB, admission, Docker, service or recovery operation occurred.

Files Created: this new report only.
Files Modified: [domains/catalog/query/presentation/catalog-components.tsx](<../../../domains/catalog/query/presentation/catalog-components.tsx>) — six spaces removed.
Files Deleted: none.
Architecture Changes: none.

No new review ZIP was generated because this task permits only the exact whitespace correction and new delivery-preparation documentation. Existing verified archives and all excluded files remain local.

**STAFF_GIT_DELIVERY_PREPARED_FOR_OWNER_APPROVAL.**
**P6_ENGINEERING_CANDIDATE — Acceptance HOLD.**
Stop after owner review / التوقف بعد تسليم التقرير.
