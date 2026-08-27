import { createDirectProductShareRouteHandlers } from "../../../../../../domains/catalog/sharing/infrastructure/http/direct-product-share-route-handlers";
import { openDirectProductShareServerApplication } from "../../../direct-product-share-server-runtime";

export const runtime = "nodejs";
export const POST = (request: Request, context: { readonly params: Promise<{ readonly productId: string }> }) =>
  context.params.then(({ productId }) => createDirectProductShareRouteHandlers(openDirectProductShareServerApplication).create(request, productId));
