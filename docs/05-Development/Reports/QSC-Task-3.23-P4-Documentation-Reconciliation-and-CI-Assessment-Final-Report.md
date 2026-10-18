# Task 3.23 P4 — Documentation Reconciliation and CI Assessment | مصالحة التوثيق وتقييم CI

2026-10-15. Branch: `feature/task-3.23-p4-grant-lifecycle`. HEAD/baseline: `ac272123bd3ea9ee522283e97a4e3adffec239f0`.

**Documentation reconciliation: PASS. P4 Final Approval: HOLD pending dedicated P4 PostgreSQL/concurrency CI coverage being implemented and verified, or explicitly accepted by the project owner.** The workflow was assessed without modification. / نجحت مصالحة التوثيق؛ يبقى اعتماد P4 النهائي معلقاً حتى تنفيذ تغطية CI المخصصة والتحقق منها أو قبول مالك المشروع للفجوة صراحة. جرى تقييم سير العمل دون تعديله.

## Files Created | الملفات المنشأة

- This mandatory final report: `docs/05-Development/Reports/QSC-Task-3.23-P4-Documentation-Reconciliation-and-CI-Assessment-Final-Report.md`.
- Ignored verification evidence and review artifacts under `artifacts/task-reviews/3.23-P4-docs-ci-assessment-20261015-work/`, `artifacts/task-reviews/3.23-P4-docs-ci-assessment-20261015/` and `QSC-Reviews/3.23-P4-docs-ci-assessment-20261015/`.

أُنشئ تقرير المهمة الإلزامي وأدلة وحزم مراجعة محلية مستبعدة من Git فقط.

## Files Modified | الملفات المعدلة

The six existing candidate documents received dated bilingual current-authority addenda:

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.23-P4-Grant-Persistence-and-Lifecycle-Planning.md`
- `docs/06-Roadmap/Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.23-P4-Implementation-Candidate-Report.md`
- `docs/05-Development/Reports/QSC-Task-3.23-P4-Remediation-Candidate-Report.md`

أُضيفت مرجعية حالة حالية مؤرخة بالعربية والإنجليزية إلى الملفات الستة، مع حفظ المتون السابقة كاملة.

## Files Deleted | الملفات المحذوفة

None. Prior evidence and review bundles were preserved. / لا يوجد؛ حُفظت الأدلة والحزم السابقة.

## Architecture Changes | التغييرات المعمارية

None. ADR-013, implementation, schema/migrations, dependency manifests, workflow and protected Serena file are unchanged from task entry. No P5–P7 implementation or database operation occurred. / لا تغيير معماري أو تنفيذي أو اعتماديات أو ترحيلات أو سير عمل؛ لم يبدأ تنفيذ P5–P7 ولم تُنفذ عمليات قاعدة بيانات.

## Summary | الملخص

### Status corrections and historical preservation | تصحيح الحالة وحفظ التاريخ

The current addenda record F1–F6 remediation COMPLETED and independent re-review PASS under reconstructed fallback criteria. The original standalone review remains unavailable and was not examined. Original criteria, reconstructed fallback criteria and independently verified implementation/probe evidence remain distinct. P4 remains UNMERGED / NOT COMPLETE; P5–P7 remain GATED / NOT STARTED; DurableCoverage remains UNCHECKED.

Chronology remains initial candidate → independent HOLD → remediation/local PASS → fallback re-review PASS → final approval HOLD → documentation reconciliation/CI recommendation. All six original bodies are preserved byte-for-byte after explicit historical boundaries. Earlier HOLD, review-pending and planning-only authorization wording is retained as historical evidence; dated addenda supersede only its current-status implications. Technical contracts and ADR-013 decisions remain authoritative and unchanged.

اكتملت معالجة F1–F6 ونجحت إعادة المراجعة وفق المعايير البديلة المعاد بناؤها؛ التقرير الأصلي غير متاح ولم يُفحص. حُفظ تمييز المعايير والأدلة والتسلسل التاريخي والمتون الستة حرفياً. لم تكتمل P4 ولم تُدمج، وتبقى P5–P7 مشروطة ولم تبدأ والتغطية الدائمة UNCHECKED. لا تعني مصالحة الحالة تصريحاً بعمليات Git أو النشر.

The precision clarification guarantees finite millisecond stored instants **after PostgreSQL native conversion**. Inputs `.1230004` and `.1229996` may round to stored `.123` before CHECK; originally ordered issued/revoked inputs may become equal stored instants. Strict raw-text readers reject nonzero digits beyond milliseconds before Date conversion. `.123000` is supported; `.123456` is rejected. Stored ordering/CAS and the separate inspection Date evidence boundary are preserved. No timestamp type or implementation was changed.

يخص ضمان الدقة الأزمنة المخزنة بعد التحويل الأصلي في PostgreSQL؛ قد يقرب المدخلان المذكوران إلى الملليثانية نفسها قبل القيد، بينما يرفض قارئ النص الخام الصارم الدقة غير المدعومة قبل Date. تبقى قواعد الترتيب وCAS وحد أدلة وقت الفحص محفوظة دون تغيير التنفيذ.

### Documentation validation | التحقق من التوثيق

Fresh checks:

| Exact command / الأمر | Actual result / النتيجة الفعلية |
| --- | --- |
| `node --require tsx/cjs artifacts/task-reviews/3.23-P4-docs-ci-assessment-20261015-work/verify-documentation.cjs` | PASS: six UTF-8 documents; six exact historical bodies; 16 new links; balanced fences; current status/provenance/precision contracts; frozen implementation/workflow/ADR/Serena; secret scan. |
| `npx.cmd tsc --noEmit` | PASS, exit 0. |
| `npx.cmd tsc --project tsconfig.integration.json` | PASS, exit 0; compilation only, no database connection. |
| `npm.cmd run lint` | PASS, exit 0. |
| `git diff --check` | PASS, exit 0; existing LF/CRLF advisories only. |

These are non-test checks: test counts/skips are not applicable. No unit, PostgreSQL, build or migration command was rerun during this documentation task. For the automated bundle, authentic earlier technical executions are retained from `artifacts/task-reviews/3.23-P4-remediation-work/` with original commands, timestamps, exits and output hashes, after all 27 non-documentation candidate hashes match the recorded remediation source manifest. Fresh checks are separately identified. Retained technical evidence is not a new CI run or release approval.

نجحت الفحوص الجديدة المبينة؛ تجميع التكامل لا يتصل بقاعدة البيانات. لم تُعد اختبارات التنفيذ أو PostgreSQL أو البناء أو الترحيل. احتُفظ بأدلة التنفيذ السابقة وبياناتها الأصلية بعد مطابقة بصمات المصادر غير التوثيقية السبعة والعشرين؛ فُصلت عن الفحوص الجديدة دون ادعاء CI جديد.

### Existing and missing CI coverage | تغطية CI الحالية والناقصة

`Quality` runs TypeScript, lint, broad unit tests, build, migration metadata and non-blocking audits. `PostgreSQL Integration` runs integration compilation, clean application migrations and the explicit generic integration suite. The separate Product Media workflow preserves Linux/Windows coverage on `.nvmrc` Node 24.18.0.

Neither generic integration nor the workflow invokes the two P4 PostgreSQL files. Broad unit CI reaches P4 Application tests through Direct Sharing, but omits the full focused public-sharing Domain, crypto, lifecycle-runtime and persistence unit paths; this proposal does not claim to close that separate focused-unit gap.

تشغل CI الفحوص العامة والتكامل الحالي، لكنها لا تشغل ملفي PostgreSQL الخاصين بـP4. تصل اختبارات الوحدة العامة إلى اختبارات التطبيق فقط ولا تغطي المجموعة المركزة كاملة؛ إضافة خطوة PostgreSQL لا تغلق هذه الفجوة المنفصلة تلقائياً.

### Exact proposed CI patch — not applied | تعديل CI المقترح حرفياً — لم يُطبق

Append this step immediately after generic integration in `.github/workflows/quality-gate.yml`:

```diff
       - name: Run PostgreSQL integration tests
         run: npm run test:integration
+
+      - name: Run P4 public-sharing PostgreSQL and concurrency tests
+        timeout-minutes: 10
+        run: npm run test:public-sharing:integration
```

The existing `ubuntu-latest` job uses a disposable `postgres:17-alpine` service and creates separate `qsc_ci` application-migration and `qsc_ci_test` fixture databases. Its existing environment and synthetic crypto fixtures need no production keys or new secrets. Keep the new step serial: P4 fixtures truncate Workspace/Product data with CASCADE and exercise temporary DDL, so they must never target shared/manual-QA/production databases. The CI service supplies disposability; the URL guard alone does not prove it.

The dedicated script compiles, performs guarded idempotent migration preparation, then runs both P4 files with `--test-concurrency=1`. It adds the previously evidenced 89 P4 cases, including 13 concurrency cases, without rerunning generic test files. Compilation/preparation repeat intentionally; retaining the canonical script avoids a package-script refactor. Existing checks, job names, service configuration, triggers and dependencies remain unchanged.

تُضاف الخطوة بالتسلسل داخل خدمة PostgreSQL الاختبارية المؤقتة الحالية وبقاعدتين منفصلتين؛ لا أسرار إنتاج ولا مكتبات جديدة. تفرض تجهيزات P4 استخدام قاعدة قابلة للتخلص منها بسبب TRUNCATE وDDL المؤقت. تضيف الخطوة 89 حالة موثقة سابقاً، منها 13 للتزامن، دون تكرار ملفات الاختبارات العامة؛ يتكرر التجميع والتحضير الآمن فقط.

### Risks and compatibility | المخاطر والتوافق

The new database step remains Linux-only; existing Windows Product Media coverage is preserved, without claiming Windows P4 PostgreSQL acceptance. Node matches `.nvmrc`; PostgreSQL major 17 matches prior evidence, while `17-alpine` does not pin a minor version.

The workflow currently has no explicit job/step timeout. Some concurrency tests have local deadlines, but the final inspection case and database statements are not individually bounded. The proposed ten-minute step timeout bounds compilation/preparation/tests without changing existing limits or allowing failure. It is a generous initial ceiling based on local evidence, not a hosted-runtime guarantee; inspect the first approved hosted run and investigate any timeout before raising it. See [GitHub step timeout syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepstimeout-minutes).

Feature-branch pushes do not match current push filters; a PR targeting `main` qualifies. No push or PR was created. No shared or production database was contacted by this task.

يبقى تكامل PostgreSQL على Linux دون ادعاء قبوله على Windows. حد العشر دقائق مقترح للخطوة الجديدة فقط، وليس ضماناً لزمن مشغل GitHub؛ يلزم فحص أول تشغيل معتمد وأسباب أي انتهاء مهلة. لا يفعّل دفع هذا الفرع وحده المرشحات الحالية، ولم يحدث دفع أو إنشاء PR.

### Git and bundle verification | التحقق من Git وحزمة المراجعة

Branch and HEAD remain the stated baseline. Only six existing documentation files changed during this task, plus this required new report. The full pending P4 inventory is now 34 files (10 modified, 24 untracked); the additional pre-existing `.serena/project.yml` modification remains excluded. No files were staged and no prohibited Git operation was executed.

Protected Serena SHA-256 remains `3efc30be05fdf94fbfc3d9bdd3e4fe7fb122d465903ca2f89027b509b4ecb998`. Source/report bytes, manifest payload hashes, exported ZIP and checksums are verified; source files are copied exactly and only evidence is sanitized. Bundle `ReadyForReview` describes artifact verification, not P4 commit/release approval.

- Repository ZIP: `artifacts/task-reviews/3.23-P4-docs-ci-assessment-20261015/QSC-Task-3.23-P4-docs-ci-assessment-20261015-Review.zip`
- Exported ZIP: `QSC-Reviews/3.23-P4-docs-ci-assessment-20261015/QSC-Task-3.23-P4-docs-ci-assessment-20261015-Review.zip`

بقي الفرع وHEAD والفهرس دون تغيير. تقتصر تعديلات المهمة على الوثائق الست والتقرير الإلزامي الجديد؛ استُبعد ملف Serena المحمي وحُفظت بصمته. لا تتضمن الحزمة أسراراً أو ملفات بيئة حقيقية، ولا تعني جاهزية الحزمة للمراجعة اعتماد الالتزام أو الإصدار.

## Next Recommendation | التوصية التالية

**Retain HOLD.** Obtain separate authorization to apply the proposed CI patch, then verify the resulting exact candidate and existing required checks, or obtain explicit project-owner acceptance of the coverage gap. Review focused-unit CI coverage separately. Reassess final approval afterward; do not claim READY_FOR_COMMIT_APPROVAL now. P4 remains unmerged; P5–P7 remain gated. Stop for review.

**يبقى القرار HOLD.** يلزم تصريح منفصل لتطبيق تعديل CI المقترح ثم التحقق من المرشح الناتج وفحوصه، أو قبول مالك المشروع للفجوة صراحة. تُراجع تغطية الوحدة المركزة بصورة منفصلة، ثم يعاد تقييم الاعتماد النهائي؛ لا اعتماد للالتزام الآن. لم تُدمج P4 وتبقى P5–P7 مشروطة. التوقف للمراجعة.

<a id="p4-final-closure-2026-10-18"></a>

## Final P4 closure evidence — 2026-10-18 | أدلة الإغلاق النهائي لـP4

**P4: IMPLEMENTED, VERIFIED & INTEGRATED. PR #63: MERGED.** This is the central durable closure-evidence addendum for the documentation candidate. The earlier 2026-10-15 HOLD, proposed CI patch, findings and historical counts above remain unchanged. Their delivery-status implications are superseded by the verified implementation, security remediation, hosted CI, final merge-readiness review and explicit owner-authorized integration merge recorded below. Independent review of this documentation candidate remains pending.

**P4: منفذة ومتحقق منها ومدمجة. PR #63: مدمج.** تمثل هذه الإضافة سجل أدلة الإغلاق المركزي لمرشح التوثيق. تُحفظ دون تغيير قرارات HOLD ومقترح CI والنتائج والأعداد التاريخية في 2026-10-15 أعلاه. تتجاوز الأدلة التالية دلالات حالة التسليم السابقة بعد التنفيذ والمعالجة الأمنية وCI المستضافة ومراجعة جاهزية الدمج والدمج المعتمد صراحة من المالك. تبقى مراجعة مرشح التوثيق المستقلة معلقة.

### Integration and source identity | التكامل وهوية المصدر

| Verified item / البند المتحقق | Exact evidence / الدليل الدقيق |
| --- | --- |
| Repository / المستودع | `Alameri-Devloper/quadcore-smart-catalog` |
| Integration PR / طلب دمج التكامل | [#63 — MERGED](https://github.com/Alameri-Devloper/quadcore-smart-catalog/pull/63) |
| Integration branch / فرع التكامل | `feature/public-product-share-planning` |
| Integration merge commit / التزام دمج التكامل | `fbf02da1e4bed75763fc6cc247172a6ef5f82f79` |
| Parent 1: approved prior base / الأب الأول: الأساس السابق المعتمد | `ac272123bd3ea9ee522283e97a4e3adffec239f0` |
| Parent 2: tested source/security HEAD / الأب الثاني: رأس المصدر والمعالجة المختبر | `6af3a274f3dc329977693a374c7100d212906a7b` |
| P4 implementation commit / التزام تنفيذ P4 | `d299f13eb825fd8788900b6abd8a105cbfac1321` |
| Approved source AND integrated merge tree / شجرة المصدر المعتمد والدمج | `d7031786a0b77a3c331224e69049f1942627bb6c` |
| Integrated inventory / قائمة التكامل | 36 files: 24 added, 12 modified, 0 deleted / 36 ملفاً: 24 مضافاً و12 معدلاً دون حذف |

One normal GitHub merge commit preserved both approved commits; no squash/rebase was used. The complete approved source tree and integrated merge tree are identical, including tracked paths, contents and modes. Main was unchanged by the integration task; the source branch was retained. These are the 2026-10-18 verified integration facts, not a guarantee that remote refs cannot change later.

حافظ دمج GitHub عادي واحد على الالتزامين المعتمدين دون squash أو rebase. تتطابق شجرتا المصدر المعتمد والدمج بالكامل، بما يشمل المسارات والمحتوى وأنماط الملفات. لم تغير مهمة التكامل فرع main وحُفظ فرع المصدر. هذه حقائق تحقق بتاريخ 2026-10-18 وليست ضماناً لثبات الفروع مستقبلاً.

### Hosted verification | التحقق المستضاف

Both existing workflows ran with `workflow_dispatch` on source HEAD `6af3a274f3dc329977693a374c7100d212906a7b` and completed successfully on attempt 1. They were manually dispatched branch runs, not PR-triggered checks. They did not directly test merge commit `fbf02da...`; exact complete-tree equality connects their tested source contents to the integrated result. The earlier dedicated-CI coverage HOLD is resolved by actual execution of `npm run test:public-sharing` and `npm run test:public-sharing:integration`, not by accepting an untested gap.

نُفذ مسارا العمل الحاليان يدوياً بحدث `workflow_dispatch` على رأس المصدر المذكور، ونجحا من المحاولة الأولى. لم يكونا فحوصاً ناتجة عن PR ولم يختبرا التزام الدمج مباشرة؛ يربط تطابق الشجرة الكامل المحتوى المختبر بنتيجة التكامل. أُغلق تعليق التغطية السابقة بتنفيذ أمري الاختبار المخصصين فعلياً، لا بقبول فجوة غير مختبرة.

| Workflow / مسار العمل | Workflow ID / معرفه | Run / التشغيل | Required jobs / المهام المطلوبة |
| --- | --- | --- | --- |
| QSC CI Quality Gate | `318646305` | [39089866533](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/39089866533) | Quality: SUCCESS; PostgreSQL Integration: SUCCESS |
| Product Media Compatibility | `320049866` | [39089887321](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/39089887321) | Ubuntu/Linux: SUCCESS; Windows: SUCCESS |

| Actual hosted suite / مجموعة الاختبار المستضافة | Result / النتيجة |
| --- | --- |
| Broad regression / الانحدار الشامل | 1163 PASS |
| Dedicated Public Sharing / المشاركة العامة المخصصة | 192 PASS |
| Generic PostgreSQL integration / تكامل PostgreSQL العام | 146 PASS |
| Dedicated P4 PostgreSQL / PostgreSQL المخصص لـP4 | 89 PASS |
| Concurrency cases, INCLUDED in the 89 / حالات التزامن المشمولة ضمن 89 | 13 PASS |
| Product Media Ubuntu / وسائط المنتج على Ubuntu | 109 PASS |
| Product Media Windows / وسائط المنتج على Windows | 109 PASS |

All reported suite summaries had zero failures, cancellations and skips. Counts overlap and MUST NOT be added as a count of unique tests. TypeScript, ESLint, production build, migration metadata and migration application passed. PostgreSQL integration used disposable PostgreSQL 17 CI infrastructure and isolated CI databases, not production or shared manual-QA databases. P4 schema/lifecycle/security/coverage and deterministic lock/concurrency/rollback evidence support the accepted plan; no new technical test or database execution is claimed for this documentation-only task.

لم تسجل ملخصات المجموعات إخفاقاً أو إلغاءً أو تخطياً. الأعداد متداخلة ولا يجوز جمعها كعدد اختبارات فريدة. نجحت TypeScript وESLint وبناء الإنتاج وفحوص بيانات الترحيل وتطبيقه. استخدم التكامل PostgreSQL 17 وقواعد CI مؤقتة ومعزولة دون الإنتاج أو القبول اليدوي المشترك. تدعم أدلة المخطط ودورة الحياة والأمن والتغطية والأقفال والتزامن والتراجع الخطة المقبولة؛ لا تدعي مهمة التوثيق تشغيل اختبارات تقنية أو قواعد بيانات جديدة.

The PR check rollup was empty and the integration branch was unprotected with no effective required checks/rules at review time. Manual branch evidence is recorded separately; no configured required check or PR-triggered run is invented. The owner-authorized merge relied on the exact approved revisions, four successful jobs and complete-tree equality.

كان ملخص فحوص PR فارغاً وفرع التكامل غير محمي دون فحوص أو قواعد إلزامية فعالة وقت المراجعة. تُسجل أدلة تشغيل الفرع اليدوي منفصلة دون اختلاق فحص إلزامي أو تشغيل ناتج عن PR. استند الدمج المعتمد إلى المراجعات الدقيقة والمهام الأربع الناجحة وتطابق الشجرة الكامل.

### Security remediation and bounded residual risk | المعالجة الأمنية والمخاطر المتبقية المحدودة

Security commit `6af3a274f3dc329977693a374c7100d212906a7b` changed dependency manifests only; application source, migrations, workflow and package scripts were unchanged by that remediation.

اقتصر الالتزام الأمني المذكور على ملفي الاعتماديات؛ لم تغير المعالجة مصادر التطبيق أو الترحيلات أو مسار CI أو أوامر الحزمة.

| Approved direct dependency / الاعتمادية المباشرة المعتمدة | Version / النسخة |
| --- | --- |
| Next.js | `16.4.2` |
| eslint-config-next | `16.4.2` |
| Sharp | `0.35.5` |

The reviewed hosted runtime audit reported **0 vulnerabilities**. The full audit retained **5 High affected package entries and 4 Moderate affected package entries**, corresponding to two reviewed development-only advisories: [Braces — High](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [esbuild — Moderate](https://github.com/advisories/GHSA-67mh-4wv8-2f99). The full-audit exit code 1 was assessed against those accepted residual findings; its nonblocking workflow setting alone did not establish acceptance. This is bounded historical hosted audit evidence, not a claim of a vulnerability-free full dependency tree or permanent security clearance. No fresh audit or dependency update was performed by this documentation task.

أبلغ تدقيق التشغيل المستضاف المراجع عن **صفر ثغرات تشغيلية**. أبقى التدقيق الكامل **خمسة إدخالات حزم متأثرة عالية الخطورة وأربعة متوسطة** مرتبطة بإرشادي Braces العالي وesbuild المتوسط المراجعين ضمن اعتماديات التطوير فقط. قُيّم خروج التدقيق الكامل بالرمز 1 وفق هذه المخاطر المقبولة، وليس لمجرد أن خطوته غير مانعة. الدليل مستضاف وتاريخي ومحدود، ولا يعني خلو كامل شجرة الاعتماديات أو اعتماداً أمنياً دائماً. لم تُشغل هذه المهمة تدقيقاً جديداً أو تحديث اعتماديات.

### Review provenance and acceptance boundary | مصدر المراجعة وحدود القبول

The accepted implementation/security/concurrency re-review of F1–F6 was PASS under **reconstructed fallback criteria**, with retained independent adversarial, tenant/concurrency, audit and migration probes. The original standalone independent review report remains unavailable and was not recovered or examined. Fallback assessment is not an exact reproduction of unavailable original criteria. The [implementation candidate report](QSC-Task-3.23-P4-Implementation-Candidate-Report.md) and [remediation report](QSC-Task-3.23-P4-Remediation-Candidate-Report.md) remain unchanged; their dated HOLD decisions and earlier counts retain their original provenance. Ignored machine-local probes support the review but are not a portable substitute for the missing original review.

نجحت إعادة مراجعة التنفيذ والأمن والتزامن لـF1–F6 وفق **معايير بديلة معاد بناؤها**، مع أدلة مستقلة محفوظة للحالات العدائية وعزل المستأجرين والتزامن والتدقيق والترحيل. ما زال التقرير الأصلي المستقل المنفصل غير متاح، ولم يُستعد أو يُفحص؛ لا تمثل المراجعة البديلة استنساخاً دقيقاً لمعاييره غير المتاحة. يبقى تقرارا المرشح والمعالجة المرتبطان دون تغيير مع قرارات HOLD وأعدادهما ومصادرهما الأصلية. تدعم الأدلة المحلية المتجاهلة المراجعة، ولا تحل كتقرير قابل للنقل محل التقرير الأصلي المفقود.

### Migration, precision and deployment | الترحيل والدقة والنشر

Migration `0017_public_product_share_grants.sql` was generated and verified by application to disposable PostgreSQL, including hosted CI. Predecessor journal entries and snapshot lineage were checked. Migration 0017 MUST be applied before enabling runtime writers that depend on the new grant table. This documentation task applied no migration and changed no database; it did not apply 0017 to production.

وُلد الترحيل 0017 وتحقق تطبيقه في PostgreSQL مؤقتة ومعزولة، بما فيها CI المستضافة، وفُحص سجل الترحيلات السابقة وتسلسل اللقطات. يجب تطبيقه قبل تفعيل الكتّاب المعتمدين على جدول التفويض الجديد. لم تطبق مهمة التوثيق ترحيلاً ولم تغير قاعدة بيانات، ولم تطبق 0017 في الإنتاج.

The known timestamp boundary remains: PostgreSQL checks finite millisecond **stored timestamps after native microsecond conversion**. Some overprecise original SQL inputs, including `.1230004` or `.1229996`, may round to stored `.123` before constraint evaluation. Strict raw-text readers reject unsupported nonzero fractional digits beyond milliseconds before Date conversion; `.123000` is supported and `.123456` is rejected. Do not interpret the stored-instant constraint as rejecting every overprecise original SQL input. Stored revocation ordering and immutable timestamp CAS remain enforced; inspection time has its separate statement-evidence boundary.

يبقى حد الدقة المعروف: تفحص PostgreSQL الأزمنة المخزنة المنتهية بدقة الملليثانية بعد تحويلها الأصلي إلى الميكروثانية. قد تُقرب المدخلات الأصلية المذكورة إلى `.123` قبل تقييم القيد. يرفض قارئ النص الخام الأرقام غير الصفرية غير المدعومة بعد الملليثانية قبل Date؛ تُقبل `.123000` وتُرفض `.123456`. لا يعني قيد الزمن المخزن رفض كل إدخال SQL أصلي زائد الدقة. يبقى ترتيب الإلغاء وCAS محفوظين، ولوقت الفحص حد أدلة العبارة المنفصل.

### Residual risks and handoff | المخاطر المتبقية وتسليم المرحلة

Maintenance follow-ups remain for GitHub Actions Node-runtime deprecations/forced Node 24 execution, Ubuntu runner-image migration, `punycode`/`url.parse()` and esbuild-kit warnings. Disposable PostgreSQL locale/local-auth warnings were confined to CI; expected constraint/synthetic errors belonged to passing negative tests. No tooling update or production-configuration guarantee is implied. Upstream token-log redaction, distributed admission, production key operations and rollout remain later release gates.

تبقى متابعة صيانة تحذيرات تشغيل إجراءات GitHub والتشغيل المفروض على Node 24 وانتقال صورة Ubuntu وتحذيرات `punycode` و`url.parse()` وesbuild-kit. اقتصرت تحذيرات اللغة والمصادقة المحلية لـPostgreSQL على CI المؤقتة؛ ارتبطت أخطاء القيود والأعطال الاصطناعية المتوقعة باختبارات سلبية ناجحة. لا يعني ذلك تحديث أدوات أو ضمان إعداد إنتاجي. تبقى حماية السجلات من الرمز والقبول الموزع وعمليات مفاتيح الإنتاج والنشر ضمن بوابات الإصدار اللاحقة.

**Task 3.23: IN PROGRESS. P5: READY FOR PLANNING ONLY; P5 implementation: NOT STARTED / GATED. P6 and P7: NOT STARTED / GATED. Production deployment: NOT COMPLETED. DurableCoverage: UNCHECKED.** A separate owner-approved bounded P5 plan is required before any separately authorized P5 implementation; planning readiness grants no implementation authority.

**المهمة 3.23: قيد التنفيذ. P5: جاهزة للتخطيط فقط؛ تنفيذ P5: لم يبدأ / مشروط بالاعتماد. P6 وP7: لم تبدآ / مشروطتان بالاعتماد. النشر الإنتاجي: غير مكتمل. DurableCoverage: UNCHECKED.** يلزم تخطيط محدود لـP5 يوافق عليه المالك قبل اعتماد تنفيذها بصورة منفصلة؛ الجاهزية للتخطيط ليست تصريحاً بالتنفيذ.

P4 excludes management HTTP/UI activation, anonymous resolution/media, SSR release integration, production rotation jobs and permanent durable-coverage certification. P4 integration does not complete Task 3.23 or a production deployment. No P5 plan or implementation is created by this closeout.

تستبعد P4 تفعيل HTTP/UI الإداري والحل المجهول والوسائط وتكامل إصدار SSR ووظائف تدوير الإنتاج والاعتماد الدائم للتغطية. لا يكمل دمج P4 المهمة 3.23 أو النشر الإنتاجي، ولا ينشئ هذا الإغلاق خطة P5 أو تنفيذها.

**Documentation candidate scope / نطاق مرشح التوثيق:** Only the four current-authority documents and this existing report are modified. Files created: NONE; files deleted: NONE; architecture changes: NONE. All earlier report bodies and approved technical requirements remain preserved. No staging, commit, push, PR, merge, deployment, migration, dependency/workflow/source change or later-phase implementation is authorized by this documentation candidate.

**نطاق مرشح التوثيق:** تقتصر التعديلات على وثائق المرجعية الأربع وهذا التقرير الحالي. لا ملفات منشأة أو محذوفة ولا تغييرات معمارية. تُحفظ متون التقارير والمتطلبات التقنية السابقة. لا يصرح المرشح بالتجهيز أو الالتزام أو الدفع أو PR أو الدمج أو النشر أو الترحيل أو تغيير الاعتماديات أو CI أو المصادر أو تنفيذ مراحل لاحقة.

**Next recommendation / التوصية التالية:** Independently review the five-file closure diff and documentation verification, then obtain explicit owner approval before staging/committing and any later Git action. P5 requires a separate owner-approved bounded plan before separate implementation authorization; P6/P7 remain gated. / تُراجع مستقلاً فروق الوثائق الخمس وفحوصها، ثم يُطلب اعتماد المالك الصريح قبل التجهيز أو الالتزام وأي عملية Git لاحقة. تتطلب P5 خطة محدودة يعتمدها المالك قبل تصريح تنفيذ منفصل، وتبقى P6 وP7 مشروطتين.
