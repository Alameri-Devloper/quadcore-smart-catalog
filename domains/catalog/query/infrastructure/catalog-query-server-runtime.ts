import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { LocalProductMediaReaderAdapter } from "../../media/infrastructure/local-product-media-reader.adapter";
import { DownloadCatalogProductMediaUseCase, GetCatalogFilterOptionsUseCase, GetCatalogProductDetailsUseCase, SearchCatalogProductsUseCase, SearchOperationalProductsUseCase } from "../application/catalog-query.use-cases";
import { PostgreSqlCatalogQueryRepository } from "./persistence/postgresql-catalog-query.repository";

export const openCatalogQueryServerApplication = () => {
  const connection = createPlatformDatabaseConnection(); const repository = new PostgreSqlCatalogQueryRepository(connection.database);
  return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(), search: new SearchCatalogProductsUseCase(repository), operationalSearch: new SearchOperationalProductsUseCase(repository), details: new GetCatalogProductDetailsUseCase(repository), filters: new GetCatalogFilterOptionsUseCase(repository), media: new DownloadCatalogProductMediaUseCase(repository, new LocalProductMediaReaderAdapter()), close: () => connection.close() });
};
export type CatalogQueryServerApplication = ReturnType<typeof openCatalogQueryServerApplication>;
