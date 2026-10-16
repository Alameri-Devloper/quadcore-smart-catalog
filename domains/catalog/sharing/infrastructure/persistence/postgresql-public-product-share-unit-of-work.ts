import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { PublicProductShareUnitOfWork, PublicProductShareTransactionContext, PublicProductShareTransactionDecision } from "../../ports/public-product-share-unit-of-work.port";
import { PostgreSqlPublicProductShareGrantRepository } from "./postgresql-public-product-share-grant.repository";
import { PostgreSqlPublicProductShareResource } from "./postgresql-public-product-share-resource";
import { PostgreSqlPublicProductShareAudit } from "./postgresql-public-product-share-audit";
import { publicShareDatabaseFailure } from "./public-share-persistence";

class SharingRollback<T> extends Error {
  constructor(readonly value: T) { super('PublicShareRollback'); }
}

export class PostgreSqlPublicProductShareUnitOfWork implements PublicProductShareUnitOfWork {
  constructor(private readonly database: PlatformDatabase) {}
  async execute<T>(work: (context: PublicProductShareTransactionContext) => Promise<PublicProductShareTransactionDecision<T>>): Promise<T> {
    try {
      return await this.database.transaction(async (transaction) => {
        const decision = await work(Object.freeze({ grants: new PostgreSqlPublicProductShareGrantRepository(transaction),
          resources: new PostgreSqlPublicProductShareResource(transaction), audit: new PostgreSqlPublicProductShareAudit(transaction) }));
        if (decision.type === 'Rollback') throw new SharingRollback(decision.value);
        return decision.value;
      }, { isolationLevel: 'read committed' });
    } catch (error) {
      if (error instanceof SharingRollback) return error.value;
      throw publicShareDatabaseFailure(error);
    }
  }
}
