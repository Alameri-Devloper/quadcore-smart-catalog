import type {
  CreateProductEntryLocalDraftIdentity,
  EditProductEntryLocalDraftIdentity,
  ProductEntryLocalDraft,
  ProductEntryLocalDraftContext,
  ProductEntryLocalDraftStoredLookup,
} from "./product-entry-local-draft.types";

export class ProductEntryLocalDraftStorageFailure extends Error {
  constructor() {
    super("Product Entry local draft storage is unavailable.");
    this.name = "ProductEntryLocalDraftStorageFailure";
  }
}

export interface ProductEntryLocalDraftStore {
  save(draft: ProductEntryLocalDraft): Promise<void>;
  findCreateByIdentity(
    identity: CreateProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup>;
  findEditByIdentity(
    identity: EditProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup>;
  deleteByIdentity(identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity): Promise<void>;
  deleteExpiredForActor(context: ProductEntryLocalDraftContext, expiredAtOrBefore: number): Promise<number>;
}

export const productEntryLocalDraftStorageKey = (
  identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
): string => {
  const parts = identity.mode === "Create"
    ? [identity.workspaceId, identity.actorId, identity.mode, identity.submissionId]
    : [
        identity.workspaceId,
        identity.actorId,
        identity.mode,
        identity.productId,
        String(identity.baseProductRevision),
      ];
  return parts.map((part) => `${part.length}:${part}`).join("|");
};

export const productEntryLocalDraftIdentityFromDraft = (
  draft: ProductEntryLocalDraft,
): CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity =>
  draft.mode === "Create"
    ? {
        mode: "Create",
        workspaceId: draft.workspaceId,
        actorId: draft.actorId,
        submissionId: draft.submissionId,
      }
    : {
        mode: "Edit",
        workspaceId: draft.workspaceId,
        actorId: draft.actorId,
        submissionId: draft.submissionId,
        productId: draft.productId!,
        baseProductRevision: draft.baseProductRevision!,
      };

export const productEntryLocalDraftMatchesIdentity = (
  draft: ProductEntryLocalDraft,
  identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
): boolean => productEntryLocalDraftStorageKey(productEntryLocalDraftIdentityFromDraft(draft)) ===
  productEntryLocalDraftStorageKey(identity);
