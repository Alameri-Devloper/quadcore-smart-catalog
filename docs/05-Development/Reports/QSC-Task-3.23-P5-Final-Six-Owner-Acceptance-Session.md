> Scheduling update — 2026-10-22: five cases (026, 029, 030, 033, 036) are owner-approved DEFERRED, not PASS or cancelled. BROWSER-034 remains active/PENDING. Requirements below remain authoritative; see [deferred QA register](QSC-Task-3.23-P5-Deferred-Manual-QA-Register.md).
> تحديث الجدولة: خمس حالات مؤجلة بموافقة المالك وليست نجاحاً أو إلغاءً، وتبقى 034 نشطة ومعلقة. الشروط أدناه محفوظة وملزمة.

﻿# P5 final six — one owner-operated acceptance session | جلسة المالك الموحدة للحالات الست

2026-10-21 — P5_IMPLEMENTED_PENDING_ACCEPTANCE. Baseline:34 genuine BROWSER_PASS,6 PENDING,0 unresolved reproduced application FAIL. This single session supersedes earlier one-group-at-a-time instructions. No new owner observations have been received.

القبول معلق:34 نجاح متصفح فعلي و6 حالات معلقة و0 عيب تطبيق مثبت غير محلول. هذه جلسة موحدة تحل محل تعليمات المجموعات السابقة، دون ادعاء ملاحظات مالك جديدة.

## Shared setup and safe evidence | الإعداد والأدلة الآمنة

- Existing account: **p5_staff**, company **p5-browser-b**. Use its current session. If expired, privately enter the existing `full password:` from `C:/Users/dell/AppData/Local/QSC-P5-QA-Private/p5-browser-20261021/login-private.txt`; never send credentials or credential screenshots. No reset/reseed/key rotation/database creation is needed.
- Exact pages: [branch1 product](http://localhost:4328/catalog/qa-product?branchId=qa-branch-1), [branch2 product](http://localhost:4328/catalog/qa-product?branchId=qa-branch-2), [catalog](http://localhost:4328/catalog), [login](http://localhost:4328/login).
- Use this Windows QA host. An already installed local Edge/Chrome browser can be operated manually if native zoom/DevTools/permission controls are missing in the built-in browser. Record browser/profile/version and identify observations as OWNER_MANUAL, separately from supported agent BROWSER_PASS. Do not install a dependency, extension or browser-control bridge.
- `localhost` on another phone/tablet addresses that device, not this QA host. Do not expose4328 to the LAN, create a tunnel or change firewall/origin/security policies. A physical touchscreen on this host can test actual finger input at mobile/tablet CSS widths. A separate device needs a separately discussed approved environment.
- Session header: date/time/timezone, browser/version, account/company, physical device/input, CSS viewport, native zoom, reader/version/voice where used. For each row record language, action, expected versus actual and PASS/FAIL/UNAVAILABLE/INCONCLUSIVE. Unavailable or incomplete means PENDING; a checklist tick or “done” is insufficient evidence.
- Record nonsecret notes/booleans only. No HAR exports, storage/cookie dumps, request/response bodies, clipboard values or full console logs. Do not paste/visit a share URL or send it externally. Hide the link BEFORE screenshots; do not capture an unredacted token screenshot first. If a reader speaks a URL value, listen privately and do not record/transcribe it.
- Run Groups A–C as one session, reusing operations for the six missing observations. Do not rerun the34 accepted cases as a suite. Restore native zoom, temporary per-origin clipboard settings, reader settings and synthetic clipboard sentinel afterward. Do not clear all cookies/storage or erase accepted evidence.

الحساب الحالي p5_staff ضمن p5-browser-b والروابط أعلاه على جهاز الاختبار نفسه. أدخل كلمة المرور الحالية بصورة خاصة عند انتهاء الجلسة دون إرسالها. يمكن تشغيل متصفح محلي مثبت يدوياً إن افتقر المتصفح المدمج للأدوات، مع تسجيل هويته وفصل دليل المالك عن أتمتة المتصفح. localhost على هاتف آخر لا يشير إلى Windows؛ لا تفتح منفذاً أو نفقاً ولا تغير سياسة أمن. سجّل الجهاز واللغة والأبعاد والتكبير والقارئ والنتيجة الفعلية. احفظ ملاحظات غير سرية فقط، وأخفِ الرابط قبل الصور ولا ترسل HAR أو ملفات ارتباط أو محتوى الحافظة. أعد الإعدادات المؤقتة بعد الجلسة؛ غياب الأداة يبقي الحالة معلقة.

## Group A — touch, zoom and spoken accessibility | المجموعة أ: اللمس والتكبير والإتاحة المنطوقة

### BROWSER-026 — genuine touch | اللمس الحقيقي

**Account/page:** shared Staff/company, branch1 product above. **Tool:** existing physical touchscreen on this QA host, mobile layout around390 CSSpx and tablet around768 CSSpx at normal page zoom. Mouse clicks in device emulation are not touch.

**Interaction:** at each size in English, use fingers to scroll and tap Issue/reuse, Copy, Replace then Cancel, Revoke link then Cancel. Then confirm Replace and confirm Revoke on only this synthetic grant, reissue if needed, and Hide. Repeat in Arabic/RTL at both sizes. These operations supply the missing input mode; they are not counted as new lifecycle cases.

**Expected/PASS:** every action and warning/Cancel/Confirm responds to actual touch once; all targets and feedback are readable/reachable, scrolling works, no overlap or accidental double action, Hide removes URL. **FAIL:** reproduced incorrect/unresponsive/inaccessible touch action. **UNAVAILABLE:** no actual touch surface. **Evidence:** four rows (EN/mobile, EN/tablet, AR/mobile, AR/tablet), device/input/viewport and each action/confirmation outcome. Hide URL before any screenshot; no token values.

الأداة شاشة لمس فعلية على جهاز الاختبار بحجم هاتف نحو390px ولوحي نحو768px. استخدم الإصبع للتمرير والإصدار والنسخ وفتح التأكيدات وإلغائها ثم تأكيد الاستبدال والإلغاء للتفويض الاصطناعي فقط وإخفاء الرابط. كرر باللغتين والحجمين. النجاح استجابة واحدة صحيحة ووصول وقراءة دون تداخل؛ العطل المثبت فشل وعدم توفر اللمس يبقي الحالة معلقة. سجّل أربع نتائج دون رابط سري.

### BROWSER-030 — actual browser page zoom | تكبير الصفحة الحقيقي

**Account/page:** same branch1 product. **Tool:** native page-zoom menu visibly showing200%/400%. Agent result remains **Zoom unavailable**. No CSS zoom, window/viewport resizing, OS magnifier or ChatGPT panel scaling substitutes.

**Interaction:** keep a fixed normal desktop window. At200%, then400%, in English traverse heading/warning, Issue/Copy, known-grant input/review, URL label/Hide and inline Replace/Revoke confirmation warning/Cancel/Confirm using Tab/Shift+Tab and scrolling. Cancel confirmations; destructive actions are unnecessary here. Repeat both native zoom levels in Arabic, then restore100%.

**Expected/PASS:** readable/reachable content and controls, visible keyboard focus, complete confirmations, no overlap/clipped content or two-dimensional page scrolling needed to reach management controls. Record horizontal overflow explicitly. **FAIL:** actual control/content loss at verified zoom. **UNAVAILABLE:** genuine zoom percentage/effect cannot be verified. **Evidence:** four rows with native zoom percentage, language, access/focus/clipping/overlap and scrolling observations. Keep bearer links hidden for screenshots.

استخدم تكبير الصفحة الأصلي200% و400% ضمن نافذة ثابتة، وافحص باللوحة والتمرير كل الحقول والأزرار والتحذير والتأكيد والتركيز بالعربية والإنجليزية ثم أعد100%. ألغِ التأكيدات. النجاح قراءة ووصول كاملان دون فقد محتوى أو تداخل أو تمرير ثنائي الأبعاد للوصول؛ سجّل أي تجاوز أفقي. إذا تعذر إثبات التكبير الحقيقي فالحالة معلقة، ولا تستخدم بديلاً أو صورة تُظهر الرابط.

### BROWSER-029 — real screen-reader speech | النطق الفعلي لقارئ الشاشة

**Account/page:** same branch1 product. **Tool:** already installed Narrator/NVDA or equivalent with usable English and Arabic speech, and keyboard. Do not install software under this checklist. Missing reader/voice means the affected row is UNAVAILABLE.

**Interaction:** navigate heading, warning, labelled known-grant field, Issue/Copy, URL label and Hide with reader/Tab. Hear actual names, roles and reading order. Issue/reuse and Copy must announce localized completion/status. Open Replace/Revoke confirmations; hear warning and Cancel/Confirm, verify Cancel is initially focused and cancel returns focus to the invoker. The actual implementation is an inline fieldset, not an asserted modal: do not invent a modal role or focus-trap requirement. For safe missing feedback, enter synthetic nonexistent UUID `00000000-0000-4000-8000-000000000000`, Review revocation then Confirm; expect opaque “No link is available for this request” without a link. Also hear actual clipboard fallback/error during Group B. Repeat EN/AR. Do not transcribe a spoken bearer value.

**Expected/PASS:** correct localized names/roles/order, understandable focus context, warnings and actual success/error announcements without hunting focus. **FAIL:** a required name/warning/status is absent or wrong while reader works elsewhere. **Evidence:** reader/version/voice per language, short nonsecret spoken statuses, focus/order notes and success/error/confirmation rows. One missing-grant announcement alone does not complete all speech rows. No audio recording of URL/password speech.

شغّل قارئاً مثبتاً وصوتاً مناسباً لكل لغة واستمع فعلياً للأسماء والأدوار والترتيب والتحذيرات والنجاح والخطأ. افتح التأكيدات وألغِها وتحقق من التركيز؛ التأكيد مجموعة حقول داخل الصفحة وليس نافذة مشروطة مفترضة. استخدم UUID الاصطناعي أعلاه لملاحظة رد غياب آمن، وراقب خطأ الحافظة في المجموعة ب. سجّل نطقاً غير سري فقط، ولا تسجل قيمة الرابط. غياب القارئ أو الصوت لا يُعد نجاحاً.

## Group B — genuine clipboard behavior | المجموعة ب: سلوك الحافظة الحقيقي

### BROWSER-033 — actual write denial and fallback | رفض الكتابة الحقيقي والبديل

**Account/page:** same branch1 product. **Tool:** normal clipboard permission controls for this exact localhost origin; record previous setting, temporarily block this origin only. No global browser/OS policy changes or security bypass. If only reads are blocked or Copy still succeeds, write denial is unproven: INCONCLUSIVE/PENDING, not an app defect.

**Interaction:** with a synthetic active grant, apply normal site-level write denial; reload if required by the browser. Explicitly Copy. Establish actual rejection using a native denial indicator or sanitized error name in existing diagnostics plus the rendered fallback; a permission label alone is insufficient. English expected: “Automatic copy failed. Select the link and copy it manually.” Arabic: “تعذر النسخ التلقائي. حدد الرابط وانسخه يدوياً.” Verify labelled read-only fallback is selectable by keyboard/pointer and LTR even in Arabic. Hide removes it and restores visible focus. Repeat EN/AR. Reuse the reader/privacy observations in the same session. Restore previous site setting, verify ordinary Copy recovery once and clear clipboard to a harmless synthetic sentinel.

**PASS:** actual write rejection with usable labelled/selectable/read-only/LTR fallback and Hide, both languages. **FAIL:** proven rejection with missing/unusable fallback, URL remaining after Hide or broken recovery. **Evidence:** denial proof/error name, prior/restored site setting, localized message and label/selectability/read-only/LTR/Hide/focus booleans. No screenshot containing the fallback URL or exported network/permission values.

احجب الكتابة مؤقتاً لهذا الموقع فقط وسجّل الإعداد السابق. منع القراءة فقط أو استمرار نجاح النسخ لا يحقق الشرط. تحقق من رفض فعلي ورسالة النسخ اليدوي والتسمية والتحديد والقراءة فقط واتجاه LTR في اللغتين. أخفِ الرابط وتحقق من الاختفاء والتركيز ثم أعد الإعداد وافحص التعافي مرة واحدة ونظف الحافظة. لا تغير سياسة عامة أو تحفظ رابطاً أو صورته. غياب رفض كتابة حقيقي يبقي الحالة معلقة.

### BROWSER-034 — actual delayed clipboard/context disposal | تأخير الحافظة وتغيير السياق فعلياً

**Accounts/pages:** p5_staff / p5-browser-b; exact branch1/branch2/catalog/login pages above. Product-change row needs a second already approved product selected from the real catalog; only qa-product is pinned here. Do not guess/create another product. Workspace row uses existing p5_staff / p5-browser-a and private existing credentials. Authorization-revision row requires coordinated QA-only change for existing p5_scoped / p5-browser-a via existing p5_owner administration and exact restoration, never a global security-policy/password change.

**Tool/prerequisite:** an existing native clipboard facility that demonstrably keeps the actual write unresolved while browser context can change, with diagnostics distinguishing clipboard wait from a network wait. A native permission prompt qualifies only if it truly holds that write pending and permits the required context change. This facility is **not available through the current connection**. A spinner, slow network, throttling, pausing before writeText, mocked promise or clipboard monkeypatch does not qualify. No tool/bridge/code change is introduced by this checklist. If no qualifying facility exists, record UNAVAILABLE and stop this case; an operator alone cannot certify it. Discuss any new timing facility before introduction.

**Exact sequence once prerequisite exists**, per still-missing context row and language:
1. Set a harmless synthetic clipboard sentinel. On branch1 explicitly Copy; prove the network response completed and the real native write remains pending. Record timestamps/boolean diagnostics, no body/token.
2. Before write completion perform one actual context change: approved different product; branch1→branch2; genuine sign-out/session invalidation; workspace switch; controlled QA authorization revision. Use a separate clean attempt for each row, EN and AR. Record actual destination/session and time. Catalog disposal alone is not a different-product test.
3. Resolve/release actual clipboard delay. No old URL/status/confirmation may reappear, no action may auto-replay and clipboard must remain the sentinel rather than old-context link. Compare privately; retain booleans only. This does not require removing a link deliberately copied before context change, which is a different scenario.
4. For remaining delayed-network context rows use the existing approved bounded QA lock facility, independently proven backend blocking and explicit release. Do not repeat the accepted blocked-network-to-catalog row. Restore locks and exact original permissions. An expired lock is INCONCLUSIVE.

**PASS:** all remaining original context/authorization rows in EN/AR prove pending-before/change-before-completion and no stale UI/clipboard publication afterward. **FAIL:** those preconditions hold and old-context URL appears. **INCONCLUSIVE/PENDING:** operation finished before change, delay is network-only, second product absent or timing cannot be proved. **Evidence:** mechanism identity, response/pending/change/completion times, context/language matrix, UI/sentinel booleans and restoration. Existing97-sample network-navigation PASS stays partial evidence.

تحتاج الحالة أداة أصلية تؤخر الكتابة الحقيقية للحافظة مع إمكان تغيير السياق وإثبات اكتمال الشبكة وبقاء الكتابة معلقة. لا تتوفر بالاتصال الحالي؛ مؤشر الانشغال أو بطء الشبكة أو التوقف قبل الكتابة أو وعد وهمي لا يكفي. عند غيابها سجّل غير متاح؛ لا يكفي وجود المالك وحده ولا تُدخل أداة جديدة دون مناقشة.

عند توفرها ضع علامة اصطناعية بالحافظة وابدأ النسخ وأثبت التعليق ثم غيّر المنتج أو الفرع أو الجلسة أو مساحة العمل أو إصدار الصلاحية قبل الاكتمال، بمحاولة مستقلة لكل صف ولكل لغة. أكمل العملية وتحقق من عدم ظهور رابط/تأكيد قديم أو إعادة إجراء أو كتابة الرابط القديم للحافظة. يلزم منتج آخر معتمد فعلياً، دون تخمين أو إنشاء. استخدم القفل المعتمد لصفوف الشبكة المتبقية مع إثبات الحجب والتحرير واستعادة الصلاحيات. سجّل أوقاتاً وقيماً منطقية فقط. اكتمال العملية قبل التغيير غير حاسم، ولا يتحول دليل الشبكة الجزئي إلى نجاح كامل.

## Group C — privacy during the same actions | المجموعة ج: الخصوصية أثناء الإجراءات نفسها

### BROWSER-036 — browser storage and sent referrers | التخزين والإحالات الصادرة

**Account/page:** shared Staff/company and exact product pages. **Tool:** native DevTools Application/Storage/Network in an already installed local browser, with focused localhost history/console views. No arbitrary scripts, agent evaluate bypass, external collector, extension or HAR export. No native inspector means PENDING.

**Interaction:** observe requests before Groups A/B. Privately inspect this exact origin's localStorage, sessionStorage, IndexedDB, Cache Storage/service-worker caches and cookie records before/after Issue/Copy/fallback/Hide and real context change in EN/AR. Check whether a sharing bearer URL/token persists; normal session-cookie presence is expected and is not a sharing-token leak. Do not copy cookie values or clear storage. Check anchor/form targets with URL visible and hidden: the intentional labelled textarea must not become an unintended navigation/referrer source.

Use existing Back to catalog/Operations links after explicit retrieval and inspect actual sent request URLs and Referer headers. Inspect any actual external requests generated by those actions without creating an external destination. No sharing bearer may occur in request URL/Referer/unintended link/history/console. Product path/branch ID without bearer is not a bearer leak. document.referrer, source policy declaration or no-store response header alone does not prove an outgoing header. If no external requests occurred, record “none observed”; do not claim unobserved traffic coverage. Explicit authenticated API response bodies can intentionally contain the requested URL; do not export them.

**PASS:** every listed storage class actually inspected with no persisted sharing bearer, and actual scoped history/console/targets/outgoing request/referrer observations clean in both languages. **FAIL:** reproduced bearer in prohibited storage/target/log/header. **INCONCLUSIVE/PENDING:** any required class/header/language/context unobserved. **Evidence:** browser/origin, inspected storage classes and bearer booleans, actual request types/Referer bearer boolean, link/history/console booleans, language/time. No sensitive panel screenshots, raw values, dumps or HAR. Prior six clean history entries/zero console entries and new English hidden-link DOM audit remain partial.

افحص تخزين الموقع المحدد وأدوات الشبكة الأصلية أثناء الإجراءات السابقة باللغتين، بما يشمل localStorage وsessionStorage وIndexedDB وCache Storage وذاكرة عامل الخدمة وملفات الارتباط دون نسخ القيم أو المسح. ملف ارتباط الجلسة المعتاد ليس تسريب مشاركة. تحقق من غياب رمز/رابط المشاركة في التخزين والسجل ووحدة التحكم والروابط/النماذج وعناوين الطلبات وReferer المرسل فعلياً. استخدم الروابط الموجودة دون إنشاء وجهة خارجية؛ مسار المنتج بلا رمز ليس تسريباً. document.referrer أو سياسة بالمصدر لا يثبت الترويسة الصادرة. سجّل فئات وقيماً منطقية فقط، وإن لم تظهر طلبات خارجية فاذكر ذلك دون ادعاء حركة غير مرصودة. نقص فئة أو ترويسة يبقي الحالة معلقة؛ التسريب المثبت فشل.

## One consolidated observation sheet | نموذج الملاحظات الموحد

|Case|Required rows|Nonsecret evidence|Initial status|
|---|---|---|---|
|026|EN/AR × touch mobile/tablet|device/input/viewport; actions/confirmations|PENDING|
|030|EN/AR × native200%/400%|actual zoom; access/focus/clipping/scrolling|PENDING — Zoom unavailable to agent|
|029|EN/AR names/order/confirmations/success/error|reader/voice; short nonsecret speech/focus notes|PENDING|
|033|EN/AR actual rejected write/fallback/recovery|denial proof; label/selectable/LTR/Hide booleans|PENDING|
|034|EN/AR × remaining context/authorization rows|real pending-write mechanism/timing; sentinel/UI booleans|PENDING — timing facility absent|
|036|EN/AR all storage classes/actual sent headers|classes/request types; bearer-presence booleans|PENDING|

Return one set of actual observations, not six approval messages. For each row include time/language/action/expected/actual/outcome/evidence. Blank, unattempted or unavailable stays PENDING. Restore zoom and per-site clipboard setting, stop reader if started solely for QA, release QA locks, restore exact temporary permissions, hide URL and replace clipboard with a harmless synthetic sentinel. Keep server4328/evidence intact. No passwords, keys, databases, production settings or Git publication operations change. Sufficient owner evidence is recorded as OWNER_MANUAL_PASS separately from34 BROWSER_PASS; no result is inferred before review. P5 stays pending until all mandatory original gates genuinely pass.

أرسل مجموعة ملاحظات فعلية واحدة وليس ست موافقات. دوّن الوقت واللغة والإجراء والمتوقع والفعلي والنتيجة والدليل؛ الفراغ أو عدم التوفر يبقي الحالة معلقة. أعد الإعدادات والأقفال والصلاحيات وأخفِ الرابط ونظف الحافظة مع إبقاء الخادم والأدلة. لا تغير كلمات المرور أو المفاتيح أو القواعد أو إعداد الإنتاج أو تنفذ نشر Git. تُراجع أدلة المالك وتُسجل منفصلة، ويبقى القبول معلقاً حتى اكتمال كل البوابات الفعلية.
