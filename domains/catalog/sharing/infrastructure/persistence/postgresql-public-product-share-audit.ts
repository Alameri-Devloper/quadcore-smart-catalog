import { randomUUID } from "node:crypto";
import { securityAuditEvents } from "../../../../../shared/audit/infrastructure/persistence/schema";
import type { PublicProductShareAuditRecord, PublicProductShareAuditRepository } from "../../ports/public-product-share-unit-of-work.port";
import { publicShareIdentity, type PublicShareTransaction } from "./public-share-persistence";
import { PublicSharePersistenceFailure } from "../../ports/public-share-persistence-failure";

export class PostgreSqlPublicProductShareAudit implements PublicProductShareAuditRepository {
  constructor(private readonly transaction: PublicShareTransaction) {}
  async append(record: PublicProductShareAuditRecord): Promise<void> {
    // No arbitrary metadata is accepted, even with harmless-looking key names.
    const allowed = new Set(['workspaceId','actorId','eventType','grantId','productId','branchId','occurredAt','previousGrantId']);
    if (Object.keys(record).some((key) => !allowed.has(key)) || !['PublicProductShareIssued','PublicProductShareRevoked','PublicProductShareReplaced'].includes(record.eventType)
      || !(record.occurredAt instanceof Date) || !Number.isFinite(record.occurredAt.getTime())
      || ((record.eventType === 'PublicProductShareReplaced') !== (record.previousGrantId !== undefined))) throw new PublicSharePersistenceFailure('IntegrityFailure');
    const grantId = publicShareIdentity(record.grantId);
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    if (!uuid.test(grantId) || (record.previousGrantId !== undefined && !uuid.test(record.previousGrantId))) throw new PublicSharePersistenceFailure('IntegrityFailure');
    const metadata: Record<string,string> = { grantId, productId: publicShareIdentity(record.productId), branchId: publicShareIdentity(record.branchId) };
    if (record.previousGrantId !== undefined) metadata.previousGrantId = record.previousGrantId;
    await this.transaction.insert(securityAuditEvents).values({ workspaceId: publicShareIdentity(record.workspaceId), auditId: randomUUID(),
      eventType: record.eventType, actorId: publicShareIdentity(record.actorId), subjectActorId: null, resultCode: 'Succeeded',
      occurredAt: record.occurredAt, metadata });
  }
}
