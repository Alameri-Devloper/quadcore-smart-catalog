import { and, asc, eq } from "drizzle-orm";
import type { CatalogDatabase } from "../../../infrastructure/persistence/database";
import { catalogProductEntrySubmissionMediaOperations } from "../../../infrastructure/persistence/schema";
import { WorkspaceId } from "../../../types/product-identity.value-object";
import { ProductEntryMediaOperation, type ProductEntryMediaOperationType } from "../../domain/product-entry-media-plan";
import { ProductEntrySubmissionId } from "../../domain/product-entry-submission";
import type { ProductEntrySubmissionMediaPlanRepository } from "../../repositories/product-entry-media-plan.repository";

export class PostgreSqlProductEntryMediaPlanRepository implements ProductEntrySubmissionMediaPlanRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async save(operations: readonly ProductEntryMediaOperation[]): Promise<void> {
    if (operations.length === 0) return;
    await this.database.insert(catalogProductEntrySubmissionMediaOperations).values(operations.map((operation) => ({
      workspaceId: operation.workspaceId.value,
      submissionId: operation.submissionId.value,
      operationId: operation.operationId,
      operationType: operation.operationType,
      sequence: operation.sequence,
      mediaId: operation.mediaId,
      requestedDisplayOrder: operation.requestedDisplayOrder,
      selectedAsCover: operation.selectedAsCover,
      expectedSourceSha256: operation.expectedSourceSha256,
      expectedSourceByteLength: operation.expectedSourceByteLength,
      finalOrder: operation.finalOrder,
      createdAt: operation.createdAt,
    })));
  }

  async findBySubmission(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId): Promise<readonly ProductEntryMediaOperation[]> {
    const rows = await this.database.select().from(catalogProductEntrySubmissionMediaOperations).where(and(
      eq(catalogProductEntrySubmissionMediaOperations.workspaceId, workspaceId.value),
      eq(catalogProductEntrySubmissionMediaOperations.submissionId, submissionId.value),
    )).orderBy(asc(catalogProductEntrySubmissionMediaOperations.sequence));
    return Object.freeze(rows.map((row) => new ProductEntryMediaOperation({
      workspaceId: WorkspaceId.create(row.workspaceId),
      submissionId: ProductEntrySubmissionId.create(row.submissionId),
      operationId: row.operationId,
      operationType: row.operationType as ProductEntryMediaOperationType,
      sequence: row.sequence,
      mediaId: row.mediaId,
      requestedDisplayOrder: row.requestedDisplayOrder,
      selectedAsCover: row.selectedAsCover,
      expectedSourceSha256: row.expectedSourceSha256,
      expectedSourceByteLength: row.expectedSourceByteLength,
      finalOrder: row.finalOrder,
      createdAt: row.createdAt,
    })));
  }
}
