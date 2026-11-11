import { pathToFileURL } from 'node:url';
import { createPlatformDatabaseConnection } from '../../shared/infrastructure/persistence/database';
import { publicShareManagementAdmissionPolicyFromEnvironment } from '../../domains/catalog/sharing/infrastructure/environment-public-share-management-admission';
import { PostgreSqlPublicShareManagementAdmission } from '../../domains/catalog/sharing/infrastructure/persistence/postgresql-public-share-management-admission';

/** Explicit operator action only. Does not migrate, schedule, or print counter identities. */
export const cleanupManagementAdmission = async (): Promise<number> => {
  const policy = publicShareManagementAdmissionPolicyFromEnvironment();
  const connection = createPlatformDatabaseConnection(process.env.DATABASE_URL, { connectionTimeoutMillis: 1000 });
  try { return await new PostgreSqlPublicShareManagementAdmission(connection.database, policy).cleanup(); }
  finally { await connection.close(); }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void cleanupManagementAdmission().then((removed) => {
    process.stdout.write(`ManagementAdmissionCleanupRemoved:${removed}\n`);
  }).catch(() => {
    process.stderr.write('ManagementAdmissionCleanupUnavailable\n');
    process.exitCode = 1;
  });
}
