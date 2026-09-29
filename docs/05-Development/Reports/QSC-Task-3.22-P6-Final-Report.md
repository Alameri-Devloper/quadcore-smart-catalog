# QSC Task 3.22-P6 Final Report | التقرير النهائي للمهمة QSC 3.22-P6

## Status | الحالة

- `P6Implementation: PASS`
- `P6ManualBrowserQA: PENDING`
- `P6CompletionGate: PENDING`
- **P6: NOT COMPLETE**

The bounded Workspace Pricing and Reference Cost Presentation implementation is complete and automatically verified. Independent browser acceptance, merge, and closure remain required before P6 can be marked complete. | اكتمل تنفيذ واجهة تسعير مساحة العمل والتكلفة المرجعية ضمن النطاق المحدد، ونجح التحقق الآلي. يبقى قبول المتصفح المستقل والدمج والإغلاق مطلوبًا قبل إعلان اكتمال P6.

## Implementation Scope | نطاق التنفيذ

P6 adds Workspace Retail, Wholesale, and Reference Cost management to the existing Operations area. It reuses A2 Product discovery with `WorkspacePricing` or `WorkspaceReferenceCost`, then reads authoritative state through `GET /api/products/{productId}/pricing`. Set and Clear use only the existing per-field PUT/DELETE routes. Workspace flows use neither A6 nor a Branch selector, introduce no URL key, and do not implement P7 Branch overrides. | تضيف P6 إدارة أسعار التجزئة والجملة والتكلفة المرجعية لمساحة العمل إلى منطقة العمليات الحالية. تعيد استخدام اكتشاف المنتج A2 بالغرض المناسب، ثم تقرأ الحالة الموثوقة من مسار التسعير الحالي، وتستخدم مسارات التعيين والمسح القائمة فقط. لا تستخدم تدفقات مساحة العمل A6 أو محدد الفروع، ولا تضيف مفاتيح URL أو تجاوزات P7.

## Strict Client and Partial Disclosure | العميل الصارم والكشف الجزئي

The bounded Catalog Branch Product Presentation client uses injected unbound `FetchPort`, same-origin credentials, `no-store`, `AbortSignal`, exact request projection, strict envelopes, normalized failures, and allow-listed response reconstruction. Optional Retail, Wholesale, and Reference Cost fields remain truly omitted when the server omits them; the client never creates `null`, zero, `Hidden`, `NotConfigured`, an action, or a revision for an unauthorized slot. Unexpected authority and sensitive fields are discarded. | يستخدم عميل العرض المحدود منفذ جلب محقونًا وغير مربوط، وبيانات اعتماد المصدر نفسه، وعدم التخزين، وإشارة الإلغاء، وإسقاط الطلب الدقيق، والتحقق الصارم، وتطبيع الأخطاء. تبقى حقول التجزئة والجملة والتكلفة المرجعية محذوفة فعلًا عند حذفها من الخادم، ولا ينشئ العميل حالة أو قيمة أو فعلًا أو مراجعة لحقل غير مصرح به. تُهمل حقول السلطة والبيانات الحساسة غير المتوقعة.

## Revision and Mutation Coordination | تنسيق المراجعات والطفرات

- Retail and Wholesale always submit the response-level `productRevision`. Either mutation invalidates the displayed shared token, disables the shared editors, and forces a complete authoritative refetch before another write.
- Reference Cost submits only `referenceCostRevision`, including authoritative absence revision `0`; its lifecycle is independent from `productRevision`.
- Set preserves canonical decimal-string `amountMinor`, including configured zero, and uppercase currency transport. `NotConfigured` remains distinct from configured zero.
- Every Set/Clear uses a bounded Review → Confirm flow. Success clears the submitted intent and refetches. Conflict preserves the safe draft, discards the stale revision, refetches, and requires explicit review; no mutation is replayed automatically.
- Archived or missing Product failures invalidate stale review authority, refetch management state, refresh Product discovery, and never retry automatically.

- تستخدم التجزئة والجملة دائمًا `productRevision` المشترك، وتبطل طفرة أي منهما الرمز المعروض وتعطل المحررين حتى اكتمال إعادة القراءة الموثوقة.
- تستخدم التكلفة المرجعية `referenceCostRevision` فقط، بما في ذلك مراجعة الغياب الموثوق `0`، وتبقى مستقلة عن مراجعة المنتج.
- يحفظ التعيين `amountMinor` كسلسلة عشرية قياسية، بما في ذلك الصفر المهيأ، وتبقى حالة عدم التهيئة مختلفة عن الصفر.
- تمر كل عملية تعيين أو مسح بمراجعة ثم تأكيد. تمسح النجاحات النية المرسلة وتعيد القراءة، بينما تحفظ التعارضات المسودة الآمنة وتبطل المراجعة القديمة وتفرض مراجعة صريحة دون إعادة تلقائية.
- تبطل أخطاء الأرشفة أو فقدان المنتج سلطة المراجعة القديمة وتحدث المورد والاكتشاف دون إعادة تلقائية.

## Operations, Lifecycle, and Security | العمليات ودورة الحالة والأمان

The existing `/operations` query contract remains unchanged: workspace price and Reference Cost contexts use the existing `section`, `pricingScope`, `pricingField`, `productId`, `q`, and `productCursor` keys and omit `branchId`. A1 remains a navigation hint only. A2 establishes only a Product reference. The management DTO and `allowedActions` remain the sole read/action authority. Actor/lifecycle changes, context changes, Product/search/page changes, 401, disposal, and request supersession abort or mask private DTOs, slot presence, revisions, drafts, failures, and late responses. React imports no repository, Domain entity, server runtime, raw permission policy, or tenant authority. | يبقى عقد URL الحالي لمنطقة العمليات دون تغيير، وتستخدم سياقات أسعار وتكلفة مساحة العمل المفاتيح القائمة فقط وتحذف `branchId`. تبقى A1 تلميح تنقل فقط، ويثبت A2 مرجع المنتج فقط، بينما تبقى حمولة الإدارة و`allowedActions` سلطة القراءة والفعل الوحيدة. تمسح تغييرات الممثل والسياق والمنتج والبحث والصفحة، وانتهاء الجلسة والتخلص واستبدال الطلب، البيانات الخاصة والمراجعات والمسودات والنتائج المتأخرة. لا تستورد React مستودعات أو كيانات مجال أو تشغيل الخادم أو سياسة صلاحيات خام أو سلطة مستأجر.

## Accessibility and Responsive Presentation | الإتاحة والاستجابة

The single English/Arabic component tree uses inherited LTR/RTL direction, labeled native inputs and buttons, focus-restored native review dialogs, alert/live regions, keyboard cancellation, duplicate-submit blocking, 44px touch targets, wrapping actions, responsive auto-fit cards, bounded dialogs, and LTR bidi isolation for minor-unit amounts, currency codes, IDs, and revisions. Manual browser verification remains pending for touch, mouse, keyboard, 375px mobile, 768px tablet, Arabic RTL, and real two-tab conflict scenarios. | تستخدم شجرة المكونات الواحدة الإنجليزية والعربية واتجاه LTR/RTL الموروث، وعناصر أصلية معنونة، وحوارات مراجعة تعيد التركيز، ورسائل حية وتنبيهات، وإلغاء بلوحة المفاتيح، ومنع الإرسال المكرر، وأهداف لمس 44 بكسل، وبطاقات متجاوبة، وعزلًا ثنائي الاتجاه للقيم التقنية. يبقى التحقق اليدوي في المتصفح معلقًا لأجهزة الإدخال والأحجام والعربية وتعارض النافذتين الحقيقي.

## Automated Verification | التحقق الآلي

| Verification | Result |
| --- | --- |
| P6 targeted client/coordinator/panel/context/integration tests | PASS — 26/26 |
| Catalog Branch Product Presentation suite | PASS — 63/63 |
| Workspace Operations and P1–P5 Presentation regressions | PASS — 170/170 |
| Catalog selector Presentation regressions | PASS — 71/71 |
| Catalog Query Application and HTTP suite | PASS — 33/33 |
| Full TypeScript (`npx.cmd tsc --noEmit`) | PASS |
| Full ESLint (`npm.cmd run lint`) | PASS |
| Production build (`npm.cmd run build`) | PASS |
| Full repository unit suite (`npm.cmd test`) | PASS — exit 0 |
| Guarded PostgreSQL integration (`npm.cmd run test:integration`) | PASS — 140/140 across 26 suites (review-bundle verification) |

نجحت اختبارات P6 المركزة وكل اختبارات العرض المتأثرة واختبارات A2 وTypeScript وESLint والبناء ومجموعة الوحدة الكاملة، كما نجحت اختبارات PostgreSQL المحمية بعدد 140/140 ضمن تحقق حزمة المراجعة، دون أن يغير تنفيذ P6 الخادم أو التطبيق أو البنية التحتية أو التخزين.

## Files Created | الملفات المنشأة

- `domains/catalog/branch-products/presentation/workspace-pricing.types.ts`
- `domains/catalog/branch-products/presentation/workspace-pricing-api.client.ts`
- `domains/catalog/branch-products/presentation/workspace-pricing-api.client.test.ts`
- `domains/catalog/branch-products/presentation/workspace-pricing.coordinator.ts`
- `domains/catalog/branch-products/presentation/workspace-pricing.coordinator.test.ts`
- `domains/catalog/branch-products/presentation/workspace-pricing.i18n.ts`
- `domains/catalog/branch-products/presentation/WorkspacePricingPanel.tsx`
- `domains/catalog/branch-products/presentation/workspace-pricing-panel.test.ts`
- `domains/catalog/branch-products/presentation/mock/workspace-pricing.fixture.ts`
- `domains/workspace/branches/presentation/operations-pricing-context.ts`
- `domains/workspace/branches/presentation/operations-pricing-context.test.ts`
- `domains/workspace/branches/presentation/OperationsPricingWorkflow.tsx`
- `domains/workspace/branches/presentation/operations-pricing.integration.test.ts`
- `docs/05-Development/Reports/QSC-Task-3.22-P6-Final-Report.md`

## Files Modified | الملفات المعدلة

- `domains/workspace/branches/presentation/OperationsPage.tsx`
- `domains/workspace/branches/presentation/operations-presentation.i18n.ts`

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Architecture Changes | تغييرات المعمارية

None. P6 is Presentation-only. Domain, Application, Infrastructure, server routes/handlers, API contracts, repositories, database/schema, migrations, permissions, dependencies, bounded-context ownership, and architecture are unchanged. No generic API framework, BFF, Pricing Domain, Operations Domain, or client-side authorization system was added. | لا توجد تغييرات معمارية. تقتصر P6 على العرض؛ لم تتغير طبقات المجال أو التطبيق أو البنية التحتية أو الخادم أو العقود أو المستودعات أو قاعدة البيانات أو الترحيلات أو الصلاحيات أو الاعتماديات أو الملكية. لم يُضف إطار API عام أو BFF أو مجال جديد أو نظام تفويض في العميل.

## Summary | الخلاصة

`P6Implementation: PASS`. The implementation preserves server-owned partial disclosure and actions, shared Retail/Wholesale concurrency, independent Reference Cost concurrency, authoritative refetch, no automatic retry, and P1–P5 behavior. `P6ManualBrowserQA` and `P6CompletionGate` remain `PENDING`; P6 is **NOT COMPLETE**. | نجح تنفيذ P6 مع حفظ الكشف والأفعال المملوكة للخادم، ومراجعة التجزئة والجملة المشتركة، واستقلال مراجعة التكلفة المرجعية، وإعادة القراءة الموثوقة، ومنع الإعادة التلقائية، وسلوك P1–P5. يبقى قبول المتصفح وبوابة الاكتمال معلقين، وP6 غير مكتملة.

## Next Recommendation | التوصية التالية

Perform independent manual browser QA for the approved P6 matrix, including real two-tab Retail/Wholesale and Reference Cost conflicts, then complete review/merge/closure separately. Do not begin P7 and do not mark P6 complete before those gates pass. | نفّذ قبولًا يدويًا مستقلًا في المتصفح لمصفوفة P6، بما في ذلك تعارضات حقيقية بنافذتين للتجزئة والجملة والتكلفة المرجعية، ثم نفّذ المراجعة والدمج والإغلاق بشكل مستقل. لا تبدأ P7 ولا تعلن اكتمال P6 قبل نجاح تلك البوابات.
