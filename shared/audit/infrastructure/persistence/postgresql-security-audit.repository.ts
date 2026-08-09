import { randomUUID } from "node:crypto";
import type { PlatformDatabase } from "../../../infrastructure/persistence/database";
import type { SecurityAuditPort, SecurityAuditRecord } from "../../audit.port";
import { securityAuditEvents } from "./schema";

const FORBIDDEN_METADATA_KEY = /password|credential|hash|otp|digest|secret|token/i;
const isForbiddenMetadataKey = (key: string): boolean =>
  key !== "passwordVersion" && FORBIDDEN_METADATA_KEY.test(key);

export class PostgreSqlSecurityAuditRepository implements SecurityAuditPort {
  constructor(private readonly database: PlatformDatabase) {}

  async append(records: readonly SecurityAuditRecord[]): Promise<void> {
    if (records.length === 0) return;
    for (const record of records) {
      if (Object.keys(record.metadata ?? {}).some(isForbiddenMetadataKey)) {
        throw new Error("UnsafeSecurityAuditMetadata");
      }
    }
    await this.database.insert(securityAuditEvents).values(records.map((record) => ({
      workspaceId: record.workspaceId.value,
      auditId: randomUUID(),
      eventType: record.eventType,
      actorId: record.actorId?.value ?? null,
      subjectActorId: record.subjectActorId?.value ?? null,
      resultCode: record.resultCode,
      metadata: record.metadata ?? {},
      occurredAt: record.occurredAt,
    })));
  }
}
