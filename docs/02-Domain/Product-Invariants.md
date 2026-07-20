# Product Invariants | ثوابت المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Product rules

## English

Product identity is immutable and tenant-scoped. Specification values must correspond to resolved definitions. Lifecycle transitions follow approved policies. Images have one main image at most. Inventory is excluded. Calculated readiness is not persisted as source of truth. A valid Draft is preserved even when publication is blocked.

A Draft may omit classification, commercial content, pricing, specifications, and images. Provided references and text must be non-empty. Money uses non-negative integer minor units and normalized currency. Specification Field IDs, Product Image IDs, and image orders are unique; a non-empty image collection has exactly one Main Image. Catalog availability remains separate from lifecycle. Controlled content changes preserve identity, lifecycle, and `CreatedAt`; effective no-ops do not change `UpdatedAt`.

`ProductTypeId` is an optional immutable Catalog reference. Product Type remains distinct from Category, Device Class, and Specification Values; Product never owns its definition. The V1 template-resolution order is governed by [ADR-006](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md) and is not an Aggregate behavior.

Product Revision starts at 0, including initial composition. Each effective content mutation and successful lifecycle transition increments it once; no-op, failed, rejected, and event-read operations do not. Rehydration requires an explicit non-negative safe integer Revision. Publish and restore require an immutable policy-issued approved decision bound to the same Product ID and current pre-transition Revision. Wrong-Product, stale, denied, or fabricated decisions and invalid transitions leave the complete Aggregate and event collection unchanged. Archive is valid only from Published; restoration is valid only from Archived and requires fresh evaluation after archive.

Product Code is optional for Draft and has one immutable canonical representation: surrounding whitespace is removed and case is normalized to uppercase. Equivalent case variants compare equally. When present, Product Code must be unique across the complete Workspace regardless of Catalog or lifecycle state; archive does not release it. Atomic persistence enforcement is authoritative. Product Identity fixes Workspace ownership, and Repository update uses the persisted Revision observed at load time to prevent lost updates.

## العربية

هوية المنتج ثابتة ومقيدة بالمستأجر. يجب أن تطابق قيم المواصفات التعريفات المحلولة. تتبع انتقالات الحالة السياسات المعتمدة، ولا توجد أكثر من صورة رئيسية. المخزون خارج المنتج، والجاهزية المحسوبة ليست مصدراً مخزناً للحقيقة، وتحفظ المسودة الصالحة عند تعذر النشر.

يجوز أن تخلو Draft من التصنيف والمحتوى التجاري والتسعير والمواصفات والصور. يجب ألا تكون المراجع والنصوص المقدمة فارغة. يستخدم Money وحدات صغرى صحيحة غير سالبة ورمز عملة normalized. تكون معرفات حقول المواصفات ومعرفات الصور وترتيباتها فريدة، وتحتوي مجموعة الصور غير الفارغة صورة رئيسية واحدة بالضبط. تبقى حالة توفر Catalog منفصلة عن دورة الحياة. تحافظ تغييرات المحتوى المضبوطة على الهوية ودورة الحياة و`CreatedAt`، ولا تغير العملية غير المؤثرة `UpdatedAt`.

يمثل `ProductTypeId` مرجع Catalog ثابتاً واختيارياً. يبقى Product Type مستقلاً عن Category وDevice Class وقيم المواصفات، ولا يملك Product تعريفه. يحكم [ADR-006](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md) ترتيب حل القالب في V1، ولا يعد ذلك سلوكاً داخل Aggregate.

تبدأ Product Revision من 0 وتشمل التركيب الأولي. تزيد مرة واحدة مع كل تغيير محتوى مؤثر وكل انتقال ناجح في دورة الحياة، ولا تزيدها العملية غير المؤثرة أو الفاشلة أو المرفوضة ولا قراءة الأحداث. تتطلب إعادة البناء مراجعة صريحة تكون عدداً صحيحاً آمناً وغير سالب. يتطلب النشر والاستعادة قراراً ثابتاً ومعتمداً صادراً عن السياسة ومرتبطاً بمعرف Product نفسه والمراجعة الحالية قبل الانتقال. تترك القرارات الخاصة بمنتج آخر أو القديمة أو المرفوضة أو المصطنعة والانتقالات غير الصالحة Aggregate كاملاً ومجموعة أحداثه دون تغيير. لا تصح الأرشفة إلا من Published، ولا تصح الاستعادة إلا من Archived وبعد تقييم جديد تالٍ للأرشفة.

يبقى Product Code اختيارياً في Draft وله تمثيل معتمد وثابت واحد؛ تزال المسافات المحيطة وتُطبّع حالة الأحرف إلى الأحرف الكبيرة، وتتساوى المتغيرات المختلفة في حالة الأحرف. عندما يوجد يجب أن يكون فريداً عبر Workspace كاملاً بصرف النظر عن Catalog أو حالة دورة الحياة، ولا تحرره الأرشفة. يمثل الإنفاذ الذري عند التخزين الضمان المعتمد. تثبت هوية Product ملكية Workspace، ويستخدم تحديث Repository المراجعة المخزنة التي شوهدت عند التحميل لمنع فقدان التحديثات.

