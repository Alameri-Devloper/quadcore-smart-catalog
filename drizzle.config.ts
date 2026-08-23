import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Drizzle Kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./domains/catalog/infrastructure/persistence/schema.ts",
    "./domains/workspace/infrastructure/persistence/schema.ts",
    "./domains/identity/infrastructure/persistence/schema.ts",
    "./domains/inventory/infrastructure/persistence/schema.ts",
    "./shared/audit/infrastructure/persistence/schema.ts",
  ],
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
