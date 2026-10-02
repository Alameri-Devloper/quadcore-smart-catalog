# Task 3.22-P8 Planning Report / تقرير تخطيط P8

> **Current P8 closure — 2026-10-03 | حالة إغلاق P8 الحالية:** This notice supersedes historical planning-only/manual-pending statements below. The user's closure request approves final verification and gated delivery. P8.1 automated/static acceptance PASS: 626 tests, 0 failures, 0 skips; fresh targeted closure regression also PASS: 626/626. All five manual QA groups are user-confirmed PASS. No confirmed production defect. No production or test changes; no Domain, Application, Infrastructure, API contract, database, migration, permission-semantic or architecture changes. P8CompletionGate: PASS; P8 and Task 3.22 COMPLETE. Local final gates PASS; actual PR #54 CI 4/4 PASS and merge PASS at 1101b0339faed47676582b4b22b89f61d1dfe2f5. Full suite: 1085 PASS, 0 FAIL, 1 Windows leaf-link platform skip; targeted P8: 626 PASS, 0 SKIP. Delivery results are tracked in the [P8 closure final report](QSC-Task-3.22-P8-Closure-Final-Report.md); No next task started. Deferred: raw branch UUID label in Permissions (presentation only, no security impact, correct authorization); persistent Branch guidance; generic Reservation success/ordering feedback; prior cross-tab freshness/source-label observations; Create-Branch form opening for view-only Staff (server create/update remains protected by workspace.branches.manage; no unauthorized write demonstrated). These are non-blocking and remain deferred. No next task is authorized.
>
> يحل هذا الإشعار محل عبارات التخطيط فقط وانتظار التحقق اليدوي التاريخية أدناه. اعتمد طلب المستخدم التحقق النهائي والتسليم المشروط. نجح القبول الآلي والثابت P8.1 بعدد 626 اختباراً دون فشل أو تخطي، ونجحت إعادة الاختبارات المحددة للإغلاق 626/626. أكد المستخدم نجاح مجموعات التحقق اليدوي الخمس. لم يثبت عيب إنتاجي، ولم يتغير المصدر أو الاختبارات أو المجال أو التطبيق أو البنية أو API أو قاعدة البيانات أو الترحيلات أو دلالات الصلاحيات أو المعمارية. نجحت بوابة إكمال P8 والبوابات المحلية وفحوص PR #54 الفعلية الأربعة والدمج؛ اكتملت P8 والمهمة 3.22. نجحت الاختبارات الكاملة 1085 دون فشل مع تخطي اختبار رابط واحد بسبب قيود Windows، وبقيت اختبارات P8 المحددة 626 ناجحة دون تخطي. يسجل تقرير الإغلاق أدلة التسليم. تبقى الملاحظات غير المانعة مؤجلة: UUID الفرع في واجهة الصلاحيات دون أثر أمني ومع تفويض صحيح؛ استمرار إرشاد الفرع؛ رسائل وترتيب الحجوزات العامة؛ ملاحظات حداثة البيانات وتسميات المصدر بين الألسنة؛ وفتح نموذج إنشاء الفرع لموظف العرض فقط مع حماية الكتابة خادمياً بصلاحية workspace.branches.manage وعدم إثبات كتابة غير مصرح بها. لا تعتمد مهمة لاحقة.


**Planning only — 2026-10-02. READY_FOR_P8_REVIEW: YES. P8ImplementationStarted: NO.**

هذا تقرير تخطيط فقط وجاهز للمراجعة، ولا يصرح بتنفيذ P8 أو بتغيير الشيفرة أو الاختبارات أو المعمارية. أُنشئ ملف التقرير وحده ويظل غير مدرج في Git لحين المراجعة.

## 1. Checkpoint and evidence method / نقطة التحقق ومنهج الأدلة

| Field | Verified state |
| --- | --- |
| CurrentBranch | `fix/member-authorization-revision-lifecycle`, **not** the integration branch |
| CurrentHEAD | `28d7d9701088c96067eb816e31ac0c4e4a9bd87e` |
| Expected integration branch | `feature/product-entry-engine` |
| Local integration branch | `e5234b70e5d6506efc5245b84213d453d0ad5bb3` — stale local ref |
| IntegrationHead | `8a77bba220d1f514c2edcde5316e310178bccb34`, matching remote-tracking ref and live `git ls-remote` |
| Initial WorkingTreeStatus | Only pre-existing unstaged `.serena/project.yml`; empty index |
| SerenaProjectYmlPreserved | YES; SHA256 `3EFC30BE05FDF94FBFC3D9BDD3E4FE7FB122D465903CA2F89027B509B4ECB998` |
| SerenaProjectYmlStaged | NO |

The branch mismatch was reported before discovery. Planning uses integration `8a77bba` as the authoritative baseline. Relevant docs and Presentation paths were compared read-only between current HEAD and integration; no differences appeared. No checkout, reset, pull, rebase, staging, commit, push, PR, or merge was performed. Before a future implementation starts, establish an approved branch based on the then-current integration without disturbing local Serena work.

Serena was used first for documentation discovery and focused symbol inspection. Direct structure resolved ownership; Graphify was unnecessary under this task's explicit restriction. This was a scoped static planning audit, not a fresh test run, live browser QA, dependency audit, or whole-repository review. Existing PASS evidence is historical acceptance evidence, not proof of a new P8 run.

الفرع الحالي مختلف عن فرع التكامل، ومرجع التكامل المحلي قديم؛ ثبت مرجع الخادم الحالي دون تعديل Git. تطابقت الوثائق والمسارات ذات الصلة بين HEAD الحالي والتكامل. استُخدمت Serena أولاً، ولم توجد فجوة ملكية تستدعي Graphify. لم تُنفذ اختبارات أو تحقق متصفح جديد، وتبقى نتائج الشرائح السابقة أدلة قبول تاريخية.

## 2. Authoritative sources and precedence / المصادر الحاكمة وأولوية الحالة

| Source | Authority used |
| --- | --- |
| [Presentation implementation contract](../../06-Roadmap/Task-3.22-Presentation-Implementation-Contract.md), §§5–22, 23–29 | §23 explicitly names P8 and its purpose; global workflow, security, accessibility, testing, and exclusion rules bound its hardening scope |
| [Current Roadmap](../../06-Roadmap/Current-Roadmap.md), current P7 notice and P1–P7 summaries | Current delivery state: P1–P7 COMPLETE; P8 ready for separate planning only |
| [Sprint continuation](../../06-Roadmap/Sprint-03-Continuation.md), current P7 notice | Current sequencing; old P3-unstarted/P4–P8-unstarted paragraphs are historical |
| [Presentation planning report](QSC-Task-3.22-Presentation-Planning-Report.md), §implementation sequence | Corroborates integrated bilingual, responsive, accessibility, input-method and security hardening |
| [Operational management contract](../../06-Roadmap/Task-3.22-A-Operational-Management-Contract.md) and [A6 contract](../../06-Roadmap/Task-3.22-A6-Operational-Branch-Selector-Implementation-Contract.md) | A1–A6 ownership and authoritative contracts; no selector fallback or new permission authority |
| P1.6, P2, P3, P4, P5/P5-R1, P6/P6-R1 final reports | Completed slice evidence, corrections, and explicitly deferred observations |
| [P7 final report](QSC-Task-3.22-P7-Final-Report.md) and [P7 closure](QSC-Task-3.22-P7-Closure-Final-Report.md) | P7 completion overrides older browser-fix NOT_READY and intermediate pending QA/CI statements |
| [Staff Permissions report](QSC-Staff-Permissions-Validation-Final-Report.md), merged PR #53 | Fixture/setup prerequisite restored; fix `01d5e8d`, docs `28d7d97`, CI 4/4 and user manual QA PASS; not a new P8 feature |
| `.github/workflows/quality-gate.yml`, `.github/workflows/product-media-compatibility.yml` | Existing final PR gate: Quality, PostgreSQL Integration, Linux/Windows compatibility; full `npm test` is required by Quality |

Current notices explicitly supersede historical slice-status text, not workflow contracts. Do not reopen P1–P7 acceptance because old report sections still say pending. No new ADR is indicated: contract §§27–29 explicitly preserve architecture, database, and dependencies. The Reservation performance report retains EXISTING INDEX SUFFICIENT; it does not assign an optimization to P8.

تحكم إشعارات الإغلاق الحالية حالة التسليم، ولا تلغي العقود الوظيفية السابقة. لا تُعاد فتح الشرائح بسبب نصوص تاريخية تقول إن التحقق كان معلقاً. لا يوجد قرار معماري جديد أو ترحيل أو اعتماد مطلوب، ولا تنسب وثائق أداء الحجوزات إضافة فهرس إلى P8.

## 3. Repository-defined P8 contract / عقد P8 المحدد في المستودع

**P8Name: Integration hardening.**

**P8Goal:** Verify the integrated Task 3.22 Operations experience preserves navigation, bilingual copy, responsive/accessibility behavior, touch/mouse/keyboard completion, and security across the completed workflows. Repair only demonstrated violations at their existing owning boundary.

**P8ScopeSource:** Exact §23 slice definition: “Navigation, bilingual copy, responsive/accessibility/touch/mouse/keyboard verification, and security regression.” Global §§7–22 and §24 specify what those terms mean. P8 does not add a business workflow or redesign completed slices.

**P8EntryCriteria:** P1–P7 completed/merged and P7 gate PASS (satisfied); Staff Permissions QA prerequisite fixed/merged (satisfied); coherent integration baseline identified (satisfied for planning). Implementation requires approval of this bounded P8 plan and its acceptance gate, then a safe implementation branch and test/browser fixtures. This request authorizes planning only.

**P8ExitCriteria:** Contract-defined verification categories covered using existing tools; authoritative state, disclosure, tenant/session isolation and mutation safety preserved; functional EN/AR, LTR/RTL, representative viewport and input-method acceptance recorded; no remaining blocking reproduced defect; focused bilingual completion evidence. Completed P1–P7 behavior remains intact.

**P8CompletionGate:** No standalone named P8 gate formula or P8-specific implementation contract was found in the inspected authoritative docs. **Proposed for review:** approved scope + applicable automated checks PASS + current integrated browser acceptance PASS + no blocking security/functional/accessibility regression + unchanged architectural boundaries + bilingual final report/review evidence. If delivered by PR, actual existing PR CI must pass before an authorized merge. Proposed wording is not an already-approved repository requirement. Planning approval must settle this gate before implementation.

اسم P8 هو تقوية التكامل. هدفها التحقق من التنقل والترجمة والتجاوب والإتاحة وإتمام التدفقات باللمس والفأرة ولوحة المفاتيح والأمان، دون إضافة وظائف أعمال. اكتملت شروط التخطيط السابقة، لكن التنفيذ يحتاج اعتماد الخطة وبوابة القبول وفرع آمن وبيئة تحقق. لم يُعثر على صيغة مستقلة مسماة لبوابة P8؛ الصيغة أعلاه اقتراح للمراجعة وليست اعتماداً قائماً.

## 4. Requirement classification / تصنيف المتطلبات

| Classification | Items and source |
| --- | --- |
| REQUIRED_FOR_P8 | Integrated navigation and dependent selection/reset; EN/AR copy and technical bidi isolation; mobile/tablet/desktop layouts; keyboard/focus/native dialog behavior; touch/mouse workflow completion; loading/empty/error distinctions; security/disclosure/session regression; integrated mutation/refetch/conflict safety. Contract §§7–24 |
| ALREADY_COMPLETE | P1–P7 features and slice acceptance; A1–A6 remediation; P5-R1 reason-intent correction; P6-R1 capability composition correction; P7 browser selection-key fix; Staff Permissions persisted-token decoding. Verify integration without reimplementing them |
| DEFERRED | Cosmetic ordering, generic Reservation success copy, persistent Branch helper text, cross-tab Branch refresh/stale label UX; existing dependency advisories remain separately tracked. No source explicitly assigns these repairs to P8 |
| OUT_OF_SCOPE | New business workflows, generic BFF, roles/permissions redesign, dependency upgrades, public share/WhatsApp/provider work, Product Entry or ordinary Catalog redesign, history redesign, index/schema/migration changes, production deployment, broad Identity lifecycle investigation. Contract §§26–29 and this request |
| UNCLEAR_NEEDS_DECISION | Approval of proposed P8 gate and integrated manual QA signoff/fixture access. Optional deferred UX inclusion needs explicit separate scope approval; it is excluded from this proposed plan |

Security regression means protecting the existing authority/disclosure boundaries, not expanding into an unsolicited dependency/security remediation program. No automatic requirement for realtime cross-tab synchronization, E2E tooling, new tests for every existing invariant, or broad source cleanup follows from “hardening.”

متطلبات P8 هي التحقق المتكامل للعقود الحالية. الوظائف المقبولة مكتملة، والمتابعات الشكلية لا تتحول تلقائياً إلى متطلبات. مراجعة الأمان لا تعني ترقية الاعتماديات أو إعادة تصميم التفويض. يحتاج اعتماد البوابة ومسؤولية التحقق اليدوي إلى قرار قبل التنفيذ.

## 5. Focused current-state audit / تدقيق الحالة الحالية المحدد

No production defect is confirmed by this planning pass. The main demonstrated evidence gap is a new integrated P8 acceptance record at the current baseline. “Not demonstrated” below means the inspected static tests/reports do not prove the actual mounted/browser behavior, not that production behavior is broken.

| Requirement | CurrentState / Evidence | Gap and TestsMissing | LayerOwner / Risk | TestsAlreadyExist / ManualQARequired |
| --- | --- | --- | --- | --- |
| Navigation/integration | `OperationsPage.tsx` composes the six workflow components; `operations-query-state.ts` allow-lists context; selectors use bounded keys | Complete mounted sequence across tools, browser back/forward and pending requests not demonstrated by static composition tests | Workspace Branch Presentation; HIGH stale state risk | `operations-query-state`, `operations-product-context`, `operations-foundation.integration`, per-workflow integration tests; browser tool/Branch/Product switches and dependent reset |
| Authorization/security | Shared Identity capability lifecycle; A1 hints only; resource actions and strict clients; restricted/401 handling | Current role-switch/revocation behavior across composed screens needs integrated evidence; add a regression only for an exposed missing case | Identity + owning Domain Presentation; server Application retains authority; HIGH | Capability client/coordinator tests, workflow client/coordinator suites, completed server tests; Owner/Staff/minimal permission/restricted/session-expiry checks |
| Multi-Tenant isolation | No workspace authority input; selection keys and disposal; safe failed reads | Mounted logout/other-workspace login and crafted-resource navigation acceptance not demonstrated by inspected prerender tests | Existing server authority + Presentation lifecycle; HIGH | Strict parser/authority omission and lifecycle tests; two QA workspaces, direct foreign IDs, no data flash or cached private state |
| Concurrency/conflict | Workspace pricing uses shared Product token and independent Reference Cost token; Branch slots use per-field override tokens; explicit refetch/review | Current integrated two-tab cross-tool scenario needs evidence; no new revision design | Catalog Branch Product Presentation; HIGH | `workspace-pricing.coordinator.test.ts`, `branch-pricing.coordinator.test.ts`, Listing/Branch coordinator tests; genuine 409, retained safe intent, explicit review, no replay |
| Error/recovery | Typed clients; malformed/network failures; expiry/denial distinct from empty; success/refetch failure tests | Actual focus and recovery during tool switch/refetch failure not established; no duplicate all-status unit suite | Owning Presentation coordinators/panels; MEDIUM | Client/coordinator tests cover 400/cursor/401/403/404/409/503/network; browser deliberate retry and unavailable states |
| Responsive/mobile | Shared CSS and bounded dialogs; existing slice reports record viewport PASS; navigation test asserts wrapping/44px minimums | Cross-tool P8 layout matrix at 320/480, tablet portrait/landscape, desktop/wide needs current evidence | Presentation/CSS; MEDIUM | `operations-presentation.test.ts`, panel tests; no core horizontal scrolling or clipped/focus-hidden action in QA |
| EN/AR + RTL | Shared locale/direction; owning i18n modules, bdi/technical direction; same component tree | Full composed locale-change/current status copy and technical identifiers need browser evidence | Presentation/i18n; MEDIUM | Bilingual panel/navigation tests; inspect labels, errors, review/source state, amounts/currency and user-entered names in both directions |
| Keyboard/accessibility/focus | Native dialogs and focus restoration hooks in pricing/Listing; Branch error-summary focus; labeled inputs/live/busy semantics | Static markup/hooks do not prove actual tab order, initial/restored focus, Escape or error-field navigation across unmount | Presentation components; MEDIUM/HIGH | Panel/prerender/Operations semantics tests; every workflow keyboard completion, mouse and touch; restore to a valid context after cancel/navigation |
| Loading/empty/error | Distinct no capability, no accessible Branch, no Product/Reservation, omission/inherit/NotConfigured, forbidden/unavailable states | Actual transitions and announcements across the combined interface need P8 evidence | Presentation; MEDIUM | Existing state/client/panel suites; loading/empty/retry/denied/conflict/success QA |
| Regression/integration boundaries | Per-workflow injected-fetch integration tests compose A1/A6/A2 with owning clients | No reviewed single mounted all-tool lifecycle acceptance test; avoid recreating every backend assertion | Presentation tests; HIGH for transition bugs | `operations-*.integration.test.ts`; add the smallest reproducer only when a distinct unproved interaction is observed |
| Production readiness/docs gate | Previous local/static/build and required PR checks PASS; current workflows already enforce final full unit/build/integration checks | P8-specific final results/report and approval do not yet exist | Existing tooling/docs; MEDIUM | Existing CI and report convention; final exact commit verification and manual signoff, no production deployment |

لم يثبت هذا التخطيط عيباً إنتاجياً جديداً. الفجوة الأساسية هي دليل قبول متكامل حديث لـP8، ولا يثبت الاختبار الثابت سلوك التركيز أو أجهزة الإدخال في المتصفح. تبقى المسؤولية في طبقة العرض ومالكي المجالات الحاليين؛ لا تنتقل قواعد الأعمال أو التفويض إلى React.

## 6. Deferred follow-ups / المتابعات المؤجلة

| Item | Origin | BlockingOrNonBlocking | BelongsToP8 | Reason |
| --- | --- | --- | --- | --- |
| Cosmetic UI ordering | P1.6 current notice; P2 final report | Non-blocking | NO in approved scope | Assigned to later UX refinement, not P8 |
| Generic Reservation success text after Release/Fulfill | P4 final report, non-blocking observations | Non-blocking | NO in approved scope | No P8 assignment; copy review may expose a functional ambiguity, but cosmetic replacement remains optional |
| Branch helper text persists after valid selection | P4/P5 observations; P7 final report §manual retest | Non-blocking | NO in approved scope | P7 expressly requests separately scoped follow-up and finds no requirement to hide it |
| Cross-tab reactivation waits for refetch | P5 final report §non-blocking follow-ups | Non-blocking | NO | No realtime freshness requirement; authoritative explicit refresh remains the contract |
| Stale source label/clear-selection wording after deactivation | Same P5 section | Non-blocking | NO as cosmetic repair | If current reproduction permits a forbidden fresh operation, that separate functional violation belongs to required security/lifecycle regression; old label observation alone does not |
| Staff Permissions persistence validation | P5 follow-up; merged Staff report/PR #53 | Former separate issue; resolved | NO; ALREADY_COMPLETE | Not Transfer/P8 implementation; use working permissions setup for role/scoping QA |
| Existing dependency advisories | P3 report; non-blocking audit steps in Quality workflow | Separate non-blocking follow-up | NO | No new dependency/update authorization; observe CI without expanding scope |
| Reservation candidate index/migration | Reservation performance report; Presentation contract §28 | Not needed | NO; OUT_OF_SCOPE | Existing index sufficient; no data/query requirement changed |

تظل هذه المتابعات منفصلة ولا تُضاف إلى P8 تلقائياً. إذا كشف التحقق الحالي انتهاكاً وظيفياً أو أمنياً محدداً، يُعالج ذلك الانتهاك وفق العقد بعد إعادة إنتاجه، دون تحويل الملاحظة الشكلية القديمة إلى إعادة تصميم.

## 7. Focused regression matrix / مصفوفة الانحدار المحددة

The P8Action column proposes execution after approval. No test or QA in this matrix was run during planning. Previous manual coverage comes from current closure notices, not intermediate historical pending sections.

| Flow | AutomatedCoverage | ManualCoverage already recorded | Gap / P8Action |
| --- | --- | --- | --- |
| Branch create/edit/activate/deactivate | Branch management client/coordinator/panel and foundation integration | P1 accepted | Integrated lifecycle→tool navigation; verify authoritative revision/refresh and genuine conflict without replay |
| Branch/Product discovery and selection | A6/A2 strict client/coordinator/context suites; foundation integration | P1 plus P2–P7 slice QA | Minimal-operation Staff without general Branch view; no fallback, no fresh inactive discovery; tool/Branch/search changes clear dependencies |
| Branch Product Listed/Unlisted | Listing client/coordinator/panel; Listing integration | P2 PASS | Recheck selection→write→refetch→tool switch and stale 409 under current baseline |
| Inventory six basic mutations | Inventory client/coordinator/panel; Inventory integration | P3 PASS | Readable, availability-only and mutation-only actors; no numeric leak; explicit review/idempotent retry; refetch after success |
| Reserve/Release/partial+final Fulfill | Reservation client/coordinator/panel; Reservation integration | P4 PASS | Cursor invalidation, finalized actions, real stale detail, known inactive inspection; preserve no hidden balance disclosure |
| Transfer | Transfer client/coordinator/panel and operations Transfer integration/workflow/context | P5 PASS after P5-R1 | Distinct scoped source/destination; exact reason intent, atomic request, stable ID only for identical uncertain retry, conditional two-side refresh |
| Workspace Retail/Wholesale | Workspace pricing client/coordinator/panel; pricing integration | P6 PASS after P6-R1 | Values independent but shared product revision; either write invalidates shared editor token and requires refetch |
| Workspace Reference Cost | Same owning suites; authorized optional-field tests | P6 PASS | Independent referenceCostRevision, configured zero vs absence, unauthorized field omission; never infer from price authority |
| Branch Retail/Wholesale overrides | Branch pricing client/coordinator/panel; Branch pricing integration/context | P7 PASS after browser fix | Independent override tokens; set/clear; base/override/effective/source coherence; selection must not unmount owning editor |
| Branch Reference Cost overrides | Same suites; absence revision zero and omission tests | P7 PASS | Exact field token/actions, clear→Workspace base, no hidden cost leakage, base-change recovery |
| Genuine 409/conflict recovery | Branch/Listing/Inventory/Reservation/pricing coordinator suites | P2–P7 documented cases | Two-tab stale writes; retained safe draft, discarded stale authority, authoritative refetch, explicit re-review and submit only |
| Owner / Staff / Branch Scope | Capability and discovery suites; existing owning Application/HTTP tests | Slice-specific scope/disclosure QA; Staff Permissions manual QA PASS | Current least-authority actor matrix, permitted/denied tools and resources; do not rerun permission editor implementation investigation |
| Tenant and session isolation | Strict reconstruction, query allow lists, current/stale 401, disposal tests; existing server scope tests | Session/logout clearing in slice reports | Two-workspace login/logout, restricted session, foreign IDs, delayed old requests; no cached private data or replay |
| Responsive / mobile / RTL | Panel static rendering/bounds and Operations CSS assertions | Prior slice mobile/tablet/desktop + RTL acceptance | Current integrated 320/480, tablet portrait/landscape, desktop/wide; EN/AR; no overflow, bidi confusion or hidden action |
| Keyboard/focus/touch/mouse | Semantic labels/live regions/dialog/focus hooks; prerender suites | Prior slice keyboard/focus/input coverage | Actual tool switches with modal open, Escape/cancel/restore, validation links, pending guard; each workflow completable by all three input methods |
| Build and final integration gate | Existing Quality + PostgreSQL Integration + Linux/Windows compatibility workflows | Not browser coverage | Apply established final gates only after approved changes; actual PR CI is separate from local evidence |

For economical manual execution, record rows with baseline/actor/workspace scope, locale, viewport, input method, operation and expected/observed outcome. Cover every workflow with keyboard, mouse and touch; spread locale/viewport representatives across the matrix and explicitly cover shared navigation/dialog/error patterns at every required size/direction. This distribution is a proposed QA method, not permission to skip a broken combination. Clarify signoff before implementation rather than silently declaring static tests equivalent to browser QA.

تنفذ المصفوفة بعد اعتماد الخطة. توثق كل حالة الفرع/العضو والنطاق واللغة والحجم وطريقة الإدخال والنتيجة المتوقعة والفعلية، مع تغطية التدفقات باللمس والفأرة واللوحة، وأنماط التنقل والحوارات والأخطاء بكل أحجام العرض والاتجاهين المطلوبة. لا يحل العرض الثابت محل تحقق المتصفح.

## 8. Proposed execution plan / خطة التنفيذ المقترحة

Two work packages are useful because integrated acceptance must determine actual defects before the closure gate can be assessed. These are proposed P8 boundaries, not new approved features or forced independent PRs.

| Field | P8.1 — Integrated acceptance and bounded hardening | P8.2 — Final verification and closure |
| --- | --- | --- |
| Goal | Demonstrate integrated contract behavior; reproduce and repair only blocking violations | Prove final acceptance and record exact results |
| Scope | Approved matrix; minimal navigation/i18n/responsive/focus/state/security Presentation corrections if evidence proves a gap | Affected regression/static/build checks; integrated manual signoff; bilingual completion/status evidence and authorized PR gate |
| Files/AreasLikelyTouched | Initially evidence only. If a defect exists: owning Operations workflow/context, selector/panel/coordinator/i18n and focused existing tests. Shared `PresentationShell`/`app/globals.css` only for a demonstrated common issue | Focused P8 final report; current roadmap/continuation/Presentation status after acceptance only. Existing tests/tooling consumed, no pipeline redesign |
| Layer | Presentation, respecting Workspace Branch composition and Identity/Catalog/Inventory ownership | Verification and documentation; no business layer change |
| Dependencies | Approved P8 plan/gate; current integration; P1–P7/Staff fix; safe least-permission/two-workspace QA fixtures and browser access | P8.1 no blocking gaps; final source frozen for checks |
| AutomatedTests | Existing affected suites first; add only the smallest failing behavioral reproducer for a novel issue. Do not duplicate existing invariant tests | Existing affected regressions, TypeScript, ESLint, build, Git checks. Full unit suite at final established gate; actual required PR CI before authorized merge |
| ManualQA | Section 7 matrix, including session/scope switching and real stale conflict recovery; existing tools only, no production fixtures | Verify repaired cases and integrated matrix against exact final commit; user signoff recorded separately from agent evidence |
| CompletionGate | Every proposed defect has evidence/root cause/owner; missing cases resolved or explicitly classified; no unauthorized feature scope | Proposed P8 gate in §3 approved and satisfied; document remaining non-blocking items separately; stop for review |
| Risk | HIGH for disclosure/session/selection regression; limit changed boundary and avoid optimistic authority | MEDIUM: stale evidence, unverified browser debt or mistaken gate PASS; do not claim closure early |

Implementation order follows dependencies: baseline/fixture and capability lifecycle → navigation/selection → owning resource flows/recovery → shared UX/input acceptance → final gates. If no defect is found, P8.1 may require only evidence and narrowly justified missing tests; do not manufacture source edits to make hardening look substantive. Any unexpected server/business-contract gap must stop the affected work for scope/architecture discussion.

تبدأ الخطة بالدليل والبيئة ثم التنقل والاختيار والتدفقات والتعافي وتجربة الإدخال، وتأتي بوابة الإغلاق أخيراً. إذا لم يثبت عيب فلا تُنشأ تعديلات شكلية لتبرير المهمة. أي فجوة تتطلب تغيير الخادم أو عقد الأعمال تستدعي التوقف للمناقشة قبل التوسيع.

## 9. Architecture check / فحص المعمارية

| Boundary | Expected change |
| --- | --- |
| DomainChangesExpected | NONE |
| ApplicationChangesExpected | NONE |
| InfrastructureChangesExpected | NONE |
| ApiContractChangesExpected | NONE; consume existing Domain-owned contracts |
| DatabaseChangesExpected | NONE |
| MigrationChangesExpected | NONE |
| PermissionSemanticChangesExpected | NONE |
| Multi-Tenant boundaries | UNCHANGED; trusted server context remains authoritative |
| ArchitectureChangesExpected | NONE |
| Dependencies | NO NEW DEPENDENCY; no E2E framework |
| ArchitectureDiscussionRequired | NO for the proposed scope |

If evidence instead requires changing a Domain invariant, service policy, repository/API contract, persistence, permission semantics, tenant boundary, or ownership, set ARCHITECTURE_DISCUSSION_REQUIRED: YES and stop that proposed expansion. Presentation hints never replace server authorization. Retail/Wholesale revision sharing, Reference Cost independence, Branch slot overrides, idempotency and session invalidation remain existing contracts.

لا تتطلب الخطة تغيير أي طبقة أعمال أو بنية أو عقد أو قاعدة أو ترحيل أو صلاحية أو حد مستأجر. إذا أثبتت الأدلة خلاف ذلك، يلزم إعلان الحاجة إلى مناقشة معمارية والتوقف قبل تصميم أو تنفيذ التغيير.

## 10. Quota-conscious workflow / سير عمل اقتصادي

**RecommendedModel: GPT-6.1 Sol. RecommendedThinkingLevel: Medium.** This is a task-specific recommendation for cross-file integration work with established architecture, not a repository requirement. Official OpenAI guidance describes GPT-6.1 Sol with medium effort as suited to complex technical work and coordinated deliverables; escalate to high only for a reproduced race/disclosure issue whose cause remains unresolved. Routine evidence transcription and exact doc updates can use a lighter available model; do not repeat the entire audit. Availability depends on the user's Codex environment. [Official model selection](https://developers.openai.com/api/docs/guides/model-selection), [reasoning effort](https://developers.openai.com/api/docs/guides/reasoning).

**SuggestedTaskOrder:** approve this plan/gate → establish safe current integration baseline/fixtures → P8.1 matrix and smallest proven repairs → P8.2 final verification/signoff/documentation → stop.

**SuggestedTestOrder:** owning failing reproducer if a defect exists → changed client/coordinator/panel/context tests → affected `operations-*.integration.test.ts` and shared lifecycle/navigation suites → relevant Application/HTTP security suites only when authority regression evidence warrants them → TypeScript/ESLint/build for source changes → final established full unit and actual CI gates. No tests/build run merely for this planning report.

**WhenToUseGraphify:** only if docs + direct source structure leave genuine ownership/dependency ambiguity. Then use scoped query/path/explain; no whole-graph report or update when code is unchanged.

**WhenFullSuiteIsJustified:** once at the approved final integration gate, because the current Quality workflow explicitly runs `npm test`, and the affected P7 completion convention also records it. Not after every wording change or matrix row. Actual PR CI includes guarded PostgreSQL Integration and compatibility; a Presentation-only repair does not independently justify repeated local database suites. Local PostgreSQL tests need an isolated guarded test database, never application/production data.

Keep bounded prompts with baseline, owning paths, exact failure and acceptance criteria. Reuse current fixtures, injected-fetch tests and browser APIs; do not add libraries. Batch independent reads; do not spawn parallel agents without authorization. Preserve existing review evidence and sanitize evidence only. Future implementation review bundles follow repository convention; this planning request permits exactly one report, so no new bundle or auxiliary file is generated now.

يوصى بـGPT-6.1 Sol مع مستوى تفكير متوسط للتكامل المحدد، ورفع المستوى فقط عند عيب سباق أو كشف بيانات يصعب تفسيره. تبدأ الاختبارات بالأضيق ثم المتأثر، وتؤجل المجموعة الكاملة إلى بوابة التكامل الحالية المطلوبة في CI. لا تُشغّل اختبارات أو بناء لهذا التقرير وحده، ولا تُضاف مكتبات أو وكلاء متوازون أو ملفات مساعدة دون تصريح.

## 11. Final return and task report / النتيجة وتقرير المهمة

- RequiredItems: integration/navigation, bilingual/RTL, responsive/mobile, accessibility/focus and all three input methods, existing security/disclosure/session/mutation contracts, focused final evidence.
- DeferredItems: §6, excluded unless explicitly approved separately.
- AlreadyCompleteItems: P1–P7/A1–A6 and corrections; Staff Permissions fix/QA.
- OutOfScopeItems: §4/§9 exclusions; no architecture or business expansion.
- UnclearItems: proposed P8 gate approval and future manual signoff/fixture access; optional UX scope is excluded.
- PlanningReportCreated: YES.
- PlanningReportPath: `docs/05-Development/Reports/QSC-Task-3.22-P8-Planning-Report.md`.
- Files Created: this report only, intentionally untracked pending review.
- Files Modified: NONE.
- Files Deleted: NONE.
- Architecture Changes: NONE.
- Summary: repository-defined P8 is integration hardening; no new production defect or architectural change established; no implementation started.
- Next Recommendation: review the proposed gate, bounded execution plan and QA coverage, then authorize implementation separately if accepted. Stop here.
- SerenaProjectYmlPreserved: YES. SerenaProjectYmlStaged: NO.
- P8ImplementationStarted: NO. READY_FOR_P8_REVIEW: YES.
- BlockingIssues: NONE for planning. Implementation is intentionally approval-gated; browser/fixtures/signoff must be available before claiming integrated acceptance.

أُنشئ التقرير وحده دون تعديل أو حذف أي ملف آخر، ودون إدراج أو التزام أو دفع أو طلب سحب أو دمج. حُفظ ملف Serena محلياً وغير مدرج. التخطيط جاهز للمراجعة، والتنفيذ لم يبدأ. التوصية هي مراجعة البوابة والخطة ثم إصدار تصريح تنفيذ مستقل إذا اعتُمدت.
