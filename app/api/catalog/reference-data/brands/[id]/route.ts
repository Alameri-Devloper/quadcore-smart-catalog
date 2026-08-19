import { createCatalogReferenceDataRouteHandlers } from "@/domains/catalog/reference-data/infrastructure/http/catalog-reference-data-route-handlers";
import { openCatalogReferenceDataServerApplication } from "@/domains/catalog/reference-data/infrastructure/catalog-reference-data-server-runtime";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { readonly params: Promise<{ readonly id: string }> }) { const { id } = await context.params; return createCatalogReferenceDataRouteHandlers(openCatalogReferenceDataServerApplication).updateBrand(request, id); }
