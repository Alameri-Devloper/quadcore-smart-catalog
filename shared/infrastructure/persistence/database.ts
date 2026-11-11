import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export type PlatformDatabase = NodePgDatabase<typeof schema>;

export interface PlatformDatabaseConnection {
  readonly database: PlatformDatabase;
  close(): Promise<void>;
}

const sslConfiguration = (): PoolConfig["ssl"] => {
  const value = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (!value || value === "false") return undefined;
  if (value === "true") return { rejectUnauthorized: true };
  if (value === "no-verify") return { rejectUnauthorized: false };
  throw new Error("DATABASE_SSL must be false, true, or no-verify.");
};

export const createPlatformDatabaseConnection = (
  connectionString = process.env.DATABASE_URL,
  options: Readonly<{ connectionTimeoutMillis?: number }> = {},
): PlatformDatabaseConnection => {
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (options.connectionTimeoutMillis !== undefined && (!Number.isSafeInteger(options.connectionTimeoutMillis)
    || options.connectionTimeoutMillis < 1 || options.connectionTimeoutMillis > 30_000)) throw new Error("DatabaseConnectionTimeoutInvalid");
  const pool = new Pool({ connectionString, ssl: sslConfiguration(), ...options });
  return {
    database: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
};
