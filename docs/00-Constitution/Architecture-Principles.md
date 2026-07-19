# Architecture Principles | مبادئ المعمارية

**Status:** Accepted · **Last Updated:** 2026-07-19 · **Scope:** Architecture constitution

## English

QSC uses TypeScript, Domain Driven Design, Clean Architecture, a Modular Monolith, Multi-Tenant architecture, explicit domain boundaries, and Responsive First delivery. Mobile, Tablet, and Desktop are equally first-class environments. Architecture and application boundaries must support touch, mouse, and keyboard interaction without treating Desktop or Tablet as secondary adaptations. Product is the Catalog Aggregate Root. Repository contracts are persistence-agnostic and operations are Workspace-scoped. Inventory is independent from Catalog. Business comes before technology; configuration comes before customization. Architecture changes require prior discussion and documentation.

## العربية

تعتمد QSC على TypeScript وDDD وClean Architecture وModular Monolith ومعمارية Multi-Tenant وحدود مجالات صريحة وتسليم Responsive First. الجوال والجهاز اللوحي والكمبيوتر بيئات أساسية ومتساوية، ويجب أن تدعم المعمارية التفاعل باللمس والفأرة ولوحة المفاتيح دون اعتبار الكمبيوتر أو الجهاز اللوحي نسخة ثانوية. المنتج هو Aggregate Root للكتالوج. عقود المستودعات مستقلة عن التخزين وعملياتها مقيدة بمساحة العمل. المخزون مستقل عن الكتالوج. تبدأ القرارات من العمل، وتسبق التهيئة التخصيص، ولا يتغير التصميم المعماري دون نقاش وتوثيق مسبقين.
