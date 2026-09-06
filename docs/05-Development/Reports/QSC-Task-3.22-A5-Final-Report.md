# QSC Task 3.22-A5 Final Report | التقرير النهائي للمهمة QSC 3.22-A5

## Status | الحالة

**ReadyForReview** — implementation and every required verification gate are complete; independent review and merge remain required. | **جاهزة للمراجعة** — اكتمل التنفيذ وكل بوابات التحقق المطلوبة، وتبقى المراجعة المستقلة والدمج مطلوبين.

## Task | المهمة

Task 3.22-A5 — Inventory Disclosure Hardening. Server-side Inventory disclosure only; Task 3.22 Presentation is excluded. | المهمة 3.22-A5 — تشديد كشف المخزون. يقتصر النطاق على كشف المخزون في الخادم، وتُستبعد واجهة المهمة 3.22.

## Branch and Baseline | الفرع وخط الأساس

- Branch: `feature/task-3.22-a5-inventory-disclosure-hardening`
- Required and current HEAD: `6b753ecc3d6e7627b5c63256a6983bd3d969476c`
- Baseline contains A1 through PR #28, A2 through PR #29, A3 through PR #30, and A4 through PR #31.
- The initial working tree was clean and the required ancestor check passed.

- الفرع وخط الأساس وHEAD مطابقة للعقد، ويحتوي خط الأساس A1–A4 مدمجة عبر طلبات السحب #28–#31.
- كانت شجرة العمل نظيفة عند البداية ونجح فحص السلف المطلوب.

## Root-Cause Analysis | تحليل السبب الجذري

Source inspection confirmed four disclosure gaps in `domains/inventory/application/inventory.use-cases.ts` before implementation:

1. `GetBranchProductInventoryUseCase` built the complete numeric balance and replaced only `onHand`, `reserved`, and `damaged` with `"Hidden"`; it still returned numeric `available`, `revision`, and `updatedAt` to `inventory.availability.view`.
2. Every mutation returned `balance`, `sourceBalance`, or `destinationBalance` regardless of whether the mutation-authorized actor held `inventory.quantity.view`.
3. Successful idempotency records persisted the detailed balance-bearing result.
4. The completed-operation path decoded and returned the persisted payload directly without applying the current `TrustedActorContext`.

أكد فحص المصدر أربع فجوات: كانت قراءة الإتاحة تخفي ثلاثة حقول فقط وتبقي `available` رقمياً مع المراجعة والوقت، وكانت كل الطفرات تعيد أرصدة تفصيلية دون صلاحية الكميات، وكانت نتيجة idempotency المخزنة تحتوي التفاصيل، وكانت الإعادة ترجع الحمولة المخزنة مباشرة دون إسقاطها وفق السياق الموثوق الحالي.

## Architecture Assessment and Decision | التقييم والقرار المعماري

No architecture change, ADR, new Domain, repository, authorization framework, persistence model, or HTTP business rule was required. Inventory Domain continues to own balance invariants and transfer state changes. Inventory Application continues to own authorization composition, orchestration, idempotency, and response projection. Persistence stores the authoritative internal operation outcome; thin HTTP handlers serialize only the already-authorized Application DTO.

لم يلزم تغيير معماري أو ADR أو مجال أو مستودع أو إطار تفويض أو نموذج استمرارية جديد. بقيت قواعد الرصيد والنقل في مجال المخزون، وبقي التنسيق وidempotency وإسقاط الاستجابة في تطبيق المخزون، وتستمر طبقة HTTP الرقيقة في التسلسل فقط.

## Disclosure Contract | عقد الكشف

| Current effective visibility | Ordinary read | Mutation result |
| --- | --- | --- |
| Owner or `inventory.quantity.view` | `branchId`, `productId`, `unit`, semantic `availability`, nested numeric `quantities`, `revision`, `updatedAt` | detailed `balance` or transfer balances plus operation-specific state |
| `inventory.availability.view` without quantity view | `branchId`, `productId`, `unit`, `availability` only | top-level semantic `availability`, or `sourceAvailability` and `destinationAvailability`, plus operation-specific state |
| Neither read permission | `Forbidden` | successful operation minimum only; no balance or availability field |

The exact semantic vocabulary is `InStock | OutOfStock`. `InStock` means authoritative available quantity is greater than zero; zero, absent balance, fully reserved stock, and fully damaged stock are `OutOfStock`. No `"Hidden"`, `null`, numeric balance field, revision, or timestamp is emitted in an availability-only DTO.

مفردات الإتاحة الدقيقة هي `InStock | OutOfStock`. تعني `InStock` أن الكمية المتاحة الموثوقة أكبر من الصفر، بينما الرصيد الغائب أو الصفري أو المحجوز بالكامل أو التالف بالكامل هو `OutOfStock`. لا تعيد حمولة الإتاحة فقط أي حقل كمي أو قيمة إخفاء أو مراجعة أو وقت.

## Mutation Projection | إسقاط نتائج الطفرات

One Inventory Application projector handles Receive, Issue, Mark Damaged, Restore Damaged, Correct/Adjust, Reserve, Release, Fulfill, and Transfer. Successful responses preserve `operationId` and `status: "Succeeded"`. Reservation operations preserve `reservationId`, `reservationStatus`, and `remainingQuantity` for current `inventory.reserve` authority. Transfer preserves `transferId` for current `inventory.transfer` authority. Mutation permissions do not imply either read permission.

يعالج مسقط واحد في تطبيق المخزون كل عائلات الطفرات. تحفظ الاستجابة الناجحة `operationId` والحالة، وتحفظ عمليات الحجز معرف الحجز وحالته وكميته المتبقية لصلاحية الحجز الحالية، ويحفظ النقل `transferId` لصلاحية النقل الحالية. لا تستلزم صلاحية الطفرة أي صلاحية قراءة.

## Idempotent Replay Security | أمان إعادة idempotent

The stored result remains an internal detailed operation outcome and the operation fingerprint remains unchanged. For first execution, Application persists that internal outcome and projects it before returning. For replay, Application decodes the internal outcome and applies the same projector using the current trusted context. Tests prove quantity, availability-only, and no-read replay; lower current visibility cannot disclose a previously stored balance. Mismatched fingerprints still return `IdempotencyConflict`, failures retain their established replay behavior, and permissions were not added to the fingerprint.

تبقى النتيجة المخزنة نتيجة داخلية تفصيلية وتبقى البصمة دون تغيير. عند التنفيذ الأول تُحفظ النتيجة الداخلية ثم تُسقط، وعند الإعادة تُفك ثم تُسقط بالاعتماد على السياق الموثوق الحالي. تثبت الاختبارات حالات صلاحية الكميات والإتاحة فقط وغياب القراءة، وتبقى تعارضات البصمة وفشل الإعادة على سلوكها السابق.

## Reservation and Transfer Non-Regression | عدم تراجع الحجز والنقل

Reservation collection/detail DTOs and authorization are unchanged. Release and Fulfill continue to lock and recheck current actionable state and remaining quantity. Transfer still sorts Branch IDs for deterministic locking and saves both balances, two correlated movements, one audit event, and the operation result in the existing single Inventory transaction. No transaction boundary or correlation behavior changed.

لم تتغير قراءات الحجز أو تفويضها، وتستمر طفرات التحرير والتنفيذ في القفل وإعادة التحقق. بقي النقل في معاملة مخزون واحدة مع ترتيب قفل حتمي ورصيدَي المصدر والوجهة وحركتين مترابطتين وتدقيق واحد ونتيجة عملية واحدة.

## Tenant, Branch, Product, and HTTP Impact | أثر المستأجر والفرع والمنتج وHTTP

`TrustedActorContext` remains the only Workspace, actor, role, permission, and Branch-scope authority. Ordinary reads preserve trusted Branch scope, same-Workspace Branch/Product lookup, safe `403/404`, and authoritative absent-balance semantics. No Route Handler contains projection logic and no route was added or removed. Existing authentication, restricted-session, origin, error sanitization, and private/no-store behavior remain unchanged. The intentional transport change is the approved A5 discriminated Inventory read/mutation DTO.

يبقى `TrustedActorContext` مصدر السلطة الوحيد. حُفظ نطاق الفرع وعزل مساحة العمل والتحقق من الفرع والمنتج ودلالات الغياب والأخطاء الآمنة. لم يضف أو يحذف مسار، ولم تنتقل قواعد الإسقاط إلى HTTP، وبقيت المصادقة والجلسة المقيدة وحماية الأصل وتنقيح الأخطاء وسياسات التخزين المؤقت دون تغيير.

## Security and Non-Disclosure | الأمان وعدم الكشف

Availability-only and no-read tests assert exact field absence, not masking. They reject generic quantity reconstruction fields including `onHand`, `reserved`, `damaged`, `available`, `quantities`, balances, revision, and timestamp. Responses never add raw permissions, role, Workspace/actor identity, Branch-scope lists, persistence fields, or internal errors.

تتحقق الاختبارات من غياب الحقول فعلياً لا من إخفائها بقيم بديلة. ولا تضيف الاستجابات صلاحيات خاماً أو دوراً أو هوية مساحة عمل أو ممثل أو قائمة نطاق فروع أو تفاصيل استمرارية أو أخطاء داخلية.

## Files Created | الملفات المنشأة

- `docs/05-Development/Reports/QSC-Task-3.22-A5-Final-Report.md`

## Files Modified | الملفات المعدلة

- `domains/inventory/application/inventory.use-cases.ts`
- `domains/inventory/application/inventory.use-cases.test.ts`
- `domains/inventory/infrastructure/http/inventory-route-handlers.test.ts`
- `domains/inventory/infrastructure/persistence/postgresql-inventory.integration.test.ts`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`
- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`

## Files Deleted | الملفات المحذوفة

None. | لا توجد.

## Architecture Changes | تغييرات المعمارية

None. The change is a bounded projection correction inside the existing Inventory Application boundary. | لا توجد. التغيير تصحيح إسقاط محدود داخل حد تطبيق المخزون الحالي.

## Database / Migration Decision | قرار قاعدة البيانات والترحيل

No schema or migration is required. The migration chain remains `0000–0015`; migration `0016` was not created. Existing `inventory_operations.result` already stores the internal outcome needed for current-context projection. | لا يلزم مخطط أو ترحيل، وتبقى السلسلة `0000–0015` ولم ينشأ `0016`. حقل نتيجة العملية الحالي كافٍ للنتيجة الداخلية.

## Dependency Decision | قرار الاعتمادات

No dependency was added. `package.json` and `package-lock.json` are unchanged. | لم يضف اعتماد، ولم يتغير ملفا الحزم.

## Focused Tests | الاختبارات المركزة

`npm.cmd run test:inventory` passed 33/33 with 0 failures and 0 skips. Coverage includes the ordinary read permission matrix, absent/zero/reserved-out/damaged-out semantics, tenant and Branch scope, all single-balance mutation families across three visibility levels, Reservation create/release/fulfill state, transfer projections and effects, current-context success replay, duplicate-effect prevention, fingerprint conflicts, failure replay, and HTTP semantic serialization.

نجحت اختبارات المخزون المركزة 33/33 دون فشل أو تخطٍ، وغطت مصفوفة القراءة والدلالات والنطاق وكل عائلات الطفرات والحجز والنقل وإعادة idempotent وعدم تكرار الآثار وحد HTTP.

## PostgreSQL Integration Evidence | أدلة تكامل PostgreSQL

Only the repository-guarded isolated test database was used; Production access was prohibited. The project PostgreSQL container was started after the initial sanitized preparation failure showed it was stopped. The focused Inventory/Pricing integration file then passed 14/14. The six Inventory persistence cases prove ordinary semantic/detailed read isolation, concurrent issue/reservation integrity, atomic/currently-projected transfer, persisted detailed-outcome replay under quantity/availability/no-read visibility, one movement and one audit on replay, unchanged fingerprint conflict, and one Reservation row/movement on replay. The full guarded integration suite passed 139/139 with 0 failures and 0 skips.

استُخدمت قاعدة الاختبار المعزولة والمحروسة فقط وحُظر الإنتاج. بعد تشغيل حاوية PostgreSQL الخاصة بالمشروع نجح الملف المركز 14/14، وأثبت القراءة المعزولة والتزامن وذرية النقل وإسقاط النتيجة المخزنة وفق الصلاحيات الحالية وعدم تكرار الحركة أو التدقيق أو الحجز. نجح التكامل الكامل 139/139 دون فشل أو تخطٍ.

## Broad Verification | التحقق العام

- Required branch, HEAD, clean-start, and ancestor gates: passed.
- Baseline focused Inventory reproduction: 23/23 passed before implementation.
- Final focused Inventory Application/authorization/HTTP: 33/33 passed.
- TypeScript `npx.cmd tsc --noEmit`: passed.
- Integration TypeScript: passed.
- ESLint: passed.
- Next.js production build: passed; all existing Inventory routes compiled.
- Drizzle/schema check: passed.
- Broad `npm test`: 762 total; 761 passed, 1 existing platform-permission skip, 0 failed.
- Focused guarded PostgreSQL Inventory/Pricing integration: 14/14 passed.
- Full guarded PostgreSQL integration: 139/139 passed.
- `git diff --check`: passed.
- `npm audit`: not run, as explicitly prohibited.

نجحت بوابات Git والاختبارات المركزة وTypeScript وESLint والبناء وفحص Drizzle والاختبارات العامة وتكامل PostgreSQL وفحص فروق Git. لم يشغل `npm audit` امتثالاً للمنع.

## Git Integrity | سلامة Git

No Git write was performed: no add, commit, push, merge, rebase, reset, restore, clean, stash, switch, checkout, tag, or branch deletion. All A5 source, test, and documentation changes remain unstaged for independent review. | لم تنفذ أي كتابة Git أو تبديل أو حذف فرع، وتبقى كل تغييرات A5 غير مرحّلة للمراجعة المستقلة.

## Automated Review Bundle | حزمة المراجعة الآلية

The final DEV-001 invocation runs every required trusted verification command, explicitly skips both prohibited optional npm audit commands, preserves exact source files, sanitizes evidence only, verifies repository stability and manifest hashes, and publishes the repository-local and exported report/ZIP/checksum sets without Git writes. Exact collision-safe paths are reported in the implementation handoff. | يشغل استدعاء DEV-001 النهائي كل أوامر التحقق الموثوقة المطلوبة ويتخطى تدقيقي npm الاختياريين المحظورين صراحة، ويحفظ ملفات المصدر الدقيقة وينقح الأدلة فقط ويتحقق من استقرار المستودع والبصمات وينشر مجموعات التقرير والحزمة والبصمة دون كتابة Git. ترد المسارات الدقيقة في تسليم التنفيذ.

## Risks | المخاطر

- Existing clients must adopt the approved A5 DTO: quantities are nested under `quantities`, and semantic-only mutation states are top-level availability fields.
- Idempotency storage intentionally remains detailed internal data; every future Inventory mutation return path must continue to use the Application projector.
- Operation-specific `remainingQuantity` is intentionally numeric Reservation state authorized by `inventory.reserve`, not generic balance disclosure.

- يجب أن تعتمد الجهات المستهلكة حمولة A5 المعتمدة، حيث تتداخل الكميات تحت `quantities` وتظهر الإتاحة الدلالية للطفرات في حقول عليا.
- تبقى نتيجة idempotency الداخلية تفصيلية عمداً، ويجب أن تستخدم أي طفرة مستقبلية مسقط التطبيق نفسه.
- `remainingQuantity` حالة حجز رقمية مقصودة ومخولة بصلاحية الحجز وليست كشفاً عاماً للرصيد.

## Known Limitations | القيود المعروفة

A5 does not add Presentation, React components, client hooks, navigation, forms, new mutation workflows, Inventory history redesign, permissions, public sharing, schema changes, or dependencies. Task 3.22 Presentation remains Planned / blocked until A5 is reviewed and merged. | لا تضيف A5 واجهة عرض أو مكونات React أو خطافات عميل أو تنقلاً أو نماذج أو طفرات جديدة أو إعادة تصميم للسجل أو صلاحيات أو مشاركة عامة أو مخططاً أو اعتماداً. تبقى واجهة 3.22 مخططة ومحجوبة حتى مراجعة A5 ودمجها.

## Summary | الخلاصة

A5 is implemented within the existing Inventory Application boundary. Numeric inventory is disclosed only with quantity view, availability-only callers receive `InStock | OutOfStock`, mutation-only callers receive the operation minimum, and every fresh or replayed success is projected from current trusted visibility. Reservation state, transfer identity, idempotency behavior, transfer atomicity, tenant scope, and HTTP safety are preserved. | نُفذت A5 داخل حد تطبيق المخزون الحالي. لا تعرض الأرقام إلا بصلاحية الكميات، وتعيد الإتاحة فقط حالة دلالية، وتعيد صلاحية الطفرة وحدها الحد الأدنى، وتُسقط كل نتيجة ناجحة أولية أو معادة وفق الرؤية الموثوقة الحالية مع حفظ الحجز والنقل والذرية والعزل وأمان HTTP.

## Next Recommendation | التوصية التالية

Submit A5 and its automated review bundle for independent review and merge. **Do not begin Task 3.22 Presentation automatically. Do not create migration 0016.** Stop here for review. | قدم A5 وحزمة المراجعة الآلية للمراجعة المستقلة والدمج. **لا تبدأ واجهة المهمة 3.22 تلقائياً، ولا تنشئ الترحيل 0016.** توقف هنا للمراجعة.
