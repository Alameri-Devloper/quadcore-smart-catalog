import type { WorkspaceId } from "../../types/product-identity.value-object";

export class ProductEntryActorId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): ProductEntryActorId {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("ProductEntryActorId cannot be empty.");
    }
    return new ProductEntryActorId(value);
  }
}

export const PRODUCT_ENTRY_PERMISSIONS = {
  create: "catalog.product.create",
  edit: "catalog.product.edit",
  read: "catalog.product-entry-submission.read",
  readReferenceCost: "catalog.product.reference-cost.read",
} as const;

export type ProductEntryPermission =
  (typeof PRODUCT_ENTRY_PERMISSIONS)[keyof typeof PRODUCT_ENTRY_PERMISSIONS];

export interface ProductEntryBranchScope {
  readonly branchIds: ReadonlySet<string>;
}

export interface ProductEntryExecutionContext {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ProductEntryActorId;
  readonly permissions: ReadonlySet<ProductEntryPermission>;
  readonly branchScope?: ProductEntryBranchScope;
}
