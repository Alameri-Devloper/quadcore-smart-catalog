import { createPlatformDatabaseConnection } from "../../../shared/infrastructure/persistence/database";
import type { AuthenticatedRequestContextResolver, TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError } from "../../../shared/auth/trusted-actor-context";
import { ChangePasswordAndRotateSessionUseCase } from "../application/change-password-and-rotate-session.use-case";
import { LoginUseCase, LogoutUseCase, ResolveSessionUseCase } from "../application/session.use-cases";
import { Argon2idPasswordHasher } from "./crypto/argon2-password-hasher";
import { sessionTokenDigestFromEnvironment } from "./crypto/environment-session-token-digest";
import { CryptographicSessionTokenGenerator } from "./crypto/session-token-crypto";
import { SessionCookieAdapter, sessionCookieFromEnvironment } from "./http/session-cookie";
import { SameOriginRequestPolicy, sameOriginPolicyFromEnvironment } from "./http/same-origin-request-policy";
import { PostgreSqlIdentityUnitOfWork } from "./persistence/postgresql-identity-unit-of-work";
import { RandomSessionIdentifierGenerator, SystemIdentityClock } from "./system-identity-adapters";

export interface IdentityServerApplication {
  readonly login: Pick<LoginUseCase, "execute">;
  readonly resolve: Pick<ResolveSessionUseCase, "execute">;
  readonly logout: Pick<LogoutUseCase, "execute">;
  readonly credentialChange: Pick<ChangePasswordAndRotateSessionUseCase, "execute">;
  readonly cookie: SessionCookieAdapter;
  readonly origin: SameOriginRequestPolicy;
  readonly now: () => Date;
  close(): Promise<void>;
}

export type IdentityServerApplicationFactory = () => IdentityServerApplication;

export const openIdentityServerApplication: IdentityServerApplicationFactory = () => {
  const connection = createPlatformDatabaseConnection();
  try {
    const unitOfWork = new PostgreSqlIdentityUnitOfWork(connection.database);
    const hasher = new Argon2idPasswordHasher();
    const digest = sessionTokenDigestFromEnvironment();
    const clock = new SystemIdentityClock();
    const issuance = {
      identifiers: new RandomSessionIdentifierGenerator(),
      values: new CryptographicSessionTokenGenerator(),
      digest,
    } as const;
    return Object.freeze({
      login: new LoginUseCase(unitOfWork, hasher, clock, issuance),
      resolve: new ResolveSessionUseCase(unitOfWork, digest, clock),
      logout: new LogoutUseCase(unitOfWork, digest, clock),
      credentialChange: new ChangePasswordAndRotateSessionUseCase(unitOfWork, hasher, digest, clock, issuance),
      cookie: sessionCookieFromEnvironment(),
      origin: sameOriginPolicyFromEnvironment(),
      now: () => clock.now(),
      close: () => connection.close(),
    });
  } catch (error) {
    void connection.close();
    throw error;
  }
};

export class IdentityAuthenticatedRequestContextResolver implements AuthenticatedRequestContextResolver {
  constructor(private readonly open: IdentityServerApplicationFactory = openIdentityServerApplication) {}

  async resolve(request: Request): Promise<TrustedActorContext> {
    let application: IdentityServerApplication | undefined;
    try {
      application = this.open();
      const rawSessionValue = application.cookie.read(request);
      if (!rawSessionValue) throw new AuthenticatedContextUnavailableError();
      const resolved = await application.resolve.execute({ rawSessionValue, requiredClass: "Full" });
      if (!resolved.ok) {
        if (resolved.error === "ForbiddenForRestrictedSession") throw new RestrictedSessionContextError();
        throw new AuthenticatedContextUnavailableError();
      }
      return resolved.value.context;
    } finally {
      await application?.close();
    }
  }
}
