# QSC Platform Architecture

# معمارية منصة QSC

## English

QSC Platform follows Domain Driven Design and Clean Architecture. The codebase is organized by domain, and each domain owns its components, hooks, mock data, repositories, schemas, services, types, and utilities.

The architecture protects business rules from UI and infrastructure details. Components render the experience, services contain business logic, and repositories provide data access.

## العربية

تتبع منصة QSC التصميم الموجه بالمجال والمعمارية النظيفة. يتم تنظيم المشروع حسب المجالات، وكل مجال يمتلك المكونات، والخطافات، والبيانات الوهمية، والمستودعات، والمخططات، والخدمات، والأنواع، والأدوات الخاصة به.

تحمي المعمارية قواعد العمل من تفاصيل الواجهة والبنية التحتية. المكونات تعرض التجربة، والخدمات تحتوي منطق العمل، والمستودعات توفر الوصول للبيانات.

## Project Layers | طبقات المشروع

```text
app/
domains/
shared/
docs/
public/
```

- `app/`: Next.js routes and pages.
- `domains/`: domain-specific implementation.
- `shared/`: reusable shared UI and utilities.
- `docs/`: project documentation.
- `public/`: static assets.

- `app/`: صفحات ومسارات Next.js.
- `domains/`: تنفيذ خاص بكل مجال.
- `shared/`: واجهات وأدوات مشتركة قابلة لإعادة الاستخدام.
- `docs/`: توثيق المشروع.
- `public/`: ملفات ثابتة.

## Dependency Rule | قاعدة الاعتماد

UI components may depend on services. Services may depend on repositories. Repositories may depend on mock data now and database clients later.

يمكن لمكونات الواجهة الاعتماد على الخدمات. ويمكن للخدمات الاعتماد على المستودعات. ويمكن للمستودعات الاعتماد على البيانات الوهمية حاليا وعلى عملاء قاعدة البيانات لاحقا.

Components must not call the database directly.

يجب ألا تتصل المكونات بقاعدة البيانات مباشرة.

## Multi-Tenant Rule | قاعدة تعدد المستأجرين

Every business entity must be designed with tenant ownership in mind. Company owns Workspace, Workspace owns Department, Department owns Category, Category owns Product Model, and Product Model owns Product.

يجب تصميم كل كيان تجاري مع مراعاة ملكية المستأجر. الشركة تمتلك مساحة العمل، ومساحة العمل تمتلك القسم، والقسم يمتلك التصنيف، والتصنيف يمتلك نموذج المنتج، ونموذج المنتج يمتلك المنتج.

## Responsive First | متجاوب منذ التصميم

The public catalog and employee catalog must provide excellent, purpose-designed experiences on Desktop and Mobile from the beginning.

يجب أن يقدم الكتالوج العام وكتالوج الموظف تجربتين ممتازتين ومصممتين للغرض على الكمبيوتر والجوال منذ البداية.
