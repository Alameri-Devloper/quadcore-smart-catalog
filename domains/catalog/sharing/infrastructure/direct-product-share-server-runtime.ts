import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { SameOriginRequestPolicy, sameOriginPolicyFromEnvironment } from "../../../identity/infrastructure/http/same-origin-request-policy";
import { CreateDirectProductShareUseCase, DownloadDirectProductShareMediaUseCase } from "../application/direct-product-share.use-cases";
import { LocalDirectShareMediaReaderAdapter } from "./media/local-direct-share-media-reader.adapter";
import { PostgreSqlDirectProductShareRepository } from "./persistence/postgresql-direct-product-share.repository";

export const openDirectProductShareServerApplication = () => {
  const connection = createPlatformDatabaseConnection();
  const repository = new PostgreSqlDirectProductShareRepository(connection.database);
  return Object.freeze({
    context: new IdentityAuthenticatedRequestContextResolver(),
    origin: sameOriginPolicyFromEnvironment() as SameOriginRequestPolicy,
    create: new CreateDirectProductShareUseCase(repository),
    media: new DownloadDirectProductShareMediaUseCase(repository, new LocalDirectShareMediaReaderAdapter()),
    close: () => connection.close(),
  });
};

export type DirectProductShareServerApplication = ReturnType<typeof openDirectProductShareServerApplication>;
