# ADR-010: Stable Product Media Storage Paths | مسارات تخزين وسائط المنتج الثابتة

**Status:** Accepted  
**Date:** 2026-07-21

## English

### Context
Product owns image identity and metadata; image binaries belong to Infrastructure. Operators need understandable paths that ordinary Product edits cannot break.

### Decision
Files remain outside PostgreSQL. PostgreSQL stores internal ImageId, stable StorageKey, order, main state, alt text, and future canonical metadata only. Future physical storage follows `Workspace → stable Department storage segment → Product folder → image files`. The folder is created lazily on first upload; an image-less Product creates no folder. Its readable name uses ProductCode when available (otherwise stable ProductId) plus a Product-name slug.

After creation, the folder and existing StorageKeys remain stable. Name, code, Department, Category, Product Type, and lifecycle changes neither rename nor move it. Files use predictable names (`main.webp`, `gallery-01.webp`, `gallery-02.webp`); ImageId remains in PostgreSQL and files are not automatically renumbered. Expected StorageKeys detect missing files; checksum/metadata detect manual replacement. Future URLs may use checksum or image revision for cache invalidation. Reorganization is a future controlled administrative use case.

Task 3.14.5 implements metadata persistence and documentation only. It performs no folder creation, file I/O, upload, synchronization, variant generation, or physical storage.

### Alternatives considered
Database binary/Base64 storage, edit-driven mutable paths, and opaque random physical filenames were rejected.

### Consequences and risks
Stable paths simplify backup and recovery but may preserve historical names. External replacement needs checksum reconciliation; a future adapter must ensure lazy, collision-safe folder creation.

## العربية

### السياق
يمتلك المنتج هوية الصورة وبياناتها الوصفية، بينما يقع تخزين الملف الثنائي ضمن البنية التحتية. ويجب ألا تكسر تعديلات المنتج المسارات المقروءة.

### القرار
تبقى الملفات خارج PostgreSQL، وتخزن القاعدة ImageId وStorageKey الثابت والترتيب وحالة الصورة الرئيسية والنص البديل والبيانات المعتمدة فقط. يتبع التخزين الفيزيائي المستقبلي `مساحة العمل ← مقطع القسم الثابت ← مجلد المنتج ← ملفات الصور`. يُنشأ المجلد عند أول رفع فقط ولا ينشأ لمنتج بلا صور. يستخدم الاسم ProductCode عند توفره وإلا ProductId الثابت مع slug من الاسم.

يبقى المجلد ومفاتيح التخزين ثابتة بعد الإنشاء، ولا تعيد تغييرات المنتج تسميته أو نقله. تستخدم الملفات أسماء متوقعة مثل `main.webp` و`gallery-01.webp`، ويبقى ImageId في PostgreSQL ولا يعاد الترقيم تلقائياً. تكشف المفاتيح الملفات المفقودة ويكشف checksum الاستبدال، ويمكن استخدامه أو مراجعة الصورة لكسر التخزين المؤقت. إعادة التنظيم حالة إدارية لاحقة.

تنفذ المهمة 3.14.5 البيانات الوصفية والتوثيق فقط، ولا تنشئ مجلدات أو تنفذ رفعاً أو قراءة أو كتابة أو مزامنة أو نسخاً مشتقة.

### البدائل
رُفض التخزين الثنائي أو Base64، والمسارات المتغيرة مع التعديل، والأسماء الفيزيائية العشوائية.

### النتائج والمخاطر
تسهل المسارات الثابتة النسخ والاستعادة لكنها قد تحتفظ بأسماء تاريخية. يحتاج الاستبدال إلى checksum، ويجب أن يضمن المحوّل المستقبلي إنشاءً كسولاً بلا تعارض.
