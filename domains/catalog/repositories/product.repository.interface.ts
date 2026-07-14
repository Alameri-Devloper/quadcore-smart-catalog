import { ProductEntity } from "@/domains/catalog/types/product.entity";

export interface IProductRepository {
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
