import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { CatalogReferenceDataTransactionContext, CatalogReferenceDataUnitOfWork } from "../../ports/catalog-reference-data-unit-of-work.port";
import { PostgreSqlCatalogReferenceAuditRepository, PostgreSqlCatalogReferenceDataRepository } from "./postgresql-catalog-reference-data.repository";

export class CatalogReferencePersistenceConflictError extends Error {
  constructor() { super("CatalogReferencePersistenceConflict"); this.name = "CatalogReferencePersistenceConflictError"; }
}

export class PostgreSqlCatalogReferenceDataUnitOfWork implements CatalogReferenceDataUnitOfWork {
  constructor(private readonly database: PlatformDatabase) {}
  async execute<T>(work: (context: CatalogReferenceDataTransactionContext) => Promise<T>): Promise<T> {
    try {
      return await this.database.transaction(async (transaction) => work(Object.freeze({
        references: new PostgreSqlCatalogReferenceDataRepository(transaction as unknown as PlatformDatabase),
        audit: new PostgreSqlCatalogReferenceAuditRepository(transaction as unknown as PlatformDatabase),
      })));
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new CatalogReferencePersistenceConflictError();
      throw error;
    }
  }
}
