import { randomUUID } from "node:crypto";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { sameOriginPolicyFromEnvironment } from "../../../identity/infrastructure/http/same-origin-request-policy";
import {
  ConfigureProductTypeSpecificationTemplateUseCase,
  ConfigureWorkspaceConditionsUseCase,
  ConfigureWorkspaceCurrenciesUseCase,
  CreateBrandUseCase,
  CreateCategoryUseCase,
  CreateDepartmentUseCase,
  CreateProductTypeUseCase,
  CreateSpecificationDefinitionUseCase,
  CreateSupplyStatusUseCase,
  GetCatalogReferenceDataUseCase,
  UpdateBrandUseCase,
  UpdateCategoryUseCase,
  UpdateDepartmentUseCase,
  UpdateProductTypeUseCase,
  UpdateSpecificationDefinitionUseCase,
  UpdateSupplyStatusUseCase,
} from "../application/catalog-reference-data.use-cases";
import { PostgreSqlCatalogReferenceDataUnitOfWork } from "./persistence/postgresql-catalog-reference-data-unit-of-work";

export const openCatalogReferenceDataServerApplication = () => {
  const connection = createPlatformDatabaseConnection();
  const unitOfWork = new PostgreSqlCatalogReferenceDataUnitOfWork(connection.database);
  const dependencies = Object.freeze({ unitOfWork, identifiers: { next: () => randomUUID() }, clock: { now: () => new Date() } });
  return Object.freeze({
    context: new IdentityAuthenticatedRequestContextResolver(),
    origin: sameOriginPolicyFromEnvironment(),
    get: new GetCatalogReferenceDataUseCase(unitOfWork),
    createDepartment: new CreateDepartmentUseCase(dependencies), updateDepartment: new UpdateDepartmentUseCase(dependencies),
    createCategory: new CreateCategoryUseCase(dependencies), updateCategory: new UpdateCategoryUseCase(dependencies),
    createProductType: new CreateProductTypeUseCase(dependencies), updateProductType: new UpdateProductTypeUseCase(dependencies),
    createBrand: new CreateBrandUseCase(dependencies), updateBrand: new UpdateBrandUseCase(dependencies),
    createSupplyStatus: new CreateSupplyStatusUseCase(dependencies), updateSupplyStatus: new UpdateSupplyStatusUseCase(dependencies),
    createSpecificationDefinition: new CreateSpecificationDefinitionUseCase(dependencies), updateSpecificationDefinition: new UpdateSpecificationDefinitionUseCase(dependencies),
    configureConditions: new ConfigureWorkspaceConditionsUseCase(dependencies), configureCurrencies: new ConfigureWorkspaceCurrenciesUseCase(dependencies),
    configureTemplate: new ConfigureProductTypeSpecificationTemplateUseCase(dependencies),
    close: () => connection.close(),
  });
};

export type CatalogReferenceDataServerApplication = ReturnType<typeof openCatalogReferenceDataServerApplication>;
