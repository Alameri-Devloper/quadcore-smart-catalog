import { createCatalogDatabaseConnection, type CatalogDatabaseConnection } from "../../infrastructure/persistence/database";
import { GetProductEntrySubmissionUseCase } from "../application/get-product-entry-submission.use-case";
import { SubmitProductEntryUseCase } from "../application/submit-product-entry.use-case";
import { systemProductEntryClock } from "../ports/product-entry-clock.port";
import type { ProductEntryTrustedContextResolver } from "../ports/product-entry-trusted-context.port";
import { productPublicationRequirementsFromEnvironment } from "./configured-product-publication-requirements-resolver";
import { productEntryTrustedContextResolverForEnvironment } from "./environment-product-entry-trusted-context";
import { PostgreSqlProductEntryUnitOfWork } from "./persistence/postgresql-product-entry-unit-of-work";

export interface ProductEntryServerApplication {
  readonly submit: SubmitProductEntryUseCase;
  readonly get: GetProductEntrySubmissionUseCase;
  close(): Promise<void>;
}

export interface ProductEntryServerRuntime {
  readonly trustedContextResolver: ProductEntryTrustedContextResolver;
  open(needsPublicationRequirements: boolean): ProductEntryServerApplication;
}

const openProductEntryServerApplication = (
  needsPublicationRequirements: boolean,
): ProductEntryServerApplication => {
  const requirementsResolver = needsPublicationRequirements
    ? productPublicationRequirementsFromEnvironment()
    : { resolve: async () => { throw new Error("Product publication requirements are unavailable for this operation."); } };
  const connection: CatalogDatabaseConnection = createCatalogDatabaseConnection();
  const unitOfWork = new PostgreSqlProductEntryUnitOfWork(connection.database);
  return {
    submit: new SubmitProductEntryUseCase({
      unitOfWork,
      requirementsResolver,
      clock: systemProductEntryClock,
    }),
    get: new GetProductEntrySubmissionUseCase(unitOfWork),
    close: () => connection.close(),
  };
};

export const createProductEntryServerRuntime = (
  trustedContextResolver: ProductEntryTrustedContextResolver = productEntryTrustedContextResolverForEnvironment(),
): ProductEntryServerRuntime => Object.freeze({
  trustedContextResolver,
  open: openProductEntryServerApplication,
});
