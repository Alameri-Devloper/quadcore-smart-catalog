import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver, openIdentityServerApplication } from "../../../identity/infrastructure/identity-server-runtime";
import { sameOriginPolicyFromEnvironment } from "../../../identity/infrastructure/http/same-origin-request-policy";
import { PublicProductShareManagementService } from "../application/public-product-share-management.service";
import { createPublicProductShareLifecycleRuntime } from "./public-product-share-lifecycle-runtime";
import { publicShareManagementReadiness } from "./public-product-share-management-readiness";

import { publicShareManagementAdmissionPolicyFromEnvironment } from "./environment-public-share-management-admission";
import { PostgreSqlPublicShareManagementAdmission } from "./persistence/postgresql-public-share-management-admission";
/** Approved admission is mandatory; absent policy or schema never permits lifecycle work. */
export const createPublicProductShareServerApplication = () => {
  const policy = publicShareManagementAdmissionPolicyFromEnvironment();
  const connection = createPlatformDatabaseConnection(undefined, { connectionTimeoutMillis: 1000 });
  try {
    const runtime = createPublicProductShareLifecycleRuntime(connection.database);
    return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(() => openIdentityServerApplication({ connectionTimeoutMillis: 1000 })), origin: sameOriginPolicyFromEnvironment(),
      management: new PublicProductShareManagementService(runtime.lifecycle, publicShareManagementReadiness(runtime),
        new PostgreSqlPublicShareManagementAdmission(connection.database, policy)),
      close: () => connection.close() });
  } catch { void connection.close(); throw new Error("PublicShareManagementUnavailable"); }
};
export type PublicProductShareServerApplication = ReturnType<typeof createPublicProductShareServerApplication>;
