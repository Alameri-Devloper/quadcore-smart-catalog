# Task 3.23-P3 — Crypto and Runtime Planning | تخطيط التشفير والتشغيل

**Status:** P3PlanningReview PASS; P3PlanningGate PASS; READY_FOR_IMPLEMENTATION; implementation NOT STARTED / NOT AUTHORIZED YET.
**الحالة:** نجحت مراجعة التخطيط وبوابة التخطيط؛ READY_FOR_IMPLEMENTATION؛ التنفيذ لم يبدأ وغير معتمد بعد.
**Date / التاريخ:** 2026-10-11.
**Branch / الفرع:** `feature/task-3.23-p3-crypto-runtime-planning`.
**Required baseline / خط الأساس المطلوب:** `057880a359687c60537afc39108f32d9ddd63e1b`.

## 1. Baseline and authority | خط الأساس والمرجعية

P1 is COMPLETE / MERGED through PR #57 at `f9de644`. P2 is COMPLETE / MERGED through PR #59 at the required baseline above. Task 3.23 remains IN PROGRESS. P3PlanningReview and P3PlanningGate are PASS; P3 is READY_FOR_IMPLEMENTATION with implementation NOT STARTED / NOT AUTHORIZED YET; P4–P7 remain GATED / NOT STARTED. This document finalizes the completed read-only discovery with the user's architectural decisions and mandatory correction. It authorizes no implementation, migration, dependency, deployment or Git mutation.

P1 مكتملة ومدمجة عبر PR #57 عند `f9de644`، وP2 مكتملة ومدمجة عبر PR #59 عند خط الأساس أعلاه. تبقى المهمة 3.23 قيد التنفيذ، ونجحت مراجعة تخطيط P3 وبوابة التخطيط؛ P3 جاهزة للتنفيذ (READY_FOR_IMPLEMENTATION)، وP4–P7 مشروطة ولم تبدأ. تثبت هذه الوثيقة الاكتشاف السابق وقرارات المراجعة والتصحيح الإلزامي، ولا تصرح بالتنفيذ أو الترحيل أو المكتبات أو النشر أو تغيير Git.

Governing references: [ADR-013](../01-Architecture/ADR/ADR-013-Public-Product-Share-Link.md), [implementation contract](Task-3.23-Public-Product-Share-Link-V1-Implementation-Contract.md), [P1 plan](Task-3.23-P1-Metadata-and-Domain-Contracts-Planning.md), [P2 plan](Task-3.23-P2-Visibility-Transport-and-Editor-Planning.md), [Current Roadmap](Current-Roadmap.md), and [Sprint 03 continuation](Sprint-03-Continuation.md). Historical P2 planning-only statuses do not supersede its merged completion.

المراجع الحاكمة هي ADR-013 وعقد التنفيذ وخطتا P1 وP2 وخارطة الطريق واستمرار Sprint 03 المرتبطة أعلاه. لا تتجاوز حالات تخطيط P2 التاريخية اكتمالها ودمجها.

**Governing key-ring conflict reconciled: each key ring contains 1..8 keys.** This applies independently to HMAC and encryption, including active and retained overlap versions. The accepted decision is now reflected in the parent contract section 14 English/Arabic rules and section 28 crypto acceptance row. Both rings require boundary tests accepting 8 and rejecting 9 keys. Historical P1 key-ring wording in section 7 is superseded by this corrected governing rule; P1 remains COMPLETE / MERGED and is not reopened. Independent planning rereview and gate are PASS; this reconciliation grants no implementation approval.

**صُولح تعارض عقد حلقات المفاتيح: تضم كل حلقة من 1 إلى 8 مفاتيح.** يطبق الحد بصورة مستقلة على HMAC والتشفير، شاملاً النسخ النشطة والمحتفظ بها أثناء التداخل. يعكس القسم 14 بالإنجليزية والعربية وصف قبول التشفير في القسم 28 من العقد الأب القرار المعتمد. يلزم اختبار قبول 8 مفاتيح ورفض 9 لكل حلقة. يتجاوز هذا الحكم الحاكم المصحح نص حلقات المفاتيح التاريخي في القسم 7 من خطة P1، وتبقى P1 مكتملة ومدمجة دون إعادة فتحها. نجحت إعادة مراجعة التخطيط المستقلة وبوابة التخطيط، ولا تمنح المصالحة اعتماد التنفيذ.

## 2. Scope and non-scope | النطاق والاستبعادات

P3 owns canonical encoding/AAD helpers, token generation, HMAC lookup and AES-GCM bearer-protection adapters, strict configuration, runtime composition, pure coverage evaluation, focused tests, security/no-secret evidence and bilingual documentation. Preserve TypeScript, DDD, Clean Architecture, Multi-Tenant ownership and the existing Catalog Sharing layers.

تملك P3 أدوات الترميز وAAD، وتوليد الرمز، ومحولي HMAC وAES-GCM، والإعداد الصارم وتركيب التشغيل وتقييم التغطية الخالص والاختبارات المركزة وأدلة الأمن ومنع الأسرار والتوثيق الثنائي. تُحفظ TypeScript وDDD وClean Architecture وتعدد المستأجرين وطبقات Catalog Sharing الحالية.

Excluded: grant schema/migration/repository/UoW; issue/copy/revoke/replace orchestration; lifecycle audit persistence; management API/UI; anonymous resolver/media routes; SSR page; persisted rotation batches; production deployment. P3 introduces no grant inspection/query, scheduler or readiness HTTP route. Do not reopen P2 visibility/editor behavior.

تُستبعد بنية التفويض وترحيله ومستودعه ووحدة عمله ودورة الإصدار والنسخ والإلغاء والاستبدال وتدقيقها، وAPI وواجهة الإدارة والحل العام والوسائط وصفحة SSR ودفعات التدوير المحفوظة والنشر الإنتاجي. لا تضيف P3 فحص تفويضات أو استعلاماً أو مجدولاً أو مسار HTTP للجاهزية، ولا تعيد فتح عمل P2.

## 3. Existing crypto and runtime precedents | سوابق التشفير والتشغيل

| Existing source / المصدر الحالي | Reusable precedent and limits / السابقة وحدودها |
| --- | --- |
| [Session token crypto](../../domains/identity/infrastructure/crypto/session-token-crypto.ts) | 32 random bytes, base64url, versioned HMAC, copied key buffers. Do not reuse Identity keys, token rules or adapter. / عشوائية 32 بايت وbase64url وHMAC بإصدارات ونسخ دفاعية للمفاتيح؛ لا إعادة استخدام للمفاتيح أو المحول. |
| [Session environment reader](../../domains/identity/infrastructure/crypto/environment-session-token-digest.ts) | Injected environment, canonical base64, fixed errors. Number coercion/plain JSON.parse are insufficient for P3 canonical versions/duplicate members. / حقن البيئة وbase64 قانوني وأخطاء ثابتة؛ التحويل الرقمي وJSON.parse وحدهما لا يكفيان. |
| [Recovery-code digest](../../domains/identity/infrastructure/crypto/hmac-recovery-code-digest.ts) | Versioned maps and equal-length timingSafeEqual. Its unknown-key false outcome is not P3 KeyUnavailable semantics. / خرائط بإصدارات ومقارنة ثابتة الزمن بعد فحص الطول؛ غياب المفتاح في P3 عطل مستقل. |
| [Recovery AES-GCM](../../domains/identity/infrastructure/crypto/aes-gcm-public-recovery-flow-token.ts) | AES-GCM, 12-byte IV, full tag, AAD, version lookup and canonical encoding. Do not copy recovery-purpose derivation, expiry, format or null failures. / تشفير موثق وIV ووسم وAAD وإصدارات؛ لا نسخ اشتقاق غرض الاسترداد أو انتهائه أو صيغته أو أخطائه. |
| [Identity runtime](../../domains/identity/infrastructure/identity-server-runtime.ts) | Infrastructure composes adapters against owning ports and sanitizes transport failures. P3 crypto composition must not open a database. / تركيب المحولات في Infrastructure عبر المنافذ المالكة؛ تشغيل تشفير P3 لا يفتح قاعدة بيانات. |
| [Direct Share runtime](../../domains/catalog/sharing/infrastructure/direct-product-share-server-runtime.ts) | Existing Sharing placement. Its request-origin fallback is not public-link origin authority. / موضع Sharing الحالي؛ أصل الطلب البديل لا يحدد أصل الرابط العام. |
| [Audit repository](../../shared/audit/infrastructure/persistence/postgresql-security-audit.repository.ts) | Fixed audit ownership and forbidden metadata keys; an explicit value-safe allow-list is still required. / ملكية التدقيق وفحص أسماء الحقول لا يغنيان عن قائمة قيم آمنة صريحة. |

Identity crypto adapters implement [Identity application ports](../../domains/identity/application/ports.ts). Public Sharing owns [its crypto ports](../../domains/catalog/sharing/ports/public-share-crypto.port.ts) and must never import Identity crypto Infrastructure/configuration or reuse its keys. Existing actor-permission capabilities do not prove cryptographic readiness. No relevant application logger or upstream redaction implementation was established by bounded discovery; deployment evidence remains a later release gate.

تنفذ محولات Identity منافذها التطبيقية، وتملك Public Sharing منافذها المستقلة ولا تستورد تشفير Identity أو إعداداته أو مفاتيحه. قدرات صلاحيات الموظف ليست دليل جاهزية التشفير. لم يثبت الاكتشاف المحدود وجود مسجل تطبيقي ذي صلة أو حجب سجلات المنبع؛ يبقى دليل النشر بوابة إصدار لاحقة.

## 4. Architecture placement and dependency direction | المواضع واتجاه الاعتماد

Retain [existing Domain values](../../domains/catalog/sharing/domain/public-share-values.ts), grant types, Application outcomes and crypto port declarations. Domain owns value shapes and pure validation; ports type-re-export these shapes. Infrastructure owns Node crypto, Buffer encoding, environment parsing and key material. Application consumers depend on Sharing ports; Infrastructure implements them. Bearer protection may depend on the Sharing lookup-digest port for post-decryption verification. No repository is called by a crypto adapter.

تُحفظ القيم والأنواع والنتائج والمنافذ الحالية. يملك Domain أشكال القيم والتحقق الخالص، وتعيد المنافذ تصدير الأنواع. تملك Infrastructure تشفير Node والترميز والبيئة والأسرار، وتعتمد Application على منافذ Sharing. يمكن لمحمي الرمز استخدام منفذ بصمة Sharing للتحقق بعد الفك، دون استدعاء مستودع.

Proposed implementation filenames below are future placement, not files created by this planning pass:

الأسماء التالية مواضع تنفيذ مستقبلية، وليست ملفات منشأة في مهمة التخطيط:

| Responsibility / المسؤولية | Proposed path / المسار المقترح |
| --- | --- |
| Token generator / مولد الرمز | `domains/catalog/sharing/infrastructure/crypto/public-share-token-generator.ts` |
| HMAC adapter / محول HMAC | `domains/catalog/sharing/infrastructure/crypto/hmac-public-share-lookup-digest.ts` |
| AES-GCM adapter / محول التشفير | `domains/catalog/sharing/infrastructure/crypto/aes-gcm-public-share-bearer-protection.ts` |
| Canonical encoding/AAD / الترميز وAAD | `domains/catalog/sharing/infrastructure/crypto/public-share-encoding.ts` |
| Environment parsing / تحليل البيئة | `domains/catalog/sharing/infrastructure/crypto/environment-public-share-crypto.ts` |
| Composition/pure coverage / التركيب والتغطية الخالصة | `domains/catalog/sharing/infrastructure/public-share-crypto-runtime.ts` |
| Focused tests / الاختبارات المركزة | Adjacent `*.test.ts` files in those existing layers / ملفات اختبار مجاورة ضمن الطبقات الحالية |

Do not invent a shared crypto framework, parallel architecture, new Domain token store, lifecycle service or persistence port in P3. Existing value validators are shape guards, not cryptographic authentication.

لا يُنشأ إطار تشفير عام أو معمارية موازية أو مخزن رموز أو خدمة دورة حياة أو منفذ حفظ في P3. تتحقق المدققات الحالية من الشكل ولا تثبت المصادقة التشفيرية.

## 5. Token contract | عقد الرمز

The token generator requests exactly `randomBytes(32)` and emits canonical unpadded base64url: exactly 43 ASCII characters. Require `[A-Za-z0-9_-]{43}`, exactly 32 decoded bytes and identical re-encoding. Reject padding, whitespace, alternate alphabets, noncanonical trailing bits, extra segments and transport aliases. Never trim or normalize. Later transport decodes once; malformed anonymous input is rejected before lookup after admission.

يطلب المولد 32 بايت عشوائياً بالضبط ويصدر base64url قانونياً دون حشو بطول 43 محرف ASCII. تُفحص الأبجدية والطول وفك 32 بايت وإعادة الترميز المطابقة. يُرفض الحشو والفراغ والأبجديات البديلة والبتات غير القانونية والمقاطع الزائدة، دون قص أو تطبيع. يفك النقل لاحقاً مرة واحدة ويرفض الرمز المشوه قبل البحث بعد القبول.

Embed no Workspace/Product/Branch/Actor or key/format identifier. Plaintext exists only transiently for authorized cryptographic operations, never as grant state, persistence, logs or default diagnostic serialization. Infrastructure repeats byte/round-trip checks around the existing pure validator.

لا تُضمّن معرفات سلطة أو نسخ مفاتيح أو صيغة. يوجد النص الصريح مؤقتاً فقط للعملية المصرح بها، ولا يصبح حالة تفويض أو تخزيناً أو سجلاً أو تسلسلاً تشخيصياً افتراضياً. تكرر Infrastructure فحص البايتات والترميز حول المدقق الخالص الحالي.

## 6. HMAC contract | عقد بصمة البحث

Use `PublicShareLookupDigestPort` with exact input:

يستخدم منفذ البصمة المستقل المدخل الدقيق:

```text
UTF8("qsc:catalog:public-sharing:lookup:v1") || 0x00 || ASCII(canonicalToken)
```

HMAC-SHA-256 produces 32 bytes represented as `{ keyVersion: number, value: string }`; value is exactly 64 lowercase hexadecimal characters. The version and digest are separate fields, not a new concatenated format. New material uses the active version. Candidates cover all configured HMAC versions in numerical order; no client-selected version. HMAC configuration and keys are dedicated to Public Sharing.

تنتج HMAC-SHA-256 مقدار 32 بايت يُمثل بنسخة مفتاح وقيمة ست عشرية صغيرة بطول 64. تبقى النسخة والقيمة حقلين منفصلين. تستخدم الكتابة النسخة النشطة، وتُحسب مرشحات كل النسخ المضبوطة بترتيب رقمي دون اختيار العميل وبمفاتيح وغرض خاصين بالمشاركة.

Validate hex before decoding and compare equal-length buffers with `timingSafeEqual`. A valid mismatch returns `{ok:true,value:false}`; unknown stored key version is KeyUnavailable, not false. Corrupt digest shape is IntegrityFailure. SQL indexed equality and end-to-end resolution are not claimed constant-time.

يُفحص الشكل قبل الفك والمقارنة ثابتة الزمن بعد تساوي الأطوال. الاختلاف الصحيح يعيد false ناجحة، وغياب نسخة المفتاح يعيد KeyUnavailable، وفساد الشكل يعيد IntegrityFailure. لا تُدّعى ثباتية زمن SQL أو الطلب كاملاً.

## 7. AES-GCM and envelope contract | عقد التشفير والغلاف

Use `PublicShareBearerProtectionPort`: AES-256-GCM, exactly 32-byte dedicated key, fresh random 12-byte IV and full 16-byte authentication tag. Encrypt the canonical 43-byte ASCII token string, not the public URL or decoded random bytes. Use authentication-tag length 16 explicitly at crypto boundaries; never return plaintext before successful authentication.

يستخدم منفذ حماية الرمز AES-256-GCM بمفتاح مستقل 32 بايت وIV عشوائي جديد 12 بايت ووسم كامل 16 بايت. يُشفر نص الرمز ASCII بطول 43 بايت، لا الرابط ولا البايتات العشوائية المفكوكة. يثبت طول الوسم صراحة ولا يعاد النص قبل نجاح المصادقة.

Exact envelope keys: `formatVersion`, `keyVersion`, `iv`, `ciphertext`, `authTag`. Format is numeric 1; key version is a positive safe integer. IV/ciphertext/tag use canonical unpadded base64url and decode to 12/43/16 bytes, with encoded lengths 16/58/22 respectively. Reject missing/extra fields, wrong types, unsupported format and noncanonical encoding before decryption. Existing Domain envelope validation reconstructs approved fields; Infrastructure must additionally reject unexpected input keys.

حقول الغلاف الخمسة دقيقة؛ الصيغة العددية 1 والنسخة عدد صحيح موجب آمن. تُرمز IV والنص المشفر والوسم قانونياً دون حشو بأطوال مفكوكة 12/43/16 ومكتوبة 16/58/22. تُرفض الحقول الناقصة والزائدة والأنواع والصيغ والترميزات الخاطئة قبل الفك؛ إعادة بناء الحقول في Domain لا تكفي لرفض مفاتيح إدخال زائدة.

After tag authentication, validate recovered canonical plaintext and timing-safely verify the supplied stored digest/version through the Sharing port. Missing lookup key is KeyUnavailable. Invalid plaintext or mismatch is IntegrityFailure. Never reuse an IV during re-encryption or silently regenerate a bearer. Anonymous resolution never decrypts retrieval envelopes.

بعد نجاح الوسم يُفحص النص المستعاد قانونياً ثم بصمته المخزنة عبر المنفذ. غياب مفتاح البحث KeyUnavailable، وفساد النص أو اختلاف البصمة IntegrityFailure. لا يعاد استخدام IV أو توليد الرمز صامتاً، ولا تفك القراءة المجهولة غلاف الاسترجاع.

## 8. Exact AAD and persistence handoff | AAD الدقيق وتسليم الحفظ

AAD is exactly UTF-8 bytes of this ordered `JSON.stringify` array, without whitespace/newline decoration:

AAD هو بايتات UTF-8 الناتجة بالضبط من JSON.stringify للمصفوفة المرتبة دون زخرفة:

```ts
JSON.stringify([
  "qsc:catalog:public-sharing:retrieval:v1",
  1,
  encryptionKeyVersion,
  workspaceId,
  grantId,
  productId,
  branchId,
])
```

Versions are JSON integers. Context identities are validated trusted strings; decryption obtains them from the scoped persisted grant later, not self-declared ciphertext context. Exclude lookup digest, lookup key version and revision. Every bound field substitution must fail authentication. Do not add issuance dates, mutable state or additional identifiers.

النسخ أعداد صحيحة في JSON، والهويات نصوص موثوقة متحققة تأتي لاحقاً من التفويض المقيد بالمستأجر، لا من بيانات الغلاف الذاتية. تُستبعد البصمة ونسخة HMAC وrevision. يفشل تبديل أي حقل مربوط المصادقة، ولا تُضاف تواريخ أو حالة متغيرة أو معرفات أخرى.

P4 allocates the server-owned grant UUID before encrypting/inserting, using its existing identifier-generator contract. P3 receives the context through its port and does not fetch or allocate persisted grants. This avoids a circular database/crypto dependency. HMAC rotation changes excluded fields without changing AAD; encryption re-encryption binds its new key version.

تخصص P4 معرف التفويض على الخادم قبل التشفير والإدراج وفق عقد مولد المعرفات الحالي. تستقبل P3 السياق دون قراءة أو إنشاء تفويض محفوظ، فتتجنب اعتماداً دائرياً. لا تغير بصمة HMAC المتجددة AAD، بينما يربط التشفير الجديد نسخة مفتاحه.

## 9. Strict environment parsing | التحليل الصارم للبيئة

Only Infrastructure reads these dedicated server variables:

تقرأ Infrastructure وحدها متغيرات الخادم المستقلة التالية:

| Variable / المتغير | Validation / التحقق |
| --- | --- |
| `QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION` | Canonical positive decimal safe-integer text and ring membership / نص عشري موجب قانوني وآمن وعضوية الحلقة |
| `QSC_PUBLIC_SHARE_HMAC_KEYS_JSON` | Nonempty flat version-to-canonical-base64 string map; each key at least 32 bytes / خريطة نصية مسطحة غير فارغة ومفاتيح لا تقل عن 32 بايت |
| `QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION` | Same strict version rules and encryption-ring membership / قواعد النسخة الصارمة وعضوية حلقة التشفير |
| `QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON` | Separate nonempty flat map; each key exactly 32 bytes / خريطة مستقلة غير فارغة ومفاتيح 32 بايت بالضبط |
| `QSC_PUBLIC_SHARE_PUBLIC_ORIGIN` | Section 11 policy / سياسة القسم 11 |

Reject version aliases, leading zeros, signs, whitespace, fractions, exponent notation, zero, negatives and integers above Number.MAX_SAFE_INTEGER. Validate standard base64 alphabet/padding and exact decode/re-encode equality; key JSON is not base64url. Reject null/arrays/nested/non-string values, malformed or trailing JSON, missing variables, empty rings and absent active versions. Do not silently drop invalid entries.

تُرفض الأسماء البديلة والأصفار البادئة والإشارات والفراغ والكسور والأسس والصفر والسالب وتجاوز العدد الآمن. يُفحص base64 القياسي والحشو وإعادة الترميز المطابقة، لا base64url. تُرفض القيم غير النصية والمتداخلة وJSON المشوه أو الزائد والإعدادات الناقصة والحلقات الفارغة والنسخة النشطة الغائبة، دون تجاهل عناصر غير صحيحة.

Detect duplicate JSON member names before overwrite, including escaped names that decode identically and conflicting values. Ordinary JSON.parse or its reviver cannot recover overwritten member evidence. Plan a small local parser/token pass restricted to this flat string-map shape; decode names before duplicate/version checks, test grammar and escapes exhaustively, and install no parser dependency. Copy validated decoded key material into private adapter state; never expose it in public runtime properties.

يُكشف تكرار أسماء JSON قبل استبدالها، بما فيه الأسماء المهربة المتطابقة والقيم المتعارضة؛ لا يستعيد JSON.parse أو reviver الدليل المفقود. يُخطط محلل محلي محدود بالخريطة النصية المسطحة مع فك الأسماء قبل فحص التكرار والنسخ واختبارات القواعد والهروب، دون مكتبة جديدة. تُنسخ المفاتيح إلى حالة خاصة لا حقول تشغيل عامة.

Validate whenever a runtime is constructed. Malformed configuration prevents the affected capability and returns fixed sanitized diagnostics. Separate purposes/configuration and reject identical decoded key material across HMAC/encryption rings. No Identity configuration fallback, generated fallback secrets or automatic Production key generation. Tests inject explicit synthetic environment objects; Production behavior cannot be bypassed by an undocumented test flag.

يُتحقق عند كل إنشاء للتشغيل، وتمنع الإعدادات المشوهة القدرة المعنية بأكواد آمنة ثابتة. تُفصل الأغراض والإعدادات ويُرفض تطابق مادة المفاتيح بين الغرضين. لا أسرار بديلة أو توليد إنتاجي تلقائي أو رجوع لإعداد Identity. تحقن الاختبارات بيئة اصطناعية صريحة دون تجاوز إنتاجي خفي.

## 10. Both key rings: 1..8 | كلتا الحلقتين: من 1 إلى 8

HMAC ring: minimum 1, maximum 8 configured keys. Encryption ring: minimum 1, maximum 8 configured keys. Count all active and retained versions in each ring independently. Never trim a ninth entry, accept an invalid entry to reduce the count, or remove referenced keys automatically. Overlap rotation must fit the approved bound.

حلقة HMAC من 1 إلى 8، وحلقة التشفير من 1 إلى 8. تُحسب النسخ النشطة والمحتفظ بها داخل كل حلقة بصورة مستقلة. لا يُحذف العنصر التاسع صامتاً أو مفتاح مستخدم تلقائياً، ويجب أن يقع تداخل التدوير ضمن الحد.

Required boundaries: accept exactly 8 valid HMAC keys; reject 9 HMAC keys; accept exactly 8 valid encryption keys; reject 9 encryption keys. Empty rings are invalid. This correction is mandatory in implementation and independent review.

الحدود المطلوبة: قبول ثمانية مفاتيح HMAC صحيحة ورفض تسعة، وقبول ثمانية مفاتيح تشفير صحيحة ورفض تسعة. تُرفض الحلقة الفارغة ويُراجع التصحيح إلزامياً.

## 11. Public-origin canonicalization | توحيد الأصل العام

Accept `https://example.com` and `https://example.com/`; store canonical runtime value `URL.origin`, therefore `https://example.com` without trailing slash. Allow only HTTP/HTTPS. Production means NODE_ENV=production (read at Infrastructure composition and injectable in tests); HTTP is permitted outside Production and HTTPS is required in Production. Reject credentials (including an empty userinfo delimiter), query or fragment (including empty delimiters), and any non-root path. Never derive origin from request Host or forwarded headers and never fall back to Identity's QSC_PUBLIC_ORIGIN.

يُقبل الشكلان دون شرطة مائلة أو بشرطة جذرية، وتُخزن URL.origin دون الشرطة النهائية. تُقبل HTTP وHTTPS فقط؛ يحدد NODE_ENV=production وضع الإنتاج في تركيب Infrastructure مع حقنه للاختبار؛ تسمح غير الإنتاج بـHTTP ويلزم HTTPS في الإنتاج. تُرفض بيانات الدخول ولو بفاصل فارغ والاستعلام والجزء ولو فارغين وكل مسار غير جذري. لا اشتقاق من Host أو رؤوس التحويل أو متغير Identity.

Check the supplied authority/path before WHATWG URL normalization can erase a non-root path such as `/a/..` or reinterpret backslashes. Reject surrounding/control whitespace and ambiguous backslash forms rather than silently normalizing them. Then parse and canonicalize the accepted origin. The canonicalization policy does not authorize a silent operational origin change for existing links.

يُفحص الأصل والمسار المقدم قبل أن تخفي معالجة URL مساراً غير جذري مثل `/a/..` أو تفسر الشرطة الخلفية. تُرفض الفراغات المحيطة ومحارف التحكم والصيغ الملتبسة قبل التحليل والتوحيد. لا تسمح السياسة بتغيير أصل الروابط الحالية صامتاً.

## 12. Runtime composition | تركيب التشغيل

Compose the existing three Sharing ports using dedicated validated rings, active versions and origin. Inject environment/configuration and in-process test dependencies explicitly; production token/IV randomness always uses Node's cryptographic source. Keep RNG test seams Infrastructure-local, absent from Domain/application port signatures, and never enable deterministic randomness through environment flags.

تُركب منافذ Sharing الثلاثة بالحلقات والنسخ والأصل المتحقق. تُحقن الإعدادات واعتمادات الاختبار صراحة، وتستخدم العشوائية الإنتاجية المصدر الآمن لـNode دائماً. تبقى منافذ اختبار العشوائية محلية في Infrastructure دون تغيير منافذ Domain/Application أو علم بيئي يجعلها حتمية.

Keep raw keys inaccessible to JSON serialization, inspection/error details and exported readiness DTOs. Expose adapters and a separate safe readiness description, not a serializable configuration object containing secrets. Construction does not open a database or mount a route. Separately evaluate lookup, encryption and URL construction so encryption-only failure does not force anonymous decryption. Safe future revocation has no dependency on either ring.

تبقى المفاتيح غير قابلة للكشف في JSON أو الفحص والأخطاء وDTO الجاهزية. يُعرض المحول ووصف جاهزية آمن منفصل دون كائن إعداد سري. لا يفتح التركيب قاعدة بيانات أو مساراً. تُفصل قدرات البحث والتشفير والرابط، ولا يعتمد الإلغاء المستقبلي على مفاتيح أو فك تشفير.

## 13. Accepted P3/P4 readiness handoff | تسليم الجاهزية المعتمد

P3 owns configuration validation, runtime construction and a pure/in-memory coverage evaluator. It accepts configured lookup/encryption version sets and externally supplied referenced-version sets. For supplied valid inputs, evaluate membership without I/O; distinguish absent evidence from an explicitly supplied empty set, reject malformed versions, and handle set ordering/duplicates deterministically. Useful internal evaluation states are UNCHECKED, COVERED and MISSING; these proposed names do not change existing crypto port outcomes.

تملك P3 تحقق الإعداد والتركيب ومقيماً خالصاً يقبل مجموعات النسخ المضبوطة والمشار إليها من الخارج، ويقارن العضوية دون إدخال أو إخراج. يميز غياب الدليل عن المجموعة الفارغة الصريحة، ويرفض النسخ المشوهة ويعالج ترتيب المجموعات وتكرارها بحتمية. الحالات المقترحة UNCHECKED وCOVERED وMISSING داخلية ولا تغير نتائج منافذ التشفير الحالية.

P4 owns persisted grant inspection, database queries for referenced versions and bounded durable coverage evidence. Lookup coverage concerns unrevoked grants; encryption coverage concerns complete unrevoked retrieval envelopes. Revoked rows have cleared envelopes and create no encryption retention requirement. Missing required lookup coverage must later disable anonymous serving with generic 503, not unknown-link 404. Management retrieval needs lookup+encryption coverage and valid origin; revoke needs neither ring.

تملك P4 فحص التفويضات والاستعلامات والدليل الدائم المحدود. تشمل تغطية البحث غير الملغاة، وتغطية التشفير أغلفتها الكاملة فقط؛ لا تتطلب الصفوف الملغاة مفاتيح تشفير. يمنع نقص البحث الخدمة المجهولة لاحقاً بـ503 عام، لا 404 مضلل. يحتاج الاسترجاع الإداري البحث والتشفير والأصل، ولا يحتاج الإلغاء أياً من الحلقتين.

**Until P4 supplies persisted coverage evidence, durable coverage is UNCHECKED. P3 must not claim full deployment or public-serving readiness.** A synthetic COVERED evaluation proves only that input set comparison. An absent persisted inspector is never treated as an empty database. P3 adds no repository, query, scheduler, readiness HTTP route or persistent evidence store. Configuration validity alone cannot prove durable coverage.

**حتى تقدم P4 الدليل المحفوظ تبقى التغطية الدائمة UNCHECKED، ولا تدعي P3 جاهزية نشر أو خدمة عامة كاملة.** نجاح المقارنة الاصطناعية يثبت مدخلاتها فقط، وغياب الفاحص ليس قاعدة فارغة. لا تضيف P3 مستودعاً أو استعلاماً أو مجدولاً أو مساراً أو مخزن أدلة. صلاحية الإعداد وحدها لا تثبت التغطية الدائمة.

## 14. Rotation compatibility within P3 | توافق التدوير ضمن P3

New material uses active keys. Retained versions decrypt/verify old material; unknown/removed required versions return KeyUnavailable. Test ring overlap within 1..8, active changes and unchanged bearer recovery. Re-encryption requires fresh IV, new AAD encryption version, and unchanged token/context; HMAC re-digestion changes digest/version but not bearer or AAD. Rotation of active configuration is not token replacement.

تستخدم المادة الجديدة النسخ النشطة وتقرأ النسخ القديمة المحتفظ بها؛ غياب نسخة لازمة KeyUnavailable. يُختبر التداخل ضمن 1..8 وتغيير النشاط وثبات الرمز، مع IV جديد وAAD لنسخة التشفير الجديدة. تغير HMAC البصمة دون الرمز أو AAD، ولا يمثل تغيير النشاط استبدال الرمز.

Persisted batches, grant locks/CAS/revisions, atomic write/audit behavior, retirement coverage, backup/key-loss recovery and deployment procedures are later work. P3 never scans or rewrites grants. No mass rotation, silent URL change, automatic key removal or revoked-envelope recovery. Future maintenance must revalidate state and skip revoked rows rather than resurrect them.

تُؤجل الدفعات والأقفال والمراجعات والكتابة الذرية والتدقيق وإثبات السحب والاسترداد والنشر. لا تقرأ P3 التفويضات أو تعيد كتابتها، ولا تدوير جماعي أو تغيير رابط أو حذف مفتاح أو استرداد غلاف ملغى. يعيد العمل اللاحق التحقق ويتجاوز الملغى دون إحيائه.

## 15. Failure semantics | دلالات الفشل

Use existing `PublicShareCryptoResult<T>` and `PublicShareCryptoFailure`; return only fixed typed codes, no exception payload. Validate structure before key lookup so malformed data does not masquerade as a missing key. Anonymous malformed-token handling belongs to its later parser/transport boundary; defensive crypto input guards return a sanitized failure.

تُستخدم النتائج والأخطاء المكتوبة الحالية بأكواد ثابتة دون تفاصيل استثناء. يُفحص الشكل قبل المفتاح فلا يُخفى الفساد كغياب مفتاح. معالجة الرمز المجهول المشوه مسؤولية النقل اللاحق، ويعيد الدفاع الداخلي خطأ آمناً.

| Condition / الحالة | Outcome / النتيجة |
| --- | --- |
| Well-formed HMAC mismatch / اختلاف بصمة صحيحة الشكل | `{ok:true,value:false}` |
| Valid stored key version unavailable / نسخة مخزنة صحيحة غير متاحة | `KeyUnavailable` |
| Malformed token/digest/envelope/context, unsupported format, corruption, AAD/tag failure, invalid authenticated plaintext or post-decrypt digest mismatch / فساد المدخل أو السياق أو المصادقة أو النص أو البصمة | `IntegrityFailure` |
| Random-source or unexpected crypto execution failure / فشل المصدر العشوائي أو التنفيذ غير المتوقع | `CryptoUnavailable` |
| Invalid environment / بيئة غير صحيحة | Capability unavailable with fixed configuration diagnostic; no secret or fallback / قدرة غير متاحة بتشخيص ثابت دون سر أو بديل |

Later Application maps crypto unavailability to approved generic service errors; key/integrity management failures are 503 without internals. A failed Copy must never call Issue. P3 performs no state mutation/retry/lifecycle HTTP mapping and never hides failure by regenerating a token.

تربط Application لاحقاً العطل بخطأ الخدمة العام، وتعيد الإدارة 503 دون تفاصيل. لا يستدعي فشل Copy الإصدار أبداً. لا تغير P3 الحالة أو تنفذ محاولات دورة حياة أو نقل HTTP ولا تخفي الفشل بتوليد بديل.

## 16. Logging and redaction | التسجيل والحجب

Prohibit bearer/plaintext token, full public URL/token path/query, HMAC digest, ciphertext/envelope/IV/tag, HMAC/encryption keys, environment JSON, raw request/response/grant/configuration objects and crypto/parser exception details in logs, audit, traces, telemetry, breadcrumbs and error bodies. An innocent metadata name does not make its value safe. Do not stringify arbitrary exceptions or return causes.

تُحظر الرموز والروابط ومساراتها والبصمات والأغلفة ومفاتيح الغرضين وJSON البيئة وكائنات الطلب والاستجابة والتفويض والإعداد وتفاصيل الاستثناء في السجلات والتدقيق والتتبع والأخطاء. لا يجعل اسم حقل بريء قيمته آمنة، ولا تُسلسل الاستثناءات أو أسبابها.

Allow only explicitly constructed internal diagnostics: fixed operation/purpose/result/capability codes, booleans, and justified numeric version/count fields. These are internal, not anonymous resource diagnostics. No visitor analytics or lifecycle audit persistence in P3. Unit evidence captures all adapter/runtime success and failure logging sinks using synthetic sentinels, including secrets hidden under innocent property names.

تُسمح تشخيصات داخلية مبنية صراحة من أكواد العملية والغرض والنتيجة والقدرة والقيم المنطقية والنسخ أو الأعداد المبررة. لا تعرض للمجهول ولا تضيف تحليلات أو تدقيق دورة حياة. تفحص الاختبارات السجلات في النجاح والفشل بعلامات اصطناعية ولو تحت أسماء بريئة.

P6/P7 release evidence must cover actual app/access/proxy/Next/tracing/error-reporting collection before it receives bearer URLs. P3 static/no-log evidence cannot certify upstream redaction or production readiness.

يجب أن يثبت إصدار P6/P7 الحجب الفعلي قبل جمع الرابط في كل طبقات المنبع. لا تثبت أدلة P3 المحلية حجب المنبع أو الجاهزية الإنتاجية.

## 17. Independent security review | المراجعة الأمنية المستقلة

Review exact HMAC input bytes and purpose, key separation, constant-time valid comparisons, strict canonical decoding, AES key/IV/tag sizes, no plaintext release before final authentication, exact AAD ordering/context provenance, nonce freshness, unknown-key distinctions, 1..8 limits for both rings, duplicate JSON detection, origin parsing and private key storage. Verify dependencies never enter Identity crypto or persistence and that anonymous readiness never requires decryption.

تراجع المراجعة المستقلة بايتات HMAC والغرض والفصل والمقارنة والترميز والأطوال وعدم كشف النص قبل المصادقة وترتيب AAD ومصدر سياقه والعشوائية ودلالات المفاتيح وحد الحلقتين والتكرار وتحليل الأصل وحفظ الأسرار. تُثبت حدود Identity والحفظ وعدم فك التشفير المجهول.

Inspect error/readiness serialization and captured logs for every failure path. Use independently established expected vector bytes; a round trip alone cannot reveal two mutually consistent mistakes. Verify UNCHECKED durable coverage without P4 evidence. Record actual review findings and limitations; this document does not claim review PASS.

تُفحص تسلسلات الأخطاء والجاهزية والسجلات لكل مسار فشل بمتجهات مستقلة؛ لا تكفي دورة متوافقة لاكتشاف خطأين متطابقين. تُثبت حالة UNCHECKED دون دليل P4، وتُسجل النتائج والقيود دون ادعاء نجاح مراجعة هنا.

## 18. Detailed focused tests | الاختبارات المركزة المفصلة

All tests below are future acceptance requirements, not executed results. Extend existing P1 tests only for an actual gap; do not replace them with duplicate assertions.

الاختبارات التالية متطلبات قبول مستقبلية وليست نتائج منفذة. تُمدد اختبارات P1 لفجوة فعلية فقط دون تكرارها.

| Category / الفئة | Required cases and evidence / الحالات والأدلة المطلوبة |
| --- | --- |
| Token generation / التوليد | Spy/test seam proves request for exactly 32 bytes; known bytes encode to expected 43-char output; decode/re-encode exact; production samples differ; RNG failure sanitized. Sampling is not proof of entropy. / إثبات طلب 32 بايت وترميزها المتوقع وفكها وعطل المصدر؛ العينات ليست برهاناً للعشوائية. |
| Token rejection / رفض الرمز | Wrong types/42 or 44 chars, whitespace/padding/plus/slash/Unicode/segments/percent aliases; every canonical/noncanonical trailing sextet; no trimming. / أنواع وأطوال وأبجدية ومقاطع وبتات خاطئة دون تطبيع. |
| HMAC vectors / متجهات HMAC | Fixed synthetic key/token with independently checked lowercase digest; exact prefix+zero+ASCII; different purpose/token/key changes value; no raw SHA substitute. / بصمة ثابتة مستقلة وفحص البادئة والفاصل والنص وتغير الغرض والمفتاح. |
| Digest/versioning / البصمة والنسخ | Active create, numerically sorted candidates from shuffled 1/2/10 input, all retained versions, valid mismatch false, malformed hex rejected, unknown version KeyUnavailable. / النشاط والترتيب والنسخ القديمة والاختلاف الصحيح والفساد وغياب المفتاح. |
| Encryption round trip / دورة التشفير | Canonical 43-byte plaintext recovered exactly; envelope decoded/encoded lengths; fresh IV across calls; decrypt checks stored digest/version; no URL encryption. / نص دقيق وأطوال وIV جديد وفحص البصمة دون تشفير الرابط. |
| Fixed AES-GCM evidence / دليل ثابت | Test-only fixed synthetic key/12-byte IV/token/context produces independently established ciphertext/tag and exact AAD bytes; full 16-byte tag; no deterministic Production flag. / متجه مستقل ووسم كامل دون عشوائية حتمية في الإنتاج. |
| AAD substitution / تبديل AAD | Independently swap workspaceId, grantId, productId, branchId and configured encryption version; same-byte-key version fixtures isolate the version binding; unsupported format is rejected. / تبديل كل هوية ونسخة مع fixture يفصل أثر النسخة ورفض الصيغة غير المدعومة. |
| Corruption / الفساد | Flip valid decoded ciphertext, tag and nonce bytes independently and re-encode canonically; each fails without plaintext/exception disclosure. / تبديل بايتات كل جزء قانونياً وإثبات الفشل دون كشف. |
| Malformed envelope / الغلاف المشوه | Missing/extra fields, wrong types/format/version, bad lengths, padding, alphabet, trailing bits, empty components; strict pre-decrypt rejection. / رفض البنية والأطوال والنسخ والترميز قبل الفك. |
| Authenticated plaintext / النص الموثق | Independently encrypt 43-byte noncanonical token; tag succeeds but parser rejects; valid token with wrong stored digest fails; unavailable lookup version remains KeyUnavailable. / صحة الوسم لا تكفي لصحة الرمز أو البصمة، وغياب المفتاح مستقل. |
| Rotation / التدوير | Active switch writes new versions, old keys verify/decrypt unchanged token; pure re-encryption uses fresh IV and preserves URL/token/context; removed referenced version unavailable; no automatic regeneration. / كتابة جديدة وقراءة قديمة وثبات الرمز وفشل سحب المفتاح دون بديل. |
| Key-size/purpose / الحجم والغرض | HMAC 31 bytes rejected, 32 and longer accepted; AES 31/33 rejected, 32 accepted; cross-purpose identical decoded material rejected; defensive copies resist caller buffer mutation. / حدود الأطوال والفصل والنسخ الدفاعية. |
| Ring counts / عدد المفاتيح | **Accept exactly 8 HMAC; reject 9 HMAC; accept exactly 8 encryption; reject 9 encryption**; reject empty rings and invalid retained entries. / قبول 8 ورفض 9 لكل حلقة ورفض الفراغ والعناصر القديمة غير الصحيحة. |
| JSON configuration / إعداد JSON | Missing/malformed/trailing JSON, null/array/nested/non-string values, duplicate same/conflicting members and escaped-name duplicates; invalid base64/padding/trailing bits; active missing; canonical version aliases/unsafe values rejected. / أشكال JSON والتكرار والهروب وbase64 والنشاط والنسخ غير القانونية. |
| Origin / الأصل | Both approved root spellings canonicalize identically; HTTP non-Production allowed/Production rejected; credentials/query/fragment including empty delimiters; non-root and normalization-hidden paths/backslashes; unsupported schemes/control whitespace; Host ignored. / الشكلان والسياسات والمسارات المخفية والبيانات المحظورة وعدم استخدام Host. |
| Pure coverage / التغطية الخالصة | Missing evidence UNCHECKED; explicit empty referenced sets evaluated only as supplied evidence; all/missing versions, unordered/duplicate sets, invalid versions; revoked-only encryption version excluded in external fixture; no I/O; synthetic COVERED never upgrades durable status. / غياب الدليل والفراغ الصريح والنسخ والفشل وعدم I/O وثبات الجاهزية الدائمة. |
| No-secret evidence / منع الأسرار | Spy sinks remain free of token/URL/digest/envelope/keys/JSON and exception sentinels on every success/failure; readiness/errors have exact allowed fields; private key state cannot serialize; no grant/default token serialization. / فحص السجلات والحقول والتسلسل والحالة الخاصة. |
| Runtime composition / التركيب | Injected environment composes all ports; invalid affected capability fails closed; encryption unavailable does not demand decrypt for lookup; no fallback/no db/no route; factories repeat validation. / التركيب والفشل المنفصل وعدم البدائل والحفظ والمسارات. |

## 19. Regression and in-process integration | الانحدار والتكامل داخل العملية

Retain [value tests](../../domains/catalog/sharing/domain/public-share-values.test.ts), [grant-state tests](../../domains/catalog/sharing/domain/public-product-share-grant.test.ts) and [Application contract tests](../../domains/catalog/sharing/application/public-product-share-contracts.test.ts). Exercise environment → runtime → generate → digest → encrypt → decrypt → verify with synthetic configuration, all retained versions, rotation and isolated failures. No database or HTTP is needed for this P3 integration.

تُحفظ اختبارات القيم وحالة التفويض والعقود الحالية، وتُختبر سلسلة البيئة والتشغيل والتوليد والبصمة والتشفير والفك والتحقق ببيانات اصطناعية والنسخ والتدوير والفشل. لا تحتاج هذه السلسلة قاعدة بيانات أو HTTP.

Run explicit new crypto/runtime test paths; existing `test:direct-sharing` does not select a new crypto directory. Existing `npm run test:direct-sharing` covers current Sharing consumers; `npm run test:reference-data` checks P2 regressions. Run `test:identity` if any legitimate shared dependency is affected, not as an excuse to change Identity crypto. Future persisted coverage, transactions and routes require their later real integration tests.

تُشغل مسارات الاختبارات الجديدة صراحة لأن أمر Direct Share لا يضم مجلد التشفير الجديد، ثم انحدار Sharing وReference Data. يُشغل Identity إذا تأثر اعتماد مشترك مشروع دون تغيير تشفيره. يتطلب الحفظ والنقل لاحقاً اختبارات فعلية مستقلة.

## 20. Verification commands and evidence | أوامر التحقق والأدلة

For future authorized P3 implementation, run focused tests first with existing tooling (Windows may use npm.cmd/npx.cmd):

للتنفيذ المستقبلي المعتمد تُشغل الاختبارات المركزة أولاً بالأدوات الحالية:

```powershell
npx tsx --test domains/catalog/sharing/domain/public-share-values.test.ts domains/catalog/sharing/domain/public-product-share-grant.test.ts domains/catalog/sharing/application/public-product-share-contracts.test.ts domains/catalog/sharing/infrastructure/crypto/public-share-token-generator.test.ts domains/catalog/sharing/infrastructure/crypto/hmac-public-share-lookup-digest.test.ts domains/catalog/sharing/infrastructure/crypto/aes-gcm-public-share-bearer-protection.test.ts domains/catalog/sharing/infrastructure/crypto/public-share-encoding.test.ts domains/catalog/sharing/infrastructure/crypto/environment-public-share-crypto.test.ts domains/catalog/sharing/infrastructure/public-share-crypto-runtime.test.ts
npm run test:direct-sharing
npm run test:reference-data
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

These proposed new paths must exist before execution; update the command to reviewed final filenames without assuming a nonexistent npm script. Run focused P3 crypto/runtime tests, existing Public Sharing/P1/P2 regressions and `npm test` (the current broad non-DB regression), or a separately approved broad non-DB equivalent. TypeScript, ESLint, production build and `git diff --check` remain required. Pure P3 crosses no persistence boundary: PostgreSQL integration is not a mandatory P3 completion gate unless its implementation actually crosses that boundary. Browser QA is not a mandatory P3 gate because P3 has no Presentation. P4 and later persistence/lifecycle slices require their database integration evidence. P3 adds no grant integration-test path and never uses Production data.

يجب أن توجد المسارات الجديدة قبل التشغيل وتُضبط حسب الأسماء النهائية المراجعة دون افتراض أمر npm جديد. يلزم تشغيل اختبارات تشفير وتشغيل P3 المركزة وانحدارات Public Sharing وP1 وP2 و`npm test`، وهو الانحدار الشامل الحالي دون قاعدة بيانات، أو بديل شامل دون قاعدة معتمد منفصلاً. تبقى فحوص TypeScript وESLint وبناء الإنتاج و`git diff --check` إلزامية. لا تعبر P3 الخالصة حد الحفظ، لذا لا يلزم تكامل PostgreSQL لإكمالها إلا إذا عبر تنفيذها فعلياً ذلك الحد. لا يلزم QA المتصفح لعدم وجود Presentation في P3. يلزم دليل تكامل القاعدة في P4 وشرائح الحفظ ودورة الحياة اللاحقة. لا تضيف P3 مسار تكامل تفويضات ولا تستخدم بيانات إنتاج.

### Supported task-specific review bundle | حزمة المراجعة الخاصة بالمهمة

The automated P3 review bundle remains mandatory. Use the existing programmatic `createTaskReviewBundle(argv, { collectVerification })` extension in [the bundle API](../../scripts/task-review/create-task-review-bundle.ts), with actual task-appropriate command executions through [runVerificationCommand](../../scripts/task-review/run-verification-command.ts). The callback returns `{ executions, results }`, where `results` are the results of those recorded executions. The [Task 3.22-P1.5 final report](../05-Development/Reports/QSC-Task-3.22-P1.5-Final-Report.md) records this non-DB extension precedent; its existing runner is `artifacts/task-reviews/3.22-P1.5-work/verify.ts`. The default collector includes PostgreSQL and required commands that cannot be skipped via `--skip-command`; use the supported task-specific collector for pure P3 instead of treating that default profile as its acceptance contract. Do not fabricate passing records, modify task-review scripts/config, or invent a new review framework.

تبقى حزمة مراجعة P3 الآلية إلزامية. يُستخدم امتداد `createTaskReviewBundle(argv, { collectVerification })` البرمجي الحالي المرتبط أعلاه مع تشغيل أوامر المهمة الفعلية عبر `runVerificationCommand`. يعيد callback الشكل `{ executions, results }` من نتائج التشغيل المسجلة. يوثق تقرير Task 3.22-P1.5 المرتبط سابقة الامتداد دون قاعدة بيانات ومسار المشغل الحالي مذكور أعلاه. يتضمن المجمع الافتراضي PostgreSQL وأوامر مطلوبة لا يتجاوزها `--skip-command`؛ يُستخدم المجمع الخاص بالمهمة المدعوم لـP3 الخالصة دون جعل الملف الافتراضي عقد قبولها. لا تُختلق نتائج نجاح ولا تُعدل سكربتات أو تهيئة task-review ولا يُنشأ إطار مراجعة جديد.

Record focused/regression/typecheck/lint/build/diff results, documentation/local-link/strict UTF-8 checks and security/no-secret evidence. Require independent implementation/security review PASS. Follow the existing precedent: verify source hashes before and after verification and immediately before bundling, reject changed sources or failed required commands, preserve exact source files and sanitize evidence only. Keep the normal manifest, Git-integrity, fingerprint, archive/export and checksum checks. Exclude credentials and real environment files. No bundle or implementation verification is produced by this documentation reconciliation.

تُسجل نتائج الاختبارات والانحدارات والأنواع وlint والبناء والفروقات وفحوص التوثيق والروابط المحلية وUTF-8 الصارم وأدلة الأمن وعدم كشف الأسرار. يلزم نجاح مراجعة تنفيذ وأمن مستقلة. تُتبع السابقة الحالية بفحص بصمات المصادر قبل التحقق وبعده وقبل الحزمة مباشرة، ورفض تغير المصادر أو فشل الأوامر المطلوبة، وحفظ المصادر مطابقة وتنقية الأدلة فقط. تبقى فحوص البيان وسلامة Git وبصمة المستودع والأرشيف والتصدير والمجموع الاختباري الحالية. تُستبعد بيانات الاعتماد وملفات البيئة الحقيقية. لا تنتج مصالحة التوثيق هذه حزمة أو تحقق تنفيذ.

This documentation pass runs only tracked diff integrity, existing untracked-whitespace/conflict checks, strict UTF-8, bounded Markdown/local-link/content checks and Git status/branch/HEAD/Serena preservation checks. TypeScript/lint/build/crypto tests/database/manual/browser/release gates are planned, not claimed executed. Record commands, observed outputs and limitations separately from future acceptance.

تُشغل مهمة التوثيق سلامة الفروقات وفحص الفراغ والتعارض الحالي للملفات غير المتتبعة وUTF-8 وروابط Markdown والمحتوى وحفظ Git وSerena فقط. فحوص الأنواع وlint والبناء والتشفير والقاعدة والمتصفح والإصدار خطط مستقبلية دون ادعاء تنفيذ، وتُسجل النتائج الفعلية منفصلة.

## 21. Migration | الترحيل

**MigrationRequired: NONE.** P3 creates no SQL/Drizzle schema, journal/snapshot change, grant table or database inspection. P2 visibility migration remains completed history; P4 owns the separate future grant migration.

**الترحيل: لا يوجد.** لا تنشئ P3 SQL أو تعديلات Drizzle أو جدول تفويض أو فحص قاعدة. يبقى ترحيل رؤية P2 ضمن التاريخ المكتمل، وتملك P4 ترحيل التفويض المستقبلي.

## 22. Dependencies | المكتبات

**NewDependencyRequired: NONE.** Node built-in crypto/Buffer/URL and current TypeScript/node:test/tsx tooling suffice. Use a bounded local strict configuration parser and existing port abstractions. No install, lockfile/package change or new tooling framework.

**مكتبات جديدة: لا توجد.** تكفي أدوات Node والاختبار وTypeScript الحالية والمنافذ الموجودة والمحلل المحلي المحدود. لا تثبيت أو تغيير package/lockfile أو إطار أدوات جديد.

## 23. P4–P7 gates | بوابات P4–P7

| Slice / الشريحة | Ownership and required later gate / الملكية والبوابة اللاحقة |
| --- | --- |
| P4 | Grant schema/repository/UoW, active-tuple uniqueness, locks/concurrency/reuse/revoke/replace/audit and durable referenced-version inspection. Requires accepted P3 implementation completion, separate planning/authorization and real guarded persistence/concurrency/rollback evidence. / الحفظ ودورة الحياة والتغطية الدائمة بعد إكمال P3 واعتماد مستقل وأدلة قاعدة حقيقية. |
| P5 | Management API/UI, permissions and explicit authorized Get/Copy with no automatic URL retrieval. Requires accepted lifecycle and full authority/interaction evidence. / الإدارة والنسخ الصريح بعد دورة حياة معتمدة وأدلة الصلاحيات والتفاعل. |
| P6 | Anonymous resolver/live safe projection/media/admission; lookup-only authorization with tenant binding and generic failures. Requires durable coverage and actual operational dependencies before serving. / الحل العام والوسائط بعد التغطية الدائمة والأدلة التشغيلية. |
| P7 | SSR/localization/headers/freshness, responsive keyboard/mouse/touch/accessibility and actual deployment/log-redaction/release gates. No Production readiness from P3 fixtures. / العرض والتعريب والقبول الوظيفي والنشر والحجب الفعلي؛ لا جاهزية إنتاج من fixtures P3. |

P4–P7 remain GATED / NOT STARTED. No later slice is opened by this document or by a future P3 unit-test pass alone. P3PlanningReview and P3PlanningGate are PASS; P3 is READY_FOR_IMPLEMENTATION with implementation NOT STARTED / NOT AUTHORIZED YET. Explicit implementation authorization is still separate.

تبقى P4–P7 مشروطة ولم تبدأ، ولا تفتحها الوثيقة أو نجاح وحدات P3 وحده. نجحت مراجعة التخطيط المستقلة وبوابة التخطيط؛ P3 جاهزة للتنفيذ (READY_FOR_IMPLEMENTATION)، والتنفيذ لم يبدأ وغير معتمد بعد. يبقى تصريح التنفيذ منفصلاً.

## 24. P3 implementation completion criteria | معايير إكمال تنفيذ P3

After independent planning review PASS and separate implementation authorization: implement only section 2 using existing layers; satisfy sections 5–18 including both ring bounds; pass focused P3 crypto/runtime tests, existing Public Sharing/P1/P2 regressions, `npm test` or an approved broad non-DB equivalent, TypeScript, ESLint, production build, `git diff --check`, documentation/local-link/strict UTF-8 checks and security/no-secret evidence; obtain independent implementation/security review PASS; provide bilingual documentation and the exact final report under existing repository rules; generate the mandatory automated review bundle using section 20's supported task-specific verification collector without modifying source or exposing secrets. PostgreSQL integration is not required for pure P3 unless implementation actually crosses a persistence boundary; it remains required for P4 and later slices that do. Browser QA is not required for P3 because it has no Presentation.

بعد نجاح مراجعة التخطيط واعتماد التنفيذ منفصلاً، يُنفذ نطاق القسم 2 بالطبقات الحالية وتثبت عقود الأقسام 5–18 وحدا الحلقتين. يلزم نجاح اختبارات تشفير وتشغيل P3 المركزة وانحدارات Public Sharing وP1 وP2 و`npm test` أو بديل شامل دون قاعدة معتمد، وTypeScript وESLint وبناء الإنتاج و`git diff --check` وفحوص التوثيق والروابط المحلية وUTF-8 الصارم وأدلة الأمن وعدم كشف الأسرار. يلزم نجاح مراجعة تنفيذ وأمن مستقلة وتوثيق ثنائي والتقرير النهائي المطابق للقواعد وحزمة المراجعة الآلية الإلزامية عبر مجمع التحقق الخاص بالمهمة المدعوم في القسم 20 دون تغيير المصادر أو كشف الأسرار. لا يلزم تكامل PostgreSQL لـP3 الخالصة إلا إذا عبر التنفيذ فعلياً حد الحفظ؛ ويبقى مطلوباً لـP4 والشرائح اللاحقة التي تعبره. لا يلزم QA المتصفح في P3 لعدم وجود Presentation.

Completion evidence must prove no migration/dependency/Identity crypto coupling/P4–P7 implementation; no silent regeneration; private key handling and safe failures; and durable coverage remains UNCHECKED without P4 evidence. In-memory compatibility is not production readiness. No browser/manual interaction PASS is inferred from unit tests; P3 has no new UI. Accepted completion may open P4's separate next planning gate, not its automatic implementation.

يثبت الإكمال عدم الترحيل أو المكتبات أو ربط تشفير Identity أو عمل الشرائح اللاحقة، وعدم التوليد الصامت وحفظ الأسرار، وثبات UNCHECKED دون دليل P4. التوافق داخل العملية ليس جاهزية إنتاج ولا يثبت QA متصفح. قد يفتح الإكمال المقبول تخطيط P4 المنفصل دون تنفيذ تلقائي.

## 25. Risks, rollback and non-regeneration | المخاطر والتراجع ومنع التوليد البديل

Key risks: permissive Identity parsing copied into P3; duplicate JSON members lost; shape guards mistaken for authentication/exact fields; two mutually consistent crypto bugs; URL normalization hiding forbidden paths; enumerable private secrets; active-ring overlap exceeding eight; premature retirement; stale status text; synthetic coverage mistaken for durable evidence. Mitigate with strict bounded parsing, independent vectors, exact allow-lists, both boundary tests, provenance-labelled evaluation, and independent review.

المخاطر هي نسخ تحليل متساهل أو فقد التكرار أو الخلط بين الشكل والمصادقة أو خطأين متوافقين أو تطبيع مسار محظور أو أسرار قابلة للكشف أو تجاوز الثمانية أو سحب مبكر أو حالة قديمة أو تغطية اصطناعية مضللة. تعالج بالتحليل الصارم والمتجهات المستقلة والقوائم الدقيقة والاختبارات ومصدر الدليل والمراجعة.

P3 failure disables the affected capability; it never changes persisted state, generates a replacement key/token, changes origin, deletes a grant or recovers revoked material. Operational rollback must preserve keys needed by unrevoked grants and stable origin; restore only a known compatible configuration after explicit operator review. P3 introduces no data rollback procedure. Future key loss/corruption requires explicit recovery handling, never plaintext persistence or automatic link replacement.

يعطل الفشل القدرة دون تغيير حالة محفوظة أو مفتاح أو رمز بديل أو أصل أو حذف أو استرداد ملغى. يحفظ التراجع التشغيلي مفاتيح غير الملغاة والأصل المستقر ويعيد إعداداً متوافقاً بمراجعة مشغل صريحة. لا تضيف P3 إجراء تراجع بيانات، ويستلزم فقد المفاتيح استرداداً صريحاً دون نص محفوظ أو روابط بديلة تلقائية.

## Planning handoff | تسليم التخطيط

**P3PlanningReview: PASS. P3PlanningGate: PASS. P3Status: READY_FOR_IMPLEMENTATION. P3ImplementationPerformed: NO. P3ImplementationAuthorization: NOT AUTHORIZED YET. P4ToP7WorkPerformed: NO.** The accepted readiness/origin decisions and both-ring correction are recorded. The governing key-ring wording and pure-P3 verification/bundle blockers are reconciled; PlanningBlockers: NONE. Independent planning rereview is PASS. Next gate: separate explicit P3 implementation authorization. Stop for review; no implementation completion or deployment/public-serving readiness claim.

**نجحت مراجعة تخطيط P3 وبوابته؛ P3 جاهزة للتنفيذ (READY_FOR_IMPLEMENTATION)، والتنفيذ لم يبدأ وغير معتمد بعد؛ لا تنفيذ P4–P7.** سُجل تسليم الجاهزية وسياسة الأصل وتصحيح الحلقتين، وصُولح نص العقد الحاكم وعائق التحقق والحزمة لـP3 الخالصة؛ لا عوائق تخطيط متبقية. نجحت إعادة مراجعة التخطيط المستقلة. البوابة التالية تصريح صريح منفصل لتنفيذ P3. يتوقف العمل للمراجعة دون ادعاء إكمال التنفيذ أو جاهزية نشر أو خدمة عامة.
