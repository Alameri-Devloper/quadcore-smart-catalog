# Task 3.14.8-R5 — Staging Durability, Typed Storage Outcomes, and Cleanup Contract Final Report

## Summary | الملخص

R5 preserves the accepted Task 3.14.8/R1/R2/R3/R4 Domain-Driven Design, Clean Architecture, Workspace-scoped multi-tenant persistence, canonical `catalog_product_images` ownership, partial success, fixed 14-day Staging retention, manual retry/reconciliation, Trash semantics, and Product-publication independence. It closes the independent R4 review findings without changing UI, Product Entry, dependencies, or Task 3.14.9. | يحافظ R5 على تصميم المجال والمعمارية النظيفة ونطاق مساحة العمل وملكية جدول الصور المعتمد والنجاح الجزئي والاحتفاظ الثابت لمدة 14 يوماً والإعادة والمصالحة اليدويتين ودلالات السلة واستقلال نشر المنتج، ويغلق ملاحظات مراجعة R4 دون تغيير الواجهة أو إدخال المنتج أو الاعتمادات أو المهمة 3.14.9.

The implementation adds one canonical operation-ID policy, a focused optimistic Staged transition, conflict/reload/compatibility handling after filesystem Stage, exact owned-file cleanup with durable terminal classification, one shared initial/retry storage-failure policy, typed Stage cleanup ambiguity, immediate InProgress cancellation rejection, and deterministic operation-scoped cleanup outcomes. | يضيف التنفيذ سياسة موحدة لمعرّف العملية وانتقالاً تفاؤلياً مخصصاً لحالة التجهيز ومعالجة التعارض وإعادة التحميل بعد أثر الملفات وتنظيف الملف المملوك مع تصنيف نهائي دائم وسياسة واحدة لفشل التخزين الأولي وإعادة المحاولة وغموضاً نمطياً لتنظيف التجهيز ورفضاً فورياً لإلغاء العملية الجارية ونتائج تنظيف حتمية على مستوى العملية.

## Files Created | الملفات المنشأة

- `domains/catalog/media/domain/product-media-operation-id.ts`: canonical `ProductMediaOperationId` value object used by command validation, typed storage keys, and persisted rehydration. | كائن قيمة موحد لمعرّف عملية الوسائط.

All other untracked Task 3.14.8/R1/R2/R3/R4 source, migration, documentation, task, and review files were preserved from the current working tree. | حُفظت جميع ملفات المهمة السابقة غير المتتبعة في شجرة العمل الحالية.

## Files Modified | الملفات المعدلة

- `domains/catalog/media/domain/product-media-keys.ts`
- `domains/catalog/media/domain/product-media-foundation.test.ts`
- `domains/catalog/media/repositories/product-media-workflow.repository.ts`
- `domains/catalog/infrastructure/persistence/postgresql-product-media-workflow.repository.ts`
- `domains/catalog/infrastructure/persistence/postgresql-product-media-workflow.repository.integration.test.ts`
- `domains/catalog/media/ports/product-media-storage.port.ts`
- `domains/catalog/media/infrastructure/local-product-media-storage.adapter.ts`
- `domains/catalog/media/infrastructure/product-media-adapters.test.ts`
- `domains/catalog/media/services/product-media-workflow.ts`
- `domains/catalog/media/services/product-media-workflow.test.ts`
- `docs/05-Development/Product-Media-Workflow-Orchestration.md`
- `docs/05-Development/Reports/Task-3.14.8-Product-Media-Workflow-Orchestration-Final-Report.md`

These modifications implement and document R5 only; pre-existing current-tree changes in Product persistence, schema, Drizzle metadata/migrations, and `package.json` were not reset or repurposed. | تنفذ هذه التعديلات R5 وتوثقه فقط، ولم تُعد أو تُستخدم تغييرات شجرة العمل السابقة في حفظ المنتج والمخطط وملفات Drizzle وملف الحزم.

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Architecture Changes | تغييرات البنية

No architecture redesign or dependency change was made. The new `ProductMediaOperationId` is a domain value object. Staged persistence remains behind the application repository port and is implemented by the PostgreSQL infrastructure adapter. The application service still owns orchestration and storage-outcome policy; filesystem details remain inside the local storage adapter. `catalog_product_images` remains the only canonical Product Media projection. | لم يُجر أي تغيير معماري أو تغيير في الاعتمادات. معرّف العملية الجديد كائن قيمة في المجال، ويبقى حفظ التجهيز خلف منفذ المستودع ويطبقه محول PostgreSQL، وتبقى سياسة التنسيق والنتائج في خدمة التطبيق وتفاصيل الملفات في محول التخزين، ويظل جدول الصور المصدر المعتمد الوحيد.

## Canonical Operation Identity | هوية العملية الموحدة

`ProductMediaOperationId` accepts 1–80 lowercase ASCII characters, must start with `[a-z0-9]`, permits only `[a-z0-9._-]` afterward, and rejects trailing dots, Windows device names, and `_staging`, `_trash`, and `_variants`. Execute, Retry, and Cancel validate before repository or storage access; Staging/Trash key factories reuse the value object; PostgreSQL rehydration rejects non-canonical stored identities. | يقبل المعرّف من محرف واحد إلى 80 محرفاً صغيراً ويبدأ بحرف أو رقم ويرفض النقطة النهائية وأسماء أجهزة Windows ومساحات الأسماء المحجوزة. تتحقق أوامر التنفيذ والإعادة والإلغاء قبل الوصول إلى المستودع أو التخزين، وتستخدم مصانع المفاتيح السياسة نفسها، وترفض إعادة بناء PostgreSQL القيم غير الموحدة.

## Durable Staging Transition | انتقال التجهيز الدائم

The repository port now exposes one Workspace-scoped optimistic `transitionOperationToStaged`. Its PostgreSQL transaction permits only `Pending`, atomically writes status, staging key, SHA-256, byte length, dimensions, immutable expiry, `retryAllowed=true`, `requiresNewSource=false`, and Workflow status/version, and returns `Transitioned`, `Conflict`, or `NotFound`. It does not read, delete, insert, or update canonical Media rows or Media revision. Provider exceptions are sanitized. | يضيف منفذ المستودع انتقالاً تفاؤلياً واحداً ومقيداً بمساحة العمل من `Pending` إلى `Staged`. تسجل معاملة PostgreSQL جميع بيانات التجهيز والانتهاء وسياسة الإعادة وإصدار الدورة ذرياً، وتعيد نتائج نمطية، ولا تقرأ أو تغير صفوف الوسائط المعتمدة أو مراجعتها، وتُنقّى أخطاء المزود.

After filesystem Stage succeeds, the application attempts that focused transition. A conflict reloads the exact Workspace Workflow once; exact matching Staged metadata is accepted, while a still-Pending operation receives one transition retry using the reloaded version. The image is never staged twice. If durable Staged truth cannot be established, the exact operation-owned key is discarded. Confirmed discard or confirmed absence establishes non-retryable `SourceUnavailable` requiring a new source; ambiguous discard establishes non-retryable `ReconciliationRequired`. | بعد نجاح التجهيز في نظام الملفات تحاول الخدمة الانتقال المخصص. عند التعارض تعاد قراءة الدورة مرة واحدة وتقبل بيانات التجهيز المتطابقة أو تعاد محاولة الانتقال مرة واحدة إذا بقيت العملية معلقة، ولا يعاد تجهيز الصورة. وإذا تعذر إثبات الحالة الدائمة يُحذف مفتاح العملية المحدد؛ ويثبت الحذف أو الغياب المؤكد حالة المصدر غير المتاح، بينما يثبت الغموض حالة المصالحة المطلوبة.

## Typed Storage Outcomes | نتائج التخزين النمطية

Initial and Retry publication call one classification policy. `TemporaryObjectMissing` for Add/Replace becomes `SourceUnavailable` with no retry and a new source required. Canonical `FinalObjectMissing` for Replace/Remove, `TrashConflict`, allocated-final `TargetConflict`, `ReplacementRestorationFailed`, unsafe keys, and partial-operation ambiguity become `ReconciliationRequired`. Other failures are retryable only when explicitly classified as safe. The same storage code therefore cannot drift between initial execution and retry. | يستخدم النشر الأولي وإعادة المحاولة سياسة تصنيف واحدة. يصبح غياب المصدر المؤقت للإضافة أو الاستبدال مصدراً غير متاح، بينما يتطلب غياب الملف النهائي المعتمد أو تعارض السلة أو الهدف أو فشل الاستعادة أو المفتاح غير الآمن أو العملية الجزئية المصالحة. ولا يسمح بالإعادة إلا عند إثبات الأمان صراحةً، لذلك لا يختلف تصنيف الرمز نفسه بين المسارين.

`ProductMediaStoragePartialOperationError` now includes `stage`. The adapter injects Staging open/read/unlink operations for deterministic fault tests and never suppresses failure to unlink an operation-owned partial Staging file. | يشمل خطأ العملية الجزئية الآن مرحلة التجهيز، ويتيح المحول حقن عمليات الفتح والقراءة والحذف للاختبارات الحتمية ولا يخفي فشل حذف الملف الجزئي المملوك.

## Cancellation and Cleanup Contract | عقد الإلغاء والتنظيف

Cancel rejects `InProgress` with `ProductMediaOperationAlreadyInProgress` before any root lookup, storage call, or repository mutation. Existing idempotent terminal behavior and exact owned-key cleanup remain intact. | يرفض الإلغاء العملية الجارية قبل قراءة الجذر أو استدعاء التخزين أو تعديل المستودع، مع بقاء السلوك التكراري والتنظيف المحدد.

Cleanup returns `scannedCount`, `cleanedCount`, `reconciliationRequiredCount`, `skippedCount`, and ordered operation-scoped `outcomes` of `SourceUnavailableEstablished`, `CompatibleConcurrentTruth`, `ReconciliationRequired`, or `Skipped`. `scannedCount` equals the number of emitted outcomes for all operations in Workspace-owned candidate workflows, including ineligible siblings. Reconciliation and skipped counts equal outcomes of those respective types; `cleanedCount` increases only for durable `SourceUnavailable`. Foreign Workspace workflows are removed before counting or output, and outcomes expose only Workspace/workflow/operation identities plus stable reason/status codes. | يعيد التنظيف العدادات المطلوبة ونتائج مرتبة لكل عملية. يساوي عدد الفحص عدد النتائج الصادرة لكل عمليات الدورات المرشحة المملوكة لمساحة العمل، ويساوي عدادا المصالحة والتخطي عدد نتيجتيهما، ولا يزيد عدد التنظيف إلا عند ثبوت المصدر غير المتاح. وتستبعد المساحات الأخرى قبل العد أو الإخراج، ولا تظهر النتائج إلا الهويات والرموز الثابتة.

## Verification | التحقق

- TypeScript (`npx.cmd tsc --noEmit`): Passed.
- Integration TypeScript and PostgreSQL integration (`npm.cmd run test:integration`): 47/47 passed across 9 suites on the isolated guarded test database.
- Product Media focused suite: 95 total; 94 passed and 1 existing platform-permission skip.
- Complete unit command (`npm.cmd test`): Passed — 106 Product/domain tests, 45 review-tool tests, and 95 Product Media tests (94 passed, 1 existing platform-permission skip).
- ESLint (`npm.cmd run lint`): Passed.
- Production build (`npm.cmd run build`): Passed.
- Drizzle (`npm.cmd run db:check`): Passed.
- Guarded database identity: `DATABASE_URL` and `TEST_DATABASE_URL` were present and resolved to distinct normalized identities; no credential value was printed or persisted.
- R5 deterministic evidence covers Staging conflict/reload, compatible truth, one transition retry, discard success/absence/ambiguity, typed Stage cleanup ambiguity, canonical Media preservation, initial/retry typed storage outcomes, immediate InProgress cancellation, all cleanup counts/outcomes, and Workspace isolation without timing sleeps.
- Git integrity preflight: unstaged `git diff --check`, staged `git diff --cached --check`, and untracked review integrity all passed; 24 untracked text files were checked and 1 binary file was safely skipped by the text-only whitespace scan.
- Desktop `C:\Users\dell\Desktop\QSC-Reviews` exporter writability: passed the invocation-owned create/read/link/delete probe.

## Audit Results | نتائج التدقيق

- Runtime audit (`npm.cmd audit --omit=dev`): completed with exit code 1 and 3 high-severity vulnerabilities.
- Full audit (`npm.cmd audit`): completed with exit code 1 and 8 vulnerabilities — 4 moderate and 4 high.

These are the actual R5 pre-bundle results and match the audit evidence expected from the exporter rerun. Findings are non-blocking within the approved review policy. No `npm audit fix`, forced fix, dependency installation, `package.json` change, or `package-lock.json` change was made by R5. | هذه هي نتائج تدقيق R5 الفعلية السابقة للحزمة، وهي غير حاجبة ضمن سياسة المراجعة المعتمدة. لم ينفذ R5 أي إصلاح أو تثبيت أو تغيير في ملف الحزم أو القفل.

## Remaining Risks | المخاطر المتبقية

V1 still has no distributed transaction between PostgreSQL and the local filesystem. If PostgreSQL remains unavailable after a filesystem effect, the application can report reconciliation truthfully but cannot guarantee that a terminal transition was durably stored. Manual retry, cleanup invocation, and reconciliation remain operational actions; stale historical `InProgress` records still require manual reconciliation. The 3-high runtime and 8-total full dependency audit findings remain unresolved and out of this no-dependency-change scope. | لا توجد معاملة موزعة بين PostgreSQL ونظام الملفات المحلي؛ فإذا استمر تعطل القاعدة بعد أثر الملفات يمكن الإبلاغ عن المصالحة بصدق دون ضمان حفظ الانتقال النهائي. وتبقى الإعادة والتنظيف والمصالحة إجراءات تشغيلية، وتتطلب السجلات التاريخية العالقة معالجة يدوية، وتبقى نتائج تدقيق الاعتمادات دون إصلاح لأنها خارج نطاق عدم تغيير الاعتمادات.

## Status | الحالة

Final report status: `ReadyForReview`. R5 implementation, implementation verification, Git integrity preflight, database guard, audit permission, and Desktop writability preflight are complete. Exactly one authorized `3.14.8-R5` review-bundle invocation remains. The generated `manifest.json` is authoritative for publication and must agree with this report by recording `overallStatus: ReadyForReview` and `gitIntegrity.passed: true`. | حالة التقرير النهائي هي `ReadyForReview`. اكتمل تنفيذ R5 والتحقق وسلامة Git وحماية قاعدة البيانات وتصريح التدقيق وفحص قابلية كتابة سطح المكتب، ولم يبق إلا استدعاء واحد مصرح به لحزمة المراجعة. يجب أن يتفق البيان المنشأ مع هذا التقرير ويسجل الجاهزية للمراجعة وسلامة Git الناجحة.

## Next Recommendation | التوصية التالية

Generate and independently verify exactly one R5 review bundle, then stop for review. Do not stage, commit, push, merge, modify UI, implement Product Entry, or begin Task 3.14.9. | أنشئ حزمة مراجعة R5 واحدة وتحقق منها بصورة مستقلة، ثم توقف للمراجعة دون إضافة أو التزام أو دفع أو دمج أو تعديل للواجهة أو تنفيذ إدخال المنتج أو بدء المهمة 3.14.9.
