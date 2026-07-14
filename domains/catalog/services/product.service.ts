import { MockProductRepository } from "@/domains/catalog/repositories/mock-product.repository";
import { ProductEntity } from "@/domains/catalog/types/product.entity";

export const ProductService = {
  getProducts() {
    return MockProductRepository.getActive();
  },

  getFeaturedProducts() {
    return MockProductRepository.getFeatured();
  },

  getProductsByWorkspace(workspaceId: string) {
    return MockProductRepository.getByWorkspaceId(workspaceId);
  },

  getProductsByProductModel(productModelId: string) {
    return MockProductRepository.getByProductModelId(productModelId);
  },

  getProductsByBrand(brandId: string) {
    return MockProductRepository.getByBrandId(brandId);
  },

  getProductsByStatus(status: ProductEntity["status"]) {
    return MockProductRepository.getByStatus(status);
  },

  getProductById(id: string) {
    return MockProductRepository.getById(id);
  },

  getProductBySlug(slug: string) {
    return MockProductRepository.getBySlug(slug);
  },
};
