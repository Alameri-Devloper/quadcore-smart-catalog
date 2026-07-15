import type { ProductEntryDraftRepository } from "../product-entry-draft.repository.interface";
import type {
  ProductEntryDraft,
  ProductEntryDraftScope,
} from "../product-entry-draft.entity";

const STORAGE_KEY = "qsc.product-entry-drafts.v1";

export class BrowserProductEntryDraftRepository
  implements ProductEntryDraftRepository
{
  private read(): ProductEntryDraft[] {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ProductEntryDraft[]) : [];
  }

  private write(drafts: ProductEntryDraft[]): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  }

  async findMostRecentActive(
    scope: ProductEntryDraftScope,
  ): Promise<ProductEntryDraft | null> {
    return (
      this.read()
        .filter(
          (draft) =>
            draft.status === "active" &&
            draft.companyId === scope.companyId &&
            draft.workspaceId === scope.workspaceId &&
            draft.employeeId === scope.employeeId,
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    );
  }

  async save(draft: ProductEntryDraft): Promise<void> {
    const drafts = this.read();
    const index = drafts.findIndex((candidate) => candidate.id === draft.id);
    if (index >= 0) drafts[index] = draft;
    else drafts.push(draft);
    this.write(drafts);
  }

  async delete(draftId: string): Promise<void> {
    this.write(this.read().filter((draft) => draft.id !== draftId));
  }
}
