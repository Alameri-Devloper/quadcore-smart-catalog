# Product Lifecycle Foundation | أساس دورة حياة المنتج

**Status:** Accepted architecture; core transitions implemented
**Last Updated:** 2026-07-19
**Scope:** Catalog lifecycle

## English

Product is the Aggregate Root and identity is `ProductId`, `WorkspaceId`, and `CatalogId`; there is no `LifecycleId`. States are Draft, Published, and Archived. Allowed transitions are Draft → Published, Published → Archived, and Archived → Published. Published → Draft, Archived → Draft, and Draft → Archived are forbidden in the current scope. Published Products never become Draft automatically.

Every structurally valid canonical Product may be persisted as Draft; a `ProductSavePolicy` is not currently required because no separate save-specific business rule exists. Persistence and Smart Save orchestration remain Application concerns. `ProductPublicationPolicy` evaluates already resolved requirements and returns all structured readiness failures without mutating Product. A current approved decision bound to Product ID and Revision is required for publish and restore. Archive has no variable authorization rule and is a controlled Aggregate transition, so no empty archive or restore policy class is introduced.

The implemented events are `ProductCreated`, `ProductPublished`, `ProductArchived`, and `ProductRestored`. They are Domain facts; no Event Bus is in current scope. `ProductSavedAsDraft` remains an approved event name for a future save workflow, not an event raised by current Aggregate mutations. Product Revision protects publication decisions and is not Product Version History. Approval workflows, history, audit, notifications, and integrations remain future capabilities.

### Smart Save lifecycle
Smart Save preserves incomplete Drafts, publishes ready Drafts, archives incomplete Published Products with `PublicationRequirementsNotMet`, restores only those automatic archives, and never auto-restores `Manual` archives.

## العربية

### دورة حياة الحفظ الذكي
يحفظ الحفظ الذكي المسودات الناقصة وينشر الجاهزة ويؤرشف المنشور الناقص آلياً، ويستعيد الأرشفة الآلية فقط ولا يستعيد الأرشفة اليدوية تلقائياً.

المنتج هو Aggregate Root وهويته `ProductId` و`WorkspaceId` و`CatalogId` ولا يوجد `LifecycleId`. الحالات هي Draft وPublished وArchived. الانتقالات المسموحة: من Draft إلى Published، ومن Published إلى Archived، ومن Archived إلى Published. بقية الانتقالات المذكورة أعلاه غير مسموحة حالياً، ولا يعود المنتج المنشور إلى Draft تلقائياً.

يجوز حفظ كل Product معتمد وصحيح بنيوياً كمسودة، ولا تلزم `ProductSavePolicy` حالياً لعدم وجود قاعدة عمل مستقلة خاصة بالحفظ. يبقى الحفظ وتنسيق Smart Save من مسؤوليات Application. تقيّم `ProductPublicationPolicy` متطلبات محلولة مسبقاً وتعيد كل أسباب عدم الجاهزية المنظمة دون تغيير Product. يتطلب النشر والاستعادة قراراً حالياً معتمداً مرتبطاً بمعرف Product ومراجعته. لا توجد قاعدة تفويض متغيرة للأرشفة، ولذلك يضبط Aggregate الانتقال مباشرة ولا تُنشأ فئات سياسات فارغة للأرشفة أو الاستعادة.

الأحداث المنفذة هي `ProductCreated` و`ProductPublished` و`ProductArchived` و`ProductRestored`، وهي حقائق Domain ولا يوجد Event Bus في النطاق الحالي. يبقى `ProductSavedAsDraft` اسماً معتمداً لسير حفظ مستقبلي وليس حدثاً ترفعه تغييرات Aggregate الحالية. تحمي Product Revision قرارات النشر وليست Product Version History. تبقى مسارات الموافقة والتاريخ والتدقيق والتنبيهات والتكاملات قدرات مستقبلية.

## Related Documents | الوثائق المرتبطة

- [ADR-001](../ADR/ADR-001-Product-Lifecycle.md)
- [Lifecycle policies](../../02-Domain/Product-Lifecycle-Policies.md)
- [Invisible lifecycle UX](../ADR/ADR-004-Invisible-Product-Lifecycle-UX.md)
- [ADR-007: Product Revision and Publication Decision Integrity](../ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)

