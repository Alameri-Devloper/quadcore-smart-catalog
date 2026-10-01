# QSC Task 3.21 R3 — Browser FetchPort Invocation Correction

## English

### Root Cause

`CatalogReferenceDataManagementClient.request()` invoked the injected/default browser FetchPort as `this.fetcher(...)`. That member-call form supplied the client instance as the function receiver. In the affected browser runtime, native `fetch` is receiver-sensitive and synchronously threw `TypeError: Illegal invocation` before an HTTP request could be dispatched.

The existing fail-closed `catch` correctly normalized the synchronous exception to `Unavailable`. This explains the complete live symptom set: the React effect mounted and left Loading, the coordinator received an unavailable result, no Fetch/XHR Network entry existed, and no uncaught Console error appeared.

### Correction

The request method now copies the port to a local variable and invokes that variable. The call therefore uses an `undefined` receiver, matching the established newer Operations-client pattern. Request path, credentials, headers, body, `AbortSignal`, response parsing, and fail-closed behavior are unchanged.

### Regression Added

The focused client regression uses a browser-like receiver-sensitive FetchPort. It records invocation, throws `TypeError: Illegal invocation` when called with any receiver, verifies the exact management URL and `AbortSignal`, and requires a successful reconstructed result. The regression failed before the correction and passes after it.

### Test Results

- Pre-fix focused reproduction: 33 passed, 1 failed as expected.
- Post-fix focused Task 3.21 client/coordinator tests: 34 passed, 0 failed.
- `npm run test:reference-data`: 74 passed, 0 failed.
- TypeScript `tsc --noEmit --pretty false`: passed.
- ESLint for the two touched Presentation files: passed.
- Serena diagnostics for the two touched Presentation files: no diagnostics.
- `graphify update .`: passed; graph updated to 11,146 nodes and 23,082 edges.

### Files Created

- `docs/05-Development/Reports/QSC-Task-3.21-R3-Final-Report.md`

### Files Modified

- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.test.ts`

### Files Deleted

None.

### Architecture Changes

None. The correction is Presentation-only. Domain, Application, HTTP/API contracts, database, schema, migrations, permissions, dependencies, coordinator behavior, React lifecycle behavior, and P6 pricing implementation are unchanged. No fallback or mock data was added.

### Summary

The shared Task 3.21 management read now reaches browser `fetch` without an accidental client receiver. The strict response parser and all safe failure normalization remain intact. `.serena/project.yml` was preserved at its task-start content hash and was not edited, staged, discarded, or normalized.

### Next Recommendation

Review the standalone Task 3.21 Presentation diff and confirm the management endpoint appears in the browser Network panel after reload. Do not combine this correction with the existing P6 commit.

## العربية

### السبب الجذري

كانت الدالة `CatalogReferenceDataManagementClient.request()` تستدعي منفذ FetchPort المحقون أو الافتراضي بصيغة `this.fetcher(...)`. هذه الصيغة تمرر كائن العميل كمستقبِل للدالة. في بيئة المتصفح المتأثرة، تعتمد دالة `fetch` الأصلية على المستقبِل، ولذلك كانت ترمي الخطأ المتزامن `TypeError: Illegal invocation` قبل إرسال أي طلب HTTP.

حوّلت كتلة `catch` الحالية الخطأ بصورة آمنة إلى `Unavailable`. وهذا يفسر الأعراض الحية كاملة: بدأ تأثير React وغادر حالة التحميل، واستلم المنسق نتيجة عدم الإتاحة، ولم يظهر طلب Fetch/XHR في Network، ولم يظهر خطأ غير معالج في Console.

### التصحيح

تنسخ دالة الطلب الآن منفذ FetchPort إلى متغير محلي ثم تستدعيه من دون مستقبِل. يطابق ذلك النمط المعتمد في عملاء Operations الأحدث. لم تتغير المسارات أو بيانات الاعتماد أو الترويسات أو جسم الطلب أو `AbortSignal` أو تحليل الاستجابة أو السلوك المغلق عند الفشل.

### اختبار الانحدار

أضيف اختبار عميل مركز يستخدم FetchPort شبيهًا بسلوك المتصفح وحساسًا للمستقبِل. يسجل الاختبار الاستدعاء، ويرمي `TypeError: Illegal invocation` عند وجود أي مستقبِل، ويتحقق من رابط الإدارة وإشارة الإلغاء، ويتطلب نتيجة ناجحة بعد إعادة بناء الاستجابة. فشل الاختبار قبل التصحيح ونجح بعده.

### نتائج الاختبارات

- إعادة الإنتاج المركزة قبل التصحيح: نجح 33 وفشل 1 كما هو متوقع.
- اختبارات عميل ومنسق Task 3.21 بعد التصحيح: نجح 34 ولم يفشل أي اختبار.
- `npm run test:reference-data`: نجح 74 ولم يفشل أي اختبار.
- فحص TypeScript: ناجح.
- ESLint للملفين المعدلين فقط: ناجح.
- تشخيص Serena للملفين المعدلين: لا توجد أخطاء.
- `graphify update .`: ناجح.

### الملفات المنشأة

- `docs/05-Development/Reports/QSC-Task-3.21-R3-Final-Report.md`

### الملفات المعدلة

- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.ts`
- `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.test.ts`

### الملفات المحذوفة

لا توجد.

### تغييرات المعمارية

لا توجد. التصحيح محصور في طبقة العرض. لم تتغير طبقات Domain أو Application أو عقود HTTP/API أو قاعدة البيانات أو المخطط أو الترحيلات أو الصلاحيات أو الاعتماديات أو سلوك المنسق أو دورة حياة React أو تنفيذ تسعير P6. ولم تُضف بيانات بديلة أو وهمية.

### الملخص

يصل طلب إدارة Task 3.21 المشترك الآن إلى `fetch` في المتصفح من دون تمرير كائن العميل كمستقبِل بصورة غير مقصودة، مع بقاء المحلل الصارم ومعالجة الفشل الآمنة كما هما. تم الحفاظ على `.serena/project.yml` كما كان عند بدء المهمة ولم يُعدّل أو يُجهز أو يُتجاهل أو يُطبّع.

### التوصية التالية

مراجعة فرق Task 3.21 المستقل والتأكد من ظهور طلب الإدارة في Network بعد إعادة تحميل الصفحة، مع عدم دمج هذا التصحيح داخل التزام P6 الحالي.
