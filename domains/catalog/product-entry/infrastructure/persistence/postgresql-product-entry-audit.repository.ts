import { randomUUID } from "node:crypto";
import type { CatalogDatabase } from "../../../infrastructure/persistence/database";
import { catalogProductEntryAuditRecords } from "../../../infrastructure/persistence/schema";
import type { ProductEntryAuditRecord, ProductEntryAuditRepository } from "../../repositories/product-entry-audit.repository";

export class PostgreSqlProductEntryAuditRepository implements ProductEntryAuditRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async append(records: readonly ProductEntryAuditRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.database.insert(catalogProductEntryAuditRecords).values(records.map((record) => ({
      workspaceId: record.workspaceId.value,
      auditId: randomUUID(),
      eventType: record.eventType,
      actorId: record.actorId.value,
      submissionId: record.submissionId.value,
      productId: record.productId.value,
      resultCode: record.resultCode,
      occurredAt: record.occurredAt,
    })));
  }
}
