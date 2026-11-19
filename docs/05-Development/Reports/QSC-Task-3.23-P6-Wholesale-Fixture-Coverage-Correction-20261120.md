# P6 Wholesale Fixture Coverage Correction / تصحيح تغطية بيانات الجملة التجريبية

Date / التاريخ: 2026-11-20. Owner-confirmed scope: P6_QA_WHOLESALE_FIXTURE_COVERAGE.

## A. CORRECTION_STATUS

**PASS — QA-only correction and offline verification.** Actual PostgreSQL qualification is NOT RUN.

**نجح التصحيح المحدود وفحصه المعزول فقط.** لم تُنفَّذ اختبارات PostgreSQL الفعلية، ولم تصبح متطلبات البيئة الجديدة PASS.

Baseline HEAD: 4bcb842431330482dbb0c1b2d5da776f5822c185. Branch: feature/task-3.23-p6-aligned-engineering-candidate. Changes remain local and uncommitted; Draft PR #68 was not updated.

## B. ROOT_CAUSE

The synthetic fixture populated Retail but omitted the existing nullable Wholesale columns. Campaign preparation cloned those incomplete rows. This was a confirmed QA coverage gap, not evidence of an application disclosure defect.

السبب: بيانات fixture كانت تملأ التجزئة دون أعمدة الجملة الموجودة أصلًا، فتنسخها تهيئة الحملة دون إثبات سعر جملة مخزّن. هذا نقص تغطية QA، وليس ثغرة تطبيق مثبتة.

## C. FILES_CHANGED

### Files Modified / الملفات المعدلة

- domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-resolution.integration.test.ts
- domains/catalog/sharing/mock/public-share-postgres.fixture.ts
- scripts/qa/public-share-campaign-prerequisites.test.ts
- scripts/qa/public-share-campaign-prerequisites.ts

### Files Created / الملفات المنشأة

- domains/catalog/sharing/mock/public-share-postgres.fixture.test.ts
- docs/05-Development/Reports/QSC-Task-3.23-P6-Wholesale-Fixture-Coverage-Correction-20261120.md

### Files Deleted / الملفات المحذوفة

None / لا يوجد.

### Architecture Changes / تغييرات المعمارية

None. No serving application algorithm, port, route, composition, dependency, migration, schema, security threshold, or pricing policy changed.

لا تغيير في خوارزميات التطبيق أو منافذه أو مساراته أو تركيبه أو تبعياته أو مخططه أو migrations أو حدوده الأمنية أو سياسة التسعير.

## D. PRICING_CONTRACT_COMPLIANCE

Fixture SQL uses existing catalog_products.wholesale_price_minor and wholesale_price_currency, independently of retail_price_minor and retail_price_currency. Main synthetic product: Retail 0 USD; Wholesale 73129 minor USD (731.29). Foreign synthetic product: Retail 1 minor USD; Wholesale 86421 minor USD (864.21). These constants are QA sentinels only.

Campaign preparation retains its existing transaction and cloning behavior, then validates exactly ten scoped products (five Workspaces, text/image), independent Retail/Wholesale values, currency pairs and unique identity before COMMIT. Missing, foreign, duplicated, extra or mismatched pricing coverage is rejected; no repair of existing databases is introduced.

تُستخدم أعمدة التسعير الموجودة دون نموذج جديد. يتحقق حارس QA من عشرة منتجات ضمن خمسة Workspaces قبل COMMIT، ويرفض القيم الناقصة أو المتداخلة أو المخالفة للنطاق دون إصلاح أي قاعدة موجودة.

## E. VERIFICATION

| Check / الفحص | Result / النتيجة | Evidence / الدليل |
| --- | --- | --- |
| Focused isolated tests: fixture, campaign prerequisites, existing public resolver | PASS: 31; FAIL: 0; skipped: 0 | isolated-tests.execution.json |
| Application TypeScript, no incremental output | PASS | typescript.execution.json |
| Integration TypeScript, no emit | PASS | integration-typescript.execution.json |
| ESLint, five changed QA/test files, zero warnings | PASS | focused-eslint.execution.json |
| git diff --check | PASS | preservation-final.json |
| Actual stored PostgreSQL values and public projection | NOT RUN | Prepared integration assertion only |
| Fresh QA prerequisite/provisioning and load profiles | NOT RUN | Outside this correction scope |

Isolated tests capture the actual fixture SQL with database execution mocked and Pool/Client connection attempts forbidden. They prove emitted SQL and pure coverage checks, not real persisted state. Existing resolver tests are mocked application evidence, not PostgreSQL admission qualification.

الاختبارات المعزولة تفحص SQL الناتج مع منع الاتصال وتزييف التنفيذ؛ لا تثبت التخزين الفعلي. اختبارات resolver المعاد استخدامها دليل تطبيقي معزول، وليست تأهيل admission فعليًا.

## F. SECURITY

The prepared PostgreSQL test first reads actual stored Retail/Wholesale, resolves the real database-backed projection and English/Arabic view, requires authorized Retail 0.00 USD, and rejects raw/formatted Wholesale sentinels in serialized output as well as the field name. It then changes only synthetic Wholesale to 95237 minor USD (952.37), verifies stored Retail unchanged and rechecks exclusion. This is stronger than a field-name-only assertion; it is NOT RUN.

Existing Workspace/Branch resolution, admission, revocation and authorization code remains byte-identical. The prepared projection test reuses this suite’s mock-Allowed admission; it does not qualify PostgreSQL admission enforcement.

اختبار PostgreSQL المُعدّ يتحقق من القيم المخزنة ثم الإسقاط والعرض بالعربية والإنجليزية، ويمنع تسرب قيم الجملة قبل تغييرها وبعده مع ثبات التجزئة. لم يُشغّل؛ كما أنه لا يؤهل admission الفعلي لأن هذه المجموعة تستخدم admission معزولًا.

## G. QA_READINESS / Summary

The missing-fixture correction is ready for review. Fresh isolated prerequisites may resume only after a separate execution decision and renewed identity/resource guards. The prepared PostgreSQL integration suite retains its exact database-name guard (qsc_p6_public_resolution_test_20261022); the future fresh-environment procedure must explicitly accommodate this existing guard without disabling it or targeting protected databases.

التصحيح جاهز للمراجعة. استئناف المتطلبات المعزولة يحتاج قرار تنفيذ منفصل وحراس الهوية والموارد. يجب مراعاة حارس اسم قاعدة الاختبار الحالي، دون تعطيله أو استخدام قواعد محمية.

Historical performance/availability failures, unresolved shared pending state, unknown-lease evidence, restore/failover and operator-restart qualification remain open. No recovery, reconciliation, state clearing, admission opening, Docker/PostgreSQL operation or 900-second workload occurred.

تبقى نتائج الأداء والإتاحة السابقة والحالة المعلقة وأدلة leases ومتطلبات الاستعادة وإعادة التشغيل مفتوحة. لا تشغيل للبيئة ولا recovery ولا مسح للحالة ولا حمل طويل.

## H. SAFETY / Next Recommendation

All 1,251 pre-existing tracked files were hash-compared: only the four approved QA files changed. Eleven other worktrees retain their prior HEAD, branch, status, dirty/untracked content hashes, index and Serena hashes. Active HEAD/branch/index/Serena are unchanged; no staged or unmerged files. Initial preservation evidence used untrimmed status serialization against a trimmed baseline; that false mismatch was diagnosed and the corrected comparison retained separately, with no file repair or overwrite.

حُفظت مساحات العمل الأخرى ومحتوياتها وملفاتها غير المتتبعة وSerena وGit index. بقي الرأس والفرع دون تغيير، ولم يحدث Stage/Commit/Push أو تعديل PR. نتيجة فحص الحفظ الأولية اختلفت بسبب طريقة حساب نص الحالة فقط؛ حُفظت وأُعيدت المقارنة بالطريقة الأصلية دون تعديل الملفات.

Review bundle: artifacts/task-reviews/p6-wholesale-fixture-20261120-b6a7a9c038/review-bundle.zip. Detached SHA-256: review-bundle.zip.sha256. Exact source files and sanitized evidence only; before.json with local filesystem metadata is excluded. No Desktop/external export was made.

الخطوة التالية الوحيدة: مراجعة التصحيح واتخاذ قرار منفصل بشأن تنفيذ متطلبات البيئة المعزولة، دون اعتبار هذه النتائج قبولًا لـP6.

**P6_ENGINEERING_CANDIDATE — Acceptance HOLD**
