import { ProductEntryCatalogReferenceDataCoordinator } from "../../presentation/product-entry-catalog-reference-data.coordinator";
import { HttpProductEntryCatalogReferenceDataClient } from "./http-product-entry-catalog-reference-data.client";

export const createProductionProductEntryCatalogReferenceDataCoordinator = (
  fetcher: typeof fetch = fetch,
): ProductEntryCatalogReferenceDataCoordinator =>
  new ProductEntryCatalogReferenceDataCoordinator(
    new HttpProductEntryCatalogReferenceDataClient(fetcher),
  );
