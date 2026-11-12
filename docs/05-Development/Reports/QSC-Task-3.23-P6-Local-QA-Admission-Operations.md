> Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.** See the dated recovery alignment below. Earlier strict universal-closure assurances are historical within this scope only.
> قرار المالك2026-10-24: اعتماد I4-B/D-V1 لتعافي القبول العام فقط وتأهيل QA المحلي، مع بقاء القبول HOLD. العبارات الصارمة السابقة تاريخية ضمن هذا النطاق فقط.

# P6 Local QA Admission Operations | تشغيل قبول P6 للاختبار المحلي

2026-10-22. Owner-authorized A–O implementation for **LOCAL QA ONLY**. P6_ENGINEERING_CANDIDATE; acceptance **HOLD**. This dated authorization supersedes the decision package's historical PROPOSED-only execution restriction for local QA; it does not approve production or waive its qualifications.

اعتمد المالك تنفيذ A–O للاختبار المحلي فقط. تبقى P6 مرشحاً هندسياً وقبولها HOLD. لا يغير هذا التصريح التاريخ الأصلي للحزمة أو يسمح بالإنتاج أو يسقط بوابات التأهيل.

## Boundaries | الحدود

- Admission Infrastructure implements the existing PublicShareAdmissionPort; no Domain/Application port change, Identity actor, dependency, Redis, P7 page or JSON data API.
- Explicit createIsolatedPublicShareQaRuntime composes existing HMAC lookup, read-only REPEATABLE READ, tenant-bound repositories, final view allowlist, local bounded current-main file reader and native media HTTP factory. It is never auto-selected from environment. Production mode rejects construction. Mounted Next GET/HEAD remain503; prior405/OPTIONS and EN/AR503 corrections are unchanged.
- QA fixture verifies the real loopback socket, drops incoming forwarding/source headers, constructs a new Request, overwrites one canonical header and registers that exact object in a WeakSet. A header alone never supplies trust. This is a simulated isolated ingress, not a deployed Nginx/CDN claim.

ينفذ Infrastructure المنفذ المعتمد دون تغيير المجال أو المنافذ أو اعتماد جديد. التركيب صريح ومعزول ولا يُفعل تلقائياً أو في الإنتاج. يتحقق وكيل الاختبار من المقبس الحقيقي ويستبدل الرؤوس ويسجل هوية كائن الطلب؛ لا تكفي قيمة رأس لإثبات الثقة. يبقى مسار Next المثبت مغلقاً503 وتُحفظ التصحيحات السابقة.

## Exact QA budgets | حدود QA الدقيقة

| Scope / النطاق | Sustained / المستدام | Burst / الدفعة |
| --- | --- | --- |
| Global requests combined |20/s|40|
| Global Page and Media separately |10/s each|20 each|
| Source combined |4/s|20|
| Source Page and Media separately |2/s each|10 each|
| Workspace combined |10/s|20|
| Grant combined |4/s|10|
| Global native bytes |32MiB/s|160MiB|
| Workspace and source native bytes separately |16MiB/s each|80MiB each|
| Native reads global / Workspace / source / grant |4 / 2 / 2 / 2|not a transmission limit|

Source charges global/source/route requests once; Resolved charges Workspace/grant requests once; MediaRead charges bytes and occupancy once. Page preflight and subsequent Media/HEAD each reserve8MiB independently; no actual-byte refund. Known budget exhaustion429 with Retry-After1–60, all unavailable/configuration/uncertain conditions503. No local Allow.

تُحسب الطلبات مرة لكل مرحلة وبايتات القراءة والحجز في MediaRead فقط، مع احتساب فحص صورة الصفحة وطلب الصورة كلٌ على حدة بحد8MiB دون استرداد. لا إعفاء للزواحف أو مسارات سماح محلية. تختلف حجوزات القراءة عن اتصالات إرسال الرد.

## Transactions and uncertainty | المعاملات والغموض

Continuous scaled bigint arithmetic (scale1000) uses sampled PostgreSQL time under the serialization guard and clamps backward refill. Session advisory lock3230601 precedes policy row, then bucket keys in total order; cleanup/release/recovery take the policy guard. Allocation/count/debit/reservation are serialized across instances, not process-local COUNT-then-INSERT. No debit on a rejected phase; earlier committed phases remain charged.

Three SECURITY INVOKER PostgreSQL functions perform intent, atomic decision and finalization in three driver round trips. This replaces the initial25-round-trip candidate that could exhaust the unchanged200ms deadline. A committed pending_operation intent precedes the debit transaction; session coordination spans intent/debit/finalization. A definitive successful finalization clears that intent. A failed/ambiguous transaction leaves a durable marker; new/restarted adapters refuse it. Known row-cap rejection finalizes normally and503s without evicting rows. Failed connections are destroyed, not reused with live transactions. No Allow is returned after the200ms decision deadline. A once-per-client transport error listener prevents an unhandled secondary pg error after a query rejects; query/pool failure still closes access and raw driver errors are never logged. Driver timeouts complement server timeouts; event-loop/host starvation is not a hard real-time guarantee.

Main pool8, admission pool2 per instance, up to2 instances. Acquisition75ms; lock50ms; statement100ms; admission overall200ms; snapshot statement750ms. Separate pools still share PostgreSQL CPU/IO. Local headroom inspection is not actual VPS capacity qualification.

تعمل الحسابات المستمرة الصحيحة تحت حارس تسلسلي مشترك وترتيب أقفال ثابت. تسبق نية تشغيلية محفوظة معاملة الخصم، ويمنع غموضها أي سماح من نسخة جديدة حتى المصالحة. لا يزيل رفض السعة حماية نشطة. تُتلف الاتصالات الفاشلة دون إعادة استعمال معاملة حية. تُحفظ حدود الأحواض والمهل المعتمدة؛ لا يَعِد مؤقت JavaScript بزمن حقيقي تحت تجويع المضيف.

## Migration lineage and fresh databases | نسب الترحيلات والقواعد الجديدة

Integrated baseline25e50dad owns Catalog migrations0000–0017. Unmerged P5 owns0018_public_share_manage_permission and0019_public_share_management_admission. Those SQL files, journal, snapshots and numbers are not rewritten/imported. P6's independent operational schema qsc_public_admission has its own0001_public_admission.sql and SHA-256 ledger; no Catalog/grant/Identity FK or Drizzle lineage entry. Apply atomically only through the new-QA guard. Initial policy is closed. Runtime never auto-migrates or auto-opens it. Future integration must retain this explicit operational migrator and verify both lineages; do not run drizzle-kit generate to absorb these tables.

The verification harness creates a unique qsc_p6_admission_test_<digits> database from template0, after loopback5432/name checks and nonexistence verification, then records its ownership under ignored artifacts. Integration verifies an empty user schema before migration. It refuses connection query overrides (including pg ?host=), and performs no migration/reset on existing databases. Test-only synthetic resets are confined to that newly created database between stopped workloads. Every created DB is retained; no DROP DATABASE. Final QA serving closes its policy and its own sockets/pools.

يمنع مخطط تشغيلي ودفتر بصمات مستقلان التصادم مع0018/0019 في P5 دون إعادة ترقيم أو استيرادها أو تغيير دفتر Drizzle. يبدأ الإعداد مغلقاً ولا يرحّل أو يفتح التشغيل تلقائياً. تنشئ الأداة قاعدة جديدة مميزة وتتحقق من خلو المخطط وملكية الجلسة، وترفض تجاوزات عنوان الاتصال. تبقى القواعد السابقة والجديدة محفوظة؛ لا حذف أو reset لقاعدة محمية.

## Source privacy and observability | خصوصية المصدر والرصد

Canonical IPv4/full IPv6, IPv4-mapped normalization, no zone identifiers. Exactly one canonical dedicated header; missing/duplicated/malformed or unregistered Request ->503. HMAC-SHA-256 with a new random32-byte synthetic purpose key; no Identity/share key reuse, production creation or rotation. Source raw addresses are never persisted in operational tables. Workspace/grant operational keys hash unambiguous JSON tuples; canonical business identity semantics remain unchanged and do not become metric labels.

Live idle expiry300s; scheduler60s; bounded cleanup500 rows/step. No active byte-protection row or native lease eviction. The <=360s normal removal target remains **UNQUALIFIED** until measured churn/backlog proves batch capacity;50,000 rows is a closed503 allocation cap. This is not WAL/backup erasure. Lost ephemeral QA source keys cannot reopen retained test databases; use a new owned database, never rotate protected keys to revive one.

Only fixed route/method/status/outcome/stage enums, duration buckets and aggregate occupancy/oldest-age/backlog leave diagnostics. Do not log Request/Error objects, arbitrary paths/queries/Referer/headers, source HMACs, tenant/grant IDs, credentials, bearer, digests or ciphertext. The protocol fault fixture forwards packets in memory but exports no packet capture. Local synthetic collector scans are not every-hop production redaction.

تُشتق هوية المصدر بمفتاح اختبار مستقل دون عنوان خام أو بصمة زائر. تحفظ مفاتيح النطاقات دلالات المعرفات الأصلية دون تسريبها كمقاييس. انتهاء السكون خمس دقائق والتنظيف كل دقيقة بحد500 صف، وهدف360ثانية مشروط بقياس السعة. لا يشمل ذلك WAL أو النسخ الاحتياطية. يقتصر الرصد على قائمة حقول ثابتة ومجاميع ولا تُصدّر حزم الشبكة أو الأسرار.

## Conservative recovery | التعافي المحافظ

1. Close readiness; stop new admissions. Do not delete Catalog, grants, accounts or databases.
2. Drain/verify termination of **every** owner-worker incarnation and actual native I/O. A timeout, PID reuse, Promise.race or aged lease is not proof.
3. In the bounded helper-worker QA facility, startRecoverableQaAdmissionWorker mints the UUID and binds it to an immutable registry handle and actual child. Only that registered terminated handle can authorize exact listed-lease recovery (max2 workers/100 IDs); mismatched, live or unknown ownership rejects. Foreign/unknown operational leases keep recovery closed. Release is idempotent and does not reset tokens or reopen policy.
4. Registry handles are intentionally process-local capabilities. After operator restart, or for a serving-runtime incarnation not registered by this helper facility, **do not reclaim** using fabricated child objects or PID assertions. Keep closed; broader serving/operator restart proof and runbook qualification remain pending. No heartbeat/fencing architecture was added.
5. For unreconciled counters/restores, remain closed for the approved300s maintenance procedure only after old-worker termination proof; reconcile operational state and reopen deliberately. No automated blank-counter reset or general-purpose recovery command is implemented here. Ambiguous debit-commit tests retain the actual committed lease and intent; no native read was authorized to start.

أغلق الجاهزية وأثبت توقف جميع العاملين والقراءات الفعلية. لا تثبت المهلة أو عمر الحجز أو PID التوقف. تسترد أداة QA فقط المعرفات المحددة لعامل مملوك مسجل ومتوقف وتبقي الحالة المغلقة. عند فقد سجل العملية أو عامل خدمة غير مسجل لا تُختلق أدلة؛ تبقى الحجوزات والوصول مغلقين حتى إثبات مستقل. لا مسح تلقائي للعدادات أو حذف بيانات، ولا بنية نبضات أو fencing جديدة.

## Ingress and qualification | الوكيل والتأهيل

scripts/qa/public-share-ingress.local.conf is an undeployed template, not tested nginx -t. It expresses40/s burst80 global,8/s burst40 source,5s header/10s idle,1MiB/s per media response,8 global and2 source active responses; no URI/Referer/raw-IP logs, parser/error output discarded for this isolated QA template, exact application security headers on proxy errors. Nginx leaky-bucket semantics, HTTP/2, HEAD, buffering, mappedIPv6, TLS certificates, request aborts, origin binding, error parser behavior and actual transfer/global caps all require real deployed testing. No Nginx binary was available; no installation, host service, public tunnel, LAN listener or production change was performed.

Mandatory A–O qualification remains separate:15min10req/s text with>=5 sources/Workspaces/multiple grants;15min2 paired image opens/s globally and<=1/source using representative<=256KiB WebP warm/cold;10-customer NAT scheduled1 open/s and5 opens over1s after idle;8MiB legal boundary slow-client baseline<=0.5opens/s global/<=0.125source. Admissionp95<=25ms/p99<=75ms, TTFBp95<=500ms/p99<=1s,8MiB transfer<=12s at1MiB/s; CPU/RAM/connection/VPS and no unintended429/503. Bounded correctness and tiny latency samples are not these profiles. Saturation shedding and native-read versus outbound limits must remain distinct. Do not mark P6 accepted until those gates are proved.

الملف قالب وكيل غير منشور ولم ينجح له فحص Nginx فعلي؛ لا ثنائيات أو TLS أو VPS مؤهل في البيئة. تُحفظ قيم وحدود A–O ومدد15دقيقة وملفات الصور وشروط NAT والبايتات والزمن والموارد حرفياً. لا تتحول فحوص صحة قصيرة أو عينة زمنية صغيرة إلى نجاح حمل أو إنتاج.

P5 remains34 genuine browser PASS, BROWSER-026/029/030/033/036 deferred with unchanged requirements, BROWSER-034 unresolved, PR65 Draft. No merge, commit, push, deployment, P7 or protected-checkout/Serena change.

تبقى أدلة P5 و34نجاحاً والحالات اليدوية الخمس المؤجلة و034 غير المحسومة وPR65 المسودة كما هي، دون دمج أو إيداع أو دفع أو نشر أو بدء P7.


## Recovery contract alignment — owner-approved 2026-10-24 | مواءمة عقد التعافي المعتمد

Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.**

The exact governing wording and E1–E6 are in implementation-contract section25.1 and the reviewed Recovery-Simplification-Decision-Proposal section2–3. The owner-approved attachment authorizes documentation and focused tests only. No algorithm/schema/port/composition, automatic recovery, dependency, threshold, production or acceptance change is authorized.

Previous strict I4 universally forbade later Allow on any instance after a worker detected covered uncertainty until global proved recovery. New I4-B/D-V1 permits a DISTINCT operation to complete its OWN definitive guarded admission against trusted authoritative state, including on the same still-healthy adapter after non-sticky Acquire/Intent failure. Debit/Finalize quarantine stays. This supersedes the former strict guarantee for Prepare bootstrap and committed Finalize ACKloss, not just its label.

I1/I2/I6/I10/I11 accounting/bounds/ownership/tenant/native-read/deadline/privacy remain. I3 uses own definitive normal admission under validated primary history. Formal R2 A-specific I5 epoch/membership, I7 epoch fencing and I8/I9 lifecycle/terminal-receipt machinery are not claimed implemented; existing shared policy/guard and closed maintenance apply. Previously authorized work may finish with its lease; reclamation requires actual completion or proven termination. No original-result upgrade/replay/refund, recovery-clearing of prior pending, unknown-live-lease expiry or quarantine bypass. Normal Finalize clears only its OWN marker.

Known pending or closed/invalid SHARED state blocks the whole admission namespace, not a chosen tenant. Local inability to establish prerequisites returns503; it is not proof all reachable peers have corrupt state. E1 history/restore trust is not proved by readiness, SQL rows, a fresh UUID or normal guards. Untrusted history requires coordinated closed maintenance; instantaneous propagation of private/unreportable knowledge and automatic recovery are not guaranteed. Restore/OS-process/operator-restart/reopening qualification remains open.

This is a dated contract decision, NOT a runtime fix, new PASS or performance resolution. Keep the previous strict-I4 owner decision, formal R2 DESIGN_BLOCKED report, MEDIUM finding and ACK reproduction as historical evidence. Its blanket-closure acceptance criterion is superseded only in this scope; do not erase or recast it as a repaired vulnerability. Focused tests must assess this approved contract. Existing p95>25ms and failed900s profiles remain FAIL; Nginx/VPS pending.

النص الحاكم وشروط E1–E6 في25.1 من عقد التنفيذ والمقترح المراجع. يستبدل القرار ضمن تعافي القبول العام فقط حظر السماح الشامل بشرط قبول مستقل مؤكد على حالة مشتركة موثوقة. يبقى عزل محول Debit/Finalize، ويجوز طلب جديد على المحول السليم بعد Acquire/Intent. تبقى المحاسبة والحدود والملكية والعزل والقراءة والمهل والحجب، دون ادعاء تطبيق آليات العصر والعضوية والتسليم المقترحة سابقاً. تمنع النية المعلقة أو الحالة المشتركة المغلقة كامل مساحة القبول. لا تكفي إعادة محول أو معرف أو فحص صحة لإثبات التاريخ؛ ولا تحرير لحجز قراءة مجهولة أو إعادة محاولة صامتة أو ترقية العملية الأصلية. مسح النية الخاصة في Finalize الطبيعي محفوظ. تبقى الاستعادة والتعافي بعد إعادة المشغل والفتح وإثباتات النشر غير مؤهلة. القرار تعديل عقد مؤرخ لا إصلاح شيفرة أو نجاح اختبارات أو حل أداء؛ تُحفظ الأدلة والقرارات السابقة تاريخياً وتبقى HOLD وإخفاقات الحمل كما هي.

**Transactions/recovery correction (supersedes earlier universal assertion):** Prepare may fail before execution/commit without a visible intent. A peer must acquire the normal advisory/policy guards, not infer rollback from absence. Committed Prepare or uncertain Debit leaves pending and blocks the namespace. Finalize failure BEFORE clear still blocks; committed clear with lost ACK can permit independent normal admission while the original remainsUnavailable and Debit/Finalize adapter stays quarantined. Intent failures are not adapter-sticky today. No automatic finalization/reconciliation of old pending, release of unknown live reads, counter reset, reopening or adapter recreation is added. Existing bounded recovery remains limited to registered proven-terminated owned children; operator restart/serving workers cannot fabricate that proof.

تصحيح المعاملات والتعافي: لا تثبت العلامة الغائبة تراجع Prepare قبل الحسم؛ تلزم الأقفال. تغلق النية الملتزمة أو غموض Debit النطاق، بينما قد يسمح Finalize الملتزم بطلب مستقل رغم فقد الإقرار، مع بقاء الأصل متعذراً وعزل محول Debit/Finalize. لا عزل دائم حالياً لأخطاء Intent، ولا تعافٍ آلي جديد أو اختلاق دليل توقف بعد إعادة المشغل.
