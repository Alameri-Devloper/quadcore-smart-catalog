# Product Lifecycle Foundation | أساس دورة حياة المنتج

**Status:** Accepted architecture; not implemented by this task
**Last Updated:** 2026-07-19
**Scope:** Catalog lifecycle

## English

Product is the Aggregate Root and identity is `ProductId`, `WorkspaceId`, and `CatalogId`; there is no `LifecycleId`. States are Draft, Published, and Archived. Allowed transitions are Draft → Published, Published → Archived, and Archived → Published. Published → Draft, Archived → Draft, and Draft → Archived are forbidden in the current scope. Published Products never become Draft automatically.

The UI offers one `Save Product` action. `ProductSavePolicy` preserves valid work. If Workspace configuration `autoPublishReadyProducts` is true (Quadcore expected default), Smart Save & Publish asks `ProductPublicationPolicy` whether publication is allowed. When rules are not met, the Domain blocks publication but saves a valid Draft; the UI never decides lifecycle. `ProductArchivePolicy` and `ProductRestorePolicy` govern archive and restore.

Events are `ProductCreated`, `ProductSavedAsDraft`, `ProductPublished`, `ProductArchived`, and `ProductRestored`. They are domain facts; no Event Bus is in current scope. Approval, revisions, version history, audit, notifications, and integrations are future capabilities.

## العربية

المنتج هو Aggregate Root وهويته `ProductId` و`WorkspaceId` و`CatalogId` ولا يوجد `LifecycleId`. الحالات هي Draft وPublished وArchived. الانتقالات المسموحة: من Draft إلى Published، ومن Published إلى Archived، ومن Archived إلى Published. بقية الانتقالات المذكورة أعلاه غير مسموحة حالياً، ولا يعود المنتج المنشور إلى Draft تلقائياً.

تعرض الواجهة إجراءً واحداً هو `Save Product`. تحفظ `ProductSavePolicy` العمل الصحيح. وعندما يكون إعداد مساحة العمل `autoPublishReadyProducts` مفعلاً، وهو الافتراضي المتوقع في Quadcore، تستشير Smart Save & Publish سياسة النشر. إذا لم تتحقق قواعد النشر يمنع المجال النشر لا الحفظ، فيُحفظ Draft صالح، ولا تقرر الواجهة الحالة. تضبط سياسات الأرشفة والاستعادة الانتقالات الأخرى.

الأحداث حقائق مجال ولا يوجد Event Bus في النطاق الحالي. الموافقات والمراجعات والإصدارات والتدقيق والتنبيهات والتكاملات قدرات مستقبلية.

## Related Documents | الوثائق المرتبطة

- [ADR-001](../ADR/ADR-001-Product-Lifecycle.md)
- [Lifecycle policies](../../02-Domain/Product-Lifecycle-Policies.md)
- [Invisible lifecycle UX](../ADR/ADR-004-Invisible-Product-Lifecycle-UX.md)

