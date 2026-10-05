# Task 3.23-P1 — Metadata and Domain Contracts Planning | تخطيط البيانات الوصفية وعقود المجال

**Status:** P1 planning PASS; independent implementation review PASS; P1CompletionGate PASS; P1 COMPLETE at implementation commit `43b99c6`. **Date:** 2026-10-05. **Parent:** Task 3.23 — IN PROGRESS. **P2:** READY_FOR_PLANNING only; production implementation not authorized. **P3–P7:** GATED / NOT STARTED.

**الحالة:** نجح تخطيط P1 ومراجعة تنفيذها المستقلة وبوابة إكمالها (PASS)؛ P1 مكتملة (COMPLETE) عند التزام التنفيذ `43b99c6`. **التاريخ:** 2026-10-05. **المهمة الأصلية:** 3.23 — قيد التنفيذ (IN PROGRESS). **P2:** جاهزة للتخطيط فقط (READY_FOR_PLANNING)؛ التنفيذ الإنتاجي غير معتمد. **P3–P7:** مشروطة باعتماد مستقل ولم تبدأ.

## 1. Authority and deliverable | المرجعية والمخرج

[ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md) and the approved [Task 3.23 implementation contract](Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md) govern. P1 planning, independent implementation review and completion gate are PASS; P1 is COMPLETE at implementation commit `43b99c6`. The approved technical plan below is preserved as historical authority. P2 is READY_FOR_PLANNING only; P3–P7 remain GATED / NOT STARTED. No later slice implementation is authorized. This reconciliation changes status documentation only; production code, migrations, tests, dependencies, deployment and Git mutations are outside this request.

This approved plan addresses the complete A–J P1 planning scope and the approved parent contract. Planning review of the file names, method signatures and bounded P1 scope below has passed; no implementation is performed by this status reconciliation.

يحكم ADR-013 وعقد 3.23 المعتمد هذه الخطة. نجح التخطيط ومراجعة التنفيذ المستقلة وبوابة الإكمال؛ اكتملت P1 عند التزام التنفيذ `43b99c6`. تُحفظ الخطة التقنية المعتمدة أدناه كمرجعية تاريخية. P2 جاهزة للتخطيط فقط؛ تبقى P3–P7 مشروطة باعتماد مستقل ولم تبدأ. لا تصريح لتنفيذ شريحة لاحقة. تقتصر هذه المصالحة على وثائق الحالة، دون كود إنتاج أو ترحيلات أو اختبارات أو مكتبات أو نشر أو عمليات Git.

## 2. Bounded repository findings | نتائج فحص المستودع المحدود

| Existing symbol/file / الرمز أو الملف | Confirmed behavior / السلوك المؤكد |
| --- | --- |
| `SpecificationTemplateEntry` in `reference-data/domain/catalog-reference-data.ts` | Readonly Definition ID, sortOrder, required; no visibility field. |
| `SpecificationTemplate` in the same file | Workspace/id/Product Type/version, readonly entries, createdAt/updatedAt. No template Active flag. |
| `ConfigureProductTypeSpecificationTemplateUseCase.execute` | Inline command entry type with optional required; manage permission; duplicate ID/order rejection; safe positive expectedVersion; Active same-Workspace references; transactional configure/audit. |
| Reference-data validators | Strict literal value types; sortOrder safe integer 0..1,000,000; trimmed displayName 1..160 UTF-16 units; existing optional-unit pattern. |
| `CatalogReferenceDataSnapshot` and repository port | Canonical templates in snapshot; configureTemplate currently accepts `SpecificationTemplate["entries"]`. |
| `PostgreSqlCatalogReferenceDataRepository` | Snapshot explicitly reconstructs entry fields; configure reads current template, version-CAS updates, deletes old entries and reinserts new ones. Omission cannot be resolved from a prematurely defaulted input. |
| Existing Sharing | `domain/`, `application/`, `ports/`, `infrastructure/`, `presentation/`; Direct Share is separate. Ports are interfaces; use cases use typed outcomes. |
| `ServerSession` precedent | create/rehydrate validation, versioned digest and defensive Date copies. Reuse the style, not Identity lifecycle, expiry policy or crypto adapters. |

Serena was used first for semantic symbols/references; rg confirmed exact literals, types and file names. Ownership is explicit in the authoritative documents and existing folders, so Graphify was not needed. A symbol-reference result alone is not a complete impact map: indexed-access types and explicit object mappers were also inspected.

الجدول يوثق الفحص المحدود: لا رؤية حالية في الإدخال؛ القالب مقيد بالمساحة والنوع والنسخة؛ الإدخال الكتابي مضمّن؛ الحفظ يعيد بناء الحقول ويحذف ويعيد الإدراج بعد مقارنة النسخة. تحققت Serena من الرموز أولاً وrg من الأسماء الدقيقة. الملكية واضحة فلا حاجة إلى Graphify. لا تكفي مراجع الرمز وحدها لأن بعض المستهلكين يستخدمون أنواعاً مفهرسة أو بناء كائنات صريحاً. سابقة Session أسلوب تحقق ونسخ دفاعية فقط، لا نقل لسياسات Identity.

## 3. Specification visibility Domain contract | عقد رؤية المواصفات

P1 implementation may introduce the visibility type and strict canonical validator in the existing reference-data Domain file, preserving ownership. It **must not add a required `publicVisibility` field to the current `SpecificationTemplateEntry` yet**. P1 may also introduce Public Share Grant/value contracts and approved Application-facing port/type declarations. These approved P1 changes are accepted at implementation commit `43b99c6`; this closure reconciliation performs no implementation.

The following is the **final post-P2 canonical shape**, not a P1 entry-model change:

```ts
export type PublicSpecificationVisibility = "internal" | "public";

export interface SpecificationTemplateEntry {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required: boolean;
  readonly publicVisibility: PublicSpecificationVisibility;
}
```

`SpecificationTemplate.entries` retains its existing type and ordering. No duplicate Template, Definition or Product-value model; no global Definition visibility. `required`, ordering, active status and Direct Share readability never imply public disclosure. No changes to Product publication readiness or persisted Product values.

Plan a strict `validatePublicSpecificationVisibility(value: unknown): PublicSpecificationVisibility` beside the existing validators. Accept exactly the two lowercase literals; reject null, undefined, booleans, numbers, whitespace/case aliases and objects. Use a fixed safe error identifier `InvalidPublicSpecificationVisibility`, consistent with the validators' throw-and-Application-map pattern. Do not include supplied values in errors. Omission is an input compatibility rule, not a valid canonical Domain value.

يمكن لتنفيذ P1 المعتمد إضافة نوع الرؤية ومدققها القانوني الصارم وعقود التفويض والقيم ومنافذ وأنواع Application المعتمدة فقط. **لا يضيف بعد حقل publicVisibility الإلزامي إلى SpecificationTemplateEntry الحالي**؛ الشكل أعلاه هو الشكل القانوني النهائي بعد P2 لا تغيير نموذج P1. قُبلت تغييرات P1 المعتمدة عند التزام التنفيذ `43b99c6`، ولا تنفذ مصالحة الإغلاق هذه أي كود. يحتفظ القالب بنوع الإدخالات وترتيبها ولا نموذج مكرر أو رؤية عامة للتعريف. لا تستنتج الرؤية من required أو الترتيب أو النشاط أو المشاركة المباشرة، ولا تتغير جاهزية نشر المنتج أو قيمه. يفحص المدقق المقترح unknown ويقبل الحرفيين الصغيرين فقط، ويرفض الغياب والقيم الأخرى دون تضمينها في الخطأ؛ يعالج غياب الإدخال عند حدود التوافق لا داخل الحالة القانونية للمجال.

## 4. Write input and compatibility handoff | الإدخال الكتابي وتسليم التوافق

Plan a named Application entry input declaration in the existing reference-data Application ownership. P1 may declare this type; replacing the current inline command/write-port shapes and integrating their behavior belongs to P2:

```ts
export interface ConfigureSpecificationTemplateEntryInput {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required?: boolean;
  readonly publicVisibility?: PublicSpecificationVisibility;
}
```

The command retains context, productTypeId, optional expectedVersion and readonly entries. This is a write-input shape referencing the existing metadata, not a duplicate specification domain model. Unknown runtime input still needs strict validation; the TypeScript annotation does not validate JSON. Explicit invalid visibility and unsupported fields are rejected. Do not use `publicVisibility ?? "internal"` on update input: it erases the difference between omission and explicit invalid null.

| Case / الحالة | Required resolution / الحل |
| --- | --- |
| Existing/migrated entry with no historical visibility | Backfill internal before enabling visibility persistence. |
| New template or genuinely new omitted entry | internal. |
| Existing entry, compatible omitted update | Preserve current persisted visibility for same Workspace + template + Definition. |
| Explicit valid visibility | Use requested internal/public. |
| Explicit null or invalid value | InvalidInput, no write/audit. |
| Stale version, including omission | Conflict; no defaulting/replay that restores obsolete disclosure. |
| Remove entry, then re-add in a later template version with omission | New entry defaults internal; no historical visibility revival. |

Resolve omission within the existing versioned reference-data UoW before delete/reinsert; the repository never calls another repository. The write port must distinguish omission from resolved canonical entries. Plan to replace its configureTemplate input entry type with `ConfigureSpecificationTemplateEntryInput[]` via a type-only import, while its result remains canonical `SpecificationTemplate`. Application validates explicit fields first; the versioned persistence operation preserves omission and resolves it against current rows. Existing authorization, Active validation, duplicate rules, required=false default and template audit ownership remain intact. Transition counts contain no Product values or tokens.

**Resolved integration boundary:** P1 leaves the existing canonical `SpecificationTemplateEntry` and its current read/write consumers unchanged. P2 atomically integrates the required `publicVisibility` field, visibility schema/migration, snapshot/read mapping, versioned configure/save omission compatibility, HTTP transport, and authenticated editor/view types as one coherent slice; database and deployment sequencing is specified in section 7. After P2 the canonical field is required, never optional. Do not add casts/defaults that reset existing public values or a temporary second specification model. P1 declarations do not wire new input types into live persistence/transport. Missing metadata in public resolution must never infer public; malformed persisted explicit visibility is not silently normalized.

الإدخال الكتابي نوع Application مسمى مع رؤية اختيارية للتوافق، وليس نموذج مواصفات مكرراً. لا يتحقق TypeScript من JSON. تُرفض القيم الصريحة غير الصالحة والحقول غير المدعومة؛ لا تستخدم ?? لإخفاء الفرق بين الغياب وnull. يوضح الجدول الحالات، ويُحل الغياب داخل معاملة النسخة قبل الحذف والإدراج باستخدام الصف الحالي المقيد بالمساحة والقالب والتعريف. يحتفظ منفذ الكتابة بالغياب، وتبقى نتيجته قالباً قانونياً كاملاً. لا يستدعي مستودع مستودعاً آخر، ولا تتغير الصلاحية أو التحقق أو التدقيق.

**حد التكامل المحسوم:** تترك P1 الإدخال القانوني الحالي ومستهلكي القراءة والكتابة دون تغيير؛ تعريف نوع الإدخال الجديد لا يربطه بالحفظ أو النقل الفعلي. تدمج P2 الحقل الإلزامي والمخطط والترحيل وخرائط اللقطة والقراءة وتوافق الغياب في الحفظ ذي النسخة وHTTP وأنواع المحرر والعرض الإداري معاً كشريحة متكاملة؛ يحدد القسم 7 تسلسل قاعدة البيانات والنشر. بعد P2 الحقل القانوني إلزامي لا اختياري، دون casts أو افتراضات تمحو public أو نموذج مواصفات مؤقت ثانٍ. لا يستنتج الحل العام public من غياب البيانات ولا يطبع قيمة صريحة فاسدة إلى internal بصمت.

## 5. Public Share Grant and value contracts | عقود التفويض والقيم

Catalog Sharing owns proposed `PublicProductShareGrant`, `PublicProductShareGrantState` and Sharing-specific values under its existing `domain/`. Keep Workspace/Product/fixed Branch identities immutable; issuer is accountability, not ownership or continuing authorization. Use strings compatible with the parent crypto signatures and existing Catalog ports; do not introduce a shared identity framework or import Identity Infrastructure.

Proposed state fields: workspaceId, grantId, productId, branchId, lookupDigest `{keyVersion,value}`, bearerEnvelope `{formatVersion:1,keyVersion,iv,ciphertext,authTag}` or null, issuedByActorId, issuedAt, revokedAt or null, revokedByActorId or null, revision. No raw bearer/URL, eligibility snapshot/status, expiration, receipts or visitor state. Envelope and digest shape types can be declared once in Sharing Domain and type-re-exported by the crypto port; Domain must not import Application to obtain them. Shape validation is not cryptographic verification.

| Proposed operation / العملية | Pure Domain requirements / متطلبات المجال |
| --- | --- |
| `create(input)` | Nonblank scoped identities; server UUID grant identity; safe positive versions; revision=1; valid issuance Date; complete format-1 envelope; no revocation. Caller supplies generated protected values, not keys. |
| `rehydrate(state)` | Validate every shape/state combination, positive safe revision, digest lower 64 hex, envelope canonical lengths/encoding when present, finite Dates and revocation >= issuance. Reject partial envelopes or mismatched revocation actor/time. |
| `revoke(actorId, occurredAt)` | First transition clears entire envelope, stores actor/time, increments safe revision. Duplicate revoke returns AlreadyRevoked without changing original metadata/revision. No eligibility, key or decryption requirement. |
| Controlled protected-value maintenance | Unrevoked only; expected revision and immutable tuple; preserve token identity indirectly through Application crypto validation; change complete digest/envelope atomically and increment revision. No restoration after revoke. Concrete maintenance is P3/P4. |
| Read-only state access | Defensive Date/value copies; no implicit JSON serialization into logs or public responses. No generic raw-token diagnostic helpers. |

Canonical lifecycle has two states determined by revokedAt: unrevoked requires complete envelope and null revocation pair; revoked requires full revocation pair and null envelope. Revocation is permanent. Replacement is Application orchestration of old revoke + new grant + audit, not a third lifecycle state or a Domain repository call. Cardinality/digest uniqueness requires PostgreSQL enforcement; one aggregate cannot prove global uniqueness. Temporary eligibility loss/restoration never mutates the grant.

Plan transient token validation as a pure Sharing value/parser contract: exactly 43 base64url characters representing 32 bytes, canonical round-trip/trailing bits, no padding/normalization. Infrastructure generates/encrypts; no `node:crypto`, Buffer, environment access or random generation in Domain. A pure parser can validate the fixed alphabet/length and canonical final sextet without a dependency; P3 repeats byte/encoding checks at crypto boundaries. Do not store a token on the grant or serialize it from a value object by default.

تملك Sharing التفويض وحالته وقيمه الخاصة داخل domain الحالي. تبقى هويات المساحة والمنتج والفرع ثابتة، والمُصدر للمساءلة لا ملكية الموظف. الحقول المذكورة فقط، بلا رمز صريح أو رابط أو أهلية أو انتهاء أو إيصال أو بيانات زوار. يعرف نوع البصمة والغلاف مرة واحدة في المجال ويعاد تصديره نوعياً في المنافذ دون اعتماد عكسي على Application. التحقق البنيوي لا يثبت صحة التشفير.

الإنشاء والاسترجاع يتحققان من الهوية والنسخ والأزمنة والبصمة والغلاف. أول إلغاء يمحو الغلاف كله ويثبت الممثل والزمن ويرفع النسخة؛ التكرار لا يغيرها. لا فك أو مفتاح أو أهلية للإلغاء، ولا استعادة بعده. صيانة القيم المحمية مقيدة بغير الملغى ومقارنة النسخة، وتنفيذها لاحق. الاستبدال تنسيق Application لا حالة جديدة، والتفرد مسؤولية قاعدة البيانات. يعيد الوصول نسخاً دفاعية ولا يسلسل الأسرار للتشخيص. عقد الرمز العابر يفحص 43 محرفاً و32 بايت والترميز القانوني دون Node أو بيئة أو توليد عشوائي في المجال؛ لا يحتفظ به التفويض.

## 6. Application-facing ports and types | منافذ وأنواع Application

Use existing Sharing `ports/`, not a new layer. P1 plans declarations only; no adapters, runtime factories, repositories or use-case execution. The parent's section 14 crypto signatures are authoritative and must be reproduced unchanged when authorized:

- `PublicShareTokenGeneratorPort.generate()` -> `PublicShareCryptoResult<string>`.
- `PublicShareLookupDigestPort.create(token)`, `candidates(token)`, `verify(token,digest)` with the exact parent result/value types.
- `PublicShareBearerProtectionPort.encrypt(token,context)`, `decrypt(envelope,context,digest)` with the parent's immutable context and envelope fields.
- `PublicShareCryptoFailure` remains KeyUnavailable / IntegrityFailure / CryptoUnavailable; no exception payloads, keys or Node types.

Plan `PublicProductShareGrantRepository` operations with explicit Workspace-scoped tuple/ID queries, active lookup, insert and expected-revision save; all return Domain state or typed absence/conflict. Anonymous digest-candidate lookup is a distinct internal method that returns the persisted scoped tuple, never accepts caller Workspace authority. Multiple matches are integrity failure. No repository method calls another repository, generates a token, decides permission or returns a public URL.

Plan `PublicProductShareUnitOfWork.execute<T>(work)` and `PublicProductShareTransactionContext` patterned on existing reference-data callback UoW. The context contains grant persistence, scoped resource read/parent-lock capability, and safe audit. Its contract promises one transaction, rollback on failed mutation/audit, Product parent before ordered grant locks, READ COMMITTED management; implementations and retries are P4. Do not return a failure object after partial mutation and accidentally commit: the eventual UoW/use-case contract must distinguish abort from successful no-op.

Use existing clock `now(): Date` and identifier `next(): string` interface style for proposed `PublicProductShareClock` and `PublicProductShareIdentifierGenerator`; UUID generation is Infrastructure later. Plan a typed internal resource handoff referencing existing SpecificationValue and SpecificationValueType, preserving Text/Number/Boolean until Presentation. It contains only the scoped data required to validate the parent's eligibility; it is not the anonymous DTO or a duplicate specification store. No public resolver algorithm, translations, media I/O or admission adapter in P1. Later Application outcomes retain the parent's exact codes; no new HTTP mapping is implemented.

تستخدم المنافذ المجلد الحالي وتخطط للتعريفات فقط. تظل تواقيع التشفير الثلاثة وأنواع نتائجها كما في القسم 14 من العقد دون أسرار أو Node. مستودع التفويض مقيد بالمساحة، والبحث المجهول بالبصمات طريقة داخلية مستقلة لا يقبل سلطة مساحة من العميل؛ تعدد النتائج فشل سلامة. لا توليد أو تفويض أو رابط داخل المستودع. وحدة العمل callback بسياق الحفظ والقراءة المقيدة والقفل والتدقيق، وتضمن المعاملة والرجوع وترتيب الأقفال دون تنفيذ P4. يجب ألا تؤدي نتيجة فشل عادية بعد كتابة جزئية إلى commit. الساعة والمعرف بنفس أسلوب المشروع، وتسليم القيم الداخلية يعيد استخدام أنواع المواصفات ويحفظ دلالتها حتى العرض؛ لا DTO عام أو خوارزمية حل أو ترجمة أو قراءة وسائط أو محول قبول في P1.

## 7. Schema and migration design only | تصميم المخطط والترحيل فقط

**Visibility migration belongs to P2, not P1. One schema migration is sufficient at the current baseline because no persisted public values exist yet.** Add `catalog_specification_template_entries.public_visibility text NOT NULL DEFAULT 'internal'` with an allowed-value CHECK restricted to internal/public; existing rows become internal. Preserve current tenant/template/Definition keys, required and sortOrder constraints.

Database migration count is distinct from staged deployment sequencing: apply the one visibility schema migration under separate authorization, deploy compatible snapshot/read and versioned omission-preserving write behavior, verify round-trip compatibility, then enable the UI to create public values. Legacy writers must never reset an existing public value once public values become possible; replace/disable incompatible writer versions before enabling those values. The coherent P2 integration does not require a second visibility migration merely because deployment has several stages. Never enable a public selector against unmigrated/ambiguous metadata.

**Grant-table migration belongs to P4 and is a separate migration from P2 visibility.** It must not enable public issuance before visibility metadata safely round-trips. P1 planning creates no migration files and assigns no migration number, schema export change or migration execution.

Future `catalog_public_product_share_grants` follows parent sections 8–9 exactly: text scoped identities and actors; positive lookup version/lower64hex digest; nullable five envelope fields; issuance/revocation timestamptz; positive safe bigint revision default1. PK Workspace+grant; RESTRICT Workspace/Product/Branch FKs; **no physical Identity actor FK**. Actor accountability validated in Application. Envelope consistency is exactly:

```sql
CHECK (
  (revoked_at IS NULL AND revoked_by_actor_id IS NULL
    AND envelope_format_version IS NOT NULL AND encryption_key_version IS NOT NULL
    AND bearer_iv IS NOT NULL AND bearer_ciphertext IS NOT NULL AND bearer_auth_tag IS NOT NULL)
  OR
  (revoked_at IS NOT NULL AND revoked_by_actor_id IS NOT NULL
    AND envelope_format_version IS NULL AND encryption_key_version IS NULL
    AND bearer_iv IS NULL AND bearer_ciphertext IS NULL AND bearer_auth_tag IS NULL)
)
```

Apply the parent's positive/version/encoded-length/alphabet/nonblank/time checks in addition; CHECK unknown/null behavior must not admit partial states. Active-tuple partial unique index uses revoked_at IS NULL alone; independent global digest unique, version+digest lookup and scoped history indexes retain their exact parent names. No eligibility predicate or purge. Revoke/replace-old clear retrieval fields atomically while retaining digest/actors/timestamps/audit. Encryption coverage is for unrevoked grants only; HMAC verification ring remains bounded at eight, encryption has no matching cap. P1 specifies test cases; real schema/migration/index/concurrency evidence belongs to separately authorized integration, principally P4 for grants.

التصميم فقط: **ترحيل الرؤية ضمن P2 لا P1، ويكفي ترحيل مخطط واحد في خط الأساس الحالي لعدم وجود قيم public محفوظة بعد**. يضاف عمود text غير فارغ بافتراضي internal وقيد الحرفيين، وتصبح الصفوف الحالية internal دون تغيير المفاتيح. عدد ترحيلات قاعدة البيانات منفصل عن مراحل النشر: المخطط ثم خرائط القراءة والكتابة الحافظة للغياب والتحقق من الدورة الكاملة قبل تمكين UI من إنشاء public. لا يجوز لكاتب قديم إعادة قيمة public موجودة إلى internal؛ يستبدل أو يعطل غير المتوافق قبل تمكين تلك القيم. لا يلزم ترحيل رؤية ثانٍ لمجرد تعدد مراحل النشر. **ترحيل جدول التفويض ضمن P4 ومستقل عن ترحيل P2**، ولا يمكّن الإصدار العام قبل ضمان دورة رؤية آمنة. لا ملفات ترحيل أو رقم أو تصدير مخطط أو تنفيذ أثناء تخطيط P1. جدول التفويض وفهارسه يطابقان العقد: مفاتيح ملكية دون FK للممثل إلى Identity، وغلاف كامل للنشط وغائب كلياً للملغى وفق القيد أعلاه مع بقية قيود الشكل والوقت. التفرد للأهلية غير الملغاة فقط دون الأهلية العامة؛ لا تطهير. يمحو الإلغاء والاستبدال غلاف القديم ذرياً مع حفظ التاريخ؛ مفاتيح التشفير للنشطة فقط وحد الثمانية لHMAC لا التشفير. اختبارات قاعدة البيانات الحقيقية لاحقة وليست ادعاء تحقق P1.

### Validation and limit ownership | ملكية التحقق والحدود

Reference Data Domain owns canonical existing metadata rules: display-label validation, unit validation, and visibility literal validation once integrated. P1 may introduce the strict visibility validator but does not integrate the field into the canonical entry until P2.

Public Sharing Application projection in **P6** owns these defensive anonymous-disclosure limits:

- Product name: at most 512 Unicode code points AND 2,048 UTF-8 bytes.
- Rendered specification value: at most 2,048 code points AND 8,192 UTF-8 bytes.
- At most 64 qualifying public specification items.
- Complete ordered specification array: at most 65,536 UTF-8 bytes, using the parent contract's serialization/counting semantics.
- Zero qualifying public specifications: temporary public ineligibility, not grant revocation.

These limits **must not become Product Aggregate validation or canonical Product/specification storage limits**. P7 Presentation owns Boolean localization, bidi/layout/wrapping, safe final string rendering and no meaning-changing truncation. P6 remains responsible for projection eligibility/limit enforcement, including the rendered-value/array bounds using the rendering handoff; P7 does not turn them into Domain rules. P1 only records these ownership boundaries and implements none of them.

يملك مجال Reference Data قواعد البيانات الوصفية القانونية الحالية: اسم العرض والوحدة وحرفيا الرؤية عند التكامل؛ يمكن إضافة المدقق الصارم في P1 دون دمج الحقل قبل P2. تملك **Application للإسقاط العام في P6** الحدود الدفاعية: اسم المنتج 512 نقطة Unicode و2048 بايت UTF-8، القيمة المعروضة 2048 نقطة و8192 بايت، 64 عنصراً مؤهلاً، ومصفوفة المواصفات المرتبة كاملة 65536 بايت وفق عد العقد، وغياب جميع المؤهلة يجعل المورد غير مؤهل مؤقتاً لا ملغى. **لا تتحول هذه الحدود إلى تحقق Product Aggregate أو قيود التخزين القانوني للمنتج أو المواصفات**. تملك P7 تعريب Boolean وbidi والتخطيط والالتفاف والعرض النصي النهائي الآمن دون اقتطاع يغير المعنى؛ تبقى الأهلية وفرض حدود الإسقاط في P6 باستخدام تسليم العرض. تسجل P1 الملكية فقط ولا تنفذها.

## 8. Exact proposed file impact map | خريطة أثر الملفات المقترحة

Paths below are relative to repository root. They are planned impacts, **not files created/modified by this request**.

| File / الملف | Planned impact and boundary / الأثر والحد |
| --- | --- |
| `domains/catalog/reference-data/domain/catalog-reference-data.ts` | P1 visibility type/strict validator only; existing SpecificationTemplateEntry unchanged. Required canonical field integration is P2. |
| `domains/catalog/reference-data/domain/catalog-reference-data.test.ts` | Future P1 visibility-literal validator acceptance only; no entry/default-integration tests until P2; unchanged now. |
| `domains/catalog/reference-data/application/catalog-reference-data-template.types.ts` | Proposed P1 named input declaration, not transport implementation. |
| `domains/catalog/reference-data/ports/catalog-reference-data-unit-of-work.port.ts` | P2 write-input type integration; existing configureTemplate/snapshot/result signatures unchanged in P1; no P1 UoW implementation. |
| `domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts` | Identified normalization/inline-input consumer; actual transactional omission/visibility behavior requires separately authorized P2 integration. |
| `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts` | Identified snapshot + configure constructor/delete-reinsert consumer; P2 compatibility/round-trip handoff, no P1 persistence implementation. |
| `domains/catalog/sharing/domain/public-share-values.ts` | Proposed P1 protected-value shapes and transient canonical-token validation; no crypto. |
| `domains/catalog/sharing/domain/public-product-share-grant.ts` | Proposed P1 scoped grant state, create/rehydrate/revoke invariants; no persistence or orchestrated replacement. |
| `domains/catalog/sharing/domain/public-share-values.test.ts` | Future pure P1 invalid/canonical value tests. |
| `domains/catalog/sharing/domain/public-product-share-grant.test.ts` | Future pure P1 lifecycle/retention/defensive-copy tests. |
| `domains/catalog/sharing/ports/public-share-crypto.port.ts` | Proposed P1 exact parent crypto interface declarations; P3 implements adapters/runtime. |
| `domains/catalog/sharing/ports/public-product-share-grant-repository.port.ts` | Proposed P1 scoped query/save type declarations; P4 implementation. |
| `domains/catalog/sharing/ports/public-product-share-unit-of-work.port.ts` | Proposed P1 transaction/audit/read/clock/identifier contracts; P4 implementation. |
| `domains/catalog/sharing/application/public-product-share.types.ts` | Proposed P1 internal typed handoff and outcome declarations only; no public resolution or Presentation implementation. |
| `domains/catalog/sharing/application/public-product-share-contracts.test.ts` | Future P1 fake-port/type conformance and safe-result tests, not simulated production lifecycle tests. |
| `domains/catalog/infrastructure/persistence/schema.ts` | Design reference only in P1; visibility schema/migration is P2; separate grant-table schema/migration is P4. |
| `domains/catalog/reference-data/application/catalog-reference-data.use-cases.test.ts` | Existing regressions identified; omission/version/audit behavior tests at P2 integration, not modified now. |
| `domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.ts` | Existing real-DB compatibility/version precedent; new visibility round-trip coverage at P2 integration. |
| `domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers.ts` | P2 input/response round-trip; excluded from P1 implementation. |
| `domains/catalog/reference-data/presentation/catalog-reference-data-management.types.ts` | P2 authenticated view/input types; excluded from P1 implementation. |

No P1 impact is authorized for Identity permission registry, HTTP routes, React, env parsing, crypto adapters, server runtime, database drivers, migration artifacts, package files, existing Direct Share implementation, or `.serena/project.yml`. The existing reference-data permission remains authoritative; dedicated Share management permission realization is a later separately scoped integration. No opportunistic barrel exports or shared framework files.

المسارات أثر مخطط لا تعديلات فعلية. تحدد الخريطة عقود P1 والمستهلكين اللازمين لتوافق P2، وتصميم المخطط لا تنفيذه. لا تعديل مصرح به للسجل أو HTTP أو React أو البيئة أو التشفير أو runtime أو قاعدة البيانات أو الترحيلات أو الحزم أو المشاركة المباشرة أو Serena. تبقى ملكيات الصلاحيات الحالية؛ تنفيذ صلاحية إدارة المشاركة ضمن تكامل لاحق محدد. لا طبقة أو إطار أو صادرات إضافية غير لازمة.

## 9. P1-specific automated acceptance plan | خطة القبول الآلي الخاصة بP1

| Gate / البوابة | Future executable evidence / دليل التنفيذ المستقبلي |
| --- | --- |
| Visibility literal validation | Two accepted literals; explicit invalid/null/undefined/case/whitespace/non-string rejection with fixed error and no raw input. |
| P1 required-field boundary | Compiler/type review confirms current SpecificationTemplateEntry/read/write consumers remain unchanged; no optional canonical field, casts/resetting defaults or temporary second specification model. |
| Compatibility handoff design | P1 records the omission/default table only. Executable omission-preservation/default/version-CAS/snapshot/transport tests belong to P2, including old public preservation, new omitted internal and no stale/removal revival. |
| Grant rehydration | Valid active/revoked states; every partial revocation/envelope combination, bad versions/revision/digest/length/canonical encoding/UUID/Date rejected. Synthetic values only. |
| Revocation | First clears envelope and increments revision; duplicate preserves actor/time/revision; no recovery/resurrection, no keys/eligibility dependency. |
| Scope/immutability | Foreign tuple substitution cannot change an existing grant; no mutable Date/object aliases; issuer authority loss is not a Domain revocation trigger. Global tenant FK proof is deferred to DB tests. |
| Canonical token shape | 43 characters, 32-byte representation, invalid padding/alphabet/whitespace/noncanonical final bits; no token on persisted grant. Randomness/HMAC/GCM vectors are P3. |
| Port contracts | Compiler checks/fake conformance for exact three crypto capabilities, explicit scope, expected revision, typed absence/failure, UoW abort contract, no Node/DB/React dependencies in Domain/ports. |
| Typed spec handoff | string/number/boolean retained, zero/false preserved, no duplicate specification model; final Boolean localization/public serialization excluded until P6/P7. |
| Schema design review | Walk each parent column/check/index and NULL-state case; verify no Identity FK/expiry/eligibility/plaintext column; visibility one migration in P2, grant separate migration in P4, deployment stages distinct; no claim of migration execution. |
| Defensive-limit ownership review | Limits and zero-spec eligibility assigned only to P6 projection; P7 rendering/localization; no new Product Aggregate or canonical storage validation and no P1 implementation. |

After separately authorized P1 code work, run explicit new paths with existing `npx tsx --test` rather than inventing an npm script, then `npm run test:reference-data` and `npm run test:direct-sharing` for affected regressions, and `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build`, `git diff --check`. Do not widen to full integration suites without an implementation completion gate requiring them. Test fixtures and compiler conformance must exercise contracts rather than repeat implementation internals. No browser QA can prove Domain invariants; P1 manual review is ownership, file scope, compatibility staging and schema design. Do not claim later HTTP/DB/crypto/browser gates passed from P1 pure tests.

**Verification performed now:** documentation whitespace, UTF-8/local-link checks and repository file-boundary inspection only. No production/test/migration command is run for this planning-only artifact.

الجدول يحدد قبولاً مستقبلياً للحرفيين والتوافق وحالات التفويض والإلغاء والثبات والنطاق والرمز والمنافذ وتسليم القيم وتصميم المخطط. لا يثبت اختبار نقي المعاملة أو التشفير أو قاعدة البيانات أو المتصفح. بعد اعتماد كود منفصل تستخدم أدوات tsx الحالية بالمسارات الدقيقة ثم الانحدارات المناسبة وفحوص الأنواع والlint والبناء والفرق؛ لا مكتبة أو أمر وهمي. المراجعة اليدوية لملكية العقود والتوافق وحدود الملفات والتصميم. التحقق المنفذ الآن للوثيقة وروابطها وحدود الملفات فقط، دون أوامر إنتاج أو اختبارات أو ترحيل.

## 10. Review gate and later-slice handoff | بوابة المراجعة وتسليم الشرائح

P1 planning, independent implementation review and P1CompletionGate are PASS; P1 is COMPLETE at implementation commit `43b99c6`. The approved bounded P1 technical plan remains historical authority. P2 atomically integrates required canonical visibility, its schema/migration, compatible read/write/transport and editor; P3 supplies exact crypto adapters/readiness; P4 supplies protected grant persistence/UoW, atomic audit/clear/replace and its separate migration/schema tests; P5 manages explicit authorized retrieval only; P6 resolves live typed eligibility/media and defensive projection limits; P7 renders safe localized strings. P2–P7 scopes/order are unchanged. P2 is READY_FOR_PLANNING only, permitting planning/research/review but no production implementation; P3–P7 remain GATED / NOT STARTED. No later slice implementation is authorized; Task 3.23 remains IN PROGRESS.

نجح تخطيط P1 ومراجعة تنفيذها المستقلة وبوابة إكمالها؛ اكتملت P1 عند التزام التنفيذ `43b99c6`. تبقى خطة P1 التقنية المعتمدة مرجعية تاريخية. تدمج P2 الرؤية القانونية الإلزامية ومخططها وترحيلها والقراءة والكتابة والنقل والمحرر المتوافقين، وتتسلم P3 التشفير والجاهزية، وP4 الحفظ والمعاملة والتدقيق والمحو والاستبدال وترحيلها المستقل واختبارات المخطط، وP5 الإدارة بتفاعل صريح، وP6 الحل الحي والوسائط وحدود الإسقاط الدفاعية، وP7 العرض الآمن المعرب. لا تغيير لترتيب P2–P7 أو نطاقها؛ P2 جاهزة للتخطيط والبحث والمراجعة فقط دون تنفيذ إنتاجي، وتبقى P3–P7 مشروطة باعتماد مستقل ولم تبدأ. لا تصريح لتنفيذ شريحة لاحقة والمهمة 3.23 قيد التنفيذ.

## Source evidence | أدلة المصدر

- [Reference-data Domain](../../domains/catalog/reference-data/domain/catalog-reference-data.ts)
- [Reference-data use cases](../../domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts)
- [Reference-data ports](../../domains/catalog/reference-data/ports/catalog-reference-data-unit-of-work.port.ts)
- [Reference-data persistence](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts)
- [Reference-data integration tests](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.integration.test.ts)
- [Sharing ports](../../domains/catalog/sharing/ports/direct-product-share-repository.port.ts)
- [Session validation precedent](../../domains/identity/domain/session.ts)
- [Catalog schema](../../domains/catalog/infrastructure/persistence/schema.ts)
- [Current roadmap](Current-Roadmap.md)
