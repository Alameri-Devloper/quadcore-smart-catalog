# QSC Task 3.15.1-E Final Report

## Status

ReadyForReview

## Task

3.15.1-E — Recovery Delivery and WhatsApp OTP Integration

## Branch

`feature/identity-recovery-delivery`

## Root Cause

Tasks A–D intentionally provided the provider-neutral recovery challenge, HMAC digest, session revocation, contact invalidation, and Presentation shell without a public delivery/orchestration boundary. The recovery pages therefore stopped at an honest `RecoveryUnavailable` state. The existing internal verification/reset use cases also relied on earlier invalidation and did not recheck the current Workspace recovery policy and recovery-contact version at every completion boundary.

أنشأت المهام A–D عمدًا أساس تحدي الاستعادة المحايد للمزوّد وHMAC وإلغاء الجلسات وإبطال جهة الاتصال وهيكل الواجهة، لكنها لم تضف حد التوصيل العام أو تنسيق الاستعادة. لذلك توقفت صفحات الاستعادة عند حالة `RecoveryUnavailable` الصادقة. كما اعتمدت حالات الاستخدام الداخلية على الإبطال السابق دون إعادة فحص سياسة مساحة العمل وإصدار جهة الاتصال عند كل حد للتحقق والإكمال.

## English Summary

Implemented the real self-service recovery flow on top of the existing Identity challenge. The change adds a provider-neutral delivery port, replaceable WhatsApp Infrastructure adapter, explicit Development/Test capture, Workspace-aware non-secret configuration seam, enumeration-safe request orchestration, resend, OTP verification, password reset, provider result auditing/invalidation, cleanup, four thin HTTP routes, and the real two-step recovery Presentation. Successful reset creates no Session, makes the credential Permanent, increments its version, clears login protection, consumes the challenge, and revokes every existing Session.

## Arabic Summary

تم تنفيذ مسار الاستعادة الذاتية الحقيقي فوق تحدي الهوية الحالي. يضيف التغيير منفذ توصيل محايدًا للمزوّد، ومحول واتساب قابلاً للاستبدال داخل Infrastructure، ومحول تطوير/اختبار صريحًا، وحد تهيئة آمنًا ومقيدًا بمساحة العمل، وطلبًا مقاومًا للتعداد، وإعادة الإرسال، والتحقق من OTP، وإعادة ضبط كلمة المرور، وتدقيق نتائج المزوّد وإبطال الفشل، والتنظيف، وأربعة مسارات HTTP رقيقة، وربط واجهة الاستعادة على خطوتين. لا تنشئ الاستعادة الناجحة جلسة، وتجعل الاعتماد دائمًا، وترفع الإصدار، وتمسح حماية الدخول، وتستهلك التحدي، وتلغي كل الجلسات السابقة.

## Architecture Review

DDD, Clean Architecture, the Modular Monolith, and the existing Identity/Workspace boundaries are preserved. Domain retains `PasswordRecoveryChallenge` and provider-neutral `PrimaryRecoveryContact`. Application coordinates transactions and the external call. Infrastructure owns WhatsApp content, timeout, provider/configuration contracts, environment composition, PostgreSQL, and Development capture. Presentation depends only on typed HTTP contracts. No component calls persistence and no repository calls another repository.

## Recovery Channel Review

V1 supports only the approved messaging recovery contact delivered through WhatsApp Infrastructure. No SMS, email, voice, OAuth, passkey, authenticator, push, or second OTP model was introduced.

## Provider Abstraction Review

`RecoveryDeliveryPort` contains no vendor concept. `WhatsAppRecoveryDeliveryAdapter` wraps `WhatsAppProviderPort`, so an approved provider can be supplied at the Infrastructure composition boundary without Domain/Application changes. No Meta/Twilio credential or fabricated external integration was added.

## Workspace Configuration Review

Workspace delivery configuration accepts only enabled state and generic account/sender/template references. Extra fields are rejected. Provider access secrets are not accepted by this object or stored in domain tables. The future concrete provider must obtain secrets from the deployment secret boundary.

## Development/Test Adapter Review

The Development adapter sends no network message, is forbidden in Production, exposes safe metadata without destination/code, and exposes plaintext only through an in-process test-only retrieval method. There is no OTP HTTP endpoint. Production never falls back to Development capture.

## Recovery Request Review

Well-formed requests normalize Workspace Code and Username, perform bounded recovery-HMAC work, resolve the scoped identity internally, create a challenge only when eligible, deliver outside the transaction, finalize delivery state in a follow-up transaction, and return the generic accepted envelope. Ineligible requests receive an indistinguishable decoy opaque reference.

## Enumeration Resistance Review

Unknown Workspace, unknown username, suspension, `OwnerManagedOnly`, and absent member profile/contact never produce account-specific public errors. The request response shape is identical. Global delivery unavailability is checked before identity lookup. Individual provider failures remain generic and invalidate the real challenge.

## OTP Generation Review

The existing cryptographic `randomInt` generator remains authoritative. It emits exactly eight Western digits and preserves leading zeroes. `Math.random()` is absent.

## OTP HMAC Review

Only versioned HMAC-SHA-256 digests are persisted. Recovery HMAC configuration remains purpose-separated from session HMAC and password hashing. Plaintext exists only during bounded generation/delivery or the explicit test capture and is never audited or normally logged.

## Challenge Lifecycle Review

The approved `Active`, `Verified`, `Consumed`, `Invalidated`, and `Expired` lifecycle is reused. Five invalid attempts invalidate the challenge; expiry and terminal states reject verification/reset; verified capability is short-lived and single use.

## One Active Challenge Review

Workspace locking, account scoping, the existing partial unique index, replacement invalidation, and PostgreSQL concurrency tests ensure only one `Active` or `Verified` challenge per account. Resend always creates a new code/digest/reference and invalidates the old code.

## Delivery Transaction Boundary Review

Challenge creation and Audit commit before delivery. The provider is invoked only after `IdentityUnitOfWork.execute` returns. A focused second transaction records attempt/success/failure. A dedicated test observes that delivery is never called while a transaction is active.

## Provider Failure Review

Configuration missing, unavailable, rejected, temporary, and permanent failures are typed. Provider calls use an eight-second default bounded timeout and abort signal. Definitive failure/timeout invalidates the challenge. Provider details do not enter public responses.

## Resend Review

The server enforces sixty seconds and three total deliveries per hour/account. A throttled resend returns safe 429 metadata. Concurrent issue/resend remains protected by Workspace locking and the one-open constraint.

## Verification Attempt Review

OTP shape is exactly eight Western digits. Every wrong code increments the persisted counter atomically. The fifth failure invalidates the challenge; remaining attempts are not disclosed.

## Recovery Reset Review

Reset requires the verified opaque reference, rechecks authoritative account/policy/contact state, applies the exact password policy, hashes with the existing hasher, changes lifecycle to Permanent, increments `passwordVersion`, consumes the challenge, and cannot be reused. No automatic login occurs.

## Session Revocation Review

Successful recovery calls the real PostgreSQL/in-memory Session repository with `RecoveryCompleted` and revokes all actor Sessions. No Session or authenticated cookie is created.

## Login Protection Review

Successful reset clears existing login-protection state inside the same Identity transaction so prior failed login attempts do not retain a lock.

## Suspension Review

Suspension is rechecked during resend, verify, and reset. A flow cannot complete after suspension even when invalidation was delayed or bypassed externally.

## WhatsApp Contact Invalidation Review

Task C invalidation remains intact. Verify/reset also compare the challenge destination version with the locked current profile, and mismatch invalidates/rejects the flow.

## Workspace Policy Review

Changing policy to `OwnerManagedOnly` now invalidates all open Workspace challenges in the settings transaction. Verify/reset independently reject a policy that no longer allows self-service recovery.

## Multi-Tenant Review

Initial lookup uses normalized public Workspace Code plus Workspace-scoped Username. Migration 0010 makes the random public reference globally unique; after one Infrastructure lookup, all operations continue with the resolved Workspace scope. Tests cover equal usernames and equal WhatsApp contacts across Workspaces and isolated references/codes.

## Rate Limit Review

Verification, cooldown, and per-hour delivery limits are server-enforced and account-scoped, preventing trivial challenge-recreation bypass. Generic HMAC cost reduces eligibility timing divergence. Broader IP/edge protection remains the approved Task 3.20 operational handoff; no browser fingerprinting or generic rate-limit platform was introduced.

## Audit Review

Safe events cover challenge creation/replacement, delivery attempted/succeeded/failed, verification failure/success, invalidation, consumption, login-protection clear, and session revocation. Audit metadata contains safe identifiers/counts, adapter name, and latency only.

## Logging Review

No new normal logging statement was added. OTP, digest, phone destination, message body, password/hash, session value/digest, provider payload, access secret, and Authorization header are excluded from Audit and logs.

## HTTP Boundary Review

Four seven-line-or-smaller Next.js route files delegate to a focused handler. Exact DTO parsing, same-origin enforcement, `no-store`, safe 202/200/400/409/429/503 mappings, and application closing are centralized. Internal eligibility codes are never serialized.

## Presentation Integration Review

The request page performs the real generic request. A root React context retains only the opaque reference and safe cooldown in memory; no recovery authority enters URL or Web Storage. The verify page supports paste/numeric entry, performs verification before showing password fields, resends to a new reference, and returns to Login after success. The client countdown is advisory.

## Cleanup Review

The bounded idempotent cleanup contract removes expired open/verified challenges and retained terminal challenges. No scheduler was introduced; Task 3.20 owns scheduling.

## Migration Review

Generated migration `0010_bent_chronomancer.sql` adds only a unique index on `challenge_id`, allowing the high-entropy challenge reference to be resolved globally before Workspace-scoped processing. Migrations 0000–0009 were not edited. No Production migration was run. The guarded isolated test database applied 0010 successfully.

## Security Review

Security tests cover enumeration safety, HMAC-only persistence, leading-zero codes, five attempts, expiry/terminal reuse, one active challenge, resend cooldown/replacement/hour limit, contact/policy/suspension invalidation, definitive provider failure, bounded timeout, Development/Production separation, session revocation, no provider call inside transactions, same-origin DTOs, URL secrecy, and Multi-Tenant isolation. No secrets or real environment files are included.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed; all repository suites passed, including Identity 101/101.
- `npm.cmd run test:integration` — passed 88/88 across 17 suites on the guarded isolated PostgreSQL database; the project container and Docker Desktop were restored to their prior stopped state afterward.
- `npm.cmd run build` — passed; all four recovery API routes and both recovery pages compiled in the production build.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed; informational LF/CRLF notices only.
- Branch/status/stat inspection — completed read-only.
- `npm audit` and `npm audit --omit=dev` — intentionally not run because the task explicitly forbids them without separate per-run approval.
- In-app browser automation — attempted through the required browser skill but blocked by its missing kernel-assets path. No alternate automation stack was substituted. Independent interactive touch/mouse/keyboard confirmation remains required.

## Files Created

- `app/api/auth/recovery/request/route.ts`
- `app/api/auth/recovery/resend/route.ts`
- `app/api/auth/recovery/reset/route.ts`
- `app/api/auth/recovery/verify/route.ts`
- `docs/05-Development/Identity-Recovery-Delivery-and-WhatsApp-OTP.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-E-Final-Report.md`
- `domains/identity/application/public-password-recovery.service.ts`
- `domains/identity/application/public-password-recovery.test.ts`
- `domains/identity/infrastructure/crypto/hmac-recovery-request-cost.ts`
- `domains/identity/infrastructure/http/identity-recovery-route-handlers.test.ts`
- `domains/identity/infrastructure/http/identity-recovery-route-handlers.ts`
- `domains/identity/infrastructure/identity-recovery-server-runtime.ts`
- `domains/identity/infrastructure/recovery-delivery/development-recovery-delivery.adapter.ts`
- `domains/identity/infrastructure/recovery-delivery/environment-recovery-delivery.ts`
- `domains/identity/infrastructure/recovery-delivery/recovery-delivery-adapters.test.ts`
- `domains/identity/infrastructure/recovery-delivery/unavailable-recovery-delivery.adapter.ts`
- `domains/identity/infrastructure/recovery-delivery/whatsapp-recovery-delivery.adapter.ts`
- `domains/identity/presentation/recovery-flow-context.tsx`
- `drizzle/0010_bent_chronomancer.sql`
- `drizzle/meta/0010_snapshot.json`

## Files Modified

- `app/layout.tsx`
- `docs/01-Architecture/Identity/README.md`
- `docs/05-Development/Identity-Accounts-Recovery-Bootstrap.md`
- `docs/05-Development/Identity-Authentication-and-Member-Presentation.md`
- `docs/05-Development/README.md`
- `domains/identity/application/member-administration.use-cases.ts`
- `domains/identity/application/password-recovery.use-cases.ts`
- `domains/identity/application/ports.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`
- `domains/identity/infrastructure/persistence/schema.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/identity/presentation/identity-api.client.ts`
- `domains/identity/presentation/identity-i18n.tsx`
- `domains/identity/presentation/identity-presentation.test.ts`
- `domains/identity/presentation/identity-presentation.types.ts`
- `domains/identity/presentation/identity-presentation.utils.ts`
- `domains/identity/presentation/pages/recovery-request-page.tsx`
- `domains/identity/presentation/pages/recovery-verify-page.tsx`
- `domains/identity/repositories/identity.repositories.ts`
- `drizzle/meta/_journal.json`
- `package.json`
- `shared/audit/audit.port.ts`

## Files Deleted

None.

## Files Intentionally Unchanged

- Historical migrations `0000` through `0009`.
- Owner-managed reset and `npm.cmd run owner:reset-password` emergency path.
- Session cookie/session architecture and Catalog/Inventory boundaries.
- Production environment files and all real credentials.
- No provider administration UI, scheduler, generic secrets platform, or broad rate-limit platform.

## Architecture Changes

No architecture redesign. This task extends the approved Identity Application/Infrastructure seams with a provider-neutral delivery port, public orchestration service, global opaque-reference uniqueness constraint, and in-memory Presentation flow context. Existing Domain models, repository isolation, Workspace ownership, server Session authority, and Task 3.20 operational boundary remain intact.

## Known Limitations

- No production WhatsApp vendor was approved, so no concrete external provider implementation or credentials were fabricated. Production recovery fails closed until one is injected.
- Recovery browser state is intentionally memory-only; a full reload requires a new request.
- Broader edge/IP throttling, scheduler operation, production secret management, provider observability/reconciliation, and operational retry are deferred to Task 3.20.
- Interactive browser QA could not run because the required browser environment failed to initialize; automated Presentation/API tests and production build passed.

## Production Configuration Requirements

- Supply valid purpose-separated `QSC_RECOVERY_HMAC_ACTIVE_VERSION` and `QSC_RECOVERY_HMAC_KEYS_JSON` values through the deployment secret boundary.
- Set `QSC_RECOVERY_DELIVERY_MODE=production`.
- Inject an approved concrete `WhatsAppProviderPort`; the default runtime intentionally has none.
- Supply `QSC_RECOVERY_PROVIDER_WORKSPACES_JSON` with only enabled/account/sender/template references, never access secrets.
- Optionally set the bounded `QSC_RECOVERY_PROVIDER_TIMEOUT_MS`.
- Apply migration 0010 through the approved production migration workflow after review.
- Configure Task 3.20 edge throttling, secret management, scheduling, monitoring, and reconciliation before production enablement.

## Required Confirmations

- Independent security/architecture review of enumeration resistance, opaque-reference lookup, delivery/follow-up transaction semantics, and production provider composition.
- Independent Mobile/Tablet/Desktop QA using touch, mouse, and keyboard, including RTL/LTR, paste, cooldown, resend, invalid/expired code, reset, Login return, and no automatic login.
- Deployment owner confirmation of the chosen WhatsApp provider, template approval, secret source, Workspace references, timeout, and production fail-closed behavior.
- Database owner review and approved deployment of migration 0010. This report is not self-approval.

## Summary

Task 3.15.1-E is implemented and verification-complete for independent review. The existing recovery challenge now has a real provider-neutral delivery/orchestration path, WhatsApp adapter contract, safe Development capture, enforced OTP/resend limits, session-revoking reset, thin HTTP routes, and connected bilingual Presentation while preserving tenant isolation and fail-closed Production behavior.

## Next Recommendation

Independently review this report and the DEV-001 evidence bundle. After approval, commit/push through the project workflow and apply migration 0010 through the approved deployment process. Do not begin Task 3.15.2 until Task E is independently reviewed and merged; then proceed to Task 3.15.2 — Replace Unavailable Product Media Source.

## Git and Review Integrity

The branch remained `feature/identity-recovery-delivery`. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was executed. The worktree began clean and contains only Task E implementation/report changes. Exact source files are preserved; evidence sanitization applies only to generated review evidence. No `.env`, database URL, OTP, password/hash, session value/digest, HMAC key, provider token, Authorization header, or real WhatsApp credential is included. The result is ReadyForReview, not approved.
