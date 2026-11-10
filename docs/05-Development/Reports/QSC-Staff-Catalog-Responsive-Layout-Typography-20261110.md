# Staff Catalog Responsive Layout and Typography / تحسين التخطيط والخطوط
Status: IMPLEMENTED_FOR_OWNER_REVIEW — PENDING_OWNER.
P6_ENGINEERING_CANDIDATE — Acceptance HOLD unchanged.

## Files Created / الملفات المنشأة
- This bilingual report.
- Ignored isolated build snapshot, QA startup helper, private runtime configuration, screenshots and sanitized evidence in artifacts/task-reviews/staff-responsive-20261110-9682b08f04/.
- No new application component or dependency. / لا مكوّن تطبيقي أو تبعية جديدة.

## Files Modified / الملفات المعدلة
- domains/catalog/query/presentation/catalog-brand.css only. Appended Staff-scoped rules; all pre-existing CSS and local work preserved. / إضافة قواعد عرض خاصة بـStaff مع حفظ العمل السابق.

## Files Deleted / الملفات المحذوفة
None / لا يوجد.

## Architecture Changes / تغييرات المعمارية
None. Catalog Query, ProductType profiles, missing-field limits, authorized stored/historical values, Workspace/Branch isolation, prices, stock, permissions and public sharing unchanged. / لم تتغير العقود أو المنطق أو البيانات.

## Changes / التحسينات
Fluid gutters and capped 1840px content; adaptive minmax product columns and bounded sidebar; consistent existing-font hierarchy for headings, labels, specifications, prices and actions; improved Details spacing, media size and mixed-content wrapping.
حاوية مرنة بسقف واضح، شبكة بطاقات وشريط جانبي متجاوبان، وخطوط ومسافات أوضح للبطاقات والتفاصيل والأسعار.

At 1920px: old content 1320px with 300px side margins; new content 1824px with 48px side margins. At 2560px content caps at 1840px. Card widths observed 279–367px across tested sizes.
في 1920px زاد عرض المحتوى من 1320 إلى 1824 بكسل، مع سقف يمنع التمدد المفرط.

Existing Arial / Noto Sans Arabic stack and original PNG logo preserved. No approved horizontal derivative identified. Brand PDF extracted successfully; proposed fonts/derivatives remain unapproved. No global token CSS import, new color or global typography change.
الخطوط الحالية والشعار الأصلي محفوظان؛ الشعار الأفقي المقترح يتطلب اعتمادًا منفصلًا.

## Actual verification / التحقق الفعلي
- Isolated production build: PASS, exit 0.
- TypeScript: PASS. Focused ESLint: PASS.
- Existing presentation tests: 121 total; 120 PASS, 1 FAIL, 0 skipped.
- The failed assertion expects classification badges on cards. This contradicts the approved November 5 card simplification. Identical test and component fail in the previous runtime too; baseline failure proven. No test was changed under CSS-only authorization.
- 48 real Microsoft Edge viewport/language/theme cases PASS: 1280,1440,1920,2560,768,1024,320,390 × Arabic/English × Light/Dark/System. Each includes list, Details/Back, direction, appearance, overflow and sizing checks.
- Six further real UI checks PASS: typed filter checkbox, search form, Branch price update, keyboard/focus, System preference changes, native image decode.
- Browser page errors: zero. Physical-device touch and screen-reader speech: NOT RUN.
- Earlier automation attempts used insufficient filter readiness/disclosure handling or check() post-render verification; final native click/result checks passed. Earlier execution evidence retained.
نجحت 54 حالة متصفح نهائية. بقي اختبار قديم فاشلًا ومثبتًا في النسخة السابقة؛ لا ندعي أن جميع الاختبارات ناجحة. لم يُنفذ اختبار لمس فعلي أو نطق قارئ شاشة.

## Preview / المعاينة
http://localhost:4348/catalog
Current source snapshot served by an isolated production build. Only the verified previous Staff process was replaced. Existing persistent QA database and configuration preserved; no migrations, resets or seeds.
استُبدلت عملية Staff المعروفة وحدها، دون تغيير قاعدة QA أو إعدادات الحاوية.
Future local startup: artifacts/task-reviews/staff-responsive-20261110-9682b08f04/Start Owner Preview.cmd (requires existing Staff PostgreSQL running).

## Evidence / الأدلة
Scoped archive: artifacts/task-reviews/staff-responsive-20261110-9682b08f04/QSC-Staff-Responsive-20261110-Review.zip
Export: Desktop/QSC-Reviews/QSC-Staff-Responsive-20261110-Review.zip
Archives contain exact CSS/report plus selected sanitized QA evidence and screenshots; no private configuration, passwords, browser profiles or database dump.

## Summary / الملخص
Presentation implementation complete for owner review; engineering checks have one pre-existing test-contract mismatch. No Git delivery or production-readiness claim.
تحسين العرض مكتمل للمراجعة، مع ملاحظة الاختبار القديم. لا تسليم Git أو اعتماد إنتاج.

## Next Recommendation / التوصية التالية
Owner UX Acceptance only. Separately authorize maintenance of the obsolete card assertion if desired; do not change it under this task.
مراجعة المالك فقط؛ صيانة الاختبار القديم تحتاج نطاقًا منفصلًا.
