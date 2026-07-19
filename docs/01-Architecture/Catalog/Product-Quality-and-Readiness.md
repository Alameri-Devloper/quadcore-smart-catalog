# Product Quality and Readiness | جودة المنتج وجاهزيته

**Status:** Architecture direction · **Last Updated:** 2026-07-19 · **Scope:** Calculated indicators

## English

Quality Score, Ready to Save, and Ready for Customer are calculated from current definitions and policies, never persisted as Product truth. A structurally valid Draft may be saved without being ready for customers. Publication readiness is implemented by `ProductPublicationPolicy`, which evaluates caller-supplied immutable requirements and returns all structured missing-requirement reasons. The decision is bound to Product ID and Revision and is never persisted as Product truth. Template resolution, Quality Score changes, and fair scoring across different templates remain deferred.

## العربية

تحسب درجة الجودة والجاهزية للحفظ والجاهزية للعميل من التعريفات والسياسات الحالية ولا تخزن كحقيقة داخل المنتج. يجوز حفظ Draft الصحيح بنيوياً دون أن يكون جاهزاً للعميل. تنفذ `ProductPublicationPolicy` جاهزية النشر بتقييم متطلبات ثابتة يمررها المستدعي، وتعيد كل الأسباب المنظمة للمتطلبات الناقصة. يرتبط القرار بمعرف Product ومراجعته ولا يخزن كحقيقة داخل Product. يبقى حل القالب وتغيير Quality Score وعدالة القياس بين القوالب مؤجلاً.

## Related Documents | الوثائق المرتبطة

- [ADR-007: Product Revision and Publication Decision Integrity](../ADR/ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)
- [Product Lifecycle Policies](../../02-Domain/Product-Lifecycle-Policies.md)

