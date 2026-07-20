import type { ProductId, WorkspaceId } from "../types/product-identity.value-object";
import type { ProductRevision } from "../types/product-revision.value-object";
import type { Product } from "../types/product.aggregate";
import type {
  ProductCreateResult,
  ProductUpdateResult,
} from "./product-repository-results";

export interface ProductRepository {
  findById(
    workspaceId: WorkspaceId,
    productId: ProductId,
  ): Promise<Product | null>;

  create(product: Product): Promise<ProductCreateResult>;

  update(
    product: Product,
    expectedPersistedRevision: ProductRevision,
  ): Promise<ProductUpdateResult>;
}
