# Task 3.23-P2 — Implementation Candidate / مرشح التنفيذ

P2ImplementationStatus: IMPLEMENTATION_CANDIDATE; independent implementation review, manual browser QA and release acceptance remain outstanding. P2 is not COMPLETE.
Baseline: `1c5e19c` — merge PR #58, accepted P2 planning/status reconciliation.
Branch: `feature/task-3.23-p2-visibility-transport`

DomainVisibilityContract: IMPLEMENTED; required readonly canonical `publicVisibility`, reusing the P1 exact `internal | public` type and strict validator.
ConfigureInputCompatibility: VERIFIED; optional only at configure input, strict four-key entry parsing, explicit malformed values rejected, omitted required remains false.
OmissionPreservation: VERIFIED; Application preserves retained Definition-ID visibility from the locked persisted template, defaults new IDs to internal, and validates version before mutation/audit.
LockedRead: VERIFIED; scoped header FOR UPDATE followed by scoped canonical entries in the same UoW transaction; final CAS retained.
Schema: VERIFIED; only `catalog_specification_template_entries.public_visibility` and its allowed-value CHECK added. Snapshot comparison confirms existing keys/schema unchanged.
Migration: VERIFIED; one generated migration, populated upgrade and clean guarded database migration both executed. No production database touched.
MigrationFiles: `drizzle/0016_specification_template_public_visibility.sql`, `drizzle/meta/0016_snapshot.json`, `drizzle/meta/_journal.json`.
PersistenceRoundTrip: VERIFIED; snapshot, locked read, writes and configure result carry strict canonical visibility without a read fallback.
AuditContract: VERIFIED; existing event/metadata retained, deterministic Definition-ID-sorted transition JSON and exact public counts added; audit failure rolls back entries/version; conflicts produce no success audit.
HTTPContract: VERIFIED; existing authenticated GET/PUT routes, Success envelope, trusted Workspace, permission/origin/error mappings preserved; explicit malformed expectedVersion rejected.
BrowserTransport: VERIFIED; canonical GET/PUT missing/invalid visibility fails closed as Unavailable; writes serialize explicit visibility.
EditorVisibilityControl: IMPLEMENTED; native labeled Internal-first select in the existing editor, explicit internal for new entries, exact loaded/saved values, localized read-only text.
ConflictRecovery: AUTOMATED LOGIC PASS; draft retained, fresh canonical reload, every retained visibility difference requires Use Latest or Keep Draft, partial/generic review cannot unlock Save, reviewed version used, later conflict restarts recovery.
Authorization: VERIFIED; existing `catalog.referenceData.manage` and read/includeInactive behavior preserved; no new permission or Branch policy.
MultiTenant: VERIFIED; trusted context authority and scoped Product Type/template/entries/Definitions preserved; two Product Types can independently use the same Definition visibility.
AccessibilityRTLResponsive: SOURCE CONTRACTS PASS; English/Arabic labels/help, stable identity-derived IDs, explicit hint binding, native controls, scoped mobile stacking/desktop reflow, wrapping and 44px conflict actions. Browser interaction/layout acceptance NOT EXECUTED.

FocusedTests: PASS — 114/114 tests across the seven focused paths listed below; new Application/conflict suites account for 35/35 of these.
ReferenceDataRegression: PASS — 117/117.
ProductEntryRegression: PASS — 151/151.
DirectShareRegression: PASS — 41/41.
FullUnitSuite: PASS — 1,135 tests, 1,134 passed, zero failed, one existing Windows platform skip.
PostgreSQLIntegration: PASS — full suite 146/146; targeted Reference Data suite 13/13 after final concurrency-fixture adjustments.
MigrationUpgradeTest: PASS — actual migration over populated pre-P2 rows; internal backfill/default, invalid/null rejection.
MigrationCleanTest: PASS — actual migrations into a new guarded test database; NOT NULL/default/CHECK, PK/FKs/order constraints retained.
TypeScript: PASS — `npx.cmd tsc --noEmit --incremental false` and integration compilation.
Lint: PASS — `npm.cmd run lint`.
Build: PASS — `npm.cmd run build`.
DbCheck: PASS — `npm.cmd run db:check`.
GitDiffCheck: PASS — `git diff --check`.
Utf8Check: PASS — strict UTF-8 decoding and no replacement characters in changed files.
LocalLinksCheck: PASS — report relative file links resolve locally.

ManualBrowserQARequired: YES; NOT EXECUTED. Verify keyboard, mouse, touch, focus, both locales/RTL, read-only behavior, conflict decisions, repeated 409, 320px/375px/tablet/desktop, zoom and long Arabic content.
DeploymentMechanismStatus: RELEASE ACCEPTANCE BLOCKED; repository evidence does not establish mechanism A (single-instance/controlled maintenance-write window) or B (all compatible writers deployed before editor availability). No deployment performed. After public values exist, ordinary rollback to legacy three-field replacement writers is forbidden.

FilesModified: 21 existing task files, listed below; five files created. The pre-existing `.serena/project.yml` modification is excluded from task changes.
AdditionalFilesOutsidePlannedMap: `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data-unit-of-work.ts`; real concurrent-create verification reproduced Drizzle wrapping SQLSTATE 23505 in `DrizzleQueryError.cause`. Unwrapping that known wrapper is necessary to preserve the existing safe Conflict mapping. No retry or new architecture was introduced. The mandatory report is also new documentation.
ArchitectureChanges: NONE.
DependenciesAdded: NONE.
P3ToP7WorkPerformed: NO; GATED / NOT STARTED.
SerenaProjectYmlTouched: NO; initial/final SHA-256 `3EFC30BE05FDF94FBFC3D9BDD3E4FE7FB122D465903CA2F89027B509B4ECB998` unchanged.
GitStatus: Unstaged task changes only: 21 modified existing files and five untracked new files; plus intentional pre-existing `.serena/project.yml`. Nothing staged, committed, pushed, merged, stashed or switched. Exact status is collected in the review bundle.
KnownIssues: No failing automated check observed. Static Presentation tests do not prove functional browser acceptance; deployment mechanism is unproven. Optional dependency audits are omitted from the bundle because no dependency changed and network audits are outside this P2 acceptance scope.
RemainingAcceptanceWork: Independent implementation review, manual browser QA and proof of deployment mechanism A or B. Keep Task 3.23 IN PROGRESS and P3-P7 gated. Stop before staging/commit.

## Files Created / الملفات المنشأة

- `domains/catalog/reference-data/application/catalog-reference-template-visibility.test.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-template-conflict.test.ts`
- `drizzle/0016_specification_template_public_visibility.sql`
- `drizzle/meta/0016_snapshot.json`
- `docs/05-Development/Reports/QSC-Task-3.23-P2-Implementation-Candidate-Report.md`

## Files Modified / الملفات المعدلة

- `app/globals.css`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `domains/catalog/reference-data/application/catalog-reference-data-template.types.ts`
- `domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts`
- `domains/catalog/reference-data/domain/catalog-reference-data.ts`
- `domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.test.ts`
- `domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.ts`
- `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data-unit-of-work.ts`
- `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.ts`
- `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts`
- `domains/catalog/reference-data/ports/catalog-reference-data-unit-of-work.port.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.test.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.test.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.i18n.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.presentation.test.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.types.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-template-manager.tsx`
- `domains/catalog/sharing/application/public-product-share-contracts.test.ts`
- `drizzle/meta/_journal.json`

## Files Deleted / الملفات المحذوفة

NONE / لا يوجد.

## Architecture Changes / تغييرات المعمارية

NONE. Existing Domain/Application/UoW/PostgreSQL/HTTP/Presentation boundaries remain. Application owns omission policy; repositories do not call other repositories. Product Entry storage, ADR-013 and roadmap/planning status documents were not modified. Dependency graph updated with AST-only Graphify; no tracked graph artifacts changed.

لا توجد تغييرات معمارية. بقيت الحدود الحالية، وتملك طبقة التطبيق سياسة الحفاظ على الرؤية عند إغفالها. لم يتغير تخزين إدخال المنتج أو ADR-013 أو وثائق حالة التخطيط وخارطة الطريق، ولم يبدأ أي عمل من P3 إلى P7.

## Summary / الملخص

P2 visibility now flows from canonical Domain state through strict configure input, transactional locked omission preservation, persistence/migration, audit, authenticated transport and the existing bilingual editor. Explicit per-Definition conflict decisions protect against silent visibility overwrite. Automated verification passed; this remains an implementation candidate.

أصبحت الرؤية تمر من حالة المجال الإلزامية عبر إدخال مضبوط وقفل داخل المعاملة وحفظ الرؤية عند إغفالها والتخزين والترحيل والتدقيق والنقل المصادق عليه والمحرر الحالي باللغتين. تمنع القرارات الصريحة لكل مواصفة الاستبدال الصامت للرؤية عند التعارض. نجح التحقق الآلي، وتبقى النتيجة مرشح تنفيذ يحتاج إلى مراجعة مستقلة وفحص المتصفح واعتماد الإصدار.

## Verification Commands / أوامر التحقق

```text
npx.cmd tsx --test domains/catalog/reference-data/application/catalog-reference-template-visibility.test.ts domains/catalog/reference-data/presentation/catalog-reference-template-conflict.test.ts domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.test.ts domains/catalog/reference-data/presentation/catalog-reference-data-management.client.test.ts domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.test.ts domains/catalog/reference-data/presentation/catalog-reference-data-management.presentation.test.ts domains/catalog/sharing/application/public-product-share-contracts.test.ts
npm.cmd run test:reference-data
npm.cmd run test:product-entry
npm.cmd run test:direct-sharing
npx.cmd tsc --project tsconfig.integration.json
node --test --test-concurrency=1 .next/integration-tests/domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.js
npm.cmd test
npm.cmd run test:integration
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
npm.cmd run db:check
git diff --check
graphify update .
```

The migration tip was checked before generation. The final descriptive migration was generated with the existing Drizzle tooling using an ignored temporary output config pointing to the actual schema:

```text
npm.cmd run db:generate -- --config=artifacts/task-reviews/Task-3.23-P2/migration-generation/generation.config.ts --name=specification_template_public_visibility
```

The final journal retains the original generation timestamp for the same SQL already applied to the guarded test database, confirmed by byte/hash equality. Only one SQL migration and its normal journal/snapshot metadata are submitted as task files. Guarded clean/upgrade fixtures create and drop only invocation-owned test databases; existing production databases and migration history are untouched.

## Review Artifacts / ملفات المراجعة

This report records checks executed before bundling. The automated bundle reruns every mandatory configured check, captures exact changed sources and final Git evidence, and records its result in `manifest.json`; bundle success must be confirmed separately after generation. Optional `audit-runtime`/`audit-full` skips are explicitly recorded.

يسجل هذا التقرير التحققات المنفذة قبل إنشاء الحزمة. تعيد الحزمة التحققات الإلزامية، وتحفظ ملفات المصدر مطابقة بايتًا وأدلة Git النهائية، وتسجل نتيجتها في البيان. يجب تأكيد نجاح إنشاء الحزمة بعد التشغيل.

- Repository report: [QSC-Task-3.23-P2-Implementation-Candidate-Report.md](QSC-Task-3.23-P2-Implementation-Candidate-Report.md).
- Repository ZIP directory: `C:\Users\dell\quadcore-smart-catalog\artifacts\task-reviews`; the tool publishes the ZIP beside its evidence directory, with a collision-safe `QSC-Task-3.23-P2-Review` filename. The final handoff records the emitted path.
- Exported report/ZIP directory: `C:\Users\dell\Desktop\QSC-Reviews`; the tool selects one collision-safe report/ZIP/checksum set. The final handoff records the emitted paths.
- Detached SHA-256 sidecars are generated by the review tool. Historical artifacts must not be overwritten.

```text
npm.cmd run review:bundle -- --task=3.23-P2 --report=docs/05-Development/Reports/QSC-Task-3.23-P2-Implementation-Candidate-Report.md --output=artifacts/task-reviews/3.23-P2-final --base-ref=1c5e19c --skip-command=audit-runtime --skip-command=audit-full
```

## Next Recommendation / التوصية التالية

Review the P2 implementation candidate and evidence, complete manual browser QA, and prove release mechanism A or B before release acceptance. Do not mark P2 COMPLETE, begin P3, stage or commit as part of this task.

راجع مرشح تنفيذ P2 وأدلته، وأكمل فحص المتصفح اليدوي، وأثبت آلية الإصدار A أو B قبل اعتماد الإصدار. لا تسجل P2 كمكتمل، ولا تبدأ P3، ولا تجهز الملفات للإيداع أو تنشئ إيداعًا ضمن هذه المهمة.
