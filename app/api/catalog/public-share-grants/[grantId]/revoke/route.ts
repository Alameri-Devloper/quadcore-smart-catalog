import { openPublicProductShareServerApplication } from "@/app/api/catalog/public-product-share-server-runtime";
import { createPublicProductShareRouteHandlers } from "@/domains/catalog/sharing/infrastructure/http/public-product-share-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createPublicProductShareRouteHandlers(openPublicProductShareServerApplication);
export async function POST(request: Request, context: { readonly params: Promise<{ readonly grantId: string }> }) {
  const params = await context.params;
  return handlers.revoke(request, params.grantId);
}
