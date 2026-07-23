# Product Lifecycle Policies | سياسات دورة حياة المنتج

**Status:** Accepted architecture · **Last Updated:** 2026-07-19 · **Scope:** Policy responsibilities

## English

Every structurally valid canonical Product may be persisted as Draft, so no `ProductSavePolicy` class is currently required. `ProductPublicationPolicy` is the implemented variable Domain policy: it receives already resolved immutable requirements, evaluates current Product content, and returns an immutable decision with all structured reasons, Product ID, and evaluated Revision. It performs no mutation, event recording, loading, or Template resolution.

Draft→Published and Archived→Published require a current approved publication decision. Published→Archived is enforced directly by the Aggregate because no variable archive authorization rule exists. No ceremonial `ProductArchivePolicy` or `ProductRestorePolicy` class is implemented. The UI may render reason codes through translated Presentation messages but never decides lifecycle.

### Smart Save matrix
Incomplete Draft stays Draft; ready Draft publishes. Ready Published stays Published; incomplete Published is saved and auto-archived. Automatic archive restores only when ready; Manual archive always remains Archived.

## العربية

### مصفوفة الحفظ الذكي
تبقى المسودة الناقصة وتُنشر الجاهزة. يبقى المنشور الجاهز ويُحفظ ويؤرشف الناقص. تُستعاد الأرشفة الآلية عند الجاهزية فقط، وتبقى اليدوية مؤرشفة دائماً.

يجوز حفظ كل Product معتمد وصحيح بنيوياً كمسودة، ولذلك لا تلزم فئة `ProductSavePolicy` حالياً. تمثل `ProductPublicationPolicy` سياسة Domain المتغيرة المنفذة؛ فهي تتلقى متطلبات ثابتة محلولة مسبقاً، وتقيّم محتوى Product الحالي، وتعيد قراراً ثابتاً يحتوي كل الأسباب المنظمة ومعرف Product والمراجعة التي جرى تقييمها. لا تغير المنتج ولا تسجل حدثاً ولا تحمل بيانات ولا تحل Template.

يتطلب الانتقال من Draft إلى Published ومن Archived إلى Published قرار نشر حالياً ومعتمداً. يفرض Aggregate الانتقال من Published إلى Archived مباشرة لعدم وجود قاعدة تفويض متغيرة للأرشفة. لا تنفذ فئات `ProductArchivePolicy` أو `ProductRestorePolicy` شكلية. يجوز للواجهة عرض رموز الأسباب برسائل مترجمة في Presentation، لكنها لا تقرر دورة الحياة.

## Related Documents | الوثائق المرتبطة

- [ADR-007: Product Revision and Publication Decision Integrity](../01-Architecture/ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)
- [Product Lifecycle Foundation](../01-Architecture/Catalog/Product-Lifecycle-Foundation.md)

