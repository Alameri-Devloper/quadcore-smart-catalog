# QSC Task 3.15.1-E-R1 Final Report

## Status

ReadyForReview

## Task

3.15.1-E-R1 — Public Recovery Enumeration, Reset Cost and Delivery Idempotency Hardening

## Branch

`feature/identity-recovery-delivery`

## Root Cause

Task E returned equal initial envelopes but exposed raw real challenge references and random non-persisted decoys. Immediate resend therefore returned 429 for a real Active challenge and 409 for a decoy, creating a cross-step Workspace Code plus Username oracle. The eligible request also awaited WhatsApp while the decoy path returned without an equivalent response-duration policy. Reset invoked the expensive password hasher before proving that the challenge was `Verified`. Finally, the provider boundary lacked an idempotency key, all failures were invalidated alike, and the 60-second spacing check depended on an open challenge, so invalidation could remove the only cooldown state.

أعادت المهمة E غلافًا أوليًا متساويًا، لكنها كشفت مرجع التحدي الحقيقي مباشرة واستخدمت مرجعًا وهميًا غير محفوظ. لذلك أعادت إعادة الإرسال الفورية 429 للتحدي الحقيقي و409 للمرجع الوهمي، مما أنشأ قناة تعداد عبر رمز مساحة العمل واسم المستخدم. كما انتظر المسار المؤهل واتساب وحده، ونفذت إعادة الضبط تجزئة كلمة المرور قبل إثبات حالة `Verified`، ولم يملك حد المزوّد مفتاح idempotency، واعتمد حد الستين ثانية على وجود تحد مفتوح فقط.

## Security Correction Review

- Public recovery authority is now an authenticated AES-256-GCM token containing equal-length encrypted real or decoy flow state. The key is purpose-separated from the existing recovery key ring. No Workspace, Actor, account, destination, or challenge identifier is visible.
- Real and decoy request results have the same type, fields, cooldown metadata, and protected-reference shape. Immediate resend is 429 for both. Resend after 60 seconds is 202 with a newly protected equal-shape reference for both. Wrong-code verify and unverified reset probing remain equal.
- Unknown Workspace, unknown username, Suspended account, `OwnerManagedOnly`, and missing recovery profile/contact all receive decoy authority and never call the delivery provider.
- A centralized injected timing policy applies an asynchronous response floor to request/resend and a smaller probe floor to verify/reset. The send floor must exceed the bounded provider timeout. No busy waiting or decoy provider call was introduced.
- Reset now validates password shape, performs a cheap read-only eligibility preflight, hashes only after a valid `Verified` preflight and outside PostgreSQL, then locks and revalidates all security conditions with a fresh post-hash time before mutation.
- Each challenge derives one stable purpose-specific provider idempotency key. The key never uses OTP plaintext and is forwarded explicitly through `WhatsAppProviderPort`.
- `ConfigurationMissing`, `ProviderRejected`, and `PermanentFailure` are definitive non-delivery and invalidate the challenge. `ProviderUnavailable`, `TemporaryFailure`, and `Timeout` remain uncertain/temporary and do not invalidate authority that may have been delivered.
- The 60-second spacing check now locks and reads the latest persisted challenge regardless of status. Failed or uncertain delivery cannot immediately create another provider attempt. The existing all-status three-per-hour count remains authoritative.
- OTP, destination, idempotency key, provider secrets, passwords, hashes, Session material, and authorization headers are absent from normal logs and Audit metadata.

## Architecture Review

The Identity bounded context was not redesigned. Application owns public-flow orchestration, reset preflight/final revalidation, and transaction boundaries. Infrastructure owns authenticated token cryptography, response timing, WhatsApp configuration/provider translation, and PostgreSQL queries. Domain remains provider-neutral. Repositories do not call repositories, provider calls remain outside PostgreSQL transactions, and Presentation continues to depend only on the public HTTP contract.

No migration `0011` was needed. The existing challenge row already persists the attempt creation time and hourly history. Protected decoy state is stateless, and provider idempotency is derived deterministically from the existing challenge attempt. Migrations `0000` through `0010` were not edited by R1.

## Regression Review

The correction preserves eight Western-digit OTPs, ten-minute expiry, five verification attempts, versioned HMAC-SHA-256 storage, one open challenge per account, `passwordVersion` increment, Permanent lifecycle, login-protection clear, actor-wide Session revocation, no automatic login, contact/policy/suspension invalidation, Workspace isolation, Production prohibition for the Development adapter, and the Task D Presentation behavior.

## Test Results

- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd tsc --noEmit -p tsconfig.integration.json` — passed.
- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed; all repository suites passed, including Identity 110/110.
- `npm.cmd run test:integration` — passed 88/88 across 17 suites on the guarded isolated PostgreSQL database. The PostgreSQL container and Docker Desktop were restored to their prior stopped state.
- `npm.cmd run build` — passed; the four recovery APIs and two recovery pages compiled in the Production build.
- `npm.cmd run db:check` — passed.
- `git diff --check` — passed; informational LF/CRLF notices only.
- `git status --short` and `git diff --stat` — inspected read-only.
- `npm audit` and `npm audit --omit=dev` — not run because the task explicitly forbids them without separate approval.
- No Production migration was run.

## Files Created

- `domains/identity/infrastructure/crypto/aes-gcm-public-recovery-flow-token.ts`
- `domains/identity/infrastructure/crypto/aes-gcm-public-recovery-flow-token.test.ts`
- `domains/identity/infrastructure/public-recovery-timing.ts`
- `domains/identity/infrastructure/crypto/public-recovery-timing.test.ts`
- `docs/05-Development/Reports/QSC-Task-3.15.1-E-R1-Final-Report.md`

## Files Modified

- `docs/05-Development/Identity-Recovery-Delivery-and-WhatsApp-OTP.md`
- `domains/identity/application/password-recovery.use-cases.ts`
- `domains/identity/application/ports.ts`
- `domains/identity/application/public-password-recovery.service.ts`
- `domains/identity/application/public-password-recovery.test.ts`
- `domains/identity/infrastructure/crypto/environment-recovery-code-digest.ts`
- `domains/identity/infrastructure/identity-recovery-server-runtime.ts`
- `domains/identity/infrastructure/recovery-delivery/whatsapp-recovery-delivery.adapter.ts`
- `domains/identity/infrastructure/recovery-delivery/recovery-delivery-adapters.test.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/identity/repositories/identity.repositories.ts`

## Files Deleted

None.

## Architecture Changes

No architecture redesign. R1 adds two focused Application ports: protected public-flow authority and public response timing. Their implementations remain in Infrastructure. The existing password-recovery repository gains a latest-attempt query used under the existing Workspace serialization boundary. The WhatsApp provider request gains a stable idempotency field. No new aggregate, workflow engine, table, library, vendor coupling, or broad platform capability was introduced.

## Summary

Task 3.15.1-E-R1 corrects all four independent security-review blockers. Enumeration resistance now holds across request, resend, verify, and reset; eligible and decoy send paths use the same bounded timing policy without wasting provider resources; Argon2 runs only after verified recovery preflight and remains protected by final locked revalidation; and provider idempotency plus durable latest-attempt spacing safely distinguish definitive from ambiguous delivery outcomes.

تم تصحيح جميع موانع المراجعة الأمنية الأربعة: أصبحت مقاومة التعداد ممتدة عبر كل خطوات الاستعادة، وتطبق المسارات الحقيقية والوهمية سياسة توقيت موحدة دون استدعاء المزوّد للحساب الوهمي، ولا يعمل Argon2 إلا بعد فحص `Verified` مع إعادة تحقق نهائية مقفلة، وتحمي idempotency وحدود أحدث محاولة من التوصيل المكرر بعد النتائج غير اليقينية.

## Next Recommendation

Perform an independent security and architecture review of the R1 report and DEV-001 evidence bundle, with particular attention to protected-token key rotation, public timing-floor deployment values, provider-specific idempotency mapping, and ambiguous-timeout operational reconciliation. After approval, commit/push through the project workflow and apply the already-reviewed Task E migration `0010` through the approved deployment process. Do not begin another task automatically.

## Git and Review Integrity

The branch remained `feature/identity-recovery-delivery`. The working tree already contained the complete uncommitted Task E implementation at the start of R1; R1 preserved it and added only the correction/report changes listed above. No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion was executed. Exact source files are preserved and only generated evidence is sanitized. No credentials, real environment files, database URLs, OTPs, passwords/hashes, Session values/digests, recovery keys, provider tokens, or authorization headers are included. This result is ReadyForReview, not approved.
