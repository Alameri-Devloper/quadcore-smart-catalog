import { createBranchProductRouteHandlers } from "@/domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers";
import { openBranchProductServerApplication } from "@/domains/catalog/branch-products/infrastructure/branch-product-server-runtime";

export const runtime = "nodejs";

type Context = { params: Promise<{ productId: string }> };

export const GET = async (request: Request, context: Context) => {
  const { productId } = await context.params;
  return createBranchProductRouteHandlers(openBranchProductServerApplication)
    .getWorkspacePricingManagement(request, productId);
};
