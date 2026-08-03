import type { WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import type { ProductEntrySubmissionId } from "../domain/product-entry-submission";

export interface ProductEntrySubmissionMediaPlanRepository {
  save(operations: readonly ProductEntryMediaOperation[]): Promise<void>;
  findBySubmission(
    workspaceId: WorkspaceId,
    submissionId: ProductEntrySubmissionId,
  ): Promise<readonly ProductEntryMediaOperation[]>;
}
