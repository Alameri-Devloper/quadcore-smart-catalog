# Task 3.23-P2 — Mechanism A Release Runbook | دليل إصدار الآلية A

Date / التاريخ: 2026-10-08. Scope / النطاق: P2 specification-template deployment compatibility only / توافق نشر قوالب المواصفات في P2 فقط.

## English

### Mandatory policy and authority

**Every P2 deployment and subsequent release capable of writing specification templates MUST use Mechanism A: one active application writer plus a controlled maintenance-write window.** Exactly one application writer may operate normally; zero writers operate during migration. Before any `publicVisibility="public"` can be created, every active writer must be P2-compatible. Do not permit rolling replacement, concurrent old/new writers, or automatic restart of a stopped legacy release.

This operational policy implements [P2 planning sections 20 and 24](../06-Roadmap/Task-3.23-P2-Visibility-Transport-and-Editor-Planning.md), the [implementation contract](../06-Roadmap/Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md) and [ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md). It adds no application code, framework, orchestrator, feature flag, maintenance subsystem, worker, proxy, dependency or architecture change. P2 completion still requires independent review and its other gates; P3–P7 remain gated and unstarted.

The repository documents a single-server local-media constraint in [Infrastructure](README.md) and ADR-012, but defines no production application service or hosting provider. This policy binds future releases; it does not establish an existing production topology. A hosting platform that cannot demonstrate this sequence MUST NOT receive a P2 release or enable Public editing.

### Writer inventory

| Path | Classification and actual contract |
| --- | --- |
| Existing Reference Data editor, coordinator and management client | Production P2-compatible transport: entry state carries explicit visibility; PUT submits those entries. |
| `/api/catalog/reference-data/product-types/[id]/specification-template` PUT and HTTP handler | Production P2-compatible: strict optional visibility input; delegates to the trusted Application use case. |
| `ConfigureProductTypeSpecificationTemplateUseCase.execute` | Production P2-compatible: tenant-scoped locked canonical preimage, version validation, omission preservation by Definition ID, new-entry `internal` default and transactional audit. |
| `PostgreSqlCatalogReferenceDataRepository.configureTemplate` through the Unit of Work | Only discovered production persistence writer: replacement inserts validated visibility with Definition ID, sortOrder and required. |
| Application/HTTP in-memory test writers; Reference Data and Catalog Query PostgreSQL fixtures; client test requests | Test-only, including deliberate three-field inputs/inserts and invalid visibility writes. Never deploy or run test preparation against manual QA or production data. |
| `0012_catalog_reference_data.sql`; `0016_specification_template_public_visibility.sql` | Migration-only: original table definition; visibility expansion/default/constraint. |
| Snapshot/locked reads, Product Entry reference loading, Sharing read contracts, mock template repositories and `SpecificationTemplateService` | Read-only; no canonical template persistence mutation. |

Reconfirmed candidate sources: [Application](../../domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts), [repository](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts), [runtime composition](../../domains/catalog/reference-data/infrastructure/catalog-reference-data-server-runtime.ts), [HTTP](../../domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.ts) and [editor](../../domains/catalog/reference-data/presentation/catalog-reference-template-manager.tsx). No other production template writer was found in `app`, `domains`, `shared` or `scripts`. Operators must separately inventory external tools and scheduled processes; repository search cannot exclude them.

Baseline `1c5e19c` is a historical source revision with a legacy three-field replacement writer. Git availability does not mean that revision is deployed. Record actual process/release identities rather than treating historical source as an active runtime.

### PRE-DEPLOY

1. Record operator, target environment, previous release commit, target release commit, artifact/source identity, application service/process identity, writer count and maintenance timestamps. A dirty local candidate must be identified by baseline plus source hashes; do not label the baseline itself a P2 release. A real deployment requires an identified reviewed release.
2. Reconfirm all writer contracts, including external writers. Confirm migration `0016` and its journal entry are present in the same release. Prepare the candidate build with the existing `npm.cmd run build` command (Unix hosts use `npm`). Do not build over a running release's mutable output directory.
3. [PostgreSQL Development](../05-Development/PostgreSQL-Development.md) documents local backup/restore examples and committed SQL migrations, not a production backup policy or retention guarantee. Confirm an existing approved backup/recovery procedure for the target if one exists; do not invent a policy or claim a backup was taken. Any required recovery decision belongs to approved database operations.
4. Announce maintenance and prevent user/API writes using the hosting platform's existing controls. Record the concrete control and verify it. Notification alone is insufficient for production. Keep operator smoke access isolated while ordinary users remain blocked. If existing hosting controls cannot do this, stop release acceptance; do not add a subsystem in this task.

### STOP AND PROVE ZERO WRITERS

1. Disable the old release's existing automatic restart/relaunch behavior for the maintenance window. Drain requests using existing hosting controls; verify in-flight writes finish. If termination is necessary, verify transaction rollback/completion and zero remaining writes before migration. Record which method was used.
2. Stop the old application service/process with its existing platform mechanism. Stop any separately discovered template writers as well.
3. Verify the old process identifiers are absent, all target application listeners are absent, all relevant hosts/services contain zero application writers, and no template-writing transaction remains. PostgreSQL container count is not application writer count. A free port alone cannot exclude a background writer or another host.
4. If any proof fails, keep writes blocked and do not migrate. Do not kill unrelated Node tooling or other applications.

### MIGRATE

With zero writers and user writes blocked, provision the confirmed target database configuration privately in the migration process environment. Execute only the repository migration command:

```powershell
npm.cmd run db:migrate
```

Never use schema push or integration preparation. Record exit code and sanitized output. Verify the database migration journal includes the exact `0016` SQL hash and timestamp from `drizzle/meta/_journal.json`; verify `public.catalog_specification_template_entries.public_visibility` is text, NOT NULL, default `'internal'`, and has the validated allowed-value CHECK for `internal` and `public`. Use read-only schema queries, not invalid writes against real fixtures. A successful no-op on an already migrated database proves command execution and state verification, not a fresh upgrade.

### START

Start exactly one writer from the identified compatible release using the existing command and existing hosting controls:

```powershell
npm.cmd run start
```

Record its process/service identity and verify the release/artifact identity, one application listener/server, no legacy process and no alternate writer. An npm launcher or Next CLI parent is not an additional application server; distinguish launchers from the process serving requests. Keep ordinary user writes blocked during smoke checks. Do not infer production exclusivity from this command alone.

### SMOKE AND OPEN

1. Confirm `/login` is reachable and the auth endpoint returns its expected unauthenticated behavior without exposing session cookies or credentials.
2. With an authorized operator account, log in and read authenticated Reference Data. Read the selected specification template and verify every canonical entry has valid visibility.
3. Perform an operator-approved safe canonical save using current `expectedVersion` and unchanged entry intent; read it again and confirm visibility preservation. Account for version/audit changes. Do not create Public data solely for release smoke or overwrite an unreviewed draft. Reconfirm that the running write path uses the compatible repository contract.
4. Record actual results. Without a safe QA account/session, local rehearsal may record only public/login/auth-denial smoke and mark authenticated reads/save NOT EXECUTED; it cannot claim login or browser QA acceptance. Production opening requires the full authorized smoke above.
5. Reopen user writes only when zero-old/one-new writer evidence, migration/schema checks and required smoke pass. Record maintenance end time and operator. If any check fails, keep the window closed.

### Rollback and failure handling

Before any Public value has **ever** been created, a controlled rollback may follow the existing compatibility limits while preserving the expanded schema and safe writer ordering. Absence of Public rows now does not prove Public data never existed. If history is unknown, apply the post-Public rule.

**After any Public value exists or has ever existed, never deploy/restart a legacy three-field template writer. Rollback must remain P2-compatible. Never drop `public_visibility` as ordinary rollback.** Keep stored values and the compatible server contract. Destructive data/schema recovery requires separate approval.

- Migration failure: application remains stopped; do not reopen writes; investigate or restore only under approved database operations.
- New-release start failure: keep writes blocked; do not restart an incompatible release after Public history exists or is unknown.
- Smoke failure: keep maintenance closed and investigate. No silent schema rollback, data reset or legacy restart.

### Operator evidence checklist

Record without secrets: operator; environment; previous/target release commits and candidate/artifact hashes; complete internal/external writer inventory; service/process identifiers; writer counts before stop, after stop and after start; write-block control and verification; drain/termination and transaction evidence; disabled restart behavior; maintenance start/end timestamps; migration command/result; journal/column/default/CHECK evidence; new release identity; login/auth/read/canonical-save smoke results; reopen decision; failure/rollback decision when applicable.

Do not record passwords, credential URLs, cookies, bearer tokens, key material or real environment-file contents. The separate [operationalization report](../05-Development/Reports/QSC-Task-3.23-P2-Mechanism-A-Final-Report.md) records this task's observed local evidence and limits.

### Local rehearsal and production boundary

Local rehearsal uses only the existing guarded `TEST_DATABASE_URL`, validated by `assertSafeIntegrationTestDatabaseUrl` against the original application `DATABASE_URL`, and requires canonical loopback plus an actual matching database identity. Override `DATABASE_URL` only in child process environments after that guard; never rewrite `.env` files. Do not run `test:integration:prepare`, truncate, reset or delete fixtures.

For this rehearsal the operator announced maintenance, observed zero active database transactions, stopped the identified local Next CLI/server, verified no writer/listener, ran the guarded migration command, checked schema, built/started one candidate server, checked safe HTTP behavior and stopped it afterward. Established idle browser sockets are not proof of in-flight writes; production still requires its existing enforced ingress/drain controls. This local stop/start procedure proves local executability only.

`OperationalMechanismDefined` and `ProductionEnvironmentVerified` are separate assessments. P2 planning requires a proven A or B mechanism; it does not explicitly require executing a production deployment before development acceptance. This mandatory policy and successful local rehearsal can support pre-production `PASS_A`, subject to review. Actual production deployment remains blocked until its operator supplies the topology/control/evidence checklist above. No production environment was accessed, and absence of a repo hosting definition does not prove no external deployment exists. Do not mark P2 COMPLETE here.

## العربية

### السياسة الإلزامية والنطاق

**يلتزم كل نشر لـP2 وكل إصدار لاحق يكتب قوالب المواصفات بالآلية A: كاتب تطبيق واحد نشط ونافذة صيانة كتابة مضبوطة.** أثناء التشغيل المعتاد يوجد كاتب واحد، وأثناء الترحيل لا يوجد أي كاتب. قبل السماح بإنشاء `publicVisibility="public"` يجب توافق جميع الكتّاب مع P2. يُمنع تداخل إصدار قديم وجديد أو إعادة تشغيل كاتب قديم تلقائياً.

يطبق الدليل قسمي 20 و24 من خطة P2 والعقد وADR-013 المرتبطة أعلاه، في نطاق توافق نشر القوالب فقط. لا يضيف شيفرة أو مكتبة أو إطار نشر أو منسقاً أو علم ميزة أو نظام صيانة أو خدمة أو عاملاً أو وكيلاً أو تغييراً معمارياً. لا يعلن اكتمال P2 ولا يفتح P3–P7.

توثق البنية التحتية قيد خادم واحد للوسائط المحلية، لكنها لا تحدد خدمة تطبيق إنتاجية أو مزود استضافة. هذه سياسة ملزمة للنشر المستقبلي وليست إثباتاً لبيئة إنتاج قائمة. إذا لم تستطع الاستضافة إثبات التسلسل والضوابط، يُحجب نشر P2 وتعديل الرؤية العامة.

### حصر الكتّاب

المحرر والمنسق والعميل ينقلون الرؤية صراحة؛ مسار PUT ومدخل HTTP يتحققان منها؛ حالة الاستخدام تقرأ القالب القانوني المقفل والمقيد بمساحة العمل، وتتحقق من النسخة وتحفظ رؤية الإدخال المحتفظ به عند غياب الحقل وتختار `internal` للإدخال الجديد؛ المستودع داخل وحدة العمل يكتب الرؤية المتحققة مع الحقول السابقة. هذه مسارات الإنتاج المتوافقة الوحيدة المكتشفة.

كتّاب الذاكرة وطلبات العميل وتهيئة PostgreSQL في الاختبارات فقط، حتى عند إدراج ثلاثة حقول أو محاولة قيم غير صالحة. ملفا 0012 و0016 خاصان بالترحيل. قراءات القالب وتحميل مراجع إدخال المنتج وعقود المشاركة والمستودعات الوهمية وخدمة القالب للقراءة فقط. لم يُكتشف كاتب إنتاج آخر؛ يجب على المشغل حصر الأدوات الخارجية والمهام المجدولة مستقلاً. الالتزام `1c5e19c` مصدر تاريخي، وليس دليلاً على عملية نشطة.

### قبل النشر

1. سجل المشغل والبيئة والتزامي الإصدار السابق والمستهدف وهوية ملفات الإصدار والخدمة والعمليات وعدد الكتّاب وأوقات الصيانة. المرشح المحلي غير الملتزم يُعرّف بخط الأساس وبصمات المصدر؛ لا تُسمَّ نسخة خط الأساس إصدار P2.
2. أعد فحص كل كتّاب القالب، وأثبت وجود ترحيل 0016 وسجله في الإصدار نفسه. استخدم أمر البناء الحالي `npm.cmd run build` دون البناء فوق ملفات إصدار يعمل بالفعل.
3. يوثق دليل PostgreSQL أمثلة نسخ واستعادة محلية، ولا يحدد سياسة نسخ إنتاجية أو مدة احتفاظ. تحقق من الإجراء المعتمد الموجود للهدف إن وجد، ولا تخترع سياسة أو تدّعي أخذ نسخة. تُحسم الاستعادة عبر عمليات قاعدة البيانات المعتمدة.
4. أعلن الصيانة وامنع كتابة المستخدمين وطلبات API بوسيلة الاستضافة الحالية، مع إثبات فعلي للمنع. الإعلان وحده غير كافٍ للإنتاج. اعزل وصول المشغل للفحص عن المستخدمين. إذا غابت وسيلة قائمة تكفل ذلك، أوقف قبول النشر ولا تضف نظاماً جديداً.

### الإيقاف وإثبات انعدام الكتّاب

عطّل إعادة تشغيل الإصدار القديم تلقائياً بالآلية القائمة، وصَرِّف الطلبات الجارية وتحقق من انتهاء الكتابات. إذا لزم إنهاء العملية، تحقق من اكتمال المعاملات أو تراجعها وانعدام الكتابات قبل الترحيل. أوقف خدمة التطبيق القديمة وأي كاتب خارجي مكتشف. أثبت غياب هويات العمليات القديمة ومستمعي التطبيق وكل كتّاب الهدف على جميع المضيفين، وعدم بقاء معاملة كتابة للقالب. عدد حاويات PostgreSQL لا يثبت عدد كتّاب التطبيق، والمنفذ الخالي وحده لا يستبعد عاملاً أو مضيفاً آخر. عند فشل الإثبات تبقى الكتابة محجوبة ولا يبدأ الترحيل؛ لا توقف أدوات Node أو تطبيقات غير مرتبطة.

### الترحيل ثم التشغيل

مع انعدام الكتّاب واستمرار حجب المستخدمين، مرر إعداد قاعدة الهدف المؤكد بشكل خاص إلى عملية الترحيل وشغّل الأمر الحالي فقط `npm.cmd run db:migrate`. لا تستخدم schema push أو تجهيز التكامل. سجل النتيجة الآمنة وتحقق من تطابق بصمة SQL وتوقيت 0016 في سجل Drizzle ومن عمود `public_visibility` النصي غير القابل لـNULL وافتراضي `internal` وقيد CHECK المتحقق الذي يسمح فقط بـ`internal` و`public`. استخدم استعلامات قراءة ولا تختبر القيود بكتابات غير صالحة على بيانات فعلية. نجاح الأمر على قاعدة مرحّلة مسبقاً يثبت التنفيذ والحالة، لا تطبيق ترقية جديدة.

شغّل كاتباً واحداً من الإصدار المتوافق المحدد بواسطة `npm.cmd run start` وضوابط الاستضافة الحالية. أثبت هويته ومستمع التطبيق الواحد وغياب القديم والكتّاب البدلاء. عملية npm أو Next المشغلة ليست خادم تطبيق إضافياً. تبقى كتابة المستخدمين محجوبة أثناء فحص المشغل.

### فحص الإصدار وفتح الكتابة

تحقق من الوصول إلى `/login` ومن سلوك المصادقة المتوقع دون جلسة. باستخدام حساب مشغل مصرح له، سجّل الدخول واقرأ البيانات المرجعية والقالب وتحقق من رؤية قانونية لكل إدخال. نفذ حفظاً آمناً معتمداً يحافظ على القيم ويستخدم `expectedVersion` الحالية ثم أعد القراءة لإثبات حفظ الرؤية؛ احتسب أثر النسخة والتدقيق. لا تُنشئ قيماً عامة لمجرد الفحص ولا تكتب فوق مسودة غير مراجعة. تحقق من عقد الكاتب المتوافق الجاري.

إذا لم يتوفر حساب أو جلسة QA آمنة، يسجل التدريب المحلي فحص الوصول ورفض المصادقة فقط ويصرح بأن القراءة والحفظ المصادق عليهما لم ينفذا؛ لا يدعي قبول تسجيل الدخول أو QA المتصفح. فتح الإنتاج يتطلب الفحص المصرح به كاملاً. لا تفتح الكتابة إلا بعد نجاح إثبات غياب القديم ووجود الجديد وحده والترحيل والمخطط والفحص المطلوب. سجل وقت الانتهاء وقرار المشغل؛ عند أي فشل تبقى النافذة مغلقة.

### التراجع والفشل

قبل إنشاء أي قيمة عامة في تاريخ البيئة، يمكن اتباع حدود التراجع الحالية ضمن نافذة مضبوطة مع الاحتفاظ بالمخطط الموسع والترتيب الآمن. غياب الصفوف العامة حالياً لا يثبت أنها لم توجد سابقاً؛ عند غموض التاريخ تطبق قاعدة ما بعد البيانات العامة.

**بعد وجود أي قيمة عامة الآن أو سابقاً، يُحظر نشر أو إعادة تشغيل كاتب القالب القديم ذي الحقول الثلاثة. يجب أن يبقى إصدار التراجع متوافقاً مع P2. يُحظر حذف `public_visibility` كتراجع عادي.** تتطلب استعادة بيانات أو مخطط مدمرة موافقة منفصلة.

- فشل الترحيل: يبقى التطبيق متوقفاً والكتابة محجوبة؛ التحقيق أو الاستعادة وفق عمليات قاعدة البيانات المعتمدة فقط.
- فشل تشغيل الجديد: لا تفتح الكتابة ولا تشغّل إصداراً غير متوافق بعد وجود بيانات عامة أو عند غموض تاريخها.
- فشل الفحص: تبقى الصيانة مغلقة للتحقيق، دون تراجع صامت أو تصفير بيانات أو تشغيل كاتب قديم.

### قائمة أدلة المشغل وحدود التدريب

سجل: المشغل والبيئة والتزامي الإصدارين وبصمات المرشح؛ حصر الكتّاب الداخليين والخارجيين؛ هويات الخدمات والعمليات وأعدادها قبل الإيقاف وبعده وبعد التشغيل؛ وسيلة حجب الكتابة وإثباتها؛ التصريف أو الإنهاء والمعاملات وإيقاف إعادة التشغيل؛ أوقات الصيانة؛ أمر الترحيل ونتيجته وفحص السجل والعمود والافتراضي والقيد؛ هوية الجديد ونتائج الدخول والقراءة والحفظ وقرار الفتح أو الفشل والتراجع. لا تسجل كلمات مرور أو روابط اعتماد أو ملفات بيئة فعلية أو ملفات ارتباط أو رموزاً أو مفاتيح.

يستخدم التدريب المحلي `TEST_DATABASE_URL` الحالية بعد حاجز المستودع مقابل `DATABASE_URL` الأصلية، ويشترط loopback وهوية قاعدة مطابقة. يغيّر رابط عملية الابن فقط ولا يكتب ملفات البيئة. لا تجهيز تكامل ولا truncate ولا تصفير أو حذف بيانات QA. يُثبت توقف العملية المحلية وانعدام الكتّاب ثم تنفيذ الترحيل وفحص المخطط وبناء وتشغيل كاتب مرشح واحد وفحص HTTP الآمن وإيقافه بعد التدريب. الاتصالات الخاملة ليست معاملات كتابة؛ لا يغني التدريب عن منع وتصريف إنتاجيين فعليين.

تعريف الآلية والتحقق من الإنتاج حالتان منفصلتان. تطلب خطة P2 إثبات A أو B ولا تنص صراحة على تنفيذ نشر إنتاجي قبل قبول التطوير. تدعم هذه السياسة الإلزامية مع التدريب الناجح قبول `PASS_A` قبل الإنتاج، مع بقاء المراجعة وبقية البوابات. يُحجب النشر الإنتاجي الفعلي حتى أدلة الطوبولوجيا والضوابط والقائمة أعلاه. لم تُستخدم بيئة إنتاج؛ غياب تعريفها في المستودع لا يثبت عدم وجود نشر خارجي. يسجل التقرير المرتبط النتائج الفعلية والقيود، ولا يعلن اكتمال P2.
