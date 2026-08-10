import { createIdentityMemberRouteHandlers } from "@/domains/identity/infrastructure/http/identity-member-route-handlers";
import { openIdentityMemberServerApplication } from "@/domains/identity/infrastructure/identity-member-server-runtime";

export const runtime = "nodejs";
const handlers = () => createIdentityMemberRouteHandlers(openIdentityMemberServerApplication);
export const GET = (request: Request) => handlers().list(request);
export const POST = (request: Request) => handlers().create(request);
