# Public Product Share Link V1 — Implementation Contract | عقد تنفيذ رابط مشاركة المنتج العام V1

**Status:** Approved for Task 3.23 planning; production implementation not yet authorized. **Date:** 2026-10-05. **Task number:** 3.23.

**الحالة:** معتمد لتخطيط المهمة 3.23؛ تنفيذ الإنتاج غير مصرح به بعد. **التاريخ:** 2026-10-05. **رقم المهمة:** 3.23.

## 1. Scope and authority | النطاق والمرجعية

[ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md) is authoritative. This contract incorporates the accepted discovery decisions from Rounds 1–3. Writing or approving this document alone does not authorize implementation, migration execution, deployment, new dependencies, or Git operations. Normative requirements apply to future separately authorized slices. Literal names, limits, and policies selected here are approved for Task 3.23 planning, not claims that they already exist in code.

V1 grants anonymous access to one live Published Product in one fixed Branch. No public Catalog browsing/search, WhatsApp-specific sending, automatic expiration, Product/specification/price snapshots, related Products, commerce flow, or synthetic employee authority. Anonymous authority is possession of an opaque bearer, never Product/Workspace/Branch identifiers. No new architecture layer or dependency is required by this contract.

ADR-013 هو المرجع الملزم، ويجمع العقد قرارات جولات الاكتشاف الثلاث المعتمدة. كتابة العقد أو اعتماده وحده لا يصرح بالتنفيذ أو الترحيلات أو النشر أو إضافة مكتبات أو عمليات Git. تطبق المتطلبات على شرائح مستقبلية معتمدة بصورة مستقلة. الأسماء والحدود والسياسات المختارة هنا معتمدة لتخطيط المهمة 3.23، وليست ادعاء بوجودها في الكود.

تمنح V1 قراءة مجهولة لمنتج Published حي واحد في فرع ثابت. لا تصفح كتالوج عام أو إرسال خاص بـWhatsApp أو انتهاء تلقائي أو لقطات محفوظة أو منتجات مرتبطة أو تجارة أو صلاحيات موظف مصطنعة. السلطة العامة هي حيازة الرمز المعتم، لا المعرفات الداخلية. لا يضيف العقد طبقة معمارية أو مكتبة.

## 2. Ownership and architecture | الملكية والمعمارية

Catalog Sharing (`domains/catalog/sharing`) owns `PublicProductShareGrant`, its repository ports, Application use cases, and `PublicProductShareUnitOfWork`. Product, Workspace/Branch, listing/pricing, reference Definitions/Templates, canonical Product values, Media, and Identity keep existing ownership. Sharing repositories may compose bounded tenant-bound PostgreSQL projections, following existing Sharing/query precedents; they never call other repositories. Application coordinates owning ports and transaction decisions. Presentation receives explicit safe models and owns rendering/interactions only. Components never access persistence. Anonymous reads never create `TrustedActorContext`; management uses the existing full-session resolver. No coupling to Identity-specific crypto adapters.

تملك Catalog Sharing التفويض الدائم ومنافذه وحالات الاستخدام ووحدة العمل. تبقى ملكية المنتج والفرع والإدراج والتسعير والتعريفات والقوالب والقيم والوسائط والهوية كما هي. يمكن للمستودع تركيب إسقاط PostgreSQL محدود ومقيد بالمستأجر دون استدعاء مستودع آخر. تنسق Application المنافذ والمعاملات، وتملك Presentation العرض والتفاعل فقط. لا تصل المكونات إلى التخزين، ولا تنشئ القراءة المجهولة `TrustedActorContext`. تستخدم الإدارة محلل الجلسة الكاملة الحالي، دون ربط تشفير المشاركة بمحولات Identity.

## 3. Exact authorization | التفويض الدقيق

Select **`catalog.sharing.publicLink.manage`**, Catalog module, `assignableToStaff: true`, `sensitive: true`. Add its English/Arabic registry descriptions through existing Identity permission ownership when implementation is authorized. Do not overload `catalog.sharing.create` or automatically add the new key to existing Staff templates. Assignment uses existing Owner-managed permission workflows.

| Operation / العملية | Required authority / السلطة المطلوبة |
| --- | --- |
| Issue / إصدار | New key + `catalog.products.view` + `pricing.view` + current Branch Scope. |
| Copy / نسخ | Same dependencies as Issue; temporary public ineligibility does not block retrieval. |
| Revoke / إلغاء | New key + current Workspace ownership and Branch Scope; no Product-view/price/eligibility dependency. |
| Replace / استبدال | Same authority as Issue + explicit intent + expected-current-grant identity. |

Dependencies are enforced in Application, not inferred from field presence or assignment validation. Owner retains all effective registry permissions and `AllBranches`, within its Workspace only. A grant is Workspace-owned: store issuer identity for accountability, but issuer permission/scope loss, role change, suspension, or departure alone never revokes it. All callers, including the original issuer, must pass current management authority. Historical/inactive same-Workspace Branch resolution must support copy/revoke; do not reuse an Active-only Branch lookup for these actions. Missing/out-of-scope resources remain non-disclosing.

الصلاحية المختارة **`catalog.sharing.publicLink.manage`** حساسة وقابلة للإسناد إلى Staff. تضاف أوصافها عبر سجل Identity الحالي عند اعتماد التنفيذ، دون توسيع صلاحية المشاركة المباشرة أو إضافتها تلقائياً للقوالب الحالية. تُفرض التبعيات في Application. يحتفظ Owner بالصلاحيات الفعلية وAllBranches ضمن مساحته فقط. التفويض مملوك للمساحة؛ فقدان سلطة المُصدر أو تغيّر دوره أو مغادرته لا يلغيه. يعاد التحقق من سلطة كل طالب. يجب أن يسمح الحل التاريخي للفرع غير النشط بالنسخ والإلغاء، دون كشف الموارد الأجنبية أو خارج النطاق.

## 4. Template visibility management | إدارة رؤية القالب

Extend the existing reference-data `SpecificationTemplateEntry`:

```ts
type PublicSpecificationVisibility = "internal" | "public";
// Added to the existing entry, not a second specification model:
publicVisibility: PublicSpecificationVisibility;
```

Future persistence adds `public_visibility` to `catalog_specification_template_entries`, non-null, default `'internal'`, check restricted to `'internal'/'public'`; existing entries backfill internal. Current-template reads, authenticated transport/view types, editor, and replacement persistence must round-trip the field. Reuse `catalog.referenceData.manage` and `ConfigureProductTypeSpecificationTemplateUseCase`; preserve expected-version checks, unique Definition/order checks, and Active reference validation.

Reject explicit null, unknown strings, booleans, or extra unsupported entry fields. For a compatible legacy update, omitted visibility preserves the currently persisted value of the same existing entry; a genuinely new omitted entry defaults internal. Resolve omission against the current version within the template transaction before delete/reinsert. Stale versions conflict rather than restoring obsolete visibility. Existing create behavior stays unchanged except the internal default. There is no Product-specific specification store.

Audit template/visibility changes atomically through the existing `SpecificationTemplateConfigured` ownership, using safe entry identities, version, and public/internal transition counts. Published Products and links observe committed changes on their next live read; canonical Product values and publication readiness are not rewritten.

يضاف الحقل إلى الإدخال الحالي، مع عمود غير فارغ وافتراضي internal وقيد القيم المسموحة، وترحيل الموجود إلى internal. تعيد جميع طبقات القراءة والنقل والمحرر والحفظ الحقل. تُستخدم صلاحية إدارة البيانات المرجعية وحالة استخدام القالب الحالية مع نسخته المتفائلة وقواعد التكرار والنشاط. تُرفض القيم الصريحة غير الصالحة. في تحديث قديم متوافق يحفظ غياب الحقل رؤية الإدخال الموجود؛ الإدخال الجديد الغائب افتراضه internal. يُحل الغياب داخل معاملة النسخة قبل الحذف وإعادة الإدراج؛ النسخة القديمة تتعارض. يُدقق التغيير بأمان ضمن ملكية القالب، ويؤثر في القراءة الحية التالية دون إعادة كتابة قيم المنتج أو جاهزية نشره.

## 5. Specification eligibility and explicit limits | أهلية المواصفات وحدودها

Resolve only the Product's current same-Workspace Product Type template; no Category/mock fallback. Templates have versions, not an invented Active flag. A qualifying entry must be explicitly public and refer to a same-Workspace Active Definition of recognized `Text/Number/Boolean` type, with exactly one matching persisted `string/number/boolean` value and safe display metadata. Historical Product references outside that template never disclose.

| Input / المدخل | Rule / القاعدة |
| --- | --- |
| Missing value; whitespace-only text / قيمة مفقودة أو نص فارغ | Omit item / حذف العنصر. |
| Zero; false / صفر أو false | Preserve / حفظ القيمة. |
| Invalid/mismatched type; nonfinite number / نوع غير صالح أو عدد غير محدود | Omit; no coercion / حذف دون تحويل تخميني. |
| Missing/blank/unsafe label / اسم عرض مفقود أو غير آمن | Omit; never use internal ID/code / حذف دون بديل داخلي. |
| Null/absent unit / وحدة غائبة | Allowed; render without unit / مسموح دون وحدة. |
| Invalid nonempty unit / وحدة غير فارغة وغير صالحة | Omit whole item / حذف العنصر كاملاً. |
| Removed entry, internal visibility, inactive/missing Definition / حذف أو رؤية داخلية أو تعريف غير نشط | Omit / حذف من العرض. |
| Oversized item / عنصر كبير | Omit whole item; never truncate / حذف كامل دون اقتطاع. |
| Duplicate Definition/order/value or impossible canonical ambiguity / تكرار أو غموض مستحيل | Integrity failure; public generic 503 / فشل سلامة و503 عام. |

Preserve original nonblank text; trimming is only an emptiness check. Numbers must be finite and match canonical persistence serialization (`String(Number(persisted)) === persisted`); do not round for display. Boolean values become localized Yes/No in Presentation. Dynamic values are plain escaped text, never HTML/Markdown or automatic links. Reject unpaired surrogates and Unicode control characters except TAB/LF/CR in values; reject control characters in labels. Preserve legitimate Arabic and combining characters without normalization/transliteration.

| Limit / الحد | Exact V1 requirement / متطلب V1 الدقيق |
| --- | --- |
| Label / اسم العرض | Existing trimmed length 1–160 UTF-16 code units; valid Unicode, at most 160 code points. |
| Unit / الوحدة | Absent or existing `^[A-Za-z0-9][A-Za-z0-9 ./%-]{0,31}$`; maximum 32 ASCII characters. |
| Rendered value / القيمة المعروضة | Maximum 2,048 Unicode code points AND 8,192 UTF-8 bytes. |
| Qualifying items / العناصر المؤهلة | Maximum 64; not a first-six or Product-specific selection rule. |
| Specifications aggregate / مجموع المواصفات | Maximum 65,536 UTF-8 bytes of compact JSON for the complete ordered `{label,value,unit?}` array, including escaping/punctuation. |
| Product name / اسم المنتج | Nonblank safe canonical text; maximum 512 code points AND 2,048 UTF-8 bytes. Missing/unsafe/oversized name makes Product temporarily ineligible; never use Product ID/code. |

Product Aggregate create/rehydrate/update paths delegate name validation to `ProductCommercialDetails.create`: optional `productName` must not be whitespace-only when supplied, but has no authoritative maximum and is preserved unchanged. Persistence uses nullable `text`, not a bounded title column. The 512-code-point/2,048-byte rule is therefore a **new defensive public-projection limit**, bounding heading/alt/response size, not a Product mutation or replacement domain rule. Never mutate or truncate the canonical name to satisfy it; temporary ineligibility is required.

تفوّض مسارات إنشاء واسترجاع وتحديث Product التحقق إلى `ProductCommercialDetails.create`: الاسم اختياري لكنه لا يكون فراغاً فقط عند تقديمه، ولا حد أقصى معتمد له، ويحفظ دون تغيير. عمود الحفظ text قابل للغياب. حد 512 نقطة و2048 بايت **حد دفاعي جديد للإسقاط العام** لضبط حجم العنوان والنص البديل والاستجابة، لا تغيير لقاعدة المجال أو للاسم. لا تعديل أو اقتطاع لتلبية الحد؛ يصبح المورد غير مؤهل مؤقتاً.

Code points are counted by Unicode iteration, not grapheme clusters; bytes use UTF-8 after JSON serialization where specified. Original label validation's UTF-16 limit is retained to avoid broadening existing rules. No normalization or meaning-changing shortening is permitted. If individually valid items exceed the item-count or aggregate limit, treat the resource as temporarily ineligible; never select an arbitrary first N. These are new bounded V1 safety limits: large enough for generic technical data, small enough to bound output. No authoritative public value/aggregate limits existed; Direct Share's truncation/first-six rules are deliberately not reused.

**Zero qualifying public specifications makes the resource temporarily ineligible.** The grant remains unrevoked and may resume when one qualifying item returns. This does not change Product publication readiness.

يُحل قالب نوع المنتج الحالي في المساحة نفسها فقط، دون رجوع إلى قالب فئة أو بيانات وهمية. يلزم إدخال public صريح وتعريف Active ونوع معروف وقيمة محفوظة مطابقة وبيانات عرض آمنة. تطبق حالات الحذف والحدود في الجدولين دون كشف معرفات أو اقتطاع أو اختيار أول عدد من العناصر. يُحفظ النص غير الفارغ كما هو، والأعداد المحدودة بتمثيلها المعتمد، وتترجم القيم المنطقية في Presentation. تُرفض Unicode غير الصالحة والمحارف التحكمية حسب القاعدة أعلاه دون تغيير العربية. تُعد نقاط Unicode بالتكرار وبايتات UTF-8 بعد التسلسل حيث نص الجدول؛ حد الاسم القديم بوحدات UTF-16 محفوظ. تجاوز عدد العناصر أو مجموعها يجعل المورد غير مؤهل مؤقتاً. غياب جميع المواصفات المؤهلة يوقف المورد مؤقتاً، ولا يلغي التفويض أو يغير جاهزية النشر.

## 6. Explicit public projection | الإسقاط العام الصريح

The final rendered allow-list is:

```ts
interface PublicProductShareView {
  readonly productName: string;
  readonly retail: { readonly amount: string; readonly currency: string };
  readonly specifications: readonly {
    readonly label: string;
    readonly value: string;
    readonly unit?: string;
  }[];
  readonly mainImage: { readonly src: string; readonly alt: string } | null;
}
```

`amount` is exact major-unit text from the existing ISO formatter. `src` is only the fixed same-origin grant media path; never storage metadata or another capability. `alt` derives from the safe Product name. Application preserves the validated semantic value until Presentation: reuse existing `SpecificationValue = string | number | boolean` and Definition `SpecificationValueType = "Text" | "Number" | "Boolean"`, validating their correspondence. Do not pre-stringify Boolean or Number values at the Application handoff or create a duplicate specification domain model/store. Presentation converts these typed values into final `{label, value: string, unit?}` entries, localizes Boolean values, and applies the rendered-value/aggregate limits before exposing the model; over-limit outcomes follow section 5. Locale is rendering context, not tenant authority. Semantic type, Definition ID, internal sort and other identities must not serialize into the public DTO/HTML/RSC payload merely to support rendering.

Never include Product code, Branch name, Workspace/seller identity, Wholesale, Reference Cost, Inventory/status, internal Product/Branch/Workspace/grant IDs, permissions, audit, storage/root/key/checksum metadata, or lifecycle diagnostics. No reuse of authenticated Details DTOs or Direct Share payloads.

قائمة الإسقاط هي اسم المنتج وسعر التجزئة النصي الدقيق والعملة والمواصفات المرتبة والصورة الاختيارية فقط. مسار الصورة هو مسار التفويض على الأصل نفسه، والنص البديل مشتق من اسم المنتج الآمن. تحفظ Application النوع الدلالي المعتمد حتى Presentation باستخدام SpecificationValue الحالي string/number/boolean ونوع التعريف Text/Number/Boolean مع التحقق من تطابقهما، دون تحويل مبكر أو نموذج مجال أو مخزن مكرر. تحول Presentation القيم إلى `{label, value: string, unit?}` وتترجم القيم المنطقية وتفرض حدود القيمة المعروضة والمجموع قبل كشف النموذج، مع نتائج تجاوز القسم 5. لا يُكشف النوع الدلالي أو معرف التعريف أو الترتيب والمعرفات الداخلية في DTO أو HTML أو RSC لدعم العرض. لا تُسلسل بيانات السلطة والتخزين والتدقيق أو الجملة والتكلفة والمخزون وهوية البائع. لا يعاد استخدام DTO التفاصيل أو حمولة المشاركة المباشرة.

## 7. Live price and resource eligibility | السعر والأهلية الحية

Every public page/media request requires: unrevoked grant, same-Workspace Published Product, fixed Active Branch, explicit Listed record (absence is not Listed), safe Product name, supported current Retail/currency, and at least one qualifying public specification within limits. Retail is Branch override when present, else Workspace base Retail. An unsupported/malformed existing override does not fall through to base; fallback applies only to absent override. Preserve valid zero. Never use Wholesale/Reference Cost or guessed currency scales. Use `formatIsoCurrencyAmountMinor` with bigint arithmetic. Eligibility failures are temporary, separate from revocation; restoring eligibility can resume the same URL. Image absence is not resource ineligibility.

يتطلب كل طلب عام تفويضاً غير ملغى ومنتج Published وفرع Active وإدراج Listed صريحاً واسم منتج آمناً وسعر تجزئة مدعوماً ومواصفة عامة واحدة على الأقل ضمن الحدود، كلها في المساحة نفسها. الأولوية لتجاوز الفرع الموجود ثم السعر الأساسي عند غياب التجاوز فقط؛ التجاوز الموجود غير الصالح لا يبرر الرجوع. الصفر صحيح ولا رجوع للجملة أو التكلفة. يستخدم منسق ISO الدقيق. فشل الأهلية مؤقت وقد يعود الرابط نفسه، وغياب الصورة لا يوقف المنتج.

## 8. Grant schema and retention | مخطط التفويض والاحتفاظ

Future Drizzle schema under Catalog Sharing persistence defines **`catalog_public_product_share_grants`**. This table specification is documentation, not a migration. Text identifiers follow existing composite-key conventions; grant IDs are server-generated UUID strings.

| Column / العمود | PostgreSQL shape / الشكل |
| --- | --- |
| `workspace_id`, `grant_id`, `product_id`, `branch_id` | `text NOT NULL` |
| `lookup_key_version` | `integer NOT NULL`, positive |
| `lookup_digest` | `text NOT NULL`, lowercase 64-character hex |
| `envelope_format_version` | `integer NULL`, V1 equals 1 when present |
| `encryption_key_version` | `integer NULL`, positive when present |
| `bearer_iv`, `bearer_ciphertext`, `bearer_auth_tag` | `text NULL`, canonical unpadded base64url when present; decoded 12/43/16 bytes respectively |
| `issued_by_actor_id` | `text NOT NULL` |
| `issued_at` | `timestamptz NOT NULL` |
| `revoked_at` | `timestamptz NULL` |
| `revoked_by_actor_id` | `text NULL` |
| `revision` | `bigint NOT NULL DEFAULT 1`, safe positive integer; internal CAS for lifecycle/key maintenance |

Primary key: `(workspace_id, grant_id)`. Composite FKs: Workspace; `(workspace_id, product_id)` to `catalog_products`; `(workspace_id, branch_id)` to `workspace_branch_references`, all `ON DELETE RESTRICT`. No physical issuer/revoker FK to Identity: bounded inspection of existing Catalog persistence and adjacent Workspace/Inventory schemas found no clear Catalog-owned-row -> Identity-account composite-FK precedent. Keep actor IDs as tenant-scoped accountability values; Application validates the current actor/Workspace authority and audit atomically. Catalog Sharing does not own Identity lifecycle; departure or later Identity changes do not delete or invalidate historical evidence.

Checks: identifiers nonblank; digest shape; safe versions/revision; exact V1 envelope lengths (IV 16, ciphertext 58, tag 22 encoded characters) and alphabet; revocation timestamp/actor both null or both present; revoked timestamp not before issuance. Infrastructure additionally validates canonical decoding and cryptographic integrity. `revoked_at IS NULL` is the entire active lifecycle predicate; no redundant mutable eligibility/status column. No plaintext bearer or URL, expiry, snapshot, replacement receipt, or mandatory replacement-link column.

Exact envelope/lifecycle consistency check (in addition to the shape/version checks when present):

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

Retain revoked rows in V1; no automatic purge. Authorized repeat-copy needs encrypted bearer material only while unrevoked. First successful Revoke permanently clears all five retrieval-envelope fields; Replace clears the old envelope atomically with revocation/new-grant creation. Preserve grant row/identity, lookup digest/version, issuer/revoker/timestamps, revision and audit. Revoked grants can never be copied/decrypted/recovered; clearing retrieval material is not grant deletion or weaker revocation. New active replacement retains its own complete envelope. No plaintext is ever retained. This is permanent clearing in current durable grant state; retained backups/WAL follow deployment retention/access controls and must never serve as a revoked-bearer recovery path. Encryption readiness/retention covers only unrevoked envelopes. Lookup key retirement may ignore revoked rows once active migration coverage is proven: revoked URLs still resolve to the same generic 404, never revive. Audit retains old/new grant correlation without a separate grant relationship subsystem.

يُعرّف مستقبلاً جدول Drizzle المذكور داخل حفظ Catalog Sharing؛ الجدول أعلاه توثيق لا ترحيل. يستخدم مفتاحاً مركباً ومعرف تفويض UUID مولداً من الخادم، ومفاتيح ملكية للمساحة والمنتج والفرع مع RESTRICT. لم يجد الفحص المحدود سابقة واضحة لمفتاح Catalog مركب إلى حساب Identity؛ لذلك لا مفتاح مادي للمُصدر أو الملغي. تبقى هويات الممثلين قيم مساءلة مقيدة بالمساحة، وتتحقق Application من التفويض والتدقيق ذرياً؛ لا تملك Sharing دورة حياة Identity ولا تمحو مغادرة الممثل التاريخ. يفرض قيد الاتساق أعلاه غلافاً كاملاً للصف غير الملغى، وغياب الحقول الخمسة جميعاً مع بيانات إلغاء كاملة للصف الملغى؛ لا غلاف جزئي. تفرض بقية القيود الأشكال والنسخ والزمن. تعني `revoked_at IS NULL` النشاط فقط؛ لا أهلية محفوظة أو نص صريح أو انتهاء أو لقطة أو إيصال. يمحو أول إلغاء ناجح الغلاف نهائياً، ويمحو الاستبدال غلاف القديم ذرياً مع إلغائه وإنشاء الجديد الذي يحتفظ بغلافه. يبقى الصف والهوية والبصمة ونسختها والممثلون والأزمنة وrevision والتدقيق دون تطهير؛ لا نسخ أو فك أو استرداد لتفويض ملغى ولا ضعف للإلغاء. المحو يخص حالة الصف الدائمة الحالية؛ تخضع النسخ الاحتياطية وWAL لسياسة النشر ولا تستخدم لاسترداد رمز ملغى. تغطية مفاتيح التشفير للنشطة فقط. يمكن سحب مفتاح بحث يخص الملغاة بعد إثبات ترحيل النشطة؛ تظل روابطها 404 ولا تعود.

## 9. Database uniqueness and indexes | التفرد والفهارس

Required index names/semantics:

- `catalog_public_product_share_grants_active_uq`: unique `(workspace_id, product_id, branch_id) WHERE revoked_at IS NULL`.
- `catalog_public_product_share_grants_digest_uq`: globally unique `lookup_digest`, including retained revoked rows, following the session digest precedent.
- `catalog_public_product_share_grants_lookup_idx`: `(lookup_key_version, lookup_digest)`.
- `catalog_public_product_share_grants_history_idx`: `(workspace_id, product_id, branch_id, issued_at)`.

Eligibility never appears in a uniqueness predicate. Application checks alone or locking a nonexistent grant are insufficient. Do not add speculative analytics/recipient/expiry indexes.

الفهرس الجزئي يضمن تفويضاً غير ملغى واحداً لكل مساحة ومنتج وفرع، وفهرس البصمة يضمن تفردها مستقلاً حتى في التاريخ الملغى. فهارس البحث والتاريخ محددة أعلاه. لا تدخل الأهلية في شرط التفرد، ولا تكفي فحوص Application أو قفل صف غير موجود. لا فهارس تحليلية أو انتهاء متخيلة.

## 10. Transactions, locks, retries, and concurrency | المعاملات والأقفال والتزامن

`PublicProductShareUnitOfWork` owns a PostgreSQL transaction and binds Sharing repositories, scope reads, and safe audit to it. Management transactions use READ COMMITTED and explicit row locks. Lock the same-Workspace `catalog_products` parent by `(workspace_id, product_id) FOR UPDATE` before any grant row; then lock grant rows in grant-ID order. This extends the existing parent/row-lock precedent without a lock table. Different Branches of the same Product serialize in V1. Do not mutate Product revision merely to obtain a lock. Revoke first resolves its immutable tuple scoped to Workspace, then re-reads after acquiring parent/grant locks. All grant mutation/key-maintenance paths use this order. Never acquire Identity account/membership mutation locks after Product/grant locks; full-session resolution completes first. Existing writers are not claimed to share these locks.

Issue: authorize; enter UoW; lock parent; read unrevoked grant. If present, decrypt/validate and return it even during temporary ineligibility; no issuance audit. If absent, verify full current issuance eligibility, generate token/digest/envelope, insert grant, append issuance audit, commit, then return URL. No URL escapes a failed transaction. Copy follows current authorization/scope and parent/grant locks, requires unrevoked state before decrypting on demand, validates, commits, returns same URL; no lifecycle change/audit. Revoke needs no decryption or resource eligibility: mark targeted grant permanently revoked with actor/time, set all five retrieval-envelope fields to NULL in the same update, increment revision, audit first transition, commit. Repeat revoke preserves original metadata and cleared envelope and returns AlreadyRevoked. Audit/persistence failure rolls back both revocation and clearing.

Replace: explicit expected grant, full Issue authority/eligibility; lock/re-read; if expected is not the current unrevoked grant return Conflict. Atomically revoke old and NULL its five retrieval-envelope fields, insert freshly generated new grant with its own complete envelope, and append one replacement event correlating both identities. No separate issue/revoke audit duplication for that replacement. Any failure rolls back all changes, including old-envelope clearing. Lost replacement response is recovered by explicitly requested authorized Copy/current state inspection; do not replay against a new expected identity automatically. No receipt subsystem.

Bounded policy: at most **3 transaction attempts total** for Issue only, on positively identified active-tuple races, PostgreSQL serialization failure (`40001`), or deadlock (`40P01`); use fresh transactions/context checks. No retry for authorization, eligibility, integrity/key failure, or arbitrary `23505`. Issue tuple conflicts roll back before re-read. Digest/grant-ID collision permits at most **3 generated candidates total per operation**, with fresh randomness; budget is not reset by transaction retries. Collision must never return another tuple's grant. Migration/revoke/copy/replace do not auto-retry a business mutation; surface typed conflict/unavailability. Bounds are a new small V1 policy, not a discovered universal repository constant. Losing candidates exist only in transient memory and are discarded, never logged or durably cleaned up.

| Race / السباق | Required result / النتيجة |
| --- | --- |
| Issue vs Issue | One active grant and stable URL, absent intervening lifecycle change. |
| Issue vs Revoke | Target-specific serialized outcome: reuse before revoke can return a now-revoked URL; explicit issue after revoke can create a new grant. Old revoke never targets successor. |
| Copy vs Revoke | Copy ordered first may return a URL subsequently revoked; revoke ordered first prevents active retrieval. No guarantee of validity after response. |
| Replace vs Replace | One winner; other expected-old-grant request conflicts. No retry rotating winner. |
| Eligibility mutation vs public read | One request-time read-only REPEATABLE READ snapshot composes grant and resource eligibility/projection. Changes committed before snapshot are observed; changes after it apply to subsequent requests. |

Public HTML resolves everything before streaming content/status. Media uses an independent fresh read snapshot immediately before file delivery. A request already authorized from its snapshot may finish across a concurrent change; already received bytes cannot be recalled. This is the defined consistency guarantee, not a promise that existing resource writers share grant locks. Verify it with deterministic barrier tests.

تربط وحدة العمل المستودعات والتدقيق بمعاملة واحدة. تستخدم الإدارة READ COMMITTED وقفل صف المنتج المقيد بالمساحة أولاً ثم صفوف التفويض بترتيب معرفاتها؛ لا جدول أقفال جديد ولا تعديل لنسخة المنتج لأجل القفل. ينتهي حل جلسة Identity قبل أقفال المنتج، ولا يُدعى أن الكتّاب الحاليين يشاركون الأقفال. يعيد الإصدار الموجود حتى أثناء عدم الأهلية؛ الجديد يتحقق من الأهلية ويكتب التفويض والتدقيق ذرياً قبل إرجاع الرابط. النسخ يتحقق من عدم الإلغاء قبل فك التشفير دون تغيير أو تدقيق. الإلغاء يستهدف تفويضاً ويعمل دون أهلية أو تشفير ويحفظ بيانات أول إلغاء ويمحو حقول الغلاف الخمسة في التحديث والمعاملة نفسيهما؛ التكرار يحفظ البيانات والمحو. الاستبدال يقارن الهوية المتوقعة ويلغي القديم ويمحو غلافه وينشئ الجديد بغلاف كامل وتدقيق مترابط ذرياً؛ أي فشل يرجع التغييرات والمحو معاً. استرجاع نتيجة مفقودة يكون بطلب نسخ صريح ومصرح به؛ التعارض لا يدوّر الفائز ولا ينشئ إيصالاً. حدود المحاولات الثلاث أعلاه ثابتة ولا تُضاعف عبر الإعادات. تستخدم القراءة العامة لقطة REPEATABLE READ حية قبل البث، ولقطة مستقلة للوسائط؛ التغييرات اللاحقة تراها الطلبات التالية ولا تسترجع بايتات استُلمت.

## 11. Bearer format | صيغة الرمز

Generate exactly 32 bytes with `randomBytes(32)` and encode unpadded base64url: exactly 43 characters. Require `[A-Za-z0-9_-]{43}`, decoded 32 bytes, identical re-encoding. Reject whitespace/padding/noncanonical trailing bits/extra segments/alternate alphabets. Perform transport decoding once; encoded structural separators never become extra accepted token forms. No trimming/normalization, tenant/resource/key/format identity. Malformed tokens use generic public 404 without database lookup, after route/source admission.

يولد الرمز من 32 بايت عشوائياً ويُرمز base64url دون حشو بطول 43، مع تحقق الأبجدية والطول وفك 32 بايت وإعادة الترميز المطابقة. يُرفض الحشو والفراغ والتعدد والترميز غير المعتمد، ويُفك ترميز النقل مرة واحدة دون تطبيع. لا هوية داخل الرمز. الرمز المشوه يعيد 404 عاماً دون بحث قاعدة بيانات بعد فحص القبول.

## 12. Lookup HMAC | بصمة البحث

Exact digest input is UTF-8 bytes of **`qsc:catalog:public-sharing:lookup:v1`**, one zero byte (`0x00`), then the canonical ASCII token string. HMAC-SHA-256 returns 32 bytes persisted as lowercase 64-character hex with key version. New writes use active version. Lookup computes candidates for all configured lookup versions, sorted numerically, and queries exact `(version,digest)` pairs; no client-selected version. Missing/unexpected multiple matches are distinguished internally from no match. In-process verification decodes valid hex and uses equal-length `timingSafeEqual`; indexed SQL equality is not advertised as constant-time. Never reuse Identity keys/adapters. Collision follows section 10; key-ring search is bounded by section 14.

مدخل HMAC هو بادئة UTF-8 المحددة ثم بايت صفري ثم نص الرمز ASCII. تحفظ SHA-256 بست عشري صغير من 64 محرفاً ونسخة المفتاح. تستخدم الكتابة النسخة النشطة، ويحسب البحث مرشحي كل النسخ المرتبة رقمياً دون اختيار العميل. المقارنة داخل العملية آمنة زمنياً بعد فحص الطول؛ مساواة SQL ليست ثابتة الزمن. لا إعادة استخدام لمفاتيح Identity، وحدود التصادم والبحث محددة في القسمين 10 و14.

## 13. Authenticated bearer encryption | تشفير الرمز الموثق

Encrypt the canonical **43-byte ASCII token string**, not URL, with AES-256-GCM, exactly 32-byte key, fresh random 12-byte IV, full 16-byte tag. Store envelope format 1/key version and canonical unpadded base64url IV/ciphertext/tag as section 8. Strict exact-field/length/canonical checks precede decryption. Never reuse IV on re-encryption; no plaintext persistence.

AAD serialization is exactly UTF-8 `JSON.stringify` of the ordered array:

```text
["qsc:catalog:public-sharing:retrieval:v1", 1, encryptionKeyVersion,
 workspaceId, grantId, productId, branchId]
```

Versions are JSON integers; identities are validated strings from the scoped persisted grant. No whitespace/newline decoration. Mutable HMAC version/digest and revision are excluded from AAD. A swap of any bound context fails authentication. Expected identities do not come from self-declared ciphertext metadata. After authenticating tag, validate canonical plaintext and timing-safely verify stored digest/version. Missing lookup key at this step is KeyUnavailable, not invalid token. Tamper/mismatch/invalid plaintext is IntegrityFailure, without exception internals. Anonymous resolution never decrypts this envelope.

يُشفر نص الرمز ASCII لا الرابط بمفتاح 32 بايت وIV عشوائي جديد 12 بايت ووسم كامل 16 بايت. يفحص الغلاف بدقة ولا يُحفظ النص الصريح. AAD هو JSON للمصفوفة المرتبة أعلاه بلا زخرفة، بهويات من الصف المقيد ونسخ عددية؛ لا تدخل نسخة HMAC أو revision المتغيرة. بعد نجاح الوسم يتحقق الرمز وبصمته زمنياً. تبديل السياق أو النص فشل سلامة؛ المفتاح المفقود عطل مستقل. القراءة المجهولة لا تفك هذا الغلاف.

## 14. Application crypto ports and runtime | منافذ التشفير والتشغيل

Use three capabilities. These exact TypeScript shapes are future contracts; place under Sharing ports, not a generic new framework. Typed values and validation remain within the existing layers.

```ts
type PublicShareCryptoFailure = "KeyUnavailable" | "IntegrityFailure" | "CryptoUnavailable";
type PublicShareCryptoResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PublicShareCryptoFailure };
interface PublicShareLookupDigestValue {
  readonly keyVersion: number;
  readonly value: string;
}
interface PublicShareBearerContext {
  readonly workspaceId: string;
  readonly grantId: string;
  readonly productId: string;
  readonly branchId: string;
}
interface PublicShareBearerEnvelope {
  readonly formatVersion: 1;
  readonly keyVersion: number;
  readonly iv: string;
  readonly ciphertext: string;
  readonly authTag: string;
}
interface PublicShareTokenGeneratorPort {
  generate(): PublicShareCryptoResult<string>;
}
interface PublicShareLookupDigestPort {
  create(token: string): PublicShareCryptoResult<PublicShareLookupDigestValue>;
  candidates(token: string): PublicShareCryptoResult<readonly PublicShareLookupDigestValue[]>;
  verify(token: string, digest: PublicShareLookupDigestValue): PublicShareCryptoResult<boolean>;
}
interface PublicShareBearerProtectionPort {
  encrypt(token: string, context: PublicShareBearerContext): PublicShareCryptoResult<PublicShareBearerEnvelope>;
  decrypt(envelope: PublicShareBearerEnvelope, context: PublicShareBearerContext,
    digest: PublicShareLookupDigestValue): PublicShareCryptoResult<string>;
}
```

Malformed anonymous input is rejected by the token value/parser boundary before these ports. Concrete Node crypto/encoding/environment adapters are Infrastructure only. No `Buffer`/`process.env`/secret material in port types. Runtime can expose separate management/encryption and anonymous/lookup readiness so encryption failure does not require public decryption or block safe revocation.

Exact dedicated configuration names:

| Name / الاسم | Contract / العقد |
| --- | --- |
| `QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION` | Positive canonical integer string; selects new lookup writes. |
| `QSC_PUBLIC_SHARE_HMAC_KEYS_JSON` | JSON version -> canonical base64 key, each at least 32 bytes. |
| `QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION` | Positive canonical integer string; selects new encryption writes. |
| `QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON` | Separate JSON version -> canonical base64 key, each exactly 32 bytes. |
| `QSC_PUBLIC_SHARE_PUBLIC_ORIGIN` | Absolute origin only, no credentials/path/query/fragment; HTTPS in production. Constructs stable canonical URLs, never caller Host. |

Validate nonempty rings, maximum **8 HMAC verification keys**, canonical positive safe-integer version keys (no aliases/duplicates), canonical base64 round-trip, key lengths, active membership, and distinct key material across purposes. Parse JSON with duplicate-member detection rather than accepting overwritten members. Never generate fallback secrets or log configuration. The eight-key HMAC bound limits anonymous candidate computation and allows overlap; it is selected here, not an existing setting. **No matching numerical encryption-ring maximum is imposed**: encryption selects one key by persisted version, not a candidate scan, and the existing Identity AES-GCM key-map precedent supplies no eight-key cap. Retain all versions referenced by unrevoked grants plus planned operational overlap; retire unreferenced versions only after coverage verification. Revoked rows carry no encryption-key dependency.

Factory validation is required whenever a runtime opens. A deployment/readiness check also proves unrevoked-grant lookup versions and encryption versions are covered; revoked rows require no encryption key. Unknown lookup coverage disables anonymous serving with generic 503 rather than silent unknown-link 404. Management retrieval requires lookup+encryption coverage; revoke requires neither key ring and may clear an unavailable/corrupt old envelope without decrypting. Failure never deletes/mutates grants. Readiness is explicit bounded database inspection, not an invented background scheduler; startup-only configuration validation cannot prove durable key coverage.

تستخدم المنافذ الثلاثة الأشكال المحددة دون Buffer أو أسرار أو بيئة تشغيل. تملك Infrastructure تشفير Node والترميز والتهيئة. تفصل الجاهزية البحث العام عن الاسترجاع الإداري، ويظل الإلغاء ومحو غلاف فاسد أو مفتاحه مفقود ممكناً دون فك أو مفاتيح. المتغيرات المختارة في الجدول مستقلة، ومصدر الرابط أصل ثابت لا Host العميل. تتحقق الحلقات غير الفارغة من النسخ القانونية والتكرار وbase64 والأطوال والنشاط وفصل المادة دون أسرار بديلة أو إخراجها. حد الثمانية يخص HMAC فقط لضبط حساب مرشحي البحث المجهول. لا حد عددي مماثل للتشفير: يختار نسخة واحدة، ولا حد ثمانية في سابقة Identity AES-GCM. تحفظ نسخ التشفير التي تشير إليها التفويضات غير الملغاة مع التداخل التشغيلي، وتسحب غير المشار إليها بعد إثبات التغطية؛ لا اعتماد للملغاة على مفتاح تشفير. يثبت فحص جاهزية محدود تغطية مفاتيح غير الملغاة؛ غياب تغطية البحث يعطل الخدمة بـ503 لا 404 صامت. لا يُنشأ مجدول خلفي ولا تُحذف التفويضات.

## 15. Rotation and key failures | تدوير المفاتيح وأعطالها

Encryption: deploy overlapping ring, activate new write key, select unrevoked grants in bounded maintenance batches, acquire section 10 locks, verify revision/context/state, decrypt/validate, re-encrypt with fresh IV, atomically replace envelope and increment revision. Preserve bearer/URL/grant/issuer/issued time. Verify complete unrevoked-grant version coverage before retiring old keys; revoked rows have cleared envelopes and create no key-retention requirement. Maintenance must never decrypt, re-encrypt, restore or recover their retrieval material.

HMAC: retain old verification keys, activate new digest key, recover/validate active bearers through maintenance, update digest/version under the same lock/CAS rules, and verify active coverage before retirement. Migration failure preserves the original row and usable old configuration. No partial envelope/digest write. Concurrent revoke causes skip after revalidation; maintenance never resurrects it. Missing keys, corrupt ciphertext/digest, or failed CAS halt that row with safe operational evidence. Never regenerate a bearer, change origin/URL silently, or persist plaintext as recovery. Stable public origin changes require explicit operational approval and compatibility handling.

الإجراء التشغيلي يتداخل فيه القديم والجديد، ويختار دفعات محدودة من غير الملغاة ويقفل الصف ويتحقق من نسخته ثم يعيد التشفير أو البصمة ذرياً، دون تغيير الرابط أو التفويض أو المُصدر والزمن. تثبت تغطية غير الملغاة قبل سحب مفاتيحها؛ لا غلاف أو اعتماد على مفتاح للصف الملغى، ولا يفك أو يعاد تشفيره أو يسترد غلافه. فشل الترحيل يحفظ الصف القديم وتهيئته القابلة للاستخدام. يعاد فحص الإلغاء ويُتجاوز الصف الملغى دون إحيائه. المفاتيح المفقودة والفساد والتعارض أدلة تشغيلية آمنة لا توليد بديل أو حفظ صريح. تغيير الأصل العام يتطلب اعتماداً تشغيلياً وتوافقاً صريحاً.

## 16. Audit | التدقيق

Select lifecycle event values **`PublicProductShareIssued`**, **`PublicProductShareRevoked`**, **`PublicProductShareReplaced`** through the shared security-audit ownership. Actual initial issue, first revoke, and successful replace commit with state. Reuse and ordinary successful Copy emit no lifecycle audit. Replacement is one correlated event, not three duplicate transitions. Safe allow-list: Workspace/acting actor, grant/Product/Branch identities, original issuer where needed, old/new grant IDs for replacement, timestamps, fixed result/reason codes, revision/counts. Never bearer/URL/ciphertext/digest/keys/crypto exception internals. Do not rely solely on forbidden-key regex; explicit records and value-safe construction are mandatory. Audit failure rolls back mutation. Key operations have safe operational evidence when implemented, no visitor tracking.

أحداث التدقيق المختارة تصدر ضمن ملكية التدقيق الأمني، وتُكتب ذرّياً للإصدار الحقيقي وأول إلغاء والاستبدال الناجح. لا حدث لإعادة الاستخدام أو النسخ المعتاد، والاستبدال حدث مترابط واحد. يسمح بمعرفات داخلية آمنة وممثلين وأزمنة وأكواد ونسخ وأعداد فقط، لا رمز أو رابط أو نص مشفر أو بصمة أو مفتاح أو استثناء داخلي. فشل التدقيق يرجع التغيير، ولا يكفي regex دون قائمة صريحة وآمنة للقيم. عمليات المفاتيح أدلة تشغيلية بلا تتبع زوار.

## 17. Main image | الصورة الرئيسية

Use current persisted `isMain` only, same Workspace/Product, WebP, complete checksum/provenance, and matching Product media root. No invented Approved status and no gallery fallback. Metadata plus contained signature/checksum-checked reader must both succeed. Reuse **8 MiB** delivery cap. Existing processing defaults (10 MiB source, 40 million decoded pixels, 2000×2000 output) remain owning Media policy, not new Public Share decode rules. Historical incomplete provenance cannot qualify. Image dimensions/storage metadata are not public fields. Main replacement/removal affects later requests; no eligible image or file read failure leaves Product text available with localized fallback.

تستخدم الصورة isMain الحالية وحدها بملكية وتشفير WebP ومنشأ وبصمة وجذر صحيحين. لا حالة Approved جديدة ولا بديل من المعرض. يلزم نجاح القارئ المحصور وفحص التوقيع والبصمة مع حد تسليم 8 MiB. تبقى حدود المعالجة الحالية سياسة Media ولا تنشأ قاعدة فك جديدة. التاريخ الناقص لا يؤهل الصورة. التبديل والحذف يؤثران لاحقاً، وغياب الصورة أو فشلها لا يمنع نص المنتج.

## 18. Public media transport | نقل الوسائط العامة

Exact route **`GET /share/[token]/media`** uses the same bearer and fixed suffix, no second capability or resource/media ID. Node runtime; independent admission, canonical token, digest/grant lookup, revocation/full eligibility snapshot, current-main resolution, scoped bounded reader. Return `image/webp`, exact content length, private/no-store, no-referrer, noindex/nofollow, nosniff. No storage redirects/URLs, filesystem/provider IDs, optimizer/CDN bypass, or conditional 304. Metadata absence/file missing/corrupt/oversized gives generic media 404; actual lookup/database/limiter service failure gives 503; throttling 429. Do not collapse known infrastructure failure into absence. Reader's existing broad Unavailable outcome does not authorize leaking root/file reasons. Page image errors degrade only the image.

المسار العام المحدد يستخدم الرمز نفسه دون قدرة ثانية أو معرف وسائط. يفحص القبول والرمز والتفويض والأهلية كاملة والصورة الحالية والقارئ المحدود بصورة مستقلة. يعيد WebP والرؤوس المحددة دون تحويل للتخزين أو تجاوز التخزين المؤقت. غياب/فساد الملف 404 عام، والعطل المعروف 503 والتحديد 429، دون كشف تفاصيل الجذر أو اختلاق غياب. يقتصر فشل الصورة على صورتها.

## 19. Exact routes and management transport | المسارات والنقل الإداري

| Method and exact route / المسار الدقيق | Contract / العقد |
| --- | --- |
| `GET /share/[token]` | SSR anonymous HTML; no public data API in V1. |
| `GET /share/[token]/media` | Independently authorized current main WebP. |
| `POST /api/catalog/products/[productId]/branches/[branchId]/public-share` | Issue/reuse; body `{}` only; 200 `{type:"Created"|"Reused",grantId,url}` after commit. |
| `GET /api/catalog/products/[productId]/branches/[branchId]/public-share` | Copy active; 200 `{type:"Found",grantId,url}`; no mutation/audit. |
| `POST /api/catalog/public-share-grants/[grantId]/revoke` | Body `{}` only; scoped targeted grant; 200 `{type:"Revoked"|"AlreadyRevoked",grantId}`. |
| `POST /api/catalog/products/[productId]/branches/[branchId]/public-share/replace` | Exact body `{expectedCurrentGrantId:string}`; 200 `{type:"Replaced",grantId,url}`. |

Management internal IDs are allowed only in authenticated DTOs and never substitute for authority. Empty/exact-key bodies and same-origin mutation policy follow existing handlers; maximum management JSON body **4,096 UTF-8 bytes**, oversized returns 413. No caller URL/origin/Workspace/actor/money inputs. Canonical `url` is configured origin + `/share/` + canonical token, no locale/query/fragment; same grant copies the same URL. All management responses private/no-store/no-referrer. URLs appear only in explicitly authorized success bodies and are excluded from logs. Thin Next.js handlers delegate to Application; the public page resolves before streaming, provides real 404/429/503 HTTP status (not a 200 error shell), and reads without JavaScript or session cookies.

The selected authenticated GET Copy endpoint remains unchanged. Management UI **MUST NOT prefetch, preload, automatically call, or background-fetch** any endpoint returning a decrypted public URL, including Issue/reuse. Retrieval occurs only after explicit currently authorized interaction such as Get Link / Copy Link. Ordinary Product Details/page loading must neither decrypt nor send the bearer URL to the browser. No client-query/router cache or Web Storage retention; retain only transient display state needed for the explicit interaction. Disable framework/link/query prefetch and background revalidation for these responses.

يبقى مسار GET الإداري للنسخ كما هو. **يحظر الجلب المسبق أو التحميل المسبق أو الطلب الآلي أو الخلفي** لأي مسار يعيد رابطاً مفكوك التشفير، بما فيه الإصدار/إعادة الاستخدام. الاسترجاع بعد تفاعل صريح ومصرح به حالياً مثل Get Link / Copy Link فقط. تحميل تفاصيل المنتج أو الصفحة المعتاد لا يفك الرمز ولا يرسله للمتصفح. لا حفظ في ذاكرة استعلامات/موجّه العميل أو Web Storage؛ حالة عرض عابرة لازمة للتفاعل فقط، مع تعطيل prefetch وإعادة التحقق الخلفية لهذه الاستجابات.

الجدول يثبت المسارات والأجسام والاستجابات. المعرفات الإدارية لا تكون سلطة ويُشتق المستأجر والممثل من الجلسة. الأجسام بمفاتيح دقيقة وحد 4096 بايت، والتجاوز 413، والكتابة تتحقق من الأصل. لا مدخل للرابط أو السعر أو الهوية. الرابط ثابت من الأصل والرمز دون لغة أو استعلام، ويظهر فقط في نجاح مصرح به بلا تسجيل. توكل المعالجات إلى Application، وتُحل الصفحة قبل البث مع حالة HTTP حقيقية وقراءة دون JavaScript أو جلسة.

## 20. Localization and RTL | التعريب والاتجاه

Default Arabic. Accept only optional single `lang=ar|en`; invalid/repeated values use Arabic without altering token authority or reflecting raw query input. No additional public query parameters convey authority. Native language links render the same grant with presentation-only query, without requiring JS or storing tokens/preferences. Canonical management URL stays language-neutral.

Sharing Presentation owns message catalog and localized generic states/Boolean values. Preserve the single canonical dynamic Product/Definition label and value; do not invent translations in Domain. Public `<main lang="ar|en" dir="rtl|ltr">` and all localized content must be correct in initial SSR. The existing Arabic root document can remain unchanged: English public content explicitly overrides inherited language/direction at its main boundary, including localized image alt and headings. Do not depend on `usePageI18n` effects or restructure root layouts merely for this slice. Use `bdi`/`dir="auto"` for technical mixed text and isolated LTR exact amount/currency/unit as appropriate. No transliteration or reversal. Price uses existing exact ISO formatting in both locales.

العربية افتراضية؛ يقبل اختيار لغة واحد ar/en وإلا العربية دون تغيير السلطة أو عكس المدخل الخام. الروابط الأصلية تغيّر العرض فقط ولا تتطلب JavaScript أو تخزيناً. تملك Presentation الرسائل والحالات والقيم المنطقية؛ تبقى بيانات المنتج والتعريف بلغتها المحفوظة دون ترجمة Domain. يحمل main اللغة والاتجاه الصحيحين في SSR بما فيه العناوين وبديل الصورة، ويمكن بقاء الجذر العربي دون إعادة هيكلة أو أثر عميل. تُعزل البيانات التقنية المختلطة والأرقام دون قلبها أو تغييرها، والسعر من المنسق الدقيق نفسه.

## 21. Presentation and accessibility | العرض وإمكانية الوصول

Render only safe name (one h1), Retail/currency, ordered specifications in dl, optional image/fallback, generic unavailable state. No Product code, Branch/seller/stock/status, related Products, Catalog navigation, checkout/reservation/WhatsApp action. Mobile stacked layout with bounded tablet/desktop two-region layout where space permits; full text wraps, no meaning-changing ellipsis. Product reading and native language links work with JS disabled. Optional progressive image-error behavior cannot own eligibility or hide text.

Semantic main/headings/dl; Product-name-derived escaped alt, localized text fallback; logical reading/tab order, visible focus, native links/buttons, no traps/hover-only interaction. Controls have at least 44×44 CSS-pixel touch area; verify keyboard/mouse/touch parity. Verify normal-text contrast at least 4.5:1, large text/UI indicators at least 3:1, 200% text zoom and 400% page zoom/reflow at narrow width, no data-losing horizontal overflow. Respect reduced motion; no motion required. Screen-reader/manual checks are mandatory; prerender assertions do not prove all accessibility.

يعرض الاسم والتجزئة والمواصفات والصورة الاختيارية والحالة العامة فقط، دون الحقول والإجراءات المستبعدة. تخطيط الهاتف متدرج واللوحي والمكتبي قابلان للقراءة مع التفاف كامل، ودون اقتطاع. تعمل القراءة واللغة دون JavaScript. البنية دلالية والبديل آمن والتركيز واضح ولا مصائد أو hover فقط. مساحة التحكم 44×44 بكسل CSS على الأقل، ونسب التباين والتكبير المذكورة مطلوبة، مع تحقق قارئ شاشة يدوي واحترام تقليل الحركة.

## 22. Crawlers and preview | الزواحف والمعاينة

Generic non-sensitive localized title/description only: English `Public product share`, Arabic `مشاركة منتج عامة`; description explains that availability may change without Product specifics. No Product OG/Twitter title/image/price, token-bearing og:url/canonical, sitemap, analytics or WhatsApp sending. HTML robots noindex/nofollow plus response X-Robots-Tag. Bearer-holding crawlers receive the same content authority/eligibility/limiter policy, never user-agent bypass. Generic metadata cannot prevent scraping of authorized HTML or external preview retention; revocation does not erase external copies.

البيانات الوصفية عنوان ووصف عامان باللغتين دون تفاصيل المنتج أو OG/Twitter خاص أو رابط رمزي في canonical أو sitemap أو تتبع أو إرسال. تطبق robots في HTML والرؤوس. يعامل الزاحف الحامل للرمز كالعميل دون تجاوز؛ لا تمنع البيانات العامة استخراج الصفحة المصرح بها أو حفظها خارجياً، والإلغاء لا يمحو النسخ.

## 23. Anonymous error representations | تمثيل الأخطاء المجهولة

| Condition / الحالة | Exact status and representation / التمثيل |
| --- | --- |
| Malformed/unknown/revoked/ineligible | 404 HTML shell, generic localized heading `Product unavailable` / `المنتج غير متاح`; no reason, resource data, login redirect or identifying request ID. |
| Throttled | 429 same generic page structure, heading `Temporarily unavailable` / `غير متاح مؤقتاً`; bounded integer Retry-After only when supplied by admission. |
| Database/lookup/runtime/integrity/limiter failure | 503 same generic structure, heading `Service unavailable` / `الخدمة غير متاحة`; no internals. |
| Media absence/integrity-read failure | 404 empty body; known service failure 503 empty body; throttling 429 empty body. |

Set HTML `text/html; charset=utf-8`; empty media errors do not return masquerading WebP. All statuses have section 26 headers. Rate/source admission runs before malformed/unknown discrimination. Error content/status does not reveal tenant/resource state within the shared 404 class. No false claim of constant-time end-to-end resolution. Known crypto corruption is 503, not a disguised no-active-grant result; encrypted retrieval failures are management-only because public lookup never decrypts. Corrupt unmatched lookup data cannot always be diagnosed per request; readiness/maintenance must detect it.

تحدد الحالات والتمثيلات في الجدول بلا أسباب داخلية أو هوية مستأجر أو تحويل دخول. نوع HTML صحيح، والخطأ الفارغ للوسائط لا يدعي أنه WebP. جميع الرؤوس موحدة والقبول يسبق التمييز. لا ادعاء بثبات الزمن. فساد معروف 503؛ فشل فك غلاف الاسترجاع إداري فقط، وقد لا يكتشف البحث فساد بصمة غير مطابقة إلا بفحوص الجاهزية والصيانة.

## 24. Authenticated typed errors | الأخطاء الإدارية typed

Application outcomes and HTTP mapping: `AuthenticationRequired` 401; `ForbiddenForRestrictedSession`, `PermissionDenied`, `BranchScopeDenied` 403; scoped foreign/missing `NotFound` 404; `NoActiveGrant` 404; `IssueIneligible`/`ReplacementIneligible` 409; `ExpectedCurrentGrantConflict` 409; `AlreadyRevoked` successful 200; `KeyUnavailable`/`IntegrityFailure`/`ServiceUnavailable` 503; invalid body/input 400; oversized body 413; admission denied 429. Out-of-scope lookup must not distinguish a foreign grant from absent; use NotFound where existence is not already safely known. Safe authenticated ineligibility reason codes may be fixed enums only, no private values. Error bodies `{type:code}` contain no crypto exception/detail. Copy failure never calls Issue. Old grant replacement retries conflict, with no receipt/new expected ID generated automatically.

تربط Application النتائج بالحالات الدقيقة أعلاه، مع NotFound غير كاشف للموارد الأجنبية وغير المعروفة بأمان. أسباب عدم الأهلية الإدارية أكواد ثابتة دون قيم خاصة. الجسم نوع فقط بلا تفاصيل تشفير. فشل النسخ لا يستدعي الإصدار، وإعادة استبدال القديم تتعارض دون إيصال أو هوية متوقعة مولدة تلقائياً.

## 25. Admission and deployment-wide abuse protection | القبول وحماية الإساءة

Small Sharing port **`PublicShareAdmissionPort.admit(input)`** returns `Allowed`, `Denied` with optional safe retry seconds, or `Unavailable`. Input is route class (`Page`/`Media`, reserve `Data` for separately approved need), server-trusted ephemeral source identity, and optionally internally resolved Workspace/grant identifiers. Public transport admits source/route before parse/lookup; Application may check resolved budgets before projection/file delivery. Infrastructure/proxy adapters own counters/network-source extraction. No fake default Allow adapter; absent/unhealthy configured enforcement is Unavailable ->503.

Separate global/source/page/media budgets and media byte/concurrent-read protection. Apply source budget to malformed, unknown, valid, and crawler requests alike. Counter keys never contain raw bearer/URL/ciphertext/digest. No cookies, fingerprinting, persistent visitor profiles or analytics. Source counters are short-lived operational state with configured expiry, not audit/visitor history. Trust forwarded addresses only behind explicitly configured trusted proxies. Rate thresholds, expiry, backend and distributed enforcement are deployment configuration, not guessed constants. A local adapter can prove behavior in tests but cannot satisfy the multi-instance production release gate. Limiter outage fails closed. Budget errors must remain generic, including resolved-grant budgets.

منفذ القبول المحدد صغير ويعيد السماح أو المنع أو التعذر، بمدخل فئة المسار ومصدر مؤقت موثوق ومعرفات داخلية اختيارية بعد الحل. يسبق فحص المصدر التحليل والبحث وتفحص Application الميزانيات المحلولة قبل التسليم. تملك Infrastructure والوكيل العدادات، ولا محول سماح افتراضي. تفصل الميزانيات والبايتات والتزامن، بلا رموز أو تتبع أو بصمات أو ملفات ارتباط. العناوين المحولة موثوقة خلف وكلاء محددين فقط. الحدود والخلفية والانتهاء إعداد نشر، والمحلي ليس ضماناً موزعاً. العطل يغلق الوصول بـ503.

## 26. Freshness, caching and security headers | الحداثة والتخزين والرؤوس

All public HTML/media/error responses: `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `X-Content-Type-Options: nosniff`. Management successes/errors use private/no-store/no-referrer/nosniff. No static generation, ISR, cross-request authorization/projection memoization, cached fetch, service-worker/offline persistence, token prefetch, image optimizer, CDN/proxy reuse, or eligibility-bypassing 304. Refresh/direct open always resolves live; restored browser snapshots must not be treated as fresh authority. Verify back-forward behavior and require revalidation on pageshow restoration as a progressive enhancement where supported; no claim that headers erase received DOM/images.

Required route-scoped HTML baseline: `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'none'`. These directives constrain framing/object/base behavior without blocking Next.js script/style/assets; verify actual built SSR responses and browser console before release. A stronger script/style/connect policy and nonce integration require compatibility evidence and separate review; do not label this baseline a complete restrictive CSP. No inline event-based image fallback requirement. Actual 404 status must be finalized before streaming. HTTPS is required for production origin; HSTS, proxy header enforcement and cache bypass are release evidence, not repository guarantees.

الرؤوس المذكورة إلزامية لكل نجاح وفشل، ولا تخزين ثابت أو ISR أو صلاحية محفوظة أو خدمة offline أو optimizer أو CDN أو 304 يتجاوز الأهلية. تعيد الفتح والتحديث الحل الحي؛ استعادة المتصفح ليست سلطة جديدة وتختبر مع تعزيز إعادة التحقق الممكن دون ادعاء مسح DOM سابق. حماية الإطار والكائن وbase محددة ولا تحظر سكربتات Next؛ يلزم تحقق البناء والمتصفح. سياسة CSP أشد تحتاج دليلاً ومراجعة مستقلة وليست ادعاء هنا. تسبق الحالة البث، وHTTPS مطلوب، أما HSTS والوكيل فهي أدلة نشر.

## 27. Leakage controls and release gates | منع التسرب وبوابات الإصدار

Explicit safe logging allow-lists; never stringify request/response/grant objects or crypto exceptions. Redact bearer route segment/query, full URL, credentials, ciphertext, digest and keys BEFORE app/access/HTTP/proxy/Next logs, traces, telemetry, exception reporting and breadcrumbs collect them. Public error bodies/metadata contain none. Inspect production-like successful/error/media requests at every configured collection hop. **Upstream access-log and error-reporting redaction is a release gate**, not best effort. Failure blocks release.

No token in Web Storage, analytics, cookies, diagnostics, token-bearing login/error/third-party redirect, metadata or alternate media capability. Authorized management UI may display/copy URL only after successful current checks and explicit interaction. Browser history/bookmarks/clipboard and intentional forwarding are unavoidable bearer-URL exposure; they cannot be recalled. no-referrer and same-origin assets reduce onward leakage but do not conceal initial URL from the serving infrastructure. Origin configuration and generated URL must be validated against host/header injection.

تفرض قائمة تسجيل آمنة وحجب القيم قبل جمعها في كل طبقات التطبيق والوصول والوكيل وNext والتتبع والتقارير. لا تُسلسل طلبات أو صفوف أو استثناءات كاملة. يُختبر كل مسار نجاح وفشل ووسائط عند كل جامع، وفشل حجب المنبع يمنع الإصدار. لا تخزين Web Storage أو تتبع أو تحويل رمزي أو قدرة وسائط بديلة. يعرض الطالب المصرح له الرابط وينسخه بإجراء صريح. التاريخ والإشارات والحافظة والإرسال المقصود تعرض لا يمكن سحبه؛ no-referrer لا يخفي الرابط من بنية تقديمه.

## 28. Executable acceptance gates | بوابات قبول قابلة للتنفيذ

For implementation slices: use existing `tsx --test` with explicit new test-file paths; do not assume a nonexistent npm script. Run relevant existing `npm run test:reference-data`, `test:identity`, `test:direct-sharing`, `test:catalog-query`, `test:catalog-presentation`, and `test:product-media` only when affected. Typecheck `npx tsc --noEmit --incremental false`, lint `npm run lint`, production build `npm run build`, and `git diff --check` are final integration gates. Use the existing guarded disposable TEST database preparation and TypeScript integration-test configuration for new explicit PostgreSQL test paths; never use production data or assume current `test:integration` includes new files. At final authorized integration, run the existing full `npm test` and guarded `npm run test:integration` plus explicitly added share tests; record actual outputs. Documentation creation runs whitespace/content checks only and makes no claim that future acceptance passed. No new dependency is authorized for tests.

| Automated category / الفئة الآلية | Executable evidence required / الدليل المطلوب |
| --- | --- |
| Domain/Application | Deterministic grant-state/eligibility tests; no expiry; revocation never resumes; zero-spec suspension/restoration; existing-copy ineligible. |
| Schema/persistence | Real guarded PostgreSQL migration/default/FK/check/index tests; retained revoked row with all five envelope fields NULL; reject active missing/partial or revoked retained envelopes; actor accountability without Identity FK; no plaintext column; legacy visibility omission preserves state. |
| Authorization | Full-session/Owner/Staff dependencies, no implicit Direct Share authority, safe forbidden/not-found, template-management separation. |
| Branch Scope | All/selected/foreign/inactive historical Branch tests; issuer scope loss leaves grant, caller scope rechecked. |
| Concurrency | Separate DB connections and explicit barriers for every section 10 race, unique conflict, stale replace, audit rollback and retry/candidate bounds. |
| Crypto | Canonical trailing bits/padding tests; fixed purpose vectors; all key versions; every AAD field swap; nonce/tag sizes; corrupt envelope/digest; rotation URL stability; no anonymous decrypt; revoked grants never decrypt/recover; HMAC eight-key cap and encryption without matching cap; retired encryption versions referenced only by revoked rows do not fail readiness. |
| Tenant isolation | Cross-Workspace Product/Branch/Definition/template/value/root substitutions and public response/HTML/metadata allow-list tests. |
| Specifications | Every section 5 case; Unicode/UTF-16/UTF-8 boundaries; JSON escaped aggregate size; >64 no first-N; no internal fallbacks; committed visibility/removal reflected; Application preserves string/number/boolean, Presentation localizes Boolean, final DTO/HTML/RSC excludes semantic type and internal identities; name projection limit never mutates canonical Product name. |
| Pricing | Override/absence fallback, invalid override, zero, unsupported currency, exact bigint precision, no Wholesale/Reference Cost. |
| Media | Current-main only, complete provenance/root binding, checksum/signature/path escape/symlink/8 MiB boundaries, replace/remove, text survives failure. |
| HTTP/security | Exact statuses/body/headers for all classes including malformed requests; management exact keys/body cap/origin; no redirect or error internals. |
| Explicit Copy interaction | Product Details load/navigation/prefetch/background revalidation never requests a URL-returning endpoint or decrypts; explicit authorized Get/Copy requests it; no client cache/Web Storage retention or bearer in ordinary page payloads. |
| Freshness | Built-server requests before/after revoke/withdrawal/restoration; static/ISR/image optimizer/304/cache bypass absent; actual statuses before streaming. |
| Locale/RTL | SSR ar/en main lang/dir before hydration; exact money/Boolean text; mixed bidi; unchanged dynamic data. |
| Accessibility | Prerender main/h1/headings/dl/alt/native links/focus styles, no-JS content and complete text; browser contrast/reflow evidence supplements assertions. |
| Deployment integration | Multi-instance limiter/bandwidth/outage tests; trusted proxy identity; CDN bypass; access-log/error-reporting secret scan using synthetic tokens. No mock-only distributed claim. |

| Manual category / الفئة اليدوية | Required observation / الملاحظة المطلوبة |
| --- | --- |
| Owner | Own Workspace actions succeed; foreign tenant blocked. |
| Staff permission | With/without dedicated/view/pricing keys; revoke works without price/view dependencies; no accidental URL disclosure. |
| Branch-scoped Staff | Allowed/denied Branches, subsequent scope loss, colleague-managed Workspace-owned grant. |
| Lifecycle | Issue/reuse/copy same URL; first revoke and replace-old clear retrieval envelope atomically while preserving history/digest/audit; duplicate revoke safe; new replacement keeps its own envelope; rollback preserves old state; revoked Copy unavailable and anonymous 404 unchanged; lost-response stale replace conflicts without hidden regeneration. |
| Explicit Copy interaction | Observe browser network/storage on Product Details load, navigation, focus/revalidation and hover: no URL retrieval or bearer; Get/Copy explicitly retrieves only after authorization, with no client-cache/Web Storage retention. |
| Suspension/restoration | Publication, Active Branch, listing, valid price/name/specification withdrawal/resumption; same unrevoked URL resumes. |
| Live Retail | Override/base/zero/removal/unsupported currency; correct amount and no sensitive pricing. |
| Live specifications | Visibility, value/type, Definition inactivity, template removal, last public item withdrawal/restoration, long mixed text. |
| Image | Main replacement/removal/missing/corrupt file; fallback, no gallery leak, independently denied media. |
| Denials | Revoked/malformed/unknown/ineligible generic 404, rate 429, service 503, no sensitive reason. |
| Responsive | Phone 320/390 CSS px, tablet 768/1024, desktop 1280/1440 and wide 1920; both orientations where relevant; no lost text/overflow. |
| Localization | Arabic/English direct open, initial SSR direction, native switch, mixed technical values and screen-reader pronunciation. |
| Interaction | Keyboard/mouse/touch parity, focus/order/44px targets, no traps/hover-only actions. |
| No JavaScript | Product text, language links, safe image alt/fallback remain readable. |
| Navigation | Direct open, refresh, back/forward and restored pages, no cached-authority bypass; already received content limitation acknowledged. |
| Accessibility | Screen reader, 200% text/400% page zoom, contrast, reduced motion, long values. |
| Disclosure | Inspect source/DOM/RSC payload/network/metadata/storage/logs/errors: approved fields only; no rich Product preview. |
| Operations | Limiter/database/key failure, partial migration rollback, no silent URL replacement; deployment logs redact synthetic tokens. |

Each gate records commands, environment/synthetic fixture, observed results, and unresolved limitations. Do not claim manual QA from static tests. Failed required gates block progression/release. For authorized implementation tasks, existing report/review-bundle rules apply; Task 3.23 is assigned for planning only, and production implementation is not yet authorized.

تستخدم شرائح التنفيذ اختبارات tsx والمسارات الصريحة والأوامر الحالية ذات الصلة، وفحص الأنواع والlint والبناء والفراغات، ثم الانحدار الكامل والتكامل المحمي عند الدمج المعتمد. لا يفترض أمر اختبارات غير موجود أو بيانات إنتاج أو اعتماد مكتبة. الجدولان بوابات تنفيذية يُسجل لكل منها الأمر والبيئة والبيانات الاصطناعية والنتيجة والقيود. لا تثبت الاختبارات الساكنة QA يدوياً. فشل المطلوب يمنع التقدم والإصدار. تتبع مهام التنفيذ المعتمدة قواعد التقرير والحزمة الحالية؛ أُسندت المهمة 3.23 للتخطيط فقط ولم يُصرح بتنفيذ الإنتاج بعد.

## 29. Bounded implementation slices and deployment handoff | شرائح التنفيذ وتسليم النشر

Official assignment: **Task 3.23 — Public Product Share Link V1**. Status: **PLANNING APPROVED; IMPLEMENTATION NOT STARTED**. **Task 3.23-P1: READY_FOR_PLANNING only**; **Task 3.23-P2–P7: GATED / NOT STARTED**, each separately gated. No slice is READY_FOR_IMPLEMENTATION. Each slice needs explicit authorization and review before progressing; this planning approval does not authorize production code, migrations, deployment, or new dependencies.

| Proposed slice / الشريحة المقترحة | Dependencies, tests and manual review / التبعيات والتحقق |
| --- | --- |
| Task 3.23-P1 — Metadata and Domain Contracts / البيانات الوصفية وعقود المجال | Existing reference-data ownership; visibility type/default/compatibility and grant state/ports/schema specification. Future guarded schema tests. Review internal defaults and migration safety; no public surface. |
| Task 3.23-P2 — Visibility Transport and Editor / نقل ومحرر الرؤية | Previous slice; versioned saves/read models/audit and existing permission. Reference tests plus Owner/Staff conflict, Arabic/English keyboard/touch review before progression. |
| Task 3.23-P3 — Crypto and Runtime / التشفير والتشغيل | Domain/ports; dedicated rings, exact encoding/AAD, capability readiness. Crypto vectors/corruption/rotation tests; review synthetic key handling and no-log evidence. |
| Task 3.23-P4 — Grant Persistence and Lifecycle / حفظ ودورة التفويض | Schema+crypto; UoW locks/indexes/reuse/revoke/replace/audit. Real concurrency/rollback tests; manual database/history and loss-of-scope review. |
| Task 3.23-P5 — Management API/UI / API وواجهة الإدارة | Lifecycle+permission; exact endpoints and safe copy controls. HTTP/auth tests; Owner/Staff/Branch/full interaction lifecycle QA; no anonymous route yet. |
| Task 3.23-P6 — Public Resolution and Media Transport / الحل العام ونقل الصورة | Visibility+crypto+grants; safe live projection, admission port, typed errors and current-main reader. No-JS/tenant/media/pricing/error/snapshot tests; review deployment limiter/log redaction before public exposure. |
| Task 3.23-P7 — SSR Presentation and Release Integration / العرض وتكامل الإصدار | All prior slices; safe localized page/metadata/headers. Built-server tests, complete responsive/RTL/accessibility/navigation QA, actual deployment gates and final matrix before release. |

Unresolved deployment choices: distributed limiter backend/thresholds/expiry/bandwidth limits and trusted proxy topology; secret provisioning/backups/key-rotation operator procedure and batch size; actual public origin; upstream/access/error-reporting redaction configuration; proxy/CDN bypass and header enforcement; TLS/HSTS ownership; stronger CSP nonce/asset policy beyond compatible baseline. None authorizes expiry, plaintext storage, extra capabilities, fallback keys, or production exposure before evidence. Numeric specification/retry/key-ring bounds and routes are resolved by this contract; deployment-specific rate thresholds remain configurable.

الإسناد الرسمي هو **المهمة 3.23 — رابط مشاركة المنتج العام V1**؛ **التخطيط معتمد والتنفيذ لم يبدأ**. **3.23-P1 جاهزة للتخطيط فقط (READY_FOR_PLANNING)**؛ **3.23-P2–P7 مشروطة باعتماد مستقل ولم تبدأ (GATED / NOT STARTED)**. لا شريحة جاهزة للتنفيذ. كل شريحة تحتاج اعتماداً ومراجعة مستقلة قبل التالية؛ لا اعتماد لكود الإنتاج أو الترحيلات أو النشر أو مكتبات جديدة. تبدأ بالبيانات والعقود ثم محرر الرؤية والتشفير والحفظ والإدارة، ثم الحل العام والعرض مع الاختبارات والQA المحددين. تبقى خيارات النشر المذكورة حقيقية: خلفية المحدد وحدوده، أسرار ومشغل التدوير، الأصل، حجب السجلات، الوكيل والتخزين وTLS وCSP الأقوى. لا تبيح انتهاء أو نصاً صريحاً أو قدرات إضافية أو مفاتيح بديلة أو تعريضاً عاماً قبل الأدلة. حدود المواصفات والمحاولات والحلقات والمسارات محسومة هنا؛ حدود المعدل إعداد نشر.

## Source evidence | أدلة المصدر

Static bounded confirmation; no application, database or browser acceptance execution in this documentation task.

- [Reference-data domain](../../domains/catalog/reference-data/domain/catalog-reference-data.ts): `SpecificationTemplateEntry`, label/unit validation, exact ISO formatter.
- [Reference-data use cases](../../domains/catalog/reference-data/application/catalog-reference-data.use-cases.ts): `ConfigureProductTypeSpecificationTemplateUseCase`, manage permission, template audit/version rules.
- [Reference persistence](../../domains/catalog/reference-data/infrastructure/persistence/postgresql-catalog-reference-data.repository.ts): replacement/save mapping and optimistic checks.
- [Catalog schema](../../domains/catalog/infrastructure/persistence/schema.ts): tenant-bound keys, template constraints, typed values, main-image partial uniqueness/provenance.
- [Product Aggregate](../../domains/catalog/types/product.aggregate.ts) and [commercial details](../../domains/catalog/types/product-commercial-details.value-object.ts): create/rehydrate/update delegate canonical optional name validation; nonblank when supplied, no maximum, no name truncation. Nullable text persistence supports the defensive public-only limit in section 5.
- [Specification value](../../domains/catalog/types/specification-value.entity.ts) and [Product specification value](../../domains/catalog/types/product-specification-value.value-object.ts): existing string/number/boolean semantics reused for internal handoff, without duplicate domain model.
- [Catalog persistence schema](../../domains/catalog/infrastructure/persistence/schema.ts), [Workspace schema](../../domains/workspace/infrastructure/persistence/schema.ts), and [Inventory schema](../../domains/inventory/infrastructure/persistence/schema.ts): bounded Identity-reference/FK search found no clear Catalog-owned-row -> Identity-account composite-FK precedent; section 8 uses Application-validated accountability IDs instead. This is the bounded finding, not a repository-wide prohibition.
- [Permission registry](../../domains/identity/domain/permission.ts): module, sensitivity, Staff assignment and existing sharing names.
- [Session key configuration](../../domains/identity/infrastructure/crypto/environment-session-token-digest.ts) and [recovery AES-GCM](../../domains/identity/infrastructure/crypto/aes-gcm-public-recovery-flow-token.ts): key-ring/encoding/encryption precedents only, not shared adapters.
- [Product persistence](../../domains/catalog/infrastructure/persistence/postgresql-product.repository.ts): read-only repeatable-read precedent.
- [Workspace persistence](../../domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts): parent row-lock precedent.
- [Direct Sharing](../../domains/catalog/sharing/domain/direct-product-share.ts): bounded bytes/code-point checks; first-six/truncation explicitly excluded here.
- [Media reader](../../domains/catalog/media/infrastructure/local-product-media-reader.adapter.ts): containment/signature/checksum checks.
- [Root layout](../../app/layout.tsx) and [Catalog components](../../domains/catalog/query/presentation/catalog-components.tsx): locale boundary, exact money, unoptimized image and fallback precedents.
- [Package scripts](../../package.json): existing verification commands; future share integration paths need explicit inclusion.

تأكيد ساكن محدود فقط؛ لم تُشغّل اختبارات تطبيق أو قاعدة بيانات أو قبول متصفح في مهمة التوثيق. الأدلة أعلاه تسند الأسماء والحدود والطبقات الحالية ولا تجعل التوصيات تنفيذاً موجوداً.
