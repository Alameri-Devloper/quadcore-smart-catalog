# Product Images | صور المنتج

**Status:** Architecture direction · **Last Updated:** 2026-07-19 · **Scope:** Image boundary

## English

Product owns image identity, ordering, main-image selection, and metadata. Infrastructure owns binary storage. Entry must preserve recoverable user work; temporary Draft storage and advanced image processing remain future decisions.

Canonical Product images contain `ProductImageId`, an opaque storage reference, unique order, Main status, and optional alternative text. They never contain browser `File`/`Blob` objects, preview URLs, upload state, or binary data. A Product with images has exactly one Main Image; an incomplete Draft may have none.

## العربية

يملك المنتج هوية الصور وترتيبها واختيار الصورة الرئيسية وبياناتها، بينما تملك البنية التحتية تخزين الملفات. يجب أن يحافظ الإدخال على العمل القابل للاستعادة؛ أما التخزين المؤقت للمسودة والمعالجة المتقدمة فقرارات مستقبلية.

تحتوي صورة Product المعتمدة على `ProductImageId` ومرجع تخزين مبهم وترتيب فريد وحالة الصورة الرئيسية ونص بديل اختياري. ولا تحتوي كائنات `File` أو `Blob` الخاصة بالمتصفح أو روابط المعاينة أو حالة الرفع أو البيانات الثنائية. يملك المنتج الذي يحتوي صوراً صورة رئيسية واحدة بالضبط، بينما يجوز ألا تحتوي المسودة غير المكتملة أي صورة.

