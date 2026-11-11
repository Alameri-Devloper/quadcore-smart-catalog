import { PostgreSqlPublicShareManagementAdmission } from "../infrastructure/persistence/postgresql-public-share-management-admission";
import { publicShareManagementAdmissionPolicyFromEnvironment } from "../infrastructure/environment-public-share-management-admission";
import { publicShareManagementAdmissionPolicyFixture } from "./public-share-management-admission.fixture";
import { randomBytes, randomUUID } from "node:crypto";
import { publicSharePostgresFixture } from "./public-share-postgres.fixture";
import { ActorId, SessionId, WorkspaceId } from "../../../../shared/domain/scoped-identity";
import { ServerSession } from "../../../identity/domain/session";
import { HmacSha256SessionTokenDigest } from "../../../identity/infrastructure/crypto/session-token-crypto";
import { PostgreSqlIdentityUnitOfWork } from "../../../identity/infrastructure/persistence/postgresql-identity-unit-of-work";
import { PostgreSqlSessionRepository } from "../../../identity/infrastructure/persistence/postgresql-identity.repositories";
import { identityAccounts, identityPasswordCredentials, identityMemberProfiles, identityMemberships, identityMembershipPermissions } from "../../../identity/infrastructure/persistence/schema";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { ResolveSessionUseCase } from "../../../identity/application/session.use-cases";
import { SessionCookieAdapter } from "../../../identity/infrastructure/http/session-cookie";
import { SameOriginRequestPolicy } from "../../../identity/infrastructure/http/same-origin-request-policy";
import { PublicProductShareManagementService } from "../application/public-product-share-management.service";
import { createPublicProductShareLifecycleRuntime } from "../infrastructure/public-product-share-lifecycle-runtime";
import { publicShareManagementReadiness } from "../infrastructure/public-product-share-management-readiness";
import { createPublicProductShareRouteHandlers } from "../infrastructure/http/public-product-share-route-handlers";
import { environment } from "../infrastructure/crypto/public-share-crypto.test-fixtures";
import type { PublicShareCryptoEnvironment } from "../infrastructure/crypto/environment-public-share-crypto";
export const publicShareManagementPostgresFixture = () => {
  const f = publicSharePostgresFixture("p5-management-integration"), clock = { now: () => new Date("2026-10-19T00:00:00Z") };
  const digest = new HmacSha256SessionTokenDigest([{ version: 1, keyBytes: Buffer.alloc(32, 41) }], 1);
  const identity = new PostgreSqlIdentityUnitOfWork(f.connection.database), resolve = new ResolveSessionUseCase(identity, digest, clock);
  const unused = { execute: async (): Promise<never> => { throw new Error("UnusedSyntheticSessionOperation"); } };
  const origin = new SameOriginRequestPolicy("https://catalog.test");
  const resolver = new IdentityAuthenticatedRequestContextResolver(() => ({
    login: unused, logout: unused, credentialChange: unused, resolve, origin,
    cookie: new SessionCookieAdapter({ name: "qsc_p5_session", secure: false }), now: clock.now, close: async () => undefined,
  }));
  const application = (overrides: Partial<PublicShareCryptoEnvironment> = {}) => {
    const runtime = createPublicProductShareLifecycleRuntime(f.connection.database, { environment: environment(overrides), clock });
    return { context: resolver, origin, management: new PublicProductShareManagementService(runtime.lifecycle, publicShareManagementReadiness(runtime),
      new PostgreSqlPublicShareManagementAdmission(f.connection.database, publicShareManagementAdmissionPolicyFromEnvironment({ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: JSON.stringify(publicShareManagementAdmissionPolicyFixture()) }))), close: async () => undefined };
  };
  const handlers = (overrides: Partial<PublicShareCryptoEnvironment> = {}) => createPublicProductShareRouteHandlers(() => application(overrides));
  const session = async (actorId: string, options: { workspaceId?: string; version?: number; restricted?: boolean; expired?: boolean; at?: Date } = {}) => {
    const raw = randomBytes(32).toString("base64url");
    const value = ServerSession.create({ workspaceId: WorkspaceId.create(options.workspaceId ?? "p4-workspace"), actorId: ActorId.create(actorId),
      sessionId: SessionId.create(randomUUID()), digest: digest.create(raw), sessionClass: options.restricted ? "Restricted" : "Full",
      authorizationVersion: options.version ?? 1, passwordVersion: 1, createdAt: new Date((options.at ?? clock.now()).getTime() - (options.expired ? 13 * 60 * 60 * 1000 : 0)) });
    if (await new PostgreSqlSessionRepository(f.connection.database).create(value) !== "Created") throw new Error("SyntheticSessionInsertFailed");
    return "qsc_p5_session=" + raw;
  };
  const request = (cookie?: string, body?: unknown) => new Request("https://catalog.test/api/test", {
    method: body === undefined ? "GET" : "POST", headers: { ...(cookie ? { cookie } : {}), origin: "https://catalog.test", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const seed = async () => {
    await f.seed(); const database = f.connection.database, date = new Date("2026-01-01");
    for (const [actorId, role, workspaceId, lifecycle, index] of [
      ["p5_owner", "Owner", "p4-workspace", "Permanent", 1], ["p5_staff", "Staff", "p4-workspace", "Permanent", 2],
      ["p5_none", "Staff", "p4-workspace", "Permanent", 3], ["p5_restricted", "Staff", "p4-workspace", "Temporary", 4],
      ["p5_foreign", "Owner", "p4-foreign", "Permanent", 5],
    ] as const) {
      const scope = { workspaceId, actorId, createdAt: date, updatedAt: date };
      await database.insert(identityAccounts).values({ ...scope, username: actorId, normalizedUsername: actorId, status: "Active" });
      await database.insert(identityPasswordCredentials).values({ ...scope, passwordHash: "synthetic-unused-hash", passwordLifecycle: lifecycle, passwordVersion: 1 });
      await database.insert(identityMemberProfiles).values({ ...scope, displayName: "Synthetic QA", recoveryPhone: "+1202555000" + index, recoveryContactVersion: 1, locale: "en" });
      await database.insert(identityMemberships).values({ ...scope, role, branchScope: "AllBranches", authorizationVersion: 1 });
    }
    for (const actorId of ["p5_staff", "p5_restricted"]) for (const permissionCode of ["catalog.sharing.publicLink.manage", "catalog.products.view", "pricing.view"]) {
      await database.insert(identityMembershipPermissions).values({ workspaceId: "p4-workspace", actorId, permissionCode });
    }
  };
  return { ...f, seed, clock, identity, session, resolver, request, handlers, application };
};
