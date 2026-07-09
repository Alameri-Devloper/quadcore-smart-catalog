# Catalog Domain

# مجال الكتالوج

## English

The Catalog domain manages the public and employee product catalog experience. It includes product organization, catalog selection, search, display rules, and WhatsApp contact behavior.

## العربية

يدير مجال الكتالوج تجربة كتالوج المنتجات العام وكتالوج الموظفين. ويشمل تنظيم المنتجات، واختيار الكتالوج، والبحث، وقواعد العرض، وسلوك التواصل عبر واتساب.

## Domain Structure | بنية المجال

```text
domains/catalog/
├── components/
├── hooks/
├── mock/
├── repositories/
├── schemas/
├── services/
├── types/
└── utils/
```

## Responsibilities | المسؤوليات

- Components render catalog UI.
- Hooks manage catalog UI state when needed.
- Mock files contain temporary catalog data.
- Repositories provide data access.
- Services contain catalog business rules.
- Types define catalog entities and contracts.

- المكونات تعرض واجهة الكتالوج.
- الخطافات تدير حالة واجهة الكتالوج عند الحاجة.
- ملفات mock تحتوي بيانات كتالوج مؤقتة.
- المستودعات توفر الوصول للبيانات.
- الخدمات تحتوي قواعد عمل الكتالوج.
- الأنواع تعرف كيانات وعقود الكتالوج.

## Business Rules | قواعد العمل

- Product belongs to Product Model.
- Product Model belongs to Category.
- Category belongs to Department.
- Department belongs to Workspace.
- Workspace belongs to Company.
- Public catalog uses the store WhatsApp number.
- Employee catalog uses the employee WhatsApp number.
- If employee WhatsApp is missing, fallback to store WhatsApp.

- المنتج يتبع نموذج المنتج.
- نموذج المنتج يتبع التصنيف.
- التصنيف يتبع القسم.
- القسم يتبع مساحة العمل.
- مساحة العمل تتبع الشركة.
- الكتالوج العام يستخدم رقم واتساب المحل.
- كتالوج الموظف يستخدم رقم واتساب الموظف.
- إذا لم يوجد رقم واتساب للموظف يتم استخدام رقم واتساب المحل.

## Current Data Source | مصدر البيانات الحالي

The current implementation uses mock repositories. Future database integration must keep data access inside repositories and business logic inside services.

يستخدم التنفيذ الحالي مستودعات وهمية. وعند إضافة قاعدة البيانات لاحقا يجب أن يبقى الوصول للبيانات داخل المستودعات ومنطق العمل داخل الخدمات.
