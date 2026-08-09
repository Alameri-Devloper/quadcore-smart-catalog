import type { IdentityErrorCode, IdentityResult } from "../../application/identity-results";
import type { LoginSessionResult } from "../../application/session.use-cases";
import type { RotatedSessionResult } from "../../application/change-password-and-rotate-session.use-case";
import type { IdentityServerApplication, IdentityServerApplicationFactory } from "../identity-server-runtime";

const json = (body: unknown, status: number, headers?: HeadersInit): Response => Response.json(body, {
  status,
  headers: { "cache-control": "no-store", ...headers },
});

const unavailable = (): Response => json({ type: "AuthenticationServiceUnavailable" }, 503);

const loginFailure = (error: IdentityErrorCode): Response => {
  if (error === "LoginTemporarilyUnavailable") return json({ type: "LoginTemporarilyUnavailable" }, 429);
  if (error === "InfrastructureUnavailable" || error === "SessionCreateConflict") return unavailable();
  return json({ type: "InvalidCredentialsOrUnavailableAccount" }, 401);
};

const invalidSession = (error: IdentityErrorCode): Response => error === "InfrastructureUnavailable" || error === "SessionCreateConflict"
  ? unavailable()
  : json({ type: "AuthenticationRequired" }, 401);

const readObject = async (request: Request): Promise<Readonly<Record<string, unknown>> | null> => {
  try {
    const value = await request.json() as unknown;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Readonly<Record<string, unknown>>
      : null;
  } catch {
    return null;
  }
};

const stringFields = (
  value: Readonly<Record<string, unknown>> | null,
  keys: readonly string[],
): Readonly<Record<string, string>> | null => {
  if (!value || Object.keys(value).length !== keys.length || keys.some((key) => typeof value[key] !== "string")) return null;
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key] as string])));
};

const withApplication = async (
  open: IdentityServerApplicationFactory,
  work: (application: IdentityServerApplication) => Promise<Response>,
): Promise<Response> => {
  let application: IdentityServerApplication | undefined;
  try {
    application = open();
    return await work(application);
  } catch {
    return unavailable();
  } finally {
    try { await application?.close(); }
    catch { /* The response is already fail-closed or completed. */ }
  }
};

const authenticatedCookieResponse = (
  application: IdentityServerApplication,
  result: IdentityResult<LoginSessionResult | RotatedSessionResult>,
): Response => {
  if (!result.ok) return loginFailure(result.error);
  return json({
    type: "LoginSucceeded",
    sessionClass: result.value.sessionClass,
    passwordChangeRequired: result.value.passwordChangeRequired,
  }, 200, {
    "set-cookie": application.cookie.serialize(result.value.opaqueValue, result.value.absoluteExpiresAt, application.now()),
  });
};

export const createIdentityAuthRouteHandlers = (open: IdentityServerApplicationFactory) => ({
  login: (request: Request): Promise<Response> => withApplication(open, async (application) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const fields = stringFields(await readObject(request), ["workspaceCode", "username", "password"]);
    if (!fields) return json({ type: "InvalidCredentialsOrUnavailableAccount" }, 401);
    return authenticatedCookieResponse(application, await application.login.execute({
      workspaceCode: fields.workspaceCode!,
      username: fields.username!,
      password: fields.password!,
    }));
  }),

  logout: (request: Request): Promise<Response> => withApplication(open, async (application) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const result = await application.logout.execute(application.cookie.read(request));
    return new Response(null, {
      status: result.ok ? 204 : 503,
      headers: { "cache-control": "no-store", "set-cookie": application.cookie.clear() },
    });
  }),

  changePassword: (request: Request): Promise<Response> => withApplication(open, async (application) => {
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const rawSessionValue = application.cookie.read(request);
    if (!rawSessionValue) return json({ type: "AuthenticationRequired" }, 401, { "set-cookie": application.cookie.clear() });
    const fields = stringFields(await readObject(request), ["currentPassword", "newPassword"]);
    if (!fields) return json({ type: "InvalidRequest" }, 400);
    const current = fields.currentPassword!;
    const next = fields.newPassword!;
    const result = await application.credentialChange.execute({
      rawSessionValue,
      currentPassword: current,
      newPassword: next,
    });
    if (!result.ok) {
      if (result.error === "PasswordInvalid") return json({ type: "PasswordInvalid" }, 400);
      if (result.error === "InvalidCurrentPassword") return json({ type: "InvalidCurrentPassword" }, 400);
      return invalidSession(result.error);
    }
    return authenticatedCookieResponse(application, result);
  }),

  me: (request: Request): Promise<Response> => withApplication(open, async (application) => {
    const rawSessionValue = application.cookie.read(request);
    if (!rawSessionValue) return json({ type: "AuthenticationRequired" }, 401);
    const result = await application.resolve.execute({ rawSessionValue, requiredClass: "Any" });
    if (!result.ok) return invalidSession(result.error);
    return json({
      type: "Authenticated",
      actorId: result.value.context.actorId,
      workspaceDisplayName: result.value.workspaceDisplayName,
      username: result.value.username,
      displayName: result.value.displayName,
      role: result.value.context.role,
      branchScope: result.value.context.branchScope,
      passwordChangeRequired: result.value.passwordChangeRequired,
      sessionClass: result.value.sessionClass,
    }, 200);
  }),
});
