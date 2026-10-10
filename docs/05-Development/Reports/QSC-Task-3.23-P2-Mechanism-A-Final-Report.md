# Task 3.23-P2 — Mechanism A Operationalization / تشغيل الآلية A

Date / التاريخ: 2026-10-08, Asia/Aden. Review status / حالة المراجعة: AWAITING INDEPENDENT REVIEW / بانتظار المراجعة المستقلة.

MechanismAOperationalizationStatus: COMPLETED FOR PRE-PRODUCTION REVIEW.

WriterInventoryReconfirmed: YES; current production editor/client → PUT handler → ConfigureProductTypeSpecificationTemplateUseCase → PostgreSqlCatalogReferenceDataRepository.configureTemplate is P2-compatible. Test fixtures/writers are test-only; SQL 0012/0016 are migration-only; mock repositories, Product Entry reference loading and Sharing template contracts are read-only. No independent production template writer found in app/domains/shared/scripts. External production writers require operator inventory.
CurrentCandidateLegacyProductionWriterFound: NO. Baseline 1c5e19c is historical source, not evidence of an active runtime.

MechanismADesign: PASS; [runbook](../../04-Infrastructure/Task-3.23-P2-Mechanism-A-Release-Runbook.md) defines mandatory controls, ordering, failures and evidence.
MechanismAWriterInvariant: Exactly one active application writer normally; zero during migration; all writers compatible before Public can be created.
MaintenanceSequence: Announce/enforce write block → drain/finish or verify rollback of in-flight writes → stop old writer → prove zero writers → migrate → start one compatible writer → smoke → reopen writes only after required checks.
MigrationOrdering: PASS; local migration command executed after zero-writer proof and before candidate start.
RollbackPolicy: Retain expanded schema; controlled pre-Public rollback only within compatibility limits; after Public has ever existed or history is unknown, only P2-compatible releases may run.
PostPublicLegacyRollbackForbidden: YES; dropping public_visibility as ordinary rollback is forbidden.

OperationalDocument: docs/04-Infrastructure/Task-3.23-P2-Mechanism-A-Release-Runbook.md.
DocumentationLanguages: English + Arabic.

LocalRehearsalExecuted: YES; MechanismALocalRehearsal PASS for the expressly permitted safe HTTP-only local sequence.
RehearsalDatabase: quadcore_smart_catalog_test, canonical loopback, port 5432. Repository guard passed against the distinct original application target qsc; actual connected database identity matched. URLs/credentials were never printed. DATABASE_URL was overridden only in child environments; no environment file changed.
OldWriterStopped: YES; existing local Next dev CLI PID 20092, parent 18480, and server PID 14624, parent 20092. The stopped local process was not identified as a deployed legacy release.
ZeroWriterStateVerified: YES; at 2026-10-08 05:38:17 +03:00, old PIDs absent, QSC Next writer processes 0, port 3000 listeners 0. Before stop, active other transactions for the local application/test targets were 0; four established browser TCP sockets were observed, without active database transactions. Other QSC Node processes were TypeScript language tooling, not app writers.
MigrationExecuted: YES; npm.cmd run db:migrate, exit 0, completed 05:38:47 +03:00 against guarded test target only.
Migration0016Verified: YES; exact current SQL SHA-256 matched one Drizzle journal row at timestamp 1791267658601; journal count remained 17. public_visibility is text, NOT NULL, default 'internal'::text, validated CHECK permits internal/public. Migration 0016 was already applied before rehearsal; this was a successful no-op, not a newly executed populated upgrade.
NewCandidateStarted: YES; npm.cmd run build exit 0, then npm.cmd run start -- --hostname 127.0.0.1 --port 3000. Build ID zAT9MGMg75B53-DGmw8tm; launcher PID 2876; application PID 22852, parent 23544; launch at 05:42:14 +03:00. Build workers were build-time processes, not simultaneous runtime writers.
SingleWriterVerified: YES; at 05:42:48 +03:00, one QSC Next application process and one listener on 127.0.0.1:3000 owned by PID 22852; old PIDs absent.
SmokeChecks: PASS at 05:42:56 +03:00 — GET /login 200; GET /api/auth/me 401 AuthenticationRequired with no-store; GET /api/catalog/reference-data 401 AuthenticationRequired. No credential-bearing request or mutating smoke was made. Authenticated login, template read and canonical save NOT EXECUTED: no safe QA account/session was available to this task. No browser QA claimed or repeated.
RehearsalAppStoppedAfterward: YES; Stop-Process encountered a PowerShell NullReferenceException for PID 22852; process identity was rechecked, then taskkill.exe /PID 22852 /F succeeded. At 05:44:20 +03:00: writer count 0, listener count 0, rehearsal PID absent. Its launcher exit 1 followed deliberate termination, not startup/smoke failure. The original local development app was not restarted.

ProductionEnvironmentExists: NOT ESTABLISHED; repository has no production application hosting/service definition. No claim that an external deployment does not exist.
ProductionEnvironmentVerification: UNPROVEN; no production environment accessed or topology verified.

P2ReleasePolicy: PASS; Mechanism A is mandatory for all P2/template-writing deployments, with explicit post-Public legacy rollback prohibition and future production evidence prerequisites.
DeploymentMechanismStatus: PASS_A for pre-production operational policy and safe local rehearsal only; actual production deployment remains HOLD until host-specific controls, complete writer inventory and required authenticated smoke are evidenced.

EvidenceLimitations: Local announcement, idle transaction observation and process termination are not production ingress/drain enforcement. Process/listener evidence is scoped to the identified local QSC runtime; it does not prove another host or external writer absent. No fresh migration DDL, backup/restore, authenticated canonical save, production release or browser acceptance executed. Existing PostgreSQL docs provide local backup examples, not a production backup policy. Previous deployed release commit is unknown/not applicable to the local dev process; candidate identity is branch + baseline 1c5e19cbfc90729218dec948b8b0f3950c585ba3 + byte-exact source hashes in evidence, not a new commit.

P2CompletionGateImpact: Mechanism A pre-production evidence supplied for review; P2 remains HOLD/NOT COMPLETE pending accepted review and existing completion gates. Planning sections 20/24 require a proven mechanism but do not expressly require actual production deployment before development acceptance. Future production release remains constrained by this runbook. P3–P7 remain GATED / NOT STARTED.

FilesCreated:
- docs/04-Infrastructure/Task-3.23-P2-Mechanism-A-Release-Runbook.md.
- docs/05-Development/Reports/QSC-Task-3.23-P2-Mechanism-A-Final-Report.md.

FilesModified: docs/04-Infrastructure/README.md only, adding the bilingual mandatory runbook link.
FilesDeleted: NONE.
ProductionCodeModified: NO.
TestsModified: NO.
SchemaSourceModified: NO.
MigrationSourceModified: NO.
DependenciesAdded: NONE.
ArchitectureChanges: NONE.
P3ToP7WorkPerformed: NO.

SerenaProjectYmlTouched: NO. Initial and final SHA-256: 3EFC30BE05FDF94FBFC3D9BDD3E4FE7FB122D465903CA2F89027B509B4ECB998. Intentional pre-existing local modification preserved byte-for-byte. All 27 initially dirty/untracked files retained their initial SHA-256.
GitDiffCheck: PASS; git diff --check, with separate new-document whitespace/conflict checks.
LocalLinksCheck: PASS; relative Markdown links in the three task documents resolve.
Utf8Check: PASS; strict UTF-8 and no replacement characters in task documentation.
GitStatus: Same branch and HEAD; original 22 tracked modifications and five untracked files preserved. This task adds one tracked documentation modification and two untracked Markdown documents. No stage/commit/push/PR/merge/rebase/branch change performed.

ReviewBundle: Focused automated operational evidence archive, using existing source-secret detection, evidence sanitization, archive creation, archive verification and checksum helpers. Exact dirty candidate sources and task docs included; no credentials or environment files. This is not a full implementation verification bundle. The standard review:bundle command was not invoked because its non-skippable integration command prepares/truncates the shared QA fixtures and reruns full suites, contrary to this task's explicit limits. No review-tool configuration changed.
RepositoryZip: artifacts/task-reviews/3.23-P2-Mechanism-A-20261008/Mechanism-A-Operational-Review.zip.
ExportedZip: QSC-Reviews/QSC-Task-3.23-P2-Mechanism-A-Operational-Review.zip.

Summary: Defined mandatory bilingual Mechanism A policy, executed the guarded local zero-writer/migrate/build/single-writer/smoke/stop sequence, retained template fixture count 1/3 and SHA-256 96e952651b588776830084f9453f6151a506e8592bb89599b244a420c89b97bc, and preserved all pre-existing sources. No production deployment performed.
NextRecommendation: Review the runbook and local evidence; before any production release supply the actual host/service topology, external writer inventory, enforced write blocking/draining, restart controls, release identities and authorized login/read/save smoke. Do not begin P3 automatically.

## العربية

اكتمل تشغيل الآلية A للتقييم قبل الإنتاج، وتبقى المراجعة المستقلة مطلوبة. أُعيد حصر المسارات الفعلية ولم يوجد كاتب إنتاج قديم في المرشح الحالي؛ الالتزام الأساسي مصدر تاريخي وليس عملية منشورة مثبتة. يفرض الدليل كاتباً واحداً أثناء التشغيل وانعدام الكتّاب أثناء الترحيل، ويحظر تشغيل كاتب الحقول الثلاثة أو حذف عمود الرؤية بعد وجود بيانات عامة سابقاً أو حالياً أو عند غموض التاريخ.

نجح حاجز قاعدة الاختبار المحلية quadcore_smart_catalog_test مع اختلاف هدف التطبيق الأصلي. أُوقفت عمليتا Next المحليتان، وثبت انعدام الكاتب والمستمع، ثم نجح أمر الترحيل الحالي دون تغيير بيانات التهيئة. كانت 0016 مطبقة مسبقاً؛ طابقت بصمتها السجل وتحقق العمود والافتراضي والقيد، ولم تُدعَ ترقية جديدة. نجح البناء وتشغيل كاتب مرشح واحد، والوصول إلى login ورفض المصادقة والبيانات المرجعية دون جلسة. لم تتوفر جلسة QA آمنة، فلم ينفذ دخول مصادق عليه أو قراءة قالب أو حفظه، ولم يُدعَ QA متصفح.

أُوقف التطبيق بعد التدريب؛ فشل Stop-Process محلياً باستثناء PowerShell ثم نجح إنهاء PID المتحقق بواسطة taskkill. ثبت مجدداً انعدام الكتّاب والمستمعين. بقي قالب واحد وثلاثة إدخالات وبصمتها دون تغيير. حُفظت الملفات السابقة السبعة والعشرون وبصمة Serena دون لمس. اقتصر المصدر الجديد على الدليل والتقرير ورابطهما الثنائي اللغة في README للبنية التحتية، ولم تُحذف ملفات أو تتغير شيفرة أو اختبارات أو مخطط أو ترحيلات أو اعتماديات أو معمارية أو حالة P3–P7.

تعريف الآلية وسياسة الإصدار والتدريب المحلي ناجحة، وPASS_A محصور في التقييم قبل الإنتاج. وجود بيئة إنتاج خارجية وطوبولوجيتها غير مثبتين؛ لم تُستخدم بيئة إنتاج. يبقى النشر الفعلي محجوباً حتى أدلة المشغل، ومنها حجب وتصريف فعليان وحصر كل الكتّاب وفحص الدخول والقراءة والحفظ. الإعلان المحلي وانعدام المعاملات المرصود لا يثبتان ضوابط إنتاجية. تبقى بوابة P2 معلقة ولا يُعلن اكتمالها.

أُنشئت حزمة أدلة تشغيلية مركزة بأدوات الحفظ والتحقق والتعقيم الحالية، مع المصدر الأصلي وبصماته دون أسرار أو ملفات بيئة. لم يُشغّل أمر الحزمة الشاملة لأنه يلزم تجهيز اختبارات التكامل الذي يمس بيانات QA وإعادة مجموعات كاملة؛ لا تعديل للأداة أو استبدال لنتائج التحقق السابق. مسارا ZIP المحلي والمصدر أعلاه. التوصية التالية مراجعة الدليل والأدلة ثم استكمال أدلة الاستضافة عند النشر، والتوقف للمراجعة دون بدء P3.
