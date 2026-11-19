> Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.** See the dated recovery alignment below. Earlier strict universal-closure assurances are historical within this scope only.
> قرار المالك2026-10-24: اعتماد I4-B/D-V1 لتعافي القبول العام فقط وتأهيل QA المحلي، مع بقاء القبول HOLD. العبارات الصارمة السابقة تاريخية ضمن هذا النطاق فقط.

# P6 finalization acknowledgement uncertainty — owner decision
# قرار المالك بشأن غموض إقرار الإنهاء

Status: PROPOSAL ONLY. Current policy unchanged. P6_ENGINEERING_CANDIDATE / acceptance HOLD.

## Confirmed observation | الملاحظة المثبتة

Real PostgreSQL loopback protocol holds reproduced all three boundaries. Intent loss: durable intent remains,0 leases, fresh adapter Unavailable. Debit loss: intent remains,1 lease, fresh adapter Unavailable. Finalize loss: intent absent,1 retained lease, original adapter Unavailable, fresh adapter Allowed. No native media I/O was authorized. No quota/tenant/grant bypass, counter reset or premature release was demonstrated.

SQL0001 finalize clears pending_operation at line115 before its ReadyForQuery acknowledgement reaches the client. The adapter cannot know a lost acknowledgement succeeded and conservatively closes itself. A new adapter sees finalized shared accounting and has no durable record of that client's transport uncertainty. This contradicts the blanket statement in Local-QA-Admission-Operations.md:37 and strict A–O failure wording at lines78/109. It is a confirmed MEDIUM contract gap, not a demonstrated data-exposure vulnerability. A new acknowledgement alone only moves this uncertainty boundary.

اختُبرت الحدود الثلاث فعلياً. بعد فقد إقرار الإنهاء بقي الحجز وحُفظ الحساب، لكن القصد أزيل وأمكن لمحول جديد القبول بينما أغلق الأصلي نفسه. لا تجاوز حصص أو مستأجر أو تحرير مبكر مثبت. هذه فجوة عقد مؤكدة متوسطة وليست ثغرة كشف بيانات مثبتة. إضافة إقرار أخير جديد وحدها تنقل حد الغموض ولا تحله.

## Option A — keep the strict gate; authorize design only | الإبقاء على البوابة والتصميم فقط

Recommended default while no owner decision exists: retain all current requirements and HOLD. Separately authorize a formal feasibility/design review of cross-worker uncertainty/fencing and reconciliation; do not authorize implementation merely by selecting this option.

Exact initial file impact: a new bilingual design document and its review evidence only. Application/SQL/migrations/policy/budgets stay unchanged. The design must model every ACK boundary, process death, lost reconciliation ACK, failover, two workers, lease ownership and the<=200ms fault-detection requirement. It must explain what can actually be guaranteed under communication failure before proposing any worker ledger, coordinator or fencing mechanism. Any subsequent source/schema/protocol change requires a separate reviewed implementation scope and owner approval.

Security constraints: no Allow fallback, no counter reset/refund, no automatic unknown-lease expiry, no tenant relaxation, no bypass of PostgreSQL or new dependency. Verification proposal: real three-stage fault injection plus worker termination and two-process races, exact budgets/leases, no I/O before definitive authorization, safe redaction and existing regression gates. No guarantee is claimed for an undesigned protocol.

الخيار الافتراضي يحفظ العقد وHOLD. التصريح المقترح يخص مراجعة جدوى وتصميم موثق جديد فقط، بلا تغيير مصدر أو مخطط أو سياسة. يجب إثبات الحدود الممكنة مع انقطاع الاتصال وموت العامل قبل أي بروتوكول جديد، ثم طلب تصريح تنفيذ منفصل.

## Option B — explicit stage-aware contract amendment | تعديل عقد صريح حسب المرحلة

This is a security/acceptance-policy decision and is NOT approved by routine engineering authorization. Proposed wording permits later admissions only against authoritative, valid finalized PostgreSQL accounting after finalization-ACK loss. The affected original request returns503 and its adapter stays closed. Already charged counters stay charged; unknown leases remain reserved and require the existing verified recovery procedure. Intent/debit uncertainty with a durable pending marker still closes every adapter. No expired read lease is reclaimed automatically; restored/invalid policy or counter state remains closed.

Exact proposed file impact after explicit approval: update the A–O failure wording in QSC-Task-3.23-P6-Public-Admission-Decision-Package.md:78/109, the corresponding runbook assurance in QSC-Task-3.23-P6-Local-QA-Admission-Operations.md:37, and add a named three-stage PostgreSQL regression/QA report with explicitly stage-dependent expectations. No application algorithm, SQL migration, thresholds, pool cap or dependency change is proposed for this option. Do not alter those authoritative documents now. This amendment would resolve only the blanket finalization assertion; it would NOT qualify latency, normal503s, cleanup or deployment.

هذا تعديل لسياسة الأمن والقبول يحتاج موافقة صريحة. يسمح فقط بالقبول اللاحق وفق حساب نهائي موثوق، مع503 للأصل وبقاء الحجز والخصم والإغلاق عند غموض القصد أو الخصم. التعديل المقترح يطال عبارات العقد والدليل واختباراً مسمى، ولا يغير الخوارزمية أوSQL أو الحدود. لا يحل إخفاق الأداء أو بقية البوابات.

## Separate environment decision | قرار بيئي منفصل

The same-server microbenchmark compares Windows Node/TCP with installed in-container psql/Unix-socket; it does not run the full Node application inside Linux or prove VPS qualification. Unrelated containers remain running. No approval to stop them, create new infrastructure, change production or alter approved thresholds is implied. A controlled approved application-side Linux QA environment is a useful next diagnostic scope, separately authorized if not already available.

مقارنة العميلين لا تعني تأهيل تطبيق Linux أوVPS. لا تصريح لإيقاف حاويات أخرى أو إنشاء بنية جديدة أو تعديل الإنتاج والحدود ضمنياً.

Until an explicit decision, Option A's unchanged strict gate remains the requirement. No contract relaxation or recovery implementation has occurred. Stop after the current root-cause report.

إلى حين القرار الصريح يبقى العقد الصارم والقبول المعلق دون تعديل أو تنفيذ تعافٍ جديد.
## Owner decision recorded 2026-10-24 | قرار المالك المسجل

The owner selected: “Retain strict requirement; authorize a separate design-only review (Recommended)”. Option A is selected. The blanket restart-closure acceptance requirement remains mandatory and acceptance remains HOLD. A separate design-only review is authorized for follow-up; this run does not start recovery implementation. Option B is NOT approved. No authoritative policy, operational SQL, budgets or application recovery protocol has been amended. Subsequent implementation still requires a concrete reviewed design and explicit approval.

اختار المالك الإبقاء على المتطلب الصارم والتصريح بمراجعة تصميم منفصلة فقط. يبقى منع القبول بعد إعادة التشغيل في حالات الغموض بوابة إلزامية ويبقى القبول HOLD. الخيار ب غير مصرح به. لا تغيير للعقد أوSQL أو الحدود أو بروتوكول التعافي، ولا يبدأ هذا التشغيل تنفيذ التعافي. أي تنفيذ لاحق يحتاج تصميماً محدداً مراجعاً وموافقة صريحة.

## Recovery contract alignment — owner-approved 2026-10-24 | مواءمة عقد التعافي المعتمد

Owner decision 2026-10-24: **I4-B/D-V1 APPROVED for Public Admission recovery only; LOCAL-QA qualification authorized; P6_ENGINEERING_CANDIDATE — Acceptance HOLD.**

The exact governing wording and E1–E6 are in implementation-contract section25.1 and the reviewed Recovery-Simplification-Decision-Proposal section2–3. The owner-approved attachment authorizes documentation and focused tests only. No algorithm/schema/port/composition, automatic recovery, dependency, threshold, production or acceptance change is authorized.

Previous strict I4 universally forbade later Allow on any instance after a worker detected covered uncertainty until global proved recovery. New I4-B/D-V1 permits a DISTINCT operation to complete its OWN definitive guarded admission against trusted authoritative state, including on the same still-healthy adapter after non-sticky Acquire/Intent failure. Debit/Finalize quarantine stays. This supersedes the former strict guarantee for Prepare bootstrap and committed Finalize ACKloss, not just its label.

I1/I2/I6/I10/I11 accounting/bounds/ownership/tenant/native-read/deadline/privacy remain. I3 uses own definitive normal admission under validated primary history. Formal R2 A-specific I5 epoch/membership, I7 epoch fencing and I8/I9 lifecycle/terminal-receipt machinery are not claimed implemented; existing shared policy/guard and closed maintenance apply. Previously authorized work may finish with its lease; reclamation requires actual completion or proven termination. No original-result upgrade/replay/refund, recovery-clearing of prior pending, unknown-live-lease expiry or quarantine bypass. Normal Finalize clears only its OWN marker.

Known pending or closed/invalid SHARED state blocks the whole admission namespace, not a chosen tenant. Local inability to establish prerequisites returns503; it is not proof all reachable peers have corrupt state. E1 history/restore trust is not proved by readiness, SQL rows, a fresh UUID or normal guards. Untrusted history requires coordinated closed maintenance; instantaneous propagation of private/unreportable knowledge and automatic recovery are not guaranteed. Restore/OS-process/operator-restart/reopening qualification remains open.

This is a dated contract decision, NOT a runtime fix, new PASS or performance resolution. Keep the previous strict-I4 owner decision, formal R2 DESIGN_BLOCKED report, MEDIUM finding and ACK reproduction as historical evidence. Its blanket-closure acceptance criterion is superseded only in this scope; do not erase or recast it as a repaired vulnerability. Focused tests must assess this approved contract. Existing p95>25ms and failed900s profiles remain FAIL; Nginx/VPS pending.

النص الحاكم وشروط E1–E6 في25.1 من عقد التنفيذ والمقترح المراجع. يستبدل القرار ضمن تعافي القبول العام فقط حظر السماح الشامل بشرط قبول مستقل مؤكد على حالة مشتركة موثوقة. يبقى عزل محول Debit/Finalize، ويجوز طلب جديد على المحول السليم بعد Acquire/Intent. تبقى المحاسبة والحدود والملكية والعزل والقراءة والمهل والحجب، دون ادعاء تطبيق آليات العصر والعضوية والتسليم المقترحة سابقاً. تمنع النية المعلقة أو الحالة المشتركة المغلقة كامل مساحة القبول. لا تكفي إعادة محول أو معرف أو فحص صحة لإثبات التاريخ؛ ولا تحرير لحجز قراءة مجهولة أو إعادة محاولة صامتة أو ترقية العملية الأصلية. مسح النية الخاصة في Finalize الطبيعي محفوظ. تبقى الاستعادة والتعافي بعد إعادة المشغل والفتح وإثباتات النشر غير مؤهلة. القرار تعديل عقد مؤرخ لا إصلاح شيفرة أو نجاح اختبارات أو حل أداء؛ تُحفظ الأدلة والقرارات السابقة تاريخياً وتبقى HOLD وإخفاقات الحمل كما هي.

**Dated superseding decision:** the owner's previous selection 'Retain strict requirement; authorize a separate design-only review' remains recorded above as historical. It is superseded ONLY for the Public Admission recovery scope by explicit approval of reviewed I4-B/D-V1 in the2026-10-24 Approved Recovery Contract Alignment and Focused Qualification instruction. Option B-equivalent restricted D is now the approved contract, not a newly implemented recovery protocol. Formal strict R2 remains byte-exact historical DESIGN_BLOCKED; its impossibility/counterexample analysis is not deleted or reclassified as runtime PASS.

قرار لاحق مؤرخ: يبقى قرار الإبقاء على الصرامة أعلاه تاريخياً، ويحل محله ضمن تعافي القبول العام فقط اعتماد المالك الصريح لـI4-B/D-V1. لا يغير ذلك التقرير الرسمي السابق أو يحوله إلى نجاح تشغيل، ولا يعتمد بروتوكول تعافٍ جديداً أو قبول P6.
