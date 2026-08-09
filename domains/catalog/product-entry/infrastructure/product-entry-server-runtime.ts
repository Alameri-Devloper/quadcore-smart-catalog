import { createCatalogDatabaseConnection, type CatalogDatabaseConnection } from "../../infrastructure/persistence/database";
import { GetProductEntrySubmissionUseCase } from "../application/get-product-entry-submission.use-case";
import { GetProductEntryProductUseCase } from "../application/get-product-entry-product.use-case";
import { GetProductEntrySubmissionMediaStatusUseCase } from "../application/get-product-entry-submission-media-status.use-case";
import { ProductEntryMediaIdempotencyKeyService } from "../application/product-entry-media-idempotency-key";
import { SubmitProductEntryUseCase } from "../application/submit-product-entry.use-case";
import { UploadProductEntrySubmissionMediaUseCase } from "../application/upload-product-entry-submission-media.use-case";
import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../../media/ports/product-image-processor";
import { LocalProductMediaStorageAdapter } from "../../media/infrastructure/local-product-media-storage.adapter";
import { SharpProductImageProcessor } from "../../media/infrastructure/sharp-product-image.processor";
import { systemProductEntryClock } from "../ports/product-entry-clock.port";
import type { ProductEntryTrustedContextResolver } from "../ports/product-entry-trusted-context.port";
import { productPublicationRequirementsFromEnvironment } from "./configured-product-publication-requirements-resolver";
import { productEntryTrustedContextResolverForEnvironment } from "./environment-product-entry-trusted-context";
import { PostgreSqlProductEntryUnitOfWork } from "./persistence/postgresql-product-entry-unit-of-work";
import { ProductEntryMediaWorkflowCoordinatorAdapter } from "./product-entry-media-workflow-coordinator.adapter";
import { SharpProductEntryMediaSourceVerifier } from "./sharp-product-entry-media-source-verifier";

export interface ProductEntryServerApplication {
  readonly submit: SubmitProductEntryUseCase;
  readonly get: GetProductEntrySubmissionUseCase;
  readonly getProduct: GetProductEntryProductUseCase;
  close(): Promise<void>;
}

export interface ProductEntryServerRuntime {
  readonly trustedContextResolver: ProductEntryTrustedContextResolver;
  open(needsPublicationRequirements: boolean): ProductEntryServerApplication;
  openMediaUpload(): Promise<ProductEntryMediaUploadServerApplication>;
  openMediaStatus(): ProductEntryMediaStatusServerApplication;
}

export interface ProductEntryMediaUploadServerApplication {
  readonly upload: UploadProductEntrySubmissionMediaUseCase;
  close(): Promise<void>;
}

export interface ProductEntryMediaStatusServerApplication {
  readonly status: GetProductEntrySubmissionMediaStatusUseCase;
  close(): Promise<void>;
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
    getProduct: new GetProductEntryProductUseCase(unitOfWork),
    close: () => connection.close(),
  };
};

const openProductEntryMediaUploadServerApplication = async (): Promise<ProductEntryMediaUploadServerApplication> => {
  const connection = createCatalogDatabaseConnection();
  try {
    const processor = new SharpProductImageProcessor();
    const storage = await LocalProductMediaStorageAdapter.createFromEnvironment(processor);
    const unitOfWork = new PostgreSqlProductEntryUnitOfWork(connection.database);
    const coordinator = new ProductEntryMediaWorkflowCoordinatorAdapter(
      connection.database,
      processor,
      DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
      storage,
    );
    return {
      upload: new UploadProductEntrySubmissionMediaUseCase({
        unitOfWork,
        sourceVerifier: new SharpProductEntryMediaSourceVerifier(
          processor,
          DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
        ),
        idempotencyKeys: new ProductEntryMediaIdempotencyKeyService(),
        workflowCoordinator: coordinator,
        clock: systemProductEntryClock,
      }),
      close: () => connection.close(),
    };
  } catch (error) {
    await connection.close();
    throw error;
  }
};

const openProductEntryMediaStatusServerApplication = (): ProductEntryMediaStatusServerApplication => {
  const connection = createCatalogDatabaseConnection();
  const processor = new SharpProductImageProcessor();
  const unitOfWork = new PostgreSqlProductEntryUnitOfWork(connection.database);
  const coordinator = new ProductEntryMediaWorkflowCoordinatorAdapter(
    connection.database,
    processor,
    DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
    undefined,
  );
  return {
    status: new GetProductEntrySubmissionMediaStatusUseCase(
      unitOfWork,
      coordinator,
      new ProductEntryMediaIdempotencyKeyService(),
    ),
    close: () => connection.close(),
  };
};

export const createProductEntryServerRuntime = (
  trustedContextResolver: ProductEntryTrustedContextResolver = productEntryTrustedContextResolverForEnvironment(),
): ProductEntryServerRuntime => Object.freeze({
  trustedContextResolver,
  open: openProductEntryServerApplication,
  openMediaUpload: openProductEntryMediaUploadServerApplication,
  openMediaStatus: openProductEntryMediaStatusServerApplication,
});
