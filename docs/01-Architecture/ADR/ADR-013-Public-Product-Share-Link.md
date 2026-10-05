# ADR-013: Public Product Share Link | رابط مشاركة المنتج العام

**Status:** Accepted; implementation not yet authorized · **Date:** 2026-10-04

**الحالة:** معتمد؛ لم يُعتمد التنفيذ بعد · **التاريخ:** 2026-10-04

## English

### Context

Authenticated Catalog Product Details and Direct Device Sharing already compose canonical Product, Branch listing, effective pricing, persisted specifications, and approved media. Their use cases require `TrustedActorContext`; their DTOs and Presentation are not anonymous-access contracts. Direct Device Sharing deliberately creates no public link or persistent share grant.

The current Specification Template belongs to a Workspace and Product Type. Its entries identify Specification Definitions and carry ordering and requiredness. Product owns persisted specification references and values, not definitions or templates. Neither template requiredness nor the Direct Share readability rule establishes public disclosure permission.

Public Product Share Links are explicitly decision-gated in the roadmap. This draft records the approved V1 product and architectural decisions. It assigns an ADR identifier according to the current register, not an implementation task number. It does not change delivery status, approve implementation, or resolve the contract questions below.

### Problem

A customer needs to open a shared Product without a Workspace session. Reusing authenticated Details or granting synthetic employee permissions would expose the wrong authority boundary. A safe public view needs an independently resolved bearer grant, live eligibility checks, explicit specification disclosure, tenant-bound data access, and independently authorized media delivery.

### Decision

#### Public Share boundary

One opaque, cryptographically strong random bearer token resolves exactly one Product in one fixed Branch. Generate at least 32 random bytes (256 bits) before URL-safe encoding, following the repository security precedent. Persist a versioned lookup digest and an authenticated encrypted representation for authorized repeat-copy, never plaintext. Product, Workspace, Branch, employee, or sequential identifiers must not be embedded as public authority; Workspace codes must never serve as public authority.

Resolve token → Workspace → Product → Branch entirely server-side. Anonymous clients must not supply Workspace, Product, or Branch identifiers as authority. Anonymous access must not create or simulate `TrustedActorContext`. Authenticated issue/copy/revoke/replace management remains separate from public reads; its exact permission keys and Branch scope are implementation-contract questions.

Support explicit revocation. On every relevant public request, including media delivery, independently verify that the link exists and is not revoked, the Product is Published, the fixed Branch is Active, and the Product remains explicitly Listed in that Branch. Missing listing configuration does not mean Listed.

The page is a live Product view, not a quotation or Product snapshot. No automatic expiration is required in V1. A link remains usable while it is not revoked and current eligibility holds. Expiration requires a separately approved later decision. Temporary resource ineligibility suspends public availability without revoking the grant. The same unrevoked grant and URL may automatically resume when eligibility returns. Explicitly revoked grants never resume.

#### Active link cardinality, ownership, and repeat-copy

At most one active Public Share Link grant may exist for each Workspace + Product + Branch. Explicit revocation may leave zero active grants. Issuance is idempotent: if an active eligible grant already exists for that tuple, authorized management returns/reuses the existing link. V1 does not create separate active links per employee, recipient, or share action. Temporary ineligibility does not permit creating a second active grant.

The grant is Workspace-owned, not employee-owned. Record the issuer identity for audit/accountability. Issuer access loss, role changes, or departure from the Workspace do not alone revoke an existing grant. Current Product, Branch, listing, price, and specification eligibility applies independently. Explicit revocation remains an authorized management action.

An explicitly authorized employee can retrieve/copy the same active public URL later. Copy never rotates or replaces the bearer token. Token replacement requires an explicit operation after revocation or explicit replacement approval; silent regeneration is prohibited.

#### Token persistence and crypto boundaries

Persist two representations for distinct purposes:

1. A versioned HMAC-SHA-256 digest for lookup/verification.
2. An authenticated encrypted representation of the original bearer token for authorized repeat-copy.

Never persist the plaintext bearer token. Authenticated encryption follows the repository AES-256-GCM precedent. Public Sharing must own dedicated crypto ports/adapters and dedicated key purposes/configuration; it must not import or couple directly to Identity-specific Infrastructure adapters. Preserve DDD, Clean Architecture, TypeScript, and Multi-Tenant boundaries.

#### Key separation and rotation

Lookup HMAC keys and encryption keys serve different purposes. Keep their configuration and key-purpose semantics separate and use versioned keys. Old versions may remain temporarily available for verification/decryption during rotation.

Encryption-key rotation must allow re-encryption of stored bearer tokens without changing public URLs or silently rotating bearer tokens. Lookup HMAC key retirement requires migration/re-digestion of active grants before removing the old key and must not silently invalidate active links. Key loss must surface an operational failure requiring explicit recovery handling; it must never silently regenerate or replace public links. Exact operational migration and recovery procedures remain implementation-contract questions.

#### Revocation, replacement, and eligibility restoration

Explicit revocation permanently disables that grant. A later issuance after revocation creates a new bearer token and URL; the old revoked URL must never become valid again. An explicitly approved replacement permanently revokes the previous grant and creates a new token/URL while preserving the one-active-grant invariant; transaction/concurrency details remain for the implementation contract.

Separate grant revocation from current resource eligibility. An active, non-revoked grant becomes publicly unavailable when the Product is not Published, the Branch is not Active, the Product is not Listed, required current public Retail price is unavailable, or another approved live eligibility rule fails. If these conditions become valid again, the same unrevoked grant may automatically resume and the same public URL may work again. A revoked grant must never resume automatically.

#### Public Product data and pricing

Use a dedicated Public Sharing projection. Expose only Product name, one approved main Product image, approved Public Key Specifications, current effective Retail price, and currency. Do not automatically include Product code, Branch display name, or seller identity; those are not part of this approved V1 exposure list.

The Branch is fixed by the server-resolved link. Effective Retail means the current Branch Retail override, otherwise the current Workspace base Retail price. Preserve a valid zero price as distinct from a missing price. Never substitute Wholesale or Reference Cost. Retail price remains live. Missing or unsupported Retail price temporarily makes the public resource unavailable; never guess a price or currency scale. Restoring a valid Retail price may restore the same unrevoked link.

Never expose Wholesale, Reference Cost, exact Inventory quantities, internal IDs, authorization/capability information, audit information, storage metadata, or internal lifecycle diagnostics. No availability/status field is added to the approved public projection by this record.

#### Media, SEO, caching, and privacy

V1 supports one approved main WebP image. Public media authorization independently repeats link/Product/Branch eligibility checks and resolves current approved media server-side. Storage paths and metadata remain infrastructure-only. The page remains usable if image delivery fails.

Use `noindex, nofollow` and no sitemap entry. Preserve live revocation and freshness across page, data, and media delivery; use `no-store` wherever required to enforce those semantics. A cache or image-delivery path must not silently bypass current eligibility. SEO directives do not replace bearer authorization or prevent a recipient from copying content.

No visitor analytics, recipient tracking, tracking cookies, marketing attribution, or delivery claims. Never emit plaintext bearer tokens, encrypted token values, HMAC digests, secrets, or key material into audit metadata, logs, tracing, analytics, or error details. Preserve the repository secret-safe audit precedent. Management responses may return the public URL only to an explicitly authorized caller; anonymous public responses never expose token internals or tenant/resource identifiers. Public errors must not disclose resource existence or tenant details. Abuse controls and minimal operational evidence require bounded contract decisions without introducing visitor analytics.

### Public Key Specifications Decision

Public Key Specifications are required in V1. Extend the existing `SpecificationTemplateEntry` metadata with explicit visibility semantics: `internal` and `public`. Do not create a duplicate Specification Definition, Template, or Product specification-value model.

- Existing/migrated entries default to `internal`.
- New entries default to `internal` unless explicitly configured otherwise.
- No existing specification becomes anonymously public automatically.
- Visibility belongs to the Product Type's Specification Template context, not a global interpretation of a Definition or a Product-specific copy.
- Do not infer disclosure from `required`, `sortOrder`, Definition status, filterability, or Direct Share readability rules.

A specification may appear publicly only if all of the following hold:

1. It belongs to the Product Type's current Specification Template.
2. Its current Template Entry is explicitly `public`.
3. Its same-Workspace Specification Definition satisfies the approved active/valid policy.
4. The Product has an actual persisted value.
5. Safe display metadata is available.

Order public specifications using existing Template Entry ordering. Never fall back to `specificationDefinitionId` or another internal identifier as a public label. Do not reuse Direct Device Share's first-six-useful-specifications rule as disclosure authority. Do not silently truncate values where truncation could change meaning.

Values remain live and come from canonical Product persistence. Do not duplicate them into a Public Share-specific store. Removing an entry from the current template removes it from the public projection; changing visibility from `public` to `internal` removes it from existing public links. These visibility changes affect the live public read only and do not rewrite canonical Product values or change publication readiness implicitly.

The policy is Product-agnostic. Do not hardcode processor, RAM, storage, GPU, or other Product-specific fields. Missing or invalid display metadata for one public specification omits that specification rather than exposing an internal identifier. Never fall back to `specificationDefinitionId`. Historical specifications outside the current template and inactive/invalid Definitions must not appear. Exact active/valid validation mechanics, safe-label/unit/value limits, missing/oversized-value rendering, and behavior when no qualifying public specifications remain require implementation-contract definition; they must preserve these approved disclosure rules.

### Security invariants

- Token possession authorizes only the resolved single-Product public view, never Catalog browsing, management, or authenticated APIs.
- Cryptographic generation and digest verification must not rely on enumerable resource identities; raw tokens must not be persisted or logged.
- Page and media reads enforce current grant and resource eligibility independently. No reusable media URL may widen access beyond the link's authority.
- Public DTOs are explicit allow-lists. Authenticated Product Details DTOs and Direct Share payloads are not public authorization models.
- All dynamic text is handled as data; safe labels cannot be internal-ID fallbacks. Values cannot be silently altered to fit a display limit.
- Revocation and disclosure withdrawal must not be defeated by caching. Consistency and concurrent-request guarantees must be explicit; already received content cannot be recalled.
- Public error handling and operational evidence disclose neither tenant identity nor eligibility diagnostics. Bearer-token leakage and abuse controls remain required contract concerns.

### Multi-Tenant invariants

- Resolve tenant context from the server-owned link mapping, never anonymous request authority or a synthetic actor.
- Verify Product, Branch, listing, Retail override/base source, current Template, Definitions, persisted values, and media belong to the resolved Workspace.
- Tenant-bound joins and repository lookups must preserve Workspace identity throughout; identifiers alone are not sufficient ownership proof.
- Issue/copy/revoke/replace management must validate authenticated Workspace authority and cannot operate on another tenant's grants.
- Any cache, limiter, or observability design must preserve tenant isolation without publishing Workspace identifiers.
- Media storage-root and Product membership checks remain identity-bound; public transport does not expose provider keys, checksums, or filesystem paths.

### Consequences

Public Sharing adds an anonymous read boundary and persistent bearer-grant lifecycle within Catalog sharing. Exact persistence shape is deferred to a separately approved contract. A dedicated public projection and media authorization are required; existing canonical data and verified media infrastructure can be reused behind their owning ports.

DDD, Clean Architecture, TypeScript, and Multi-Tenant isolation remain mandatory. Product lifecycle authority, Branch/listing/pricing authority, Specification Definition/Template ownership, and repository boundaries remain unchanged. Application owns orchestration and authorization; repositories own data access; React owns presentation and interaction. Repositories do not call other repositories, and components do not access the database.

The template visibility extension requires approved persistence, transport, management, and compatibility treatment. Defaulting to `internal` prevents automatic exposure but requires explicit configuration before key specifications can be published. No Product-value duplication or lifecycle redesign is authorized.

Public links show current data and may change or become unavailable after Product, Branch, listing, price, template, or media changes. They have no automatic V1 expiry. A forwarded token can grant access to further recipients; revocation cannot erase screenshots or downloaded content.

This decision does not introduce task numbering, migration numbering, implementation filenames, delivery sequencing, new dependencies, or production deployment approval. Existing deferred WhatsApp and broader Catalog decisions retain their separate gates.

### Explicit Non-Goals

Public Catalog browsing/search/filtering; related Products; Branch switching; Wholesale or Reference Cost; exact Inventory quantities; public seller directory; media galleries; WhatsApp-specific `wa.me`; WhatsApp Cloud API/backend sending; orders; checkout; reservations; Product/version snapshots; analytics/marketing attribution; custom domains.

Automatic expiration is not part of V1. No numeric or binary Inventory projection, additional seller fields, or dedicated messaging channel is implied by a share link.

### Rejected Alternatives

- Canonical Product/Workspace/Branch IDs, Workspace codes, or sequential IDs as public authority: enumerable or coupled to private identity.
- Digest-only / show-once tokens: rejected for V1 because authorized users must copy the same active URL later without invalidating links already sent to customers.
- Stateless/signed reconstructable tokens: rejected for V1 because no approved reconstructable signed-token format exists in the repository, the design adds complexity, and revocation/one-active-link still require persisted state.
- Persisting plaintext bearer tokens: database disclosure would immediately reveal active public links.
- Anonymous callers supplying tenant/resource authority or synthetic `TrustedActorContext`: bypasses the distinct public authorization boundary.
- Reusing authenticated Details DTOs or Direct Share payloads unchanged: carries internal fields, actor-dependent semantics, and authenticated media routes.
- Treating required/order/active/filterable metadata or the first six readable fields as public permission: those properties do not establish disclosure approval.
- Globally marking a Specification Definition public or duplicating specifications per share: loses Product Type template context or duplicates canonical ownership.
- Hardcoded Product-specific fields: breaks Product-agnostic behavior and configurable business policy.
- Snapshotting Product/specification/price values: contradicts the approved live-view semantics.
- Mandatory automatic V1 expiration: not required by the approved product decision; future expiration is separately gated.
- Expanding the link into an anonymous Catalog or WhatsApp delivery system: exceeds the approved single-Product boundary.

### Open implementation-contract questions

The following remain unresolved; none grants implementation authority:

1. Exact authorization permission keys and Branch scope for issue/copy/revoke/replace management.
2. Exact persistence schema, constraints, indexes, lookup uniqueness, and retention policy for revoked grants and safe audit records.
3. Transaction/concurrency semantics for idempotent issuance, retry/conflict handling, replacement, revocation consistency, and live reads during eligibility or disclosure changes.
4. Exact dedicated crypto port interfaces, token encoding/validation, runtime configuration names, and authenticated-encryption context binding.
5. Exact operational key-rotation, re-encryption/re-digestion, key-retirement, and explicit key-loss recovery procedures without silent URL replacement or invalidation.
6. Specification validation mechanics, safe labels/units, missing/oversized-value rendering, and behavior when no public specifications qualify; template-visibility management authority and persistence/transport/default/migration compatibility.
7. Approved current-main-image eligibility, verification/size limits, image-failure fallback, and media authorization/transport/cache details that preserve independent live checks.
8. Exact public error/status/body mapping, infrastructure-failure handling, and enumeration resistance.
9. Rate-limit thresholds, request/bandwidth infrastructure, enforcement location, and limiter failure policy without visitor analytics.
10. Page/data/media freshness and concurrent-request guarantees, token redaction across logs/traces/referrers, and crawler/social-preview handling under the approved SEO/privacy constraints.
11. Explicit public DTO/transport validation, English/Arabic localization, responsive/accessibility acceptance criteria, and the final automated/manual security, tenant-isolation, and touch/mouse/keyboard acceptance matrix.

## العربية

### السياق

تجمع تفاصيل المنتج الموثقة والمشاركة المباشرة عبر الجهاز بيانات المنتج المعتمدة وإدراج الفرع والسعر الفعلي والمواصفات المحفوظة والوسائط المعتمدة. تتطلب حالات الاستخدام `TrustedActorContext`، ولا تمثل DTO أو واجهاتها عقوداً للوصول المجهول. لا تنشئ المشاركة المباشرة رابطاً عاماً أو تفويض مشاركة محفوظاً.

ينتمي قالب المواصفات الحالي إلى مساحة العمل ونوع المنتج. تحدد إدخالاته تعريفات المواصفات وترتيبها وإلزامها. يملك Product المراجع والقيم المحفوظة، ولا يملك التعريفات أو القوالب. لا يثبت الإلزام أو معيار قابلية قراءة المشاركة المباشرة صلاحية الإفصاح العام.

تشترط الخارطة قراراً مستقلاً للروابط العامة. توثق هذه المسودة قرارات V1 المعتمدة للمنتج والمعمارية. تمنح معرف ADR وفق السجل الحالي، ولا تمنح رقم مهمة تنفيذ. لا تغير حالة التسليم ولا تعتمد التنفيذ ولا تحسم أسئلة العقد أدناه.

### المشكلة

يحتاج العميل فتح منتج مشارك دون جلسة مساحة عمل. تعيد تفاصيل المنتج الموثقة أو صلاحيات موظف مصطنعة استخدام حدود سلطة غير مناسبة. تتطلب القراءة العامة الآمنة تفويضاً مستقلاً برمز حامل، وفحص أهلية حياً، وإفصاحاً صريحاً للمواصفات، ووصولاً مقيداً بالمستأجر، وتفويضاً مستقلاً للوسائط.

### القرار

#### حدود المشاركة العامة

يحل رمز حامل معتم وعشوائي قوي تشفيرياً إلى منتج واحد في فرع ثابت واحد. يُولد من 32 بايت عشوائياً على الأقل (256 بت) قبل الترميز الآمن للرابط، وفق سابقة الأمان في المستودع. تُحفظ بصمة بحث ذات إصدار وتمثيل مشفر موثق لإعادة النسخ المصرح بها، ولا يُحفظ النص الصريح. لا تُضمّن معرفات المنتج أو مساحة العمل أو الفرع أو الموظف أو المعرفات التسلسلية كسلطة عامة، ولا يُستخدم رمز مساحة العمل كسلطة عامة.

يُحل الرمز ← مساحة العمل ← المنتج ← الفرع بالكامل على الخادم. لا يمرر العميل المجهول هذه المعرفات كسلطة. لا ينشئ الوصول المجهول `TrustedActorContext` ولا يحاكيه. تبقى إدارة الإصدار والنسخ والإلغاء والاستبدال موثقة ومنفصلة عن القراءة العامة؛ ويحدد عقد التنفيذ مفاتيح الصلاحيات الدقيقة ونطاق الفرع.

يُدعم الإلغاء الصريح. يتحقق كل طلب عام ذي صلة، بما فيه الوسائط، بصورة مستقلة من وجود الرابط وعدم إلغائه، ومن أن المنتج Published، والفرع الثابت Active، والمنتج Listed صراحة فيه. لا يعني غياب إعداد الإدراج أن المنتج مدرج.

الصفحة عرض حي للمنتج وليست عرض سعر ثابتاً أو لقطة محفوظة. لا يلزم انتهاء تلقائي في V1. يبقى الرابط قابلاً للاستخدام ما لم يُلغَ وما دامت الأهلية الحالية متحققة. يتطلب الانتهاء قراراً لاحقاً معتمداً بصورة مستقلة. يوقف فقدان أهلية المورد المؤقت الإتاحة العامة دون إلغاء التفويض. يمكن أن يعود التفويض غير الملغى والرابط نفسه تلقائياً عند عودة الأهلية. لا يعود التفويض الملغى صراحة.

#### عدد التفويضات النشطة والملكية وإعادة النسخ

يوجد على الأكثر تفويض رابط عام نشط واحد لكل مساحة عمل + منتج + فرع. قد يترك الإلغاء الصريح صفراً من التفويضات النشطة. الإصدار متكرر بأمان: إذا وجد تفويض نشط مؤهل للتركيبة نفسها، تعيد الإدارة المصرح بها الرابط الموجود وتستخدمه. لا تنشئ V1 روابط نشطة منفصلة لكل موظف أو مستلم أو إجراء مشاركة. لا يجيز فقدان الأهلية المؤقت إنشاء تفويض نشط ثانٍ.

التفويض مملوك لمساحة العمل لا للموظف. تُسجل هوية المُصدر للتدقيق والمساءلة. لا يؤدي فقدان وصول المُصدر أو تغيير دوره أو مغادرته مساحة العمل وحده إلى إلغاء الرابط. تُطبق أهلية المنتج والفرع والإدراج والسعر والمواصفات الحالية بصورة مستقلة. يبقى الإلغاء الصريح إجراء إدارة مصرحاً به.

يستطيع الموظف المصرح له صراحة استرجاع الرابط العام النشط نفسه ونسخه لاحقاً. لا يدوّر النسخ الرمز الحامل ولا يستبدله. يتطلب استبدال الرمز عملية صريحة بعد الإلغاء أو موافقة صريحة على الاستبدال؛ يُحظر التوليد الصامت لرمز بديل.

#### حفظ الرمز وحدود التشفير

يُحفظ تمثيلان لغرضين مختلفين:

1. بصمة HMAC-SHA-256 ذات إصدار للبحث والتحقق.
2. تمثيل مشفر وموثق للرمز الحامل الأصلي لإعادة النسخ المصرح بها.

لا يُحفظ الرمز الحامل بنص صريح. يتبع التشفير الموثق سابقة AES-256-GCM في المستودع. تملك المشاركة العامة منافذ ومحولات تشفير مخصصة وأغراض مفاتيح وإعدادات مخصصة؛ لا تستورد محولات البنية التحتية الخاصة بـIdentity ولا ترتبط بها مباشرة. تُحفظ حدود DDD وClean Architecture وTypeScript وتعدد المستأجرين.

#### فصل المفاتيح وتدويرها

تختلف أغراض مفاتيح البحث HMAC ومفاتيح التشفير. تُفصل إعداداتها ودلالات أغراضها وتُستخدم مفاتيح ذات إصدارات. قد تبقى الإصدارات القديمة متاحة مؤقتاً للتحقق وفك التشفير أثناء التدوير.

يتيح تدوير مفتاح التشفير إعادة تشفير الرمز المحفوظ دون تغيير الرابط العام أو تدوير الرمز الحامل بصمت. يتطلب سحب مفتاح البحث HMAC ترحيل التفويضات النشطة وإعادة حساب بصماتها قبل إزالة المفتاح القديم، ولا يبطل الروابط النشطة بصمت. يظهر فقدان المفتاح كعطل تشغيلي يتطلب معالجة استعادة صريحة؛ لا يعيد توليد الروابط أو استبدالها بصمت. تبقى إجراءات الترحيل والاستعادة التشغيلية الدقيقة لعقد التنفيذ.

#### الإلغاء والاستبدال وعودة الأهلية

يعطل الإلغاء الصريح التفويض نهائياً. ينشئ الإصدار اللاحق بعد الإلغاء رمزاً حاملاً جديداً ورابطاً جديداً؛ لا يعود الرابط القديم الملغى صالحاً أبداً. يلغي الاستبدال المعتمد صراحة التفويض السابق نهائياً وينشئ رمزاً ورابطاً جديدين مع حفظ قيد التفويض النشط الواحد؛ تبقى تفاصيل المعاملات والتزامن لعقد التنفيذ.

يُفصل إلغاء التفويض عن أهلية المورد الحالية. يصبح التفويض النشط غير الملغى غير متاح علناً عندما لا يكون المنتج Published أو الفرع Active أو المنتج Listed، أو يتعذر سعر التجزئة العام الحالي المطلوب، أو تفشل قاعدة أهلية حية معتمدة أخرى. إذا عادت الشروط صحيحة، يمكن أن يعود التفويض غير الملغى والرابط العام نفسه تلقائياً. لا يعود التفويض الملغى تلقائياً أبداً.

#### بيانات المنتج العامة والتسعير

يُستخدم إسقاط مستقل للمشاركة العامة. يُعرض فقط اسم المنتج وصورة رئيسية معتمدة ومواصفات عامة رئيسية معتمدة وسعر التجزئة الفعلي الحالي والعملة. لا يُضاف رمز المنتج أو اسم الفرع أو هوية البائع تلقائياً؛ ليست ضمن قائمة الإفصاح المعتمدة لـV1.

يثبت الفرع من حل الرابط على الخادم. السعر الفعلي هو تجاوز التجزئة الحالي للفرع، وإلا سعر التجزئة الأساسي الحالي لمساحة العمل. يبقى الصفر الصحيح مختلفاً عن السعر المفقود. لا يُستبدل بالجملة أو التكلفة المرجعية. يبقى سعر التجزئة حياً. يجعل السعر المفقود أو غير المدعوم المورد العام غير متاح مؤقتاً، دون اختراع سعر أو مقياس عملة. قد تعيد استعادة سعر تجزئة صحيح الرابط نفسه غير الملغى.

لا تُعرض الجملة أو التكلفة المرجعية أو كميات المخزون الدقيقة أو المعرفات الداخلية أو معلومات التفويض والقدرات أو التدقيق أو بيانات التخزين أو تشخيصات دورة الحياة الداخلية. لا يضيف هذا السجل حقلاً عاماً للإتاحة أو الحالة.

#### الوسائط وSEO والتخزين المؤقت والخصوصية

تدعم V1 صورة WebP رئيسية معتمدة واحدة. يعيد تفويض الوسائط العامة بصورة مستقلة فحص الرابط والمنتج والفرع، ويحل الوسائط المعتمدة الحالية على الخادم. تبقى المسارات والبيانات التخزينية داخل البنية التحتية. تظل الصفحة قابلة للاستخدام عند فشل الصورة.

تُستخدم `noindex, nofollow` دون إدراج في sitemap. تُحفظ دلالات الإلغاء والحداثة الحية للصفحة والبيانات والوسائط، وتُستخدم `no-store` حيث يلزم. لا يتجاوز التخزين المؤقت أو تسليم الصور الأهلية الحالية بصمت. لا تحل تعليمات SEO محل التفويض ولا تمنع المستلم من نسخ المحتوى.

لا تحليلات زوار أو تتبع مستلمين أو ملفات تعريف ارتباط للتتبع أو إسناد تسويقي أو ادعاء تسليم. لا تُرسل الرموز الحاملة الصريحة أو قيم الرموز المشفرة أو بصمات HMAC أو الأسرار أو مواد المفاتيح إلى بيانات التدقيق أو السجلات أو التتبع أو التحليلات أو تفاصيل الأخطاء. تُحفظ سابقة التدقيق الآمن للأسرار في المستودع. تعيد استجابات الإدارة الرابط العام فقط لطالب مصرح له صراحة؛ لا تكشف الاستجابات العامة المجهولة تفاصيل الرمز أو معرفات المستأجر والموارد. لا تكشف الأخطاء العامة وجود الموارد أو تفاصيل المستأجر. تتطلب مكافحة الإساءة والأدلة التشغيلية الدنيا قرارات محددة دون إدخال تحليلات زوار.

### قرار المواصفات العامة الرئيسية

المواصفات العامة الرئيسية مطلوبة في V1. تُوسع بيانات `SpecificationTemplateEntry` الحالية بدلالات رؤية صريحة: `internal` و`public`. لا يُنشأ نموذج مكرر لتعريف المواصفة أو القالب أو قيم المنتج.

- تكون الإدخالات الحالية والمرحلة `internal` افتراضياً.
- تكون الإدخالات الجديدة `internal` ما لم تُضبط صراحة خلاف ذلك.
- لا تصبح أي مواصفة موجودة عامة تلقائياً.
- تنتمي الرؤية إلى سياق قالب نوع المنتج، وليست تفسيراً عاماً لتعريف المواصفة أو نسخة خاصة بالمنتج.
- لا يُستنتج الإفصاح من الإلزام أو الترتيب أو حالة التعريف أو قابلية الترشيح أو قابلية قراءة المشاركة المباشرة.

لا تظهر المواصفة علناً إلا باجتماع الشروط التالية:

1. تنتمي إلى القالب الحالي لنوع المنتج.
2. يحمل إدخالها الحالي قيمة `public` صريحة.
3. يحقق تعريفها في مساحة العمل نفسها سياسة النشاط والصلاحية المعتمدة.
4. يملك المنتج قيمة فعلية محفوظة.
5. تتوفر بيانات عرض آمنة.

يُستخدم ترتيب إدخالات القالب الحالي. لا يُستخدم معرف تعريف المواصفة أو أي معرف داخلي كاسم عرض احتياطي. لا يُستخدم اختيار أول ست مواصفات مفيدة في المشاركة المباشرة كسلطة إفصاح. لا تُقتطع القيم بصمت إذا كان الاقتطاع قد يغير معناها.

تبقى القيم حية ومن حفظ المنتج المعتمد دون تكرارها في مخزن مشاركة عامة. تؤدي إزالة الحقل من القالب الحالي إلى إزالته من الإسقاط العام، ويؤدي تغيير `public` إلى `internal` إلى إزالته من الروابط الحالية. يؤثر ذلك في القراءة العامة الحية ولا يعيد كتابة قيم المنتج ولا يغير جاهزية النشر ضمنياً.

تبقى السياسة عامة لجميع المنتجات دون تثبيت حقول المعالج أو RAM أو التخزين أو GPU. تُحذف المواصفة الواحدة من الإسقاط العام عند غياب بيانات عرضها أو عدم صلاحيتها، دون كشف معرف داخلي. لا يُستخدم `specificationDefinitionId` كبديل أبداً. لا تظهر المواصفات التاريخية خارج القالب الحالي ولا التعريفات غير النشطة أو غير الصالحة. يحدد عقد التنفيذ آليات التحقق الدقيقة وحدود الأسماء والوحدات والقيم وسلوك القيم المفقودة أو الكبيرة وغياب المواصفات المؤهلة، مع حفظ قواعد الإفصاح المعتمدة.

### ثوابت الأمان

- يمنح الرمز قراءة عامة للمنتج الواحد المحلول فقط، ولا يمنح تصفحاً أو إدارة أو وصولاً إلى APIs الموثقة.
- لا يعتمد توليد الرمز والتحقق من بصمته على معرفات قابلة للتعداد؛ لا تُحفظ الرموز الخام ولا تُسجل.
- تفحص الصفحة والوسائط الأهلية الحالية بصورة مستقلة، ولا يوسع رابط الوسائط حدود التفويض.
- DTO العامة قائمة إفصاح صريحة؛ ليست DTO التفاصيل الموثقة أو حمولة المشاركة المباشرة نموذج تفويض عام.
- يُعامل النص الديناميكي كبيانات؛ لا تكون الأسماء بدائل لمعرفات داخلية ولا تُغير القيم بصمت لتلائم حدود العرض.
- لا يهزم التخزين المؤقت الإلغاء أو سحب الإفصاح. تُحدد ضمانات الاتساق والتزامن صراحة؛ لا يمكن استرجاع محتوى سبق استلامه.
- لا تكشف الأخطاء والأدلة التشغيلية هوية المستأجر أو التشخيصات؛ تبقى حماية الرمز ومكافحة الإساءة من متطلبات العقد.

### ثوابت تعدد المستأجرين

- يُحل سياق المستأجر من ربط الرابط على الخادم، لا من طلب مجهول أو ممثل مصطنع.
- تنتمي جميع بيانات المنتج والفرع والإدراج والأسعار والقالب والتعريفات والقيم والوسائط إلى مساحة العمل المحلولة.
- تحافظ الاستعلامات والربط على هوية مساحة العمل؛ لا يكفي المعرف وحده لإثبات الملكية.
- تتحقق إدارة الإصدار والنسخ والإلغاء والاستبدال من سلطة مساحة العمل الموثقة ولا تمس تفويض مستأجر آخر.
- تحفظ الذاكرة المؤقتة ومحددات الطلبات والمراقبة عزل المستأجر دون نشر معرفاته.
- تبقى جذور الوسائط وعضوية المنتج مقيدة بالهوية دون كشف المفاتيح أو البصمات أو المسارات.

### النتائج

تضيف المشاركة العامة حداً مجهولاً للقراءة ودورة تفويض حامل محفوظة داخل مشاركة Catalog. يؤجل شكل الحفظ الدقيق إلى عقد معتمد مستقل. يلزم إسقاط عام وتفويض وسائط مستقلان، ويمكن إعادة استخدام البيانات المعتمدة والبنية الموثوقة عبر منافذها المالكة.

تبقى DDD وClean Architecture وTypeScript وعزل المستأجرين إلزامية. لا تتغير سلطة دورة المنتج أو الفرع والإدراج والتسعير أو ملكية التعريفات والقوالب أو حدود المستودعات. تملك Application التنسيق والتفويض، وتملك المستودعات الوصول إلى البيانات، وتملك React العرض والتفاعل. لا تستدعي المستودعات مستودعات أخرى ولا تصل المكونات إلى القاعدة مباشرة.

يتطلب توسيع رؤية القالب معالجة معتمدة للحفظ والنقل والإدارة والتوافق. يمنع الافتراضي `internal` الإفصاح التلقائي لكنه يتطلب إعداداً صريحاً للمواصفات الرئيسية العامة. لا يُعتمد تكرار القيم أو إعادة تصميم دورة الحياة.

تعرض الروابط بيانات حالية قد تتغير أو تصبح غير متاحة عند تغير المنتج أو الفرع أو الإدراج أو السعر أو القالب أو الوسائط. لا تنتهي تلقائياً في V1. قد يمنح تمرير الرمز وصولاً لمستلمين آخرين، ولا يمحو الإلغاء صور الشاشة أو المحتوى المحمل.

لا يحدد القرار أرقام مهام أو ترحيلات أو أسماء ملفات تنفيذ أو تسلسل تسليم أو اعتماد مكتبات أو نشر إنتاجي. تبقى قرارات WhatsApp والكتالوج الأوسع مشروطة باعتماد منفصل.

### ما لا يستهدفه القرار صراحة

تصفح الكتالوج العام أو بحثه أو ترشيحه؛ المنتجات المرتبطة؛ تبديل الفرع؛ الجملة والتكلفة المرجعية؛ كميات المخزون الدقيقة؛ دليل البائعين؛ معارض الصور؛ `wa.me`؛ WhatsApp Cloud API والإرسال الخلفي؛ الطلبات؛ الدفع؛ الحجوزات؛ لقطات المنتجات والإصدارات؛ التحليلات والإسناد التسويقي؛ النطاقات المخصصة.

الانتهاء التلقائي خارج V1. لا يفترض الرابط عرض مخزون رقمي أو ثنائي أو حقول بائع إضافية أو قناة مراسلة مستقلة.

### البدائل المرفوضة

- المعرفات الداخلية ورموز مساحة العمل والمعرفات التسلسلية كسلطة عامة: قابلة للتعداد أو مرتبطة بهوية خاصة.
- حفظ البصمة فقط وعرض الرمز مرة واحدة: مرفوض في V1 لأن المستخدم المصرح له يجب أن ينسخ الرابط النشط نفسه لاحقاً دون إبطال الروابط المرسلة للعملاء.
- رمز موقع قابل لإعادة الإنشاء أو بلا حالة محفوظة: مرفوض في V1 لغياب صيغة معتمدة في المستودع وزيادة تعقيد التصميم؛ يظل الإلغاء وقيد الرابط النشط الواحد بحاجة إلى حالة محفوظة.
- حفظ الرمز الحامل بنص صريح: يكشف تسرب قاعدة البيانات الروابط العامة النشطة فوراً.
- سلطة موارد يمررها العميل أو `TrustedActorContext` مصطنع: يتجاوز حد التفويض العام المستقل.
- إعادة استخدام DTO التفاصيل أو حمولة المشاركة المباشرة كما هي: تحمل حقولاً داخلية ودلالات ممثل ووسائط موثقة.
- اعتبار الإلزام والترتيب والنشاط والترشيح أو أول ست مواصفات مقروءة إذناً عاماً: لا تمثل موافقة إفصاح.
- رؤية عامة على مستوى التعريف كله أو نسخ مواصفات لكل رابط: يفقد سياق قالب نوع المنتج أو يكرر الملكية.
- حقول ثابتة لنوع منتج معين: تخالف عمومية المنتج وسياسة الأعمال القابلة للإعداد.
- لقطات المنتج والمواصفات والأسعار: تخالف العرض الحي.
- فرض انتهاء تلقائي في V1: غير مطلوب؛ يحتاج الانتهاء المستقبلي قراراً منفصلاً.
- التوسع إلى كتالوج مجهول أو نظام إرسال WhatsApp: يتجاوز حد المنتج الواحد.

### أسئلة عقد التنفيذ المفتوحة

تبقى الأسئلة التالية دون حسم ولا تمنح اعتماد تنفيذ:

1. مفاتيح الصلاحيات الدقيقة ونطاق الفرع لإدارة الإصدار والنسخ والإلغاء والاستبدال.
2. مخطط الحفظ والقيود والفهارس وتفرد البحث وسياسة الاحتفاظ بالتفويضات الملغاة وسجلات التدقيق الآمنة.
3. دلالات المعاملات والتزامن للإصدار المتكرر بأمان وإعادة المحاولة والتعارض والاستبدال واتساق الإلغاء والقراءة الحية أثناء تغير الأهلية أو الإفصاح.
4. واجهات منافذ التشفير المخصصة وترميز الرمز والتحقق منه وأسماء إعدادات التشغيل وربط التشفير الموثق بالسياق.
5. إجراءات تدوير المفاتيح وإعادة التشفير وحساب البصمات وسحب المفاتيح والاستعادة الصريحة بعد فقدانها، دون استبدال الروابط أو إبطالها بصمت.
6. آليات التحقق من المواصفات والأسماء والوحدات الآمنة وعرض القيم المفقودة أو الكبيرة وسلوك غياب المواصفات العامة المؤهلة؛ وصلاحية إدارة رؤية القالب وتوافق الحفظ والنقل والافتراضيات والترحيل.
7. أهلية الصورة الرئيسية الحالية وحدود التحقق والحجم وبدائل فشل الصورة وتفاصيل تفويض الوسائط ونقلها وتخزينها المؤقت مع حفظ الفحص الحي المستقل.
8. حالات وأجسام الأخطاء العامة وأعطال البنية ومقاومة التعداد.
9. عتبات تحديد المعدل وبنية الطلبات والنطاق الترددي وموقع الفرض وسياسة فشل المحدد دون تحليلات زوار.
10. ضمانات حداثة الصفحة والبيانات والوسائط والطلبات المتزامنة وحجب الرمز من السجلات والتتبع وreferrers وسلوك الزواحف والمعاينات ضمن قيود SEO والخصوصية.
11. DTO العامة والتحقق من النقل ومعايير قبول اللغتين والتجاوب وإمكانية الوصول ومصفوفة القبول النهائية الآلية واليدوية للأمان وعزل المستأجرين والتفاعل باللمس والفأرة ولوحة المفاتيح.

## Related Documents | الوثائق المرتبطة

- [Current Roadmap](../../06-Roadmap/Current-Roadmap.md)
- [Deferred Decisions](../../06-Roadmap/Deferred-Decisions.md)
- [Direct Device Sharing](../Catalog/Direct-Device-Sharing.md)
- [Catalog Query and Search](../Catalog/Catalog-Query-and-Search.md)
- [Catalog Reference Data](../Catalog/Catalog-Reference-Data.md)
- [Product Specifications](../Catalog/Product-Specifications.md)
- [Branch Inventory and Pricing](../Inventory/Branch-Inventory-and-Pricing.md)
- [Product Lifecycle Foundation](../Catalog/Product-Lifecycle-Foundation.md)
- [ADR-007 Product Revision and Publication Decision Integrity](ADR-007-Product-Revision-and-Publication-Decision-Integrity.md)
- [ADR-012 Product Media Root Registry and Local Storage Foundation](ADR-012-Product-Media-Root-Registry-and-Local-Storage-Foundation.md)
