# Persistence Boundaries | حدود التخزين

**Status:** Direction; Supabase later · **Last Updated:** 2026-07-19 · **Scope:** Repositories

## English

Components never access databases. Application services depend on persistence-agnostic repository contracts; Infrastructure implements them. Every operation is tenant- and Workspace-scoped. Domain entities contain no database concerns. Current mock data remains in mock folders; no schema or migration is introduced here.

## العربية

لا تصل المكونات إلى قاعدة البيانات. تعتمد خدمات التطبيق على عقود مستودعات مستقلة عن التقنية وتنفذها البنية التحتية. تقيد كل عملية بالمستأجر ومساحة العمل، ولا تحتوي كيانات المجال تفاصيل قاعدة البيانات. تبقى البيانات الحالية في مجلدات mock ولا تضيف هذه الوثيقة مخططاً أو ترحيلاً.

