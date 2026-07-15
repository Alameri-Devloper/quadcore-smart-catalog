import type {
  ProductEntryDraft,
  ProductEntryDraftScope,
} from "./product-entry-draft.entity";

export interface ProductEntryDraftRepository {
  findMostRecentActive(scope: ProductEntryDraftScope): Promise<ProductEntryDraft | null>;
  save(draft: ProductEntryDraft): Promise<void>;
  delete(draftId: string): Promise<void>;
}
