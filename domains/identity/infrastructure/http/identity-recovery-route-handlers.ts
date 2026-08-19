import type { IdentityRecoveryServerApplication, IdentityRecoveryServerApplicationFactory } from "../identity-recovery-server-runtime";

const json = (body: unknown, status: number): Response => Response.json(body, {
  status,
  headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
});

const unavailable = (): Response => json({ type: "RecoveryUnavailable" }, 503);

const readExactStrings = async (request: Request, keys: readonly string[]): Promise<Readonly<Record<string, string>> | null> => {
  try {
    const value = await request.json() as unknown;
    if (!value || Array.isArray(value) || typeof value !== "object") return null;
    const record = value as Readonly<Record<string, unknown>>;
    if (Object.keys(record).length !== keys.length || keys.some((key) => typeof record[key] !== "string")) return null;
    return Object.freeze(Object.fromEntries(keys.map((key) => [key, record[key] as string])));
  } catch {
    return null;
  }
};

const withApplication = async (
  open: IdentityRecoveryServerApplicationFactory,
  request: Request,
  work: (application: IdentityRecoveryServerApplication) => Promise<Response>,
): Promise<Response> => {
  let application: IdentityRecoveryServerApplication | undefined;
  try {
    application = open();
    if (!application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    if (!application.recovery.available) return unavailable();
    return await work(application);
  } catch {
    return unavailable();
  } finally {
    try { await application?.close(); }
    catch { /* A completed public response remains fail-closed. */ }
  }
};

export const createIdentityRecoveryRouteHandlers = (open: IdentityRecoveryServerApplicationFactory) => ({
  request: (request: Request): Promise<Response> => withApplication(open, request, async (application) => {
    const fields = await readExactStrings(request, ["workspaceCode", "username"]);
    if (!fields) return json({ type: "RecoveryRequestInvalid" }, 400);
    const result = await application.recovery.request({
      workspaceCode: fields.workspaceCode!,
      username: fields.username!,
    });
    if (result.type === "RecoveryRequestInvalid") return json(result, 400);
    if (result.type === "RecoveryUnavailable") return unavailable();
    return json(result, 202);
  }),

  resend: (request: Request): Promise<Response> => withApplication(open, request, async (application) => {
    const fields = await readExactStrings(request, ["recoveryReference"]);
    if (!fields) return json({ type: "RecoveryFlowInvalid" }, 400);
    const result = await application.recovery.resend({ recoveryReference: fields.recoveryReference! });
    if (result.type === "RecoveryUnavailable") return unavailable();
    if (result.type === "RecoveryResendThrottled") return json(result, 429);
    if (result.type === "RecoveryFlowInvalid") return json(result, 409);
    return json(result, 202);
  }),

  verify: (request: Request): Promise<Response> => withApplication(open, request, async (application) => {
    const fields = await readExactStrings(request, ["recoveryReference", "otp"]);
    if (!fields || !/^[0-9]{8}$/.test(fields.otp ?? "")) {
      return json({ type: "RecoveryCodeInvalidOrExpired" }, 400);
    }
    const result = await application.recovery.verify({
      recoveryReference: fields.recoveryReference!,
      otp: fields.otp!,
    });
    if (result.type === "RecoveryUnavailable") return unavailable();
    if (result.type === "RecoveryCodeInvalidOrExpired") return json(result, 400);
    return json(result, 200);
  }),

  reset: (request: Request): Promise<Response> => withApplication(open, request, async (application) => {
    const fields = await readExactStrings(request, ["recoveryReference", "newPassword"]);
    if (!fields) return json({ type: "RecoveryResetInvalid" }, 400);
    const result = await application.recovery.reset(Object.freeze({ ...fields }) as {
      readonly recoveryReference: string;
      readonly newPassword: string;
    });
    if (result.type === "RecoveryUnavailable") return unavailable();
    if (result.type === "RecoveryResetConflict") return json(result, 409);
    if (result.type === "RecoveryResetInvalid") return json(result, 400);
    return json(result, 200);
  }),
});
