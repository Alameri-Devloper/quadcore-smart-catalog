# ADR-012: Product Media Root Registry and Local Storage Foundation | سجل جذور وسائط المنتج وأساس التخزين المحلي

**Status:** Accepted · **Date:** 2026-07-23

## English

### Context

Product image metadata belongs to the Product Aggregate, but physical media location and file operations have different consistency, provider, and lifecycle concerns. Stable storage paths must not move when mutable Product naming, classification, or lifecycle changes.

### Decision

Catalog owns an independent immutable `ProductMediaRoot` registry, not Product business state. PostgreSQL stores one root per Workspace/Product and requires every root key to be globally unique inside the configured provider namespace. Cross-Workspace conflicts reveal no tenant identity. The composite Product foreign key uses `ON DELETE RESTRICT`; roots have find/create only and are created lazily by a future workflow. Existing Products receive no fake backfill.

Canonical relative roots use `workspaces/{immutable-workspace-segment}/{department-segment}/{readable-reference}--{stable-product-id-segment}`. Unsafe Workspace IDs use a stable SHA-256 segment. Department resolution is a port; absent Department at first creation persists `unclassified` and does not relocate later. ProductCode is preferred for readability, Product name is the fallback, and unusable or Arabic-only text becomes `product`. The ProductId-derived suffix prevents slug collisions and Windows filename rules are enforced.

Slots are stable: `main.webp` and `gallery-01.webp` through `gallery-99.webp`. Strict final, staging, and trash key types enforce one Product root and their exact namespaces. `_variants` is reserved and unusable; variants are not generated. Uploaded names never become storage filenames.

Provider-neutral ports use `Uint8Array`. The V1 adapter uses one application server and configured local media storage under `QSC_MEDIA_ROOT`; it validates parent and leaf containment without following links/junctions, handles concurrent directory creation, stages exclusively on the same filesystem, syncs and hashes stored normalized bytes, and promotes without overwriting. Final bytes must match staged checksum, length, media type, and dimensions before staging is removed. Failed verification removes only the new final link and preserves staging; replacement explicitly backs up to trash and attempts restoration. Unexpected I/O raises a sanitized infrastructure error rather than masquerading as missing or unsafe input. No permanent-delete operation exists and no database/filesystem distributed transaction is claimed.

The direct sharp `0.35.3` adapter applies a deterministic JPEG/PNG/WebP signature gate before decoding and parses WebP RIFF animation metadata. A validated immutable configuration rejects invalid limits before processing. Accepted images auto-rotate, limit decoded pixels and dimensions without upscaling, convert to sRGB, strip unnecessary metadata, preserve transparency, and emit non-animated WebP near quality 82. SVG, GIF, animated WebP, BMP, TIFF, HEIC/HEIF, corrupt, and unknown data are rejected.

The retained hard-link design requires every operation to remain below one `QSC_MEDIA_ROOT` on the same filesystem/volume, and that filesystem must support hard links. A supported compatible Linux filesystem is the production V1 expectation. Windows support is accepted only after the hosted compatibility workflow passes. The media tree is a trusted boundary: untrusted OS users/processes must not receive write access, and no protection is claimed against a hostile local administrator.

### Consequences and future work

V1 is limited to a single application server with local media storage and does not support horizontal scaling. The focused Windows/Ubuntu workflow provides compatibility evidence only after hosted runs occur. A future provider-neutral object-storage adapter can implement the same ports. Task 3.14.8 owns root-creation orchestration, database/filesystem compensation, upload/replace/remove coordination, Product image metadata updates, and reconciliation.

## العربية

### السياق

تنتمي بيانات الصور الوصفية إلى Product Aggregate، لكن موقع الملفات وعملياتها لها اتساق ومزوّد ودورة حياة مختلفة. يجب ألا تتحرك مسارات التخزين عند تغير اسم المنتج أو تصنيفه أو حالته.

### القرار

يملك Catalog سجلاً مستقلاً وثابتاً باسم `ProductMediaRoot` ولا يصبح جزءاً من حالة Product. تخزن PostgreSQL جذراً واحداً لكل Workspace/Product وتفرض تفرد كل مفتاح جذر عالمياً داخل مساحة مزود التخزين، من دون كشف هوية مستأجر آخر عند التعارض. يستخدم المفتاح الخارجي المركب `ON DELETE RESTRICT`، ولا يعرض المستودع إلا find/create، ويُنشأ الجذر لاحقاً عند الحاجة من سير عمل مستقبلي. لا تُنشأ جذور وهمية للمنتجات الحالية.

تستخدم الجذور النسبية المعتمدة الصيغة `workspaces/{immutable-workspace-segment}/{department-segment}/{readable-reference}--{stable-product-id-segment}`. تتحول معرفات Workspace غير الآمنة إلى مقطع SHA-256 ثابت. يُحل Department عبر منفذ، ويُحفظ `unclassified` عند غيابه وقت الإنشاء الأول ولا يُنقل الجذر لاحقاً. يُفضل ProductCode للقراءة ثم اسم Product، ويُستخدم `product` للنص غير القابل للاستخدام أو العربي فقط، ويمنع المقطع المشتق من ProductId تصادم الأسماء ويلتزم بقيود Windows.

الفتحات ثابتة: `main.webp` و`gallery-01.webp` حتى `gallery-99.webp`. تفرض أنواع مستقلة للمفتاح النهائي وstaging وtrash الجذر نفسه ومساحة الاسم الصحيحة. تبقى `_variants` محجوزة وغير قابلة للاستخدام، ولا تُستخدم أسماء الملفات المرفوعة.

تستخدم المنافذ المحايدة `Uint8Array`. يعتمد V1 خادم تطبيق واحداً وتخزيناً محلياً مضبوطاً عبر `QSC_MEDIA_ROOT`. يتحقق المحول من المجلدات والملف النهائي بلا اتباع الروابط الرمزية أو junction، ويتحمل إنشاء المجلدات المتزامن، ويكتب حصرياً في staging ثم يتحقق من بصمة وطول ونوع وأبعاد الملف النهائي قبل حذف staging. يحذف فشل التحقق الرابط النهائي الجديد فقط ويحفظ نسخة الاسترداد، وتظهر أعطال I/O غير المتوقعة كخطأ بنية تحتية منقح. يأخذ الاستبدال نسخة إلى trash ويحاول الاستعادة. لا توجد عملية حذف نهائي ولا ادعاء بمعاملة موزعة بين PostgreSQL ونظام الملفات.

يطبق محول sharp المباشر بالإصدار `0.35.3` بوابة توقيع حتمية لـJPEG وPNG وWebP ويحلل بنية RIFF للحركة، كما يرفض إعداد المعالجة غير الصالح قبل فك الصورة. يصحح الاتجاه ويحد البكسلات والأبعاد بلا تكبير ويحّول إلى sRGB ويحذف البيانات غير اللازمة ويحفظ الشفافية وينتج WebP غير متحرك بجودة تقارب 82. تُرفض SVG وGIF وWebP المتحرك وBMP وTIFF وHEIC/HEIF والبيانات التالفة أو المجهولة.

### النتائج والعمل المستقبلي

يقتصر V1 على خادم تطبيق واحد مع تخزين وسائط محلي ولا يدعم التوسع الأفقي. لا يصبح سير توافق Windows/Ubuntu دليلاً مستضافاً إلا بعد تشغيله فعلياً. يمكن مستقبلاً إضافة محول object storage محايد للمزوّد. تملك المهمة 3.14.8 تنسيق إنشاء الجذر والتعويض بين القاعدة والملفات وعمليات الرفع والاستبدال والإزالة وتحديث بيانات صور Product والتوفيق.
