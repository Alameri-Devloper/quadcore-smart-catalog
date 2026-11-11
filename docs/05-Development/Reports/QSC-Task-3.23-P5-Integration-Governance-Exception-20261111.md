# P5 integration governance exception / استثناء حوكمة تكامل P5

## Owner decision / قرار المالك

**P5_INTEGRATION_GOVERNANCE_EXCEPTION_APPROVED**

Approval date is **2026-11-11**, Asia/Aden. The owner explicitly approved a narrow integration-merge exception for Task 3.23-P5, PR #65, into feature/public-product-share-planning despite five deferred manual browser cases.

اعتمد المالك بتاريخ **2026-11-11** بتوقيت عدن استثناءً محدوداً يسمح بأهلية دمج P5 عبر PR #65 في فرع التكامل المحدد رغم الحالات اليدوية الخمس المؤجلة.

| Boundary / الحد | Disposition / الحالة |
|---|---|
| Integration acceptance / قبول التكامل | P5_CONDITIONALLY_ACCEPTED_FOR_INTEGRATION, previously documented |
| Integration merge eligibility / أهلية الدمج | Eligible under this exception after publication, successful safety checks and separate explicit owner merge authorization |
| Deferred release acceptance / قبول الإصدار المؤجل | Five cases remain DEFERRED and mandatory before production release |
| Production release authorization / تفويض الإنتاج | Not granted by this decision |

The exception is recorded locally first. The prior general merge prohibition is superseded only for this specific deferred-case integration gate once the exception is published. All other required safety, review and repository-protection gates remain applicable. The underlying original acceptance criteria and test results are preserved.

يسجل القرار محلياً أولاً، ويستثني بوابة المؤجلات من حظر الدمج العام لهذا التكامل فقط بعد نشره. تبقى سائر بوابات السلامة والمراجعة وحماية المستودع وشروط الاختبار الأصلية ونتائجها محفوظة.

## Exact scope / النطاق المحدد

- Repository is Alameri-Devloper/quadcore-smart-catalog.
- PR #65 head branch is feature/task-3.23-p5-management-api-ui.
- Verified documentation baseline is 5710501253bc0c86ae0754f143058908f7edcc06.
- Reviewed implementation and CI baseline is 5ce004270259dcde2df5ff3346bafb766fe8c54c.
- Target is feature/public-product-share-planning at verified HEAD 649023f7a4c96992d04129ed1e60a42f43de4152.
- This decision authorizes a local documentation commit. Publication requires a separate owner confirmation. Ready for Review, any PR-description amendment and merge require a subsequent separate confirmation.
- The intended merge strategy is a regular merge commit, consistent with PR #66 and the repository's enabled merge-commit strategy. Source branches are retained.

يقتصر القرار على المستودع وPR #65 وفرع التكامل والرؤوس المحددة أعلاه. يصرح بcommit توثيق محلي، ويحتاج النشر تأكيداً منفصلاً، ثم تحتاج حالة المراجعة وتعديل الوصف والدمج تأكيدها اللاحق المنفصل. الاستراتيجية المقترحة هي merge commit عادي مع إبقاء فرع المصدر.

## Deferred acceptance and residual risk / القبول المؤجل والخطر المتبقي

| Case / الحالة | Continuing requirement / المتطلب المستمر |
|---|---|
| BROWSER-026 | DEFERRED, physical touch, mandatory before production release |
| BROWSER-029 | DEFERRED, screen-reader speech, mandatory before production release |
| BROWSER-030 | DEFERRED, native browser zoom, mandatory before production release |
| BROWSER-033 | DEFERRED, native clipboard rejection, mandatory before production release |
| BROWSER-036 | DEFERRED, browser storage and outgoing headers, mandatory before production release |
| BROWSER-034 risk disposition | RISK_ACCEPTED_WITH_LIMITATIONS, unchanged scope |
| BROWSER-034 native-write test evidence | INCONCLUSIVE / NOT PASSED |

The historical register remains 34 BROWSER_PASS / 6 PENDING. No deferred case is removed, cancelled or promoted to PASS. The existing clipboard risk decision continues to govern a native write dispatched in an earlier authorized context. UI guards do not guarantee native cancellation or unchanged clipboard contents. This exception adds no clipboard acceptance claim and does not broaden that risk disposition.

يبقى السجل التاريخي 34 نجاح متصفح و6 حالات معلقة. لا تحذف أي حالة أو تلغى أو تحول إلى PASS. يستمر قرار الحافظة القائم للكتابة التي بدأت في سياق مصرح به، ولا تضمن حراس الواجهة إلغاءها أو بقاء الحافظة دون تغيير، ولا يوسع هذا الاستثناء نطاق قبول المخاطر.

## Production and policy limits / حدود الإنتاج والسياسات

This exception grants no production deployment, main integration, anonymous public-sharing activation, security-policy waiver or share-link lifecycle-policy change. Production qualification still requires deferred acceptance, applicable public-resolution/media admission, lifecycle/revocation-policy review, capacity/security/release gates and dependency review. The latest full non-blocking dependency audit had 12 findings, 11 moderate and 1 high. No automatic expiry or session-bound grant lifetime is introduced.

لا يجيز الاستثناء النشر الإنتاجي أو الدمج في main أو تفعيل المشاركة العامة المجهولة أو الإعفاء من سياسة أمنية أو تغيير سياسة دورة حياة الروابط. تبقى متطلبات الإنتاج المؤجلة والقبول العام والوسائط والمراجعة الأمنية والسعة ودورة الحياة والتبعيات قائمة. يحفظ التدقيق الكامل غير الحاجب 12 نتيجة، 11 متوسطة وواحدة مرتفعة، ولا يفترض انتهاء تلقائي للمنحة أو ارتباطها بالجلسة.

P5 remains P5_CONDITIONALLY_ACCEPTED_FOR_INTEGRATION until a separately authorized merge is verified. Only then may the integration milestone become P5_CONDITIONALLY_ACCEPTED_AND_INTEGRATED. P6_ENGINEERING_CANDIDATE — Acceptance HOLD remains. P7 remains NOT STARTED.

تبقى P5 مقبولة مشروطاً للتكامل حتى التحقق من دمج مفوض منفصل، ثم يمكن تسجيل إنجاز التكامل المشروط. تبقى P6 معلقة وP7 غير مبدوءة.

## Deployment safety verification / تحقق سلامة النشر

Read-only verification on 2026-11-11 found the following repository-visible configuration.

- Only QSC CI Quality Gate and Product Media Compatibility are registered workflows. They verify/build/test with contents-read permissions. Neither contains deployment, package/image publication, production migration or public-activation steps.
- Their push and pull_request branch filters are main and feature/product-entry-engine. Neither the P5 source branch nor the integration target matches those automatic filters. workflow_dispatch remains explicit.
- The inspected published workflow/package/Compose blobs match the local baseline. Package scripts contain no deployment/publication or install/build lifecycle hook. next.config.ts declares no deployment behavior.
- GitHub Pages is disabled. Repository deployments, environments and webhooks are empty. No external publisher check or commit status is recorded on the inspected source/target SHAs.
- docker-compose.yml describes existing local loopback PostgreSQL only. It is not run by publication or merge.
- The existing P2 release runbook states that the repository defines no production application service or hosting provider. No current automatic publication/migration/activation mechanism was found in the inspected repository configuration and GitHub records.

أظهر التحقق للقراءة فقط إجراءي CI للتحقق دون نشر، ولا تطابق فلاترهما التلقائية فرعي المصدر والتكامل. لم تظهر سكربتات نشر أو hooks تشغيل تلقائية في الحزم، وPages غير مفعل، وقوائم النشر والبيئات وwebhooks فارغة. يصف Compose PostgreSQL محلياً فقط، ويذكر دليل الإصدار عدم تعريف خدمة تطبيق إنتاجية أو مزود استضافة. لم يُعثر على آلية نشر أو ترحيل أو تفعيل تلقائي في التكوين والسجلات المفحوصة.

Deployment safety is satisfied for the inspected repository-visible paths. Recheck immediately before publication and merge. If a newly discovered automatic path could expose unfinished functionality or alter production, stop without changing its configuration. This result does not certify an uninspected external service.

اجتازت المسارات المفحوصة بوابة سلامة النشر، مع وجوب إعادة الفحص قبل النشر والدمج. يُتوقف عند اكتشاف آلية تلقائية قد تكشف الوظائف غير المكتملة أو تمس الإنتاج، دون تغيير إعدادها. يقتصر الاستنتاج على النطاق المفحوص.

## Evidence and implementation limits / الأدلة وحدود التنفيذ

- [Conditional owner acceptance](QSC-Task-3.23-P5-Conditional-Owner-Acceptance-20261111.md).
- [Deferred manual QA register](QSC-Task-3.23-P5-Deferred-Manual-QA-Register.md).
- [BROWSER-034 conditional risk decision](QSC-Task-3.23-P5-BROWSER-034-Conditional-Risk-Acceptance-20261111.md).
- [Current Roadmap](../../06-Roadmap/Current-Roadmap.md) and [Sprint continuation](../../06-Roadmap/Sprint-03-Continuation.md).
- [P2 release runbook](../../04-Infrastructure/Task-3.23-P2-Mechanism-A-Release-Runbook.md).
- [Quality/PostgreSQL CI](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/42952363841) and [Ubuntu/Windows media CI](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/42952368062) passed on 5ce004270259dcde2df5ff3346bafb766fe8c54c.
- 357 focused tests and 29 successful integrated browser observation groups are retained historical evidence. The 29 groups include 28 literal PASS entries and one expected HTTP 400 denial. They were not repeated for this documentation work. No CI result is attributed to a newer documentation SHA.

This documentation delivery creates this record and adds dated references to the QA register, conditional acceptance report and two roadmap files. Prior text is retained. No source, test, schema, architecture, business contract, CI configuration or QA data changes are introduced. The unrelated untracked integration report remains excluded. The existing broad review-bundle command requires test-database preparation and is not run within this documentation-only scope.

ينشئ التسليم هذا السجل ويضيف إحالات مؤرخة إلى سجل QA والقبول وخطتي الطريق مع حفظ النص السابق. لا يغير المصدر أو الاختبارات أو المخطط أو المعمارية أو عقود العمل أو CI أو بيانات QA، ويبقى التقرير غير المتتبع خارج التسليم. لم تشغل أداة المراجعة الشاملة التي تفرض تهيئة قاعدة اختبار ضمن هذا النطاق التوثيقي.

Next action after local commit verification is the separate publication authorization request. No Push, Ready for Review, PR-body mutation or merge follows from this record alone.

الخطوة التالية بعد التحقق من commit المحلي طلب تفويض النشر المنفصل. لا يجيز هذا السجل وحده Push أو تغيير حالة PR أو وصفه أو الدمج.
