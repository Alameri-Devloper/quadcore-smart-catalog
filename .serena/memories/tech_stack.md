# Technology Stack

- Runtime/application: Next.js 16.2.10 App Router, React 19.2.4, React DOM 19.2.4.
- Language: TypeScript 5.x, strict mode. Main config uses ESNext modules, bundler resolution, React JSX, `noEmit`, and `@/* -> ./*`.
- Styling: Tailwind CSS 4 via `@tailwindcss/postcss`; shared/global CSS is also used.
- Persistence: PostgreSQL via `pg` 8.x and Drizzle ORM 0.45.2 / Drizzle Kit 0.31.x. PostgreSQL adapters exist; Supabase is future intent, not the current persistence implementation.
- Security/media: Argon2 0.45.1; Sharp 0.35.3.
- Package manager: npm; `package-lock.json` is present. Do not change dependencies without approval.
- Testing: Node test runner; TypeScript tests execute through `tsx`. One legacy aggregate test is compiled to `.next/domain-tests`; integration tests compile through `tsconfig.integration.json` into `.next/integration-tests`.
- Quality: ESLint 9 with Next core-web-vitals and TypeScript configurations. Generated Next/build/review artifacts are ignored by ESLint.
- Integration tests are separate from `npm test`; they prepare/use a configured PostgreSQL test database and must never be pointed at production.
- Local Product Media V1 uses provider-neutral ports with a local-filesystem adapter and hard links; production expectations require a compatible supported filesystem.
- Serena language server: TypeScript, UTF-8, LSP backend, project workspace `.`.
