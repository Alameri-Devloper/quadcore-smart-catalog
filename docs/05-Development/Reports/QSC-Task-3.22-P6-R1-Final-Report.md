# QSC Task 3.22-P6-R1 Final Report | التقرير النهائي للمهمة QSC 3.22-P6-R1

## Status | الحالة

`P6DiscoveryAuthorizationGate: PASS`; **P6: READY_FOR_DELTA_REPLAN**. P6 Presentation implementation has not started and P6 is not complete. | `P6DiscoveryAuthorizationGate: PASS`؛ **P6 جاهزة لإعادة التخطيط التفصيلي**. لم يبدأ تنفيذ واجهة P6، ولم تكتمل P6.

## Original Mismatch | التعارض الأصلي

A2 Workspace Product discovery previously required `pricing.manage` for `WorkspacePricing` and `referenceCost.manage` for `WorkspaceReferenceCost`. The authoritative Workspace pricing management read already permits Retail visibility through `pricing.view`, Wholesale visibility through `pricing.view` plus `pricing.wholesale.view`, and Reference Cost visibility through `pricing.view` plus `referenceCost.view`, while retaining both manage-only entry paths. Because A2 establishes the Product reference before the management read, valid view-only actors could not reach data that the management endpoint was already authorized to return. | كان اكتشاف منتجات مساحة العمل في A2 يتطلب سابقًا `pricing.manage` لغرض `WorkspacePricing` و`referenceCost.manage` لغرض `WorkspaceReferenceCost`. بينما تسمح قراءة إدارة تسعير مساحة العمل الموثوقة بعرض التجزئة عبر `pricing.view`، والجملة عبر `pricing.view` مع `pricing.wholesale.view`، والتكلفة المرجعية عبر `pricing.view` مع `referenceCost.view`، مع إبقاء مساري الإدارة المستقلين. ولأن A2 يثبت مرجع المنتج قبل قراءة الإدارة، لم يتمكن مستخدمو العرض المصرح لهم من الوصول إلى البيانات التي يجيزها مسار الإدارة أصلًا.

## Final Authorization Composition | تركيب التفويض النهائي

- `WorkspacePricing`: `pricing.manage` OR `pricing.view`.
- `WorkspaceReferenceCost`: `referenceCost.manage` OR (`pricing.view` AND `referenceCost.view`).
- `pricing.wholesale.view` alone remains insufficient because it requires the ordinary pricing-view composition.
- `pricing.manage` alone does not imply Reference Cost discovery.
- `referenceCost.manage` does not imply Workspace Pricing discovery.

- `WorkspacePricing`: الصلاحية `pricing.manage` أو `pricing.view`.
- `WorkspaceReferenceCost`: الصلاحية `referenceCost.manage` أو اجتماع `pricing.view` و`referenceCost.view`.
- تبقى `pricing.wholesale.view` وحدها غير كافية لأنها تعتمد على صلاحية عرض التسعير العادية.
- لا تعني `pricing.manage` وحدها صلاحية اكتشاف التكلفة المرجعية.
- لا تعني `referenceCost.manage` صلاحية اكتشاف تسعير مساحة العمل.

## Security Boundary | الحد الأمني

A2 remains Product discovery only. Its response is unchanged and contains only Product ID, optional code/name, Draft or Published lifecycle, and the existing cursor envelope. It does not return Retail, Wholesale, Reference Cost, `productRevision`, `referenceCostRevision`, `allowedActions`, raw permissions, actor identity, Workspace identity, Branch authority, or pricing capability data. Discovery success does not authorize the management GET or any mutation; the management endpoint remains authoritative for slot omission, partial-field disclosure, actions, revisions, lifecycle, and writes. | يبقى A2 مخصصًا لاكتشاف المنتج فقط. لم تتغير استجابته، وتحتوي على معرف المنتج والرمز/الاسم الاختياريين وحالة Draft أو Published وغلاف المؤشر الحالي فقط. ولا تعيد أسعار التجزئة أو الجملة أو التكلفة المرجعية أو المراجعات أو الأفعال أو الصلاحيات الخام أو هوية الممثل أو مساحة العمل أو سلطة الفرع أو بيانات قدرات التسعير. لا يمنح نجاح الاكتشاف صلاحية قراءة الإدارة أو الطفرات؛ ويبقى مسار الإدارة مرجع كشف الحقول والأفعال والمراجعات ودورة الحياة والكتابة.

Product lifecycle filtering remains Draft plus Published, Archived Products remain excluded, Workspace/tenant isolation remains repository-scoped, and the query/cursor fingerprint and all other A2 purposes are unchanged. No new permission code was added. | بقي ترشيح دورة حياة المنتج مقتصرًا على Draft وPublished، وبقيت المنتجات المؤرشفة مستبعدة، واستمر عزل مساحة العمل والمستأجر في المستودع، ولم تتغير بصمة الاستعلام/المؤشر أو أغراض A2 الأخرى. لم تُضف أي صلاحية جديدة.

## Verification | التحقق

| Check | Result |
| --- | --- |
| Focused Catalog Query Application test file | PASS — 26/26 |
| Affected Catalog Query Application and HTTP suite | PASS — 33/33 |
| PostgreSQL Catalog Query repository integration | PASS — 15/15 |
| Full TypeScript | PASS |
| Full ESLint | PASS |
| Full repository unit suite (`npm test`) | PASS |

The authorization matrix covers pricing manage, Retail view, Wholesale view composition, Reference Cost manage, composed Reference Cost view, and every required negative case. Security assertions confirm the discovery DTO contains no pricing, Reference Cost, revision, action, permission, actor, Workspace, or Branch fields. Existing lifecycle, cursor, tenant-isolation, Listing, Inventory, Branch Pricing, and Branch Reference Cost tests remain green. | تغطي مصفوفة الاختبار إدارة التسعير وعرض التجزئة وتركيب عرض الجملة وإدارة التكلفة المرجعية وتركيب عرضها وكل حالات الرفض المطلوبة. وتؤكد اختبارات الأمان خلو حمولة الاكتشاف من التسعير والتكلفة والمراجعات والأفعال والصلاحيات وهوية الممثل ومساحة العمل والفرع. بقيت اختبارات دورة الحياة والمؤشر وعزل المستأجر والإدراج والمخزون وتسعير الفرع وتكلفته المرجعية ناجحة.

## Files Created | الملفات المنشأة

- `docs/05-Development/Reports/QSC-Task-3.22-P6-R1-Final-Report.md`

## Files Modified | الملفات المعدلة

- `domains/catalog/query/application/catalog-query.use-cases.ts`
- `domains/catalog/query/application/catalog-query.use-cases.test.ts`

## Files Deleted | الملفات المحذوفة

None. | لا توجد ملفات محذوفة.

## Architecture Changes | التغييرات المعمارية

None. Catalog Query retains authorization composition in Application, the existing Trusted Actor context, repository ownership, Product projection, route contract, cursor behavior, and tenant boundaries. There are no Domain, Infrastructure, Presentation, database, schema, migration, dependency, or architecture changes. | لا توجد تغييرات معمارية. بقي تركيب التفويض في تطبيق Catalog Query مع سياق الممثل الموثوق وملكية المستودع وإسقاط المنتج وعقد المسار وسلوك المؤشر وحدود المستأجر الحالية. لا توجد تغييرات في المجال أو البنية التحتية أو العرض أو قاعدة البيانات أو المخطط أو الترحيلات أو الاعتماديات أو المعمارية.

## Summary | الخلاصة

P6-R1 closes the discovery/read authorization mismatch without widening A2 data disclosure or mutation authority. Workspace Pricing discovery now admits Retail-view actors, and Workspace Reference Cost discovery now matches the exact existing composed visibility boundary while preserving the independent manage-only path. `P6DiscoveryAuthorizationGate: PASS`. | تغلق P6-R1 تعارض تفويض الاكتشاف والقراءة دون توسيع كشف بيانات A2 أو سلطة الطفرات. يسمح اكتشاف تسعير مساحة العمل الآن لمستخدمي عرض التجزئة، ويطابق اكتشاف التكلفة المرجعية تركيب العرض الحالي بدقة مع حفظ مسار الإدارة المستقل. `P6DiscoveryAuthorizationGate: PASS`.

## Next Recommendation | التوصية التالية

Perform the bounded P6 delta replan against this reconciled A2 contract before approving P6 Presentation implementation. Do not mark P6 complete or begin P7. | نفذ إعادة التخطيط التفصيلي المحدودة لـP6 وفق عقد A2 المصالح قبل اعتماد تنفيذ واجهة P6. لا تعلن اكتمال P6 ولا تبدأ P7.
