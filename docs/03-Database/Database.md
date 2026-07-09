# Database

# قاعدة البيانات

## English

Database integration is planned for a later phase. Supabase is the planned database platform, but it must be introduced only after architecture approval.

Until then, catalog data should remain in mock files and be accessed through repositories.

## العربية

تكامل قاعدة البيانات مخطط لمرحلة لاحقة. Supabase هي منصة قاعدة البيانات المخطط لها، لكن يجب إدخالها فقط بعد اعتماد المعمارية.

إلى ذلك الوقت، يجب أن تبقى بيانات الكتالوج داخل ملفات mock ويتم الوصول إليها عبر المستودعات.

## Rules | القواعد

- Components must not call the database directly.
- Repositories own data access.
- Services own business logic.
- Tenant boundaries must be preserved in every query.
- Mock data must stay in mock folders until replaced by repositories connected to the database.

- لا يجب أن تتصل المكونات بقاعدة البيانات مباشرة.
- المستودعات مسؤولة عن الوصول للبيانات.
- الخدمات مسؤولة عن منطق العمل.
- يجب الحفاظ على حدود المستأجر في كل استعلام.
- يجب أن تبقى البيانات الوهمية داخل مجلدات mock إلى أن تستبدل بمستودعات متصلة بقاعدة البيانات.

## Tenant Ownership | ملكية المستأجر

Every database table should support the business hierarchy:

يجب أن يدعم كل جدول في قاعدة البيانات التسلسل التجاري:

```text
Company
  -> Workspace
  -> Department
  -> Category
  -> Product Model
  -> Product
```

## Future Supabase Guidance | توجيهات Supabase المستقبلية

When Supabase is added, create repository implementations that hide Supabase details from components and services.

عند إضافة Supabase، يجب إنشاء تنفيذات للمستودعات تخفي تفاصيل Supabase عن المكونات والخدمات.
