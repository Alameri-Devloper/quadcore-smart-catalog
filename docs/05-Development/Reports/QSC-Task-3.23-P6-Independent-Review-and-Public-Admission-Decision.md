# P6 Independent Review and Public Admission Decision | مراجعة P6 المستقلة وقرار القبول العام

2026-10-22. **P6 completion/acceptance: HOLD. Preserve fail-closed serving. All admission settings below: PROPOSED, NOT APPROVED.** / **إكمال وقبول P6: معلقان. يُحفظ الإغلاق الآمن. جميع إعدادات القبول أدناه مقترحة وغير معتمدة.**

## 1. Independent review status | حالة المراجعة المستقلة

Separate fresh contexts `/root/p6_security_independent` and `/root/p6_architecture_independent` reviewed security and architecture/contract without inheriting the implementation conversation. The implementation author coordinated/corroborated; this is not self-review presented as independent approval, an external penetration test, or owner acceptance.

راجع سياقان جديدان مستقلان للأمن والمعمارية المرشح دون وراثة محادثة التنفيذ. نسق المؤلف وتحقق من الأدلة؛ لا يُعرض عمله كاعتماد مستقل ولا تُدعى شهادة اختبار اختراق أو موافقة المالك.

- Worktree: `p6-public-resolution/quadcore-smart-catalog-p5-management` (relative to the local worktrees directory).
- Branch: `feature/task-3.23-p6-public-resolution`; HEAD/baseline: `25e50dadc8097a8f1663253917847487e17bd497`; uncommitted candidate.
- All **24 original candidate files**, including **21 non-documentation source files**, match the original manifest. Its 52 payloads/checksum were reverified. ZIP SHA-256: `10742b0d08fbe140ed9864aeaf3a520199d5186fe9fc971d93c94ffc87a21c66`.
- Evidence: `artifacts/task-reviews/3.23-P6-independent/reviewed-candidate-and-probes.json`; separate bilingual security memo `security/independent-security-review.md`, SHA-256 `3c336d5fdccd9a341305cdc98e647f2479248b85708ddd7e7fa1a7a9ce25aba6`.
- Existing **46 P6 / 192 Sharing / 9 PostgreSQL PASS**, TypeScript, lint, migration/build checks are historical records tied to the unchanged candidate, not fresh independent suite runs. No accepted suites/database tests were rerun. New evidence: bounded review, exact-source framework probes, owned loopback built-server method probe and Page-error helper reproduction.

طابقت المصادر والوثائق الأصلية والحزمة السابقة بصماتها. تبقى الاختبارات السابقة نتائج تاريخية مرتبطة بالمرشح، لا تشغيلات مستقلة جديدة. لا عمليات قواعد QA أو إعادة أجنحة مقبولة؛ الأدلة الجديدة مركزة ومعزولة.

## 2. Confirmed findings | الملاحظات المؤكدة

**No confirmed CRITICAL/HIGH/MEDIUM security defect. Two LOW contract deviations remain open. No confirmed cross-tenant disclosure, unauthorized public field, fabricated Identity actor, bearer leak or admission bypass was found in the reviewed scope. This is not proof of deployment safety.**

**لم يُثبت عيب أمني حرج أو عال أو متوسط. بقي انحرافان منخفضا الشدة عن العقد. لم يُثبت ضمن النطاق كشف عابر للمستأجرين أو حقل غير مصرح أو هوية مصطنعة أو تسرب رمز أو تجاوز قبول؛ ولا يثبت ذلك سلامة النشر.**

### F1 — LOW: generated method responses omit headers | غياب رؤوس الردود التلقائية

**Location:** [media route](../../../app/share/[token]/media/route.ts), line7 exports GET only; no route-scoped override in `next.config.ts`.

**Reproduction:** existing built server on an ephemeral loopback port with secret/database/QSC environment removed. GET/HEAD ->503 with mandatory headers. POST/PUT/PATCH/DELETE ->405 and OPTIONS ->204 with none of `Cache-Control`, `Referrer-Policy`, `X-Robots-Tag`, `X-Content-Type-Options`; all bodies empty. Only the owned child was stopped, existing QA server unchanged. Evidence: `security/built-method-header-probe.cjs` / `.txt`, and exact frozen-source installed-framework probe `method-header-framework-success.txt`. BUILD_ID `_sVCVUmQ4y5T7Qy8MgcVp`; recency alone is not cryptographic build/source correspondence, hence the separate exact-source corroboration.

**Contract/impact:** [contract](../../06-Roadmap/Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md) section26 line434 requires all four headers on public media/error responses. Incomplete privacy/cache hardening; no sensitive response body or authorization bypass observed.

**Correction:** cover method rejection/OPTIONS as well as GET/HEAD using explicit bounded handlers or route-scoped headers; retain empty errors/GET-only resource semantics and add built method/status/header regressions. No public API expansion or activation. **Approval:** no new policy/architecture decision; not implemented because this task preserves the candidate and stops after proposals.

ثبت غياب الرؤوس الأربعة من 405 و204 التلقائيتين، مع وجودها في GET وHEAD. الأثر نقص حماية ردود فارغة لا تجاوز تفويض مثبت. التصحيح تعميم رؤوس العقد واختبار الطرق دون تفعيل المسار أو إنشاء API؛ لا قرار سياسة جديد ولم يُنفذ هنا.

### F2 — LOW: Page503 heading mismatch | عنوان Page503 غير مطابق

**Location:** [HTTP helper](../../../domains/catalog/sharing/infrastructure/http/public-share-resolution-http.ts), lines14–15; tests lines23–32 check structure/status but not exact headings.

**Reproduction:** `publicShareFailureResponse({ok:false,error:"ServiceUnavailable"},"Page",locale)` returns503 headed `Temporarily unavailable` / `غير متاح مؤقتاً`. Contract section23 line411 requires `Service unavailable` / `الخدمة غير متاحة`; observed wording belongs to429. Evidence: `reviewed-candidate-and-probes.json`, `page503Finding`.

**Impact/correction:** bounded error-representation mismatch, no disclosure. This is the Page helper/future composition; mounted Media responses are empty and have no wrong heading. Add a separate503 branch and exact 404/429/503 English/Arabic heading assertions. **Approval:** no new policy/architecture decision; proposal only.

يعيد مساعد Page عنوان429 لحالة503 خلاف النص المحدد باللغتين. لا يخص العنوان جسم Media الحالي الفارغ ولا يثبت تسرباً. يُقترح فصل503 والتحقق الحرفي من العناوين؛ المصدر محفوظ.

## 3. Potential risks | المخاطر المحتملة

| ID | Classification / التصنيف | Evidence and required check / الدليل والتحقق |
| --- | --- | --- |
| R1 | MEDIUM potential availability risk, unverified / توافر محتمل متوسط غير مثبت | `resolve-public-product-share.ts:45` invokes service-wide active-grant inspection (`postgresql-public-share-key-version-inspector.ts:12–25`) for every canonical token, including unknown. Measure realistic populations/query plans/latency and pool saturation under global budgets. No benchmark or demonstrated DoS. Preserve fail-closed coverage. |
| R2 | INFORMATIONAL design limit / حد معلوماتي | Admission port2–18 receives maximum bytes and release, no actual-byte completion. Resolver63–74 reserves8MiB also for Page preflight; release precedes HTTP delivery. Conservative charging is possible; actual-byte refunds/slow-client protection are not established. |
| R3 | Future-adapter risk / خطر محول مستقبلي | Timer expiry while native I/O continues can exceed concurrency caps; a crash skips finally. No distributed adapter exists, so this is not a deployed bypass. Never Promise.race a live read and release early; use explicit recovery/cancellation semantics. |
| R4 | Unverified deployment / نشر غير متحقق | Proxy identity, every-hop redaction, cache/CDN bypass, real key rotation/coverage and storage permissions remain unverified. Misconfiguration could expose bearers or trust spoofed headers; no such deployment was observed. |

Contract section10 allows an authorized snapshot to finish across later revoke/update; subsequent snapshots must observe changes. This is the defined consistency guarantee, not a confirmed stale-data vulnerability. Already received bytes cannot be recalled. Existing [Media filesystem contract](../../04-Infrastructure/Persistence-Boundaries.md) excludes hostile privileged local writers; containment checks do not replace OS permissions.

تُفصل مخاطر السعة والحجوزات والنشر عن العيوب المثبتة. إكمال لقطة مصرح بها أثناء تغيير لاحق ضمان معتمد مع وجوب رؤية اللقطة التالية للتغيير. لا تسترجع البايتات الواصلة، ولا تستبدل فحوص المسار صلاحيات نظام الملفات.

## 4. Architecture compliance | الالتزام المعماري

Structurally compliant in the reviewed scope. Sharing owns anonymous orchestration/ports/projection; existing Product/reference-data/Media types remain canonical. Eligibility extraction preserves P4 rules. Application imports no Infrastructure/Presentation; Presentation owns semantic-to-string/Boolean localization and final allow-list. No database calls in components.

`postgresql-public-share-read-snapshot.ts:13–18` composes repositories/inspector in read-only REPEATABLE READ. Grant-derived Workspace/Product/fixed Branch and same-Workspace template/definition/value predicates bind all resource reads. No repository calls another repository; contract section2 permits bounded joined projections. No fabricated actor, new dependency, grant-schema change or public JSON API observed.

البنية ملتزمة ضمن النطاق: يملك Sharing التنسيق والمنافذ والإسقاط وتبقى أنواع المجالات معتمدة. لا اعتماد عكسي أو قاعدة من مكون. تجمع لقطة قراءة متسقة مستودعات مقيدة بالمستأجر دون استدعاء مستودع لآخر أو هوية مصطنعة أو اعتماد جديد.

## 5. P6 scope compliance | الالتزام بالنطاق

Inspected implementation: canonical anonymous HMAC lookup without retrieval decryption; grant/revocation/key-coverage checks; live safe visibility/pricing/specification projection; tenant snapshots; current-main provenance/root/path/signature/SHA-256/8MiB bounds; opaque typed errors; unavailable admission default and no-store helper.

**Valid bounded engineering candidate; not completed serving composition or accepted P6 delivery.** Route7–8 always503; resolver/media factory instances are tests/mocks only. Factory success does not prove a configured route; current smoke proves closure. P7 success SSR/no-JS page, navigation, responsive/RTL/manual accessibility and release integration remain unimplemented. P6 generic error/no-JS helper has F2 open.

النواة مرشح هندسي محدود وليست خدمة مركبة أو P6 مقبولة. يعيد المسار503 وتوجد أمثلة التركيب في الاختبارات فقط. تبقى صفحة نجاح P7 وتصفحها وقبول الأجهزة والوصول خارج النطاق وغير منفذة.

## 6. Admission options | خيارات القبول

Inventory: existing `pg`/Drizzle and PostgreSQL persistence; `docker-compose.yml:2–3` specifies PostgreSQL17 Alpine. Docker CLI exists. No Redis client/service or NGINX deployment configuration found in bounded repository/tool inventory; redis-server/nginx were absent from Windows PATH. Actual VPS state was not inspected; no service/database/credential setting changed.

| Option / الخيار | Security, scale and tenancy / الأمن والسعة والعزل | Complexity, cost and failure modes / التعقيد والكلفة والأعطال |
| --- | --- | --- |
| Shared PostgreSQL primary | Atomic shared counters/durable leases across app instances; internal tenant budgets; failclosed outage. Appropriate only after bounded pilot load qualification. | Reuses service/client, no new npm dependency. Needs new operational tables/migration/indexes/cleanup/recovery. Adds WAL/IO/global-row contention and shares Catalog outage domain. No incremental service fee assumed, but infrastructure cost/headroom still matter. |
| Dedicated Redis + atomic script | Atomic multi-key checks; high counter throughput and workload separation. TTL/leases and state-loss failclosed semantics still required. | New service/client/ACL/monitoring/upgrades need approval. Memory eviction/restarts/failover can reset protection unless handled. No existing installation or price quote assumed. |
| NGINX-only | Useful source/global request and outbound protection. One shared ingress can cover app processes, but cannot know resolved Workspace/grant; ordinary zones do not prove multi-ingress consistency. | Low app coupling, deployment/log configuration required; insufficient as sole contract backend. |
| Per-process memory | Counters multiply/reset across processes and restarts. | Cheap deterministic QA only; unacceptable deployment-wide enforcement. |

PostgreSQL locks/conflict-safe updates supply adapter primitives, not an automatic limiter. [PostgreSQL17 locks](https://www.postgresql.org/docs/17/explicit-locking.html), [INSERT](https://www.postgresql.org/docs/17/sql-insert.html). Redis scripting is atomic, but ordinary replication/failover does not guarantee preservation of all counter writes. [Redis scripting](https://redis.io/docs/latest/develop/programmability/eval-intro/), [replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/).

المقارنة تفضل PostgreSQL الموجودة لمرحلة VPS محدودة مقاسة، مع كلفة IO وصيانة ومخطط جديد. Redis بديل عند إثبات حاجة سعة أو عزل مع اعتماد خدمة وعميل جديدين. الوكيل مكمل لا بديل كامل، والذاكرة المحلية للاختبار فقط. لا ادعاء بإعداد VPS أو أسعار فعلية.

## 7. Recommended backend semantics — PROPOSED | دلالات الخلفية المقترحة

**Shared PostgreSQL17 primary plus trusted ingress for a bounded pilot.** All instances share policy version/state. Infrastructure implements existing ports. Use separate bounded READ WRITE admission transactions/pool; never write through the read-only grant snapshot or invent an Identity actor. Proposed pool caps: main8 + admission2 per instance, maximum two pilot app instances; confirm total headroom against actual database configuration/workloads.

Proposed operational tables: `catalog_public_share_admission_buckets`, `catalog_public_share_admission_leases` and singleton policy/capacity state. Store only version/internal scope/scaled balance/time/expiry or lease-worker identity. No bearer/URL/lookup digest/ciphertext/key/request/cookie/history. Source keys use a separate-purpose HMAC over canonical address, no raw IP persistence. New key/rotation semantics require approval; do not reuse or rotate share/Identity keys.

- **Source:** atomically check all global/source/route buckets before token parse, equally for malformed/unknown/valid/crawler requests. A denied phase makes no new token debits; denial metrics are aggregate. Ingress prefilters protect DB from repeated rejected attempts. Earlier committed source charges remain if later phases deny/fail; no implicit refund.
- **Resolved:** check internal Workspace/grant budgets without browser tenancy or disclosure of denying budget.
- **MediaRead:** atomically debit byte buckets and reserve all occupancy limits with a random internal lease. Lock occupancy state; no unlocked COUNT-then-INSERT. Charge full maximumBytes once (currently8MiB), release concurrency only. Missing/corrupt/failed reads still consume work.
- **Release:** idempotent exact-lease operation decrements all occupancies once. Await actual native I/O termination before releasing; no early Promise.race cleanup.
- **Conservative crash recovery:** no timer alone reclaims an uncertain live lease. Keep reservations failclosed, alert, then bounded idempotent operator recovery only after verifying every owning worker incarnation/replica terminated. All read slots can remain exhausted until intervention; owner acceptance of this availability tradeoff is required. Automatic expiry needs separately verified cancellation/fencing.
- **Atomicity/time:** deterministic lock order/row creation/global cardinality cap; exact integer/scaled arithmetic; sample DB clock after locks and clamp backwards time to prevent extra refill. `clock_timestamp()` gives actual DB time. [PostgreSQL17 time](https://www.postgresql.org/docs/17/functions-datetime.html).
- **Failure/recovery:** policy mismatch, pool/DB/lock/statement failure, missing config or uncertain commit ->generic503. No local/default-Allow or blank-state reset. Denial ->429 with proposed safe Retry-After1–60s. Reconcile schema/policy/lease state before reopening after outage/failover; unknown state remains closed.

الاقتراح معاملات قبول مستقلة ومحدودة، لا كتابة داخل لقطة التفويض ولا هوية موظف. تفحص كل مرحلة ميزانياتها ذرياً مع حفظ رسوم المراحل السابقة. يُحجز الحد الكامل وتُحرر السعة مرة واحدة بعد انتهاء القراءة الفعلي. تبقى الحجوزات المجهولة مغلقة حتى إثبات توقف عاملها واستردادها؛ يلزم قبول احتمال تعطل الصور إلى حين التدخل. يغلق غياب الإعداد أو العطل أو اختلاف السياسة الوصول دون سماح محلي بديل.

## 8. Exact budgets — PROPOSED, NOT APPROVED | الحدود المقترحة غير المعتمدة

Continuous token buckets: refill r/second, stored burst B; at most B+rT work in interval T before other caps. No fixed-window resets or crawler exemptions. Count Page and Media/HEAD work; methods rejected without resolution/read need ingress protection. Configuration only, no Domain constants.

| Bucket / الميزانية | Refill r / التعبئة | Burst B / الدفعة | Rationale / المبرر |
| --- | --- | --- | --- |
| Global all | 20 requests/s | 40 | Ceiling before expensive key inspection; load test required. |
| Global Page / Media, separately | 10 requests/s each | 20 each | Separate work under combined cap. |
| Source all | 1 request/s | 10 | Normal open/refresh bursts; limits one source. |
| Source Page / Media, separately | 0.5 request/s each | 5 each | Separate image/page work; NAT fairness unverified. |
| Resolved Workspace all | 5 requests/s | 10 | Limits one tenant; not guaranteed fair scheduling. |
| Resolved grant all | 2 requests/s | 4 | Hotlink protection without bearer counter keys. |
| Global native-read bytes | 8MiB/s | 32MiB | Four maximum reads burst, one/second sustained. |
| Workspace native-read bytes | 4MiB/s | 16MiB | Tenant resource budget. |
| Source native-read bytes | 2MiB/s | 16MiB | Page preflight+Media consumes full burst. |
| Concurrent native reads: global/Workspace/source/grant | — | 4 / 2 / 1 / 1 | Bounds reader work; count copies/outbound buffers separately. |

Not measured VPS capacity. One Page preflight plus Media charges16MiB even for a small file; another maximum read needs about4s of source refill. Refresh/language change can temporarily omit the image. Qualify real navigation/NAT/image sizes before approval, or approve different budgets/accounting. Existing8MiB delivery cap is approved; all new throughput/charging values are proposals.

Proposed operations: source idle expiry5min; bounded cleanup60s; expire correctly on access, no visitor history. Race-safe global cap50,000 bucket rows; full ->503 rather than active-state eviction. Pool acquisition75ms, lock timeout50ms, statement100ms, total admission deadline200ms. Main snapshot query deadline750ms is a separate proposed safeguard, never justification for releasing unfinished I/O.

Proposed ingress complement: coarse global40requests/s burst80, source2/s burst10; media transmission <=1MiB/s per response, 8 simultaneous media responses per shared ingress, 2/source; header-read deadline5s, idle client timeout10s. Full8MiB response takes approximately8s. These do not establish multi-ingress/network-wide limits; verify HTTP/2, buffering, HEAD, aborts and actual link capacity. [NGINX per-request rate](https://nginx.org/en/docs/http/ngx_http_core_module.html#limit_rate), [request/connection counting](https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html).

الأرقام سياسة تجريبية مقترحة لا سعة مثبتة. قد يستهلك فتح صفحة وصورتها دفعة المصدر كاملة رغم صغر الصورة بسبب الحجز المحافظ، ويتطلب ذلك اختبار اللغة والتصفح والشبكات المشتركة. حماية القراءة منفصلة عن الإرسال البطيء. لا حذف لحالة نشطة لفتح السعة ولا تحرير لقراءة مستمرة بانتهاء مهلة شكلية.

## 9. Proxy trust and observability | الثقة بالوكيل والرصد

**Proposed sole trusted ingress, private/firewalled origin; no public Next port.** Ingress removes incoming source/Forwarded/X-Forwarded-For values and overwrites one dedicated source header with verified peer address. App accepts exactly one canonical value, normalizes IPv4-mapped IPv6 and computes source pseudonym. Missing/malformed ->503. Request-only port has no independently verified socket peer when exposed directly; never fill the gap with arbitrary headers.

For CDN/load-balancer chains, require actual topology and exact trusted CIDRs first; no universal0.0.0.0/0 or::/0 trust or leftmost-header shortcut. [NGINX real-IP trust](https://nginx.org/en/docs/http/ngx_http_realip_module.html). Proposed IPv4/fullIPv6 /128; /64 grouping, NAT exemptions and source-key rotation/epoch are owner policy. Same namespace across replicas; rotation must not silently reset budgets. No cookies/fingerprint/visitor profile.

Allow-list observability: route-class/method/status/outcome enums, policy version, duration buckets, aggregate admitted/denied/unavailable counts, occupancy/cleanup/outage health. Never log request/response/grant objects, URL/path/query/bearer/digest/ciphertext/key/rawIP/sourceID or tenant/grant labels, Referer/arbitrary User-Agent. `$request`, `$request_uri` and `$uri` can all contain bearer. Default access formats include request/Referer; use constant route-class fields or disable raw collection. [NGINX log formats](https://nginx.org/en/docs/http/ngx_http_log_module.html).

Changing access format does not prove error/Next/APM redaction. Prove sanitization/non-collection BEFORE persistence/transmission at every hop, including malformed URL,400/405/414/429/503, proxy rejection, abort and exception paths. Post-collection central scanning is insufficient. No actual VPS collector topology was verified; failure blocks exposure. Generated responses also need mandatory headers.

التوصية أصل خاص ووكيل واحد يستبدل رأس المصدر، لا تصديق رأس المتصفح. يلزم تحديد القفزات والشبكات الموثوقة وسياسة IPv6 وNAT والمفتاح بصورة صريحة. يقتصر الرصد على حقول عامة مجمعة؛ تحجب المسارات والاستعلامات وReferer والأسرار قبل جمعها في كل طبقة، ولا يكفي تنظيف مركزي لاحق. لم يُثبت إعداد نشر فعلي.

## 10. Serving composition gaps | فجوات تركيب الخدمة

| Gate / البوابة | Remaining work / العمل المتبقي |
| --- | --- |
| G1 corrections | F1/F2 exact headings and built method/header regressions; keep dormant503. |
| G2 composition | Compose snapshot DB, lookup-only runtime/config/key inspection, media root/reader, real admission and trusted-source adapters; wire existing Media handler only after readiness. Missing config still503. Page resolver handoff does not require P7 implementation. |
| G3 admission | New operational schema/indexes, atomic buckets/leases, cleanup/recovery, separate source key, version consistency, bounded pools/timeouts and failclosed health. Mock Allowed leases do not prove distribution. |
| G4 tests/CI | Add HTTP Media before/after revoke, withdrawal/restoration, main replacement/removal and independent-request freshness. Add method headers, overload/outage/uncertain commit, two-process counters, lease recovery, spoofed headers, privacy and expiry/byte/concurrency boundaries. Workflow49/120 calls old scripts, not explicit P6 scripts. P6 integration-test17 hard-codes its owned local DB name: prepare a deliberate isolated CI profile without weakening guards. No hosted exact-P6 CI claim. |
| G5 release only | Actual VPS capacity/permissions, real key coverage/rotation, trusted ingress/direct-origin denial, every-hop redaction, CDN/proxy/cache bypass, TLS/HSTS and multi-instance/bandwidth/outage evidence. No exposure before verification. |
| G6 P7 | Success SSR/no-JS page, native language/navigation, complete responsive/RTL/manual accessibility and release integration need separate P7 authority/prior gates. |

الفجوات بوابات مفتوحة لا نجاحات ضمنية: تصحيحان وتركيب وإعداد قبول حقيقيان واختبارات موزعة وحداثة الوسائط وCI محمي ثم أدلة نشر فعلية. لا تعني503 الحالية نجاح تقديم بيانات، ولا تنهي مهام P7 أو القبول اليدوي المؤجل.

## 11. Required owner decisions | قرارات المالك المطلوبة

1. Approve/revise PostgreSQL pilot, new operational schema/migration, cleanup/recovery scope. Redis instead requires new service/client approval.
2. Approve/revise proposed request/byte/concurrency/expiry/timeout/pool/ingress budgets, full-cap charging and manual unknown-lease recovery tradeoff; qualify capacity/navigation first.
3. Supply actual VPS CPU/RAM/storage/network/DB limits, app-instance count and full ingress/CDN topology; approve origin access controls, canonical source/NAT/IPv6 policy and dedicated source-key operations. No existing key rotation requested/performed.
4. Confirm every collector and pre-collection redaction/non-collection design; no temporary raw-bearer production logging.
5. Authorize bounded follow-up implementation after this review. F1/F2 meet existing contract and need no new policy decision, but this review-only task deliberately applies no correction. Policy-dependent work waits for decisions1–4.

يلزم اعتماد الخلفية والعمل التشغيلي والحدود ومحاسبة البايتات واسترداد الحجز، وتحديد سعة VPS ومسار الدخول وسياسة المصدر ومفتاحه، ثم تصميم الحجب بكل جامع. لا إنشاء أسرار أو ترحيلات أو خدمات قبل تصريح المتابعة. التصحيحان يحققان عقداً قائماً ولا يغيران السياسة، لكنهما لم ينفذا في مهمة المراجعة.

P5 remains `P5_IMPLEMENTED_PENDING_ACCEPTANCE`, PR#65 Draft/do not merge,34 genuine browser PASS. BROWSER-026/029/030/033/036 retain all deferred final-system-QA requirements; BROWSER-034 remains unresolved with current implementation/security gate unchanged. No waiver/merge/production authority.

تبقى P5 وطلبها المسودة وحالات نجاحها كما هي، ولا تُسقط متطلبات الحالات اليدوية الخمس. تبقى034 معلقة دون تغيير التنفيذ أو البوابة الأمنية، ولا تصريح دمج أو نشر.

## 12. Exact next engineering steps | الخطوات الهندسية التالية

1. Review findings/policy/topology decisions; keep503 and P5 gates.
2. Separately authorized follow-up: fix F1/F2, exact helper/method regressions and touched-code type/lint/build checks; avoid unrelated accepted suites.
3. Implement approved Infrastructure adapters with existing dependencies: proposed new `domains/catalog/sharing/infrastructure/admission/postgresql-public-share-admission.ts`, `public-share-admission-configuration.ts`, `infrastructure/http/trusted-proxy-public-share-source.ts`, `infrastructure/public-share-resolution-runtime.ts`, focused tests and guarded PostgreSQL cases. No new layer/dependency/defaultAllow.
4. Add operational tables within existing `domains/catalog/infrastructure/persistence/schema.ts`, matching Drizzle journal/snapshot and next NON-CONFLICTING migration AFTER reconciling unmerged P5 numbering. Do not allocate/execute now or change grant semantics. Add bounded cleanup/recovery under `scripts/public-sharing/` and bilingual operator docs. Construct dedicated pool in Sharing composition; no shared-database module refactor is required.
5. Wire only `app/share/[token]/media/route.ts` behind validated readiness; no public JSON API/P7 page. Missing/unhealthy policy/source/DB/keys/media configuration remains closed. Add explicit P6 CI steps with deliberate guarded test-DB profile.
6. Verify two-instance atomic budgets, malformed/denied traffic, outage/uncertain writes, lease crash recovery, conservative bytes, proxy spoofing, every-hop synthetic-token redaction and Media freshness/concurrency. Use NEW isolated QA fixtures/databases only; preserve existing databases/PASS evidence.
7. Independent re-review, exact-candidate hosted CI and owner acceptance decisions precede later authorized integration. P7/exposure/merge/deployment/production migrations remain separate unauthorized steps.

تبدأ المتابعة بقرار المالك وتصحيحين واختبارات مركزة، ثم محولات ومخطط تشغيلي معتمدان دون إعادة هيكلة. تُحسم أرقام الترحيلات قبل ترحيل جديد. يُركب Media وحده خلف جاهزية مثبتة وتستخدم قواعد QA جديدة معزولة. تلي ذلك إعادة المراجعة وCI والقبول قبل تكامل لاحق مصرح؛ لا انتقال تلقائي إلى P7 أو العرض العام أو الدمج أو النشر.

## Files Created | الملفات المنشأة

This bilingual report; ignored independent probes/logs/memos/hash evidence and separate review package under `artifacts/task-reviews/3.23-P6-independent/` and `artifacts/task-reviews/3.23-P6-independent-review-20261022/`. No proposed app/config/migration file implemented. / التقرير وأدلة المراجعة فقط، دون إنشاء ملفات التطبيق أو الإعداد أو الترحيل المقترحة.

## Files Modified / Files Deleted | الملفات المعدلة / المحذوفة

No original candidate file modified; none deleted. All24 original source/document files remain exact. No P5/original/Serena edits, existing-QA DB operations, credential/key changes, commit/push/merge, P7, deployment or production migration. / لا تعديل أو حذف للمرشح أو P5 أو الأصل أو Serena أو القواعد أو الأسرار، ولا عمليات تسليم Git أو P7 أو نشر أو ترحيل إنتاجي.

## Architecture Changes / Summary / Next Recommendation | المعمارية والملخص والتوصية

None. Review completed with TWO open LOW confirmed deviations and separate potential/unverified risks. P6 completion/acceptance remains HOLD; preserve source/failclosed serving, decide policy and authorize bounded follow-up only. Review-package readiness is not implementation/phase approval.

لا تغيير معماري. اكتملت المراجعة مع ملاحظتين مؤكدتين منخفضتي الشدة ومخاطر محتملة منفصلة. يبقى القبول والإكمال معلقين والمصدر محفوظاً؛ يلي ذلك قرار السياسة ومتابعة محدودة فقط. جاهزية حزمة المراجعة لا تعني اعتماد التنفيذ.

Review package / حزمة المراجعة:

- Local ZIP: `artifacts/task-reviews/QSC-Task-3.23-P6-independent-review-20261022-Review.zip`.
- Export ZIP: `QSC-Reviews/QSC-Task-3.23-P6-independent-review-20261022-Review.zip` (relative to the local Desktop directory).
- Review-only collector records fresh integrity/documentation/evidence checks and preserved observations; no technical-suite reruns, existing-QA DB access or relabelled historical PASS. Detached checksum/manifest verify payloads. Previous implementation ZIP remains unchanged.
