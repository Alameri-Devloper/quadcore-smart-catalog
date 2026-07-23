# ADR-011: Smart Save and Product Archive Reason | الحفظ الذكي وسبب أرشفة المنتج

**Status:** Accepted
**Date:** 2026-07-22

## English

### Context
Employees need one `Save Product` action without learning lifecycle mechanics. Valid incomplete work must be preserved while public Catalog eligibility remains truthful. Archive intent must be distinguishable so automation never reverses a manual decision. Workspace scope, optimistic concurrency, and committed Domain Events must remain trustworthy.

### Decision
The Application owns one Smart Save use case with explicit Create and Update commands. It obtains WorkspaceId from a trusted `WorkspaceContext`, loads updates within that Workspace, and resolves current Domain-owned publication requirements on every execution. It applies edits only through Product construction and controlled Aggregate methods.

New and Draft Products remain Draft when incomplete and publish automatically when ready. A Published Product that becomes incomplete is persisted and archived with `PublicationRequirementsNotMet`. Such a Product restores automatically when ready again. A Product archived with `Manual` remains Archived regardless of readiness. Archived Products require exactly one immutable `ProductArchiveReason`; Draft and Published Products have none. Archive and restore events carry the relevant reason.

One repository write occurs per execution. Updates use the Revision observed at load; conflicts are returned structurally without retry or merge. Domain Events remain queued until persistence succeeds and are then pulled exactly once into an Application execution envelope. Conflicts expose no committed events. Product Entry UI integration is explicitly deferred.

### Alternatives considered
Separate Save/Publish buttons, rejecting incomplete published edits, implicit archive reasons, automatically restoring all archives, trusting command WorkspaceId, caching requirements, retrying conflicts, and introducing an Event Bus or Outbox were rejected.

### Consequences
The experience stays simple while lifecycle and tenancy rules remain explicit. Valid edits are durable even when readiness falls. PostgreSQL stores `archive_reason` with a named lifecycle CHECK. Callers handle typed outcomes and committed events separately.

### Risks
Requirements resolution may fail and prevents persistence. Concurrent updates return a conflict that a later UI task must reconcile. Legacy Archived rows are deterministically classified as Manual because prior intent was not recorded.

## العربية

### السياق
يحتاج الموظف إلى إجراء واحد هو `Save Product` دون تعلّم تفاصيل دورة الحياة. يجب حفظ العمل الصحيح غير المكتمل مع إبقاء أهلية العرض العام دقيقة، وتمييز الأرشفة اليدوية عن الآلية حتى لا يعكس النظام قراراً يدوياً.

### القرار
تملك طبقة التطبيق حالة استخدام واحدة للحفظ الذكي بأمرين صريحين للإنشاء والتحديث. تحصل على WorkspaceId من `WorkspaceContext` موثوق، وتحمّل المنتج ضمن مساحة العمل نفسها، وتحل متطلبات النشر الحالية في كل تنفيذ، وتطبق التغييرات عبر إنشاء المنتج وعمليات Aggregate المضبوطة فقط.

يبقى المنتج الجديد أو المسودة مسودة عند النقص ويُنشر تلقائياً عند الجاهزية. يُحفظ المنتج المنشور ثم يُؤرشف بسبب `PublicationRequirementsNotMet` إذا أصبح ناقصاً، ويُستعاد تلقائياً عند اكتماله. أما الأرشفة بسبب `Manual` فلا تُستعاد آلياً. يتطلب المنتج المؤرشف سبباً واحداً، ولا تحمل المسودة أو المنتج المنشور سبب أرشفة. تحمل أحداث الأرشفة والاستعادة السبب المناسب.

توجد كتابة واحدة في المستودع لكل تنفيذ. يستخدم التحديث Revision الذي شوهد عند التحميل، وتُعاد التعارضات دون إعادة محاولة أو دمج. لا تُسحب أحداث المجال إلا بعد نجاح الحفظ، ثم تُعاد مرة واحدة داخل غلاف تنفيذ تملكه طبقة التطبيق. تكامل واجهة Product Entry مؤجل صراحة.

### البدائل المدروسة
رُفضت أزرار الحفظ والنشر المنفصلة، ورفض تعديل منشور ناقص، والأسباب الضمنية، والاستعادة الآلية لكل الأرشيف، والثقة بمساحة عمل قادمة من الأمر، وتخزين المتطلبات مؤقتاً، وإعادة محاولة التعارض، وإنشاء Event Bus أو Outbox.

### النتائج
تبقى التجربة بسيطة مع صراحة قواعد دورة الحياة والعزل. تُحفظ التعديلات الصحيحة حتى عند انخفاض الجاهزية، ويخزن PostgreSQL الحقل `archive_reason` مع قيد مسمى.

### المخاطر
فشل حل المتطلبات يمنع الحفظ. تعارض التزامن يحتاج معالجة واجهة لاحقة. تُصنف السجلات المؤرشفة القديمة كـ `Manual` لأن النية السابقة لم تكن مسجلة.
