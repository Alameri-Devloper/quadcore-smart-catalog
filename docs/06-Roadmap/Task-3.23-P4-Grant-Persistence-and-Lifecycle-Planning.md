# Task 3.23-P4 — Grant Persistence and Lifecycle Planning | تخطيط حفظ التفويض ودورة حياته

## P5 approved admission checkpoint — 2026-10-19 | نقطة تحقق سياسة قبول P5 المعتمدة

**P5: IMPLEMENTED / ACCEPTANCE HOLD / NOT INTEGRATED.** The owner approved PostgreSQL management admission. The isolated candidate enforces separate approved operation budgets, atomic user/Workspace accounting, post-lock database time, bounded cleanup and fail-closed Revoke. Mounted management routes are locally operational only with valid policy/schema/session configuration; missing configuration fails closed. See the [current admission final report](../05-Development/Reports/QSC-Task-3.23-P5-Approved-Admission-Final-Report.md) and [approved policy](../05-Development/Public-Share-Management-Admission.md).

**P5: منفذة / القبول معلق / غير مدمجة.** اعتمد المالك قبول الإدارة باستخدام PostgreSQL. يفرض المرشح المعزول ميزانيات العمليات والاحتساب الذري وتوقيت القاعدة بعد الأقفال والتنظيف المحدود والرفض الآمن للإلغاء. تعمل المسارات محلياً فقط بإعداد سياسة ومخطط وجلسة صالح، ويُرفض غياب الإعداد. يوضح التقرير الحالي الأدلة والبوابات المتبقية.

Mandatory genuine built-Next.js browser/accessibility acceptance remains pending because Computer Use could not verify the exposed Edge URL. Automated built-server HTTP checks and source/unit/PostgreSQL evidence do not replace browser acceptance. Delivery/hosted CI/integration remain gated; no merge or production release. This supersedes earlier inactive-pending-policy execution wording only; approved technical contracts and historical P4 findings remain unchanged. P4 FORMALLY CLOSED; Task 3.23 IN PROGRESS; P6/P7 NOT STARTED; DurableCoverage UNCHECKED.

يبقى قبول المتصفح الفعلي وإمكانية الوصول معلقاً لتعذر تحقق Computer Use من رابط Edge المتاح. لا تستبدل اختبارات HTTP الآلية أو المصدر والوحدة والقاعدة قبول المتصفح. تبقى بوابات التسليم وCI والتكامل معلقة دون دمج أو إصدار إنتاجي. تُحدّث هذه النقطة حالة التنفيذ السابقة فقط وتحفظ العقود ونتائج P4 التاريخية؛ المهمة قيد التنفيذ وP6/P7 لم تبدآ والتغطية UNCHECKED.

## Final P4 closure and handoff — 2026-10-18 | إغلاق P4 النهائي وتسليم المرحلة

**P4: IMPLEMENTED, VERIFIED & INTEGRATED; PR #63: MERGED** into `feature/public-product-share-planning` at `fbf02da1e4bed75763fc6cc247172a6ef5f82f79`. The [central closure evidence](../05-Development/Reports/QSC-Task-3.23-P4-Documentation-Reconciliation-and-CI-Assessment-Final-Report.md#p4-final-closure-2026-10-18) maps completion to this plan's schema, lifecycle, scoped authorization, transaction/CAS/audit, inspection, migration and real PostgreSQL/concurrency requirements. Accepted implementation/security/concurrency re-review used reconstructed fallback criteria and retained independent probes; the original standalone review remains unavailable, and no exact reproduction of its unavailable criteria is claimed.

**P4: منفذة ومتحقق منها ومدمجة؛ PR #63: مدمج** في فرع التكامل وعند الالتزام المذكورين. توثق الأدلة المركزية إكمال متطلبات المخطط ودورة الحياة والتفويض المقيد والمعاملات وCAS والتدقيق والفحص والترحيل واختبارات PostgreSQL والتزامن الفعلية. استخدمت إعادة مراجعة التنفيذ والأمن والتزامن المقبولة معايير بديلة معاد بناؤها وأدلة مستقلة محفوظة؛ التقرير الأصلي المنفصل غير متاح، ولا يُدّعى استنساخ معاييره غير المتاحة.

Migration 0017 was test-applied in disposable PostgreSQL; it must precede activation of dependent runtime writers. The stored-timestamp/native-conversion precision boundary below remains unchanged. Section 2 exclusions remain: HTTP/UI activation, anonymous serving, production rollout, rotation jobs and permanent durable-coverage certification are not P4 completion claims. Browser QA was not a P4 gate because P4 adds no Presentation.

طُبق الترحيل 0017 اختبارياً في PostgreSQL مؤقتة ومعزولة، ويجب تطبيقه قبل تفعيل الكتّاب المعتمدين عليه. يبقى حد دقة الزمن المخزن بعد التحويل الأصلي كما هو موضح أدناه. تُحفظ استبعادات القسم 2؛ لا يشمل إكمال P4 تفعيل HTTP/UI أو الخدمة المجهولة أو النشر الإنتاجي أو وظائف التدوير أو اعتماداً دائماً للتغطية. لم يكن قبول المتصفح بوابة لـP4 لعدم إضافة واجهة عرض.

**Task 3.23: IN PROGRESS. P5: READY FOR PLANNING ONLY; P5 implementation: NOT STARTED / GATED. P6 and P7: NOT STARTED / GATED. Production deployment: NOT COMPLETED. DurableCoverage: UNCHECKED.** A separate owner-approved bounded P5 plan is required before any separately authorized P5 implementation; planning readiness grants no implementation authority.

**المهمة 3.23: قيد التنفيذ. P5: جاهزة للتخطيط فقط؛ تنفيذ P5: لم يبدأ / مشروط بالاعتماد. P6 وP7: لم تبدآ / مشروطتان بالاعتماد. النشر الإنتاجي: غير مكتمل. DurableCoverage: UNCHECKED.** يلزم تخطيط محدود لـP5 يوافق عليه المالك قبل اعتماد تنفيذها بصورة منفصلة؛ الجاهزية للتخطيط ليست تصريحاً بالتنفيذ.

This 2026-10-18 addendum supersedes only earlier delivery-status and authorization-stage wording, including the 2026-10-15 CI-related HOLD. All earlier HOLD decisions, review findings, test counts and technical requirements remain preserved as dated history. This documentation candidate remains subject to independent review; it authorizes no further Git, database, deployment or later-phase work.

تحل إضافة 2026-10-18 محل عبارات حالة التسليم ومرحلة التصريح السابقة فقط، بما فيها تعليق الاعتماد المرتبط بـCI في 2026-10-15. تُحفظ قرارات HOLD والنتائج وأعداد الاختبارات والمتطلبات التقنية السابقة كتاريخ مؤرخ. يبقى مرشح التوثيق خاضعاً للمراجعة المستقلة، ولا يصرح بعمليات Git أو قاعدة بيانات أو نشر أو عمل في المراحل اللاحقة.

## Current P4 authority — 2026-10-15 | مرجعية P4 الحالية

**F1–F6 remediation: COMPLETED. Independent re-review: PASS under reconstructed fallback criteria. P4 Final Approval: HOLD pending dedicated P4 PostgreSQL/concurrency CI coverage being implemented and verified, or explicitly accepted by the project owner.** This documentation reconciliation does not resolve that CI requirement or authorize staging, commit, push, a Pull Request, merge or deployment.

**اكتملت معالجة F1–F6، ونجحت إعادة المراجعة المستقلة وفق معايير بديلة معاد بناؤها. يبقى الاعتماد النهائي لـP4 معلقاً (HOLD) حتى تنفيذ تغطية CI المخصصة لاختبارات PostgreSQL والتزامن والتحقق منها، أو قبول مالك المشروع لهذه الفجوة صراحة.** لا تمنح مصالحة التوثيق تصريحاً بالتجهيز أو الالتزام أو الدفع أو طلب سحب أو الدمج أو النشر.

**Current delivery status / حالة التسليم الحالية:** P1/P2/P3 COMPLETE / MERGED; P4 remediation COMPLETED; IndependentReReview PASS (reconstructed fallback criteria); P4 UNMERGED / NOT COMPLETE; P4FinalApproval HOLD; P5–P7 GATED / NOT STARTED; DurableCoverage UNCHECKED. P4 implementation baseline: `ac272123bd3ea9ee522283e97a4e3adffec239f0`; branch: `feature/task-3.23-p4-grant-lifecycle`. / اكتملت P1 وP2 وP3 ودُمجت؛ اكتملت معالجة P4 ونجحت إعادة مراجعتها ضمن المعايير البديلة فقط؛ لم تكتمل P4 ولم تُدمج واعتمادها النهائي معلق؛ تبقى P5–P7 مشروطة ولم تبدأ، والتغطية الدائمة UNCHECKED.

**Review chronology and provenance / تسلسل المراجعات ومصدر الأدلة:** Initial implementation candidate (2026-10-12) → independent review HOLD → F1–F6 remediation and local verification (2026-10-15) → independent fallback re-review PASS → final approval HOLD → this documentation reconciliation and CI recommendation. The original standalone review remains unavailable and was not examined; the original criteria are distinct from reconstructed fallback criteria and independently verified implementation/probe evidence. The independent evidence is retained locally under `artifacts/task-reviews/3.23-P4-independent-re-review/`; those ignored machine-local files are not a portable standalone report. No historical test result is relabelled as a fresh run.

تُحفظ مراحل المرشح الأول ثم تعليق المراجعة ثم المعالجة والتحقق المحلي ثم نجاح إعادة المراجعة البديلة ثم تعليق الاعتماد النهائي، وصولاً إلى مصالحة التوثيق الحالية. تقرير المراجعة الأصلي المنفصل غير متاح ولم يُفحص؛ معاييره الأصلية منفصلة عن المعايير البديلة والأدلة التنفيذية المستقلة. الأدلة المحلية المتجاهلة من Git ليست تقريراً مستقلاً قابلاً للنقل، ولا تُعرض الاختبارات السابقة كتشغيل جديد.

**PostgreSQL precision boundary / حد دقة PostgreSQL:** The P4 constraint guarantees finite millisecond **stored instants after PostgreSQL native timestamp conversion**. Native microsecond conversion may round `.1230004` or `.1229996` to stored `.123` before the CHECK; an originally earlier revoked input may become equal to the issued stored instant. Strict raw-text readers reject nonzero digits beyond milliseconds before Date conversion; `.123000` is supported and `.123456` is rejected. Stored revocation ordering and immutable timestamp CAS remain enforced. Inspection `inspectedAt` uses the separate database-statement Date evidence boundary. No timestamp type, constraint, reader, ADR-013 decision or implementation is changed by this clarification.

يضمن القيد قيماً مخزنة منتهية بدقة الملليثانية بعد تحويل PostgreSQL الأصلي؛ قد يقرب التحويل إلى الميكروثانية المدخلين المذكورين إلى `.123` قبل القيد، وقد يصبح وقت إلغاء أسبق مساوياً لوقت الإصدار المخزن. يرفض قارئ النص الصارم الأرقام غير الصفرية بعد الملليثانية قبل Date؛ تُقبل `.123000` وتُرفض `.123456`. يبقى ترتيب الأوقات المخزنة وCAS محفوظين، ولوقت أدلة الفحص حد Date منفصل. هذا توضيح للتوثيق فقط دون تغيير المعمارية أو التنفيذ.

Current authority is this dated update and [Current Roadmap](Current-Roadmap.md). The [implementation candidate report](../05-Development/Reports/QSC-Task-3.23-P4-Implementation-Candidate-Report.md) and [remediation report](../05-Development/Reports/QSC-Task-3.23-P4-Remediation-Candidate-Report.md) preserve their exact historical snapshots with dated addenda. / تحكم هذه الإضافة المؤرخة وخارطة الطريق الحالة الحالية، ويحفظ التقريران لقطتيهما التاريخيتين مع إضافات مؤرخة.

## Preserved review history and unchanged technical content | تاريخ المراجعة المحفوظ والمحتوى التقني دون تغيير

All earlier P4 delivery/review/authorization wording below, including HOLD, RE-REVIEW REQUIRED, NOT STARTED and NOT AUTHORIZED YET, records its historical checkpoint and is superseded for current status by the dated authority above. The explicit P4 implementation handoff already superseded planning-only execution restrictions. Technical requirements, prior evidence, other slice history and ADR-013 architecture decisions remain unchanged. / تصف عبارات حالة P4 ومراجعتها والتصريح بها أدناه نقاطها التاريخية، وتحل المرجعية المؤرخة أعلاه محلها للحالة الحالية فقط؛ سبق أن تجاوز تسليم التنفيذ قيود مهمة التخطيط. تبقى المتطلبات التقنية والأدلة السابقة وتاريخ الشرائح الأخرى وقرارات ADR-013 دون تغيير.


> **Independent Review: HOLD.** F1–F6 remediation candidate only; independent re-review required. Initial candidate evidence is retained in the [P4 implementation report](../05-Development/Reports/QSC-Task-3.23-P4-Implementation-Candidate-Report.md). P5–P7 remain GATED / NOT STARTED. | المراجعة المستقلة معلقة؛ معالجة F1–F6 مرشحة لإعادة المراجعة دون اعتماد الإكمال؛ تُحفظ الأدلة السابقة وتبقى P5–P7 مشروطة ولم تبدأ.

**Current status / الحالة الحالية:** P4 REMEDIATION_CANDIDATE / INDEPENDENT RE-REVIEW REQUIRED; Planning COMPLETE / MERGED through PR #62; PlanningReview PASS; PlanningGate PASS; independent implementation/security/concurrency RE-REVIEW REQUIRED / تخطيط P4 مكتمل ومدمج؛ نجحت بوابات التخطيط؛ التنفيذ مرشح معالجة لإعادة المراجعة المستقلة ولم يكتمل.
**Date / التاريخ:** 2026-10-15.
**Historical planning branch / فرع التخطيط التاريخي:** `feature/task-3.23-p4-grant-lifecycle-planning`.
**Historical planning baseline / أساس التخطيط التاريخي:** `74c8a9ca878638dd8ed340633a9c5306b1235a23`.
**Milestones / المراحل:** P1/P2/P3 COMPLETE / MERGED; P4 REMEDIATION_CANDIDATE / INDEPENDENT RE-REVIEW REQUIRED; P5–P7 GATED / NOT STARTED / P1 وP2 وP3 مكتملة ومدمجة؛ P4 مرشحة للمراجعة؛ P5–P7 مشروطة ولم تبدأ.

**Implementation handoff / تسليم التنفيذ:** Explicit P4 implementation authorization supersedes this plan's historical planning-only execution restrictions. Implementation baseline: `ac272123bd3ea9ee522283e97a4e3adffec239f0`; branch: `feature/task-3.23-p4-grant-lifecycle`. The accepted technical requirements below remain unchanged. See the [remediation candidate report](../05-Development/Reports/QSC-Task-3.23-P4-Implementation-Candidate-Report.md). P4 is not COMPLETE; P5–P7 remain gated. | يحل تصريح تنفيذ P4 الصريح محل القيود التاريخية الخاصة بتنفيذ مهمة التخطيط فقط. يُحفظ الأساس والفرع والعقد التقني، ويوضح التقرير المرشح. لم تكتمل P4 وتبقى الشرائح اللاحقة مشروطة.

## 1. Authority, evidence and approval boundary | المرجعية والأدلة وحد الاعتماد

[ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md), the [parent implementation contract](Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md), [P1 plan](Task-3.23-P1-Metadata-and-Domain-Contracts-Planning.md), [P3 plan](Task-3.23-P3-Crypto-and-Runtime-Planning.md), [Current Roadmap](Current-Roadmap.md) and [Sprint 03 continuation](Sprint-03-Continuation.md) govern this plan. Repository-grounded P4 discovery PASS identified a key-version storage-range mismatch and adapter/coverage decisions; the user's accepted final-planning decisions resolve them here. P3 implementation PR #61 merged at this baseline after exact-head QSC CI run `38209773348` succeeded for `5722313dce5a017a24980d9dd1a631eb0701424f`. Pre-merge wording in P3 reports/plans is historical, not a reason to reopen P3.

تحكم المراجع المرتبطة هذه الخطة. كشفت عملية الاكتشاف الناجحة تعارض مجال تخزين نسخة المفتاح وقرارات المحولات والتغطية؛ تحسمها قرارات المستخدم المعتمدة أدناه. دُمج تنفيذ P3 عبر #61 عند خط الأساس بعد نجاح تشغيل CI المذكور على رأس التنفيذ المطابق؛ تبقى صياغة ما قبل الدمج في تقارير وخطة P3 تاريخية ولا تعيد فتحها.

This detailed P4 specification is **COMPLETE / REVIEWED**. P4IndependentPlanningReview: PASS; P4PlanningReview: PASS; P4PlanningGate: PASS; PlanningBlockers: NONE; DecisionsStillRequired: NONE for planning. P4 is READY_FOR_IMPLEMENTATION, but implementation is NOT STARTED / NOT AUTHORIZED YET. Separate explicit implementation authorization remains required. No migration, PostgreSQL or later-slice work is authorized. The intentional local `.serena/project.yml` change remains untouched and excluded; SHA-256 `3efc30be05fdf94fbfc3d9bdd3e4fe7fb122d465903ca2f89027b509b4ecb998`.

اكتملت مواصفة P4 وراجعتها المراجعة المستقلة بنجاح، ونجحت بوابة التخطيط. لا عوائق أو قرارات تخطيط متبقية. P4 جاهزة للتنفيذ لكن التنفيذ لم يبدأ ولم يُعتمد بعد؛ يلزم تصريح صريح منفصل. لا تصريح بترحيل أو PostgreSQL أو الشرائح اللاحقة، ويبقى تعديل Serena المحلي وبصمته دون مساس وخارج النطاق.

## 2. P4 ownership and exclusions | ملكية P4 والاستبعادات

P4 owns the additive `catalog_public_product_share_grants` schema/migration through the existing Catalog schema, concrete Sharing grant/resource/audit adapters and PostgreSQL UoW, Issue/reuse, explicit active-link retrieval/Copy, targeted Revoke, Replace, revision/CAS, locks/concurrency, atomic audit, retrieval-envelope disposal and service-wide persisted referenced-key inspection. It owns real guarded PostgreSQL/concurrency/security verification and implementation report/evidence. TypeScript, DDD, Clean Architecture and existing tenant/module ownership remain unchanged.

تملك P4 الجدول والترحيل الإضافيين عبر مخطط Catalog الحالي، ومحولات Sharing للحفظ والموارد والتدقيق ووحدة العمل، والإصدار وإعادة الاستخدام والاسترجاع الصريح والنسخ والإلغاء المستهدف والاستبدال وCAS والأقفال والتزامن والتدقيق الذري ومحو الغلاف وفحص نسخ المفاتيح المحفوظة على مستوى الخدمة، مع التحقق الحقيقي المحمي والتقرير والأدلة. تُحفظ TypeScript وDDD وClean Architecture وحدود الملكية والمستأجر الحالية.

Excluded: authenticated HTTP routes, management UI/Presentation, permission assignment transport/UI, anonymous resolver/public projection/media, SSR, localization/accessibility acceptance, production deployment integration, readiness HTTP routes, scheduler, production rotation/batch jobs, key-retirement commands, analytics, expiry, receipt subsystem, new dependencies or generic crypto/raw-SQL framework. P5–P7 remain GATED / NOT STARTED.

تُستبعد المسارات الموثقة وواجهة الإدارة والنقل والواجهة لتعيين الصلاحيات والحل والإسقاط والوسائط العامة وSSR وقبول التعريب والإتاحة والنشر الإنتاجي ومسارات الجاهزية والمجدول والتدوير الإنتاجي والدفعات وأوامر سحب المفاتيح والتحليلات والانتهاء والإيصالات والمكتبات الجديدة والأطر العامة. تبقى P5–P7 مشروطة ولم تبدأ.

## 3. Existing implementation and precedents | التنفيذ الحالي والسوابق

- [Grant aggregate](../../domains/catalog/sharing/domain/public-product-share-grant.ts): create/rehydrate/revoke/protected-value CAS; private state and defensive snapshots. Do not create another grant model or weaken its normal rehydration.
- [Grant repository port](../../domains/catalog/sharing/ports/public-product-share-grant-repository.port.ts): scoped find/lock, digest candidates, semantic insert collisions and expected-revision save.
- [Sharing UoW/resource/audit ports](../../domains/catalog/sharing/ports/public-product-share-unit-of-work.port.ts): READ COMMITTED, Product-parent-before-grant order and explicit Commit/Rollback discriminants.
- [P3 runtime](../../domains/catalog/sharing/infrastructure/public-share-crypto-runtime.ts) and [crypto ports](../../domains/catalog/sharing/ports/public-share-crypto.port.ts): use without changing token/HMAC/AES/AAD, exact runtime modes, origin or Node 24 failure policy.
- [Workspace repository](../../domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts): scoped row locks and deterministic create outcomes; [Inventory UoW](../../domains/inventory/infrastructure/persistence/postgresql-inventory-unit-of-work.ts): transaction-bound adapters, locks and revision predicates.
- [Identity UoW](../../domains/identity/infrastructure/persistence/postgresql-identity-unit-of-work.ts): explicit rollback sentinel; adapt Sharing's `value` discriminant, not Identity's `result` property.
- [Product Media Root adapter](../../domains/catalog/infrastructure/persistence/postgresql-product-media-root.repository.ts): positively identified named `23505` constraints; do not copy another adapter's broad unique-error classification.
- [P2 integration tests](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.ts): separate connections/barriers, observed lock blocking and audit rollback.

تثبت الروابط النموذج والمنافذ والتشفير الحالي وسوابق الأقفال وCAS والتمييز الصريح للتراجع وأسماء قيود التفرد وحواجز التزامن والتراجع عند فشل التدقيق. تُعاد الاستفادة ضمن ملكية Sharing دون نموذج مكرر أو نسخ التصنيف العام لكل خطأ تفرد أو ربط بتشفير Identity. تبقى اختبارات P1/P2/P3 وأدلتها محفوظة، ولا تعني قراءة المصادر تشغيلها أثناء التخطيط.

## 4. Accepted key-version storage reconciliation | مصالحة مجال تخزين نسخة المفتاح

`lookup_key_version` and `encryption_key_version` use PostgreSQL **BIGINT**, mapped with the existing Drizzle `bigint(..., { mode: "number" })` safe-number convention. Checks enforce `1 <= version <= 9007199254740991`; encryption version may be NULL only in the fully revoked envelope state. This preserves P3's entire canonical positive JavaScript safe-integer contract. Never narrow it to signed 32-bit integer, round, truncate or silently coerce persisted values. Validate exactness before conversion when reading raw bigint strings/arrays; malformed/noninteger/out-of-range input is an integrity failure, not an empty set.

تستخدم نسختا البحث والتشفير **BIGINT** مع اصطلاح Drizzle الحالي للعدد الآمن. تفرض القيود المجال من 1 إلى `9007199254740991`، ولا تغيب نسخة التشفير إلا ضمن غلاف ملغى بالكامل. يُحفظ عقد P3 كاملاً دون تضييق إلى 32 بت أو تقريب أو اقتطاع أو تحويل صامت. تُثبت دقة النصوص والمصفوفات الكبيرة قبل تحويلها؛ القيمة المشوهة أو غير الصحيحة أو الخارجة عن المجال فشل سلامة وليست مجموعة فارغة.

Accept key versions `2147483647`, `2147483648`, `9007199254740991`; reject 0, negatives and values above MAX_SAFE_INTEGER in real database and mapping tests. `envelope_format_version` remains integer and equals 1 when present. `revision` remains safe-positive BIGINT/default 1. The parent contract is narrowly reconciled; no P3 TypeScript/crypto/API change is authorized.

يلزم قبول الحدود الثلاثة المذكورة ورفض الصفر والسالب وما فوق MAX_SAFE_INTEGER في القاعدة والتحويل. تبقى نسخة الصيغة integer تساوي 1 عند وجودها وrevision BIGINT موجباً آمناً يبدأ بـ1. تُصالح وثيقة العقد الأب بصورة محدودة دون تعديل TypeScript أو تشفير أو API في P3.

## 5. Schema placement and exact persisted fields | موقع المخطط والحقول المحفوظة

Define/register `catalog_public_product_share_grants` through [the existing Catalog schema](../../domains/catalog/infrastructure/persistence/schema.ts). Its existing [platform aggregation](../../shared/infrastructure/persistence/schema.ts) and [Drizzle configuration](../../drizzle.config.ts) already register that file; do not create a new schema-registration architecture. Sharing owns its adapters/UoW/Application/inspection under `domains/catalog/sharing/`.

يُعرّف الجدول ويُسجل عبر مخطط Catalog الحالي المرتبط؛ يسجله التجميع وإعداد Drizzle الحاليان دون معمارية تسجيل جديدة. تملك Sharing محولاتها ووحدة عملها وApplication والفحص ضمن مجلدها الحالي.

| Column / العمود | Required PostgreSQL shape / الشكل المطلوب |
| --- | --- |
| `workspace_id`, `grant_id`, `product_id`, `branch_id` | text NOT NULL; nonblank / نص إلزامي غير فارغ |
| `lookup_key_version` | BIGINT NOT NULL; safe positive / موجب آمن |
| `lookup_digest` | text NOT NULL; lowercase 64 hex / بصمة سداسية صغيرة بطول 64 |
| `envelope_format_version` | integer NULL; V1=1 when present / نسخة 1 عند وجود الغلاف |
| `encryption_key_version` | BIGINT NULL; safe positive when present / موجب آمن عند وجوده |
| `bearer_iv`, `bearer_ciphertext`, `bearer_auth_tag` | text NULL; canonical unpadded base64url / ترميز قانوني دون حشو |
| `issued_by_actor_id` | text NOT NULL; accountability / هوية المُصدر للمساءلة |
| `issued_at` | timestamptz NOT NULL / وقت الإصدار الإلزامي |
| `revoked_at` | timestamptz NULL / وقت الإلغاء |
| `revoked_by_actor_id` | text NULL / هوية الملغي |
| `revision` | BIGINT NOT NULL DEFAULT 1; safe positive / موجب آمن |

Grant ID is a server-generated lowercase UUID string; timestamps come from the injected clock. Persist no duplicate createdAt, updatedAt, expiry, eligibility/status snapshot, plaintext token, URL, receipt, mandatory replacement-lineage column or raw keys. Flatten the envelope's keyVersion into `encryption_key_version`; do not store a second JSON envelope copy. Protected values must never be serialized into ordinary responses or diagnostics.

معرف التفويض UUID نصي صغير الأحرف مولد من الخادم، والأزمنة من الساعة المحقونة. لا حقول createdAt مكررة أو updatedAt أو انتهاء أو لقطة أهلية/حالة أو رمز أو URL صريح أو إيصال أو عمود نسب استبدال إلزامي أو مفاتيح. تُسطح نسخة الغلاف إلى عمود التشفير دون نسخة JSON ثانية، ولا تُسلسل القيم المحمية في الاستجابات المعتادة أو التشخيصات.

## 6. Tenant, lifecycle and envelope constraints | قيود المستأجر ودورة الحياة والغلاف

PK `catalog_public_product_share_grants_pk` is `(workspace_id, grant_id)`. FKs to Workspace, `(workspace_id, product_id)` to `catalog_products`, and `(workspace_id, branch_id)` to `workspace_branch_references` all use RESTRICT. Actor IDs have no physical Identity FK; Application validates authority while historical accountability survives Identity changes. Repository predicates/joins always preserve Workspace ownership; do not rely only on HTTP authorization.

المفتاح المركب وأسماء الموارد المذكورة مقيدة بالمساحة مع RESTRICT؛ لا مفتاح مادي إلى Identity لهويات الممثلين. تتحقق Application من السلطة، ويبقى التاريخ عند تغير الهوية. تحفظ شروط الحفظ والربط ملكية المساحة ولا تكتفي بصلاحية HTTP.

Named checks use the `catalog_public_product_share_grants_*` prefix: `identities_nonblank`, `grant_id_uuid`, `lookup_key_version_safe`, `lookup_digest_shape`, `envelope_format_v1`, `encryption_key_version_safe`, `envelope_encoding_shape`, `revision_safe`, `revocation_timestamps`, `envelope_lifecycle`. Both safe-version checks and revision use the exact bound in section 4. Digest is `^[a-f0-9]{64}$`; encoded IV/ciphertext/tag lengths are 16/58/22, alphabet `[A-Za-z0-9_-]`. Infrastructure adds decode/re-encode equality and P3 authentication. SQL NULL behavior must not permit a partial state.

تستخدم القيود أسماء ثابتة بالبادئة المذكورة للهوية وUUID والنسخ والبصمة والصيغة والترميز وrevision والزمن واتساق الغلاف. تُطبق الحدود الدقيقة، وشكل البصمة وأطوال IV والنص والوسم وأبجديتها؛ تضيف Infrastructure التحقق الأقوى والمصادقة. لا يجوز أن تسمح دلالات NULL بغلاف جزئي.

```sql
CHECK (
  (revoked_at IS NULL AND revoked_by_actor_id IS NULL
    AND envelope_format_version IS NOT NULL AND encryption_key_version IS NOT NULL
    AND bearer_iv IS NOT NULL AND bearer_ciphertext IS NOT NULL AND bearer_auth_tag IS NOT NULL)
  OR
  (revoked_at IS NOT NULL AND revoked_by_actor_id IS NOT NULL
    AND envelope_format_version IS NULL AND encryption_key_version IS NULL
    AND bearer_iv IS NULL AND bearer_ciphertext IS NULL AND bearer_auth_tag IS NULL)
)
```

`revoked_at IS NULL` alone defines active lifecycle. Require revocation actor/time together and `revoked_at >= issued_at`. Revoke/replace-old permanently clear the five retrieval columns while retaining digest/version, identities, issuer/revoker/timestamps, revision and audit. No purge, recovery from backups/WAL or resurrection path is added.

يحدد غياب وقت الإلغاء النشاط وحده، ويلزم زوج هوية الملغي ووقته وترتيب الزمن. يمحو الإلغاء والاستبدال القديم أعمدة الاسترجاع الخمسة نهائياً مع حفظ البصمة ونسختها والهوية والممثلين والأزمنة وrevision والتدقيق. لا تطهير أو استرداد من النسخ وWAL أو إعادة إحياء.

## 7. Cardinality, indexes and conflict identities | العدد والفهارس وهوية التعارض

- `catalog_public_product_share_grants_active_uq`: unique `(workspace_id, product_id, branch_id) WHERE revoked_at IS NULL`.
- `catalog_public_product_share_grants_digest_uq`: globally unique lookup_digest, including retained revoked rows.
- `catalog_public_product_share_grants_lookup_idx`: `(lookup_key_version, lookup_digest)`.
- `catalog_public_product_share_grants_history_idx`: `(workspace_id, product_id, branch_id, issued_at)`.

At most one active grant per tuple, possibly zero after revoke. Eligibility never enters the uniqueness predicate. These names and the PK name are stable classifier identities, not message substrings. Existing partial-index precedents are Catalog's one-main-image/active-source-attempt indexes and Identity's one-open-challenge index.

تفويض نشط واحد كحد أقصى لكل ثلاثية، وقد يصبح العدد صفراً بعد الإلغاء. لا تدخل الأهلية في شرط التفرد. الأسماء ثابتة للتصنيف وليست أجزاء رسائل. توجد سوابق الفهارس الجزئية في الصورة الرئيسية ومحاولة المصدر النشطة وتحدي الهوية المفتوح.

## 8. Narrow ports and adapter responsibilities | المنافذ المحدودة ومسؤوليات المحولات

Implement the existing grant port: `findActive`, `findById`, `lockById`, `findByDigestCandidates`, `insert`, `save`. Normal mapping rehydrates strictly; missing scoped rows differ from corrupt stored state. Insert returns only its existing semantic results. Save uses expected revision and immutable Workspace/grant/Product/Branch scope; mutate only approved lifecycle/protected columns, never the tuple/issuer/issuance identity. No generic CRUD, repository-to-repository calls, crypto/permission logic inside repositories or URL return from persistence.

تنفذ العمليات الحالية مع تحويل صارم وفصل الغياب عن الفساد. تُستخدم نتائج الإدراج الحالية وCAS والهوية الثابتة في الحفظ دون تغيير الثلاثية أو المصدر والزمن. لا CRUD عام أو استدعاء مستودعات أخرى أو تشفير أو صلاحيات داخل الحفظ أو إرجاع URL منه.

Exact planned extension to `public-product-share-grant-repository.port.ts` for **Revoke only**:

```ts
interface PublicProductShareRevocationState {
  readonly workspaceId: string;
  readonly grantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly issuedAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedByActorId: string | null;
  readonly revision: number;
}
// Methods added to PublicProductShareGrantRepository, transaction-bound:
findRevocationById(workspaceId: string, grantId: string):
  Promise<PublicProductShareRevocationState | null>;
lockRevocationById(workspaceId: string, grantId: string):
  Promise<PublicProductShareRevocationState | null>;
revokeForExpectedRevision(input: {
  readonly workspaceId: string; readonly grantId: string;
  readonly productId: string; readonly branchId: string;
  readonly expectedRevision: number;
  readonly revokedByActorId: string; readonly revokedAt: Date;
}): Promise<PublicProductShareSaveResult>;
```

The unlocked scoped lookup discovers the immutable tuple without locking a grant before its Product. Revalidate after locking Product then the grant. Projection validation covers canonical identities, finite ordered dates, revocation pair and safe revision, but reads/returns no digest or envelope. The update predicates include scope, expected revision and unrevoked state; set first actor/time, NULL all five retrieval columns and increment revision atomically. Return no protected fields. CAS mismatch aborts with sanitized ServiceUnavailable and no retry; do not invent a new expectedRevision HTTP API. Ordinary revoke and corrupt-envelope revoke use this one narrow Revoke path; healthy-state transition tests must agree with the existing aggregate's semantics. Copy/Issue/Replace cannot consume it.

يكشف البحث المقيد غير المقفل الثلاثية دون قفل التفويض قبل المنتج، ويُعاد التحقق بعد قفل المنتج ثم الصف. تُثبت الهويات والتواريخ وزوج الإلغاء وrevision دون قراءة أو إرجاع بصمة أو غلاف. يقيد التحديث الهوية والمراجعة والنشاط ويكتب الإلغاء ويمحو الأعمدة ويزيد المراجعة ذرياً دون قيم محمية. يؤدي فشل CAS إلى ServiceUnavailable آمن وتراجع بلا محاولة، دون API مراجعة جديد. تستخدم عملية Revoke الصحية والفاسدة هذا المسار الواحد المحدود مع اختبارات توافق دلالات النموذج، ولا تستخدمه Copy أو Issue أو Replace.

## 9. Issue and reuse | الإصدار وإعادة الاستخدام

Receive TrustedActorContext; authorize; validate origin/needed capabilities; enter UoW; lock Product parent; read and lock/re-read current unrevoked grant. If present, strictly map/decrypt/authenticate/validate its token and stored digest, return Reused with the same grantId/URL after commit; no generator call, eligibility requirement or issuance audit. Any retrieval failure returns the appropriate typed failure without falling through to creation.

تُستقبل السلطة الحقيقية وتُفحص القدرات والأصل، ثم تُقفل الموارد ويُعاد فحص التفويض النشط. إذا وجد، يتحقق الغلاف والرمز والبصمة وتُعاد الهوية والرابط نفسهما بعد الإنهاء دون توليد أو شرط أهلية أو تدقيق إصدار. لا يؤدي فشل الاسترجاع إلى إنشاء بديل.

If absent: read current resources, enforce full issuance eligibility, allocate UUID, generate one bearer candidate, use P3 digest/encryption with the exact scoped AAD, create revision-one aggregate, insert, append one PublicProductShareIssued audit, commit, then return Created URL. Losing candidates are transient; no plaintext cleanup row or logging. Only known bounded collisions may generate another candidate under section 14.

عند الغياب تُفحص الأهلية الحية، وتُخصص هوية UUID ويُولد مرشح واحد ويُستخدم تشفير P3 وAAD الدقيق ثم النموذج بمراجعة 1 والإدراج وتدقيق واحد والالتزام قبل إرجاع الرابط. تبقى المرشحات الخاسرة عابرة دون حفظ أو تسجيل؛ يسمح القسم 14 فقط بتصادمات معروفة ومحدودة.

## 10. Copy / explicit active-link retrieval | النسخ والاسترجاع الصريح

P4 includes an explicitly invoked authenticated Copy operation: current permissions/Branch Scope, Product then grant locks, strict active-state mapping, P3 decrypt plus digest verification, canonical configured-origin URL returned after successful commit/no-op. Temporary ineligibility does not block Copy, including known inactive Branches. No mutation, lifecycle audit, fallback Issue, repaired envelope or newly generated bearer. URL = dedicated canonical origin + `/share/` + canonical token; no Host/locale/query/fragment authority. No URL returned during ordinary resource reads.

تتضمن P4 نسخاً موثقاً مستدعى صراحة مع الصلاحيات والنطاق والأقفال والتحقق من النشاط وفك P3 والبصمة والأصل المخصص بعد الإنهاء، حتى مع عدم أهلية مؤقتة أو فرع معروف غير نشط. لا تغيير أو تدقيق أو إصدار بديل أو إصلاح أو توليد. يبنى الرابط من الأصل والمسار والرمز فقط ولا يُعاد مع قراءة الموارد المعتادة.

Copy ordered before Revoke/Replace may return a URL invalidated immediately afterwards. If revocation/replacement wins first, do not decrypt the old revoked grant. There is no post-response validity guarantee. P5 owns explicit HTTP/UI invocation, no prefetch/background retrieval and no browser/cache/storage retention.

قد يصبح الرابط المنسوخ قبل الإلغاء أو الاستبدال غير صالح مباشرة بعده؛ إذا سبقهما فلا يُفك التفويض القديم. لا ضمان صلاحية بعد الاستجابة. تملك P5 الاستدعاء الصريح ومنع الجلب الخلفي والحفظ في المتصفح.

## 11. Revoke, including corrupt retrieval material | الإلغاء بما فيه فساد الاسترجاع

Resolve only actor-Workspace + targeted grant; discover/revalidate tuple with section 8's projection; enforce current Branch Scope; lock Product then projection row. Revoke needs no Product-view/pricing permission, eligibility, origin, key-ring, envelope mapping or decryption. Validate lifecycle identity/time/revision; first transition uses CAS, clears all retrieval fields, increments once, appends PublicProductShareRevoked audit and commits. Repeat returns AlreadyRevoked with original time/actor/revision unchanged and no audit. Retain lookup digest/version without reading them into the revoke projection.

يُحل التفويض المستهدف ضمن مساحة الممثل وتُفحص الثلاثية والنطاق ثم الأقفال. لا يعتمد الإلغاء على رؤية المنتج أو السعر أو الأهلية أو الأصل أو المفاتيح أو الغلاف أو فكه. تُثبت دورة الحياة ويُطبق CAS والمحو والزيادة والتدقيق والالتزام في المرة الأولى؛ التكرار AlreadyRevoked بلا تغيير أو تدقيق. تبقى البصمة ونسختها دون قراءتهما في الإسقاط.

This route is limited to invalidation, not recovery: no plaintext/envelope return, ciphertext repair, new link, generic raw SQL, tenant bypass or audit bypass. Normal aggregate rehydration remains strict. Validate the next revoked lifecycle state without fabricating a healthy envelope or admitting bad protected material to other operations. Corrupt protected-state Replace fails; explicit Revoke followed by separately requested Issue is the recovery path. Invalid lifecycle identities/dates/revision still fail safely; the bypass tolerates protected material corruption, not arbitrary lifecycle corruption.

المسار للإبطال فقط لا الاسترداد: لا رمز أو غلاف مُعاد أو إصلاح أو رابط جديد أو SQL عام أو تجاوز مستأجر أو تدقيق. يبقى تحويل النموذج صارماً ولا يُختلق غلاف صحي ولا تُقبل مادة فاسدة في بقية العمليات. يفشل الاستبدال الفاسد؛ الاسترداد بإلغاء صريح ثم إصدار منفصل. يبقى فساد هوية دورة الحياة أو زمنها أو مراجعتها فشلاً آمناً؛ الاستثناء للمادة المحمية فقط.

## 12. Replace | الاستبدال

Require Issue/Replace authority, explicit expectedCurrentGrantId and current issuance eligibility. Lock Product, then required grant rows in ID order; strictly map and verify old protected state through the normal P3 retrieval path; reject stale/noncurrent/revoked expected identity with ExpectedCurrentGrantConflict. A crypto/integrity failure aborts, never invokes the revoke-only bypass. Generate a fresh UUID/bearer/digest/envelope; revoke/clear old (revision+1), insert new (revision1), append exactly one replacement event with old/new IDs, commit and return only the new URL. No separate issuance/revocation audit duplication. Rollback restores old envelope/state; a lost response is recovered only by explicitly requested Copy/current-state inspection, never automatic replay against a winner.

يلزم التفويض والهوية المتوقعة الصريحة والأهلية الحية. تُقفل الصفوف بالترتيب ويُفحص القديم صارماً عبر P3؛ ترفض الهوية القديمة أو غير الحالية أو الملغاة بتعارض، ويفشل التشفير دون مسار الإلغاء الاستثنائي. يُولد رمز وهوية جديدان، ويُلغى القديم ويُمحى غلافه وتزيد مراجعته، ثم يدرج الجديد بمراجعة 1 وتدقيق استبدال واحد ذرياً قبل الرابط الجديد. يعيد التراجع حالة القديم، ولا يُعاد تلقائياً استبدال الفائز عند ضياع الاستجابة.

## 13. UoW, lock order and race matrix | وحدة العمل وترتيب الأقفال والسباقات

Management isolation is READ COMMITTED. Product parent `(workspace_id, product_id) FOR UPDATE` precedes grant locks; multi-grant locks sort by grantId. Product revision is never changed merely to lock. Same Product/different Branch may serialize. Full-session resolution finishes before these locks; never acquire Identity mutation locks afterwards. Existing eligibility writers are not claimed to share these locks. Sharing UoW binds grants/resources/audit to one transaction; explicit Rollback or thrown work/audit error aborts every write. No URL escapes UoW before successful commit. Crypto computation inside lifecycle work is transient, not a persistence side effect.

العزل READ COMMITTED وقفل المنتج قبل التفويضات المرتبة بمعرفها، دون تعديل مراجعة المنتج. قد تتسلسل فروع المنتج نفسه. يُستكمل حل الجلسة قبل الأقفال ولا تُكتسب أقفال تعديل Identity بعدها؛ لا ادعاء أن كتّاب الأهلية الحاليين يتشاركونها. تربط وحدة العمل المنافذ بمعاملة واحدة ويتراجع كل تغيير عند Rollback أو استثناء العمل والتدقيق، دون خروج URL قبل الالتزام. يبقى التشفير داخل العمل عابراً.

| Race / السباق | Required winner/loser semantics / الدلالة المطلوبة |
| --- | --- |
| A Issue/Issue | One active winner; other reuses same URL absent intervening lifecycle change / فائز نشط واحد والآخر يعيد الرابط نفسه ما لم تتدخل دورة حياة أخرى |
| B Issue/Revoke | Reuse before revoke may return later-invalid URL; Issue after revoke may create successor; old-target revoke never revokes successor / ترتيب مستهدف لا يلغي الخلف |
| C Replace/Revoke | Revoke first prevents old replacement; Replace first makes later old revoke AlreadyRevoked / لا استهداف للخلف |
| D Replace/Replace | One replacement; stale expected-old loser conflicts without replay / فائز واحد وتعارض الخاسر بلا إعادة |
| E Copy/Revoke | Copy first may return later-invalid URL; revoke first prevents retrieval / لا ضمان بعد الاستجابة |
| F Copy/Replace | Copy first returns old URL; replacement first means tuple Copy sees new active grant / النسخ بعد الاستبدال يرى الجديد |
| G Inspection/write | One statement snapshot includes commits visible at snapshot; later writes require later inspection / لقطة واحدة لا ضمان دائم |

No advisory-lock framework or global SERIALIZABLE redesign. Tests must establish actual lock ordering/blocking and durable outcomes, not timing-only expectations.

لا إطار أقفال استشارية أو تحويل عام إلى SERIALIZABLE؛ تثبت الاختبارات ترتيب الأقفال والحجب والنتيجة الدائمة دون الاعتماد على التوقيت وحده.

## 14. Constraint classification, transaction retries and candidate budget | تصنيف القيود والمحاولات والمرشحات

On `23505`, inspect structured code + exact constraint identity through the known driver/Drizzle cause boundary, never messages. Use exact full-name equality: `catalog_public_product_share_grants_active_uq` -> ActiveTupleConflict; `catalog_public_product_share_grants_pk` -> GrantIdConflict; `catalog_public_product_share_grants_digest_uq` -> LookupDigestConflict. No prefix/suffix/wildcard matching. Unknown/missing identities are sanitized persistence failure; foreign/check violations are not uniqueness retries. No raw SQL/parameter/code/message/stack/cause escapes lifecycle results.

يُصنف `23505` بالرمز البنيوي والاسم الحرفي الكامل للقيد عبر حد المحرك وDrizzle دون الرسائل أو مطابقة البادئة أو اللاحقة أو المحارف العامة. تُربط أسماء القيود الثلاثة المحددة بنتائجها فقط؛ الغامض والمفقود فشل حفظ آمن، ولا تعاد أخطاء الملكية والقيود الأخرى. لا تسرب تفاصيل SQL أو المعاملات أو الاستثناء.

Issue alone permits maximum **3 TOTAL outer transaction attempts** for ActiveTupleConflict, `40001` or `40P01`. Roll back before recovery/re-read; every retry uses a fresh transaction and current context/scope/resource checks. Never retry authorization, eligibility, key/integrity failure or unknown `23505`. Copy/Revoke/Replace have no automatic outer business replay. Attempt exhaustion returns sanitized ServiceUnavailable; stale Replace returns ExpectedCurrentGrantConflict.

للإصدار وحده ثلاث معاملات خارجية إجمالاً كحد أقصى للفئات المحددة، مع التراجع ومعاملة جديدة وفحوص حالية قبل إعادة القراءة. لا إعادة لأخطاء السلطة أو الأهلية أو المفاتيح أو السلامة أو `23505` الغامض. لا إعادة خارجية تلقائية للنسخ أو الإلغاء أو الاستبدال؛ يؤدي الاستنفاد إلى ServiceUnavailable آمن، والاستبدال القديم إلى تعارضه المحدد.

Maximum **3 generated bearer candidates PER OPERATION**, shared across all attempts; each candidate uses fresh UUID/token/IV and active write keys. Existing-grant reuse does not consume a candidate. Do not reset the budget on rollback/retry or return another tuple's collision winner.

ثلاث مرشحات رمز كحد أقصى للعملية كلها عبر كل المحاولات؛ كل مرشح بهوية ورمز وIV عشوائي جديد ومفاتيح الكتابة النشطة. لا تستهلك إعادة الاستخدام مرشحاً ولا يُعاد ضبط الميزانية أو يُعاد فائز ثلاثية أخرى.

**Adapter detail accepted by independent planning review (PASS):** isolate only the insert in a transaction-local Drizzle nested transaction/savepoint. The installed NodePgTransaction supports SAVEPOINT/release/rollback. Roll back that insert scope before returning a positively named GrantIdConflict/LookupDigestConflict; Application may consume the next candidate within the same locked outer lifecycle transaction. This is candidate regeneration, not business replay or a fresh authorization result, and adds no general retry/savepoint framework. ActiveTupleConflict still rolls back the outer Issue before a fresh attempt. Serialization/deadlock/unknown failures abort the outer transaction. Replace candidate collisions cannot release locks, replay old revocation or adopt a new expected identity; exhaustion/unknown failure rolls back the entire replacement. No query is allowed in an aborted transaction. This adaptation is not claimed as an existing application-level repository pattern and passed independent planning review; real database collision/rollback tests remain mandatory during authorized implementation.

**تفصيل محول اعتمدته المراجعة المستقلة الناجحة:** يُعزل الإدراج وحده بنقطة حفظ عبر معاملة Drizzle متداخلة يدعمها المحرك المثبت. يُتراجع عنها قبل نتيجة تصادم هوية أو بصمة ذات قيد معروف، ويمكن استهلاك المرشح التالي داخل المعاملة الخارجية المقفلة نفسها؛ هذا توليد مرشح لا إعادة أعمال أو سلطة جديدة ولا إطار عام. يظل تعارض الثلاثية سبباً لتراجع الإصدار الخارجي قبل معاملة جديدة؛ وتُجهض أعطال التسلسل والتعطل والغموض المعاملة الخارجية. لا تفك تصادمات مرشح الاستبدال الأقفال أو تعيد إلغاء القديم أو تتبنى هوية فائز جديد؛ يعيد الاستنفاد أو الغموض كل الاستبدال. لا قراءة داخل معاملة مجهضة. اعتمدت المراجعة المستقلة هذا التكيف دون ادعاء سابقة تنفيذية؛ تبقى اختبارات التصادم والتراجع الحقيقية إلزامية أثناء التنفيذ المعتمد.

## 15. Revision and CAS | المراجعة وCAS

Initial revision1; first revoke +1; repeat unchanged; replacement-old +1 and new1. Existing protected-value `save` requires expected revision, unrevoked state, exact immutable scope and a complete validated update; the aggregate's updateProtectedValues remains available but no maintenance execution job is added. Reject exhaustion before mutation. Keep safe-positive BIGINT/number mapping exact. ExpectedCurrentGrantId controls stale Replace; do not add expectedRevision to P5's accepted HTTP body.

المراجعة تبدأ بـ1 وتزيد مرة عند الإلغاء، ولا تتغير بالتكرار؛ يزيد القديم في الاستبدال ويبدأ الجديد بـ1. يحفظ التحديث المحمي CAS والنشاط والهوية والاكتمال دون إضافة وظيفة صيانة. يُرفض الاستنفاد قبل التغيير وتُحفظ الدقة؛ تتحكم هوية التفويض الحالي في الاستبدال ولا يُضاف حقل مراجعة لجسم HTTP.

## 16. Atomic audit and disclosure prevention | التدقيق الذري ومنع الكشف

Extend shared audit vocabulary only with `publicProductShareIssued: PublicProductShareIssued`, `publicProductShareRevoked: PublicProductShareRevoked`, `publicProductShareReplaced: PublicProductShareReplaced`. Bind the existing shared audit persistence to the lifecycle transaction; no separate post-commit event consumer. New Issue and first Revoke each emit one event; reuse/Copy/repeat emit none; Replace emits one correlated replacement event. Safe metadata is explicitly constructed from grantId/productId/branchId and previousGrantId for replacement; actor/Workspace/time are typed audit fields, resultCode fixed Succeeded. No arbitrary spread or metadata channel.

تُضاف قيم التدقيق الثلاث فقط إلى الملكية المشتركة وتُربط بالحفظ داخل معاملة دورة الحياة، دون مستهلك لاحق. يصدر الإصدار الجديد وأول إلغاء حدثاً واحداً، ولا أحداث لإعادة الاستخدام والنسخ والتكرار، والاستبدال حدث مترابط واحد. تُبنى البيانات من الهويات المعتمدة فقط، مع حقول الممثل والمساحة والزمن ونتيجة ثابتة دون نشر الكائن أو قناة بيانات عامة.

Never audit/log bearer, URL, digest, envelope/IV/tag/ciphertext, keys, raw configuration/environment or DB/crypto exceptions. Shared forbidden-name regex is insufficient; value-safe allow-list construction and sentinel tests are mandatory. Audit failure rolls back grant changes and envelope clearing. Snapshot/row serialization is confined to explicit persistence handoff, never diagnostic objects or management responses.

يحظر تسجيل القيم المحمية والإعداد والاستثناءات الخام. لا تكفي قائمة أسماء محظورة؛ يلزم بناء آمن للقيم واختبارات علامات اصطناعية. يعيد فشل التدقيق كل تغيير ومحو، ويقتصر تسلسل الحالة على التسليم الصريح للحفظ دون التشخيص والاستجابة.

## 17. Authorization and P5 permission sequencing | التفويض وتسلسل صلاحيات P5

P4 accepts only real TrustedActorContext from authenticated composition; Workspace/actor are not arbitrary command fields. Issue/reuse/Copy/Replace enforce `catalog.sharing.publicLink.manage`, `catalog.products.view`, `pricing.view` and current Branch Scope. Revoke enforces management permission, scoped grant ownership and Branch Scope, without view/pricing. Current effective capabilities are checked for every operation/Issue attempt; never infer authority from original issuer, role label, Direct Share permission or anonymous input. Restricted sessions cannot supply full authority. Full-session resolution/revalidation occurs before Product/grant mutation locks.

تستقبل P4 السياق الحقيقي من تركيب موثق، لا هويات عشوائية. تُفرض صلاحيات الإدارة ورؤية المنتج والسعر والنطاق للإصدار وإعادة الاستخدام والنسخ والاستبدال؛ الإلغاء يحتاج الإدارة والملكية والنطاق دون الرؤية والسعر. يُفحص التفويض الحالي دائماً ولا يُستنتج من المصدر أو الدور أو المشاركة المباشرة أو مدخل مجهول؛ لا سلطة كاملة للجلسة المقيدة، وتسبق إعادة الحل أقفال التعديل.

P4 may declare/use the exact permission literal for Application compilation/tests. P5 owns registry/assignment activation, session/HTTP wiring, transport/UI and explicit Copy interaction controls; do not alter Identity permission registry, assignment schema or UI in P4. P4 test contexts represent authenticated capability inputs, not a production fake-actor fallback; do not mount a live management route before P5 activation.

يمكن استخدام اسم الصلاحية الدقيق في Application والاختبارات؛ تملك P5 تفعيل السجل والتعيين وربط الجلسة وHTTP والواجهة وضوابط النسخ. لا تغير P4 سجل Identity أو مخطط تعيينه أو واجهته. تمثل سياقات الاختبار مدخلات موثقة لا ممثلاً وهمياً إنتاجياً، ولا تُركب مسارات إدارة قبل P5.

## 18. Current eligibility and resource reads | الأهلية الحية وقراءة الموارد

New Issue/Replace require Published Product, Active Branch, explicit Listed record, safe name, supported valid current Retail/currency and qualifying Public Key Specs under parent sections 5–7. Preserve zero/false; absent override permits base Retail but invalid present override does not. Definitions/template/values must be current and same-Workspace; no internal ID fallback, duplicate specification model, template Active flag or first-N shortcut. Evaluate pure issuance eligibility on the resource port's existing typed state without implementing a public DTO/media pipeline. Existing active reuse/Copy ignore temporary eligibility loss; revoke ignores eligibility entirely. Never persist an eligibility snapshot.

يتطلب الإصدار الجديد والاستبدال المنتج والفرع والإدراج والاسم والسعر والمواصفات الحية وفق العقد، مع حفظ الصفر وfalse والتمييز بين غياب تجاوز السعر وفساده. تُحفظ ملكية المواصفات وحداثتها دون بدائل معرفات أو نموذج مكرر أو حالة قالب مخترعة أو أول-N. تُقيّم أهلية الإصدار على الحالة الداخلية دون إسقاط عام أو وسائط؛ تتجاوز إعادة الاستخدام والنسخ عدم الأهلية المؤقت، ولا يعتمد الإلغاء عليها، ولا تُحفظ لقطة.

Implement bounded tenant-bound joins/queries in the resource adapter, not calls to other repositories. Historical/inactive Branch lookup remains available for Copy/Revoke. Do not reuse Direct Share's Active-only Branch lookup, Inventory projection or internal-label fallback. P6 later owns public projection and independent request-time read snapshots; eligibility mutations are not claimed to share grant locks.

تُنفذ استعلامات مقيدة بالمستأجر دون استدعاء مستودعات أخرى مع دعم الفروع التاريخية وغير النشطة. لا يُنسخ قارئ المشاركة المباشرة أو مخزونها أو بديل تسميتها الداخلية. تملك P6 الإسقاط العام ولقطات الطلب المستقلة، دون ادعاء اشتراك كتّاب الأهلية في الأقفال.

## 19. Service-wide persisted inspection port | منفذ الفحص المحفوظ على مستوى الخدمة

Add `domains/catalog/sharing/ports/public-share-key-version-inspection.port.ts` with this narrow planned shape; no caller Workspace parameter and no grant/digest/envelope/key payload:

```ts
interface PublicSharePersistedKeyVersionEvidence {
  readonly lookupVersions: readonly number[];
  readonly encryptionVersions: readonly number[];
  readonly inspectedAt: Date;
  readonly source: "PostgreSqlPublicProductShareGrants";
  readonly scope: "ServiceWide";
  readonly consistency: "StatementSnapshot";
}
type PublicShareKeyVersionInspectionResult =
  | { readonly type: "Inspected"; readonly evidence: PublicSharePersistedKeyVersionEvidence }
  | { readonly type: "Unavailable" | "IntegrityFailure" };
interface PublicShareKeyVersionInspectionPort {
  inspect(): Promise<PublicShareKeyVersionInspectionResult>;
}
```

هذا منفذ محدود بلا مساحة يحددها المتصل أو حمولة صفوف أو بصمات أو أغلفة أو مفاتيح. يُمثل النجاح بأدلة مجموعات كاملة ووقت ومصدر ونطاق واتساق ثابتة، ويُفصل الغياب التشغيلي عن فشل السلامة دون تفاصيل خام.

One service-wide PostgreSQL statement snapshot aggregates distinct lookup versions from **all unrevoked grants**, and encryption versions from their **complete unrevoked envelopes**; revoked history is excluded. Use one statement/CTE aggregation with an invalid-state/version indicator and database statement timestamp, not separate ordinary queries. A malformed/unsafe/null required version or incomplete active envelope fails the whole inspection rather than disappearing through WHERE filtering. Validate bigint arrays exactly before returning immutable numeric sets. Successful empty store returns Inspected with two explicit empty arrays. DB failure returns Unavailable, not empty/UNCHECKED success. Never LIMIT/truncate to ring size; if resource bounds prevent complete evidence, fail rather than certify a subset.

تجمع عبارة PostgreSQL واحدة نسخ البحث المميزة لكل غير الملغاة ونسخ تشفير أغلفتها الكاملة على مستوى الخدمة، وتستبعد التاريخ الملغى. تتضمن العبارة مؤشر فساد وزمنها دون قراءتين عاديتين؛ يفشل الفحص كله عند نسخة مشوهة أو غير آمنة أو مطلوبة مفقودة أو غلاف نشط ناقص، ولا تُخفى بالشروط. تُثبت المصفوفات الكبيرة بدقة وتُعاد مجموعات ثابتة؛ المخزن الفارغ الناجح أدلة بمصفوفتين فارغتين، والعطل ليس فراغاً ناجحاً. لا اقتطاع إلى حجم الحلقة؛ يفشل تعذر الاكتمال بدلاً من اعتماد جزء.

## 20. P3 evaluator composition and freshness | تركيب مقيّم P3 والحداثة

Only an Infrastructure/Application composition boundary feeds successful evidence sets to `runtime.evaluateCoverage` / the existing pure evaluator. No database access, changed crypto/configuration or new durable field is added to P3. Its `durableCoverage` remains literally UNCHECKED even if membership is COVERED. Represent persisted inspection evidence separately; failed/absent inspection cannot become successful empty evidence. P4 planning/execution itself supplies no live durable proof today.

يصل الدليل الناجح إلى المقيّم عبر حد التركيب فقط دون قاعدة داخل P3 أو تغيير تشفيره وإعداده وحقل التغطية. يبقى UNCHECKED حرفياً حتى إن نجحت مقارنة العضوية؛ تُفصل أدلة الفحص ولا يحول فشلها أو غيابها إلى فراغ ناجح. لا يقدم التخطيط الحالي إثباتاً دائماً حياً.

Evidence describes only that statement snapshot/configuration comparison, not future writers or production readiness. A subsequent lifecycle/configuration change requires a later inspection before a consumer claims current coverage. Production key retirement/writer coordination is separately gated; no permanent READY flag, persistence of readiness, scheduler or HTTP route. Revoke stays independent of coverage/keys/origin. Later P5/P6 composition must obey the parent's fail-closed management/lookup requirements and cannot treat P3 startup validation as durable inspection.

تصف الأدلة اللقطة والمقارنة فقط لا المستقبل أو الجاهزية الإنتاجية؛ يستلزم التغير فحصاً لاحقاً قبل ادعاء التغطية الحالية. تنسيق الكتّاب وسحب المفاتيح مؤجلان، دون علامة READY دائمة أو حفظ جاهزية أو مجدول أو مسار. يبقى الإلغاء مستقلاً، وتلتزم P5/P6 لاحقاً بالفشل المغلق ولا تخلط تحقق بدء P3 بالفحص الدائم.

## 21. Shared lookup and maintenance boundaries | حدود البحث المشترك والصيانة

The already-declared `findByDigestCandidates` may be implemented/tested as a P4 persistence primitive: validated bounded P3 candidates, exact version+digest matching, no client-selected scope, no match versus impossible multiple matches, strict state mapping and no decryption. P6 still owns anonymous admission/token parsing/resolution/public projection. No anonymous use case or route is created in P4.

يمكن تنفيذ عملية البحث المعلنة كأداة حفظ مشتركة محدودة بمرشحات P3 ومطابقة النسخة والبصمة والتمييز بين الغياب والتعدد المستحيل والتحويل الصارم دون فك أو سلطة مساحة من العميل. تبقى القراءة المجهولة والقبول والحل والإسقاط لـP6 دون حالة استخدام أو مسار عام في P4.

P4 implements only normal lifecycle, existing required CAS primitives and persisted inspection. No scheduler, batch re-digest/re-encrypt, deployment automation, recovery command, key-retirement command or revoked-envelope restoration. Existing maintenance CAS must reject revoked rows and preserve immutable identity. Any future execution tooling requires separate approval.

تقتصر P4 على دورة الحياة وCAS المطلوب والفحص دون دفعات أو مجدول أو نشر أو أوامر استرداد وسحب أو استعادة غلاف ملغى. يرفض CAS الملغاة ويحفظ الهوية؛ يحتاج التنفيذ المستقبلي اعتماداً منفصلاً.

## 22. Additive migration and rollout | الترحيل الإضافي والنشر

Plan next migration from this baseline, likely `0017_public_product_share_grants.sql`, using existing Drizzle numbering/journal/snapshot conventions only during authorized implementation. Recheck numbering before generation. New initially-empty table plus its constraints/FKs/indexes; no data backfill or existing table rewrite. Schema first; lifecycle writers disabled until schema exists. Review migration lock footprint on referenced tables and guarded clean-database behavior. Rollback of application activation does not authorize deleting grants after writers exist. No migration/deployment execution or P7 production-completion claim in planning.

يُخطط للترحيل التالي المحتمل بالاسم المذكور مع مراجعة الترقيم وتحديث سجل ولقطة Drizzle أثناء التنفيذ المعتمد فقط. الجدول جديد وفارغ أولاً دون ملء بيانات أو إعادة كتابة جداول. يسبق المخطط الكتّاب المعطلين حتى وجوده، وتُراجع أقفال المراجع والقاعدة النظيفة. لا يبيح تراجع التطبيق حذف التفويضات؛ لا تشغيل ترحيل أو نشر أو اكتمال P7 هنا.

## 23. Mandatory PostgreSQL and concurrency acceptance | القبول الإلزامي للقاعدة والتزامن

Real guarded PostgreSQL integration is mandatory during P4 implementation. Use the existing disposable TEST target guard/preparation and [integration TypeScript configuration](../../tsconfig.integration.json); never application/production data. Plan explicit new test paths because the current integration script enumerates filenames. Browser QA is NOT REQUIRED for P4: no Presentation; manual database/history/audit inspection is separate required review evidence.

يلزم تكامل PostgreSQL حقيقي ومحمي أثناء التنفيذ عبر أدوات TEST الحالية ومسارات صريحة، لا بيانات تطبيق أو إنتاج. لا يلزم متصفح لغياب Presentation؛ تُراجع القاعدة والتاريخ والتدقيق بصورة منفصلة.

| Category / الفئة | Required proofs / الإثبات المطلوب |
| --- | --- |
| Schema | PK/FKs/RESTRICT, named checks/indexes, UUID/nonblank/digest/encoding, all active/revoked envelope combinations, no plaintext/URL/key/extra snapshot columns / القيود وكل حالات الغلاف دون أعمدة محظورة |
| BIGINT | Accept 2147483647/2147483648/9007199254740991 for both versions; reject 0/negative/above-safe, round-trip exact mapping; safe revision/exhaustion / حدود النسخ ودقة التحويل والمراجعة |
| Cardinality | One active per tuple, zero after revoke, successor after revoke, eligibility never changes predicate, independent Branch tuples / العدد والخلف دون أهلية محفوظة |
| Tenant/digest | Cross-Workspace Product/Branch inserts rejected; scoped reads/locks/CAS; global digest unique across revoked history; exact version+digest pairs / الملكية وتفرد التاريخ |
| Transactions | Real commit/rollback, audit failure rollback, explicit Rollback after write, Replace failure restores old envelope/revision, no URL before failed/unfinished commit / الذرية وعدم خروج الرابط |
| Revoke bypass | Persisted noncanonical/protected corruption fails strict retrieval yet safely revokes via minimal projection; columns cleared/audit once/no protected return; invalid lifecycle still fails / فساد الاسترجاع لا يمنع الإبطال المقيد |
| Coverage | All-Workspace active sets, revoked excluded, successful empty, unavailable/unsafe version failure, no truncation, one snapshot under writes / اكتمال الفحص ونطاقه ولقطته |
| Races | Separate connections/barriers for A–G and same Product/different Branch; observed blocking, one winner/audit, stale loser, no successor mis-targeting / حواجز حقيقية وترتيب ونتائج |
| Collision/budgets | Exact three constraints, unknown 23505 fails, savepoint recovery keeps outer transaction valid, three-candidate total across Issue attempts, active-race retry then reuse, full replacement rollback on exhaustion / تصنيف محدود وميزانيات وتراجع |

Prove 40001/40P01 budget logic deterministically in Application/adapter tests; use real database fault/concurrency evidence where reliable, explicitly label injected SQLSTATE tests rather than claiming an actual natural deadlock. Never rely on sleeps alone; follow existing barrier/lock-observation precedent. No P4 tests are executed or claimed PASS in this planning task.

تُثبت ميزانية أخطاء التسلسل والتعطل بصورة حتمية، ويُستخدم دليل قاعدة حقيقي حيث يمكن دون ادعاء أن حقن SQLSTATE تعطل طبيعي. لا توقيت وحده؛ تُستخدم الحواجز ومراقبة الأقفال. لا اختبارات P4 مشغلة أو مدعاة ناجحة الآن.

## 24. Security, Application and regression tests | اختبارات الأمن وApplication والانحدار

Plan deterministic Issue/reuse/Copy/Revoke/repeat/Replace outcomes, current capability/scope denial, inactive-known Branch behavior, full issuance eligibility, stale expected identity/CAS, no replay and exact audit counts. Real crypto integration must persist/recover the same active URL, authenticate every AAD identity, verify digest after decrypt, reject corrupt digest/envelope and missing retained keys without generation, prove key/origin-free revoke, irreversible disposal and no revoked recovery. Capture logs/errors/audit with synthetic values under innocent property names; expose typed failures only. Test new BIGINT mapping and unchanged P3 Node 24/no-message classification contracts.

تُختبر النتائج والصلاحيات والنطاق والأهلية والتعارض والتدقيق بصورة حتمية، والتشفير الحقيقي وثبات الرابط وكل AAD والبصمة والفساد والمفاتيح المفقودة دون توليد، والإلغاء دون مفاتيح أو أصل والمحو الدائم. تُفحص العلامات الاصطناعية في التسجيل والتدقيق والأخطاء، مع BIGINT وعقد P3 الثابت دون مطابقة الرسالة.

During authorized implementation: focused P4 Application/repository tests first, explicit new guarded PostgreSQL/concurrency paths, P1 Sharing Domain/contract regressions, relevant P2 Reference Data, the exact P3 90 crypto/runtime suite, Direct Sharing and affected Product/Branch/Identity/audit regressions. Final gates: `npm test`, guarded `npm run test:integration` plus explicit P4 paths, `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build`, `git diff --check`, strict UTF-8/local-link/Markdown/status checks and automated task review bundle. Do not assume current generic test scripts discover new files. No new test dependency. No browser acceptance inferred from tests.

أثناء التنفيذ المعتمد تُشغل الاختبارات المركزة ثم القاعدة والحواجز والانحدارات المذكورة، ثم الأوامر النهائية ومسارات P4 الصريحة وفحوص الوثائق والحزمة. لا يُفترض اكتشاف السكربتات الحالية للملفات الجديدة أو تُضاف مكتبة اختبار أو يُستنتج قبول متصفح.

## 25. Exact likely implementation inventory | قائمة التنفيذ المرجحة الدقيقة

New files proposed for implementation review / ملفات جديدة مقترحة لمراجعة التنفيذ:

- `domains/catalog/sharing/application/public-product-share.use-cases.ts` and `.test.ts`.
- `domains/catalog/sharing/application/public-product-share-eligibility.ts` and `.test.ts` (internal pure issuance policy, not public projection).
- `domains/catalog/sharing/infrastructure/persistence/public-product-share-grant.mapper.ts` and `.test.ts` (strict mapper plus isolated lifecycle-only validation).
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-grant.repository.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-resource.adapter.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-audit.adapter.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-unit-of-work.ts` and `.test.ts`.
- `domains/catalog/sharing/ports/public-share-key-version-inspection.port.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-key-version-inspection.adapter.ts` and `.test.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share.integration.test.ts`.
- `domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-concurrency.integration.test.ts`.
- `domains/catalog/sharing/infrastructure/public-product-share-lifecycle-runtime.ts` and `.test.ts` (internal composition only, no HTTP/serving enablement).
- Next reviewed `drizzle/0017_*.sql`, journal/snapshot artifacts and bilingual implementation report/evidence.

Existing files likely modified / ملفات حالية مرجح تعديلها:

- `domains/catalog/infrastructure/persistence/schema.ts`: new table, existing registration unchanged.
- `domains/catalog/sharing/ports/public-product-share-grant-repository.port.ts`: exact section 8 Revoke-only extension; existing operations unchanged.
- `shared/audit/audit.port.ts`: three event values only.
- `package.json`: existing integration execution list may add explicit P4 paths; no dependency change/new framework.
- Current P4 status/contract/report documentation as approved.

Filename finalization may follow the reviewed responsibilities, never scope expansion. Do not modify P3 crypto/runtime, normal grant rehydration, Identity permission registry/schema, routes, Presentation, Drizzle registration architecture or .serena. No production maintenance tooling belongs in this inventory.

يمكن إنهاء أسماء الملفات وفق المسؤوليات المراجعة دون توسيع النطاق. لا تعديل لتشفير وتشغيل P3 أو التحويل الطبيعي للنموذج أو سجل ومخطط صلاحيات Identity أو المسارات والعرض أو معمارية Drizzle أو Serena، ولا أدوات صيانة إنتاجية.

## 26. Planning checks and review evidence | فحوص التخطيط وأدلة المراجعة

This documentation task runs only git diff/integrity, strict UTF-8, local links, Markdown fences, status/decision consistency and a whole-repository source freeze against the pre-planning snapshot. Allowed changes are this plan, its final report, Current Roadmap, Sprint continuation and narrow parent-contract corrections. Verify no TypeScript/schema/migration/dependency/tooling/ADR/P3 source change, no staging/commit/push, and unchanged Serena hash. No PostgreSQL, browser, technical tests, typecheck/lint/build, dependency installation or implementation execution.

تقتصر المهمة على سلامة Git وUTF-8 والروابط والبنية والحالة والقرارات وثبات مصادر المستودع. التغييرات المسموحة هي الخطة وتقريرها والحالة والتصحيح المحدود للعقد. لا تغييرات تنفيذية أو تجهيز أو Git متقدم، وتثبت بصمة Serena. لا قاعدة أو متصفح أو اختبارات تقنية أو فحص أنواع أو lint أو بناء أو تثبيت.

The final report uses the existing task-review API with a documentation-only collectVerification profile and actual command records, not the default PostgreSQL collector. Preserve exact source documents; sanitize evidence only; exclude credentials/real env files; retain normal source fingerprint, manifest, archive/export/checksum checks. Intended final locations: `artifacts/task-reviews/3.23-P4-planning-final/` and matching `QSC-Reviews/3.23-P4-planning-final/`. These are local ignored review artifacts, not implementation/CI evidence or files to stage.

تستخدم الحزمة API المراجعة الحالي وملف تحقق توثيقي بسجلات فعلية دون مجمع PostgreSQL الافتراضي. تُحفظ المصادر وتُنقح الأدلة وحدها وتُستبعد الأسرار مع الفحوص المعتادة. المسارات المذكورة أدلة محلية مستبعدة لا دليل تنفيذ أو CI ولا نطاق تجهيز.

## 27. Stop conditions, risks and independent review | التوقف والمخاطر والمراجعة المستقلة

Stop implementation planning approval if baseline/scope changes, an accepted policy becomes inconsistent, BIGINT exactness cannot be proved, strict mapping is weakened, Revoke reads/returns protected data, unknown unique errors become retryable, transaction/candidate budgets reset, audit can leak or commit separately, coverage truncates/fakes scope/empty success, P3 becomes impure, or any P5–P7/maintenance/UI/route/dependency/architecture expansion is required. Bring the concrete conflict to review rather than silently altering contracts. Source/manifest mismatch or secret evidence blocks the bundle.

يوقف الاعتماد عند تغير الأساس أو النطاق أو تعارض السياسة أو غياب إثبات BIGINT أو إضعاف التحويل أو كشف Revoke للمحمي أو إعادة أخطاء غامضة أو تصفير الميزانيات أو تسريب التدقيق وفصل ذرّيته أو تزوير التغطية أو جعل P3 غير خالص أو الحاجة لتوسيع النطاق. يُعرض التعارض صراحة دون تغيير صامت؛ تمنع بصمات غير مطابقة أو أسرار الحزمة.

Independent planning review PASS accepts the concrete ports, insert-local savepoint adaptation, tests and file inventory. PlanningBlockers: NONE. DecisionsStillRequired: NONE for planning. Separate P4 implementation authorization remains required; no technical implementation tests were run during planning. Accepted technical contracts remain unchanged.

نجحت المراجعة المستقلة واعتمدت المنافذ ونقطة حفظ الإدراج والاختبارات وقائمة الملفات. لا عوائق أو قرارات تخطيط متبقية؛ يبقى تصريح تنفيذ P4 المنفصل مطلوباً. لم تُشغل اختبارات تنفيذ تقنية أثناء التخطيط، وتبقى العقود التقنية المعتمدة دون تغيير.

## 28. Final planning handoff | تسليم التخطيط النهائي

**P4PlanningDiscovery: PASS. P4PlanningStatus: COMPLETE / REVIEWED. P4IndependentPlanningReview: PASS. P4PlanningReview: PASS. P4PlanningGate: PASS. P4Status: READY_FOR_IMPLEMENTATION. PlanningBlockers: NONE. DecisionsStillRequired: NONE for planning. P4ImplementationStarted: NO. P4ImplementationAuthorization: NOT AUTHORIZED YET. P5–P7: GATED / NOT STARTED. P5ToP7WorkPerformed: NO. DurableCoverage: UNCHECKED.** No production/public-serving readiness claim. Stop for review; separate explicit authorization is required before implementation.

**اكتمل تخطيط P4 وراجعتْه المراجعة المستقلة بنجاح ونجحت بوابته؛ P4 جاهزة للتنفيذ. لا عوائق أو قرارات تخطيط متبقية؛ التنفيذ لم يبدأ ولم يُعتمد بعد؛ P5–P7 مشروطة ولم تبدأ؛ التغطية الدائمة UNCHECKED.** لا ادعاء جاهزية إنتاج أو خدمة عامة. يتوقف العمل للمراجعة، ويلزم تصريح تنفيذ صريح منفصل.
