# ADR-007: Product Revision and Publication Decision Integrity | مراجعة المنتج وسلامة قرار النشر

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

### Context

Publication readiness is calculated from Product content and supplied requirements. A decision can become unsafe when it is applied to another Product or after the evaluated Product changes. The Aggregate therefore needs a Domain-owned change marker before repository persistence and optimistic concurrency are introduced.

### Decision

Product owns an immutable `ProductRevision` value. A new Product starts at Revision 0, including any composition supplied at creation. Rehydration requires an explicit persisted non-negative safe integer. Each effective content mutation and each successful lifecycle transition increments Revision exactly once. No-op, rejected, or failed operations and Domain Event reads do not increment it.

`ProductPublicationPolicy` receives an already resolved immutable `ProductPublicationRequirements` value and evaluates the current canonical Product without mutation. It returns every applicable structured reason code. Its controlled immutable decision is bound to the Product ID and the Revision evaluated. Publish and restore accept only an approved policy-issued decision whose bindings match the Product immediately before transition. A denied, fabricated, wrong-Product, or stale decision is rejected before mutation.

Required classification and commercial fields are typed collections. Required Specification Field IDs are unique and deterministic. The image requirement is either none or Main Image required. Template resolution, Workspace configuration loading, persistence, and UI message formatting remain outside the policy.

### Stale-decision scenario

If Product `P` is approved at Revision 4 and its content then changes, `P` becomes Revision 5. The Revision 4 decision cannot publish or restore Revision 5. An Archived Product also increments Revision when archived, so a pre-archive approval cannot restore it; the current Archived revision must be evaluated again.

### Alternatives considered

- A mutable approval boolean was rejected because it has no Product or Revision binding.
- Binding only to Product ID was rejected because it permits stale approvals after content changes.
- Timestamps were rejected as the decision marker because they do not express a monotonic Domain mutation count.
- Cryptographic tokens and infrastructure authorization services were rejected as unnecessary for this in-process Domain invariant.
- Product Version History was deferred because it is a separate audit and history capability.

### Consequences

Publication and restoration are protected from stale readiness results. Existing content mutation methods must distinguish effective changes from no-ops and preserve atomicity at the safe-integer limit. Persistence mapping must store and explicitly restore Revision when it is introduced.

### Risks

Any future mutation path that bypasses the Aggregate or fails to increment Revision could invalidate decision integrity. Requirements resolved from stale external configuration remain an Application orchestration concern; this ADR protects the Product snapshot evaluated, not configuration freshness.

### Future implications

Product Revision is expected to become the optimistic concurrency value at the Repository and persistence boundary. That use requires a later contract for compare-and-save behavior. Product Revision is not a user-visible version and is not Product Version History; audit snapshots, history browsing, rollback, and version labels require separate decisions.

## العربية

### السياق

تُحسب جاهزية النشر من محتوى Product والمتطلبات الممررة. قد يصبح القرار غير آمن إذا استُخدم لمنتج آخر أو بعد تغيير المنتج الذي جرى تقييمه. لذلك يحتاج Aggregate إلى مؤشر تغيير يملكه Domain قبل إضافة الحفظ في Repository والتحكم بالتزامن المتفائل.

### القرار

يملك Product كائن القيمة الثابت `ProductRevision`. يبدأ المنتج الجديد بالمراجعة 0، وتشمل هذه المراجعة أي تركيب يمرر عند الإنشاء. تتطلب إعادة البناء قيمة مخزنة صريحة تكون عدداً صحيحاً آمناً وغير سالب. تزيد المراجعة مرة واحدة بالضبط مع كل تغيير محتوى مؤثر وكل انتقال ناجح في دورة الحياة. لا تزيدها العمليات غير المؤثرة أو المرفوضة أو الفاشلة ولا قراءة أحداث المجال.

تتلقى `ProductPublicationPolicy` قيمة `ProductPublicationRequirements` ثابتة ومحلولة مسبقاً، وتقيّم المنتج المعتمد الحالي دون تغييره، وتعيد كل رموز الأسباب المنظمة المنطبقة. يرتبط قرارها الثابت والمضبوط بمعرف المنتج والمراجعة التي جرى تقييمها. لا يقبل النشر والاستعادة إلا قراراً معتمداً صادراً عن السياسة وتطابق ارتباطاته المنتج مباشرة قبل الانتقال. يُرفض القرار المرفوض أو المصطنع أو الخاص بمنتج آخر أو القديم قبل أي تغيير.

تُمثل حقول التصنيف والحقول التجارية المطلوبة بمجموعات typed، وتكون معرفات حقول المواصفات المطلوبة فريدة وحتمية. متطلب الصور إما بلا متطلب أو يتطلب صورة رئيسية. يبقى حل القالب وتحميل إعداد Workspace والحفظ وصياغة رسائل الواجهة خارج السياسة.

### سيناريو القرار القديم

إذا اعتُمد المنتج `P` عند المراجعة 4 ثم تغير محتواه، يصبح عند المراجعة 5 ولا يجوز لقرار المراجعة 4 نشر المراجعة 5 أو استعادتها. كما تزيد المراجعة عند أرشفة المنتج، ولذلك لا يصلح اعتماد سابق للأرشفة لاستعادته؛ يجب تقييم المراجعة الحالية المؤرشفة من جديد.

### البدائل المدروسة

- رُفضت قيمة موافقة boolean قابلة للتغيير لأنها لا ترتبط بمنتج أو مراجعة.
- رُفض الارتباط بمعرف المنتج وحده لأنه يسمح باعتماد قديم بعد تغيير المحتوى.
- رُفض استخدام الوقت كمؤشر قرار لأنه لا يعبر عن عداد متزايد لتغييرات Domain.
- رُفضت الرموز المشفرة وخدمات التفويض في البنية التحتية لعدم ضرورتها لهذا الثابت داخل Domain.
- أُجل Product Version History لأنه قدرة مستقلة للتدقيق والتاريخ.

### النتائج

يحمي ذلك النشر والاستعادة من نتائج الجاهزية القديمة. يجب أن تميز طرق تغيير المحتوى الحالية التغيير المؤثر من العملية غير المؤثرة، وأن تحافظ على الذرية عند حد العدد الصحيح الآمن. يجب أن يخزن تحويل الحفظ المراجعة ويعيدها صراحة عند تنفيذه مستقبلاً.

### المخاطر

قد يخل أي مسار تغيير مستقبلي يتجاوز Aggregate أو لا يزيد المراجعة بسلامة القرار. تبقى المتطلبات المحلولة من إعداد خارجي قديم مسؤولية تنسيق Application؛ يحمي هذا القرار لقطة Product التي جرى تقييمها ولا يضمن حداثة الإعداد.

### الآثار المستقبلية

يُتوقع أن تصبح Product Revision قيمة التحكم بالتزامن المتفائل عند حدود Repository والحفظ، ويحتاج ذلك إلى عقد لاحق للمقارنة والحفظ. Product Revision ليست إصداراً ظاهراً للمستخدم وليست Product Version History؛ تتطلب لقطات التدقيق واستعراض التاريخ والاسترجاع وتسميات الإصدارات قرارات مستقلة.

## Related Documents | الوثائق المرتبطة

- [ADR-001: Product Lifecycle](ADR-001-Product-Lifecycle.md)
- [ADR-002: Product Aggregate](ADR-002-Product-Aggregate.md)
- [ADR-003: Product Domain Events](ADR-003-Product-Domain-Events.md)
- [Product Lifecycle Foundation](../Catalog/Product-Lifecycle-Foundation.md)
- [Product Quality and Readiness](../Catalog/Product-Quality-and-Readiness.md)
