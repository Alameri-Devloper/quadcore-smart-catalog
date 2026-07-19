# Engineering Principles | مبادئ الهندسة

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Engineering constitution

## English

Use TypeScript only, DDD, Clean Architecture, Modular Monolith boundaries, and explicit contracts. React contains no business rules; Domain contains no persistence concerns; data access is tenant- and Workspace-scoped. Prefer correct durable solutions over quick fixes, follow the established structure, and discuss and document architecture changes before implementation.

## العربية

يستخدم المشروع TypeScript فقط، وDDD وClean Architecture وحدود Modular Monolith وعقوداً صريحة. لا يوضع منطق العمل في React ولا تفاصيل التخزين في Domain، ويكون الوصول للبيانات مقيداً بالمستأجر ومساحة العمل. تُرفض الحلول السريعة غير السليمة، ويُحافظ على الهيكل الحالي، وتناقش التغييرات المعمارية وتوثق قبل التنفيذ.

