import { createIdentityMemberRouteHandlers } from "@/domains/identity/infrastructure/http/identity-member-route-handlers";
import { openIdentityMemberServerApplication } from "@/domains/identity/infrastructure/identity-member-server-runtime";

export const runtime = "nodejs";
export async function POST(request: Request, context: { readonly params: Promise<{ readonly actorId: string }> }) {
  const { actorId } = await context.params;
  return createIdentityMemberRouteHandlers(openIdentityMemberServerApplication).suspend(request, actorId);
}
