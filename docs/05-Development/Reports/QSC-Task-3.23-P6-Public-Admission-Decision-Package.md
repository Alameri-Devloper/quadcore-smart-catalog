> Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.** See the dated recovery alignment below. Earlier strict universal-closure assurances are historical within this scope only.
> قرار المالك2026-10-24: اعتماد I4-B/D-V1 لتعافي القبول العام فقط وتأهيل QA المحلي، مع بقاء القبول HOLD. العبارات الصارمة السابقة تاريخية ضمن هذا النطاق فقط.

# P6 Public Admission Decision Package | حزمة قرار القبول العام لـP6

2026-10-22. **PROPOSED ONLY — NOT APPROVED OR IMPLEMENTED.** Based on the [independent review proposal](QSC-Task-3.23-P6-Independent-Review-and-Public-Admission-Decision.md). This dated package refines recommendations; it changes no approved policy, configuration, architecture, source admission behavior or grant lifecycle. P6_ENGINEERING_CANDIDATE / acceptance HOLD; public serving remains503.

**مقترح فقط وغير معتمد أو منفذ.** تنقح هذه الحزمة توصيات المراجعة المستقلة دون تعديل سياسة معتمدة أو إعداد أو معمارية أو دورة تفويض. تبقى P6 مرشحاً هندسياً وقبولها معلقاً والخدمة مغلقة بـ503.

## A. Backend and implementation boundary | الخلفية وحدود التنفيذ

Preferred: existing shared PostgreSQL17 primary for a bounded single-VPS pilot, one trusted ingress and up to two application instances, subject to capacity qualification. Existing pg/Drizzle suffice; no Redis/service/client added. New operational buckets/leases/policy-state tables and migration would still need separate implementation authorization and non-conflicting numbering after P5 reconciliation. Domain and grant schema remain unchanged.

Infrastructure implements existing PublicShareAdmissionPort; separate bounded READ WRITE admission pool/transactions, never the read-only REPEATABLE READ grant snapshot. No Identity actor. Every app instance shares one authoritative primary and matching policy version. Row locking supplies coordination primitives, not automatic limiter correctness. [PostgreSQL17 locking](https://www.postgresql.org/docs/17/explicit-locking.html).

التوصية PostgreSQL الموجودة لمرحلة VPS محدودة بعد قياس السعة، دون اعتماد جديد. يتطلب المخطط التشغيلي والترحيل تصريح تنفيذ منفصلاً مع حفظ ترحيلات P5. ينفذ Infrastructure المنفذ الحالي بمعاملات قبول مستقلة لا داخل لقطة التفويض ولا بهوية مصطنعة.

## B–E. Final recommended budgets | الحدود النهائية الموصى بها

All values PROPOSED. Continuous token buckets: sustained refill r, maximum stored burst B; no fixed-window reset. A bucket can allow no more than B+rT in interval T. Page and Media/HEAD are separately charged; Page image preflight is real native-read work and Media repeats independently. No crawler exemption.

| Scope / النطاق | Sustained r / المستدام | Burst B / الدفعة |
| --- | --- | --- |
| Global combined requests | 20 requests/s | 40 |
| Global Page / Media separately | 10/s each | 20 each |
| Per-source combined requests | 4/s | 20 |
| Per-source Page / Media separately | 2/s each | 10 each |
| Per resolved Workspace, combined | 10/s | 20 |
| Per resolved grant, combined | 4/s | 10 |
| Global native-read reservation bytes | 32MiB/s | 160MiB |
| Per Workspace native-read bytes | 16MiB/s | 80MiB |
| Per source native-read bytes | 16MiB/s | 80MiB |
| Concurrent native reads: global / Workspace / source / grant | — | 4 / 2 / 2 / 2 |

**Evaluation of prior20/s burst40, source1/s burst10, concurrency4:** retain global20/40 and global4 provisionally, not as measured capacity. Increase source1/10 to4/20: one Product open usually costs Page+Media, and one mobile/NAT address can represent many legitimate customers. Old1/s allows only0.5 paired opens/s after burst and5 paired opens initially; a second simultaneous customer cohort is heavily throttled. New4/20 supports larger request bursts while global/tenant/grant bounds remain. This does not identify individual customers behind NAT or guarantee fairness.

Refine old read-byte budgets8MiB/s global and2MiB/s source: with the current port, each native read conservatively charges8MiB regardless of small actual file size. One Page preflight+Media therefore charges16MiB. New global32MiB/s permits two paired image opens/s sustained; source16MiB/s permits one/s, and80MiB source burst covers five paired opens after idle. Credits do not allocate that much memory; actual read concurrency stays4 globally. Source/grant concurrency2 replaces1 to reduce needless rejection of shared-network customers. Concurrent bursts can still receive429 or Page image fallback; test actual scheduling and storage before approval.

Byte charging remains full-cap with no actual-byte refund because release() has no actual-byte parameter. Failed/corrupt reads still cost work. No port extension is proposed for these two corrections. Increasing the already approved8MiB delivery cap is not proposed. Larger traffic/NAT populations may require different measured budgets or separately reviewed accounting; never add cookies/fingerprints to work around NAT.

**كل الأرقام مقترحة.** تُحفظ20/40 وأربع قراءات عالمية مبدئياً، وترفع ميزانية المصدر إلى4/20 لأن العنوان المشترك قد يمثل عدة عملاء وفتح المنتج يتطلب صفحة وصورة. تُحسب كل قراءة بحد8MiB محافظ، أي16MiB للفتح المصور؛ لذلك تنقح حدود البايتات للسماح عالمياً بفتحين مصورين/ثانية ولكل مصدر بفتح/ثانية ودفعة خمسة بعد السكون. لا تعني أرصدة البايت تخصيص الذاكرة أو ضمان عدالة NAT، ولا تُنشأ بصمات أو ملفات تعريف للزوار.

## F. Source privacy, retention and keys | خصوصية المصدر والاحتفاظ والمفاتيح

Propose canonical IPv4/full IPv6 /128, including normalization of IPv4-mapped IPv6, then a dedicated-purpose HMAC-SHA-256 source identifier. No raw IP in admission tables/logs, no bearer/URL/digest/ciphertext counter keys, no cookies/analytics/persistent visitor profile. Do not reuse share/Identity keys. Provisioning a NEW source key and its operator procedure need approval; no key has been created/rotated here.

Live source counters expire after300s idle; bounded cleanup every60s means normal live-store removal target within360s of last activity when verified cleanup batch capacity drains the backlog; enforce expiry on access independently and monitor oldest expired row/backlog. Active counters retain current bounded state only, not request history. Race-safe global cap50,000 bucket rows; capacity exhaustion ->503, never eviction of active protection. Source identities never become metric labels.

The live-store TTL is not a promise of erasure from PostgreSQL WAL/physical backups. Owner must approve backup/access retention; exclude operational rows from logical exports where applicable and document restored-state failclosed recovery. No backup configuration changes now. Rotate a future source key only under coordinated closed maintenance with old workers drained/verified stopped and old counter state reconciled; never reset budgets silently between replicas. Full /64 grouping or NAT exemptions require an explicit policy decision.

المقترح معرف HMAC لغرض مستقل من عنوان موحد دون IP خام أو تتبع زائر أو إعادة استعمال مفاتيح المشاركة والهوية. تنتهي العدادات الحية بعد خمس دقائق سكون وتزال عادة خلال ست دقائق؛ لا يَعِد ذلك بمحو WAL والنسخ الاحتياطية. يلزم قرار احتفاظ وصلاحيات وتدوير منسق للمفتاح الجديد دون تصفير صامت للحدود؛ لم يُنشأ أو يدوّر مفتاح هنا.

## G–H. Reverse proxy and untrusted headers | الوكيل والرؤوس غير الموثوقة

One trusted ingress; bind/firewall the Next origin privately and deny direct public origin access. Ingress discards all client-supplied source/Forwarded/X-Forwarded-For values and overwrites one dedicated source header from its verified peer address. App validates one canonical value; missing, duplicated or malformed ->503. The Request-only port cannot independently verify socket-peer trust: the private origin and verified ingress are prerequisites, not optional header parsing.

If CDN/LB exists, supply every hop and exact trusted CIDRs first; no universal trust or leftmost-header shortcut. This is deployment topology approval, not an instruction to accept arbitrary forwarding headers. [NGINX real-IP trust](https://nginx.org/en/docs/http/ngx_http_realip_module.html).

Proposed ingress protection before PostgreSQL: global40requests/s burst80; source8/s burst40, above app source4/20; header-read5s and idle-client10s. Media response transmission1MiB/s, at most8 active media responses per shared ingress and2/source. This controls outgoing work separately from file-read leases; an8MiB response takes approximately8s. Validate HTTP/2, buffering, HEAD, aborts and real network caps; one ingress limit is not multi-ingress global enforcement. [NGINX per-request rate](https://nginx.org/en/docs/http/ngx_http_core_module.html#limit_rate).

أصل خاص ووكيل موثوق يستبدل رأس المصدر، مع تحديد كل قفزات CDN قبل الثقة. يغلق الغياب أو التكرار أو التشوه الوصول. حدود الوكيل المقترحة أعلى من حد التطبيق وتحمي الاتصالات والإرسال قبل قاعدة البيانات؛ لا يثبت ذلك إعداد نشر فعلياً أو حد إرسال عالمياً عبر عدة وكلاء.

## I–J. Coordination, transactions and contention | التنسيق والمعاملات والتنازع

Single PostgreSQL primary; no independent per-process counters, stale replicas, uncoordinated policy versions or fallback cache. Atomically create/check/debit all applicable buckets and reserve the exact lease under a consistent total lock order, with a globally locked allocation/capacity guard. Lease issuance/occupancy changes cannot use unlocked COUNT-then-INSERT. Release is exact-lease/idempotent and decrements each occupancy once. Use integer/scaled arithmetic and sampled DB time after locks; clamp backward time without extra refill.

Charging is once per phase: Source debits global/source/route REQUEST buckets once per incoming Page or Media/HEAD; Resolved debits only Workspace/grant REQUEST buckets once; MediaRead debits only BYTE buckets plus occupancy once. It never repeats Source/Resolved request charges. Page preflight is a native read, not an extra HTTP request charge.

A rejected phase makes no new token debits; source/global admission still applies before malformed/known-token discrimination. Earlier committed Source charges remain if later Resolved/MediaRead fails/denies. Bytes are not refunded after failed/missing/corrupt reads. No budget identity/reason is public. Aggregate source/route denialmetrics provide health, not visitor history.

Proposed bounds: main pool8 + admission pool2 per application instance, at most two app instances for initial qualification. Verify total20 proposed connections leaves actual PostgreSQL/administrative headroom. Admission acquisition75ms, lock50ms, statement100ms, overall200ms; main snapshot statement750ms. Short READ WRITE admission transactions are separate from read-only grant snapshots. They still share DB CPU/IO and hot global state; a separate pool does not remove contention or prove20/s capacity.

قاعدة أولية واحدة وسياسة متطابقة ومعاملات ذرية بترتيب أقفال ثابت وحارس سعة عالمي. لا رجوع لعدادات عملية مستقلة أو نسخ متأخرة. التحرير مرة واحدة للحجز الصحيح فقط، ولا استرداد لرسوم مرحلة سابقة عند فشل التالية. الأحواض والمهل مقترحة وتحتاج قياساً؛ الفصل لا يعزل CPU أو IO أو يمنح سعة مضمونة.

## K–L. Crash, lease expiry and failure | الأعطال وانتهاء الحجز والإغلاق

Default conservative proposal: lease occupancy does NOT expire automatically while worker lifetime/I/O is unknown. Normal release waits for native I/O termination; Promise.race timeout must not free capacity while work continues. Alert on aged leases. Stop/drain every owner worker incarnation, verify no remaining read, then execute bounded idempotent recovery for those operational lease IDs only. Never delete a QA database or reset Catalog/grants/accounts to recover a limiter.

Unknown leases can exhaust all four slots indefinitely until verified recovery: owner must accept this availability tradeoff or separately approve a proven heartbeat/cancellation/fencing design. No automatic expiry value is proposed as a substitute for that proof. Counter idle expiry is separate from active-read leases.

Missing policy/source/key configuration, DB/pool/lock timeout, policy mismatch, ambiguous commit or uncertain counter restore ->generic503, no local Allow. Known budget denial ->429, proposed Retry-After1–60s. New admissions fail closed; a request authorized before outage may finish according to existing snapshot semantics. Recovery validates schema/policy/worker/lease state before reopening. If counter history cannot be reconciled, keep closed for a proposed300s maintenance window with old workers verified terminated, reconcile/reset only operational state, and reopen deliberately; never assume blank restored counters are safe immediately. No such operation performed now.

لا يُحرر حجز مجهول بعمر زمني وحده، ولا بمهلة وهمية وI/O مستمر. يلزم إثبات توقف جميع عوامله ثم استرداد معرفاته التشغيلية فقط، وقد تتعطل الصور حتى التدخل. انتهاء عداد المصدر مختلف عن الحجز النشط. يغلق غياب الإعداد أو عطل القاعدة أو غموض الالتزام الوصول بـ503 دون سماح محلي. تعافٍ ببيانات مجهولة يبقى مغلقاً حتى المصالحة؛ نافذة300ثانية المقترحة لا تبرر تحرير عامل حي أو حذف قاعدة.

## M. Observability and redaction | الرصد والحجب

Allow-list only route class/method/status/outcome enums, policy version, aggregate counts, duration buckets, occupancy/cleanup/oldest-lease/backlog health. No raw request/response/grant or URL/path/query/bearer/digest/ciphertext/key, raw IP/source ID, tenant/grant metric labels, arbitrary User-Agent or Referer. Constant Page/Media route labels; no high-cardinality visitor trace. Redact/non-collect before ingress/Next/app/APM/error/access collectors persist/transmit anything, including rejected methods, malformed URL/400/414,429/503, aborts and unexpected exceptions. Access-log format alone does not prove error-log redaction. Zero synthetic-token markers across every hop is a release gate, not implemented here.

حقول مجمعة مسموحة فقط دون رمز أو مسار أو IP أو معرف مصدر أو تتبع زوار. يجب الحجب قبل الجمع في كل طبقة بما فيها أخطاء الوكيل وNext والطرق المرفوضة؛ لا يكفي تنسيق سجل الوصول أو التنظيف بعد التسرب.

## N. Local QA versus production | QA المحلي مقابل الإنتاج

Local deterministic analysis uses synthetic addresses/tokens and an explicit clock/model under ignored QA artifacts. It is not a PostgreSQL adapter, distributed test or load benchmark. Future adapter QA uses NEW isolated guarded databases and synthetic keys, two separate clients/processes, controlled failures and observable ingress; never P5/manual QA databases. Test values may be deliberately small and clearly labelled.

Production requires approved policy version/thresholds, measured VPS size/connections/storage/network, private trusted topology, secret provisioning, same-tenant/read-root permissions, every-hop redaction, distributed counters, recovery runbook, real key coverage and release/cache/TLS gates. No local model or closed503 smoke satisfies these. No real thresholds/config/backend/migration/key introduced by this task.

التحليل المحلي اصطناعي وحتمي ولا يثبت قاعدة موزعة أو حملاً فعلياً. تتطلب اختبارات المحول لاحقاً قواعد جديدة محمية ومفاتيح اختبار، ويتطلب الإنتاج إعداداً معتمداً وسعة مقاسة ووكيلاً موثوقاً وحجباً وتعافياً وتغطية مفاتيح وبوابات إصدار فعلية. لم تُطبق سياسة أو ترحيل أو مفتاح في هذه المهمة.

## O. Load-test acceptance criteria — PROPOSED, not executed | معايير قبول الحمل المقترحة غير المنفذة

Separate native-read credit from actual egress. Global32MiB/s credits allow at most two paired8MiB-charged reads/opens per second, but edge8responses at1MiB/s has at most one completed full8MiB image/s; source2responses allow at most0.25 full8MiB image/s before overhead. Therefore the normal targets below require representative normalized WebP files <=256KiB. They are not8MiB-image serving promises. If actual catalog images are larger, qualify a representative profile before approving budgets; do not inflate limits automatically.

| Scenario / السيناريو | Proposed pass threshold / شرط النجاح المقترح |
| --- | --- |
| Normal text/no-image | 15min at10 canonical requests/s, >=5 sources and5 Workspaces with multiple grants, valid/unknown mixture; no unintended429/503, exact expected statuses. |
| Normal images | 15min at2 paired Page+Media opens/s globally, <=1 paired open/s per source, normalized valid WebP<=256KiB; warm and cold storage; no false429/503 for the scheduled profile. |
| Shared mobile/NAT | Ten synthetic customers on one source, aggregate one paired open/s; separate burst of five opens spread evenly across1s after idle, <=256KiB images. Require all Product text/images and no false429. Do not claim arbitrary simultaneous bursts pass; if actual source/edge concurrency rejects this controlled profile, approval is HOLD and tune measured limits. |
| Large8MiB boundary/stress | Correct signature/checksum/exact size at legal boundary; over-limit rejected. Use <=0.5 paired opens/s globally and<=0.125/source for no-shedding slow-client baseline. Higher load must enforce limits and may shed429/image fallback; never treat saturation shedding as a false-denial failure. |
| Latency, normal profiles | Admission p95<=25ms/p99<=75ms; Page and Media TTFB p95<=500ms/p99<=1s. Full8MiB transfer<=12s in the controlled1MiB/s fixture, separate from TTFB. |
| Host headroom | CPU average<70%, p95<85%; peak process/DB memory<70% available RAM, no OOM, no unbounded warm-state growth. Pool/deadlock/timeout errors0 in normal profiles; admission acquire p95<50ms. Actual VPS measurements required. |
| Two-instance overload | Combined admissions <=B+rT for every bucket with zero oversubscription; not double after adding an app instance. Active file reads never exceed global4 or scoped caps. Bound state/queues under source churn; no silent active eviction. |
| Failure/uncertain commit | After fault detection and<=200ms decision deadline, new admissions503; no fallback Allow or secret-bearing error. Previously authorized work may finish. No automatic reclaim of unknown live read; recovery is verified and repeatable. |
| Retention/recovery | Expired counters never grant wrong credit; cleanup normal target<=360s idle, with enough verified batch capacity and backlog/max-age alarms. No hard deletion guarantee during outage/backlog; no backup-erasure claim. Duplicate release/recovery changes occupancy once. |
| Confidentiality | Zero cross-tenant fields, unauthorized fields, bearer/digest/key markers in every configured collector or public error; unchanged authority under spoofed forwarding/method override. |

تُفصل أرصدة القراءة عن الإرسال: لا تدعم حدود الوكيل الحالية فتحين عالميين/ثانية لصورة8MiB كاملة، لذلك يحدد الحمل العادي صورة<=256KiB، وللحد الكبير ملف ضغط مستقل أبطأ مع إسقاط متوقع عند التشبع. جميع المعايير مقترحة وغير مشغلة. إذا أخفقت الصورة الطبيعية أو شبكةNAT المقاسة فلا اعتماد ولا رفع آلي؛ تُراجع السعة والحدود. يتطلب حد360ثانية قدرة تنظيف كافية ومراقبة تراكم، ولا يعني ضمان محو أثناء العطل أو من النسخ الاحتياطية.

## Owner decision required | القرار المطلوب

Approve/revise this complete A–O package: backend/new operational schema, every budget and load target, NAT/IPv6/key retention, actual ingress topology/direct-origin denial, pool/timeout headroom, manual crash recovery/maintenance and every-hop redaction/backup retention. Then authorize bounded adapter/composition work and real qualification. No activation, merge, P7 or deployment is authorized by accepting a proposal document alone.

يعتمد المالك أو ينقح الحزمة كاملة ثم يصرح بتنفيذ محدود واختبارات تأهيل حقيقية. لا تمنح وثيقة الاقتراح وحدها تفعيل المسار أو الدمج أو P7 أو النشر.


## Recovery contract alignment — owner-approved 2026-10-24 | مواءمة عقد التعافي المعتمد

Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.**

The exact governing wording and E1–E6 are in implementation-contract section25.1 and the reviewed Recovery-Simplification-Decision-Proposal section2–3. The owner-approved attachment authorizes documentation and focused tests only. No algorithm/schema/port/composition, automatic recovery, dependency, threshold, production or acceptance change is authorized.

Previous strict I4 universally forbade later Allow on any instance after a worker detected covered uncertainty until global proved recovery. New I4-B/D-V1 permits a DISTINCT operation to complete its OWN definitive guarded admission against trusted authoritative state, including on the same still-healthy adapter after non-sticky Acquire/Intent failure. Debit/Finalize quarantine stays. This supersedes the former strict guarantee for Prepare bootstrap and committed Finalize ACKloss, not just its label.

I1/I2/I6/I10/I11 accounting/bounds/ownership/tenant/native-read/deadline/privacy remain. I3 uses own definitive normal admission under validated primary history. Formal R2 A-specific I5 epoch/membership, I7 epoch fencing and I8/I9 lifecycle/terminal-receipt machinery are not claimed implemented; existing shared policy/guard and closed maintenance apply. Previously authorized work may finish with its lease; reclamation requires actual completion or proven termination. No original-result upgrade/replay/refund, recovery-clearing of prior pending, unknown-live-lease expiry or quarantine bypass. Normal Finalize clears only its OWN marker.

Known pending or closed/invalid SHARED state blocks the whole admission namespace, not a chosen tenant. Local inability to establish prerequisites returns503; it is not proof all reachable peers have corrupt state. E1 history/restore trust is not proved by readiness, SQL rows, a fresh UUID or normal guards. Untrusted history requires coordinated closed maintenance; instantaneous propagation of private/unreportable knowledge and automatic recovery are not guaranteed. Restore/OS-process/operator-restart/reopening qualification remains open.

This is a dated contract decision, NOT a runtime fix, new PASS or performance resolution. Keep the previous strict-I4 owner decision, formal R2 DESIGN_BLOCKED report, MEDIUM finding and ACK reproduction as historical evidence. Its blanket-closure acceptance criterion is superseded only in this scope; do not erase or recast it as a repaired vulnerability. Focused tests must assess this approved contract. Existing p95>25ms and failed900s profiles remain FAIL; Nginx/VPS pending.

النص الحاكم وشروط E1–E6 في25.1 من عقد التنفيذ والمقترح المراجع. يستبدل القرار ضمن تعافي القبول العام فقط حظر السماح الشامل بشرط قبول مستقل مؤكد على حالة مشتركة موثوقة. يبقى عزل محول Debit/Finalize، ويجوز طلب جديد على المحول السليم بعد Acquire/Intent. تبقى المحاسبة والحدود والملكية والعزل والقراءة والمهل والحجب، دون ادعاء تطبيق آليات العصر والعضوية والتسليم المقترحة سابقاً. تمنع النية المعلقة أو الحالة المشتركة المغلقة كامل مساحة القبول. لا تكفي إعادة محول أو معرف أو فحص صحة لإثبات التاريخ؛ ولا تحرير لحجز قراءة مجهولة أو إعادة محاولة صامتة أو ترقية العملية الأصلية. مسح النية الخاصة في Finalize الطبيعي محفوظ. تبقى الاستعادة والتعافي بعد إعادة المشغل والفتح وإثباتات النشر غير مؤهلة. القرار تعديل عقد مؤرخ لا إصلاح شيفرة أو نجاح اختبارات أو حل أداء؛ تُحفظ الأدلة والقرارات السابقة تاريخياً وتبقى HOLD وإخفاقات الحمل كما هي.

**K–L/O supersession:** the historical phrase 'new admissions fail closed' and O's 'after fault detection ... new admissions503' now mean the affected operation/path plus the entire namespace when its shared pending/policy/history is unresolved. A finalized authoritative state permits only a distinct request's own E1–E6 admission. No universal worker-receipt/global-closure assertion remains active in this approved scope. Unavailable MAY retain committed charges/lease; definitive atomic Denied or known row-cap rejection has no new phase debit. Other K–L/O budgets, leases,200ms deadline,900s load/latency/resource/redaction criteria remain mandatory.

استبدال K–L/O صريح: يغلق الغموض العملية المتأثرة، ويغلق الحالة المشتركة غير المحسومة كامل النطاق. تسمح الحالة النهائية الموثوقة بقبول مستقل فقط وفق E1–E6. قد يحتفظ Unavailable بخصم وحجز ملتزمين؛ الرفض الذري المؤكد ورفض سعة الصفوف بلا خصم جديد. تبقى كل الحدود والمهل ومعايير الحمل والحجب إلزامية.
