# QSC Task 3.15.1-A — Accounts, Credentials, Recovery Challenges and Bootstrap — Final Report

## Status

ReadyForReview

## Task

3.15.1-A — Accounts, Credentials, Recovery Challenges and Bootstrap

## Branch

`feature/identity-accounts-recovery-bootstrap`

## English Summary

Implemented the first QSC Identity foundation as a separate bounded context. The change adds Workspace-scoped accounts, independent password credentials and login-protection state, provider-neutral password-recovery challenges, transactional Workspace/initial-Owner bootstrap, Owner-managed reset, and local emergency Owner reset. PostgreSQL repositories, Drizzle migration `0007`, shared security-audit persistence, Argon2id hashing, versioned HMAC-SHA-256 recovery digests, typed outcomes, CLI adapters, and automated tests are included.

The implementation deliberately does not add sessions, authentication HTTP routes, browser UI, WhatsApp delivery, or authorization management. Catalog bounded contexts and historical migrations remain unchanged.

## Arabic Summary

تم تنفيذ الأساس الأول لسياق الهوية في QSC كسياق مستقل. يشمل التغيير حسابات مقيدة بمساحة العمل، وبيانات اعتماد كلمة مرور مستقلة، وحالة حماية تسجيل الدخول، وتحديات استعادة كلمة المرور المحايدة تجاه مزود الإرسال، وتهيئة مساحة العمل والمالك الأول ضمن معاملة واحدة، وإعادة تعيين كلمة المرور بواسطة المالك، وأمر الاستعادة المحلي الطارئ للمالك.

يتضمن التنفيذ مستودعات PostgreSQL، وترحيل Drizzle رقم `0007`، وتدقيقاً أمنياً مشتركاً، وتجزئة Argon2id، وملخصات HMAC-SHA-256 بمفاتيح ذات إصدارات، ونتائج محددة الأنواع، وأوامر CLI، واختبارات آلية. لم تُضف الجلسات أو مسارات HTTP للمصادقة أو واجهة تسجيل الدخول أو إرسال WhatsApp، وبقيت سياقات الكتالوج والترحيلات التاريخية دون تغيير.

## Architecture Review

- Preserves DDD, Clean Architecture, Modular Monolith, and multi-tenant boundaries.
- Domain objects own validation and lifecycle rules; Application use cases own orchestration and transaction boundaries; Infrastructure owns PostgreSQL, cryptography, environment composition, and CLI transport.
- Focused repositories operate independently. No repository calls another repository.
- A PostgreSQL `IdentityUnitOfWork` composes Workspace, Identity, profile, membership, communication-settings, login-protection, recovery-challenge, and shared Audit repositories on one transaction.
- Shared scoped identifiers and E.164 validation are reusable technical/domain primitives, not Catalog dependencies.

## Identity Boundaries

`Auth Account`, `Workspace Member Profile`, and `Workspace Membership` remain separate records and contracts. `actorId` is the stable identity identifier. Credentials, account state, password lifecycle, login protection, membership/role, profile contact, recovery challenge, and future session state are not collapsed into one entity. Membership branch scope uses only `AllBranches | SelectedBranches`; every Owner is constrained to `AllBranches`, and selected Branch ID persistence remains deferred to Task C. Identity does not import or mutate Catalog business models.

## Workspace Login Code Review

Workspace owns a readable, stable login code that is distinct from `workspaceId` and display name. Codes are centrally validated and normalized, persisted with a database uniqueness constraint, and resolved together with the Workspace-scoped normalized username. Bootstrap conflict handling maps duplicate codes to a stable typed result.

## Username Review

The dedicated `Username` value object enforces 3–64 ASCII characters from letters, digits, `.`, `_`, and `-`. Lookup and uniqueness use lowercase normalization while the accepted original form is retained. Database uniqueness is `(workspace_id, normalized_username)`. Suspended accounts remain persisted, so their username is not reusable; no lookup resolves an account by username without Workspace scope.

## Account Lifecycle Review

Account state is explicit: `PendingActivation`, `Active`, or `Suspended`. New and bootstrapped accounts start `PendingActivation`. Activation and reactivation are explicit use cases, suspension preserves the same `actorId` and invalidates open recovery challenges, and no hard-delete workflow was introduced.

## Password Lifecycle Review

Password lifecycle is independent: `Temporary` or `Permanent`. New/bootstrap and Owner/emergency-reset credentials are `Temporary`; activation establishes `Permanent`; an active account can therefore correctly remain `Active` while its replacement password is `Temporary`. Credential replacement increments the explicit `passwordVersion`.

## Password Security Review

The password policy counts Unicode code points and accepts 12–128 characters. It preserves the exact supplied value, permits spaces, performs no trimming or Unicode normalization, and rejects all-space values. Plaintext passwords are confined to short-lived Application/CLI call data, are never persisted, audited, logged, returned by repositories, or accepted as CLI arguments.

## Argon2id Review

Added the maintained `argon2` package at exact version `0.45.1` because the approved algorithm requires a native Node-compatible Argon2id implementation. It is isolated behind `PasswordHasher`. Central parameters are Argon2id v19, 65,536 KiB memory, time cost 3, parallelism 1, and 32-byte hash length. Encoded hashes are self-describing, exact-password verification is tested, and `needsRehash` supports future parameter upgrades.

## Login Protection Review

Login protection is a separate persisted record. Five failures in a rolling 15-minute window create a five-minute lock. Repeated lockouts escalate exponentially to 10, 20, 40, and the approved 60-minute cap. Successful authentication/reset/reactivation clears the applicable state. PostgreSQL row locking prevents lost counter updates; account suspension remains authoritative regardless of lock expiry.

## Recovery Challenge Review

Recovery uses the provider-neutral `PrimaryRecoveryContact` channel; WhatsApp is represented only by the Workspace policy and trusted communication/profile data for future Infrastructure delivery. Challenges use eight numeric digits, ten-minute expiry, five verification attempts, a 60-second resend interval, a three-send-per-hour limit, single use, and explicit `Active`, `Verified`, `Consumed`, `Invalidated`, and `Expired` states. A partial unique index and transactional invalidation enforce one open challenge per account. Expired, consumed, invalidated, cross-Workspace, or attempt-exhausted challenges fail closed.

## HMAC Digest Review

Recovery codes are stored only as HMAC-SHA-256 digests with an explicit key version. The Infrastructure adapter requires at least 32-byte secrets, reads versioned server configuration from `QSC_RECOVERY_HMAC_ACTIVE_VERSION` and `QSC_RECOVERY_HMAC_KEYS_JSON`, supports old-key verification during rotation, validates digest shape, and compares digest bytes with `timingSafeEqual`. No code, digest, or secret is placed in Audit or evidence.

## Bootstrap Review

`npm.cmd run workspace:bootstrap` is CLI-only. Non-secret metadata may be supplied as named arguments; password arguments are rejected and the temporary password is collected through a hidden TTY prompt. The Application operation validates Workspace code, Owner username, password, profile, and E.164 recovery contact, then atomically creates the Workspace, recovery policy, communication settings, Owner account, credential, profile, `Owner`/`AllBranches` membership, login-protection state, and Audit events.

## Emergency Owner Reset Review

`npm.cmd run owner:reset-password` is a local CLI-only operation with explicit Workspace code and Owner username. It rejects non-Owner or ambiguous/scoped-missing targets, obtains the replacement through the hidden prompt, issues a `Temporary` credential, increments `passwordVersion`, clears the lock, invalidates recovery challenges, and records a safe Audit event. Task A defines `SessionRevocationPort` only as a future integration seam; this use case does not invoke session revocation because actual revocation is intentionally deferred until Task B provides server-side session persistence. No universal administrative password or credential-viewing path exists.

## Transaction Review

Application owns every required Task A transaction. Bootstrap is all-or-nothing. Owner and emergency resets update the credential, clear protection, invalidate challenges, and audit within one unit of work. Recovery completion locks and validates the challenge, replaces the credential, increments its version, clears protection, consumes the verified challenge, invalidates other open challenges, and audits before commit. Task A defines the session-revocation seam but none of these use cases invokes it; Task B will integrate actual revocation once server-side session persistence exists. No external delivery call occurs inside a transaction.

## Multi-Tenant Review

All Identity persistence and Application commands carry trusted `workspaceId` scope. Composite keys and foreign keys cover Workspace/actor and Workspace/challenge relationships; normalized username uniqueness is Workspace-scoped. Tests prove that a Workspace cannot resolve another Workspace's username, credential, or challenge, and cannot reset another Workspace account through scoped contracts.

## Security Review

- No public bootstrap, emergency-reset, login, or recovery endpoint was added.
- No Session table, cookie, session token, or fabricated authenticated context was introduced.
- No plaintext password or raw OTP is stored; no raw SHA-256 OTP digest is used.
- No hardcoded Owner password, recovery secret, provider credential, or production database value exists.
- Public/browser identity authority remains fail-closed until Task B supplies trusted session context.
- The CLI rejects password-bearing command-line arguments to reduce shell-history exposure.
- `npm audit`, `npm audit --omit=dev`, and `npm audit fix` were not run because per-run approval was not provided. The optional DEV-001 audit checks are intentionally skipped.

## Audit Review

Identity uses the shared security Audit contract and PostgreSQL store rather than creating an Identity-owned generic Audit system. Bootstrap, account lifecycle, temporary password issuance/reset, challenge creation/verification/failure/invalidation/consumption, and login-protection changes emit business/security events with scoped identifiers and timestamps. Metadata is allowlisted against sensitive key names and never contains passwords, password hashes, OTPs, OTP digests, HMAC secrets, session tokens, or provider credentials.

## Migration Review

Added only the next migration: `drizzle/0007_identity_accounts_recovery_bootstrap.sql`, with its generated snapshot and journal entry. Historical migrations `0000`–`0006` were not edited. The migration creates Workspace, communication settings, account, credential, protection, profile, membership, recovery challenge, and security Audit tables with scoped constraints, foreign keys, partial uniqueness, and lookup/expiry indexes. `db:check` passes, and the full historical migration chain passes against the guarded isolated `quadcore_smart_catalog_test` database from a clean state. No production/external application migration was run.

## Test Results

All required implementation-state checks passed before bundle generation:

| Command | Result |
| --- | --- |
| `npx.cmd tsc --noEmit` | Passed |
| `npx.cmd tsc --noEmit -p tsconfig.integration.json` | Passed |
| `npm.cmd run lint` | Passed |
| `npm.cmd test` | Passed; all existing suites plus 31/31 Identity tests |
| `npm.cmd run test:integration` | Passed: 76/76 across 15 suites from a clean guarded test database |
| `npm.cmd run build` | Passed; Next.js 16.2.10 production build completed |
| `npm.cmd run db:check` | Passed |
| `git diff --check` | Passed before final report creation; rerun by final verification |
| `git status --short` | Inspected; only expected Task 3.15.1-A changes |
| `git diff --stat` | Inspected |

Coverage includes value objects, account/credential/challenge/protection lifecycles, Workspace isolation, duplicate conflicts, atomic rollback, password-version updates, Argon2id, HMAC/key rotation, CLI mapping, PostgreSQL constraints, row-scoped access, concurrent challenge/completion behavior, and clean migrations.

## Files Created

- `docs/05-Development/Identity-Accounts-Recovery-Bootstrap.md`
- `docs/05-Development/Reports/QSC-Task-3.15.1-A-Final-Report.md`
- `domains/identity/application/account-lifecycle.use-cases.ts`
- `domains/identity/application/create-account.use-case.ts`
- `domains/identity/application/identity-application.test.ts`
- `domains/identity/application/identity-results.ts`
- `domains/identity/application/login-protection.use-cases.ts`
- `domains/identity/application/password-recovery.use-cases.ts`
- `domains/identity/application/password-reset.use-cases.ts`
- `domains/identity/application/ports.ts`
- `domains/identity/application/workspace-bootstrap.use-case.ts`
- `domains/identity/domain/account.ts`
- `domains/identity/domain/identity-domain.test.ts`
- `domains/identity/domain/login-protection.ts`
- `domains/identity/domain/member.ts`
- `domains/identity/domain/password-credential.ts`
- `domains/identity/domain/password-recovery-challenge.ts`
- `domains/identity/domain/password.ts`
- `domains/identity/domain/username.ts`
- `domains/identity/infrastructure/crypto/argon2-password-hasher.ts`
- `domains/identity/infrastructure/crypto/environment-recovery-code-digest.ts`
- `domains/identity/infrastructure/crypto/hmac-recovery-code-digest.ts`
- `domains/identity/infrastructure/crypto/identity-crypto-adapters.test.ts`
- `domains/identity/infrastructure/identity-cli-runtime.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity-unit-of-work.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.integration.test.ts`
- `domains/identity/infrastructure/persistence/postgresql-identity.repositories.ts`
- `domains/identity/infrastructure/persistence/schema.ts`
- `domains/identity/infrastructure/system-identity-adapters.ts`
- `domains/identity/mock/in-memory-identity-unit-of-work.ts`
- `domains/identity/repositories/identity.repositories.ts`
- `domains/workspace/domain/workspace.ts`
- `domains/workspace/infrastructure/persistence/postgresql-workspace.repository.ts`
- `domains/workspace/infrastructure/persistence/schema.ts`
- `domains/workspace/repositories/workspace.repository.ts`
- `drizzle/0007_identity_accounts_recovery_bootstrap.sql`
- `drizzle/meta/0007_snapshot.json`
- `scripts/identity/cli-arguments.ts`
- `scripts/identity/cli-prompt.ts`
- `scripts/identity/identity-cli.test.ts`
- `scripts/identity/owner-reset-password.ts`
- `scripts/identity/workspace-bootstrap.ts`
- `scripts/integration/prepare-integration-test-database.ts`
- `shared/audit/audit.port.ts`
- `shared/audit/infrastructure/persistence/postgresql-security-audit.repository.ts`
- `shared/audit/infrastructure/persistence/schema.ts`
- `shared/domain/e164-phone-number.ts`
- `shared/domain/scoped-identity.ts`
- `shared/infrastructure/persistence/database.ts`
- `shared/infrastructure/persistence/schema.ts`

## Files Modified

- `docs/01-Architecture/Identity/README.md`
- `docs/01-Architecture/Workspace/README.md`
- `docs/05-Development/README.md`
- `drizzle.config.ts`
- `drizzle/meta/_journal.json`
- `package.json`
- `package-lock.json`
- `tsconfig.integration.json`

## Files Deleted

None.

## Files Intentionally Unchanged

- Catalog bounded-context source, API, UI, Product, Product Entry, Product Media, Local Draft, Inventory, Pricing, and Reference Data contracts.
- Historical migrations `drizzle/0000` through `drizzle/0006` and their snapshots.
- Existing production trusted-context safeguards.
- `.env*` files and real environment values.
- Git index, refs, commits, history, and remote state.

## Known Limitations

- Session persistence, opaque session tokens, cookies, login/logout, `/api/auth/me`, and trusted request-context resolution belong to Task 3.15.1-B.
- Owner member/permission/branch management belongs to Task C; UI belongs to Task D; WhatsApp provider delivery and external security throttles belong to Task E.
- Recovery challenge creation is provider-neutral and requires trusted recovery-contact data; it does not deliver a code.
- HMAC key environment variables must be securely provisioned before any future recovery-delivery runtime is enabled.
- No dependency audit was run because explicit per-run approval was absent.
- Independent architectural/security review and production migration approval remain outstanding.

## Required Confirmations

- Confirm Identity, Workspace, profile, membership, and shared Audit ownership boundaries.
- Confirm Argon2id parameters and the future rehash seam.
- Confirm provider-neutral recovery channel naming and versioned HMAC rotation contract.
- Confirm all reset/recovery flows increment `passwordVersion`, clear protection, invalidate challenges, and never create a session.
- Confirm Task A only defines the `SessionRevocationPort` seam and intentionally defers actual invocation/revocation to Task B.
- Confirm composite Workspace-scoped constraints and concurrency behavior.
- Confirm migration `0007` without modification to historical migrations.
- Confirm no credentials, OTPs, digests, secrets, database URLs, or real environment files appear in the DEV-001 artifacts.
- Confirm optional audit commands were skipped and no Git write operation occurred.
- Do not mark the task approved or begin Task B until independent review is complete.

### التأكيدات المطلوبة

- مراجعة حدود ملكية الهوية ومساحة العمل والملف الشخصي والعضوية والتدقيق المشترك.
- مراجعة إعدادات Argon2id وآلية إعادة التجزئة المستقبلية.
- مراجعة حياد قناة الاستعادة وآلية تدوير مفاتيح HMAC ذات الإصدارات.
- التأكد من أن إعادة التعيين والاستعادة تزيد `passwordVersion` وتمسح الحماية وتبطل التحديات ولا تنشئ جلسة.
- مراجعة القيود متعددة المستأجرين وسلوك التزامن والترحيل `0007`.
- التأكد من خلو حزمة المراجعة من كلمات المرور والرموز والملخصات والأسرار وروابط قواعد البيانات وملفات البيئة الحقيقية.
- عدم بدء المهمة B قبل اكتمال المراجعة المستقلة.

## Architecture Changes

Added the approved Identity bounded context, the minimum Workspace owner model needed for bootstrap/login code and recovery policy, shared security-Audit persistence, and a shared PostgreSQL schema/database composition layer. No existing Catalog boundary was redesigned.

## Summary

Task 3.15.1-A is implemented and locally verified. Its status is `ReadyForReview`, not independently approved.

## Next Recommendation

Perform independent architectural and security review using the DEV-001 report, source snapshot, migration evidence, sanitized command results, ZIP-integrity result, and SHA-256 checksum. After approval and merge, begin Task 3.15.1-B; do not continue automatically.

## Git and Review Integrity

- Current branch remains `feature/identity-accounts-recovery-bootstrap`.
- All Task 3.15.1-A changes remain unstaged/untracked for review.
- No checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, branch deletion, or other Git write operation was performed.
- Only the guarded isolated integration-test database was reset/migrated; no production/external database migration was executed.
- `npm audit`, `npm audit --omit=dev`, and `npm audit fix` were not run; DEV-001 uses both optional audit skip flags.
- DEV-001 artifacts are generated by the repository review tool with sanitized evidence, exact source copies, collision-safe atomic publishing, ZIP integrity validation, and post-copy SHA-256 verification. Repository-local and exported paths are reported in the final handoff.
