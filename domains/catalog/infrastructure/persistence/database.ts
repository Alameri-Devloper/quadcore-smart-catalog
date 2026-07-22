import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export type CatalogDatabase = NodePgDatabase<typeof schema>;

export interface CatalogDatabaseConnection {
  readonly database: CatalogDatabase;
  close(): Promise<void>;
}

const sslConfiguration = (): PoolConfig["ssl"] => {
  const value = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (!value || value === "false") return undefined;
  if (value === "true") return { rejectUnauthorized: true };
  if (value === "no-verify") return { rejectUnauthorized: false };
  throw new Error("DATABASE_SSL must be false, true, or no-verify.");
};

export const createCatalogDatabaseConnection = (
  connectionString = process.env.DATABASE_URL,
): CatalogDatabaseConnection => {
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const pool = new Pool({ connectionString, ssl: sslConfiguration() });
  return {
    database: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
};
