# Development Workflow

# سير عمل التطوير

## English

Development must preserve the project architecture. Every change should be small, focused, and aligned with Domain Driven Design, Clean Architecture, TypeScript, multi-tenant rules, and mobile-first delivery.

## العربية

يجب أن يحافظ التطوير على معمارية المشروع. كل تغيير يجب أن يكون صغيرا ومركزا ومتوافقا مع التصميم الموجه بالمجال، والمعمارية النظيفة، وTypeScript، وقواعد تعدد المستأجرين، والجوال أولا.

## Before Starting | قبل البدء

- Read `AGENTS.md`.
- Read the relevant documentation under `docs/`.
- Understand the affected domain.
- Work from a feature branch, not directly on `main`.
- Do not introduce new libraries without approval.

- اقرأ `AGENTS.md`.
- اقرأ التوثيق المناسب داخل `docs/`.
- افهم المجال المتأثر.
- اعمل من فرع ميزة وليس مباشرة على `main`.
- لا تضف مكتبات جديدة دون موافقة.

## During Implementation | أثناء التنفيذ

- Keep source code in English.
- Keep documentation in English and Arabic.
- Put business logic in services.
- Put data access in repositories.
- Put mock data in mock folders.
- Do not call databases directly from components.
- Keep changes limited to the requested issue.

- اجعل الكود باللغة الإنجليزية.
- اجعل التوثيق باللغة الإنجليزية والعربية.
- ضع منطق العمل داخل الخدمات.
- ضع الوصول للبيانات داخل المستودعات.
- ضع البيانات الوهمية داخل مجلدات mock.
- لا تستدع قاعدة البيانات مباشرة من المكونات.
- اجعل التغييرات محدودة بالمشكلة المطلوبة.

## Verification | التحقق

- Run the relevant build, lint, or test command when appropriate.
- Review changed files before asking for approval.
- Document any command that could not be run.

- شغل أمر البناء أو الفحص أو الاختبار المناسب عند الحاجة.
- راجع الملفات المعدلة قبل طلب الموافقة.
- وثق أي أمر لم يتم تشغيله.
