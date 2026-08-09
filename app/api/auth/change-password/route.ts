import { createIdentityAuthRouteHandlers } from "@/domains/identity/infrastructure/http/identity-auth-route-handlers";
import { openIdentityServerApplication } from "@/domains/identity/infrastructure/identity-server-runtime";

export const runtime = "nodejs";

export const POST = (request: Request): Promise<Response> =>
  createIdentityAuthRouteHandlers(openIdentityServerApplication).changePassword(request);
