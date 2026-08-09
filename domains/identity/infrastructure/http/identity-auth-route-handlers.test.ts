import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IdentityAuthenticatedRequestContextResolver, type IdentityServerApplication } from "../identity-server-runtime";
import { AuthenticatedContextUnavailableError, RestrictedSessionContextError } from "../../../../shared/auth/trusted-actor-context";
import { createIdentityAuthRouteHandlers } from "./identity-auth-route-handlers";
import { SessionCookieAdapter, sessionCookieFromEnvironment } from "./session-cookie";
import { SameOriginRequestPolicy } from "./same-origin-request-policy";

const now = new Date("2026-08-01T00:00:00.000Z");
const browserValue = String.fromCharCode(65).repeat(43);

const application = (overrides: Partial<IdentityServerApplication> = {}): IdentityServerApplication => ({
  login: { execute: async () => ({
    ok: true,
    value: {
      opaqueValue: browserValue,
      sessionClass: "Full",
      passwordChangeRequired: false,
      absoluteExpiresAt: new Date(now.getTime() + 60_000),
    },
  }) },
  resolve: { execute: async () => ({
    ok: true,
    value: {
      sessionId: "session-a",
      sessionClass: "Full",
      passwordChangeRequired: false,
      context: {
        workspaceId: "workspace-a",
        actorId: "actor-a",
        role: "Owner",
        permissions: [],
        branchScope: { type: "AllBranches" },
        authorizationVersion: 7,
      },
      workspaceDisplayName: "Workspace A",
      username: "owner.main",
      displayName: "Owner",
    },
  }) },
  logout: { execute: async () => ({ ok: true, value: null }) },
  credentialChange: { execute: async () => ({
    ok: true,
    value: {
      opaqueValue: browserValue,
      sessionClass: "Full",
      passwordChangeRequired: false,
      absoluteExpiresAt: new Date(now.getTime() + 60_000),
    },
  }) },
  cookie: new SessionCookieAdapter({ name: "qsc_session", secure: false }),
  origin: new SameOriginRequestPolicy(),
  now: () => new Date(now),
  close: async () => undefined,
  ...overrides,
});

const writeRequest = (path: string, body: unknown, cookie?: string) => new Request(`https://qsc.example${path}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: "https://qsc.example",
    host: "qsc.example",
    ...(cookie ? { cookie } : {}),
  },
  body: JSON.stringify(body),
});

describe("Identity authentication HTTP boundary", () => {
  it("sets an HttpOnly SameSite cookie without returning the opaque value in JSON", async () => {
    let closed = 0;
    const handlers = createIdentityAuthRouteHandlers(() => application({ close: async () => { closed += 1; } }));
    const response = await handlers.login(writeRequest("/api/auth/login", {
      workspaceCode: "workspace-a",
      username: "owner.main",
      password: "Submitted password 123",
    }));
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /^qsc_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    const body = await response.text();
    assert.equal(body.includes(browserValue), false);
    assert.equal(closed, 1);
  });

  it("uses Secure and the host-only prefix in Production configuration", () => {
    const cookie = sessionCookieFromEnvironment({ NODE_ENV: "production" });
    assert.equal(cookie.configuration.name, "__Host-qsc_session");
    assert.match(cookie.serialize(browserValue, new Date(now.getTime() + 60_000), now), /; Secure;/);
  });

  it("maps enumeration-sensitive login failures to one public response", async () => {
    const handlers = createIdentityAuthRouteHandlers(() => application({
      login: { execute: async () => ({ ok: false, error: "AccountSuspended" }) },
    }));
    const response = await handlers.login(writeRequest("/api/auth/login", {
      workspaceCode: "workspace-a",
      username: "owner.main",
      password: "Submitted password 123",
    }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { type: "InvalidCredentialsOrUnavailableAccount" });
  });

  it("rejects cross-origin writes and clears the cookie on idempotent logout", async () => {
    const handlers = createIdentityAuthRouteHandlers(() => application());
    const rejected = await handlers.logout(new Request("https://qsc.example/api/auth/logout", {
      method: "POST",
      headers: { origin: "https://attacker.example", host: "qsc.example" },
    }));
    assert.equal(rejected.status, 403);
    const response = await handlers.logout(writeRequest("/api/auth/logout", {}));
    assert.equal(response.status, 204);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
  });

  it("returns a redacted current-session view and maps expired state to 401", async () => {
    const handlers = createIdentityAuthRouteHandlers(() => application());
    const response = await handlers.me(new Request("https://qsc.example/api/auth/me", {
      headers: { cookie: "qsc_session=browser-value" },
    }));
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), {
      type: "Authenticated",
      actorId: "actor-a",
      workspaceDisplayName: "Workspace A",
      username: "owner.main",
      displayName: "Owner",
      role: "Owner",
      branchScope: { type: "AllBranches" },
      passwordChangeRequired: false,
      sessionClass: "Full",
    });
    for (const sensitiveField of ["passwordVersion", "authorizationVersion", "sessionId", "opaqueValue", "digest"]) {
      assert.equal(text.includes(sensitiveField), false);
    }

    const expired = createIdentityAuthRouteHandlers(() => application({
      resolve: { execute: async () => ({ ok: false, error: "SessionExpired" }) },
    }));
    const expiredResponse = await expired.me(new Request("https://qsc.example/api/auth/me", {
      headers: { cookie: "qsc_session=browser-value" },
    }));
    assert.equal(expiredResponse.status, 401);
    assert.deepEqual(await expiredResponse.json(), { type: "AuthenticationRequired" });
  });

  it("allows restricted sessions to rotate credentials through the dedicated endpoint", async () => {
    const handlers = createIdentityAuthRouteHandlers(() => application());
    const response = await handlers.changePassword(writeRequest("/api/auth/change-password", {
      currentPassword: "Temporary pass 123",
      newPassword: "Permanent password 123",
    }, "qsc_session=restricted-browser-value"));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie")!, /^qsc_session=/);
  });

  it("creates a full trusted context only from a validated full server session", async () => {
    const full = new IdentityAuthenticatedRequestContextResolver(() => application());
    const resolved = await full.resolve(new Request("https://qsc.example/api/catalog", {
      headers: { cookie: "qsc_session=browser-value" },
    }));
    assert.equal(resolved.workspaceId, "workspace-a");
    assert.equal(resolved.actorId, "actor-a");

    const missing = new IdentityAuthenticatedRequestContextResolver(() => application());
    await assert.rejects(
      () => missing.resolve(new Request("https://qsc.example/api/catalog")),
      AuthenticatedContextUnavailableError,
    );
    const restricted = new IdentityAuthenticatedRequestContextResolver(() => application({
      resolve: { execute: async () => ({ ok: false, error: "ForbiddenForRestrictedSession" }) },
    }));
    await assert.rejects(
      () => restricted.resolve(new Request("https://qsc.example/api/catalog", {
        headers: { cookie: "qsc_session=restricted-browser-value" },
      })),
      RestrictedSessionContextError,
    );
  });
});
