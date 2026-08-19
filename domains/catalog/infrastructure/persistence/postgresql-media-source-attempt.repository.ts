import { randomUUID } from "node:crypto";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import {
  deriveProductMediaWorkflowStatus,
  type ProductMediaOperationState,
} from "../../media/domain/product-media-workflow";
import type { MediaSourceAttempt, MediaSourceAttemptStatus } from "../../media/domain/media-source-attempt";
import type {
  ApplyMediaSourceAttemptResult,
  CreateMediaSourceAttemptResult,
  MediaSourceAttemptRepository,
} from "../../media/repositories/media-source-attempt.repository";
import { WorkspaceId } from "../../types/product-identity.value-object";
import type { CatalogDatabase } from "./database";
import {
  catalogProductMediaOperations,
  catalogProductMediaSourceAttemptAudits,
  catalogProductMediaSourceAttempts,
  catalogProductMediaWorkflows,
} from "./schema";

const ACTIVE_STATUSES = ["AwaitingUpload", "Uploaded"] as const;
const UNIQUE_VIOLATION = "23505";

const isUniqueViolation = (error: unknown): boolean => {
  let current = error;
  while (typeof current === "object" && current !== null) {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === UNIQUE_VIOLATION) return true;
    current = candidate.cause;
  }
  return false;
};

const toAttempt = (row: typeof catalogProductMediaSourceAttempts.$inferSelect): MediaSourceAttempt => ({
  workspaceId: WorkspaceId.create(row.workspaceId),
  operationId: row.operationId,
  sourceAttemptId: row.sourceAttemptId,
  sourceFingerprint: row.sourceFingerprint,
  status: row.status as MediaSourceAttemptStatus,
  createdByActorId: row.createdByActorId,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  ...(row.verifiedSha256 && row.verifiedSizeBytes && row.verifiedMimeType && row.verifiedWidth && row.verifiedHeight
    ? { verifiedMetadata: {
        sha256: row.verifiedSha256,
        sizeBytes: row.verifiedSizeBytes,
        detectedMimeType: row.verifiedMimeType as "image/jpeg" | "image/png" | "image/webp",
        width: row.verifiedWidth,
        height: row.verifiedHeight,
      } }
    : {}),
  ...(row.stagingArtifactKey ? { stagingArtifactKey: row.stagingArtifactKey } : {}),
  ...(row.appliedAt ? { appliedAt: row.appliedAt } : {}),
  ...(row.failedAt ? { failedAt: row.failedAt } : {}),
  ...(row.failureCode ? { failureCode: row.failureCode } : {}),
});

const auditRow = (input: {
  readonly workspaceId: string;
  readonly operationId: string;
  readonly sourceAttemptId: string;
  readonly eventType: "SourceAttemptCreated" | "SourceAttemptFailed" | "SourceAttemptApplied" | "SourceAttemptExpired";
  readonly actorId: string;
  readonly resultCode: string;
  readonly occurredAt: Date;
}) => ({ ...input, auditId: randomUUID() });

export class PostgreSqlMediaSourceAttemptRepository implements MediaSourceAttemptRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async createOrReuse(input: Parameters<MediaSourceAttemptRepository["createOrReuse"]>[0]): Promise<CreateMediaSourceAttemptResult> {
    const execute = async (): Promise<CreateMediaSourceAttemptResult> => this.database.transaction(async (transaction) => {
      const [operation] = await transaction.select().from(catalogProductMediaOperations).where(and(
        eq(catalogProductMediaOperations.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaOperations.operationId, input.operationId),
      )).limit(1).for("update");
      if (!operation) return { type: "MediaOperationNotFound" };
      if (
        operation.status !== "SourceUnavailable"
        || !operation.requiresNewSource
        || (operation.type !== "Add" && operation.type !== "Replace")
      ) {
        const [applied] = await transaction.select().from(catalogProductMediaSourceAttempts).where(and(
          eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
          eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
          eq(catalogProductMediaSourceAttempts.sourceFingerprint, input.sourceFingerprint),
          eq(catalogProductMediaSourceAttempts.status, "Applied"),
        )).limit(1);
        return applied
          ? { type: "Existing", attempt: toAttempt(applied) }
          : { type: "SourceReplacementNotAllowed" };
      }

      const expired = await transaction.update(catalogProductMediaSourceAttempts).set({ status: "Expired" }).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
        inArray(catalogProductMediaSourceAttempts.status, [...ACTIVE_STATUSES]),
        lte(catalogProductMediaSourceAttempts.expiresAt, input.createdAt),
      )).returning({ sourceAttemptId: catalogProductMediaSourceAttempts.sourceAttemptId });
      if (expired.length > 0) {
        await transaction.insert(catalogProductMediaSourceAttemptAudits).values(expired.map(({ sourceAttemptId }) => auditRow({
          workspaceId: input.workspaceId.value,
          operationId: input.operationId,
          sourceAttemptId,
          eventType: "SourceAttemptExpired",
          actorId: input.actorId,
          resultCode: "SourceAttemptExpired",
          occurredAt: input.createdAt,
        })));
      }

      const [active] = await transaction.select().from(catalogProductMediaSourceAttempts).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
        inArray(catalogProductMediaSourceAttempts.status, [...ACTIVE_STATUSES]),
      )).limit(1).for("update");
      if (active) return active.sourceFingerprint === input.sourceFingerprint
        ? { type: "Existing", attempt: toAttempt(active) }
        : { type: "ActiveSourceAttemptConflict" };

      const [created] = await transaction.insert(catalogProductMediaSourceAttempts).values({
        workspaceId: input.workspaceId.value,
        operationId: input.operationId,
        sourceAttemptId: input.sourceAttemptId,
        sourceFingerprint: input.sourceFingerprint,
        status: "AwaitingUpload",
        createdByActorId: input.actorId,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      }).returning();
      await transaction.insert(catalogProductMediaSourceAttemptAudits).values(auditRow({
        workspaceId: input.workspaceId.value,
        operationId: input.operationId,
        sourceAttemptId: input.sourceAttemptId,
        eventType: "SourceAttemptCreated",
        actorId: input.actorId,
        resultCode: "SourceAttemptCreated",
        occurredAt: input.createdAt,
      }));
      return { type: "Created", attempt: toAttempt(created) };
    });

    try { return await execute(); }
    catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const [active] = await this.database.select().from(catalogProductMediaSourceAttempts).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
        inArray(catalogProductMediaSourceAttempts.status, [...ACTIVE_STATUSES]),
      )).limit(1);
      if (!active) throw error;
      return active.sourceFingerprint === input.sourceFingerprint
        ? { type: "Existing", attempt: toAttempt(active) }
        : { type: "ActiveSourceAttemptConflict" };
    }
  }

  async apply(input: Parameters<MediaSourceAttemptRepository["apply"]>[0]): Promise<ApplyMediaSourceAttemptResult> {
    return this.database.transaction(async (transaction) => {
      const [attempt] = await transaction.select().from(catalogProductMediaSourceAttempts).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
        eq(catalogProductMediaSourceAttempts.sourceAttemptId, input.sourceAttemptId),
      )).limit(1).for("update");
      if (!attempt || attempt.sourceFingerprint !== input.sourceFingerprint) return { type: "SourceAttemptNotFound" };
      if (attempt.status === "Applied") return { type: "AlreadyApplied" };
      if (attempt.expiresAt.getTime() <= input.appliedAt.getTime() || attempt.status === "Expired") {
        if (attempt.status !== "Expired") {
          await transaction.update(catalogProductMediaSourceAttempts).set({ status: "Expired" }).where(and(
            eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
            eq(catalogProductMediaSourceAttempts.sourceAttemptId, input.sourceAttemptId),
          ));
          await transaction.insert(catalogProductMediaSourceAttemptAudits).values(auditRow({
            workspaceId: input.workspaceId.value,
            operationId: input.operationId,
            sourceAttemptId: input.sourceAttemptId,
            eventType: "SourceAttemptExpired",
            actorId: input.actorId,
            resultCode: "SourceAttemptExpired",
            occurredAt: input.appliedAt,
          }));
        }
        return { type: "SourceAttemptExpired" };
      }
      if (!ACTIVE_STATUSES.includes(attempt.status as typeof ACTIVE_STATUSES[number])) return { type: "Conflict" };

      const [operation] = await transaction.select().from(catalogProductMediaOperations).where(and(
        eq(catalogProductMediaOperations.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaOperations.operationId, input.operationId),
      )).limit(1).for("update");
      if (!operation) return { type: "SourceAttemptNotFound" };
      if (operation.status !== "SourceUnavailable" || !operation.requiresNewSource) {
        return { type: "SourceReplacementNotAllowed" };
      }

      const updatedOperation = await transaction.update(catalogProductMediaOperations).set({
        status: "Staged",
        stagedArtifactKey: input.stagingArtifactKey,
        stagedSha256: input.stagedSha256,
        stagedByteLength: input.stagedByteLength,
        stagedWidth: input.stagedWidth,
        stagedHeight: input.stagedHeight,
        expiresAt: attempt.expiresAt,
        retryAllowed: true,
        requiresNewSource: false,
        errorCode: null,
        completedAt: null,
      }).where(and(
        eq(catalogProductMediaOperations.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaOperations.operationId, input.operationId),
        eq(catalogProductMediaOperations.status, "SourceUnavailable"),
        eq(catalogProductMediaOperations.requiresNewSource, true),
      )).returning({ operationId: catalogProductMediaOperations.operationId });
      if (updatedOperation.length !== 1) return { type: "Conflict" };

      await transaction.update(catalogProductMediaSourceAttempts).set({
        status: "Applied",
        verifiedSha256: input.verifiedMetadata.sha256,
        verifiedSizeBytes: input.verifiedMetadata.sizeBytes,
        verifiedMimeType: input.verifiedMetadata.detectedMimeType,
        verifiedWidth: input.verifiedMetadata.width,
        verifiedHeight: input.verifiedMetadata.height,
        stagingArtifactKey: input.stagingArtifactKey,
        appliedAt: input.appliedAt,
      }).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.sourceAttemptId, input.sourceAttemptId),
      ));

      const operationRows = await transaction.select().from(catalogProductMediaOperations).where(and(
        eq(catalogProductMediaOperations.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaOperations.workflowId, operation.workflowId),
      ));
      const projected = operationRows.map((row) => ({
        ...row,
        status: (row.operationId === input.operationId ? "Staged" : row.status) as ProductMediaOperationState["status"],
        workspaceId: input.workspaceId,
      })) as unknown as ProductMediaOperationState[];
      await transaction.update(catalogProductMediaWorkflows).set({
        status: deriveProductMediaWorkflowStatus(projected),
        completedAt: null,
        version: sql`${catalogProductMediaWorkflows.version} + 1`,
      }).where(and(
        eq(catalogProductMediaWorkflows.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaWorkflows.workflowId, operation.workflowId),
      ));
      await transaction.insert(catalogProductMediaSourceAttemptAudits).values(auditRow({
        workspaceId: input.workspaceId.value,
        operationId: input.operationId,
        sourceAttemptId: input.sourceAttemptId,
        eventType: "SourceAttemptApplied",
        actorId: input.actorId,
        resultCode: "SourceAttemptApplied",
        occurredAt: input.appliedAt,
      }));
      return { type: "Applied" };
    });
  }

  async markFailed(input: Parameters<MediaSourceAttemptRepository["markFailed"]>[0]): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const updated = await transaction.update(catalogProductMediaSourceAttempts).set({
        status: "Failed",
        failedAt: input.failedAt,
        failureCode: input.failureCode,
      }).where(and(
        eq(catalogProductMediaSourceAttempts.workspaceId, input.workspaceId.value),
        eq(catalogProductMediaSourceAttempts.operationId, input.operationId),
        eq(catalogProductMediaSourceAttempts.sourceAttemptId, input.sourceAttemptId),
        inArray(catalogProductMediaSourceAttempts.status, [...ACTIVE_STATUSES]),
      )).returning({ sourceAttemptId: catalogProductMediaSourceAttempts.sourceAttemptId });
      if (updated.length === 1) await transaction.insert(catalogProductMediaSourceAttemptAudits).values(auditRow({
        workspaceId: input.workspaceId.value,
        operationId: input.operationId,
        sourceAttemptId: input.sourceAttemptId,
        eventType: "SourceAttemptFailed",
        actorId: input.actorId,
        resultCode: input.failureCode,
        occurredAt: input.failedAt,
      }));
    });
  }
}
