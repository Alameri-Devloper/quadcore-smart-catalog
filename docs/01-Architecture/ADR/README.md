# Architecture Decision Records | سجلات القرارات المعمارية

**Status:** Active · **Last Updated:** 2026-07-19 · **Scope:** Decision history

## English

ADRs record context, decision, alternatives, consequences, risks, and future implications. Accepted records are immutable except status, replacement links, and explicit corrections.

### Authority model

The current ADR register is this directory. The three-digit Foundation series is authoritative for its approved topics. The original four-digit series under [`docs/ADR/`](../../ADR/README.md) remains historical but is not rejected as a whole: each record keeps its individual status and scope. An Accepted legacy ADR remains an approved decision where it does not conflict with the Constitution or a later Accepted ADR. A future-oriented ADR describes approved direction, not runtime implementation.

When sources overlap, select the current source of truth in this order: Constitution; later Accepted ADR that explicitly supersedes an earlier record; otherwise the most specific Accepted ADR for the topic. Filename numbering alone never overrides status, scope, or an explicit replacement link.

### Overlap and authority mapping

| Original ADR | Current relationship | Current source of truth |
|---|---|---|
| ADR-0002 — Specification Templates | Partially superseded by ADR-006 for the V1 template key | ADR-006 for taxonomy and V1 resolution; ADR-0002 retains reusable-field rationale |
| ADR-0003 — Assisted Product Entry | Complementary future direction | ADR-0003 within its future scope; ADR-003 only for Product Domain Events |
| ADR-0004 — Context-Aware Product Entry | Complementary | ADR-0004 for contextual entry; ADR-004 only for invisible lifecycle UX |
| ADR-0005 — Lifecycle and Soft Delete | Conflicts and is Superseded | [ADR-001 Product Lifecycle](ADR-001-Product-Lifecycle.md); deletion/Trash/retention remain deferred |
| ADR-0006 — Safe Reconciliation | Complementary | ADR-0006 within its stated implementation status |
| ADR-0007 — Smart Search | Complementary future direction | ADR-0007 within its future scope |
| ADR-0008 — Template Generation | Complementary future direction | ADR-0008 within its future scope |
| ADR-0009 — Sales Intelligence | Complementary future direction | ADR-0009 within its future scope |

### Supersession and future numbering

A Superseded ADR keeps all historical content, changes its status to `Superseded`, adds a bilingual notice, and links directly to the replacement. The replacement should identify the superseded record when relevant. Do not rename, renumber, reuse, or delete either identifier.

The four-digit series is frozen for new decisions. Future ADRs continue in this current directory using the next unused three-digit identifier: `ADR-007`, then `ADR-008`, and so on. Before assigning a number, check both directories; identical numeric values in different formats are distinct identifiers, but titles and links must always be used to prevent ambiguity.

- [ADR-001 Product Lifecycle](ADR-001-Product-Lifecycle.md)
- [ADR-002 Product Aggregate](ADR-002-Product-Aggregate.md)
- [ADR-003 Product Domain Events](ADR-003-Product-Domain-Events.md)
- [ADR-004 Invisible Lifecycle UX](ADR-004-Invisible-Product-Lifecycle-UX.md)
- [ADR-005 Catalog–Inventory Boundary](ADR-005-Catalog-Inventory-Domain-Boundary.md)
- [ADR-006 Product Classification Taxonomy](ADR-006-Product-Classification-Taxonomy.md)

## العربية

تسجل ADR السياق والقرار والبدائل والنتائج والمخاطر والأثر المستقبلي، وتبقى السجلات المعتمدة ثابتة عدا الحالة وروابط الاستبدال والتصحيح الصريح.

### نموذج المرجعية

هذا المجلد هو سجل ADR الحالي. سلسلة Foundation ذات الأرقام الثلاثة هي المرجع المعتمد للموضوعات التي أقرتها. تبقى السلسلة الأصلية ذات الأرقام الأربعة في [`docs/ADR/`](../../ADR/README.md) مرجعاً تاريخياً، لكنها لا تُرفض كاملة؛ يحتفظ كل سجل بحالته ونطاقه. يبقى ADR القديم ذو الحالة Accepted قراراً معتمداً إذا لم يتعارض مع الدستور أو ADR لاحق معتمد. القرار المستقبلي يصف اتجاهاً معتمداً ولا يثبت وجود تنفيذ.

عند التداخل يكون ترتيب الاختيار: الدستور، ثم ADR لاحق معتمد يعلن استبدال السابق، وإلا فأكثر ADR معتمد تحديداً للموضوع. لا يمنح رقم الملف وحده أولوية على الحالة أو النطاق أو رابط الاستبدال الصريح.

### خريطة التداخل والمرجعية

| ADR الأصلي | العلاقة الحالية | المرجع الحالي |
|---|---|---|
| ADR-0002 — قوالب المواصفات | استبدله ADR-006 جزئياً لمفتاح القالب في V1 | ADR-006 للتصنيف والحل في V1؛ ويحتفظ ADR-0002 بأسباب الحقول القابلة لإعادة الاستخدام |
| ADR-0003 — الإدخال بمساعدة | اتجاه مستقبلي مكمل | ADR-0003 ضمن نطاقه؛ وADR-003 لأحداث المنتج فقط |
| ADR-0004 — الإدخال السياقي | مكمل | ADR-0004 للإدخال السياقي؛ وADR-004 لإخفاء دورة الحياة فقط |
| ADR-0005 — دورة الحياة والحذف | متعارض وتم استبداله | [ADR-001](ADR-001-Product-Lifecycle.md)؛ ويبقى الحذف والسلة والاحتفاظ مؤجلاً |
| ADR-0006 — التوفيق الآمن | مكمل | ADR-0006 ضمن حالة تنفيذه المعلنة |
| ADR-0007 — البحث الذكي | اتجاه مستقبلي مكمل | ADR-0007 ضمن نطاقه المستقبلي |
| ADR-0008 — توليد القوالب | اتجاه مستقبلي مكمل | ADR-0008 ضمن نطاقه المستقبلي |
| ADR-0009 — ذكاء المبيعات | اتجاه مستقبلي مكمل | ADR-0009 ضمن نطاقه المستقبلي |

### الاستبدال والترقيم المستقبلي

يحتفظ ADR المستبدل بكل محتواه التاريخي، وتتغير حالته إلى `Superseded`، وتضاف ملاحظة ثنائية اللغة ورابط مباشر إلى البديل. ويشير البديل إلى السجل المستبدل عند الحاجة. لا يُعاد تسمية أي رقم أو ترقيمه أو استخدامه أو حذف ملفه.

تُجمّد السلسلة ذات الأرقام الأربعة للقرارات الجديدة. تستمر القرارات المستقبلية في هذا المجلد بالرقم الثلاثي التالي غير المستخدم: `ADR-007` ثم `ADR-008`. يجب فحص المجلدين قبل تخصيص الرقم؛ القيم الرقمية المتشابهة بصيغ مختلفة معرفات مستقلة، لكن يجب ذكر العنوان والرابط دائماً لمنع الالتباس.
