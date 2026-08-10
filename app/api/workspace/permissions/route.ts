import { createIdentityMemberRouteHandlers } from "@/domains/identity/infrastructure/http/identity-member-route-handlers";
import { openIdentityMemberServerApplication } from "@/domains/identity/infrastructure/identity-member-server-runtime";

export const runtime = "nodejs";
export const GET = (request: Request) => createIdentityMemberRouteHandlers(openIdentityMemberServerApplication).permissionRegistry(request);
