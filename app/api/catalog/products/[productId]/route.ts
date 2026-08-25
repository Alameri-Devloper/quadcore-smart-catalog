import { createCatalogQueryRouteHandlers } from "../../../../../domains/catalog/query/infrastructure/http/catalog-query-route-handlers";
import { openCatalogQueryServerApplication } from "../../catalog-query-server-runtime";
export const runtime = "nodejs";
export const GET = (request: Request, context: { params: Promise<{ productId: string }> }) => context.params.then(({ productId }) => createCatalogQueryRouteHandlers(openCatalogQueryServerApplication).details(request, productId));
