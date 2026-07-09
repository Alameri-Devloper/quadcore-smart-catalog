import { BrandRepository } from "@/domains/catalog/repositories/brand.repository";

export const BrandService = {
  getActiveBrands() {
    return BrandRepository.getAll();
  },

  getBrandById(id: string) {
    return BrandRepository.getById(id);
  },
};
