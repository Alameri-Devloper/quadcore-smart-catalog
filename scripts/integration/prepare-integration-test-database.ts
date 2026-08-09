import { pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { assertSafeIntegrationTestDatabaseUrl } from "../../domains/catalog/infrastructure/persistence/integration-test-database-safety";
import { createPlatformDatabaseConnection } from "../../shared/infrastructure/persistence/database";

export const prepareIntegrationTestDatabase = async (): Promise<void> => {
  const connectionUrl = process.env.TEST_DATABASE_URL;
  assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
  const connection = createPlatformDatabaseConnection(connectionUrl);
  try {
    await migrate(connection.database, { migrationsFolder: "drizzle" });
  } finally {
    await connection.close();
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  void prepareIntegrationTestDatabase().catch(() => {
    process.stderr.write("IntegrationDatabasePreparationFailed\n");
    process.exitCode = 1;
  });
}
