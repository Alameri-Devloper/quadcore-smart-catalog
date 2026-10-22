# Public Share Management Admission | قبول طلبات إدارة المشاركة العامة

Status / الحالة: OWNER APPROVED POLICY; implementation candidate under acceptance / سياسة معتمدة من المالك ومرشح التنفيذ قيد القبول.
Date / التاريخ: 2026-10-19. Scope / النطاق: P5 management only / إدارة P5 فقط.

## Approved policy | السياسة المعتمدة

| Operation / العملية | User within Workspace / المستخدم داخل مساحة العمل | Workspace aggregate / إجمالي مساحة العمل | Window / الفترة |
| --- | ---: | ---: | --- |
| Issue / Reuse — إصدار / إعادة استخدام | 20 | 120 | 60 seconds / ثانية |
| Copy — نسخ | 60 | 600 | 60 seconds / ثانية |
| Replace — استبدال | 5 | 30 | 60 seconds / ثانية |
| Revoke — إلغاء | 60 | 600 | 60 seconds / ثانية |

Both budgets must allow every request. Issue and Reuse share a bucket; other operations have separate buckets. Fixed-duration windows start at the first admitted request using PostgreSQL time after both locks. Nearly two budgets can be admitted around a reset boundary; this approved behavior is not a sliding window.

يجب أن يسمح الحدان بكل طلب. يشترك الإصدار وإعادة الاستخدام في عداد واحد وتستقل بقية العمليات. تبدأ الفترة الثابتة عند أول طلب مقبول باستخدام توقيت PostgreSQL بعد القفلين. قد تتاح ميزانيتان تقريباً قرب التجديد؛ هذا سلوك معتمد وليس نافذة منزلقة.

## Authority and accounting | السلطة والاحتساب

Identity resolves fresh Full sessions. Keys are Workspace/operation and Workspace/actor/operation; no session, authorization-version, product, Branch, grant, URL, bearer, cookie or IP partition. Browser claims never become authority. Existing management permission, Workspace ownership and Branch Scope remain mandatory.

تحل الهوية جلسة Full حديثاً. مفاتيح العدادات هي مساحة العمل/العملية ومساحة العمل/الممثل/العملية، دون تقسيم حسب الجلسة أو إصدار التفويض أو المنتج أو الفرع أو التفويض أو الرابط أو الرمز أو ملف الارتباط أو IP. لا تصبح ادعاءات المتصفح سلطة، وتبقى صلاحية الإدارة والملكية ونطاق الفرع إلزامية.

One short independent transaction ensures/locks Workspace first and actor second, samples database time after both locks, and either increments both counters or rolls back both. Zero-count placeholders start at the post-lock timestamp. Locks are released before readiness and the P4 lifecycle Unit of Work. Admission is not merged into lifecycle/audit transactions.

تنشئ معاملة قصيرة مستقلة صف مساحة العمل وتقفله أولاً ثم صف الممثل، وتأخذ توقيت القاعدة بعد القفلين، وتزيد العدادين معاً أو تتراجع عنهما معاً. تبدأ الصفوف الصفرية بتوقيت ما بعد القفلين، وتُحرر الأقفال قبل الجاهزية ووحدة عمل P4، دون دمج معاملة القبول بمعاملة دورة الحياة والتدقيق.

Committed admission counts the attempt despite later 404/409, readiness failure, lifecycle rollback, client disconnect or ambiguous mutation response. Internal Issue retries charge once. An uncertain admission commit is never retried and never starts lifecycle work. Authentication, transport and initial operation authorization reject before accounting; target scope authorization still precedes mutation.

يُحتسب الطلب بعد اعتماد القبول حتى مع 404 أو 409 أو فشل الجاهزية أو تراجع العملية أو انقطاع العميل أو استجابة غير مؤكدة. تُحتسب محاولات Issue الداخلية مرة واحدة. لا يُعاد اعتماد غير مؤكد ولا تبدأ العملية بعده. ترفض المصادقة والنقل والتفويض الأولي قبل الاحتساب، ويبقى تفويض الهدف قبل تعديله.

## Revoke and failures | الإلغاء والأعطال

Other operations cannot consume Revoke's budget. Revoke needs no sharing keys, public-share URL origin, product/pricing view, eligibility, or successful Product Details. Existing same-origin POST protection, management permission, Workspace ownership, Branch Scope and non-disclosing target errors remain enforced.

لا تستهلك العمليات الأخرى ميزانية الإلغاء. لا يتطلب الإلغاء مفاتيح المشاركة أو أصل رابطها العام أو عرض المنتج والأسعار أو الأهلية أو نجاح التفاصيل. تبقى حماية المصدر نفسه لطلبات POST وصلاحية الإدارة والملكية ونطاق الفرع والأخطاء غير الكاشفة إلزامية.

Owner-approved failure policy: FAIL CLOSED, including Revoke. An isolated limiter failure can prevent revocation even while grant storage is healthy. No Owner bypass, local fallback, emergency endpoint or background retry exists. A full database outage prevents durable revocation regardless. Separate buckets do not reserve database capacity.

سياسة المالك المعتمدة: الرفض عند العطل بما يشمل الإلغاء. قد يمنع عطل المحدد الإلغاء رغم سلامة تخزين التفويضات. لا استثناء للمالك أو بديل محلي أو مسار طوارئ أو إعادة خلفية. تعطل القاعدة كاملة يمنع الإلغاء الدائم، ولا تحجز العدادات المستقلة سعة للقاعدة.

Exhaustion: HTTP 429, exact body {"type":"AdmissionDenied"}. Retry-After is the longest exhausted-counter wait, rounded up and clamped to 1..60 seconds. No exhausted scope, identity or remaining count is disclosed. Missing/invalid policy, missing table, permission failure, timeout and uncertain commit return 503 {"type":"ServiceUnavailable"}, without readiness/lifecycle execution. Identity infrastructure failure is 503; invalid sessions remain 401 and Restricted sessions remain 403. Every response keeps private/no-store, no-referrer and nosniff. Existing body-size/body/origin validation is preserved.

الاستنفاد يعيد 429 بالجسم المحدد، وRetry-After من أطول انتظار مطلوب مقرباً للأعلى ومحدوداً بين 1 و60 ثانية، دون كشف النطاق أو الهوية أو الرصيد. غياب السياسة أو فسادها أو الجدول أو صلاحياته أو المهل أو الاعتماد غير المؤكد يعيد 503 دون تنفيذ. عطل بنية الهوية 503 والجلسة غير الصالحة 401 والمقيدة 403، مع الرؤوس والتحقق الحالي.

## Configuration | الإعداد

Set QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON through server deployment configuration to the following policy-only JSON. Missing or changed approved fields fail closed. There is no permissive default. Configuration version is not part of quota identity. Every instance must use the same approved policy and writable database.

يضبط متغير السياسة عبر إعداد الخادم بالقيم التالية فقط. يُرفض غياب الحقول أو تغيير القيم المعتمدة دون سماح افتراضي. لا يدخل إصدار الإعداد في هوية العداد، ويجب توحيد السياسة والقاعدة بين النسخ.

```json
{"version":1,"backend":"PostgreSQL","windowSeconds":60,"cleanupGraceSeconds":900,"lockTimeoutMs":250,"statementTimeoutMs":1000,"budgets":{"Issue":{"user":20,"workspace":120},"Copy":{"user":60,"workspace":600},"Replace":{"user":5,"workspace":30},"Revoke":{"user":60,"workspace":600}}}
```

lock_timeout=250ms and statement_timeout=1000ms are isolated-verification starting values, not certified production tuning. Both P5 Sharing and its Identity resolver use optional 1000ms acquisition bounds; other callers retain prior defaults. SQL timeouts alone are not an end-to-end deadline. Production capacity/load evidence and any bounded adjustment require review.

قيم المهل بداية للتحقق المعزول وليست ضبطاً إنتاجياً مصدقاً. يستخدم مسارا Sharing والهوية الخاصان بـP5 مهلة اكتساب اتصال اختيارية 1000ms مع حفظ الإعدادات الافتراضية لبقية المستدعين. ليست مهلة SQL مهلة شاملة للطلب، وتلزم مراجعة سعة الإنتاج وحمله وأي تعديل.

## Migration and maintenance | الترحيل والصيانة

Apply reviewed migrations in order, including 0017, 0018 and additive 0019, before dependent writers/routes. 0019 creates catalog_public_share_management_admission with scoped primary key, Workspace foreign key, fixed operation/scope checks, safe counts/timestamps and expiry index. No bearer, URL, digest, key, IP or authentication cookie is stored. Do not rewrite 0017/0018. Disable dependent routes before schema rollback. Production migration is separately gated.

تطبق الترحيلات بالتسلسل بما فيها 0017 و0018 و0019 الإضافي قبل التفعيل. ينشئ الجدول بمفتاح مقيد ومرجع مساحة العمل وقيود العمليات والنطاق والعدادات والتوقيت وفهرس الانتهاء، دون بيانات حساسة. لا تُعاد كتابة السابق، وتُوقف المسارات التابعة قبل التراجع. الترحيل الإنتاجي مشروط مستقلاً.

Windows reset logically after 60 seconds without cleanup. Rows become cleanup-eligible 15 minutes after window end. Explicit command: npm run public-sharing:cleanup-admission. It removes at most 1,000 expired rows, skips locked rows and prints only a safe count. It performs no migration and creates no scheduler. Recommend daily operator execution using deployment-approved credentials in process environment. Never persist credentials in command history, scripts, logs or evidence. Review bounded repeated execution if backlog remains. Cleanup failure does not affect accounting correctness.

تتجدد الفترات منطقياً بعد 60 ثانية دون تنظيف، وتصبح الصفوف قابلة للتنظيف بعد 15 دقيقة من نهاية الفترة. يحذف الأمر الصريح حتى ألف صف منتهٍ ويتجاوز المقفل ويطبع العدد فقط، دون ترحيل أو مجدول. يوصى بإجراء يومي بمسؤول محدد وبيئة آمنة، دون حفظ الاعتمادات في السجل أو السكربت أو الأدلة. تُراجع إعادة التنفيذ المحدودة عند التراكم، ولا يؤثر فشل التنظيف في صحة الاحتساب.

## Acceptance and deployment boundaries | حدود القبول والنشر

See the dated engineering/independent reports for actual test evidence. Unit/source/PostgreSQL checks do not certify browser, screen-reader or hosted CI acceptance. Mandatory built-Next.js browser QA remains pending if Computer Use cannot verify the browser URL; no alternate automation bypass is authorized. Do not merge while mandatory acceptance is pending.

تُراجع التقارير المؤرخة للأدلة الفعلية. لا تصدق اختبارات المصدر والوحدة والقاعدة قبول المتصفح أو قارئ الشاشة أو CI. يبقى قبول Next.js الفعلي معلقاً إذا تعذر تحقق Computer Use من الرابط، ولا يُسمح بتجاوز الحماية أو الدمج مع بقاء القبول معلقاً.

This limiter does not replace network/pre-authentication abuse protection or make local media horizontally scalable. Actual host topology, capacity, consistent policy rollout, TLS/proxy/log redaction, timeout tuning, daily cleanup ownership and key/origin provisioning remain deployment gates. No production deployment or migration is authorized here. Task 3.23 IN PROGRESS; P6/P7 NOT STARTED; DurableCoverage UNCHECKED.

لا يستبدل المحدد حماية الشبكة وما قبل المصادقة ولا يجعل الوسائط المحلية قابلة للتوسع الأفقي. تبقى الاستضافة والسعة والسياسة الموحدة وTLS والبوابة وتنقيح السجلات وضبط المهل ومسؤولية التنظيف والمفاتيح بوابات نشر. لا نشر أو ترحيل إنتاجي هنا؛ المهمة قيد التنفيذ وP6/P7 لم تبدآ والتغطية الدائمة UNCHECKED.