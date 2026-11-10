# QSC Staff Catalog — Portable Specification Configuration Implementation & Verification
# كتالوج الموظفين — تنفيذ التهيئة القابلة للنقل والتحقق منها

Date / التاريخ: 2026-11-03 — Asia/Aden
**PORTABLE_SPEC_CONFIG_READY_FOR_GIT_HANDOFF_REVIEW**
**P6_ENGINEERING_CANDIDATE — Acceptance HOLD — unchanged / دون تغيير**

## 1. Result and scope / النتيجة والنطاق

Implemented a UUID-free approved manifest, explicit scoped target resolution, genuinely read-only default planning, conflict detection, and isolated-test-only application over existing authorized Reference Data use cases.
No operational apply command, HTTP endpoint, startup hook or profile installation was introduced. This is readiness for review of the bounded portability mechanism, not approval to apply configuration, create a PR, integrate, or deploy.
نُفذ البيان والمعاينة وكشف التعارض والتطبيق المعزول للاختبار. لم تُطبق التهيئة على Staff QA أو أي بيئة مشتركة، ولا يُعد هذا اعتماداً إنتاجياً أو إزالةً لجميع موانع تسليم Staff.

## 2. Verified baseline / خط الأساس

- Worktree: `<Staff Catalog worktree root>`.
- Branch: codex/staff-catalog-local-qa; HEAD25e50dadc8097a8f1663253917847487e17bd497; no upstream.
- Initial status:17 modified tracked,36 untracked,0 staged. All preexisting file bytes, tracked-change set, index, Serena configuration and local runtime profile preserved.
- Final expected status after this report:17 modified tracked,45 untracked,0 staged; nine new deliverable files.
- Existing LF/CRLF warnings and catalog-components.tsx:104 trailing whitespace remain preexisting; not changed to force a clean gate.
تم التحقق من الحالة الفعلية وحفظ جميع التعديلات السابقة. لم تُغير الفروع أو الفهرس أو الإعدادات المحمية.

## 3. Architecture discovery / اكتشاف الآليات والمعمارية

Existing GetCatalogReferenceDataUseCase supplies the scoped administrative snapshot. CreateSpecificationDefinitionUseCase enforces manage authorization, validation, scoped code uniqueness and audit. ConfigureProductTypeSpecificationTemplateUseCase enforces scoped active references, template locking, expectedVersion and transactional audit. PostgreSqlCatalogReferenceDataUnitOfWork preserves existing transaction/unique-conflict handling.
The new Application orchestration invokes these use cases; it has no SQL, repository-to-repository calls, new aggregate or altered Product responsibilities. Existing profile type/parser and runtime format are reused. No existing serving composition, rendering, filters, search algorithms, authentication, schema, migration, package or dependency file changed.
Serena resolved Staff Reference Data symbols; bounded direct source/SQL inspection sufficed. No Graphify reindex or protected tool-config edits.
المنفذ يستخدم حدود Application الحالية، ولا يضيف نظام مواصفات موازياً أو وصول SQL يتجاوز النطاق. لم يلزم تغيير معماري جوهري.

## 4. Exact files / الملفات الدقيقة

Files Created — deliverable source/documentation:

1. domains/catalog/query/domain/portable-specification-configuration.ts — types, canonical approved comparison, immutable configuration helper.
2. domains/catalog/query/domain/staff-specification-configuration.ts — approved code-based manifest and exact revision validation.
3. domains/catalog/query/application/portable-specification-configuration.use-case.ts — planner and uncomposed isolated write orchestration.
4. domains/catalog/query/application/portable-specification-configuration.test.ts —26 focused unit cases.
5. domains/catalog/query/mock/portable-specification-fixture.ts — synthetic in-memory fixtures only.
6. domains/catalog/query/infrastructure/persistence/portable-specification-configuration.integration.test.ts — guarded real PostgreSQL qualification.
7. scripts/catalog/verify-portable-specifications.ts — dedicated disposable-container verification runner.
8. docs/05-Development/Tasks/QSC-Staff-Catalog-Portable-Specification-Configuration.md — bilingual usage/security/portability runbook.
9. This report: docs/05-Development/Reports/QSC-Staff-Catalog-Portable-Specification-Configuration-Implementation-and-Verification.md.

New ignored task evidence: artifacts/task-reviews/staff-portable-spec-config-20261103-1793678179964/.
Files Modified: no preexisting files; only new files refined during this task.
Files Deleted: none. Architecture Changes: none.
لا تعديل للمشغّل أو Browser QA أو التطبيق القائم أو P5/P6، ولا حذف أو مكتبات جديدة.

## 5. Manifest and resolution / البيان وحل المعرفات

The shipped approved revision records six existing ProductType profiles,17 definition descriptions and26 template links. Database IDs are resolved per target, not embedded in shared source. Existing bilingual labels, groups/card priorities, composition settings, filterability and search aliases are preserved; omitted pair separators are made explicit as the existing parser's default space, without changing behavior.
Only five previously approved definitions and their optional internal Laptop links may be created:
cpu-generation Number/unitless; ram-ddr-type Text/unitless; storage-technology Text/unitless; gpu-memory Number/GB; operating-system Text/unitless.
The other12 definitions,21 bindings and all six active ProductTypes/active hierarchy paths are required existing configuration. Their absence blocks; it does not authorize inventing or creating a business taxonomy.

Workspace identity must be explicitly selected and equal the existing Identity-resolved trusted context. Existing read/manage permission checks remain authoritative. Codes are Workspace-scoped; labels are consistency checks, not identifiers.
Explicit one-to-one ProductType code mappings and mappings for the12 required existing definition codes support environments with different authoritative codes. Unknown/ambiguous mappings reject. The five create-approved codes cannot be renamed through a mapping.
البيان لا ينسخ UUID أو منتجات أو أسعاراً أو بيانات حسابات. أسماء QA في الأكواد ليست تصنيفاً عالمياً؛ الربط المستهدف يحتاج مراجعة صريحة. خرائط نصوص البحث الموروثة بما فيها بعض تسميات QA بقيت دون إضافة؛ ليست بيانات منتجات أو إثبات وجود قيم مقابلة في بيئة جديدة.

## 6. Dry Run and conflicts / المعاينة والتعارضات

Dry Run is default even when the test writer exists. It calls only the existing read service. Unit tests prove zero writer calls; real PostgreSQL tests prove unchanged configuration and audit hashes.
Each row provides record type, Workspace/ProductType scope, stable identity, current/desired state, action, reason and conflict flag.
Classifications: EXISTS_MATCHING, MISSING, CONFLICT, UNRESOLVED_DEPENDENCY, NOT_AUTHORIZED. MISSING distinguishes approved CREATE/BIND, candidate-only EMIT_PROFILE and blocked required dependencies.
Missing target, foreign Workspace, unavailable/unauthorized read, duplicate scoped identity, missing/inactive parent, incompatible definition type/unit/label/order/status, template required/visibility/order conflicts and incompatible runtime profiles block writes. No destructive reconciliation or overwrite.
currentProfiles undefined means unknown and blocks; [] means explicitly confirmed absence. Current filterability/search/presentation differences are conflicts, not instructions to replace them.
لا تعتمد المعاينة على rollback، ولا تُسقط شروطاً مجهولة. تعديل alias أو نوع أو وحدة أو تعريف خارج البيان المعتمد يُرفض.

## 7. Apply, idempotency and transaction limits / التطبيق والإديمبوتنسية وحدود المعاملات

Operational apply is disabled by default. Only the isolated integration harness supplies existing write use cases; no server, CLI operational path or launcher wires them.
First isolated application creates five definitions and updates one Laptop template to add five links. Existing IDs and entries are retained.
Second application makes zero duplicate records, version bumps, writes or audit events.
Scoped unique constraints conservatively reject the losing concurrent create. Existing template lock/expectedVersion prevents lost updates. No retries are hidden.
Each existing use case retains its own transaction, not one batch transaction. Audit failure rolls back that operation. A later failure retains earlier committed configuration/audit and reports completed steps. Unknown persistence outcomes stop as STOPPED_REPLAN_REQUIRED; no assumed rollback or automatic reconciliation.
PREPARED_NOT_INSTALLED means database configuration was verified and candidate profiles emitted; runtime profile installation never occurs here.
التطبيق خارج الاختبار المعزول معطّل. لا ضمان لذرّية الدفعة أو تثبيت تهيئة التشغيل؛ أي طلب لتلك الضمانات يحتاج قراراً معمارياً منفصلاً. لا علاقة لذلك باسترداد P6 المحمي.

## 8. Isolated PostgreSQL / PostgreSQL المعزول

Used the existing locally installed PostgreSQL17-alpine image; no downloads or packages installed.
Each invocation created a new uniquely named container with loopback-only dynamic port,1CPU/512MiB and task-owned tmpfs; no shared mounts/volumes. Random disposable password stayed in process/container memory and was not saved or printed.
Final isolated run: a uniquely named task-owned PostgreSQL container and database on a dynamically assigned loopback port. Exact ephemeral resource identifiers are retained in local qualification evidence.
Existing migrations were replayed only in disposable targets; no new migration. Synthetic test contexts/fixture hierarchy follow existing integration conventions and do not authenticate operational requests. Configuration writes use application services.
Both successful task-created containers were ownership-verified and removed. PostgreSQL concurrency used two independent pools/connections; separate OS-process qualification is NOT claimed.
استُخدمت بنية مؤقتة منفصلة دون لمس أي قاعدة أو حجم قائم. فحص الحذف اقتصر على هوية المورد الذي أنشأته المهمة.

## 9. Verification results / نتائج التحقق

| Check / الفحص | Result / النتيجة |
|---|---|
| Manifest validation, default read-only behavior, conflicts, explicit target/mappings, unknown runtime state, filter default deny, profile preservation, failure stop | PASS26 unique unit tests |
| Real PostgreSQL | PASS9 qualification scenarios; Node reports10 tests including parent |
| Dry Run actual DB/audit integrity | PASS; unchanged hashes |
| First/repeated application | PASS;5 definitions/5 links then0 extra changes/audits |
| Tenant/authorization/conflict negatives | PASS; unrelated Workspace snapshot/audit unchanged |
| Definition race, two independent pools | PASS; one conservative loser,17 unique scoped definitions,6 expected audit events total |
| Template race | PASS; one update and one expected audit; no lost bindings |
| Audit rollback/later committed-step preservation | PASS |
| Existing runtime parser compatibility and filter allowlist | PASS; six generated profiles; enabled counts1/3/3/3/8/3; zero/false/historical/search rendering logic untouched |
| TypeScript | PASS: tsc --noEmit --incremental false |
| Focused ESLint | PASS: seven new TS files, --max-warnings0 |
| Protected Staff DB preservation | PASS; read-only transaction,9 table hashes equal prior verified state |
| New browser tests | NOT RUN; no UI/serving behavior changed; prior genuine browser evidence retained |
| New production build | NOT RUN; no existing serving import/composition/package/build configuration changed; new library is not wired into runtime; full TS check includes it; live build not overwritten |
| Full unrelated suites, load, hosted CI, production | NOT RUN; no readiness claim |

Final commands and exits: quality-final/results.json. Isolated logs: postgres-final/integration.log, execution.json, identity.json, cleanup.json. Successful reruns are not double-counted.
Historical new-test failures remain recorded: initial Date-comparison test error; runtime default-space comparison issue; stale test reference/duplicate generated property; test-only generic/union annotation errors and unused-variable warnings. All were corrected within newly created files; final checks above pass. No unrelated source fix was made.
تُفصل نجاحات الاختبارات عن المتصفح والقبول والإنتاج. لا تعويض عن عينة DDR4 أو اللمس الفعلي أو القبول اليدوي؛ تبقى الحالات السابقة مفتوحة.

## 10. Preservation, security and evidence / الحفظ والأمان والأدلة

Protected Staff connection used only BEGIN ... READ ONLY and ROLLBACK with default_transaction_read_only=on. Nine Catalog/reference/media/pricing/inventory table hashes matched the previous integration evidence. No Staff configuration, fixture, account, product, pricing, media or authorization writes.
The existing Staff runtime and unrelated local services remained unchanged. No runtime/launcher/service restart or P5/P6/original-worktree/pending-state operation was performed.
No new public endpoint, authentication bypass, Additional Notes, security-policy change, schema/dependency change or production exposure.
Source and chosen evidence receive focused secret checks; source is archived exact, evidence only is sanitized. No environment file, credential, product/database dump, session/cookie, personal browser profile or protected P6 evidence belongs in the archive.
الفهرس والملفات السابقة والإعدادات المحلية محفوظة؛ الحزمة لا تمنح صلاحية تطبيق أو نشر.

## 11. Handoff implications and remaining decisions / التسليم والقرارات الباقية

This mechanism closes the code/test portability gap for the approved configuration; it does not automatically prepare an arbitrary blank environment.
Before actual target application, owner must approve the target/database/Workspace, existing business taxonomy and explicit code mappings, actual trusted current profiles and a bounded authorized operational write composition/installation procedure. Read the Dry Run, resolve conflicts and re-read current state before any future install.
Live operational apply and runtime installation remain intentionally disabled, not silently approved by unit/database success.
The broader Staff Git handoff still needs target/merge-strategy and Git-write authorization, exact payload review, outstanding DDR4/browser/manual acceptance governance and existing whitespace handling. Additional Notes remains separately blocked. No integration target chosen.
Smallest next action: review this implementation and approved manifest/mapping boundaries, then select an explicitly authorized target and delivery plan. Do not restart Phases1–4 or enable apply automatically.
الخطوة الأدنى مراجعة التنفيذ والبيان وحدود الربط أولاً، ثم تفويض مستهدف مستقل. لا commit أو push أو merge أو نشر في هذه المهمة.

## 12. Documentation and review package / التوثيق وحزمة المراجعة

Actual unit/type/isolated-run commands, API usage, prerequisites, conflict interpretation, security restrictions, failure behavior and future approval are in:
docs/05-Development/Tasks/QSC-Staff-Catalog-Portable-Specification-Configuration.md.

Repository archive:
artifacts/task-reviews/staff-portable-spec-config-20261103-1793678179964/QSC-Staff-Portable-Spec-Config-1793678179964.zip
Export:
`<local review-export directory>/QSC-Staff-Portable-Spec-Config-1793678179964.zip`
Manifest covers every payload except itself; detached SHA-256 and archive-verification.json record verified integrity/export identity. Exact nine new deliverable files are the source allowlist; generated evidence remains ignored. Existing review helpers are reused without rerunning the broad default bundle-command matrix. This scoped package is not evidence that unrun repository/CI gates passed.
No staging, commit, push, rebase, merge, deployment or P7 work.
حُفظت الأدلة السابقة دون استبدال؛ تُتحقق بصمات الحزمة والنسخة المصدّرة قبل التسليم.

**Final / نهائي: PORTABLE_SPEC_CONFIG_READY_FOR_GIT_HANDOFF_REVIEW.**
**P6_ENGINEERING_CANDIDATE — Acceptance HOLD. Stop for review / التوقف للمراجعة.**
