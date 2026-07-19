# ADR-003: Product Domain Events | أحداث مجال المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

**Context:** Important lifecycle facts need explicit names without prematurely choosing integration infrastructure.
**Decision:** Product records `ProductCreated`, `ProductSavedAsDraft`, `ProductPublished`, `ProductArchived`, and `ProductRestored`. No Event Bus is selected or implemented.
**Alternatives considered:** no events; infrastructure messages emitted directly by UI/services; implementing a bus now.
**Consequences:** domain facts are testable and infrastructure-neutral.
**Risks:** consumers may assume delivery semantics that do not exist.
**Future implications:** dispatch, persistence, notifications, and integrations need separate decisions.

## العربية

**السياق:** تحتاج حقائق دورة الحياة المهمة إلى أسماء صريحة دون اختيار بنية تكامل مبكراً.
**القرار:** يسجل المنتج الأحداث المذكورة، ولا يتم اختيار أو تنفيذ Event Bus.
**البدائل:** عدم استخدام الأحداث، أو إرسال رسائل بنية تحتية من الواجهة والخدمات، أو تنفيذ ناقل الآن.
**النتائج:** حقائق قابلة للاختبار ومستقلة عن التقنية.
**المخاطر:** افتراض ضمانات تسليم غير موجودة.
**المستقبل:** التوزيع والحفظ والتنبيهات والتكاملات تحتاج قرارات مستقلة.

