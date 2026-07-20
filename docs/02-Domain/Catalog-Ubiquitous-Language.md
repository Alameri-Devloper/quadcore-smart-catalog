# Catalog Ubiquitous Language | لغة الكتالوج الموحدة

**Status:** Active · **Last Updated:** 2026-07-19 · **Scope:** Catalog terminology

## English

Catalog terminology follows the [constitutional language](../00-Constitution/Ubiquitous-Language.md). Department groups Categories; Category is a broad commercial family; Product Type is a functional or structural subtype inside Category; Device Class describes intended use or market segment; Specifications describe technical characteristics. Product Model remains a reusable model, and Product stores classification references and selected values rather than definition entities. See [ADR-006](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md).

**Product Revision** is the Domain-owned non-negative mutation counter used to bind publication decisions and support future optimistic concurrency. It is not Product Version History. **Publication Requirements** are already resolved required classification fields, commercial fields, Specification Field IDs, and image requirement supplied to the Domain. **Publication Decision** is the immutable result bound to Product ID and evaluated Revision. **Stale Decision** is a decision whose evaluated Revision no longer matches the current Product Revision.

**Product Code** is the optional canonical Workspace-wide identifier stored on Product commercial details; surrounding whitespace is removed and case is normalized to uppercase. It remains reserved when Product is Archived. **Expected Persisted Revision** is the Revision observed when an Aggregate was loaded and supplied to Repository update, not the Aggregate's newer post-mutation Revision. **Revision Conflict** means the expected and actual stored Revisions differ, so newer data must not be overwritten. **Product Repository** is the persistence port for complete canonical Product Aggregates, not a database model.

## العربية

تتبع مصطلحات Catalog اللغة الدستورية. يجمع Department فئات Category، وتمثل Category عائلة تجارية واسعة، ويمثل Product Type نوعاً وظيفياً أو بنيوياً داخلها، وتصف Device Class الاستخدام المقصود أو الشريحة السوقية، وتصف Specifications الخصائص التقنية. يبقى Product Model نموذجاً قابلاً لإعادة الاستخدام، ويخزن Product مراجع التصنيف والقيم المحددة لا كيانات التعريف. راجع [ADR-006](../01-Architecture/ADR/ADR-006-Product-Classification-Taxonomy.md).

**Product Revision** هي عداد التغييرات غير السالب الذي يملكه Domain ويستخدم لربط قرارات النشر ودعم التحكم بالتزامن المتفائل مستقبلاً، وليست Product Version History. **Publication Requirements** هي حقول التصنيف والحقول التجارية ومعرفات حقول المواصفات ومتطلب الصور المحلولة مسبقاً والممررة إلى Domain. **Publication Decision** هو النتيجة الثابتة المرتبطة بمعرف Product والمراجعة التي جرى تقييمها. **Stale Decision** هو القرار الذي لم تعد مراجعته المقيمة تطابق مراجعة Product الحالية.

**Product Code** هو المعرف الاختياري المعتمد عبر Workspace والمخزن في التفاصيل التجارية لـProduct؛ تزال المسافات المحيطة وتُطبّع حالة الأحرف إلى الأحرف الكبيرة، ويبقى محجوزاً عند أرشفة Product. **Expected Persisted Revision** هي المراجعة التي شوهدت عند تحميل Aggregate ومُررت إلى تحديث Repository، وليست مراجعة Aggregate الأحدث بعد التغيير. يعني **Revision Conflict** اختلاف المراجعة المتوقعة عن المراجعة المخزنة الفعلية، ولذلك لا يجوز استبدال البيانات الأحدث. يمثل **Product Repository** منفذ تخزين Product Aggregates المعتمدة كاملة وليس نموذج قاعدة بيانات.

