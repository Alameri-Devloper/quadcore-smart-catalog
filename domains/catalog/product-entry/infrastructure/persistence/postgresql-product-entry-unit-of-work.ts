import type { CatalogDatabase } from "../../../infrastructure/persistence/database";
import { PostgreSqlProductRepository } from "../../../infrastructure/persistence/postgresql-product.repository";
import type { ProductEntryProductCodeAllocator, ProductEntryProductIdAllocator } from "../../ports/product-entry-identity-allocator.port";
import type { ProductEntryTransactionDecision, ProductEntryTransactionalContext, ProductEntryUnitOfWork } from "../../ports/product-entry-unit-of-work.port";
import { FallbackUuidProductEntryProductCodeAllocator, RandomProductEntryProductIdAllocator } from "../product-entry-random-identity-allocator";
import { PostgreSqlProductEntryAuditRepository } from "./postgresql-product-entry-audit.repository";
import { PostgreSqlProductEntryMediaPlanRepository } from "./postgresql-product-entry-media-plan.repository";
import { PostgreSqlProductEntrySubmissionRepository } from "./postgresql-product-entry-submission.repository";

class ExpectedProductEntryRollback<T> extends Error {
  constructor(readonly result: T) {
    super("Expected Product Entry transaction rollback.");
  }
}

export class PostgreSqlProductEntryUnitOfWork implements ProductEntryUnitOfWork {
  constructor(
    private readonly database: CatalogDatabase,
    private readonly productIdAllocator: ProductEntryProductIdAllocator = new RandomProductEntryProductIdAllocator(),
    private readonly productCodeAllocator: ProductEntryProductCodeAllocator = new FallbackUuidProductEntryProductCodeAllocator(),
  ) {}

  async execute<T>(work: (context: ProductEntryTransactionalContext) => Promise<ProductEntryTransactionDecision<T>>): Promise<T> {
    try {
      return await this.database.transaction(async (transaction) => {
        const database = transaction as unknown as CatalogDatabase;
        const context: ProductEntryTransactionalContext = Object.freeze({
          productRepository: PostgreSqlProductRepository.transactional(database),
          submissionRepository: new PostgreSqlProductEntrySubmissionRepository(database),
          mediaPlanRepository: new PostgreSqlProductEntryMediaPlanRepository(database),
          auditRepository: new PostgreSqlProductEntryAuditRepository(database),
          productIdAllocator: this.productIdAllocator,
          productCodeAllocator: this.productCodeAllocator,
        });
        const decision = await work(context);
        if (decision.type === "Rollback") throw new ExpectedProductEntryRollback(decision.result);
        return decision.result;
      });
    } catch (error) {
      if (error instanceof ExpectedProductEntryRollback) return error.result;
      throw error;
    }
  }
}
