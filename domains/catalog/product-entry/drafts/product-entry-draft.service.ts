import type { WorkflowStepId } from "@/shared/workflow/workflow.types";
import type { ProductEntryValues } from "../product-entry.types";
import type {
  ProductEntryDraft,
  ProductEntryDraftScope,
} from "./product-entry-draft.entity";
import type { ProductEntryDraftRepository } from "./product-entry-draft.repository.interface";

interface SaveDraftInput {
  existingDraft: ProductEntryDraft | null;
  scope: ProductEntryDraftScope;
  values: ProductEntryValues;
  currentStepId: WorkflowStepId;
  completedStepIds: WorkflowStepId[];
}

export class ProductEntryDraftService {
  constructor(private readonly repository: ProductEntryDraftRepository) {}

  findActive(scope: ProductEntryDraftScope) {
    return this.repository.findMostRecentActive(scope);
  }

  async saveActive(input: SaveDraftInput): Promise<ProductEntryDraft> {
    const now = new Date().toISOString();
    const draft: ProductEntryDraft = {
      id: input.existingDraft?.id ?? crypto.randomUUID(),
      companyId: input.scope.companyId,
      workspaceId: input.scope.workspaceId,
      employeeId: input.scope.employeeId,
      entryMode: input.values.entryMethod,
      workflowValues: input.values,
      currentStepId: input.currentStepId,
      completedStepIds: input.completedStepIds,
      status: "active",
      createdAt: input.existingDraft?.createdAt ?? now,
      updatedAt: now,
    };
    await this.repository.save(draft);
    return draft;
  }

  async discard(draft: ProductEntryDraft): Promise<void> {
    await this.repository.save({
      ...draft,
      status: "discarded",
      updatedAt: new Date().toISOString(),
    });
  }

  delete(draftId: string) {
    return this.repository.delete(draftId);
  }
}
