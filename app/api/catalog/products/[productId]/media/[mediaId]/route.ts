import { createCatalogQueryRouteHandlers } from "@/domains/catalog/query/infrastructure/http/catalog-query-route-handlers";
import { openCatalogQueryServerApplication } from "../../../../catalog-query-server-runtime";

export const runtime = "nodejs";

export const GET = (request: Request, context: { readonly params: Promise<{ readonly productId: string; readonly mediaId: string }> }) =>
  context.params.then(({ productId, mediaId }) => createCatalogQueryRouteHandlers(openCatalogQueryServerApplication).media(request, productId, mediaId));
