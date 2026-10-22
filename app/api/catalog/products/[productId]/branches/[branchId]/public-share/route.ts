import { openPublicProductShareServerApplication } from "@/app/api/catalog/public-product-share-server-runtime";
import { createPublicProductShareRouteHandlers } from "@/domains/catalog/sharing/infrastructure/http/public-product-share-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createPublicProductShareRouteHandlers(openPublicProductShareServerApplication);
export async function POST(request: Request, context: { readonly params: Promise<{ readonly productId: string; readonly branchId: string }> }) {
  const params = await context.params;
  return handlers.issue(request, params.productId, params.branchId);
}
export async function GET(request: Request, context: { readonly params: Promise<{ readonly productId: string; readonly branchId: string }> }) {
  const params = await context.params;
  return handlers.copy(request, params.productId, params.branchId);
}
