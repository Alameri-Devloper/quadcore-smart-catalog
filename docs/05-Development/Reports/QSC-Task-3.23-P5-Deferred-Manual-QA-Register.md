# P5 deferred manual QA register | سجل الاختبار اليدوي المؤجل

2026-10-22 — owner-approved scheduling decision. Official status: **P5_IMPLEMENTED_PENDING_ACCEPTANCE**.

قرار المالك يؤجل موعد التنفيذ فقط. الحالة الرسمية **P5_IMPLEMENTED_PENDING_ACCEPTANCE**.

The immutable historical browser register remains 34 BROWSER_PASS / 6 PENDING. This scheduling overlay marks five cases DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION, never PASS or cancelled. BROWSER-034 stays ACTIVE_INVESTIGATION / PENDING. Earlier failures and partial evidence remain preserved.

يبقى سجل المتصفح التاريخي 34 نجاحاً و6 حالات معلقة. هذه طبقة تتبع لجدولة خمس حالات مؤجلة، دون نجاح أو إلغاء، وتبقى 034 قيد التحقيق ومعلقة.

## Governance and milestone | الحوكمة والموعد

Future milestone: final system verification after subsequent owner-approved P6/P7 work; no execution date is invented. Group equivalent future touch, screen-reader, zoom, clipboard-recovery and privacy checks into one EN/AR session, but retain each original P5 ID, row, result and evidence reference. P6/P7 remain NOT STARTED; this register does not authorize either phase.

الموعد هو التحقق النهائي للنظام بعد مراحل لاحقة معتمدة من المالك، دون افتراض تاريخ. تجمع الفحوص المتكافئة في جلسة واحدة مع حفظ معرفات P5 وصفوفها وأدلتها. لا يصرح السجل ببدء P6/P7.

Release/merge significance for every deferred case: mandatory and unresolved. No production-readiness claim, Task 3.23 completion, merge or deployment while existing acceptance/security gates remain unresolved. The 2026-10-22 request authorizes engineering commits, push and an open QA-DEFERRED PR only after successful engineering gates; it does not waive integration acceptance. Any future gate change requires a separate explicit governance decision.

جميع الحالات إلزامية وغير مغلقة وتبقي بوابة الدمج والإصدار معلقة. يصرح الطلب الحالي بتسليم هندسي وطلب سحب مفتوح بعد نجاح البوابات الهندسية فقط، ولا يعفي من القبول أو يجيز النشر.

Authoritative checklist: [QSC-Task-3.23-P5-Final-Six-Owner-Acceptance-Session.md](QSC-Task-3.23-P5-Final-Six-Owner-Acceptance-Session.md). The exact EN/AR case sections are retained below without changing their requirements. Historical initial-status wording in those quoted sections is preserved.

القائمة المرجعية هي المرجع الملزم، وترد أقسام الحالات أدناه بنصها الأصلي دون تعديل شروطها.

## BROWSER-026 — Genuine touch / اللمس الفعلي

- Status / الحالة: **DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION**; not PASS / ليست نجاحاً.
- Classification / التصنيف: Accessibility and usable interaction / الإتاحة وقابلية التفاعل.
- Reason / السبب: owner-approved consolidation of hardware/native-browser-dependent QA; current supported automation cannot establish every original requirement / تأجيل معتمد لتجميع الفحص المعتمد على جهاز أو متصفح أصلي مع تعذر التحقق الكامل بالأتمتة الحالية.
- Milestone / الموعد: final system verification after subsequent approved phases; gate remains open / التحقق النهائي بعد المراحل المعتمدة مع بقاء البوابة معلقة.
- Required tool / الأداة: Physical touchscreen on approved QA host; EN/AR at mobile/tablet widths / شاشة لمس فعلية على جهاز الاختبار باللغتين والحجمين.
- Responsible role / الدور المسؤول: Device QA operator and accessibility reviewer / مختبر أجهزة ومراجع إتاحة; project owner schedules and acceptance reviewer closes / يحدد المالك الموعد ويغلق مراجع القبول الحالة.
- Existing partial evidence / الدليل الجزئي: Supported browser has no genuine touch input capability. Mouse or viewport emulation is not touch evidence.
- Retained evidence reference / مرجع الأدلة: `browser-evidence/owner-progress-latest.json` relative to `artifacts/task-reviews/3.23-P5-fresh-browser-20261021/`.
- Closure / الإغلاق: all original EN/AR rows below, dated browser/device/tool identity, expected/actual outcomes, nonsecret evidence and reviewer decision; incomplete/unavailable rows remain open / جميع الصفوف الأصلية باللغتين وهوية الأداة والجهاز والوقت والنتائج وأدلة غير سرية وقرار المراجع؛ النقص يبقي الحالة مفتوحة.
- Release-blocking / أثر الإصدار: mandatory acceptance remains unresolved; no merge or production readiness / يبقى القبول الإلزامي معلقاً دون دمج أو جاهزية إنتاجية.

### Exact original acceptance section | قسم القبول الأصلي بالنص

### BROWSER-026 — genuine touch | اللمس الحقيقي

**Account/page:** shared Staff/company, branch1 product above. **Tool:** existing physical touchscreen on this QA host, mobile layout around390 CSSpx and tablet around768 CSSpx at normal page zoom. Mouse clicks in device emulation are not touch.

**Interaction:** at each size in English, use fingers to scroll and tap Issue/reuse, Copy, Replace then Cancel, Revoke link then Cancel. Then confirm Replace and confirm Revoke on only this synthetic grant, reissue if needed, and Hide. Repeat in Arabic/RTL at both sizes. These operations supply the missing input mode; they are not counted as new lifecycle cases.

**Expected/PASS:** every action and warning/Cancel/Confirm responds to actual touch once; all targets and feedback are readable/reachable, scrolling works, no overlap or accidental double action, Hide removes URL. **FAIL:** reproduced incorrect/unresponsive/inaccessible touch action. **UNAVAILABLE:** no actual touch surface. **Evidence:** four rows (EN/mobile, EN/tablet, AR/mobile, AR/tablet), device/input/viewport and each action/confirmation outcome. Hide URL before any screenshot; no token values.

الأداة شاشة لمس فعلية على جهاز الاختبار بحجم هاتف نحو390px ولوحي نحو768px. استخدم الإصبع للتمرير والإصدار والنسخ وفتح التأكيدات وإلغائها ثم تأكيد الاستبدال والإلغاء للتفويض الاصطناعي فقط وإخفاء الرابط. كرر باللغتين والحجمين. النجاح استجابة واحدة صحيحة ووصول وقراءة دون تداخل؛ العطل المثبت فشل وعدم توفر اللمس يبقي الحالة معلقة. سجّل أربع نتائج دون رابط سري.

## BROWSER-029 — Screen-reader speech / نطق قارئ الشاشة

- Status / الحالة: **DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION**; not PASS / ليست نجاحاً.
- Classification / التصنيف: Accessibility / الإتاحة.
- Reason / السبب: owner-approved consolidation of hardware/native-browser-dependent QA; current supported automation cannot establish every original requirement / تأجيل معتمد لتجميع الفحص المعتمد على جهاز أو متصفح أصلي مع تعذر التحقق الكامل بالأتمتة الحالية.
- Milestone / الموعد: final system verification after subsequent approved phases; gate remains open / التحقق النهائي بعد المراحل المعتمدة مع بقاء البوابة معلقة.
- Required tool / الأداة: Installed reader with usable English and Arabic speech / قارئ مثبت بصوت عربي وإنجليزي صالح.
- Responsible role / الدور المسؤول: Accessibility QA reviewer / مراجع اختبار الإتاحة; project owner schedules and acceptance reviewer closes / يحدد المالك الموعد ويغلق مراجع القبول الحالة.
- Existing partial evidence / الدليل الجزئي: No real screen-reader integration is available; accessibility tree names and live regions alone do not establish spoken operation.
- Retained evidence reference / مرجع الأدلة: `browser-evidence/owner-progress-latest.json` relative to `artifacts/task-reviews/3.23-P5-fresh-browser-20261021/`.
- Closure / الإغلاق: all original EN/AR rows below, dated browser/device/tool identity, expected/actual outcomes, nonsecret evidence and reviewer decision; incomplete/unavailable rows remain open / جميع الصفوف الأصلية باللغتين وهوية الأداة والجهاز والوقت والنتائج وأدلة غير سرية وقرار المراجع؛ النقص يبقي الحالة مفتوحة.
- Release-blocking / أثر الإصدار: mandatory acceptance remains unresolved; no merge or production readiness / يبقى القبول الإلزامي معلقاً دون دمج أو جاهزية إنتاجية.

### Exact original acceptance section | قسم القبول الأصلي بالنص

### BROWSER-029 — real screen-reader speech | النطق الفعلي لقارئ الشاشة

**Account/page:** same branch1 product. **Tool:** already installed Narrator/NVDA or equivalent with usable English and Arabic speech, and keyboard. Do not install software under this checklist. Missing reader/voice means the affected row is UNAVAILABLE.

**Interaction:** navigate heading, warning, labelled known-grant field, Issue/Copy, URL label and Hide with reader/Tab. Hear actual names, roles and reading order. Issue/reuse and Copy must announce localized completion/status. Open Replace/Revoke confirmations; hear warning and Cancel/Confirm, verify Cancel is initially focused and cancel returns focus to the invoker. The actual implementation is an inline fieldset, not an asserted modal: do not invent a modal role or focus-trap requirement. For safe missing feedback, enter synthetic nonexistent UUID `00000000-0000-4000-8000-000000000000`, Review revocation then Confirm; expect opaque “No link is available for this request” without a link. Also hear actual clipboard fallback/error during Group B. Repeat EN/AR. Do not transcribe a spoken bearer value.

**Expected/PASS:** correct localized names/roles/order, understandable focus context, warnings and actual success/error announcements without hunting focus. **FAIL:** a required name/warning/status is absent or wrong while reader works elsewhere. **Evidence:** reader/version/voice per language, short nonsecret spoken statuses, focus/order notes and success/error/confirmation rows. One missing-grant announcement alone does not complete all speech rows. No audio recording of URL/password speech.

شغّل قارئاً مثبتاً وصوتاً مناسباً لكل لغة واستمع فعلياً للأسماء والأدوار والترتيب والتحذيرات والنجاح والخطأ. افتح التأكيدات وألغِها وتحقق من التركيز؛ التأكيد مجموعة حقول داخل الصفحة وليس نافذة مشروطة مفترضة. استخدم UUID الاصطناعي أعلاه لملاحظة رد غياب آمن، وراقب خطأ الحافظة في المجموعة ب. سجّل نطقاً غير سري فقط، ولا تسجل قيمة الرابط. غياب القارئ أو الصوت لا يُعد نجاحاً.

## BROWSER-030 — Native page zoom / تكبير الصفحة الأصلي

- Status / الحالة: **DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION**; not PASS / ليست نجاحاً.
- Classification / التصنيف: Accessibility and responsive layout / الإتاحة والتخطيط المتجاوب.
- Reason / السبب: owner-approved consolidation of hardware/native-browser-dependent QA; current supported automation cannot establish every original requirement / تأجيل معتمد لتجميع الفحص المعتمد على جهاز أو متصفح أصلي مع تعذر التحقق الكامل بالأتمتة الحالية.
- Milestone / الموعد: final system verification after subsequent approved phases; gate remains open / التحقق النهائي بعد المراحل المعتمدة مع بقاء البوابة معلقة.
- Required tool / الأداة: Native browser zoom menu at 200% and 400%, fixed desktop window / قائمة تكبير أصلية ونافذة ثابتة.
- Responsible role / الدور المسؤول: Accessibility and responsive QA reviewer / مراجع الإتاحة والتجاوب; project owner schedules and acceptance reviewer closes / يحدد المالك الموعد ويغلق مراجع القبول الحالة.
- Existing partial evidence / الدليل الجزئي: Zoom unavailable. Supported capability inventory exposes no genuine page zoom; earlier shortcut had no verified zoom effect. Owner requested autonomous continuation without manual wait. No viewport/CSS/OS/panel-scaling substitution used.
- Retained evidence reference / مرجع الأدلة: `browser-evidence/owner-progress-latest.json; browser-evidence/final-capability-limits.json` relative to `artifacts/task-reviews/3.23-P5-fresh-browser-20261021/`.
- Closure / الإغلاق: all original EN/AR rows below, dated browser/device/tool identity, expected/actual outcomes, nonsecret evidence and reviewer decision; incomplete/unavailable rows remain open / جميع الصفوف الأصلية باللغتين وهوية الأداة والجهاز والوقت والنتائج وأدلة غير سرية وقرار المراجع؛ النقص يبقي الحالة مفتوحة.
- Release-blocking / أثر الإصدار: mandatory acceptance remains unresolved; no merge or production readiness / يبقى القبول الإلزامي معلقاً دون دمج أو جاهزية إنتاجية.

### Exact original acceptance section | قسم القبول الأصلي بالنص

### BROWSER-030 — actual browser page zoom | تكبير الصفحة الحقيقي

**Account/page:** same branch1 product. **Tool:** native page-zoom menu visibly showing200%/400%. Agent result remains **Zoom unavailable**. No CSS zoom, window/viewport resizing, OS magnifier or ChatGPT panel scaling substitutes.

**Interaction:** keep a fixed normal desktop window. At200%, then400%, in English traverse heading/warning, Issue/Copy, known-grant input/review, URL label/Hide and inline Replace/Revoke confirmation warning/Cancel/Confirm using Tab/Shift+Tab and scrolling. Cancel confirmations; destructive actions are unnecessary here. Repeat both native zoom levels in Arabic, then restore100%.

**Expected/PASS:** readable/reachable content and controls, visible keyboard focus, complete confirmations, no overlap/clipped content or two-dimensional page scrolling needed to reach management controls. Record horizontal overflow explicitly. **FAIL:** actual control/content loss at verified zoom. **UNAVAILABLE:** genuine zoom percentage/effect cannot be verified. **Evidence:** four rows with native zoom percentage, language, access/focus/clipping/overlap and scrolling observations. Keep bearer links hidden for screenshots.

استخدم تكبير الصفحة الأصلي200% و400% ضمن نافذة ثابتة، وافحص باللوحة والتمرير كل الحقول والأزرار والتحذير والتأكيد والتركيز بالعربية والإنجليزية ثم أعد100%. ألغِ التأكيدات. النجاح قراءة ووصول كاملان دون فقد محتوى أو تداخل أو تمرير ثنائي الأبعاد للوصول؛ سجّل أي تجاوز أفقي. إذا تعذر إثبات التكبير الحقيقي فالحالة معلقة، ولا تستخدم بديلاً أو صورة تُظهر الرابط.

## BROWSER-033 — Clipboard write denial / رفض كتابة الحافظة

- Status / الحالة: **DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION**; not PASS / ليست نجاحاً.
- Classification / التصنيف: Security, privacy and accessible recovery / الأمن والخصوصية والتعافي المتاح.
- Reason / السبب: owner-approved consolidation of hardware/native-browser-dependent QA; current supported automation cannot establish every original requirement / تأجيل معتمد لتجميع الفحص المعتمد على جهاز أو متصفح أصلي مع تعذر التحقق الكامل بالأتمتة الحالية.
- Milestone / الموعد: final system verification after subsequent approved phases; gate remains open / التحقق النهائي بعد المراحل المعتمدة مع بقاء البوابة معلقة.
- Required tool / الأداة: Native per-origin clipboard write-denial controls, actual rejection proof / تحكم أصلي خاص بالموقع مع إثبات رفض الكتابة.
- Responsible role / الدور المسؤول: Security QA reviewer with accessibility operator / مراجع أمن مع مختبر إتاحة; project owner schedules and acceptance reviewer closes / يحدد المالك الموعد ويغلق مراجع القبول الحالة.
- Existing partial evidence / الدليل الجزئي: No supported clipboard-permission denial control is advertised; no monkeypatch or security bypass was used. Actual denial/fallback remains pending.
- Retained evidence reference / مرجع الأدلة: `browser-evidence/owner-progress-latest.json` relative to `artifacts/task-reviews/3.23-P5-fresh-browser-20261021/`.
- Closure / الإغلاق: all original EN/AR rows below, dated browser/device/tool identity, expected/actual outcomes, nonsecret evidence and reviewer decision; incomplete/unavailable rows remain open / جميع الصفوف الأصلية باللغتين وهوية الأداة والجهاز والوقت والنتائج وأدلة غير سرية وقرار المراجع؛ النقص يبقي الحالة مفتوحة.
- Release-blocking / أثر الإصدار: mandatory acceptance remains unresolved; no merge or production readiness / يبقى القبول الإلزامي معلقاً دون دمج أو جاهزية إنتاجية.

### Exact original acceptance section | قسم القبول الأصلي بالنص

### BROWSER-033 — actual write denial and fallback | رفض الكتابة الحقيقي والبديل

**Account/page:** same branch1 product. **Tool:** normal clipboard permission controls for this exact localhost origin; record previous setting, temporarily block this origin only. No global browser/OS policy changes or security bypass. If only reads are blocked or Copy still succeeds, write denial is unproven: INCONCLUSIVE/PENDING, not an app defect.

**Interaction:** with a synthetic active grant, apply normal site-level write denial; reload if required by the browser. Explicitly Copy. Establish actual rejection using a native denial indicator or sanitized error name in existing diagnostics plus the rendered fallback; a permission label alone is insufficient. English expected: “Automatic copy failed. Select the link and copy it manually.” Arabic: “تعذر النسخ التلقائي. حدد الرابط وانسخه يدوياً.” Verify labelled read-only fallback is selectable by keyboard/pointer and LTR even in Arabic. Hide removes it and restores visible focus. Repeat EN/AR. Reuse the reader/privacy observations in the same session. Restore previous site setting, verify ordinary Copy recovery once and clear clipboard to a harmless synthetic sentinel.

**PASS:** actual write rejection with usable labelled/selectable/read-only/LTR fallback and Hide, both languages. **FAIL:** proven rejection with missing/unusable fallback, URL remaining after Hide or broken recovery. **Evidence:** denial proof/error name, prior/restored site setting, localized message and label/selectability/read-only/LTR/Hide/focus booleans. No screenshot containing the fallback URL or exported network/permission values.

احجب الكتابة مؤقتاً لهذا الموقع فقط وسجّل الإعداد السابق. منع القراءة فقط أو استمرار نجاح النسخ لا يحقق الشرط. تحقق من رفض فعلي ورسالة النسخ اليدوي والتسمية والتحديد والقراءة فقط واتجاه LTR في اللغتين. أخفِ الرابط وتحقق من الاختفاء والتركيز ثم أعد الإعداد وافحص التعافي مرة واحدة ونظف الحافظة. لا تغير سياسة عامة أو تحفظ رابطاً أو صورته. غياب رفض كتابة حقيقي يبقي الحالة معلقة.

## BROWSER-036 — Storage and referrer privacy / خصوصية التخزين والإحالة

- Status / الحالة: **DEFERRED_FOR_FINAL_SYSTEM_VERIFICATION**; not PASS / ليست نجاحاً.
- Classification / التصنيف: Bearer-token confidentiality and tenant privacy / سرية رمز المشاركة وخصوصية المستأجر.
- Reason / السبب: owner-approved consolidation of hardware/native-browser-dependent QA; current supported automation cannot establish every original requirement / تأجيل معتمد لتجميع الفحص المعتمد على جهاز أو متصفح أصلي مع تعذر التحقق الكامل بالأتمتة الحالية.
- Milestone / الموعد: final system verification after subsequent approved phases; gate remains open / التحقق النهائي بعد المراحل المعتمدة مع بقاء البوابة معلقة.
- Required tool / الأداة: Native Application/Storage/Network inspectors on approved QA origin / أدوات التخزين والشبكة الأصلية لأصل الاختبار.
- Responsible role / الدور المسؤول: Application security and browser QA reviewer / مراجع أمن تطبيقات ومتصفح; project owner schedules and acceptance reviewer closes / يحدد المالك الموعد ويغلق مراجع القبول الحالة.
- Existing partial evidence / الدليل الجزئي: Six focused QA history entries and captured console (zero entries) contain no bearer URLs. Storage inspection is unavailable in the supported read-only scope; outgoing referrer behavior remains unverified. Targeted current protected English hidden-link DOM additionally has6 anchors,0 bearer hrefs/form actions/textareas; no storage/referrer/active-link coverage inferred.
- Retained evidence reference / مرجع الأدلة: `browser-evidence/owner-progress-latest.json; browser-evidence/final-six-capability-and-gap-review.json` relative to `artifacts/task-reviews/3.23-P5-fresh-browser-20261021/`.
- Closure / الإغلاق: all original EN/AR rows below, dated browser/device/tool identity, expected/actual outcomes, nonsecret evidence and reviewer decision; incomplete/unavailable rows remain open / جميع الصفوف الأصلية باللغتين وهوية الأداة والجهاز والوقت والنتائج وأدلة غير سرية وقرار المراجع؛ النقص يبقي الحالة مفتوحة.
- Release-blocking / أثر الإصدار: mandatory acceptance remains unresolved; no merge or production readiness / يبقى القبول الإلزامي معلقاً دون دمج أو جاهزية إنتاجية.

### Exact original acceptance section | قسم القبول الأصلي بالنص

### BROWSER-036 — browser storage and sent referrers | التخزين والإحالات الصادرة

**Account/page:** shared Staff/company and exact product pages. **Tool:** native DevTools Application/Storage/Network in an already installed local browser, with focused localhost history/console views. No arbitrary scripts, agent evaluate bypass, external collector, extension or HAR export. No native inspector means PENDING.

**Interaction:** observe requests before Groups A/B. Privately inspect this exact origin's localStorage, sessionStorage, IndexedDB, Cache Storage/service-worker caches and cookie records before/after Issue/Copy/fallback/Hide and real context change in EN/AR. Check whether a sharing bearer URL/token persists; normal session-cookie presence is expected and is not a sharing-token leak. Do not copy cookie values or clear storage. Check anchor/form targets with URL visible and hidden: the intentional labelled textarea must not become an unintended navigation/referrer source.

Use existing Back to catalog/Operations links after explicit retrieval and inspect actual sent request URLs and Referer headers. Inspect any actual external requests generated by those actions without creating an external destination. No sharing bearer may occur in request URL/Referer/unintended link/history/console. Product path/branch ID without bearer is not a bearer leak. document.referrer, source policy declaration or no-store response header alone does not prove an outgoing header. If no external requests occurred, record “none observed”; do not claim unobserved traffic coverage. Explicit authenticated API response bodies can intentionally contain the requested URL; do not export them.

**PASS:** every listed storage class actually inspected with no persisted sharing bearer, and actual scoped history/console/targets/outgoing request/referrer observations clean in both languages. **FAIL:** reproduced bearer in prohibited storage/target/log/header. **INCONCLUSIVE/PENDING:** any required class/header/language/context unobserved. **Evidence:** browser/origin, inspected storage classes and bearer booleans, actual request types/Referer bearer boolean, link/history/console booleans, language/time. No sensitive panel screenshots, raw values, dumps or HAR. Prior six clean history entries/zero console entries and new English hidden-link DOM audit remain partial.

افحص تخزين الموقع المحدد وأدوات الشبكة الأصلية أثناء الإجراءات السابقة باللغتين، بما يشمل localStorage وsessionStorage وIndexedDB وCache Storage وذاكرة عامل الخدمة وملفات الارتباط دون نسخ القيم أو المسح. ملف ارتباط الجلسة المعتاد ليس تسريب مشاركة. تحقق من غياب رمز/رابط المشاركة في التخزين والسجل ووحدة التحكم والروابط/النماذج وعناوين الطلبات وReferer المرسل فعلياً. استخدم الروابط الموجودة دون إنشاء وجهة خارجية؛ مسار المنتج بلا رمز ليس تسريباً. document.referrer أو سياسة بالمصدر لا يثبت الترويسة الصادرة. سجّل فئات وقيماً منطقية فقط، وإن لم تظهر طلبات خارجية فاذكر ذلك دون ادعاء حركة غير مرصودة. نقص فئة أو ترويسة يبقي الحالة معلقة؛ التسريب المثبت فشل.

## BROWSER-034 remains active | تبقى 034 نشطة

Not deferred by this decision. Genuine native pending-write qualification and all remaining original EN/AR context/authorization rows remain mandatory. The accepted 97-sample network-navigation subcheck stays partial PASS; no repeated run or promotion to full-case PASS. See [investigation](QSC-Task-3.23-P5-Clipboard-Residual-Risk-Assessment.md).

لم يؤجل هذا القرار 034. تبقى آلية تعليق الكتابة الأصلية وصفوف السياق والصلاحيات إلزامية. يحفظ نجاح صف الشبكة الجزئي دون إعادة أو تحويل إلى نجاح كامل.
