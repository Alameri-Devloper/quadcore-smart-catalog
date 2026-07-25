import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductMediaRoot } from "../domain/product-media-root";

export type ProductMediaRootCreateResult =
  | { readonly type: "Created"; readonly root: ProductMediaRoot }
  | { readonly type: "AlreadyExists"; readonly existingRoot: ProductMediaRoot }
  | { readonly type: "StorageRootConflict" };

export interface ProductMediaRootRepository {
  findByProduct(workspaceId: WorkspaceId, productId: ProductId): Promise<ProductMediaRoot | null>;
  create(root: ProductMediaRoot): Promise<ProductMediaRootCreateResult>;
}
