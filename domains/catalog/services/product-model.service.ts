import { MockProductModelRepository } from "@/domains/catalog/repositories/mock-product-model.repository";

export const ProductModelService = {
  getProductModels() {
    return MockProductModelRepository.getActive();
  },

  getProductModelsByWorkspace(workspaceId: string) {
    return MockProductModelRepository.getByWorkspaceId(workspaceId);
  },

  getProductModelsByWorkspaceAndBrand(workspaceId: string, brandId: string) {
    return MockProductModelRepository.getByWorkspaceIdAndBrandId(
      workspaceId,
      brandId,
    );
  },

  getProductModelsByDepartment(departmentId: string) {
    return MockProductModelRepository.getByDepartmentId(departmentId);
  },

  getProductModelsByCategory(categoryId: string) {
    return MockProductModelRepository.getByCategoryId(categoryId);
  },

  getProductModelsByBrand(brandId: string) {
    return MockProductModelRepository.getByBrandId(brandId);
  },

  getProductModelById(id: string) {
    return MockProductModelRepository.getById(id);
  },
};
