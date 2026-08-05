import { decodeProductEntryLocalDraft } from "../product-entry-local-draft.schema";
import {
  productEntryLocalDraftIdentityFromDraft,
  productEntryLocalDraftStorageKey,
  type ProductEntryLocalDraftStore,
} from "../product-entry-local-draft.store";
import type {
  CreateProductEntryLocalDraftIdentity,
  EditProductEntryLocalDraftIdentity,
  ProductEntryLocalDraft,
  ProductEntryLocalDraftContext,
  ProductEntryLocalDraftStoredLookup,
} from "../product-entry-local-draft.types";

export class InMemoryProductEntryLocalDraftStore implements ProductEntryLocalDraftStore {
  private readonly records = new Map<string, unknown>();

  async save(draft: ProductEntryLocalDraft): Promise<void> {
    this.records.set(
      productEntryLocalDraftStorageKey(productEntryLocalDraftIdentityFromDraft(draft)),
      draft,
    );
  }

  async findCreateByIdentity(
    identity: CreateProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup> {
    return this.find(identity);
  }

  async findEditByIdentity(
    identity: EditProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup> {
    return this.find(identity);
  }

  async deleteByIdentity(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
  ): Promise<void> {
    this.records.delete(productEntryLocalDraftStorageKey(identity));
  }

  async deleteExpiredForActor(
    context: ProductEntryLocalDraftContext,
    expiredAtOrBefore: number,
  ): Promise<number> {
    let count = 0;
    for (const [key, value] of this.records) {
      const result = decodeProductEntryLocalDraft(value);
      if (result.type !== "Found") continue;
      if (
        result.draft.workspaceId === context.workspaceId &&
        result.draft.actorId === context.actorId &&
        result.draft.expiresAt <= expiredAtOrBefore
      ) {
        this.records.delete(key);
        count += 1;
      }
    }
    return count;
  }

  seedUnknown(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
    value: unknown,
  ): void {
    this.records.set(productEntryLocalDraftStorageKey(identity), value);
  }

  get size(): number {
    return this.records.size;
  }

  private find(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
  ): ProductEntryLocalDraftStoredLookup {
    const key = productEntryLocalDraftStorageKey(identity);
    if (!this.records.has(key)) return { type: "NotFound" };
    return decodeProductEntryLocalDraft(this.records.get(key));
  }
}
