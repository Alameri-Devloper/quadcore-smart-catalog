# Persistence Boundaries | حدود التخزين

**Status:** Accepted boundary; PostgreSQL adapter implemented · **Last Updated:** 2026-07-21 · **Scope:** Repositories

## English

`catalog_product_media_roots` is an immutable Catalog registry with Workspace/Product identity, provider-global root-key uniqueness, anonymous cross-tenant conflicts, strict root shape, and an `ON DELETE RESTRICT` Product reference. It stores relative keys only; normalized bytes remain in provider-neutral storage. No update/delete repository operation or cross-resource transaction is defined.

Components never access databases. Application services depend on persistence-agnostic repository ports; Infrastructure implements them. `ProductRepository` is the single canonical Product Aggregate persistence port. `findById` is explicitly scoped by `WorkspaceId`; create and update use the immutable Workspace scope in Product Identity. The port returns canonical Products and typed expected outcomes, never persistence DTOs or ORM models.

Create and update are distinct. Create atomically enforces Product ID and Workspace-wide canonical Product Code uniqueness. Update replaces the complete Aggregate only when stored Revision equals the expected persisted Revision observed at load time, and also enforces Product Code uniqueness atomically. Product Code remains reserved when Archived and is never keyed by Catalog. Unexpected infrastructure failures remain failures rather than business results.

Infrastructure adapters map the complete Product Aggregate to and from their private persistence representation, preserving identity, lifecycle, Revision, timestamps, classification, commercial details, minor-unit Money, specification values, image metadata, and canonical Product Code. Repository operations never pull or dispatch Domain Events. The repository contract itself selects no database, ORM, schema, mapper, Outbox, or migration.

### Product archive reason
PostgreSQL persists nullable `archive_reason`. A named CHECK requires a supported value for Archived and NULL for Draft or Published. Migration `0001` maps legacy Archived rows to `Manual`; optimistic concurrency is unchanged.

## العربية

يمثل `catalog_product_media_roots` سجل Catalog ثابتاً بهوية Workspace/Product وتفرد عالمي لمفتاح الجذر داخل المزود وتعارض مجهول الهوية بين المستأجرين وبنية جذر صارمة ومرجع Product يستخدم `ON DELETE RESTRICT`. يخزن مفاتيح نسبية فقط، وتبقى البايتات المعالجة في تخزين محايد للمزوّد. لا توجد عملية update/delete في المستودع ولا معاملة موزعة بين الموردين.

### سبب أرشفة المنتج
يخزن PostgreSQL الحقل `archive_reason`. يفرض قيد مسمى سبباً معتمداً للحالة Archived وNULL للحالتين الأخريين. يصنف الترحيل `0001` السجلات القديمة كـ `Manual` دون تغيير التزامن التفاؤلي.

لا تصل المكونات إلى قاعدة البيانات. تعتمد خدمات Application على منافذ مستودعات مستقلة عن التقنية وتنفذها Infrastructure. يمثل `ProductRepository` منفذ تخزين Product Aggregate المعتمد الوحيد. يتقيد `findById` صراحة بـ`WorkspaceId`، ويستخدم الإنشاء والتحديث نطاق Workspace الثابت في هوية Product. يعيد المنفذ Products المعتمدة ونتائج متوقعة typed، ولا يكشف DTOs التخزين أو نماذج ORM.

الإنشاء والتحديث عمليتان منفصلتان. يفرض الإنشاء ذرياً تفرد معرف Product وProduct Code المعتمد عبر Workspace. لا يستبدل التحديث Aggregate كاملاً إلا عندما تطابق المراجعة المخزنة المراجعة المتوقعة التي شوهدت عند التحميل، ويفرض كذلك تفرد Product Code ذرياً. يبقى Product Code محجوزاً عند الأرشفة ولا يستخدم Catalog جزءاً من مفتاحه. تبقى أعطال Infrastructure غير المتوقعة أخطاء وليست نتائج أعمال.

تحول محولات Infrastructure تجميع Product كاملاً من تمثيل التخزين الخاص بها وإليه، وتحافظ على الهوية ودورة الحياة والمراجعة والأوقات والتصنيف والتفاصيل التجارية وMoney بوحداته الصغرى وقيم المواصفات وبيانات الصور وProduct Code المعتمد. لا تسحب عمليات Repository أحداث Domain ولا ترسلها. يبقى عقد المستودع نفسه مستقلاً عن قاعدة البيانات وORM والمخطط وmapper وOutbox وmigration.

## Related Documents | الوثائق المرتبطة

- [ADR-008: Product Repository Contract and Optimistic Concurrency](../01-Architecture/ADR/ADR-008-Product-Repository-Contract-and-Optimistic-Concurrency.md)
- [Product Aggregate](../01-Architecture/Catalog/Product-Aggregate.md)
- [ADR-009: Provider-Neutral PostgreSQL Product Persistence](../01-Architecture/ADR/ADR-009-Provider-Neutral-PostgreSQL-Product-Persistence.md)
- [PostgreSQL Development](../05-Development/PostgreSQL-Development.md)

The implemented Infrastructure adapter uses Drizzle ORM and one `pg` pool configured by `DATABASE_URL`. Its Hybrid Relational Schema persists the complete Aggregate transactionally, enforces composite Workspace ownership and Workspace-wide ProductCode uniqueness, and stores image metadata only. | يستخدم المحوّل المنفذ Drizzle وPool واحداً من `pg` يضبطه `DATABASE_URL`، ويخزن التجميع كاملاً ذرياً مع عزل مساحة العمل وتفرد ProductCode وبيانات الصور الوصفية فقط.

## Product Media Local Filesystem Contract | عقد نظام الملفات المحلي لوسائط المنتج

The V1 adapter uses hard links. `QSC_MEDIA_ROOT` must be one directory tree on one filesystem/volume, and that filesystem must support hard links. Production V1 is expected to use a compatible supported Linux filesystem. Windows compatibility is proven only by the hosted Windows workflow, not by local execution alone.

Untrusted operating-system users and processes must not have write access to the media tree. Path validation does not protect against a hostile local administrator or another privileged process. Only the trusted QSC service identity and trusted operational tooling may write there.

يستخدم محول الإصدار الأول الروابط الصلبة. يجب أن يكون `QSC_MEDIA_ROOT` شجرة مجلدات واحدة على نظام ملفات/وحدة تخزين واحدة تدعم الروابط الصلبة. يتوقع تشغيل الإصدار الأول في الإنتاج على نظام ملفات Linux مدعوم ومتوافق. ولا تثبت توافقية Windows إلا عبر مسار العمل المستضاف، وليس بالتشغيل المحلي وحده.

يجب منع مستخدمي وعمليات نظام التشغيل غير الموثوقة من الكتابة داخل شجرة الوسائط. لا تحمي فحوص المسارات من مسؤول محلي عدائي أو عملية أخرى ذات صلاحيات مرتفعة. يسمح بالكتابة لهوية خدمة QSC الموثوقة وأدوات التشغيل الموثوقة فقط.

