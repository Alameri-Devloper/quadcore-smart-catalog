# BROWSER-034 conditional risk decision / قرار قبول المخاطر المشروط

## Formal conditional owner acceptance / القبول المشروط الرسمي — 2026-11-11

The owner has now approved **P5_CONDITIONALLY_ACCEPTED_FOR_INTEGRATION** for the verified P5 Management API/UI and its Staff integration. See [the formal acceptance record](QSC-Task-3.23-P5-Conditional-Owner-Acceptance-20261111.md). This later decision supersedes earlier pending-acceptance/recommendation wording as the current P5 disposition. Earlier dated records remain historical evidence.

اعتمد المالك الآن **P5_CONDITIONALLY_ACCEPTED_FOR_INTEGRATION** لإدارة P5 وتكاملها المتحقق مع Staff. يوثق سجل القبول الرسمي القرار اللاحق، ويحل وضع القبول المشروط محل صياغة الانتظار أو التوصية السابقة بوصفه الحالة الحالية، مع حفظ النصوص المؤرخة السابقة تاريخياً.

BROWSER-034 retains **RISK_ACCEPTED_WITH_LIMITATIONS** and underlying **INCONCLUSIVE / NOT PASSED** evidence. The five deferred cases and their original scheduling remain pending. Existing security/release gates remain in force. PR merging requires separate owner authorization. Production deployment, anonymous public-sharing activation and P6 work remain unauthorized by this decision.

يبقى قرار مخاطر 034 ونتيجة اختبارها الأصلية كما هما، وتبقى الحالات الخمس المؤجلة معلقة وفق جدولتها الأصلية. تستمر بوابات الأمن والإصدار القائمة، ويحتاج الدمج تفويضاً منفصلاً. لا يصرح القرار بالنشر الإنتاجي أو تفعيل المشاركة العامة المجهولة أو أعمال P6.

The earlier sections below are preserved as the historical record preceding this formal acceptance.

تحفظ الأقسام السابقة أدناه بوصفها السجل التاريخي الذي سبق القبول الرسمي.


## Decision / القرار

Owner approval date is November 11, 2026, Asia/Aden. The owner authorized OPTION A, RISK_ACCEPTED_WITH_LIMITATIONS, subject to verification of the existing security controls.

تاريخ موافقة المالك 11 نوفمبر 2026 بتوقيت عدن. اعتمد المالك الخيار A لقبول المخاطر ضمن الحدود بعد التحقق من الضوابط الأمنية القائمة.

| Item / البند | Recorded disposition / الحالة المسجلة |
|---|---|
| Risk decision / قرار المخاطر | BROWSER-034 — RISK_ACCEPTED_WITH_LIMITATIONS |
| Native clipboard test evidence / دليل اختبار الحافظة الأصلية | INCONCLUSIVE / NOT PASSED |
| Historical browser results / نتائج المتصفح التاريخية | 34 BROWSER_PASS / 6 PENDING, preserved |
| Conditional acceptance recommendation / توصية جاهزية القبول المشروط | READY_FOR_CONDITIONAL_OWNER_ACCEPTANCE |
| Formal P5 status / حالة P5 الرسمية | P5_IMPLEMENTED_PENDING_ACCEPTANCE |
| PR #65 / طلب السحب | OPEN / DRAFT, unchanged |

This disposition applies to the residual BROWSER-034 native-write race on candidate 5ce004270259dcde2df5ff3346bafb766fe8c54c. It records the owner's risk decision separately from test evidence. The five deferred cases and their scheduling decision remain mandatory.

يخص القرار احتمال اكتمال كتابة الحافظة بعد تغير السياق في المرشح المحدد. يسجل قرار المخاطر منفصلاً عن أدلة الاختبار، وتبقى الحالات الخمس المؤجلة وشروط جدولتها إلزامية.

## Verified controls / الضوابط المتحقق منها

Verification used the existing source, tests and recorded results. No new test campaign or native clipboard experiment was executed for this documentation task.

اعتمد التحقق على المصدر والاختبارات والأدلة القائمة، دون حملة اختبارات أو تجربة حافظة جديدة.

| Control / الضابط | Verified behavior and evidence / السلوك والدليل |
|---|---|
| URL construction / بناء الرابط | CryptographicPublicShareTokenGenerator generates 32 random bytes, encoded as a canonical 43-character bearer. PublicProductShareLifecycle.candidate/retrieve construct the configured canonical origin plus /share/ and that bearer. No session credential, authentication payload, Product/Branch/Workspace identity or product data is encoded in the URL. canonicalPublicShareOrigin rejects userinfo, query, fragment and non-root paths, and requires HTTPS in production. Existing token/origin tests cover these rules. يولد رمز عشوائي مستقل عن الجلسة وبيانات المنتج، ويمنع الأصل بيانات الدخول والاستعلامات والشظايا. |
| Authentication and disclosure / المصادقة والإفصاح | The HTTP boundary resolves trusted current sessions, rejects Restricted sessions, and serializes explicit result fields only. Management link retrieval requires catalog.sharing.publicLink.manage, catalog.products.view and pricing.view. Responses use private/no-store and no-referrer. Existing route, lifecycle and management tests exercise denial. URL and grantId are intentional authenticated management output. تحمي الجلسة الموثوقة والصلاحيات استرجاع الرابط، وتقتصر الاستجابة على الحقول المعتمدة. |
| Retail and public specifications / التجزئة والمواصفات العامة | PostgreSqlPublicProductShareResource.readCurrent scopes Product, Branch, listing, template and definitions to Workspace, and selects workspace Retail plus Retail-only branch override. PublicShareEligibilityResource has no Wholesale field. evaluatePublicShareEligibility requires Published, Active Branch, Listed, valid effective Retail, and qualifying explicitly public template specifications. Existing eligibility tests cover zero/false, malformed data and integrity failures. يتحقق استعلام الأهلية من تجزئة الفرع أو المساحة والمواصفات العامة ضمن المساحة، دون Wholesale. |
| Admission and current serving boundary / القبول وحدود العرض الحالية | PublicProductShareManagementService admits through approved PostgreSQL accounting before readiness/lifecycle work and fails closed for Denied, Unavailable and uncertain outcomes. Existing service/HTTP/PostgreSQL tests cover limits and isolation. The delivered candidate mounts authenticated management routes only. Its recorded anonymous public-route probe is 404 and private anonymous probes are 401. P6 public resolution/admission and P7 public page/media serving remain separately gated. Their future public DTO and transport behavior are not qualified by this decision. تلتزم إدارة P5 بقبول PostgreSQL وتفشل مغلقة. لا يفعّل المرشح العرض العام المجهول، وتبقى بوابات P6/P7 مستقلة. |
| Clipboard guards / حراس الحافظة | PublicShareManagementCoordinator.run validates generation, disposal and abort state after the real API result and before invoking writeText, then rechecks after the awaited write. clear/dispose invalidate generation and abort fetch. The component resets identity-scoped state for Product/Branch/capability changes and clears on pagehide/hidden visibility. Existing late-network and deferred-clipboard unit tests support stale-UI suppression. These checks act on observed application context and do not guarantee instantaneous knowledge of a server-side authorization change. تمنع الحراس نشر الحالة القديمة عند اكتشاف تغير السياق، ولا تفترض معرفة فورية بتغير صلاحية في الخادم. |

### Lifecycle and duration / دورة الحياة والمدة

- New Issue checks current eligibility and commits grant plus audit atomically. An existing active tuple is reused.
- Copy retrieves the existing active grant without creating another grant. Copy/reuse can return the same link during temporary product ineligibility, as specified by existing tests. Serving must independently revalidate current eligibility when its later phase is activated.
- Replace requires the expected current grant, rechecks eligibility, revokes the predecessor and creates its successor atomically. Failed replacement rolls back. Stale expected-grant replay is rejected.
- Revoke requires the dedicated management permission and Branch scope. It does not require product-view/pricing permission or readable retrieval keys. Admission still applies. Revocation removes the retrievable bearer envelope and repeated revocation is idempotent.
- V1 has no automatic expiry or session-bound lifetime. Product, Branch, Workspace or session changes do not themselves revoke an existing grant. Replacement/revocation are explicit lifecycle actions. Future anonymous serving must enforce grant validity.

يتحقق الإصدار الجديد من الأهلية ويثبت المنحة والتدقيق ذرياً، ويعيد استخدام المنحة النشطة. يسترجع Copy المنحة القائمة دون إنشاء أخرى، وقد يبقى الرابط نفسه أثناء عدم أهلية مؤقتة مع وجوب تحقق العرض اللاحق من الأهلية الحية. يستبدل Replace المنحة ذرياً بعد مطابقة المنحة المتوقعة، ويتراجع عند الفشل. يطبق Revoke صلاحية الإدارة ونطاق الفرع والقبول، ويزيل ظرف الرمز القابل للاسترجاع. لا توجد مدة انتهاء تلقائية أو مدة مرتبطة بالجلسة، ولا يسحب تغيير السياق المنحة تلقائياً.

## Residual limitation / القيد المتبقي

A native clipboard write started in an earlier authorized context may complete after Product, Branch, navigation, session, Workspace or authorization context changes. The application cannot guarantee cancellation of an already-started navigator.clipboard.writeText operation. Its UI guards mitigate stale presentation but do not guarantee unchanged OS clipboard contents. A later paste could disclose the old-context public bearer to an unintended recipient. The bearer is an intended access capability and must be handled as sensitive.

قد تكتمل كتابة بدأت ضمن سياق مصرح به بعد تغير المنتج أو الفرع أو الملاحة أو الجلسة أو المساحة أو الصلاحيات. لا يضمن التطبيق إلغاء الكتابة الأصلية التي بدأت. تمنع حراس الواجهة عرض الحالة القديمة، لكن بقاء محتوى حافظة النظام دون تغيير غير مضمون. قد يؤدي اللصق اللاحق إلى إرسال رابط السياق السابق إلى جهة غير مقصودة، ويجب التعامل مع رمز الوصول بوصفه حساساً.

| Evidence class / فئة الدليل | Limit / الحد |
|---|---|
| Verified application controls / ضوابط التطبيق | Source/test-supported context guards, trusted management authorization, scoped lifecycle and admission. |
| Platform limitation / حدود المنصة | writeText exposes no application AbortSignal or controlled native hold/release interface. |
| Inferred residual risk / الخطر المستنتج | A previously dispatched native write can have an external clipboard effect after observed context invalidation. |
| Unverified timing / التوقيت غير المتحقق | No qualifying real pending-native-write mechanism, controlled settlement or complete EN/AR context matrix was established. |
| Historical partial evidence / الدليل الجزئي | The accepted 97-sample blocked-network-to-catalog observation remains partial. The deferred Promise unit test remains unit evidence. |

No reproduced clipboard vulnerability is asserted. Risk acceptance leaves the residual risk present. Native clipboard cancellation and the original sentinel assertion remain unproven.

لم يُثبت عيب حافظة فعلي قابل لإعادة الإنتاج. يبقى الخطر قائماً بعد قبوله، ويظل إلغاء الكتابة الأصلية وشرط بقاء العلامة الاصطناعية غير مثبتين.

## Acceptance and release limits / حدود القبول والإصدار

The required controls are confirmed within the delivered P5 management boundary, including closed anonymous serving. Recommend READY_FOR_CONDITIONAL_OWNER_ACCEPTANCE for a separate formal owner decision. Formal status remains P5_IMPLEMENTED_PENDING_ACCEPTANCE.

تأكدت الضوابط ضمن حدود إدارة P5 الحالية، بما فيها إغلاق العرض العام المجهول. التوصية هي جاهزية عرض القبول المشروط على المالك بقرار رسمي منفصل، مع بقاء حالة P5 معلقة.

BROWSER-026, BROWSER-029, BROWSER-030, BROWSER-033 and BROWSER-036 remain deferred under their original scheduling decision. Their requirements, historical evidence and existing merge/release significance remain unchanged. BROWSER-034 is excluded from browser PASS counting and gains this separate risk disposition only. Historical PENDING/INCONCLUSIVE entries remain intact.

تبقى الحالات الخمس مؤجلة وفق قرارها الأصلي وبأثرها على بوابات الدمج والإصدار. لا تضاف 034 إلى عدد نجاحات المتصفح، وتبقى نتائجها التاريخية معلقة أو غير حاسمة.

This decision grants no P5 acceptance, merge, production deployment, public-route activation, policy amendment, P6 recovery or P7 implementation authorization. Release still requires its existing security, integration, capacity and manual acceptance gates. The latest CI runtime audit reported zero findings, while the non-blocking full audit reported 12 findings, including one high. This clipboard decision does not resolve those dependency findings.

لا يمنح القرار قبول P5 أو الدمج أو النشر أو تفعيل المسارات العامة أو تغيير السياسة أو استئناف P6 أو تنفيذ P7. تبقى بوابات الإصدار القائمة ملزمة. أظهر تدقيق تبعيات التشغيل الأخير صفراً، بينما أظهر التدقيق الكامل غير الحاجب 12 نتيجة منها واحدة مرتفعة، وتبقى متابعتها منفصلة.

P6_ENGINEERING_CANDIDATE — Acceptance HOLD remains.

## Evidence / الأدلة

- [Original acceptance checklist](QSC-Task-3.23-P5-Final-Six-Owner-Acceptance-Session.md) and [dated acceptance register](QSC-Task-3.23-P5-Deferred-Manual-QA-Register.md).
- [Clipboard residual risk assessment](QSC-Task-3.23-P5-Clipboard-Residual-Risk-Assessment.md).
- [Lifecycle source and tests](../../../domains/catalog/sharing/application/public-product-share.use-cases.ts), with adjacent public-product-share.use-cases.test.ts.
- [Management orchestration](../../../domains/catalog/sharing/application/public-product-share-management.service.ts), with adjacent tests and HTTP route tests.
- [Scoped Retail resource](../../../domains/catalog/sharing/infrastructure/persistence/postgresql-public-product-share-resource.ts), [eligibility](../../../domains/catalog/sharing/domain/public-product-share-eligibility.ts) and adjacent tests.
- [Clipboard coordinator](../../../domains/catalog/sharing/presentation/public-product-share-management.coordinator.ts), adjacent tests, and PublicProductShareManagement.tsx.
- Existing ignored evidence under artifacts/task-reviews/p5-integrated-browser-20261111 includes browser-results.json and data-write-audit.json. The earlier 29 observation groups include 28 literal PASS entries and one expected HTTP 400 denial.
- [Quality and PostgreSQL CI](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/42952363841) and [Ubuntu/Windows media CI](https://github.com/Alameri-Devloper/quadcore-smart-catalog/actions/runs/42952368062), workflow_dispatch on the exact candidate. These runs remain distinct from required automatic PR checks.

## Follow-up and preservation / المتابعة والحفظ

Review this risk disposition when a qualified native timing facility becomes available, a stale clipboard/UI disclosure is reproduced, relevant context/authentication/clipboard/lifecycle controls change, or public serving/release is proposed. Assess any new evidence against the retained original criteria. Any change to the acceptance requirement or clipboard behavior requires an explicit owner decision.

يُعاد تقييم القرار عند توفر آلية توقيت أصلية مؤهلة، أو إعادة إنتاج إفشاء قديم للحافظة أو الواجهة، أو تغيير الضوابط المعنية، أو اقتراح العرض العام أو الإصدار. تُراجع الأدلة الجديدة وفق الشروط الأصلية، ويحتاج أي تغيير للسلوك أو شروط القبول قراراً صريحاً من المالك.

Only this decision record and the dated register overlay were changed. No source, test, architecture contract, CI definition, database, service, Git HEAD/index or PR state was modified. The original untracked integration report and all historical evidence remain preserved.

اقتصر التغيير على سجل القرار وإضافة مؤرخة في سجل القبول، مع حفظ المصدر والاختبارات والعقود والإعدادات والبيانات والخدمات وGit وحالة PR والتقرير المحلي السابق والأدلة التاريخية.

Next action is a formal owner review of conditional P5 acceptance with this risk decision and the five deferred requirements explicitly attached.

الخطوة التالية مراجعة المالك الرسمية لقبول P5 المشروط، مع إرفاق قرار المخاطر والحالات الخمس المؤجلة صراحة.
