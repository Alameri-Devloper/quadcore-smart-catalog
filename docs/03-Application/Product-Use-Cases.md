# Product Use Cases | حالات استخدام المنتج

**Status:** Architecture direction · **Last Updated:** 2026-07-19 · **Scope:** Product application flows

## English

Primary use cases are start/resume Product Entry, resolve definitions, validate input, save Product, publish when policy permits, archive, restore, and view Product. Application services provide Workspace context and repository contracts; Domain returns outcomes and events; UI displays guidance and recovery.

Future Product persistence use cases depend on the canonical `ProductRepository` port. They call explicit create or update, retain the persisted Revision observed at load time, and pass it as `expectedPersistedRevision` after Domain mutations. They handle typed Product ID, Product Code, not-found, and Revision conflicts; unexpected Infrastructure failures remain failures. Only after successful persistence may Application pull Domain Events for future dispatch. Product Code availability remains advisory and is not currently part of the port.

## العربية

حالات الاستخدام الرئيسية هي بدء إدخال المنتج أو استكماله، وحل التعريفات، والتحقق، والحفظ، والنشر عند سماح السياسة، والأرشفة، والاستعادة، والعرض. توفر خدمات التطبيق سياق مساحة العمل وعقود المستودعات، ويعيد المجال النتائج والأحداث، وتعرض الواجهة الإرشاد والاستعادة.

تعتمد حالات استخدام تخزين Product المستقبلية على منفذ `ProductRepository` المعتمد. تستدعي الإنشاء أو التحديث صراحة، وتحتفظ بالمراجعة المخزنة التي شوهدت عند التحميل، ثم تمررها كـ`expectedPersistedRevision` بعد تغييرات Domain. تعالج تعارضات معرف Product وProduct Code وعدم العثور والمراجعة عبر نتائج typed، بينما تبقى أعطال Infrastructure غير المتوقعة أخطاء. لا يجوز لـApplication سحب أحداث Domain للإرسال المستقبلي إلا بعد نجاح التخزين. يبقى استعلام توفر Product Code إرشادياً وليس جزءاً حالياً من المنفذ.

## Related Documents | الوثائق المرتبطة

- [ADR-008: Product Repository Contract and Optimistic Concurrency](../01-Architecture/ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md)
- [Persistence Boundaries](../04-Infrastructure/Persistence-Boundaries.md)

