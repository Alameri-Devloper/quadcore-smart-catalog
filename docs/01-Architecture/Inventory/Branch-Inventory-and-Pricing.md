# Branch Inventory and Pricing | مخزون الفروع والتسعير

**Status:** Task 3.17 implemented foundation  
**Last Updated:** 2026-08-20

## English

### Boundaries

The existing `workspace_branch_references` identity is evolved into the operational Branch. Existing `branchId` and Identity membership references remain stable. Branch adds one entered `displayName`, a stable Workspace-unique code, `Active`/`Inactive`, sort order, timestamps, and optimistic revision. Inactive Branches remain historically resolvable and retain all operational records.

Product identity and base Retail/Wholesale prices remain Workspace-level in Catalog. A Branch listing stores only `Listed` or `Unlisted`; absence means `NotConfigured` and therefore not listed. Listing does not create or erase stock or pricing. Inventory may exist while a Product is unlisted. Archived Products retain history but reject normal Branch mutations.

Inventory is a separate domain. It stores an immutable movement ledger and a transactionally maintained balance for each Workspace, Branch, and Product. The balance is an operational projection, not independently editable truth. Repositories expose append and list operations for movements and no update/delete movement operation.

### Quantity model and concurrency

The only V1 unit is integer `Piece`. Movement quantities are positive decimal strings over HTTP and PostgreSQL `BIGINT` internally. Direction comes from the fixed movement type. The balance invariant is:

```text
available = onHand - reserved - damaged
onHand >= 0
reserved >= 0
damaged >= 0
available >= 0
```

`onHand` includes physical damaged pieces. Reserving changes `reserved`; fulfilling reduces both `reserved` and `onHand`; damage changes `damaged`; a normal issue reduces `onHand` only when resulting availability remains non-negative. Corrections are compensating `CorrectionIncrease` or `CorrectionDecrease` movements and never rewrite history.

Application use cases own transactions. PostgreSQL creates/locks the balance row with `SELECT ... FOR UPDATE`; transfers lock both Branch balances in sorted Branch-ID order. A failed transfer persistence step aborts the owning transaction, so neither balance, movement, Audit event, nor operation claim can commit partially. A Workspace-scoped operation ID and SHA-256 request fingerprint are persisted before mutation. Identical successful retries return the persisted result, while a changed command with the same ID returns an idempotency conflict; a transaction-aborted attempt leaves no claim and may execute again.

### Pricing and visibility

Retail and Wholesale reuse the existing Product columns as the single Workspace base source. Reference Cost uses a protected Product-scoped row because it did not previously exist. Branch overrides are typed as `Retail`, `Wholesale`, or `ReferenceCost`. Absence inherits the current Workspace base value live. Clearing removes only the current override configuration; zero remains a real value.

Money uses non-negative `BIGINT` minor units bounded by the existing safe Money contract and an ISO 4217 currency. HTTP transports `amountMinor` as a decimal string. Application validation checks both the fixed Task 3.16 ISO registry and enabled Workspace currency rows.

Wholesale is returned only with `pricing.wholesale.view`. Reference Cost is returned only with `referenceCost.view`; its audit metadata excludes the amount. Branch override writes require the matching override permission and trusted Branch scope. The operational Branch Product read model composes listing, inventory, and permission-filtered pricing without placing rules in React.

The existing Product Entry read and submission views apply the same Retail/Wholesale visibility permissions. During Edit, a price hidden from the actor is preserved from the loaded Product rather than being cleared by an omitted browser field.

### Authorization and HTTP

Every route resolves `TrustedActorContext` server-side and takes Workspace, Actor, permissions, and Branch scope only from that context. Selected-Branch actors must contain every target Branch; transfers require both source and destination. Out-of-scope and foreign-Workspace targets use non-disclosing not-found results. Mutations reject restricted sessions and cross-origin requests.

Task 3.17 adds typed routes for Branch lifecycle, listing, inventory receipt/issue/reservation/release/fulfillment/damage/restore/transfer/correction, inventory reads, base pricing, Branch overrides, and explicit clearing. No generic inventory action route and no direct quantity setter exist. No management Presentation was added in this foundation; the APIs and read model are ready for a separately reviewed responsive UI.

## العربية

### الحدود

تم تطوير هوية `workspace_branch_references` الحالية لتصبح الفرع التشغيلي دون إنشاء هوية منافسة. تبقى قيم `branchId` ومراجع نطاق الفروع في الهوية ثابتة. يضيف الفرع اسم عرض واحداً كما أدخلته مساحة العمل، ورمزاً ثابتاً وفريداً داخل مساحة العمل، وحالة `Active` أو `Inactive`، وترتيباً، وطوابع زمنية، ورقم مراجعة تفاؤلياً. يبقى الفرع غير النشط قابلاً للحل تاريخياً وتبقى كل سجلاته التشغيلية محفوظة.

تبقى هوية المنتج وأسعار التجزئة والجملة الأساسية على مستوى مساحة العمل داخل الكتالوج. يخزن إعداد عرض المنتج في الفرع `Listed` أو `Unlisted` فقط، ويعني غياب الإعداد `NotConfigured` وبالتالي غير معروض. لا يؤدي العرض إلى إنشاء المخزون أو السعر ولا يؤدي إلغاء العرض إلى حذفهما. يمكن وجود مخزون لمنتج غير معروض. يحتفظ المنتج المؤرشف بالتاريخ وتُرفض عملياته العادية الجديدة في الفرع.

المخزون مجال مستقل. يخزن سجل حركات غير قابل للتعديل ورصيداً مشتقاً تتم صيانته داخل المعاملة لكل مساحة عمل وفرع ومنتج. الرصيد لقطة تشغيلية وليس حقيقة قابلة للتحرير المباشر. لا تعرض عقود المستودعات أي عملية لتعديل حركة ملتزمة أو حذفها.

### نموذج الكمية والتزامن

وحدة الإصدار الأول الوحيدة هي `Piece` الصحيحة. تنتقل الكميات عبر HTTP كسلاسل عشرية موجبة وتُحفظ في PostgreSQL بصيغة `BIGINT`. يحدد نوع الحركة الاتجاه، وتطبق المعادلة والقيود التالية:

```text
available = onHand - reserved - damaged
onHand >= 0
reserved >= 0
damaged >= 0
available >= 0
```

يشمل `onHand` القطع التالفة الموجودة فعلياً. يزيد الحجز `reserved`، ويخفض تنفيذ الحجز كلاً من `reserved` و`onHand`، ويغير التلف `damaged`، ولا يسمح الصرف العادي بأن تصبح الكمية المتاحة سالبة. التصحيح حركة تعويضية صريحة ولا يعيد كتابة التاريخ.

تملك طبقة التطبيق حدود المعاملة. ينشئ PostgreSQL صف الرصيد أو يقفله باستخدام `SELECT ... FOR UPDATE`، وتقفل التحويلات رصيدي الفرعين بترتيب ثابت لمعرف الفرع. يؤدي فشل أي خطوة حفظ في التحويل إلى إجهاض المعاملة المالكة، فلا يمكن اعتماد رصيد واحد أو حركة أو سجل تدقيق أو مطالبة عملية بصورة جزئية. يُحفظ معرف العملية المقيد بمساحة العمل مع بصمة SHA-256 للطلب. تعيد المحاولة الناجحة المطابقة النتيجة المحفوظة، بينما يُرفض أمر مختلف يستخدم المعرف نفسه؛ ولا تترك المحاولة المجهضة مطالبة، لذا يمكن تنفيذها مجددًا.

### التسعير والرؤية

تُعاد استخدام أعمدة التجزئة والجملة الموجودة في المنتج كمصدر أساسي وحيد على مستوى مساحة العمل. تملك التكلفة المرجعية صفاً محمياً خاصاً بالمنتج لأنها لم تكن مخزنة سابقاً. أنواع تجاوز الفرع ثابتة: `Retail` و`Wholesale` و`ReferenceCost`. يعني غياب التجاوز وراثة السعر الأساسي الحالي مباشرة. الحذف الصريح يزيل إعداد التجاوز الحالي فقط، أما الصفر فهو قيمة مالية حقيقية.

تستخدم الأموال وحدات صغرى غير سالبة بصيغة `BIGINT` ضمن حد عقد الأموال الحالي، مع عملة ISO 4217. ينقل HTTP قيمة `amountMinor` كسلسلة عشرية. تتحقق طبقة التطبيق من سجل ISO الثابت في المهمة 3.16 ومن تفعيل العملة داخل مساحة العمل.

لا يظهر سعر الجملة دون `pricing.wholesale.view`، ولا تظهر التكلفة المرجعية دون `referenceCost.view`، ولا تتضمن بيانات تدقيق التكلفة مبلغها. تتطلب كتابة تجاوز الفرع الصلاحية المطابقة ونطاق الفرع الموثوق. يجمع نموذج قراءة منتج الفرع حالة العرض والمخزون والتسعير المرشح حسب الصلاحيات دون وضع قواعد العمل في React.

تطبق قراءات وطلبات Product Entry الحالية صلاحيات الرؤية نفسها على أسعار التجزئة والجملة. وعند التعديل، يُحفظ السعر المحجوب عن الممثل من المنتج المحمل بدلاً من مسحه بسبب غياب حقل المتصفح.

### التفويض وHTTP

يحل كل مسار `TrustedActorContext` على الخادم، ولا يأخذ مساحة العمل أو الممثل أو الصلاحيات أو نطاق الفروع من المتصفح. يجب أن يشمل نطاق الموظف كل فرع مستهدف، ويتطلب التحويل المصدر والوجهة معاً. تستخدم الأهداف خارج النطاق أو التابعة لمساحة أخرى نتيجة عدم وجود لا تكشف المعلومات. ترفض الطفرات الجلسات المقيدة والطلبات المخالفة لسياسة المصدر نفسه.

تضيف المهمة 3.17 مسارات Typed لدورة حياة الفرع والعرض والاستلام والصرف والحجز والتحرير والتنفيذ والتلف والاستعادة والتحويل والتصحيح وقراءات المخزون والأسعار الأساسية وتجاوزات الفروع والحذف الصريح. لا يوجد مسار عام بإجراء اعتباطي ولا توجد عملية ضبط مباشر للكمية. لم تُضف واجهة إدارة في هذا الأساس؛ أصبحت واجهات API ونموذج القراءة جاهزة لواجهة متجاوبة تُراجع كمهمة مستقلة.
