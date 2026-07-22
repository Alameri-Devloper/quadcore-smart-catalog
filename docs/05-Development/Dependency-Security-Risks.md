# Dependency Security Risks | مخاطر أمن الاعتماديات

**Status:** Active · **Last Reviewed:** 2026-07-22 · **Owner:** QSC architecture and security review

## English

This register records accepted temporary dependency risks. It does not replace automated audits. Re-run both `npm.cmd audit --omit=dev` and `npm.cmd audit` at every dependency update and at each review trigger below.

### Sharp and inherited libvips advisories

- **Severity and scope:** High; production dependency path `next@16.2.10 → sharp@0.34.5` (npm reports two high vulnerabilities under one Sharp advisory).
- **Reachability:** Next.js can use Sharp for server-side image optimization. Current Product Entry previews use `next/image` with `unoptimized`, but the framework capability is installed and potentially reachable by present or future optimized images.
- **Introduced by Product persistence:** No; Sharp is an optional Next.js dependency that predates Task 3.14.5.
- **Remediation investigated:** Latest stable Next.js 16.2.11 still declares `sharp ^0.34.5`. Patched stable Sharp is 0.35.x, outside that official range. No compatible stable Next.js release currently removes the finding.
- **Rejected action:** `npm audit fix --force` proposes a major Next.js downgrade. A direct Sharp dependency or override would bypass Next.js compatibility declarations without verified official support.
- **Current mitigation:** Keep image inputs controlled, retain existing `unoptimized` previews, avoid adding new server-side optimization paths, and monitor Next.js stable releases.
- **Accepted context:** Temporary risk accepted for the current development/review state by QSC architecture and security review.
- **Next review trigger:** A stable Next.js release declaring Sharp 0.35.x compatibility, a revised advisory, production deployment review, or any new optimized-image use.

### Nested PostCSS advisory

- **Severity and scope:** Moderate; production package path `next@16.2.10 → postcss@8.4.31`.
- **Reachability:** The advisory requires untrusted CSS to be parsed, stringified, and embedded into an HTML style context. No such application path was found, but the nested package remains installed and audit-visible.
- **Introduced by Product persistence:** No; the Next.js dependency predates Task 3.14.5. The top-level development PostCSS used by Tailwind is patched.
- **Remediation investigated:** Latest stable Next.js 16.2.11 still bundles PostCSS 8.4.31. The patched line begins at 8.5.10, but the nested dependency is controlled by Next.js.
- **Rejected action:** The audit force-fix proposes a major Next.js downgrade; an unverified override was not added.
- **Current mitigation:** Do not accept or embed user-controlled CSS; monitor stable Next.js releases.
- **Accepted context:** Temporary risk accepted for the current development/review state by QSC architecture and security review.
- **Next review trigger:** A stable Next.js release with patched nested PostCSS, a revised advisory, or introduction of dynamic/user CSS handling.

### Drizzle Kit legacy esbuild advisory

- **Severity and scope:** Moderate; development-only path `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild@0.18.20`.
- **Exposure:** Limited to developer migration/configuration tooling. It is not part of the built Next.js application runtime. The advisory concerns an exposed esbuild development server; QSC does not expose such a server through Drizzle Kit.
- **Introduced by Product persistence:** Yes, through the approved Drizzle Kit development dependency.
- **Remediation investigated:** npm currently proposes only a breaking downgrade to Drizzle Kit 0.18.1. The direct modern esbuild used by current Drizzle Kit does not remove its legacy loader chain.
- **Rejected action:** No breaking downgrade, force fix, or unverified override was applied.
- **Current mitigation:** Run migration tooling locally or in trusted CI only and never expose its development services publicly.
- **Accepted context:** Temporary development-tooling risk accepted by QSC architecture and security review.
- **Next review trigger:** A stable Drizzle Kit release removing `@esbuild-kit`, an updated advisory, or a change that exposes migration tooling beyond trusted environments.

## العربية

يسجل هذا المستند مخاطر الاعتماديات المقبولة مؤقتاً ولا يستبدل التدقيق الآلي. يجب تشغيل `npm.cmd audit --omit=dev` و`npm.cmd audit` عند كل تحديث للاعتماديات وعند تحقق أي محفز مراجعة أدناه.

### Sharp وثغرات libvips الموروثة

- **الخطورة والنطاق:** مرتفعة ضمن مسار الإنتاج `next@16.2.10 ← sharp@0.34.5`، ويبلغ npm عن ثغرتين مرتفعتين تحت تنبيه Sharp واحد.
- **إمكانية الوصول:** قد تستخدم Next.js مكتبة Sharp لتحسين الصور على الخادم. تستخدم معاينات Product Entry الحالية `next/image` مع `unoptimized`، لكن القدرة مثبتة وقد تصبح قابلة للوصول مع أي صورة محسنة.
- **المصدر:** لم تضفها مهمة تخزين Product؛ فهي اعتماد اختياري سابق داخل Next.js.
- **التحقيق:** ما زالت Next.js 16.2.11 المستقرة تعلن `sharp ^0.34.5`، بينما الإصلاح في Sharp 0.35.x خارج النطاق الرسمي.
- **الإجراء المرفوض:** يقترح `--force` تخفيضاً رئيسياً لـNext.js، كما أن الإضافة المباشرة أو override تتجاوز التوافق الرسمي دون دليل.
- **التخفيف الحالي:** إبقاء مدخلات الصور مضبوطة، والمحافظة على المعاينات غير المحسنة، وعدم إضافة مسارات تحسين خادمية جديدة، ومراقبة إصدارات Next.js المستقرة.
- **سياق القبول:** خطر مؤقت تقبله مراجعة معمارية وأمن QSC في مرحلة التطوير والمراجعة الحالية.
- **المراجعة التالية:** إصدار Next.js مستقر يدعم Sharp 0.35.x، أو تغير التنبيه، أو مراجعة النشر، أو إضافة استخدام لصور محسنة.

### PostCSS المتداخل

- **الخطورة والنطاق:** متوسطة ضمن مسار الإنتاج `next@16.2.10 ← postcss@8.4.31`.
- **إمكانية الوصول:** تتطلب الثغرة CSS غير موثوق يُحلل ويعاد تسلسله ثم يدمج داخل وسم style. لم يوجد هذا المسار حالياً، لكن الاعتماد ما زال مثبتاً.
- **المصدر:** سابق لمهمة التخزين، بينما نسخة PostCSS العليا المستخدمة مع Tailwind مصححة.
- **التحقيق:** ما زالت Next.js 16.2.11 تحتوي 8.4.31، ويبدأ الإصلاح من 8.5.10.
- **الإجراء المرفوض:** لم يُستخدم التخفيض الرئيسي المقترح عبر `--force` ولم يضف override غير موثق.
- **التخفيف الحالي:** عدم قبول CSS من المستخدم أو دمجه، ومراقبة إصدارات Next.js المستقرة.
- **سياق القبول:** خطر مؤقت تقبله مراجعة معمارية وأمن QSC.
- **المراجعة التالية:** Next.js مستقرة تحتوي PostCSS مصححة، أو تغير التنبيه، أو إضافة معالجة CSS ديناميكي.

### esbuild القديم عبر Drizzle Kit

- **الخطورة والنطاق:** متوسطة وللتطوير فقط عبر `drizzle-kit ← @esbuild-kit/esm-loader ← @esbuild-kit/core-utils ← esbuild@0.18.20`.
- **التعرض:** يقتصر على أدوات الترحيل والإعداد ولا يشحن ضمن تطبيق Next.js المبني. يتعلق التنبيه بخادم تطوير esbuild مكشوف، ولا تكشف QSC هذا الخادم عبر Drizzle Kit.
- **المصدر:** دخل عبر اعتماد Drizzle Kit التطويري المعتمد.
- **التحقيق:** يقترح npm حالياً تخفيض Drizzle Kit إلى 0.18.1 فقط، وهو تغيير كاسر.
- **الإجراء المرفوض:** لم ينفذ تخفيض أو force fix أو override غير موثق.
- **التخفيف الحالي:** تشغيل أدوات الترحيل محلياً أو في CI موثوق وعدم كشف خدماتها للعامة.
- **سياق القبول:** خطر أدوات تطوير مؤقت تقبله مراجعة معمارية وأمن QSC.
- **المراجعة التالية:** إصدار Drizzle Kit مستقر يزيل `@esbuild-kit`، أو تحديث التنبيه، أو كشف أدوات الترحيل خارج البيئات الموثوقة.
