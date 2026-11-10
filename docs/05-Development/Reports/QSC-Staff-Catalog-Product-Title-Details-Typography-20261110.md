# Staff Catalog Product Title and Details Label / تحسين العنوان ووسم التفاصيل
Status: IMPLEMENTED_FOR_OWNER_REVIEW — PENDING_OWNER.
P6_ENGINEERING_CANDIDATE — Acceptance HOLD unchanged.

## Root cause and contract / السبب والعقد
Serena inspection of catalogProductTitle and CatalogProductCard, existing identity-composition tests, and real authorized QA API/browser comparison confirmed that stored synthetic product names contain Arabic/English names but not the separate brand label. Presentation appends the missing authorized brand and already avoids re-appending the model included in the stored name. No redundant duplicate was proven, so the approved composition contract was preserved.
أكد الفحص أن العلامة تضاف في العرض وفق العقد السابق ولا تتكرر داخل الاسم المخزن؛ لم نغير الاسم أو تركيب العنوان أو استعلامات Catalog.

## Files Created / الملفات المنشأة
- This bilingual report.
- Ignored isolated runtime/build, private process configuration, QA helper, screenshots and sanitized evidence in artifacts/task-reviews/staff-title-20261110-cb7c470aeb/.
No application component, test, dependency or initialization script was created.

## Files Modified / الملفات المعدلة
domains/catalog/query/presentation/catalog-brand.css only.
Append-only Staff-scoped CSS preserves earlier local changes.
قواعد CSS جديدة فقط مع حفظ القواعد السابقة.

## Files Deleted / الملفات المحذوفة
None / لا يوجد.

## Architecture Changes / تغييرات المعمارية
None / لا يوجد.

## Presentation / العرض
- Card title: responsive 16–18px hierarchy and at most two visible lines. Complete text remains in the DOM and accessible link name; keyboard activation reaches full Details.
- Details title: complete authorized composed title retained, 22–30px fluid size, ordinary wrapping without clipping; mixed Arabic/English uses existing direction and plaintext bidi isolation.
- Details eyebrow: 16px, weight 600, 1.6 line height, 8px lower spacing, existing brand color, no forced uppercase.
- Original logo, existing Arial/Noto Sans Arabic fonts, brand palette and all ProductType/specification/price/Branch/stock/authorization contracts preserved.
عنوان البطاقة سطران بصريًا فقط، مع بقاء الاسم كاملًا متاحًا؛ عنوان التفاصيل كامل بلا قص؛ وسم التفاصيل 16px بوزن600 مع تباين ومسافات أفضل.

## Verification / التحقق
- Focused existing specification-display, owner-feedback and UI/UX tests: 31 PASS, 0 FAIL, 0 skipped.
- TypeScript PASS; focused ESLint PASS on inspected title presentation modules; CSS parsed by isolated production build PASS.
- Real Microsoft Edge: 16 actual-product cases PASS: Arabic/English × Light/Dark × 320/390/1440/1920. Card two-line height, full accessible link name, keyboard Details navigation, full Details heading, 16px/600 label and no horizontal overflow verified.
- 32 controlled short/long mixed-text layout scenarios also passed for cards and Details. These are DOM-only probes, not stored records or production integration evidence. No mocked API response.
- Label contrast measured from actual computed colors: Light 11.27:1; Dark 8.66:1.
- Browser page errors: zero. Physical touchscreen and screen-reader speech NOT RUN. System behavior evidence from the immediately previous task retained; not rerun for this local title-only change.
- Known unrelated legacy card-classification assertion remains open, previously proven failing on the old runtime; not modified or rerun here. The full suite is not claimed green.
نجحت الاختبارات المركزة31 وحالات المتصفح16، مع فصل عينات تخطيط DOM عن البيانات الحقيقية. فشل الاختبار القديم موثق منفصلًا ولا ندعي نجاح كامل الاختبارات أو اختبار قارئ شاشة.

## Preview / المعاينة
http://localhost:4348/catalog
Only verified prior Staff PID26240 replaced after build; updated preview PID24364 left running.
New local helper: artifacts/task-reviews/staff-title-20261110-cb7c470aeb/Start Owner Preview.cmd
Requires existing persistent Staff PostgreSQL running. No container restart, migrations, fixture/account edits, reset or seed.
المعاينة محدثة، وقاعدة QA الدائمة والأعمال الأخرى محفوظة.

## Tools actually used / الأدوات المستخدمة
Serena MCP: existing Staff project activated, symbol body and reference inspection.
rg and direct bounded reads; installed TypeScript/tsx/ESLint/Next build.
Existing Playwright-core with real Microsoft Edge; no Graphify/Context7 needed.
Existing project archive/checksum/sanitization utilities for the review bundle.

## Evidence / الأدلة
Local: artifacts/task-reviews/staff-title-20261110-cb7c470aeb/QSC-Staff-Title-20261110-Review.zip
Export: Desktop/QSC-Reviews/QSC-Staff-Title-20261110-Review.zip
Exact CSS/report and selected sanitized evidence only. Private configs, credentials, browser profiles and database content excluded.

## Summary / الملخص
Two requested presentation refinements complete; no TS/TSX, query, API, persisted product data, business or architectural changes.
اكتمل التحسينان في CSS فقط، دون تغيير البيانات أو المنطق.

## Next Recommendation / التوصية التالية
Owner visual acceptance only. Review card truncation and full Details title/label on preferred language/theme.
مراجعة المالك البصرية فقط. OWNER UX ACCEPTANCE: PENDING.
