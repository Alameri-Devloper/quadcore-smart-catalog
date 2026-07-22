# ADR-009: Provider-Neutral PostgreSQL Product Persistence | تخزين المنتج في PostgreSQL بصورة مستقلة عن المزوّد

**Status:** Accepted  
**Date:** 2026-07-21

## English

### Context
The canonical Product Aggregate needs durable, Workspace-isolated persistence without coupling Domain or Application to a hosting vendor. Core Product fields must remain filterable while dynamic specifications and image metadata retain Aggregate ownership.

### Decision
PostgreSQL is the canonical engine. Infrastructure uses Drizzle ORM with `node-postgres`; Drizzle Kit produces reviewable versioned SQL migrations. A provider-neutral `DATABASE_URL` and Infrastructure-owned SSL/pooling support local PostgreSQL, Docker, Supabase PostgreSQL, and compatible managed hosts through the same mapper and `PostgreSqlProductRepository`.

The Hybrid Relational Schema uses `catalog_products`, `catalog_product_specification_values`, and `catalog_product_images`. Composite `(workspace_id, product_id)` identity and child foreign keys prevent cross-Workspace ownership. A partial unique index reserves non-null ProductCode across the Workspace, including Archived Products. Create and revision-checked update persist the complete Aggregate in one transaction. The Infrastructure mapper alone calls `Product.rehydrate`; Domain and Application remain database-neutral.

Initial indexes cover Workspace with Catalog, Category, Product Type, Brand, lifecycle, availability, ProductCode, Specification Field, and deterministic child ordering. Advanced search is deferred until real Catalog Search queries are measured with `EXPLAIN ANALYZE`.

### Alternatives considered
- Opaque Product JSON was rejected because it hides searchable fields and weakens relational integrity.
- A table per scalar Value Object was rejected as unnecessary fragmentation.
- A Supabase-specific repository was rejected because a host is not a Domain dependency.
- SQLite/in-memory substitutes were rejected for PostgreSQL constraint verification.

### Consequences and risks
Transactions, named constraints, and optimistic concurrency provide atomic guarantees; migrations become a required deployment step. PostgreSQL numerics must be checked against JavaScript safe-integer limits. Changing database technology requires new Infrastructure, schema, migrations, and data conversion. Moving between PostgreSQL hosts requires configuration and data migration/restore—not Domain, Application, repository-port, or UI redesign. Pool and SSL settings must be tuned per host.

## العربية

### السياق
يحتاج تجميع المنتج المعتمد إلى تخزين دائم ومعزول بمساحة العمل من دون ربط المجال أو التطبيق بمزوّد استضافة، مع إبقاء الحقول الأساسية قابلة للتصفية وملكية المواصفات وبيانات الصور للتجميع.

### القرار
تُعتمد PostgreSQL كمحرك قاعدة البيانات، وتستخدم البنية التحتية Drizzle ORM مع `node-postgres`، وينتج Drizzle Kit ترحيلات SQL مُرقّمة وقابلة للمراجعة. يوفّر `DATABASE_URL` المحايد للمزوّد وإعداد SSL والتجميع داخل البنية التحتية التنفيذ نفسه محلياً وفي Docker وعلى Supabase PostgreSQL وأي مضيف متوافق.

يستخدم المخطط العلاقي الهجين جداول المنتج وقيم المواصفات وبيانات الصور. تمنع الهوية والمفاتيح الخارجية المركبة الملكية العابرة لمساحات العمل. ويحجز فهرس فريد جزئي ProductCode غير الفارغ على مستوى مساحة العمل حتى للمنتج المؤرشف. يتم إنشاء التجميع وتحديثه المتحقق من المراجعة ضمن معاملة واحدة، ويختص محوّل البنية التحتية بإعادة البناء.

تغطي الفهارس الأولية النطاقات المطلوبة، وتؤجّل فهارس البحث المتقدم حتى قياس استعلاماته بواسطة `EXPLAIN ANALYZE`.

### البدائل
رُفض JSON المبهم، وجدول لكل كائن قيمة، ومستودع خاص بـSupabase، وSQLite أو البديل داخل الذاكرة للأسباب المذكورة أعلاه.

### النتائج والمخاطر
توفر المعاملات والقيود المسماة والتزامن التفاؤلي ضمانات ذرية، وتصبح الترحيلات إلزامية. يجب فحص الأرقام ضمن حدود JavaScript الآمنة. تغيير تقنية القاعدة يتطلب بنية تحتية ومخططاً وترحيلاً جديداً. أما الانتقال بين مضيفي PostgreSQL فيتطلب الإعداد وترحيل البيانات أو استعادتها فقط، ولا يعيد تصميم المجال أو التطبيق أو منفذ المستودع أو الواجهة.
