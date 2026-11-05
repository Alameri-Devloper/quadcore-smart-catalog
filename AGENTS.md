# QSC Platform Agent Instructions

## Project Name

QSC Platform - Quadcore Smart Catalog

## Role

You are an implementation engineer working under the project architecture.

Do not change the architecture unless explicitly requested.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase later

## Architecture Rules

- Follow Domain Driven Design.
- Follow Clean Architecture.
- Use TypeScript only.
- Code language must be English.
- Documentation must be English + Arabic.
- Mobile First.
- Multi-Tenant from day one.
- No hardcoded business logic.
- Do not call database directly inside components.
- Business logic belongs to services.
- Data access belongs to repositories.
- Mock data belongs to mock folder.

## Project Structure

app/
domains/
shared/
docs/
public/

## Catalog Domain Structure

domains/catalog/
├── components/
├── hooks/
├── mock/
├── repositories/
├── schemas/
├── services/
├── types/
└── utils/

## Current Rules

- Product belongs to Product Model.
- Product Model belongs to Category.
- Category belongs to Department.
- Department belongs to Workspace.
- Workspace belongs to Company.
- WhatsApp public catalog uses store number.
- Employee catalog uses employee WhatsApp number.
- If employee WhatsApp is missing, fallback to store WhatsApp.

## Important

Before modifying code:

1. Read docs.
2. Preserve current architecture.
3. Fix only the requested issue.
4. Do not rename folders unless requested.
5. Do not introduce new libraries without approval.

## Current Task

Fix build errors while preserving the architecture.

## Root Cause Analysis

Before fixing any bug:

1. Reproduce the issue.
2. Identify the root cause.
3. Explain the root cause.
4. Apply the smallest safe fix.
5. Verify that the architecture is still respected.

Never apply blind fixes.

## Mandatory Task Report

After every implementation task, always produce a report before stopping.

The report must contain:

### Files Created

### Files Modified

### Files Deleted

### Architecture Changes

### Summary

### Next Recommendation

Then wait for review.

Never continue to another task automatically.

## QUADCORE Brand Identity / الهوية البصرية لكوادكور

1. أي واجهة أو تصميم جديد تابع لشركة QUADCORE FOR TECHNOLOGY يجب أن يلتزم بالهوية البصرية الرسمية المعتمدة، إلا إذا طلب مالك المشروع خلاف ذلك صراحةً.
   Every new interface or design for QUADCORE FOR TECHNOLOGY must follow the approved official brand identity unless the project owner explicitly requests otherwise.

2. المرجع الأساسي للهوية موجود داخل: `docs/brand/`.
   The primary brand identity reference is located in `docs/brand/`.

3. الألوان الأساسية المعتمدة حاليًا: Primary Purple: `#4C1B74`، Primary Orange: `#F8450D`، White: `#FFFFFF`.
   The currently approved primary colors are Primary Purple, Primary Orange, and White with the values listed above.

4. الشعار المرجعي المعتمد حاليًا هو الشعار الأصلي المستخدم في المشروع. لا تستبدله تلقائيًا بملف SVG أو أي نسخة مشتقة.
   The currently approved reference logo is the original logo used in the project. Do not automatically replace it with an SVG file or any derivative.

5. الخطوط الجديدة، والبرتقالي الثانوي، والنسخ المشتقة من الشعار، وأحجام الاستخدام المقترحة ليست معتمدة للتنفيذ حتى يوافق عليها المالك.
   New fonts, secondary orange, logo derivatives, and proposed usage sizes are not approved for implementation until the owner approves them.

6. يجب الحفاظ على دعم العربية والإنجليزية RTL/LTR، وعلى أوضاع LIGHT/DARK/SYSTEM، ومعايير الوصول والتباين.
   Preserve Arabic and English RTL/LTR support, LIGHT/DARK/SYSTEM modes, and accessibility and contrast requirements.

7. لا تطبق ألوان الهوية بطريقة تؤثر سلبًا على قابلية القراءة أو التباين، ولا تستورد CSS الهوية بصورة عامة دون مراجعة نطاق تأثيره.
   Do not apply brand colors in ways that harm readability or contrast, and do not import brand CSS globally without reviewing its scope of impact.

8. لا يجوز إعادة تصميم الواجهات الحالية أو تعديل وظائف النظام اعتمادًا على هذه التعليمات وحدها.
   These instructions alone do not authorize redesigning existing interfaces or modifying system functionality.

9. حافظ على جميع العقود الفنية الحالية، بما فيها المنتجات والمواصفات والأسعار والفروع والمخزون والصلاحيات والمشاركة العامة.
   Preserve all existing technical contracts, including products, specifications, pricing, branches, inventory, permissions, and public sharing.

10. إذا كان هناك تعارض أو نقص في دليل الهوية، يجب طلب قرار من المالك وعدم افتراض الموافقة.
    If the brand guidelines contain a conflict or omission, request an owner decision and do not assume approval.

11. تسري هذه القواعد على مشاريع كوادكور فقط، ولا يجوز اعتبارها مرجعًا لهوية الشركات أو العملاء المستقلين.
    These rules apply only to Quadcore projects and must not be treated as brand guidance for independent companies or clients.
