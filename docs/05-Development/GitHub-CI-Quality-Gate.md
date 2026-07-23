# GitHub CI Quality Gate | بوابة جودة GitHub CI

**Status:** Active
**Scope:** DEV-002 continuous integration

## English

### Purpose and triggers

`.github/workflows/quality-gate.yml` independently validates relevant pushes and pull requests in a clean Ubuntu environment. It runs for pushes and pull requests targeting `main` or `feature/product-entry-engine`, and it supports manual `workflow_dispatch` runs. A newer run for the same workflow and Git reference cancels the older run.

The workflow has exactly two blocking jobs: `Quality` and `PostgreSQL Integration`. Workflow permissions are limited to `contents: read`; it does not deploy, publish, write repository content, use production secrets, or run the DEV-001 review bundle.

### Node.js and commands

`.nvmrc` is the single repository-owned Node.js contract and pins Node.js `24.18.0` LTS. Both jobs read that file through `actions/setup-node` and install the lockfile with `npm ci` plus npm caching.

Windows local commands use `npm.cmd` and `npx.cmd`. Ubuntu CI commands use platform-neutral `npm` and `npx`. The `Quality` job validates TypeScript, lint, unit tests, the production build, and Drizzle metadata. Runtime and full dependency audits remain visible but are non-blocking baseline observations for DEV-002; `npm audit fix`, overrides, and dependency downgrades are not used. A future `SEC-001` task will introduce a baseline-aware blocking audit gate.

### PostgreSQL integration and safety

`PostgreSQL Integration` starts an ephemeral PostgreSQL 17 service on `127.0.0.1` with test-only credentials. It explicitly creates `qsc_ci` for application migration validation and `qsc_ci_test` for integration tests. `DATABASE_URL` and `TEST_DATABASE_URL` therefore use separate CI-oriented database names on the loopback service. Credentials are not printed. The job compiles the integration TypeScript project, applies the committed Drizzle migrations to the clean `qsc_ci` database with `npm run db:migrate`, and runs the PostgreSQL suite against `qsc_ci_test`. The existing integration safety guard executes before connections and destructive test setup; service cleanup is handled by GitHub Actions.

### Manual branch protection after merge

In GitHub repository settings, protect `main` and `feature/product-entry-engine` manually:

1. Require the `Quality` status check.
2. Require the `PostgreSQL Integration` status check.
3. Block force pushes.

Do not require another reviewer while there is only one active developer. Enable reviewer requirements when another developer joins. DEV-002 does not automate or modify these settings.

### Known limitations and future work

Local YAML inspection is not a GitHub-hosted run. Hosted success can be claimed only after workflow evidence exists from a push, pull request, or manual run. The CI gate does not generate DEV-001 evidence, enforce architecture dependencies, compare audit results with an accepted security baseline, or test media processing. After Task 3.14.7, add the planned Windows/Ubuntu media compatibility matrix. `SEC-001` will add baseline-aware audit enforcement, and `DEV-003` will add an architecture dependency guard.

## العربية

### الغرض والمشغلات

يتحقق الملف `.github/workflows/quality-gate.yml` بصورة مستقلة من عمليات الدفع وطلبات السحب ذات الصلة داخل بيئة Ubuntu نظيفة. يعمل عند الدفع أو طلب السحب إلى `main` أو `feature/product-entry-engine`، ويدعم التشغيل اليدوي عبر `workflow_dispatch`. يُلغى التشغيل الأقدم عند بدء تشغيل أحدث لنفس سير العمل ومرجع Git.

يحتوي سير العمل على مهمتين حاجزتين فقط: `Quality` و`PostgreSQL Integration`. تقتصر الصلاحيات على `contents: read`، ولا ينشر النظام أو يكتب في المستودع أو يستخدم أسرار الإنتاج أو يشغل حزمة مراجعة DEV-001.

### Node.js والأوامر

يمثل `.nvmrc` العقد الوحيد لإصدار Node.js داخل المستودع، ويثبت إصدار LTS رقم `24.18.0`. تقرأ المهمتان هذا الملف عبر `actions/setup-node`، وتثبتان ملف القفل باستخدام `npm ci` مع تفعيل ذاكرة npm المؤقتة.

تستخدم أوامر Windows المحلية `npm.cmd` و`npx.cmd`، بينما تستخدم بيئة Ubuntu في CI الأمرين المحايدين `npm` و`npx`. تتحقق مهمة `Quality` من TypeScript وlint واختبارات الوحدة وبناء الإنتاج وبيانات Drizzle الوصفية. تبقى نتائج تدقيق اعتماديات التشغيل وجميع الاعتماديات ظاهرة وغير حاجزة ضمن خط الأساس المقبول مؤقتاً في DEV-002، من دون استخدام `npm audit fix` أو overrides أو خفض الإصدارات. ستضيف مهمة `SEC-001` المستقبلية بوابة حاجزة تقارن النتائج بخط أساس أمني.

### تكامل PostgreSQL والسلامة

تشغّل مهمة `PostgreSQL Integration` خدمة PostgreSQL 17 مؤقتة على `127.0.0.1` ببيانات اختبار فقط. تنشئ صراحة قاعدة `qsc_ci` للتحقق من ترحيلات التطبيق وقاعدة `qsc_ci_test` لاختبارات التكامل. لذلك يشير `DATABASE_URL` و`TEST_DATABASE_URL` إلى قاعدتين منفصلتين مخصصتين لـ CI على خدمة loopback، من دون طباعة بيانات الاعتماد. تجمع المهمة مشروع TypeScript الخاص بالتكامل، وتطبق ترحيلات Drizzle الملتزم بها على قاعدة `qsc_ci` النظيفة باستخدام `npm run db:migrate`، ثم تشغل اختبارات PostgreSQL على `qsc_ci_test`. يعمل حاجز السلامة الحالي قبل الاتصال أو الإعداد الاختباري المتلف، وتتولى GitHub Actions تنظيف الخدمة المؤقتة.

### حماية الفروع يدوياً بعد الدمج

احمِ الفرعين `main` و`feature/product-entry-engine` يدوياً من إعدادات مستودع GitHub:

1. اجعل فحص الحالة `Quality` مطلوباً.
2. اجعل فحص الحالة `PostgreSQL Integration` مطلوباً.
3. امنع الدفع القسري.

لا تشترط مراجعاً إضافياً ما دام للمشروع مطور نشط واحد فقط. فعّل شرط المراجعين عند انضمام مطور آخر. لا تعدل DEV-002 هذه الإعدادات آلياً.

### القيود والعمل المستقبلي

الفحص المحلي لبنية YAML لا يعادل تشغيلاً مستضافاً في GitHub. لا يجوز إعلان نجاح الاستضافة إلا بوجود دليل تشغيل فعلي ناتج عن دفع أو طلب سحب أو تشغيل يدوي. لا تنشئ بوابة CI أدلة DEV-001، ولا تفرض تبعيات المعمارية، ولا تقارن التدقيق بخط أساس أمني مقبول، ولا تختبر معالجة الوسائط. بعد المهمة 3.14.7 تُضاف مصفوفة توافق الوسائط المخطط لها بين Windows وUbuntu. ستضيف `SEC-001` تدقيقاً واعياً بخط الأساس، وستضيف `DEV-003` حاجز تبعيات المعمارية.
