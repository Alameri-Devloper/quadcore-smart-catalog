# Git Workflow

# سير عمل Git

## English

The project uses feature branches to keep `main` stable. Do not work directly on `main` for feature development, fixes, or documentation changes.

## العربية

يستخدم المشروع فروع الميزات للحفاظ على استقرار `main`. لا تعمل مباشرة على `main` عند تطوير الميزات أو الإصلاحات أو تعديلات التوثيق.

## Branching Rule | قاعدة الفروع

- Create a feature branch from the latest stable branch.
- Use clear branch names.
- Keep one feature or fix per branch.
- Merge only after review and approval.

- أنشئ فرع ميزة من آخر فرع مستقر.
- استخدم أسماء فروع واضحة.
- اجعل كل فرع لميزة أو إصلاح واحد.
- ادمج فقط بعد المراجعة والموافقة.

## Branch Name Examples | أمثلة أسماء الفروع

```text
feature/catalog-selector
fix/department-service-export
docs/restructure-documentation
```

## Commit Rule | قاعدة الحفظ

One feature equals one focused commit or a small set of related commits.

كل ميزة تساوي حفظا واحدا مركزا أو مجموعة صغيرة من الحفظات المرتبطة.

## Main Branch Rule | قاعدة فرع main

`main` must represent a stable project state. Avoid direct commits to `main`.

يجب أن يمثل `main` حالة مستقرة للمشروع. تجنب الحفظ المباشر على `main`.

## Review Checklist | قائمة المراجعة

- Architecture preserved.
- No unrelated source changes.
- Documentation updated when needed.
- Build or relevant verification completed when possible.

- تم الحفاظ على المعمارية.
- لا توجد تغييرات غير مرتبطة في الكود.
- تم تحديث التوثيق عند الحاجة.
- تم تنفيذ البناء أو التحقق المناسب عند الإمكان.
