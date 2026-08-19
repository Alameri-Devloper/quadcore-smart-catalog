import { createHash } from "node:crypto";
import type { WorkspaceId } from "../../types/product-identity.value-object";

export const MEDIA_SOURCE_ATTEMPT_LIFETIME_MILLISECONDS = 14 * 24 * 60 * 60 * 1000;
export const PRODUCT_MEDIA_SOURCE_REPLACE_PERMISSION = "catalog.productMedia.source.replace" as const;

export type MediaSourceAttemptStatus = "AwaitingUpload" | "Uploaded" | "Applied" | "Failed" | "Expired";

export interface MediaSourceAttemptVerifiedMetadata {
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly detectedMimeType: "image/jpeg" | "image/png" | "image/webp";
  readonly width: number;
  readonly height: number;
}

export interface MediaSourceAttempt {
  readonly workspaceId: WorkspaceId;
  readonly operationId: string;
  readonly sourceAttemptId: string;
  readonly sourceFingerprint: string;
  readonly status: MediaSourceAttemptStatus;
  readonly createdByActorId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly verifiedMetadata?: MediaSourceAttemptVerifiedMetadata;
  readonly stagingArtifactKey?: string;
  readonly appliedAt?: Date;
  readonly failedAt?: Date;
  readonly failureCode?: string;
}

export const mediaSourceFingerprint = (input: {
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly declaredMediaType: string | null;
}): string => createHash("sha256").update(JSON.stringify({
  sha256: input.sha256,
  sizeBytes: input.sizeBytes,
  declaredMediaType: input.declaredMediaType?.trim().toLowerCase() ?? null,
})).digest("hex");

export const mediaSourceAttemptExpiresAt = (createdAt: Date): Date =>
  new Date(createdAt.getTime() + MEDIA_SOURCE_ATTEMPT_LIFETIME_MILLISECONDS);
