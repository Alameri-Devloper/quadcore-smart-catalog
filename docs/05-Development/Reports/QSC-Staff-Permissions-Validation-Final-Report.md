# Staff Permissions Validation — Final Report / التقرير النهائي للتحقق من صلاحيات الموظف

## RootCause / السبب الجذري

The PostgreSQL member-administration read repository used raw SQL to read `authorization_version` (bigint). node-postgres returned the value as string `"1"`; the TypeScript annotation declared number but did not convert the runtime value. Details mapped it unchanged into `authorizationRevision`. The Permissions-specific save therefore serialized `expectedAuthorizationRevision: "1"`. The write route correctly rejected that field with HTTP 400 `InvalidRequest`, because it requires a positive safe integer. Presentation then mapped HTTP validation failure to the Arabic message below.

أعاد استعلام SQL الخام قيمة bigint كنص `"1"`، رغم تعريفها في TypeScript كرقم. انتقلت القيمة دون تحويل إلى بيانات التفاصيل ثم إلى طلب حفظ الصلاحيات. رفض مسار الخادم الحقل لأنه يتطلب رقماً صحيحاً موجباً آمناً، وأظهرت الواجهة رسالة التحقق العامة. المشكلة في تحويل نوع البيانات عند القراءة، وليست في دورة حياة إصدار التفويض.

The reported absence of transport was not reproduced. Direct evidence in the running server's redirected log showed repeated Permissions PATCH 400 responses for `d2a14f53-3313-4031-aaa3-2b23cc50ffe6`, while profile PATCH returned 204. The current form has a Review Changes step that makes no request, followed by Save Permissions that invokes the API without a client validator. An unchanged VS Code terminal alone did not establish that no request reached this server. Browser automation surfaces were unavailable; no browser cookie or session value was accessed.

لم يُعد إنتاج فرضية توقف الطلب داخل تحقق الواجهة. سجل الخادم الجاري أثبت وجود طلبات PATCH للصلاحيات برمز 400، ونجاح حفظ الملف الشخصي برمز 204. خطوة مراجعة التغييرات لا ترسل طلباً، أما الحفظ التالي فيستدعي العميل مباشرة. لم تتوفر أتمتة المتصفح، ولم تُقرأ الجلسات أو ملفات تعريف ارتباطه.

## Checkpoint / نقطة التحقق

- Branch: `fix/member-authorization-revision-lifecycle`.
- Initial HEAD: `e5234b70e5d6506efc5245b84213d453d0ad5bb3`.
- Initial status: unstaged pre-existing `.serena/project.yml`; two untracked prior diagnosis reports; empty index.
- Serena hash before and after: `3EFC30BE05FDF94FBFC3D9BDD3E4FE7FB122D465903CA2F89027B509B4ECB998`.
- Serena was not modified, restored, staged, or committed. The prior reports were preserved and excluded from the commit.

حُفظت جميع أعمال المستخدم السابقة، ولم يُدرج ملف Serena أو التقارير السابقة في الالتزام.

## Permission contract / عقد الصلاحية

DisplayLabel: عرض الفروع / View branches.

PermissionKey: `workspace.branches.view`.

PermissionCategory: Workspace.

PermissionAssignableToStaff / StaffAssignable: YES.

DependenciesOrConstraints: No dependent permission or Branch Scope condition in the current registry/validator. Staff codes must be unique, registered, and Staff-assignable. Owner permissions are registry-derived; the Owner Details section has no Permissions edit form. The server remains authoritative.

الصلاحية قابلة للإسناد إلى الموظف دون صلاحية أخرى أو شرط نطاق فروع. تبقى شروط صحة المعرّف وعدم التكرار وقابلية الإسناد نافذة، وتبقى صلاحيات المالك مشتقة من السجل والتفويض تحت سلطة الخادم.

## Before-fix reproduction / إعادة الإنتاج قبل الإصلاح

The regression harness runs the actual current page load, mutation, Permissions submit, and PermissionSelector toggle callback bodies. React state is controlled; an actual API client talks to actual HTTP handlers. A repository database port supplies raw bigint string values, matching the read-only local trace. The mutation application port is controlled and delegates permission validation to the real registry validator; existing Application/HTTP tests independently cover authorization, concurrency, and workspace isolation. This is not a full DOM, browser, or live database mutation test.

DraftBeforeChange (focused fixture): `["catalog.products.view"]`.

DraftAfterChange: `["catalog.products.view", "workspace.branches.view"]`.

The local read-only trace found 14 committed permissions on the observed Staff actor; adding View branches preserves those codes and adds only `workspace.branches.view`. None of the existing codes requires another permission in the validator.

ValidationResult: Before fix, legitimate add failed with HTTP 400 `InvalidRequest`; the mutation use case was not reached. Two expected-success regression cases failed before the mapper fix. After fix, the same cases pass.

ValidationErrorField: `expectedAuthorizationRevision`.

ValidationErrorMessage: Route code `InvalidRequest`; UI `راجع الحقول الموضحة ثم حاول مرة أخرى.` No field-specific highlighting is supplied for this server response.

PermissionsApiInvokedBeforeFix: YES (contrary to the initial no-transport hypothesis).

PermissionsApiInvokedAfterFix: YES.

تنفذ الاختبارات أجسام معالجات الصفحة ومحدد الصلاحيات الفعلية، مع التحكم في حالة React وحدود قاعدة البيانات والتطبيق. ثبت فشل الإضافة الصحيحة قبل الإصلاح بسبب نوع الحقل، ونجاحها بعده. لا يُدّعى تنفيذ اختبار متصفح كامل أو تعديل قاعدة البيانات الحية.

## SolutionChosen / الحل المختار

Convert the raw read result using `Number(row.authorizationVersion)` at the owning repository mapper, and declare the raw field as `string | number`. The existing database constraint limits the bigint to positive safe integers. Only the authorization token mapping changed. Genuine validation, revision comparison/incrementing, session invalidation, permission semantics, and workspace scoping were preserved.

WhyThisSolution: The invalid type originates at persistence decoding. Correcting that boundary restores the existing numeric DTO contract without React coercion, client-side revision calculation, or weakened write validation. No Presentation production code change was warranted. This is direct type evidence and does not reopen the prior revision lifecycle hypothesis.

الحل هو تحويل القيمة الخام إلى رقم في مستودع القراءة وتوصيف نوعها الخام بدقة. يضمن قيد قاعدة البيانات أن القيمة ضمن مجال الأعداد الصحيحة الآمنة. لم تتغير آلية حساب الإصدار أو مقارنة التزامن أو إبطال الجلسات أو عزل مساحة العمل، ولم تُضف معالجة التفاف في React.

## Files Modified / الملفات المعدلة

- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`: narrow raw authorization-version type and conversion in member-administration read mapper.

## Files Created / الملفات المنشأة

- `domains/identity/presentation/staff-permissions-submit.test.ts`: four focused handler/contract regression tests.
- `docs/05-Development/Reports/QSC-Staff-Permissions-Validation-Final-Report.md`: this bilingual report, approved for a documentation-only closure commit after successful user manual QA.
- Ignored diagnostic/evidence and review bundle files under `artifacts/task-reviews/`; exported report, ZIP, and checksum under `QSC-Reviews/`.

## Files Deleted / الملفات المحذوفة

No project source or prior review evidence deleted. Next's normal production build regenerated ignored `.next` artifacts and cleared temporary diagnostic files there. Temporary final evidence is stored outside `.next`.

لم تُحذف مصادر المشروع أو أدلة المراجعات السابقة. أعاد البناء إنشاء الملفات المتجاهلة داخل `.next`، ولذلك حُفظت الأدلة النهائية خارج هذا المجلد.

## Architecture Changes / تغييرات المعمارية

NONE. Repository decoding owns persistence representation; Presentation still uses the API client; trusted server context, Staff explicit permissions, Owner registry authority, and tenant isolation remain intact. No dependencies added.

لا توجد تغييرات معمارية أو مكتبات جديدة. بقي تحويل تمثيل البيانات في المستودع، وبقيت الواجهة والتفويض وعزل المستأجرين ضمن حدودها الحالية.

## Verification / التحقق

| Requested field | Result |
| --- | --- |
| ValidPermissionAddTest | PASS: actual toggle + review/save callbacks invoke PATCH; HTTP 200 |
| ValidPermissionRemoveTest | PASS: same toggle removes View branches; PATCH 200 |
| CommittedPermissionStateTest | PASS: successful refetch adopts exact committed set |
| InvalidPermissionValidationTest | PASS: duplicate, unknown, and Owner-only codes remain HTTP 400 InvalidPermissionCode; committed set unchanged |
| BranchScopeIndependenceTest | PASS: invalid SelectedBranches draft does not block valid Permissions; scope validator still rejects that draft |
| OwnerRegressionTest | PASS: Owner draft initialization/Presentation guard unchanged; existing Application tests cover registry-derived authority |
| TargetedTests | PASS: 37 tests across new handler regression, Identity Presentation, member HTTP, and member Application tests |
| TypeScript | PASS: `npx.cmd tsc --noEmit` |
| ESLint | PASS: `npm.cmd run lint` |
| Build | PASS: `npm.cmd run build` |
| GitDiffCheck | PASS |
| GitCachedDiffCheck | PASS before commit; empty index after commit |

A build logging attempt inside `.next` failed with EBUSY because Next tried to clear its open log. Retrying with a log under ignored artifacts passed. This was a diagnostic logging issue, not a source/build defect. The local post-fix read-only repository trace returned authorizationVersion `1` of type number. No live permissions were changed by the agent. The user subsequently completed and confirmed the manual browser QA below; specific input-device and viewport coverage was not separately reported.

نجحت الاختبارات والفحوص المطلوبة. فشلت محاولة تسجيل البناء داخل `.next` بسبب قفل ملف السجل ثم نجحت بعد نقله إلى مجلد الأدلة. أثبت فحص القراءة المحلي بعد الإصلاح أن نوع الإصدار أصبح رقماً. لم يُعدل الوكيل صلاحيات حية. أكمل المستخدم لاحقاً التحقق اليدوي الموضح أدناه؛ لم يقدم تفاصيل منفصلة عن أجهزة الإدخال أو أحجام العرض.

## Confirmed manual browser QA / التحقق اليدوي المؤكد في المتصفح

Evidence source: the user's closure request, with an Admin/Owner editing an existing Staff member. These results were reported by the user, not independently rerun by the agent.

| Check | Result |
| --- | --- |
| PermissionAddManualQA | PASS: View branches saves successfully, shows success feedback, and remains enabled after refresh/reopening |
| PermissionRemoveManualQA | PASS: View branches saves successfully and remains disabled after refresh/reopening |
| ConsecutiveSaveManualQA | PASS |
| BranchScopeToPermissionsManualQA | PASS: Branch Scope save followed by Permissions save succeeds without a page refresh |
| SharedAuthorizationRevisionManualQA | PASS: no false 409 observed |
| PermissionsManualQA | PASS |

مصدر الدليل هو طلب الإغلاق من المستخدم بعد اختبار مسؤول/مالك يعدل موظفاً موجوداً. نجحت إضافة «عرض الفروع» وحذفها وبقيت الحالة بعد إعادة التحميل وإعادة فتح العضو. نجحت عمليات الحفظ المتتابعة وحفظ نطاق الفروع ثم الصلاحيات دون إعادة تحميل الصفحة، ولم يظهر تعارض 409 غير صحيح. هذه نتائج أكدها المستخدم ولم يُعد الوكيل تنفيذها مستقلاً.

RootCauseConfirmed: YES. No architecture change or authorization weakening. P8 not started; P7 unchanged.

MemberDetails404ReportDisposition: KEPT_SEPARATE. The prior report documents stale local Next routing, a distinct cause from this persisted-token type defect. It remains untracked and excluded from this closure commit and PR. The prior Staff authorization lifecycle diagnosis report is likewise preserved and excluded.

تم تأكيد السبب دون تغيير المعمارية أو إضعاف التفويض. لم تبدأ P8 ولم تتغير P7. بقي تقرير 404 منفصلاً وغير مدرج لأنه يشرح سبباً مختلفاً، وكذلك حُفظ تقرير دورة حياة التفويض السابق خارج هذا الإغلاق.

## Summary / الملخص

CommitCreated: YES.

CommitHash: `01d5e8db152faf36952a1ffc05ebd86cd8f250d4`.

CommitMessage: `fix(identity): allow valid staff permission edits`.

The source fix commit contains only the repository fix and regression test. Closure adds this focused report in a separate documentation-only commit. Publication and merge are gated on actual PR CI and reported in the closure evidence.

SerenaProjectYmlPreserved: YES. SerenaProjectYmlStaged: NO.

READY_FOR_PERMISSION_MANUAL_QA: YES. PermissionsManualQA: PASS (user-confirmed).

P8Started: NO. P7 unchanged.

BlockingIssues: NONE for the validated fix. Actual required PR CI remains the publication/merge gate; local verification does not substitute for it.

يحتوي التزام الإصلاح على الشيفرة والاختبار فقط، ويضاف التقرير في التزام توثيق مستقل. نجح التحقق اليدوي المؤكد من المستخدم. ملف Serena محفوظ وغير مدرج، ولم تبدأ P8 ولم تتغير P7. يظل الدمج مشروطاً بنجاح فحوص طلب السحب الفعلية.

## Next Recommendation / التوصية التالية

Complete the authorized PR closure only after required PR CI passes, then stop for review. Do not start another task.

أكمل إغلاق طلب السحب المصرح به بعد نجاح الفحوص المطلوبة فقط، ثم توقف للمراجعة دون بدء مهمة أخرى.
