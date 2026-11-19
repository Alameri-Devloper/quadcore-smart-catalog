# P6 targeted QA migration-lineage correction / تصحيح سلسلة ترحيلات QA المحدد

2026-11-12, Asia/Aden. **CORRECTION_STATUS: PASS**.
**ENGINEERING_DELIVERY_READINESS: READY_FOR_FOCUSED_INDEPENDENT_REVIEW**.
**P6_ENGINEERING_CANDIDATE — Acceptance HOLD**.

## A. Authorization and scope / التفويض والنطاق

The owner explicitly authorized this new QA-only correction in chat, including the helper, pure/mocked verification, TypeScript/ESLint and new correction evidence. This does not reuse the earlier alignment authorization. The detached review HEAD remains 056730487343315455ea1cc2f0377769e264d88a. No delivery or runtime qualification was authorized.

أجاز المالك هذا التصحيح المحدد صراحة في المحادثة. بقي رأس المراجعة منفصلاً عند baseline المعتمد، دون تفويض تسليم Git أو تأهيل تشغيل.

## B. Root cause / السبب الجذري

verifyAdmissionPostgres retained the original P6-only assumption of exactly 18 Catalog migrations and iterated only those 18 hashes. The integrated authoritative Drizzle journal contains 20 entries, including P5's 0018_public_share_manage_permission and 0019_public_share_management_admission. A correctly migrated integrated QA database could not satisfy the old assertion. This is a confirmed QA compatibility defect, not evidence of an application/runtime failure.

بقي شرط 18 ترحيلاً من خط P6 القديم رغم احتواء خط التكامل على 20. لذلك كان المدقق سيرفض قاعدة اختبار صحيحة. العيب في تحقق QA، ولا يثبت عيباً تطبيقياً أو حادثة جديدة.

## C. Files / الملفات

### Files Created / الملفات المنشأة

- domains/catalog/sharing/infrastructure/admission/qa-migration-lineage.ts — QA-only read/assert helper.
- domains/catalog/sharing/infrastructure/admission/qa-migration-lineage.test.ts — 10 local tests, no pg import or database access.
- docs/05-Development/Reports/QSC-Task-3.23-P6-QA-Migration-Lineage-Correction-20261112.md — this bilingual correction record.
- Ignored evidence under artifacts/task-reviews/p6-qa-migration-lineage-20261112, including before copies, execution logs, refreshed inventory/diff, hashes and bounded review ZIP.

### Files Modified / الملفات المعدلة

- domains/catalog/sharing/infrastructure/admission/qa-admission-postgres-checks.ts — read expected lineage before constructing QA pools; compare ledger id/hash/created_at in insertion order with the full expected lineage.
- docs/05-Development/Reports/QSC-Task-3.23-P6-Controlled-Integration-Alignment-20261111.md — dated addendum only; original text preserved as an exact prefix.

### Files Deleted / الملفات المحذوفة

None / لا شيء.

### Architecture Changes / التغييرات المعمارية

None. No application/domain, admission algorithm, port, transaction boundary, migration, dependency, policy or serving-composition change.
لا تغيير في التطبيق أو المجال أو خوارزمية القبول أو المنافذ أو المعاملات أو الترحيلات أو التبعيات أو السياسات أو تركيب الخدمة.

## D. Migration lineage validation / تحقق سلسلة الترحيلات

- The existing drizzle/meta/_journal.json is authoritative; there is no second migration registry.
- Validate nonempty PostgreSQL journal, contiguous idx/tag identities, matching versions, valid breakpoints and strictly increasing safe timestamps.
- Require an exact match between journal SQL filenames and the top-level SQL file inventory; missing/additional/non-regular SQL entries fail closed.
- Reuse readMigrationFiles from the already installed drizzle-orm/migrator for the runner's SHA-256 SQL-text hashing convention. This function only reads files; no migrator is invoked.
- Compare every applied row with its journal entry: exact count, positive unique increasing SERIAL id, exact created_at and checksum. The QA query orders by id, so sorting timestamps cannot hide insertion-order mismatch.
- SERIAL gaps from rolled-back attempts are valid PostgreSQL behavior; gaps do not waive order/time/hash validation.
- Current source lineage is 20; neither production helper nor caller hardcodes 18 or 20. Only the baseline regression test pins the current 20 and the two P5 tags.
- Incomplete/ambiguous inputs throw sanitized QaMigrationLineageMismatch or QaMigrationLineageUnavailable. No success or recovery fallback.

يعتمد التحقق على سجل Drizzle وملفات SQL الحالية وطريقة بصمة runner نفسها، دون سجل موازٍ أو تنفيذ ترحيل. يتحقق من العدد الكامل والترتيب والمعرفات والطوابع والبصمات ويرفض النقص والزيادة والتعديل والغموض. لا يثبت ذلك تاريخ قاعدة فعلية أو أهلية استعادة؛ لم تُقرأ قاعدة بيانات في هذه المهمة.

## E. Verification results / نتائج التحقق

Final executed commands, all exit 0:
- node --import tsx --test domains/catalog/sharing/infrastructure/admission/qa-migration-lineage.test.ts — 10 PASS, 0 FAIL, 0 SKIP.
- node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false — PASS.
- node node_modules/typescript/bin/tsc --project tsconfig.integration.json --noEmit --pretty false — PASS (static compilation only).
- node node_modules/eslint/bin/eslint.js --max-warnings 0 domains/catalog/sharing/infrastructure/admission/qa-admission-postgres-checks.ts domains/catalog/sharing/infrastructure/admission/qa-migration-lineage.ts domains/catalog/sharing/infrastructure/admission/qa-migration-lineage.test.ts — PASS, zero warnings.

Coverage: complete valid lineage; missing entries including either P5 migration; unexpected applied row; incorrect insertion order even with renumbered IDs; checksum mismatch; incorrect timestamp; malformed/duplicate IDs; legitimate serial gaps; absent/malformed ledger; invalid expected order/timestamps.

The first TypeScript attempts failed because the new never-returning assertion arrow did not support the intended control-flow narrowing. It was changed to an explicitly declared never-returning function; final TypeScript, tests and ESLint passed. All initial logs remain preserved, and final runs use collision-safe -1 filenames.

نجحت الاختبارات المحلية العشرة وفحصا TypeScript وESLint. حُفظ إخفاق TypeScript الأول وتصحيحه النوعي ونتائج الإعادة، دون استبدال سجلات.

NOT RUN: database-backed tests, SQL, migrations, Docker, build, browser, broad suites, recovery and 900-second profiles.
لم تُنفذ اختبارات قواعد بيانات أو SQL أو ترحيلات أو Docker أو build أو متصفح أو تعافٍ أو حمل طويل.

## F. Evidence integrity / سلامة الأدلة

Original alignment evidence remains untouched at artifacts/task-reviews/p6-integration-alignment-20261111. Before copies and preservation-before.json are in the new correction directory. Updated transfer-inventory.json keeps original source hashes/exclusions and identifies the additional QA correction plus the new helper/test/reports. full-review.diff includes tracked and untracked candidate files.

The final candidate has 64 files against baseline: original 60 transferred entries, two new QA files, the existing alignment report and this correction report. Original transfer classifications remain 14 application /14 tests /26 configuration /6 governing docs, with 19 excluded historical reports; the added helper/test and two review reports are explicitly separate additions. The previous 61-file evidence is historical, not overwritten.

حُفظت الأدلة السابقة ونسخة التقرير قبل الملحق. يحدد الجرد الجديد بصمات المرشح المصحح ومصدره والاستبعادات، ويشمل الفرق الكامل 64 ملفاً دون Stage.

Bounded automated review archive:
artifacts/task-reviews/p6-qa-migration-lineage-20261112/QSC-Task-3.23-P6-QA-Migration-Lineage-Correction-20261112-Review.zip

Archive/checksum verification is recorded separately after packaging. Existing archive creation/checksum utilities are reused without invoking the broad bundle CLI, whose mandatory database/build campaigns are outside this authorization. No Desktop export is performed; all artifacts stay in this review worktree. The archive is for local review, not public-publication approval.

## G. Engineering readiness and limitations / الجاهزية والقيود

READY_FOR_FOCUSED_INDEPENDENT_REVIEW only. The migration-lineage mismatch is corrected in QA source and local tests; actual applied-database verification is NOT RUN. No new runtime PASS or acceptance is claimed.

Historical 16 recovery PASS, 1 INCONCLUSIVE and 64 regressions are not rerun or relabelled. Five earlier Unavailable responses, unresolved protected pending/unknown leases, performance misses, failed/incomplete sustained workloads and restore/failover/operator-restart proof remain open. The protected QA state must not be cleared or reopened.

الجاهزية للمراجعة المستقلة المركزة فقط. تبقى أدلة التشغيل التاريخية والإخفاقات وخمس Unavailable وpending والحجوزات وبوابات الأداء والاستعادة محفوظة وغير محلولة.

## H. Safety / السلامة

Original P6 HEAD remains 25e50dadc8097a8f1663253917847487e17bd497; its 79 manifest files, index and Serena configuration remain unchanged. Integration/main refs and review HEAD are unchanged; index is empty and there are no conflicts. Existing tracked and untracked work is preserved. No changes to P5, Staff, P7, original checkout, dependencies/junction configuration, containers, databases, pending, leases, credentials, GitHub or deployment.

حُفظ المصدر المحمي والفهارس وSerena وجميع الأعمال السابقة. لا commit أو push أو merge أو تغيير خدمات أو قواعد بيانات أو أسرار.

## I. Summary and next recommendation / الملخص والتوصية التالية

The QA-only defect is corrected without changing migration source or application behavior. Review only the new lineage helper, its caller/tests, addendum and evidence before separately authorizing engineering delivery.

صُحح عيب QA دون تغيير الترحيلات أو التطبيق. الخطوة التالية الواحدة هي مراجعة مستقلة مركزة للتصحيح وأدلته قبل أي تفويض تسليم.

Keep **P6_ENGINEERING_CANDIDATE — Acceptance HOLD**. Stop for review.
