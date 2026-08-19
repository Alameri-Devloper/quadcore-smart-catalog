import { createCatalogReferenceDataRouteHandlers } from "@/domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers";
import { openCatalogReferenceDataServerApplication } from "@/domains/catalog/reference-data/infrastructure/catalog-reference-data-server-runtime";
export const runtime = "nodejs";
export const POST = (request: Request) => createCatalogReferenceDataRouteHandlers(openCatalogReferenceDataServerApplication).createBrand(request);
