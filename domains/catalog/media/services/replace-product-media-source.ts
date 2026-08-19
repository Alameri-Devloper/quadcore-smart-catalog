import { createHash, randomBytes } from "node:crypto";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import { ProductMediaStagingKey } from "../domain/product-media-keys";
import { ProductMediaOperationId } from "../domain/product-media-operation-id";
import {
  mediaSourceAttemptExpiresAt,
  mediaSourceFingerprint,
  type MediaSourceAttemptVerifiedMetadata,
} from "../domain/media-source-attempt";
import type { ProductEditAuthorizationPort, TrustedActorContext } from "../ports/product-media-authorization.port";
import type { ProductImageProcessingConfiguration, ProductImageProcessor } from "../ports/product-image-processor";
import { ProductMediaStoragePartialOperationError, type ProductMediaStoragePort } from "../ports/product-media-storage.port";
import type { MediaSourceAttemptRepository } from "../repositories/media-source-attempt.repository";
import type { ProductMediaRootRepository } from "../repositories/product-media-root.repository";
import type { ProductMediaWorkflowRepository } from "../repositories/product-media-workflow.repository";
import { RetryProductMediaOperationUseCase } from "./product-media-workflow";

const detectedMediaType = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ReplaceProductMediaSourceResult =
  | { readonly type: "MediaWorkflowResumed"; readonly sourceAttemptId: string; readonly workflowId: string }
  | { readonly type: "MediaWorkflowResumeUnavailable"; readonly sourceAttemptId: string; readonly workflowId: string }
  | { readonly type: "MediaOperationNotFound" }
  | { readonly type: "Forbidden"; readonly permission: "catalog.productMedia.source.replace" }
  | { readonly type: "SourceReplacementNotAllowed" }
  | { readonly type: "ActiveSourceAttemptConflict" }
  | { readonly type: "SourceAttemptExpired" }
  | { readonly type: "SourceValidationFailed"; readonly code: string }
  | { readonly type: "InfrastructureUnavailable" };

interface ReplaceProductMediaSourceDependencies {
  readonly attempts: MediaSourceAttemptRepository;
  readonly workflows: ProductMediaWorkflowRepository;
  readonly products: ProductRepository;
  readonly roots: ProductMediaRootRepository;
  readonly authorization: ProductEditAuthorizationPort;
  readonly processor: ProductImageProcessor;
  readonly processingConfiguration: ProductImageProcessingConfiguration;
  readonly storage: ProductMediaStoragePort;
  readonly allocateSourceAttemptId?: () => string;
}

export class ReplaceProductMediaSourceUseCase {
  constructor(private readonly dependencies: ReplaceProductMediaSourceDependencies) {}

  async execute(command: {
    readonly actorContext: TrustedActorContext;
    readonly operationId: string;
    readonly bytes: Uint8Array;
    readonly clientMediaType: string | null;
    readonly effectiveTime: Date;
  }): Promise<ReplaceProductMediaSourceResult> {
    let operationId: string;
    try { operationId = ProductMediaOperationId.create(command.operationId).value; }
    catch { return { type: "MediaOperationNotFound" }; }
    const workflow = await this.dependencies.workflows.findByOperationId(command.actorContext.workspaceId, operationId);
    if (!workflow) return { type: "MediaOperationNotFound" };
    if (!(await this.dependencies.authorization.canEditProduct(command.actorContext, workflow.productId))) {
      return { type: "Forbidden", permission: "catalog.productMedia.source.replace" };
    }
    const operation = workflow.operations.find((candidate) => candidate.operationId === operationId);
    if (!operation) return { type: "MediaOperationNotFound" };

    const rawSha256 = createHash("sha256").update(command.bytes).digest("hex");
    const sourceFingerprint = mediaSourceFingerprint({
      sha256: rawSha256,
      sizeBytes: command.bytes.byteLength,
      declaredMediaType: command.clientMediaType,
    });
    const allocatedId = (this.dependencies.allocateSourceAttemptId ?? (() => randomBytes(16).toString("hex")))();
    const created = await this.dependencies.attempts.createOrReuse({
      workspaceId: command.actorContext.workspaceId,
      operationId,
      sourceAttemptId: allocatedId,
      sourceFingerprint,
      actorId: command.actorContext.actorId,
      createdAt: command.effectiveTime,
      expiresAt: mediaSourceAttemptExpiresAt(command.effectiveTime),
    });
    if (created.type === "MediaOperationNotFound") return { type: "MediaOperationNotFound" };
    if (created.type === "SourceReplacementNotAllowed") return { type: "SourceReplacementNotAllowed" };
    if (created.type === "ActiveSourceAttemptConflict") return { type: "ActiveSourceAttemptConflict" };
    const attempt = created.attempt;
    if (attempt.status === "Applied") {
      try {
        await new RetryProductMediaOperationUseCase(this.dependencies).execute({
          actorContext: command.actorContext,
          workflowId: workflow.workflowId,
          operationId,
          effectiveTime: command.effectiveTime,
        });
        return { type: "MediaWorkflowResumed", sourceAttemptId: attempt.sourceAttemptId, workflowId: workflow.workflowId };
      } catch {
        return { type: "MediaWorkflowResumeUnavailable", sourceAttemptId: attempt.sourceAttemptId, workflowId: workflow.workflowId };
      }
    }

    const fail = async (code: string): Promise<ReplaceProductMediaSourceResult> => {
      await this.dependencies.attempts.markFailed({
        workspaceId: command.actorContext.workspaceId,
        operationId,
        sourceAttemptId: attempt.sourceAttemptId,
        actorId: command.actorContext.actorId,
        failureCode: code,
        failedAt: command.effectiveTime,
      });
      return { type: "SourceValidationFailed", code };
    };
    if (command.bytes.byteLength === 0) return fail("SOURCE_REQUIRED");
    if (command.bytes.byteLength > this.dependencies.processingConfiguration.maximumSourceBytes) return fail("SOURCE_TOO_LARGE");
    const inspected = await this.dependencies.processor.inspect(command.bytes);
    if (inspected.type === "Rejected") return fail(inspected.code === "CorruptImage" ? "SOURCE_IMAGE_INVALID" : "SOURCE_MIME_UNSUPPORTED");
    const actualMediaType = detectedMediaType[inspected.inspection.format];
    if (command.clientMediaType && command.clientMediaType.trim().toLowerCase() !== actualMediaType) {
      return fail("SOURCE_MIME_MISMATCH");
    }
    if (
      inspected.inspection.width > this.dependencies.processingConfiguration.maximumWidth
      || inspected.inspection.height > this.dependencies.processingConfiguration.maximumHeight
      || inspected.inspection.width * inspected.inspection.height > this.dependencies.processingConfiguration.maximumDecodedPixels
    ) return fail("SOURCE_DIMENSIONS_UNSUPPORTED");
    const normalized = await this.dependencies.processor.normalize(command.bytes, this.dependencies.processingConfiguration);
    if (normalized.type === "Rejected") return fail("SOURCE_IMAGE_INVALID");
    const root = await this.dependencies.roots.findByProduct(command.actorContext.workspaceId, workflow.productId);
    if (!root) return { type: "InfrastructureUnavailable" };
    const stagingKey = ProductMediaStagingKey.createForSourceAttempt(root.storageRootKey, operationId, attempt.sourceAttemptId);
    let staged;
    try { staged = await this.dependencies.storage.stage({ stagingKey, image: normalized.image }); }
    catch (error) {
      if (error instanceof ProductMediaStoragePartialOperationError) return { type: "InfrastructureUnavailable" };
      return { type: "InfrastructureUnavailable" };
    }
    if (staged.type === "Failed") return { type: "InfrastructureUnavailable" };
    const verifiedMetadata: MediaSourceAttemptVerifiedMetadata = {
      sha256: rawSha256,
      sizeBytes: command.bytes.byteLength,
      detectedMimeType: actualMediaType,
      width: inspected.inspection.width,
      height: inspected.inspection.height,
    };
    const applied = await this.dependencies.attempts.apply({
      workspaceId: command.actorContext.workspaceId,
      operationId,
      sourceAttemptId: attempt.sourceAttemptId,
      sourceFingerprint,
      stagingArtifactKey: staged.object.key.value,
      stagedSha256: staged.object.sha256,
      stagedByteLength: staged.object.byteLength,
      stagedWidth: staged.object.width,
      stagedHeight: staged.object.height,
      verifiedMetadata,
      actorId: command.actorContext.actorId,
      appliedAt: command.effectiveTime,
    });
    if (applied.type === "SourceAttemptExpired") {
      await this.dependencies.storage.discardTemporary({ stagingKey }).catch(() => undefined);
      return { type: "SourceAttemptExpired" };
    }
    if (applied.type !== "Applied" && applied.type !== "AlreadyApplied") {
      await this.dependencies.storage.discardTemporary({ stagingKey }).catch(() => undefined);
      return applied.type === "SourceReplacementNotAllowed"
        ? { type: "SourceReplacementNotAllowed" }
        : { type: "InfrastructureUnavailable" };
    }

    try {
      await new RetryProductMediaOperationUseCase(this.dependencies).execute({
        actorContext: command.actorContext,
        workflowId: workflow.workflowId,
        operationId,
        effectiveTime: command.effectiveTime,
      });
      return { type: "MediaWorkflowResumed", sourceAttemptId: attempt.sourceAttemptId, workflowId: workflow.workflowId };
    } catch {
      return { type: "MediaWorkflowResumeUnavailable", sourceAttemptId: attempt.sourceAttemptId, workflowId: workflow.workflowId };
    }
  }
}
