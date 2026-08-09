# QSC Task 3.15.1-B Final Report | التقرير النهائي للمهمة 3.15.1-B

## Status

ReadyForReview

الحالة: جاهز للمراجعة المستقلة، وليس معتمدا ذاتيا.

## Task

Task 3.15.1-B — Server Sessions and Trusted Workspace/Actor Context.

المهمة 3.15.1-B — جلسات الخادم وسياق مساحة العمل/الممثل الموثوق.

## Branch

`feature/identity-server-sessions`

Baseline HEAD inspected before implementation: `ac506376e17b7c4d4ea3ad3ca3aee3261296a9e8`.

## English Summary

Implemented the approved Identity-owned opaque server-session foundation: purpose-separated versioned HMAC digests, PostgreSQL persistence, secure cookie transport, two-hour idle and twelve-hour absolute expiry, five-minute activity-write throttling, restricted/full session classes, login protection integration, password-change rotation, logout, redacted `/api/auth/me`, cleanup, real reset/recovery/suspension revocation, and full trusted request-context resolution. Production Product Entry routes now consume a Catalog-owned adapter over the shared trusted-context contract and ignore browser identity claims.

## Arabic Summary

تم تنفيذ أساس جلسات الخادم المبهمة المملوك لمجال الهوية، بما يشمل HMAC مستقل الغرض وذا إصدارات، وتخزين PostgreSQL، وملف ارتباط آمن، ومهلة خمول ساعتين وحدا مطلقا 12 ساعة، وتقليل كتابة النشاط إلى خمس دقائق، والجلسات المقيدة والكاملة، وحماية الدخول، وتدوير الجلسة عند تغيير كلمة المرور، والخروج، ومسار `me` المنقح، والتنظيف، والإبطال الفعلي عند إعادة الضبط والاستعادة والتعليق. أصبحت مسارات إدخال المنتج في الإنتاج تستخدم محول كتالوج مملوكا للكتالوج فوق عقد السياق الموثوق وتتجاهل ادعاءات الهوية القادمة من المتصفح.

## Architecture Review

Identity owns session Domain/Application/Infrastructure behavior. The existing Identity Unit of Work owns atomic coordination; focused repositories do not call other repositories. Cookie, HMAC, PostgreSQL, and HTTP adapters remain Infrastructure. Route Handlers are thin. A shared stable `TrustedActorContext` contract separates downstream consumers from Identity Infrastructure, while App-layer composition connects Identity to the Catalog-owned Product Entry adapter.

يمتلك مجال الهوية سلوك الجلسة في طبقات المجال والتطبيق والبنية التحتية. تملك وحدة العمل المعاملة الذرية، ولا تستدعي المستودعات بعضها. توجد ملفات الارتباط والتشفير والتخزين وHTTP في البنية التحتية، وتظل معالجات المسارات رقيقة. يفصل عقد السياق المشترك الكتالوج عن البنية التحتية للهوية.

## Architecture Changes

Added a Session aggregate and repository to the existing Identity boundary, added a shared trusted-authentication contract, and added an App-layer composition seam for protected Product Entry routes. No bounded context was collapsed, no database access was added to React/components, and no architectural redesign or new dependency was introduced.

تمت إضافة مجمع الجلسة ومستودعه إلى حدود الهوية الحالية، وعقد مصادقة مشترك، ونقطة تركيب في طبقة التطبيق لمسارات إدخال المنتج المحمية. لم يتم دمج المجالات أو إضافة وصول لقاعدة البيانات من المكونات أو إضافة اعتماد جديد.

## Session Model Review

`ServerSession` contains scoped Workspace/Session/Actor identity, digest plus key version, class, captured authorization/password versions, creation/activity/expiry timestamps, and typed revocation state. Availability and cleanup eligibility are deterministic Domain behavior.

يحفظ نموذج الجلسة الهوية المقيدة والإصدارات والأوقات وحالة الإبطال المحددة الأنواع، ويحدد المجال صلاحية الجلسة وأهلية التنظيف بشكل حتمي.

## Opaque Token Review

Infrastructure generates 32 random bytes and encodes them as 43-character base64url. The browser value is not derived from tenant or actor identity. Only a versioned HMAC-SHA-256 digest is persisted. Session HMAC configuration is independent from recovery-code HMAC, and source/evidence secret scanning passed.

تولد البنية التحتية 32 بايت عشوائيا بصيغة base64url، ولا تشتق القيمة من هوية المستأجر أو الممثل. لا يخزن إلا ملخص HMAC-SHA-256 ذي الإصدار، وهو مستقل عن HMAC الخاص بالاستعادة.

## Cookie Security Review

The central adapter sets `HttpOnly`, `SameSite=Lax`, and `Path=/`; Production adds `Secure` and defaults to a `__Host-` cookie name. The opaque value is emitted only through `Set-Cookie`, never in login/change-password JSON, URLs, Web Storage, IndexedDB, or long-lived React state. Cookie naming remains environment-aware.

يضبط المحول المركزي `HttpOnly` و`SameSite=Lax` و`Path=/`، ويضيف الإنتاج `Secure` وبادئة `__Host-`. لا تظهر القيمة المبهمة في JSON أو URL أو تخزين المتصفح أو حالة React.

## Session Persistence Review

`identity_sessions` uses a composite Workspace/Session primary key, scoped account/credential/membership foreign keys, a unique digest, lookup/revocation/cleanup indexes, lifecycle checks, and no plaintext-value column. Repository operations cover create, digest lookup, scoped lookup, activity/revocation save, actor-wide revocation, all-except-current revocation, and bounded cleanup.

يستخدم جدول الجلسات مفتاحا مركبا وروابط خارجية مقيدة بمساحة العمل وتفردا للتجزئة وفهارس وضوابط دورة الحياة، ولا يحتوي عمودا للقيمة الخام.

## Idle/Absolute Expiry Review

Idle expiry is two hours; absolute expiry is twelve hours. `lastSeenAt` and idle expiry persist only after five minutes, and idle extension is capped by absolute expiry. Expired sessions fail validation and receive typed revocation; cleanup is separate from request processing.

مهلة الخمول ساعتان والحد المطلق 12 ساعة. لا تتم كتابة النشاط إلا بعد خمس دقائق، ولا يتجاوز التمديد الحد المطلق. لا يعمل التنظيف داخل الطلب العادي.

## Restricted Session Review

Temporary credentials issue `Restricted` sessions for PendingActivation or Active accounts. Restricted sessions can reach change-password, logout, and minimal `me`; the full trusted-context resolver rejects them, and Product Entry maps that outcome to HTTP 403. Successful password change creates a new full value rather than promoting the restricted value.

تنشئ بيانات الاعتماد المؤقتة جلسة مقيدة تسمح بتغيير كلمة المرور والخروج و`me` فقط. يرفض محلل السياق الكامل هذه الجلسة، ويعيد إدخال المنتج 403. ينشئ التغيير الناجح قيمة كاملة جديدة.

## Login Protection Integration Review

Login normalizes Workspace code and username, locks scoped account/protection rows, performs generic-cost work for missing/suspended identities, verifies Argon2id, records failures, applies the existing lock escalation, clears protection on success, and creates no session while locked or suspended. Public failures do not reveal which identity element failed.

يطبع تسجيل الدخول رمز مساحة العمل واسم المستخدم، ويقفل الصفوف المقيدة، ويسجل المحاولات ويطبق التصعيد ويمسح الحماية عند النجاح. لا تكشف الاستجابة العامة سبب الفشل.

## TrustedActorContext Review

Context is created only after full server-session validation. Identity returns the stable Workspace/Actor/role/branch/version contract; Catalog owns its Product Entry conversion. Query, body, route, and header Workspace/Actor claims are ignored. Production uses the server-session resolver and fails closed; the environment resolver remains development/test-only.

لا ينشأ السياق إلا بعد التحقق من جلسة كاملة. يمتلك الكتالوج التحويل إلى سياق إدخال المنتج، ويتم تجاهل ادعاءات المتصفح. يستخدم الإنتاج محلل جلسة الخادم ويفشل بإغلاق آمن.

## Password Version Review

Session creation captures `passwordVersion`. Every validation compares it to the current credential; mismatch revokes/rejects before context creation. Password change, Owner/emergency reset, and recovery completion increment the version and revoke applicable sessions in the same transaction.

تلتقط الجلسة إصدار كلمة المرور وتقارنه عند كل تحقق. يمنع الاختلاف إنشاء السياق، وتزيد عمليات التغيير وإعادة الضبط والاستعادة الإصدار وتبطل الجلسات ضمن المعاملة نفسها.

## Authorization Version Review

Membership now persists `authorizationVersion`, initialized and backfilled to 1. Sessions capture and validate it. Task C owns future increments for role/permission/branch changes. No explicit permission-editing or selected-Branch-ID persistence was introduced.

تخزن العضوية الآن إصدار التفويض وتبدأ بالقيمة 1. تلتقطه الجلسة وتتحقق منه. تمتلك المهمة C زيادته وإدارة الصلاحيات والفروع لاحقا.

## Session Revocation Review

Implemented actor-wide, specific-session, and all-except-current operations with typed reasons. Logout, password change, Owner/emergency reset, recovery completion, suspension, version mismatch, class mismatch, expiry, and administrative invalidation are integrated. Revocation is idempotent and audited only for meaningful changes.

تم تنفيذ الإبطال لكل جلسات الممثل ولجلسة محددة ولكل الجلسات عدا الحالية مع أسباب محددة الأنواع، وربطه بالخروج والتغيير وإعادة الضبط والاستعادة والتعليق وعدم تطابق الإصدارات والانتهاء.

## Password Change / Session Rotation Review

The use case validates any current session class, verifies the current password, validates/hashes the replacement, increments the credential version, sets Permanent, activates PendingActivation, clears protection, revokes existing sessions, creates a fresh full session, and audits the transaction. Conflict paths roll back atomically.

تتحقق حالة الاستخدام من الجلسة والكلمة الحالية والجديدة، وتزيد الإصدار، وتحول الاعتماد إلى دائم، وتنشط الحساب، وتمسح الحماية، وتبطل الجلسات، وتنشئ جلسة كاملة جديدة، وتتراجع ذرّيا عند التعارض.

## Logout Review

Logout resolves and revokes a valid session, always clears the cookie, and returns success for missing, malformed, unknown, or already-revoked values. It never exposes session existence or revocation reason.

يبطل الخروج الجلسة الصالحة ويمسح ملف الارتباط دائما وينجح للقيمة المفقودة أو غير الصالحة أو الملغاة دون كشف وجود الجلسة.

## Auth Me Review

`GET /api/auth/me` accepts both full and restricted sessions and returns only actor ID, Workspace display name, username, display name, role, branch summary, password-change requirement, and session class. It omits session identity/value/digest, credential hashes/versions, authorization version, recovery data, and provider secrets.

يعيد مسار `me` حقول العرض الضرورية فقط، ويحذف هوية وقيمة وتجزئة الجلسة وتجزئات وإصدارات بيانات الاعتماد وبيانات الاستعادة والأسرار.

## Multi-Tenant Review

Login authority starts with normalized Workspace code. Every resolved account, credential, membership, profile, session, revocation, and downstream Product Entry context remains Workspace-scoped. Composite PostgreSQL foreign keys reject cross-Workspace actor references. Tests prove duplicate usernames across Workspaces remain isolated and browser claims cannot override trusted scope.

تبدأ السلطة من رمز مساحة العمل، وتظل جميع عمليات البحث والإبطال وسياق الكتالوج مقيدة بها. تمنع المفاتيح الخارجية المركبة الروابط العابرة للمستأجرين، وتثبت الاختبارات العزل وتجاهل ادعاءات المتصفح.

## Security Review

No JWT browser authority, raw session persistence, credential/session logging, client authority, or production fallback identity was added. HMAC keys require versioned server-only configuration with minimum 32-byte material. Write routes validate Origin/Host, public login mapping is enumeration-safe, cookies are protected, stale/suspended state fails closed, and source secret detection reported zero findings.

لم تتم إضافة JWT أو تخزين خام أو تسجيل للأسرار أو سلطة للعميل أو هوية بديلة في الإنتاج. تتحقق مسارات الكتابة من المصدر، وتبقى أخطاء الدخول عامة، وتفشل الحالات القديمة أو المعلقة بإغلاق آمن.

## Audit Review

Added safe events for login success/failure, session creation/revocation, logout, password change, restricted upgrade, and stale version rejection. Audit stores scoped identifiers, stable result codes, timestamps, and safe numeric metadata only. Normal authenticated reads are not audited.

تمت إضافة أحداث آمنة للدخول وإنشاء وإبطال الجلسات والخروج وتغيير كلمة المرور والترقية ورفض الإصدارات القديمة. لا يتم تدقيق كل قراءة عادية ولا تخزن الأسرار.

## Migration Review

Only new migration `drizzle/0008_supreme_vector.sql`, snapshot `0008`, and the journal were added/updated. It creates sessions and adds membership authorization version with a safe version-1 backfill followed by default removal. Historical migrations `0000`–`0007` were intentionally unchanged. `db:check` and the guarded isolated migration chain passed; no Production/external migration ran.

أضيف الترحيل الجديد `0008` فقط مع اللقطة والسجل. ينشئ الجلسات ويضيف إصدار التفويض مع ملء آمن ثم حذف القيمة الافتراضية. لم تتغير الترحيلات التاريخية ولم يتم تشغيل ترحيل إنتاجي.

## HTTP Boundary Review

Implemented the four approved Node.js Route Handlers. They map HTTP to typed application results, return no-store responses, keep session values in cookies only, centralize Origin/Host checks, return generic login failures, return 401 for invalid session authority, 403 for restricted Product Entry access, and 503 for unavailable authentication infrastructure.

تم تنفيذ المسارات الأربعة المعتمدة كحدود رقيقة، مع استجابات غير مخزنة وتحقق مركزي وأخطاء عامة و401 للجلسة غير الصالحة و403 للجلسة المقيدة و503 لتعذر البنية التحتية.

## Test Results

- `npx.cmd tsc --noEmit`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json`: passed.
- `npm.cmd run lint`: passed with zero warnings/errors.
- `npm.cmd test`: passed; 436 tests total, 435 passed, 1 documented platform-permission skip, 0 failed. Identity: 49/49. Product Entry: 132/132.
- `npm.cmd run test:integration`: passed; 81/81 against the guarded isolated PostgreSQL test database.
- `npm.cmd run build`: passed; all four auth routes and protected Catalog routes compiled as dynamic server routes.
- `npm.cmd run db:check`: passed.
- Changed-source secret detector: passed with zero findings.
- `git diff --check`: passed.
- `npm audit` commands: intentionally not run, per task restriction.

نتائج TypeScript وESLint والاختبارات والبناء وفحص Drizzle ناجحة. نجح 435 من 436 اختبارا عاديا مع تخط واحد موثق بسبب صلاحيات المنصة، ونجح 81 من 81 اختبار تكامل. لم يتم تشغيل `npm audit` حسب القيد الصريح.

## Files Created

- `app/api/auth/change-password/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/catalog/product-entry-server-runtime.ts`
- `docs/05-Development/Identity-Server-Sessions-and-Trusted-Context.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-B-Final-Report.md`
- `domains/catalog/product-entry/infrastructure/trusted-actor-product-entry-context.adapter.ts`
- `domains/identity/application/change-password-and-rotate-session.use-case.ts`
- `domains/identity/application/session-application.test.ts`
- `domains/identity/application/session-issuance.ts`
- `domains/identity/application/session-validation.ts`
- `domains/identity/application/session.use-cases.ts`
- `domains/identity/domain/session.ts`
- `domains/identity/infrastructure/crypto/environment-session-token-digest.ts`
- `domains/identity/infrastructure/crypto/session-token-crypto.test.ts`
- `domains/identity/infrastructure/crypto/session-token-crypto.ts`
- `domains/identity/infrastructure/http/identity-auth-route-handlers.test.ts`
- `domains/identity/infrastructure/http/identity-auth-route-handlers.ts`
- `domains/identity/infrastructure/http/same-origin-request-policy.ts`
- `domains/identity/infrastructure/http/session-cookie.ts`
- `domains/identity/infrastructure/identity-server-runtime.ts`
- `domains/identity/infrastructure/identity-session-revocation.adapter.ts`
- `drizzle/0008_supreme_vector.sql`
- `drizzle/meta/0008_snapshot.json`
- `shared/auth/trusted-actor-context.ts`

## Files Modified

- Protected Product Entry route handlers under `app/api/catalog/` (five files).
- `docs/05-Development/Identity-Accounts-Recovery-Bootstrap.md`
- `docs/05-Development/README.md`
- `docs/05-Development/Reports/README.md`
- Product Entry trusted-context ports/adapters, HTTP mappings, and tests (seven files).
- Identity lifecycle/reset/recovery/session ports, typed results, bootstrap, domain tests, member model, repositories, Unit of Work, schema, adapters, in-memory implementation, and PostgreSQL integration test (fifteen files).
- `drizzle/meta/_journal.json`
- `package.json`
- `shared/audit/audit.port.ts`
- `shared/domain/scoped-identity.ts`

## Files Deleted

None. | لا توجد ملفات محذوفة.

## Files Intentionally Unchanged

- Historical migrations `drizzle/0000` through `drizzle/0007` and their snapshots.
- React login/password/recovery/member-management UI.
- Task C permission and selected-Branch-ID persistence/mutation.
- WhatsApp/provider adapters and external recovery routes.
- `.env` files and real environment values.
- Dependency versions and `package-lock.json` (no dependency added).
- Git index, commits, tags, branches, and remotes.

## Known Limitations

- Task C must persist explicit permissions and selected Branch IDs and increment authorization version on mutation. Until then, the trusted seam exposes no explicit Identity permissions; the Catalog adapter grants the existing Product Entry policy to Owner and none to Staff.
- Session cleanup is implemented but not scheduled.
- Production deployment must provision the dedicated session HMAC key map and public/cookie configuration.
- Login/password/member UI, WhatsApp delivery, provider rate limits, OAuth, MFA, passkeys, Redis, refresh tokens, and JWT browser authentication remain out of scope.
- The environment-backed Product Entry identity remains only for development/tests; Production always uses server-session context.

## Required Confirmations

- Independent reviewers should confirm session lifecycle, cryptographic purpose separation, cookie/origin policy, migration/backfill, transaction/revocation behavior, Catalog context mapping, Audit safety, and evidence integrity.
- Deployment owners must provision server-only session HMAC configuration through the approved secret-management path before Production use.
- Database owners must review and apply migration `0008` through the controlled deployment process; this task did not run it against Production.
- This implementation must not be treated as approved until independent review is complete.

## Summary

The requested backend session and trusted-context foundation is implemented and locally verified without expanding into Tasks C, D, or E. The architecture remains modular, multi-tenant, and fail-closed. | تم تنفيذ أساس الجلسات والسياق الموثوق والتحقق منه محليا دون التوسع إلى المهام C أو D أو E، مع الحفاظ على المعمارية والعزل والإغلاق الآمن.

## Next Recommendation

Perform independent Task 3.15.1-B architecture/security/migration review. After approval and merge, begin Task 3.15.1-C for Owner-managed members, explicit permissions, selected Branch IDs, and authorization-version mutation. Do not begin Task C before approval.

أجر مراجعة مستقلة للمعمارية والأمان والترحيل. بعد الاعتماد والدمج فقط، ابدأ المهمة C لإدارة الأعضاء والصلاحيات والفروع وتغيير إصدار التفويض.

## Git and Review Integrity

No Git write operation was performed: nothing was staged, committed, pushed, merged, reset, restored, stashed, tagged, or deleted. The branch remained `feature/identity-server-sessions`. The working tree intentionally contains only Task B source/documentation/migration changes plus generated review artifacts outside Git. DEV-001 evidence must preserve exact changed source bytes and sanitize command evidence; optional runtime/full dependency audits are explicitly skipped, not silently omitted.

لم تنفذ أي عملية كتابة في Git. بقي الفرع كما هو، وظلت التغييرات خاصة بالمهمة B. تحفظ حزمة المراجعة ملفات المصدر كما هي وتنقح الأدلة فقط، مع تسجيل تخطي تدقيقي الاعتمادات الاختياريين صراحة.
