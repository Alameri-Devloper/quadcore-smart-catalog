# ADR-001: Product Lifecycle | دورة حياة المنتج

**Status:** Accepted · **Last Updated:** 2026-07-19

**Supersedes:** [ADR-0005: Product Lifecycle and Soft Delete](../../ADR/ADR-0005-Product-Lifecycle-and-Soft-Delete.md)
**يستبدل:** [ADR-0005: دورة حياة المنتج والحذف المنطقي](../../ADR/ADR-0005-Product-Lifecycle-and-Soft-Delete.md)

## English

**Context:** Products need preservation, publication, withdrawal, and restoration without exposing enterprise complexity.
**Decision:** Product owns Draft, Published, and Archived states. Allow Draft→Published, Published→Archived, Archived→Published; forbid other current transitions. Smart Save & Publish uses Workspace configuration and Domain policies; publication failure preserves a valid Draft.
**Alternatives considered:** separate Draft table; UI-owned state; blocking all saves until publishable.
**Consequences:** one aggregate and one save action; policies require explicit tests.
**Risks:** readiness rules could be inconsistent or accidentally interpreted by UI.
**Future implications:** approvals, revisions, audit, and versions require later ADRs.

## العربية

**السياق:** يحتاج المنتج إلى الحفظ والنشر والسحب والاستعادة دون كشف التعقيد.
**القرار:** يملك المنتج حالات Draft وPublished وArchived والانتقالات المعتمدة فقط. تستخدم عملية الحفظ الذكي إعداد مساحة العمل وسياسات المجال، وإذا تعذر النشر تُحفظ مسودة صالحة.
**البدائل:** جدول منفصل للمسودات، أو قرار الحالة في الواجهة، أو منع الحفظ حتى اكتمال النشر.
**النتائج:** تجميع واحد وإجراء حفظ واحد مع ضرورة اختبار السياسات.
**المخاطر:** اختلاف قواعد الجاهزية أو تسرب القرار إلى الواجهة.
**المستقبل:** الموافقات والمراجعات والتدقيق والإصدارات تحتاج قرارات لاحقة.
