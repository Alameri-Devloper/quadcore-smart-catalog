import {
  AuthenticatedContextUnavailableError,
  RestrictedSessionContextError,
} from "../../../../shared/auth/trusted-actor-context";
import type { OperationalManagementCapabilityServerApplicationFactory } from "../operational-management-capability-server-runtime";

const json = (body: unknown, status: number): Response => Response.json(body, {
  status,
  headers: { "cache-control": "private, no-store" },
});

export const createOperationalManagementCapabilityRouteHandler = (
  open: OperationalManagementCapabilityServerApplicationFactory,
) => async (request: Request): Promise<Response> => {
  if (new URL(request.url).search) return json({ type: "InvalidQuery" }, 400);

  try {
    const application = open();
    const context = await application.context.resolve(request);
    return json(application.capabilities.execute(context), 200);
  } catch (error) {
    if (error instanceof AuthenticatedContextUnavailableError) {
      return json({ type: "AuthenticationRequired" }, 401);
    }
    if (error instanceof RestrictedSessionContextError) {
      return json({ type: "ForbiddenForRestrictedSession" }, 403);
    }
    return json({ type: "OperationalManagementCapabilityServiceUnavailable" }, 503);
  }
};
