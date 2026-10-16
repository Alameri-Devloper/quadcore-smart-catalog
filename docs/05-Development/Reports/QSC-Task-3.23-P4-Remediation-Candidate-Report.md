# Task 3.23 P4 — Remediation Candidate Report | تقرير مرشح المعالجة

## Current status addendum — 2026-10-15 | ملحق الحالة الحالية — 2026-10-15

F1–F6 remediation is completed. Independent re-review is **PASS under reconstructed fallback criteria**. The original standalone review remains unavailable and was not examined; independent probe evidence supports the fallback assessment and does not establish verification against an unavailable original criteria set. The current **P4 Final Approval remains HOLD** until dedicated P4 PostgreSQL/concurrency CI coverage is implemented and verified, or the project owner explicitly accepts the coverage gap. This documentation reconciliation and CI recommendation do not authorize staging, commit, push, PR creation or merge. P4 remains **UNMERGED / NOT COMPLETE**; P5–P7 remain **GATED / NOT STARTED**; DurableCoverage remains **UNCHECKED**.

اكتملت معالجة F1–F6، ونتيجة إعادة المراجعة المستقلة **PASS وفق معايير بديلة أُعيد بناؤها**. ما زال تقرير المراجعة الأصلي المستقل غير متاح ولم يُفحص؛ تدعم أدلة الاختبارات المستقلة التقييم البديل ولا تثبت المطابقة لمعايير أصلية غير متاحة. يبقى **الاعتماد النهائي لـ P4 على HOLD** حتى إضافة تغطية PostgreSQL/التزامن المخصصة إلى CI والتحقق منها، أو قبول مالك المشروع فجوة التغطية صراحةً. لا تمنح تسوية التوثيق وتوصية CI إذنًا بالتهيئة أو الالتزام أو الدفع أو إنشاء PR أو الدمج. تبقى P4 **غير مدمجة / غير مكتملة**، وP5–P7 **مشروطة / لم تبدأ**، وDurableCoverage **UNCHECKED**.

Chronology is preserved: initial implementation candidate → independent review HOLD → remediation with local passing evidence → independent fallback re-review PASS → final technical approval HOLD → this documentation reconciliation and CI recommendation only. All status statements and test counts beneath the historical-snapshot heading are evidence from their original review stage. This addendum supersedes their current-status implications without rewriting their findings, and makes no claim that additional implementation tests were run for this addendum. The [current roadmap](../../06-Roadmap/Current-Roadmap.md) and [P4 plan](../../06-Roadmap/Task-3.23-P4-Grant-Persistence-and-Lifecycle-Planning.md) carry the durable current status. ADR-013 decisions and implementation remain unchanged.

حُفظ التسلسل: مرشح التنفيذ الأولي ← المراجعة المستقلة HOLD ← المعالجة بأدلة محلية ناجحة ← إعادة المراجعة المستقلة البديلة PASS ← الاعتماد التقني النهائي HOLD ← تسوية التوثيق وتوصية CI الحالية فقط. جميع الحالات وأعداد الاختبارات تحت عنوان اللقطة التاريخية أدلة تخص مرحلتها الأصلية. يحل هذا الملحق محل دلالتها على الحالة الحالية دون تغيير نتائجها، ولا يدّعي تشغيل اختبارات تنفيذ إضافية له. يحمل رابطا خارطة الطريق وخطة P4 أعلاه الحالة الحالية الدائمة. لم تتغير قرارات ADR-013 أو التنفيذ.

**PostgreSQL precision boundary:** the P4 CHECK validates finite stored millisecond instants **after PostgreSQL's native microsecond conversion**. Original inputs ending in `.1230004` or `.1229996` can round to stored `.123` before CHECK; an originally earlier `revoked_at` can therefore become equal to `issued_at` as stored instants. The strict original raw-text reader rejects nonzero digits beyond milliseconds before Date conversion. `.123000` is supported; `.123456` is rejected. No `timestamp(3)` or implementation change is made by this addendum. The stored-instant constraint is not a guarantee that every overprecise original SQL input is rejected.

**حد دقة PostgreSQL:** يتحقق قيد P4 من أزمنة مخزنة منتهية بدقة الملليثانية **بعد التحويل الأصلي في PostgreSQL إلى الميكروثانية**. قد تُقرّب المدخلات الأصلية `.1230004` أو `.1229996` إلى `.123` قبل CHECK؛ لذلك قد يصبح `revoked_at` الأسبق أصلًا مساويًا لـ `issued_at` في التخزين. يرفض قارئ النص الخام الأصلي الصارم الأرقام غير الصفرية بعد الملليثانية قبل التحويل إلى Date. تُدعم `.123000` وتُرفض `.123456`. لا يضيف هذا الملحق `timestamp(3)` أو أي تعديل تنفيذي؛ ولا يضمن قيد الزمن المخزن رفض كل إدخال SQL أصلي يتجاوز الدقة.

Independent local evidence is under `artifacts/task-reviews/3.23-P4-independent-re-review/`, including `independent-adversarial-results.json`, `f5-independent-probes-results.json` and `migration-evidence.json`. These ignored, uncommitted local paths are non-portable supporting evidence, not an available original standalone review or a substitute for durable current-status documentation. Historical HOLD evidence below is retained exactly.

توجد الأدلة المستقلة المحلية في المسار أعلاه، بما فيها نتائج الاختبارات المستقلة والتزامن والترحيل المذكورة. هذه مسارات محلية مستبعدة من Git وغير ملتزم بها وغير قابلة للنقل، وليست تقرير المراجعة الأصلي المفقود أو بديلًا لتوثيق الحالة الحالية الدائم. حُفظت أدلة HOLD التاريخية أدناه دون تغيير.

## Historical snapshot — original body preserved | لقطة تاريخية — حُفظ المتن الأصلي

2026-10-15. Independent Review: **HOLD**. F1–F6 have been remediated and verified locally; independent re-review is required. P4 is **REMEDIATION_CANDIDATE / INDEPENDENT RE-REVIEW REQUIRED**. P5–P7 remain **GATED / NOT STARTED**. DurableCoverage remains **UNCHECKED**.

عُولجت F1–F6 وتحققت الاختبارات المحلية؛ تبقى نتيجة المراجعة المستقلة HOLD حتى إعادة المراجعة. P4 مرشح معالجة وليست مكتملة أو معتمدة؛ P5–P7 مشروطة ولم تبدأ والتغطية الدائمة UNCHECKED.

## Files Created | الملفات المنشأة

- This report: `docs/05-Development/Reports/QSC-Task-3.23-P4-Remediation-Candidate-Report.md` / هذا التقرير.
- Ignored local evidence, source inventories/hashes and review ZIPs under `artifacts/task-reviews/3.23-P4-remediation-work/`, `artifacts/task-reviews/3.23-P4-remediation-candidate/` and `QSC-Reviews/3.23-P4-remediation-candidate/` / أدلة وحزم محلية مستبعدة من Git.

## Files Modified | الملفات المعدلة

The following 22 existing candidate files changed during remediation. The initial candidate's other files remain intact; the pre-remediation inventory records their SHA-256 hashes. / عُدل 22 ملفاً من المرشح الموجود؛ حُفظت بقية الملفات وتوثق القائمة السابقة بصماتها.

- `domains/catalog/sharing/application/public-product-share.use-cases.ts`
- `domains/catalog/sharing/ports/public-product-share-unit-of-work.port.ts`
- `domains/catalog/sharing/ports/public-share-key-version-inspector.port.ts`
- `domains/catalog/sharing/mock/public-share-lifecycle.fixture.ts`
- `domains/catalog/sharing/infrastructure/public-product-share-lifecycle-runtime.ts`
- `domains/catalog/sharing/infrastructure/public-product-share-lifecycle-runtime.test.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-resource.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-grant.repository.ts`
- `domains/catalog/sharing/infrastructure/persistence/public-share-persistence.ts`
- `domains/catalog/sharing/infrastructure/persistence/public-share-persistence.test.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-key-version-inspector.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-audit.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share.integration.test.ts`
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-concurrency.integration.test.ts`
- `domains/catalog/infrastructure/persistence/schema.ts`
- `drizzle/0017_public_product_share_grants.sql`
- `drizzle/meta/0017_snapshot.json`
- `docs/05-Development/Reports/QSC-Task-3.23-P4-Implementation-Candidate-Report.md`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.23-P4-Grant-Persistence-and-Lifecycle-Planning.md`
- `docs/06-Roadmap/Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md`

## Files Deleted | الملفات المحذوفة

NONE / لا يوجد. No project source, prior review evidence or Git content was removed.

## Architecture Changes | تغييرات المعمارية

NONE. Existing Application, Domain, port, repository and UoW boundaries remain. The narrow resource port adds only a scoped existence read; full eligibility remains issuance-only. Existing Catalog/Branch timestamp mappings, P3 crypto/evaluator, authorization registry, HTTP and Presentation remain unchanged. No dependencies were added. / لا تغيير معماري أو اعتمادية؛ اقتصر تعديل المنفذ على قراءة وجود مقيدة، وحُفظت حدود الطبقات وتواريخ الكتالوج والفرع وتشفير P3 والصلاحيات والنقل والعرض.

## Summary | الملخص

The [Initial Candidate report](QSC-Task-3.23-P4-Implementation-Candidate-Report.md) preserves its original results and claims beneath a separate Independent Review HOLD and Remediation Candidate section. Its earlier eligibility, precision, inspection and test-strength claims are superseded by this evidence. Three real PostgreSQL adversarial probes reproduced F1/F2/F3 before fixes. The same scenarios now pass. / يحفظ التقرير المرتبط الأدلة والادعاءات الأولى كتاريخ، ويوضح التعليق والمعالجة دون حذفها. أُعيد إنتاج عيوب F1/F2/F3 فعلياً قبل الإصلاح ونجحت الحالات بعده.

P4 lifecycle timestamps are finite canonical millisecond instants. PostgreSQL retains its unrounded timestamptz type, with a P4-only check requiring equality to date_trunc('milliseconds', instant), including non-null revoked_at. Using timestamp(3) would round unsupported input, so it is deliberately avoided. Strict readers select timestamp text and string-mode Drizzle columns; precision is checked before any numeric or Date conversion. Supported .123000 is the same instant as .123; .123456 is rejected. Existing exact revocation ordering remains enforced by PostgreSQL and strict mapping; equality is allowed. ISO strings preserve immutable timestamp CAS predicates. Evidence inspectedAt is the database statement timestamp represented by the plan's Date field; its precision is distinct from aggregate lifecycle timestamps. / تدعم دورة الحياة الملليثانية الدقيقة والمنتهية فقط دون تقريب قاعدة البيانات. يطبق القيد عند وجود وقت الإلغاء ويحفظ الترتيب والمساواة المسموحة. يفحص النص قبل التحويل ويثبت CAS؛ وقت أدلة الفحص من عبارة القاعدة وله حقل Date المعتمد المنفصل عن دقة دورة الحياة.

Migration evidence starts with a fresh guarded disposable loopback test database at predecessor 0016 (17 migration records; no grant table), then applies the revised candidate 0017. Its stored migration hash matches the source; constraints and all five indexes were inspected. No manual QA/application database was prepared and no production migration/deployment occurred. Separate disposable databases were used for before-fix reproduction, final regression, and migration evidence. / بدأ اختبار الترحيل من قاعدة اختبار جديدة محمية عند 0016 بلا جدول التفويض، ثم طُبق 0017 وفُحصت البصمة والقيود والفهارس الخمسة. لم تُجهز قاعدة قبول يدوي أو تطبيق أو إنتاج ولم يحدث نشر.

```yaml
P4RemediationStatus: REMEDIATION_CANDIDATE / INDEPENDENT RE-REVIEW REQUIRED
Baseline: ac272123bd3ea9ee522283e97a4e3adffec239f0
Branch: feature/task-3.23-p4-grant-lifecycle

F1Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
F1RootCause: Full eligibility and historical specification mapping preceded existing-link retrieval.
F1Remediation: Lock Product, read authoritative active grant, retrieve without eligibility; scoped-only Copy; filter current public active definitions before mapping and omit nonqualifying values.
F1AdversarialPostgresTest: PASS; same URL and grant, no new generation/audit, temporary eligibility loss tolerated, current eligibility required for Issue/Replace, no internal fallback.

F2Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
F2RootCause: PostgreSQL microseconds were silently lost in Date mapping, weakening ordering and breaking immutable timestamp CAS.
SupportedTimestampPrecision: Finite exact milliseconds; .123 and .123000 accepted; unsupported .123456 rejected before conversion.
F2SchemaMigrationAdjustment: P4-only finite millisecond check in schema, undeployed candidate 0017 and snapshot; exact revoked_at >= issued_at retained.
F2StrictMapping: Raw timestamp text and P4 string-mode columns; unsupported precision fails closed before Date conversion.
F2CAS: ISO millisecond representation; immutable identity/revision predicates retained; supported Replace/Revoke succeed.
F2AdversarialPostgresTest: PASS; database rejection, controlled corrupt raw mapping, timezone equivalence, exact ordering and equality.

F3Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
F3InspectorCorruptionDetection: Explicit invalid-active indicator; incomplete envelope, missing fields, unsafe versions and malformed/noncanonical retrieval encoding fail the whole inspection.
F3OneStatementPreserved: YES; one CTE statement obtains both complete distinct sets, integrity indicator and statement time.
F3AdversarialPostgresTest: PASS; controlled incomplete active envelope returns IntegrityFailure.

F4Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
InspectionOutcomeContract: Inspected with PublicSharePersistedKeyVersionEvidence; Unavailable; IntegrityFailure.
InspectionDatabaseStatementTime: inspectedAt from statement_timestamp() in the same PostgreSQL statement.
InspectionProvenance: PostgreSqlPublicProductShareGrants / ServiceWide / StatementSnapshot.
UnavailableVsIntegrityFailure: Query failure maps to Unavailable; persisted corruption maps to IntegrityFailure; no raw errors.

F5Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
ConcurrencyAssertionsStrengthened: Exact counts, identities, revisions, old-state disposal, complete successor, URL/digest ownership, generation counts, stale conflicts and audit metadata/cardinality; existing barriers/connections retained.
IssueIssueRace: PASS; empty tuple Created then Reused, same durable grant/URL, revision 1, exactly one Issued; existing grant reused twice with no extra audit.
IssueRevokeRace: PASS both orders; reuse then revoke leaves zero active; revoke then Issue creates exactly one revision-1 successor and two Issued plus one Revoked history events.
ReplaceRevokeRace: PASS both orders; Replace then targeted Revoke returns AlreadyRevoked and retains successor; Revoke then Replace conflicts without successor.
ReplaceReplaceRace: PASS; first successor survives, stale second conflicts, exactly one Replaced event and one candidate.
CopyRevokeRace: PASS both orders; prior Copy returns old URL then zero active; prior Revoke yields NoActiveGrant with no decrypt/generation.
CopyReplaceRace: PASS both orders; prior Copy returns old URL; prior Replace makes Copy return durable successor; successor remains retrievable.
CoverageLifecycleRace: PASS; pre-commit statement sees old complete active state/audit; post-commit statement sees empty sets and exact revoked revision-2 row with disposed envelope.
DifferentBranchSerialization: PASS; observed Product lock blocking, two distinct revision-1 active grants/URLs, each Branch retrievable, exactly two Issued events.

F6Status: REMEDIATED / LOCAL TESTS PASS / RE-REVIEW REQUIRED
AuditResultCode: Succeeded
AuditPersistenceTests: PASS for Issued, Revoked, Replaced; Copy/reuse/repeated Revoke add no events.

ArchitectureChanged: NO
DependencyAdded: NO
MigrationNumber: "0017"
MigrationRevised: YES; undeployed candidate only, verified from 0016.
P5WorkPerformed: NO
P6WorkPerformed: NO
P7WorkPerformed: NO

FocusedF1Tests: PASS / 4 PostgreSQL
FocusedF2Tests: PASS / 6 PostgreSQL plus 8 timestamp unit cases
FocusedF3F4Tests: PASS / 9 targeted PostgreSQL plus inspection/composition regressions
FocusedF5Tests: PASS / 13 PostgreSQL concurrency
FocusedF6Tests: PASS / 1 all-event PostgreSQL persistence regression

P4ApplicationTests: PASS / 28
P4RepositoryTests: PASS / 27 persistence unit tests
P4PostgresTests: PASS / 89 total, 76 lifecycle/schema/security/coverage plus 13 concurrency
P4ConcurrencyTests: PASS / 13
P4CoverageTests: PASS; empty, deduplication, multiple tenants, complete sets above eight, corruption, unavailability, provenance and one-statement time.

P1Regression: PASS / 18 focused Domain/port tests
P2Regression: PASS / Reference Data unit and guarded PostgreSQL regressions
P3Regression: PASS / 90 focused crypto/runtime tests; source and pure evaluator unchanged
DirectSharingRegression: PASS / broad unit and guarded PostgreSQL regressions
IdentityRegression: PASS / broad unit and guarded PostgreSQL regressions
ProductBranchRegression: PASS / broad unit and guarded PostgreSQL regressions; existing timestamp code unchanged
BroadRegression: PASS / npm test, 1162 passed, 0 failures, 1 existing Windows skip
GuardedIntegrationRegression: PASS / npm run test:integration, 146 passed, no skips

TypeScript: PASS
Lint: PASS
Build: PASS
DocumentationChecks: PASS
GitDiffCheck: PASS
NoSecretEvidence: PASS

RelatedRemediationFindings: NONE

ImplementationReportUpdated: YES; Initial Candidate, Independent Review HOLD and Remediation Candidate distinguished; history preserved.
RemediationReviewBundle: artifacts/task-reviews/3.23-P4-remediation-candidate/QSC-Task-3.23-P4-remediation-candidate-Review.zip
ExportedReviewBundle: QSC-Reviews/3.23-P4-remediation-candidate/QSC-Task-3.23-P4-remediation-candidate-Review.zip
ReviewBundleSourceHashMatch: PASS

SerenaProjectYmlTouched: NO; SHA-256 3efc30be05fdf94fbfc3d9bdd3e4fe7fb122d465903ca2f89027b509b4ecb998 unchanged.
StagedChanges: NONE
CommitCreated: NO
PushPerformed: NO

BlockersRemaining: Independent re-review and gate decision required; no implementation blocker identified locally.
HighFindingsRemaining: None identified after local remediation; independent closure pending for F1-F3.
MediumFindingsRemaining: None identified after local remediation; independent closure pending for F4-F5.
LowFindingsRemaining: None identified after local remediation; independent closure pending for F6.

P4RemediationGateRecommendation: Independent implementation/security/concurrency re-review; retain HOLD pending reviewer decision.
P4Status: REMEDIATION_CANDIDATE / INDEPENDENT RE-REVIEW REQUIRED
P5Status: GATED / NOT STARTED
P6Status: GATED / NOT STARTED
P7Status: GATED / NOT STARTED
```

Recorded executions and sanitized evidence are packaged through the unchanged task-review mechanism. Source payloads remain byte-exact and are checked against manifest SHA-256 hashes; credentials, real environment files and Serena configuration are excluded. The initial implementation-candidate bundle remains intact. No management/anonymous routes, Presentation, production rotation tooling, permission activation or readiness API were added. Automated testing does not claim manual touch/mouse/keyboard QA for a new interface: this remediation adds no interface. / تجمع الآلية الحالية السجلات المنقحة مع مصادر مطابقة وبصمات موثقة واستبعاد الأسرار وملفات البيئة وSerena، وتحفظ الحزمة السابقة. لا مسارات أو عرض أو تدوير إنتاجي أو تفعيل صلاحيات أو API جاهزية؛ لا ادعاء QA يدوي لواجهة جديدة لم تُضف.

The AST-only Graphify refresh completed; its existing community labels require an optional refresh after changed graph clustering. This is a local graph advisory and does not change project source or P4 acceptance results. / اكتمل تحديث Graphify البنيوي؛ توجد ملاحظة محلية لتحديث أسماء المجموعات بعد تغير التجميع، دون تأثير على المصادر أو نتائج قبول P4.

## Next Recommendation | التوصية التالية

Review F1–F6 independently using the remediation bundle and exact sources. Keep P4 on HOLD until the reviewer issues a gate decision; keep P5–P7 gated. Stop for review; no staging, commit, push, merge or next task. / مراجعة مستقلة للنتائج الست من الحزمة والمصادر الدقيقة؛ تبقى P4 معلقة حتى القرار وتبقى P5–P7 مشروطة. التوقف للمراجعة دون تجهيز أو التزام أو دفع أو دمج أو مهمة لاحقة.
