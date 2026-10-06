# Task 3.23-P2 — Visibility Transport and Editor Planning | تخطيط نقل ومحرر الرؤية

## 1. Current status and baseline | الحالة وخط الأساس

**Status:** PLANNING CORRECTION ONLY; `P2PlanningReview: PASS`; `P2PlanningGate: PASS`; `P2Status: READY_FOR_IMPLEMENTATION`; implementation NOT AUTHORIZED / NOT STARTED. **Date:** 2026-10-06. **Branch:** `feature/task-3.23-p2-visibility-transport-planning`. **Baseline:** `f9de644` — merge PR #57 for P1. P1 COMPLETE / MERGED (implementation `43b99c6`); P3–P7 GATED / NOT STARTED; Task 3.23 IN PROGRESS. Status reconciliation applies inside this plan only; Current-Roadmap, Sprint and parent status remain unchanged pending separate review.

[ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md), the [parent implementation contract](Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md), and the [accepted P1 plan](Task-3.23-P1-Metadata-and-Domain-Contracts-Planning.md) govern. This document proposes future changes; it does not authorize them. Source findings describe the baseline, not implemented P2 behavior. Serena inspected semantic symbols; rg inspected bounded literals, mappers, routes, fixtures and migration metadata. Ownership is clear; Graphify was unnecessary. No executable verification was run.

**الحالة:** تصحيح تخطيط فقط؛ `P2PlanningReview: PASS` و`P2PlanningGate: PASS` و`P2Status: READY_FOR_IMPLEMENTATION`؛ التنفيذ غير معتمد ولم يبدأ. الفرع وخط الأساس أعلاه؛ اكتملت P1 ودُمجت، وتبقى P3–P7 مشروطة ولم تبدأ والمهمة 3.23 قيد التنفيذ. تقتصر مصالحة الحالة على هذه الخطة؛ لا تتغير حالات Current-Roadmap أو Sprint أو العقد الأب قبل مراجعة منفصلة. تحكم الوثائق المرتبطة هذه الخطة؛ المقترحات ليست تنفيذاً أو تصريحاً. استُخدمت Serena للرموز وrg للفحص المحدود في الاكتشاف السابق؛ الملكية واضحة فلا حاجة إلى Graphify، ولم تُشغّل اختبارات تنفيذية.

## 2. Scope | النطاق

Atomically integrate `publicVisibility` into the Reference Data canonical template entry, configure input, scoped transaction, schema/migration, persistence snapshot, authenticated HTTP response/request, Presentation reconstruction/state/save and the existing template editor. Reuse P1's visibility type, validator and optional configure-entry declaration. Preserve existing template ownership, order, required behavior and version authority.

تدمج P2 الرؤية في إدخال القالب القانوني والإدخال الكتابي والمعاملة والمخطط والترحيل والقراءة وHTTP والمحرر الحالي، مع إعادة استخدام نوع P1 ومدققه وعقد إدخاله. تبقى ملكية القالب والترتيب وrequired والنسخة دون تغيير.

## 3. Explicit non-goals | الاستثناءات الصريحة

No Share Grant persistence/lifecycle, bearer crypto/runtime/env, anonymous resolution, `/share/[token]`, public media, public DTO projection, limiter, Share management API/UI, SSR or P3–P7 work. No Product value duplication, Product validation limits, global Definition visibility, permission expansion, new layer or dependency. Do not modify authoritative documents, roadmap status, `.serena/project.yml` or Git state during this planning task.

لا حفظ أو دورة تفويض أو تشفير أو بيئة أو حل مجهول أو مسار عام أو وسائط أو إسقاط عام أو محدد طلبات أو واجهة مشاركة أو SSR أو عمل P3–P7. لا تكرار للقيم أو قيود جديدة على المنتج أو رؤية عالمية للتعريف أو توسيع صلاحيات أو طبقات أو مكتبات. لا تعديل للمرجعيات أو حالات الخارطة أو Serena أو Git.

## 4. Existing architecture discovered | المعمارية الحالية

Reference Data owns `ProductType` (Category child), `SpecificationDefinition` (Workspace-owned metadata with Text/Number/Boolean and optional unit), `SpecificationTemplate` (Workspace + Product Type + version), and entries. There is no independent entry ID or template Active flag. `SpecificationTemplateEntry` currently contains only readonly Definition ID, sortOrder and required. P1's `PublicSpecificationVisibility` and strict `validatePublicSpecificationVisibility(unknown)` already exist; `ConfigureSpecificationTemplateEntryInput` is declaration-only, not wired into the inline use-case command.

`validateSortOrder` accepts safe integers 0..1,000,000. Configure rejects duplicate Definition IDs and duplicate orders; `required` currently defaults with `?? false` (not a strict Boolean runtime validator). Display label and unit rules remain Domain-owned. Current HTTP template parsing only asserts that entries is an array and casts its elements; it does not prove their runtime shape. Current browser reconstruction explicitly strips unknown fields. These are discovered integration points, not reasons to redesign other operations.

تملك البيانات المرجعية نوع المنتج والتعريف والقالب؛ الإدخال بلا معرّف مستقل والرؤية غير موجودة فيه بعد. نوع الرؤية ومدققها موجودان، وعقد إدخال P1 غير موصول. يتحقق الترتيب والتكرار؛ required له افتراضي حالي لكن التحقق الكتابي ليس بديلاً عن تحقق وقت التشغيل. HTTP الحالي يحوّل المصفوفة نوعياً، والعميل يعيد بناء حقول محددة؛ تعالج P2 حدود القالب فقط دون إعادة تصميم بقية العمليات.

## 5. Exact end-to-end round trip | المسار الكامل الدقيق

| Boundary / الحد | Current file/symbol and behavior / السلوك الحالي |
| --- | --- |
| Domain | [catalog-reference-data.ts](../../domains/catalog/reference-data/domain/catalog-reference-data.ts): `SpecificationTemplateEntry`, `SpecificationTemplate`, P1 visibility validator. |
| Application command | [catalog-reference-data.use-cases.ts](../../domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts): `ConfigureProductTypeSpecificationTemplateUseCase.execute`; one inline entries shape for first configure and replacement. |
| Authority | Same use case checks `catalog.referenceData.manage` from trusted context before work; resolves Active Product Type and Active Definitions in caller Workspace. |
| Repository port | [catalog-reference-data-unit-of-work.port.ts](../../domains/catalog/reference-data/ports/catalog-reference-data-unit-of-work.port.ts): `configureTemplate` takes canonical entries; `getSnapshot` returns canonical templates; UoW provides references and audit. |
| Schema | [schema.ts](../../domains/catalog/infrastructure/persistence/schema.ts): `catalogSpecificationTemplates`, `catalogSpecificationTemplateEntries`. |
| Adapter | [postgresql-catalog-reference-data.repository.ts](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts): `configureTemplate` reads template, requires matching version for update, CAS-increments version, deletes entries, reinserts the submitted collection, returns canonical template. |
| Transaction | [postgresql-catalog-reference-data-unit-of-work.ts](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data-unit-of-work.ts): references/audit share one database transaction; exceptions roll back; unique errors become existing safe Conflict. |
| Snapshot | Adapter `getSnapshot`: Workspace-filtered table reads, ordered entry rows, explicit three-field entry mapper, grouped by template ID. Application `GetCatalogReferenceDataUseCase.execute` returns full management data or Active-filtered view data. |
| Routes | [GET route](../../app/api/catalog/reference-data/route.ts); [PUT template route](../../app/api/catalog/reference-data/product-types/[id]/specification-template/route.ts); no separate create-template route or PATCH-entry route. |
| HTTP handlers | [catalog-reference-data-route-handlers.ts](../../domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.ts): `configureTemplate`, `withApplication`, `resultResponse`; successful response `{ type: "Success", value: template }`. |
| Composition | [catalog-reference-data-server-runtime.ts](../../domains/catalog/reference-data/infrastructure/catalog-reference-data-server-runtime.ts): authenticated resolver, origin policy, existing use cases/UoW; no new runtime needed. |
| Browser transport | [catalog-reference-data-management.client.ts](../../domains/catalog/reference-data/presentation/catalog-reference-data-management.client.ts): `load`, `configureTemplate` PUT, private `template` mapper and `reconstructCatalogReferenceSnapshot`; credentials same-origin. |
| View/input | [catalog-reference-data-management.types.ts](../../domains/catalog/reference-data/presentation/catalog-reference-data-management.types.ts): entry view and `TemplateMutationInput`; currently both have no visibility. |
| Access/serialization | [catalog-reference-data-management.coordinator.ts](../../domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.ts): `loadCatalogReferenceAccess`, `templateMutationInput`, `templateHasInactiveEntries`. |
| Editor | [CatalogReferenceDataManagementPage.tsx](../../domains/catalog/reference-data/presentation/CatalogReferenceDataManagementPage.tsx) loads access; [catalog-reference-template-manager.tsx](../../domains/catalog/reference-data/presentation/catalog-reference-template-manager.tsx) owns selection/draft/add/remove/order/required/save/conflict. [Page route](../../app/catalog/reference-data/page.tsx) mounts it under Suspense. |

Selecting a Product Type loads its current entries and version from the snapshot. Add uses Definition ID and entries.length order with required=false; remove filters the collection; reorder edits numeric sortOrder, not drag/drop. Save sends the whole array plus expectedVersion only for an existing template. Success replaces draft with returned entries/version and reloads. Conflict keeps draft, reloads snapshot and blocks Save until explicit review. `reviewCurrent` currently adopts the latest version without replacing draft; it is not an automatic merge.

اختيار نوع المنتج يحمّل إدخالاته ونسخته؛ الإضافة والحذف والترتيب تعدل مصفوفة واحدة، والحفظ يستبدلها كاملة. لا PATCH لإدخال منفرد. النجاح يعتمد الاستجابة ثم يعيد التحميل؛ التعارض يحفظ المسودة ويمنع الحفظ حتى مراجعة صريحة. اعتماد النسخة الحالية لا يدمج المسودة تلقائياً، ويجب إظهار اختلاف الرؤية قبل إعادة المحاولة.

## 6. Domain changes | تغييرات المجال

Add required readonly `publicVisibility: PublicSpecificationVisibility` to the existing canonical `SpecificationTemplateEntry`, only with the complete P2 integration. Never make it optional, cast old entries into compliance, add a second canonical specification model, or default an existing persisted public value on read/write. Reuse the existing strict validator: only exact lowercase internal/public; missing/null/case/whitespace/Boolean/object values are invalid canonical state. Optionality belongs solely to configure input. No visibility on Definition or Product values.

يضاف الحقل الإلزامي إلى النموذج القانوني الحالي ضمن التكامل الكامل فقط؛ لا حقل اختياري أو تحويل نوعي أو نموذج مكرر أو افتراضي يمحو public. الغياب مقبول في الإدخال الكتابي للتوافق فقط، وليس حالة قانونية للمجال. لا رؤية على التعريف أو قيم المنتج.

## 7. Application changes | تغييرات التطبيق

Wire `ConfigureSpecificationTemplateEntryInput` into the command. Validate supplied entry objects/IDs/order/required and explicit visibility before mutation; reject unsupported entry keys per parent contract. Preserve required omission=false and existing order/version/error semantics. Malformed explicit required values must become InvalidInput instead of reaching Boolean persistence.

Application owns omission resolution and audit transition calculation. Add a scoped transaction-only read to the existing Reference Data repository port: proposed `lockSpecificationTemplate(workspaceId, productTypeId): Promise<SpecificationTemplate | null>`. The adapter locks the matching template header before reading its entries. This extends an existing port; it creates no layer, repository-to-repository call or business-default policy in persistence. `configureTemplate` continues accepting only complete canonical entries.

Wire and validate any newly added required field in typed fixtures. Existing P1 conformance test that asserts the canonical entry has no visibility must become a post-P2 canonical-required test, while its optional-input compatibility test remains. Do not weaken TypeScript or use broad casts.

يوصل عقد الإدخال ويُتحقق من الكائنات والحقول المسموحة والرؤية الصريحة قبل الكتابة. يحل Application الغياب ويحسب التدقيق؛ يضاف تابع قراءة مقيد يقفل القالب ضمن المنفذ الحالي، دون طبقة جديدة أو استدعاء مستودع لآخر. يقبل الحفظ إدخالات قانونية كاملة فقط. تُحدّث اختبارات النموذج بعد P2 دون إضعاف الأنواع.

## 8. Persistence/schema changes | الحفظ والمخطط

Table `catalog_specification_template_entries` currently has Workspace ID, template ID, Definition ID, integer sortOrder, required Boolean NOT NULL DEFAULT false. PK is `(workspace_id, specification_template_id, specification_definition_id)`; composite template FK cascades on deletion, composite Definition FK restricts deletion; unique `(workspace_id, specification_template_id, sort_order)`; sort CHECK 0..1,000,000. Template header has PK Workspace/template, unique Workspace/Product Type, composite Product Type FK, version/timestamp checks. Preserve all keys and ordering.

Add only `publicVisibility: text("public_visibility").notNull().default("internal")` and an allowed-value Drizzle `check(...)`. Adapter snapshot, locked read, write insertion and configure result must round-trip canonical visibility without fallback. Lock header with scoped `SELECT ... FOR UPDATE`, then read scoped entries in sortOrder/Definition-ID order. Existing updates obtain the same header lock through CAS; our lock is held through replacement/audit/commit. Concurrent creates without a row to lock remain protected by existing Workspace/Product Type uniqueness; loser conflicts, never silently overwrites.

الجدول له مفتاح مركب ومساران FK مقيدان بالمساحة وترتيب فريد وتحقق ترتيب. تضاف الرؤية فقط مع NOT NULL والافتراضي والتحقق دون تغيير المفاتيح. تمرر جميع القراءات والكتابات الحقل دون افتراضي يخفي فساداً. يقفل رأس القالب ثم تقرأ إدخالاته؛ الإنشاء المتزامن تحميه الفريدة الحالية ويعيد الخاسر تعارضاً.

## 9. Migration plan | خطة الترحيل

Latest migration is [0015_bumpy_terrax.sql](../../drizzle/0015_bumpy_terrax.sql). [drizzle.config.ts](../../drizzle.config.ts) points to existing schema files and `./drizzle`. Journal [meta/_journal.json](../../drizzle/meta/_journal.json) has idx 15, version 7, breakpoints=true; latest [0015_snapshot.json](../../drizzle/meta/0015_snapshot.json) contains current entry columns/keys/CHECK. Repository uses numbered SQL, `--> statement-breakpoint`, journal records and generated snapshots. Existing CHECK/default declarations appear in both Drizzle schema and SQL (see [0012_catalog_reference_data.sql](../../drizzle/0012_catalog_reference_data.sql)). Custom historical migrations are not evidence to omit a new snapshot.

One visibility migration is sufficient under the baseline: no visibility column or persisted public values exist. Proposed SQL shape only:

```sql
ALTER TABLE catalog_specification_template_entries
  ADD COLUMN public_visibility text NOT NULL DEFAULT 'internal';
ALTER TABLE catalog_specification_template_entries
  ADD CONSTRAINT catalog_specification_template_entries_public_visibility
  CHECK (public_visibility IN ('internal', 'public'));
```

Existing rows become internal. Future `npm run db:generate` should produce the next available sequence (expected 0016 at this baseline), journal and snapshot; exact filename/tag must be taken from actual generation after checking for intervening migrations, not reserved now. Inspect generated SQL for unrelated changes. No migration or metadata created now. Grant migration remains separate P4 work.

Integration preparation and Reference Data integration before-hook already migrate a guarded test database. They do not prove a populated pre-P2 upgrade or a clean-from-zero migration when the database is reused. Plan explicit isolated clean-schema and pre-P2 seeded upgrade fixtures under existing database-safety guards, never production data; test invalid/null CHECK rejection and backfilled internal values. Preserve earlier migrations and test database guards.

آخر ترحيل 0015، والاصطلاح SQL مرقم مع journal وsnapshot وتحقق في المخطط وSQL. يكفي ترحيل رؤية واحد: تصبح الصفوف القديمة internal. يتحدد الاسم والرقم النهائيان عند التوليد لاحقاً، ولا ملفات ترحيل الآن. يلزم اختبار قاعدة نظيفة واختبار ترقية بيانات ما قبل P2؛ استدعاء migrate على قاعدة معاد استخدامها لا يثبت ذلك وحده. ترحيل التفويض مستقل ضمن P4.

## 10. HTTP compatibility contract | توافق HTTP

Keep GET `/api/catalog/reference-data` and PUT `/api/catalog/reference-data/product-types/[id]/specification-template`; same create/update operation and Success envelope. No caller Workspace authority. Entry allowlist: specificationDefinitionId, sortOrder, required, publicVisibility. Parse unknown objects explicitly, validate exact visibility when present; never treat null/invalid strings as absence. expectedVersion is optional only for creation; an existing template requires a matching positive safe version. Reject explicitly malformed expectedVersion rather than dropping it. Unsupported entry fields are InvalidInput (required by parent contract, unlike current cast).

Old clients may omit visibility. New successful GET/PUT responses always include canonical visibility. Existing browser client ignores extra response fields, so its later omission is safely handled server-side. New client must require exact visibility in received canonical entries; missing/invalid response becomes Unavailable, never internal and then a save. 400 InvalidInput, 401 AuthenticationRequired, 403 origin/restricted/permission failure, 404 scoped NotFound, 409 Conflict, 503 service unavailable remain existing mappings.

تبقى المسارات والاستجابة والتمييز بالنسخة دون تغيير؛ الغياب في العملاء القدامى مقبول، أما null والقيم الخاطئة والحقول غير المدعومة فمرفوضة. تعيد الاستجابة الرؤية القانونية دائماً. يرفض العميل الجديد استجابة ناقصة بدلاً من تحويلها إلى internal ثم حفظها. تبقى خرائط الأخطاء والنطاق الموثوق الحالية.

## 11. Existing-entry omission preservation algorithm | خوارزمية حفظ الغياب للإدخال الموجود

1. Check trusted manage permission; validate full replacement input, duplicate IDs/orders and supplied fields.
2. Inside existing UoW, validate scoped Active Product Type/Definitions; acquire proposed scoped template-header lock and read canonical entries while holding it.
3. If header exists, require `expectedVersion === current.version`; missing/stale version returns Conflict before mutation/audit. Build `Map<specificationDefinitionId, current entry>` only from this Workspace/template.
4. For each submitted entry, use explicit validated visibility if supplied; otherwise use the matching stored entry's visibility; if no matching stored entry exists use internal. Required/order remain submitted/defaulted independently.
5. Pass complete canonical entries to existing configure method; preserve version-CAS defense, replace rows and write audit within the same transaction. Return saved canonical state. Any failure must not partially mutate visibility or audit.

Identity proof: the entry PK contains Workspace/template/Definition; unique Workspace/Product Type selects one template; request requires unique Definition IDs; mutable order and required are not identity. Definition ID matches an entry regardless of reorder. Removed rows are absent from subsequent versions: re-adding a previously removed Definition is new and defaults internal when omitted. Removing/re-adding the same Definition in one submitted replacement cannot be distinguished from retaining it, and intentionally preserves visibility; do not infer a hidden remove/reset intention from editor actions. New template create has no stored matches.

Do not resolve against browser state, global Definition metadata or an uncoordinated Workspace snapshot. Current `getSnapshot` runs multiple queries with Promise.all; it is not a locked, coherent mutation preimage. The planned lock read avoids pairing a newer header version with older entry state. Parent-lock-before-entry-read plus current-version check and final CAS protect concurrent legacy/new-client edits. No new retry logic is needed; return Conflict through the existing path.

تُحسم الهوية بمفتاح المساحة والقالب والتعريف لا الترتيب أو required. داخل المعاملة يقفل رأس القالب وتقرأ الإدخالات ثم تُفحص النسخة؛ يحفظ الغياب رؤية المطابقة الحالية. الحذف المحفوظ ثم إعادة الإضافة إدخال جديد؛ الحذف والإضافة لنفس التعريف في مصفوفة حفظ واحدة لا يمثلان هوية جديدة ويحتفظان بالرؤية. لا يُستخدم snapshot المتوازي غير المقفل أو مسودة المتصفح لحسم الغياب. القفل وفحص النسخة وCAS يمنعون إعادة رؤية قديمة بالتزامن.

## 12. New-entry defaulting algorithm | افتراضي الإدخال الجديد

Within the same algorithm, no stored Definition-ID match means new: omitted visibility resolves to internal, explicit public/internal remains explicit. Creation without expectedVersion accepts a genuinely absent template; supplied version for an absent template conflicts. The database default is a migration/direct-column-omission safety net, not the business merge algorithm. Editor Add creates explicit internal; deleting unrelated entries never defaults retained public entries.

غياب المطابقة المخزنة يعني إدخالاً جديداً: الغياب يصبح internal، والصريح يحتفظ بقيمته. افتراضي قاعدة البيانات أمان للترحيل وليس خوارزمية الدمج. يضيف المحرر internal صراحة، ولا يعيد ضبط الإدخالات المحتفظ بها.

## 13. Audit behavior | التدقيق

Keep the existing `SpecificationTemplateConfigured` event and audit repository; no new audit store/event subsystem. The accepted metadata representation retains `productTypeId`, `entryCount`, `version` and adds exactly `toPublicCount`, `fromPublicCount`, `visibilityTransitions`. `visibilityTransitions` is a deterministic JSON string encoding an array sorted by `specificationDefinitionId`; each item has exactly this shape:

```ts
{
  specificationDefinitionId: string;
  from: "internal" | "public" | null;
  to: "internal" | "public" | null;
}
```

| Transition / التحول | Public transition counts / أعداد التحولات العامة |
| --- | --- |
| internal → public | `toPublicCount +1` |
| null → public | `toPublicCount +1` |
| public → internal | `fromPublicCount +1` |
| public → null | `fromPublicCount +1` |
| internal → null; null → internal | Neither public count changes / لا يتغير أي عدد عام |
| Unchanged values / قيم لم تتغير | Omitted from `visibilityTransitions`; neither count changes / لا تسجل ولا تغير الأعداد |

Additions/removals use null only in this audit transition evidence; null is never a canonical `PublicSpecificationVisibility` value. Unchanged omission is no transition. No labels, Product specification values, request bodies, bearer or secret material, or arbitrary metadata. Audit remains after configure success in the same transaction/UoW. Validation/conflict (including failed CAS) creates no success audit; audit failure rolls back mutation. Existing UoW rolls back exceptions, not an arbitrary returned business failure after writes: keep conflicts before writes and throw persistence/audit failures normally.

يبقى حدث `SpecificationTemplateConfigured` والمستودع الحالي بلا مخزن أو منظومة أحداث جديدة. الصيغة المقبولة تحفظ `productTypeId` و`entryCount` و`version` وتضيف فقط `toPublicCount` و`fromPublicCount` و`visibilityTransitions`. الأخير سلسلة JSON حتمية لمصفوفة مرتبة حسب `specificationDefinitionId`، وكل عنصر يحتوي حصراً الهوية و`from` و`to` بالشكل أعلاه. يحدد الجدول الأعداد: الوصول إلى public من internal أو null يزيد `toPublicCount`، والخروج منها إلى internal أو null يزيد `fromPublicCount`؛ التحولات بين internal وnull لا تؤثر في العددين، والقيم غير المتغيرة لا تسجل. null دليل إضافة أو حذف في التدقيق فقط وليس قيمة قانونية للرؤية. لا عناوين أو قيم مواصفات المنتج أو أجسام طلبات أو أسرار أو بيانات اعتباطية. يبقى التدقيق في المعاملة نفسها؛ لا تدقيق نجاح عند فشل التحقق أو التعارض، وفشل التدقيق يتراجع عن التعديل كله.

## 14. Authorization / Multi-Tenant behavior | الصلاحيات وتعدد المستأجرين

Manage permission stays `catalog.referenceData.manage`; read uses existing view/manage and includeInactive rules. Trusted Workspace comes from `IdentityAuthenticatedRequestContextResolver`, never request IDs/body. Product Type, template/header/entries and Definitions must use the same Workspace; composite FKs remain. Visibility is per Product Type template, not per Branch or Definition globally. No new Identity permission, Branch policy, public authority or active-status bypass. Owner/Staff cases exercise existing permissions; read-only mode displays visibility but offers no mutation.

تبقى صلاحية الإدارة والقراءة وقواعد includeInactive الحالية؛ تأتي المساحة من السياق الموثوق، وتُقيد جميع المطابقات وFK بها. الرؤية للقالب الخاص بنوع المنتج، لا للفرع أو التعريف عالمياً. لا صلاحية جديدة أو تجاوز للنشاط؛ يعرض وضع القراءة الرؤية دون تعديل.

## 15. Editor UX plan | خطة المحرر

Surface remains `/catalog/reference-data?section=specification-templates`, `SpecificationTemplateManager`. Use native select inside existing `FormField`, following current Product Type/Definition selects and Definition valueType select; Boolean required remains its checkbox. No switch framework/segmented control or new screen. Each entry displays localized **Public share visibility / رؤية المشاركة العامة** with options **Internal / داخلية** first and **Public / عامة** second. Initial value comes from canonical response; new entry value is internal. Help: **Public allows this specification to be included in an eligible public Product share. Internal excludes it. / تسمح الرؤية العامة بإدراج هذه المواصفة في مشاركة عامة مؤهلة للمنتج؛ تستبعدها الرؤية الداخلية.** This control alone does not create a link or imply current public availability.

Load and success preserve exact returned visibility; edits change only that entry; add/remove/order/required remain existing controls. Read-only entries show localized text, not editable controls. Existing inactive-Definition blocking remains.

On 409/version conflict, preserve the employee's draft, reload the latest canonical template, compare visibility for every retained Definition ID and explicitly surface each `publicVisibility` difference. No automatic overwrite/retry or invisible merge. A generic **review current** action MUST NOT by itself unlock Save when a visibility conflict exists. For each visibility conflict, require an explicit decision:

- **Use latest visibility / استخدام الرؤية الأحدث**: adopt that entry's latest canonical visibility in the draft.
- **Keep my draft visibility / الاحتفاظ برؤية مسودتي**: explicitly retain that entry's draft visibility; this is a new explicit disclosure decision against the latest reviewed version.

Only after all visibility conflicts are explicitly resolved/acknowledged may the reviewed `expectedVersion` advance to the latest reviewed canonical version and Save become available, subject to existing validation/access blocks. Save must use that reviewed version; a later 409 repeats this recovery against the newly loaded template. This prevents stale drafts from silently restoring public visibility. Non-visibility fields may continue existing conflict-review behavior unless their existing contract requires more. Legacy clients remain protected server-side by `expectedVersion`: a stale legacy write conflicts; after reload/retry, omitted visibility resolves against the latest persisted state.

المحرر الحالي فقط، مع select أصلي ضمن FormField وفق الاصطلاح الموجود، وخيار داخلية أولاً وافتراضي الإضافة. يوضح النص قصد الإفصاح دون الإيحاء بإنشاء رابط أو أهلية عامة. لا فقد للرؤية عند التحميل والحفظ والترتيب؛ وضع القراءة غير قابل للتعديل وقاعدة التعريف غير النشط باقية. عند 409 أو تعارض النسخة تُحفظ مسودة الموظف ويُعاد تحميل القالب القانوني الأحدث، وتُقارن الرؤية لكل معرّف تعريف محتفظ به ويُعرض كل اختلاف صراحة. لا تفتح «مراجعة الحالي» العامة زر الحفظ وحدها عند تعارض الرؤية. يلزم لكل اختلاف اختيار «استخدام الرؤية الأحدث» لتحديث المسودة أو «الاحتفاظ برؤية مسودتي» كقرار إفصاح صريح جديد مقابل النسخة الأحدث التي تمت مراجعتها. لا تتقدم `expectedVersion` ولا يتاح الحفظ حتى حسم أو إقرار كل تعارضات الرؤية صراحة مع احترام الموانع الحالية؛ يستخدم الحفظ النسخة المراجعة، ويعيد أي تعارض لاحق هذه الخطوات. تبقى مراجعة الحقول الأخرى حسب عقدها الحالي، وتحمي النسخة العملاء القدامى: تتعارض الكتابة القديمة، وبعد التحميل والمحاولة يحسم غياب الرؤية من الحالة المحفوظة الأحدث.

## 16. Accessibility / RTL / responsive requirements | الوصول والاتجاه والاستجابة

Unique stable control IDs derived from safe entry identity; label includes Definition display label to distinguish rows. `FormField` supplies label and optional hint ID, but does not automatically bind `aria-describedby`: bind hint explicitly on select. Native option/selected semantics; keyboard Tab/arrows/Space/Enter as appropriate; no color-only disclosure state. Preserve visible focus, logical CSS, `dir=auto` dynamic names and English/Arabic shell direction. Reuse 44px control/touch targets and full wrapping. Mobile cards stack; the current ≥900px template grid has four columns, so adding a control requires a scoped grid/reflow adjustment rather than assuming existing columns fit. Verify mobile 320/375px, tablet and desktop, zoom, long Arabic labels, pointer/touch/keyboard and screen-reader name/value/help. Static source tests cannot establish functional browser acceptance.

معرّفات ثابتة وعناوين مميزة وتوصيل aria-describedby صريح؛ FormField لا يوصله تلقائياً. عناصر أصلية وحالة لا تعتمد على اللون وتركيز واضح واتجاهات منطقية والتفاف كامل وأهداف لمس 44px. تعدل شبكة القالب المحدودة لاستيعاب الحقل الجديد وتُختبر الشاشات والتكبير والعربية ووسائل الإدخال وقارئ الشاشة فعلياً؛ الاختبار الساكن ليس قبولاً يدوياً.

## 17. File impact map | خريطة أثر الملفات

Future implementation impact only; none of these source/test/schema files is changed now.

| Exact file / الملف | Planned change / التغيير المخطط |
| --- | --- |
| `domains/catalog/reference-data/domain/catalog-reference-data.ts` | Required canonical visibility; reuse strict validator. |
| `domains/catalog/reference-data/application/catalog-reference-data-template.types.ts` | Wire existing declaration; preserve optional command property. |
| `domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts` | Validate, scoped lock read, omission resolve, version checks, safe transitions/audit. |
| `domains/catalog/reference-data/ports/catalog-reference-data-unit-of-work.port.ts` | Add scoped lock read; canonical configure input stays required. |
| `domains/catalog/infrastructure/persistence/schema.ts` | Entry column/default/CHECK only. |
| `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts` | Locked read/mappers/write/response round-trip. |
| `domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.ts` | Runtime entry parser, omission-preserving request, canonical result. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.types.ts` | Required view field; distinct optional mutation-entry input. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.ts` | Strict visibility reconstruction on GET and PUT success; compatible serialization. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.ts` | Preserve field in save handoff; test reviewed-version behavior. |
| `domains/catalog/reference-data/presentation/catalog-reference-template-manager.tsx` | Native per-entry select/default/help/read-only/conflict comparison. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.i18n.ts` | English/Arabic labels/help/state. |
| `app/globals.css` | Only template-control layout/reflow needed by extra field. |
| `domains/catalog/reference-data/domain/catalog-reference-data.test.ts` | Canonical/strict validator tests. |
| `domains/catalog/reference-data/application/catalog-reference-data.use-cases.test.ts` | Input/identity/default/version/permission/audit unit tests. |
| `domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.test.ts` | Exact parser, legacy omission, canonical response, auth/error tests. |
| `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.ts` | Migration/round-trip/locked concurrency/audit rollback/scoping. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.client.test.ts` | Response validation/serialization/fixture updates. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.coordinator.test.ts` | Visibility handoff/add/default/conflict tests. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.presentation.test.ts` | Native labeling/layout/read-only/i18n source guards; not manual QA. |
| `domains/catalog/sharing/application/public-product-share-contracts.test.ts` | Replace pre-P2 canonical-no-field assertion with required canonical visibility; keep optional-input test. |
| `drizzle/<next-generated-tag>.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/<next>_snapshot.json` | One future generated migration with its metadata; exact generated tag determined later. |

Inspected but no planned source changes: route wrappers, page mount, server runtime, UoW implementation, identity Presentation shell, Product Entry reference-data port/browser client and their composition fixtures. Product Entry uses a separate existing authenticated read view (three-field entries), not the canonical Domain type; extra response visibility need not alter Product value editing. Existing P1 Sharing resource-state port consumes `SpecificationTemplate` by type, so no new Sharing runtime is needed. Repositories do not call other repositories. No automatic broad fixture rewrite: use TypeScript and scoped searches to identify any additional actual canonical literals during implementation and report them before expanding scope.

الخريطة أثر مستقبلي لا تغييرات حالية. الحقل قانوني في Domain واختياري في إدخال الكتابة فقط؛ الترحيل له SQL وبيانات وصفية مولدة لاحقاً. ملفات التركيب وProduct Entry المقروءة لا تحتاج تغييراً إنتاجياً؛ نموذج قراءته الحالي مستقل ولا نسخ لقيم المنتج. لا إعادة كتابة واسعة للعينات أو توسيع صامت للنطاق.

## 18. Test matrix | مصفوفة الاختبارات

| Evidence layer / الطبقة | Required cases / الحالات المطلوبة |
| --- | --- |
| Domain/input | Exact internal/public; null/missing canonical, wrong case/whitespace/Boolean/number/object rejected; optional command absence retained; bad keys/entry shapes rejected; required/order unchanged. |
| Application compatibility | New omitted→internal; new explicit public round-trip; retained internal omitted→internal; retained public omitted→public; explicit public→internal and internal→public; reorder retains identity; remove then later re-add omitted→internal; same-save same ID retained; duplicate ID/order InvalidInput. |
| Version/authority | Existing missing/stale version Conflict; absent template with version Conflict; valid empty creation/update; unauthorized/restricted/foreign Type/Definition reject; same Definition across two Product Types has independent visibility. |
| HTTP | Old client omitted field preserved through real Application; explicit invalid values rejected before write; canonical GET/PUT response; expectedVersion shape; existing origin/session/error mapping. Fake handler success alone cannot prove storage preservation. |
| PostgreSQL | Seeded pre-P2 rows backfill internal; clean migration; default/NOT NULL/CHECK/PK/FK/order; complete read/write round-trip; old writer omission routed through new compatibility code; concurrent public update vs omitted update conflicts or preserves latest, never silently resets; audit failure rolls back all; no success audit on conflict. |
| Audit | Existing event and productTypeId/entryCount/version retained; exact toPublicCount/fromPublicCount/visibilityTransitions keys; deterministic JSON string sorted by specificationDefinitionId with exact item keys; test every transition/count rule in section 13, additions/removals null only in evidence, unchanged values omitted, no forbidden metadata. |
| Browser contracts | Strict load/save visibility; malformed/missing response fails closed; add internal; explicit edits retained on save response/reload; read-only state; automated coordinator/editor conflict cases below. Source guards alone do not prove the recovery behavior. |
| Functional manual QA | Owner/Staff/manage/view-only, two Workspaces, public/internal save/reload, reordered rows, old-client request, keyboard/mouse/touch, Arabic/English, RTL/reflow/zoom/focus/screen-reader. |
| Exclusions | No public routes/crypto/grant schema/env behavior introduced; Product values/readiness and Direct Share remain unchanged. |

Required conflict recovery cases in both automated coordinator/editor behavior tests and manual QA; these are future verification plans, not executed results. Manual cases must cover English/Arabic and touch, mouse and keyboard interaction within section 16's responsive/accessibility matrix.

| Case / الحالة | Automated coordinator/editor assertion / التحقق الآلي | Manual QA observation / الملاحظة اليدوية |
| --- | --- | --- |
| Server public → latest internal; draft still public / الخادم من عامة إلى داخلية والمسودة عامة | Preserve draft on 409, reload canonical internal, surface retained-ID difference and block Save/version advancement pending explicit decision. | In two sessions change server public to internal, save stale public draft, observe preserved draft, latest internal difference and disabled Save. / تغيير متزامن في جلستين ثم التحقق من بقاء المسودة وعرض الفرق ومنع الحفظ. |
| Server internal → latest public; draft still internal / الخادم من داخلية إلى عامة والمسودة داخلية | Preserve draft on 409, reload canonical public, surface retained-ID difference and block Save/version advancement pending explicit decision. | Repeat with latest public and stale internal draft; verify both values are shown and Save remains blocked. / تكرار الحالة المعاكسة والتحقق من ظهور القيمتين ومنع الحفظ. |
| Generic review / المراجعة العامة | Generic review cannot unlock any unresolved visibility conflict or advance reviewed expectedVersion; resolving only one of several conflicts also leaves Save blocked. | Invoke review current with unresolved visibility differences; verify Save remains unavailable. / تنفيذ المراجعة العامة مع اختلافات غير محسومة والتحقق من استمرار منع الحفظ. |
| Explicit Use Latest / اختيار الأحدث صراحة | Per-entry decision adopts latest visibility and acknowledges only that conflict; all remaining differences must still be resolved. | Choose Use latest visibility for each affected row; verify draft adopts the shown latest value and no other row is silently acknowledged. / اختيار الأحدث لكل صف والتحقق من تحديثه دون إقرار الصفوف الأخرى تلقائياً. |
| Explicit Keep Draft / الاحتفاظ بالمسودة صراحة | Per-entry decision retains draft visibility as new explicit disclosure intent against the latest reviewed version; all remaining differences must still be resolved. | Choose Keep my draft visibility for each affected row; verify draft is retained with explicit acknowledgment before Save becomes available. / الاحتفاظ برؤية كل صف صراحة والتحقق من الإقرار قبل إتاحة الحفظ. |
| Save after all resolutions / الحفظ بعد حسم الجميع | Advance reviewed expectedVersion only after every visibility conflict is resolved/acknowledged; saved payload uses latest reviewed expectedVersion and chosen visibility; another 409 repeats recovery. | Resolve all differences, Save and verify the request uses the latest reviewed version and reload preserves chosen visibility. / حسم كل الاختلافات ثم التحقق من نسخة الطلب وبقاء الرؤية المختارة بعد إعادة التحميل. |

Existing coverage: Domain validator tests exist; Application tests currently cover read filtering/scoping/reference updates, not the new compatibility algorithm. HTTP tests cover generic auth/origin/errors with fake use cases. Persistence integration already covers ordered template configure, foreign Definitions, duplicate IDs/orders, versions and snapshot read. Browser client/coordinator cover create-vs-update expectedVersion and strict reconstruction; Presentation coverage is predominantly source inspection. Migration hooks alone do not prove clean/upgrade cases. Fill these gaps instead of claiming they already pass.

الاختبارات المطلوبة تغطي كل حالات الغياب والصريح والهوية والحذف والتزامن والصلاحيات والتدقيق والترحيل والواجهة. التغطية الحالية لا تثبت الرؤية أو حفظ غيابها؛ الاختبارات المزيفة لا تثبت التخزين والاختبارات الساكنة لا تثبت قبول المتصفح. تُملأ الفجوات صراحة.

## 19. Regression matrix | مصفوفة الانحدار

Future targeted first: `npx tsx --test` explicit Reference Data Domain/Application/HTTP/client/coordinator/Presentation test paths from section 17, plus updated P1 Sharing contract test. Then existing `npm run test:reference-data`, `npm run test:product-entry`, `npm run test:direct-sharing`; TypeScript `npx tsc --noEmit --incremental false`, lint, build, `npm run db:check` and git diff check. Guarded integration and clean/pre-P2 migration tests are required for future schema/persistence changes; use existing `test:integration:prepare` and integration tsconfig/compiled Node tests before approved full integration/review gates. No new test tool or dependency. Record actual test counts/commands and manual observations; none are claimed run now.

لاحقاً تبدأ المسارات المحددة ثم انحدارات البيانات المرجعية وإدخال المنتج والمشاركة المباشرة وفحوص الأنواع والبناء والمخطط، مع تكامل محمي مطلوب لتغييرات التخزين والترحيل. تسجل الأعداد الفعلية والقبول اليدوي؛ لا أوامر تنفيذية الآن ولا مكتبة جديدة.

## 20. Rollback / compatibility considerations | التراجع والتوافق

One migration does not mean one deployment step. **Once any `publicVisibility="public"` value may be created, NO legacy three-field template writer may remain active.** Approved deployment safety order: schema expansion first; all template-writing server instances must be P2-compatible; only then may Public visibility editing be enabled. Existing code that deletes/reinserts three fields is unsafe after public values exist, even though the database default is internal. No intermediate committed P2 source state may contain a required canonical field with unmapped/default-resetting reads/writes. Prefer one reviewed cohesive implementation commit.

Deployment must guarantee this order using either:

- **A. Single-instance / controlled maintenance-write window** during rollout: keep Public editing unavailable while schema and every active template writer are upgraded; enable it only with P2-compatible writers.
- **B. Two-phase rollout**: fully deploy compatible writers before the editor control becomes available.

Do not introduce a new feature-flag system. If the deployment environment cannot guarantee A or B, Public visibility editing must remain disabled and P2 release acceptance is blocked.

Rollback before public values exist can disable UI while retaining expanded schema. After any public values exist, never roll back to legacy replacement writers and never drop the visibility column as an ordinary rollback. Disable editing/maintenance as needed and retain the compatibility-capable server and stored values; a destructive data/schema rollback needs separate review. Old browser clients can continue omitting the field against the new server. New browser against old server must fail strict response reconstruction instead of resetting metadata. No public issuance is enabled by P2.

ترحيل واحد لا يعني خطوة نشر واحدة؛ بمجرد السماح بإنشاء أي قيمة `publicVisibility="public"` يجب ألا يبقى أي كاتب قالب قديم بثلاثة حقول نشطاً. القاعدة المعتمدة: توسعة المخطط أولاً، ثم توافق جميع نسخ الخادم الكاتبة للقوالب مع P2، ثم إتاحة تعديل الرؤية العامة. يضمن النشر ذلك بإحدى آليتين: A نسخة واحدة أو نافذة كتابة صيانة مضبوطة أثناء الترقية؛ أو B نشر على مرحلتين يستكمل الكتّاب المتوافقين قبل إتاحة عنصر المحرر. لا نظام feature-flag جديد. إن تعذر ضمان إحدى الآليتين يبقى تعديل الرؤية العامة معطلاً ويُحجب قبول إصدار P2. بعد وجود public لا تراجع إلى كتّاب الاستبدال القدامى ولا حذف لعمود الرؤية كتراجع عادي؛ تعطّل الكتابة عند الحاجة وتُحفظ البيانات والتوافق. العميل القديم آمن مع الخادم الجديد، والجديد يرفض استجابة قديمة ناقصة. لا إصدار روابط في P2.

## 21. Risks | المخاطر

Primary risks: blanket defaults erase public; parallel snapshot mixes preimages; stale draft review overwrites a newer intent; row replacement loses a newly added column; parser casts hide malformed values; new UI against old server resets metadata; four-column desktop layout overflows; obsolete P1 compile assertion blocks integration; reused test DB hides migration defects. Mitigations are the locked preimage/identity algorithm, strict parser/mapper, version/conflict review, complete impact map, staged writer readiness and explicit migration/manual tests. No public-disclosure projection limits become canonical storage rules.

المخاطر الأساسية افتراضي يمحو public وقراءة غير متسقة ومسودة قديمة ومحو العمود عند الاستبدال وتحويلات نوعية تخفي خطأ واستجابة قديمة وتجاوز العرض واختبار P1 تاريخي وترحيل غير مختبر. تعالجها الخوارزمية المقفلة والتحقق والنسخة والنشر والاختبارات المحددة؛ لا قيود إسقاط عام على التخزين القانوني.

## 22. Open questions | الأسئلة المفتوحة

The supplied independent planning review passed architecture, scope, Domain, omission compatibility, transaction semantics, lock-read design, migration plan, HTTP compatibility, authorization/Multi-Tenant and test matrix. Its small planning correction is incorporated here: per-conflict visibility decisions, the accepted audit encoding/counts and guaranteed deployment safety mechanisms. No unresolved architectural/identity compatibility blocker remains. Exact migration tag depends on the next implementation baseline; deployment must select and prove mechanism A or B in section 20, and manual QA fixtures remain to be scheduled. This plan alone records `P2PlanningReview: PASS`, `P2PlanningGate: PASS`, `P2Status: READY_FOR_IMPLEMENTATION`; implementation remains NOT AUTHORIZED / NOT STARTED pending separate authorization. Parent/Current-Roadmap/Sprint reconciliation remains separately reviewed.

نجحت المراجعة التخطيطية المستقلة المقدمة في المعمارية والنطاق والمجال والتوافق والمعاملة والقفل والترحيل وHTTP والصلاحيات وتعدد المستأجرين ومصفوفة الاختبارات. أُدرج التصحيح الصغير: قرار صريح لكل تعارض رؤية وصيغة التدقيق وأعداده المقبولة وآليات نشر مضمونة. لا مانع معماري أو غموض هوية متبقٍ؛ يحدد خط الأساس اللاحق اسم الترحيل، ويجب اختيار وإثبات A أو B في القسم 20 وتنسيق QA. تسجل هذه الخطة وحدها `P2PlanningReview: PASS` و`P2PlanningGate: PASS` و`P2Status: READY_FOR_IMPLEMENTATION`؛ يبقى التنفيذ غير معتمد ولم يبدأ حتى اعتماد منفصل، وتبقى مصالحة حالات العقد الأب وCurrent-Roadmap وSprint لمراجعة منفصلة.

## 23. Implementation sequencing | تسلسل التنفيذ

After separate authorization: (1) recheck baseline and migration tip; (2) implement cohesive canonical/type/validation/lock-read/mapper/write/audit/HTTP integration plus unit and integration tests; (3) generate exactly the visibility migration/meta and prove clean/populated upgrades; (4) integrate view/client/editor/i18n/scoped CSS and functional QA; (5) run targeted regressions then required full/review gates and capture evidence. Do not commit partially wired canonical contracts. Deployment order is schema expansion → all compatible server writers → editor public controls, with rollback restrictions above. No P3–P7 implementation is part of this sequence.

بعد اعتماد منفصل: تحقق خط الأساس، تكامل قانوني ومعاملة وHTTP كامل، ترحيل واحد مع اختبارات ترقية، محرر وتحقق فعلي، ثم الانحدارات وبوابات المراجعة. لا التزام جزئي للحقول القانونية؛ ترتيب النشر المخطط ثم كل الكتّاب المتوافقين ثم التحكم العام. لا عمل لاحق ضمن التسلسل.

## 24. P2 completion gate | بوابة إكمال P2

Future completion requires independent implementation review PASS; all compatibility/tenant/version/audit/migration round trips PASS; Reference Data/Product Entry/Direct Share regressions PASS; TypeScript/lint/build/schema/diff checks PASS; responsive bilingual functional browser acceptance PASS with keyboard/mouse/touch and accessibility observations; proven deployment safety mechanism A or B in section 20; report and automated review evidence under existing task rules. No test count or manual PASS is inferred here. Only accepted completion may open the next planning gate. This corrected plan records READY_FOR_IMPLEMENTATION planning readiness only; it does not authorize or start implementation, mark P2 COMPLETE or open P3–P7. Task 3.23 remains IN PROGRESS.

يتطلب الإكمال المستقبلي مراجعة تنفيذ مستقلة وكل حالات التوافق والنطاق والتدقيق والترحيل والانحدارات والفحوص والقبول الفعلي ثنائي اللغة وإثبات آلية النشر A أو B في القسم 20 مع الأدلة والتقرير والحزمة. لا PASS لاختبار أو QA مفترض؛ تسجل الخطة المصححة جاهزية التخطيط READY_FOR_IMPLEMENTATION فقط دون اعتماد التنفيذ أو بدئه أو إعلان اكتمال P2 أو فتح P3–P7؛ تبقى المهمة 3.23 قيد التنفيذ.

## 25. P3 handoff boundary | حد تسليم P3

P2 will hand off canonical template visibility that safely round-trips, explicit management/editor intent, compatibility/version/audit evidence and one tested visibility migration. P3 remains GATED / NOT STARTED and separately authorized: crypto adapters, key/runtime/readiness are excluded. P4 owns the separate grant migration/persistence/lifecycle; public issuance cannot precede safe visibility metadata round-trip. P6 owns anonymous projection/defensive limits, P7 owns final rendering. Task 3.23 remains IN PROGRESS; no later slice is authorized by planning P2.

تسلّم P2 رؤية قانونية متوافقة مع أدلة النسخة والتدقيق وترحيلها المختبر فقط. P3 مشروطة وتشمل التشفير والجاهزية لاحقاً؛ P4 تملك ترحيل التفويض المستقل ولا إصدار قبل توافق الرؤية؛ P6 الإسقاط الدفاعي وP7 العرض. المهمة 3.23 قيد التنفيذ ولا اعتماد لشريحة لاحقة.

## Documentation verification | تحقق الوثيقة

This planning task verifies whitespace, UTF-8, local Markdown links, unchanged source/status documents and `.serena/project.yml` hash/index state only. Existing tests and migration artifacts were inspected, not executed or modified. Stop before separate P2 implementation authorization.

تحقق هذه المهمة الفراغات وUTF-8 والروابط وثبات المصدر والحالات وSerena فقط. فُحصت الاختبارات والترحيلات دون تنفيذ أو تعديل. تتوقف المهمة قبل اعتماد منفصل لتنفيذ P2.
