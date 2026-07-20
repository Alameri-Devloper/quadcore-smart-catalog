# Persistence Boundaries | حدود التخزين

**Status:** Accepted boundary; technology deferred · **Last Updated:** 2026-07-19 · **Scope:** Repositories

## English

Components never access databases. Application services depend on persistence-agnostic repository ports; Infrastructure implements them. `ProductRepository` is the single canonical Product Aggregate persistence port. `findById` is explicitly scoped by `WorkspaceId`; create and update use the immutable Workspace scope in Product Identity. The port returns canonical Products and typed expected outcomes, never persistence DTOs or ORM models.

Create and update are distinct. Create atomically enforces Product ID and Workspace-wide canonical Product Code uniqueness. Update replaces the complete Aggregate only when stored Revision equals the expected persisted Revision observed at load time, and also enforces Product Code uniqueness atomically. Product Code remains reserved when Archived and is never keyed by Catalog. Unexpected infrastructure failures remain failures rather than business results.

Future adapters map the complete Product Aggregate to and from their private persistence representation, preserving identity, lifecycle, Revision, timestamps, classification, commercial details, minor-unit Money, specification values, image metadata, and canonical Product Code. Repository operations never pull or dispatch Domain Events. No database, ORM, schema, mapper, Outbox, or migration is selected or implemented by this contract.

## العربية

لا تصل المكونات إلى قاعدة البيانات. تعتمد خدمات Application على منافذ مستودعات مستقلة عن التقنية وتنفذها Infrastructure. يمثل `ProductRepository` منفذ تخزين Product Aggregate المعتمد الوحيد. يتقيد `findById` صراحة بـ`WorkspaceId`، ويستخدم الإنشاء والتحديث نطاق Workspace الثابت في هوية Product. يعيد المنفذ Products المعتمدة ونتائج متوقعة typed، ولا يكشف DTOs التخزين أو نماذج ORM.

الإنشاء والتحديث عمليتان منفصلتان. يفرض الإنشاء ذرياً تفرد معرف Product وProduct Code المعتمد عبر Workspace. لا يستبدل التحديث Aggregate كاملاً إلا عندما تطابق المراجعة المخزنة المراجعة المتوقعة التي شوهدت عند التحميل، ويفرض كذلك تفرد Product Code ذرياً. يبقى Product Code محجوزاً عند الأرشفة ولا يستخدم Catalog جزءاً من مفتاحه. تبقى أعطال Infrastructure غير المتوقعة أخطاء وليست نتائج أعمال.

تحول المحولات المستقبلية Product Aggregate كاملاً من تمثيل التخزين الخاص بها وإليه، وتحافظ على الهوية ودورة الحياة والمراجعة والأوقات والتصنيف والتفاصيل التجارية وMoney بوحداته الصغرى وقيم المواصفات وبيانات الصور وProduct Code المعتمد. لا تسحب عمليات Repository أحداث Domain ولا ترسلها. لا يحدد هذا العقد قاعدة بيانات أو ORM أو مخططاً أو mapper أو Outbox أو migration ولا ينفذها.

## Related Documents | الوثائق المرتبطة

- [ADR-008: Product Repository Contract and Optimistic Concurrency](../01-Architecture/ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md)
- [Product Aggregate](../01-Architecture/Catalog/Product-Aggregate.md)

