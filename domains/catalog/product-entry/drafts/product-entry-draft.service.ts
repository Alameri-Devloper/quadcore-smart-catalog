import type { WorkflowStepId } from "@/shared/workflow/workflow.types";
import type { ProductEntryValues } from "../product-entry.types";
import type {
  ProductEntryDraft,
  ProductEntryDraftScope,
} from "./product-entry-draft.entity";
import { migrateProductEntryValues } from "../product-entry.types";
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

  async findActive(scope: ProductEntryDraftScope) {
    const draft = await this.repository.findMostRecentActive(scope);
    if (!draft) return null;
    const workflowValues = migrateProductEntryValues(draft.workflowValues);
    const migrated = JSON.stringify(workflowValues) !== JSON.stringify(draft.workflowValues);
    if (!migrated) return draft;
    const nextDraft = { ...draft, workflowValues, updatedAt: new Date().toISOString() };
    await this.repository.save(nextDraft);
    return nextDraft;
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
