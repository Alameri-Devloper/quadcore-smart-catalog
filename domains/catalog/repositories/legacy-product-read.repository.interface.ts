import type { ProductEntity } from "@/domains/catalog/types/product.entity";

/**
 * Compatibility-only query contract for the legacy ProductEntity read model.
 * It is not the canonical Product Aggregate persistence port.
 */
export interface LegacyProductReadRepository {
  getAll(): ProductEntity[];
  getActive(): ProductEntity[];
  getFeatured(): ProductEntity[];
  getByWorkspaceId(workspaceId: string): ProductEntity[];
  getByProductModelId(productModelId: string): ProductEntity[];
  getByBrandId(brandId: string): ProductEntity[];
  getByStatus(status: ProductEntity["status"]): ProductEntity[];
  getById(id: string): ProductEntity | undefined;
  getBySlug(slug: string): ProductEntity | undefined;
}
