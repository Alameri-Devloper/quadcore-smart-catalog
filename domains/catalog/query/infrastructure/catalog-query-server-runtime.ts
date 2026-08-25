import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { GetCatalogFilterOptionsUseCase, GetCatalogProductDetailsUseCase, SearchCatalogProductsUseCase } from "../application/catalog-query.use-cases";
import { PostgreSqlCatalogQueryRepository } from "./persistence/postgresql-catalog-query.repository";

export const openCatalogQueryServerApplication = () => {
  const connection = createPlatformDatabaseConnection(); const repository = new PostgreSqlCatalogQueryRepository(connection.database);
  return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(), search: new SearchCatalogProductsUseCase(repository), details: new GetCatalogProductDetailsUseCase(repository), filters: new GetCatalogFilterOptionsUseCase(repository), close: () => connection.close() });
};
export type CatalogQueryServerApplication = ReturnType<typeof openCatalogQueryServerApplication>;
