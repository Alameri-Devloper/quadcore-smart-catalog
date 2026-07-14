import { MockBrandRepository } from "@/domains/catalog/repositories/mock-brand.repository";

export const BrandService = {
  getBrands() {
    return MockBrandRepository.getActive();
  },

  getActiveBrands() {
    return MockBrandRepository.getActive();
  },

  getBrandsByCompany(companyId: string) {
    return MockBrandRepository.getByCompanyId(companyId);
  },

  getBrandsByWorkspace(workspaceId: string) {
    return MockBrandRepository.getByWorkspaceId(workspaceId);
  },

  getBrandById(id: string) {
    return MockBrandRepository.getById(id);
  },
};
