import type { WorkspaceId } from "../../types/product-identity.value-object";
import type { MediaSourceAttempt, MediaSourceAttemptVerifiedMetadata } from "../domain/media-source-attempt";

export type CreateMediaSourceAttemptResult =
  | { readonly type: "Created"; readonly attempt: MediaSourceAttempt }
  | { readonly type: "Existing"; readonly attempt: MediaSourceAttempt }
  | { readonly type: "ActiveSourceAttemptConflict" }
  | { readonly type: "MediaOperationNotFound" }
  | { readonly type: "SourceReplacementNotAllowed" };

export type ApplyMediaSourceAttemptResult =
  | { readonly type: "Applied" }
  | { readonly type: "AlreadyApplied" }
  | { readonly type: "SourceAttemptNotFound" }
  | { readonly type: "SourceAttemptExpired" }
  | { readonly type: "SourceReplacementNotAllowed" }
  | { readonly type: "Conflict" };

export interface MediaSourceAttemptRepository {
  createOrReuse(input: {
    readonly workspaceId: WorkspaceId;
    readonly operationId: string;
    readonly sourceAttemptId: string;
    readonly sourceFingerprint: string;
    readonly actorId: string;
    readonly createdAt: Date;
    readonly expiresAt: Date;
  }): Promise<CreateMediaSourceAttemptResult>;
  apply(input: {
    readonly workspaceId: WorkspaceId;
    readonly operationId: string;
    readonly sourceAttemptId: string;
    readonly sourceFingerprint: string;
    readonly stagingArtifactKey: string;
    readonly stagedSha256: string;
    readonly stagedByteLength: number;
    readonly stagedWidth: number;
    readonly stagedHeight: number;
    readonly verifiedMetadata: MediaSourceAttemptVerifiedMetadata;
    readonly actorId: string;
    readonly appliedAt: Date;
  }): Promise<ApplyMediaSourceAttemptResult>;
  markFailed(input: {
    readonly workspaceId: WorkspaceId;
    readonly operationId: string;
    readonly sourceAttemptId: string;
    readonly actorId: string;
    readonly failureCode: string;
    readonly failedAt: Date;
  }): Promise<void>;
}
