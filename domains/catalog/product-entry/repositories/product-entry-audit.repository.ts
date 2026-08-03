import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductEntryActorId } from "../application/product-entry-execution-context";
import type { ProductEntrySubmissionId } from "../domain/product-entry-submission";

export const PRODUCT_ENTRY_AUDIT_EVENT_TYPES = {
  submissionClaimed: "SubmissionClaimed",
  productCreateRequested: "ProductCreateRequested",
  productEditRequested: "ProductEditRequested",
  productSaved: "ProductSaved",
  lifecycleOutcome: "LifecycleOutcome",
} as const;

export interface ProductEntryAuditRecord {
  readonly eventType: (typeof PRODUCT_ENTRY_AUDIT_EVENT_TYPES)[keyof typeof PRODUCT_ENTRY_AUDIT_EVENT_TYPES];
  readonly workspaceId: WorkspaceId;
  readonly actorId: ProductEntryActorId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly productId: ProductId;
  readonly resultCode: string;
  readonly occurredAt: Date;
}

export interface ProductEntryAuditRepository {
  append(records: readonly ProductEntryAuditRecord[]): Promise<void>;
}
