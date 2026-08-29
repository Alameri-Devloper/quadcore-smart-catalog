# Direct Device Sharing | المشاركة المباشرة عبر الجهاز

## English

### Boundary

`domains/catalog/sharing` is a read-oriented Catalog application boundary. It prepares one customer-facing Product payload from canonical PostgreSQL Product, persisted specification, Branch listing, effective price, Inventory balance, and approved Product Media data. It creates no public URL, share record, analytics, delivery receipt, recipient data, or migration. Repositories query PostgreSQL directly and never call another repository. Route handlers validate transport input and map typed outcomes; React coordinates device capabilities only.

### Authorization and tenant isolation

Every lookup begins with `TrustedActorContext.workspaceId`. Payload creation requires `catalog.sharing.create` and `catalog.products.view`. Retail additionally requires `pricing.view`; Wholesale requires `pricing.wholesale.view`. Browser input contains only `branchId?`, `priceMode`, and `locale`; it never supplies Workspace/actor authority, money, media paths, or URLs. Requested Branches must be in the trusted actor scope and active in the same Workspace. Foreign or unauthorized resources receive non-disclosing not-found outcomes. Normal sharing accepts Published Products only, and Branch sharing requires an explicit `Listed` Product.

### Customer-safe payload

The application returns a dedicated DTO rather than reusing Product Details. It includes the stable Product ID, bounded Product name/code, selected Retail or Wholesale money as the unchanged `amountMinor` HTTP decimal string, optional Branch display name, optional `InStock`/`OutOfStock`, up to six useful persisted specifications in Product position order, generated plain text, and an optional authenticated media descriptor. Customer-readable text formats the bigint amount into major units using the canonical ISO 4217 `minorUnitDigits`, preserving required trailing zeroes without `Number` or floating-point arithmetic. Official N.A. Minor Unit currencies return `UnsupportedCurrencyForDirectShare` and no guessed price text. The DTO never serializes Reference Cost, numeric Inventory quantities, Workspace IDs, storage keys, checksums, media workflow data, audit data, permissions, internal notes, or private member data. Zero money remains distinct from missing money; missing requested money returns `PriceUnavailable` and never falls back to another price mode.

### Text policy

System-owned labels are fixed for `ar` and `en`. Dynamic Product, Branch, and specification display values are not translated or rewritten. Product names/codes/Branch names are accepted intact up to 160 Unicode code points; specification labels and units are included intact up to 80 and 24, specification values are bounded to 160, and the final message is bounded to 2,000. Overlong identity/display fields make the payload ineligible or the specification non-useful rather than silently changing its identity. Money is never truncated. The first six useful persisted specifications are selected by persisted Product position, then display name; current template membership is not consulted.

### Media and platform behavior

The payload exposes only an authenticated same-origin route for the current approved main WebP. Download revalidates sharing/Product authority, same-Workspace Product ownership, Published lifecycle, main-media membership, canonical identity-bound storage keys, filesystem containment, WebP signature, checksum, and an 8 MiB maximum. Missing or failed media degrades to text without changing Product or price data.

The browser adapter resolves `navigator` lazily only from the explicit share interaction, so component construction and server/prerender rendering do not evaluate browser-only globals. It uses `navigator.share` when available and includes a prepared `File` only when `navigator.canShare({ files })` accepts it. Native `AbortError` is `Cancelled`, not a failure. Without Web Share it tries Clipboard; Clipboard failure exposes an accessible selectable text area. Preparation and native sharing are separate explicit buttons so the share call occurs directly from user activation. No target application, WhatsApp installation, recipient, public URL, or delivery is assumed.

Task 3.20 embeds the existing `DirectProductShare` on canonical Product Details. The former single Wholesale boolean could not safely express Wholesale-only authority, so the Presentation contract now accepts an allow-list of `Retail` and/or `Wholesale` modes. That allow-list comes only from the trusted server-derived Details capability; raw permissions are never copied into browser state and authorized price-field presence is not treated as sharing authority. Reference Cost and exact Inventory never enter the share component. Preparation, explicit native share, cancellation, Clipboard, manual text, and text-only media degradation remain unchanged.

### تكامل المهمة 3.20

تدمج المهمة 3.20 المكوّن الحالي `DirectProductShare` داخل صفحة تفاصيل المنتج المعتمدة. لم يكن المتغير المنطقي السابق الخاص بالجملة قادراً على تمثيل صلاحية الجملة دون التجزئة بأمان، لذلك يقبل عقد العرض الآن قائمة مسموحة من `Retail` و/أو `Wholesale`. تأتي هذه القائمة حصراً من قدرة مشتقة على الخادم من السياق الموثوق وأهلية المنتج والفرع؛ ولا تُنسخ الصلاحيات الخام إلى حالة المتصفح ولا يُعامل مجرد ظهور السعر على أنه صلاحية مشاركة. لا تدخل التكلفة المرجعية أو كميات المخزون الدقيقة إلى مكوّن المشاركة. بقيت خطوتا التجهيز ثم المشاركة الصريحة، والإلغاء، والحافظة، والنص اليدوي، والتحول إلى نص فقط عند فشل الوسائط دون تغيير.

## العربية

### الحدود

تمثل الوحدة `domains/catalog/sharing` حدًا قرائيًا داخل مجال الكتالوج. تجهّز حمولة منتج واحدة موجهة للعميل من بيانات المنتج والمواصفات المحفوظة وحالة الإدراج في الفرع والسعر الفعلي ورصيد المخزون ووسائط المنتج المعتمدة في PostgreSQL. لا تنشئ رابطًا عامًا أو سجل مشاركة أو تحليلات أو إيصال تسليم أو بيانات مستلم أو ترحيلًا جديدًا. تستعلم المستودعات من PostgreSQL مباشرة ولا تستدعي مستودعات أخرى، بينما تتحقق مسارات HTTP من النقل فقط وتنسّق React قدرات الجهاز فقط.

### التفويض وعزل مساحات العمل

يبدأ كل استعلام من `TrustedActorContext.workspaceId`. يتطلب تجهيز الحمولة صلاحيتي `catalog.sharing.create` و`catalog.products.view`. تتطلب مشاركة التجزئة `pricing.view`، وتتطلب مشاركة الجملة `pricing.wholesale.view`. لا يرسل المتصفح إلا `branchId?` و`priceMode` و`locale`، ولا يرسل مساحة العمل أو هوية الممثل أو الصلاحيات أو قيمة السعر أو مسار الوسائط أو رابطًا اعتباطيًا. يجب أن يكون الفرع المطلوب ضمن النطاق الموثوق ونشطًا في مساحة العمل نفسها. تعاد نتيجة غير كاشفة للموارد الأجنبية أو غير المصرح بها. تقبل المشاركة العادية المنتجات المنشورة فقط، وتتطلب المشاركة بسياق فرع حالة `Listed` صريحة.

### حمولة آمنة للعميل

يعيد التطبيق DTO مخصصًا ولا يعيد استخدام تفاصيل المنتج الداخلية. تتضمن الحمولة معرّف المنتج المستقر والاسم والرمز المقيدين والسعر المختار مع إبقاء `amountMinor` كنص عشري أصلي عبر HTTP واسم الفرع الاختياري وحالة `InStock` أو `OutOfStock` الاختيارية وحتى ست مواصفات محفوظة مرتبة حسب موضعها في المنتج ونصًا عاديًا مولدًا ووصفًا اختياريًا لمسار وسائط موثّق. ينسق النص المقروء للعميل قيمة `bigint` إلى وحدات رئيسية وفق `minorUnitDigits` المعيارية لعملة ISO 4217 مع حفظ الأصفار الكسرية المطلوبة ومن دون `Number` أو حساب عشري عائم. تعيد العملات ذات الوحدة الصغرى الرسمية N.A. النتيجة `UnsupportedCurrencyForDirectShare` ولا يُعرض سعر مفترض. لا تتضمن الحمولة أبدًا التكلفة المرجعية أو كميات المخزون الرقمية أو معرّفات مساحة العمل أو مفاتيح التخزين أو البصمات أو بيانات سير عمل الوسائط أو التدقيق أو الصلاحيات أو الملاحظات الداخلية أو بيانات الأعضاء الخاصة. يبقى السعر صفرًا مختلفًا عن السعر المفقود، ويعيد غياب السعر المطلوب `PriceUnavailable` من دون استبدال وضع سعر بآخر.

### سياسة النص

تقتصر تسميات النظام على `ar` و`en`. لا تُترجم أسماء المنتجات والفروع والمواصفات الديناميكية ولا يعاد تشكيلها. تُقبل أسماء المنتجات ورموزها وأسماء الفروع كاملة حتى 160 محرف Unicode، وتُدرج تسمية المواصفة ووحدتها كاملة حتى 80 و24، وتُقيد قيمة المواصفة إلى 160، والرسالة النهائية إلى 2000. تجعل حقول الهوية أو العرض المفرطة الحمولة غير مؤهلة أو المواصفة غير مفيدة بدل تغيير الهوية بصمت. لا تُقتطع القيم المالية. تُختار أول ست مواصفات محفوظة ومفيدة وفق موضعها في المنتج ثم اسم العرض، من دون الاعتماد على عضوية القالب الحالية.

### الوسائط وسلوك المنصة

لا تعرض الحمولة إلا مسارًا موثّقًا من الأصل نفسه لملف WebP الرئيسي المعتمد حاليًا. يعيد التنزيل التحقق من صلاحيات المشاركة وعرض المنتج وملكية مساحة العمل وحالة النشر وعضوية الوسيط الرئيسي والمفاتيح المقيدة بالهوية واحتواء المسار وتوقيع WebP والبصمة وحد أقصى قدره 8 MiB. يؤدي غياب الوسائط أو فشلها إلى المشاركة النصية من دون تغيير بيانات المنتج أو السعر.

يحل محول المتصفح `navigator` بصورة كسولة عند تفاعل المشاركة الصريح فقط، لذلك لا يقيّم إنشاء المكوّن أو عرضه المسبق على الخادم المتغيرات العامة الخاصة بالمتصفح. يستخدم `navigator.share` عند توفره، ولا يضيف الملف المجهز إلا إذا قبل `navigator.canShare({ files })` ذلك. يُعامل `AbortError` على أنه `Cancelled` محايد. عند غياب Web Share يحاول الحافظة، وعند فشلها يعرض مربع نص قابلًا للتحديد ويمكن الوصول إليه. يفصل العرض بين التجهيز والمشاركة الأصلية بزرين صريحين كي يحدث استدعاء المشاركة من تفعيل مباشر للمستخدم. لا يفترض التطبيق وجود تطبيق معين أو WhatsApp أو مستلم أو رابط عام أو نجاح التسليم.
