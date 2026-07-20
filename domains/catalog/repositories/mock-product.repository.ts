import { productsV2 } from "@/domains/catalog/mock/products-v2";
import { ProductEntity } from "@/domains/catalog/types/product.entity";
import { LegacyProductReadRepository } from "@/domains/catalog/repositories/legacy-product-read.repository.interface";

export const MockProductRepository: LegacyProductReadRepository = {
  getAll(): ProductEntity[] {
    return productsV2;
  },

  getActive(): ProductEntity[] {
    return productsV2.filter((product) => product.isActive);
  },

  getFeatured(): ProductEntity[] {
    return productsV2.filter(
      (product) => product.isFeatured && product.isActive,
    );
  },

  getByWorkspaceId(workspaceId: string): ProductEntity[] {
    return productsV2.filter(
      (product) => product.workspaceId === workspaceId && product.isActive,
    );
  },

  getByProductModelId(productModelId: string): ProductEntity[] {
    return productsV2.filter(
      (product) =>
        product.productModelId === productModelId && product.isActive,
    );
  },

  getByBrandId(brandId: string): ProductEntity[] {
    return productsV2.filter(
      (product) => product.brandId === brandId && product.isActive,
    );
  },

  getByStatus(status: ProductEntity["status"]): ProductEntity[] {
    return productsV2.filter(
      (product) => product.status === status && product.isActive,
    );
  },

  getById(id: string): ProductEntity | undefined {
    return productsV2.find((product) => product.id === id);
  },

  getBySlug(slug: string): ProductEntity | undefined {
    return productsV2.find((product) => product.slug === slug);
  },
};
