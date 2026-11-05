import { parseCatalogSpecificationPresentationProfiles } from "./catalog-specification-presentation-config";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { LocalProductMediaReaderAdapter } from "../../media/infrastructure/local-product-media-reader.adapter";
import { DownloadCatalogProductMediaUseCase, GetCatalogFilterOptionsUseCase, GetCatalogProductDetailsUseCase, SearchCatalogProductsUseCase, SearchOperationalProductsUseCase } from "../application/catalog-query.use-cases";
import { PostgreSqlCatalogQueryRepository } from "./persistence/postgresql-catalog-query.repository";

export const openCatalogQueryServerApplication = () => {
  const specificationProfiles = parseCatalogSpecificationPresentationProfiles(process.env.CATALOG_SPECIFICATION_PRESENTATION_PROFILES);
  const connection = createPlatformDatabaseConnection(); const repository = new PostgreSqlCatalogQueryRepository(connection.database);
  return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(), search: new SearchCatalogProductsUseCase(repository, specificationProfiles), operationalSearch: new SearchOperationalProductsUseCase(repository), details: new GetCatalogProductDetailsUseCase(repository, specificationProfiles), filters: new GetCatalogFilterOptionsUseCase(repository, specificationProfiles), media: new DownloadCatalogProductMediaUseCase(repository, new LocalProductMediaReaderAdapter()), close: () => connection.close() });
};
export type CatalogQueryServerApplication = ReturnType<typeof openCatalogQueryServerApplication>;
