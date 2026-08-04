import type { SmartSaveProductSuccess } from "../../services/smart-save-product";
import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductEntrySubmission } from "../domain/product-entry-submission";
import type {
  ProductEntrySubmissionId,
  ProductEntrySubmissionMode,
  ProductEntrySubmissionStatus,
  RequestFingerprint,
} from "../domain/product-entry-submission";

export interface ProductEntrySaveReceipt {
  readonly outcome: SmartSaveProductSuccess["outcome"];
  readonly lifecycleState: SmartSaveProductSuccess["lifecycleState"];
  readonly archiveReason: SmartSaveProductSuccess["archiveReason"] | null;
  readonly missingPublicationReasons: readonly {
    readonly code: SmartSaveProductSuccess["missingPublicationReasons"][number]["code"];
    readonly specificationFieldId: string | null;
  }[];
}

export interface ClaimProductEntrySubmission {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly requestFingerprint: RequestFingerprint;
  readonly mode: ProductEntrySubmissionMode;
  readonly productId: ProductId | null;
  readonly claimedAt: Date;
}

export type ProductEntrySubmissionClaimResult =
  | { readonly type: "Claimed"; readonly submission: ProductEntrySubmission }
  | { readonly type: "Existing"; readonly submission: ProductEntrySubmission }
  | { readonly type: "FingerprintConflict"; readonly submission: ProductEntrySubmission };

export interface MarkProductEntrySubmissionProductSaved {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly productId: ProductId;
  readonly productRevision: number;
  readonly receipt: ProductEntrySaveReceipt;
  readonly savedAt: Date;
}

export interface MarkProductEntrySubmissionMediaOutcome {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly mediaWorkflowId: string;
  readonly status: Extract<ProductEntrySubmissionStatus, "Completed" | "PartiallyCompleted">;
  readonly updatedAt: Date;
}

export type MarkProductEntrySubmissionMediaOutcomeResult =
  | { readonly type: "Linked" }
  | { readonly type: "Existing" }
  | { readonly type: "Conflict" };

export interface ProductEntrySubmissionRepository {
  findById(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId): Promise<ProductEntrySubmission | null>;
  findSaveReceipt(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId): Promise<ProductEntrySaveReceipt | null>;
  claim(command: ClaimProductEntrySubmission): Promise<ProductEntrySubmissionClaimResult>;
  markProductSaved(command: MarkProductEntrySubmissionProductSaved): Promise<void>;
  markMediaOutcome(
    command: MarkProductEntrySubmissionMediaOutcome,
  ): Promise<MarkProductEntrySubmissionMediaOutcomeResult>;
}
