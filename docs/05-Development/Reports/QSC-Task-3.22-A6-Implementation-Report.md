# QSC Task 3.22-A6 Implementation Report | تقرير تنفيذ المهمة 3.22-A6

> **Delivery reconciliation — 2026-09-10:** A6 is **Completed / merged through PR #35**, merge baseline `08e0d0dd0237c80ba52dcd12caec7f825ab2a5a6`. See the [post-A6 gate report](QSC-Task-3.22-Presentation-Gate-Reconciliation-Report.md): `ApprovedNextImplementation` for P1 only; no Presentation implementation. The original report below is preserved as implementation-session evidence, including its then-unmerged status, verification results and review recommendation; those historical statuses are superseded by this notice. | **مصالحة التسليم:** اكتملت A6 ودُمجت عبر #35 عند خط الدمج المذكور. يثبت تقرير البوابة اعتماد P1 وحدها تالياً دون تنفيذ الواجهة. يُحفظ التقرير الأصلي أدناه دليلاً لجلسة التنفيذ بحالة عدم الدمج آنذاك ونتائج التحقق وتوصية المراجعة؛ يستبدل هذا الإشعار حالاته التاريخية.

## Historical Summary | الملخص التاريخي

**Implementation completed locally / Ready for independent review.** A6 has not been merged. This A6-3 session preserved all eight previously reviewed source/test files and performed verification plus delivery documentation only. Task 3.22 Presentation remains **Blocked**, including P1, until A6 independent review and merge plus renewed Presentation gate reconciliation.

**اكتمل التنفيذ محلياً / جاهز للمراجعة المستقلة.** لم تُدمج A6. حفظت جلسة A6-3 ملفات المصدر والاختبار الثمانية التي راجعت سابقاً، واقتصرت على التحقق وتوثيق التسليم. تبقى واجهة 3.22 **Blocked** بما فيها P1 حتى مراجعة A6 المستقلة ودمجها وإعادة مصالحة بوابة الواجهة.

- Branch / الفرع: `feature/task-3.22-a6-operational-branch-selector`.
- HEAD and implementation baseline / HEAD وخط أساس التنفيذ: `51562151d9be79b0f6be50c6406cb207c81e70aa`.
- Verified / تاريخ التحقق: 2026-09-09.
- Planning decision remains / يبقى قرار التخطيط: `ApprovedForImplementation`.

## Preserved implementation | التنفيذ المحفوظ

Workspace Branch Application owns `ListOperationalBranchesUseCase`. It uses effective permissions from `TrustedActorContext`, with no role-only Owner bypass. Each row is projected explicitly to readonly `branchId`, `code`, `displayName`, `status` (`Active` or `Inactive`). Both lifecycle states are retained for every purpose, including Transfer. Reservation selection uses Inventory authority; existing Reservation actions and mutation validation remain unchanged.

تملك طبقة تطبيق فروع مساحة العمل حالة الاستخدام، وتعتمد صلاحيات السياق الموثوق دون تجاوز مبني على دور المالك وحده. تُسقط أربعة حقول فقط للمعرف والرمز والاسم والحالة، وتُحفظ الحالتان لكل الأغراض بما فيها التحويل. يستخدم اختيار الحجز سلطة Inventory، دون تغيير أفعال الحجز أو تحقق الطفرات.

| Exact purpose / الغرض المطابق | Any one existing permission / تكفي صلاحية حالية واحدة |
| --- | --- |
| `Listing` | `catalog.product.edit`, `catalog.products.edit` |
| `Inventory` | `inventory.availability.view`, `inventory.quantity.view`, `inventory.receive`, `inventory.issue`, `inventory.reserve`, `inventory.damage`, `inventory.adjust` |
| `Transfer` | `inventory.transfer` |
| `BranchPricing` | `pricing.branchOverride.manage` |
| `BranchReferenceCost` | `referenceCost.branchOverride.manage` |

The use case reads `BranchRepository.list(context.workspaceId)` through the existing Unit of Work. It rejects a foreign-Workspace row before scope filtering, preserves relative repository order after trusted Branch-scope filtering, and performs no re-sort. The port has no independent three-key ordering promise. PostgreSQL's current `sortOrder ASC, displayName ASC, branchId ASC` behavior is verified in persistence tests only; HTTP preserves the Application result order. No writes, locks, audit events, search, or pagination were added to A6.

تقرأ الحالة عبر المستودع ووحدة العمل الحاليين ضمن مساحة العمل الموثوقة، وترفض أي صف أجنبي قبل ترشيح نطاق الفروع، وتحفظ ترتيب المستودع النسبي دون إعادة فرز. لا يضمن عقد المستودع المقارن الثلاثي؛ يُختبر ترتيب PostgreSQL الحالي في الاستمرارية فقط، وتحفظ HTTP ترتيب التطبيق. لم تضف A6 كتابة أو أقفالاً أو أحداث تدقيق أو بحثاً أو صفحات.

`GET /api/branches/operational?purpose=...` requires exactly one purpose and rejects every other query key. Authentication/restricted-session checks precede input processing. Success is `{ type: "Success", value: OperationalBranchOption[] }`, including authorized empty arrays. Errors retain the approved 400/401/403/503 contracts, including sanitized `BranchServiceUnavailable` for infrastructure/foreign-Workspace failures. All A6 outcomes use `Cache-Control: private, no-store`. General Branch List/Get behavior is preserved. Runtime reuses existing Identity resolution and PostgreSQL Unit of Work.

يتطلب المسار غرضاً واحداً ويرفض بقية معاملات الاستعلام، مع أسبقية المصادقة والجلسة المقيدة. يشمل النجاح المصفوفة الفارغة المصرح بها، وتحفظ الأخطاء العقود المعتمدة دون كشف تفاصيل البنية أو مساحة عمل أجنبية. كل نتائج A6 خاصة وغير مخزنة، ولم يتغير سلوك قراءة الفروع العامة. يعيد الربط استخدام سياق الهوية ووحدة العمل الحاليين.

## PostgreSQL preparation and safety | تجهيز PostgreSQL والأمان

Inspected `package.json`, `docker-compose.yml`, `docs/05-Development/PostgreSQL-Development.md`, `scripts/integration/prepare-integration-test-database.ts`, and the existing integration database guard. The documented service is `postgres`. `docker compose ps` initially encountered sandbox access denial; the same read-only command outside the sandbox showed the existing `postgres:17-alpine` container healthy on `127.0.0.1:5432`. It was already running: no startup, database creation, configuration change, or volume operation was needed.

فُحصت سكربتات الحزم وCompose ووثيقة التطوير وسكربت تجهيز التكامل وحاجز الأمان الحالي. الخدمة الموثقة هي `postgres`. منع العزل فحص Docker أولاً، ثم أظهر الفحص نفسه خارج العزل الحاوية الحالية سليمة وتعمل محلياً. لم نحتج إلى تشغيلها أو إنشاء قاعدة أو تغيير إعدادات أو إجراء على وحدة التخزين.

The configured process `TEST_DATABASE_URL` targets dedicated `quadcore_smart_catalog_test`, canonical loopback, port 5432. `assertSafeIntegrationTestDatabaseUrl(TEST_DATABASE_URL, DATABASE_URL)` passed; the application URL was present and its database distinct. An extra initial check against the documentation's example name `qsc_test` failed because the configured safe database has a different test name. The real repository guard passed throughout; the URL was retained unchanged. Credentials and full URLs were never printed. `npm.cmd run test:integration:prepare` passed using the existing committed migrations on the dedicated test database only. No application `db:migrate` command or new migration was used.

يشير رابط الاختبار المهيأ إلى `quadcore_smart_catalog_test` المحلية على المنفذ 5432، واجتاز حاجز المستودع مع وجود رابط التطبيق واختلاف قاعدة بياناته. فشل فحص إضافي أولي لاسم المثال `qsc_test` فقط لاختلاف اسم قاعدة الاختبار الحالية؛ نجح حاجز الأمان الحقيقي وبقي الرابط دون تغيير. لم تُطبع بيانات اعتماد أو روابط كاملة. نجح سكربت التجهيز بالترحيلات الملتزم بها على قاعدة الاختبار المخصصة فقط، دون تشغيل ترحيل التطبيق أو إضافة ترحيل جديد.

## Verification commands and actual results | أوامر التحقق ونتائجها الفعلية

PowerShell uses `npm.cmd` / `npx.cmd` equivalents without changing execution policy. Every successful test result below has zero failures and zero skips. | استُخدمت مكافئات Windows دون تغيير سياسة التنفيذ. كل نتيجة ناجحة أدناه دون إخفاق أو تخطٍ.

| Command actually run / الأمر المنفذ | Result / النتيجة |
| --- | --- |
| `docker compose ps` | Existing PostgreSQL healthy / الحاوية الحالية سليمة |
| `npm.cmd run test:integration:prepare` | PASS, exit 0 / نجح |
| `npx.cmd tsc --project tsconfig.integration.json` | PASS, exit 0 / نجح |
| `node --test --test-concurrency=1 .next/integration-tests/domains/workspace/branches/infrastructure/persistence/postgresql-branch.integration.test.js` | 4/4 PASS: Workspace isolation, all three sort keys including ties, Active/Inactive coexistence / نجحت اختبارات العزل ومفاتيح الترتيب الثلاثة والتعادل والحالتين |
| `npx.cmd tsx --test domains/workspace/branches/application/list-operational-branches.use-case.test.ts` | 22/22 PASS / نجح |
| `npx.cmd tsx --test domains/workspace/branches/infrastructure/http/branch-route-handlers.test.ts` | 15/15 PASS / نجح |
| `npm.cmd run test:branch` | 40/40 PASS / نجح |
| `npm.cmd run test:identity` | 124/124 PASS, including A1 / يشمل A1 |
| `npm.cmd run test:catalog-query` | 32/32 PASS, including A2 / يشمل A2 |
| `npm.cmd run test:pricing` | 28/28 PASS, including A4 / يشمل A4 |
| `npm.cmd run test:inventory` | 33/33 PASS, including A3/A5 / يشمل A3 وA5 |
| `npx.cmd tsc --noEmit` | PASS, exit 0 / نجح |
| `npm.cmd run lint` | PASS, exit 0 / نجح |
| `npm.cmd run build` | PASS, exit 0; `/api/branches/operational` included / نجح وشمل المسار الجديد |
| `npm.cmd run test:integration` (isolated rerun / إعادة منفردة) | 140/140 PASS, 26 suites, exit 0 / نجحت 26 مجموعة |
| `git diff --check` | PASS, exit 0; only Git line-ending notices / نجح مع إشعارات نهايات الأسطر فقط |

The first broader integration invocation failed (121 passed, 3 failed): the overlapping Next build refreshed `.next`, leaving two compiled test modules unavailable, and an existing Identity simultaneous-login/failed-attempt assertion observed 4 instead of 0. After build completion, the identical integration script ran alone and passed all 140 tests, including that assertion. The Identity assertion's intermittent cause was not established; no source, timing, assertion, or test semantics were changed. This first failure remains disclosed for review. Never overlap Next build with integration compilation/execution.

فشل تشغيل التكامل الأوسع الأول (121 نجاحاً و3 إخفاقات): جدد بناء Next المتزامن مجلد `.next` فغابت وحدتا اختبار مترجمتان، ورصد تأكيد تزامن تسجيل الدخول الحالي للهوية القيمة 4 بدلاً من 0. بعد اكتمال البناء نجح السكربت نفسه منفرداً بكل اختباراته البالغ عددها 140، بما فيها التأكيد المذكور. لم يُحسم سبب تذبذب تأكيد الهوية ولم يتغير المصدر أو التوقيت أو التأكيد أو دلالة الاختبار. يُحفظ الإخفاق الأول للمراجعة. يجب فصل البناء عن ترجمة اختبارات التكامل وتشغيلها.

## Files Created | الملفات المنشأة

Relative to baseline; the first four already existed when A6-3 resumed. Only the implementation report was created in this session. | نسبةً لخط الأساس؛ كانت الملفات الأربعة الأولى موجودة عند الاستئناف، وأُنشئ التقرير فقط في هذه الجلسة.

- `app/api/branches/operational/route.ts`
- `domains/workspace/branches/application/operational-branch-selector.ts`
- `domains/workspace/branches/application/list-operational-branches.use-case.ts`
- `domains/workspace/branches/application/list-operational-branches.use-case.test.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-A6-Implementation-Report.md`

## Files Modified | الملفات المعدلة

Previously reviewed changes preserved unchanged / تغييرات سابقة معتمدة حُفظت دون تعديل:

- `domains/workspace/branches/infrastructure/branch-server-runtime.ts`
- `domains/workspace/branches/infrastructure/http/branch-route-handlers.ts`
- `domains/workspace/branches/infrastructure/http/branch-route-handlers.test.ts`
- `domains/workspace/branches/infrastructure/persistence/postgresql-branch.integration.test.ts`

Delivery status updates in this session / تحديثات حالة التسليم في هذه الجلسة:

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md`
- `docs/05-Development/Reports/QSC-Task-3.22-A6-Planning-Report.md`

## Files Deleted | الملفات المحذوفة

None / لا يوجد.

## Architecture Changes | تغييرات المعمارية

None. TypeScript, DDD, Clean Architecture, Modular Monolith and Multi-Tenant boundaries remain intact. **NO DOMAIN CHANGE; NO REPOSITORY CONTRACT CHANGE; NO DATABASE CHANGE; NO SCHEMA CHANGE; NO MIGRATION; NO migration 0016; NO NEW DEPENDENCY; NO NEW PERMISSION; ADR NOT REQUIRED; NO PRESENTATION IMPLEMENTATION.** Existing test-database preparation and test fixture writes do not introduce schema or migration changes.

لا يوجد. حُفظت TypeScript وDDD والمعمارية النظيفة والتطبيق الأحادي المعياري وتعدد المستأجرين. لا تغيير مجال أو عقد مستودع أو قاعدة أو مخطط، ولا ترحيل جديد أو 0016، ولا اعتماد أو صلاحية جديدة، ولا حاجة إلى ADR، ولا تنفيذ للواجهة. تجهيز قاعدة الاختبار وبيانات الاختبار الحاليان لا يضيفان تغيير مخطط أو ترحيل.

## Git and review delivery | Git وتسليم المراجعة

`git status`: eight modified tracked files and five untracked files; nothing staged or deleted. `git diff --stat`: **8 files changed, 228 insertions(+), 17 deletions(-)**. Standard diff statistics exclude the five untracked files listed above. No add, commit, push, merge, rebase, reset, restore, stash, or branch switch was performed.

حالة Git: ثمانية ملفات متتبعة معدلة وخمسة غير متتبعة، دون ترحيل أو حذف. لا تشمل إحصائية الفرق الملفات الخمسة غير المتتبعة. لم يُنفذ أي إجراء Git محظور.

The established review bundle collects byte-exact sources and sanitized evidence, excludes credentials/environment files, and runs its required checks sequentially. Its manifest is authoritative for the later bundle verification results. Both optional audit commands are explicitly disabled; no `npm audit` was run. | تجمع حزمة المراجعة المصدر المطابق وأدلة منقحة دون أسرار أو ملفات بيئة، وتشغل فحوصها المطلوبة بالتتابع. يمثل بيانها نتائج تحقق الحزمة اللاحق، مع تعطيل أمري التدقيق الاختياريين صراحة دون تشغيل `npm audit`.

## Next Recommendation | التوصية التالية

Independently review the preserved A6 implementation, PostgreSQL evidence, disclosed first integration failure, delivery status updates, and automated review bundle. A6 is not merged. Stop here; Task 3.22 Presentation remains **Blocked** until A6 independent review and merge plus renewed Presentation gate reconciliation.

راجع مستقلاً تنفيذ A6 المحفوظ وأدلة PostgreSQL وإخفاق التكامل الأول المعلن وتحديثات الحالة وحزمة المراجعة الآلية. لم تُدمج A6. التوقف هنا؛ تبقى واجهة 3.22 **Blocked** حتى مراجعة A6 المستقلة ودمجها وإعادة مصالحة بوابتها.
